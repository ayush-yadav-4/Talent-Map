"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentApi, api } from "@/lib/api";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  History, 
  Trash2, 
  Bot, 
  User as UserIcon,
  Loader2,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cardSurfaceClass, formInputClass } from "@/lib/ui";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatSession {
  _id: string;
  title: string;
  updated_at: string;
  messages: ChatMessage[];
}

export default function AICoachPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 1. Fetch all sessions
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["coach-sessions"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/agent/coach/sessions");
      return data as ChatSession[];
    }
  });

  // 2. Fetch specific session details (messages)
  const { data: currentSession, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["coach-session", selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return null;
      const { data } = await api.get(`/api/v1/agent/coach/sessions/${selectedSessionId}`);
      return data as ChatSession;
    },
    enabled: !!selectedSessionId
  });

  // 3. Mutation: Send message
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post("/api/v1/agent/coach/chat", {
        message,
        session_id: selectedSessionId
      });
      return data;
    },
    onSuccess: (data) => {
      setInput("");
      if (!selectedSessionId) {
        setSelectedSessionId(data.session_id);
      }
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["coach-session", data.session_id || selectedSessionId] });
    },
    onError: () => {
      toast.error("Coach is offline. Please try again later.");
    }
  });

  // 4. Mutation: Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/agent/coach/sessions/${id}`);
    },
    onSuccess: (_, id) => {
      if (selectedSessionId === id) setSelectedSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
      toast.success("Conversation deleted");
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages, chatMutation.isPending]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
  };

  const startNewChat = () => {
    setSelectedSessionId(null);
    setInput("");
  };

  const currentMessages = currentSession?.messages || [];

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-in fade-in duration-500">
      {/* Session Sidebar */}
      <aside className={cn(cardSurfaceClass, "w-80 flex flex-col overflow-hidden border-slate-200 dark:border-tw-border bg-white/50 dark:bg-tw-card/50 backdrop-blur-xl")}>
        <div className="p-4 border-b border-slate-100 dark:border-tw-border flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" /> History
          </h2>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={startNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingSessions ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : !sessions ? (
            <div className="text-center p-8 space-y-2">
              <p className="text-xs text-red-500 font-medium">Connection Error</p>
              <Button size="sm" variant="ghost" className="text-[10px]" onClick={() => queryClient.invalidateQueries({ queryKey: ["coach-sessions"] })}>
                Retry
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-8 text-xs text-slate-500">
              No conversations yet
            </div>
          ) : (
            sessions.map((s) => (
              <div 
                key={s._id}
                onClick={() => setSelectedSessionId(s._id)}
                className={cn(
                  "group relative p-3 rounded-xl cursor-pointer transition-all duration-200 text-sm",
                  selectedSessionId === s._id 
                    ? "bg-brand-50 dark:bg-tw-raised text-brand-700 dark:text-tw-blue shadow-sm" 
                    : "hover:bg-slate-50 dark:hover:bg-tw-raised/50 text-slate-600 dark:text-tw-muted"
                )}
              >
                <div className="flex items-center gap-3 pr-8">
                  <MessageCircle className={cn("h-4 w-4 shrink-0", selectedSessionId === s._id ? "text-brand-500" : "text-slate-400")} />
                  <span className="truncate font-medium">{s.title}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSessionMutation.mutate(s._id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={cn(cardSurfaceClass, "flex-1 flex flex-col overflow-hidden bg-white/30 dark:bg-tw-card/30 backdrop-blur-sm border-slate-200 dark:border-tw-border")}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-tw-border bg-white/80 dark:bg-tw-card/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-tw-text">TalentMap AI Coach</h1>
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Online & Analyzing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-tw-raised rounded-full text-[10px] font-bold text-slate-500">
            <Sparkles className="h-3 w-3 text-brand-500" /> POWERED BY GEMINI
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {selectedSessionId && isLoadingMessages ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : currentMessages.length === 0 && !chatMutation.isPending ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="p-4 bg-brand-50 dark:bg-tw-blue/10 rounded-full">
                <Bot className="h-8 w-8 text-brand-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-tw-text">How can I help you today?</h3>
                <p className="text-sm text-slate-500 dark:text-tw-muted mt-2">
                  Ask me about your skill gaps, career path, or how to prepare for your next assessment.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full mt-4">
                {[
                  "How do I improve my Python skills?",
                  "What's my next career milestone?",
                  "Analyze my skill gaps"
                ].map(q => (
                  <button 
                    key={q}
                    onClick={() => { setInput(q); chatMutation.mutate(q); }}
                    className="p-3 text-xs text-left border border-slate-200 dark:border-tw-border rounded-xl hover:bg-brand-50 dark:hover:bg-tw-blue/10 hover:border-brand-200 transition-all text-slate-600 dark:text-tw-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {currentMessages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 max-w-3xl",
                    m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    m.role === "user" ? "bg-slate-200 text-slate-600" : "bg-brand-600 text-white"
                  )}>
                    {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    m.role === "user" 
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/10 rounded-tr-none" 
                      : "bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border text-slate-800 dark:text-tw-text shadow-sm rounded-tl-none"
                  )}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex gap-4 mr-auto animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-tw-card border border-slate-100 dark:border-tw-border text-slate-400 text-sm">
                    Coach is thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white/50 dark:bg-tw-card/50 border-t border-slate-100 dark:border-tw-border">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <input 
              type="text"
              placeholder="Type your message..."
              className={cn(formInputClass, "pr-12 h-12 shadow-sm focus:ring-brand-500")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1.5 h-9 w-9 bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20"
              disabled={!input.trim() || chatMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-3 text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">
            I am an AI. Please verify important career decisions with a human mentor.
          </p>
        </div>
      </main>
    </div>
  );
}
