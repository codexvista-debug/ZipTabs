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
  ChevronRight,
  Eye,
} from "lucide-react";
import { DriveFile, formatBytes } from "./DriveView";

interface UniversalFileViewerProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleRetention: (file: DriveFile) => void;
  onDeleteFile: (file: DriveFile) => void;
}

interface ParsedWorkbook {
  sheetNames: string[];
  sheetsData: { [sheetName: string]: (string | number)[][] };
}

export function UniversalFileViewer({
  file,
  isOpen,
  onClose,
  onToggleRetention,
  onDeleteFile,
}: UniversalFileViewerProps) {
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

  if (!isOpen || !file) return null;

  const fileName = file.name || "Untitled";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const publicUrl = file.public_url || "";
  const mimeType = file.type || "";

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

    if (!publicUrl) {
      setIsLoading(false);
      setLoadError("No download URL available for this file.");
      return;
    }

    // 1. Images, PDFs, Audio, Video don't require pre-parsing
    if (isImage || isPdf || isVideo || isAudio) {
      setIsLoading(false);
      return;
    }

    // 2. Excel Spreadsheets (.xlsx, .xls)
    if (isExcel) {
      fetch(publicUrl)
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
        fetch(publicUrl)
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
        // Legacy .doc format
        setIsLoading(false);
        setLoadError("Legacy .doc format cannot be rendered in-browser. Please download to view in Microsoft Word.");
      }
      return () => { isCancelled = true; };
    }

    // 4. CSV Files
    if (isCsv) {
      fetch(publicUrl)
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
            // Fallback simple line split
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
      fetch(publicUrl)
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

    // Generic / Other
    setIsLoading(false);
    return () => { isCancelled = true; };
  }, [file.id, publicUrl, ext, isExcel, isWord, isCsv, isTextOrCode, isImage, isPdf, isVideo, isAudio]);

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Retention Details
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Container Card */}
      <div className="flex-1 flex flex-col bg-[#0c1427] border border-[#1b2b4d] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden min-h-0 text-slate-200">
        {/* Top Header Bar */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#15203b] bg-[#090f1d] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* File Meta */}
          <div className="flex items-center gap-3 min-w-0 max-w-full sm:max-w-xl">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
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
              <h2 className="text-xs sm:text-sm font-bold text-white truncate" title={fileName}>
                {fileName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="font-mono uppercase font-bold text-slate-500">{ext}</span>
                <span>•</span>

                {/* Retention Badge & 1-Click Toggle */}
                {isTemporary ? (
                  <button
                    type="button"
                    onClick={() => onToggleRetention(file)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      isExpiringSoon
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                    }`}
                    title="Click to move into permanent Vault"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Temp Stash ({daysRemaining}d left) · Click to Keep in Vault</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleRetention(file)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors cursor-pointer"
                    title="Click to set 30-day Temp Stash"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Vault · Permanent</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Image Zoom Buttons */}
            {isImage && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1.5 text-slate-400">
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
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Copy Content"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </button>
            )}

            {/* Open Raw in New Tab */}
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
                title="Open raw file in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Direct Download */}
            {publicUrl && (
              <a
                href={publicUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-xl transition-colors"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Content Canvas */}
        <div className="flex-1 min-h-0 bg-[#060a14] relative overflow-hidden flex flex-col">
          {/* Global Loading Spinner */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Opening document...
              </span>
            </div>
          )}

          {/* Fallback Error Card */}
          {!isLoading && loadError && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Preview Notice</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{loadError}</p>
              <div className="mt-5 flex items-center gap-3">
                <a
                  href={publicUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
                <a
                  href={publicUrl}
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

          {/* 1. Native Interactive Spreadsheet Grid (Excel & CSV) */}
          {!isLoading && !loadError && (isExcel || isCsv) && workbook && (
            <div className="flex-1 flex flex-col bg-white text-slate-900 overflow-hidden min-h-0">
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
                                className={`py-2 px-3 border-r border-slate-100 truncate max-w-[280px] ${
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

              {/* Worksheet Tabs Bar (e.g. Sheet1, RT Payroll, Cash Req) */}
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

          {/* 2. Word Document Canvas (.docx) */}
          {!isLoading && !loadError && isWord && docxHtml && (
            <div className="flex-1 overflow-auto p-4 sm:p-8 bg-[#0a0f1d]">
              <div
                className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-12 min-h-full border border-slate-200 font-serif leading-relaxed select-text prose prose-slate max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          )}

          {/* 3. PDF Viewer */}
          {!isLoading && !loadError && isPdf && (
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={`${publicUrl}#toolbar=1`}
                title={fileName}
                className="w-full h-full border-0 bg-slate-900"
              />
              <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-xs flex items-center gap-2">
                <span>PDF Document</span>
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Google Viewer ↗
                </a>
              </div>
            </div>
          )}

          {/* 4. High-Res Image Viewer */}
          {!isLoading && !loadError && isImage && (
            <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={publicUrl}
                alt={fileName}
                style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl origin-center"
              />
            </div>
          )}

          {/* 5. Code, Markdown & Text Viewer */}
          {!isLoading && !loadError && isTextOrCode && !isCsv && (
            <div className="flex-1 w-full h-full overflow-auto p-4 sm:p-6 bg-[#070b16] font-mono text-xs sm:text-[13px] text-slate-200 leading-relaxed select-text">
              <pre className="whitespace-pre-wrap break-words">{textContent || "Document is empty."}</pre>
            </div>
          )}

          {/* 6. Video Viewer */}
          {!isLoading && !loadError && isVideo && (
            <div className="flex-1 w-full h-full flex items-center justify-center p-4">
              <video controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" src={publicUrl}>
                Your browser does not support HTML5 video preview.
              </video>
            </div>
          )}

          {/* 7. Audio Viewer */}
          {!isLoading && !loadError && isAudio && (
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg">
                <FileCode className="w-10 h-10" />
              </div>
              <div className="text-center">
                <div className="font-bold text-base text-white">{fileName}</div>
                <div className="text-xs text-slate-400 mt-1">{formatBytes(file.size)}</div>
              </div>
              <audio controls autoPlay className="w-full max-w-md mt-2" src={publicUrl}>
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
                  href={publicUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
                <a
                  href={publicUrl}
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

        {/* Mobile / Compact Bottom Bar */}
        <div className="px-4 py-2.5 bg-[#090f1d] border-t border-[#15203b] flex items-center justify-between text-xs text-slate-400 sm:hidden shrink-0">
          <span className="truncate max-w-[180px]">{fileName}</span>
          <a
            href={publicUrl}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
}
