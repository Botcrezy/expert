import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Bell, 
  Send, 
  Users, 
  User, 
  Briefcase, 
  Loader2,
  CheckCircle2,
  Search
} from "lucide-react";

type RecipientType = "all_clients" | "all_freelancers" | "all_users" | "specific";

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [recipientType, setRecipientType] = useState<RecipientType>("all_clients");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all users with their roles
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["all-users-with-roles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      // Get all user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("*");

      return profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [],
      })) || [];
    },
  });

  // Fetch recent notifications
  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["recent-admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("type", "admin_broadcast")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("يجب إدخال عنوان الإشعار");

      let targetUserIds: string[] = [];

      switch (recipientType) {
        case "all_clients":
          targetUserIds = users
            .filter(u => u.roles.includes("client"))
            .map(u => u.user_id);
          break;
        case "all_freelancers":
          targetUserIds = users
            .filter(u => u.roles.includes("freelancer"))
            .map(u => u.user_id);
          break;
        case "all_users":
          targetUserIds = users.map(u => u.user_id);
          break;
        case "specific":
          targetUserIds = selectedUsers;
          break;
      }

      if (targetUserIds.length === 0) {
        throw new Error("لا يوجد مستخدمين لإرسال الإشعار لهم");
      }

      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        type: "admin_broadcast",
        title: title.trim(),
        body: body.trim() || null,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      return { count: targetUserIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recent-admin-notifications"] });
      toast({
        title: "تم إرسال الإشعار بنجاح",
        description: `تم إرسال الإشعار إلى ${data.count} مستخدم`,
      });
      setTitle("");
      setBody("");
      setSelectedUsers([]);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إرسال الإشعار",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clients = users.filter(u => u.roles.includes("client"));
  const freelancers = users.filter(u => u.roles.includes("freelancer"));

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllClients = () => {
    setSelectedUsers(clients.map(c => c.user_id));
  };

  const selectAllFreelancers = () => {
    setSelectedUsers(freelancers.map(f => f.user_id));
  };

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">إرسال الإشعارات</h1>
          <p className="text-muted-foreground">أرسل إشعارات للمستخدمين</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Send Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  إشعار جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recipient Type */}
                <div className="space-y-3">
                  <Label>المستلمون</Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setRecipientType("all_clients")}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        recipientType === "all_clients"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">جميع العملاء</p>
                          <p className="text-sm text-muted-foreground">{clients.length} عميل</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setRecipientType("all_freelancers")}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        recipientType === "all_freelancers"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="font-medium">جميع الفريلانسرز</p>
                          <p className="text-sm text-muted-foreground">{freelancers.length} فريلانسر</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setRecipientType("all_users")}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        recipientType === "all_users"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">جميع المستخدمين</p>
                          <p className="text-sm text-muted-foreground">{users.length} مستخدم</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setRecipientType("specific")}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        recipientType === "specific"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">مستخدمين محددين</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedUsers.length > 0 ? `${selectedUsers.length} محدد` : "اختر يدوياً"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Specific Users Selection */}
                {recipientType === "specific" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>اختر المستخدمين</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAllClients}>
                          كل العملاء
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectAllFreelancers}>
                          كل الفريلانسرز
                        </Button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="ابحث بالاسم أو الإيميل..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {filteredUsers.map(user => (
                        <label
                          key={user.user_id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onCheckedChange={() => toggleUser(user.user_id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex gap-1">
                            {user.roles.map(role => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role === "client" ? "عميل" : role === "freelancer" ? "فريلانسر" : role}
                              </Badge>
                            ))}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notification Content */}
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الإشعار *</Label>
                  <Input
                    id="title"
                    placeholder="مثال: عرض خاص على جميع الباقات!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">نص الإشعار (اختياري)</Label>
                  <Textarea
                    id="body"
                    placeholder="أضف تفاصيل إضافية..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Send Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || !title.trim() || (recipientType === "specific" && selectedUsers.length === 0)}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-2" />
                  )}
                  إرسال الإشعار
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notifications */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>الإشعارات الأخيرة</CardTitle>
              </CardHeader>
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">لا توجد إشعارات مرسلة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentNotifications.slice(0, 10).map(notification => (
                      <div
                        key={notification.id}
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <p className="font-medium text-sm">{notification.title}</p>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
