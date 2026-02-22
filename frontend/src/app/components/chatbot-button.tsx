import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "./ui/button";

const DEFAULT_API_BASE = "https://aura-arf5n.ondigitalocean.app";

type Message = { role: "user" | "bot"; text: string };

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);
    setError(null);

    try {
      const base = DEFAULT_API_BASE.replace(/\/$/, "");
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          (errBody as { detail?: string }).detail || `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as { chatbot_response?: string };
      const botText =
        data.chatbot_response ?? (data as Record<string, string>).response ?? "No response.";
      setMessages((prev) => [...prev, { role: "bot", text: botText }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Something went wrong.";
      setError(errMsg);
      setMessages((prev) => [...prev, { role: "bot", text: `Error: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chatbot Button - bottom-left so it doesn't overlap voice assistant */}
      <div className="fixed bottom-6 left-6 z-50">
        <span
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] opacity-50 blur-xl animate-pulse"
          aria-hidden
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] text-white p-4 rounded-2xl shadow-2xl shadow-[#00d4ff]/30 z-50 transition-all duration-300 hover:scale-105 hover:shadow-[#00d4ff]/50 active:scale-95"
          aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 top-auto w-[min(calc(100vw-3rem),400px)] max-h-[70vh] flex flex-col bg-[#0a0f1e]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 z-50">
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#00d4ff]" />
              <h3 className="text-base font-semibold text-white">AURA Chat</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <p className="text-sm text-white/50">Ask a question about AURA or clinical research.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white"
                      : "bg-white/10 text-white/90 border border-white/10"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-sm bg-white/10 text-white/70 border border-white/10">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg mx-4 mb-2 px-3 py-2 shrink-0">
              {error}
            </p>
          )}

          <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question…"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/20 outline-none text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] hover:opacity-90 text-white rounded-xl px-4"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
