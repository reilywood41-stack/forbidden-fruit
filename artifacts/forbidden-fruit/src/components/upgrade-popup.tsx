import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Lock, X, MessageCircle, Video, Star } from "lucide-react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";

const SILVER_PERKS = [
  { icon: <Zap className="w-4 h-4 text-gray-300" />, text: "Full Silver tier content vault" },
  { icon: <MessageCircle className="w-4 h-4 text-gray-300" />, text: "Direct messaging with the team" },
  { icon: <Video className="w-4 h-4 text-gray-300" />, text: "Priority booking requests" },
  { icon: <Star className="w-4 h-4 text-gray-300" />, text: "Exclusive weekly drops" },
];

const GOLD_PERKS = [
  { icon: <Crown className="w-4 h-4 text-yellow-400" />, text: "ALL content — every tier unlocked" },
  { icon: <MessageCircle className="w-4 h-4 text-yellow-400" />, text: "VIP direct messaging" },
  { icon: <Video className="w-4 h-4 text-yellow-400" />, text: "First access to new models" },
  { icon: <Star className="w-4 h-4 text-yellow-400" />, text: "Personal shoutouts & custom content" },
];

export function UpgradePopup() {
  const { user, isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const tier = user?.membershipTier || "none";
  const showForBronze = tier === "bronze";
  const showForSilver = tier === "silver";
  const shouldShow = isAuthenticated && (showForBronze || showForSilver) && !dismissed;

  useEffect(() => {
    if (!shouldShow) return;
    const key = `upgrade_popup_${tier}_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(key, "1");
    }, 8000);
    return () => clearTimeout(timer);
  }, [shouldShow, tier]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!shouldShow) return null;

  const isBronze = tier === "bronze";
  const accentColor = isBronze ? "#c0c0c0" : "#ffd700";
  const targetTier = isBronze ? "silver" : "gold";
  const targetPrice = isBronze ? "$30" : "$50";
  const perks = isBronze ? SILVER_PERKS : GOLD_PERKS;
  const iconEl = isBronze
    ? <Star className="w-7 h-7 text-gray-300" />
    : <Crown className="w-7 h-7 text-yellow-400" />;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm glass-panel rounded-3xl p-6 relative border"
            style={{ borderColor: `${accentColor}33` }}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                style={{ background: `${accentColor}15`, borderColor: `${accentColor}30` }}>
                {iconEl}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                  Upgrade to {targetTier}
                </p>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {isBronze ? "Unlock more of the vault" : "Go all-in with Gold"}
                </h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {isBronze
                ? "Silver members get twice the content and exclusive perks your current tier doesn't have."
                : "Gold is the full experience. Nothing held back — the entire vault is yours."}
            </p>

            <ul className="space-y-2.5 mb-5">
              {perks.map((perk, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-white/80">
                  {perk.icon}
                  {perk.text}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <Link href="/membership" onClick={handleDismiss} className="flex-1">
                <Button className="w-full crimson-gradient-bg border-0 gap-2 font-bold">
                  {iconEl} Upgrade — {targetPrice}/mo
                </Button>
              </Link>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
