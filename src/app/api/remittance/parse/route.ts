import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractText } from "unpdf";
import * as XLSX from "xlsx";
import { createWorker } from "tesseract.js";

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
  employee_id?: string;
  pay_rate?: number;
  pay_type?: string;
  total_hours?: number;
  work_dates_summary?: string;
  payment_reference?: string;
  invoice_date?: string;
  gross_amount: number;
  discount_amount: number;
  deductions_amount: number;
  net_paid: number;
  part_count: number;
  parts: RemittanceLinePart[];
  notes?: string;
  payment_message?: string;
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

  // CASE B: User uploaded a file (PDF, Excel/CSV, or Screenshot/Image) to parse and extract draft data
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let vendorId = (formData.get("vendorId") as string) || "pyramid";
    let vendorName = (formData.get("vendorName") as string) || (vendorId === "teksystems" ? "TEKsystems" : vendorId === "pyramid" ? "Pyramid Inc" : "Vendor");
    let fileType = (formData.get("fileType") as string) || "";

    if (!file) {
      return NextResponse.json({ success: false, error: "No statement file received" }, { status: 400 });
    }

    const fileNameLower = file.name.toLowerCase();
    const isImage =
      fileType === "image" ||
      file.type.startsWith("image/") ||
      fileNameLower.endsWith(".png") ||
      fileNameLower.endsWith(".jpg") ||
      fileNameLower.endsWith(".jpeg") ||
      fileNameLower.endsWith(".webp");

    const isExcelOrCsv =
      fileType === "excel" ||
      fileNameLower.endsWith(".xlsx") ||
      fileNameLower.endsWith(".xls") ||
      fileNameLower.endsWith(".csv") ||
      vendorId === "teksystems";

    const arrayBuffer = await file.arrayBuffer();

    // -------------------------------------------------------------
    // BRANCH 1: Screenshot / Image with Text (OCR Engine)
    // -------------------------------------------------------------
    if (isImage) {
      try {
        const rawText = await extractTextFromImage(Buffer.from(arrayBuffer));
        if (!rawText || rawText.trim().length === 0) {
          throw new Error("Could not detect readable text in the image. Please ensure the screenshot is clear and contains tabular numbers.");
        }

        const { items, totals } = parseGenericRemittanceText(rawText);

        const totalGross = totals.gross > 0 ? totals.gross : items.reduce((acc, it) => acc + (it.gross_amount || 0), 0);
        const totalDiscount = totals.discount >= 0 ? totals.discount : items.reduce((acc, it) => acc + (it.discount_amount || 0), 0);
        const totalDeductions = totals.writeoff >= 0 ? totals.writeoff : items.reduce((acc, it) => acc + (it.deductions_amount || 0), 0);
        const totalPaid = totals.net > 0 ? totals.net : items.reduce((acc, it) => acc + (it.net_paid || 0), 0);

        const draftRecord = {
          vendor_id: vendorId,
          vendor_name: vendorName,
          file_name: file.name,
          file_size: file.size,
          total_paid: totalPaid,
          total_gross: totalGross,
          total_discount: totalDiscount,
          total_deductions: totalDeductions,
          invoice_count: items.length,
          items: items,
          raw_text: rawText.slice(0, 5000),
          is_draft: true,
        };

        return NextResponse.json({
          success: true,
          draft: draftRecord,
          message: `Extracted ${items.length} line items from image ${file.name} via OCR. Review and confirm to save to Supabase.`,
        });
      } catch (ocrErr: any) {
        console.error("Screenshot OCR parsing error:", ocrErr);
        return NextResponse.json(
          { success: false, error: `Failed to extract data from image: ${ocrErr.message || "OCR failed"}` },
          { status: 422 }
        );
      }
    }

    // -------------------------------------------------------------
    // BRANCH 2: Excel / CSV Spreadsheet Parsing
    // -------------------------------------------------------------
    if (isExcelOrCsv && !fileNameLower.endsWith(".pdf")) {
      try {
        let items: ParsedInvoiceItem[] = [];
        let totals = { gross: 0, discount: 0, writeoff: 0, net: 0 };
        let rawPreview = "";

        if (vendorId === "teksystems") {
          // STRICT TEKsystems custom parser ONLY (isolated)
          const res = parseTeksystemsExcel(Buffer.from(arrayBuffer));
          items = res.items;
          totals = res.totals;
          rawPreview = res.rawPreview;
        } else {
          // Pure generic Excel parser (No TEKsystems assumptions)
          const res = parseGenericExcel(Buffer.from(arrayBuffer));
          items = res.items;
          totals = res.totals;
          rawPreview = res.rawPreview;
        }

        const draftRecord = {
          vendor_id: vendorId,
          vendor_name: vendorName,
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
          message: `Extracted ${items.length} line items from ${file.name}. Review and confirm to save to Supabase.`,
        });
      } catch (excelErr: any) {
        console.error("Excel parsing error:", excelErr);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to parse spreadsheet file: ${excelErr.message || "Invalid sheet format"}`,
          },
          { status: 422 }
        );
      }
    }

    // -------------------------------------------------------------
    // BRANCH 3: PDF Document Parsing
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
    // Strict isolation: Pyramid parser is ONLY applied when vendorId === "pyramid"
    let invoiceGroups: ParsedInvoiceItem[] = [];
    let parsedTotals = { gross: 0, discount: 0, writeoff: 0, net: 0 };

    if (vendorId === "pyramid") {
      const result = parseRemittanceText(rawText);
      invoiceGroups = result.items;
      parsedTotals = result.totals;
    } else {
      const result = parseGenericRemittanceText(rawText);
      invoiceGroups = result.items;
      parsedTotals = result.totals;
    }

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

  interface ConsultantGroup {
    consultantName: string;
    clientName: string;
    orderId: string;
    employeeId: string;
    payRate: number;
    payType: string;
    batchRef: string;
    invoiceDate: string;
    grossAmount: number;
    discountAmount: number;
    netPaid: number;
    totalHours: number;
    datesWorked: string[];
    parts: RemittanceLinePart[];
    rawMessages: string[];
  }

  const consultantMap = new Map<string, ConsultantGroup>();
  let lastKnownConsultant = "";
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

    // Ignore completely empty rows
    if (rawGross === 0 && rawPaid === 0 && !paymentMessage && !paymentRef) {
      return;
    }

    // 3. Parse Payment Message tokens:
    // Format: "08345118|Majithia, Akash|Date Worked 2026-08-24|Hours 8|REG-Regular|Pay Rate @ 75|Lowe's Companies, Inc.|Order ID 31046162,"
    // Format 2: "08345118|Majithia, Akash|2026-08-29|MO_238236| Hours|Lowe's Companies, Inc.|31046162"
    const messageLines = paymentMessage
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let rowConsultant = "";
    let rowClient = "";
    let rowOrderId = "";
    let rowEmpId = "";
    let rowRate = 0;
    let rowType = "";
    let rowBatch = "";

    const linesToProcess = messageLines.length > 0 ? messageLines : (paymentMessage ? [paymentMessage] : []);

    linesToProcess.forEach((mLine) => {
      const cleanLine = mLine.replace(/[,;]+$/, "");
      const tokens = cleanLine.split("|").map((t) => t.trim().replace(/^[,;]+|[,;]+$/g, ""));

      tokens.forEach((tok, tIdx) => {
        // 1. Employee ID: 6-12 digits
        if (!rowEmpId && /^\d{6,12}$/.test(tok)) {
          rowEmpId = tok;
          return;
        }

        // 2. Consultant Name: contains comma (e.g. "Majithia, Akash") or is at index 1
        if (!rowConsultant) {
          if (tok.includes(",") && !/inc|corp|co\b|llc|bank|order|date|hour|rate|mexxage|message/i.test(tok)) {
            rowConsultant = tok;
            return;
          } else if (
            tIdx === 1 &&
            !/date|hour|rate|order|reg|pay/i.test(tok) &&
            !/inc|corp|llc|co\b|bank/i.test(tok)
          ) {
            rowConsultant = tok;
            return;
          }
        }

        // 3. Date Worked: "Date Worked 2026-08-24" or "2026-08-29"
        const dateMatch = tok.match(/Date Worked\s+([\d-]+)/i) || tok.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})$/);
        if (dateMatch && !rowBatch) {
          return;
        }

        // 4. Hours: "Hours 8" or "8 Hours"
        const hoursMatch = tok.match(/Hours\s*([\d.]+)/i) || tok.match(/^([\d.]+)\s*Hours/i);
        if (hoursMatch) {
          return;
        }

        // 5. Pay Type: "REG-Regular", "OT-Overtime"
        if (/REG|OT|Regular|Overtime/i.test(tok)) {
          rowType = tok;
          return;
        }

        // 6. Pay Rate: "Pay Rate @ 75" or "Rate @ 75"
        const rateMatch = tok.match(/Pay Rate\s*@?\s*([\d.]+)/i) || tok.match(/Rate\s*@?\s*([\d.]+)/i);
        if (rateMatch) {
          rowRate = parseFloat(rateMatch[1]) || 0;
          return;
        }

        // 7. Client Name: contains Inc, Corp, LLC, Companies, Corporation, Mortgage, etc.
        if (!rowClient && /inc\b|corp\b|llc\b|companies\b|corporation\b|mortgage\b|bank\b/i.test(tok)) {
          rowClient = tok;
          return;
        }

        // 8. Order ID: "Order ID 31046162" or trailing digits
        const orderMatch = tok.match(/Order\s*(?:ID)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (orderMatch && !rowOrderId) {
          rowOrderId = orderMatch[1].replace(/[,;]+$/, "");
          return;
        } else if (!rowOrderId && /^\d{7,10}$/.test(tok) && tok !== rowEmpId) {
          rowOrderId = tok;
          return;
        }

        // 9. Batch Reference: e.g. "MO_238236"
        if (!rowBatch && /^[A-Za-z]{2,5}_\d+$/.test(tok)) {
          rowBatch = tok;
          return;
        }
      });

      if (rowConsultant) {
        lastKnownConsultant = rowConsultant;
      }
    });

    const activeConsultant = rowConsultant || lastKnownConsultant || "Consultant Settlement";
    const groupKey = activeConsultant.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!consultantMap.has(groupKey)) {
      consultantMap.set(groupKey, {
        consultantName: activeConsultant,
        clientName: rowClient || "",
        orderId: rowOrderId || "",
        employeeId: rowEmpId || "",
        payRate: rowRate || 0,
        payType: rowType || "",
        batchRef: rowBatch || paymentRef || invoiceNum || "",
        invoiceDate: invDate || "",
        grossAmount: 0,
        discountAmount: 0,
        netPaid: 0,
        totalHours: 0,
        datesWorked: [],
        parts: [],
        rawMessages: [],
      });
    }

    const group = consultantMap.get(groupKey)!;

    // Accumulate monetary totals across rows for this consultant
    group.grossAmount += rawGross;
    group.discountAmount += rawDiscount;
    group.netPaid += rawPaid;

    if (rowClient && !group.clientName) group.clientName = rowClient;
    if (rowOrderId && !group.orderId) group.orderId = rowOrderId;
    if (rowEmpId && !group.employeeId) group.employeeId = rowEmpId;
    if (rowRate && !group.payRate) group.payRate = rowRate;
    if (rowType && !group.payType) group.payType = rowType;
    if (rowBatch && !group.batchRef) group.batchRef = rowBatch;
    if (invDate && !group.invoiceDate) group.invoiceDate = invDate;
    if (paymentMessage) group.rawMessages.push(paymentMessage);

    // Extract daily work entries / sub-parts
    linesToProcess.forEach((mLine) => {
      const cleanLine = mLine.replace(/[,;]+$/, "");
      const tokens = cleanLine.split("|").map((t) => t.trim().replace(/^[,;]+|[,;]+$/g, ""));

      let dateWorked = "";
      let hours = 0;
      let payRate = group.payRate || 0;
      let payType = group.payType || "REG-Regular";

      tokens.forEach((tok) => {
        const dateMatch = tok.match(/Date Worked\s+([\d-]+)/i) || tok.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})$/);
        if (dateMatch && !dateWorked) dateWorked = dateMatch[1];

        const hoursMatch = tok.match(/Hours\s*([\d.]+)/i) || tok.match(/^([\d.]+)\s*Hours/i);
        if (hoursMatch) hours = parseFloat(hoursMatch[1]) || 0;

        const rateMatch = tok.match(/Pay Rate\s*@?\s*([\d.]+)/i) || tok.match(/Rate\s*@?\s*([\d.]+)/i);
        if (rateMatch) payRate = parseFloat(rateMatch[1]) || payRate;

        if (/REG|OT|Regular|Overtime/i.test(tok)) payType = tok;
      });

      if (dateWorked && !group.datesWorked.includes(dateWorked)) {
        group.datesWorked.push(dateWorked);
      }
      if (hours > 0) {
        group.totalHours += hours;
      }

      const partGross = hours > 0 && payRate > 0 ? hours * payRate : (rawGross > 0 ? rawGross : 0);
      const partDisc = Math.round(partGross * 0.035 * 100) / 100;
      const partNet = partGross - partDisc;

      group.parts.push({
        part_id: dateWorked
          ? `Date Worked: ${dateWorked} (${hours || 8} hrs @ $${payRate || "—"}/hr • ${payType})`
          : (rowBatch ? `Batch Summary: ${rowBatch}` : `Work Entry ${group.parts.length + 1}`),
        voucher_number: rowOrderId ? `Order #${rowOrderId}` : (rowBatch ? `Ref #${rowBatch}` : undefined),
        date: dateWorked || invDate,
        gross_amount: Math.round(partGross * 100) / 100,
        amount_paid: Math.round(partNet * 100) / 100,
        discount_amount: Math.round(partDisc * 100) / 100,
        writeoff_amount: 0,
        net_paid: Math.round(partNet * 100) / 100,
        hours: hours || undefined,
        rate: payRate || undefined,
      });
    });
  });

  // Convert grouped unique consultants to items list
  const items: ParsedInvoiceItem[] = Array.from(consultantMap.values()).map((g) => {
    const sortedDates = [...g.datesWorked].sort();
    const dateSummary = sortedDates.length > 0
      ? (sortedDates.length === 1 ? sortedDates[0] : `${sortedDates[0]} – ${sortedDates[sortedDates.length - 1]}`)
      : (g.invoiceDate || "—");

    const finalGross = Math.round(g.grossAmount * 100) / 100;
    let finalDiscount = Math.round(g.discountAmount * 100) / 100;
    if (finalDiscount === 0 && finalGross > 0) {
      finalDiscount = Math.round(finalGross * 0.035 * 100) / 100;
    }
    let finalNet = Math.round(g.netPaid * 100) / 100;
    if (finalNet === 0 && finalGross > 0) {
      finalNet = finalGross - finalDiscount;
    }

    const hoursDisplay = g.totalHours > 0 ? `${g.totalHours} hrs` : `${g.parts.length * 8} hrs`;

    return {
      invoice_number: g.consultantName,
      consultant_name: g.consultantName,
      client_name: g.clientName || "Client Account",
      order_id: g.orderId,
      employee_id: g.employeeId,
      pay_rate: g.payRate,
      pay_type: g.payType || "REG-Regular",
      total_hours: g.totalHours || (g.parts.length * 8),
      work_dates_summary: `${dateSummary} (${hoursDisplay})`,
      payment_reference: g.batchRef,
      invoice_date: g.invoiceDate || (sortedDates[0] || "—"),
      gross_amount: finalGross,
      discount_amount: finalDiscount,
      deductions_amount: 0,
      net_paid: finalNet,
      part_count: g.parts.length,
      parts: g.parts,
      notes: g.rawMessages.join("\n"),
      payment_message: g.rawMessages[0] || "",
    };
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

// =========================================================================
// SCREENSHOT / IMAGE OPTICAL CHARACTER RECOGNITION (OCR)
// =========================================================================
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  let rawText = "";

  // 1. Local Tesseract OCR
  try {
    const worker = await createWorker("eng");
    const ret = await worker.recognize(buffer);
    rawText = ret.data?.text || "";
    await worker.terminate();
  } catch (ocrErr) {
    console.warn("Local tesseract OCR failed:", ocrErr);
  }

  // 2. Cloud OCR Space Fallback if local OCR produced empty output
  if (!rawText || rawText.trim().length === 0) {
    try {
      const base64Data = buffer.toString("base64");
      const ocrFormData = new FormData();
      ocrFormData.append("base64Image", `data:image/png;base64,${base64Data}`);
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
    } catch (cloudOcrErr) {
      console.warn("Cloud OCR Space fallback error:", cloudOcrErr);
    }
  }

  return rawText;
}

// =========================================================================
// GENERIC EXCEL / SPREADSHEET PARSER (No TEKsystems Custom Rules)
// =========================================================================
function parseGenericExcel(buffer: Buffer): {
  items: ParsedInvoiceItem[];
  totals: { gross: number; discount: number; writeoff: number; net: number };
  rawPreview: string;
} {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    throw new Error("Spreadsheet contains no readable sheets.");
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rawRows || rawRows.length === 0) {
    throw new Error("Spreadsheet is empty.");
  }

  // 1. Locate header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
    const rowStr = rawRows[i].map((cell) => String(cell || "").toLowerCase().trim()).join(" ");
    if (
      (rowStr.includes("invoice") || rowStr.includes("inv") || rowStr.includes("voucher") || rowStr.includes("bill") || rowStr.includes("item")) &&
      (rowStr.includes("amount") || rowStr.includes("paid") || rowStr.includes("total") || rowStr.includes("net") || rowStr.includes("gross"))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
      const rowStr = rawRows[i].map((cell) => String(cell || "").toLowerCase().trim()).join(" ");
      if (rowStr.includes("amount") || rowStr.includes("paid") || rowStr.includes("total") || rowStr.includes("net")) {
        headerRowIndex = i;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headerRow = rawRows[headerRowIndex].map((h) => String(h || "").toLowerCase().trim());

  let invCol = -1;
  let dateCol = -1;
  let grossCol = -1;
  let discountCol = -1;
  let deductionCol = -1;
  let netCol = -1;
  let descCol = -1;

  for (let j = 0; j < headerRow.length; j++) {
    const h = headerRow[j];
    if (!h) continue;

    if (invCol === -1 && (h.includes("invoice") || h.includes("inv #") || h.includes("inv_") || h.includes("voucher") || h.includes("bill #") || h.includes("reference"))) {
      invCol = j;
    } else if (dateCol === -1 && (h.includes("date") || h.includes("dt") || h.includes("period"))) {
      dateCol = j;
    } else if (discountCol === -1 && (h.includes("discount") || h.includes("disc") || h.includes("prompt"))) {
      discountCol = j;
    } else if (deductionCol === -1 && (h.includes("deduct") || h.includes("writeoff") || h.includes("withhold") || h.includes("adjustment"))) {
      deductionCol = j;
    } else if (netCol === -1 && (h.includes("net") || h.includes("paid") || h.includes("cleared") || h.includes("payment"))) {
      netCol = j;
    } else if (grossCol === -1 && (h.includes("gross") || h.includes("amount") || h.includes("total") || h.includes("billed"))) {
      grossCol = j;
    } else if (descCol === -1 && (h.includes("desc") || h.includes("message") || h.includes("comment") || h.includes("notes") || h.includes("client"))) {
      descCol = j;
    }
  }

  if (grossCol !== -1 && netCol === -1) {
    netCol = grossCol;
  }

  const cleanNum = (val: any): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const s = String(val).replace(/[$ ,]/g, "").replace(/\((.*)\)/, "-$1").trim();
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const formatDate = (val: any): string => {
    if (!val) return "";
    if (val instanceof Date) {
      return val.toLocaleDateString("en-US");
    }
    return String(val).trim();
  };

  const itemsMap = new Map<string, ParsedInvoiceItem>();
  let totalGross = 0;
  let totalDiscount = 0;
  let totalDeduction = 0;
  let totalNet = 0;

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rowText = row.map((c) => String(c || "").trim()).join(" ");
    if (!rowText || /^(total|totals|grand total|summary|subtotal)/i.test(rowText)) {
      continue;
    }

    let rawInv = invCol !== -1 ? String(row[invCol] || "").trim() : "";
    const dateStr = dateCol !== -1 ? formatDate(row[dateCol]) : "";
    let grossVal = grossCol !== -1 ? cleanNum(row[grossCol]) : 0;
    const discVal = discountCol !== -1 ? cleanNum(row[discountCol]) : 0;
    const dedVal = deductionCol !== -1 ? cleanNum(row[deductionCol]) : 0;
    let netVal = netCol !== -1 ? cleanNum(row[netCol]) : 0;
    const notesVal = descCol !== -1 ? String(row[descCol] || "").trim() : "";

    if (netVal === 0 && grossVal > 0) {
      netVal = grossVal - discVal - dedVal;
    }
    if (grossVal === 0 && netVal > 0) {
      grossVal = netVal + discVal + dedVal;
    }

    if (!rawInv && grossVal === 0 && netVal === 0) {
      continue;
    }

    if (!rawInv) {
      rawInv = `INV-${i - headerRowIndex}`;
    }

    if (!itemsMap.has(rawInv)) {
      itemsMap.set(rawInv, {
        invoice_number: rawInv,
        invoice_date: dateStr || undefined,
        gross_amount: 0,
        discount_amount: 0,
        deductions_amount: 0,
        net_paid: 0,
        part_count: 0,
        parts: [],
        notes: notesVal || undefined,
      });
    }

    const item = itemsMap.get(rawInv)!;
    item.gross_amount += grossVal;
    item.discount_amount += discVal;
    item.deductions_amount += dedVal;
    item.net_paid += netVal;
    item.part_count = (item.part_count || 0) + 1;
    if (!item.invoice_date && dateStr) item.invoice_date = dateStr;
    if (!item.notes && notesVal) item.notes = notesVal;

    item.parts.push({
      part_id: `${rawInv}-${item.part_count}`,
      date: dateStr || undefined,
      gross_amount: grossVal,
      amount_paid: netVal,
      discount_amount: discVal,
      writeoff_amount: dedVal,
      net_paid: netVal,
    });

    totalGross += grossVal;
    totalDiscount += discVal;
    totalDeduction += dedVal;
    totalNet += netVal;
  }

  const items = Array.from(itemsMap.values());
  const rawPreview = rawRows.slice(0, 40).map((r) => r.join("\t")).join("\n");

  return {
    items,
    totals: {
      gross: totalGross,
      discount: totalDiscount,
      writeoff: totalDeduction,
      net: totalNet,
    },
    rawPreview,
  };
}

// =========================================================================
// GENERIC REMITTANCE TEXT PARSER (PDF & Image OCR, No Pyramid Custom Rules)
// =========================================================================
function parseGenericRemittanceText(rawText: string): {
  items: ParsedInvoiceItem[];
  totals: { gross: number; discount: number; writeoff: number; net: number };
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const itemsMap = new Map<string, ParsedInvoiceItem>();
  let explicitTotals = { gross: 0, discount: 0, writeoff: 0, net: 0 };
  let itemCounter = 0;

  for (const line of lines) {
    // Check for totals line
    if (/(?:total|totals|grand total|remittance total)\b/i.test(line)) {
      const moneyMatches = line.match(/\$?\s*-?\(?\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/g);
      if (moneyMatches && moneyMatches.length >= 1) {
        const nums = moneyMatches.map((m) => {
          const s = m.replace(/[$ ,]/g, "").replace(/\((.*)\)/, "-$1");
          return parseFloat(s) || 0;
        });

        if (nums.length >= 4) {
          explicitTotals = { gross: nums[0], discount: nums[1], writeoff: nums[2], net: nums[3] };
        } else if (nums.length === 3) {
          explicitTotals = { gross: nums[0], discount: nums[1], writeoff: 0, net: nums[2] };
        } else if (nums.length === 2) {
          explicitTotals = { gross: nums[0], discount: Math.max(0, nums[0] - nums[1]), writeoff: 0, net: nums[1] };
        } else if (nums.length === 1) {
          explicitTotals.net = nums[0];
          if (explicitTotals.gross === 0) explicitTotals.gross = nums[0];
        }
        continue;
      }
    }

    // Check for line containing monetary values
    const moneyMatches = line.match(/\$?\s*-?\(?\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/g);
    if (!moneyMatches || moneyMatches.length === 0) {
      continue;
    }

    const tokens = line.split(/\s+/);
    let invNumber = "";
    let invDate = "";

    // Extract date & invoice candidate
    for (const tok of tokens) {
      const cleanTok = tok.replace(/[,;:]/g, "");
      if (!invDate && /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanTok)) {
        invDate = cleanTok;
        continue;
      }
      if (!invNumber && !cleanTok.includes("$") && !/^\d{1,2}[/-]\d{1,2}/.test(cleanTok)) {
        if (/^(?:INV-?|#)?[A-Z0-9_-]{3,20}$/i.test(cleanTok)) {
          if (!/^\d+\.\d+$/.test(cleanTok)) {
            invNumber = cleanTok.replace(/^#/, "");
          }
        }
      }
    }

    if (!invNumber) {
      itemCounter++;
      invNumber = `INV-${itemCounter}`;
    }

    const nums = moneyMatches.map((m) => {
      const s = m.replace(/[$ ,]/g, "").replace(/\((.*)\)/, "-$1");
      return parseFloat(s) || 0;
    });

    let gross = 0;
    let discount = 0;
    let writeoff = 0;
    let net = 0;

    if (nums.length >= 4) {
      gross = nums[0];
      discount = nums[1];
      writeoff = nums[2];
      net = nums[3];
    } else if (nums.length === 3) {
      gross = nums[0];
      discount = nums[1];
      net = nums[2];
    } else if (nums.length === 2) {
      gross = nums[0];
      net = nums[1];
      discount = Math.max(0, gross - net);
    } else if (nums.length === 1) {
      gross = nums[0];
      net = nums[0];
    }

    if (!itemsMap.has(invNumber)) {
      itemsMap.set(invNumber, {
        invoice_number: invNumber,
        invoice_date: invDate || undefined,
        gross_amount: 0,
        discount_amount: 0,
        deductions_amount: 0,
        net_paid: 0,
        part_count: 0,
        parts: [],
      });
    }

    const group = itemsMap.get(invNumber)!;
    group.gross_amount += gross;
    group.discount_amount += discount;
    group.deductions_amount += writeoff;
    group.net_paid += net;
    group.part_count = (group.part_count || 0) + 1;
    if (!group.invoice_date && invDate) group.invoice_date = invDate;

    group.parts.push({
      part_id: `${invNumber}-${group.part_count}`,
      date: invDate || undefined,
      gross_amount: gross,
      amount_paid: net,
      discount_amount: discount,
      writeoff_amount: writeoff,
      net_paid: net,
    });
  }

  const items = Array.from(itemsMap.values());

  if (explicitTotals.net === 0 && items.length > 0) {
    explicitTotals = {
      gross: items.reduce((acc, it) => acc + it.gross_amount, 0),
      discount: items.reduce((acc, it) => acc + it.discount_amount, 0),
      writeoff: items.reduce((acc, it) => acc + it.deductions_amount, 0),
      net: items.reduce((acc, it) => acc + it.net_paid, 0),
    };
  }

  return { items, totals: explicitTotals };
}
