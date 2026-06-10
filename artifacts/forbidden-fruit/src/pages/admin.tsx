import { useState, useEffect, useRef } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  useAdminGetAnalytics,
  useAdminGetUsers,
  useAdminGetPayments,
  useAdminApprovePayment,
  useAdminRejectPayment,
  useAdminGetContent,
  useAdminCreateContent,
  useAdminUpdateContent,
  useAdminDeleteContent,
  useAdminGetBookings,
  useAdminUpdateBookingStatus,
  useAdminSendNotification,
  useAdminCreateModel,
  useAdminUpdateModel,
  useAdminDeleteModel,
  useGetModels,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Send,
  MessageCircle,
  Heart,
  Image as ImageIcon,
  Video,
  Users,
  DollarSign,
  Activity,
  Bell,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Settings,
  Save,
  X,
  UserX,
  UserCheck,
  RotateCcw,
  ZoomIn,
  Mail,
  AlertCircle,
  Eye,
  Copy,
  QrCode,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploadButton } from "@/components/file-upload-button";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

/* ─── helpers ────────────────────────────────────────────────── */
function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="glass-panel p-5 rounded-xl text-center">
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color || "text-white"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50";

/* ─── Proof image lightbox ───────────────────────────────────── */
function ProofModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-7 h-7" />
        </button>
        <img
          src={src}
          alt="Payment proof"
          className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/10 shadow-2xl"
        />
        <p className="text-xs text-muted-foreground mt-3">Click anywhere outside to close</p>
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Empire Control</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your platform, content, and subscribers.</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.4)]" />
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="bg-card/80 backdrop-blur-sm border border-border p-1 rounded-xl mb-8 flex flex-wrap h-auto gap-1">
            {[
              { value: "analytics", label: "Analytics" },
              { value: "users", label: "Users" },
              { value: "payments", label: "Payments" },
              { value: "content", label: "Content" },
              { value: "posts", label: "Posts" },
              { value: "models", label: "Models" },
              { value: "bookings", label: "Bookings" },
              { value: "dms", label: "DMs" },
              { value: "notifications", label: "Push Alerts" },
              { value: "settings", label: "Settings" },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-primary rounded-lg text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="content"><ContentTab /></TabsContent>
          <TabsContent value="posts"><PostsTab /></TabsContent>
          <TabsContent value="models"><ModelsTab /></TabsContent>
          <TabsContent value="bookings"><BookingsTab /></TabsContent>
          <TabsContent value="dms"><AdminDMsTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}

/* ─── Analytics ──────────────────────────────────────────────── */
function AnalyticsTab() {
  const { data, isLoading } = useAdminGetAnalytics();
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total Revenue" value={`$${data.totalRevenue}`} color="text-green-400" />
        <Stat label="Active Subs" value={data.activeSubscriptions} color="text-primary" />
        <Stat label="Pending Payments" value={data.pendingPayments} color="text-yellow-400" />
        <Stat label="New Members (30d)" value={data.recentSignups} color="text-blue-400" />
      </div>
      <div className="glass-panel p-6 rounded-xl">
        <h3 className="font-bold text-white mb-6">Revenue Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.revenueByMonth}>
            <XAxis dataKey="month" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "hsl(var(--primary))" }}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Users ──────────────────────────────────────────────────── */
