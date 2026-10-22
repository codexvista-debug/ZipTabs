"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  HardDrive,
  Database,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Server,
  Cloud,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  ArrowUpRight,
  Loader2,
  X,
  Search,
  Filter,
} from "lucide-react";

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mimetype?: string;
  created_at: string;
  updated_at?: string;
  url?: string;
}

export interface WorkspaceUsageData {
  storage_bytes: number;
  storage_files: number;
  invoices_count: number;
  notes_count: number;
  database_size_bytes: number;
  files: StoredFile[];
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function UsageView() {
  const [usage, setUsage] = useState<WorkspaceUsageData>({
    storage_bytes: 0,
    storage_files: 0,
    invoices_count: 0,
    notes_count: 0,
    database_size_bytes: 0,
    files: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "images" | "docs">("all");
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<StoredFile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Free Tier Constants
  const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB in bytes
  const DATABASE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB in bytes

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch real-time usage data from Supabase RPC
  const fetchUsage = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsRefreshing(true);
    try {
      const client = supabase;
      if (client) {
        const { data, error } = await client.rpc("get_workspace_usage");
        if (error) {
          console.error("Error fetching workspace usage:", error);
        } else if (data) {
          // Augment files with public URLs
          const augmentedFiles = (data.files || []).map((f: StoredFile) => {
            const { data: urlData } = client.storage
              .from("note-attachments")
              .getPublicUrl(f.name);
            return {
              ...f,
              url: urlData?.publicUrl || "",
            };
          });

          setUsage({
            storage_bytes: data.storage_bytes || 0,
            storage_files: data.storage_files || 0,
            invoices_count: data.invoices_count || 0,
            notes_count: data.notes_count || 0,
            database_size_bytes: data.database_size_bytes || 0,
            files: augmentedFiles,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load usage data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage(true);

    // Auto-refresh every 20 seconds to provide real-time updates
    const interval = setInterval(() => {
      fetchUsage(false);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Delete stored file directly to reclaim storage
  const executeDeleteFile = async (file: StoredFile) => {
    setConfirmDeleteFile(null);
    try {
      if (supabase) {
        const { error } = await supabase.storage
          .from("note-attachments")
          .remove([file.name]);

        if (error) {
          showToast(`Error deleting file: ${error.message}`);
        } else {
          // If this file was uploaded from Drive, also clean up the database record
          await supabase.from("drive_files").delete().eq("storage_path", file.name);
          showToast(`✓ Removed file and reclaimed ${formatBytes(file.size)}`);
          fetchUsage(false);
        }
      }
    } catch (err) {
      console.error("Delete file error:", err);
    }
  };

  // Calculations
  const storagePercentage = Math.min(100, (usage.storage_bytes / STORAGE_LIMIT_BYTES) * 100);
  const databasePercentage = Math.min(100, (usage.database_size_bytes / DATABASE_LIMIT_BYTES) * 100);

  const storageRemainingBytes = Math.max(0, STORAGE_LIMIT_BYTES - usage.storage_bytes);
  const databaseRemainingBytes = Math.max(0, DATABASE_LIMIT_BYTES - usage.database_size_bytes);

  // File breakdown
  const imageFiles = usage.files.filter((f) => f.mimetype?.startsWith("image/"));
  const docFiles = usage.files.filter((f) => !f.mimetype?.startsWith("image/"));
  const imageTotalBytes = imageFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const docTotalBytes = docFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  // Filtered files list
  const filteredFiles = usage.files.filter((f) => {
    const q = fileSearch.toLowerCase().trim();
    const fileNameOnly = f.name.split("/").pop() || f.name;
    const matchesSearch = !q || fileNameOnly.toLowerCase().includes(q) || (f.mimetype && f.mimetype.toLowerCase().includes(q));
    if (!matchesSearch) return false;

    if (fileTypeFilter === "images") return f.mimetype?.startsWith("image/");
    if (fileTypeFilter === "docs") return !f.mimetype?.startsWith("image/");
    return true;
  });

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-3.5 px-5 rounded-2xl bg-[#0c1427] text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 border border-[#1b2b4d]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Workspace & Storage Usage
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time monitoring of Supabase Free Plan file storage, database space, and uploaded documents.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Free Plan: Healthy</span>
          </div>
        </div>
      </div>

      {/* Primary Usage Cards (Gauges) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Supabase File Storage (1 GB Limit) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
          {/* Header Row: Icon + Title + Pill */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  File Storage (Documents & Images)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  Supabase Bucket: note-attachments
                </p>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 whitespace-nowrap">
              Limit: 1.00 GB
            </span>
          </div>

          {/* Usage Stat */}
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatBytes(usage.storage_bytes)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / 1,024 MB
              </span>
            </div>
            <div className="text-xs font-bold text-emerald-600">
              {formatBytes(storageRemainingBytes)} free
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                storagePercentage > 90
                  ? "bg-rose-500"
                  : storagePercentage > 70
                  ? "bg-amber-500"
                  : "bg-[#2563eb]"
              }`}
              style={{ width: `${Math.max(1, storagePercentage)}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              <strong>{storagePercentage.toFixed(3)}%</strong> of 1 GB free allocation used
            </span>
            <span>{usage.storage_files} total file(s)</span>
          </div>

          {/* Mini Breakdown */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800">{formatBytes(imageTotalBytes)}</div>
                <div className="text-[10px] text-slate-400">{imageFiles.length} screenshots/photos</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800">{formatBytes(docTotalBytes)}</div>
                <div className="text-[10px] text-slate-400">{docFiles.length} PDFs/documents</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Supabase Database Size (500 MB Limit) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
          {/* Header Row: Icon + Title + Pill */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Database Footprint (PostgreSQL)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  Invoices, notes, credentials, and indexes
                </p>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 whitespace-nowrap">
              Limit: 500 MB
            </span>
          </div>

          {/* Database Stat */}
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatBytes(usage.database_size_bytes)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / 500 MB
              </span>
            </div>
            <div className="text-xs font-bold text-emerald-600">
              {formatBytes(databaseRemainingBytes)} free
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                databasePercentage > 90
                  ? "bg-rose-500"
                  : databasePercentage > 70
                  ? "bg-amber-500"
                  : "bg-indigo-600"
              }`}
              style={{ width: `${Math.max(1, databasePercentage)}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              <strong>{databasePercentage.toFixed(2)}%</strong> of 500 MB allocation used
            </span>
            <span>Plenty of capacity remaining</span>
          </div>

          {/* Table Row Counts */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800">{usage.invoices_count} records</div>
                <div className="text-[10px] text-slate-400">Invoices table rows</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800">{usage.notes_count} entries</div>
                <div className="text-[10px] text-slate-400">Operational notes & logs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free Plan Thresholds Guide Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Supabase Free Plan Thresholds</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                ZipTabs is optimized to keep file storage compact and automatically purges old invoices upon each import.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono">
              Max file upload: <strong className="text-blue-400">50 MB</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono">
              Total Storage: <strong className="text-emerald-400">1 GB</strong>
            </div>
          </div>
        </div>
      </div>

      {/* File Explorer & Storage Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header / Toolbar */}
        <div className="p-4 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search stored files by name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFileTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                fileTypeFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Files ({usage.files.length})
            </button>
            <button
              type="button"
              onClick={() => setFileTypeFilter("images")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                fileTypeFilter === "images"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Images ({imageFiles.length})
            </button>
            <button
              type="button"
              onClick={() => setFileTypeFilter("docs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                fileTypeFilter === "docs"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Documents ({docFiles.length})
            </button>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Calculating real-time storage usage...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
              <HardDrive className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              {usage.files.length === 0 ? "No files stored in Supabase yet" : "No matching files found"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {usage.files.length === 0
                ? "When you attach receipts or screenshots in Notes, or upload documents to Drive, they will appear here with live storage metrics."
                : "Try clearing your search query or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">File Name</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-right">Size</th>
                  <th className="py-3.5 px-4 text-center">Uploaded</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredFiles.map((file) => {
                  const isImage = file.mimetype?.startsWith("image/");
                  const isDriveFile = file.name.startsWith("drive/");
                  const rawName = file.name.split("/").pop() || file.name;
                  // Strip timestamp prefix if formatted as 1234567890_filename
                  const cleanDisplayName = rawName.replace(/^\d{10,13}_/, "");
                  const dateStr = new Date(file.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={file.id || file.name} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Icon */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImage ? (
                            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-bold text-slate-800 truncate max-w-xs sm:max-w-sm">
                              {cleanDisplayName}
                            </span>
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                isDriveFile
                                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {isDriveFile ? "Drive" : "Notes"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {isImage ? "Image" : file.mimetype?.split("/")[1] || "Doc"}
                        </span>
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                        {formatBytes(file.size)}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                        {dateStr}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {file.url && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Open / View File"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFile(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete file to free storage space"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDeleteFile(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Delete stored file?
            </h3>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Delete <strong className="text-slate-800">"{confirmDeleteFile.name.split("/").pop()}"</strong> to immediately reclaim{" "}
              <strong className="text-emerald-600">{formatBytes(confirmDeleteFile.size)}</strong> of storage?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteFile(confirmDeleteFile)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
