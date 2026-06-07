import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LogOut, User, Crown, LayoutDashboard, Bell, Video, Gift, PlaySquare, Menu, X, MessageCircle, Rss } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useGetNotifications } from "@workspace/api-client-react";

const apiBase = (import.meta.env.VITE_API_URL as string) || "";

function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const { data } = useGetNotifications({ query: { enabled: isAuthenticated, refetchInterval: 30000 } as any });
  return data?.unreadCount ?? 0;
}

function useUnreadDMs() {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery({
    queryKey: ["/api/dms/unread"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/dms/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { unread: 0 };
      return res.json() as Promise<{ unread: number }>;
    },
    enabled: isAuthenticated,
    refetchInterval: 20000,
  });
  return data?.unread ?? 0;
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useUnreadCount();

  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("token");
        queryClient.clear();
        setLocation("/login");
      }
    }
  });

  const unreadDMs = useUnreadDMs();

  const navLinks = isAuthenticated ? [
    { href: "/posts", label: "Feed", icon: <Rss className="w-4 h-4" />, badge: 0 },
    { href: "/content", label: "Vault", icon: <PlaySquare className="w-4 h-4" />, badge: 0 },
    { href: "/membership", label: "VIP Tiers", icon: <Crown className="w-4 h-4" />, badge: 0 },
    { href: "/bookings", label: "Bookings", icon: <Video className="w-4 h-4" />, badge: 0 },
    { href: "/referrals", label: "Rewards", icon: <Gift className="w-4 h-4" />, badge: 0 },
    { href: "/dms", label: "Messages", icon: <MessageCircle className="w-4 h-4" />, badge: unreadDMs },
  ] : [];

  const handleLogout = () => {
    setMenuOpen(false);
    logout.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 glass-panel border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <Link href={isAuthenticated ? "/content" : "/"} className="flex items-center space-x-2 group" onClick={() => setMenuOpen(false)}>
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt="Forbidden Fruit"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-105 transition-transform"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' }}
              />
              <span className="font-display text-lg sm:text-2xl font-bold gold-gradient-text tracking-wider">
                Forbidden Fruit
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${location.startsWith(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                >
                  <span className="relative">
                    {link.icon}
                    {link.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-primary rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5">
                        {link.badge > 9 ? "9+" : link.badge}
                      </span>
                    )}
                  </span>
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop right side */}
            <div className="hidden md:flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <Link href="/notifications" className="p-2 text-muted-foreground hover:text-primary transition-colors relative">
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin" className="p-2 text-muted-foreground hover:text-yellow-400 transition-colors" title="Admin Dashboard">
                      <LayoutDashboard className="w-5 h-5" />
                    </Link>
                  )}
                  <div className="flex items-center gap-3 border-l border-border pl-3">
                    <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
                      <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center overflow-hidden border border-white/10">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-medium">{user?.username}</span>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex space-x-3">
                  <Link href="/login" className="px-5 py-2 text-sm font-medium text-white hover:text-primary transition-colors">
                    Log In
                  </Link>
                  <Link href="/register" className="px-5 py-2 text-sm font-medium crimson-gradient-bg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                    Join the Club
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile right side */}
            <div className="flex md:hidden items-center gap-2">
              {isAuthenticated && (
                <Link href="/notifications" className="p-2 text-muted-foreground hover:text-primary transition-colors relative">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              )}
              {!isAuthenticated && (
                <Link href="/login" className="px-4 py-1.5 text-sm font-medium text-white hover:text-primary transition-colors">
                  Log In
                </Link>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-muted-foreground hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden glass-panel border-b border-border/40 z-40 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {isAuthenticated ? (
                <>
                  {/* User info */}
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors mb-2">
                    <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center border border-white/10">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{user?.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.membershipTier} member</p>
                    </div>
                  </Link>

                  <div className="h-px bg-white/10 my-2" />

                  {navLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.startsWith(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                    >
                      <span className="relative">
                        {link.icon}
                        {link.badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-primary rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5">
                            {link.badge > 9 ? "9+" : link.badge}
                          </span>
                        )}
                      </span>
                      {link.label}
                      {link.badge > 0 && (
                        <span className="ml-auto bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {link.badge > 9 ? "9+" : link.badge}
                        </span>
                      )}
                    </Link>
                  ))}

                  {user?.isAdmin && (
                    <>
                      <div className="h-px bg-white/10 my-2" />
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-yellow-400 hover:bg-yellow-400/10 transition-all"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    </>
                  )}

                  <div className="h-px bg-white/10 my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-white/5 transition-all">
                    Log In
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium crimson-gradient-bg">
                    Join the Club
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative z-0">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-muted-foreground bg-black/50">
        <p className="font-display text-sm">&copy; {new Date().getFullYear()} Forbidden Fruit. All rights reserved.</p>
        <p className="text-xs mt-1 opacity-50">Premium exclusive adult content. 18+ only.</p>
      </footer>
    </div>
  );
}
