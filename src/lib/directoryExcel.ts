import * as XLSX from "xlsx";
import Papa from "papaparse";
import { DirectoryRecord, formatUSAPhone } from "./directoryCrypto";

/**
 * Intelligent column matching for spreadsheets.
 */
function getMatchingField(
  row: Record<string, any>,
  patterns: string[]
): string {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanPattern
    );
    if (match && row[match] !== undefined && row[match] !== null) {
      const val = String(row[match]).trim();
      if (val) return val;
    }
  }

  // Fallback to substring matching
  for (const pattern of patterns) {
    const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(cleanPattern)
    );
    if (match && row[match] !== undefined && row[match] !== null) {
      const val = String(row[match]).trim();
      if (val) return val;
    }
  }

  return "";
}

export interface ParsedSpreadsheetContact {
  division?: "employee" | "vendor";
  company: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  raw: Record<string, any>;
}

export interface ParseResult {
  records: ParsedSpreadsheetContact[];
  headers: string[];
  totalRows: number;
  detectedColumns: {
    company?: string;
    name?: string;
    email?: string;
    phone?: string;
    division?: string;
  };
}

/**
 * Parses an Excel or CSV file into structured contact records.
 */
export async function parseSpreadsheetFile(
  file: File,
  defaultDivision: "employee" | "vendor" = "employee"
): Promise<ParseResult> {
  let rawRows: Record<string, any>[] = [];
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    rawRows = (result.data as Record<string, any>[]).filter(
      (r) => Object.values(r).some((v) => v !== null && String(v).trim() !== "")
    );
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  } else {
    throw new Error("Unsupported file format. Please upload a .xlsx, .xls, or .csv file.");
  }

  if (rawRows.length === 0) {
    throw new Error("No data rows found in the selected file.");
  }

  const sampleRow = rawRows[0];
  const headers = Object.keys(sampleRow);

  const parsedRecords: ParsedSpreadsheetContact[] = [];

  for (const row of rawRows) {
    const company = getMatchingField(row, [
      "Company",
      "Company Name",
      "Organization",
      "Employer",
      "Business",
      "Vendor",
      "Supplier",
      "Client",
      "Firm",
    ]);

    const name = getMatchingField(row, [
      "Name",
      "Full Name",
      "Employee Name",
      "Vendor Name",
      "Contact Name",
      "Contact",
      "Person",
      "Staff",
    ]);

    const email = getMatchingField(row, [
      "Email",
      "Email Address",
      "E-mail",
      "Mail",
      "Work Email",
      "Corporate Email",
    ]);

    const phone = getMatchingField(row, [
      "Phone Number",
      "Phone",
      "Telephone",
      "Tel",
      "Mobile",
      "Cell",
      "Work Phone",
      "Office Phone",
      "Direct Line",
      "Ext",
    ]);

    const divisionRaw = getMatchingField(row, [
      "Division",
      "Category",
      "Type",
      "Group",
      "Classification",
    ]).toLowerCase();

    let rowDivision: "employee" | "vendor" = defaultDivision;
    if (divisionRaw.includes("vendor") || divisionRaw.includes("contractor") || divisionRaw.includes("supplier") || divisionRaw.includes("partner")) {
      rowDivision = "vendor";
    } else if (divisionRaw.includes("employee") || divisionRaw.includes("staff") || divisionRaw.includes("internal") || divisionRaw.includes("team")) {
      rowDivision = "employee";
    }

    const notes = getMatchingField(row, [
      "Notes",
      "Note",
      "Comments",
      "Title",
      "Role",
      "Department",
      "Extension",
    ]);

    // Accept row if at least name, phone, email, or company is present
    if (name || phone || email || company) {
      parsedRecords.push({
        division: rowDivision,
        company: company || "Corporate",
        name: name || "Unknown Contact",
        email: email || "",
        phone: formatUSAPhone(phone || ""),
        notes: notes || undefined,
        raw: row,
      });
    }
  }

  return {
    records: parsedRecords,
    headers,
    totalRows: parsedRecords.length,
    detectedColumns: {
      company: headers.find((h) => h.toLowerCase().includes("company")),
      name: headers.find((h) => h.toLowerCase().includes("name")),
      email: headers.find((h) => h.toLowerCase().includes("email")),
      phone: headers.find((h) => h.toLowerCase().includes("phone")),
      division: headers.find((h) => h.toLowerCase().includes("division") || h.toLowerCase().includes("type")),
    },
  };
}

