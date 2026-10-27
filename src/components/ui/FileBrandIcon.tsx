"use client";

import React from "react";

export interface FileBrandIconProps {
  fileName: string;
  mimeType?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function getFileCategory(fileName: string, mimeType?: string): "excel" | "word" | "powerpoint" | "pdf" | "image" | "archive" | "video" | "audio" | "code" | "text" | "generic" {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mime = (mimeType || "").toLowerCase();

  if (
    ["xlsx", "xls", "csv", "tsv", "xlsm", "xlsb"].includes(ext) ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv"
  ) {
    return "excel";
  }

  if (
    ["doc", "docx", "dot", "dotx", "rtf"].includes(ext) ||
    mime.includes("wordprocessingml") ||
    mime.includes("msword")
  ) {
    return "word";
  }

  if (
    ["ppt", "pptx", "pot", "potx", "pps"].includes(ext) ||
    mime.includes("presentationml") ||
    mime.includes("powerpoint")
  ) {
    return "powerpoint";
  }

  if (ext === "pdf" || mime === "application/pdf") {
    return "pdf";
  }

  if (
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(ext) ||
    mime.startsWith("image/")
  ) {
    return "image";
  }

  if (
    ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("archive")
  ) {
    return "archive";
  }

  if (
    ["mp4", "mov", "avi", "mkv", "webm", "wmv", "m4v"].includes(ext) ||
    mime.startsWith("video/")
  ) {
    return "video";
  }

  if (
    ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext) ||
    mime.startsWith("audio/")
  ) {
    return "audio";
  }

  if (
    ["json", "js", "ts", "tsx", "jsx", "html", "css", "py", "sql", "sh", "yml", "yaml", "xml"].includes(ext) ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript")
  ) {
    return "code";
  }

  if (["txt", "md", "log"].includes(ext) || mime.startsWith("text/")) {
    return "text";
  }

  return "generic";
}

