import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users,
  Gift,
  TrendingUp,
  DollarSign,
  Settings,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminReferrals() {
  const { toast } = useToast();

  // Referral settings
  const [settings, setSettings] = useState({
    clientReferralsRequired: 10,
    clientRewardCredits: 5,
    freelancerReferralsRequired: 50,
    freelancerRewardUSD: 5,
    usdToEGP: 48,
  });

  // Fetch all referrals
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch referral rewards
  const { data: rewards = [] } = useQuery({
    queryKey: ["admin-referral-rewards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_rewards")
        .select("*")
        .order("rewards_earned", { ascending: false });
      return data || [];
    },
  });

  // Stats
  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter((r: any) => r.status === "completed").length;
  const totalRewardsEarned = rewards.reduce((sum: number, r: any) => sum + (r.rewards_earned || 0), 0);
  const activeReferrers = rewards.length;

  const columns = [
    {
      key: "referral_code",
      header: "كود الإحالة",
      render: (row: any) => (
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {row.referral_code}
        </span>
      ),
    },
    {
      key: "referrer_type",
      header: "نوع المُحيل",
      render: (row: any) => (
        <Badge variant={row.referrer_type === "client" ? "default" : "secondary"}>
          {row.referrer_type === "client" ? "عميل" : "فريلانسر"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (row: any) => (
        <Badge variant={row.status === "completed" ? "default" : "outline"}>
          {row.status === "completed" ? "مكتملة" : "معلقة"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "التاريخ",
      render: (row: any) => format(new Date(row.created_at), "dd MMM yyyy", { locale: ar }),
    },
  ];

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الإحالات"
      subtitle="تتبع وإدارة برنامج الإحالات"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الإحالات"
          value={totalReferrals}
          icon={Users}
        />
        <StatCard
          title="الإحالات المكتملة"
          value={completedReferrals}
          icon={Gift}
        />
        <StatCard
          title="المكافآت الموزعة"
          value={`${totalRewardsEarned}`}
          icon={DollarSign}
        />
        <StatCard
          title="المُحيلين النشطين"
          value={activeReferrers}
          icon={TrendingUp}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              إعدادات الإحالات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>إحالات العميل المطلوبة</Label>
              <Input
                type="number"
                value={settings.clientReferralsRequired}
                onChange={(e) =>
                  setSettings({ ...settings, clientReferralsRequired: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>مكافأة العميل (كريديت)</Label>
              <Input
                type="number"
                value={settings.clientRewardCredits}
                onChange={(e) =>
                  setSettings({ ...settings, clientRewardCredits: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>إحالات الفريلانسر المطلوبة</Label>
              <Input
                type="number"
                value={settings.freelancerReferralsRequired}
                onChange={(e) =>
                  setSettings({ ...settings, freelancerReferralsRequired: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>مكافأة الفريلانسر (دولار)</Label>
              <Input
                type="number"
                value={settings.freelancerRewardUSD}
                onChange={(e) =>
                  setSettings({ ...settings, freelancerRewardUSD: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>سعر الدولار (جنيه)</Label>
              <Input
                type="number"
                value={settings.usdToEGP}
                onChange={(e) =>
                  setSettings({ ...settings, usdToEGP: parseInt(e.target.value) })
                }
              />
            </div>
            <Button className="w-full mt-4">
              <Save className="w-4 h-4 ml-2" />
              حفظ الإعدادات
            </Button>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>سجل الإحالات</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={referrals} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
