import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractText } from "unpdf";
import * as XLSX from "xlsx";

// 1. GET: Fetch active remittances for a vendor (Auto-prunes expired >30 days)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId") || "pyramid";

  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const nowIso = new Date().toISOString();

    // Auto-purge records older than 30 days (expires_at < NOW)
    await supabase.from("vendor_remittances").delete().lt("expires_at", nowIso);

    // Fetch active remittances for this vendor (ordered by newest first)
    const { data, error } = await supabase
      .from("vendor_remittances")
      .select("*")
      .eq("vendor_id", vendorId)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load vendor remittances:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, remittances: data || [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 2. DELETE: Remove a specific remittance by ID
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !supabase) {
    return NextResponse.json({ success: false, error: "Invalid ID or database offline" }, { status: 400 });
  }

  try {
    const { error } = await supabase.from("vendor_remittances").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Remittance record removed from cloud storage" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export interface RemittanceLinePart {
  part_id: string; // e.g. "33990-1" or "Date Worked 2026-08-24 (8 hrs @ $75/hr)"
  voucher_number?: string; // e.g. "00325494" or "Order #31046162"
  date?: string; // e.g. "6/16/2026" or "2026-08-24"
  gross_amount: number;
  amount_paid: number;
  discount_amount: number;
  writeoff_amount: number;
  net_paid: number;
  hours?: number;
  rate?: number;
}

export interface ParsedInvoiceItem {
  invoice_number: string; // Base invoice or consultant label, e.g. "33990" or "Majithia, Akash"
  consultant_name?: string;
  client_name?: string;
  order_id?: string;
  payment_reference?: string;
  invoice_date?: string;
  gross_amount: number;
  discount_amount: number;
  deductions_amount: number;
  net_paid: number;
  part_count: number;
  parts: RemittanceLinePart[];
  notes?: string;
}

