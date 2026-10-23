"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import {
  X,
  Download,
  ExternalLink,
  Shield,
  Clock,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";

export interface AttachmentViewerFile {
  id?: string;
  name: string;
  url?: string;
  public_url?: string;
  size?: number;
  type?: string;
  mimetype?: string;
  retention_type?: "permanent" | "temporary";
  expires_at?: string | null;
}

interface FullAttachmentViewerProps {
  file: AttachmentViewerFile | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleRetention?: (file: any) => void;
  onDeleteFile?: (file: any) => void;
}

interface ParsedWorkbook {
  sheetNames: string[];
  sheetsData: { [sheetName: string]: (string | number)[][] };
}

export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function FullAttachmentViewer({
  file,
  isOpen,
  onClose,
  onToggleRetention,
  onDeleteFile,
}: FullAttachmentViewerProps) {
  // Global loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Excel / Spreadsheet State
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [sheetSearch, setSheetSearch] = useState("");

  // Word Document (.docx) HTML State
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Text / Code Content State
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Image Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const fileName = file.name || "Attachment";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const fileUrl = file.url || file.public_url || "";
  const mimeType = (file.type || file.mimetype || "").toLowerCase();

  const isImage = mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext);
  const isPdf = ext === "pdf" || mimeType === "application/pdf";
  const isExcel = ["xlsx", "xls"].includes(ext) || mimeType.includes("spreadsheetml") || mimeType.includes("excel");
  const isCsv = ext === "csv";
  const isWord = ["docx", "doc"].includes(ext) || mimeType.includes("wordprocessingml") || mimeType.includes("msword");
  const isTextOrCode = [
    "txt", "md", "json", "js", "ts", "tsx", "jsx", "html", "css",
    "py", "sql", "xml", "log", "yaml", "yml", "env", "sh", "rtf"
  ].includes(ext) || mimeType.startsWith("text/");
  const isVideo = mimeType.startsWith("video/") || ["mp4", "webm", "ogg"].includes(ext);
  const isAudio = mimeType.startsWith("audio/") || ["mp3", "wav", "aac"].includes(ext);

  // Load and parse document contents based on type
  useEffect(() => {
    let isCancelled = false;

    // Reset states
    setIsLoading(true);
    setLoadError(null);
    setWorkbook(null);
    setDocxHtml(null);
    setTextContent(null);
    setZoomLevel(1);
    setSheetSearch("");

    if (!fileUrl) {
      setIsLoading(false);
      setLoadError("No download URL available for this file.");
      return;
    }

    // 1. Images, PDFs, Audio, Video render directly
    if (isImage || isPdf || isVideo || isAudio) {
      setIsLoading(false);
      return;
    }

    // 2. Excel Spreadsheets (.xlsx, .xls)
    if (isExcel) {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download spreadsheet`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          if (isCancelled) return;
          try {
            const wb = XLSX.read(buffer, { type: "array" });
            const sheetNames = wb.SheetNames || [];
            if (sheetNames.length === 0) {
              throw new Error("No worksheets found in this workbook.");
            }

            const sheetsData: { [name: string]: (string | number)[][] } = {};
            sheetNames.forEach((name) => {
              const sheet = wb.Sheets[name];
              const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
              sheetsData[name] = rawRows;
            });

            setWorkbook({ sheetNames, sheetsData });
            setActiveSheetName(sheetNames[0]);
          } catch (err: any) {
            console.error("XLSX parse error:", err);
            setLoadError(err.message || "Failed to parse Excel workbook.");
          }
        })
        .catch((err: any) => {
          if (!isCancelled) {
            console.error("Fetch spreadsheet error:", err);
            setLoadError(err.message || "Network error loading spreadsheet.");
          }
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
      return () => { isCancelled = true; };
    }

    // 3. Word Documents (.docx)
    if (isWord) {
      if (ext === "docx") {
        fetch(fileUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download Word document`);
            return res.arrayBuffer();
          })
          .then((arrayBuffer) => {
            if (isCancelled) return;
            return mammoth.convertToHtml({ arrayBuffer });
          })
          .then((result) => {
            if (isCancelled || !result) return;
            setDocxHtml(result.value || "<p>Document is empty.</p>");
          })
          .catch((err: any) => {
            if (!isCancelled) {
              console.error("Word document preview error:", err);
              setLoadError("Unable to extract document layout. You can still download the original document.");
            }
          })
          .finally(() => {
            if (!isCancelled) setIsLoading(false);
          });
      } else {
        setIsLoading(false);
        setLoadError("Legacy .doc format cannot be rendered in-browser. Please download to view in Microsoft Word.");
      }
      return () => { isCancelled = true; };
    }

    // 4. CSV Files
    if (isCsv) {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download CSV`);
          return res.text();
        })
        .then((text) => {
          if (isCancelled) return;
          try {
            const wb = XLSX.read(text, { type: "string" });
            const sheetName = wb.SheetNames[0] || "CSV";
            const rawRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
            setWorkbook({
              sheetNames: [sheetName],
              sheetsData: { [sheetName]: rawRows },
            });
            setActiveSheetName(sheetName);
          } catch {
            const lines = text.split(/\r?\n/).map((l) => l.split(","));
            setWorkbook({
              sheetNames: ["CSV"],
              sheetsData: { CSV: lines },
            });
            setActiveSheetName("CSV");
          }
        })
        .catch((err: any) => {
          if (!isCancelled) {
            console.error("CSV preview error:", err);
            setLoadError(err.message || "Failed to load CSV file.");
          }
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
      return () => { isCancelled = true; };
    }

    // 5. Code & Text Files
    if (isTextOrCode) {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download text file`);
          return res.text();
        })
        .then((text) => {
          if (!isCancelled) setTextContent(text);
        })
        .catch((err: any) => {
          if (!isCancelled) {
            console.error("Text preview error:", err);
            setLoadError(err.message || "Failed to load text content.");
          }
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
      return () => { isCancelled = true; };
    }

    setIsLoading(false);
    return () => { isCancelled = true; };
  }, [file.id, fileUrl, ext, isExcel, isWord, isCsv, isTextOrCode, isImage, isPdf, isVideo, isAudio]);

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Retention Details (if applicable)
  const isTemporary = file.retention_type === "temporary";
  let daysRemaining = 30;
  let isExpiringSoon = false;
  if (isTemporary && file.expires_at) {
    const diffMs = new Date(file.expires_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    isExpiringSoon = daysRemaining <= 3;
  }

  // Active Sheet Data for Spreadsheets
  const activeRows = (workbook && activeSheetName && workbook.sheetsData[activeSheetName]) || [];
  const filteredRows = activeRows.filter((row) => {
    if (!sheetSearch.trim()) return true;
    const q = sheetSearch.toLowerCase();
    return row.some((cell) => String(cell || "").toLowerCase().includes(q));
  });

  return (
    /* The viewer takes up the WHOLE space on the right side of the left sidebar */
    <aside
      className="fixed inset-y-0 right-0 left-0 lg:left-[260px] z-50 flex flex-col bg-[#070c18] border-l border-[#15203b] shadow-2xl text-slate-200 animate-in fade-in duration-200 select-none"
      aria-label="Attachment Preview Canvas"
    >
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-6 border-b border-[#15203b] bg-[#0c1427] flex items-center justify-between gap-3 shrink-0">
        {/* Left: Attachment Info */}
        <div className="flex items-center gap-3 min-w-0 max-w-[55%] sm:max-w-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-purple-400" />
            ) : isExcel || isCsv ? (
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            ) : isWord ? (
              <FileText className="w-5 h-5 text-blue-400" />
            ) : isPdf ? (
              <FileText className="w-5 h-5 text-rose-400" />
            ) : (
              <FileCode className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate" title={fileName}>
              {fileName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
              {file.size ? <span>{formatBytes(file.size)}</span> : null}
              {file.size ? <span>•</span> : null}
              <span className="font-mono uppercase font-bold text-slate-400">{ext || "FILE"}</span>

              {/* Retention badge if available */}
              {file.retention_type && onToggleRetention && (
                <>
                  <span>•</span>
                  {isTemporary ? (
                    <button
                      type="button"
                      onClick={() => onToggleRetention(file)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        isExpiringSoon
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      }`}
                      title="Click to keep in permanent Vault"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Temp ({daysRemaining}d left)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleRetention(file)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors cursor-pointer"
                      title="Click to set 30-day Temp Stash"
                    >
                      <Shield className="w-3 h-3" />
                      <span>Vault</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Toolbar: Zoom / Copy + Prominent Download & Close Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* Image Zoom Buttons */}
          {isImage && (
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-2 text-slate-400">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Copy Button for text files */}
          {isTextOrCode && textContent && (
            <button
              type="button"
              onClick={handleCopyText}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Copy Content"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? "Copied" : "Copy"}</span>
            </button>
          )}

          {/* Open Raw in New Window (Optional) */}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors hidden md:block"
              title="Open raw attachment in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* PROMINENT DOWNLOAD BUTTON */}
          {fileUrl && (
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {/* PROMINENT CLOSE BUTTON */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-300 border border-slate-700 hover:border-rose-800 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Close attachment viewer (Esc)"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="text-xs font-semibold hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* Main Full-Space Canvas */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative bg-[#050811]">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
            <Loader2 className="w-9 h-9 animate-spin text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Opening attachment...
            </span>
          </div>
        )}

        {/* Fallback Notice Card */}
        {!isLoading && loadError && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Preview Notice</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{loadError}</p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Raw Link</span>
              </a>
            </div>
          </div>
        )}

        {/* 1. Full-Space Image Viewer */}
        {!isLoading && !loadError && isImage && (
          <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 sm:p-8 select-none">
            <img
              src={fileUrl}
              alt={fileName}
              style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl origin-center"
            />
          </div>
        )}

        {/* 2. Full-Space Native Excel & CSV Spreadsheet Grid */}
        {!isLoading && !loadError && (isExcel || isCsv) && workbook && (
          <div className="flex-1 flex flex-col bg-white text-slate-900 overflow-hidden min-h-0 select-text">
            {/* Spreadsheet Toolbar */}
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Search in Sheet */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  placeholder="Search in sheet..."
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-3">
                <span>
                  <strong>{filteredRows.length}</strong> rows
                  {sheetSearch ? ` (filtered from ${activeRows.length})` : ""}
                </span>
                <span>•</span>
                <span>Sheet: <strong>{activeSheetName}</strong></span>
              </div>
            </div>

            {/* Scrollable Spreadsheet Table */}
            <div className="flex-1 overflow-auto bg-white select-text">
              <table className="w-full border-collapse text-xs font-sans">
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        {sheetSearch ? "No matching rows found." : "This worksheet is empty."}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rIdx) => {
                      const isHeaderRow = rIdx === 0 && !sheetSearch;
                      return (
                        <tr
                          key={rIdx}
                          className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${
                            isHeaderRow ? "bg-slate-100 font-bold text-slate-800 sticky top-0 z-10 shadow-2xs" : ""
                          }`}
                        >
                          {/* Row Number */}
                          <td className="py-2 px-3 text-[10px] text-center font-mono text-slate-400 bg-slate-50 border-r border-slate-200 w-12 shrink-0 select-none">
                            {rIdx + 1}
                          </td>

                          {/* Cells */}
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`py-2 px-3 border-r border-slate-100 truncate max-w-[300px] ${
                                typeof cell === "number" ? "text-right font-mono text-slate-800" : "text-slate-700"
                              }`}
                              title={String(cell || "")}
                            >
                              {cell !== null && cell !== undefined ? String(cell) : ""}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Worksheet Tabs Bar */}
            {workbook.sheetNames.length > 1 && (
              <div className="px-3 py-1.5 bg-slate-200 border-t border-slate-300 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                  Sheets:
                </span>
                {workbook.sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setActiveSheetName(name);
                      setSheetSearch("");
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeSheetName === name
                        ? "bg-white text-blue-700 shadow-xs border-b-2 border-blue-600"
                        : "text-slate-600 hover:bg-slate-300/80 hover:text-slate-900"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Full-Space Word Document Canvas (.docx) */}
        {!isLoading && !loadError && isWord && docxHtml && (
          <div className="flex-1 overflow-auto p-4 sm:p-10 bg-[#080d1a] select-text">
            <div
              className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-14 min-h-full border border-slate-200 font-serif leading-relaxed prose prose-slate max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        )}

        {/* 4. Full-Space PDF Viewer */}
        {!isLoading && !loadError && isPdf && (
          <div className="flex-1 w-full h-full relative bg-slate-900">
            <iframe
              src={`${fileUrl}#toolbar=1`}
              title={fileName}
              className="w-full h-full border-0 bg-slate-900"
            />
          </div>
        )}

        {/* 5. Full-Space Code & Text Viewer */}
        {!isLoading && !loadError && isTextOrCode && !isCsv && (
          <div className="flex-1 w-full h-full overflow-auto p-4 sm:p-8 bg-[#070b16] font-mono text-xs sm:text-[13px] text-slate-200 leading-relaxed select-text">
            <pre className="whitespace-pre-wrap break-words">{textContent || "Document is empty."}</pre>
          </div>
        )}

        {/* 6. Full-Space Video Viewer */}
        {!isLoading && !loadError && isVideo && (
          <div className="flex-1 w-full h-full flex items-center justify-center p-4">
            <video controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" src={fileUrl}>
              Your browser does not support HTML5 video preview.
            </video>
          </div>
        )}

        {/* 7. Full-Space Audio Viewer */}
        {!isLoading && !loadError && isAudio && (
          <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg">
              <FileCode className="w-10 h-10" />
            </div>
            <div className="text-center">
              <div className="font-bold text-base text-white">{fileName}</div>
              <div className="text-xs text-slate-400 mt-1">{formatBytes(file.size)}</div>
            </div>
            <audio controls autoPlay className="w-full max-w-md mt-2" src={fileUrl}>
              Your browser does not support HTML5 audio.
            </audio>
          </div>
        )}

        {/* 8. Generic / Unsupported Binary Format */}
        {!isLoading && !loadError && !isImage && !isPdf && !isCsv && !isExcel && !isWord && !isTextOrCode && !isVideo && !isAudio && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mb-4 shadow-xl">
              <FileArchive className="w-10 h-10" />
            </div>
            <h3 className="text-base font-bold text-white">{fileName}</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Direct in-browser preview is not available for this binary format ({ext.toUpperCase() || "unknown"}).
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Raw Link</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
