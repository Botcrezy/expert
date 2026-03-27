import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Download, 
  Upload, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Server,
  Key,
  FileText,
  Shield,
  HardDrive,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function AdminSupabaseSync() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [schemaSQL, setSchemaSQL] = useState<string>("");
  const [restoreSQL, setRestoreSQL] = useState<string>("");
  const [storageSQL, setStorageSQL] = useState<string>("");
  
  const [supabaseConfig, setSupabaseConfig] = useState({
    projectUrl: "",
    anonKey: "",
    serviceRoleKey: "",
  });

  // Load schema files
  useEffect(() => {
    import("../../../supabase/complete-schema.sql?raw")
      .then(m => setSchemaSQL(m.default))
      .catch(() => setSchemaSQL("// Schema file not found - please check supabase/complete-schema.sql"));
    
    import("../../../supabase/restore-schema.sql?raw")
      .then(m => setRestoreSQL(m.default))
      .catch(() => setRestoreSQL("// Restore file not found"));

    import("../../../supabase/storage-buckets-policies.sql?raw")
      .then(m => setStorageSQL(m.default))
      .catch(() => setStorageSQL("// Storage buckets policies file not found"));
  }, []);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast({ title: `تم نسخ ${label} ✅` });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "خطأ في النسخ", variant: "destructive" });
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `تم تحميل ${filename} ✅` });
  };

  const generateEnvFile = () => {
    if (!supabaseConfig.projectUrl || !supabaseConfig.anonKey) {
      toast({ title: "يرجى إدخال بيانات المشروع أولاً", variant: "destructive" });
      return;
    }

    const projectId = supabaseConfig.projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
    
    const envContent = `# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="${projectId}"
VITE_SUPABASE_PUBLISHABLE_KEY="${supabaseConfig.anonKey}"
VITE_SUPABASE_URL="${supabaseConfig.projectUrl}"

# Service Role Key (for Edge Functions only - DO NOT expose to client)
# SUPABASE_SERVICE_ROLE_KEY="${supabaseConfig.serviceRoleKey}"
`;
    
    downloadFile(envContent, ".env");
  };

  const schemaInstructions = `
/*
=============================================================
  دليل إعداد قاعدة البيانات - Sity Experts Platform
=============================================================

🔹 الخطوات المطلوبة:

1. قم بنسخ محتوى هذا الملف بالكامل
2. اذهب إلى Supabase Dashboard > SQL Editor
3. الصق الكود واضغط Run
4. انتظر حتى تكتمل العملية

🔹 ما سيتم إنشاؤه:
- جميع الجداول المطلوبة (40+ جدول)
- سياسات RLS للأمان
- الدوال والـ Triggers
- Storage Buckets
- البيانات الأولية (الفئات، الباقات، الإعدادات)

🔹 ملاحظات هامة:
- تأكد من تفعيل RLS على جميع الجداول
- لا تشارك Service Role Key مع أي شخص
- قم بتغيير بيانات الأدمن الافتراضية

=============================================================
*/

${schemaSQL}
`;

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="مزامنة Supabase"
      subtitle="إعداد ومزامنة قاعدة البيانات مع مشروع Supabase خارجي"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Warning Banner */}
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-warning">تحذير هام</h3>
            <p className="text-sm text-warning/80">
              هذه الصفحة مخصصة للمطورين فقط. تأكد من فهمك الكامل للإجراءات قبل تنفيذها.
              لا تشارك بيانات Service Role Key أبداً.
            </p>
          </div>
        </div>

        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="setup">إعداد المشروع</TabsTrigger>
            <TabsTrigger value="schema">Schema SQL</TabsTrigger>
            <TabsTrigger value="migration">Migration</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  بيانات مشروع Supabase
                </CardTitle>
                <CardDescription>
                  أدخل بيانات مشروع Supabase الخاص بك لإنشاء ملف .env
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Project URL</Label>
                  <Input
                    placeholder="https://your-project.supabase.co"
                    value={supabaseConfig.projectUrl}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, projectUrl: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anon Key (Public)</Label>
                  <Input
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseConfig.anonKey}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Role Key (اختياري - للـ Edge Functions)</Label>
                  <Input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseConfig.serviceRoleKey}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, serviceRoleKey: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <Button onClick={generateEnvFile} className="w-full">
                  <Download className="w-4 h-4 ml-2" />
                  تحميل ملف .env
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info Cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Database className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold">40+ جدول</h3>
                  <p className="text-sm text-muted-foreground">جميع جداول المنصة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-success" />
                  <h3 className="font-semibold">RLS Policies</h3>
                  <p className="text-sm text-muted-foreground">سياسات أمان كاملة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <HardDrive className="w-10 h-10 mx-auto mb-3 text-info" />
                  <h3 className="font-semibold">Storage Buckets</h3>
                  <p className="text-sm text-muted-foreground">4 buckets للملفات</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schema Tab */}
          <TabsContent value="schema" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  ملف قاعدة البيانات الكامل
                </CardTitle>
                <CardDescription>
                  هذا الملف يحتوي على جميع الجداول والسياسات والدوال المطلوبة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={() => downloadFile(schemaInstructions, "complete-schema.sql")} className="flex-1">
                    <Download className="w-4 h-4 ml-2" />
                    تحميل Schema SQL
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard(schemaInstructions, "Schema")}
                  >
                    {copied === "Schema" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono" dir="ltr">
                    {schemaSQL.slice(0, 3000)}...
                    {"\n\n/* ... الملف يحتوي على المزيد - قم بتحميله للحصول على النسخة الكاملة */"}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Migration Tab */}
          <TabsContent value="migration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  ملفات الاستعادة والترحيل
                </CardTitle>
                <CardDescription>
                  قم بتحميل الملفات المطلوبة لاستعادة قاعدة البيانات في مشروع Supabase جديد
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      complete-schema.sql
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      الملف الأساسي - يحتوي على جميع الجداول والسياسات
                    </p>
                    <Button size="sm" onClick={() => downloadFile(schemaSQL, "complete-schema.sql")} className="w-full">
                      <Download className="w-4 h-4 ml-2" />
                      تحميل
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      restore-schema.sql
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      ملف الاستعادة - يتضمن بيانات إضافية وإعدادات
                    </p>
                    <Button size="sm" onClick={() => downloadFile(restoreSQL, "restore-schema.sql")} className="w-full">
                      <Download className="w-4 h-4 ml-2" />
                      تحميل
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      storage-buckets-policies.sql
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      إعداد الباكيتس وسياسات RLS الخاصة بالملفات
                    </p>
                    <Button size="sm" onClick={() => downloadFile(storageSQL, "storage-buckets-policies.sql")} className="w-full">
                      <Download className="w-4 h-4 ml-2" />
                      تحميل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  خطوات الترحيل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="text-sm">
                    <span className="font-medium">إنشاء مشروع Supabase جديد</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      اذهب إلى supabase.com وأنشئ مشروع جديد
                    </p>
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">نسخ بيانات المشروع</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      من Settings → API، انسخ Project URL و Anon Key
                    </p>
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">تنفيذ complete-schema.sql</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      من SQL Editor، الصق محتوى الملف واضغط Run
                    </p>
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">تنفيذ restore-schema.sql (اختياري)</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      لإضافة بيانات وإعدادات تكميلية
                    </p>
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">تحديث ملف .env</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      استبدل البيانات في ملف .env ببيانات المشروع الجديد
                    </p>
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">نشر Edge Functions</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      استخدم Supabase CLI لنشر الـ Edge Functions
                    </p>
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">إعداد حساب الأدمن</span>
                    <p className="text-muted-foreground mr-6 mt-1">
                      اذهب إلى /setup-admin لإنشاء حساب المدير
                    </p>
                  </li>
                </ol>

                <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/30">
                  <h4 className="font-medium text-info flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4" />
                    Secrets المطلوبة
                  </h4>
                  <ul className="text-sm text-info/80 space-y-1">
                    <li>• SUPABASE_URL</li>
                    <li>• SUPABASE_ANON_KEY</li>
                    <li>• SUPABASE_SERVICE_ROLE_KEY</li>
                    <li>• KASHIER_API_KEY (للدفع)</li>
                    <li>• KASHIER_SECRET_KEY (للدفع)</li>
                    <li>• KASHIER_MERCHANT_ID (للدفع)</li>
                    <li>• TELEGRAM_BOT_TOKEN (اختياري)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
