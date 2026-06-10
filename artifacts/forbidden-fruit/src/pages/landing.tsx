import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Crown, Lock, Star, ChevronRight, Video } from "lucide-react";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo-head";

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Forbidden Fruit",
  url: "https://forbiddenfruit.app",
  description:
    "An elite members-only adult content platform offering Bronze, Silver and Gold tier memberships with exclusive content, private video calls, and direct model access.",
  sameAs: [],
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Forbidden Fruit",
  url: "https://forbiddenfruit.app",
  description: "Elite members-only adult content platform with tiered memberships.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://forbiddenfruit.app/content?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Forbidden Fruit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Forbidden Fruit is an elite members-only adult content platform with Bronze ($10/mo), Silver ($30/mo), and Gold ($50/mo) membership tiers offering exclusive videos, galleries, private video calls, and direct model messaging.",
      },
    },
    {
      "@type": "Question",
      name: "How do I join Forbidden Fruit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Register for a free account, then upgrade to Bronze, Silver, or Gold membership by submitting payment via CashApp, gift card, or crypto. Your membership is activated after admin review.",
      },
    },
    {
      "@type": "Question",
      name: "Can I book a private video call?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Silver and Gold members can book private 1-on-1 video calls with models via Telegram. Browse available models and request a booking through the Bookings page.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods are accepted?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We accept CashApp, gift cards (Amazon, Apple, Visa, Google Play), and cryptocurrency (USDT, Bitcoin, USDC).",
      },
    },
  ],
};

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/content");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="flex-1 flex flex-col">
      <SEOHead
        canonical="/"
        description="An elite members-only adult content platform. Choose Bronze ($10), Silver ($30), or Gold ($50) — unlock exclusive HD videos, private model video calls, and direct messaging."
        jsonLd={[ORG_SCHEMA, WEBSITE_SCHEMA, FAQ_SCHEMA]}
      />
      <meta name="google-site-verification" content="KPW9hfZXcdr0qSqMPKGRrx4IT-HSR9RCW0XUuurgAIA" />
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Sensual dark silk background"
            className="w-full h-full object-cover opacity-60"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <span className="inline-block py-1 px-3 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-semibold tracking-widest uppercase mb-6 backdrop-blur-md">
            The Ultimate Exclusive Experience
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
            Taste the <span className="gold-gradient-text italic">Forbidden</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-light">
            An elite sanctuary for premium, uncut adult content. Choose your tier, unlock your desires, and experience raw intimacy like never before.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white crimson-gradient-bg rounded-full shadow-[0_0_40px_-10px_hsl(var(--primary))] hover:shadow-[0_0_60px_-15px_hsl(var(--primary))] transition-all hover:-translate-y-1 flex items-center justify-center">
              Unlock Access Now <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-full backdrop-blur-md transition-all">
              Member Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl text-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary border border-primary/20">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-white">Exclusive Content</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Hundreds of high-definition videos and galleries locked away, meant only for those bold enough to claim them.
              </p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl text-center hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] rounded-full"></div>
              <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-6 text-accent border border-accent/20">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-white">Elite Tiers</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                From Bronze to Gold, elevate your status. Gain more access, more intimacy, and unprecedented personalized attention.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl text-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary border border-primary/20">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-white">1-on-1 Video Calls</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Skip the screen and connect directly. Book private video sessions via Telegram and dictate your fantasy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