// 3. POST:
// - Multipart: Parse file (PDF or Excel/CSV), returns draft data for validation - NOT stored in DB
// - JSON: Save validated data to Supabase (stores data only, not original file binary)
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // CASE A: User validated the data and clicked "Confirm & Save to Supabase"
  if (contentType.includes("application/json")) {
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
    }

    try {
      const body = await req.json();
      const remittance = body.remittance;

      if (!remittance) {
        return NextResponse.json({ success: false, error: "No remittance data provided to save" }, { status: 400 });
      }

      // 30-day retention timestamp
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const recordToInsert = {
        vendor_id: remittance.vendor_id || "pyramid",
        vendor_name: remittance.vendor_name || (remittance.vendor_id === "teksystems" ? "TEKsystems" : "Pyramid Inc"),
        file_name: remittance.file_name || "Remittance_Statement",
        file_size: remittance.file_size || 0,
        total_paid: Number(remittance.total_paid) || 0,
        total_gross: Number(remittance.total_gross) || 0,
        total_discount: Number(remittance.total_discount) || 0,
        total_deductions: Number(remittance.total_deductions) || 0,
        invoice_count: remittance.items ? remittance.items.length : Number(remittance.invoice_count) || 0,
        items: remittance.items || [],
        raw_text: remittance.raw_text ? String(remittance.raw_text).slice(0, 5000) : null,
        created_at: now.toISOString(),
        expires_at: expiresAt,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("vendor_remittances")
        .insert(recordToInsert)
        .select()
        .single();

      if (insertError) {
        console.error("Failed to insert remittance record into Supabase:", insertError);
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        savedRemittance: inserted,
        message: "Remittance statement confirmed and saved to Supabase (30-day storage active).",
      });
    } catch (saveErr: any) {
      console.error("Save remittance error:", saveErr);
      return NextResponse.json({ success: false, error: saveErr.message || "Failed to save statement" }, { status: 500 });
    }
  }

  // CASE B: User uploaded a file (PDF or Excel/CSV) to parse and extract draft data
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let vendorId = (formData.get("vendorId") as string) || "pyramid";
    let vendorName = (formData.get("vendorName") as string) || (vendorId === "teksystems" ? "TEKsystems" : "Pyramid Inc");

    if (!file) {
      return NextResponse.json({ success: false, error: "No statement file received" }, { status: 400 });
    }

    const fileNameLower = file.name.toLowerCase();
    const isExcelOrCsv =
      fileNameLower.endsWith(".xlsx") ||
      fileNameLower.endsWith(".xls") ||
      fileNameLower.endsWith(".csv") ||
      vendorId === "teksystems";

    const arrayBuffer = await file.arrayBuffer();

    // -------------------------------------------------------------
    // BRANCH 1: TEKsystems / Excel / CSV spreadsheet parsing
    // -------------------------------------------------------------
    if (isExcelOrCsv && !fileNameLower.endsWith(".pdf")) {
      try {
        const { items, totals, rawPreview } = parseTeksystemsExcel(Buffer.from(arrayBuffer));

        const draftRecord = {
          vendor_id: "teksystems",
          vendor_name: "TEKsystems",
          file_name: file.name,
          file_size: file.size,
          total_paid: totals.net,
          total_gross: totals.gross,
          total_discount: totals.discount,
          total_deductions: totals.writeoff,
          invoice_count: items.length,
          items: items,
          raw_text: rawPreview.slice(0, 5000),
          is_draft: true,
        };

        return NextResponse.json({
          success: true,
          draft: draftRecord,
          message: `Extracted ${items.length} consultant settlements from ${file.name}. Review and confirm to save to Supabase.`,
        });
      } catch (excelErr: any) {
        console.error("TEKsystems Excel parsing error:", excelErr);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to parse TEKsystems Excel file: ${excelErr.message || "Invalid sheet format"}`,
          },
          { status: 422 }
        );
      }
    }

    // -------------------------------------------------------------
    // BRANCH 2: Pyramid Inc / PDF Document parsing
    // -------------------------------------------------------------
    const uint8Array = new Uint8Array(arrayBuffer);
    let rawText = "";

    // Step 1: Extract text using serverless-native unpdf
    try {
      const extracted = await extractText(uint8Array, { mergePages: true });
      rawText = extracted?.text || "";
    } catch (unpdfErr) {
      console.warn("unpdf text extraction error:", unpdfErr);
    }

    // Step 2: Fallback to binary text streams if rawText is empty
    if (!rawText || rawText.trim().length === 0) {
      try {
        const buffer = Buffer.from(arrayBuffer);
        const latinString = buffer.toString("latin1");
        const streamMatches = latinString.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
        if (streamMatches) {
          rawText = streamMatches.join("\n");
        } else {
          rawText = latinString;
        }
      } catch (streamErr) {
        console.warn("Stream extraction error:", streamErr);
      }
    }

    // Step 3: If still empty (e.g. scanned image-only PDF), use OCR Space fallback
    if (!rawText || rawText.trim().length === 0) {
      try {
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const ocrFormData = new FormData();
        ocrFormData.append("base64Image", `data:application/pdf;base64,${base64Data}`);
        ocrFormData.append("apikey", "helloworld");
        ocrFormData.append("language", "eng");
        ocrFormData.append("scale", "true");

        const ocrRes = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: ocrFormData,
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          rawText = ocrData?.ParsedResults?.[0]?.ParsedText || "";
        }
      } catch (ocrErr) {
        console.warn("OCR Space fallback error:", ocrErr);
      }
    }

    // Step 4: Parse lines into structured and grouped items
    const { items: invoiceGroups, totals: parsedTotals } = parseRemittanceText(rawText);

    const totalGross = parsedTotals.gross > 0
      ? parsedTotals.gross
      : invoiceGroups.reduce((acc, it) => acc + (it.gross_amount || 0), 0);

    const totalDiscount = parsedTotals.discount >= 0
      ? parsedTotals.discount
      : invoiceGroups.reduce((acc, it) => acc + (it.discount_amount || 0), 0);

    const totalDeductions = parsedTotals.writeoff >= 0
      ? parsedTotals.writeoff
      : invoiceGroups.reduce((acc, it) => acc + (it.deductions_amount || 0), 0);

    const totalPaid = parsedTotals.net > 0
      ? parsedTotals.net
      : invoiceGroups.reduce((acc, it) => acc + (it.net_paid || 0), 0);

    // Build the draft record (DO NOT SAVE TO SUPABASE YET)
    const draftRecord = {
      vendor_id: vendorId,
      vendor_name: vendorName,
      file_name: file.name,
      file_size: file.size,
      total_paid: totalPaid,
      total_gross: totalGross,
      total_discount: totalDiscount,
      total_deductions: totalDeductions,
      invoice_count: invoiceGroups.length,
      items: invoiceGroups,
      raw_text: rawText.slice(0, 5000),
      is_draft: true,
    };

    return NextResponse.json({
      success: true,
      draft: draftRecord,
      message: `Extracted ${invoiceGroups.length} invoices from ${file.name}. Review and confirm to save to Supabase.`,
    });
  } catch (err: any) {
    console.error("Remittance processing error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to parse statement" },
      { status: 500 }
    );
  }
}

// =========================================================================
// TEKSYSTEMS EXCEL / SPREADSHEET PARSER
// =========================================================================
interface TeksystemsParsedResult {
  items: ParsedInvoiceItem[];
  totals: {
    gross: number;
    discount: number;
    writeoff: number;
    net: number;
  };
  rawPreview: string;
}

function parseTeksystemsExcel(buffer: Buffer): TeksystemsParsedResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    throw new Error("Spreadsheet contains no readable sheets.");
  }

  // Parse as 2D array to withstand top title lines (e.g. Payments@teksystems.com)
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Spreadsheet is empty.");
  }

  // 1. Locate Header Row: find the row containing "amount" and ("payment" or "discount" or "paid" or "message" or "terms")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const rowStr = rawRows[i]
      .map((cell) => String(cell || "").toLowerCase().trim())
      .join(" ");

    if (
      rowStr.includes("amount") &&
      (rowStr.includes("payment") ||
        rowStr.includes("mexxage") ||
        rowStr.includes("message") ||
        rowStr.includes("di") ||
        rowStr.includes("paid") ||
        rowStr.includes("terms"))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback: look for row with "amount" or "paid"
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const rowStr = rawRows[i].map((cell) => String(cell || "").toLowerCase().trim()).join(" ");
      if (rowStr.includes("amount") || rowStr.includes("paid")) {
        headerRowIndex = i;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headerRow = rawRows[headerRowIndex].map((h) => String(h || "").trim());

  // 2. Identify Column Indices with typo tolerance (e.g., "Dixcount Amount", "Payment Mexxage")
  let amountCol = -1;
  let discountCol = -1;
  let paidCol = -1;
  let messageCol = -1;
  let refCol = -1;
  let invoiceNumCol = -1;
  let invoiceDateCol = -1;
  let processDateCol = -1;
  let termsCol = -1;

  headerRow.forEach((h, idx) => {
    const clean = h.toLowerCase().replace(/[\r\n\s]+/g, " ");

    if (/di[sx]count/i.test(clean)) {
      discountCol = idx;
    } else if (/paid\s*amount|amount\s*paid|^paid$/i.test(clean)) {
      paidCol = idx;
    } else if (/^amount$|gross\s*amount|^gross$/i.test(clean)) {
      amountCol = idx;
    } else if (/payment\s*m[esx]+age|mexxage|message/i.test(clean)) {
      messageCol = idx;
    } else if (/payment\s*ref|check\s*num|^ref$/i.test(clean)) {
      refCol = idx;
    } else if (/invoice\s*num/i.test(clean)) {
      invoiceNumCol = idx;
    } else if (/invoice\s*date/i.test(clean)) {
      invoiceDateCol = idx;
    } else if (/process\s*date/i.test(clean)) {
      processDateCol = idx;
    } else if (/terms/i.test(clean)) {
      termsCol = idx;
    }
  });

  // Secondary fallback for amountCol if not explicitly named "^amount$"
  if (amountCol === -1) {
    headerRow.forEach((h, idx) => {
      const clean = h.toLowerCase().trim();
      if (clean.includes("amount") && idx !== discountCol && idx !== paidCol && !clean.includes("tax")) {
        amountCol = idx;
      }
    });
  }

  const parseNum = (val: any): number => {
    if (typeof val === "number") return val;
    const s = String(val || "").replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(s);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseDateStr = (val: any): string => {
    if (!val) return "";
    if (val instanceof Date) {
      return val.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    if (typeof val === "number" && val > 20000 && val < 60000) {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    return String(val).trim();
  };

  const items: ParsedInvoiceItem[] = [];
  const dataRows = rawRows.slice(headerRowIndex + 1);

  dataRows.forEach((row, rowIdx) => {
    const rawGross = amountCol >= 0 ? parseNum(row[amountCol]) : 0;
    const rawDiscount = discountCol >= 0 ? parseNum(row[discountCol]) : 0;
    let rawPaid = paidCol >= 0 ? parseNum(row[paidCol]) : 0;
    if (rawPaid === 0 && rawGross > 0) {
      rawPaid = rawGross - rawDiscount;
    }

    const paymentMessage = messageCol >= 0 ? String(row[messageCol] || "").trim() : "";
    const paymentRef = refCol >= 0 ? String(row[refCol] || "").trim() : "";
    const invoiceNum = invoiceNumCol >= 0 ? String(row[invoiceNumCol] || "").trim() : "";
    const invDate =
      (invoiceDateCol >= 0 ? parseDateStr(row[invoiceDateCol]) : "") ||
      (processDateCol >= 0 ? parseDateStr(row[processDateCol]) : "");

    // Ignore completely empty rows or footer notes
    if (rawGross === 0 && rawPaid === 0 && !paymentMessage) {
      return;
    }

    // 3. Parse Payment Message:
    // Format: "08045118|Majithia, Akash|Date Worked 2026-08-24|Hours 8|REG-Regular|Pay Rate @ 75|Lowe's Companies, Inc.|Order ID 31046162"
    const messageLines = paymentMessage
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let consultantName = "";
    let clientName = "";
    let orderId = "";
    const parts: RemittanceLinePart[] = [];

    messageLines.forEach((mLine, lIdx) => {
      const tokens = mLine.split("|").map((t) => t.trim());

      let dateWorked = "";
      let hours = 0;
      let payRate = 0;

      for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
        const tok = tokens[tIdx];

        // 1. Consultant Name candidate (e.g. "Majithia, Akash" or "Meghana Karanm")
        if (!consultantName) {
          if (tok.includes(",") && !tok.toLowerCase().includes("inc") && !tok.toLowerCase().includes("corp")) {
            consultantName = tok;
          } else if (
            tIdx === 1 &&
            !/date|hour|rate|order|reg|pay/i.test(tok) &&
            !/inc|corp|llc|co\b/i.test(tok)
          ) {
            consultantName = tok;
          }
        }

        // 2. Date Worked: "Date Worked 2026-08-24"
        const dateMatch = tok.match(/Date Worked\s+([\d-]+)/i) || tok.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (dateMatch && !dateWorked) {
          dateWorked = dateMatch[1];
        }

        // 3. Hours: "Hours 8"
        const hoursMatch = tok.match(/Hours\s+([\d.]+)/i);
        if (hoursMatch) {
          hours = parseFloat(hoursMatch[1]) || 0;
        }

        // 4. Pay Rate: "Pay Rate @ 75"
        const rateMatch = tok.match(/Pay Rate\s*@?\s*([\d.]+)/i);
        if (rateMatch) {
          payRate = parseFloat(rateMatch[1]) || 0;
        }

        // 5. Client candidate: "Lowe's Companies, Inc." or "Federal Home Loan Mortgage Corporation"
        if (!clientName) {
          if (/inc\b|corp\b|llc\b|companies\b|corporation\b|mortgage\b|bank\b/i.test(tok)) {
            clientName = tok;
          } else if (tIdx === 6 && !tok.toLowerCase().includes("order")) {
            clientName = tok;
          }
        }

        // 6. Order ID candidate: "Order ID 31046162"
        const orderMatch = tok.match(/Order\s*(?:ID)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (orderMatch && !orderId) {
          orderId = orderMatch[1];
        }
      }

      // Calculate part amounts
      const lineGross = hours && payRate ? hours * payRate : (messageLines.length > 0 ? rawGross / messageLines.length : rawGross);
      const discountRatio = rawGross > 0 ? lineGross / rawGross : (1 / Math.max(1, messageLines.length));
      const lineDiscount = rawDiscount * discountRatio;
      const lineNet = lineGross - lineDiscount;

      parts.push({
        part_id: dateWorked
          ? `Date Worked ${dateWorked} (${hours || 8} hrs @ $${payRate || "—"}/hr)`
          : `Entry ${lIdx + 1}`,
        voucher_number: orderId ? `Order #${orderId}` : (paymentRef ? `Ref #${paymentRef}` : undefined),
        date: dateWorked || invDate,
        gross_amount: Math.round(lineGross * 100) / 100,
        amount_paid: Math.round(lineNet * 100) / 100,
        discount_amount: Math.round(lineDiscount * 100) / 100,
        writeoff_amount: 0,
        net_paid: Math.round(lineNet * 100) / 100,
        hours: hours || undefined,
        rate: payRate || undefined,
      });
    });

    // Fallback if no parts extracted
    if (parts.length === 0) {
      parts.push({
        part_id: invoiceNum || `Row ${rowIdx + 1}`,
        voucher_number: paymentRef || undefined,
        date: invDate,
        gross_amount: rawGross,
        amount_paid: rawPaid,
        discount_amount: rawDiscount,
        writeoff_amount: 0,
        net_paid: rawPaid,
      });
    }

    // Friendly display name for the settlement row
    const displayConsultant = consultantName
      ? (consultantName.includes(",")
          ? consultantName.split(",").reverse().map((s) => s.trim()).join(" ")
          : consultantName)
      : (orderId ? `Order #${orderId}` : (invoiceNum || `Settlement #${rowIdx + 1}`));

    items.push({
      invoice_number: displayConsultant,
      consultant_name: consultantName || displayConsultant,
      client_name: clientName || "Client Account",
      order_id: orderId || invoiceNum || paymentRef,
      payment_reference: paymentRef || undefined,
      invoice_date: invDate,
      gross_amount: rawGross,
      discount_amount: rawDiscount,
      deductions_amount: 0,
      net_paid: rawPaid,
      part_count: parts.length,
      parts: parts,
      notes: paymentMessage || (orderId ? `Order ID: ${orderId}` : undefined),
    });
  });

  const totals = {
    gross: items.reduce((acc, it) => acc + (it.gross_amount || 0), 0),
    discount: items.reduce((acc, it) => acc + (it.discount_amount || 0), 0),
    writeoff: 0,
    net: items.reduce((acc, it) => acc + (it.net_paid || 0), 0),
  };

  const rawPreview = dataRows
    .slice(0, 10)
    .map((r) => r.join(" | "))
    .join("\n");

  return { items, totals, rawPreview };
}

