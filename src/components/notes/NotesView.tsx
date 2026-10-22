"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  NotebookPen,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Edit3,
  Tag,
  DollarSign,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  CalendarClock,
  X,
  Loader2,
  Copy,
  Check,
  Paperclip,
  FileUp,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  AlertCircle,
  Wallet,
  Sparkles,
  BookOpen,
  Briefcase,
} from "lucide-react";

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

export interface NoteItem {
  id: string;
  user_id?: string;
  title: string;
  content?: string;
  category: "Invoices" | "Payments" | "Payroll" | "Leopard" | "Quickbooks" | "Paychex" | string;
  target_date?: string | null; // YYYY-MM-DD
  priority?: "normal" | "high" | "urgent";
  is_completed?: boolean;
  attachments?: NoteAttachment[];
  created_at?: string;
  updated_at?: string;
}

// Exactly 6 categories requested by user:
// Invoices, Payments, Payroll, Leopard, Quickbooks, Paychex
export const CATEGORIES = [
  { id: "Invoices", label: "Invoices", color: "text-blue-700 bg-blue-50 border-blue-200", icon: FileSpreadsheet },
  { id: "Payments", label: "Payments", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: DollarSign },
  { id: "Payroll", label: "Payroll", color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: Wallet },
  { id: "Leopard", label: "Leopard", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Sparkles },
  { id: "Quickbooks", label: "Quickbooks", color: "text-teal-700 bg-teal-50 border-teal-200", icon: BookOpen },
  { id: "Paychex", label: "Paychex", color: "text-cyan-700 bg-cyan-50 border-cyan-200", icon: Briefcase },
];

export function normalizeCategory(cat?: string): string {
  if (!cat) return "Invoices";
  const lower = cat.toLowerCase();
  if (lower.includes("invoice")) return "Invoices";
  if (lower.includes("payment")) return "Payments";
  if (lower.includes("payroll")) return "Payroll";
  if (lower.includes("leopard")) return "Leopard";
  if (lower.includes("quickbook")) return "Quickbooks";
  if (lower.includes("paychex")) return "Paychex";
  return cat;
}

// Automatically generate concise, clean subject from note details text
export function generateSubject(details: string): string {
  if (!details || !details.trim()) return "New Note";

  const clean = details.trim();
  const firstLine = clean.split("\n")[0].trim();

  // If first line is under 60 chars, use it directly
  if (firstLine.length <= 60) {
    return firstLine.charAt(0).toUpperCase() + firstLine.slice(1);
  }

  // If longer than 60 chars, trim at a natural word boundary
  const sub = firstLine.substring(0, 58);
  const lastSpace = sub.lastIndexOf(" ");
  const truncated = lastSpace > 20 ? sub.substring(0, lastSpace) : sub;
  return truncated.charAt(0).toUpperCase() + truncated.slice(1) + "...";
}

