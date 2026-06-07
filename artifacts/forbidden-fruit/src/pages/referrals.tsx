import { useState } from "react";
import { useGetReferrals, useApplyPromoCode } from "@workspace/api-client-react";
import { ProtectedRoute } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, Crown, Check, Link as LinkIcon } from "lucide-react";

export default function Referrals() {
  return (
    <ProtectedRoute>
      <ReferralsContent />
    </ProtectedRoute>
  );
}

function ReferralsContent() {
  const { data, isLoading, refetch } = useGetReferrals();
  const [promoInput, setPromoInput] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const applyPromo = useApplyPromoCode({
    mutation: {
      onSuccess: () => {
        toast({ title: "Promo applied!", description: "Your promo code has been applied." });
        setPromoInput("");
        refetch();
      },
      onError: (err: any) => toast({ title: "Invalid code", description: err?.data?.message || "Could not apply promo code", variant: "destructive" }),
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const payingReferrals = data.referredUsers?.filter((u: any) => u.isPaying).length ?? 0;
  const progressPct = Math.min((payingReferrals / 10) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <h1 className="text-3xl font-display font-bold text-white mb-2">Rewards Program</h1>
      <p className="text-muted-foreground mb-8">Refer friends and earn exclusive rewards.</p>

      {/* Goal Progress */}
      <div className="glass-panel p-6 rounded-2xl mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="font-bold text-white">Gold Membership Goal</h2>
            <p className="text-sm text-muted-foreground">Refer 10 paying members to unlock free Gold</p>
          </div>
          {payingReferrals >= 10 && (
            <span className="ml-auto px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-sm font-bold">Achieved!</span>
          )}
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 mb-2">
          <div
            className="h-3 rounded-full crimson-gradient-bg transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{payingReferrals} / 10 paying referrals</p>
      </div>

      {/* Referral Link */}
      <div className="glass-panel p-6 rounded-2xl mb-6">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-primary" />
          Your Referral Link
        </h2>
        <div className="flex gap-2">
          <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-muted-foreground font-mono truncate">
            {data.referralLink}
          </div>
          <Button
            onClick={() => copyToClipboard(data.referralLink)}
            className="shrink-0 crimson-gradient-bg border-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Your referral code: <span className="text-primary font-mono font-bold">{data.referralCode}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-panel p-6 rounded-2xl text-center">
          <Users className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{data.referralCount}</p>
          <p className="text-sm text-muted-foreground">Total Referrals</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl text-center">
          <Gift className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{payingReferrals}</p>
          <p className="text-sm text-muted-foreground">Paying Members</p>
        </div>
      </div>

      {/* Apply Promo Code */}
      <div className="glass-panel p-6 rounded-2xl mb-6">
        <h2 className="font-bold text-white mb-4">Apply a Promo Code</h2>
        <div className="flex gap-2">
          <Input
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Enter promo code"
            className="bg-black/50 border-white/10 font-mono uppercase"
          />
          <Button
            onClick={() => applyPromo.mutate({ data: { code: promoInput } })}
            disabled={!promoInput || applyPromo.isPending}
            className="shrink-0 crimson-gradient-bg border-0"
          >
            {applyPromo.isPending ? "Applying..." : "Apply"}
          </Button>
        </div>
      </div>

      {/* Referred Users */}
      {data.referredUsers && data.referredUsers.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-bold text-white">Referred Members</h2>
          </div>
          <div className="divide-y divide-white/5">
            {data.referredUsers.map((user: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(user.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isPaying ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-muted-foreground'}`}>
                  {user.isPaying ? "Paying" : "Free"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
