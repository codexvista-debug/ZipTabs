"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  Search,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Check,
  Eye,
  Filter,
} from "lucide-react";

export interface RichExcelCell {
  address: string; // e.g. "A1", "F5"
  colIndex: number; // 0-based
  rowIndex: number; // 0-based
  rowNumber: number; // 1-based (actual Excel row number)
  value: any;
  formattedText: string;
  formula?: string;
  bgColor?: string; // CSS color, e.g. "#70AD47", "#FFFF00", "#1565C0"
  color?: string; // CSS font color, e.g. "#FF0000", "#FFFFFF"
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  horizontalAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  wrapText?: boolean;
  colSpan?: number;
  rowSpan?: number;
  isMergedHidden?: boolean;
}

export interface RichExcelRow {
  rowNumber: number; // Actual Excel row index (e.g. 1, 5, 6, 7...)
  height?: number;
  hidden?: boolean;
  cells: RichExcelCell[];
}

export interface RichExcelWorksheet {
  name: string;
  rows: RichExcelRow[];
  colLetters: string[]; // ['A', 'B', 'C', 'D'...]
  colWidths: number[]; // Widths in px
  maxCols: number;
}

export interface RichExcelWorkbook {
  sheetNames: string[];
  sheets: { [sheetName: string]: RichExcelWorksheet };
}

interface ExcelSheetViewerProps {
  fileUrl: string;
  fileName: string;
  isCsv?: boolean;
}

// Helper: Convert column index (1-based) to Excel Column Letter (A, B, C... Z, AA, AB...)
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

// Helper: Decode "A1" into { col: 1, row: 1 }
function decodeCellAddress(addr: string): { col: number; row: number } | null {
  const match = addr.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const colStr = match[1];
  const row = parseInt(match[2], 10);
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { col, row };
}

// Standard Excel Indexed Colors (0-63)
const EXCEL_INDEXED_COLORS: string[] = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080",
  "#9999FF", "#993366", "#FFFFCC", "#CCFFFF", "#660066", "#FF8080", "#0066CC", "#CCCCFF",
  "#000080", "#FF00FF", "#FFFF00", "#00FFFF", "#800080", "#800000", "#008080", "#0000FF",
  "#00CCFF", "#CCFFFF", "#CCFFCC", "#FFFF99", "#99CCFF", "#FF99CC", "#CC99FF", "#FFCC99",
  "#3366FF", "#33CCCC", "#99CC00", "#FFCC00", "#FF9900", "#FF6600", "#666699", "#969696",
  "#003366", "#339966", "#003300", "#333300", "#993300", "#993366", "#333399", "#333333"
];

// Helper: Parse any Excel color (argb, rgb, theme, indexed) into CSS Hex Color
function parseExcelColor(color: any): string | undefined {
  if (!color) return undefined;

  // Direct hex string
  if (typeof color === "string") {
    const clean = color.replace("#", "").trim();
    if (clean.length === 8) return "#" + clean.slice(2);
    if (clean.length === 6) return "#" + clean;
    return undefined;
  }

  // ARGB (e.g. "FF70AD47")
  if (color.argb) {
    const s = String(color.argb).trim();
    if (s.length === 8) return "#" + s.slice(2);
    if (s.length === 6) return "#" + s;
  }

  // RGB (e.g. "70AD47")
  if (color.rgb) {
    const s = String(color.rgb).trim();
    if (s.length === 8) return "#" + s.slice(2);
    if (s.length === 6) return "#" + s;
  }

  // Indexed color
  if (typeof color.indexed === "number" && EXCEL_INDEXED_COLORS[color.indexed]) {
    return EXCEL_INDEXED_COLORS[color.indexed];
  }

  // Theme color with optional tint
  if (color.theme !== undefined) {
    const themeColors = [
      "#FFFFFF", // 0: Background 1 (Light)
      "#000000", // 1: Text 1 (Dark)
      "#E7E6E6", // 2: Background 2
      "#44546A", // 3: Text 2
      "#4472C4", // 4: Accent 1 (Blue)
      "#ED7D31", // 5: Accent 2 (Orange)
      "#A5A5A5", // 6: Accent 3 (Gray)
      "#FFC000", // 7: Accent 4 (Gold/Yellow)
      "#5B9BD5", // 8: Accent 5 (Light Blue)
      "#70AD47", // 9: Accent 6 (Green)
    ];
    const base = themeColors[color.theme] || "#000000";
    if (color.tint !== undefined && color.tint !== 0) {
      let r = parseInt(base.slice(1, 3), 16);
      let g = parseInt(base.slice(3, 5), 16);
      let b = parseInt(base.slice(5, 7), 16);
      const tint = color.tint;
      if (tint > 0) {
        r = Math.round(r + (255 - r) * tint);
        g = Math.round(g + (255 - g) * tint);
        b = Math.round(b + (255 - b) * tint);
      } else {
        r = Math.round(r * (1 + tint));
        g = Math.round(g * (1 + tint));
        b = Math.round(b * (1 + tint));
      }
      return (
        "#" +
        [r, g, b]
          .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"))
          .join("")
      );
    }
    return base;
  }

  return undefined;
}

