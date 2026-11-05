/**
 * invoiceUtils.ts
 *
 * Robust vendor and consultant parser for invoice ledgers and Zoho Mail formatted exports.
 * Accurately extracts the consultant name even when the vendor name contains hyphens (e.g., "E-Solutions - Suchetha").
 * Detects abnormal consultant names containing internal billing/installment tags (e.g. "-2p", " 2p", "2P", " 4p"),
 * stray numbers, or abnormal characters so the user can be warned before sending billing emails.
 */

export interface ParsedVendorResult {
  vendor: string;
  consultant: string;
  isAbnormal: boolean;
  abnormalReason: string;
}

/**
 * Parses raw QuickBooks/ledger vendor strings into separated Vendor and Consultant names.
 * Handles diverse delimiter formats:
 * - "E-Solutions - Suchetha" -> Vendor: "E-Solutions", Consultant: "Suchetha"
 * - "Skill Logic Inc- Mohana Latha Pattapu-2p" -> Vendor: "Skill Logic Inc", Consultant: "Mohana Latha Pattapu-2p"
 * - "TRANZEAL, INC-- Deepika Verma" -> Vendor: "TRANZEAL, INC", Consultant: "Deepika Verma"
 * - "Centraprise-Yashwanth Reddy" -> Vendor: "Centraprise", Consultant: "Yashwanth Reddy"
 * - "Digital Intelligence Systems, LLC-Rama Sudheer Topalle-2p" -> Vendor: "Digital Intelligence Systems, LLC", Consultant: "Rama Sudheer Topalle-2p"
 */
export function parseVendorAndConsultant(raw?: string | null): ParsedVendorResult {
  if (!raw || typeof raw !== "string") {
    return { vendor: "", consultant: "", isAbnormal: false, abnormalReason: "" };
  }
  const text = raw.trim();
  if (!text) {
    return { vendor: "", consultant: "", isAbnormal: false, abnormalReason: "" };
  }

  let vendor = text;
  let consultant = text;
  let hasDelimiter = false;

  // 1. Delimiter with space around hyphen: e.g. "E-Solutions - Suchetha", "Tanisha - Shreya"
  // Prioritized so company names containing internal hyphens (like "E-Solutions") aren't prematurely broken
  const spaceHyphenMatch = text.match(/\s+[-—–]+\s+/);
  if (spaceHyphenMatch && spaceHyphenMatch.index !== undefined) {
    const idx = spaceHyphenMatch.index;
    vendor = text.substring(0, idx).trim();
    consultant = text.substring(idx + spaceHyphenMatch[0].length).trim();
    hasDelimiter = true;
  }
  // 2. Multiple hyphens: e.g. "TRANZEAL, INC-- Deepika Verma"
  else if (/[-—–]{2,}/.test(text)) {
    const multiMatch = text.match(/[-—–]{2,}/);
    if (multiMatch && multiMatch.index !== undefined) {
      const idx = multiMatch.index;
      vendor = text.substring(0, idx).trim();
      consultant = text.substring(idx + multiMatch[0].length).trim();
      hasDelimiter = true;
    }
  }
  // 3. Hyphen followed by space: e.g. "Skill Logic Inc- Mohana Latha Pattapu-2p"
  else if (/[-—–]\s+/.test(text)) {
    const hyphenSpaceMatch = text.match(/[-—–]\s+/);
    if (hyphenSpaceMatch && hyphenSpaceMatch.index !== undefined) {
      const idx = hyphenSpaceMatch.index;
      vendor = text.substring(0, idx).trim();
      consultant = text.substring(idx + hyphenSpaceMatch[0].length).trim();
      hasDelimiter = true;
    }
  }
  // 4. Space followed by hyphen: e.g. "Pyramid -Prashanth Kosaraju"
  else if (/\s+[-—–]/.test(text)) {
    const spaceHyphenMatch2 = text.match(/\s+[-—–]/);
    if (spaceHyphenMatch2 && spaceHyphenMatch2.index !== undefined) {
      const idx = spaceHyphenMatch2.index;
      vendor = text.substring(0, idx).trim();
      consultant = text.substring(idx + spaceHyphenMatch2[0].length).trim();
      hasDelimiter = true;
    }
  }
  // 5. Hyphen without spaces: e.g. "Corporate Brokers-Geethika", "Centraprise-Yashwanth Reddy", "Digital Intelligence Systems, LLC-Rama Sudheer Topalle-2p"
  else if (text.includes("-")) {
    const parts = text.split("-");
    // If prefix is single letter (like 'E' in 'E-Solutions-Suchetha'), preserve prefix
    if (parts[0].length === 1 && parts.length > 2) {
      vendor = parts.slice(0, 2).join("-").trim();
      consultant = parts.slice(2).join("-").trim();
    } else {
      vendor = parts[0].trim();
      consultant = parts.slice(1).join("-").trim();
    }
    hasDelimiter = true;
  }

  // Detect abnormal consultant name
  let isAbnormal = false;
  let abnormalReason = "";

  if (hasDelimiter && consultant) {
    const cleanConsultant = consultant.trim();

    // Check for payment / installment billing tags e.g. "-2p", " 2p", "2P", " 4p", "-4p"
    if (/(?:[-_\s]\s*)?\b\d+p\b/i.test(cleanConsultant) || /[-_]\d+/i.test(cleanConsultant)) {
      isAbnormal = true;
      const match = cleanConsultant.match(/(?:[-_\s]\s*)?\b\d+p\b/i) || cleanConsultant.match(/[-_]\d+/i);
      abnormalReason = `Contains internal billing tag '${match ? match[0].trim() : "tag"}'`;
    } else if (/\d/.test(cleanConsultant)) {
      isAbnormal = true;
      abnormalReason = "Contains numbers or digits";
    } else if (/[#\$%&*=_+<>[\]]/.test(cleanConsultant)) {
      isAbnormal = true;
      abnormalReason = "Contains abnormal special characters";
    } else if (cleanConsultant.length <= 1) {
      isAbnormal = true;
      abnormalReason = "Consultant name is missing or too short";
    }
  }

  return { vendor, consultant, isAbnormal, abnormalReason };
}

/**
 * Returns clean consultant name for Zoho Mail copy.
 */
export function getCleanConsultantName(raw?: string | null): string {
  const res = parseVendorAndConsultant(raw);
  return res.consultant || res.vendor || "—";
}

/**
 * Inspects a list of records and returns all abnormal consultant detections.
 */
export function checkConsultantsAbnormal(rows: { vendor_name?: string | null }[]) {
  const abnormalItems: ParsedVendorResult[] = [];
  const abnormalNamesSet = new Set<string>();

  for (const row of rows) {
    const parsed = parseVendorAndConsultant(row.vendor_name);
    if (parsed.isAbnormal) {
      abnormalItems.push(parsed);
      if (parsed.consultant) {
        abnormalNamesSet.add(parsed.consultant);
      }
    }
  }

  return {
    hasAbnormal: abnormalItems.length > 0,
    abnormalItems,
    abnormalNames: Array.from(abnormalNamesSet),
  };
}
