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

export interface ParsedInvoiceItem {
  invoice_number: string;
  invoice_date?: string;
  gross_amount: number;
  discount_amount: number;
  deductions_amount: number;
  net_paid: number;
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
        // Extract stream blocks
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

    // Step 4: Parse lines into structured items
    const extractedItems: ParsedInvoiceItem[] = parseRemittanceText(rawText);

    // Calculate totals
    const totalGross = extractedItems.reduce((acc, it) => acc + (it.gross_amount || 0), 0);
    const totalDiscount = extractedItems.reduce((acc, it) => acc + (it.discount_amount || 0), 0);
    const totalDeductions = extractedItems.reduce((acc, it) => acc + (it.deductions_amount || 0), 0);
    const calculatedNet = extractedItems.reduce((acc, it) => acc + (it.net_paid || 0), 0);

    // Look for explicit payment check totals in text
    const explicitTotalPaid = findExplicitTotalPaid(rawText);
    const finalTotalPaid = explicitTotalPaid > 0 ? explicitTotalPaid : calculatedNet;

    // Build the draft record (DO NOT SAVE TO SUPABASE YET)
    const draftRecord = {
      vendor_id: vendorId,
      vendor_name: vendorName,
      file_name: file.name,
      file_size: file.size,
      total_paid: finalTotalPaid,
      total_gross: totalGross > 0 ? totalGross : finalTotalPaid + totalDiscount + totalDeductions,
      total_discount: totalDiscount,
      total_deductions: totalDeductions,
      invoice_count: extractedItems.length,
      items: extractedItems,
      raw_text: rawText.slice(0, 5000),
      is_draft: true, // Marked as draft until confirmed
    };

    return NextResponse.json({
      success: true,
      draft: draftRecord,
      message: `Extracted ${extractedItems.length} invoices from ${file.name}. Review and confirm to save to Supabase.`,
    });
  } catch (err: any) {
    console.error("PDF Remittance processing error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to parse PDF statement" },
      { status: 500 }
    );
  }
}

/**
 * Intelligent parser for remittance lines (supports Pyramid Inc and standard vendor tables)
 */
function parseRemittanceText(text: string): ParsedInvoiceItem[] {
  const items: ParsedInvoiceItem[] = [];
  if (!text) return items;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Check if line contains dollar/monetary patterns
    const moneyMatches = line.match(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g);

    if (moneyMatches && moneyMatches.length >= 1) {
      const tokens = line.split(/\s+/);
      let invNum = "";
      let invDate = "";

      for (const tok of tokens) {
        const cleanTok = tok.replace(/[,;:]/g, "");
        if (!invDate && /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanTok)) {
          invDate = cleanTok;
          continue;
        }

        // Match typical invoice numbers (e.g., 24408, 100923, INV-1234, PYR901)
        if (
          !invNum &&
          /^(?:INV-?|[A-Z]{0,4}\d{4,10}|\d{4,10})$/i.test(cleanTok) &&
          !cleanTok.includes("$") &&
          !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanTok)
        ) {
          invNum = cleanTok;
        }
      }

      if (invNum || moneyMatches.length >= 2) {
        const numbers = moneyMatches.map((m) => {
          const numStr = m.replace(/[$,]/g, "");
          return parseFloat(numStr) || 0;
        });

        let gross = 0;
        let discount = 0;
        let deductions = 0;
        let net = 0;

        if (numbers.length === 1) {
          net = numbers[0];
          gross = numbers[0];
        } else if (numbers.length === 2) {
          gross = Math.max(numbers[0], numbers[1]);
          net = Math.min(numbers[0], numbers[1]);
          discount = Math.max(0, gross - net);
        } else if (numbers.length === 3) {
          gross = numbers[0];
          discount = Math.abs(numbers[1]);
          net = numbers[2];
        } else if (numbers.length >= 4) {
          gross = numbers[0];
          discount = Math.abs(numbers[1]);
          deductions = Math.abs(numbers[2]);
          net = numbers[3];
        }

        const finalInv = invNum || `INV-${items.length + 1}`;
        if (!items.some((it) => it.invoice_number === finalInv)) {
          items.push({
            invoice_number: finalInv,
            invoice_date: invDate || undefined,
            gross_amount: Math.abs(gross),
            discount_amount: Math.abs(discount),
            deductions_amount: Math.abs(deductions),
            net_paid: Math.abs(net),
          });
        }
      }
    }
  }

  return items;
}

/**
 * Searches for explicit check / payment totals in text
 */
function findExplicitTotalPaid(text: string): number {
  if (!text) return 0;
  const match = text.match(
    /(?:check\s+total|total\s+paid|net\s+paid|total\s+payment|payment\s+amount|amount\s+paid)[^\d]*\$?\s*([\d,]+\.\d{2})/i
  );
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(/,/g, ""));
    return isNaN(val) ? 0 : val;
  }
  return 0;
}
