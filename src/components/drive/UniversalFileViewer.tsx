"use client";

import React, { useState, useEffect } from "react";
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
  AlertTriangle,
  Monitor,
  Search,
  Maximize2,
} from "lucide-react";
import { DriveFile, formatBytes } from "./DriveView";

interface UniversalFileViewerProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleRetention: (file: DriveFile) => void;
  onDeleteFile: (file: DriveFile) => void;
}

export function UniversalFileViewer({
  file,
  isOpen,
  onClose,
  onToggleRetention,
  onDeleteFile,
}: UniversalFileViewerProps) {
  // Viewer Engine State for Office docs: 'office' | 'google'
  const [officeViewerEngine, setOfficeViewerEngine] = useState<"office" | "google">("office");
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Image Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);

  // Text / CSV Content State
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // CSV Spreadsheet State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvSearch, setCsvSearch] = useState("");

  if (!isOpen || !file) return null;

  const fileName = file.name || "Untitled";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const publicUrl = file.public_url || "";
  const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext);
  const isPdf = ext === "pdf" || file.type === "application/pdf";
  const isExcel = ["xlsx", "xls"].includes(ext);
  const isCsv = ext === "csv";
  const isWord = ["docx", "doc", "rtf"].includes(ext);
  const isPowerPoint = ["pptx", "ppt"].includes(ext);
  const isOfficeDoc = isExcel || isWord || isPowerPoint;
  const isTextOrCode = [
    "txt", "md", "json", "js", "ts", "tsx", "jsx", "html", "css",
    "py", "sql", "xml", "log", "yaml", "yml", "env", "sh"
  ].includes(ext) || file.type.startsWith("text/");
  const isVideo = file.type.startsWith("video/") || ["mp4", "webm", "ogg"].includes(ext);
  const isAudio = file.type.startsWith("audio/") || ["mp3", "wav", "aac"].includes(ext);

  // Parse CSV
  const parseCSVData = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setCsvHeaders([]);
      setCsvRows([]);
      return;
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1, 300).map(parseLine);
    setCsvHeaders(headers);
    setCsvRows(rows);
  };

  // Fetch text/csv data
  useEffect(() => {
    if ((isTextOrCode || isCsv) && publicUrl) {
      setIsTextLoading(true);
      fetch(publicUrl)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          if (isCsv) {
            parseCSVData(text);
          }
        })
        .catch((err) => {
          console.error("Failed to load text preview:", err);
          setTextContent("Error loading preview content.");
        })
        .finally(() => setIsTextLoading(false));
    } else {
      setTextContent(null);
      setCsvHeaders([]);
      setCsvRows([]);
    }

    // Reset iframe loading when switching files
    setIsIframeLoading(true);
    setZoomLevel(1);
  }, [file.id, publicUrl, isTextOrCode, isCsv]);

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

  // Filtered CSV Rows for spreadsheet search
  const filteredCsvRows = isCsv && csvSearch.trim()
    ? csvRows.filter((r) => r.some((c) => c.toLowerCase().includes(csvSearch.toLowerCase())))
    : csvRows;

  // Office viewer URLs
  const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`;

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
              <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
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
                    title="Click to move into Vault (Permanent)"
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
            {/* Office Viewer Engine Selector (Word/Excel/PowerPoint) */}
            {isOfficeDoc && (
              <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsIframeLoading(true);
                    setOfficeViewerEngine("office");
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    officeViewerEngine === "office"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Office 365
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsIframeLoading(true);
                    setOfficeViewerEngine("google");
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    officeViewerEngine === "google"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Google Viewer
                </button>
              </div>
            )}

            {/* Image Zoom Buttons */}
            {isImage && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Copy Button for text files */}
            {isTextOrCode && textContent && (
              <button
                type="button"
                onClick={handleCopyText}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
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
        <div className="flex-1 min-h-0 bg-[#060a14] relative overflow-hidden flex flex-col items-center justify-center">
          {/* 1. Image Viewer */}
          {isImage && (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={publicUrl}
                alt={fileName}
                style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl origin-center"
              />
            </div>
          )}

          {/* 2. PDF Viewer */}
          {isPdf && (
            <div className="w-full h-full flex flex-col relative">
              <iframe
                src={`${publicUrl}#toolbar=1`}
                title={fileName}
                className="w-full h-full border-0 bg-slate-900"
                onLoad={() => setIsIframeLoading(false)}
              />
              <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-xs flex items-center gap-2">
                <span>Native PDF View</span>
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Google Viewer
                </a>
              </div>
            </div>
          )}

          {/* 3. CSV Spreadsheet Native Grid Viewer */}
          {isCsv && (
            <div className="w-full h-full flex flex-col bg-white text-slate-900 overflow-hidden">
              {/* CSV Toolbar */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={csvSearch}
                    onChange={(e) => setCsvSearch(e.target.value)}
                    placeholder="Search inside spreadsheet..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all font-medium"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {filteredCsvRows.length} rows {csvSearch ? `(matching "${csvSearch}")` : ""}
                </div>
              </div>

              {/* Scrollable Spreadsheet Table */}
              <div className="flex-1 overflow-auto">
                {isTextLoading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Parsing spreadsheet rows...</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-200/90 backdrop-blur-xs text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-slate-400 text-center font-mono text-[10px]">#</th>
                        {csvHeaders.map((h, i) => (
                          <th key={i} className="py-2.5 px-3 border-r border-slate-300/60 truncate max-w-[200px]">
                            {h || `Column ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCsvRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px] bg-slate-50 border-r border-slate-200">
                            {rIdx + 1}
                          </td>
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 border-r border-slate-100 truncate max-w-[250px]">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 4. Microsoft Office & Google Docs Online Viewer (Word / Excel / PowerPoint) */}
          {isOfficeDoc && (
            <div className="w-full h-full flex flex-col relative bg-slate-900">
              {isIframeLoading && (
                <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Rendering document preview via {officeViewerEngine === "office" ? "Microsoft 365" : "Google Docs"}...
                  </span>
                </div>
              )}
              <iframe
                key={`${file.id}-${officeViewerEngine}`}
                src={officeViewerEngine === "office" ? officeUrl : googleViewerUrl}
                title={fileName}
                className="w-full h-full border-0 bg-white"
                onLoad={() => setIsIframeLoading(false)}
              />
            </div>
          )}

          {/* 5. Code, Markdown, JSON & Text Viewer */}
          {isTextOrCode && !isCsv && (
            <div className="w-full h-full overflow-auto p-4 sm:p-6 bg-[#070b16] font-mono text-xs sm:text-[13px] text-slate-200 leading-relaxed select-text">
              {isTextLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Loading text content...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textContent || "No text content"}</pre>
              )}
            </div>
          )}

          {/* 6. Video Viewer */}
          {isVideo && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <video controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" src={publicUrl}>
                Your browser does not support HTML5 video preview.
              </video>
            </div>
          )}

          {/* 7. Audio Viewer */}
          {isAudio && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4">
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

          {/* 8. Generic / Unsupported Binary File */}
          {!isImage && !isPdf && !isCsv && !isOfficeDoc && !isTextOrCode && !isVideo && !isAudio && (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mb-4 shadow-xl">
                <FileArchive className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-white">{fileName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Direct in-browser preview is not supported for this binary file format ({ext.toUpperCase() || "unknown"}).
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
                  <span>Open in Browser</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Mobile / Compact Bottom Bar */}
        <div className="px-4 py-2.5 bg-[#090f1d] border-t border-[#15203b] flex items-center justify-between text-xs text-slate-400 sm:hidden">
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
