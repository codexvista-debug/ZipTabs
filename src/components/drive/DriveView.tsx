"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

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

  // Preview Lightbox
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ title: string; description?: string; type: "success" | "error" | "info" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    setToast({ title, description, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch folders and files from Supabase
  const loadDriveData = async () => {
    setIsLoading(true);
    try {
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

        const newFileItem: DriveFile = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          user_id: "chief",
          folder_id: currentFolderId,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          storage_path: storagePath,
          public_url: urlData?.publicUrl || "",
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
    showToast("Upload Complete", `${filesToUpload.length} file(s) saved to Drive.`, "success");
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

  // Files to show:
  const visibleFiles = isSearching
    ? files.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
    : files.filter((f) => (f.folder_id || null) === currentFolderId);

  // Overall Drive Storage Metric
  const totalDriveBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const breadcrumbs = getBreadcrumbs();
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Helper to pick icon for file extension
  const getFileIcon = (fileName: string, mimetype?: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (mimetype?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
      return { icon: ImageIcon, color: "text-purple-600 bg-purple-50 border-purple-200", label: "IMAGE" };
    }
    if (["xlsx", "xls", "csv"].includes(ext)) {
      return { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "SHEET" };
    }
    if (["pdf"].includes(ext)) {
      return { icon: FileText, color: "text-rose-600 bg-rose-50 border-rose-200", label: "PDF" };
    }
    if (["doc", "docx", "txt", "rtf"].includes(ext)) {
      return { icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200", label: "DOC" };
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return { icon: FileArchive, color: "text-amber-600 bg-amber-50 border-amber-200", label: "ARCHIVE" };
    }
    return { icon: FileIcon, color: "text-slate-600 bg-slate-50 border-slate-200", label: "FILE" };
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
      {toast && (
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
      {isDraggingOver && (
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

        {/* Action Controls: New Folder & Upload */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
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
                  const Icon = iconInfo.icon;
                  const isImage = file.type.startsWith("image/");

                  return (
                    <div
                      key={file.id}
                      className="group relative bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* Thumbnail or Icon Preview Header */}
                      <div
                        onClick={() => {
                          if (isImage && file.public_url) {
                            setPreviewImage({ url: file.public_url, name: file.name });
                          } else if (file.public_url) {
                            window.open(file.public_url, "_blank");
                          }
                        }}
                        className="relative w-full aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group/preview"
                      >
                        {isImage && file.public_url ? (
                          <img
                            src={file.public_url}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-2xl ${iconInfo.color} border flex items-center justify-center`}>
                            <Icon className="w-6 h-6" />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>

                      {/* File Details Footer */}
                      <div className="p-3">
                        <div className="font-bold text-xs text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{formatBytes(file.size)}</span>
                          <span className="font-mono uppercase">{iconInfo.label}</span>
                        </div>

                        {/* File Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <a
                            href={file.public_url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

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
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleFiles.map((file) => {
                        const iconInfo = getFileIcon(file.name, file.type);
                        const Icon = iconInfo.icon;
                        const isImage = file.type.startsWith("image/");
                        const dateStr = file.created_at ? new Date(file.created_at).toLocaleDateString() : "-";

                        return (
                          <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-lg ${iconInfo.color} border flex items-center justify-center shrink-0`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span
                                  onClick={() => {
                                    if (isImage && file.public_url) {
                                      setPreviewImage({ url: file.public_url, name: file.name });
                                    } else if (file.public_url) {
                                      window.open(file.public_url, "_blank");
                                    }
                                  }}
                                  className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-xs md:max-w-md"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                              </div>
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
                                <a
                                  href={file.public_url}
                                  download={file.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
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
      {isFolderModalOpen && (
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

      {/* Delete Folder Confirmation Modal */}
      {confirmDeleteFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDeleteFolder(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Delete folder "{confirmDeleteFolder.name}"?
            </h3>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              All files stored inside this folder will also be removed from Supabase storage to reclaim space. This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteFolder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteFolder(confirmDeleteFolder)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Delete Folder & Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDeleteFile(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Delete file "{confirmDeleteFile.name}"?
            </h3>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              This will permanently delete the file and immediately reclaim{" "}
              <strong>{formatBytes(confirmDeleteFile.size)}</strong> of Supabase storage.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteFile(confirmDeleteFile)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
          />

          <div className="relative max-w-4xl max-h-[90vh] z-10 flex flex-col items-center">
            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
            <div className="text-white text-xs font-medium mt-2.5 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
              {previewImage.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