export function FileBrandIcon({
  fileName,
  mimeType,
  size = "md",
  className = "",
}: FileBrandIconProps) {
  const category = getFileCategory(fileName, mimeType);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  }[size];

  // Microsoft Excel Official Brand Icon
  if (category === "excel") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        {/* Shadow filter */}
        <defs>
          <filter id="excel-shadow" x="0" y="8" width="40" height="42" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0A361D" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Back Sheet with Grid */}
        <rect x="18" y="6" width="38" height="52" rx="4.5" fill="#107C41" />
        <rect x="22" y="10" width="30" height="44" rx="2.5" fill="#185C37" opacity="0.4" />

        {/* Table Rows & Columns */}
        <rect x="25" y="15" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />
        <rect x="38" y="15" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />

        <rect x="25" y="23" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />
        <rect x="38" y="23" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />

        <rect x="25" y="31" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />
        <rect x="38" y="31" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />

        <rect x="25" y="39" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />
        <rect x="38" y="39" width="10" height="5" rx="1" fill="#E1DFDD" opacity="0.9" />

        <rect x="25" y="47" width="10" height="4" rx="1" fill="#E1DFDD" opacity="0.9" />
        <rect x="38" y="47" width="10" height="4" rx="1" fill="#E1DFDD" opacity="0.9" />

        {/* Front Elevated 3D Tile with 'X' */}
        <g filter="url(#excel-shadow)">
          <rect x="6" y="14" width="30" height="30" rx="5" fill="#21A366" />
          <path
            d="M15 21H18.8L21 26.2L23.3 21H27L23.2 28.9L27.2 37H23.4L21 31.6L18.6 37H14.8L18.8 28.9L15 21Z"
            fill="white"
          />
        </g>
      </svg>
    );
  }

  // Microsoft Word Official Brand Icon
  if (category === "word") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <defs>
          <filter id="word-shadow" x="0" y="8" width="40" height="42" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0C2D64" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Back Sheet with Text Lines */}
        <rect x="18" y="6" width="38" height="52" rx="4.5" fill="#185ABD" />
        <rect x="22" y="10" width="30" height="44" rx="2.5" fill="#103F91" opacity="0.3" />

        {/* Document Text Lines */}
        <rect x="26" y="16" width="22" height="3.5" rx="1.5" fill="#E1DFDD" opacity="0.95" />
        <rect x="26" y="23" width="22" height="3.5" rx="1.5" fill="#E1DFDD" opacity="0.95" />
        <rect x="26" y="30" width="22" height="3.5" rx="1.5" fill="#E1DFDD" opacity="0.95" />
        <rect x="26" y="37" width="22" height="3.5" rx="1.5" fill="#E1DFDD" opacity="0.95" />
        <rect x="26" y="44" width="14" height="3.5" rx="1.5" fill="#E1DFDD" opacity="0.95" />

        {/* Front Elevated 3D Tile with 'W' */}
        <g filter="url(#word-shadow)">
          <rect x="6" y="14" width="30" height="30" rx="5" fill="#2B7CD3" />
          <path
            d="M12.5 21H15.6L18 31.5L20.5 21H22.7L25.2 31.5L27.6 21H30.7L26.7 37H24L21.6 27.5L19.2 37H16.5L12.5 21Z"
            fill="white"
          />
        </g>
      </svg>
    );
  }

  // Microsoft PowerPoint Official Brand Icon
  if (category === "powerpoint") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <defs>
          <filter id="ppt-shadow" x="0" y="8" width="40" height="42" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#5C1B0B" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Back Sheet with Pie Chart */}
        <rect x="18" y="6" width="38" height="52" rx="4.5" fill="#C43E1C" />
        <circle cx="37" cy="32" r="10" fill="#E1DFDD" opacity="0.9" />
        <path d="M37 22A10 10 0 0 1 47 32H37V22Z" fill="#F37F58" />

        {/* Front Elevated Tile with 'P' */}
        <g filter="url(#ppt-shadow)">
          <rect x="6" y="14" width="30" height="30" rx="5" fill="#D24726" />
          <path
            d="M15 21H22.5C25.5 21 27.5 22.8 27.5 25.8C27.5 28.8 25.5 30.6 22.5 30.6H18.8V37H15V21ZM18.8 27.2H22.2C23.6 27.2 24.3 26.5 24.3 25.8C24.3 25.1 23.6 24.4 22.2 24.4H18.8V27.2Z"
            fill="white"
          />
        </g>
      </svg>
    );
  }

  // Adobe Acrobat PDF Official Brand Icon
  if (category === "pdf") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        {/* Document Sheet */}
        <rect x="10" y="5" width="44" height="54" rx="6" fill="#E5252A" />

        {/* Fold corner effect top right */}
        <path d="M42 5L54 17H46C43.8 17 42 15.2 42 13V5Z" fill="#B71C1C" opacity="0.6" />
        <path d="M42 5L54 17H44C42.9 17 42 16.1 42 15V5Z" fill="#FF8A80" opacity="0.5" />

        {/* Iconic Adobe Acrobat Wave Ribbon */}
        <path
          d="M38.5 34C40.6 34 42.8 34.4 44.5 35C45.2 35.3 45.8 35.8 45.8 36.6C45.8 38 44 39.5 41.8 39.5C38.8 39.5 35.2 37.2 32.2 34.5C29.6 38.4 26.5 42 23 43.6C21.2 44.4 19.2 44.8 17.8 44.2C16.8 43.6 16.2 42.4 16.8 41C17.6 39 20.8 37.6 25.5 36.6C28 31.4 30.2 25.8 31.2 21C30.2 18 29.8 15.2 30.6 13.6C31.2 12.5 32.2 12 33.2 12.2C34.5 12.8 35 14.8 34.5 18C33.8 22.2 32 28.2 29.8 33.4C32.8 33.8 35.8 34 38.5 34ZM21.2 40.8C23.4 39.8 25.8 37.4 28 34.2C23.8 35.2 20.5 36.8 20 38.6C19.6 39.8 20.2 40.8 21.2 40.8ZM32.5 15.5C32.2 16.8 32.5 18.8 33.2 21.2C33.8 19.2 33.8 17 33.2 15.8C33 15.5 32.6 15.5 32.5 15.5ZM37 32C35.2 32 33.5 31.8 31.8 31.4C33 28.2 34.2 24.2 35.2 20.5C36.5 25 39.8 29.8 42.8 32C41 31.8 39 32 37 32Z"
          fill="white"
        />

        {/* White bottom banner with bold "PDF" text */}
        <rect x="18" y="47" width="28" height="8.5" rx="2.5" fill="white" />
        <text
          x="32"
          y="54"
          fill="#E5252A"
          fontSize="7"
          fontWeight="900"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.5"
        >
          PDF
        </text>
      </svg>
    );
  }

  // ZIP / Archive Official Brand Icon
  if (category === "archive") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        {/* Folder Base */}
        <rect x="8" y="10" width="48" height="46" rx="5" fill="#D97706" />
        <path d="M8 15C8 12.2 10.2 10 13 10H25L29 16H51C53.8 16 56 18.2 56 21V51C56 53.8 53.8 56 51 56H13C10.2 56 8 53.8 8 51V15Z" fill="#F59E0B" />

        {/* Zipper strip down the center */}
        <rect x="29" y="16" width="6" height="38" fill="#475569" rx="1" />
        {/* Zipper teeth */}
        <rect x="29" y="19" width="3" height="2" fill="#E2E8F0" />
        <rect x="32" y="22" width="3" height="2" fill="#E2E8F0" />
        <rect x="29" y="25" width="3" height="2" fill="#E2E8F0" />
        <rect x="32" y="28" width="3" height="2" fill="#E2E8F0" />
        <rect x="29" y="31" width="3" height="2" fill="#E2E8F0" />
        <rect x="32" y="34" width="3" height="2" fill="#E2E8F0" />
        <rect x="29" y="37" width="3" height="2" fill="#E2E8F0" />
        {/* Zipper Pull Slider */}
        <rect x="27.5" y="41" width="9" height="11" rx="2" fill="#94A3B8" stroke="#334155" strokeWidth="1" />
        <circle cx="32" cy="46" r="2" fill="#475569" />
      </svg>
    );
  }

  // Image File Icon
  if (category === "image") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <defs>
          <linearGradient id="img-grad" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="7" fill="url(#img-grad)" />
        {/* Sun */}
        <circle cx="23" cy="23" r="5" fill="#FDE047" />
        {/* Mountains */}
        <path d="M12 48L24 32L32 42L41 29L52 48H12Z" fill="#DDD6FE" opacity="0.9" />
        <path d="M22 48L32 36L44 48H22Z" fill="#FFFFFF" opacity="0.75" />
      </svg>
    );
  }

  // Code / Script File Icon
  if (category === "code") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <rect x="10" y="6" width="44" height="52" rx="6" fill="#0F172A" />
        <path d="M38 6L54 22H42C39.8 22 38 20.2 38 18V6Z" fill="#334155" />
        {/* Code Brackets < / > */}
        <path d="M22 26L16 32L22 38" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 26L48 32L42 38" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 24L30 40" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  // Audio File Icon
  if (category === "audio") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <rect x="10" y="6" width="44" height="52" rx="6" fill="#7C3AED" />
        <circle cx="25" cy="40" r="5" fill="white" />
        <circle cx="39" cy="35" r="5" fill="white" />
        <path d="M30 40V22L44 17V35" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 24L44 19" stroke="white" strokeWidth="3" />
      </svg>
    );
  }

  // Video File Icon
  if (category === "video") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <rect x="8" y="10" width="48" height="44" rx="6" fill="#E11D48" />
        {/* Film Strip Holes */}
        <rect x="12" y="14" width="5" height="4" rx="1" fill="white" opacity="0.7" />
        <rect x="23" y="14" width="5" height="4" rx="1" fill="white" opacity="0.7" />
        <rect x="36" y="14" width="5" height="4" rx="1" fill="white" opacity="0.7" />
        <rect x="47" y="14" width="5" height="4" rx="1" fill="white" opacity="0.7" />

        <rect x="12" y="46" width="5" height="4" rx="1" fill="white" opacity="0.7" />
        <rect x="23" y="46" width="5" height="4" rx="1" fill="white" opacity="0.7" />
        <rect x="36" y="46" width="5" height="4" rx="1" fill="white" opacity="0.7" />
        <rect x="47" y="46" width="5" height="4" rx="1" fill="white" opacity="0.7" />

        {/* Play Triangle */}
        <path d="M28 24L40 32L28 40V24Z" fill="white" />
      </svg>
    );
  }

  // Text Document Icon
  if (category === "text") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
      >
        <rect x="12" y="6" width="40" height="52" rx="5" fill="#64748B" />
        <path d="M38 6L52 20H42C39.8 20 38 18.2 38 16V6Z" fill="#475569" />
        <rect x="20" y="24" width="24" height="3" rx="1.5" fill="#F1F5F9" />
        <rect x="20" y="31" width="24" height="3" rx="1.5" fill="#F1F5F9" />
        <rect x="20" y="38" width="24" height="3" rx="1.5" fill="#F1F5F9" />
        <rect x="20" y="45" width="16" height="3" rx="1.5" fill="#F1F5F9" />
      </svg>
    );
  }

  // Default / Generic File Icon
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClasses} ${className} shrink-0 drop-shadow-sm select-none`}
    >
      <rect x="12" y="6" width="40" height="52" rx="5" fill="#94A3B8" />
      <path d="M38 6L52 20H42C39.8 20 38 18.2 38 16V6Z" fill="#64748B" />
      <rect x="20" y="26" width="24" height="3.5" rx="1.75" fill="#F8FAFC" />
      <rect x="20" y="34" width="24" height="3.5" rx="1.75" fill="#F8FAFC" />
      <rect x="20" y="42" width="14" height="3.5" rx="1.75" fill="#F8FAFC" />
    </svg>
  );
}