export function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getDateUrgency(targetDateStr?: string | null) {
  if (!targetDateStr) {
    return {
      status: "none",
      daysDiff: 9999,
      label: "No deadline",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      cardBorder: "border-slate-200/80 bg-white",
      highlightNotice: null,
    };
  }

  const parts = targetDateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0])) {
    return {
      status: "none",
      daysDiff: 9999,
      label: targetDateStr,
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      cardBorder: "border-slate-200/80 bg-white",
      highlightNotice: null,
    };
  }

  const [year, month, day] = parts;
  const targetDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: "overdue",
      daysDiff: diffDays,
      label: `${formattedDate} (Overdue by ${overdueDays}d)`,
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
      cardBorder: "border-rose-400 bg-rose-50/40 shadow-xs ring-1 ring-rose-300/40",
      highlightNotice: `⚠️ Overdue by ${overdueDays} day${overdueDays > 1 ? "s" : ""}!`,
    };
  } else if (diffDays === 0) {
    return {
      status: "today",
      daysDiff: 0,
      label: "Due Today",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-400 font-bold animate-pulse",
      cardBorder: "border-amber-400 bg-amber-50/50 shadow-md ring-2 ring-amber-300/40",
      highlightNotice: "🔥 Action required today!",
    };
  } else if (diffDays <= 3) {
    return {
      status: "urgent",
      daysDiff: diffDays,
      label: `Due in ${diffDays} day${diffDays > 1 ? "s" : ""} (${formattedDate})`,
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300 font-bold",
      cardBorder: "border-orange-300 bg-orange-50/25 shadow-xs",
      highlightNotice: `⏰ Target date approaching in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
    };
  } else if (diffDays <= 7) {
    return {
      status: "soon",
      daysDiff: diffDays,
      label: `Due in ${diffDays} days (${formattedDate})`,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
      cardBorder: "border-blue-200 bg-blue-50/20",
      highlightNotice: null,
    };
  } else {
    return {
      status: "upcoming",
      daysDiff: diffDays,
      label: formattedDate,
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      cardBorder: "border-slate-200/80 bg-white hover:border-slate-300",
      highlightNotice: null,
    };
  }
}

export function NotesView() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "attention" | "completed">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Form State (Subject is generated automatically from content)
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("Invoices");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formPriority, setFormPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [existingAttachments, setExistingAttachments] = useState<NoteAttachment[]>([]);
  const [newFilesToUpload, setNewFilesToUpload] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Clipboard Paste support (Ctrl+V / Cmd+V) to paste screenshots or copied documents
  useEffect(() => {
    if (!isModalOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            const isImage = file.type.startsWith("image/");
            let finalFile = file;
            if (isImage && (file.name === "image.png" || !file.name || file.name.startsWith("blob"))) {
              const ext = file.type.split("/")[1] || "png";
              const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
              finalFile = new File([file], `screenshot_${dateStr}.${ext}`, { type: file.type });
            }
            pastedFiles.push(finalFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        setNewFilesToUpload((prev) => [...prev, ...pastedFiles]);
        showToast(
          "Pasted File Attached",
          `${pastedFiles.length} item(s) attached from clipboard.`,
          "success"
        );
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isModalOpen]);

  // Custom Delete Confirm Dialog Modal
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<NoteItem | null>(null);

  // Image Preview Lightbox
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Custom Styled Toast Notification
  const [toastNotification, setToastNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    description?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (title: string, description?: string, type: "success" | "error" | "info" = "success") => {
    setToastNotification({ title, description, type });
  };

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Load notes from Supabase (with localStorage fallback)
  const loadNotes = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("app_notes")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setNotes(data);
          try {
            localStorage.setItem("ziptabs_app_notes", JSON.stringify(data));
          } catch {}
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Supabase fetch error, fallback to localStorage:", e);
    }

    try {
      const stored = localStorage.getItem("ziptabs_app_notes");
      if (stored) {
        setNotes(JSON.parse(stored));
      }
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const saveNotesList = (updated: NoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem("ziptabs_app_notes", JSON.stringify(updated));
    } catch {}
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormContent("");
    setFormCategory("Invoices");
    setFormTargetDate(new Date().toISOString().slice(0, 10)); // Default to today
    setFormPriority("normal");
    setExistingAttachments([]);
    setNewFilesToUpload([]);
    setUploadProgressText(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (note: NoteItem) => {
    setEditingNote(note);
    setFormContent(note.content || note.title || "");
    setFormCategory(normalizeCategory(note.category));
    setFormTargetDate(note.target_date || "");
    setFormPriority(note.priority || "normal");
    setExistingAttachments(note.attachments || []);
    setNewFilesToUpload([]);
    setUploadProgressText(null);
    setIsModalOpen(true);
  };

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewFilesToUpload((prev) => [...prev, ...filesArray]);
    }
  };

  // Remove existing attachment during edit
  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  // Remove pending file before upload
  const handleRemoveNewFile = (index: number) => {
    setNewFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  // Save note (Automatically generates subject from details)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const contentTrimmed = formContent.trim();
    if (!contentTrimmed) return;

    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const noteId = editingNote ? editingNote.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const autoSubject = generateSubject(contentTrimmed);

    const finalAttachments: NoteAttachment[] = [...existingAttachments];

    // Upload new files to Supabase Storage bucket 'note-attachments'
    if (newFilesToUpload.length > 0 && supabase) {
      setUploadProgressText(`Uploading ${newFilesToUpload.length} attachment(s)...`);
      for (let i = 0; i < newFilesToUpload.length; i++) {
        const file = newFilesToUpload[i];
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const storagePath = `${noteId}/${Date.now()}_${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from("note-attachments")
            .upload(storagePath, file, { cacheControl: "3600", upsert: true });

          if (!uploadError) {
            const { data } = supabase.storage
              .from("note-attachments")
              .getPublicUrl(storagePath);

            finalAttachments.push({
              id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
              name: file.name,
              size: file.size,
              type: file.type || "application/octet-stream",
              url: data?.publicUrl || "",
              path: storagePath,
            });
          }
        } catch (err) {
          console.error("Upload failed for file:", file.name, err);
        }
      }
    }

    if (editingNote) {
      // Update
      const updatedItem: NoteItem = {
        ...editingNote,
        title: autoSubject,
        content: contentTrimmed,
        category: formCategory,
        target_date: formTargetDate || null,
        priority: formPriority,
        attachments: finalAttachments,
        updated_at: nowIso,
      };

      const updatedList = notes.map((n) => (n.id === editingNote.id ? updatedItem : n));
      saveNotesList(updatedList);

      if (supabase) {
        try {
          await supabase
            .from("app_notes")
            .update({
              title: updatedItem.title,
              content: updatedItem.content,
              category: updatedItem.category,
              target_date: updatedItem.target_date,
              priority: updatedItem.priority,
              attachments: finalAttachments,
              updated_at: nowIso,
            })
            .eq("id", editingNote.id);
        } catch (err) {
          console.error("Supabase update error:", err);
        }
      }

      showToast("Note Updated", `"${autoSubject}" has been saved.`, "success");
    } else {
      // Create
      const newItem: NoteItem = {
        id: noteId,
        user_id: "chief",
        title: autoSubject,
        content: contentTrimmed,
        category: formCategory,
        target_date: formTargetDate || null,
        priority: formPriority,
        is_completed: false,
        attachments: finalAttachments,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const updatedList = [newItem, ...notes];
      saveNotesList(updatedList);

      if (supabase) {
        try {
          await supabase.from("app_notes").insert([
            {
              id: newItem.id,
              user_id: "chief",
              title: newItem.title,
              content: newItem.content,
              category: newItem.category,
              target_date: newItem.target_date,
              priority: newItem.priority,
              is_completed: false,
              attachments: finalAttachments,
            },
          ]);
        } catch (err) {
          console.error("Supabase insert error:", err);
        }
      }

      showToast("Note Created", `"${autoSubject}" added under ${formCategory}.`, "success");
    }

    setIsSaving(false);
    setUploadProgressText(null);
    setIsModalOpen(false);
  };

  // Toggle Completed
  const handleToggleCompleted = async (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = !note.is_completed;
    const updatedList = notes.map((n) => (n.id === note.id ? { ...n, is_completed: nextStatus } : n));
    saveNotesList(updatedList);

    if (supabase) {
      try {
        await supabase
          .from("app_notes")
          .update({ is_completed: nextStatus })
          .eq("id", note.id);
      } catch (err) {
        console.error("Supabase error:", err);
      }
    }

    showToast(nextStatus ? "Marked as Completed" : "Note Reopened", note.title, "info");
  };

  // Trigger Custom Delete Confirmation Modal
  const requestDeleteNote = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteNote(note);
  };

  // Execute Delete after custom confirmation
  const executeDeleteNote = async (note: NoteItem) => {
    const updatedList = notes.filter((n) => n.id !== note.id);
    saveNotesList(updatedList);
    setConfirmDeleteNote(null);

    if (supabase) {
      try {
        if (note.attachments && note.attachments.length > 0) {
          const filePaths = note.attachments.map((a) => a.path).filter(Boolean);
          if (filePaths.length > 0) {
            await supabase.storage.from("note-attachments").remove(filePaths);
          }
        }
        await supabase.from("app_notes").delete().eq("id", note.id);
      } catch (err) {
        console.error("Supabase delete error:", err);
      }
    }

    showToast("Note Deleted", `"${note.title}" permanently removed.`, "info");
  };

  // Copy Note content
  const handleCopyNote = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    let text = `${note.title}\n`;
    if (note.category) text += `[Category: ${normalizeCategory(note.category)}]\n`;
    if (note.target_date) text += `[Target Date: ${note.target_date}]\n`;
    if (note.content && note.content !== note.title) text += `\n${note.content}\n`;
    if (note.attachments && note.attachments.length > 0) {
      text += `\nAttachments:\n` + note.attachments.map((a) => `- ${a.name}: ${a.url}`).join("\n");
    }

    navigator.clipboard.writeText(text.trim());
    showToast("Copied to Clipboard", "Ready to paste into emails or messages.", "success");
  };

  // Filtered & Sorted Notes
  const filteredNotes = notes
    .filter((note) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        note.title.toLowerCase().includes(q) ||
        (note.content && note.content.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Category matching with normalization
      if (activeCategory !== "all") {
        const normalized = normalizeCategory(note.category);
        if (normalized !== activeCategory) {
          return false;
        }
      }

      const urgency = getDateUrgency(note.target_date);
      if (urgencyFilter === "attention") {
        return (
          !note.is_completed &&
          (urgency.status === "overdue" || urgency.status === "today" || urgency.status === "urgent")
        );
      }
      if (urgencyFilter === "completed") {
        return note.is_completed;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      const uA = getDateUrgency(a.target_date);
      const uB = getDateUrgency(b.target_date);
      return uA.daysDiff - uB.daysDiff;
    });

  // Calculate Metrics
  const totalNotesCount = notes.length;
  const urgentCount = notes.filter((n) => {
    if (n.is_completed) return false;
    const u = getDateUrgency(n.target_date);
    return u.status === "overdue" || u.status === "today" || u.status === "urgent";
  }).length;
  const invoiceNotesCount = notes.filter((n) => normalizeCategory(n.category) === "Invoices").length;
  const payrollNotesCount = notes.filter((n) => normalizeCategory(n.category) === "Payroll").length;
  const totalAttachmentsCount = notes.reduce((acc, n) => acc + (n.attachments?.length || 0), 0);

  // Live auto-generated preview of subject while typing
  const liveSubjectPreview = generateSubject(formContent);

  return (
    <div className="space-y-6 relative pb-16">
      {/* ==================================================== */}
      {/* THEME-MATCHED FLOATING TOP-CENTER TOAST POPUP NOTIFS */}
      {/* ==================================================== */}
      {toastNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border ${
              toastNotification.type === "error"
                ? "bg-rose-950/95 border-rose-800 text-white"
                : "bg-[#0c1427]/95 border-[#1b2b4d] text-white backdrop-blur-md"
            }`}
          >
            <div className="flex items-center gap-3">
              {toastNotification.type === "error" ? (
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{toastNotification.title}</div>
                {toastNotification.description && (
                  <div className="text-[11px] text-slate-300 mt-0.5 truncate">{toastNotification.description}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <NotebookPen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            <span>Notes & Reminders</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Categorized tracking across Invoices, Payments, Payroll, Leopard, Quickbooks, and Paychex.
          </p>
        </div>

        {/* Create Note Button */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Notes</span>
            <NotebookPen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {totalNotesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalAttachmentsCount} files & images stored
          </div>
        </div>

        <div
          onClick={() => setUrgencyFilter(urgencyFilter === "attention" ? "all" : "attention")}
          className={`cursor-pointer rounded-xl p-5 border transition-all shadow-xs ${
            urgentCount > 0
              ? "bg-amber-50/50 border-amber-300 hover:border-amber-400"
              : "bg-white border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span className={urgentCount > 0 ? "text-amber-800 font-bold" : "text-slate-400"}>Due Soon / Urgent</span>
            <AlertTriangle className={`w-4 h-4 ${urgentCount > 0 ? "text-amber-600" : "text-slate-400"}`} />
          </div>
          <div className={`text-2xl font-black tracking-tight mt-2 ${urgentCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
            {urgentCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {urgentCount > 0 ? "🔥 Click to view action items" : "All dates are on schedule"}
          </div>
        </div>

        <div
          onClick={() => setActiveCategory(activeCategory === "Invoices" ? "all" : "Invoices")}
          className="cursor-pointer bg-white hover:border-blue-300 rounded-xl p-5 border border-slate-200/80 shadow-xs transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Invoices</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {invoiceNotesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Vendor & collection logs
          </div>
        </div>

        <div
          onClick={() => setActiveCategory(activeCategory === "Payroll" ? "all" : "Payroll")}
          className="cursor-pointer bg-white hover:border-indigo-300 rounded-xl p-5 border border-slate-200/80 shadow-xs transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Payroll</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {payrollNotesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Salary & contractor items
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters Toolbar with the 6 Clean Categories */}
        <div className="p-4 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, documents, details..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>

          {/* 6 Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({notes.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = notes.filter((n) => normalizeCategory(n.category) === cat.id).length;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Urgency / Status Filter */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUrgencyFilter(urgencyFilter === "attention" ? "all" : "attention")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                urgencyFilter === "attention"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-amber-700 hover:bg-amber-50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Attention ({urgentCount})</span>
            </button>
          </div>
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading notes & files from Supabase...</span>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
              <NotebookPen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {notes.length === 0 ? "No notes created yet" : "No matching notes found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {notes.length === 0
                ? "Type your note instructions or attach receipts/invoices. The subject is generated automatically from your note details."
                : "Try clearing your search query or category filter."}
            </p>
            {notes.length === 0 && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Note</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const urgency = getDateUrgency(note.target_date);
              const normalizedCat = normalizeCategory(note.category);
              const catConfig = CATEGORIES.find((c) => c.id === normalizedCat) || CATEGORIES[0];
              const CatIcon = catConfig.icon;
              const imageAttachments = (note.attachments || []).filter((a) => a.type.startsWith("image/"));
              const docAttachments = (note.attachments || []).filter((a) => !a.type.startsWith("image/"));

              return (
                <div
                  key={note.id}
                  onClick={() => handleOpenEdit(note)}
                  className={`group relative rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    note.is_completed
                      ? "bg-slate-50 border-slate-200 opacity-60 hover:opacity-100"
                      : urgency.cardBorder
                  }`}
                >
                  <div>
                    {/* Urgency Highlight Banner (if close to or past date) */}
                    {urgency.highlightNotice && !note.is_completed && (
                      <div className="mb-3 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 bg-amber-500/15 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                        <span>{urgency.highlightNotice}</span>
                      </div>
                    )}

                    {/* Top Row: Category Pill & Target Date */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catConfig.color}`}
                      >
                        <CatIcon className="w-3 h-3" />
                        <span>{normalizedCat}</span>
                      </span>

                      {note.target_date && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border ${urgency.badgeClass}`}
                        >
                          <CalendarClock className="w-3 h-3" />
                          <span>{urgency.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Note Title (Auto-Generated Subject) */}
                    <h3
                      className={`text-sm font-bold text-slate-900 leading-snug break-words ${
                        note.is_completed ? "line-through text-slate-500" : ""
                      }`}
                    >
                      {note.title || generateSubject(note.content || "")}
                    </h3>

                    {/* Note Content / Full Details (only if different or longer than title) */}
                    {note.content && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                    )}

                    {/* Image Attachments Thumbnails */}
                    {imageAttachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {imageAttachments.map((img) => (
                          <div
                            key={img.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage({ url: img.url, name: img.name });
                            }}
                            className="relative w-14 h-14 rounded-xl border border-slate-200 overflow-hidden group/img hover:border-blue-500 transition-colors bg-slate-100 shrink-0"
                            title={`Click to view: ${img.name}`}
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Document Attachments Chips */}
                    {docAttachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {docAttachments.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors max-w-full"
                            title={`Open / Download ${doc.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{doc.name}</span>
                            <span className="text-[10px] text-slate-400">({formatFileSize(doc.size)})</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between">
                    {/* Mark as Completed Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleCompleted(note, e)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                        note.is_completed
                          ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 ${note.is_completed ? "text-emerald-600" : "text-slate-400"}`}
                      />
                      <span>{note.is_completed ? "Done" : "Mark Done"}</span>
                    </button>

                    {/* Quick Tools */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleCopyNote(note, e)}
                        title="Copy note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(note);
                        }}
                        title="Edit note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => requestDeleteNote(note, e)}
                        title="Delete note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* CREATE / EDIT NOTE MODAL                             */}
      {/* (No separate subject entry: generated automatically) */}
      {/* ==================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => !isSaving && setIsModalOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const droppedFiles = Array.from(e.dataTransfer.files);
                setNewFilesToUpload((prev) => [...prev, ...droppedFiles]);
                showToast("Files Attached", `${droppedFiles.length} file(s) dropped.`, "success");
              }
            }}
            className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingNote ? "Edit Note / Reminder" : "New Note / Reminder"}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveNote} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Category & Target Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition-all font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Target Date</span>
                    <span className="text-[10px] text-blue-600 normal-case font-semibold">Highlights when close</span>
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Note Details (Primary Input: Subject will auto-generate from here) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Note Details *</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">
                    Subject is auto-generated from your text
                  </span>
                </label>
                <textarea
                  rows={4}
                  required
                  autoFocus
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="e.g. Akash majithia - premium amount of $2965 to be deducted from reserve..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-medium resize-none leading-relaxed"
                />

                {/* Live Auto-Generated Subject Preview Pill */}
                {formContent.trim() && (
                  <div className="mt-2 flex items-center gap-2 p-2 px-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 animate-in fade-in duration-150">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 shrink-0">
                      Subject:
                    </span>
                    <span className="font-semibold truncate">{liveSubjectPreview}</span>
                  </div>
                )}
              </div>

              {/* Documents & Images Upload Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Documents & Images</span>
                  </label>
                  <span className="text-[10px] text-slate-400">PDF, Excel, Images (up to 50MB)</span>
                </div>

                {/* Drag, Drop, Paste & Upload Area */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,.pdf,.csv,.xlsx,.xls,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
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
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const droppedFiles = Array.from(e.dataTransfer.files);
                      setNewFilesToUpload((prev) => [...prev, ...droppedFiles]);
                      showToast(
                        "Files Attached",
                        `${droppedFiles.length} file(s) added.`,
                        "success"
                      );
                    }
                  }}
                  className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isDraggingOver
                      ? "border-[#2563eb] bg-blue-50/90 ring-4 ring-blue-500/20 scale-[1.01]"
                      : "border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/20"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <FileUp className={`w-4 h-4 ${isDraggingOver ? "text-blue-600 animate-bounce" : "text-blue-600"}`} />
                    <span>{isDraggingOver ? "Drop files now to attach" : "Click to browse or drag & drop files here"}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap justify-center">
                    <span>Or paste screenshots directly with</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold">Ctrl+V</kbd>
                  </div>
                </div>

                {/* List of Attachments (Existing + Newly Selected) */}
                {(existingAttachments.length > 0 || newFilesToUpload.length > 0) && (
                  <div className="mt-2.5 space-y-1.5">
                    {/* Existing from Supabase */}
                    {existingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.type.startsWith("image/") ? (
                            <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 truncate max-w-xs">{att.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({formatFileSize(att.size)})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingAttachment(att.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Newly picked files awaiting upload */}
                    {newFilesToUpload.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium text-blue-900 truncate max-w-xs">{file.name}</span>
                          <span className="text-[10px] text-blue-500 shrink-0">
                            ({formatFileSize(file.size)} - pending upload)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Cancel upload"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "normal", label: "Normal" },
                    { id: "high", label: "High" },
                    { id: "urgent", label: "Urgent 🔥" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormPriority(p.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        formPriority === p.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-blue-600 font-semibold">
                  {uploadProgressText}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !formContent.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingNote ? "Save Changes" : "Create Note"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CUSTOM THEME-MATCHED DELETE CONFIRMATION MODAL       */}
      {/* ==================================================== */}
      {confirmDeleteNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmDeleteNote(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Delete this note?
            </h3>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-800">"{confirmDeleteNote.title}"</strong>? Any attached documents or images will also be removed from Supabase storage.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteNote(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteNote(confirmDeleteNote)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* HIGH-RES IMAGE LIGHTBOX MODAL                        */}
      {/* ==================================================== */}
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
