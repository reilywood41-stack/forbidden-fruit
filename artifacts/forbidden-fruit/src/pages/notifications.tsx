import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from "@workspace/api-client-react";
import { ProtectedRoute } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, Check, CreditCard, Video, Gift, Star, Settings, Shield, Trash2, X } from "lucide-react";
import { useState } from "react";

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
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const markAll = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => refetch() },
  });

  const markOne = useMarkNotificationRead({
    mutation: { onSuccess: () => refetch() },
  });

  const deleteOne = useDeleteNotification({
    mutation: { onSuccess: () => refetch() },
  });

  const deleteAll = useDeleteAllNotifications({
    mutation: {
      onSuccess: () => {
        refetch();
        setConfirmClearAll(false);
      },
    },
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
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
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
            {confirmClearAll ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Clear all?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteAll.mutate()}
                  disabled={deleteAll.isPending}
                  className="text-xs h-8 px-3"
                >
                  {deleteAll.isPending ? "Clearing…" : "Yes, clear"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmClearAll(false)}
                  className="border-white/10 hover:bg-white/5 h-8 px-3 text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClearAll(true)}
                className="border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
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
              className={`glass-panel p-4 rounded-xl transition-all group ${
                !n.isRead ? "border border-primary/30 bg-primary/5" : "opacity-70 hover:opacity-90"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  {TYPE_ICONS[n.type] ?? <Bell className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-semibold text-sm ${!n.isRead ? "text-white" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-0.5">
                        <Shield className="w-2.5 h-2.5" /> {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.isRead && (
                    <button
                      onClick={() => markOne.mutate({ id: n.id })}
                      className="text-muted-foreground hover:text-green-400 transition-colors p-1.5 rounded-lg hover:bg-green-500/10"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteOne.mutate({ id: n.id })}
                    disabled={deleteOne.isPending}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
