import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractText } from "unpdf";

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
  part_id: string; // e.g. "33990-1"
  voucher_number?: string; // e.g. "00325494"
  date?: string; // e.g. "6/16/2026"
  gross_amount: number; // Amount
  amount_paid: number; // Amount Paid
  discount_amount: number; // Discount
  writeoff_amount: number; // Writeoff / Deductions
  net_paid: number; // Net
}

export interface ParsedInvoiceItem {
  invoice_number: string; // Base invoice, e.g. "33990"
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
// - Multipart: Parse PDF only (returns draft data to user for validation - NOT stored in DB)
// - JSON: Save validated data to Supabase (stores data only, not PDF file)
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
        vendor_name: remittance.vendor_name || "Pyramid Inc",
        file_name: remittance.file_name || "Remittance_Statement.pdf",
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

  // CASE B: User uploaded a PDF file to parse and extract draft data
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const vendorId = (formData.get("vendorId") as string) || "pyramid";
    const vendorName = (formData.get("vendorName") as string) || "Pyramid Inc";

    if (!file) {
      return NextResponse.json({ success: false, error: "No PDF file received" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
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

    // Calculate totals
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
      is_draft: true, // Marked as draft until confirmed
    };

    return NextResponse.json({
      success: true,
      draft: draftRecord,
      message: `Extracted ${invoiceGroups.length} invoices from ${file.name}. Review and confirm to save to Supabase.`,
    });
  } catch (err: any) {
    console.error("PDF Remittance processing error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to parse PDF statement" },
      { status: 500 }
    );
  }
}

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

/**
 * Intelligent parser for remittance lines
 * Specifically recognizes vendor layout:
 * [Our Voucher Number] [Your Voucher Number] [Date] [Amount] [Amount Paid] [Discount] [Writeoff] [Net]
 * Automatically groups split invoice parts (e.g. 33990-1 ... 33990-5) under parent invoice 33990.
 */
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
