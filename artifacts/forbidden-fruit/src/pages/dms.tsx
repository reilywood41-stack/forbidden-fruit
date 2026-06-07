import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Send, Lock, MessageCircle, Crown, ChevronLeft, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const apiBase = (import.meta.env.VITE_API_URL as string) || "";
const token = () => localStorage.getItem("token") || "";

function Avatar({ name, url, size = "w-10 h-10" }: { name: string; url?: string | null; size?: string }) {
  if (url) {
    return <img src={url} alt={name} className={`${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full crimson-gradient-bg flex items-center justify-center font-bold text-white text-sm shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function DMs() {
  return (
    <ProtectedRoute>
      <DMsContent />
    </ProtectedRoute>
  );
}

function DMsContent() {
  const { user } = useAuth();
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  const { data: modelsData, isLoading: modelsLoading } = useQuery<{ models: any[] }>({
    queryKey: ["/api/models"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/models`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Failed to load models");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const models = modelsData?.models ?? [];
  const selectedModel = models.find((m: any) => m.id === selectedModelId);
  const tier = user?.membershipTier || "none";
  const canSend = tier === "silver" || tier === "gold";
  const showChat = !!selectedModelId;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full">
      {/* Page header — hidden on mobile when in a chat */}
      <div className={`flex items-center gap-3 mb-4 sm:mb-5 ${showChat ? "hidden sm:flex" : "flex"}`}>
        <div className="w-9 h-9 rounded-full crimson-gradient-bg flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-white leading-none">Chat</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Message your favourite models directly</p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-3 h-[calc(100dvh-200px)] sm:h-[calc(100vh-230px)] min-h-[460px]">

        {/* ── Model list ── */}
        <div className={`glass-panel rounded-2xl overflow-hidden flex flex-col
          w-full sm:w-64 sm:shrink-0
          ${showChat ? "hidden sm:flex" : "flex"}`}>

          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Models</p>
            {!canSend && (
              <span className="text-[10px] bg-primary/15 border border-primary/20 text-primary rounded-full px-2 py-0.5 font-bold">
                {tier === "bronze" ? "Bronze" : "Free"}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {modelsLoading ? (
              <div className="flex justify-center py-10"><Spinner size="sm" /></div>
            ) : models.length === 0 ? (
              <div className="p-6 text-center">
                <User className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">No models available yet</p>
              </div>
            ) : (
              models.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors text-left
                    ${selectedModelId === m.id
                      ? "bg-primary/15 border-l-2 border-l-primary"
                      : "hover:bg-white/5 active:bg-white/10"}`}
                >
                  <Avatar name={m.name} url={m.avatarUrl} size="w-9 h-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                    {m.age && <p className="text-[11px] text-muted-foreground">{m.age} y/o</p>}
                  </div>
                  {!canSend && <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Upgrade CTA at bottom of model list */}
          {!canSend && models.length > 0 && (
            <div className="p-3 border-t border-white/5 shrink-0">
              <Link href="/membership">
                <Button className="w-full crimson-gradient-bg border-0 h-9 text-xs gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  {tier === "bronze" ? "Upgrade to Silver to Chat" : "Join to Chat"}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Chat panel ── */}
        <div className={`flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden
          ${!showChat ? "hidden sm:flex" : "flex"}`}>

          {!selectedModel ? (
            /* Empty state (desktop only since mobile hides this panel) */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-primary/60" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Select a model</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  {canSend
                    ? "Choose a model from the left to open your private conversation."
                    : "Browse models on the left. Silver & Gold members can send messages."}
                </p>
              </div>
            </div>
          ) : !canSend ? (
            /* Upgrade overlay for bronze / free tier */
            <UpgradeOverlay
              model={selectedModel}
              tier={tier}
              onBack={() => setSelectedModelId(null)}
            />
          ) : (
            /* Full chat */
            <ChatThread
              model={selectedModel}
              tier={tier}
              onBack={() => setSelectedModelId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Upgrade overlay (bronze / free) ────────────────────────── */
function UpgradeOverlay({ model, tier, onBack }: { model: any; tier: string; onBack: () => void }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="sm:hidden text-muted-foreground hover:text-white p-1 -ml-1 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Avatar name={model.name} url={model.avatarUrl} size="w-8 h-8" />
        <p className="font-bold text-white text-sm truncate">{model.name}</p>
      </div>

      {/* Upgrade CTA */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
        <div className="mb-5">
          <Avatar name={model.name} url={model.avatarUrl} size="w-20 h-20 sm:w-24 sm:h-24" />
        </div>

        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>

        <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-2">
          Chat with {model.name}
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-2 leading-relaxed">
          Direct messages are exclusive to{" "}
          <span className="text-gray-300 font-semibold">Silver</span> and{" "}
          <span className="text-yellow-400 font-semibold">Gold</span> members.
        </p>
        {tier === "bronze" && (
          <p className="text-xs text-muted-foreground/60 mb-6">
            You&apos;re on Bronze — one upgrade away from private chats.
          </p>
        )}
        {tier !== "bronze" && <div className="mb-6" />}

        <Link href="/membership" className="w-full max-w-xs">
          <Button className="w-full crimson-gradient-bg border-0 h-12 text-sm font-bold gap-2">
            <Crown className="w-4 h-4" />
            {tier === "bronze" ? "Upgrade to Silver" : "Get Membership"}
          </Button>
        </Link>

        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
            Silver — chat access
          </span>
          <span className="hidden sm:block">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            Gold — priority replies
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Full chat thread (silver / gold) ───────────────────────── */
function ChatThread({ model, tier, onBack }: { model: any; tier: string; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<{ messages: any[]; canSend: boolean }>({
    queryKey: ["/api/dms", model.id],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/dms?modelId=${model.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sendMsg = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`${apiBase}/api/dms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ message, modelId: model.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/dms", model.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dms/unread"] });
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = () => {
    if (draft.trim() && !sendMsg.isPending) sendMsg.mutate(draft.trim());
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="sm:hidden text-muted-foreground hover:text-white p-1 -ml-1 transition-colors"
          aria-label="Back to models"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Avatar name={model.name} url={model.avatarUrl} size="w-8 h-8" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white text-sm leading-none truncate">{model.name}</p>
          {model.age && <p className="text-[11px] text-muted-foreground mt-0.5">{model.age} y/o</p>}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-primary font-bold">Private</span>
        </div>
      </div>

      {/* Silver → Gold upsell banner */}
      {tier === "silver" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400/5 border-b border-yellow-400/15 shrink-0">
          <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <p className="text-xs text-yellow-200/70 flex-1 leading-snug">
            <strong className="text-yellow-300">Gold</strong> members get priority replies from {model.name}.
          </p>
          <Link href="/membership">
            <button className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-0.5 transition-colors shrink-0 whitespace-nowrap">
              Upgrade <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 overscroll-contain">
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner size="sm" /></div>
        ) : !data?.messages.length ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-3">
            <Avatar name={model.name} url={model.avatarUrl} size="w-14 h-14" />
            <div>
              <p className="text-white font-semibold mb-1">{model.name}</p>
              <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                Say hello! {model.name} will reply as soon as possible.
                {tier === "silver" && " Gold members get priority."}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {data.messages.map((msg: any) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex items-end gap-2 ${msg.fromAdmin ? "justify-start" : "justify-end"}`}
              >
                {msg.fromAdmin && (
                  <div className="shrink-0 mb-0.5">
                    <Avatar name={model.name} url={model.avatarUrl} size="w-6 h-6" />
                  </div>
                )}
                <div className={`max-w-[78%] sm:max-w-[72%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${
                  msg.fromAdmin
                    ? "bg-white/10 text-white rounded-tl-sm"
                    : "crimson-gradient-bg text-white rounded-tr-sm"
                }`}>
                  {msg.fromAdmin && (
                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">{model.name}</p>
                  )}
                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 sm:px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={`Message ${model.name}…`}
          className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
        <Button
          onClick={handleSend}
          disabled={!draft.trim() || sendMsg.isPending}
          className="crimson-gradient-bg border-0 px-3 sm:px-4 shrink-0 h-auto"
        >
          {sendMsg.isPending ? <Spinner size="xs" className="text-white" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </>
  );
}
