"use client";

import React, { useState, useEffect } from "react";
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
  Filter,
} from "lucide-react";

export interface NoteItem {
  id: string;
  user_id?: string;
  title: string;
  content?: string;
  category: "Invoices Related" | "Payroll Related" | "Quick Notes" | "Tax & Compliance" | "Other" | string;
  target_date?: string | null; // YYYY-MM-DD
  priority?: "normal" | "high" | "urgent";
  is_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

const CATEGORIES = [
  { id: "Invoices Related", label: "Invoices Related", color: "text-blue-700 bg-blue-50 border-blue-200", icon: FileSpreadsheet },
  { id: "Payroll Related", label: "Payroll Related", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: DollarSign },
  { id: "Quick Notes", label: "Quick Notes", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Zap },
  { id: "Tax & Compliance", label: "Tax & Compliance", color: "text-purple-700 bg-purple-50 border-purple-200", icon: ShieldCheck },
  { id: "Other", label: "Other", color: "text-slate-700 bg-slate-100 border-slate-200", icon: Tag },
];

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

  // Parse YYYY-MM-DD
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

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("Invoices Related");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formPriority, setFormPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

    // LocalStorage fallback
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

  // Save notes helper
  const saveNotesList = (updated: NoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem("ziptabs_app_notes", JSON.stringify(updated));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("Invoices Related");
    setFormTargetDate(new Date().toISOString().slice(0, 10)); // Default to today
    setFormPriority("normal");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (note: NoteItem) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content || "");
    setFormCategory(note.category || "Invoices Related");
    setFormTargetDate(note.target_date || "");
    setFormPriority(note.priority || "normal");
    setIsModalOpen(true);
  };

  // Save note (Insert or Update)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSaving(true);
    const nowIso = new Date().toISOString();

    if (editingNote) {
      // Update
      const updatedItem: NoteItem = {
        ...editingNote,
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        target_date: formTargetDate || null,
        priority: formPriority,
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
              updated_at: nowIso,
            })
            .eq("id", editingNote.id);
        } catch (err) {
          console.error("Supabase update error:", err);
        }
      }

      showToast("✓ Note updated successfully!");
    } else {
      // Create
      const newItem: NoteItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        user_id: "chief",
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        target_date: formTargetDate || null,
        priority: formPriority,
        is_completed: false,
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
            },
          ]);
        } catch (err) {
          console.error("Supabase insert error:", err);
        }
      }

      showToast("✓ Note created successfully!");
    }

    setIsSaving(false);
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

    showToast(nextStatus ? "✓ Note marked completed" : "✓ Note reopened");
  };

  // Delete Note
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    const updatedList = notes.filter((n) => n.id !== id);
    saveNotesList(updatedList);

    if (supabase) {
      try {
        await supabase.from("app_notes").delete().eq("id", id);
      } catch (err) {
        console.error("Supabase delete error:", err);
      }
    }

    showToast("✓ Note deleted");
  };

  // Copy Note content
  const handleCopyNote = (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${note.title}\n${note.category ? `[${note.category}] ` : ""}${note.target_date ? `Due: ${note.target_date}\n` : ""}\n${note.content || ""}`;
    navigator.clipboard.writeText(text);
    showToast("✓ Note copied to clipboard");
  };

  // Filtered & Sorted Notes
  const filteredNotes = notes
    .filter((note) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        note.title.toLowerCase().includes(q) ||
        (note.content && note.content.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Category
      if (activeCategory !== "all" && note.category !== activeCategory) {
        return false;
      }

      // Urgency filter
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
      // Completed go to the bottom
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }

      // Sort by urgency of target date (overdue and today first)
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
  const invoiceNotesCount = notes.filter((n) => n.category === "Invoices Related").length;
  const payrollNotesCount = notes.filter((n) => n.category === "Payroll Related").length;
  const completedCount = notes.filter((n) => n.is_completed).length;

  return (
    <div className="space-y-6 relative pb-16">
      {/* Top Floating Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-3 px-5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
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
            Organize invoice notes, payroll reminders, and operational deadlines with automated date highlighting.
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
            {completedCount} marked completed
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
            <span className={urgentCount > 0 ? "text-amber-800" : "text-slate-400"}>Due Soon / Urgent</span>
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
          onClick={() => setActiveCategory(activeCategory === "Invoices Related" ? "all" : "Invoices Related")}
          className="cursor-pointer bg-white hover:border-blue-300 rounded-xl p-5 border border-slate-200/80 shadow-xs transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Invoices Notes</span>
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
          onClick={() => setActiveCategory(activeCategory === "Payroll Related" ? "all" : "Payroll Related")}
          className="cursor-pointer bg-white hover:border-emerald-300 rounded-xl p-5 border border-slate-200/80 shadow-xs transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Payroll Notes</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
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
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or reminders..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>

          {/* Category Pills */}
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
              const count = notes.filter((n) => n.category === cat.id).length;
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
            <span className="text-xs font-semibold">Loading notes & reminders...</span>
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
                ? "Create categorized notes for invoice follow-ups, payroll deadlines, and important reminders with date-based highlighting."
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
              const catConfig = CATEGORIES.find((c) => c.id === note.category) || CATEGORIES[4];
              const CatIcon = catConfig.icon;

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
                        <span>{note.category}</span>
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

                    {/* Note Title */}
                    <h3
                      className={`text-sm font-bold text-slate-900 leading-snug break-words ${
                        note.is_completed ? "line-through text-slate-500" : ""
                      }`}
                    >
                      {note.title}
                    </h3>

                    {/* Note Content / Memo */}
                    {note.content && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-4 leading-relaxed whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
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
                        onClick={(e) => handleDeleteNote(note.id, e)}
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
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingNote ? "Edit Note / Reminder" : "New Note / Reminder"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Follow up on SecureIt invoice #32219"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-medium"
                />
              </div>

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

              {/* Content / Memo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Details / Instructions (Optional)
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Add notes, client contact info, payment terms, or email draft details..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all font-medium resize-none leading-relaxed"
                />
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
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingNote ? "Save Changes" : "Create Note"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
