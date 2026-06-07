import { useState } from "react";
import { Link } from "wouter";
import { useGetContent } from "@workspace/api-client-react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Lock, PlayCircle, Image as ImageIcon, Search, Crown, Star, Gift, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TIER_COLORS: Record<string, string> = {
  free: "text-green-400 border-green-400/30 bg-green-400/10",
  bronze: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  silver: "text-gray-300 border-gray-300/30 bg-gray-300/10",
  gold: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

const TIER_ORDER: Record<string, number> = { none: 0, free: 0, bronze: 1, silver: 2, gold: 3 };
const CONTENT_TIER_ORDER: Record<string, number> = { free: 0, bronze: 1, silver: 2, gold: 3 };

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function ContentFeed() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const { data, isLoading } = useGetContent({ search: search || undefined, type: typeFilter as any || undefined, tier: tierFilter as any || undefined });
  const { user, isAuthenticated } = useAuth();

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 py-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">The Vault</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user?.membershipTier === "none" || !user?.membershipTier
                ? "Free content available. Upgrade for full access."
                : `${user.membershipTier.charAt(0).toUpperCase() + user.membershipTier.slice(1)} member — enjoy your content.`}
            </p>
          </div>
          {(user?.membershipTier === "none" || !user?.membershipTier) && (
            <Link href="/membership">
              <Button className="crimson-gradient-bg border-0 shrink-0 gap-2">
                <Crown className="w-4 h-4" /> Upgrade Membership
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              className="pl-9 bg-card border-border h-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 px-3 rounded-md bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="video">Videos</option>
            <option value="image">Images</option>
            <option value="gallery">Galleries</option>
          </select>
          <select
            className="h-9 px-3 rounded-md bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
          >
            <option value="">All Tiers</option>
            <option value="free">Free</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card/50 aspect-[4/3] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Free content section if user has no subscription */}
            {!tierFilter && (user?.membershipTier === "none" || !user?.membershipTier) && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Free Content</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data?.items.map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  userTier={user?.membershipTier || "none"}
                />
              ))}
              {data?.items.length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No content found</p>
                  <p className="text-sm mt-1">Try adjusting your filters.</p>
                </div>
              )}
            </div>

            {/* Upgrade CTA if locked content exists */}
            {data?.items.some((item: any) => item.isLocked) && (
              <div className="mt-12 glass-panel rounded-2xl p-8 text-center">
                <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-display font-bold text-white mb-2">
                  Unlock the Full Vault
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Some content is locked behind paid tiers. Upgrade to Bronze, Silver, or Gold to access everything.
                </p>
                <Link href="/membership">
                  <Button className="crimson-gradient-bg border-0 px-8 py-3 text-lg">
                    Upgrade Now — From $10/mo
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function ContentCard({ item, userTier }: { item: any; userTier: string }) {
  const userLevel = TIER_ORDER[userTier] ?? 0;
  const contentLevel = CONTENT_TIER_ORDER[item.tier] ?? 0;
  const isLocked = item.tier !== "free" && userLevel < contentLevel;
  const duration = formatDuration(item.duration);

  return (
    <Link
      href={isLocked ? "/membership" : `/content/${item.id}`}
      className={`group relative block rounded-xl overflow-hidden bg-card border transition-all duration-200 ${
        isLocked
          ? "border-border/30 hover:border-primary/40"
          : "border-border/50 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] relative overflow-hidden bg-black/50">
        <img
          src={
            item.thumbnailUrl ||
            "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=600&auto=format&fit=crop"
          }
          alt={item.title}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLocked
              ? "blur-lg opacity-40 scale-105"
              : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
          }`}
        />

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
            <div className="p-3 rounded-full bg-primary/20 border border-primary/40 mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              {item.tier} required
            </p>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 z-20">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide border ${TIER_COLORS[item.tier] || TIER_COLORS.bronze}`}>
            {item.tier}
          </span>
        </div>

        {/* Type icon + duration */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
          {duration && !isLocked && (
            <span className="px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white font-mono">
              {duration}
            </span>
          )}
          <span className="p-1 bg-black/70 backdrop-blur-sm rounded text-white">
            {item.type === "video"
              ? <PlayCircle className="w-3.5 h-3.5" />
              : <ImageIcon className="w-3.5 h-3.5" />}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-white truncate mb-0.5">{item.title}</h3>
        {item.modelName && (
          item.modelSlug ? (
            <Link
              href={`/models/${item.modelSlug}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="text-xs text-primary hover:text-primary/70 truncate block transition-colors"
            >
              {item.modelName}
            </Link>
          ) : (
            <p className="text-xs text-primary truncate">{item.modelName}</p>
          )
        )}
        {!isLocked && item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span>{formatCount(item.viewCount || 0)} views</span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5" />{formatCount(item.likeCount || 0)}
            </span>
          </span>
          <span>{formatCount(item.commentCount || 0)} comments</span>
        </div>
      </div>
    </Link>
  );
}
