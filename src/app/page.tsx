"use client";

import { useState, useEffect, useRef } from "react";
import { translations } from "../translations";
import { useSpeech } from "../hooks/useSpeech";

type Source = {
  sourceDocument: string;
  section: string;
  content: string;
  isDemo: boolean;
};

type Message = {
  id: string;
  role: "agent" | "user";
  text: string;
  sources?: Source[];
};

type AgentLog = {
  agent: string;
  action: string;
  timestamp: string;
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "ml">("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const hasInteracted = useRef(false);
  
  // Use a hardcoded session ID for the demo
  const caseId = useRef(`case_${Date.now()}`);

  const t = translations[lang];

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

  const addUserMessage = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    
    setMicState("thinking");

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseId.current,
          text: text,
          language: lang
        })
      });

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.agent_log) {
        setAgentLogs(data.agent_log);
      }
      
      if (data.transcript) {
        // Sync messages from transcript, skipping the initial welcome message from client side 
        // to merge properly, or just append the new transcript messages since the last sync.
        // Actually, the simplest is to just overwrite the history with the new transcript + welcome msg.
        const transcriptMsgs: Message[] = data.transcript.map((t: any, i: number) => ({
          id: `t_${i}`,
          role: t.speaker === 'user' ? 'user' : 'agent',
          text: t.text,
          sources: t.sources
        }));
        setMessages([{ id: "welcome", role: "agent", text: t.welcomeText }, ...transcriptMsgs]);
      } else {
        const agentMsg: Message = { id: (Date.now() + 1).toString(), role: "agent", text: data.reply };
        setMessages(prev => [...prev, agentMsg]);
      }
      
      speak(data.reply);
      
    } catch (err: any) {
      console.error(err);
      setMicState("error");
      const errorMsg: Message = { id: Date.now().toString(), role: "agent", text: "Sorry, there was an error processing your request." };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const toggleSource = (id: string) => {
    setExpandedSources(prev => ({...prev, [id]: !prev[id]}));
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
    }
    toggleListening();
  };

  let micColorClass = "bg-red-600 hover:bg-red-700";
  let statusText = t.statusReady;
  let isPulsing = false;

  if (micState === "listening") {
    micColorClass = "bg-green-600";
    statusText = t.statusListening;
    isPulsing = true;
  } else if (micState === "thinking") {
    micColorClass = "bg-yellow-500";
    statusText = "Agents are thinking...";
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
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      
      {/* Main Chat Area */}
      <div className={`flex flex-col h-full transition-all duration-300 ${showLogs ? 'w-2/3' : 'w-full'}`}>
        <header className="flex justify-between items-center p-6 border-b-4 border-blue-800 bg-blue-50">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-blue-900">
              {lang === "en" ? "Sahaya" : "സഹായ"}
            </h1>
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="ml-4 text-sm font-semibold bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300"
            >
              {showLogs ? 'Hide Agent Logs' : 'Show Agent Logs'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSpeed}
              className="text-lg font-semibold bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all"
            >
              {speed === "normal" ? t.speedNormal : t.speedSlow}
            </button>
            <button
              onClick={toggleLanguage}
              className="text-xl font-bold bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-all"
            >
              {t.languageToggle}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="bg-red-200 text-red-900 p-4 text-xl font-semibold text-center">
            {errorMessage}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-100">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}>
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className={`rounded-2xl p-6 text-2xl shadow-md ${
                    msg.role === "agent" ? "bg-white text-gray-900 border-2 border-gray-300" : "bg-blue-800 text-white"
                  }`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  
                  {/* Source Cards */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button 
                        onClick={() => toggleSource(msg.id)}
                        className="text-sm font-bold text-blue-700 flex items-center gap-1 hover:underline"
                      >
                        {expandedSources[msg.id] ? '▼ Hide Sources' : '▶ Show Sources'} ({msg.sources.length})
                      </button>
                      
                      {expandedSources[msg.id] && (
                        <div className="mt-3 space-y-3">
                          {msg.sources.map((src, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-800">{src.sourceDocument}</span>
                                {src.isDemo && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                                    Demo guideline
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-600 font-semibold text-xs mb-2">Section: {src.section}</div>
                              <div className="text-gray-700 italic border-l-2 border-gray-300 pl-2">"{src.content}"</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "agent" && (
                  <div className="flex gap-4 ml-2">
                    <button onClick={() => speak(msg.text)} className="text-blue-700 font-bold text-lg hover:underline">
                      🔊 {t.readAloud}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {interimText && (
            <div className="flex justify-end">
              <div className="max-w-3xl rounded-2xl p-6 text-2xl shadow-md bg-blue-100 text-blue-900 border-2 border-blue-300 opacity-70 italic">
                {interimText}
              </div>
            </div>
          )}
        </main>

        <footer className="p-6 bg-white border-t-4 border-gray-300">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="text-3xl font-bold text-gray-800 text-center">
              {statusText}
            </div>

            {micState === "speaking" && (
              <button
                onClick={stopSpeaking}
                className="bg-red-100 text-red-800 border-2 border-red-500 font-bold text-xl px-6 py-2 rounded-lg"
              >
                ⏹ {t.stopSpeaking}
              </button>
            )}

            <button
              onClick={handleMicClick}
              className={`w-32 h-32 rounded-full text-white shadow-xl flex items-center justify-center transition-transform transform hover:scale-105 active:scale-95 ${micColorClass} ${isPulsing ? "animate-pulse" : ""}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            <form onSubmit={handleTextSubmit} className="w-full flex gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="flex-1 border-4 border-gray-400 rounded-xl p-4 text-2xl text-gray-900 focus:outline-none focus:border-blue-800"
              />
              <button
                type="submit"
                className="bg-green-700 hover:bg-green-800 text-white font-bold text-2xl px-10 py-4 rounded-xl"
              >
                {t.sendButton}
              </button>
            </form>
          </div>
        </footer>
      </div>

      {/* Agent Activity Sidebar */}
      {showLogs && (
        <div className="w-1/3 h-full bg-gray-900 text-green-400 border-l-4 border-gray-800 flex flex-col font-mono text-sm shadow-inner">
          <div className="p-4 bg-gray-800 font-bold text-white uppercase tracking-wider sticky top-0 border-b border-gray-700">
            Agent Activity Logs
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {agentLogs.length === 0 ? (
              <p className="text-gray-500 italic">Awaiting agent activity...</p>
            ) : (
              agentLogs.map((log, index) => (
                <div key={index} className="border-b border-gray-800 pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-blue-300">[{log.agent}]</span>
                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-gray-300 break-words">{log.action}</div>
                </div>
              ))
            )}
            {micState === "thinking" && (
              <div className="animate-pulse text-yellow-500 mt-4">
                &gt; Agents are currently processing...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
