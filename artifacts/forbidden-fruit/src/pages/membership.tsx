import { useState, useEffect } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { SEOHead } from "@/components/seo-head";
import { useSubmitPayment } from "@workspace/api-client-react";
import { Check, Crown, Shield, Loader2, Info, ChevronDown, ChevronUp, Copy, CheckCircle, Upload, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileUploadButton } from "@/components/file-upload-button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const TIERS = [
  {
    id: "bronze", name: "Bronze", price: 10,
    color: "text-amber-500", border: "border-amber-500", bg: "bg-amber-500/10",
    features: ["Access to Bronze content", "Basic image galleries", "Community access", "Standard video quality"],
  },
  {
    id: "silver", name: "Silver", price: 30,
    color: "text-gray-300", border: "border-gray-300", bg: "bg-gray-300/10",
    features: ["Everything in Bronze", "Exclusive Silver videos", "Priority DMs with models", "HD video access", "Early releases"],
  },
  {
    id: "gold", name: "Gold", price: 50, popular: true,
    color: "text-yellow-400", border: "border-yellow-400", bg: "bg-yellow-400/10",
    features: ["Full Vault access", "Discounted video calls", "Custom content requests", "VIP badge & status", "Direct model messaging", "Annual bonus content"],
  },
];

const ADDONS = [
  { value: null, label: "No add-on", extra: 0 },
  { value: "weekly", label: "Weekly Custom Video", extra: 20 },
  { value: "monthly", label: "Monthly Custom Video", extra: 50 },
  { value: "annual", label: "Annual VIP Status", extra: 100 },
];

type PaymentMethod = "cashapp" | "giftcard" | "crypto";
type GiftCardMode = "upload" | "type";

interface Settings {
  payment_methods: string;
  cashapp_tag: string;
  crypto_address: string;
  accepted_gift_cards: string;
  accepted_crypto: string;
  gift_card_instructions: string;
  crypto_qr_url: string;
}

