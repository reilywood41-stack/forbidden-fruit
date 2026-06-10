import { useRoute, Link, useLocation } from "wouter";
import { useGetModels, useGetContent } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Crown, Video, Image as ImageIcon, PhoneCall, ArrowLeft, Clock, Star, Lock, PlayCircle, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo-head";

const TIER_ORDER: Record<string, number> = { none: 0, free: 0, bronze: 1, silver: 2, gold: 3 };
const CONTENT_TIER_ORDER: Record<string, number> = { free: 0, bronze: 1, silver: 2, gold: 3 };

const TIER_COLORS: Record<string, string> = {
  free: "text-green-400 border-green-400/30 bg-green-400/10",
  bronze: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  silver: "text-gray-300 border-gray-300/30 bg-gray-300/10",
  gold: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ModelProfile() {
  const [, params] = useRoute("/models/:slug");
  const slug = params?.slug;
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: modelsData, isLoading: modelsLoading } = useGetModels();
  const { data: contentData } = useGetContent({ limit: 200 } as any);

  const model = modelsData?.models.find((m: any) => m.slug === slug) as any;
  const modelContent = contentData?.items.filter((c: any) => c.modelId === model?.id) ?? [];
  const userTier = user?.membershipTier || "none";

  if (modelsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Model Not Found</h2>
        <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
        <Link href="/content"><Button variant="outline">Back to Vault</Button></Link>
      </div>
    );
  }

  const videoCount = modelContent.filter((c: any) => c.type === "video").length;
  const imageCount = modelContent.filter((c: any) => c.type !== "video").length;
  const totalViews = modelContent.reduce((sum: number, c: any) => sum + (c.viewCount || 0), 0);
  const totalLikes = modelContent.reduce((sum: number, c: any) => sum + (c.likeCount || 0), 0);
  const totalPieces = modelContent.length;
  const modelDesc = model.bio
    ? `${model.bio} — ${totalPieces} exclusive pieces including ${videoCount} videos. Book a private call or send a direct message on Forbidden Fruit.`
    : `${model.name} on Forbidden Fruit — ${totalPieces} exclusive content pieces, ${videoCount} private videos. Available for 1-on-1 video calls and direct messaging.`;

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: model.name,
    description: modelDesc,
    url: `https://forbiddenfruit.app/models/${model.slug}`,
    ...(model.avatarUrl ? { image: model.avatarUrl } : {}),
    worksFor: { "@type": "Organization", name: "Forbidden Fruit", url: "https://forbiddenfruit.app" },
  };

  return (
    <div className="w-full">
      <SEOHead
        title={`${model.name} — Exclusive Content & Private Bookings`}
        description={modelDesc}
        canonical={`/models/${model.slug}`}
        ogImage={model.avatarUrl || model.coverImageUrl || undefined}
        ogType="profile"
        jsonLd={personSchema}
      />
      {/* Hero / Cover */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        {model.coverImageUrl ? (
          <img src={model.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />

        {/* Back link */}
        <div className="absolute top-4 left-4">
          <Link href="/content" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* Profile card overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 sm:px-8">
          <div className="max-w-5xl mx-auto flex items-end gap-5">
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-background shadow-2xl bg-card">
                {model.avatarUrl ? (
                  <img src={model.avatarUrl} alt={model.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-4xl sm:text-5xl">
                    {model.name[0]}
                  </div>
                )}
              </div>
              {model.isAvailableForCalls && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-background shadow" title="Available for calls" />
              )}
            </div>

            <div className="pb-1 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-display font-bold text-white leading-tight truncate">
                {model.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {model.age && (
                  <span className="text-sm text-muted-foreground">{model.age} years old</span>
                )}
                {model.isAvailableForCalls && (
                  <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-0.5 rounded-full">
                    Available for Calls
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Stats + CTA row */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{modelContent.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{videoCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Videos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{imageCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Photos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalLikes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Likes</p>
            </div>
          </div>

          {model.isAvailableForCalls && (
            <Button
              onClick={() => setLocation(user ? "/bookings" : "/login")}
              className="crimson-gradient-bg border-0 gap-2 px-6 py-5 text-base font-bold rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow"
            >
              <PhoneCall className="w-4 h-4" />
              Book a Private Call
            </Button>
          )}
        </div>

        {/* Sign-in prompt for unauthenticated users */}
        {!user && (
          <div className="glass-panel rounded-2xl p-6 border border-primary/20 text-center">
            <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-white mb-1">Unlock Full Access</h3>
            <p className="text-sm text-muted-foreground mb-4">Sign in or create an account to view content and book private sessions.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/login"><Button variant="outline" className="border-white/20">Log In</Button></Link>
              <Link href="/register"><Button className="crimson-gradient-bg border-0">Join Free</Button></Link>
            </div>
          </div>
        )}

        {/* Bio */}
        {model.bio && (
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-3">About</h2>
            <p className="text-gray-300 leading-relaxed text-base">{model.bio}</p>
          </div>
        )}

        {/* Call rates */}
        {model.isAvailableForCalls && (
          <div>
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-4">Private Call Rates</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "15 min", rate: model.callRates?.fifteenMin },
                { label: "30 min", rate: model.callRates?.thirtyMin },
                { label: "60 min", rate: model.callRates?.sixtyMin },
              ].map(({ label, rate }) => (
                <div key={label} className="glass-panel rounded-xl p-4 text-center border border-primary/10">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xl font-bold text-white">${rate}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-display font-bold text-white">Content by {model.name}</h2>
            <span className="text-sm text-muted-foreground">{modelContent.length} posts</span>
          </div>

          {modelContent.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">No content yet from this model.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {modelContent.map((item: any) => {
                const userLevel = TIER_ORDER[userTier] ?? 0;
                const contentLevel = CONTENT_TIER_ORDER[item.tier] ?? 0;
                const isLocked = item.tier !== "free" && userLevel < contentLevel;
                const duration = formatDuration(item.duration);
                const href = !user ? "/login" : (isLocked ? "/membership" : `/content/${item.id}`);

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className={`group relative block rounded-xl overflow-hidden bg-card border transition-all duration-200 ${
                      isLocked ? "border-border/30" : "border-border/50 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
                    }`}
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-black/50">
                      <img
                        src={item.thumbnailUrl || "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=400&auto=format&fit=crop"}
                        alt={item.title}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-all duration-500 ${
                          isLocked ? "blur-lg opacity-30 scale-105" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                        }`}
                      />
                      {(isLocked || !user) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
                          <Lock className="w-5 h-5 text-primary mb-1" />
                          <p className="text-[10px] font-bold text-white uppercase">{!user ? "Sign In" : item.tier}</p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 z-20">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase border ${TIER_COLORS[item.tier] || TIER_COLORS.bronze}`}>
                          {item.tier}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20">
                        {duration && !isLocked && (
                          <span className="px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-mono">{duration}</span>
                        )}
                        <span className="p-1 bg-black/70 rounded text-white">
                          {item.type === "video" ? <PlayCircle className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="font-semibold text-xs text-white truncate">{item.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{item.viewCount || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{item.likeCount || 0}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
