import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Lock, Mail, User as UserIcon, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage({ mode = "login" }: { mode?: "login" | "register" }) {
  const [isLogin, setIsLogin] = useState(mode === "login");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const refCode = new URLSearchParams(search).get("ref") ?? "";
  const { refetch } = useAuth();
  const { toast } = useToast();

  const loginMut = useLogin({
    mutation: {
      onSuccess: async (data) => {
        localStorage.setItem("token", data.token);
        await refetch();
        setLocation("/content");
        toast({ title: "Welcome back", description: "Successfully logged in." });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to login", variant: "destructive" })
    }
  });

  const registerMut = useRegister({
    mutation: {
      onSuccess: async (data) => {
        localStorage.setItem("token", data.token);
        await refetch();
        setLocation("/content");
        toast({ title: "Account created", description: "Welcome to Forbidden Fruit!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message || "Registration failed", variant: "destructive" })
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    if (isLogin) {
      loginMut.mutate({ data: { email, password } });
    } else {
      const username = fd.get("username") as string;
      const referralCode = fd.get("referralCode") as string;
      registerMut.mutate({ data: { email, password, username, referralCode: referralCode || undefined } });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative min-h-[80vh]">
      <SEOHead
        title={isLogin ? "Member Login" : "Join Forbidden Fruit — Create Your Account"}
        description={isLogin ? "Sign in to your Forbidden Fruit account to access exclusive members-only content." : "Create your free Forbidden Fruit account and choose a membership tier to unlock exclusive adult content."}
        canonical={isLogin ? "/login" : "/register"}
        noIndex
      />
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img src={`${import.meta.env.BASE_URL}images/gold-texture.png`} className="w-full h-full object-cover" alt="" 
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      </div>
      
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-white mb-2">
            {isLogin ? "Welcome Back" : "Join the Elite"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isLogin ? "Enter your credentials to access your content." : "Create an account to unlock premium experiences."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input name="username" placeholder="Username" className="pl-10 bg-black/50 border-white/10 h-12" required />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input name="email" type="email" placeholder="Email Address" className="pl-10 bg-black/50 border-white/10 h-12" required />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input name="password" type="password" placeholder="Password" className="pl-10 bg-black/50 border-white/10 h-12" required />
          </div>

          {!isLogin && (
            <div className="relative">
              <Tag className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                name="referralCode"
                placeholder="Referral Code (Optional)"
                defaultValue={refCode}
                className="pl-10 bg-black/50 border-white/10 h-12"
              />
              {refCode && (
                <p className="text-xs text-green-400 mt-1 pl-1">✓ Referral code applied: {refCode}</p>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-bold crimson-gradient-bg border-0 rounded-xl gap-3"
            disabled={loginMut.isPending || registerMut.isPending}
          >
            {(loginMut.isPending || registerMut.isPending) && <Spinner size="xs" />}
            {loginMut.isPending || registerMut.isPending ? "Please wait…" : (isLogin ? "Log In" : "Create Account")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already a member? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
