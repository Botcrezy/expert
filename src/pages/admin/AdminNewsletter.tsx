import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Mail, 
  Download, 
  Copy, 
  Search, 
  Trash2, 
  Users,
  Calendar,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminNewsletter() {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      toast.success("تم حذف المشترك");
    },
    onError: () => {
      toast.error("فشل في حذف المشترك");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      toast.success("تم تحديث حالة المشترك");
    },
    onError: () => {
      toast.error("فشل في تحديث الحالة");
    },
  });

  const filteredSubscribers = subscribers.filter((sub: any) =>
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = subscribers.filter((sub: any) => sub.is_active).length;

  const handleCopyAll = () => {
    const emails = filteredSubscribers.map((sub: any) => sub.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success("تم نسخ جميع الإيميلات");
  };

  const handleDownload = () => {
    const headers = ["Email", "Subscribed At", "Status", "Source"];
    const rows = filteredSubscribers.map((sub: any) => [
      sub.email,
      new Date(sub.subscribed_at).toLocaleDateString("ar-EG"),
      sub.is_active ? "Active" : "Inactive",
      sub.source || "footer"
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `newsletter_subscribers_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            النشرة البريدية
          </h1>
          <p className="text-muted-foreground">إدارة مشتركي النشرة البريدية</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{subscribers.length}</p>
                  <p className="text-sm text-muted-foreground">إجمالي المشتركين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sity-green-100 dark:bg-sity-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-sity-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">مشتركين نشطين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sity-orange-100 dark:bg-sity-orange-900/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-sity-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {subscribers.filter((s: any) => {
                      const subDate = new Date(s.subscribed_at);
                      const today = new Date();
                      return subDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">اشتراكات اليوم</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالإيميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyAll}>
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ الكل
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 ml-2" />
                  تحميل CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">لا يوجد مشتركين</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">تاريخ الاشتراك</TableHead>
                      <TableHead className="text-right">المصدر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.email}</TableCell>
                        <TableCell>
                          {new Date(sub.subscribed_at).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.source || "footer"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={sub.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => toggleStatusMutation.mutate({ id: sub.id, isActive: sub.is_active })}
                          >
                            {sub.is_active ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                نشط
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 ml-1" />
                                غير نشط
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(sub.email);
                                toast.success("تم نسخ الإيميل");
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف المشترك</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف هذا المشترك؟ لا يمكن التراجع عن هذا الإجراء.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSubscriberMutation.mutate(sub.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
