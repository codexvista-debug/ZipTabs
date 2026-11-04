"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ArrowRight,
  Loader2,
  FileText,
  Users,
  Building2,
  ShieldCheck,
} from "lucide-react";
import {
  parseSpreadsheetFile,
  downloadDirectoryTemplate,
  ParseResult,
  ParsedSpreadsheetContact,
} from "@/lib/directoryExcel";

interface DirectoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    records: ParsedSpreadsheetContact[],
    targetDivision: "employee" | "vendor" | "auto"
  ) => Promise<void>;
  defaultDivision?: "employee" | "vendor";
}

export function DirectoryImportModal({
  isOpen,
  onClose,
  onImport,
  defaultDivision = "employee",
}: DirectoryImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [targetDivision, setTargetDivision] = useState<"employee" | "vendor" | "auto">("auto");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragHover, setIsDragHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsParsing(true);
    setParseResult(null);

    try {
      const divisionFallback = targetDivision === "auto" ? defaultDivision : targetDivision;
      const res = await parseSpreadsheetFile(file, divisionFallback);
      setParseResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to read spreadsheet. Please ensure valid columns.");
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragHover(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!parseResult || parseResult.records.length === 0) return;
    setIsImporting(true);
    setError(null);
    setImportProgress(10);

    try {
      await onImport(parseResult.records, targetDivision);
      setImportProgress(100);
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err: any) {
      setError(err?.message || "Failed to import records to Supabase.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setParseResult(null);
    setError(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Import Phone Directory via Excel
              </h3>
              <p className="text-xs text-slate-500">
                Supports Excel (.xlsx, .xls) and CSV (.csv) spreadsheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Division Choice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Division
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTargetDivision("auto")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetDivision === "auto"
                    ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Auto-Detect
              </button>
              <button
                type="button"
                onClick={() => setTargetDivision("employee")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetDivision === "employee"
                    ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Employees
              </button>
              <button
                type="button"
                onClick={() => setTargetDivision("vendor")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetDivision === "vendor"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Vendors
              </button>
            </div>
          </div>

          {/* Dropzone */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragHover(true);
              }}
              onDragLeave={() => setIsDragHover(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragHover
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop your spreadsheet here
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Expected columns: <span className="font-semibold text-slate-700">Company, Name, Email, Phone Number</span>
              </p>

              {/* Template Download Shortcut */}
              <div className="mt-4 pt-4 border-t border-slate-200/60 w-full flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-500">Need a format guide?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDirectoryTemplate(
                      targetDivision === "auto" ? "combined" : targetDivision
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200/80 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample Template (.xlsx)
                </button>
              </div>
            </div>
          ) : (
            /* File parsed card */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                      {parseResult ? `${parseResult.totalRows} valid contacts detected` : "Reading..."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={isImporting}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Detected Columns pill overview */}
              {parseResult && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Detected Mappings
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Company</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {parseResult.detectedColumns.company || "Auto-assigned"}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Name</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {parseResult.detectedColumns.name || "Auto-assigned"}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {parseResult.detectedColumns.phone || "Auto-assigned"}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Email</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {parseResult.detectedColumns.email || "Auto-assigned"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {parseResult && parseResult.records.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Spreadsheet Preview (First {Math.min(parseResult.records.length, 5)} rows)</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">
                      total {parseResult.records.length} records ready
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 border-b border-slate-200">Division</th>
                          <th className="p-2 border-b border-slate-200">Company</th>
                          <th className="p-2 border-b border-slate-200">Name</th>
                          <th className="p-2 border-b border-slate-200">Phone</th>
                          <th className="p-2 border-b border-slate-200">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.records.slice(0, 5).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/70">
                            <td className="p-2 font-medium capitalize">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  r.division === "employee"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {r.division}
                              </span>
                            </td>
                            <td className="p-2 text-slate-800 truncate max-w-[120px]">{r.company}</td>
                            <td className="p-2 font-semibold text-slate-900 truncate max-w-[120px]">{r.name}</td>
                            <td className="p-2 font-mono text-slate-700 truncate max-w-[120px]">{r.phone || "—"}</td>
                            <td className="p-2 text-slate-600 truncate max-w-[140px]">{r.email || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cryptographic Protection Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-semibold">Automatic Hashing & AES-256-GCM Encryption</p>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Every record is hashed (SHA-256) and encrypted client-side before sending to Supabase.
                Zero unencrypted phone numbers or emails will touch your cloud database.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parseResult ? `${parseResult.totalRows} contacts ready for import` : "Select a spreadsheet"}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartImport}
              disabled={!parseResult || parseResult.records.length === 0 || isImporting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting & Uploading ({parseResult?.totalRows} rows)...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Encrypt & Import to Supabase
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
