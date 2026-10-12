import React from "react";

export const StalightLogoAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = "",
}) => (
  <div
    style={{ width: size, height: size }}
    className={`relative flex items-center justify-center rounded-2xl bg-white border border-slate-200/90 shadow-sm flex-shrink-0 p-1 group overflow-hidden ${className}`}
  >
    {/* Delicate chromatic border glow */}
    <div
      className="absolute -inset-0.5 rounded-2xl opacity-30 group-hover:opacity-60 transition-opacity animate-gemini-spin blur-[2px]"
      style={{
        background:
          "conic-gradient(from 0deg, #ff2a7a, #8a2be2, #1a73e8, #00d4ff, #ff7043, #ff2a7a)",
      }}
    />
    <div className="absolute inset-[1px] rounded-[14px] bg-white" />
    <img
      src="/stalight-ai-logo.webp"
      alt="Stalight Intelligence"
      className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_1px_3px_rgba(37,99,235,0.25)]"
      loading="eager"
    />
  </div>
);

export const SiriOrbGlow: React.FC<{ size?: number; active?: boolean }> = ({
  size = 56,
  active = false,
}) => (
  <div
    style={{ width: size, height: size }}
    className="relative flex items-center justify-center cursor-pointer group select-none"
  >
    {/* Subtle & Elegant Gemini Chromatic Aurora Rim */}
    <div
      className={`absolute -inset-1 rounded-full blur-[6px] transition-all duration-500 animate-gemini-spin ${
        active ? "opacity-90 scale-110 animate-gemini-spin-fast" : "opacity-35 group-hover:opacity-75 group-hover:scale-105"
      }`}
      style={{
        background:
          "conic-gradient(from 0deg, #ff2a7a 0%, #8a2be2 25%, #1a73e8 50%, #00d4ff 75%, #ff2a7a 100%)",
      }}
    />

    {/* Crisp Pure White Apple-Style Frosted Disc */}
    <div className="absolute inset-0 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(37,99,235,0.18)] group-hover:border-blue-300/80" />

    {/* Crisp Centered Star Logo with Subtle Hover Sparkle */}
    <div className="relative w-full h-full rounded-full p-2.5 flex items-center justify-center z-10">
      <img
        src="/stalight-ai-logo.webp"
        alt="Stalight AI"
        className="w-full h-full object-contain filter drop-shadow-[0_2px_5px_rgba(37,99,235,0.25)] group-hover:scale-110 transition-transform duration-300"
      />
    </div>
  </div>
);

export const UserAvatarIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 30,
  className = "",
}) => (
  <div
    style={{ width: size, height: size }}
    className={`flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex-shrink-0 shadow-sm ${className}`}
  >
    <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  </div>
);

export const SiriWaveform: React.FC = () => (
  <div className="flex items-center gap-1 h-4 px-2">
    <span className="w-1 h-3 rounded-full bg-[#ff3b69] animate-pulse" style={{ animationDuration: "500ms" }} />
    <span className="w-1 h-4 rounded-full bg-[#b827fc] animate-pulse" style={{ animationDuration: "350ms" }} />
    <span className="w-1 h-2.5 rounded-full bg-[#2c72ff] animate-pulse" style={{ animationDuration: "600ms" }} />
    <span className="w-1 h-4 rounded-full bg-[#00d4ff] animate-pulse" style={{ animationDuration: "450ms" }} />
  </div>
);
