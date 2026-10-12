import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StalightLogoAvatar, SiriOrbGlow } from "./ChatIcons";
import { MessageBubble } from "./MessageBubble";
import { ChatMessage, ChatbotProps, UICard, SuggestedAction } from "./ChatTypes";
import { useVoiceAssistant } from "./useVoiceAssistant";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { API_BASE_URL } from "@/utils/config";

// Clean, exact navbar and key page topics
const PAGE_PROMPTS = [
  "Department risk analysis",
  "Attendance summary",
  "Outstanding fees",
  "Pending internal marks",
  "Stalight Campus",
  "Stalight Sync",
  "Pricing & Plans",
  "About Stalight",
];

const INITIAL_GREETING = "Hello! I am Stalight Intelligence. How can I assist you with your authorized campus records, attendance, fees, or academics today?";

export const StalightChatbot: React.FC<ChatbotProps> = ({
  apiBaseUrl = API_BASE_URL,
  defaultOpen = false,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const isVoiceModeRef = useRef<boolean>(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  // Helper to scroll messages to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Forward declaration for handleSendMessage
  const handleSendMessageRef = useRef<(textToSend?: string, isVoice?: boolean) => Promise<void>>(async () => {});

  // Voice Assistant Hook with live transcription and auto-submit callback
  const {
    isListening,
    isSpeaking,
    isSupported: isVoiceSupported,
    startVoiceInteraction,
    toggleListening,
    speakText,
    stopAll,
  } = useVoiceAssistant({
    onTranscriptChange: (liveText) => {
      setInputMessage(liveText);
    },
    onTranscriptFinal: (finalText) => {
      if (finalText && finalText.trim()) {
        setInputMessage(finalText);
        isVoiceModeRef.current = true;
        handleSendMessageRef.current(finalText, true);
      }
    },
    onWakeWord: () => {
      setIsOpen(true);
      isVoiceModeRef.current = true;
    },
    lang: "en-IN",
  });

  // Auto-navigate background to matched page cleanly based on user intent
  const handleAutoNavigation = useCallback((text: string) => {
    const lower = text.toLowerCase();

    // Specific product/feature pages first
    if (lower.includes("pricing") || lower.includes("price") || lower.includes("cost") || lower.includes("access plan") || lower.includes("pricing & plans") || lower.includes("/stalight-campus-access")) {
      navigate("/Stalight-Campus-Access");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lower.includes("sync") || lower.includes("sink") || lower.includes("/stalight-sync")) {
      navigate("/Stalight-Sync");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lower.includes("campus") || lower.includes("erp") || lower.includes("slide campus") || lower.includes("astrolog") || lower.includes("starlight campus") || lower.includes("/stalight-campus")) {
      navigate("/Stalight-Campus");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lower.includes("it service") || lower.includes("cloud") || lower.includes("/it-services") || lower.includes("/services")) {
      navigate("/it-services");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lower.includes("software development") || lower.includes("custom software") || lower.includes("/software-development") || lower.includes("/products")) {
      navigate("/software-development");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (lower.includes("career") || lower.includes("training") || lower.includes("internship") || lower.includes("skill development") || lower.includes("/skill-development")) {
      navigate("/skill-development");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } 
    // Generic company info last
    else if ((lower.includes("about") && !lower.includes("how about") && !lower.includes("what about")) || lower.includes("leadership") || lower.includes("headquarters") || lower.includes("team") || lower.includes("company") || lower.includes("/about")) {
      navigate("/about");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [navigate]);

  // Direct internal navigation handler from message links
  const handleDirectNavigation = useCallback((path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

  // Initialize fresh Session ID & Messages on page load / hard refresh
  useEffect(() => {
    const freshSid = "stalight-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
    setSessionId(freshSid);
    try {
      localStorage.removeItem("stalight_chat_history");
      localStorage.setItem("stalight_chat_session_id", freshSid);
    } catch (e) {
      // Ignore storage restrictions
    }

    setMessages([
      {
        id: "msg-0",
        sender: "bot",
        text: INITIAL_GREETING,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      stopAll();
    };
  }, [stopAll]);

  // Scroll to bottom on message updates
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isLoading, scrollToBottom]);

  // When chatbot is opened (or reopened), scroll immediately to end & focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom("auto");
        inputRef.current?.focus();
      }, 30);

      setTimeout(() => {
        scrollToBottom("smooth");
      }, 150);
    } else {
      stopAll();
    }
  }, [isOpen, scrollToBottom, stopAll]);

  useEffect(() => {
    if (!isLoading && isOpen && !isListening) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen, isListening]);

  // Smooth typewriter streamer
  const streamBotResponse = useCallback((fullReply: string, msgId: string, timestamp: string, shouldSpeak: boolean = false) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    let idx = 0;
    const chunkSize = fullReply.length > 250 ? 4 : fullReply.length > 100 ? 3 : 2;
    const speed = 12;

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        sender: "bot",
        text: "",
        timestamp: timestamp,
        isStreaming: true,
      },
    ]);

    // If voice mode is active, speak the clean response naturally
    if (shouldSpeak) {
      speakText(fullReply);
    }

    typingTimerRef.current = setInterval(() => {
      idx += chunkSize;
      if (idx >= fullReply.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, text: fullReply, isStreaming: false } : msg
          )
        );
        inputRef.current?.focus();
      } else {
        const slice = fullReply.slice(0, idx);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, text: slice, isStreaming: true } : msg
          )
        );
      }
    }, speed);
  }, [speakText]);

  const handleSendMessage = async (textToSend?: string, isVoice: boolean = false) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    // Explicitly speak only if this exact turn was submitted via voice speech
    const isVoiceTurn = isVoice === true;

    // Auto-navigate background to matching page immediately
    handleAutoNavigation(text);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: text,
      timestamp: timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      let reply = "";
      let uiCards: UICard[] = [];
      let suggestedActions: SuggestedAction[] = [];

      try {
        const copilotRes = await fetchWithTokenRefresh(`${apiBaseUrl}/api/copilot/chat/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        if (copilotRes.ok) {
          const copilotData = await copilotRes.json();
          reply = copilotData.response || "";
          uiCards = copilotData.ui_cards || [];
          suggestedActions = copilotData.suggested_actions || [];
        }
      } catch (copilotErr) {
        console.warn("Copilot endpoint fallback:", copilotErr);
      }

      if (!reply) {
        const response = await fetch(`${apiBaseUrl}/api/chatbot/message/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        reply = data.reply || data.response || "I am currently unavailable. Please contact us at contact@stalight.in.";
      }

      const botMsgId = "bot-" + Date.now();
      const botTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setIsLoading(false);
      streamBotResponse(reply, botMsgId, botTimestamp, isVoiceTurn);

      if (uiCards.length > 0 || suggestedActions.length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, ui_cards: uiCards, suggested_actions: suggestedActions } : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      const fallbackMsg: ChatMessage = {
        id: "bot-err-" + Date.now(),
        sender: "bot",
        text: "I am unable to connect to the server at this moment. Please email our team directly at contact@stalight.in or call +91 73495 51102 / +91 73495 51101.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (isVoiceTurn) {
        speakText("I am unable to connect to the server at this moment. Please contact our team at contact@stalight.in.");
      }
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Smooth Gemini-style open transition with spinning effect
  const handleOpenWithSpin = useCallback((isVoice: boolean = false) => {
    setIsSpinning(true);
    setIsClosing(false);
    setTimeout(() => {
      setIsOpen(true);
      setIsSpinning(false);
      if (isVoice) {
        isVoiceModeRef.current = true;
        startVoiceInteraction();
      }
    }, 280);
  }, [startVoiceInteraction]);

  // Smooth Gemini-style close transition with spinning effect
  const handleCloseWithSpin = useCallback(() => {
    stopAll();
    setIsClosing(true);
    setIsSpinning(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsSpinning(false);
    }, 360);
  }, [stopAll]);

  // Handler for floating "Hey Stalight" badge click
  const handleHeyStalightBadgeClick = () => {
    handleOpenWithSpin(true);
  };

  // Handler for circular launcher logo click
  const handleLauncherIconClick = () => {
    if (isOpen) {
      handleCloseWithSpin();
    } else {
      handleOpenWithSpin(false);
    }
  };

  return (
    <div className="stalight-chatbot-root font-sans text-slate-900">
      {/* Floating Apple-Style Light Frosted Launcher Button */}
      {(!isOpen || isClosing) && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 transition-all duration-300 ${
          isClosing ? "opacity-100 scale-100" : isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"
        }`}>
          {/* Hey Stalight Voice Badge Trigger */}
          <button
            onClick={handleHeyStalightBadgeClick}
            title="Start voice interaction with Hey Stalight"
            className="group hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.08)] hover:border-purple-300 hover:shadow-[0_12px_30px_rgba(168,85,247,0.2)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-tr from-pink-500 via-purple-600 to-blue-600" />
            </span>
            <span className="bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 bg-clip-text text-transparent font-extrabold tracking-tight group-hover:from-pink-600 group-hover:to-purple-700 transition-all">
              Hey Stalight
            </span>
          </button>

          {/* Launcher Circular Orb Logo Button with Gemini Spin */}
          <button
            onClick={handleLauncherIconClick}
            aria-label="Open Stalight Intelligence"
            className="transform hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            <SiriOrbGlow size={56} isSpinning={isSpinning} />
          </button>
        </div>
      )}

      {/* Main Apple Light Glass Window with Smooth Gemini Enter/Exit */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col rounded-[28px] backdrop-blur-3xl bg-white/95 border border-slate-200/90 shadow-[0_25px_80px_rgba(0,0,0,0.12),0_0_30px_rgba(37,99,235,0.08)] overflow-hidden ${
          isClosing ? "gemini-chat-window-exit" : "gemini-chat-window-enter"
        }`}>
          {/* Apple Light Glass Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className={isClosing ? "animate-gemini-burst" : ""}>
                <StalightLogoAvatar size={34} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[15px] font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600">
                    Stalight
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200/80 rounded-full shadow-sm">
                    Intelligence
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Speaking / Listening Voice Status Indicator */}
              {(isSpeaking || isListening) && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[10px] font-bold text-purple-700 animate-pulse mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  <span>{isSpeaking ? "Speaking..." : "Listening..."}</span>
                </div>
              )}

              <button
                onClick={handleCloseWithSpin}
                title="Close"
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onActionClick={(actionText) => handleSendMessage(actionText)}
                onNavigate={handleDirectNavigation}
              />
            ))}

            {/* Thinking State */}
            {isLoading && (
              <div className="flex items-end gap-2.5 justify-start">
                <StalightLogoAvatar size={28} className="mb-1" />
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-slate-200 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Clean Page-Level Suggestions Bar */}
          <div className="px-3.5 py-2 bg-slate-50/80 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {PAGE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white hover:bg-purple-50 border border-slate-200/90 hover:border-purple-200 text-slate-700 hover:text-purple-700 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Light Glass Input Footer with Live Mic & Waveform */}
          <div className="p-3 bg-white/90 border-t border-slate-200/80 backdrop-blur-xl">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
                    window.speechSynthesis.cancel();
                  }
                  setInputMessage(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening... speak now" : "Ask Stalight or choose a topic..."}
                maxLength={500}
                className={`w-full pl-4 pr-20 py-2.5 bg-slate-50/90 border rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-inner transition-all ${
                  isListening
                    ? "border-purple-400 focus:border-purple-500 focus:ring-purple-500/20 bg-purple-50/30"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />

              <div className="absolute right-1.5 flex items-center gap-1">
                {/* Direct Microphone Button */}
                {isVoiceSupported && (
                  <button
                    onClick={() => {
                      isVoiceModeRef.current = true;
                      toggleListening();
                    }}
                    type="button"
                    title={isSpeaking ? "Stop speaking" : isListening ? "Stop listening" : "Speak to Stalight"}
                    aria-label={isSpeaking ? "Stop Voice Output" : "Voice Input"}
                    className={`p-2 rounded-full transition-all ${
                      isSpeaking
                        ? "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600"
                        : isListening
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 animate-pulse scale-105"
                        : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                    }`}
                  >
                    {isSpeaking ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  type="button"
                  aria-label="Send"
                  className="p-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StalightChatbot;

