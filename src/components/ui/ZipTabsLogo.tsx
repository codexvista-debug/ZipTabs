import React from "react";

interface ZipTabsLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function ZipTabsLogo({
  size = "md",
  showText = true,
  className = "",
}: ZipTabsLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Sleek Black & Charcoal Gray Logo Squircle */}
      <div
        className={`${iconSizes[size]} shrink-0 relative rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/80 flex items-center justify-center shadow-md shadow-black/40 overflow-hidden`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
        >
          {/* Back tab (muted gray) */}
          <path
            d="M7 11C7 9.89543 7.89543 9 9 9H15L18 12H23C24.1046 12 25 12.8954 25 14V20C25 21.1046 24.1046 22 23 22H9C7.89543 22 7 21.1046 7 20V11Z"
            fill="#71717A"
            fillOpacity="0.5"
          />
          {/* Front tab (silver / white) */}
          <path
            d="M9 13C9 11.8954 9.89543 11 11 11H17L20 14H24C25.1046 14 26 14.8954 26 16V22C26 23.1046 25.1046 24 24 24H11C9.89543 24 9 23.1046 9 22V13Z"
            fill="#F4F4F5"
          />
          {/* Lightning / Fast "Z" notch (dark graphite) */}
          <path
            d="M19 14.5L14 18.5H17.5L15 22.5L20 18.5H16.8L19 14.5Z"
            fill="#18181B"
          />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-black tracking-tight text-white ${textSizes[size]}`}
        >
          ZipTabs
        </span>
      )}
    </div>
  );
}