/**
 * Generates and downloads a sample Excel template for importing.
 */
export function downloadDirectoryTemplate(type: "employee" | "vendor" | "combined" = "combined") {
  const sampleData =
    type === "employee"
      ? [
          {
            Company: "Acme Logistics Inc.",
            Name: "Sarah Jenkins",
            Email: "sjenkins@acmelogistics.com",
            "Phone Number": "(555) 392-8192",
            Notes: "Operations Director - Ext 104",
          },
          {
            Company: "Acme Logistics Inc.",
            Name: "David Miller",
            Email: "dmiller@acmelogistics.com",
            "Phone Number": "(555) 748-2194",
            Notes: "Senior Dispatcher - Ext 208",
          },
        ]
      : type === "vendor"
      ? [
          {
            Company: "Penske Truck Leasing",
            Name: "Marcus Vance",
            Email: "mvance@penske.com",
            "Phone Number": "(800) 526-0798",
            Notes: "Fleet Account Executive",
          },
          {
            Company: "Pilot Flying J Fuel Services",
            Name: "Corporate Dispatch",
            Email: "fleetbilling@pilotflyingj.com",
            "Phone Number": "(877) 866-7378",
            Notes: "24/7 National Commercial Fuel Desk",
          },
        ]
      : [
          {
            Division: "Employee",
            Company: "ZipTabs Corp",
            Name: "Chief Executive Officer",
            Email: "chief@ziptabs.com",
            "Phone Number": "(555) 100-2000",
            Notes: "Executive Suite",
          },
          {
            Division: "Employee",
            Company: "ZipTabs Corp",
            Name: "Rachel Hayes",
            Email: "rhayes@ziptabs.com",
            "Phone Number": "(555) 240-3918",
            Notes: "Finance & Accounts Payable",
          },
          {
            Division: "Vendor",
            Company: "QuickBooks Enterprise Support",
            Name: "Enterprise Billing Desk",
            Email: "support@intuit.com",
            "Phone Number": "(800) 446-8848",
            Notes: "Priority Account Rep",
          },
          {
            Division: "Vendor",
            Company: "Leopard TMS Solutions",
            Name: "Technical Dispatch Support",
            Email: "dispatch@leopardtms.com",
            "Phone Number": "(888) 920-4100",
            Notes: "24/7 Logistics Helpdesk",
          },
        ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set nice column widths
  ws["!cols"] = [
    ...(type === "combined" ? [{ wch: 14 }] : []),
    { wch: 30 },
    { wch: 25 },
    { wch: 32 },
    { wch: 22 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts Template");

  const fileName = `ZipTabs_Phone_Directory_Template_${type}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports current directory records to an Excel file.
 */
export function exportDirectoryToExcel(
  records: DirectoryRecord[],
  divisionFilter?: "employee" | "vendor" | "all"
) {
  const filtered =
    !divisionFilter || divisionFilter === "all"
      ? records
      : records.filter((r) => r.division === divisionFilter);

  const exportData = filtered.map((r) => ({
    Division: r.division === "employee" ? "Employee" : "Vendor",
    Company: r.company,
    Name: r.name,
    Email: r.email,
    "Phone Number": r.phone,
    Notes: r.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws["!cols"] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 25 },
    { wch: 32 },
    { wch: 22 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Directory Contacts");

  const dateStr = new Date().toISOString().split("T")[0];
  const fileSuffix = divisionFilter && divisionFilter !== "all" ? `_${divisionFilter}s` : "";
  const fileName = `Phone_Directory_Export${fileSuffix}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
