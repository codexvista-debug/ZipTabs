"use client";

import React, { useState, useEffect, Component, ReactNode } from "react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { downloadFileDirectly } from "@/lib/download";
import { FileBrandIcon } from "./FileBrandIcon";
import { ExcelSheetViewer } from "./ExcelSheetViewer";
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

export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Error Boundary to prevent any child render failure from crashing the entire app
interface ErrorBoundaryProps {
  children: ReactNode;
  fileName: string;
  fileUrl?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class ViewerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || "Failed to render document preview" };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ViewerErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">Preview unavailable</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            This document format cannot be rendered live in the current browser window. You can download the file to view it directly on your device.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {this.props.fileUrl && (
              <button
                type="button"
                onClick={() => downloadFileDirectly(this.props.fileUrl!, this.props.fileName)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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

  // Word Document (.docx) HTML State
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Text / Code Content State
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Image Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);

  // Download in progress state
  const [isDownloading, setIsDownloading] = useState(false);

  // File metadata calculations (derived safely with optional chaining)
  const fileName = file?.name || "Attachment";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const fileUrl = file?.url || file?.public_url || "";
  const mimeType = (file?.type || file?.mimetype || "").toLowerCase();

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
  const isOfficeFile =
    isExcel ||
    isWord ||
    ["pptx", "ppt"].includes(ext) ||
    mimeType.includes("presentationml") ||
    mimeType.includes("powerpoint");

  // Microsoft Office Web Viewer / Editor integration
  // Opens the file directly in full Microsoft Excel for the Web / Word for the Web in a new tab
  const officeOnlineUrl =
    isOfficeFile && fileUrl && fileUrl.startsWith("http")
      ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`
      : fileUrl;

  // 1. Esc key listener (Always runs unconditionally)
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

  // 2. Load and parse document contents based on type (Always runs unconditionally)
  useEffect(() => {
    if (!isOpen || !file) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    // Reset states
    setIsLoading(true);
    setLoadError(null);
    setDocxHtml(null);
    setTextContent(null);
    setZoomLevel(1);

    if (!fileUrl) {
      setIsLoading(false);
      setLoadError("No download URL available for this file.");
      return;
    }

    // A. Images, PDFs, Audio, Video, Excel, CSV render directly in their dedicated view components
    if (isImage || isPdf || isVideo || isAudio || isExcel || isCsv) {
      setIsLoading(false);
      return;
    }

    // B. Word Documents (.docx)
    if (isWord) {
      if (ext === "docx") {
        fetch(fileUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download Word document`);
            return res.arrayBuffer();
          })
          .then(async (arrayBuffer) => {
            if (isCancelled) return;
            try {
              const convertFn = mammoth?.convertToHtml || (mammoth as any)?.default?.convertToHtml;
              if (typeof convertFn !== "function") {
                throw new Error("Mammoth HTML converter function not available");
              }
              const result = await convertFn({
                arrayBuffer,
                buffer: arrayBuffer as any,
              });
              if (isCancelled) return;
              setDocxHtml(result?.value || "<p>Document is empty.</p>");
            } catch (err: any) {
              console.error("Mammoth conversion error:", err);
              setLoadError("Unable to extract document layout. You can still download the original document.");
            }
          })
          .catch((err: any) => {
            if (!isCancelled) {
              console.error("Word document preview error:", err);
              setLoadError("Unable to download Word document. Please use the Download button.");
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

    // C. Code & Text Files
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
  }, [isOpen, file?.id, fileUrl, ext, isExcel, isWord, isCsv, isTextOrCode, isImage, isPdf, isVideo, isAudio]);

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Direct download handler (never opens new tab)
  const handleDownload = async () => {
    if (!fileUrl || isDownloading) return;
    try {
      setIsDownloading(true);
      await downloadFileDirectly(fileUrl, fileName);
    } catch (err) {
      console.error("Direct download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ALL HOOKS HAVE BEEN CALLED ABOVE.
  // It is now 100% safe to return null if closed or file is absent.
  if (!isOpen || !file) {
    return null;
  }

  // Retention Details (if applicable)
  const isTemporary = file.retention_type === "temporary";
  let daysRemaining = 30;
  let isExpiringSoon = false;
  if (isTemporary && file.expires_at) {
    const diffMs = new Date(file.expires_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    isExpiringSoon = daysRemaining <= 3;
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 left-0 lg:left-[260px] z-50 flex flex-col bg-slate-950/70 backdrop-blur-md border-l border-white/10 shadow-2xl text-slate-200 animate-in fade-in duration-200 select-none"
      aria-label="Attachment Preview Canvas"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Bar */}
      <header
        className="h-16 px-4 sm:px-6 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Attachment Info */}
        <div className="flex items-center gap-3 min-w-0 max-w-[55%] sm:max-w-xl">
          <FileBrandIcon fileName={fileName} mimeType={file.type} size="md" />

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

          {/* Open in Microsoft Office for the Web or Raw New Tab */}
          {fileUrl && (
            <a
              href={officeOnlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
              title={
                isOfficeFile
                  ? "Open in Microsoft Office for the Web (Excel / Word Web)"
                  : "Open file in new tab"
              }
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* PROMINENT DOWNLOAD BUTTON */}
          {fileUrl && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 disabled:opacity-75 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer"
              title="Download file directly"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isDownloading ? "Downloading..." : "Download"}
              </span>
            </button>
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

      {/* Main Full-Space Canvas wrapped in ViewerErrorBoundary */}
      <ViewerErrorBoundary fileName={fileName} fileUrl={fileUrl}>
        <div
          className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative bg-transparent"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
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
            <div
              className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto cursor-pointer w-full h-full"
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
            >
              <div
                className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Preview Notice</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{loadError}</p>
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-75 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{isDownloading ? "Downloading..." : "Download File"}</span>
                  </button>
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
            </div>
          )}

          {/* 1. Full-Space Image Viewer */}
          {!isLoading && !loadError && isImage && (
            <div
              className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 sm:p-8 select-none cursor-pointer"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  onClose();
                }
              }}
            >
              <div
                className="relative max-w-full max-h-full flex items-center justify-center cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={fileUrl}
                  alt={fileName}
                  style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl origin-center border border-white/10"
                />
              </div>
            </div>
          )}

          {/* 2. Full-Space Native Excel & CSV Spreadsheet Grid with 100% Color, Font, Currency & Formula Fidelity */}
          {!isLoading && !loadError && (isExcel || isCsv) && (
            <ExcelSheetViewer fileUrl={fileUrl} fileName={fileName} isCsv={isCsv} />
          )}

          {/* 3. Full-Space Word Document Canvas (.docx) */}
          {!isLoading && !loadError && isWord && docxHtml && (
            <div
              className="flex-1 overflow-auto p-4 sm:p-10 bg-transparent select-text cursor-pointer"
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
            >
              <div
                className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-14 min-h-full border border-slate-200 font-serif leading-relaxed prose prose-slate max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3 cursor-default"
                onClick={(e) => e.stopPropagation()}
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
              <div className="flex items-center justify-center">
                <FileBrandIcon fileName={fileName} mimeType={file.type} size="xl" className="w-16 h-16" />
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
              <div className="flex items-center justify-center mb-4">
                <FileBrandIcon fileName={fileName} mimeType={file.type} size="xl" className="w-16 h-16" />
              </div>
              <h3 className="text-base font-bold text-white">{fileName}</h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Direct in-browser preview is not available for this binary format ({ext.toUpperCase() || "unknown"}).
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-75 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isDownloading ? "Downloading..." : "Download File"}</span>
                </button>
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
      </ViewerErrorBoundary>
    </aside>
  );
}
