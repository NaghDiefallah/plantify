"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ScanContext {
  disease_name?: string;
  confidence?: number;
}

export function ChatInterface() {
  const t = useTranslations("chat");
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatChatError = (err: unknown): string => {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "The assistant took too long to respond. Please try a shorter question.";
    }
    if (err instanceof Error) {
      const lower = err.message.toLowerCase();
      if (lower.includes("failed to fetch") || lower.includes("network")) {
        return "Unable to reach chat service right now. Please try again in a few seconds.";
      }
      return err.message;
    }
    return "Unable to reach chat service right now. Please try again in a few seconds.";
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage.content,
          scan_context: null, // Can be populated with latest scan data
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trimEnd();
            if (data && data !== "[DONE]") {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.sender === "assistant") {
                  lastMsg.content += data;
                }
                return updated;
              });
            }
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      const errorMessage = formatChatError(err);
      setError(errorMessage);
      setIsLoading(false);
      // Remove the assistant message if there was an error
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "assistant" && last.content.length === 0) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-screen bg-background ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <button
            onClick={() => {
              const order = ["en", "zh", "hi", "es", "ar"];
              const currentIndex = Math.max(0, order.indexOf(locale));
              const nextLocale = order[(currentIndex + 1) % order.length];
              router.push("/", { locale: nextLocale });
            }}
            title="Switch language"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border/80 bg-transparent hover:bg-primary/10 transition"
          >
            <Globe className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {t("welcome")}
                </h2>
                <p className="text-muted-foreground mb-4">{t("subtitle")}</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xl px-4 py-3 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-secondary text-foreground rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {msg.timestamp.toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary text-foreground px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-destructive/20 text-destructive px-4 py-3 rounded-lg max-w-xl border border-destructive/30">
                <p className="text-sm">{t("error")}: {error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("inputPlaceholder")}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-border bg-black/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="self-end h-10"
            >
              {isLoading ? t("sending") : t("send")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("hint")}
          </p>
        </div>
      </div>
    </div>
  );
}
