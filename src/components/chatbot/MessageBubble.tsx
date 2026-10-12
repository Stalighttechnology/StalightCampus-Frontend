import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StalightLogoAvatar, UserAvatarIcon } from "./ChatIcons";
import { ChatMessage } from "./ChatTypes";

interface MessageBubbleProps {
  message: ChatMessage;
  onActionClick?: (actionText: string) => void;
  onNavigate?: (path: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onActionClick, onNavigate }) => {
  const isBot = message.sender === "bot";
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInternalNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Helper date generators
  const now = new Date();
  const formatDateISO = (d: Date) => d.toISOString().split("T")[0];
  const todayStr = formatDateISO(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = formatDateISO(tomorrow);

  const day3 = new Date(now);
  day3.setDate(now.getDate() + 2);
  const day3Str = formatDateISO(day3);
  const day3Label = day3.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const day4 = new Date(now);
  day4.setDate(now.getDate() + 3);
  const day4Str = formatDateISO(day4);
  const day4Label = day4.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const maxDateObj = new Date(now);
  maxDateObj.setDate(now.getDate() + 10);
  const maxDateStr = formatDateISO(maxDateObj);

  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [selectedTime, setSelectedTime] = useState("02:00 PM");
  const [selectedDuration, setSelectedDuration] = useState(30);

  // Check interactive prompts
  const lowerText = message.text.toLowerCase();
  const isBookingSummary =
    isBot && (lowerText.includes("booking details:") || lowerText.includes("review your meeting"));
  const isConfirmedBooking =
    isBot && lowerText.includes("your meeting has been confirmed");
  const isDateTimePrompt =
    isBot && !message.isStreaming && !isBookingSummary && !isConfirmedBooking && (
      lowerText.includes("preferred date") ||
      lowerText.includes("date, time") ||
      lowerText.includes("date and time") ||
      lowerText.includes("time slot") ||
      lowerText.includes("duration")
    );

  // Helper to parse inline markdown (bolding, Markdown links, external URLs, internal routes, emails)
  const parseInlineFormatting = (line: string) => {
    // Strip any raw (Page: ...) or [Page: ...] or Page: /... tags, clean stray triple asterisks
    const cleanLine = line
      .replace(/\*{3,}/g, "")
      .replace(/\s*\((?:Page|page):\s*[^)]+\)/gi, "")
      .replace(/\s*\[(?:Page|page):\s*[^\]]+\]/gi, "")
      .replace(/\s*(?:Page|page):\s*\/[a-zA-Z0-9_\-\/]+/gi, "");

    // Regex splits markdown links [text](url), bold **text**, full URLs, domain links, internal routes, and emails
    const tokenRegex = /(\[[^\]]+\]\([^\s)]+\)|\*\*.*?\*\*|\bhttps?:\/\/[^\s]+|\b(?:[a-zA-Z0-9-]+\.)+(?:in|com|org|app|io|ai|net)(?:\/[^\s.,;:!?)]*)?|\/(?:Stalight-[a-zA-Z0-9-]+|it-services|software-development|skill-development|about|services|products|verify[a-zA-Z0-9\-\/]*)|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;

    const tokens = cleanLine.split(tokenRegex);

    return tokens.map((token, tIdx) => {
      if (!token) return null;

      // 1. Markdown link format: [Display Name](url_or_path)
      const mdLinkMatch = token.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
      if (mdLinkMatch) {
        const linkText = mdLinkMatch[1];
        let linkTarget = mdLinkMatch[2];

        // If internal route
        if (linkTarget.startsWith("/")) {
          return (
            <button
              key={tIdx}
              onClick={() => handleInternalNav(linkTarget)}
              className={`underline font-medium ml-0.5 inline-flex items-center gap-0.5 transition-colors cursor-pointer ${
                isBot ? "text-blue-600 hover:text-blue-800" : "text-white underline"
              }`}
            >
              <span>{linkText}</span>
            </button>
          );
        }

        // External link
        const safeUrl = linkTarget.startsWith("http") ? linkTarget : `https://${linkTarget}`;
        return (
          <a
            key={tIdx}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline decoration-blue-400/50 hover:decoration-blue-600 transition-colors inline-flex items-center gap-0.5 font-medium ml-0.5 ${
              isBot ? "text-blue-600 hover:text-blue-700" : "text-white hover:text-blue-100"
            }`}
          >
            <span>{linkText}</span>
            <svg className="w-2.5 h-2.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        );
      }

      // 2. Bold text: **highlight**
      if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
        const inner = token.substring(2, token.length - 2);
        return (
          <strong key={tIdx} className={`font-semibold ${isBot ? "text-slate-900" : "text-white"}`}>
            {inner}
          </strong>
        );
      }

      // 3. Internal route strings (e.g., /Stalight-Campus-Access, /about)
      if (token.startsWith("/") && !token.includes(" ") && token.length > 2) {
        return (
          <button
            key={tIdx}
            onClick={() => handleInternalNav(token)}
            className={`underline font-medium ml-0.5 inline-flex items-center gap-0.5 transition-colors cursor-pointer ${
              isBot ? "text-blue-600 hover:text-blue-800" : "text-white underline"
            }`}
          >
            <span>{token}</span>
          </button>
        );
      }

      // 4. External URLs & Domain links (e.g., https://ritesh.stalight.in, pannagaja.vercel.app, stalight.in)
      if (token.startsWith("http://") || token.startsWith("https://") || token.includes(".in") || token.includes(".com") || token.includes(".app")) {
        const match = token.match(/^((?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s.,;:!?)]*)?)(.*)$/);
        if (match && match[1]) {
          const rawUrl = match[1];
          const trailingPunct = match[2];
          const safeUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
          const displayUrl = rawUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

          return (
            <React.Fragment key={tIdx}>
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline decoration-blue-400/50 hover:decoration-blue-600 transition-colors inline-flex items-center gap-0.5 font-medium ml-0.5 ${
                  isBot ? "text-blue-600 hover:text-blue-700" : "text-white hover:text-blue-100"
                }`}
              >
                <span>{displayUrl}</span>
                <svg className="w-2.5 h-2.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {trailingPunct && <span>{trailingPunct}</span>}
            </React.Fragment>
          );
        }
      }

      // 5. Emails with safe punctuation stripping
      if (token.includes("@") && !token.includes(" ")) {
        const match = token.match(/^([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)(.*)$/);
        if (match) {
          const cleanEmail = match[1];
          const trailingPunct = match[2];
          return (
            <React.Fragment key={tIdx}>
              <a
                href={`mailto:${cleanEmail}`}
                className={`hover:underline font-medium ml-0.5 ${
                  isBot ? "text-blue-600" : "text-white underline"
                }`}
              >
                {cleanEmail}
              </a>
              {trailingPunct && <span>{trailingPunct}</span>}
            </React.Fragment>
          );
        }
      }

      return <span key={tIdx}>{token}</span>;
    });
  };

  // Structured message block renderer with natural left-alignment
  const renderFormattedMessage = (rawText: string) => {
    const lines = rawText.split("\n");

    return lines.map((line, idx) => {
      let trimmed = line.trim();

      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      // If user message, render clean paragraph
      if (!isBot) {
        return (
          <p key={idx} className="my-0.5 leading-relaxed text-white text-left text-[12px] font-medium">
            {parseInlineFormatting(line)}
          </p>
        );
      }

      // 1. Markdown Headings: ### Title or ## Title
      if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
        const headingText = trimmed
          .replace(/^#{2,3}\s+/, "")
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/\s*\((?:Page|page):\s*[^)]+\)/gi, "")
          .replace(/\s*\[(?:Page|page):\s*[^\]]+\]/gi, "")
          .replace(/\s*(?:Page|page):\s*\/[a-zA-Z0-9_\-\/]+/gi, "")
          .trim();

        return (
          <div key={idx} className="pt-2 pb-1">
            <h4 className="text-[12.5px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5 border-b border-slate-200/80 pb-0.5">
              <span className="w-1.5 h-3 rounded-full bg-gradient-to-b from-pink-500 via-purple-500 to-blue-600" />
              <span>{headingText}</span>
            </h4>
          </div>
        );
      }

      // 2. Numbered Plan / Category Titles: "1. **Plan Name**" or "1**Plan Name**" or "1. Plan Name"
      const numberedMatch = trimmed.match(/^(\d+)(?:\.|\*\*|\s\*\*|\s)(.+)$/);
      if (numberedMatch && (trimmed.startsWith("1") || trimmed.startsWith("2") || trimmed.startsWith("3") || trimmed.startsWith("4") || trimmed.startsWith("5"))) {
        const num = numberedMatch[1];
        let content = numberedMatch[2].trim();
        if (content.endsWith("**") && !content.includes("**")) {
          content = content.replace(/\*\*$/, "");
        }
        return (
          <div key={idx} className="flex items-start gap-2 pt-2 pb-0.5">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br from-pink-50 to-purple-50 text-purple-700 text-[10px] font-bold flex items-center justify-center border border-purple-200 shadow-sm mt-0.5">
              {num}
            </span>
            <div className="flex-1 font-semibold text-slate-900 text-[12px] leading-snug">
              {parseInlineFormatting(content)}
            </div>
          </div>
        );
      }

      // 3. Nested Bullet points with labels: "- **Target**: Value" or "- **Target:** Value" or "- Target: Value"
      if ((trimmed.startsWith("* ") || trimmed.startsWith("- ")) && trimmed.includes(":")) {
        const withoutBullet = trimmed.substring(2).trim();
        let labelPart = "";
        let valPart = "";

        const boldColonMatch = withoutBullet.match(/^\*\*([^*]+?)(?::\*\*|\*\*:)\s*(.*)$/);
        if (boldColonMatch) {
          labelPart = boldColonMatch[1].trim();
          valPart = boldColonMatch[2].replace(/^\*+/, "").replace(/\*+$/, "").trim();
        } else {
          const colonIdx = withoutBullet.indexOf(":");
          labelPart = withoutBullet.substring(0, colonIdx).replace(/\*\*/g, "").trim();
          valPart = withoutBullet.substring(colonIdx + 1).replace(/^\*+/, "").replace(/\*+$/, "").trim();
        }

        return (
          <div key={idx} className="my-1 pl-3 text-[11.5px] leading-relaxed text-left flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-purple-700 mr-1.5">{labelPart}:</span>
              <span className="text-slate-700">{parseInlineFormatting(valPart)}</span>
            </div>
          </div>
        );
      }

      // 4. Standard Bullet point: "* Item" or "- Item"
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const bulletContent = trimmed.substring(2).trim();
        return (
          <div key={idx} className="my-0.5 pl-3 text-[11.5px] leading-relaxed flex items-start gap-1.5 text-left">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mt-1.5 flex-shrink-0" />
            <span className="text-slate-700 flex-1">
              {parseInlineFormatting(bulletContent)}
            </span>
          </div>
        );
      }

      // 5. Suppress redundant text lines that just echo technical raw routes (since action card is rendered below)
      if (
        trimmed.toLowerCase().includes("directly at /") ||
        trimmed.toLowerCase().includes("directly at [/") ||
        (trimmed.toLowerCase().startsWith("open ") && (trimmed.includes("/admin") || trimmed.includes("/hod") || trimmed.includes("/faculty")))
      ) {
        return null;
      }

      // 6. Normal text paragraph
      return (
        <p key={idx} className="my-0.5 leading-relaxed text-slate-800 text-left text-[11.5px]">
          {parseInlineFormatting(line)}
        </p>
      );
    });
  };

  return (
    <div
      className={`group flex items-end gap-2.5 ${
        isBot ? "justify-start" : "justify-end"
      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      {isBot && <StalightLogoAvatar size={28} className="mb-1 flex-shrink-0 shadow-sm" />}

      <div className="flex flex-col space-y-1.5 max-w-[88%]">
        <div
          className={`relative px-4 py-3 rounded-2xl text-xs leading-relaxed backdrop-blur-2xl transition-all ${
            isBot
              ? "bg-slate-50/95 hover:bg-slate-100/90 border border-slate-200/90 text-slate-800 rounded-bl-sm shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-left"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500/40 text-white rounded-br-sm shadow-[0_4px_16px_rgba(37,99,235,0.25)] text-left"
          }`}
        >
          {/* Confirmed Booking Badge */}
          {isConfirmedBooking && (
            <div className="mb-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-[11px] font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Meeting Scheduled & Confirmed</span>
            </div>
          )}

          <div className="select-text space-y-0.5 text-left">
            {renderFormattedMessage(message.text)}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-600 animate-pulse align-middle rounded-sm" />
            )}
          </div>

          {/* Unified Interactive Date, Time & Duration Selection Card */}
          {isDateTimePrompt && onActionClick && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-3">
              {/* Date Selection Section */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>1. Select Date (Next 10 Days):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Mon–Sat</span>
                </div>

                {/* Quick Date Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Today", val: todayStr },
                    { label: "Tomorrow", val: tomorrowStr },
                    { label: day3Label, val: day3Str },
                    { label: day4Label, val: day4Str },
                  ].map((d) => (
                    <button
                      key={d.val}
                      onClick={() => setSelectedDate(d.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        selectedDate === d.val
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-white hover:bg-blue-50 border border-slate-200 text-slate-700"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Date Input with 10-day limit */}
                <div className="pt-0.5">
                  <input
                    type="date"
                    min={todayStr}
                    max={maxDateStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Time Selection Section */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>2. Select Time (10 AM – 6 PM IST):</span>
                </div>

                {/* Quick Time Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {["10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "04:30 PM", "05:30 PM"].map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        selectedTime === slot
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-white hover:bg-blue-50 border border-slate-200 text-slate-700"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection Section */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>3. Select Meeting Duration:</span>
                </div>

                {/* Duration Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "30 minutes", val: 30 },
                    { label: "45 minutes", val: 45 },
                    { label: "60 minutes", val: 60 },
                  ].map((dur) => (
                    <button
                      key={dur.val}
                      onClick={() => setSelectedDuration(dur.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        selectedDuration === dur.val
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "bg-white hover:bg-blue-50 border border-slate-200 text-slate-700"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single Unified Confirm Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    const finalDate = selectedDate || tomorrowStr;
                    const finalTime = selectedTime || "02:00 PM";
                    const finalDur = selectedDuration || 30;
                    onActionClick(`${finalDate} at ${finalTime} for ${finalDur} min`);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.99] flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
                    <svg className="w-3.5 h-3.5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Confirm Schedule</span>
                  </div>
                  <div className="text-[10.5px] font-medium text-blue-100/90 bg-white/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>{selectedDate}</span>
                    <span>•</span>
                    <span>{selectedTime}</span>
                    <span>•</span>
                    <span>{selectedDuration} min</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Render Structured Campus Data Cards */}
          {message.ui_cards && message.ui_cards.length > 0 && (
            <div className="mt-2.5 space-y-2.5">
              {message.ui_cards.map((card, cIdx) => {
                if (card.type === 'table_metric_card' && card.rows) {
                  return (
                    <div key={cIdx} className="rounded-xl border border-slate-200 bg-white/95 shadow-sm p-2.5 text-[11px] text-slate-800">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                        <span className="font-bold text-slate-900">{card.title}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full">Live Audit</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-[9.5px] uppercase font-bold text-slate-500">
                              {card.columns?.map((col, idx) => (
                                <th key={idx} className="py-1 px-1">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {card.rows.map((row, rIdx) => (
                              <tr key={rIdx} className={row.status === 'High Risk' ? 'bg-rose-50/70' : ''}>
                                <td className="py-1 px-1 font-medium">{row.department}</td>
                                <td className={`py-1 px-1 font-semibold ${row.attendance_risk ? 'text-rose-600' : 'text-emerald-600'}`}>{row.attendance}</td>
                                <td className="py-1 px-1">{row.outstanding_fees}</td>
                                <td className="py-1 px-1">{row.pending_marks}</td>
                                <td className="py-1 px-1">
                                  <span className={`px-1 py-0.5 rounded text-[8.5px] font-bold ${row.status === 'High Risk' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {card.actions && card.actions.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap gap-1">
                          {card.actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => act.url && handleInternalNav(act.url)}
                              className="px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              {act.label} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                if (card.type === 'fee_kpi_card') {
                  return (
                    <div key={cIdx} className="rounded-xl border border-slate-200 bg-white p-2.5 text-[11px]">
                      <span className="font-bold text-slate-900 block mb-1.5">{card.title}</span>
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/50">
                          <span className="text-[9px] text-amber-700 uppercase font-semibold block">Outstanding Due</span>
                          <span className="font-bold text-amber-900 text-xs">₹{card.total_outstanding?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200/50">
                          <span className="text-[9px] text-emerald-700 uppercase font-semibold block">Collected</span>
                          <span className="font-bold text-emerald-900 text-xs">₹{card.total_collected?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInternalNav('/invoices')}
                        className="w-full py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800"
                      >
                        Open Invoices
                      </button>
                    </div>
                  );
                }
                if (card.type === 'link_action' || card.type === 'navigation_card') {
                  return (
                    <div key={cIdx} className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs text-[11px]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{card.title}</span>
                          {card.subtitle && <span className="text-[10px] text-slate-500">{card.subtitle}</span>}
                        </div>
                      </div>
                      {card.link && (
                        <button
                          onClick={() => handleInternalNav(card.link)}
                          className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <span>{card.link_text || "Open Page →"}</span>
                        </button>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Render Suggested Action Chips */}
          {message.suggested_actions && message.suggested_actions.length > 0 && onActionClick && !message.isStreaming && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {message.suggested_actions.map((act, aIdx) => (
                <button
                  key={aIdx}
                  onClick={() => onActionClick(act.text)}
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  {act.text}
                </button>
              ))}
            </div>
          )}

          {/* Bubble Footer with Timestamp & Copy Action */}
          <div className={`mt-2 flex items-center justify-between pt-1.5 border-t text-[10px] ${
            isBot ? "border-slate-200/60 text-slate-400" : "border-white/20 text-blue-100/90"
          }`}>
            <span>
              {message.timestamp}
            </span>

            {isBot && !message.isStreaming && message.text && (
              <button
                onClick={handleCopy}
                title="Copy message"
                className="opacity-60 hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity flex items-center gap-1 ml-2"
              >
                {copied ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </span>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Interactive Quick Action Buttons for Booking Confirmation */}
        {isBookingSummary && onActionClick && !message.isStreaming && (
          <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
            <button
              onClick={() => onActionClick("Yes, confirm")}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 transform hover:scale-[1.02]"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Confirm Booking</span>
            </button>
            <button
              onClick={() => onActionClick("Change date or time")}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-medium shadow-sm transition-all"
            >
              Change Date/Time
            </button>
            <button
              onClick={() => onActionClick("Cancel")}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!isBot && <UserAvatarIcon size={28} className="mb-1 flex-shrink-0 shadow-sm" />}
    </div>
  );
};

export default MessageBubble;
