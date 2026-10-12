import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceState =
  | "IDLE"
  | "ACTIVATING"
  | "SPEAKING_ACK"
  | "LISTENING"
  | "TRANSCRIBING"
  | "SUBMITTING"
  | "THINKING"
  | "SPEAKING_RESPONSE";

interface UseVoiceAssistantOptions {
  onTranscriptChange?: (text: string) => void;
  onTranscriptFinal?: (finalText: string) => void;
  onWakeWord?: () => void;
  lang?: string;
}

// Disallowed male / novelty voice names to guarantee a pure Siri female voice
const MALE_OR_NOVELTY_VOICES = [
  "rishi", "alex", "fred", "daniel", "oliver", "aaron", "david", "george",
  "mark", "albert", "bad news", "bahh", "bells", "boing", "bubbles",
  "cellos", "deranged", "good news", "hysterical", "pipe organ",
  "trinoids", "whisper", "zarvox", "junior", "ralph", "male", "tom", "bruce"
];

const isFemaleSiriVoice = (voice: SpeechSynthesisVoice): boolean => {
  const name = voice.name.toLowerCase();
  for (const maleName of MALE_OR_NOVELTY_VOICES) {
    if (name.includes(maleName)) {
      return false;
    }
  }
  return true;
};

export const useVoiceAssistant = ({
  onTranscriptChange,
  onTranscriptFinal,
  onWakeWord,
  lang = "en-IN",
}: UseVoiceAssistantOptions = {}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [isSupported, setIsSupported] = useState(true);

  // Core refs for standard state management
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Buffers and timers
  const transcriptBufferRef = useRef<string>("");
  const isSpeechSessionActiveRef = useRef<boolean>(false);
  const isWakeWordModeRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<any>(null);
  const autoRestartTimerRef = useRef<any>(null);
  const idleConversationTimerRef = useRef<any>(null);

  const onTranscriptFinalRef = useRef(onTranscriptFinal);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onWakeWordRef = useRef(onWakeWord);

  onTranscriptFinalRef.current = onTranscriptFinal;
  onTranscriptChangeRef.current = onTranscriptChange;
  onWakeWordRef.current = onWakeWord;

  // Initialize SpeechSynthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthesisRef.current = window.speechSynthesis;
      // Preload voices
      synthesisRef.current.getVoices();
      if (synthesisRef.current.onvoiceschanged !== undefined) {
        synthesisRef.current.onvoiceschanged = () => {
          synthesisRef.current?.getVoices();
        };
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  // Optimized Siri Female Voice Selector
  const getFemaleVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!synthesisRef.current) return null;
    const voices = synthesisRef.current.getVoices();
    if (!voices.length) return null;

    // Filter out known male/novelty voices
    const femaleVoices = voices.filter(v => isFemaleSiriVoice(v));

    // Get all Indian voices
    const indianVoices = femaleVoices.filter(v => v.lang.toLowerCase() === "en-in" || v.lang.toLowerCase() === "hi-in");

    if (indianVoices.length > 0) {
      // 1. Look for explicit Premium/Neural voices (Edge Natural/Online)
      const premium = indianVoices.find(v => v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("neural") || v.name.toLowerCase().includes("premium"));
      if (premium) return premium;
      
      // 2. Look for Google's specific cloud voice which is much higher quality
      const googleVoice = indianVoices.find(v => v.name.includes("Google"));
      if (googleVoice) return googleVoice;

      // 3. Look for Apple's high-quality Indian voice (Veena/Priya)
      const appleVoice = indianVoices.find(v => v.name.toLowerCase().includes("veena") || v.name.toLowerCase().includes("priya"));
      if (appleVoice) return appleVoice;

      // 4. Any other Indian female
      return indianVoices[0];
    }

    // Fallback: Natural Siri/English Female
    const enFemale = femaleVoices.find(v => 
      v.name.toLowerCase().includes("samantha") || 
      v.name.toLowerCase().includes("siri") || 
      v.name.toLowerCase().includes("karen") || 
      v.name.toLowerCase().includes("female")
    );
    if (enFemale) return enFemale;

    return femaleVoices[0] || voices[0] || null;
  }, []);

  // Text Cleaner for Natural Speech
  const cleanMarkdownForSpeech = (rawText: string): string => {
    return rawText
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/[*#`_~|]/g, "")
      .replace(/\n+/g, " ")
      .trim();
  };

  // Stop everything (Mic + Speaker)
  const stopAll = useCallback(() => {
    isSpeechSessionActiveRef.current = false;
    isWakeWordModeRef.current = false;
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current);
    if (idleConversationTimerRef.current) clearTimeout(idleConversationTimerRef.current);
    
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }
    
    setVoiceState("IDLE");
  }, []);

  // Speak a phrase and execute callback when done
  const speakPhrase = useCallback((text: string, stateWhileSpeaking: VoiceState, onComplete?: () => void) => {
    if (!synthesisRef.current) {
      onComplete?.();
      return;
    }

    synthesisRef.current.cancel();
    setVoiceState(stateWhileSpeaking);

    const utterance = new SpeechSynthesisUtterance(cleanMarkdownForSpeech(text));
    const voice = getFemaleVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-IN";
    }

    // Tuning for a natural, young, conversational assistant feel
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Safety fallback if onend fails to fire
    let completed = false;
    const finish = () => {
      if (!completed) {
        completed = true;
        activeUtteranceRef.current = null;
        onComplete?.();
      }
    };

    const fallbackTimeout = setTimeout(finish, text.length * 150 + 1000);

    utterance.onend = () => {
      clearTimeout(fallbackTimeout);
      finish();
    };
    utterance.onerror = () => {
      clearTimeout(fallbackTimeout);
      finish();
    };

    activeUtteranceRef.current = utterance;
    synthesisRef.current.speak(utterance);
  }, [getFemaleVoice]);

  const startRecognitionEngine = useCallback((mode: "WAKE_WORD" | "COMMAND") => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("[VoiceAssistant] Speech recognition not supported in this browser.");
      setIsSupported(false);
      return;
    }

    console.log(`[VoiceAssistant] Starting recognition engine in mode: ${mode}`);
    // Setup state
    isWakeWordModeRef.current = mode === "WAKE_WORD";
    isSpeechSessionActiveRef.current = true;
    transcriptBufferRef.current = "";

    // Cleanup previous instance if any
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang || "en-IN";
      recognition.maxAlternatives = 10;
      recognitionRef.current = recognition;
    }

    const recognition = recognitionRef.current;
    try { recognition.abort(); } catch (e) {}

    recognition.onstart = () => {
      console.log(`[VoiceAssistant] Microphone OPENED (${mode})`);
      setVoiceState(isWakeWordModeRef.current ? "IDLE" : "LISTENING"); // Wake word mode is silent to user
      
      // Continuous mode idle timer: if user doesn't speak for 8 seconds, go back to sleep
      if (idleConversationTimerRef.current) clearTimeout(idleConversationTimerRef.current);
      if (mode === "COMMAND") {
        idleConversationTimerRef.current = setTimeout(() => {
          console.log("[VoiceAssistant] Conversation idle timeout. Going back to sleep.");
          try { recognition.abort(); } catch (e) {}
          // Recursively switch to wake word mode
          startRecognitionEngine("WAKE_WORD");
        }, 8000);
      }
    };

    const wakeWordRegex = /(hey|hi|hello|ok|a|yo|say|hasti|ha|hate|he)?\s*(stahlight|stalight|starlight|stah\s*light|stah\s*lite|stah\s*lit|staylight|stallight|stay\s*light|star\s*light|start\s*light|stall\s*light|sta\w*light|daylight|satellite|sattelite|the\s*light|stalite|stlight|stlite|delight|sterlite|stellite|sterolite|stellied|stelide|sterilite|stellaide|steroid|hairstyle|story|storyte|the\s*light|is\s*tonight|tonight|is\s*light|hasti\s*light)/i;

    recognition.onresult = (event: any) => {
      if (idleConversationTimerRef.current) clearTimeout(idleConversationTimerRef.current);

      // MODE 1: Wake Word Detection
      if (isWakeWordModeRef.current) {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          for (let j = 0; j < result.length; ++j) {
            const rawTranscript = result[j].transcript.trim().toLowerCase();
            console.log("[Wake Word Listener] Heard:", rawTranscript);
            
            if (wakeWordRegex.test(rawTranscript) || rawTranscript.includes("stalight") || rawTranscript.includes("starlight") || rawTranscript.includes("staylight") || rawTranscript.includes("stay lite")) {
              console.log("[Wake Word Listener] 🔥 WAKE WORD MATCHED! Triggering assistant...");
              if (onWakeWordRef.current) {
                onWakeWordRef.current();
              }
              // Wake word detected! Switch to active interaction.
              recognition.abort();
              startVoiceInteraction();
              return;
            }
          }
        }
        return;
      }

      let finalStr = "";
      let interimStr = "";

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      const currentText = (finalStr + " " + interimStr).trim();
      if (!currentText) return;

      // MODE 2: Active Command Transcription
      setVoiceState("TRANSCRIBING");
      transcriptBufferRef.current = currentText;
      
      if (onTranscriptChangeRef.current) {
        onTranscriptChangeRef.current(currentText);
      }

      // Auto-submit silence detection (1.5s)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        let textToSubmit = transcriptBufferRef.current.trim();
        
        if (textToSubmit && isSpeechSessionActiveRef.current && !isWakeWordModeRef.current) {
          
          // --- STT Normalization for Emails and Custom Words ---
          // 1. Fix company name
          textToSubmit = textToSubmit.replace(/\b(stalite|sterlite|stellite|stellaide|sterilite|staylight|starlight)\b/gi, "stalight");
          
          // 2. Fix email formatting ("at" -> "@", "dot" -> ".")
          textToSubmit = textToSubmit.replace(/\s+at\s+/gi, "@");
          textToSubmit = textToSubmit.replace(/\s+dot\s+/gi, ".");
          textToSubmit = textToSubmit.replace(/\s*@\s*/g, "@");
          textToSubmit = textToSubmit.replace(/\s*\.\s*/g, ".");
          
          // 3. If it looks like a standalone email answer, aggressively remove remaining spaces
          if (textToSubmit.includes("@") && textToSubmit.length < 50 && !textToSubmit.toLowerCase().includes("my email is")) {
            textToSubmit = textToSubmit.replace(/\s+/g, "");
          }
          // ---------------------------------------------------

          console.log("[VoiceAssistant] Auto-submitting due to silence:", textToSubmit);
          isSpeechSessionActiveRef.current = false;
          setVoiceState("SUBMITTING");
          try { recognition.abort(); } catch(e){}
          
          if (onTranscriptFinalRef.current) {
            onTranscriptFinalRef.current(textToSubmit);
          }
          transcriptBufferRef.current = "";
        }
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      console.warn(`[VoiceAssistant] Recognition Error:`, event.error);
      if (event.error === "not-allowed") {
        stopAll();
      }
    };

    recognition.onend = () => {
      console.log(`[VoiceAssistant] Microphone CLOSED. Active=${isSpeechSessionActiveRef.current}`);
      // Auto-restart loop if session is still meant to be active
      if (isSpeechSessionActiveRef.current) {
        autoRestartTimerRef.current = setTimeout(() => {
          if (isSpeechSessionActiveRef.current) {
            console.log(`[VoiceAssistant] Auto-restarting recognition...`);
            try { recognition.start(); } catch (e) {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    // Use a slight timeout before starting to let any previous abort flush properly
    setTimeout(() => {
      try {
        recognition.start();
      } catch (e) {
        console.error("[VoiceAssistant] Failed to start recognition:", e);
      }
    }, 50);
  }, [lang, stopAll]);

  // Expose startVoiceInteraction explicitly before it is used
  const startVoiceInteraction = useCallback(() => {
    isWakeWordModeRef.current = false;
    isSpeechSessionActiveRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    setVoiceState("ACTIVATING");
    
    // Greeting -> Mic Open
    speakPhrase("Hello! How can I help you today?", "SPEAKING_ACK", () => {
      startRecognitionEngine("COMMAND");
    });
  }, [speakPhrase, startRecognitionEngine]);

  // Public: Start Continuous Wake Word Listening
  const startWakeWordListening = useCallback(() => {
    stopAll();
    startRecognitionEngine("WAKE_WORD");
  }, [stopAll, startRecognitionEngine]);

  // Public: Toggle Mic Button
  const toggleListening = useCallback(() => {
    if (voiceState === "LISTENING" || voiceState === "TRANSCRIBING" || voiceState === "SPEAKING_ACK" || voiceState === "SPEAKING_RESPONSE") {
      stopAll();
      startWakeWordListening();
    } else {
      startVoiceInteraction();
    }
  }, [voiceState, startVoiceInteraction, stopAll, startWakeWordListening]);

  // Public: Speak AI Response
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    speakPhrase(text, "SPEAKING_RESPONSE", () => {
      // After response finishes, start listening again for continuous conversation
      setVoiceState("IDLE");
      if (onEnd) onEnd();
      
      // Auto-resume continuous active conversation mode
      startRecognitionEngine("COMMAND");
    });
  }, [speakPhrase, startRecognitionEngine]);

  // Auto-start wake word listening when component mounts
  useEffect(() => {
    startWakeWordListening();
    
    // Fallback: If browser blocked initial start, clicking anywhere on the page will start it silently
    const handleFirstClick = () => {
      startWakeWordListening();
      window.removeEventListener("click", handleFirstClick);
    };
    window.addEventListener("click", handleFirstClick);

    return () => {
      stopAll();
      window.removeEventListener("click", handleFirstClick);
    };
  }, [startWakeWordListening, stopAll]);

  return {
    voiceState,
    isListening: voiceState === "LISTENING" || voiceState === "TRANSCRIBING",
    isSpeaking: voiceState === "SPEAKING_ACK" || voiceState === "SPEAKING_RESPONSE",
    isSupported,
    startVoiceInteraction,
    toggleListening,
    speakText,
    stopAll,
  };
};
