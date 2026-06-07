import { useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { ProtectedRoute } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, Check, CreditCard, Video, Gift, Star, Settings, Shield } from "lucide-react";

export default function Notifications() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  payment: <CreditCard className="w-5 h-5 text-green-400" />,
  booking: <Video className="w-5 h-5 text-blue-400" />,
  referral: <Gift className="w-5 h-5 text-yellow-400" />,
  content: <Star className="w-5 h-5 text-purple-400" />,
  system: <Settings className="w-5 h-5 text-muted-foreground" />,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationsContent() {
  const { data, isLoading, refetch } = useGetNotifications();

  const markAll = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => refetch() }
  });

  const markOne = useMarkNotificationRead({
    mutation: { onSuccess: () => refetch() }
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="border-white/10 hover:bg-white/5 text-sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-white font-bold text-lg mb-2">All caught up!</p>
          <p className="text-muted-foreground text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`glass-panel p-4 rounded-xl transition-all ${!n.isRead ? 'border border-primary/30 bg-primary/5' : 'opacity-70'}`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  {TYPE_ICONS[n.type] ?? <Bell className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-semibold text-sm ${!n.isRead ? 'text-white' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-0.5">
                        <Shield className="w-2.5 h-2.5" /> System
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markOne.mutate({ id: n.id })}
                    className="shrink-0 text-muted-foreground hover:text-white transition-colors p-1"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
