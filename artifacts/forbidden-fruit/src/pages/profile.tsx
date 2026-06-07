import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { User, Shield, Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const TIER_COLOR: Record<string, string> = {
  none: "text-green-400 border-green-400/30 bg-green-400/10",
  bronze: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  silver: "text-gray-300 border-gray-300/30 bg-gray-300/10",
  gold: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { data: profile, isLoading, refetch } = useGetProfile();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const updateMut = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        refetch();
        toast({ title: "Profile updated!", description: "Your changes have been saved." });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.data?.message || "Failed to update profile", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateMut.mutate({
      data: {
        displayName: (fd.get("displayName") as string) || undefined,
        bio: (fd.get("bio") as string) || undefined,
        avatarUrl: avatarUrl || undefined,
      },
    });
  };

  if (isLoading || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tier = profile.membershipTier;
  const tierLabel = tier === "none" ? "Free" : tier.charAt(0).toUpperCase() + tier.slice(1);
  const displayAvatar = avatarUrl || profile.avatarUrl || "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-6">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar card */}
        <div className="md:col-span-1 space-y-4">
          <div className="glass-panel p-6 rounded-2xl text-center space-y-4">
            {/* Avatar */}
            <div className="relative w-28 h-28 mx-auto">
              <div className="w-28 h-28 rounded-full bg-card border-4 border-primary/30 overflow-hidden">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                {profile.displayName || profile.username}
              </h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>

            <div className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${TIER_COLOR[tier]}`}>
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              {tierLabel} Member
            </div>

            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-white font-bold text-lg">{profile.referralCount}</p>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
              <div>
                <p className="text-white font-bold text-lg">{profile.referralCode}</p>
                <p className="text-xs text-muted-foreground">Your Code</p>
              </div>
            </div>
          </div>

          {/* Membership status */}
          {profile.membershipExpiry && (
            <div className="glass-panel p-4 rounded-xl text-sm">
              <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Membership Expires</p>
              <p className="text-white font-bold">
                {new Date(profile.membershipExpiry).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="md:col-span-2 glass-panel p-6 sm:p-8 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Edit Profile</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <Input
                name="displayName"
                defaultValue={profile.displayName ?? ""}
                placeholder="Your display name"
                className="bg-black/50 border-white/10 h-11"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Bio
              </label>
              <Textarea
                name="bio"
                defaultValue={profile.bio ?? ""}
                placeholder="Tell us a bit about yourself..."
                className="bg-black/50 border-white/10 resize-none h-28"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Avatar URL
              </label>
              <Input
                type="url"
                placeholder="https://example.com/your-photo.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="bg-black/50 border-white/10 h-11"
              />
              {displayAvatar && (
                <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border border-white/20">
                  <img src={displayAvatar} alt="Preview" className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" className="crimson-gradient-bg border-0 px-8 h-11" disabled={updateMut.isPending}>
                {updateMut.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
