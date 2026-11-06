"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlaskConical,
  Sparkles,
  Upload,
  ImageIcon,
  Code,
  Eye,
  Copy,
  Check,
  RotateCcw,
  Columns,
  Smartphone,
  Tablet,
  Monitor,
  Zap,
  Cpu,
  Layers,
  Download,
  ArrowRight,
  SlidersHorizontal,
  X,
  Play,
  Loader2,
  HelpCircle,
  FileCode,
  SplitSquareVertical,
} from "lucide-react";

// Preset Sample Mockups (Base64 SVG graphics of ZipTabs widgets for 1-click testing)
const SAMPLE_PRESETS = [
  {
    id: "invoice-card",
    title: "Overdue Invoice Card",
    category: "Invoices",
    prompt:
      "Synthesize a compact overdue invoice card for ZipTabs. Include vendor name 'Dataquest Inc', consultant 'Anil N', invoice #29916, amount '$11,200.00', overdue pill '1141 Days Overdue', and 1-click 'Zoho Mail' and 'Verify' actions.",
    svg: `<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="20" y="24" width="8" height="32" rx="4" fill="#2563eb"/>
      <text x="36" y="42" font-family="sans-serif" font-weight="bold" font-size="16" fill="#0f172a">Dataquest Inc</text>
      <text x="36" y="58" font-family="sans-serif" font-size="12" fill="#64748b">Consultant: Anil N • INV #29916</text>
      <rect x="280" y="24" width="100" height="26" rx="13" fill="#fff1f2" stroke="#fecdd3" stroke-width="1"/>
      <text x="292" y="41" font-family="sans-serif" font-weight="bold" font-size="10" fill="#e11d48">1141 DAYS OVERDUE</text>
      <text x="20" y="112" font-family="sans-serif" font-size="12" fill="#64748b">Amount Outstanding</text>
      <text x="20" y="142" font-family="monospace" font-weight="bold" font-size="28" fill="#0f172a">$11,200.00</text>
      <line x1="20" y1="165" x2="380" y2="165" stroke="#f1f5f9" stroke-width="1.5"/>
      <rect x="20" y="178" width="110" height="28" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
      <text x="36" y="196" font-family="sans-serif" font-weight="600" font-size="11" fill="#334155">Zoho Clipboard</text>
      <rect x="280" y="178" width="100" height="28" rx="8" fill="#2563eb"/>
      <text x="306" y="196" font-family="sans-serif" font-weight="bold" font-size="11" fill="#ffffff">Verify →</text>
    </svg>`,
  },
  {
    id: "discount-gauge",
    title: "Prompt Discount Caliper",
    category: "Resources",
    prompt:
      "Synthesize a prompt settlement discount calculator card with a gross invoice input of $14,080.00, an interactive prompt discount slider set to 4.0% (-$563.20), net settlement due of $13,516.80, and a copy net amount button.",
    svg: `<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <text x="20" y="36" font-family="sans-serif" font-weight="bold" font-size="14" fill="#0f172a">Settlement Payable Breakdown</text>
      <rect x="290" y="20" width="90" height="22" rx="11" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
      <text x="302" y="35" font-family="sans-serif" font-weight="bold" font-size="9" fill="#059669">4.0% DISCOUNT</text>
      <text x="20" y="85" font-family="monospace" font-weight="900" font-size="32" fill="#2563eb">$13,516.80</text>
      <text x="20" y="105" font-family="sans-serif" font-size="11" fill="#64748b">Gross: $14,080.00 • Client Savings: -$563.20</text>
      <rect x="20" y="125" width="360" height="12" rx="6" fill="#f1f5f9"/>
      <rect x="20" y="125" width="144" height="12" rx="6" fill="#3b82f6"/>
      <circle cx="164" cy="131" r="9" fill="#ffffff" stroke="#2563eb" stroke-width="3"/>
      <rect x="20" y="165" width="360" height="38" rx="10" fill="#2563eb"/>
      <text x="135" y="189" font-family="sans-serif" font-weight="bold" font-size="12" fill="#ffffff">Copy Net Remittance ($13,516.80)</text>
    </svg>`,
  },
  {
    id: "vault-card",
    title: "Secure Portal Credential Card",
    category: "Logins",
    prompt:
      "Synthesize an AES-256 Vault login credential card for 'Artech Portal (SL)'. Display category badge, masked username '0000008132', masked password with peek icon, direct URL 'v88.artech.com', and a blue Launch button.",
    svg: `<svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="220" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="20" y="20" width="36" height="36" rx="10" fill="#3b82f6"/>
      <text x="31" y="44" font-family="sans-serif" font-weight="bold" font-size="18" fill="#ffffff">✦</text>
      <text x="68" y="36" font-family="sans-serif" font-weight="bold" font-size="15" fill="#0f172a">Artech Portal (SL)</text>
      <text x="68" y="52" font-family="sans-serif" font-size="11" fill="#64748b">v88.artech.com</text>
      <rect x="300" y="20" width="80" height="22" rx="11" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
      <text x="312" y="35" font-family="sans-serif" font-weight="bold" font-size="9" fill="#2563eb">AES-256 VAULT</text>
      <rect x="20" y="75" width="170" height="60" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <text x="32" y="95" font-family="sans-serif" font-weight="bold" font-size="10" fill="#94a3b8">USERNAME</text>
      <text x="32" y="120" font-family="monospace" font-weight="bold" font-size="13" fill="#0f172a">0000008132</text>
      <rect x="210" y="75" width="170" height="60" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <text x="222" y="95" font-family="sans-serif" font-weight="bold" font-size="10" fill="#94a3b8">PASSWORD</text>
      <text x="222" y="120" font-family="monospace" font-weight="bold" font-size="15" fill="#0f172a">••••••••••••</text>
      <rect x="20" y="155" width="100" height="36" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <text x="42" y="177" font-family="sans-serif" font-weight="600" font-size="11" fill="#475569">View Logs</text>
      <rect x="270" y="155" width="110" height="36" rx="10" fill="#2563eb"/>
      <text x="296" y="177" font-family="sans-serif" font-weight="bold" font-size="12" fill="#ffffff">Launch →</text>
    </svg>`,
  },
];

