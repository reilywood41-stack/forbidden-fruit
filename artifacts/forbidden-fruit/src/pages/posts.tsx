import { useState, useRef } from "react";
import { Link } from "wouter";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { SEOHead } from "@/components/seo-head";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart, Lock, Play, Crown, Rss, User, Pin,
  Image as ImageIcon, Video as VideoIcon,
  Edit2, X, Trash2, Loader2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const apiBase = (import.meta.env.VITE_API_URL as string) || "";

const TIER_LEVEL: Record<string, number> = { none: 0, free: 0, bronze: 1, silver: 2, gold: 3 };
const TIER_LABEL: Record<string, string> = { free: "Free", bronze: "Bronze", silver: "Silver", gold: "Gold" };
const TIER_COLOR: Record<string, string> = {
  free: "text-green-400 border-green-400/30 bg-green-400/10",
  bronze: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  silver: "text-gray-300 border-gray-300/30 bg-gray-300/10",
  gold: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

interface Post {
  id: number;
  modelId: number | null;
  modelName: string | null;
  modelAvatar: string | null;
  modelSlug: string | null;
  caption: string | null;
  mediaUrls: string[];
  mediaType: string;
  tier: string;
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isLiked: boolean;
  createdAt: string;
}

function LikeBtn({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.isLiked);
  const [count, setCount] = useState(post.likeCount);

  const toggle = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ liked: boolean; likeCount: number }>;
    },
    onMutate: () => {
      setLiked((l) => !l);
      setCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    },
    onSuccess: (data) => {
      setLiked(data.liked);
      setCount(data.likeCount);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => {
      setLiked((l) => !l);
      setCount((c) => (liked ? c + 1 : Math.max(0, c - 1)));
    },
  });

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
        liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
      }`}
    >
      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      <span>{formatCount(count)}</span>
    </button>
  );
}

function MediaGrid({ urls, mediaType, isLocked }: { urls: string[]; mediaType: string; isLocked: boolean }) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  if (isLocked) {
    return (
      <div className="relative aspect-[4/3] bg-card rounded-xl overflow-hidden flex items-center justify-center border border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20" />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center p-6">
          <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-semibold text-white">Premium Content</p>
          <p className="text-xs text-muted-foreground max-w-[160px]">Upgrade your membership to unlock this post</p>
          <Link href="/membership">
            <Button size="sm" className="crimson-gradient-bg border-0 mt-1 gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Upgrade
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (mediaType === "video" && urls.length > 0) {
    return (
      <div className="rounded-xl overflow-hidden bg-black border border-border/50">
        {playingIdx === 0 ? (
          <video
            src={urls[0]}
            controls
            autoPlay
            playsInline
            preload="auto"
            controlsList="nodownload"
            className="w-full max-h-[70vh] object-contain"
          />
        ) : (
          <div
            className="relative aspect-video cursor-pointer flex items-center justify-center group"
            onClick={() => setPlayingIdx(0)}
          >
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
            <div className="relative z-10 p-5 rounded-full bg-primary/90 group-hover:bg-primary transition-colors shadow-2xl">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white/70 bg-black/60 px-2 py-1 rounded-full">
              <VideoIcon className="w-3 h-3" /> Video Post
            </div>
          </div>
        )}
      </div>
    );
  }

  if (urls.length === 0) return null;

  const gridClass =
    urls.length === 1 ? "grid-cols-1" :
    urls.length === 2 ? "grid-cols-2" :
    urls.length === 3 ? "grid-cols-3" :
    "grid-cols-2";

  return (
    <div className={`grid ${gridClass} gap-1.5 rounded-xl overflow-hidden`}>
      {urls.map((url, idx) => (
        <div key={idx} className={`relative overflow-hidden bg-card ${urls.length === 1 ? "max-h-[70vh]" : "aspect-square"}`}>
          <img
            src={url}
            alt={`media-${idx}`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

const TIER_OPTIONS = [
  { value: "free", label: "Everyone (Free)" },
  { value: "bronze", label: "Bronze members+" },
  { value: "silver", label: "Silver members+" },
  { value: "gold", label: "Gold members only" },
];

function PostEditModal({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [tier, setTier] = useState(post.tier);
  const [mediaUrls, setMediaUrls] = useState<string[]>([...post.mediaUrls]);

  const save = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caption, tier, mediaUrls, mediaType: post.mediaType, isPinned: post.isPinned }),
      });
      if (!res.ok) throw new Error("Failed to update post");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Post updated!" });
      onSaved();
      onClose();
    },
    onError: () => toast({ title: "Failed to save post", variant: "destructive" }),
  });

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max size is 10MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrls((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const inputClass = "w-full bg-card/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#1a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
          <h3 className="font-bold text-white text-lg">Edit Post</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Write a caption..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Visible to</label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputClass}>
              {TIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {post.mediaType === "image" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Images ({mediaUrls.length})
              </label>
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square group">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-white/10" />
                      <button
                        onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={addImage} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 text-sm text-muted-foreground hover:border-primary/50 hover:text-white transition-colors w-full justify-center"
              >
                <Plus className="w-4 h-4" /> Add Image
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex-1 crimson-gradient-bg border-0 gap-2"
          >
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, isAdmin }: { post: Post; isAdmin?: boolean }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  return (
    <>
    {editing && (
      <PostEditModal
        post={post}
        onClose={() => setEditing(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/posts"] })}
      />
    )}
    <div className={`glass-panel rounded-2xl overflow-hidden transition-all ${post.isPinned ? "border-primary/30" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-card border border-border flex-shrink-0 flex items-center justify-center">
            {post.modelAvatar ? (
              <img src={post.modelAvatar} alt={post.modelName || ""} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {post.modelSlug ? (
                <Link href={`/models/${post.modelSlug}`} className="font-bold text-white text-sm hover:text-primary transition-colors">
                  {post.modelName || "Model"}
                </Link>
              ) : (
                <span className="font-bold text-white text-sm">{post.modelName || "Model"}</span>
              )}
              {post.isPinned && <Pin className="w-3 h-3 text-primary" />}
            </div>
            <p className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide border ${TIER_COLOR[post.tier] || TIER_COLOR.free}`}>
          {TIER_LABEL[post.tier] || post.tier}
        </span>
      </div>

      {/* Caption */}
      {post.caption && !post.isLocked && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
        </div>
      )}

      {/* Media */}
      {(post.mediaUrls.length > 0 || post.isLocked) && (
        <div className="px-4 pb-3">
          <MediaGrid urls={post.mediaUrls} mediaType={post.mediaType} isLocked={post.isLocked} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 px-4 pb-4 pt-1 border-t border-border/30 mt-1">
        <LikeBtn post={post} />
        {post.isLocked && (
          <Link href="/membership" className="ml-auto">
            <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5">
              <Crown className="w-3 h-3" /> Unlock Post
            </Button>
          </Link>
        )}
        {isAdmin && !post.isLocked && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>
    </div>
    </>
  );
}

export default function PostsFeed() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    staleTime: 60_000,
  });

  return (
    <ProtectedRoute>
      <SEOHead
        title="Model Posts — Latest Updates & Exclusive Content"
        description="Browse the latest posts from Forbidden Fruit models. Members-only photos, videos, and updates across Bronze, Silver, and Gold tiers."
        canonical="/posts"
        noIndex
      />
      <div className="max-w-2xl mx-auto px-4 py-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
              <Rss className="w-6 h-6 text-primary" /> Feed
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Latest posts from your models</p>
          </div>
          {(!user?.membershipTier || user.membershipTier === "none") && (
            <Link href="/membership">
              <Button size="sm" className="crimson-gradient-bg border-0 gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Upgrade
              </Button>
            </Link>
          )}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl p-4 space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-card" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-card rounded" />
                    <div className="h-2.5 w-16 bg-card rounded" />
                  </div>
                </div>
                <div className="aspect-[4/3] bg-card rounded-xl" />
              </div>
            ))}
          </div>
        ) : data?.posts.length === 0 ? (
          <div className="text-center py-20">
            <Rss className="w-12 h-12 mx-auto mb-4 text-primary/20" />
            <p className="text-lg font-semibold text-white">No posts yet</p>
            <p className="text-muted-foreground text-sm mt-1">Check back soon — the model will be posting exclusive content here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.posts.map((post) => <PostCard key={post.id} post={post} isAdmin={user?.isAdmin} />)}
          </div>
        )}

        {/* Upgrade CTA if any posts are locked */}
        {data?.posts.some((p) => p.isLocked) && (
          <div className="mt-8 glass-panel rounded-2xl p-8 text-center">
            <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-lg font-display font-bold text-white mb-2">Unlock All Posts</h3>
            <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
              Some posts are exclusive to paid members. Upgrade to see everything.
            </p>
            <Link href="/membership">
              <Button className="crimson-gradient-bg border-0 px-6">Upgrade Membership</Button>
            </Link>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
