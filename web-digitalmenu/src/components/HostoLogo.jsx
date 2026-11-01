import React from "react";

export default function HostoLogo({ 
  size = "md", 
  variant = "full", // "full", "icon", "light" (for dark backgrounds)
  className = "" 
}) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20"
  };

  const titleSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-4xl"
  };

  const subSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-sm"
  };

  const isLight = variant === "light";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem SVG Icon */}
      <div className={`relative ${iconSizes[size] || iconSizes.md} rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center p-2 shadow-md shadow-amber-500/25 flex-shrink-0 group`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-slate-950"
        >
          {/* Gourmet Cloche Dome */}
          <path
            d="M8 32C8 23.1634 15.1634 16 24 16C32.8366 16 40 23.1634 40 32H8Z"
            fill="currentColor"
            opacity="0.95"
          />
          {/* Cloche Handle Knob */}
          <circle cx="24" cy="13" r="3" fill="currentColor" />
          {/* Platter Base */}
          <rect x="6" y="34" width="36" height="3.5" rx="1.75" fill="currentColor" />
          
          {/* Digital QR Scan Accent Dots inside Cloche */}
          <rect x="18" y="22" width="3" height="3" rx="0.5" fill="#ffffff" />
          <rect x="23" y="22" width="3" height="3" rx="0.5" fill="#ffffff" />
          <rect x="28" y="22" width="3" height="3" rx="0.5" fill="#ffffff" />
          <rect x="20.5" y="27" width="7" height="2" rx="0.5" fill="#ffffff" />
          
          {/* Fresh garnish / sprout spark accent on top right */}
          <circle cx="34" cy="12" r="2" fill="#10b981" />
        </svg>

        {/* Ambient Ring */}
        <div className="absolute inset-0 rounded-2xl border border-white/30 pointer-events-none" />
      </div>

      {/* Typography (if variant != 'icon') */}
      {variant !== "icon" && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center tracking-tight font-black">
            <span className={`${titleSizes[size] || titleSizes.md} ${isLight ? "text-white" : "text-slate-900"} tracking-tight`}>
              Hosto
            </span>
            <span className={`${titleSizes[size] || titleSizes.md} text-amber-500 ml-1.5 font-black`}>
              eMenu
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1 self-start mt-1.5 animate-pulse" />
          </div>
          <span className={`${subSizes[size] || subSizes.md} font-extrabold uppercase tracking-widest ${isLight ? "text-amber-300/80" : "text-slate-400"}`}>
            Smart Dining POS
          </span>
        </div>
      )}
    </div>
  );
}

