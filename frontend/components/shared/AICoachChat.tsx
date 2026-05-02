"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import { Button } from "@/components/ui";
import { MessageSquare, Send, X, Bot, User, Loader2, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";

import ReactMarkdown from "react-markdown";

export function AICoachChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen, isMinimized]);

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const { data } = await agentApi.coach.chat(msg, history);
      return data.response;
    },
    onSuccess: (response) => {
      setHistory((prev) => [...prev, { role: "assistant", content: response }]);
    },
  });

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;
    const userMsg = message.trim();
    setHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setMessage("");
    chatMutation.mutate(userMsg);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-brand-600 text-white shadow-2xl flex items-center justify-center hover:bg-brand-700 transition-all hover:scale-110 z-50 group"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="absolute right-full mr-3 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Talk to AI Coach
        </span>
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-6 right-6 w-[450px] max-w-[calc(100vw-3rem)] bg-white dark:bg-tw-card rounded-2xl shadow-2xl border border-slate-200 dark:border-tw-border overflow-hidden z-50 flex flex-col transition-all duration-300",
        isMinimized ? "h-14" : "h-[600px]"
      )}
    >
      {/* Header */}
      <div className="bg-brand-600 dark:bg-tw-blue p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <p className="text-sm font-bold">TalentMap AI Coach</p>
            {!isMinimized && <p className="text-[10px] opacity-80 flex items-center gap-1"><Sparkles className="h-2 w-2" /> Powered by Gemini</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-tw-raised/30"
          >
            {history.length === 0 && (
              <div className="text-center py-10 px-6">
                <div className="h-12 w-12 bg-brand-100 dark:bg-tw-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-brand-600 dark:text-tw-blue" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-tw-text">Hello! I'm your career coach.</p>
                <p className="text-xs text-slate-500 dark:text-tw-muted mt-2">
                  Ask me about your skill gaps, career path, or how to prepare for your next project.
                </p>
              </div>
            )}
            
            {history.map((msg, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-start gap-2",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                  msg.role === "user" ? "bg-slate-200" : "bg-brand-100 text-brand-600"
                )}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm overflow-hidden",
                  msg.role === "user" 
                    ? "bg-brand-600 text-white rounded-tr-none" 
                    : "bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border text-slate-800 dark:text-tw-text shadow-sm rounded-tl-none"
                )}>
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          strong: ({node, ...props}) => <strong className="block text-[15px] font-bold text-brand-700 dark:text-brand-400 mt-4 mb-1 leading-tight first:mt-0" {...props} />,
                          em: ({node, ...props}) => <em className="block text-[14px] font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1 not-italic leading-tight first:mt-0" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="block text-lg font-bold text-brand-800 dark:text-brand-300 mt-4 mb-2 first:mt-0" {...props} />,
                          h2: ({node, ...props}) => <h2 className="block text-base font-bold text-brand-700 dark:text-brand-400 mt-4 mb-2 first:mt-0" {...props} />,
                          h3: ({node, ...props}) => <h3 className="block text-[15px] font-bold text-brand-700 dark:text-brand-400 mt-3 mb-1 first:mt-0" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mt-1">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white dark:bg-tw-card border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 dark:border-tw-border bg-white dark:bg-tw-card">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className={cn(formInputClass, "flex-1 text-sm h-10")}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || chatMutation.isPending}
                className="h-10 w-10 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