export function DesignLabView() {
  // Image & Mockup Input State
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>(
    "Convert this screenshot into an executive-grade React component using Tailwind CSS, responsive spacing, and smooth hover interactions matching ZipTabs."
  );
  const [selectedEngine, setSelectedEngine] = useState<"gemini" | "groq">("gemini");
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesisStep, setSynthesisStep] = useState<string>("");

  // Output & Code State
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "split">("preview");
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Quick Tweak (Groq LPU)
  const [tweakPrompt, setTweakPrompt] = useState<string>("");
  const [isTweaking, setIsTweaking] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Clipboard Paste Listener (Ctrl+V anywhere to paste screenshot)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              setImageBase64(base64);
              setImageName(`pasted-screenshot-${Date.now().toString().slice(-4)}.png`);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Helper to extract clean JSX and Preview HTML from LLM output
  const processGeneratedOutput = (rawOutput: string) => {
    let cleanCode = rawOutput.trim();
    const match = cleanCode.match(/```(?:tsx|jsx|html|javascript)?([\s\S]*?)```/);
    if (match && match[1]) {
      cleanCode = match[1].trim();
    }

    // Prepare preview HTML
    let htmlSnippet = cleanCode;
    const returnMatch = cleanCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*}/);
    if (returnMatch && returnMatch[1]) {
      htmlSnippet = returnMatch[1].trim();
    }

    // Convert React JSX attributes to standard HTML for the iframe
    htmlSnippet = htmlSnippet
      .replace(/className=/g, "class=")
      .replace(/onClick=\{[^}]*\}/g, "")
      .replace(/onChange=\{[^}]*\}/g, "")
      .replace(/\{['"]([^'"]+)['"]\}/g, '"$1"')
      .replace(/\{(\d+)\}/g, '"$1"');

    setGeneratedCode(cleanCode);
    setPreviewHtml(htmlSnippet);
  };

  // Synthesize Code from Mockup via API
  const handleSynthesize = async () => {
    if (!imageBase64 && !promptText.trim()) return;

    setIsSynthesizing(true);
    setSynthesisStep("Analyzing visual geometry & color tokens with Gemini 2.5...");

    try {
      const systemPrompt = `You are an elite Senior UI/UX Frontend Engineer specializing in Next.js 16, React 19, and modern Tailwind CSS.
Your mission: Inspect the provided UI screenshot/mockup with surgical precision and write a self-contained, pixel-perfect React functional component.
Guidelines:
1. Replicate all visual elements: exact typography weights, paddings, rounded corners, subtle shadows, status pills, and borders.
2. Use modern Tailwind utility classes exclusively (e.g. bg-white, rounded-2xl, border-slate-200, text-slate-900, shadow-xs).
3. Ensure all icons and buttons have accessible hover/active states.
4. Output the complete, fully valid React component code enclosed in a \`\`\`tsx codeblock. No explanations or conversational text.`;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedEngine,
          model: selectedEngine === "gemini" ? "gemini-2.5-flash" : "qwen/qwen3.8-27b",
          prompt: promptText,
          systemPrompt,
          imageBase64: imageBase64 || undefined,
          mimeType: "image/png",
          maxTokens: 4096,
        }),
      });

      const data = await res.json();
      if (data.success && data.text) {
        setLatencyMs(data.latencyMs);
        processGeneratedOutput(data.text);
      } else {
        alert(data.error || "Failed to synthesize component from mockup.");
      }
    } catch (err: any) {
      console.error("Synthesize error:", err);
      alert(err.message || "Network error while synthesizing code.");
    } finally {
      setIsSynthesizing(false);
      setSynthesisStep("");
    }
  };

  // Quick Tweak with Groq LPU (<200ms iteration)
  const handleQuickTweak = async () => {
    if (!tweakPrompt.trim() || !generatedCode) return;

    setIsTweaking(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "groq",
          model: "qwen/qwen3.8-27b",
          systemPrompt:
            "You are a lightning-fast React Tailwind refactoring specialist. Modify the provided code based on user instruction. Return ONLY the modified React component in a ```tsx block.",
          prompt: `Current Component Code:\n${generatedCode}\n\nModification Request:\n${tweakPrompt}`,
          maxTokens: 4096,
        }),
      });

      const data = await res.json();
      if (data.success && data.text) {
        setLatencyMs(data.latencyMs);
        processGeneratedOutput(data.text);
        setTweakPrompt("");
      } else {
        alert(data.error || "Failed to apply quick tweak.");
      }
    } catch (err: any) {
      console.error("Quick tweak error:", err);
      alert(err.message || "Failed to reach Groq engine.");
    } finally {
      setIsTweaking(false);
    }
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    const base64Svg = `data:image/svg+xml;base64,${btoa(preset.svg)}`;
    setImageBase64(base64Svg);
    setImageName(`${preset.id}.svg`);
    setPromptText(preset.prompt);
  };

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageBase64(event.target?.result as string);
        setImageName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy JSX Code
  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download TSX file
  const handleDownloadCode = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SynthesizedComponent.tsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Construct Safe Sandboxed Iframe Document
  const buildIframeHtml = useCallback(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: transparent; }
    * { box-sizing: border-box; }
  </style>
