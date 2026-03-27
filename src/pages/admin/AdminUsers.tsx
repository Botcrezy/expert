import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
   Users, 
  Search,
  MoreVertical,
  Mail,
  Calendar,
  Shield,
  Loader2,
  Phone,
  Eye,
  UserCog,
  Ban,
  Trash2,
  ShieldCheck,
  Star,
  ExternalLink,
  CreditCard,
  Plus,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditUser, setCreditUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditType, setCreditType] = useState<"add" | "subtract">("add");
  const [creditReason, setCreditReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("*");

      const { data: subscriptions } = await supabase
        .from("client_subscriptions")
        .select("*, plans(name_ar)")
        .eq("is_active", true);

      const { data: freelancerProfiles } = await supabase
        .from("freelancer_profiles")
        .select("user_id, stars, completed_tasks, is_verified, verification_status");

      // Latest wallet balance per user (freelancers)
      const { data: walletLedger } = await supabase
        .from("wallet_ledger" as any)
        .select("user_id, balance_after, created_at")
        .order("created_at", { ascending: false });

      const walletByUser: Record<string, number> = {};
      (walletLedger || []).forEach((entry: any) => {
        if (!(entry.user_id in walletByUser)) {
          walletByUser[entry.user_id] = entry.balance_after ?? 0;
        }
      });

      // Latest credits wallet balance per user (clients)
      const { data: creditsLedger } = await supabase
        .from("credits_ledger" as any)
        .select("user_id, balance_after, created_at")
        .order("created_at", { ascending: false });

      const creditsWalletByUser: Record<string, number> = {};
      (creditsLedger || []).forEach((entry: any) => {
        if (!(entry.user_id in creditsWalletByUser)) {
          creditsWalletByUser[entry.user_id] = entry.balance_after ?? 0;
        }
      });

      return (profiles || []).map((p) => {
        const subscription = subscriptions?.find((s) => s.user_id === p.user_id);
        const subscriptionCredits = subscription?.credits_remaining || 0;
        const walletCredits = creditsWalletByUser[p.user_id] || 0;

        return {
          ...p,
          role: roles?.find((r) => r.user_id === p.user_id)?.role || "client",
          subscription,
          freelancerProfile: freelancerProfiles?.find((f) => f.user_id === p.user_id),
          clientTotalCredits: subscriptionCredits + walletCredits,
          freelancerWalletBalance: walletByUser[p.user_id] || 0,
        };
      });
    },
  });

  const callAdminUsers = async (payload: any) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: payload,
    });

    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "client" | "freelancer" | "team_leader" | "admin" }) => {
      await callAdminUsers({ action: "set_role", userId, role });
    },
    onSuccess: (_, { userId, role }) => {
      queryClient.setQueryData(["admin-users"], (old: any) =>
        (old || []).map((u: any) => (u.user_id === userId ? { ...u, role } : u))
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم تحديث الدور بنجاح ✅" });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, ban, userName }: { userId: string; ban: boolean; userName: string }) => {
      await callAdminUsers({ action: "set_ban", userId, value: ban, userName });
    },
    onSuccess: (_, { userId, ban }) => {
      queryClient.setQueryData(["admin-users"], (old: any) =>
        (old || []).map((u: any) => (u.user_id === userId ? { ...u, is_banned: ban } : u))
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: ban ? "تم حظر المستخدم ✅" : "تم إلغاء الحظر ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      await callAdminUsers({ action: "set_verification", userId, value: verified });
    },
    onSuccess: (_, { userId, verified }) => {
      queryClient.setQueryData(["admin-users"], (old: any) =>
        (old || []).map((u: any) => (u.user_id === userId ? { ...u, is_verified: verified } : u))
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: verified ? "تم توثيق الحساب ✅" : "تم إلغاء التوثيق" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, userName }: { userId: string; userName: string }) => {
      await callAdminUsers({ action: "delete_user", userId, userName });
    },
    onSuccess: (_, { userId }) => {
      queryClient.setQueryData(["admin-users"], (old: any) => (old || []).filter((u: any) => u.user_id !== userId));
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم حذف المستخدم ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const { mutate: adjustCredits, isPending: adjustingCredits } = useMutation({
    mutationFn: async () => {
      if (!creditUser) throw new Error("لا يوجد مستخدم محدد");
      const amount = parseInt(creditAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("المبلغ غير صالح");

      const { data: subscription } = await supabase
        .from("client_subscriptions")
        .select("*")
        .eq("user_id", creditUser.user_id)
        .eq("is_active", true)
        .maybeSingle();

      const currentBalance = subscription?.credits_remaining || 0;
      const newBalance = creditType === "add" ? currentBalance + amount : currentBalance - amount;
      if (newBalance < 0) throw new Error("لا يمكن أن يكون الرصيد بالسالب");

      if (subscription) {
        await supabase
          .from("client_subscriptions")
          .update({ credits_remaining: newBalance })
          .eq("id", subscription.id);
      }

      await supabase.from("credits_ledger").insert({
        user_id: creditUser.user_id,
        amount: creditType === "add" ? amount : -amount,
        balance_after: newBalance,
        type: creditType === "add" ? "admin_credit" : "admin_debit",
        reason: creditReason,
        created_by: adminUser?.id,
      });

      // Log audit + system entry for credit change
      try {
        await supabase.from("audit_logs").insert({
          action: creditType === "add" ? "add_credit" : "subtract_credit",
          entity_type: "user_credit",
          entity_id: creditUser.user_id,
          new_values: { amount, newBalance, reason: creditReason },
          user_id: adminUser?.id ?? null,
        });

        await (supabase as any).from("system_logs").insert({
          user_id: adminUser?.id ?? null,
          action_type: "update",
          entity_type: "user_credit",
          details: {
            target_user_id: creditUser.user_id,
            amount,
            creditType,
            newBalance,
          },
        });
      } catch (e) {
        console.error("Failed to write credit change logs", e);
      }
    },
    onSuccess: () => {
      toast({ title: "تم تعديل الكريديت بنجاح ✅" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCreditDialogOpen(false);
      setCreditAmount("");
      setCreditReason("");
      setCreditUser(null);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; class: string }> = {
      client: { label: "عميل", class: "bg-blue-100 text-blue-700" },
      freelancer: { label: "فريلانسر", class: "bg-purple-100 text-purple-700" },
      admin: { label: "أدمن", class: "bg-red-100 text-red-700" },
      team_leader: { label: "قائد فريق", class: "bg-orange-100 text-orange-700" },
    };
    return roles[role] || { label: role, class: "bg-gray-100 text-gray-700" };
  };

  const clientCount = users?.filter(u => u.role === "client").length || 0;
  const freelancerCount = users?.filter(u => u.role === "freelancer").length || 0;
  const adminCount = users?.filter(u => u.role === "admin" || u.role === "team_leader").length || 0;

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة المستخدمين"
      subtitle="عرض وإدارة جميع المستخدمين في المنصة"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <div 
          className={`card-elevated p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setRoleFilter("all")}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{users?.length || 0}</p>
            <p className="text-sm text-muted-foreground">إجمالي</p>
          </div>
        </div>
        <div 
          className={`card-elevated p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === "client" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setRoleFilter("client")}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{clientCount}</p>
            <p className="text-sm text-muted-foreground">عملاء</p>
          </div>
        </div>
        <div 
          className={`card-elevated p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === "freelancer" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setRoleFilter("freelancer")}
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{freelancerCount}</p>
            <p className="text-sm text-muted-foreground">فريلانسرز</p>
          </div>
        </div>
        <div 
          className={`card-elevated p-4 flex items-center gap-3 cursor-pointer transition-all ${roleFilter === "admin" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setRoleFilter("admin")}
        >
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{adminCount}</p>
            <p className="text-sm text-muted-foreground">إداريين</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الهاتف</th>
                <th>الدور</th>
                <th>الباقة</th>
                <th>كريديتس العميل</th>
                <th>رصيد الفريلانسر</th>
                <th>تاريخ التسجيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  
                  return (
                    <tr key={user.id} className={user.is_banned ? "bg-red-50 dark:bg-red-950/20" : ""}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar_url} alt={user.full_name} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{user.full_name}</p>
                              {user.is_verified && (
                                <span title="حساب موثق">
                                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                                </span>
                              )}
                              {user.is_banned && (
                                <Badge variant="destructive" className="text-xs">محظور</Badge>
                              )}
                            </div>
                            {user.role === "client" && (
                              <p className="text-xs text-muted-foreground">
                                كريديتس العميل: <span className="font-semibold">{user.clientTotalCredits}</span>
                              </p>
                            )}
                            {user.role === "freelancer" && (
                              <p className="text-xs text-muted-foreground">
                                رصيد الفريلانسر: <span className="font-semibold">{user.freelancerWalletBalance} ج.م</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {user.phone || "-"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <Badge className={roleBadge.class}>
                            {roleBadge.label}
                          </Badge>
                          {user.role === "freelancer" && user.freelancerProfile && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {user.freelancerProfile.stars || 0} نجمة
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {user.subscription ? (
                          <Badge variant="secondary">
                            {(user.subscription.plans as any)?.name_ar || "اشتراك نشط"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td>
                        {user.role === "client" ? (
                          <span className="text-muted-foreground text-sm font-semibold">
                            {user.clientTotalCredits}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td>
                        {user.role === "freelancer" ? (
                          <span className="text-muted-foreground text-sm font-semibold">
                            {user.freelancerWalletBalance} ج.م
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(user.created_at), "dd MMM yyyy", { locale: ar })}
                        </span>
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingUser(user)}>
                              <Eye className="w-4 h-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            {user.role === "freelancer" && (
                              <DropdownMenuItem onClick={() => navigate(`/admin/freelancer/${user.user_id}`)}>
                                <ExternalLink className="w-4 h-4 ml-2" />
                                عرض بروفايل الفريلانسر
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                            }}>
                              <UserCog className="w-4 h-4 ml-2" />
                              تعديل الدور
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleVerificationMutation.mutate({
                                userId: user.user_id,
                                verified: !user.is_verified
                              })}
                            >
                              <ShieldCheck className="w-4 h-4 ml-2" />
                              {user.is_verified ? "إلغاء التوثيق" : "توثيق الحساب"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.role === "client" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setCreditUser(user);
                                  setCreditDialogOpen(true);
                                }}
                              >
                                <CreditCard className="w-4 h-4 ml-2" />
                                تعديل الكريديت
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => banUserMutation.mutate({ 
                                userId: user.user_id, 
                                ban: !user.is_banned,
                                userName: user.full_name
                              })}
                              className={user.is_banned ? "text-green-600" : "text-yellow-600"}
                            >
                              <Ban className="w-4 h-4 ml-2" />
                              {user.is_banned ? "إلغاء الحظر" : "حظر المستخدم"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف المستخدم
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">لا يوجد مستخدمين</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={viewingUser.avatar_url} alt={viewingUser.full_name} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(viewingUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{viewingUser.full_name}</h3>
                    {viewingUser.is_verified && (
                      <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        موثق
                      </Badge>
                    )}
                    {viewingUser.is_banned && (
                      <Badge variant="destructive">محظور</Badge>
                    )}
                  </div>
                  <Badge className={getRoleBadge(viewingUser.role).class}>
                    {getRoleBadge(viewingUser.role).label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{viewingUser.email}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                  <p className="font-medium">{viewingUser.phone || "غير محدد"}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-medium">
                    {format(new Date(viewingUser.created_at), "dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">الباقة</p>
                  <p className="font-medium">
                    {viewingUser.subscription ? (viewingUser.subscription.plans as any)?.name_ar : "لا يوجد"}
                  </p>
                </div>
              </div>

              {viewingUser.subscription && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-medium mb-2">تفاصيل الاشتراك</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">الكريديت المتبقي:</span>
                      <span className="font-bold mr-1">{viewingUser.subscription.credits_remaining}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التعديلات المستخدمة:</span>
                      <span className="font-bold mr-1">{viewingUser.subscription.revisions_used}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Freelancer Profile Details */}
              {viewingUser.role === "freelancer" && viewingUser.freelancerProfile && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-600" />
                    بيانات الفريلانسر
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">النجوم:</span>
                      <span className="font-bold mr-1 text-yellow-600">{viewingUser.freelancerProfile.stars || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المهام المكتملة:</span>
                      <span className="font-bold mr-1">{viewingUser.freelancerProfile.completed_tasks || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">حالة التحقق:</span>
                      <Badge 
                        variant={viewingUser.freelancerProfile.verification_status === "approved" ? "default" : "secondary"}
                        className="mr-1"
                      >
                        {viewingUser.freelancerProfile.verification_status === "approved" ? "معتمد" : 
                         viewingUser.freelancerProfile.verification_status === "pending" ? "قيد المراجعة" : "مرفوض"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setViewingUser(null);
                      navigate(`/admin/freelancer/${viewingUser.user_id}`);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 ml-1" />
                    عرض البروفايل الكامل
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل دور المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">الدور الجديد</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">عميل</SelectItem>
                    <SelectItem value="freelancer">فريلانسر</SelectItem>
                    <SelectItem value="team_leader">قائد فريق</SelectItem>
                    <SelectItem value="admin">أدمن</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={() => updateRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole as "client" | "freelancer" | "team_leader" | "admin" })}
                disabled={updateRoleMutation.isPending || newRole === selectedUser.role}
              >
                {updateRoleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري التحديث...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا المستخدم؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المستخدم "{userToDelete?.full_name}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate({ 
                    userId: userToDelete.user_id, 
                    userName: userToDelete.full_name 
                  });
                }
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              حذف المستخدم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust Credits Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل كريديت العميل</DialogTitle>
          </DialogHeader>
          {creditUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={creditUser.avatar_url} alt={creditUser.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(creditUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {creditUser.full_name}
                    <Badge variant="secondary">عميل</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">{creditUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={creditType === "add" ? "default" : "outline"}
                  className="w-full flex items-center gap-2"
                  onClick={() => setCreditType("add")}
                >
                  <Plus className="w-4 h-4" />
                  إضافة كريديت
                </Button>
                <Button
                  type="button"
                  variant={creditType === "subtract" ? "destructive" : "outline"}
                  className="w-full flex items-center gap-2"
                  onClick={() => setCreditType("subtract")}
                >
                  <Minus className="w-4 h-4" />
                  خصم كريديت
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">المبلغ</label>
                <Input
                  type="number"
                  min={1}
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="اكتب عدد الكريديت"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">سبب التعديل (اختياري)</label>
                <Input
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="مثال: تعويض عن مشكلة، هدية ترحيبية..."
                />
              </div>

              <Button
                className="w-full"
                onClick={() => adjustCredits()}
                disabled={adjustingCredits}
              >
                {adjustingCredits ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 ml-2" />
                    حفظ التعديل
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
