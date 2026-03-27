import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2, 
  Smartphone, 
  Building2, 
  Wallet,
  Bitcoin,
  CreditCard,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WithdrawalMethod {
  id: string;
  type: "vodafone_cash" | "instapay" | "bank_transfer" | "crypto";
  name: string;
  details: {
    phone?: string;
    accountNumber?: string;
    bankName?: string;
    accountHolderName?: string;
    iban?: string;
    walletAddress?: string;
    network?: string;
  };
  isDefault: boolean;
}

interface WithdrawalMethodsManagerProps {
  methods: WithdrawalMethod[];
  onUpdate?: (methods: WithdrawalMethod[]) => void;
}

const methodTypes = [
  { value: "vodafone_cash", label: "فودافون كاش", icon: Smartphone },
  { value: "instapay", label: "انستاباي", icon: CreditCard },
  { value: "bank_transfer", label: "تحويل بنكي", icon: Building2 },
  { value: "crypto", label: "عملات رقمية", icon: Bitcoin },
];

export function WithdrawalMethodsManager({ 
  methods = [], 
  onUpdate 
}: WithdrawalMethodsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    phone: "",
    accountNumber: "",
    bankName: "",
    accountHolderName: "",
    iban: "",
    walletAddress: "",
    network: "",
  });

  const handleSave = async () => {
    if (!user || !formData.type || !formData.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const newMethod: WithdrawalMethod = {
        id: crypto.randomUUID(),
        type: formData.type as WithdrawalMethod["type"],
        name: formData.name,
        details: {
          phone: formData.phone || undefined,
          accountNumber: formData.accountNumber || undefined,
          bankName: formData.bankName || undefined,
          accountHolderName: formData.accountHolderName || undefined,
          iban: formData.iban || undefined,
          walletAddress: formData.walletAddress || undefined,
          network: formData.network || undefined,
        },
        isDefault: methods.length === 0,
      };

      const updatedMethods = [...methods, newMethod];

      const { error } = await supabase
        .from("freelancer_profiles")
        .update({ withdrawal_methods: updatedMethods as unknown as any })
        .eq("user_id", user.id);

      if (error) throw error;

      onUpdate?.(updatedMethods);
      queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile"] });
      
      toast({ title: "تمت إضافة طريقة السحب بنجاح ✅" });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!user) return;

    const updatedMethods = methods.filter(m => m.id !== methodId);

    // If deleted the default, set first as default
    if (updatedMethods.length > 0 && !updatedMethods.some(m => m.isDefault)) {
      updatedMethods[0].isDefault = true;
    }

    try {
      const { error } = await supabase
        .from("freelancer_profiles")
        .update({ withdrawal_methods: updatedMethods as unknown as any })
        .eq("user_id", user.id);

      if (error) throw error;

      onUpdate?.(updatedMethods);
      queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile"] });
      toast({ title: "تم حذف طريقة السحب ✅" });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (methodId: string) => {
    if (!user) return;

    const updatedMethods = methods.map(m => ({
      ...m,
      isDefault: m.id === methodId,
    }));

    try {
      const { error } = await supabase
        .from("freelancer_profiles")
        .update({ withdrawal_methods: updatedMethods as unknown as any })
        .eq("user_id", user.id);

      if (error) throw error;

      onUpdate?.(updatedMethods);
      queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile"] });
      toast({ title: "تم تحديث الافتراضي ✅" });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: "",
      name: "",
      phone: "",
      accountNumber: "",
      bankName: "",
      accountHolderName: "",
      iban: "",
      walletAddress: "",
      network: "",
    });
  };

  const getMethodIcon = (type: string) => {
    const method = methodTypes.find(m => m.value === type);
    const Icon = method?.icon || Wallet;
    return <Icon className="w-5 h-5" />;
  };

  const getMethodLabel = (type: string) => {
    return methodTypes.find(m => m.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">طرق السحب</h4>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 ml-1" />
              إضافة طريقة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة طريقة سحب جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>نوع الطريقة *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الطريقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {methodTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>اسم مميز *</Label>
                <Input
                  placeholder="مثال: حسابي الرئيسي"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Vodafone Cash / InstaPay Fields */}
              {(formData.type === "vodafone_cash" || formData.type === "instapay") && (
                <div className="space-y-2">
                  <Label>رقم الهاتف *</Label>
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              )}

              {/* Bank Transfer Fields */}
              {formData.type === "bank_transfer" && (
                <>
                  <div className="space-y-2">
                    <Label>اسم البنك *</Label>
                    <Input
                      placeholder="البنك الأهلي المصري"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم صاحب الحساب *</Label>
                    <Input
                      placeholder="الاسم كما يظهر في البنك"
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الحساب أو IBAN *</Label>
                    <Input
                      placeholder="رقم الحساب"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Crypto Fields */}
              {formData.type === "crypto" && (
                <>
                  <div className="space-y-2">
                    <Label>الشبكة *</Label>
                    <Select
                      value={formData.network}
                      onValueChange={(value) => setFormData({ ...formData, network: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الشبكة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDT-TRC20">USDT (TRC20)</SelectItem>
                        <SelectItem value="USDT-ERC20">USDT (ERC20)</SelectItem>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>عنوان المحفظة *</Label>
                    <Input
                      placeholder="عنوان المحفظة"
                      value={formData.walletAddress}
                      onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    />
                  </div>
                </>
              )}

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {methods.length === 0 ? (
        <div className="p-6 text-center bg-muted/50 rounded-lg">
          <Wallet className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">لم تضف أي طرق سحب بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map((method) => (
            <div
              key={method.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                method.isDefault 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {getMethodIcon(method.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{method.name}</p>
                  {method.isDefault && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      افتراضي
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getMethodLabel(method.type)}
                  {method.details.phone && ` - ${method.details.phone}`}
                  {method.details.bankName && ` - ${method.details.bankName}`}
                  {method.details.network && ` - ${method.details.network}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(method.id)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(method.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