function useSettings() {
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/settings`);
      if (!res.ok) return {
        payment_methods: "giftcard,crypto", cashapp_tag: "$AlexisCausey5",
        crypto_address: "", accepted_gift_cards: "Amazon,Apple,Visa,Google Play",
        accepted_crypto: "USDT,Bitcoin,USDC", gift_card_instructions: "", crypto_qr_url: "",
      };
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export default function Membership() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const [selectedTier, setSelectedTier] = useState<(typeof TIERS)[0] | null>(null);
  const [addon, setAddon] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("crypto");
  const [proofUrl, setProofUrl] = useState("");
  const [giftCardBackUrl, setGiftCardBackUrl] = useState("");
  const [giftCardMode, setGiftCardMode] = useState<GiftCardMode>("upload");
  const [cardType, setCardType] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardPin, setCardPin] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [showGiftHowTo, setShowGiftHowTo] = useState(false);
  const [showCryptoHowTo, setShowCryptoHowTo] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const enabledMethods = (settings?.payment_methods || "giftcard")
    .split(",").map(s => s.trim()) as PaymentMethod[];
  const cashappTag = settings?.cashapp_tag || "$AlexisCausey5";
  const cryptoAddress = settings?.crypto_address || "";
  const acceptedGiftCards = settings?.accepted_gift_cards || "Amazon,Apple,Visa,Google Play";
  const acceptedCrypto = settings?.accepted_crypto || "USDT,Bitcoin,USDC";
  const giftCardInstructions = settings?.gift_card_instructions || "";
  const cryptoQrUrl = settings?.crypto_qr_url || "";

  const showCashApp = enabledMethods.includes("cashapp");
  const showGiftCard = enabledMethods.includes("giftcard");
  const showCrypto = enabledMethods.includes("crypto");

  useEffect(() => {
    if (settings && !enabledMethods.includes(method)) {
      setMethod(enabledMethods[0] || "cashapp");
    }
  }, [settings]);

  const submitPay = useSubmitPayment({
    mutation: {
      onSuccess: () => {
        setSelectedTier(null);
        setProofUrl("");
        setGiftCardBackUrl("");
        setCardNumber(""); setCardPin(""); setCardExpiry(""); setCardType("");
        toast({ title: "Payment submitted!", description: "Your payment is under review. You'll be notified when approved." });
      },
      onError: (err: any) =>
        toast({ title: "Submission error", description: err?.data?.message || "Failed to submit payment", variant: "destructive" }),
    },
  });

  const selectedAddon = ADDONS.find(a => a.value === addon) || ADDONS[0];
  const total = selectedTier ? selectedTier.price + selectedAddon.extra : 0;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;

    if (method === "giftcard") {
      if (giftCardMode === "upload" && !proofUrl) {
        toast({ title: "Gift card photo required", description: "Please upload a photo of the front of your gift card", variant: "destructive" });
        return;
      }
      if (giftCardMode === "type" && !cardNumber.trim()) {
        toast({ title: "Card number required", description: "Please enter your gift card number", variant: "destructive" });
        return;
      }
    } else if (!proofUrl) {
      toast({ title: "Payment proof required", description: "Please upload your payment screenshot", variant: "destructive" });
      return;
    }

    let screenshotUrl: string | undefined;
    let giftCardImageUrl: string | undefined;

    if (method === "giftcard") {
      if (giftCardMode === "upload") {
        screenshotUrl = proofUrl;
        if (giftCardBackUrl) giftCardImageUrl = giftCardBackUrl;
      } else {
        screenshotUrl = [
          "CARD_INFO",
          `Brand: ${cardType || "N/A"}`,
          `Number: ${cardNumber}`,
          cardPin ? `PIN: ${cardPin}` : null,
          cardExpiry ? `Expiry: ${cardExpiry}` : null,
        ].filter(Boolean).join("\n");
      }
    } else {
      screenshotUrl = proofUrl;
    }

    submitPay.mutate({
      data: {
        membershipTier: selectedTier.id as any,
        method: method as any,
        amount: total,
        subscriptionAddon: addon as any,
        screenshotUrl,
        giftCardImageUrl,
      },
    });
  };

  const methodTabs = [
    showCashApp && { key: "cashapp" as const, label: "CashApp" },
    showGiftCard && { key: "giftcard" as const, label: "Gift Card" },
    showCrypto && { key: "crypto" as const, label: "Crypto" },
  ].filter(Boolean) as { key: PaymentMethod; label: string }[];

  const resetDialog = () => {
    setSelectedTier(null);
    setProofUrl("");
    setGiftCardBackUrl("");
    setCardNumber(""); setCardPin(""); setCardExpiry(""); setCardType("");
    setShowGiftHowTo(false); setShowCryptoHowTo(false); setCopied(false);
  };

  return (
    <ProtectedRoute>
      <SEOHead
        title="Choose Your Membership — Bronze, Silver & Gold Tiers"
        description="Join Forbidden Fruit's elite membership. Bronze $10/mo, Silver $30/mo, Gold $50/mo. Pay via CashApp, gift cards, or crypto. Unlock exclusive content instantly."
        canonical="/membership"
      />
      <div className="max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-3">Elevate Your Access</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Current tier:{" "}
            <span className="font-bold text-primary uppercase">
              {user?.membershipTier === "none" ? "Free" : user?.membershipTier}
            </span>
            . Choose a membership to unlock deeper experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {TIERS.map(tier => (
            <motion.div
              key={tier.id}
              whileHover={{ y: -4 }}
              className={`glass-panel rounded-2xl p-6 sm:p-8 relative flex flex-col border-t-4 ${tier.border} ${tier.popular ? "ring-2 ring-yellow-400/30" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3" /> MOST POPULAR
                </div>
              )}
              <h3 className={`text-2xl font-display font-bold mb-1 ${tier.color}`}>{tier.name}</h3>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-bold text-white">${tier.price}</span>
                <span className="text-muted-foreground ml-2 text-sm">/ month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.color}`} />
                    <span className="text-gray-300 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => { setSelectedTier(tier); setProofUrl(""); setGiftCardBackUrl(""); }}
                className={`w-full py-5 rounded-xl font-bold border hover:bg-white/5 ${tier.color} ${tier.border} bg-transparent transition-all`}
              >
                Select {tier.name}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Free Tier Access</h3>
            <p className="text-sm text-muted-foreground">Already included with your account. Access all "Free" labeled content at no cost.</p>
          </div>
        </div>

        {/* Payment dialog */}
        <Dialog open={!!selectedTier} onOpenChange={(open) => !open && resetDialog()}>
          <DialogContent className="glass-panel border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold text-center">Complete Your Payment</DialogTitle>
            </DialogHeader>

            {selectedTier && (
              <form onSubmit={handlePay} className="space-y-5 mt-2">
                {/* Summary */}
                <div className="bg-black/50 rounded-xl border border-white/10 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{selectedTier.name} Membership</span>
                    <span className="text-white font-semibold">${selectedTier.price}/mo</span>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Add-on (Optional)</label>
                    <select
                      className="w-full bg-card border border-border rounded-lg p-2 text-white text-sm"
                      value={addon || ""}
                      onChange={(e) => setAddon(e.target.value || null)}
                    >
                      {ADDONS.map(a => (
                        <option key={String(a.value)} value={String(a.value || "")}>
                          {a.label}{a.extra > 0 ? ` (+$${a.extra})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="font-bold text-white">Total Due</span>
                    <motion.span key={total} initial={{ scale: 1.2, color: "#ef4444" }} animate={{ scale: 1, color: "#ffffff" }} className="text-2xl font-bold text-white">
                      ${total}
                    </motion.span>
                  </div>
                </div>

                {/* Method tabs */}
                {methodTabs.length > 1 && (
                  <div className="flex gap-1 p-1 bg-black/40 rounded-xl">
                    {methodTabs.map(m => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => { setMethod(m.key); setProofUrl(""); setGiftCardBackUrl(""); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${method === m.key ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── CashApp ── */}
                {method === "cashapp" && (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-3 w-44 h-44 mx-auto rounded-2xl shadow-lg flex items-center justify-center">
                      <img
                        src={`${import.meta.env.BASE_URL}images/qr-code.png`}
                        alt="CashApp QR"
                        className="w-full h-full object-contain"
                        onError={e => {
                          e.currentTarget.style.display = "none";
                          const d = document.createElement("p");
                          d.className = "text-gray-600 text-xs text-center";
                          d.innerHTML = `Send to<br/><strong>${cashappTag}</strong>`;
                          e.currentTarget.parentElement?.appendChild(d);
                        }}
                      />
                    </div>
                    <div className="bg-primary/10 border border-primary/30 rounded-xl py-3 px-4">
                      <p className="text-xs text-muted-foreground mb-1">Send exactly</p>
                      <p className="font-mono text-2xl font-bold text-primary">${total}</p>
                      <p className="text-sm text-white mt-1 font-mono font-bold">{cashappTag}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">After sending, upload a screenshot of your receipt below.</p>
                    <FileUploadButton label="Upload Payment Screenshot" accept="image/*" onUploaded={setProofUrl} currentValue={proofUrl} />
                  </div>
                )}

                {/* ── Gift Card ── */}
                {method === "giftcard" && (
                  <div className="space-y-4">
                    {/* How to buy */}
                    <button
                      type="button"
                      onClick={() => setShowGiftHowTo(v => !v)}
                      className="w-full flex items-center justify-between text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 hover:bg-blue-500/15 transition-colors"
                    >
                      <span className="flex items-center gap-2"><Info className="w-4 h-4" /> How to buy a gift card online</span>
                      {showGiftHowTo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showGiftHowTo && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm space-y-1.5">
                        <p className="text-muted-foreground">1. Go to <strong className="text-white">Amazon.com</strong>, <strong className="text-white">Apple.com</strong>, or a retailer</p>
                        <p className="text-muted-foreground">2. Search <strong className="text-white">"Gift Cards"</strong> → select your brand</p>
                        <p className="text-muted-foreground">3. Choose the exact amount: <strong className="text-primary">${total}</strong></p>
                        <p className="text-muted-foreground">4. Complete purchase — card info will be emailed to you instantly</p>
                        <p className="text-muted-foreground">5. Submit the card info or photos below</p>
                        <p className="text-yellow-400 font-medium mt-2">✓ Accepted: {acceptedGiftCards}</p>
                        {giftCardInstructions && (
                          <p className="text-white border-t border-white/10 pt-2 mt-2">{giftCardInstructions}</p>
                        )}
                      </div>
                    )}

                    <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-sm">
                      <p className="text-white font-semibold mb-1">Accepted Gift Cards</p>
                      <p className="text-muted-foreground">{acceptedGiftCards}</p>
                      <p className="text-muted-foreground mt-1">Card value must equal <strong className="text-primary">${total}</strong>.</p>
                    </div>

                    {/* Upload / Type toggle */}
                    <div className="flex gap-1 p-1 bg-black/40 rounded-xl">
                      {(["upload", "type"] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setGiftCardMode(mode)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${giftCardMode === mode ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
                        >
                          {mode === "upload" ? <><Upload className="w-3.5 h-3.5" /> Upload Photos</> : <><CreditCard className="w-3.5 h-3.5" /> Enter Card Info</>}
                        </button>
                      ))}
                    </div>

                    {giftCardMode === "upload" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Front of card <span className="text-red-400">*</span></p>
                            <FileUploadButton label="Upload Front Photo" accept="image/*" onUploaded={setProofUrl} currentValue={proofUrl} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Back of card <span className="text-muted-foreground/60">(recommended)</span></p>
                            <FileUploadButton label="Upload Back Photo" accept="image/*" onUploaded={setGiftCardBackUrl} currentValue={giftCardBackUrl} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Enter your gift card details. Kept strictly confidential.</p>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Card Brand</p>
                          <select value={cardType} onChange={e => setCardType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50">
                            <option value="">Select brand...</option>
                            {acceptedGiftCards.split(",").map(t => (
                              <option key={t.trim()} value={t.trim()}>{t.trim()}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Card Number / Claim Code <span className="text-red-400">*</span></p>
                          <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="e.g. 1234 5678 9012 3456" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">PIN / Security Code</p>
                            <input type="text" value={cardPin} onChange={e => setCardPin(e.target.value)} placeholder="PIN or CVV" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Expiry (if shown)</p>
                            <input type="text" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/YY" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Crypto ── */}
                {method === "crypto" && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowCryptoHowTo(v => !v)}
                      className="w-full flex items-center justify-between text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 hover:bg-orange-500/15 transition-colors"
                    >
                      <span className="flex items-center gap-2"><Info className="w-4 h-4" /> How to pay with crypto (USDT recommended)</span>
                      {showCryptoHowTo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showCryptoHowTo && (
                      <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-sm space-y-1.5">
                        <p className="text-yellow-400 font-semibold">We primarily accept USDT — it's a stablecoin so the value never fluctuates.</p>
                        <p className="text-muted-foreground mt-2">1. Install: <strong className="text-white">Binance</strong>, <strong className="text-white">Coinbase</strong>, or <strong className="text-white">Trust Wallet</strong></p>
                        <p className="text-muted-foreground">2. Buy USDT using your card or bank transfer</p>
                        <p className="text-muted-foreground">3. Send exactly <strong className="text-primary">${total} USD</strong> in USDT to the address below</p>
                        <p className="text-muted-foreground">4. Select correct network (TRC20 or ERC20) when sending</p>
                        <p className="text-muted-foreground">5. Screenshot the completed transaction and upload below</p>
                        <p className="text-muted-foreground mt-1">Other accepted: {acceptedCrypto}</p>
                      </div>
                    )}

                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Send exactly</p>
                          <p className="text-2xl font-bold font-mono text-orange-400">${total}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Preferred: <strong className="text-yellow-400">USDT</strong> — also: {acceptedCrypto}</p>
                        </div>
                        {cryptoQrUrl && (
                          <div className="bg-white p-2 rounded-xl shrink-0 w-24 h-24 flex items-center justify-center">
                            <img src={cryptoQrUrl} alt="Crypto wallet QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                      {cryptoAddress ? (
                        <div className="flex items-center gap-2">
                          <p className="text-white font-mono text-xs break-all bg-black/40 rounded-lg px-3 py-2 border border-white/10 flex-1 min-w-0">
                            {cryptoAddress}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cryptoAddress);
                              setCopied(true);
                              toast({ title: "Address copied!" });
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="shrink-0 flex items-center gap-1.5 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg px-3 py-2.5 transition-colors whitespace-nowrap"
                          >
                            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-red-400">Wallet address not configured yet. Contact support.</p>
                      )}
                    </div>
                    <FileUploadButton label="Upload Transaction Screenshot" accept="image/*" onUploaded={setProofUrl} currentValue={proofUrl} />
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base font-bold crimson-gradient-bg border-0" disabled={submitPay.isPending}>
                  {submitPay.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
                  ) : (
                    `Submit $${total} Payment`
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Our system will verify and activate your membership within a few hours.</p>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
