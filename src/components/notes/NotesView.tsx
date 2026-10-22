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
  Edit,
  ChevronDown,
  UploadCloud,
} from "lucide-react";

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

export interface BackgroundUploadJob {
  id: string;
  noteId: string;
  noteTitle: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface NoteItem {
  id: string;
  user_id?: string;
  title: string;
  content?: string;
  category: string;
  target_date?: string | null; // YYYY-MM-DD
  priority?: "normal" | "high" | "urgent";
  is_completed?: boolean;
  attachments?: NoteAttachment[];
  created_at?: string;
  updated_at?: string;
}

export interface CategoryConfig {
  id: string;
  label: string;
  color: string;
  icon: any;
}

// Quick Notes at the top, followed by other categories
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: "Quick Notes", label: "Quick Notes", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Zap },
  { id: "Invoices", label: "Invoices", color: "text-blue-700 bg-blue-50 border-blue-200", icon: FileSpreadsheet },
  { id: "Payments", label: "Payments", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: DollarSign },
  { id: "Payroll", label: "Payroll", color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: Wallet },
  { id: "Leopard", label: "Leopard", color: "text-orange-700 bg-orange-50 border-orange-200", icon: Sparkles },
  { id: "Quickbooks", label: "Quickbooks", color: "text-teal-700 bg-teal-50 border-teal-200", icon: BookOpen },
  { id: "Paychex", label: "Paychex", color: "text-cyan-700 bg-cyan-50 border-cyan-200", icon: Briefcase },
];

export function normalizeCategory(cat?: string): string {
  if (!cat) return "Quick Notes";
  const lower = cat.toLowerCase();
  if (lower === "quick notes" || lower === "quick note" || lower.includes("quick")) return "Quick Notes";
  if (lower.includes("invoice")) return "Invoices";
  if (lower.includes("payment")) return "Payments";
  if (lower.includes("payroll")) return "Payroll";
  if (lower.includes("leopard")) return "Leopard";
  if (lower.includes("quickbook")) return "Quickbooks";
  if (lower.includes("paychex")) return "Paychex";
  return cat;
}

