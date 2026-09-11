"use client";

import { useState, useEffect, useRef } from "react";
import { translations } from "../translations";
import { useSpeech } from "../hooks/useSpeech";

type Message = {
  id: string;
  role: "agent" | "user";
  text: string;
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "ml">("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const hasInteracted = useRef(false);

  const t = translations[lang];

  // Initialize welcome message when language changes or on load
  useEffect(() => {
    setMessages([{ id: "welcome", role: "agent", text: t.welcomeText }]);
  }, [t.welcomeText]);

  const handleTranscript = (text: string) => {
    addUserMessage(text);
  };

  const {
    micState,
    errorMessage,
    interimText,
    speed,
    hasVoice,
    toggleListening,
    speak,
    stopSpeaking,
    toggleSpeed,
    setMicState
  } = useSpeech({ lang, onTranscript: handleTranscript });

  const addUserMessage = (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    
    // Simulate AI thinking and replying
    setMicState("thinking");
    setTimeout(() => {
      const replyText = `${t.heardPrefix}${text}`;
      const agentMsg: Message = { id: (Date.now() + 1).toString(), role: "agent", text: replyText };
      setMessages(prev => [...prev, agentMsg]);
      speak(replyText);
    }, 1000);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    hasInteracted.current = true;
    addUserMessage(inputValue.trim());
    setInputValue("");
  };

  const toggleLanguage = () => {
    hasInteracted.current = true;
    stopSpeaking();
    setLang(lang === "en" ? "ml" : "en");
  };

  const handleMicClick = () => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      // If idle and this is the first interaction, we can optionally speak the welcome text
      // but only if we are about to listen (we actually want them to hear the welcome or just start listening)
    }
    toggleListening();
  };

  // Determine Mic Button color and pulsing animation
  let micColorClass = "bg-red-600 hover:bg-red-700";
  let statusText = t.statusReady;
  let isPulsing = false;

  if (micState === "listening") {
    micColorClass = "bg-green-600";
    statusText = t.statusListening;
    isPulsing = true;
  } else if (micState === "thinking") {
    micColorClass = "bg-yellow-500";
    statusText = t.statusThinking;
    isPulsing = true;
  } else if (micState === "speaking") {
    micColorClass = "bg-blue-600";
    statusText = t.statusSpeaking;
    isPulsing = true;
  } else if (micState === "error") {
    micColorClass = "bg-gray-500";
    statusText = "Error. Please try text input.";
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b-4 border-blue-800 bg-blue-50">
        <h1 className="text-3xl font-extrabold text-blue-900">
          {lang === "en" ? "Sahaya" : "സഹായ"}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSpeed}
            className="text-lg font-semibold bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-400 transition-all"
          >
            {speed === "normal" ? t.speedNormal : t.speedSlow}
          </button>
          <button
            onClick={toggleLanguage}
            className="text-xl font-bold bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            aria-label={`Switch language to ${t.languageToggle}`}
          >
            {t.languageToggle}
          </button>
        </div>
      </header>

      {/* Warning/Error Banners */}
      {!hasVoice && lang === "ml" && (
        <div className="bg-yellow-200 text-yellow-900 p-4 text-xl font-semibold text-center" role="alert">
          {t.noVoiceMsg}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-200 text-red-900 p-4 text-xl font-semibold text-center" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Chat Area */}
      <main 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-100"
        aria-label={t.chatAria}
        aria-live="polite"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}
          >
            <div className="flex flex-col gap-2 max-w-3xl">
              <div 
                className={`rounded-2xl p-6 text-2xl shadow-md ${
                  msg.role === "agent" 
                    ? "bg-white text-gray-900 border-2 border-gray-300" 
                    : "bg-blue-800 text-white"
                }`}
              >
                {msg.text}
              </div>
              
              {/* Agent Message Controls */}
              {msg.role === "agent" && (
                <div className="flex gap-4 ml-2">
                  <button 
                    onClick={() => speak(msg.text)}
                    className="text-blue-700 hover:text-blue-900 font-bold text-lg focus:outline-none focus:underline"
                    aria-label={t.readAloud}
                  >
                    🔊 {t.readAloud}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Interim Text */}
        {interimText && (
          <div className="flex justify-end">
            <div className="max-w-3xl rounded-2xl p-6 text-2xl shadow-md bg-blue-100 text-blue-900 border-2 border-blue-300 opacity-70 italic">
              {interimText}
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-6 bg-white border-t-4 border-gray-300">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          
          {/* Status Text Display */}
          <div className="text-3xl font-bold text-gray-800 text-center" aria-live="assertive">
            {statusText}
          </div>

          {/* Stop Speaking Button (visible only when speaking) */}
          {micState === "speaking" && (
            <button
              onClick={stopSpeaking}
              className="bg-red-100 text-red-800 border-2 border-red-500 font-bold text-xl px-6 py-2 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-4 focus:ring-red-300 transition-colors"
            >
              ⏹ {t.stopSpeaking}
            </button>
          )}

          {/* Big Microphone Button */}
          <button
            onClick={handleMicClick}
            className={`w-32 h-32 rounded-full text-white shadow-xl flex items-center justify-center focus:outline-none focus:ring-8 focus:ring-offset-4 transition-transform transform hover:scale-105 active:scale-95
              ${micColorClass} 
              ${isPulsing ? "animate-pulse" : ""}
            `}
            aria-label={statusText + ". " + t.microphoneAria}
          >
            {/* SVG Microphone Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Text Backup Input */}
          <form onSubmit={handleTextSubmit} className="w-full flex gap-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="flex-1 border-4 border-gray-400 rounded-xl p-4 text-2xl text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-200 placeholder-gray-600"
              aria-label={t.inputPlaceholder}
            />
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white font-bold text-2xl px-10 py-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              {t.sendButton}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
