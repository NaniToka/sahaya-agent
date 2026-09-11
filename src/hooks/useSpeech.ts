"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { translations } from "../translations";

export type MicState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseSpeechProps {
  lang: "en" | "ml";
  onTranscript: (text: string) => void;
}

export function useSpeech({ lang, onTranscript }: UseSpeechProps) {
  const [micState, setMicState] = useState<MicState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [interimText, setInterimText] = useState("");
  const [speed, setSpeed] = useState<"normal" | "slow">("normal");
  const [hasVoice, setHasVoice] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  const bcp47 = lang === "en" ? "en-IN" : "ml-IN";
  const t = translations[lang];

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      
      const updateVoices = () => {
        if (!synthRef.current) return;
        const voices = synthRef.current.getVoices();
        if (voices.length > 0) {
          const hasTargetVoice = voices.some(v => v.lang.startsWith(lang === "ml" ? "ml" : "en"));
          setHasVoice(hasTargetVoice);
        }
      };

      updateVoices();
      synthRef.current.onvoiceschanged = updateVoices;
      return () => {
        if (synthRef.current) {
          synthRef.current.onvoiceschanged = null;
          synthRef.current.cancel(); // cleanup any ongoing speech
        }
      };
    }
  }, [lang]);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = bcp47;

        recognitionRef.current.onstart = () => {
          setMicState("listening");
          setErrorMessage("");
          setInterimText("");
        };

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = "";
          let currentInterim = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          setInterimText(currentInterim);
          if (finalTranscript.trim()) {
            onTranscriptRef.current(finalTranscript.trim());
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === "aborted") {
            // Ignore aborted errors (happens when stopped manually or by another instance)
            return;
          }
          if (event.error === "not-allowed") {
            setErrorMessage(translations[lang].micDenied);
          } else if (event.error === "no-speech") {
            setErrorMessage(translations[lang].didntCatch);
          } else {
            setErrorMessage("Microphone error: " + event.error);
          }
          setMicState("error");
          setInterimText("");
        };

        recognitionRef.current.onend = () => {
          setMicState(prev => {
            if (prev === "listening") return "idle";
            return prev;
          });
          setInterimText("");
        };
      } else {
        setErrorMessage(translations[lang].notSupported);
        setMicState("error");
      }
    }
  }, [lang, bcp47]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setMicState("idle");
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    // Don't listen while speaking
    if (micState === "speaking") {
      stopSpeaking();
    }

    if (micState === "listening") {
      recognitionRef.current.stop();
      setMicState("idle");
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition already started");
      }
    }
  }, [micState, stopSpeaking]);

  const speak = useCallback((text: string, isScreenReaderMode: boolean = false) => {
    if (!synthRef.current) return;
    
    // Stop listening before speaking
    if (recognitionRef.current && micState === "listening") {
      recognitionRef.current.stop();
    }

    stopSpeaking(); // Cancel any current speech

    if (isScreenReaderMode) {
      // In screen reader mode, we don't speak via TTS.
      // ARIA live region handles it in the UI.
      return;
    }

    // Mask sensitive numbers before speaking
    const maskedText = text.replace(/([A-Z0-9]{4,})(\d{4})/g, "ending in $2");

    // Chunk the text into sentences to read in pieces if it's very long
    // For simplicity in this demo, we'll just read the whole masked text,
    // but in a production system, we'd queue chunks and wait for "next".

    const utterance = new SpeechSynthesisUtterance(maskedText);
    
    // Find appropriate voice
    const voices = synthRef.current.getVoices();
    let selectedVoice = voices.find(v => v.lang === bcp47);
    
    if (!selectedVoice) {
      // Fallback matching language prefix
      const prefix = lang === "ml" ? "ml" : "en";
      selectedVoice = voices.find(v => v.lang.startsWith(prefix));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = bcp47;
    utterance.rate = speed === "slow" ? 0.7 : 1.0;

    utterance.onstart = () => {
      setMicState("speaking");
    };
    
    utterance.onend = () => {
      setMicState("idle");
      // Hands-free conversation: auto start listening after speaking finishes
      if (typeof window !== 'undefined' && (window as any).audioCues) {
        (window as any).audioCues.playStartListening();
      }
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch(e) {}
      }, 500);
    };
    
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setMicState("idle");
    };

    synthRef.current.speak(utterance);
  }, [bcp47, lang, micState, speed, stopSpeaking]);

  const toggleSpeed = () => {
    setSpeed(prev => prev === "normal" ? "slow" : "normal");
  };

  // 10 second timeout for hands-free prompt
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (micState === "listening" && !interimText) {
      timeout = setTimeout(() => {
        if (micState === "listening") {
          recognitionRef.current?.stop();
          speak(lang === "en" ? "Are you still there? Say repeat to hear the question again." : "നിങ്ങൾ അവിടെ ഉണ്ടോ? ചോദ്യം വീണ്ടും കേൾക്കാൻ റിപ്പീറ്റ് എന്ന് പറയുക.", false);
        }
      }, 10000);
    }
    return () => clearTimeout(timeout);
  }, [micState, interimText, lang, speak]);

  return {
    micState,
    errorMessage,
    interimText,
    speed,
    hasVoice,
    toggleListening,
    speak,
    stopSpeaking,
    toggleSpeed,
    setMicState,
  };
}