// Focus on 2-3 key words: entity/person name + business term + amount/number (e.g. "Akash Premium $2965")
export function extractKeywordsSubject(details: string): string {
  if (!details || !details.trim()) return "Quick Note";

  const clean = details.trim();
  const firstLine = clean.split("\n")[0].trim();

  // 1. Currency amount
  const amountMatch = firstLine.match(/\$[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?\s*(?:usd|dollars)/i);
  const amount = amountMatch ? amountMatch[0] : "";

  // 2. Invoice number
  const invMatch = firstLine.match(/(?:inv(?:oice)?\.?\s*#?\s*|#)([0-9a-zA-Z-]+)/i);
  const invNum = invMatch ? (invMatch[0].startsWith("#") ? invMatch[0] : `Inv #${invMatch[1]}`) : "";

  // Priority business / finance keywords
  const priorityKeywords = new Set([
    "premium", "deposit", "invoice", "payment", "refund", "salary", "bonus", 
    "tax", "license", "reconciliation", "audit", "fee", "bill", "balance", 
    "deduction", "payout", "wire", "vendor", "contract", "client", "overdue", "rates",
    "payroll", "quickbooks", "paychex", "leopard", "invoices", "payments", "uscis"
  ]);

  // Common stop words, pronouns, verbs to skip
  const stopWords = new Set([
    "i", "me", "my", "we", "us", "our", "you", "your", "he", "him", "his", "she", "her", "they", "them", "their",
    "the", "is", "are", "was", "were", "am", "at", "which", "on", "a", "an", "and", "or", "in", "with", "to", "for", "of", "from", 
    "be", "been", "being", "by", "this", "that", "it", "amount", "need", "needs", "please", "call", "send", "sent", "have", "has", 
    "had", "do", "does", "did", "deducted", "deduct", "added", "updated", "checked", "check", "note", "reminder", "follow", 
    "up", "about", "pay", "paid", "making", "make", "made", "will", "would", "should", "can", "could", "into", "reserve", 
    "today", "tomorrow", "yesterday", "here", "there", "now", "just", "per", "via", "also", "done", "got", "get", "majithia"
  ]);

  const rawTokens = firstLine
    .replace(/[,\/#!$%\^&\*;:{}=\_`~()\-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const entities: string[] = [];
  let businessTerm = "";

  for (let i = 0; i < rawTokens.length; i++) {
    const word = rawTokens[i];
    const lower = word.toLowerCase();

    if (amount && (word.includes("$") || word === amount.replace("$", ""))) continue;
    if (invNum && word.includes(invNum.replace(/[^0-9]/g, ""))) continue;
    if (/^[0-9]+$/.test(word) && !amount) continue;

    if (priorityKeywords.has(lower)) {
      if (!businessTerm) {
        businessTerm = word.toUpperCase() === word ? word : (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      }
      continue;
    }

    if (stopWords.has(lower) || lower.length <= 1) continue;

    const formatted = word.toUpperCase() === word ? word : (word.charAt(0).toUpperCase() + word.slice(1));
    if (entities.length < 2 && !entities.includes(formatted)) {
      entities.push(formatted);
    }
  }

  const resultParts: string[] = [];
  if (entities.length > 0) resultParts.push(...entities.slice(0, 2));
  if (businessTerm) resultParts.push(businessTerm);
  if (amount) {
    resultParts.push(amount);
  } else if (invNum) {
    resultParts.push(invNum);
  }

  // Keep focused to 2-3 key words
  const trimmedParts = resultParts.slice(0, 3);

  if (trimmedParts.length === 0) {
    return firstLine.substring(0, 25);
  }

  return trimmedParts.join(" ");
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
  const [customCategories, setCustomCategories] = useState<CategoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "attention" | "completed">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Form State
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("Quick Notes");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formPriority, setFormPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [existingAttachments, setExistingAttachments] = useState<NoteAttachment[]>([]);
  const [newFilesToUpload, setNewFilesToUpload] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Category Creation State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Custom Subject Override State
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState("");

  // Custom Delete Confirm Dialog Modal
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<NoteItem | null>(null);

  // Image Preview Lightbox
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Background Uploads State
  const [backgroundUploads, setBackgroundUploads] = useState<BackgroundUploadJob[]>([]);
  const [isUploadsMinimized, setIsUploadsMinimized] = useState(false);

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

  // Combined categories list: Quick Notes first, followed by others, then custom
  const allCategories: CategoryConfig[] = [...DEFAULT_CATEGORIES, ...customCategories];

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

  // Load custom categories from Supabase (with localStorage fallback)
  const loadCategories = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("app_categories")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          const loaded: CategoryConfig[] = data.map((d: any) => ({
            id: d.id,
            label: d.label,
            color: d.color || "text-slate-700 bg-slate-100 border-slate-200",
            icon: Tag,
          }));
          setCustomCategories(loaded);
          localStorage.setItem("ziptabs_custom_categories", JSON.stringify(loaded));
          return;
        }
      }
    } catch {}

    try {
      const stored = localStorage.getItem("ziptabs_custom_categories");
      if (stored) {
        setCustomCategories(JSON.parse(stored));
      }
    } catch {}
  };

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
    loadCategories();
    loadNotes();
  }, []);

  const saveNotesList = (updated: NoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem("ziptabs_app_notes", JSON.stringify(updated));
    } catch {}
  };

  // Add a new custom category (persistent to Supabase + localStorage)
  const handleAddNewCategory = async () => {
    const raw = newCategoryName.trim();
    if (!raw) return;

    const existing = allCategories.find((c) => c.label.toLowerCase() === raw.toLowerCase());
    if (existing) {
      setFormCategory(existing.id);
      setIsCreatingCategory(false);
      setNewCategoryName("");
      showToast("Category Exists", `Selected "${existing.label}".`, "info");
      return;
    }

    const newCat: CategoryConfig = {
      id: raw,
      label: raw,
      color: "text-slate-800 bg-slate-100 border-slate-300",
      icon: Tag,
    };

    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    setFormCategory(newCat.id);
    setIsCreatingCategory(false);
    setNewCategoryName("");

    try {
      localStorage.setItem("ziptabs_custom_categories", JSON.stringify(updated));
      if (supabase) {
        await supabase.from("app_categories").insert([
          {
            id: newCat.id,
            label: newCat.label,
            color: newCat.color,
            icon: "Tag",
          },
        ]);
      }
    } catch (e) {
      console.error("Save category error:", e);
    }

    showToast("Category Created", `"${raw}" has been added.`, "success");
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormContent("");
    setFormCategory("Quick Notes");
    setFormTargetDate(new Date().toISOString().slice(0, 10)); // Default to today
    setFormPriority("normal");
    setExistingAttachments([]);
    setNewFilesToUpload([]);
    setUploadProgressText(null);
    setIsCreatingCategory(false);
    setIsEditingSubject(false);
    setCustomSubject("");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (note: NoteItem) => {
    setEditingNote(note);
    setFormContent(note.content || note.title || "");
    setFormCategory(note.category || "Quick Notes");
    setFormTargetDate(note.target_date || "");
    setFormPriority(note.priority || "normal");
    setExistingAttachments(note.attachments || []);
    setNewFilesToUpload([]);
    setUploadProgressText(null);
    setIsCreatingCategory(false);
    setIsEditingSubject(false);
    setCustomSubject(note.title || "");
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
    setNewFilesToUpload((prev) => [...prev, ...indexMatches(index)]);
  };

  const indexMatches = (index: number) => {
    return newFilesToUpload.filter((_, i) => i !== index);
  };

  // Background Upload Process for note attachments
  const queueBackgroundUploads = (noteId: string, noteTitle: string, files: File[]) => {
    const jobs: BackgroundUploadJob[] = files.map((file) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      noteId,
      noteTitle,
      fileName: file.name,
      fileSize: file.size,
      progress: 20,
      status: "uploading",
    }));

    setBackgroundUploads((prev) => [...prev, ...jobs]);

    // Process each file concurrently in background
    jobs.forEach(async (job, idx) => {
      const file = files[idx];
      try {
        if (!supabase) throw new Error("Supabase client not initialized");

        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${noteId}/${Date.now()}_${cleanName}`;

        // Simulated progress ticker while uploading
        const progTimer = setInterval(() => {
          setBackgroundUploads((prev) =>
            prev.map((j) =>
              j.id === job.id && j.status === "uploading"
                ? { ...j, progress: Math.min(j.progress + 15, 85) }
                : j
            )
          );
        }, 300);

        const { error: uploadError } = await supabase.storage
          .from("note-attachments")
          .upload(storagePath, file, { cacheControl: "3600", upsert: true });

        clearInterval(progTimer);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("note-attachments")
          .getPublicUrl(storagePath);

        const newAttachment: NoteAttachment = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          url: data?.publicUrl || "",
          path: storagePath,
        };

        // 1. Immediately update note state and localStorage
        setNotes((prevNotes) => {
          const next = prevNotes.map((n) => {
            if (n.id === noteId) {
              const existingAtts = n.attachments || [];
              return { ...n, attachments: [...existingAtts, newAttachment] };
            }
            return n;
          });
          try {
            localStorage.setItem("ziptabs_app_notes", JSON.stringify(next));
          } catch {}
          return next;
        });

        // 2. Persist to Supabase database
        try {
          const { data: dbNote } = await supabase
            .from("app_notes")
            .select("attachments")
            .eq("id", noteId)
            .single();

          const currentAtts: NoteAttachment[] = dbNote?.attachments || [];
          await supabase
            .from("app_notes")
            .update({
              attachments: [...currentAtts, newAttachment],
              updated_at: new Date().toISOString(),
            })
            .eq("id", noteId);
        } catch (dbErr) {
          console.error("Failed to update note attachments in db:", dbErr);
        }

        // 3. Mark background upload as completed
        setBackgroundUploads((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, progress: 100, status: "completed" } : j))
        );

        // Auto remove completed job after 4 seconds
        setTimeout(() => {
          setBackgroundUploads((prev) => prev.filter((j) => j.id !== job.id));
        }, 4000);
      } catch (err: any) {
        console.error("Background upload failed for:", file.name, err);
        setBackgroundUploads((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "error", error: err?.message || "Upload failed" } : j
          )
        );
      }
    });
  };

  // Save note smoothly without delay; background upload handles attachments if present
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const contentTrimmed = formContent.trim();
    if (!contentTrimmed) return;

    const nowIso = new Date().toISOString();
    const noteId = editingNote ? editingNote.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    
    // Use user-customized subject if entered, or smartly extract 2-3 key words
    const finalSubject = customSubject.trim() || extractKeywordsSubject(contentTrimmed);

    const finalAttachments: NoteAttachment[] = [...existingAttachments];
    const pendingUploadFiles = [...newFilesToUpload];

    // Smooth & Instant: Close the modal immediately so user never has to wait!
    setIsModalOpen(false);
    setNewFilesToUpload([]);
    setUploadProgressText(null);

    if (editingNote) {
      // Update
      const updatedItem: NoteItem = {
        ...editingNote,
        title: finalSubject,
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
        supabase
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
          .eq("id", editingNote.id)
          .then(({ error }) => {
            if (error) console.error("Supabase update error:", error);
          });
      }

      showToast(
        "Note Updated",
        pendingUploadFiles.length > 0
          ? `"${finalSubject}" updated! Uploading ${pendingUploadFiles.length} file(s) in background...`
          : `"${finalSubject}" has been saved.`,
        "success"
      );
    } else {
      // Create
      const newItem: NoteItem = {
        id: noteId,
        user_id: "chief",
        title: finalSubject,
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
        supabase
          .from("app_notes")
          .insert([
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
          ])
          .then(({ error }) => {
            if (error) console.error("Supabase insert error:", error);
          });
      }

      showToast(
        "Note Created",
        pendingUploadFiles.length > 0
          ? `"${finalSubject}" created! Uploading ${pendingUploadFiles.length} file(s) in background...`
          : `"${finalSubject}" added under ${formCategory}.`,
        "success"
      );
    }

    // Trigger background upload if files are present
    if (pendingUploadFiles.length > 0) {
      queueBackgroundUploads(noteId, finalSubject, pendingUploadFiles);
    }
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

  // Live 2-3 keyword subject generated from content
  const liveSubjectPreview = extractKeywordsSubject(formContent);

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toast Notification */}
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
            Store documents, screenshots, and track deadlines with 2–3 keyword auto-subjects.
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
        {/* Filters Toolbar with Categories & Create Category Button */}
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

          {/* Category Filter Pills (Quick Notes at top) */}
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
            {allCategories.map((cat) => {
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
                ? "Type your note instructions or attach receipts/invoices. The subject automatically highlights 2–3 key words like 'Akash Premium $2965'."
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
              const catConfig = allCategories.find((c) => c.id === normalizedCat) || allCategories[0];
              const CatIcon = catConfig.icon || Tag;
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

                    {/* Note Title (2-3 Keyword Subject) */}
                    <h3
                      className={`text-sm font-black text-slate-900 leading-snug break-words tracking-tight ${
                        note.is_completed ? "line-through text-slate-500" : ""
                      }`}
                    >
                      {note.title || extractKeywordsSubject(note.content || "")}
                    </h3>

                    {/* Note Content / Full Details */}
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

                    {/* Background Uploading Indicator for this Note */}
                    {backgroundUploads.some((u) => u.noteId === note.id && u.status === "uploading") && (
                      <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                        <span className="truncate">Uploading attachment in background...</span>
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
              {/* Category & Target Date with '+ New Category' Creator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Category
                    </label>
                    {!isCreatingCategory ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCategory(true);
                          setNewCategoryName("");
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Category</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCreatingCategory(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {isCreatingCategory ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 px-3 py-2 bg-white border border-blue-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNewCategory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition-all font-medium"
                    >
                      {allCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
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

              {/* Note Details (Primary Input: Subject will auto-extract 2-3 key words) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Note Details *</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">
                    Subject focuses on 2–3 key words
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

                {/* Live 2-3 Keyword Subject Preview Pill with Quick Edit Button */}
                {formContent.trim() && (
                  <div className="mt-2 flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-blue-50/80 border border-blue-200/90 text-xs text-blue-900 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 shrink-0">
                        Subject:
                      </span>
                      {isEditingSubject ? (
                        <input
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-bold text-blue-950 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full max-w-sm"
                          placeholder="e.g. Akash Premium $2965"
                        />
                      ) : (
                        <span className="font-black text-blue-950 tracking-tight truncate">
                          {customSubject.trim() || liveSubjectPreview}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingSubject && !customSubject) {
                          setCustomSubject(liveSubjectPreview);
                        }
                        setIsEditingSubject(!isEditingSubject);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline shrink-0 ml-3 cursor-pointer"
                    >
                      {isEditingSubject ? "Done" : "Edit"}
                    </button>
                  </div>
                )}
              </div>

              {/* Documents & Images Upload Area (Drag-Drop + Paste Ctrl+V) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Documents & Images</span>
                  </label>
                  <span className="text-[10px] text-slate-400">PDF, Excel, Images (up to 50MB)</span>
                </div>

                {/* Upload Button Box */}
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
                    {existingAttachments.map((att) => {
                      const isImage = att.type.startsWith("image/");
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-3 group/item hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isImage ? (
                              <div
                                onClick={() => setPreviewImage({ url: att.url, name: att.name })}
                                className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shrink-0 cursor-pointer group/img hover:opacity-90 shadow-2xs"
                                title="Click to view full preview"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 truncate block max-w-xs">
                                {att.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {formatFileSize(att.size)}
                                </span>
                                <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  {isImage ? "Image" : "Document"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExistingAttachment(att.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Newly picked files awaiting upload (instant visual image preview) */}
                    {newFilesToUpload.map((file, idx) => {
                      const isImage = file.type.startsWith("image/");
                      const previewUrl = isImage ? URL.createObjectURL(file) : null;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-blue-50/70 border border-blue-200 text-xs gap-3 group/item hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isImage && previewUrl ? (
                              <div
                                onClick={() => setPreviewImage({ url: previewUrl, name: file.name })}
                                className="relative w-12 h-12 rounded-lg border border-blue-300 overflow-hidden bg-slate-900 shrink-0 cursor-pointer group/img hover:opacity-90 shadow-2xs"
                                title="Click to view full preview"
                              >
                                <img
                                  src={previewUrl}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <FileUp className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="font-bold text-blue-950 truncate block max-w-xs">
                                {file.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-blue-600 font-semibold">
                                  {formatFileSize(file.size)}
                                </span>
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  {isImage ? "Image Preview" : "Pending Document"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveNewFile(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Cancel upload"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
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

      {/* Delete Confirmation Modal */}
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

      {/* High-Res Image Lightbox Modal */}
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

      {/* Floating Bottom-Right Background Upload Progress Bar */}
      {backgroundUploads.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-[92%] sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#0c1427]/95 border border-[#1b2b4d] rounded-2xl shadow-2xl p-4 text-white backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                {backgroundUploads.some((u) => u.status === "uploading") ? (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Background Upload</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-semibold">
                      {backgroundUploads.filter((u) => u.status === "completed").length}/{backgroundUploads.length}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {backgroundUploads.some((u) => u.status === "uploading")
                      ? "Uploading attachments seamlessly in background..."
                      : "All attachments uploaded successfully!"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setIsUploadsMinimized(!isUploadsMinimized)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title={isUploadsMinimized ? "Expand" : "Minimize"}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUploadsMinimized ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setBackgroundUploads([])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of active upload jobs */}
            {!isUploadsMinimized && (
              <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {backgroundUploads.map((job) => (
                  <div key={job.id} className="bg-[#121c33] rounded-xl p-2.5 border border-[#1b2b4d] text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate max-w-[170px]" title={job.fileName}>
                          {job.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({formatFileSize(job.fileSize)})
                        </span>
                      </div>

                      {job.status === "uploading" && (
                        <span className="text-[10px] text-blue-400 font-bold shrink-0 flex items-center gap-1 font-mono">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{job.progress}%</span>
                        </span>
                      )}
                      {job.status === "completed" && (
                        <span className="text-[10px] text-emerald-400 font-bold shrink-0 flex items-center gap-1 font-mono">
                          <Check className="w-3 h-3" />
                          <span>Done</span>
                        </span>
                      )}
                      {job.status === "error" && (
                        <span className="text-[10px] text-rose-400 font-bold shrink-0">Failed</span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate mb-2">
                      Saved to note: <span className="text-slate-200 font-medium">"{job.noteTitle}"</span>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full bg-[#1b2b4d] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          job.status === "error"
                            ? "bg-rose-500"
                            : job.status === "completed"
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
