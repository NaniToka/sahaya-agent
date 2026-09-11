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
        // Handle cases where it's already started
        console.warn("Recognition already started");
      }
    }
  }, [micState]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setMicState("idle");
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    
    // Stop listening before speaking
    if (recognitionRef.current && micState === "listening") {
      recognitionRef.current.stop();
    }

    stopSpeaking(); // Cancel any current speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find appropriate voice
    const voices = synthRef.current.getVoices();
    let selectedVoice = voices.find(v => v.lang === bcp47);
    
    if (!selectedVoice) {
      // Fallback matching language prefix (e.g. any ml voice for ml-IN)
      const prefix = lang === "ml" ? "ml" : "en";
      selectedVoice = voices.find(v => v.lang.startsWith(prefix));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = bcp47;
    utterance.rate = speed === "slow" ? 0.7 : 1.0;

    utterance.onstart = () => setMicState("speaking");
    utterance.onend = () => setMicState("idle");
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setMicState("idle");
    };

    synthRef.current.speak(utterance);
  }, [bcp47, lang, micState, speed, stopSpeaking]);

  const toggleSpeed = () => {
    setSpeed(prev => prev === "normal" ? "slow" : "normal");
  };

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