// =========================================================================
// PYRAMID INC / VENDOR PDF STATEMENT PARSER
// =========================================================================
interface ParsedResult {
  items: ParsedInvoiceItem[];
  totals: {
    gross: number;
    paid: number;
    discount: number;
    writeoff: number;
    net: number;
  };
}

function parseRemittanceText(text: string): ParsedResult {
  const invoiceGroups = new Map<string, ParsedInvoiceItem>();
  let explicitTotals = {
    gross: 0,
    paid: 0,
    discount: 0,
    writeoff: 0,
    net: 0,
  };

  if (!text) return { items: [], totals: explicitTotals };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 1. Skip table header lines
    if (/our\s+voucher/i.test(line) && /your\s+voucher/i.test(line)) {
      continue;
    }

    // 2. Detect summary 'Totals' line
    if (/^totals?\b/i.test(line) || /\bgrand\s+totals?\b/i.test(line)) {
      const moneyMatches = line.match(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g) || [];
      const nums = moneyMatches.map((m) => parseFloat(m.replace(/[$,]/g, "")) || 0);

      if (nums.length >= 5) {
        // [Amount, Amount Paid, Discount, Writeoff, Net]
        explicitTotals = {
          gross: nums[0],
          paid: nums[1],
          discount: nums[2],
          writeoff: nums[3],
          net: nums[4],
        };
      } else if (nums.length === 1) {
        explicitTotals.net = nums[0];
      }
      continue;
    }

    // 3. Match row with monetary amounts
    const moneyMatches = line.match(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g);

    if (moneyMatches && moneyMatches.length >= 1) {
      const tokens = line.split(/\s+/);
      let voucherNum = "";
      let rawInvoiceNum = "";
      let invDate = "";

      for (const tok of tokens) {
        const cleanTok = tok.replace(/[,;:]/g, "");

        // Match date: 6/16/2026 or 2026-06-16
        if (!invDate && /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanTok)) {
          invDate = cleanTok;
          continue;
        }

        // Match invoice format like 33990-1 or 34289-5
        if (/^\d{4,10}-\d+$/.test(cleanTok)) {
          rawInvoiceNum = cleanTok;
          continue;
        }

        // Match voucher format like 00325494
        if (/^\d{6,10}$/.test(cleanTok) && !tok.includes("$")) {
          if (!voucherNum) {
            voucherNum = cleanTok;
          } else if (!rawInvoiceNum) {
            rawInvoiceNum = cleanTok;
          }
          continue;
        }

        // Alphanumeric invoice candidate (e.g. INV-33990 or 33990)
        if (!rawInvoiceNum && /^[A-Z0-9-]{4,20}$/i.test(cleanTok) && !tok.includes("$")) {
          rawInvoiceNum = cleanTok;
        }
      }

      const nums = moneyMatches.map((m) => parseFloat(m.replace(/[$,]/g, "")) || 0);

      let gross = 0;
      let amountPaid = 0;
      let discount = 0;
      let writeoff = 0;
      let net = 0;

      if (nums.length >= 5) {
        // Standard Vendor Layout: [Amount, Amount Paid, Discount, Writeoff, Net]
        gross = nums[0];
        amountPaid = nums[1];
        discount = nums[2];
        writeoff = nums[3];
        net = nums[4];
      } else if (nums.length === 4) {
        // [Amount, Discount, Writeoff, Net]
        gross = nums[0];
        discount = nums[1];
        writeoff = nums[2];
        net = nums[3];
        amountPaid = net;
      } else if (nums.length === 3) {
        // [Gross, Discount, Net]
        gross = nums[0];
        discount = nums[1];
        net = nums[2];
        amountPaid = net;
      } else if (nums.length === 2) {
        // [Gross, Net]
        gross = nums[0];
        net = nums[1];
        amountPaid = net;
        discount = Math.max(0, gross - net);
      } else if (nums.length === 1) {
        gross = nums[0];
        net = nums[0];
        amountPaid = nums[0];
      }

      // Group split parts by base invoice:
      // '33990-1' -> baseInvoice: '33990', part: '33990-1'
      const baseInvoice = rawInvoiceNum ? rawInvoiceNum.replace(/-\d+$/, "") : (voucherNum || "INV");
      const partId = rawInvoiceNum || baseInvoice;

      if (!invoiceGroups.has(baseInvoice)) {
        invoiceGroups.set(baseInvoice, {
          invoice_number: baseInvoice,
          invoice_date: invDate || undefined,
          gross_amount: 0,
          discount_amount: 0,
          deductions_amount: 0,
          net_paid: 0,
          part_count: 0,
          parts: [],
        });
      }

      const group = invoiceGroups.get(baseInvoice)!;
      group.gross_amount += gross;
      group.discount_amount += discount;
      group.deductions_amount += writeoff;
      group.net_paid += net;
      group.part_count += 1;
      if (!group.invoice_date && invDate) {
        group.invoice_date = invDate;
      }

      group.parts.push({
        part_id: partId,
        voucher_number: voucherNum || undefined,
        date: invDate || undefined,
        gross_amount: gross,
        amount_paid: amountPaid,
        discount_amount: discount,
        writeoff_amount: writeoff,
        net_paid: net,
      });
    }
  }

  const items = Array.from(invoiceGroups.values());

  // If no explicit totals row was found, calculate from sum of groups
  if (explicitTotals.gross === 0 && items.length > 0) {
    explicitTotals = {
      gross: items.reduce((acc, it) => acc + it.gross_amount, 0),
      paid: items.reduce((acc, it) => acc + it.net_paid, 0),
      discount: items.reduce((acc, it) => acc + it.discount_amount, 0),
      writeoff: items.reduce((acc, it) => acc + it.deductions_amount, 0),
      net: items.reduce((acc, it) => acc + it.net_paid, 0),
    };
  }

  return { items, totals: explicitTotals };
}