function UsersTab() {
  const { data, refetch } = useAdminGetUsers();
  const { toast } = useToast();
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      refetch();
      toast({ title: vars.isActive ? "Account activated" : "Account deactivated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update account", variant: "destructive" }),
  });

  const TIER_COLOR: Record<string, string> = {
    none: "text-muted-foreground",
    bronze: "text-amber-500",
    silver: "text-gray-300",
    gold: "text-yellow-400",
  };

  return (
    <div className="glass-panel rounded-xl overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-black/50 text-muted-foreground uppercase text-xs">
          <tr>
            <th className="px-5 py-4 text-left">User</th>
            <th className="px-5 py-4 text-left">Status</th>
            <th className="px-5 py-4 text-left">Tier</th>
            <th className="px-5 py-4 text-left">Total Spent</th>
            <th className="px-5 py-4 text-left">Referrals</th>
            <th className="px-5 py-4 text-left">Joined</th>
            <th className="px-5 py-4 text-left">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data?.users.map((u: any) => {
            const isActive = u.isActive !== false;
            return (
              <tr key={u.id} className={`hover:bg-white/5 transition-colors ${!isActive ? "opacity-60" : ""}`}>
                <td className="px-5 py-4">
                  <p className="font-bold text-white">{u.username}</p>
                  <p className="text-muted-foreground text-xs">{u.email}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`font-bold uppercase text-xs ${TIER_COLOR[u.membershipTier] || "text-white"}`}>
                    {u.membershipTier}
                  </span>
                </td>
                <td className="px-5 py-4 text-green-400 font-semibold">${u.totalSpent}</td>
                <td className="px-5 py-4 text-muted-foreground">{u.referralCount ?? 0}</td>
                <td className="px-5 py-4 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  {!u.isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`gap-1.5 text-xs ${isActive ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-green-500/40 text-green-400 hover:bg-green-500/10"}`}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !isActive })}
                    >
                      {isActive ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!data?.users.length && (
        <p className="text-center py-10 text-muted-foreground">No users yet.</p>
      )}
    </div>
  );
}

/* ─── Payments ───────────────────────────────────────────────── */
function PaymentsTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const { data, refetch } = useAdminGetPayments({ status: statusFilter as any });
  const approve = useAdminApprovePayment({ mutation: { onSuccess: () => refetch() } });
  const reject = useAdminRejectPayment({ mutation: { onSuccess: () => refetch() } });
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [proofSrc, setProofSrc] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectPreset, setRejectPreset] = useState("");
  const [rejectMsg, setRejectMsg] = useState("");
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";

  const REJECT_PRESETS = [
    "Blurry / unreadable image",
    "Incorrect card brand",
    "Card already used",
    "Amount doesn't match",
    "Invalid card number or PIN",
    "Card balance insufficient",
    "Duplicate submission",
  ];

  const confirmReject = (id: number) => {
    const reason = [rejectPreset, rejectMsg].filter(Boolean).join(" — ") || "Payment rejected";
    reject.mutate({ id, data: { reason } });
    toast({ title: "Payment rejected", variant: "destructive" });
    setRejectingId(null);
    setRejectPreset("");
    setRejectMsg("");
  };

  const deleteProof = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/payments/${id}/proof`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete proof");
      return res.json();
    },
    onSuccess: () => { refetch(); toast({ title: "Proof deleted successfully" }); },
    onError: () => toast({ title: "Error", description: "Failed to delete proof", variant: "destructive" }),
  });

  const resetPayment = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/payments/${id}/pending`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: () => { refetch(); toast({ title: "Payment moved back to pending" }); },
    onError: () => toast({ title: "Error", description: "Failed to reset payment", variant: "destructive" }),
  });

  const METHOD_LABEL: Record<string, string> = {
    cashapp: "CashApp",
    giftcard: "Gift Card",
    crypto: "Crypto",
  };

  return (
    <div className="space-y-4">
      {proofSrc && <ProofModal src={proofSrc} onClose={() => setProofSrc(null)} />}

      <div className="flex gap-2 mb-2">
        {(["pending", "approved", "rejected"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all capitalize ${
              statusFilter === s ? "bg-primary border-primary text-white" : "border-white/10 text-muted-foreground hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {data?.payments.map((p: any) => {
        const isExpanded = expandedId === p.id;
        const evidenceUrl = p.screenshotUrl || p.giftCardImageUrl;
        return (
          <div key={p.id} className="glass-panel rounded-xl overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">
                  {p.username}
                  <span className="text-muted-foreground font-normal"> → </span>
                  <span className="text-primary capitalize">{p.membershipTier}</span>
                  {p.subscriptionAddon && <span className="text-xs text-muted-foreground ml-1">+ {p.subscriptionAddon}</span>}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className={`font-semibold ${p.method === "crypto" ? "text-orange-400" : p.method === "giftcard" ? "text-blue-400" : "text-green-400"}`}>
                    {METHOD_LABEL[p.method] || p.method}
                  </span>
                  {" • "}
                  <span className="text-green-400 font-semibold">${p.amount}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(p.createdAt).toLocaleString()}</p>
                {p.adminNote && <p className="text-xs text-yellow-400 mt-1">Note: {p.adminNote}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {evidenceUrl && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Proof {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {statusFilter === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        approve.mutate({ id: p.id });
                        toast({ title: "Payment approved", description: `${p.username}'s ${p.membershipTier} membership activated.` });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      disabled={approve.isPending}
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { setRejectingId(p.id); setRejectPreset(""); setRejectMsg(""); }}
                      className="gap-1.5"
                      disabled={reject.isPending}
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </>
                )}
                {(statusFilter === "approved" || statusFilter === "rejected") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                    disabled={resetPayment.isPending}
                    onClick={() => resetPayment.mutate(p.id)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Pending
                  </Button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (p.screenshotUrl || p.giftCardImageUrl) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-white/10"
                >
                  <div className="p-4 bg-black/40 space-y-4">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Payment Evidence</p>
                    {/* If typed card info */}
                    {p.screenshotUrl?.startsWith("CARD_INFO") ? (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-2 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Gift Card Details (typed by member)</p>
                        <pre className="text-sm text-white font-mono whitespace-pre-wrap">
                          {p.screenshotUrl.replace("CARD_INFO\n", "")}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4">
                        {p.screenshotUrl && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{p.method === "giftcard" ? "Front of card" : "Transaction screenshot"}</p>
                            <div className="relative inline-block">
                              <img src={p.screenshotUrl} alt="Proof" className="max-w-xs max-h-56 object-contain rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setProofSrc(p.screenshotUrl)} />
                              <button onClick={() => setProofSrc(p.screenshotUrl)} className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-1.5 rounded-lg transition-colors"><ZoomIn className="w-4 h-4 text-white" /></button>
                            </div>
                          </div>
                        )}
                        {p.giftCardImageUrl && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Back of card</p>
                            <div className="relative inline-block">
                              <img src={p.giftCardImageUrl} alt="Back of gift card" className="max-w-xs max-h-56 object-contain rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setProofSrc(p.giftCardImageUrl)} />
                              <button onClick={() => setProofSrc(p.giftCardImageUrl)} className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-1.5 rounded-lg transition-colors"><ZoomIn className="w-4 h-4 text-white" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Delete payment proof? This cannot be undone.")) {
                          deleteProof.mutate(p.id);
                          setExpandedId(null);
                        }
                      }}
                      disabled={deleteProof.isPending}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete Proof
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Rejection form */}
              {rejectingId === p.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-red-500/20"
                >
                  <div className="p-4 bg-red-500/5 space-y-3">
                    <p className="text-sm font-bold text-white flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> Reason for rejection</p>
                    <div className="flex flex-wrap gap-2">
                      {REJECT_PRESETS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRejectPreset(prev => prev === r ? "" : r)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${rejectPreset === r ? "bg-red-500/30 border-red-500 text-white" : "border-white/10 text-muted-foreground hover:border-red-400/40 hover:text-white"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={rejectMsg}
                      onChange={e => setRejectMsg(e.target.value)}
                      placeholder="Add a custom message for the member (optional)..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => confirmReject(p.id)} disabled={reject.isPending} className="gap-1.5">
                        <XCircle className="w-4 h-4" /> Confirm Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectPreset(""); setRejectMsg(""); }} className="border-white/10">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {data?.payments.length === 0 && (
        <div className="glass-panel p-12 rounded-xl text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No {statusFilter} payments.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Content form (shared create / edit) ────────────────────── */
function ContentForm({
  initial,
  modelsData,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initial?: any;
  modelsData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");

  const [isPhoneAspect, setIsPhoneAspect] = useState(initial?.isPhoneAspect ?? false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const durationVal = fd.get("duration") as string;
    onSubmit({
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
      type: fd.get("type") as any,
      tier: fd.get("tier") as any,
      videoUrl: (fd.get("videoUrl") as string) || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      modelId: fd.get("modelId") ? Number(fd.get("modelId")) : undefined,
      duration: durationVal ? Number(durationVal) : undefined,
      tags: (fd.get("tags") as string)?.split(",").map((t: string) => t.trim()).filter(Boolean) || [],
      isPhoneAspect,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className="glass-panel p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <Field label="Title">
        <input name="title" placeholder="Content title" required defaultValue={initial?.title ?? ""} className={inputClass} />
      </Field>
      <Field label="Type">
        <select name="type" defaultValue={initial?.type ?? "video"} className={inputClass}>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="gallery">Gallery</option>
        </select>
      </Field>
      <Field label="Tier">
        <select name="tier" defaultValue={initial?.tier ?? "free"} className={inputClass}>
          <option value="free">Free (everyone)</option>
          <option value="bronze">Bronze+</option>
          <option value="silver">Silver+</option>
          <option value="gold">Gold only</option>
        </select>
      </Field>
      <Field label="Model (optional)">
        <select name="modelId" defaultValue={initial?.modelId ?? ""} className={inputClass}>
          <option value="">— None —</option>
          {modelsData?.models.map((m: any) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Duration (seconds, videos)">
        <input name="duration" type="number" min="1" placeholder="e.g. 120" defaultValue={initial?.duration ?? ""} className={inputClass} />
      </Field>
      <Field label="Video URL">
        <input name="videoUrl" placeholder="https://..." defaultValue={initial?.videoUrl ?? ""} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea name="description" placeholder="Short description…" rows={2} defaultValue={initial?.description ?? ""} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Tags (comma-separated)">
          <input name="tags" placeholder="e.g. solo, lingerie, preview" defaultValue={(initial?.tags ?? []).join(", ")} className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Thumbnail">
          <FileUploadButton
            label="Upload Thumbnail"
            accept="image/*"
            onUploaded={setThumbnailUrl}
            currentValue={thumbnailUrl}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isPhoneAspect ? "border-primary/50 bg-primary/10" : "border-white/10 hover:border-white/20"}`}>
          <input
            type="checkbox"
            checked={isPhoneAspect}
            onChange={e => setIsPhoneAspect(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <div>
            <p className="text-sm font-bold text-white">Phone Aspect Ratio (9:16)</p>
            <p className="text-xs text-muted-foreground">Video was recorded in portrait mode — displays at 9:16 with fullscreen support.</p>
          </div>
        </label>
      </div>
      <div className="sm:col-span-2 flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="crimson-gradient-bg border-0 gap-2" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {submitLabel}
        </Button>
      </div>
    </motion.form>
  );
}

/* ─── Content ────────────────────────────────────────────────── */
function ContentTab() {
  const { data, refetch, isLoading } = useAdminGetContent();
  const { data: modelsData } = useGetModels();
  const create = useAdminCreateContent({ mutation: { onSuccess: () => { refetch(); setShowForm(false); toast({ title: "Content created!" }); } } });
  const updateContent = useAdminUpdateContent({ mutation: { onSuccess: () => { refetch(); setEditingContent(null); toast({ title: "Content updated!" }); } } });
  const deleteContent = useAdminDeleteContent({ mutation: { onSuccess: () => { refetch(); toast({ title: "Deleted" }); } } });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-white text-lg">Vault Content ({data?.items.length ?? 0})</h2>
        <Button onClick={() => { setShowForm(!showForm); setEditingContent(null); }} className="crimson-gradient-bg border-0 gap-2">
          <Plus className="w-4 h-4" /> Add Content
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <ContentForm
            key="create"
            modelsData={modelsData}
            onSubmit={(d) => create.mutate({ data: d })}
            onCancel={() => setShowForm(false)}
            isPending={create.isPending}
            submitLabel="Create Content"
          />
        )}
        {editingContent && (
          <ContentForm
            key={`edit-${editingContent.id}`}
            initial={editingContent}
            modelsData={modelsData}
            onSubmit={(d) => updateContent.mutate({ id: editingContent.id, data: d })}
            onCancel={() => setEditingContent(null)}
            isPending={updateContent.isPending}
            submitLabel="Save Changes"
          />
        )}
      </AnimatePresence>

      {/* Content grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-2.5 space-y-2">
                <div className="h-2.5 w-3/4 bg-white/5 rounded" />
                <div className="h-2 w-1/3 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {data?.items.map(c => (
          <div key={c.id} className="glass-panel rounded-xl overflow-hidden relative flex flex-col">
            <div className="aspect-[4/3] bg-black/50 overflow-hidden">
              {c.thumbnailUrl ? (
                <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {c.type === "video" ? (
                    <Video className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
            <div className="p-2.5 flex-1">
              <p className="font-bold text-white text-xs truncate">{c.title}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] uppercase font-bold ${
                  c.tier === "gold" ? "text-yellow-400" :
                  c.tier === "silver" ? "text-gray-300" :
                  c.tier === "bronze" ? "text-amber-500" : "text-green-400"
                }`}>{c.tier}</span>
                <span className="text-[10px] text-muted-foreground">{c.viewCount}v</span>
              </div>
            </div>
            <div className="flex border-t border-white/10">
              <button
                onClick={() => { setEditingContent(c); setShowForm(false); }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-blue-400 hover:bg-blue-500/10 transition-colors font-semibold"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <div className="w-px bg-white/10" />
              <button
                onClick={() => {
                  const val = prompt(`Set boosted likes for "${c.title}":`, String(c.boostedLikes ?? 0));
                  if (val === null) return;
                  const n = Math.max(0, parseInt(val) || 0);
                  const token = localStorage.getItem("token");
                  fetch(`${(import.meta.env.VITE_API_URL as string) || ""}/api/admin/content/${c.id}/boost-likes`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ boostedLikes: n }),
                  }).then(() => refetch());
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-pink-400 hover:bg-pink-500/10 transition-colors font-semibold"
                title={`Boost likes (current: ${c.boostedLikes ?? 0})`}
              >
                <Heart className="w-3 h-3" /> +{c.boostedLikes ?? 0}
              </button>
              <div className="w-px bg-white/10" />
              <button
                onClick={() => {
                  const val = prompt(`Set boosted views for "${c.title}":`, String((c as any).boostedViews ?? 0));
                  if (val === null) return;
                  const n = Math.max(0, parseInt(val) || 0);
                  const token = localStorage.getItem("token");
                  fetch(`${(import.meta.env.VITE_API_URL as string) || ""}/api/admin/content/${c.id}/boost-views`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ boostedViews: n }),
                  }).then(() => refetch());
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-blue-400 hover:bg-blue-500/10 transition-colors font-semibold"
                title={`Boost views (current: ${(c as any).boostedViews ?? 0})`}
              >
                <Eye className="w-3 h-3" /> +{(c as any).boostedViews ?? 0}
              </button>
              <div className="w-px bg-white/10" />
              <button
                onClick={() => {
                  if (confirm(`Delete "${c.title}"?`)) deleteContent.mutate({ id: c.id });
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors font-semibold"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!data?.items.length && (
        <div className="glass-panel p-12 rounded-xl text-center">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No content yet. Add your first piece.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ─── Models ─────────────────────────────────────────────────── */
function ModelForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initial?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      name: fd.get("name") as string,
      age: fd.get("age") ? Number(fd.get("age")) : undefined,
      bio: (fd.get("bio") as string) || undefined,
      avatarUrl: avatarUrl || undefined,
      coverImageUrl: coverImageUrl || undefined,
      isAvailableForCalls: fd.get("available") === "on",
      callRates: {
        fifteenMin: Number(fd.get("rate15") || 50),
        thirtyMin: Number(fd.get("rate30") || 90),
        sixtyMin: Number(fd.get("rate60") || 150),
      },
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className="glass-panel p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <Field label="Name">
        <input name="name" placeholder="Display name" required defaultValue={initial?.name ?? ""} className={inputClass} />
      </Field>
      <Field label="Age">
        <input name="age" type="number" min="18" max="99" placeholder="e.g. 23" defaultValue={initial?.age ?? ""} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Bio">
          <textarea name="bio" placeholder="Short bio…" rows={3} defaultValue={initial?.bio ?? ""} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Avatar URL">
          <input
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className={inputClass}
          />
          {avatarUrl && (
            <div className="mt-2 w-14 h-14 rounded-full overflow-hidden border border-white/20">
              <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          )}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Cover / Banner Image URL (optional)">
          <input
            type="url"
            placeholder="https://example.com/cover.jpg"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className={inputClass}
          />
          {coverImageUrl && (
            <div className="mt-2 h-20 rounded-xl overflow-hidden border border-white/20">
              <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          )}
        </Field>
      </div>
      <Field label="15-min Rate ($)">
        <input name="rate15" type="number" min="1" placeholder="50" defaultValue={initial?.callRates?.fifteenMin ?? ""} className={inputClass} />
      </Field>
      <Field label="30-min Rate ($)">
        <input name="rate30" type="number" min="1" placeholder="90" defaultValue={initial?.callRates?.thirtyMin ?? ""} className={inputClass} />
      </Field>
      <Field label="60-min Rate ($)">
        <input name="rate60" type="number" min="1" placeholder="150" defaultValue={initial?.callRates?.sixtyMin ?? ""} className={inputClass} />
      </Field>
      <Field label="Available for Calls?">
        <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
          <input type="checkbox" name="available" className="w-4 h-4 accent-primary" defaultChecked={initial?.isAvailableForCalls ?? true} />
          <span className="text-sm text-white">Yes, available</span>
        </label>
      </Field>
      <div className="sm:col-span-2 flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="crimson-gradient-bg border-0 gap-2" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {submitLabel}
        </Button>
      </div>
    </motion.form>
  );
}

/* ─── Posts Tab ──────────────────────────────────────────────── */
function PostsTab() {
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";
  const { toast } = useToast();
  const { data: modelsData } = useGetModels();
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [caption, setCaption] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [tier, setTier] = useState("free");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const { data: postsData, refetch, isLoading: postsLoading } = useQuery({
    queryKey: ["/api/admin/posts"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<{ posts: any[] }>;
    },
  });

  const resetForm = () => {
    setCaption(""); setMediaUrls([]); setMediaType("image"); setTier("free");
    setSelectedModelId(""); setIsPinned(false); setVideoUrl(""); setEditingPost(null); setShowForm(false);
  };

  const startEdit = (post: any) => {
    setEditingPost(post);
    setCaption(post.caption || "");
    setMediaUrls(Array.isArray(post.mediaUrls) ? post.mediaUrls : []);
    setMediaType(post.media_type || "image");
    setTier(post.tier || "free");
    setSelectedModelId(String(post.model_id || ""));
    setIsPinned(Boolean(post.isPinned));
    setVideoUrl((Array.isArray(post.mediaUrls) ? post.mediaUrls[0] : "") || "");
    setShowForm(true);
  };

  const submitPost = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const finalUrls = mediaType === "video" ? [videoUrl].filter(Boolean) : mediaUrls;
      const url = editingPost ? `${apiBase}/api/admin/posts/${editingPost.id}` : `${apiBase}/api/admin/posts`;
      const res = await fetch(url, {
        method: editingPost ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modelId: selectedModelId ? Number(selectedModelId) : null, caption, mediaUrls: finalUrls, mediaType, tier, isPinned }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: editingPost ? "Post updated" : "Post published!" }); resetForm(); refetch(); },
    onError: () => toast({ title: "Error saving post", variant: "destructive" }),
  });

  const deletePost = async (id: number) => {
    if (!confirm("Delete this post permanently?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${apiBase}/api/admin/posts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    toast({ title: "Post deleted" });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Model Posts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Post photos & videos as the model — shows in members' Feed tab</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="crimson-gradient-bg border-0 gap-2">
          <Plus className="w-4 h-4" /> New Post
        </Button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-white">{editingPost ? "Edit Post" : "Create Post"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Model (appears as)">
              <select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)} className={inputClass}>
                <option value="">— Select model —</option>
                {(modelsData as any)?.models?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Visible to">
              <select value={tier} onChange={e => setTier(e.target.value)} className={inputClass}>
                <option value="free">Everyone (Free)</option>
                <option value="bronze">Bronze members+</option>
                <option value="silver">Silver members+</option>
                <option value="gold">Gold members only</option>
              </select>
            </Field>
          </div>
          <Field label="Caption">
            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption..." className={`${inputClass} resize-none`} rows={3} />
          </Field>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Media Type</p>
            <div className="flex gap-3">
              {(["image", "video"] as const).map(t => (
                <button key={t} type="button" onClick={() => setMediaType(t)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${mediaType === t ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                  {t === "image" ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  {t === "image" ? "Images" : "Video"}
                </button>
              ))}
            </div>
          </div>
          {mediaType === "image" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{mediaUrls.length} image(s) added</p>
              <FileUploadButton label="Add Image" accept="image/*" onUploaded={(url) => setMediaUrls(prev => [...prev, url])} />
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square group">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-white/10" loading="lazy" />
                      <button onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Field label="Video URL (direct .mp4 link)">
              <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </Field>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="accent-primary w-4 h-4 rounded" />
            <span className="text-sm text-muted-foreground">📌 Pin to top of feed</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => submitPost.mutate()} disabled={submitPost.isPending} className="crimson-gradient-bg border-0 gap-2">
              {submitPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingPost ? "Update" : "Publish Post"}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {postsLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 flex items-start gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-lg bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/4 bg-white/5 rounded" />
                  <div className="h-2.5 w-3/4 bg-white/5 rounded" />
                  <div className="h-2.5 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </>
        ) : !postsData?.posts?.length ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-primary/20" />
            <p className="text-muted-foreground">No posts yet. Create your first post above.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Posts appear in the "Feed" tab for members.</p>
          </div>
        ) : postsData.posts.map((post: any) => (
          <div key={post.id} className="glass-panel rounded-xl p-4 flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-card border border-white/10 flex-shrink-0 flex items-center justify-center">
              {post.mediaUrls?.[0] ? <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                {post.model_name && <span className="text-sm font-bold text-primary">{post.model_name}</span>}
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${post.tier === "gold" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" : post.tier === "free" ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-amber-500 border-amber-500/30 bg-amber-500/10"}`}>{post.tier}</span>
                {post.isPinned && <span className="text-[10px] text-primary">📌 Pinned</span>}
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{post.caption || <span className="text-muted-foreground/40 italic">No caption</span>}</p>
              <p className="text-xs text-muted-foreground mt-1">{post.mediaUrls?.length || 0} media · ❤️ {post.likeCount || 0}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => startEdit(post)} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deletePost(post.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelsTab() {
  const { data, refetch, isLoading } = useGetModels();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingModel, setEditingModel] = useState<any | null>(null);

  const createModel = useAdminCreateModel({
    mutation: {
      onSuccess: () => { refetch(); setShowCreate(false); toast({ title: "Model created!" }); },
      onError: () => toast({ title: "Error", description: "Failed to create model", variant: "destructive" }),
    },
  });
  const updateModel = useAdminUpdateModel({
    mutation: {
      onSuccess: () => { refetch(); setEditingModel(null); toast({ title: "Model updated!" }); },
      onError: () => toast({ title: "Error", description: "Failed to update model", variant: "destructive" }),
    },
  });
  const deleteModel = useAdminDeleteModel({
    mutation: {
      onSuccess: () => { refetch(); toast({ title: "Model deleted." }); },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-white text-lg">Models ({data?.models.length ?? 0})</h2>
        <Button onClick={() => { setShowCreate(!showCreate); setEditingModel(null); }} className="crimson-gradient-bg border-0 gap-2">
          <Plus className="w-4 h-4" /> Add Model
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <ModelForm
            key="create"
            onSubmit={(d) => createModel.mutate({ data: d })}
            onCancel={() => setShowCreate(false)}
            isPending={createModel.isPending}
            submitLabel="Create Model"
          />
        )}
        {editingModel && (
          <ModelForm
            key={`edit-${editingModel.id}`}
            initial={editingModel}
            onSubmit={(d) => updateModel.mutate({ id: editingModel.id, data: d })}
            onCancel={() => setEditingModel(null)}
            isPending={updateModel.isPending}
            submitLabel="Save Changes"
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-4 flex gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 bg-white/5 rounded" />
                <div className="h-2.5 w-1/3 bg-white/5 rounded" />
                <div className="h-2.5 w-1/2 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {data?.models.map((m: any) => (
          <div key={m.id} className="glass-panel rounded-xl p-4 flex gap-4 relative group">
            <div className="w-14 h-14 rounded-full overflow-hidden border border-white/20 shrink-0">
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                  {m.name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">{m.name}</p>
              {m.age && <p className="text-xs text-muted-foreground">Age {m.age}</p>}
              <p className="text-xs text-primary mt-1">
                ${m.callRates?.fifteenMin} / ${m.callRates?.thirtyMin} / ${m.callRates?.sixtyMin}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${m.isAvailableForCalls ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {m.isAvailableForCalls ? "Available" : "Unavailable"}
                </span>
                {m.slug && (
                  <a
                    href={`/models/${m.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    /models/{m.slug} ↗
                  </a>
                )}
              </div>
            </div>
            <div className="absolute top-3 right-3 flex gap-1">
              <button
                onClick={() => {
                  const val = prompt(`Set boosted likes for "${m.name}":`, String(m.boostedLikes ?? 0));
                  if (val === null) return;
                  const n = Math.max(0, parseInt(val) || 0);
                  const token = localStorage.getItem("token");
                  fetch(`${(import.meta.env.VITE_API_URL as string) || ""}/api/admin/models/${m.id}/boost-likes`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ boostedLikes: n }),
                  }).then(() => refetch());
                }}
                className="p-1.5 bg-pink-600/80 hover:bg-pink-600 rounded-lg"
                title={`Boost likes (current: ${m.boostedLikes ?? 0})`}
              >
                <Heart className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={() => { setEditingModel(m); setShowCreate(false); }}
                className="p-1.5 bg-blue-600/80 hover:bg-blue-600 rounded-lg"
                title="Edit model"
              >
                <Edit2 className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={() => deleteModel.mutate({ id: m.id })}
                className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg"
                title="Delete model"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        ))}
        {!data?.models.length && (
          <div className="col-span-full glass-panel p-10 rounded-xl text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No models yet. Add your first model.</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/* ─── Admin DMs ──────────────────────────────────────────────── */
function AdminDMsTab() {
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";
  const token = () => localStorage.getItem("token") || "";
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, refetch, isLoading } = useQuery<{ threads: any[] }>({
    queryKey: ["/api/dms/admin/threads"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/dms/admin/threads`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Failed to load threads");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sendReply = useMutation({
    mutationFn: async ({ userId, modelId, message }: { userId: number; modelId: number | null; message: string }) => {
      const res = await fetch(`${apiBase}/api/dms/admin/reply/${userId}/${modelId ?? 0}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => { setReply(""); refetch(); },
    onError: () => toast({ title: "Error", description: "Failed to send reply", variant: "destructive" }),
  });

  const threads = data?.threads ?? [];
  const activeThread = threads.find((t: any) => t.key === selectedKey);
  const totalUnread = threads.reduce((acc: number, t: any) => acc + t.unread, 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages?.length]);

  const tierColor = (tier: string) =>
    tier === "gold" ? "text-yellow-400" :
    tier === "silver" ? "text-gray-300" :
    tier === "bronze" ? "text-amber-500" : "text-green-400";

  const handleSelectThread = (key: string) => {
    setSelectedKey(key);
    setReply("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 h-[calc(100dvh-280px)] sm:h-[70vh] min-h-[400px]">

      {/* Thread list — full width on mobile when no thread selected */}
      <div className={`sm:w-72 sm:shrink-0 glass-panel rounded-xl overflow-hidden flex flex-col
        ${activeThread ? "hidden sm:flex" : "flex w-full"}`}>
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-white text-sm">Conversations</h3>
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">{totalUnread} new</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            threads.map((t: any) => (
              <button
                key={t.key}
                onClick={() => handleSelectThread(t.key)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors active:bg-white/10
                  ${selectedKey === t.key ? "bg-primary/20 border-l-2 border-l-primary" : "hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white truncate">{t.modelName}</p>
                  {t.unread > 0 && (
                    <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {t.unread}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  from <span className="text-white/70">{t.username}</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5 italic">{t.lastMessage}</p>
                <span className={`text-[10px] uppercase font-bold ${tierColor(t.membershipTier)}`}>{t.membershipTier}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message thread — full width on mobile when a thread is selected */}
      <div className={`flex-1 flex flex-col glass-panel rounded-xl overflow-hidden
        ${!activeThread && !selectedKey ? "hidden sm:flex" : "flex"}`}>
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">Select a conversation to reply</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header with mobile back button */}
            <div className="px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedKey(null)}
                  className="sm:hidden text-muted-foreground hover:text-white p-1 -ml-1 transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <p className="font-bold text-white">{activeThread.username}</p>
                <span className="text-muted-foreground text-sm">→</span>
                <p className="font-bold text-primary">{activeThread.modelName}</p>
                <span className={`ml-auto text-[10px] uppercase font-bold ${tierColor(activeThread.membershipTier)}`}>
                  {activeThread.membershipTier}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Replying as <span className="text-white font-semibold">{activeThread.modelName}</span>
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain">
              {activeThread.messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.fromAdmin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${
                    msg.fromAdmin ? "crimson-gradient-bg text-white rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"
                  }`}>
                    {msg.fromAdmin && (
                      <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">{activeThread.modelName}</p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className="text-[10px] opacity-50 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div className="p-3 sm:p-4 border-t border-white/10 flex gap-2 shrink-0">
              <input
                type="text"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && reply.trim()) {
                    e.preventDefault();
                    sendReply.mutate({ userId: activeThread.userId, modelId: activeThread.modelId, message: reply.trim() });
                  }
                }}
                placeholder={`Reply as ${activeThread.modelName}…`}
                className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <Button
                onClick={() => reply.trim() && sendReply.mutate({ userId: activeThread.userId, modelId: activeThread.modelId, message: reply.trim() })}
                disabled={!reply.trim() || sendReply.isPending}
                className="crimson-gradient-bg border-0 shrink-0"
              >
                {sendReply.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Bookings ───────────────────────────────────────────────── */
function BookingsTab() {
  const { data, refetch } = useAdminGetBookings();
  const updateStatus = useAdminUpdateBookingStatus({ mutation: { onSuccess: () => refetch() } });
  const { toast } = useToast();

  const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-4">
      {data?.bookings.map((b: any) => (
        <div key={b.id} className="glass-panel p-5 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-bold text-white">{b.username}</p>
              <span className="text-muted-foreground">→</span>
              <p className="text-primary font-bold">{b.modelName}</p>
            </div>
            <p className="text-sm text-muted-foreground">{b.duration} min • <span className="text-green-400 font-semibold">${b.amount}</span> • {b.paymentMethod}</p>
            {b.telegramNumber && <p className="text-xs text-blue-400 mt-1">Telegram: {b.telegramNumber}</p>}
            {b.scheduledAt && <p className="text-xs text-muted-foreground mt-1">Scheduled: {new Date(b.scheduledAt).toLocaleString()}</p>}
            {b.screenshotUrl && (
              <a href={b.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                View payment proof →
              </a>
            )}
            <p className="text-xs text-muted-foreground mt-1">{new Date(b.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLE[b.status] || ""}`}>
              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
            </span>
            {b.status === "pending" && (
              <Button
                size="sm"
                onClick={() => {
                  updateStatus.mutate({ id: b.id, data: { status: "confirmed" } });
                  toast({ title: "Booking confirmed" });
                }}
                className="bg-primary hover:bg-primary/80 text-white"
              >
                Confirm
              </Button>
            )}
            {b.status === "confirmed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus.mutate({ id: b.id, data: { status: "completed" } })}
              >
                Mark Done
              </Button>
            )}
          </div>
        </div>
      ))}
      {!data?.bookings.length && (
        <div className="glass-panel p-12 rounded-xl text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No bookings yet.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Settings ───────────────────────────────────────────────── */
function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json() as Promise<{ payment_methods: string; cashapp_tag: string; crypto_address: string; accepted_gift_cards: string; accepted_crypto: string; gift_card_instructions: string; crypto_qr_url: string }>;
    },
  });

  const [enabledMethods, setEnabledMethods] = useState<Record<string, boolean>>({
    cashapp: false, giftcard: true, crypto: false,
  });
  const [cashappTag, setCashappTag] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [acceptedGiftCards, setAcceptedGiftCards] = useState("Amazon,Apple,Visa,Google Play");
  const [acceptedCrypto, setAcceptedCrypto] = useState("USDT,Bitcoin,USDC");
  const [giftCardInstructions, setGiftCardInstructions] = useState("");
  const [cryptoQrUrl, setCryptoQrUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const methods = (settings.payment_methods || "giftcard").split(",").map(s => s.trim());
      setEnabledMethods({ cashapp: methods.includes("cashapp"), giftcard: methods.includes("giftcard"), crypto: methods.includes("crypto") });
      setCashappTag(settings.cashapp_tag || "");
      setCryptoAddress(settings.crypto_address || "");
      setAcceptedGiftCards(settings.accepted_gift_cards || "Amazon,Apple,Visa,Google Play");
      setAcceptedCrypto(settings.accepted_crypto || "USDT,Bitcoin,USDC");
      setGiftCardInstructions(settings.gift_card_instructions || "");
      setCryptoQrUrl(settings.crypto_qr_url || "");
    }
  }, [settings]);

  const toggleMethod = (method: string) => {
    setEnabledMethods(prev => ({ ...prev, [method]: !prev[method] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const active = Object.entries(enabledMethods).filter(([, v]) => v).map(([k]) => k);
    if (active.length === 0) {
      toast({ title: "Select at least one payment method", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payment_methods: active.join(","), cashapp_tag: cashappTag, crypto_address: cryptoAddress, accepted_gift_cards: acceptedGiftCards, accepted_crypto: acceptedCrypto, gift_card_instructions: giftCardInstructions, crypto_qr_url: cryptoQrUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Settings saved!", description: "Changes take effect immediately." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save settings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const METHOD_OPTIONS = [
    { key: "cashapp", label: "CashApp", description: "Accept CashApp payments", color: "text-green-400" },
    { key: "giftcard", label: "Gift Card", description: "Accept Amazon, Apple, Visa, Google Play gift cards", color: "text-blue-400" },
    { key: "crypto", label: "Crypto", description: "Accept cryptocurrency payments (Bitcoin, USDT, etc.)", color: "text-orange-400" },
  ];

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSave} className="space-y-6">

        {/* Payment methods */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Accepted Payment Methods</h3>
              <p className="text-xs text-muted-foreground">Toggle which methods members can use — select all that apply</p>
            </div>
          </div>
          <div className="space-y-2">
            {METHOD_OPTIONS.map(opt => (
              <label
                key={opt.key}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  enabledMethods[opt.key]
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!enabledMethods[opt.key]}
                  onChange={() => toggleMethod(opt.key)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${enabledMethods[opt.key] ? opt.color : "text-white"}`}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${enabledMethods[opt.key] ? "bg-green-400" : "bg-white/20"}`} />
              </label>
            ))}
          </div>
        </div>

        {/* CashApp settings */}
        {enabledMethods.cashapp && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">CashApp Tag</h3>
                <p className="text-xs text-muted-foreground">Shown to members when they choose CashApp</p>
              </div>
            </div>
            <Field label="Your CashApp Tag">
              <input
                type="text"
                value={cashappTag}
                onChange={(e) => {
                  const v = e.target.value;
                  setCashappTag(v.startsWith("$") ? v : `$${v}`);
                }}
                placeholder="$YourCashTag"
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
        )}

        {/* Gift Card settings */}
        {enabledMethods.giftcard && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Accepted Gift Cards</h3>
                <p className="text-xs text-muted-foreground">Comma-separated list of accepted gift card brands</p>
              </div>
            </div>
            <Field label="Accepted Gift Card Types">
              <input
                type="text"
                value={acceptedGiftCards}
                onChange={(e) => setAcceptedGiftCards(e.target.value)}
                placeholder="Amazon,Apple,Visa,Google Play"
                className={inputClass}
              />
            </Field>
            <Field label="Gift Card Instructions (shown to members)">
              <textarea
                value={giftCardInstructions}
                onChange={(e) => setGiftCardInstructions(e.target.value)}
                placeholder="e.g. Purchase an Amazon gift card from amazon.com/giftcards — physical or digital both accepted. Email us the redemption code."
                className={`${inputClass} resize-none`}
                rows={3}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Separate brands with a comma. Instructions appear inside the how-to guide on the booking page.
            </p>
          </div>
        )}

        {/* Crypto settings */}
        {enabledMethods.crypto && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Activity className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Crypto Settings</h3>
                <p className="text-xs text-muted-foreground">Wallet address and accepted coin types</p>
              </div>
            </div>
            <Field label="Wallet Address">
              <input
                type="text"
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                placeholder="e.g. bc1qxy2k... or 0x4E3f..."
                className={`${inputClass} font-mono text-xs`}
              />
            </Field>
            <Field label="Accepted Cryptocurrencies">
              <input
                type="text"
                value={acceptedCrypto}
                onChange={(e) => setAcceptedCrypto(e.target.value)}
                placeholder="USDT,Bitcoin,USDC,Ethereum"
                className={inputClass}
              />
            </Field>
            <div>
              <p className="text-sm font-medium text-white mb-2">Wallet QR Code</p>
              <p className="text-xs text-muted-foreground mb-3">Upload a QR code image of your wallet address — members can scan it directly on the booking page.</p>
              <FileUploadButton
                label={cryptoQrUrl ? "Replace QR Code" : "Upload QR Code Image"}
                accept="image/*"
                onUploaded={setCryptoQrUrl}
                currentValue={cryptoQrUrl}
              />
              {cryptoQrUrl && (
                <div className="mt-3 bg-white p-2 rounded-xl w-28 h-28 flex items-center justify-center">
                  <img src={cryptoQrUrl} alt="QR preview" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              USDT is the primary accepted coin. Separate each coin with a comma.
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 crimson-gradient-bg border-0 text-base font-bold gap-2"
          disabled={isSaving}
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Settings</>}
        </Button>
      </form>
    </div>
  );
}

/* ─── Notifications ──────────────────────────────────────────── */
const TIER_OPTIONS = [
  { value: "", label: "All Members (every tier)" },
  { value: "none", label: "Free Tier Users" },
  { value: "bronze", label: "Bronze Members" },
  { value: "silver", label: "Silver Members" },
  { value: "gold", label: "Gold Members" },
];

function NotificationsTab() {
  const [mode, setMode] = useState<"inapp" | "email">("inapp");

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex gap-1 p-1 bg-black/40 border border-white/10 rounded-xl">
        <button
          onClick={() => setMode("inapp")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            mode === "inapp" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-white"
          }`}
        >
          <Bell className="w-4 h-4" /> In-App Alert
        </button>
        <button
          onClick={() => setMode("email")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            mode === "email" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-white"
          }`}
        >
          <Mail className="w-4 h-4" /> Email Blast
        </button>
      </div>

      {mode === "inapp" && <InAppAlertForm />}
      {mode === "email" && <EmailBlastForm />}
    </div>
  );
}

function InAppAlertForm() {
  const { toast } = useToast();
  const send = useAdminSendNotification({ mutation: { onSuccess: () => { toast({ title: "Notification sent!" }); } } });

  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tier = fd.get("tier") as string;
    send.mutate({
      data: {
        title: fd.get("title") as string,
        message: fd.get("message") as string,
        type: fd.get("type") as any || "system",
        targetTier: (tier || null) as any,
      },
    });
    e.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSend} className="glass-panel p-8 rounded-2xl space-y-5">
      <div>
        <h3 className="font-bold text-xl text-white mb-1">Push Notification</h3>
        <p className="text-sm text-muted-foreground">Appears in the member's notification bell instantly.</p>
      </div>
      <Field label="Title">
        <input name="title" placeholder="Notification title..." required className={inputClass} />
      </Field>
      <Field label="Message">
        <textarea name="message" placeholder="Write your message..." required rows={4} className={`${inputClass} resize-none`} />
      </Field>
      <Field label="Type">
        <select name="type" className={inputClass}>
          <option value="system">System Announcement</option>
          <option value="new_content">New Content Alert</option>
          <option value="promotion">Promotion / Sale</option>
          <option value="personal">Personal Message</option>
        </select>
      </Field>
      <Field label="Target Audience">
        <select name="tier" className={inputClass}>
          {TIER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Button type="submit" className="w-full h-12 crimson-gradient-bg border-0 text-base font-bold gap-2" disabled={send.isPending}>
        {send.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Notification</>}
      </Button>
    </form>
  );
}

function EmailBlastForm() {
  const { toast } = useToast();
  const apiBase = (import.meta.env.VITE_API_URL as string) || "";
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);

  useState(() => {
    const token = localStorage.getItem("token");
    fetch(`${apiBase}/api/admin/email-campaign/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setEmailEnabled(d.enabled))
      .catch(() => setEmailEnabled(false));
  });

  const handleTestEmail = async () => {
    setTestSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/email-campaign/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast({ title: "Test email sent! ✅", description: `Check your admin inbox — sent to ${data.sentTo}` });
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    } finally {
      setTestSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const subject = fd.get("subject") as string;
    const message = fd.get("message") as string;
    const targetTier = fd.get("tier") as string;

    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/email-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message, targetTier: targetTier || "all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast({ title: `Email campaign sent!`, description: `${data.sent} emails delivered${data.failed ? `, ${data.failed} failed` : ""}.` });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {emailEnabled === false && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-300">Email not configured</p>
            <p className="text-xs text-yellow-400/80 mt-1">
              Add <code className="bg-black/40 px-1 rounded">BREVO_API_KEY</code> and <code className="bg-black/40 px-1 rounded">BREVO_FROM_EMAIL</code> to your Render environment variables to enable email sending.
            </p>
          </div>
        </div>
      )}

      <div className="glass-panel p-5 rounded-xl border border-white/5">
        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-3">Auto-sent transactional emails</p>
        <div className="space-y-2">
          {[
            { label: "Welcome email", when: "On new registration" },
            { label: "Payment approved", when: "When you approve a payment" },
            { label: "Payment rejected", when: "When you reject a payment" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-white">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.when}</span>
            </div>
          ))}
        </div>
        {emailEnabled === true && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 w-full border-white/10 text-white hover:bg-white/5 gap-2"
            disabled={testSending}
            onClick={handleTestEmail}
          >
            {testSending ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending test...</> : <><Mail className="w-3 h-3" /> Send test email to admin</>}
          </Button>
        )}
      </div>

      <form onSubmit={handleSend} className="glass-panel p-8 rounded-2xl space-y-5">
        <div>
          <h3 className="font-bold text-xl text-white mb-1">Email Campaign</h3>
          <p className="text-sm text-muted-foreground">Send a real email to members' inboxes by tier.</p>
        </div>
        <Field label="Subject Line">
          <input name="subject" placeholder="e.g. New content just dropped 🔥" required className={inputClass} />
        </Field>
        <Field label="Message Body">
          <textarea
            name="message"
            placeholder={"Write your message...\n\nUse blank lines to separate paragraphs."}
            required
            rows={6}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label="Target Audience">
          <select name="tier" className={inputClass}>
            {TIER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Button
          type="submit"
          className="w-full h-12 crimson-gradient-bg border-0 text-base font-bold gap-2"
          disabled={sending || emailEnabled === false}
        >
          {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4" /> Send Email Blast</>}
        </Button>
      </form>
    </div>
  );
}