// Helper: Calculate if a background color is dark (to auto-switch text to white)
function isDarkColor(hex?: string): boolean {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 135;
}

// Helper: Extract background fill color from cell or parent row
function getCellBgColor(cell: any, row: any): string | undefined {
  if (cell?.fill) {
    if (cell.fill.type === "pattern" && cell.fill.pattern !== "none") {
      const fg = parseExcelColor(cell.fill.fgColor);
      if (fg) return fg;
      const bg = parseExcelColor(cell.fill.bgColor);
      if (bg) return bg;
    } else if (cell.fill.type === "gradient" && cell.fill.stops?.length > 0) {
      const gColor = parseExcelColor(cell.fill.stops[0].color);
      if (gColor) return gColor;
    }
  }
  // Inherit row background fill if cell has none
  if (row?.fill && row.fill.type === "pattern" && row.fill.pattern !== "none") {
    const rColor = parseExcelColor(row.fill.fgColor || row.fill.bgColor);
    if (rColor) return rColor;
  }
  return undefined;
}

// Helper: Extract font styling
function getCellFont(cell: any): {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
} {
  const font = cell?.font;
  if (!font) return {};
  return {
    color: parseExcelColor(font.color),
    bold: Boolean(font.bold),
    italic: Boolean(font.italic),
    underline: Boolean(font.underline),
    fontSize: font.size,
    fontFamily: font.name,
  };
}

