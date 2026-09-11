"use client";

import { useState } from "react";
import { translations } from "../translations";

export default function Home() {
  const [lang, setLang] = useState<"en" | "ml">("en");
  
  // A simple placeholder for messages
  const messages = [
    { id: 1, role: "agent", text: lang === "en" ? "Hello! How can I help you today?" : "നമസ്കാരം! ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?" }
  ];

  const t = translations[lang];

  const toggleLanguage = () => {
    setLang(lang === "en" ? "ml" : "en");
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b-4 border-blue-800 bg-blue-50">
        <h1 className="text-3xl font-extrabold text-blue-900">
          {lang === "en" ? "Sahaya" : "സഹായ"}
        </h1>
        <button
          onClick={toggleLanguage}
          className="text-xl font-bold bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          aria-label={`Switch language to ${t.languageToggle}`}
        >
          {t.languageToggle}
        </button>
      </header>

      {/* Chat Area */}
      <main 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-100"
        aria-label={t.chatAria}
        role="log"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}
          >
            <div 
              className={`max-w-3xl rounded-2xl p-6 text-2xl shadow-md ${
                msg.role === "agent" 
                  ? "bg-white text-gray-900 border-2 border-gray-300" 
                  : "bg-blue-800 text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </main>

      {/* Input Area */}
      <footer className="p-6 bg-white border-t-4 border-gray-300">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          
          {/* Big Microphone Button */}
          <button
            className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl flex items-center justify-center focus:outline-none focus:ring-8 focus:ring-red-400 focus:ring-offset-4 transition-transform transform hover:scale-105 active:scale-95"
            aria-label={t.microphoneAria}
          >
            {/* SVG Microphone Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Text Backup Input */}
          <div className="w-full flex gap-4">
            <input
              type="text"
              placeholder={t.inputPlaceholder}
              className="flex-1 border-4 border-gray-400 rounded-xl p-4 text-2xl text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-200 placeholder-gray-600"
              aria-label={t.inputPlaceholder}
            />
            <button
              className="bg-green-700 hover:bg-green-800 text-white font-bold text-2xl px-10 py-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              {t.sendButton}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
