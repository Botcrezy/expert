import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, CreditCard, Plus, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminCredits() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add");
  const [adjustReason, setAdjustReason] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin-clients-credits"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: subscriptions } = await supabase.from("client_subscriptions").select("user_id, credits_remaining").eq("is_active", true);
      
      return profiles?.map((p) => ({
        ...p,
        credits: subscriptions?.find((s) => s.user_id === p.user_id)?.credits_remaining || 0,
      }));
    },
  });

  const adjustCreditsMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(adjustAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("المبلغ غير صالح");

      const { data: subscription } = await supabase.from("client_subscriptions").select("*").eq("user_id", selectedUser.user_id).eq("is_active", true).maybeSingle();
      const currentBalance = subscription?.credits_remaining || 0;
      const newBalance = adjustType === "add" ? currentBalance + amount : currentBalance - amount;
      if (newBalance < 0) throw new Error("لا يمكن أن يكون الرصيد بالسالب");

      if (subscription) {
        await supabase.from("client_subscriptions").update({ credits_remaining: newBalance }).eq("id", subscription.id);
      }
      await supabase.from("credits_ledger").insert({
        user_id: selectedUser.user_id,
        amount: adjustType === "add" ? amount : -amount,
        balance_after: newBalance,
        type: adjustType === "add" ? "admin_credit" : "admin_debit",
        reason: adjustReason,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients-credits"] });
      toast({ title: "تم التعديل بنجاح" });
      setShowAdjustDialog(false);
      setAdjustAmount("");
      setAdjustReason("");
    },
    onError: (error: any) => toast({ variant: "destructive", title: "خطأ", description: error.message }),
  });

  const filteredClients = clients?.filter((c: any) => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) {
    return <DashboardLayout sidebar={<AdminSidebar />}><div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">إدارة الكريديت</h1>
        <div className="relative w-full sm:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الكريديت</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients?.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.full_name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell><span className="font-bold text-primary">{client.credits}</span> كريديت</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedUser(client); setShowAdjustDialog(true); }}>
                        <CreditCard className="w-4 h-4 ml-1" />تعديل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل رصيد الكريديت - {selectedUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={adjustType === "add" ? "default" : "outline"} onClick={() => setAdjustType("add")} className="flex-1"><Plus className="w-4 h-4 ml-1" />إضافة</Button>
              <Button variant={adjustType === "subtract" ? "destructive" : "outline"} onClick={() => setAdjustType("subtract")} className="flex-1"><Minus className="w-4 h-4 ml-1" />خصم</Button>
            </div>
            <div><Label>المبلغ</Label><Input type="number" min="1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} /></div>
            <div><Label>السبب</Label><Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>إلغاء</Button>
            <Button onClick={() => adjustCreditsMutation.mutate()} loading={adjustCreditsMutation.isPending} disabled={!adjustAmount || !adjustReason}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
