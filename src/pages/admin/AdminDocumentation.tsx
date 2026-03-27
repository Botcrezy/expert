import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Book, 
  Users,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Briefcase,
  GraduationCap,
  CreditCard,
  MessageSquare,
  Bell,
  Star,
  Target,
  Clock,
  Shield,
  Wallet,
  Building,
  Settings,
  Image,
  Globe,
  BarChart3,
  HeadphonesIcon,
  Zap,
  ChevronLeft
} from "lucide-react";

export default function AdminDocumentation() {
  const [activeSection, setActiveSection] = useState("welcome");

  // القائمة الجانبية المبسطة
  const sections = [
    { id: "welcome", label: "مرحباً بك", icon: Sparkles, color: "text-primary" },
    { id: "users", label: "المستخدمين", icon: Users, color: "text-blue-500" },
    { id: "workflow", label: "كيف تعمل المنصة", icon: Target, color: "text-green-500" },
    { id: "services", label: "إدارة الخدمات", icon: Briefcase, color: "text-orange-500" },
    { id: "payments", label: "المدفوعات", icon: CreditCard, color: "text-purple-500" },
    { id: "learning", label: "التعليم والتدريب", icon: GraduationCap, color: "text-pink-500" },
    { id: "brands", label: "البراندات", icon: Building, color: "text-indigo-500" },
    { id: "backend", label: "⚡ السيرفر والربط", icon: Zap, color: "text-amber-500" },
    { id: "settings", label: "الإعدادات", icon: Settings, color: "text-gray-500" },
  ];

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="📚 دليل استخدام المنصة"
      subtitle="كل ما تحتاج معرفته لإدارة Sity Experts بسهولة"
    >
      <div className="flex gap-6">
        {/* الشريط الجانبي */}
        <Card className="w-56 shrink-0 sticky top-4 h-fit">
          <CardContent className="p-3">
            <div className="space-y-1">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => setActiveSection(section.id)}
                >
                  <section.icon className={`w-4 h-4 ${section.color}`} />
                  {section.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* المحتوى الرئيسي */}
        <div className="flex-1 space-y-6">
          
          {/* ==================== مرحباً بك ==================== */}
          {activeSection === "welcome" && (
            <div className="space-y-6 animate-fade-in">
              {/* البطاقة الترحيبية */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-primary/20 rounded-xl">
                      <Sparkles className="w-7 h-7 text-primary" />
                    </div>
                    مرحباً بك في منصة Sity Experts!
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    هذا الدليل سيساعدك على فهم كل شيء عن المنصة بدون أي تعقيد تقني 🎯
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* ما هي المنصة؟ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🤔 ما هي المنصة؟</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>Sity Experts</strong> هي منصة تربط بين <strong>العملاء</strong> الذين يحتاجون خدمات إبداعية 
                    (تصميم، فيديو، كتابة...) و<strong>الفريلانسرز</strong> المحترفين الذين ينفذون هذه الخدمات.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    أنت كـ<strong>مدير</strong> تتحكم في كل شيء: تقبل الطلبات، توزع المهام، تتابع الجودة، وتدير الأموال.
                  </p>
                </CardContent>
              </Card>

              {/* أنواع المستخدمين */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">👥 أنواع المستخدمين</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-7 h-7 text-blue-500" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">العميل</h3>
                      <p className="text-sm text-muted-foreground">
                        يطلب الخدمات ويدفع لها. يتابع طلباته ويستلم التسليمات.
                      </p>
                    </div>
                    <div className="p-5 rounded-xl border-2 border-green-500/30 bg-green-500/5 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Briefcase className="w-7 h-7 text-green-500" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">الفريلانسر</h3>
                      <p className="text-sm text-muted-foreground">
                        ينفذ المهام ويتقاضى أجره. يتدرب ويطور مهاراته.
                      </p>
                    </div>
                    <div className="p-5 rounded-xl border-2 border-primary/30 bg-primary/5 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">المدير (أنت)</h3>
                      <p className="text-sm text-muted-foreground">
                        تدير كل شيء: المستخدمين، الطلبات، الأموال، والمحتوى.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* أقسام لوحة التحكم */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🎛️ أقسام لوحة التحكم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { icon: BarChart3, label: "لوحة المعلومات", desc: "إحصائيات سريعة عن كل شيء" },
                      { icon: FileText, label: "الطلبات", desc: "إدارة طلبات العملاء" },
                      { icon: Users, label: "المستخدمين", desc: "إدارة العملاء والفريلانسرز" },
                      { icon: Building, label: "البراندات", desc: "إدارة العلامات التجارية" },
                      { icon: CreditCard, label: "المالية", desc: "الطلبات والمحافظ والسحوبات" },
                      { icon: GraduationCap, label: "التعليم", desc: "المسارات والتدريب" },
                      { icon: Globe, label: "المحتوى", desc: "صفحات الموقع والإعدادات" },
                      { icon: HeadphonesIcon, label: "الدعم", desc: "تذاكر الدعم والنزاعات" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <item.icon className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== المستخدمين ==================== */}
          {activeSection === "users" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="w-6 h-6 text-blue-500" />
                    إدارة المستخدمين
                  </CardTitle>
                  <CardDescription>
                    كيف تدير العملاء والفريلانسرز على المنصة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* العملاء */}
                  <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      العملاء
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>يسجلون من صفحة <strong>/register</strong> ويختارون باقة</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>كل عميل لديه <strong>رصيد كريديت</strong> يستخدمه لطلب الخدمات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>يمكنهم إنشاء <strong>براندات</strong> (علامات تجارية) وطلب خدمات لها</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>يتابعون طلباتهم ويتواصلون معك عبر <strong>الرسائل</strong></span>
                      </li>
                    </ul>
                  </div>

                  {/* الفريلانسرز */}
                  <div className="p-4 rounded-xl border bg-green-50/50 dark:bg-green-950/20">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-green-500" />
                      الفريلانسرز
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>يسجلون من <strong>/freelancer/register</strong> ويملأون بياناتهم</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>يجب أن <strong>توافق عليهم</strong> قبل أن يتمكنوا من العمل</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>يكسبون <strong>نجوم ⭐</strong> من التدريب والمهام المكتملة</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>أرباحهم تُضاف لـ<strong>محفظتهم</strong> ويمكنهم طلب سحب</span>
                      </li>
                    </ul>
                  </div>

                  {/* التوثيق */}
                  <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-500" />
                      توثيق الهوية
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      يمكن للمستخدمين رفع صور بطاقتهم الشخصية للتوثيق. أنت تراجع وتوافق أو ترفض.
                    </p>
                    <Badge variant="outline" className="text-amber-600">
                      راجع من: إدارة المستخدمين → طلبات التوثيق
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== كيف تعمل المنصة ==================== */}
          {activeSection === "workflow" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="w-6 h-6 text-green-500" />
                    كيف تعمل المنصة؟
                  </CardTitle>
                  <CardDescription>
                    رحلة الطلب من البداية للنهاية
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {[
                      { 
                        step: 1, 
                        title: "العميل يطلب خدمة", 
                        desc: "يختار نوع الخدمة، يكتب التفاصيل، يرفق الملفات",
                        color: "bg-blue-500"
                      },
                      { 
                        step: 2, 
                        title: "أنت تراجع الطلب", 
                        desc: "تتأكد من وضوح الطلب، تطلب معلومات إضافية إن لزم",
                        color: "bg-primary"
                      },
                      { 
                        step: 3, 
                        title: "تعيّن فريلانسر", 
                        desc: "تختار أنسب فريلانسر وتحدد المبلغ الذي سيتقاضاه",
                        color: "bg-purple-500"
                      },
                      { 
                        step: 4, 
                        title: "الفريلانسر ينفذ", 
                        desc: "يعمل على المهمة ويرفع التسليم",
                        color: "bg-green-500"
                      },
                      { 
                        step: 5, 
                        title: "مراجعة الجودة (QC)", 
                        desc: "تراجع العمل قبل إرساله للعميل",
                        color: "bg-orange-500"
                      },
                      { 
                        step: 6, 
                        title: "العميل يستلم", 
                        desc: "يراجع ويطلب تعديلات أو يوافق",
                        color: "bg-teal-500"
                      },
                      { 
                        step: 7, 
                        title: "الطلب مكتمل!", 
                        desc: "الفريلانسر يحصل على أجره في محفظته",
                        color: "bg-emerald-500"
                      },
                    ].map((item, i, arr) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${item.color} text-white flex items-center justify-center font-bold text-lg`}>
                            {item.step}
                          </div>
                          {i < arr.length - 1 && (
                            <div className="w-0.5 h-16 bg-border" />
                          )}
                        </div>
                        <div className="pb-8">
                          <h4 className="font-bold">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* حالات الطلب */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 حالات الطلب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      { status: "submitted", label: "جديد", desc: "طلب جديد ينتظر المراجعة" },
                      { status: "needs_info", label: "يحتاج معلومات", desc: "بانتظار رد العميل" },
                      { status: "approved", label: "تمت الموافقة", desc: "جاهز للتعيين" },
                      { status: "assigned", label: "تم التعيين", desc: "بانتظار قبول الفريلانسر" },
                      { status: "in_progress", label: "قيد التنفيذ", desc: "الفريلانسر يعمل عليه" },
                      { status: "ready_for_qc", label: "جاهز للمراجعة", desc: "بانتظار QC" },
                      { status: "delivered_to_client", label: "تم التسليم", desc: "العميل يراجع" },
                      { status: "completed", label: "مكتمل", desc: "تم بنجاح! ✅" },
                    ].map((item) => (
                      <div key={item.status} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Badge variant="outline" className="shrink-0">{item.label}</Badge>
                        <span className="text-xs text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== إدارة الخدمات ==================== */}
          {activeSection === "services" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Briefcase className="w-6 h-6 text-orange-500" />
                    إدارة الخدمات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* التصنيفات */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">📂 التصنيفات</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      التصنيفات هي أنواع الخدمات التي تقدمها (مثل: تصميم جرافيك، مونتاج فيديو، كتابة محتوى...)
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>كل تصنيف له <strong>اسم عربي وإنجليزي</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>يمكنك <strong>تفعيل/تعطيل</strong> أي تصنيف</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>الفريلانسرز يختارون تصنيفاتهم عند التسجيل</span>
                      </li>
                    </ul>
                  </div>

                  {/* أحجام المهام */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">📏 أحجام المهام</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { size: "Micro", credits: "1 كريديت", example: "تعديل بسيط" },
                        { size: "Small", credits: "2-3 كريديت", example: "بوست سوشيال" },
                        { size: "Medium", credits: "4-6 كريديت", example: "فيديو قصير" },
                        { size: "Large", credits: "7+ كريديت", example: "مشروع كبير" },
                      ].map((item) => (
                        <div key={item.size} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{item.size}</span>
                            <Badge variant="secondary">{item.credits}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.example}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== المدفوعات ==================== */}
          {activeSection === "payments" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CreditCard className="w-6 h-6 text-purple-500" />
                    نظام المدفوعات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* نظام الكريديت */}
                  <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-purple-500" />
                      نظام الكريديت (للعملاء)
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• العميل يشتري <strong>كريديت</strong> (رصيد)</li>
                      <li>• كل طلب يخصم من رصيده حسب حجم المهمة</li>
                      <li>• يمكنك <strong>إضافة كريديت يدوياً</strong> لأي عميل</li>
                      <li>• كل العمليات مسجلة في <strong>سجل الكريديت</strong></li>
                    </ul>
                  </div>

                  {/* محفظة الفريلانسر */}
                  <div className="p-4 rounded-xl border bg-green-50/50 dark:bg-green-950/20">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-green-500" />
                      محفظة الفريلانسر
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• أرباح المهام تُضاف <strong>تلقائياً</strong> للمحفظة</li>
                      <li>• الفريلانسر يطلب <strong>سحب</strong> للأموال</li>
                      <li>• أنت <strong>توافق أو ترفض</strong> طلبات السحب</li>
                      <li>• يمكنك تحديد <strong>الحد الأدنى للسحب</strong></li>
                    </ul>
                  </div>

                  {/* الباقات */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">💎 الباقات</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      أنشئ باقات مختلفة بمميزات مختلفة:
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="font-bold">مجانية</p>
                        <p className="text-xs text-muted-foreground">للتجربة</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="font-bold">برو</p>
                        <p className="text-xs text-muted-foreground">للأفراد</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="font-bold">إنتربرايز</p>
                        <p className="text-xs text-muted-foreground">للشركات</p>
                      </div>
                    </div>
                  </div>

                  {/* الكوبونات */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">🎟️ الكوبونات</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• أنشئ كوبونات خصم (نسبة أو مبلغ ثابت)</li>
                      <li>• حدد تاريخ الصلاحية وعدد الاستخدامات</li>
                      <li>• تابع استخدام الكوبونات</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== التعليم والتدريب ==================== */}
          {activeSection === "learning" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <GraduationCap className="w-6 h-6 text-pink-500" />
                    التعليم والتدريب
                  </CardTitle>
                  <CardDescription>
                    نظام تدريب الفريلانسرز وتأهيلهم
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* المسارات التعليمية */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">📚 المسارات التعليمية</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      أنشئ مسارات تعليمية للفريلانسرز لتطوير مهاراتهم:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <ChevronLeft className="w-4 h-4" />
                        <span><strong>المسار</strong>: مثل "أساسيات التصميم"</span>
                      </li>
                      <li className="flex items-center gap-2 mr-4">
                        <ChevronLeft className="w-4 h-4" />
                        <span><strong>الوحدات</strong>: أقسام داخل المسار</span>
                      </li>
                      <li className="flex items-center gap-2 mr-8">
                        <ChevronLeft className="w-4 h-4" />
                        <span><strong>الدروس</strong>: فيديوهات ومحتوى</span>
                      </li>
                    </ul>
                  </div>

                  {/* نظام النجوم */}
                  <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      نظام النجوم ⭐
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      الفريلانسرز يكسبون نجوم من:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• إكمال الدروس التعليمية</li>
                      <li>• إنهاء مهام التدريب</li>
                      <li>• إكمال طلبات حقيقية بنجاح</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      النجوم تفتح محتوى ومسارات جديدة!
                    </p>
                  </div>

                  {/* مهام التدريب */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">🎯 مهام التدريب</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      مهام تدريبية للفريلانسرز الجدد قبل العمل الحقيقي:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• أنشئ مهمة تدريبية بمتطلبات واضحة</li>
                      <li>• الفريلانسر يقبل المهمة وينفذها</li>
                      <li>• أنت تراجع وتعطي ملاحظات</li>
                      <li>• عند القبول يحصل على نجوم إضافية</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== البراندات ==================== */}
          {activeSection === "brands" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building className="w-6 h-6 text-indigo-500" />
                    نظام البراندات
                  </CardTitle>
                  <CardDescription>
                    إدارة العلامات التجارية للعملاء
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">🏢 ما هو البراند؟</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      البراند هو ملف العلامة التجارية للعميل. يحتوي على:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">الهوية البصرية</p>
                        <p className="text-xs text-muted-foreground">الألوان، الخطوط، اللوجو</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">معلومات الشركة</p>
                        <p className="text-xs text-muted-foreground">الاسم، الوصف، المجال</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">روابط التواصل</p>
                        <p className="text-xs text-muted-foreground">الموقع، السوشيال ميديا</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">ملفات البراند</p>
                        <p className="text-xs text-muted-foreground">Brand Guidelines</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-indigo-50/50 dark:bg-indigo-950/20">
                    <h3 className="font-bold text-lg mb-3">🎯 فائدة البراندات</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• الفريلانسر يرى معلومات البراند عند العمل</li>
                      <li>• يحافظ على اتساق الهوية البصرية</li>
                      <li>• يسهل العمل على مشاريع متعددة لنفس العميل</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== السيرفر والربط ==================== */}
          {activeSection === "backend" && (
            <div className="space-y-6 animate-fade-in">
              {/* مقدمة */}
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-amber-500/20 rounded-xl">
                      <Zap className="w-6 h-6 text-amber-500" />
                    </div>
                    السيرفر وقاعدة البيانات
                  </CardTitle>
                  <CardDescription className="text-base">
                    شرح مبسط لكيفية عمل الجزء الخلفي من المنصة 🔧
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* ما هو السيرفر؟ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🤔 ما هو السيرفر؟ (بلغة بسيطة)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    تخيل المنصة مثل <strong>مطعم</strong>:
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border text-center">
                      <div className="text-3xl mb-2">🖥️</div>
                      <h4 className="font-bold mb-1">الواجهة (Frontend)</h4>
                      <p className="text-xs text-muted-foreground">
                        الديكور والقوائم - ما يراه الزبون
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border text-center bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="text-3xl mb-2">👨‍🍳</div>
                      <h4 className="font-bold mb-1">السيرفر (Backend)</h4>
                      <p className="text-xs text-muted-foreground">
                        المطبخ - حيث يُحضّر الطعام
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border text-center">
                      <div className="text-3xl mb-2">🗄️</div>
                      <h4 className="font-bold mb-1">قاعدة البيانات</h4>
                      <p className="text-xs text-muted-foreground">
                        المخزن - حيث تُحفظ المكونات
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm">
                      <strong>Lovable Cloud</strong> هو السيرفر الذي يشغّل المنصة. 
                      كل البيانات (المستخدمين، الطلبات، الملفات) محفوظة هناك بأمان.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* مكونات السيرفر */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">📦 مكونات السيرفر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* قاعدة البيانات */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="text-xl">🗃️</span>
                      قاعدة البيانات (الجداول)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      مثل ملفات Excel كبيرة تحفظ كل البيانات:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      {[
                        { table: "profiles", desc: "بيانات المستخدمين" },
                        { table: "requests", desc: "طلبات العملاء" },
                        { table: "assignments", desc: "تعيين المهام" },
                        { table: "deliveries", desc: "التسليمات" },
                        { table: "messages", desc: "الرسائل" },
                        { table: "notifications", desc: "الإشعارات" },
                        { table: "orders", desc: "طلبات الشراء" },
                        { table: "wallet_ledger", desc: "محفظة الفريلانسر" },
                      ].map((item) => (
                        <div key={item.table} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                          <Badge variant="outline" className="font-mono text-xs">{item.table}</Badge>
                          <span className="text-muted-foreground">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      المنصة تحتوي على <strong>40+ جدول</strong> لحفظ كل شيء
                    </p>
                  </div>

                  {/* التخزين */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      تخزين الملفات (Storage)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      أماكن لحفظ الملفات المرفوعة:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                        <p className="font-medium text-sm">📷 avatars</p>
                        <p className="text-xs text-muted-foreground">صور البروفايل</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20">
                        <p className="font-medium text-sm">📎 request-files</p>
                        <p className="text-xs text-muted-foreground">ملفات الطلبات والتسليمات</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20">
                        <p className="font-medium text-sm">📚 training-files</p>
                        <p className="text-xs text-muted-foreground">ملفات التدريب</p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                        <p className="font-medium text-sm">🪪 identity-documents</p>
                        <p className="text-xs text-muted-foreground">صور البطاقات للتوثيق</p>
                      </div>
                    </div>
                  </div>

                  {/* الدوال */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      الدوال (Functions)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      أكواد جاهزة تنفذ مهام معينة تلقائياً:
                    </p>
                    <div className="space-y-2 text-sm">
                      {[
                        { name: "إنشاء طلب", desc: "يخصم الكريديت ويُنشئ الطلب" },
                        { name: "إرسال إشعار", desc: "يُخطر المستخدم بالتحديثات" },
                        { name: "إتمام الدفع", desc: "يُفعّل الاشتراك بعد الدفع" },
                        { name: "تحديث التقدم", desc: "يحسب نسبة إكمال الكورس" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground"> - {item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* المفاتيح السرية */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🔐 المفاتيح السرية (Secrets)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    مثل <strong>كلمات السر</strong> التي تسمح للمنصة بالاتصال بخدمات خارجية:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border">
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-500" />
                        بوابة الدفع (Kashier)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">KASHIER_API_KEY</Badge>
                        <Badge variant="secondary">KASHIER_SECRET_KEY</Badge>
                        <Badge variant="secondary">KASHIER_MERCHANT_ID</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        تحصل عليها من حسابك في Kashier
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border">
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        تيليجرام
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">TELEGRAM_BOT_TOKEN</Badge>
                        <Badge variant="secondary">TELEGRAM_ADMIN_USER_ID</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        تحصل عليها من @BotFather على تيليجرام
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-500/30">
                    <p className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      <span>
                        <strong>المفاتيح الأساسية مُعدّة مسبقاً!</strong> 
                        السيرفر وقاعدة البيانات يعملان تلقائياً.
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Edge Functions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🚀 الوظائف الخلفية (Edge Functions)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    برامج صغيرة تعمل على السيرفر لتنفيذ مهام معقدة:
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { name: "kashier-payment", desc: "معالجة الدفع", icon: "💳" },
                      { name: "telegram-webhook", desc: "استقبال رسائل تيليجرام", icon: "📨" },
                      { name: "telegram-send", desc: "إرسال إشعارات تيليجرام", icon: "📤" },
                      { name: "create-request", desc: "إنشاء طلب جديد", icon: "📝" },
                      { name: "generate-invoice", desc: "إنشاء فاتورة", icon: "🧾" },
                      { name: "activate-free-plan", desc: "تفعيل الباقة المجانية", icon: "🎁" },
                    ].map((func) => (
                      <div key={func.name} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{func.icon}</span>
                          <code className="text-xs font-mono text-primary">{func.name}</code>
                        </div>
                        <p className="text-xs text-muted-foreground">{func.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
                    <p className="text-sm">
                      <strong>💡 ملاحظة:</strong> هذه الوظائف تعمل تلقائياً. 
                      لا تحتاج لفعل أي شيء!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* الأمان */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🛡️ الأمان والحماية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    المنصة محمية بعدة طبقات أمان:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm">تسجيل الدخول الآمن</h4>
                        <p className="text-xs text-muted-foreground">
                          كلمات السر مشفرة ولا يمكن قراءتها
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm">صلاحيات المستخدمين (RLS)</h4>
                        <p className="text-xs text-muted-foreground">
                          كل مستخدم يرى بياناته فقط - العميل لا يرى طلبات عميل آخر
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm">تشفير الملفات</h4>
                        <p className="text-xs text-muted-foreground">
                          الملفات الحساسة (مثل صور البطاقات) محمية ولا يمكن الوصول لها إلا للمخولين
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* أدوات المزامنة */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">🔄 أدوات المزامنة والنقل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    إذا أردت نقل المنصة أو عمل نسخة احتياطية:
                  </p>
                  
                  <div className="p-4 rounded-xl border">
                    <h4 className="font-bold mb-3">📥 من صفحة مزامنة السيرفر:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">1.</span>
                        <span><strong>تحميل Schema</strong> - ملف يحتوي كل هيكل قاعدة البيانات</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">2.</span>
                        <span><strong>تحميل ملف .env</strong> - إعدادات الاتصال بالسيرفر</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">3.</span>
                        <span><strong>Edge Functions</strong> - الوظائف الخلفية جاهزة للنشر</span>
                      </li>
                    </ul>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <a href="/admin/supabase-sync">
                        الذهاب لأداة المزامنة
                      </a>
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/30">
                    <p className="text-sm flex items-start gap-2">
                      <Zap className="w-5 h-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>نصيحة:</strong> احتفظ بنسخة من هذه الملفات في مكان آمن 
                        كنسخة احتياطية!
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* أسئلة شائعة */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">❓ أسئلة شائعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      q: "هل أحتاج معرفة برمجة؟",
                      a: "لا! كل شيء معد مسبقاً. أنت تدير المنصة من الواجهة فقط."
                    },
                    {
                      q: "ماذا لو توقف السيرفر؟",
                      a: "Lovable Cloud يعمل على سيرفرات قوية ومستقرة. في حالة نادرة لمشكلة، تواصل مع الدعم."
                    },
                    {
                      q: "هل بياناتي آمنة؟",
                      a: "نعم! البيانات مشفرة ومحمية بعدة طبقات أمان، ولا يمكن لأحد الوصول لها إلا أنت."
                    },
                    {
                      q: "كيف أضيف ميزة جديدة؟",
                      a: "تواصل مع المطور أو استخدم Lovable لإضافة ميزات جديدة بسهولة."
                    },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <h4 className="font-bold text-sm mb-2">{item.q}</h4>
                      <p className="text-sm text-muted-foreground">{item.a}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== الإعدادات ==================== */}
          {activeSection === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Settings className="w-6 h-6 text-gray-500" />
                    الإعدادات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* إعدادات الموقع */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">🌐 إعدادات الموقع</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { label: "اسم الموقع", page: "site-settings" },
                        { label: "اللوجو", page: "site-settings" },
                        { label: "معلومات التواصل", page: "site-settings" },
                        { label: "روابط السوشيال", page: "site-settings" },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Badge variant="outline" className="text-xs">إعدادات الموقع</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* إدارة المحتوى */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">📝 إدارة المحتوى (CMS)</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span><strong>الصفحات</strong>: أنشئ صفحات جديدة بسهولة</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        <span><strong>Page Builder</strong>: صمم الصفحات بالسحب والإفلات</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span><strong>القوائم</strong>: عدّل الهيدر والفوتر</span>
                      </li>
                    </ul>
                  </div>

                  {/* إعدادات أخرى */}
                  <div className="p-4 rounded-xl border">
                    <h3 className="font-bold text-lg mb-3">⚙️ إعدادات أخرى</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">نظام الإحالات</p>
                        <p className="text-xs text-muted-foreground">مكافآت دعوة الأصدقاء</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">تيليجرام</p>
                        <p className="text-xs text-muted-foreground">ربط البوت للإشعارات</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">بوابة الدفع</p>
                        <p className="text-xs text-muted-foreground">إعدادات Kashier</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">التوثيق</p>
                        <p className="text-xs text-muted-foreground">متطلبات توثيق الهوية</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* نصائح */}
              <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    نصائح مهمة
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✅ راجع الطلبات الجديدة يومياً</li>
                    <li>✅ تابع طلبات السحب بانتظام</li>
                    <li>✅ راجع جودة التسليمات قبل إرسالها للعملاء</li>
                    <li>✅ تواصل مع الفريلانسرز لتحسين أدائهم</li>
                    <li>✅ استخدم الإشعارات للبقاء على اطلاع</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
