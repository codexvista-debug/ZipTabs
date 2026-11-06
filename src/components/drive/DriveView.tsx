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
  X,
  Loader2,
  AlertCircle,
  Clock,
  Eye,
  FolderInput,
  RotateCcw,
  Check,
} from "lucide-react";
import { UniversalFileViewer } from "./UniversalFileViewer";
import { downloadFileDirectly } from "@/lib/download";
import { getSecureFileUrl, getSecureDownloadUrl, preloadSignedUrls, uploadFileToStorage, deleteFilesFromStorage } from "@/lib/storage";
import { FileBrandIcon } from "@/components/ui/FileBrandIcon";
import {
  ExecutiveToast,
  getToastPosition,
  TOAST_POSITION_CLASSES,
  ToastPosition,
} from "@/components/ui/ExecutiveToast";

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

  // Tab: "files" (Drive Files) | "trash" (Recycle Bin - 7 day auto-purge)
  const [driveTab, setDriveTab] = useState<"files" | "trash">("files");

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

  // Move File Modal State
  const [movingFile, setMovingFile] = useState<DriveFile | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");

  // Delete & Recycle Bin Modal States
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<DriveFolder | null>(null);
  const [confirmPermanentDeleteFile, setConfirmPermanentDeleteFile] = useState<DriveFile | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  // Universal File Preview Modal
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    type: "success" | "error" | "info";
    position?: ToastPosition;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderPortal = (children: React.ReactNode) => {
    if (!isMounted || typeof document === "undefined") return null;
    return createPortal(children, document.body);
  };

  const showToast = (
    title: string,
    description?: string,
    type: "success" | "error" | "info" = "success",
    position?: ToastPosition
  ) => {
    const resolvedPosition = getToastPosition(title, position);
    setToast({ title, description, type, position: resolvedPosition });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto-purge any expired Recycle Bin files (> 7 days)
  const purgeExpiredFiles = async () => {
    if (!supabase) return;
    try {
      // 1. Invoke Supabase RPC if present
      const { data: purged } = await supabase.rpc("purge_expired_drive_files");
      if (purged && purged.length > 0) {
        const storagePaths = purged.map((p: any) => p.purged_storage_path).filter(Boolean);
        if (storagePaths.length > 0) {
          await deleteFilesFromStorage(storagePaths);
        }
      }
    } catch (err) {
      console.warn("Auto-purge RPC notice:", err);
    }

    // 2. Client-side purge safeguard for any temporary files past their expires_at
    try {
      const nowIso = new Date().toISOString();
      const { data: expired } = await supabase
        .from("drive_files")
        .select("id, storage_path")
        .eq("retention_type", "temporary")
        .lt("expires_at", nowIso);

      if (expired && expired.length > 0) {
        const paths = expired.map((e) => e.storage_path).filter(Boolean);
        const ids = expired.map((e) => e.id);
        if (paths.length > 0) {
          await deleteFilesFromStorage(paths);
        }
        await supabase.from("drive_files").delete().in("id", ids);
        setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
      }
    } catch (err) {
      console.warn("Client safeguard purge notice:", err);
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
          const drivePaths = filesRes.data.map((f: any) => f.storage_path).filter(Boolean);
          if (drivePaths.length > 0) preloadSignedUrls(drivePaths);
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
      if (driveTab === "trash") return; // Don't paste into trash
      const items = e.clipboardData?.items;
      if (!items) return;

      const pasted: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            let finalFile = file;
            if (
              file.type.startsWith("image/") &&
              (file.name === "image.png" || !file.name || file.name.startsWith("blob"))
            ) {
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
  }, [currentFolderId, driveTab]);

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

  // Upload Files Process: All uploads are permanent
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

        // Upload to storage bucket via authenticated endpoint
        const uploadResult = await uploadFileToStorage(storagePath, file);
        if (!uploadResult.success) throw new Error(uploadResult.error || "Upload failed");

        const newFileItem: DriveFile = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          user_id: "chief",
          folder_id: currentFolderId,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          storage_path: storagePath,
          public_url: getSecureFileUrl(storagePath),
          retention_type: "permanent",
          expires_at: null,
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
      `${filesToUpload.length} file(s) saved permanently to Drive.`,
      "success"
    );
  };

  // Move File to target folder or Drive Root
  const handleMoveFile = async (file: DriveFile, targetId: string | null) => {
    setMovingFile(null);
    const targetFolder = folders.find((f) => f.id === targetId);
    const destinationLabel = targetFolder ? `"${targetFolder.name}"` : "Drive Root";

    // Optimistic state update
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, folder_id: targetId } : f))
    );

    if (supabase) {
      try {
        await supabase
          .from("drive_files")
          .update({
            folder_id: targetId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", file.id);
      } catch (err) {
        console.error("Failed to move file:", err);
      }
    }

    showToast("File Moved", `"${file.name}" moved to ${destinationLabel}.`, "success");
  };

  // Move File to Recycle Bin (Kept for 7 days then auto-purged)
  const handleMoveToTrash = async (file: DriveFile) => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, retention_type: "temporary", expires_at: expiresAt } : f
      )
    );

    if (previewFile && previewFile.id === file.id) {
      setPreviewFile(null);
    }

    if (supabase) {
      try {
        await supabase
          .from("drive_files")
          .update({
            retention_type: "temporary",
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", file.id);
      } catch (err) {
        console.error("Move to trash error:", err);
      }
    }

    showToast("Moved to Recycle Bin", `"${file.name}" will be auto-purged in 7 days.`, "info");
  };

  // Restore File from Recycle Bin back to Active Drive
  const handleRestoreFile = async (file: DriveFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, retention_type: "permanent", expires_at: null } : f
      )
    );

    if (supabase) {
      try {
        await supabase
          .from("drive_files")
          .update({
            retention_type: "permanent",
            expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", file.id);
      } catch (err) {
        console.error("Restore file error:", err);
      }
    }

    showToast("File Restored", `"${file.name}" restored to Drive.`, "success");
  };

  // Permanently Delete Single File Immediately
  const executePermanentDeleteFile = async (file: DriveFile) => {
    setConfirmPermanentDeleteFile(null);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));

    if (supabase) {
      try {
        if (file.storage_path) {
          await deleteFilesFromStorage([file.storage_path]);
        }
        await supabase.from("drive_files").delete().eq("id", file.id);
      } catch (err) {
        console.error("Permanent delete file error:", err);
      }
    }
    showToast("Permanently Deleted", `"${file.name}" purged. Storage reclaimed.`, "info");
  };

  // Empty Entire Recycle Bin Immediately
  const executeEmptyTrash = async () => {
    setConfirmEmptyTrash(false);
    const trashed = files.filter((f) => f.retention_type === "temporary");
    if (trashed.length === 0) return;

    const storagePaths = trashed.map((f) => f.storage_path).filter(Boolean);
    const ids = trashed.map((f) => f.id);

    setFiles((prev) => prev.filter((f) => f.retention_type !== "temporary"));

    if (supabase) {
      try {
        if (storagePaths.length > 0) {
          await deleteFilesFromStorage(storagePaths);
        }
        await supabase.from("drive_files").delete().in("id", ids);
      } catch (err) {
        console.error("Empty trash error:", err);
      }
    }

    showToast("Recycle Bin Emptied", `${trashed.length} file(s) permanently purged.`, "info");
  };

  // Delete Folder (Recursively moves/deletes child items)
  const executeDeleteFolder = async (folder: DriveFolder) => {
    setConfirmDeleteFolder(null);

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
          await deleteFilesFromStorage(storagePaths);
        }
        await supabase.from("drive_folders").delete().eq("id", folder.id);
      } catch (err) {
        console.error("Delete folder error:", err);
      }
    }

    showToast("Folder Deleted", `"${folder.name}" and contents deleted.`, "info");
  };

  // Build Breadcrumbs for navigation
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

  // Active vs Trashed sets
  const activeFiles = files.filter((f) => f.retention_type !== "temporary");
  const trashedFiles = files.filter((f) => f.retention_type === "temporary");

  // Folders to show: only in files tab
  const visibleFolders =
    driveTab === "trash"
      ? []
      : isSearching
      ? folders.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
      : folders.filter((f) => (f.parent_id || null) === currentFolderId);

  // Files to show based on active tab
  const visibleFiles =
    driveTab === "trash"
      ? isSearching
        ? trashedFiles.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
        : trashedFiles
      : isSearching
      ? activeFiles.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
      : activeFiles.filter((f) => (f.folder_id || null) === currentFolderId);

  // Overall Storage Metric
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
        if (driveTab === "files") setIsDraggingOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (driveTab === "files") setIsDraggingOver(true);
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
        if (driveTab === "files" && e.dataTransfer.files) {
          handleUploadFilesList(Array.from(e.dataTransfer.files));
        }
      }}
    >
      {/* Toast Notification (Top-Center Executive Precision Dynamic Capsule) */}
      {toast &&
        renderPortal(
          <div className={TOAST_POSITION_CLASSES[toast.position || getToastPosition(toast.title)]}>
            <ExecutiveToast
              type={toast.type}
              title={toast.title}
              description={toast.description}
              headerMeta="Supabase Drive Storage"
              metric={toast.type === "error" ? "Storage Alert" : "Drive Synced"}
              onClose={() => setToast(null)}
              durationMs={3500}
            />
          </div>
        )}

      {/* Floating Upload Progress Indicator */}
      {isUploading &&
        renderPortal(
          <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-24px)] sm:w-80 max-w-sm animate-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
            <div className="bg-white/98 border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-2.5 px-3.5 flex items-center justify-between gap-3 backdrop-blur-md ring-1 ring-slate-900/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-2 ring-blue-200 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {uploadProgressText || "Uploading Files..."}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Storing permanently in Supabase Drive
                  </div>
                </div>
              </div>
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
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
                Files will be securely & permanently stored in Supabase
              </div>
            </div>
          </div>
        )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
              Drive
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 hidden sm:block">
            OneDrive-style permanent file storage with folder hierarchy, file moves, and a 7-day recycle bin.
          </p>
        </div>

        {/* Action Controls: Compact row on mobile */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
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

          {driveTab === "files" ? (
            <>
              {/* Upload Button */}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? (uploadProgressText || "Uploading...") : "Upload"}</span>
              </button>

              {/* New Folder Button */}
              <button
                type="button"
                onClick={() => {
                  setNewFolderName("");
                  setIsFolderModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">New </span><span>Folder</span>
              </button>
            </>
          ) : (
            trashedFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Empty Recycle Bin</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Drive Tab Switcher Bar: Drive Files vs Recycle Bin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <button
            type="button"
            onClick={() => setDriveTab("files")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              driveTab === "files"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Drive Files ({activeFiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDriveTab("trash")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              driveTab === "trash"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recycle Bin ({trashedFiles.length})</span>
          </button>
        </div>

        {/* Recycle Bin Notice */}
        {driveTab === "trash" && (
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Files are kept for 7 days before being auto-purged permanently.</span>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation & Controls Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Breadcrumb Trail (files mode) or Recycle Bin Banner */}
        {driveTab === "files" ? (
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
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">Recycle Bin</span>
              <span className="text-[11px] text-slate-500 ml-2 hidden sm:inline">
                {trashedFiles.length} file{trashedFiles.length === 1 ? "" : "s"} awaiting purge
              </span>
            </div>
          </div>
        )}

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 justify-between md:justify-end">
          {/* Quick Search */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={driveTab === "files" ? "Search in Drive..." : "Search Recycle Bin..."}
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
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
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
          <span className="text-xs font-semibold">Loading Drive files & folders...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders Section (Only in Active Files View) */}
          {driveTab === "files" && visibleFolders.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Folders ({visibleFolders.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {visibleFolders.map((folder, idx) => {
                  const colorConfig =
                    FOLDER_COLORS.find((c) => c.id === folder.color) || FOLDER_COLORS[0];
                  const childFiles = activeFiles.filter((f) => f.folder_id === folder.id);

                  return (
                    <div
                      key={folder.id}
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setSearchQuery("");
                      }}
                      className="group relative bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-blue-400 rounded-2xl p-3.5 shadow-2xs hover:shadow-xl hover:-translate-y-1 active:scale-[0.985] transition-all duration-300 cursor-pointer flex flex-col justify-between select-none animate-card-enter"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-10 h-10 rounded-xl ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border} border flex items-center justify-center shrink-0`}
                        >
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
              <span>
                {driveTab === "files" ? "Files" : "Recycle Bin Files"} ({visibleFiles.length})
              </span>
              {visibleFiles.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-400 normal-case">
                  Total: {formatBytes(visibleFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                </span>
              )}
            </div>

            {visibleFiles.length === 0 && (driveTab === "trash" || visibleFolders.length === 0) ? (
              /* Empty View */
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
                <div
                  className={`w-14 h-14 rounded-2xl ${
                    driveTab === "trash"
                      ? "bg-rose-50 border-rose-200/60 text-rose-600"
                      : "bg-blue-50 border-blue-200/60 text-blue-600"
                  } border flex items-center justify-center mb-4 shadow-xs`}
                >
                  {driveTab === "trash" ? <Trash2 className="w-7 h-7" /> : <FolderOpen className="w-7 h-7" />}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {driveTab === "trash"
                    ? isSearching
                      ? "No matching deleted files"
                      : "Recycle Bin is empty"
                    : isSearching
                    ? "No matching files or folders"
                    : "This folder is empty"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {driveTab === "trash"
                    ? "Files deleted from Drive are kept here for 7 days before being automatically purged permanently."
                    : isSearching
                    ? "Try searching for a different file name."
                    : "Drag and drop documents, spreadsheets, or images here to store them safely."}
                </p>
                {driveTab === "files" && !isSearching && (
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
                {visibleFiles.map((file, idx) => {
                  const iconInfo = getFileIcon(file.name, file.type);
                  const isImage = (file.type || "").startsWith("image/");
                  const isTrash = driveTab === "trash";

                  let daysLeft = 7;
                  if (file.expires_at) {
                    const diffMs = new Date(file.expires_at).getTime() - Date.now();
                    daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                  }

                  return (
                    <div
                      key={file.id}
                      style={{ animationDelay: `${Math.min(idx * 30, 360)}ms` }}
                      className="group relative bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1 active:scale-[0.985] transition-all duration-300 flex flex-col justify-between animate-card-enter"
                    >
                      {/* Thumbnail or Icon Preview Header */}
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="relative w-full aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group/preview"
                      >
                        {isImage && (file.storage_path || file.public_url) ? (
                          <img
                            src={getSecureFileUrl(file.storage_path || file.public_url)}
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

                        {/* Status Badge */}
                        <div className="mt-1.5 flex items-center justify-between">
                          {isTrash ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              title={`Auto-purges in ${daysLeft} day(s)`}
                            >
                              <Clock className="w-2.5 h-2.5 text-rose-500" />
                              <span>{daysLeft}d left</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span>Permanent</span>
                            </span>
                          )}
                        </div>

                        {/* File Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Open Document Viewer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Move File (Active Files Only) */}
                            {!isTrash && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFolderSearchQuery("");
                                  setMovingFile(file);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Move to folder or root"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Download */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFileDirectly(
                                  getSecureDownloadUrl(file.storage_path || file.public_url, file.name),
                                  file.name
                                );
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Download file directly"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Delete Action: Move to Trash (Active) vs Permanent Delete (Recycle Bin) */}
                          {isTrash ? (
                            <div className="flex items-center gap-1">
                              {/* Restore Button */}
                              <button
                                type="button"
                                onClick={() => handleRestoreFile(file)}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Restore file to Drive"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {/* Permanent Delete Button */}
                              <button
                                type="button"
                                onClick={() => setConfirmPermanentDeleteFile(file)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Permanently delete now"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMoveToTrash(file)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Move to Recycle Bin (7 days)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                        <th className="py-3 px-4">{driveTab === "trash" ? "Retention" : "Location"}</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleFiles.map((file, idx) => {
                        const iconInfo = getFileIcon(file.name, file.type);
                        const isTrash = driveTab === "trash";
                        const parentFolder = folders.find((f) => f.id === file.folder_id);
                        const locationLabel = parentFolder ? parentFolder.name : "Drive Root";

                        let daysLeft = 7;
                        if (file.expires_at) {
                          const diffMs = new Date(file.expires_at).getTime() - Date.now();
                          daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                        }
                        const dateStr = file.created_at
                          ? new Date(file.created_at).toLocaleDateString()
                          : "-";

                        return (
                          <tr
                            key={file.id}
                            style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                            className="hover:bg-slate-50/80 transition-colors animate-card-enter"
                          >
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

                            {/* Location or Retention Badge */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isTrash ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Clock className="w-3 h-3 text-rose-600" />
                                  <span>{daysLeft}d left</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 truncate max-w-[140px]">
                                  <FolderOpen className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{locationLabel}</span>
                                </span>
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

                                {!isTrash && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFolderSearchQuery("");
                                      setMovingFile(file);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                    title="Move to folder or root"
                                  >
                                    <FolderInput className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFileDirectly(
                                  getSecureDownloadUrl(file.storage_path || file.public_url, file.name),
                                  file.name
                                );
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Download directly"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                {isTrash ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreFile(file)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                      title="Restore to Drive"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmPermanentDeleteFile(file)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Permanently delete now"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveToTrash(file)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Move to Recycle Bin (7 days)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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

      {/* Storage Quota Footer Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Drive files are permanently backed by your Supabase storage (1 GB limit).
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

      {/* Move File Modal (Sculpted Dynamic Notch Styling) */}
      {movingFile && (() => {
        const currentParent = folders.find((f) => f.id === movingFile.folder_id);
        const currentLocLabel = currentParent ? currentParent.name : "Drive Root";
        const filteredFolders = folderSearchQuery.trim()
          ? folders.filter((f) =>
              f.name.toLowerCase().includes(folderSearchQuery.toLowerCase().trim())
            )
          : folders;

        return renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setMovingFile(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              {/* Creative Top: Sculpted Dynamic Island Notch */}
              <div className="flex justify-center -mt-px shrink-0">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>MOVE FILE · DIRECTORY</span>
                </div>
              </div>

              {/* Side Gradient Shadow Rails */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

              <div className="p-6 sm:p-7 pt-5 flex flex-col min-h-0 flex-1">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Move File
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Select destination folder or return to Drive Root.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMovingFile(null)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Selected File Spotlight */}
                <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-3 flex items-center gap-3 mb-4 shrink-0 shadow-2xs">
                  <FileBrandIcon fileName={movingFile.name} mimeType={movingFile.type} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 truncate" title={movingFile.name}>
                      {movingFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                      <span>{formatBytes(movingFile.size)}</span>
                      <span>•</span>
                      <span className="truncate">Current: <strong className="text-zinc-800 font-bold">{currentLocLabel}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Search Folders Input */}
                {folders.length > 4 && (
                  <div className="relative mb-3 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      placeholder="Filter destinations..."
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 transition-all font-medium"
                    />
                  </div>
                )}

                {/* Destinations List */}
                <div className="overflow-y-auto no-scrollbar space-y-1.5 flex-1 pr-1">
                  {/* Option: Drive Root */}
                  <div
                    onClick={() => {
                      if (movingFile.folder_id !== null) {
                        handleMoveFile(movingFile, null);
                      }
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      movingFile.folder_id === null
                        ? "bg-blue-50/70 border-blue-200 text-blue-900 cursor-default"
                        : "bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 cursor-pointer shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>Drive Root</span>
                          {movingFile.folder_id === null && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded-md">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">Top-level root directory</div>
                      </div>
                    </div>

                    {movingFile.folder_id === null ? (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <span className="text-[11px] font-bold text-blue-600 hover:underline shrink-0">
                        Move Here
                      </span>
                    )}
                  </div>

                  {/* Folders */}
                  {filteredFolders.map((folder) => {
                    const isCurrent = movingFile.folder_id === folder.id;
                    const colorConfig =
                      FOLDER_COLORS.find((c) => c.id === folder.color) || FOLDER_COLORS[0];
                    const folderFileCount = activeFiles.filter((f) => f.folder_id === folder.id).length;

                    return (
                      <div
                        key={folder.id}
                        onClick={() => {
                          if (!isCurrent) {
                            handleMoveFile(movingFile, folder.id);
                          }
                        }}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                          isCurrent
                            ? "bg-blue-50/70 border-blue-200 text-blue-900 cursor-default"
                            : "bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 cursor-pointer shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border} border flex items-center justify-center shrink-0`}
                          >
                            <Folder className="w-4 h-4 fill-current" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                              <span className="truncate">{folder.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded-md shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {folderFileCount} file{folderFileCount === 1 ? "" : "s"}
                            </div>
                          </div>
                        </div>

                        {isCurrent ? (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <span className="text-[11px] font-bold text-blue-600 hover:underline shrink-0">
                            Move Here
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setMovingFile(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Folder Modal (Sculpted Dynamic Notch Styling) */}
      {isFolderModalOpen &&
        renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setIsFolderModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-center -mt-px">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>FOLDER DIRECTORY</span>
                </div>
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

              <div className="p-6 sm:p-7 pt-5">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Create New Folder
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Organize files and attachments in your cloud drive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. Vendor Contracts, Receipts 2026..."
                      className="w-full px-3.5 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900 font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Folder Color Accent
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewFolderColor(c.id)}
                          className={`w-7 h-7 rounded-xl ${c.bg} ${c.border} border-2 flex items-center justify-center transition-transform cursor-pointer ${
                            newFolderColor === c.id
                              ? "scale-110 shadow-xs ring-2 ring-zinc-900/20"
                              : "opacity-70 hover:opacity-100"
                          }`}
                          title={c.label}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${c.text.replace("text-", "bg-")}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsFolderModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newFolderName.trim()}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Create Folder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      {/* Delete Folder Confirmation Modal */}
      {confirmDeleteFolder && (() => {
        const folderFiles = files.filter((f) => f.folder_id === confirmDeleteFolder.id);
        const totalSize = folderFiles.reduce((acc, f) => acc + (f.size || 0), 0);
        const folderColor =
          FOLDER_COLORS.find((c) => c.id === confirmDeleteFolder.color) || FOLDER_COLORS[0];

        return renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setConfirmDeleteFolder(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-center -mt-px">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>IRREVERSIBLE PURGE</span>
                </div>
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

              <div className="p-6 sm:p-7 pt-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Delete Folder from Drive?
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Action confirmed from authorized Chief workspace.
                    </p>
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

                <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${folderColor.bg} ${folderColor.text} ${folderColor.border} shadow-2xs`}
                  >
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

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-700 mb-6 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
                        <HardDrive className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Storage Reclaimed
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[11px] font-black tracking-tight tabular-nums shadow-2xs">
                      +{formatBytes(totalSize)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-600 pl-8">
                    This folder and all <strong className="font-bold text-zinc-900">{folderFiles.length} file(s)</strong> inside will be permanently deleted from Supabase.
                  </p>
                </div>

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

      {/* Permanent Delete Single File Confirmation Modal */}
      {confirmPermanentDeleteFile && (() => {
        return renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setConfirmPermanentDeleteFile(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-center -mt-px">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>PERMANENT PURGE</span>
                </div>
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

              <div className="p-6 sm:p-7 pt-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Delete File Permanently?
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      This file will be completely erased from Supabase storage now.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmPermanentDeleteFile(null)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 mb-4 shadow-2xs">
                  <FileBrandIcon
                    fileName={confirmPermanentDeleteFile.name}
                    mimeType={confirmPermanentDeleteFile.type}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 truncate" title={confirmPermanentDeleteFile.name}>
                      {confirmPermanentDeleteFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] font-bold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                        {formatBytes(confirmPermanentDeleteFile.size)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-700 mb-6 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
                        <HardDrive className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Storage Reclaimed
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[11px] font-black tracking-tight tabular-nums shadow-2xs">
                      +{formatBytes(confirmPermanentDeleteFile.size)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-600 pl-8">
                    This file cannot be recovered once purged.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setConfirmPermanentDeleteFile(null)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Keep in Trash
                  </button>
                  <button
                    type="button"
                    onClick={() => executePermanentDeleteFile(confirmPermanentDeleteFile)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty Recycle Bin Modal */}
      {confirmEmptyTrash && (() => {
        const trashedTotal = trashedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

        return renderPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setConfirmEmptyTrash(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            />

            <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-center -mt-px">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>EMPTY RECYCLE BIN</span>
                </div>
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

              <div className="p-6 sm:p-7 pt-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                      Empty Entire Recycle Bin?
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Permanently delete all {trashedFiles.length} file(s) currently in the recycle bin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmEmptyTrash(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-700 mb-6 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
                        <HardDrive className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Total Storage Reclaimed
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[11px] font-black tracking-tight tabular-nums shadow-2xs">
                      +{formatBytes(trashedTotal)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-600 pl-8">
                    All <strong className="font-bold text-zinc-900">{trashedFiles.length} file(s)</strong> will be completely removed from Supabase storage. This action cannot be reversed.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setConfirmEmptyTrash(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeEmptyTrash}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Empty Bin Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Universal Document & File Viewer Modal */}
      {previewFile &&
        renderPortal(
          <UniversalFileViewer
            file={previewFile}
            isOpen={Boolean(previewFile)}
            onClose={() => setPreviewFile(null)}
            onDeleteFile={handleMoveToTrash}
          />
        )}
    </div>
  );
}
