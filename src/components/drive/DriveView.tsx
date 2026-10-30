"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import {
  FolderOpen,
  FolderPlus,
  Folder,
  File as FileIcon,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Upload,
  Search,
  Grid,
  List,
  ChevronRight,
  HardDrive,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  Eye,
} from "lucide-react";
import { UniversalFileViewer } from "./UniversalFileViewer";
import { downloadFileDirectly } from "@/lib/download";
import { FileBrandIcon } from "@/components/ui/FileBrandIcon";

export interface DriveFolder {
  id: string;
  user_id?: string;
  name: string;
  parent_id?: string | null;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DriveFile {
  id: string;
  user_id?: string;
  folder_id?: string | null;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  public_url?: string;
  retention_type?: "permanent" | "temporary";
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DriveViewProps {
  onNavigateUsage?: () => void;
}

const FOLDER_COLORS: { id: string; label: string; bg: string; text: string; border: string }[] = [
  { id: "blue", label: "Blue", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  { id: "amber", label: "Amber", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  { id: "indigo", label: "Indigo", bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
  { id: "rose", label: "Rose", bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  { id: "purple", label: "Purple", bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
];

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DriveView({ onNavigateUsage }: DriveViewProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Storage Retention Category & Filter: 'all' | 'permanent' (Vault) | 'temporary' (Temp Stash)
  const [storageCategoryFilter, setStorageCategoryFilter] = useState<"all" | "permanent" | "temporary">("all");
  const [uploadRetention, setUploadRetention] = useState<"permanent" | "temporary">("permanent");

  // Search & View Toggle
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Create Folder Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");

  // Uploading State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Delete Confirm Dialog State
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<DriveFolder | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFile | null>(null);

  // Universal File Preview Modal (Supports Word, Excel, CSV, PDF, Images, Code, etc.)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ title: string; description?: string; type: "success" | "error" | "info" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderPortal = (children: React.ReactNode) => {
    if (!isMounted || typeof document === "undefined") return null;
    return createPortal(children, document.body);
  };

  const showToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    setToast({ title, description, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto-purge any expired temporary files (runs silently in the background)
  const purgeExpiredFiles = async () => {
    if (!supabase) return;
    try {
      const { data: purged } = await supabase.rpc("purge_expired_drive_files");
      if (purged && purged.length > 0) {
        const storagePaths = purged.map((p: any) => p.purged_storage_path).filter(Boolean);
        if (storagePaths.length > 0) {
          await supabase.storage.from("note-attachments").remove(storagePaths);
        }
      }
    } catch (err) {
      console.warn("Auto-purge warning:", err);
    }
  };

  // Fetch folders and files from Supabase
  const loadDriveData = async () => {
    setIsLoading(true);
    try {
      await purgeExpiredFiles();

      if (supabase) {
        const [foldersRes, filesRes] = await Promise.all([
          supabase.from("drive_folders").select("*").order("name", { ascending: true }),
          supabase.from("drive_files").select("*").order("created_at", { ascending: false }),
        ]);

        if (foldersRes.data) {
          setFolders(foldersRes.data);
          try {
            localStorage.setItem("ziptabs_drive_folders", JSON.stringify(foldersRes.data));
          } catch {}
        }
        if (filesRes.data) {
          setFiles(filesRes.data);
          try {
            localStorage.setItem("ziptabs_drive_files", JSON.stringify(filesRes.data));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Error loading drive data, falling back to cache:", err);
      try {
        const storedF = localStorage.getItem("ziptabs_drive_folders");
        if (storedF) setFolders(JSON.parse(storedF));
        const storedD = localStorage.getItem("ziptabs_drive_files");
        if (storedD) setFiles(JSON.parse(storedD));
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load & Realtime Subscription
  useEffect(() => {
    loadDriveData();

    if (!supabase) return;

    const channel = supabase
      .channel("realtime-drive-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drive_folders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newF = payload.new as DriveFolder;
            setFolders((prev) => (prev.some((f) => f.id === newF.id) ? prev : [...prev, newF]));
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as DriveFolder;
            setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          } else if (payload.eventType === "DELETE") {
            const delId = (payload.old as { id: string })?.id;
            if (delId) setFolders((prev) => prev.filter((f) => f.id !== delId));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drive_files" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newFile = payload.new as DriveFile;
            setFiles((prev) => (prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]));
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as DriveFile;
            setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          } else if (payload.eventType === "DELETE") {
            const delId = (payload.old as { id: string })?.id;
            if (delId) setFiles((prev) => prev.filter((f) => f.id !== delId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // Clipboard Paste Support (Ctrl+V) for screenshots or copied documents
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pasted: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            let finalFile = file;
            if (file.type.startsWith("image/") && (file.name === "image.png" || !file.name || file.name.startsWith("blob"))) {
              const ext = file.type.split("/")[1] || "png";
              const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
              finalFile = new File([file], `screenshot_${dateStr}.${ext}`, { type: file.type });
            }
            pasted.push(finalFile);
          }
        }
      }

      if (pasted.length > 0) {
        handleUploadFilesList(pasted);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [currentFolderId]);

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    const newFolder: DriveFolder = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      user_id: "chief",
      name: cleanName,
      parent_id: currentFolderId,
      color: newFolderColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFolders((prev) => [...prev, newFolder]);
    setIsFolderModalOpen(false);
    setNewFolderName("");
    showToast("Folder Created", `"${cleanName}" added.`, "success");

    if (supabase) {
      try {
        await supabase.from("drive_folders").insert([newFolder]);
      } catch (err) {
        console.error("Failed to insert drive folder:", err);
      }
    }
  };

  // Upload Files Process (Into Supabase bucket 'note-attachments' under drive/)
  const handleUploadFilesList = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    setUploadProgressText(`Uploading ${filesToUpload.length} file(s)...`);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const folderSlug = currentFolderId || "root";
        const storagePath = `drive/${folderSlug}/${Date.now()}_${cleanName}`;

        if (!supabase) throw new Error("Supabase unavailable");

        // Upload to storage bucket
        const { error: uploadError } = await supabase.storage
          .from("note-attachments")
          .upload(storagePath, file, { cacheControl: "3600", upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("note-attachments")
          .getPublicUrl(storagePath);

        const isTemp = uploadRetention === "temporary";
        const newFileItem: DriveFile = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          user_id: "chief",
          folder_id: currentFolderId,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          storage_path: storagePath,
          public_url: urlData?.publicUrl || "",
          retention_type: uploadRetention,
          expires_at: isTemp ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setFiles((prev) => [newFileItem, ...prev]);

        // Save metadata to database
        await supabase.from("drive_files").insert([newFileItem]);
      } catch (err: any) {
        console.error("Failed to upload file:", file.name, err);
        showToast("Upload Failed", `Could not upload "${file.name}".`, "error");
      }
    }

    setIsUploading(false);
    setUploadProgressText(null);
    showToast(
      "Upload Complete",
      `${filesToUpload.length} file(s) saved to ${uploadRetention === "temporary" ? "Temp Stash (30 Days)" : "Vault (Permanent)"}.`,
      "success"
    );
  };

  // Toggle File Retention between Vault (Permanent) and Temp Stash (30-day auto-purge)
  const handleToggleRetention = async (file: DriveFile) => {
    const isCurrentlyTemp = file.retention_type === "temporary";
    const newType: "permanent" | "temporary" = isCurrentlyTemp ? "permanent" : "temporary";
    const newExpiresAt = isCurrentlyTemp
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Optimistic UI updates
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, retention_type: newType, expires_at: newExpiresAt } : f))
    );
    if (previewFile && previewFile.id === file.id) {
      setPreviewFile((prev) =>
        prev ? { ...prev, retention_type: newType, expires_at: newExpiresAt } : null
      );
    }

    if (isCurrentlyTemp) {
      showToast("Moved to Vault", `"${file.name}" is now safely in your permanent Vault.`, "success");
    } else {
      showToast("Moved to Temp Stash", `"${file.name}" will auto-purge in 30 days.`, "info");
    }

    if (supabase) {
      try {
        await supabase
          .from("drive_files")
          .update({
            retention_type: newType,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", file.id);
      } catch (err) {
        console.error("Failed to update file retention:", err);
      }
    }
  };

  // Delete File
  const executeDeleteFile = async (file: DriveFile) => {
    setConfirmDeleteFile(null);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));

    if (supabase) {
      try {
        if (file.storage_path) {
          await supabase.storage.from("note-attachments").remove([file.storage_path]);
        }
        await supabase.from("drive_files").delete().eq("id", file.id);
      } catch (err) {
        console.error("Delete file error:", err);
      }
    }
    showToast("File Deleted", `"${file.name}" deleted. Storage reclaimed.`, "info");
  };

  // Delete Folder (Recursively removes all child files & folders)
  const executeDeleteFolder = async (folder: DriveFolder) => {
    setConfirmDeleteFolder(null);

    // Find all files belonging to this folder
    const filesToDelete = files.filter((f) => f.folder_id === folder.id);
    const storagePaths = filesToDelete.map((f) => f.storage_path).filter(Boolean);

    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setFiles((prev) => prev.filter((f) => f.folder_id !== folder.id));

    if (currentFolderId === folder.id) {
      setCurrentFolderId(folder.parent_id || null);
    }

    if (supabase) {
      try {
        if (storagePaths.length > 0) {
          await supabase.storage.from("note-attachments").remove(storagePaths);
        }
        await supabase.from("drive_folders").delete().eq("id", folder.id);
      } catch (err) {
        console.error("Delete folder error:", err);
      }
    }

    showToast("Folder Deleted", `"${folder.name}" and its contents removed.`, "info");
  };

  // Build Breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Drive" }];
    if (!currentFolderId) return crumbs;

    const path: { id: string; name: string }[] = [];
    let curr: DriveFolder | undefined = folders.find((f) => f.id === currentFolderId);
    while (curr) {
      path.unshift({ id: curr.id, name: curr.name });
      curr = curr.parent_id ? folders.find((f) => f.id === curr?.parent_id) : undefined;
    }

    return [...crumbs, ...path];
  };

  // Filtered Items for Current View
  const isSearching = Boolean(searchQuery.trim());
  const normalizedQuery = searchQuery.toLowerCase().trim();

  // Folders to show:
  const visibleFolders = isSearching
    ? folders.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
    : folders.filter((f) => (f.parent_id || null) === currentFolderId);

  // Category file counts
  const vaultFilesCount = files.filter((f) => f.retention_type !== "temporary").length;
  const tempFilesCount = files.filter((f) => f.retention_type === "temporary").length;

  // Temp files expiring within 3 days
  const expiringFilesCount = files.filter((f) => {
    if (f.retention_type !== "temporary" || !f.expires_at) return false;
    const diffMs = new Date(f.expires_at).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  // Files to show:
  let candidateFiles = isSearching
    ? files.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
    : files.filter((f) => (f.folder_id || null) === currentFolderId);

  if (storageCategoryFilter === "permanent") {
    candidateFiles = candidateFiles.filter((f) => f.retention_type !== "temporary");
  } else if (storageCategoryFilter === "temporary") {
    candidateFiles = candidateFiles.filter((f) => f.retention_type === "temporary");
  }
  const visibleFiles = candidateFiles;

  // Overall Drive Storage Metric
  const totalDriveBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const breadcrumbs = getBreadcrumbs();
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Helper to pick icon label for file extension
  const getFileIcon = (fileName: string, mimetype?: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (mimetype?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
      return { icon: ImageIcon, color: "text-purple-600 bg-purple-50 border-purple-200", label: ext.toUpperCase() || "IMAGE" };
    }
    if (["xlsx", "xls"].includes(ext)) {
      return { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "EXCEL" };
    }
    if (["csv"].includes(ext)) {
      return { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "CSV" };
    }
    if (["pdf"].includes(ext)) {
      return { icon: FileText, color: "text-rose-600 bg-rose-50 border-rose-200", label: "PDF" };
    }
    if (["doc", "docx"].includes(ext)) {
      return { icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200", label: "WORD" };
    }
    if (["ppt", "pptx"].includes(ext)) {
      return { icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-200", label: "PPT" };
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return { icon: FileArchive, color: "text-amber-600 bg-amber-50 border-amber-200", label: "ARCHIVE" };
    }
    return { icon: FileIcon, color: "text-slate-600 bg-slate-50 border-slate-200", label: ext.toUpperCase() || "FILE" };
  };

  return (
    <div
      className="space-y-6 relative pb-16"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files) {
          handleUploadFilesList(Array.from(e.dataTransfer.files));
        }
      }}
    >
      {/* Toast Notification */}
      {toast &&
        renderPortal(
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`p-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border ${
                toast.type === "error"
                  ? "bg-rose-950 text-white border-rose-800"
                  : "bg-[#0c1427] text-white border-[#1b2b4d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div className="text-xs font-bold">{toast.title}</div>
              </div>
              {toast.description && (
                <span className="text-[11px] text-slate-300 font-normal truncate max-w-xs">{toast.description}</span>
              )}
            </div>
          </div>
        )}

      {/* Drag & Drop Fullscreen Overlay Indicator */}
      {isDraggingOver &&
        renderPortal(
          <div className="fixed inset-0 z-50 bg-blue-600/15 backdrop-blur-xs border-4 border-dashed border-blue-500 rounded-3xl flex items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
            <div className="p-6 rounded-3xl bg-white shadow-2xl border border-blue-200 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <div className="text-base font-black text-slate-900">
                Drop files to upload into {currentFolder ? `"${currentFolder.name}"` : "Drive Root"}
              </div>
              <div className="text-xs text-slate-500">
                Files will be securely stored in your Supabase storage
              </div>
            </div>
          </div>
        )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Drive
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            OneDrive-style file storage with folders, instant image previews, and automatic quota sync.
          </p>
        </div>

        {/* Action Controls: New Folder, Retention Selector & Upload */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleUploadFilesList(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />

          {/* New Folder Button */}
          <button
            type="button"
            onClick={() => {
              setNewFolderName("");
              setIsFolderModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>New Folder</span>
          </button>

          {/* Target Upload Retention Selector Pill */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setUploadRetention("permanent")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                uploadRetention === "permanent"
                  ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Upload files to permanent Vault storage (won't be deleted)"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vault</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadRetention("temporary")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                uploadRetention === "temporary"
                  ? "bg-white text-amber-700 shadow-xs border border-amber-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Upload files to 30-Day Temp Stash (auto-purged after 30 days)"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Temp (30d)</span>
            </button>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploading ? (uploadProgressText || "Uploading...") : "Upload Files"}</span>
          </button>
        </div>
      </div>

      {/* Storage Category Filter Bar & Warning Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStorageCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              storageCategoryFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Items ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setStorageCategoryFilter("permanent")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              storageCategoryFilter === "permanent"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Vault · Permanent ({vaultFilesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStorageCategoryFilter("temporary")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              storageCategoryFilter === "temporary"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Temp Stash · 30 Days ({tempFilesCount})</span>
          </button>
        </div>

        {/* Expiring Soon Alert Pill */}
        {expiringFilesCount > 0 && (
          <div
            onClick={() => setStorageCategoryFilter("temporary")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer hover:bg-rose-100 transition-colors"
            title="Click to view files expiring soon"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
            <span>{expiringFilesCount} file(s) auto-purging within 3 days</span>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation & Stats Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentFolderId(crumb.id);
                    setSearchQuery("");
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isLast
                      ? "text-blue-900 bg-blue-50/80 border border-blue-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {idx === 0 && <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  <span className="truncate max-w-[160px]">{crumb.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 justify-between md:justify-end">
          {/* Quick Search */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Drive..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Drive Canvas */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-semibold">Loading Drive folders & documents...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders Section */}
          {visibleFolders.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Folders ({visibleFolders.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {visibleFolders.map((folder) => {
                  const colorConfig = FOLDER_COLORS.find((c) => c.id === folder.color) || FOLDER_COLORS[0];
                  const childFiles = files.filter((f) => f.folder_id === folder.id);

                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setSearchQuery("");
                      }}
                      className="group relative bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-blue-400 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between select-none"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`w-10 h-10 rounded-xl ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border} border flex items-center justify-center shrink-0`}>
                          <Folder className="w-5 h-5 fill-current" />
                        </div>

                        {/* Folder Action: Delete */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteFolder(folder);
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate" title={folder.name}>
                          {folder.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {childFiles.length} item{childFiles.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files Section */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Files ({visibleFiles.length})</span>
              {totalDriveBytes > 0 && (
                <span className="text-[11px] font-semibold text-slate-400 normal-case">
                  Total in view: {formatBytes(visibleFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                </span>
              )}
            </div>

            {visibleFiles.length === 0 && visibleFolders.length === 0 ? (
              /* Empty Folder View */
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {isSearching ? "No matching files or folders" : "This folder is empty"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {isSearching
                    ? "Try searching for a different file name."
                    : "Drag and drop documents, spreadsheets, or images here to store them safely."}
                </p>
                {!isSearching && (
                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload First File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFolderName("");
                        setIsFolderModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>New Folder</span>
                    </button>
                  </div>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {visibleFiles.map((file) => {
                  const iconInfo = getFileIcon(file.name, file.type);
                  const isImage = (file.type || "").startsWith("image/");
                  const isTemp = file.retention_type === "temporary";
                  let daysLeft = 30;
                  let isUrgent = false;
                  if (isTemp && file.expires_at) {
                    const diffMs = new Date(file.expires_at).getTime() - Date.now();
                    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    isUrgent = daysLeft <= 3;
                  }

                  return (
                    <div
                      key={file.id}
                      className="group relative bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* Thumbnail or Icon Preview Header */}
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="relative w-full aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group/preview"
                      >
                        {isImage && file.public_url ? (
                          <img
                            src={file.public_url}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover/preview:scale-110 duration-200">
                            <FileBrandIcon fileName={file.name} mimeType={file.type} size="lg" />
                          </div>
                        )}

                        {/* Hover Overlay with Open Preview Cue */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                          <Eye className="w-4 h-4" />
                          <span className="text-[11px] font-bold">Open</span>
                        </div>
                      </div>

                      {/* File Details Footer */}
                      <div className="p-3">
                        <div
                          onClick={() => setPreviewFile(file)}
                          className="font-bold text-xs text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                          title={file.name}
                        >
                          {file.name}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{formatBytes(file.size)}</span>
                          <span className="font-mono uppercase">{iconInfo.label}</span>
                        </div>

                        {/* Retention Badge */}
                        <div className="mt-1.5 flex items-center justify-between">
                          {isTemp ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleRetention(file);
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                isUrgent
                                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 animate-pulse"
                                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              }`}
                              title="30-Day Temp Stash. Click to keep permanently in Vault."
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{daysLeft}d left</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleRetention(file);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                              title="Permanent Vault. Click to set 30-Day auto-purge."
                            >
                              <Shield className="w-2.5 h-2.5" />
                              <span>Vault</span>
                            </button>
                          )}
                        </div>

                        {/* File Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Open in Document Viewer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleRetention(file)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title={isTemp ? "Promote to Vault (Permanent)" : "Move to Temp Stash (30 Days)"}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFileDirectly(file.public_url, file.name);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Download file directly"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFile(file)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View (Detailed Tabular) */
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Storage Category</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleFiles.map((file) => {
                        const iconInfo = getFileIcon(file.name, file.type);
                        const isTemp = file.retention_type === "temporary";
                        let daysLeft = 30;
                        let isUrgent = false;
                        if (isTemp && file.expires_at) {
                          const diffMs = new Date(file.expires_at).getTime() - Date.now();
                          daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                          isUrgent = daysLeft <= 3;
                        }
                        const dateStr = file.created_at ? new Date(file.created_at).toLocaleDateString() : "-";

                        return (
                          <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <FileBrandIcon fileName={file.name} mimeType={file.type} size="sm" />
                                <span
                                  onClick={() => setPreviewFile(file)}
                                  className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-xs md:max-w-md"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                              </div>
                            </td>

                            {/* Storage Category Badge */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isTemp ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRetention(file)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    isUrgent
                                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 animate-pulse"
                                      : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                  }`}
                                  title="30-Day Temp Stash. Click to keep permanently in Vault."
                                >
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Temp ({daysLeft}d left)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRetention(file)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                                  title="Permanent Vault. Click to switch to 30-Day Temp Stash."
                                >
                                  <Shield className="w-3 h-3 text-indigo-600" />
                                  <span>Vault</span>
                                </button>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                              {formatBytes(file.size)}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono uppercase text-[10px] whitespace-nowrap">
                              {iconInfo.label}
                            </td>
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(file)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Open Document Viewer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleRetention(file)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title={isTemp ? "Keep in Vault (Permanent)" : "Move to Temp Stash (30 Days)"}
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFileDirectly(file.public_url, file.name);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Download directly"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteFile(file)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete"
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini Storage Quota Footer Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Drive files are backed by your Supabase Free Plan storage (1 GB limit).
          </span>
        </div>
        {onNavigateUsage && (
          <button
            type="button"
            onClick={onNavigateUsage}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>View Storage Usage</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* New Folder Modal */}
      {isFolderModalOpen &&
        renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsFolderModalOpen(false)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <span>Create New Folder</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Vendor Contracts, Receipts 2026..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Folder Color
                </label>
                <div className="flex items-center gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`w-7 h-7 rounded-xl ${c.bg} ${c.border} border-2 flex items-center justify-center transition-transform ${
                        newFolderColor === c.id ? "scale-110 shadow-xs" : "opacity-70 hover:opacity-100"
                      }`}
                      title={c.label}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.text.replace("text-", "bg-")}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal (Black, White & Gray Scheme) */}
      {confirmDeleteFolder && (() => {
        const folderFiles = files.filter((f) => f.folder_id === confirmDeleteFolder.id);
        const totalSize = folderFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        const folderColor = FOLDER_COLORS.find((c) => c.id === confirmDeleteFolder.color) || FOLDER_COLORS[0];

        return renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setConfirmDeleteFolder(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              {/* Top Accent Gradient Bar (Monochrome) */}
              <div className="h-1.5 w-full bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400" />

              <div className="p-6 sm:p-7">
                {/* Header Row: Badge & Close Button */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                      <span>Folder Purge</span>
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Delete Folder from Drive?
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteFolder(null)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Folder Spotlight Preview Card */}
                <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${folderColor.bg} ${folderColor.text} ${folderColor.border} shadow-2xs`}>
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 truncate" title={confirmDeleteFolder.name}>
                      {confirmDeleteFolder.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-700 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                        {folderFiles.length} file{folderFiles.length === 1 ? "" : "s"}
                      </span>
                      {totalSize > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-900 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                          {formatBytes(totalSize)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning & Storage Notice */}
                <div className="p-3.5 rounded-2xl bg-zinc-100/90 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-3 mb-6">
                  <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="text-[12px] leading-relaxed text-zinc-600">
                    This folder and all <strong className="font-bold text-zinc-900">{folderFiles.length} file(s)</strong> stored inside will be permanently removed from Supabase storage. Reclaims <strong className="font-bold text-zinc-950 font-mono">+{formatBytes(totalSize)}</strong>. This action cannot be undone.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteFolder(null)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Keep Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteFolder(confirmDeleteFolder)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Delete Folder & Files</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete File Confirmation Modal (Black, White & Gray Scheme) */}
      {confirmDeleteFile && (() => {
        const parentFolder = folders.find((f) => f.id === confirmDeleteFile.folder_id);
        const folderLabel = parentFolder ? parentFolder.name : "Root Drive";
        const isTemp = confirmDeleteFile.retention_type === "temporary";

        return renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setConfirmDeleteFile(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              {/* Top Accent Gradient Bar (Monochrome) */}
              <div className="h-1.5 w-full bg-gradient-to-r from-zinc-950 via-zinc-700 to-zinc-400" />

              <div className="p-6 sm:p-7">
                {/* Header Row: Badge & Close Button */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                      <span>Permanent Deletion</span>
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Delete File from Drive?
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteFile(null)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* File Spotlight Preview Card (Highlighted element preserved with monochrome accents) */}
                <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 mb-4">
                  <div className="shrink-0">
                    <FileBrandIcon
                      fileName={confirmDeleteFile.name}
                      mimeType={confirmDeleteFile.type}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 truncate" title={confirmDeleteFile.name}>
                      {confirmDeleteFile.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                        {formatBytes(confirmDeleteFile.size)}
                      </span>
                      {isTemp ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-700 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>30d Temp Stash</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                          <Shield className="w-3 h-3 text-zinc-600" />
                          <span>Permanent Vault</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-md shadow-2xs truncate max-w-[120px]">
                        <FolderOpen className="w-3 h-3 shrink-0 text-zinc-400" />
                        <span className="truncate">{folderLabel}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Storage Reclaimed Callout Banner */}
                <div className="p-3.5 rounded-2xl bg-zinc-100/90 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-3 mb-6">
                  <div className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="text-[12px] leading-relaxed text-zinc-600">
                    Immediately reclaims <strong className="font-bold text-zinc-950 font-mono">+{formatBytes(confirmDeleteFile.size)}</strong> of Supabase cloud storage. This file will be permanently purged and cannot be recovered.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteFile(null)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Keep File
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteFile(confirmDeleteFile)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Delete File</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Universal Document & File Viewer Modal (Word, Excel, CSV, PDF, Image, Code) */}
      {previewFile &&
        renderPortal(
          <UniversalFileViewer
            file={previewFile}
            isOpen={Boolean(previewFile)}
            onClose={() => setPreviewFile(null)}
            onToggleRetention={handleToggleRetention}
            onDeleteFile={executeDeleteFile}
          />
        )}
    </div>
  );
}