// Helper: Format cell value cleanly (Unpacks formulas, shared formulas, currency, dates, percentages, integers)
function getCellFormattedValue(cell: any): {
  formattedText: string;
  rawValue: any;
  formula?: string;
} {
  if (!cell || cell.value === null || cell.value === undefined) {
    return { formattedText: "", rawValue: "" };
  }

  let val = cell.value;
  let formula: string | undefined = undefined;

  // Thoroughly unpack object structures (ExcelJS can wrap formulas, shared formulas, hyperlinks, richText, errors)
  let loopCount = 0;
  while (typeof val === "object" && val !== null && !(val instanceof Date) && loopCount < 5) {
    loopCount++;

    // 1. Shared formula or standard formula
    if (val.formula || val.sharedFormula) {
      const rawF = val.formula || val.sharedFormula;
      if (typeof rawF === "string") {
        formula = rawF.startsWith("=") ? rawF : "=" + rawF;
      }
      if (val.result !== undefined && val.result !== null) {
        val = val.result;
      } else {
        val = formula || "";
        break;
      }
      continue;
    }

    // 2. Result property on any object
    if ("result" in val && val.result !== undefined && val.result !== null) {
      val = val.result;
      continue;
    }

    // 3. Rich text array
    if (val.richText && Array.isArray(val.richText)) {
      val = val.richText.map((t: any) => t.text || "").join("");
      break;
    }

    // 4. Text property (Hyperlink or text object)
    if (val.text !== undefined && val.text !== null) {
      val = val.text;
      break;
    }

    // 5. Error cell (e.g. #N/A, #VALUE!, #REF!)
    if (val.error) {
      val = String(val.error);
      break;
    }

    // 6. Hyperlink object without text
    if (val.hyperlink) {
      val = String(val.hyperlink);
      break;
    }

    // 7. Generic object with 'v' or 'value'
    if (val.v !== undefined) {
      val = val.v;
      continue;
    }
    if (val.value !== undefined) {
      val = val.value;
      continue;
    }

    // 8. If still an object, extract single primitive property or formula
    try {
      const keys = Object.keys(val);
      if (keys.length === 1 && typeof val[keys[0]] !== "object") {
        val = val[keys[0]];
      } else {
        val = formula || "";
      }
    } catch {
      val = formula || "";
    }
    break;
  }

  // Handle Date instance
  if (val instanceof Date) {
    return {
      formattedText: val.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      rawValue: val,
      formula,
    };
  }

  // Guard against any leftover object
  if (typeof val === "object" && val !== null) {
    val = formula || "";
  }

  if (val === null || val === undefined || val === "") {
    return { formattedText: formula || "", rawValue: formula || "", formula };
  }

  // Numbers & Currency
  if (typeof val === "number") {
    // 1. If explicit Excel number format code is available, use SSF
    if (cell.numFmt && XLSX?.SSF?.format) {
      try {
        const formatted = XLSX.SSF.format(cell.numFmt, val);
        if (formatted && typeof formatted === "string") {
          return { formattedText: formatted, rawValue: val, formula };
        }
      } catch {
        // fallback to standard format
      }
    }

    // 2. Intelligent currency / accounting format detection:
    const isCurrencyFmt = cell.numFmt && String(cell.numFmt).includes("$");
    if (isCurrencyFmt) {
      if (val === 0) {
        return { formattedText: "$ -", rawValue: val, formula };
      }
      return {
        formattedText: `$ ${val.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        rawValue: val,
        formula,
      };
    }

    // 3. Floating point decimals clean-up:
    // Eliminate floating noise like 4791.666666666667 -> 4,791.67
    if (!Number.isInteger(val)) {
      return {
        formattedText: val.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        rawValue: val,
        formula,
      };
    }

    // 4. Clean Integer
    return {
      formattedText: val.toLocaleString("en-US"),
      rawValue: val,
      formula,
    };
  }

  // Boolean
  if (typeof val === "boolean") {
    return { formattedText: val ? "TRUE" : "FALSE", rawValue: val, formula };
  }

  return { formattedText: String(val), rawValue: val, formula };
}

export function ExcelSheetViewer({ fileUrl, fileName, isCsv = false }: ExcelSheetViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<RichExcelWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormulas, setShowFormulas] = useState(false);
  const [selectedCell, setSelectedCell] = useState<RichExcelCell | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load and parse workbook with ExcelJS & XLSX
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setWorkbook(null);
    setSelectedCell(null);
    setSearchQuery("");

    const loadSheet = async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file`);
        const buffer = await res.arrayBuffer();
        if (isCancelled) return;

        // Try ExcelJS first for full style, font, color, and formula preservation
        if (!isCsv) {
          try {
            const excelWb = new ExcelJS.Workbook();
            await excelWb.xlsx.load(buffer);

            const sheetNames: string[] = [];
            const sheets: { [sheetName: string]: RichExcelWorksheet } = {};

            excelWb.worksheets.forEach((ws) => {
              const sheetName = ws.name;
              sheetNames.push(sheetName);

              let maxCols = Math.max(1, ws.columnCount || 1);

              // Merged ranges map
              const mergeMap = new Map<string, { colSpan: number; rowSpan: number; isMaster: boolean }>();
              if (ws.model && ws.model.merges) {
                ws.model.merges.forEach((mStr: string) => {
                  const [startCell, endCell] = mStr.split(":");
                  if (startCell && endCell) {
                    const sDec = decodeCellAddress(startCell);
                    const eDec = decodeCellAddress(endCell);
                    if (sDec && eDec) {
                      const colSpan = eDec.col - sDec.col + 1;
                      const rowSpan = eDec.row - sDec.row + 1;
                      mergeMap.set(`${sDec.col},${sDec.row}`, { colSpan, rowSpan, isMaster: true });
                      for (let r = sDec.row; r <= eDec.row; r++) {
                        for (let c = sDec.col; c <= eDec.col; c++) {
                          if (r !== sDec.row || c !== sDec.col) {
                            mergeMap.set(`${c},${r}`, { colSpan: 1, rowSpan: 1, isMaster: false });
                          }
                        }
                      }
                    }
                  }
                });
              }

              // Scan column count
              ws.eachRow({ includeEmpty: false }, (row) => {
                if (row.cellCount > maxCols) maxCols = row.cellCount;
                row.eachCell({ includeEmpty: false }, (_c, colNumber) => {
                  if (colNumber > maxCols) maxCols = colNumber;
                });
              });

              // Column letters & widths
              const colLetters: string[] = [];
              const colWidths: number[] = [];
              for (let c = 1; c <= maxCols; c++) {
                colLetters.push(getColumnLetter(c));
                const colDef = ws.getColumn(c);
                const w = colDef && colDef.width ? Math.max(80, Math.round(colDef.width * 8.5)) : 130;
                colWidths.push(w);
              }

              const rows: RichExcelRow[] = [];

              ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                const cells: RichExcelCell[] = [];

                for (let c = 1; c <= maxCols; c++) {
                  const cell = row.getCell(c);
                  const cellAddress = `${getColumnLetter(c)}${rowNumber}`;

                  const mergeInfo = mergeMap.get(`${c},${rowNumber}`);
                  const isMergedHidden = mergeInfo ? !mergeInfo.isMaster : false;
                  const colSpan = mergeInfo && mergeInfo.isMaster ? mergeInfo.colSpan : undefined;
                  const rowSpan = mergeInfo && mergeInfo.isMaster ? mergeInfo.rowSpan : undefined;

                  const bgColor = getCellBgColor(cell, row);
                  const fontInfo = getCellFont(cell);
                  const valInfo = getCellFormattedValue(cell);

                  // Alignment
                  let hAlign: "left" | "center" | "right" = "left";
                  if (cell.alignment?.horizontal) {
                    const ah = cell.alignment.horizontal;
                    if (ah === "center" || ah === "right" || ah === "left") hAlign = ah;
                  } else if (typeof valInfo.rawValue === "number") {
                    hAlign = "right";
                  }

                  let vAlign: "top" | "middle" | "bottom" = "middle";
                  if (cell.alignment?.vertical) {
                    const av = cell.alignment.vertical;
                    if (av === "top" || av === "bottom" || av === "middle") vAlign = av;
                  }

                  cells.push({
                    address: cellAddress,
                    colIndex: c - 1,
                    rowIndex: rows.length,
                    rowNumber,
                    value: valInfo.rawValue,
                    formattedText: valInfo.formattedText,
                    formula: valInfo.formula,
                    bgColor,
                    color: fontInfo.color,
                    bold: fontInfo.bold,
                    italic: fontInfo.italic,
                    underline: fontInfo.underline,
                    fontSize: fontInfo.fontSize,
                    fontFamily: fontInfo.fontFamily,
                    horizontalAlign: hAlign,
                    verticalAlign: vAlign,
                    wrapText: cell.alignment?.wrapText,
                    colSpan,
                    rowSpan,
                    isMergedHidden,
                  });
                }

                rows.push({
                  rowNumber,
                  height: row.height,
                  hidden: row.hidden,
                  cells,
                });
              });

              sheets[sheetName] = {
                name: sheetName,
                rows,
                colLetters,
                colWidths,
                maxCols,
              };
            });

            if (sheetNames.length > 0) {
              setWorkbook({ sheetNames, sheets });
              setActiveSheetName(sheetNames[0]);
              // Select first cell
              const firstRow = sheets[sheetNames[0]]?.rows[0];
              if (firstRow && firstRow.cells[0]) {
                setSelectedCell(firstRow.cells[0]);
              }
              setIsLoading(false);
              return;
            }
          } catch (excelJsErr) {
            console.warn("ExcelJS load warning, trying SheetJS fallback:", excelJsErr);
          }
        }

        // SheetJS fallback (handles .xls legacy, .csv, or corrupt files)
        const xwb = XLSX.read(buffer, {
          type: "array",
          cellStyles: true,
          cellNF: true,
          cellDates: true,
          cellFormula: true,
        });

        const sheetNames = xwb.SheetNames || [];
        if (sheetNames.length === 0) {
          throw new Error("No worksheets found in this document.");
        }

        const sheets: { [sheetName: string]: RichExcelWorksheet } = {};

        sheetNames.forEach((sheetName) => {
          const ws = xwb.Sheets[sheetName];
          const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
          const maxCols = range.e.c + 1;

          const colLetters: string[] = [];
          const colWidths: number[] = [];
          for (let c = 1; c <= maxCols; c++) {
            colLetters.push(getColumnLetter(c));
            colWidths.push(125);
          }

          const rows: RichExcelRow[] = [];

          for (let R = range.s.r; R <= range.e.r; R++) {
            const rowNumber = R + 1;
            const cells: RichExcelCell[] = [];

            for (let C = range.s.c; C <= range.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
              const cell = ws[cellAddress];

              let bgColor: string | undefined = undefined;
              if (cell?.s?.fgColor?.rgb) {
                bgColor = "#" + cell.s.fgColor.rgb;
              }

              let fontColor: string | undefined = undefined;
              if (cell?.s?.font?.color?.rgb) {
                fontColor = "#" + cell.s.font.color.rgb;
              }

              const valInfo = getCellFormattedValue({ value: cell?.v, numFmt: cell?.z });
              const formattedText = cell?.w ? String(cell.w) : valInfo.formattedText;
              const formula = cell?.f ? "=" + cell.f : valInfo.formula;

              cells.push({
                address: cellAddress,
                colIndex: C,
                rowIndex: R,
                rowNumber,
                value: valInfo.rawValue,
                formattedText,
                formula,
                bgColor,
                color: fontColor,
                bold: cell?.s?.font?.bold,
                horizontalAlign: typeof valInfo.rawValue === "number" ? "right" : "left",
              });
            }

            rows.push({
              rowNumber,
              cells,
            });
          }

          sheets[sheetName] = {
            name: sheetName,
            rows,
            colLetters,
            colWidths,
            maxCols,
          };
        });

        setWorkbook({ sheetNames, sheets });
        setActiveSheetName(sheetNames[0]);
        if (sheets[sheetNames[0]]?.rows[0]?.cells[0]) {
          setSelectedCell(sheets[sheetNames[0]].rows[0].cells[0]);
        }
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Spreadsheet parse failure:", err);
          setLoadError(err?.message || "Failed to parse spreadsheet file.");
          setIsLoading(false);
        }
      }
    };

    loadSheet();
    return () => {
      isCancelled = true;
    };
  }, [fileUrl, isCsv]);

  // Active worksheet
  const currentSheet = useMemo(() => {
    if (!workbook || !activeSheetName) return null;
    return workbook.sheets[activeSheetName] || null;
  }, [workbook, activeSheetName]);

  // Filter rows if search query is provided
  const visibleRows = useMemo(() => {
    if (!currentSheet) return [];
    if (!searchQuery.trim()) return currentSheet.rows;
    const q = searchQuery.toLowerCase();
    return currentSheet.rows.filter((row) =>
      row.cells.some(
        (cell) =>
          cell.formattedText.toLowerCase().includes(q) ||
          (cell.formula && cell.formula.toLowerCase().includes(q))
      )
    );
  }, [currentSheet, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8 select-none">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Reading Excel format, styles & formulas...
        </span>
      </div>
    );
  }

  if (loadError || !workbook || !currentSheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white">Spreadsheet Preview Unavailable</h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          {loadError || "Could not read data from this spreadsheet."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden min-h-0 select-text">
      {/* 1. EXCEL FORMULA BAR & TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-col gap-2 shrink-0 select-none shadow-2xs">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-800">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>EXCEL WORKBOOK</span>
            </span>

            <span className="text-xs font-bold text-slate-700 truncate max-w-[200px] sm:max-w-xs" title={fileName}>
              {fileName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Show Formulas Toggle (fx button) */}
            <button
              type="button"
              onClick={() => setShowFormulas(!showFormulas)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                showFormulas
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              title="Toggle Formula View (Ctrl + `)"
            >
              <span className="font-serif italic font-bold">fx</span>
              <span>{showFormulas ? "Formulas Visible" : "Show Formulas"}</span>
            </button>

            {/* In-Sheet Search */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spreadsheet..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Excel Formula Bar: Name Box + fx + Formula String Input */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
          {/* Active Cell Coordinate Box */}
          <div className="w-16 sm:w-20 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-center font-mono text-xs font-bold text-slate-800 shadow-2xs">
            {selectedCell ? selectedCell.address : "A1"}
          </div>

          {/* Formula 'fx' Indicator */}
          <div className="flex items-center justify-center w-7 h-7 rounded text-slate-500 font-serif italic font-bold text-sm select-none">
            fx
          </div>

          {/* Formula Text Input */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              readOnly
              value={selectedCell ? (selectedCell.formula || selectedCell.formattedText) : ""}
              placeholder="Select any cell to inspect value or formula"
              className="w-full px-3 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-800 focus:outline-none select-text truncate"
            />
            {selectedCell?.formula && (
              <span className="absolute right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Formula
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. EXCEL GRID SPREADSHEET CANVAS */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-white select-text relative"
      >
        <table className="border-collapse table-fixed text-xs font-sans">
          {/* Column widths specification */}
          <colgroup>
            <col style={{ width: 48 }} /> {/* Row header col */}
            {currentSheet.colWidths.map((w, idx) => (
              <col key={idx} style={{ width: w }} />
            ))}
          </colgroup>

          {/* Column Header Row: A, B, C, D... */}
          <thead className="sticky top-0 z-30 select-none">
            <tr className="bg-[#e9edf4] border-b border-slate-300 text-slate-600 text-[11px] font-bold">
              {/* Select All Corner Box */}
              <th className="sticky left-0 z-40 bg-[#e9edf4] border-r border-slate-300 w-12 h-6 text-center text-slate-400 font-mono">
                ◢
              </th>
              {/* Column Letter Badges */}
              {currentSheet.colLetters.map((colLetter, cIdx) => (
                <th
                  key={colLetter}
                  className="px-2 py-1 border-r border-slate-300 text-center font-bold font-mono tracking-wider h-6 overflow-hidden truncate"
                >
                  {colLetter}
                </th>
              ))}
            </tr>
          </thead>

          {/* Spreadsheet Data Rows */}
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={currentSheet.maxCols + 1} className="p-12 text-center text-slate-400 font-medium">
                  {searchQuery ? "No matching cells found." : "This worksheet is empty."}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                return (
                  <tr
                    key={row.rowNumber}
                    className="border-b border-slate-200 hover:bg-emerald-500/5 transition-colors group"
                  >
                    {/* Row Header: Actual Excel Row Number (e.g. 1, 5, 6, 7...) */}
                    <td className="sticky left-0 z-20 bg-[#f1f4f9] group-hover:bg-[#e4e9f2] border-r border-slate-300 px-2 py-1 text-center font-mono text-[10px] text-slate-500 font-semibold select-none h-6">
                      {row.rowNumber}
                    </td>

                    {/* Data Cells */}
                    {row.cells.map((cell) => {
                      if (cell.isMergedHidden) return null;

                      const isSelected = selectedCell?.address === cell.address;
                      const hasFormula = Boolean(cell.formula);
                      const isDark = isDarkColor(cell.bgColor);

                      // Determine text color
                      let cellTextColor = cell.color;
                      if (!cellTextColor) {
                        cellTextColor = isDark ? "#ffffff" : "#0f172a";
                      }

                      // Display content: if showFormulas is active, display the raw formula
                      const displayText = showFormulas && cell.formula ? cell.formula : cell.formattedText;

                      return (
                        <td
                          key={cell.address}
                          colSpan={cell.colSpan}
                          rowSpan={cell.rowSpan}
                          onClick={() => setSelectedCell(cell)}
                          style={{
                            backgroundColor: cell.bgColor || undefined,
                            color: cellTextColor,
                            fontWeight: cell.bold ? 700 : undefined,
                            fontStyle: cell.italic ? "italic" : undefined,
                            textDecoration: cell.underline ? "underline" : undefined,
                            fontSize: cell.fontSize ? `${cell.fontSize}pt` : "11px",
                            fontFamily: cell.fontFamily || "Calibri, Aptos, 'Segoe UI', Arial, sans-serif",
                            textAlign: cell.horizontalAlign || "left",
                            verticalAlign: cell.verticalAlign || "middle",
                            whiteSpace: cell.wrapText ? "normal" : "nowrap",
                          }}
                          className={`px-2 py-1 border-r border-slate-200/90 h-6 truncate cursor-pointer transition-shadow relative ${
                            isSelected
                              ? "outline outline-2 outline-[#107c41] outline-offset-[-2px] z-20 bg-emerald-50/20"
                              : ""
                          }`}
                          title={`${cell.address}: ${cell.formula || cell.formattedText}`}
                        >
                          {/* Cell Content */}
                          <span>{displayText}</span>

                          {/* Subtle formula corner tag indicator */}
                          {hasFormula && !showFormulas && (
                            <span
                              className="absolute top-0 right-0 w-1.5 h-1.5 border-t-[3px] border-r-[3px] border-t-emerald-600 border-r-emerald-600"
                              title={`Formula: ${cell.formula}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. EXCEL BOTTOM WORKSHEET TABS BAR */}
      <footer className="h-10 px-3 bg-[#e9edf4] border-t border-slate-300 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Worksheet Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {workbook.sheetNames.map((name) => {
            const isActive = activeSheetName === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setActiveSheetName(name);
                  setSelectedCell(null);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-t transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/90 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{name}</span>
              </button>
            );
          })}
        </div>

        {/* Excel Status Bar Info */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 shrink-0">
          <span className="hidden sm:inline">READY</span>
          <span className="hidden sm:inline">•</span>
          <span>
            {currentSheet.rows.length} rows × {currentSheet.maxCols} cols
          </span>
          {selectedCell && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="font-mono text-slate-800 font-bold">
                {selectedCell.address}
              </span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
