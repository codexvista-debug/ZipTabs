import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";

// POST: Explicit save endpoint for validated remittance data (Stores data, not the PDF file)
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database offline" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const remittance = body.remittance || body;

    if (!remittance) {
      return NextResponse.json({ success: false, error: "No remittance data provided" }, { status: 400 });
    }

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
      console.error("Save error:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      savedRemittance: inserted,
      message: "Confirmed and stored in Supabase for 30 days.",
    });
  } catch (err: any) {
    console.error("Save remittance exception:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save record" }, { status: 500 });
  }
}
