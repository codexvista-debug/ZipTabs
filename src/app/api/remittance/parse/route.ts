import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PDFParse } from "pdf-parse";

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

// 2. DELETE: Remove a specific remittance
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
    return NextResponse.json({ success: true, message: "Remittance record removed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

interface ParsedInvoiceItem {
  invoice_number: string;
  invoice_date?: string;
  gross_amount: number;
  discount_amount: number;
  deductions_amount: number;
  net_paid: number;
  notes?: string;
}

// 3. POST: Upload and Parse Remittance Advice PDF
export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const vendorId = (formData.get("vendorId") as string) || "pyramid";
    const vendorName = (formData.get("vendorName") as string) || "Pyramid Inc";

    if (!file) {
      return NextResponse.json({ success: false, error: "No PDF file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text and table data using PDFParse
    let rawText = "";
    let extractedItems: ParsedInvoiceItem[] = [];

    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      rawText = textResult?.text || "";
    } catch (parseErr) {
      console.warn("Primary PDFParse extraction error:", parseErr);
    }

    // Parse the extracted text into structured invoice rows
    extractedItems = parseRemittanceText(rawText);

    // If text extraction yielded no rows, try regex fallback on buffer text streams
    if (extractedItems.length === 0) {
      const stringData = buffer.toString("latin1");
      extractedItems = parseRemittanceText(stringData);
    }

    // Calculate totals
    const totalGross = extractedItems.reduce((acc, it) => acc + (it.gross_amount || 0), 0);
    const totalDiscount = extractedItems.reduce((acc, it) => acc + (it.discount_amount || 0), 0);
    const totalDeductions = extractedItems.reduce((acc, it) => acc + (it.deductions_amount || 0), 0);
    const calculatedNet = extractedItems.reduce((acc, it) => acc + (it.net_paid || 0), 0);

    // Look for explicit check/ACH total paid amount in the PDF text
    const explicitTotalPaid = findExplicitTotalPaid(rawText);
    const finalTotalPaid = explicitTotalPaid > 0 ? explicitTotalPaid : calculatedNet;

    // 30-day retention calculation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newRecord = {
      vendor_id: vendorId,
      vendor_name: vendorName,
      file_name: file.name,
      file_size: file.size,
      total_paid: finalTotalPaid,
      total_gross: totalGross > 0 ? totalGross : finalTotalPaid + totalDiscount,
      total_discount: totalDiscount,
      total_deductions: totalDeductions,
      invoice_count: extractedItems.length,
      items: extractedItems,
      raw_text: rawText.slice(0, 5000), // First 5k chars for reference
      created_at: now.toISOString(),
      expires_at: expiresAt,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("vendor_remittances")
      .insert(newRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert remittance record:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      remittance: inserted,
      message: `Parsed ${extractedItems.length} invoices from ${file.name}. Stored for 30 days.`,
    });
  } catch (err: any) {
    console.error("Remittance processing error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Intelligent parser for remittance lines (supports Pyramid Inc and standard vendor formats)
 */
function parseRemittanceText(text: string): ParsedInvoiceItem[] {
  const items: ParsedInvoiceItem[] = [];
  if (!text) return items;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Look for lines that contain an invoice number and monetary values
    // Matches common invoice numbers: digits, alphanumeric like INV-1234, 30018, 24408, PYR-109
    // And contains dollar amounts like $14,080.00 or 14080.00 or 563.20
    const moneyMatches = line.match(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g);

    if (moneyMatches && moneyMatches.length >= 1) {
      // Find candidate invoice number in the line
      const tokens = line.split(/\s+/);
      let invNum = "";
      let invDate = "";

      for (const tok of tokens) {
        // Match invoice tokens (alphanumeric, at least 4 chars or starting with digit, not a dollar amount or date)
        const cleanTok = tok.replace(/[,;:]/g, "");
        if (!invDate && /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleanTok)) {
          invDate = cleanTok;
          continue;
        }

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
        // Parse numbers
        const numbers = moneyMatches.map((m) => {
          const numStr = m.replace(/[$,]/g, "");
          return parseFloat(numStr) || 0;
        });

        let gross = 0;
        let discount = 0;
        let deductions = 0;
        let net = 0;

        if (numbers.length === 1) {
          // Single amount -> net paid
          net = numbers[0];
          gross = numbers[0];
        } else if (numbers.length === 2) {
          // [Gross, Net] or [Invoice, Discount]
          gross = Math.max(numbers[0], numbers[1]);
          net = Math.min(numbers[0], numbers[1]);
          discount = Math.max(0, gross - net);
        } else if (numbers.length === 3) {
          // [Gross, Discount, Net]
          gross = numbers[0];
          discount = Math.abs(numbers[1]);
          net = numbers[2];
        } else if (numbers.length >= 4) {
          // [Gross, Discount, Deductions, Net]
          gross = numbers[0];
          discount = Math.abs(numbers[1]);
          deductions = Math.abs(numbers[2]);
          net = numbers[3];
        }

        // Avoid adding duplicate invoice row
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
 * Searches for check / payment totals like "Check Total: $28,450.00" or "Total Paid: $13,516.80"
 */
function findExplicitTotalPaid(text: string): number {
  if (!text) return 0;
  const match = text.match(/(?:check\s+total|total\s+paid|net\s+paid|total\s+payment|payment\s+amount|amount\s+paid)[^\d]*\$?\s*([\d,]+\.\d{2})/i);
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(/,/g, ""));
    return isNaN(val) ? 0 : val;
  }
  return 0;
}