</head>
<body class="p-6 flex items-center justify-center min-h-screen">
  ${previewHtml || '<div class="text-slate-400 text-sm">No preview content available</div>'}
</body>
</html>`;
  }, [previewHtml]);

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Design Lab
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                Mockup-to-Code Sandbox
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Transform UI screenshots, sketches, or wireframes into production React + Tailwind code using Gemini Vision.
            </p>
          </div>
        </div>

        {/* Engine Status Indicators */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Gemini 2.5 Vision</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Groq LPU Instant Refiner</span>
          </span>
          {imageBase64 && (
            <button
              onClick={() => {
                setImageBase64(null);
                setImageName(null);
                setGeneratedCode("");
                setPreviewHtml("");
                setLatencyMs(null);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
              title="Clear current mockup and code"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE GRID: INPUT STUDIO vs OUTPUT SANDBOX */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: MOCKUP INPUT & PROMPT STUDIO (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* UPLOAD / CLIPBOARD PASTE CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">1. Target Mockup / Screenshot</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
                Ctrl + V to Paste
              </span>
            </div>

            {/* Drag & Drop / Preview Box */}
            {imageBase64 ? (
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 group">
                <div className="max-h-56 overflow-auto rounded-lg flex items-center justify-center bg-slate-100/60 p-2">
                  <img
                    src={imageBase64}
                    alt="Mockup target"
                    className="max-h-52 object-contain rounded shadow-2xs border border-slate-200/60 select-none"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between px-1 text-xs">
                  <span className="font-mono text-slate-600 truncate max-w-[200px]" title={imageName || ""}>
                    {imageName || "pasted-image.png"}
                  </span>
                  <button
                    onClick={() => {
                      setImageBase64(null);
                      setImageName(null);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 stroke-[2]" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Drop screenshot here or <span className="text-blue-600 underline">browse</span>
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Tip: Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">Win+Shift+S</kbd> then press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">Ctrl+V</kbd> anywhere!
                </p>
              </div>
            )}

            {/* Quick Preset Samples */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Or Try Sample ZipTabs Widgets:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className="p-2 text-left rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {p.category}
                    </div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate mt-0.5">
                      {p.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CUSTOM DIRECTIVES & SYNTHESIZE TRIGGER */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">2. Synthesis Directives</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setSelectedEngine("gemini")}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                    selectedEngine === "gemini"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Gemini Vision
                </button>
                <button
                  onClick={() => setSelectedEngine("groq")}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                    selectedEngine === "groq"
                      ? "bg-white text-amber-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Groq LPU
                </button>
              </div>
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Describe any specific styling instructions, colors, or component behavior..."
              rows={3}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 leading-relaxed font-sans"
            />

            {/* Quick Directive Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "ZipTabs Executive Theme",
                "Add Hover Transitions",
                "Mobile Responsive Grid",
                "Lucide React Icons",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() =>
                    setPromptText((prev) =>
                      prev.includes(chip) ? prev : `${prev} Include ${chip}.`
                    )
                  }
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Synthesize Button */}
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || (!imageBase64 && !promptText.trim())}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing React Component...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Synthesize Code from Mockup</span>
                </>
              )}
            </button>

            {synthesisStep && (
              <p className="text-[11px] text-center font-medium text-blue-600 animate-pulse">
                {synthesisStep}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: OUTPUT STUDIO & INTERACTIVE PLAYGROUND (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          {/* Output Toolbar & Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === "preview"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Preview</span>
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === "code"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                <span>React JSX Code</span>
              </button>
              <button
                onClick={() => setActiveTab("split")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === "split"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Columns className="w-3.5 h-3.5 text-emerald-600" />
                <span>Side-by-Side</span>
              </button>
            </div>

            {/* Viewport & Benchmark Info */}
            <div className="flex items-center gap-2">
              {latencyMs && (
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  ⚡ {latencyMs}ms
                </span>
              )}

              {/* Viewport Switcher (Preview Mode Only) */}
              {activeTab === "preview" && (
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-slate-600">
                  <button
                    onClick={() => setViewportMode("desktop")}
                    className={`p-1 rounded cursor-pointer ${
                      viewportMode === "desktop" ? "bg-white text-blue-600 shadow-2xs" : ""
                    }`}
                    title="Desktop View (100%)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewportMode("tablet")}
                    className={`p-1 rounded cursor-pointer ${
                      viewportMode === "tablet" ? "bg-white text-blue-600 shadow-2xs" : ""
                    }`}
                    title="Tablet View (640px)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewportMode("mobile")}
                    className={`p-1 rounded cursor-pointer ${
                      viewportMode === "mobile" ? "bg-white text-blue-600 shadow-2xs" : ""
                    }`}
                    title="Mobile View (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Code Actions */}
              {generatedCode && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                    title="Copy React JSX"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                    title="Download .tsx component"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MAIN PREVIEW / CODE DISPLAY AREA */}
          <div className="min-h-[440px] rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-center items-center overflow-hidden">
            {!generatedCode && !isSynthesizing ? (
              <div className="text-center p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                  <FileCode className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Sandbox Ready</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Upload or paste a screenshot on the left (or pick a sample preset), then click{" "}
                  <strong>Synthesize Code</strong> to preview and test the interactive component here.
                </p>
              </div>
            ) : isSynthesizing ? (
              <div className="text-center p-8 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">Gemini Vision is Processing</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Reconstructing UI geometry, spacing tokens, and Tailwind classes from image...
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex-1 flex flex-col">
                {/* 1. LIVE PREVIEW MODE */}
                {activeTab === "preview" && (
                  <div className="w-full flex-1 flex items-center justify-center p-4 bg-slate-100/50">
                    <div
                      className={`transition-all duration-300 w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white ${
                        viewportMode === "mobile"
                          ? "max-w-[375px]"
                          : viewportMode === "tablet"
                          ? "max-w-[640px]"
                          : "max-w-full"
                      }`}
                    >
                      <iframe
                        title="Live Component Sandbox"
                        srcDoc={buildIframeHtml()}
                        sandbox="allow-scripts"
                        className="w-full h-full min-h-[420px] border-none"
                      />
                    </div>
                  </div>
                )}

                {/* 2. REACT JSX CODE MODE */}
                {activeTab === "code" && (
                  <div className="w-full flex-1 p-4">
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed overflow-auto max-h-[440px] select-all shadow-inner">
                      <code>{generatedCode}</code>
                    </pre>
                  </div>
                )}

                {/* 3. SIDE-BY-SIDE COMPARISON MODE */}
                {activeTab === "split" && (
                  <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 p-2">
                    <div className="p-3 flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Original Mockup:
                      </span>
                      {imageBase64 ? (
                        <div className="flex-1 flex items-center justify-center bg-slate-100 rounded-lg p-2 max-h-[380px] overflow-auto">
                          <img
                            src={imageBase64}
                            alt="Original mockup"
                            className="max-h-[340px] object-contain rounded shadow-2xs"
                          />
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">
                          No mockup image uploaded
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Synthesized Live Component:
                      </span>
                      <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 min-h-[340px]">
                        <iframe
                          title="Split View Preview"
                          srcDoc={buildIframeHtml()}
                          sandbox="allow-scripts"
                          className="w-full h-full min-h-[340px] border-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QUICK TWEAK WITH GROQ LPU (<200ms) */}
          {generatedCode && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Instant Tweak with Groq LPU</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">~180ms response time</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tweakPrompt}
                  onChange={(e) => setTweakPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickTweak();
                  }}
                  placeholder="e.g. 'Make the badge emerald', 'Add a search box', 'Reduce padding'..."
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                />
                <button
                  onClick={handleQuickTweak}
                  disabled={isTweaking || !tweakPrompt.trim()}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isTweaking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Apply Tweak</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
