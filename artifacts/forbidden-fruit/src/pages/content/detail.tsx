import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useGetContentById, useGetComments, useAddComment } from "@workspace/api-client-react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import {
  Lock, Send, User, ArrowLeft,
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Loader2, Heart, Eye, Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";

/* ─── Utility ─────────────────────────────────────────────────── */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/* ─── Custom Video Player ─────────────────────────────────────── */
function VideoPlayer({
  src,
  poster,
  isPhoneAspect,
  modelName,
}: {
  src: string;
  poster?: string;
  isPhoneAspect?: boolean;
  modelName?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showEndCTA, setShowEndCTA] = useState(false);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const showAndScheduleHide = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);
  useEffect(() => { if (!playing) setShowControls(true); }, [playing]);

  const startVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    setShowEndCTA(false);
    v.play().catch(() => {});
    setPlaying(true);
    showAndScheduleHide();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!started) { startVideo(); return; }
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
    showAndScheduleHide();
  };

  const handleProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current!.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !muted;
    setMuted(m => !m);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (videoRef.current) videoRef.current.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const aspectClass = isPhoneAspect ? "aspect-[9/16]" : "aspect-video";
  const maxHeightClass = isPhoneAspect ? "max-h-[85vh]" : "";

  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${aspectClass} ${maxHeightClass} mx-auto overflow-hidden group`}
      onMouseMove={showAndScheduleHide}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={showAndScheduleHide}
    >
      {/* Video element — preload="none" saves mobile data */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        className="w-full h-full object-contain"
        controlsList="nodownload"
        playsInline
        onTimeUpdate={e => {
          setCurrentTime(e.currentTarget.currentTime);
          const buf = e.currentTarget.buffered;
          if (buf.length > 0) setBuffered((buf.end(buf.length - 1) / e.currentTarget.duration) * 100);
        }}
        onDurationChange={e => setDuration(e.currentTarget.duration)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onEnded={() => { setPlaying(false); setShowControls(true); setShowEndCTA(true); }}
        onPlay={() => { setPlaying(true); setStarted(true); }}
        onPause={() => setPlaying(false)}
      />

      {/* Pre-play thumbnail tap-to-start overlay */}
      {!started && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10 bg-black/20"
          onClick={startVideo}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
              <Play className="w-9 h-9 text-white fill-white ml-1" />
            </div>
            <span className="text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
              Tap to play
            </span>
          </div>
        </div>
      )}

      {/* Buffering spinner */}
      {buffering && started && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-3 rounded-full bg-black/60 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Video-end CTA overlay */}
      {showEndCTA && (
        <div className="absolute inset-0 z-30 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <div className="text-5xl mb-4">💋</div>
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3 leading-tight">
            {modelName ? `${modelName} isn't done with you...` : "She's not done with you yet..."}
          </h3>
          <p className="text-gray-400 mb-8 max-w-xs text-sm leading-relaxed">
            Book a private one-on-one call and experience something you won't forget. She's available right now.
          </p>
          <Link href="/bookings">
            <button className="px-8 py-4 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-base hover:opacity-90 transition-opacity shadow-2xl flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4" /> Book a Private Call →
            </button>
          </Link>
          <button
            onClick={() => {
              setShowEndCTA(false);
              setStarted(false);
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.pause();
              }
            }}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ↩ Watch Again
          </button>
        </div>
      )}

      {/* Center tap area (only when started and no CTA) */}
      {started && !showEndCTA && (
        <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />
      )}

      {/* Controls overlay */}
      {started && !showEndCTA && (
        <div
          className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="relative px-4 pb-4 pt-8 space-y-2">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="relative h-1.5 bg-white/20 rounded-full cursor-pointer hover:h-2.5 transition-all group/bar"
              onClick={handleProgress}
            >
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
              <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
              />
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                {playing
                  ? <Pause className="w-5 h-5 text-white fill-white" />
                  : <Play className="w-5 h-5 text-white fill-white" />}
              </button>
              <span className="text-xs text-white/80 font-mono tabular-nums">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
              <div className="flex-1" />
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={toggleMute} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-white/80" />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                  onChange={handleVolume}
                  className="w-20 accent-primary cursor-pointer"
                />
              </div>
              <button onClick={toggleFullscreen} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                {isFullscreen ? <Minimize className="w-4 h-4 text-white/80" /> : <Maximize className="w-4 h-4 text-white/80" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone aspect label */}
      {isPhoneAspect && (
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[10px] text-white/50 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
            Portrait
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Like Button ─────────────────────────────────────────────── */
function LikeButton({ id, initialLiked, initialCount }: { id: number; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";

  const toggle = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/content/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to toggle like");
      return res.json() as Promise<{ liked: boolean; likeCount: number }>;
    },
    onMutate: () => {
      setLiked(l => !l);
      setCount(c => liked ? Math.max(0, c - 1) : c + 1);
    },
    onSuccess: (data) => {
      setLiked(data.liked);
      setCount(data.likeCount);
    },
    onError: () => {
      setLiked(l => !l);
      setCount(c => liked ? c + 1 : Math.max(0, c - 1));
    },
  });

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-semibold text-sm ${
        liked
          ? "bg-primary/20 border-primary/40 text-primary"
          : "bg-white/5 border-white/10 text-muted-foreground hover:border-primary/30 hover:text-primary"
      }`}
    >
      <Heart className={`w-4 h-4 transition-all ${liked ? "fill-current" : ""}`} />
      <span>{formatCount(count)}</span>
    </button>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function ContentDetail() {
  const [, params] = useRoute("/content/:id");
  const id = Number(params?.id);
  const { data: item, isLoading } = useGetContentById(id, { query: { enabled: !!id } as any });
  const { data: comments, isLoading: isCommentsLoading } = useGetComments(id, { query: { enabled: !!id } as any });
  const { user } = useAuth();

  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  const addComment = useAddComment({
    mutation: {
      onSuccess: () => {
        setCommentText("");
        queryClient.invalidateQueries({ queryKey: [`/api/content/${id}/comments`] });
      },
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-5xl mx-auto px-4 py-8 w-full space-y-4">
          <div className="h-6 w-28 bg-card animate-pulse rounded" />
          <div className="aspect-video bg-card animate-pulse rounded-2xl" />
          <div className="h-8 w-2/3 bg-card animate-pulse rounded" />
          <div className="h-4 w-full bg-card animate-pulse rounded" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!item) return null;

  const tierValues: Record<string, number> = { none: 0, free: 0, bronze: 1, silver: 2, gold: 3 };
  const isLocked = item.tier !== "free" && (tierValues[item.tier] ?? 0) > (tierValues[user?.membershipTier || "none"] ?? 0);
  const isPhoneAspect = (item as any).isPhoneAspect ?? false;
  const modelSlug = (item as any).modelSlug;
  const modelName = (item as any).modelName as string | undefined;

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-8 w-full">
        <Link
          href="/content"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vault
        </Link>

        {/* Media Player / Viewer */}
        <div className={`rounded-2xl overflow-hidden bg-black border border-border shadow-2xl mb-8 ${isPhoneAspect ? "max-w-sm mx-auto" : ""}`}>
          {isLocked ? (
            <div className="aspect-video relative flex flex-col items-center justify-center">
              <img
                src={item.thumbnailUrl || ""}
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40"
                alt=""
              />
              <div className="relative z-10 flex flex-col items-center text-center p-6 glass-panel rounded-2xl max-w-sm">
                <Lock className="w-12 h-12 text-primary mb-4" />
                <h2 className="text-2xl font-display font-bold text-white mb-2">Content Locked</h2>
                <p className="text-muted-foreground mb-6">
                  This content is exclusive to <span className="text-primary font-bold capitalize">{item.tier}</span> members.
                </p>
                <Link
                  href="/membership"
                  className="px-6 py-3 rounded-full text-white font-bold crimson-gradient-bg w-full text-center"
                >
                  Upgrade Membership
                </Link>
              </div>
            </div>
          ) : (
            <>
              {item.type === "video" && (
                <VideoPlayer
                  src={item.videoUrl || ""}
                  poster={item.thumbnailUrl || ""}
                  isPhoneAspect={isPhoneAspect}
                  modelName={modelName}
                />
              )}
              {item.type === "image" && (
                <img
                  src={(item.imageUrls as string[])[0]}
                  alt={item.title}
                  className="w-full max-h-[80vh] object-contain"
                />
              )}
              {item.type === "gallery" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                  {(item.imageUrls as string[]).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${item.title} ${idx}`}
                      loading="lazy"
                      className="w-full aspect-square object-cover rounded-md border border-white/10"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="mb-12 pb-8 border-b border-border">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
              {item.tier} Tier
            </span>
            {(item.tags as string[]).map((tag) => (
              <span key={tag} className="px-3 py-1 text-xs rounded-full bg-card border border-border text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">{item.title}</h1>
          {item.description && (
            <p className="text-gray-400 text-lg leading-relaxed">{item.description}</p>
          )}

          {/* Stats + Like row */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              {formatCount((item as any).viewCount || 0)} views
            </span>
            {!isLocked && (
              <LikeButton
                id={id}
                initialLiked={(item as any).isLiked ?? false}
                initialCount={(item as any).likeCount ?? 0}
              />
            )}
          </div>

          {modelSlug && modelName && (
            <div className="mt-4">
              <Link
                href={`/models/${modelSlug}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-semibold"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                {modelName}
              </Link>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="max-w-3xl">
          <h3 className="text-2xl font-display font-bold text-white mb-6">
            Comments ({item.commentCount})
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addComment.mutate({ id, data: { text: commentText } });
            }}
            className="flex gap-4 mb-8"
          >
            <div className="w-10 h-10 rounded-full bg-border flex-shrink-0 flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 relative">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a comment..."
                className="pr-12 bg-card border-border h-12 rounded-xl"
                disabled={isLocked}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary hover:bg-primary/10"
                disabled={!commentText.trim() || isLocked || addComment.isPending}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>

          <div className="space-y-6">
            {isCommentsLoading ? (
              <p className="text-muted-foreground">Loading comments...</p>
            ) : (
              comments?.comments.map((c) => (
                <div key={c.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-white">{c.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
