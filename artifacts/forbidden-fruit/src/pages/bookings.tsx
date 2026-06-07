import { useState } from "react";
import { useGetModels, useCreateBooking, useGetMyBookings, CreateBookingRequestDuration } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Video, Clock, Phone, CheckCircle, AlertCircle, Loader2, Star, Copy, QrCode, CreditCard, Upload, Info, ChevronDown, ChevronUp } from "lucide-react";
import { FileUploadButton } from "@/components/file-upload-button";
import { motion } from "framer-motion";

export default function Bookings() {
  return (
    <ProtectedRoute>
      <BookingsContent />
    </ProtectedRoute>
  );
}

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

const RATE_KEYS: Record<number, string> = {
  15: "fifteenMin",
  30: "thirtyMin",
  60: "sixtyMin",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function BookingsContent() {
  const { data: modelsData } = useGetModels();
  const { data: bookingsData, refetch } = useGetMyBookings();
  const { toast } = useToast();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const cashappTag = settings?.cashapp_tag || "";
  const cryptoAddress = settings?.crypto_address || "";
  const acceptedGiftCards = settings?.accepted_gift_cards || "Amazon,Apple,Visa,Google Play";
  const acceptedCrypto = settings?.accepted_crypto || "Bitcoin,USDT,USDC";
  const enabledMethods = (settings?.payment_methods || "giftcard,crypto")
    .split(",")
    .map((m: string) => m.trim())
    .filter(Boolean) as ("cashapp" | "giftcard" | "crypto")[];

  const [view, setView] = useState<"book" | "history">("book");
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [duration, setDuration] = useState(30);
  const [telegramNumber, setTelegramNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cashapp" | "giftcard" | "crypto">(enabledMethods[0] ?? "giftcard");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [giftCardUrl, setGiftCardUrl] = useState("");
  const [giftCardBackUrl, setGiftCardBackUrl] = useState("");
  const [giftCardInputMode, setGiftCardInputMode] = useState<"upload" | "type">("upload");
  const [cardType, setCardType] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardPin, setCardPin] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [showGiftHowTo, setShowGiftHowTo] = useState(false);
  const [showCryptoHowTo, setShowCryptoHowTo] = useState(false);
  const [copied, setCopied] = useState(false);

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: () => {
        toast({ title: "Booking submitted!", description: "Your session request is pending confirmation." });
        setSelectedModel(null);
        setTelegramNumber("");
        setScreenshotUrl("");
        setGiftCardUrl("");
        setGiftCardBackUrl("");
        setCardNumber("");
        setCardPin("");
        setCardExpiry("");
        setCardType("");
        refetch();
        setView("history");
      },
      onError: (err: any) =>
        toast({ title: "Error", description: err?.data?.message || "Failed to submit booking", variant: "destructive" }),
    },
  });

  const models = (modelsData?.models ?? []).filter((m: any) => m.isAvailableForCalls);
  const bookings = bookingsData?.bookings ?? [];
  const selectedModelData = models.find((m: any) => m.id === selectedModel);
  const price = selectedModelData
    ? (selectedModelData.callRates[RATE_KEYS[duration] as keyof typeof selectedModelData.callRates] as number)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) {
      toast({ title: "Select a model", variant: "destructive" });
      return;
    }
    if (!telegramNumber.trim()) {
      toast({ title: "Telegram required", description: "Please enter your Telegram username or number.", variant: "destructive" });
      return;
    }
    if (paymentMethod === "giftcard") {
      if (giftCardInputMode === "upload" && !giftCardUrl) {
        toast({ title: "Front of gift card required", description: "Please upload a photo of the front of your gift card", variant: "destructive" });
        return;
      }
      if (giftCardInputMode === "type" && !cardNumber.trim()) {
        toast({ title: "Card number required", description: "Please enter your gift card number", variant: "destructive" });
        return;
      }
    } else if (!screenshotUrl) {
      const label = paymentMethod === "cashapp" ? "payment screenshot" : "transaction screenshot";
      toast({ title: "Payment proof required", description: `Please upload your ${label}`, variant: "destructive" });
      return;
    }

    const submissionData: any = {
      modelId: selectedModel,
      duration: duration as CreateBookingRequestDuration,
      telegramNumber,
      paymentMethod: paymentMethod as any,
    };

    if (paymentMethod === "giftcard") {
      if (giftCardInputMode === "upload") {
        submissionData.screenshotUrl = giftCardUrl;
        if (giftCardBackUrl) submissionData.giftCardImageUrl = giftCardBackUrl;
      } else {
        submissionData.screenshotUrl = [
          "CARD_INFO",
          `Brand: ${cardType || "N/A"}`,
          `Number: ${cardNumber}`,
          cardPin ? `PIN: ${cardPin}` : null,
          cardExpiry ? `Expiry: ${cardExpiry}` : null,
        ].filter(Boolean).join("\n");
      }
    } else {
      submissionData.screenshotUrl = screenshotUrl;
    }

    createBooking.mutate({ data: submissionData });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">Video Call Bookings</h1>
      <p className="text-muted-foreground text-sm mb-6">Book a private 1-on-1 session with your favorite model.</p>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-8">
        {(["book", "history"] as const).map(v => (
          <Button
            key={v}
            variant={view === v ? "default" : "outline"}
            onClick={() => setView(v)}
            className={view === v ? "crimson-gradient-bg border-0" : "border-white/10"}
          >
            {v === "book" ? "Book Session" : `My Bookings (${bookings.length})`}
          </Button>
        ))}
      </div>

      {view === "book" ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Model Selection */}
          <div className="glass-panel p-5 rounded-2xl">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Choose Your Model
            </h2>
            {models.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No models currently available for calls.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {models.map((model: any) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedModel === model.id
                        ? "border-primary bg-primary/10"
                        : "border-white/10 bg-black/30 hover:border-white/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden mb-2 border border-white/20">
                      {model.avatarUrl ? (
                        <img src={model.avatarUrl} alt={model.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {model.name[0]}
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-white text-sm">{model.name}</p>
                    {model.age && <p className="text-[11px] text-muted-foreground">Age {model.age}</p>}
                    <p className="text-[11px] text-primary mt-1">From ${model.callRates.fifteenMin}/15min</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="glass-panel p-5 rounded-2xl">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Session Duration
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    duration === d.value
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-black/30 hover:border-white/30"
                  }`}
                >
                  <p className="font-bold text-white">{d.label}</p>
                  {selectedModelData && (
                    <p className="text-sm text-primary mt-1">
                      ${selectedModelData.callRates[RATE_KEYS[d.value] as keyof typeof selectedModelData.callRates]}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" /> Your Telegram
            </h2>
            <input
              type="text"
              value={telegramNumber}
              onChange={e => setTelegramNumber(e.target.value)}
              placeholder="@username or +1234567890"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              required
            />
          </div>

          {/* Payment */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h2 className="font-bold text-white">Payment</h2>

            {enabledMethods.length > 1 && (
              <div className="flex gap-1 p-1 bg-black/40 rounded-xl">
                {enabledMethods.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      paymentMethod === m ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {m === "cashapp" ? "CashApp" : m === "giftcard" ? "Gift Card" : "Crypto"}
                  </button>
                ))}
              </div>
            )}

            {/* CashApp */}
            {paymentMethod === "cashapp" && (
              <div className="space-y-4">
                {selectedModelData && (
                  <div className="text-center space-y-3">
                    <div className="bg-white p-3 w-40 h-40 mx-auto rounded-2xl shadow-lg flex items-center justify-center">
                      <img
                        src={`${import.meta.env.BASE_URL}images/qr-code.png`}
                        alt="CashApp QR"
                        className="w-full h-full object-contain"
                        onError={e => {
                          e.currentTarget.style.display = "none";
                          const p = document.createElement("p");
                          p.className = "text-gray-600 text-xs text-center";
                          p.innerHTML = `<strong>${cashappTag}</strong><br/>on CashApp`;
                          e.currentTarget.parentElement?.appendChild(p);
                        }}
                      />
                    </div>
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Send exactly</p>
                      <p className="text-2xl font-bold font-mono text-primary">${price}</p>
                      <p className="text-white font-mono font-bold">{cashappTag}</p>
                    </div>
                  </div>
                )}
                <FileUploadButton
                  label="Upload Payment Screenshot"
                  accept="image/*"
                  onUploaded={setScreenshotUrl}
                  currentValue={screenshotUrl}
                />
              </div>
            )}

            {/* Gift Card */}
            {paymentMethod === "giftcard" && (
              <div className="space-y-4">
                {/* How to buy */}
                <button
                  type="button"
                  onClick={() => setShowGiftHowTo(v => !v)}
                  className="w-full flex items-center justify-between text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 transition-colors hover:bg-blue-500/15"
                >
                  <span className="flex items-center gap-2"><Info className="w-4 h-4" /> How to buy a gift card online</span>
                  {showGiftHowTo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showGiftHowTo && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm space-y-1.5">
                    <p className="text-muted-foreground">1. Go to <strong className="text-white">Amazon.com</strong>, <strong className="text-white">Apple.com</strong>, or a retailer's website</p>
                    <p className="text-muted-foreground">2. Search <strong className="text-white">"Gift Cards"</strong> → select your brand</p>
                    <p className="text-muted-foreground">3. Choose the exact amount: <strong className="text-primary">${price || "your session price"}</strong></p>
                    <p className="text-muted-foreground">4. Complete purchase — card info will be emailed to you instantly</p>
                    <p className="text-muted-foreground">5. Submit the card info or photos below</p>
                    <p className="text-yellow-400 font-medium mt-2">✓ Accepted brands: {acceptedGiftCards}</p>
                    {settings?.gift_card_instructions && (
                      <p className="text-white border-t border-white/10 pt-2 mt-2">{settings.gift_card_instructions}</p>
                    )}
                  </div>
                )}

                {/* Upload / Type toggle */}
                <div className="flex gap-1 p-1 bg-black/40 rounded-xl">
                  {(["upload", "type"] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGiftCardInputMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${giftCardInputMode === mode ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
                    >
                      {mode === "upload" ? <><Upload className="w-3.5 h-3.5" /> Upload Photos</> : <><CreditCard className="w-3.5 h-3.5" /> Enter Card Info</>}
                    </button>
                  ))}
                </div>

                {giftCardInputMode === "upload" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Card value must equal <strong className="text-primary">${price || "session price"}</strong>.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">Front of card <span className="text-red-400">*</span></p>
                        <FileUploadButton label="Upload Front Photo" accept="image/*" onUploaded={setGiftCardUrl} currentValue={giftCardUrl} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Back of card <span className="text-muted-foreground/60">(recommended)</span></p>
                        <FileUploadButton label="Upload Back Photo" accept="image/*" onUploaded={setGiftCardBackUrl} currentValue={giftCardBackUrl} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Enter your gift card details. This info is kept strictly confidential.</p>
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

            {/* Crypto */}
            {paymentMethod === "crypto" && (
              <div className="space-y-4">
                {/* How to pay */}
                <button
                  type="button"
                  onClick={() => setShowCryptoHowTo(v => !v)}
                  className="w-full flex items-center justify-between text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 transition-colors hover:bg-orange-500/15"
                >
                  <span className="flex items-center gap-2"><Info className="w-4 h-4" /> How to pay with crypto (USDT recommended)</span>
                  {showCryptoHowTo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showCryptoHowTo && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-sm space-y-1.5">
                    <p className="text-yellow-400 font-semibold">We primarily accept USDT (Tether) — it's a stablecoin so the value never fluctuates.</p>
                    <p className="text-muted-foreground mt-2">1. Install a crypto app: <strong className="text-white">Binance</strong>, <strong className="text-white">Coinbase</strong>, or <strong className="text-white">Trust Wallet</strong></p>
                    <p className="text-muted-foreground">2. Buy USDT using your card or bank transfer</p>
                    <p className="text-muted-foreground">3. Send exactly <strong className="text-primary">${price || "your session price"}</strong> in USDT to the address below</p>
                    <p className="text-muted-foreground">4. Make sure to select the correct network (TRC20 or ERC20) when sending</p>
                    <p className="text-muted-foreground">5. Take a screenshot of the completed transaction and upload it below</p>
                    <p className="text-muted-foreground mt-1">Other accepted: {acceptedCrypto}</p>
                  </div>
                )}

                {selectedModelData && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Send exactly</p>
                        <p className="text-2xl font-bold font-mono text-orange-400">${price}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Preferred: <strong className="text-yellow-400">USDT</strong> — also accepted: {acceptedCrypto}</p>
                      </div>
                      {settings?.crypto_qr_url && (
                        <div className="bg-white p-2 rounded-xl shrink-0 w-24 h-24 flex items-center justify-center">
                          <img src={settings.crypto_qr_url} alt="Crypto wallet QR code" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                    {cryptoAddress && (
                      <div className="flex items-center gap-2">
                        <p className="text-white font-mono text-xs break-all bg-black/40 rounded-lg px-3 py-2 border border-white/10 flex-1 min-w-0">
                          {cryptoAddress}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(cryptoAddress);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="shrink-0 flex items-center gap-1.5 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg px-3 py-2.5 transition-colors whitespace-nowrap"
                        >
                          {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <FileUploadButton
                  label="Upload Transaction Screenshot"
                  accept="image/*"
                  onUploaded={setScreenshotUrl}
                  currentValue={screenshotUrl}
                />
              </div>
            )}
          </div>

          {/* Summary + Submit — always visible */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm">Session Summary</p>
              {selectedModelData ? (
                <>
                  <p className="text-white font-bold text-lg">{selectedModelData.name} — {duration} min</p>
                  <p className="text-primary font-bold text-2xl">${price}</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm italic mt-1">Select a model above to see pricing</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={createBooking.isPending}
              className="crimson-gradient-bg border-0 px-8 py-3 text-base font-bold w-full sm:w-auto"
            >
              {createBooking.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </span>
              ) : (
                "Submit Booking"
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* Booking History */
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-white font-bold text-lg mb-2">No bookings yet</p>
              <p className="text-muted-foreground text-sm mb-4">Book your first private session!</p>
              <Button onClick={() => setView("book")} className="crimson-gradient-bg border-0">
                Book Now
              </Button>
            </div>
          ) : (
            bookings.map((b: any) => (
              <div key={b.id} className="glass-panel p-5 rounded-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-white text-base">{b.modelName}</p>
                    <p className="text-muted-foreground text-sm">{b.duration} minute session</p>
                    <p className="text-primary font-semibold mt-1">${b.amount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Telegram: {b.telegramNumber}</p>
                    {b.scheduledAt && (
                      <p className="text-xs text-blue-400 mt-1">
                        Scheduled: {new Date(b.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${STATUS_STYLE[b.status] || STATUS_STYLE.pending}`}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Booked {new Date(b.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
