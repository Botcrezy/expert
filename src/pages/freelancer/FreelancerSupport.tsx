import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, HeadphonesIcon, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function FreelancerSupport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch platform contact info and social links from site_settings
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-support"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["contact_info", "social_links"]);
      
      if (error) throw error;
      
      const settings: any = {};
      data?.forEach((item) => {
        settings[item.key] = item.value;
      });
      
      return {
        contactInfo: settings.contact_info || { email: "support@example.com", phone: "+20 123 456 7890" },
        socialLinks: settings.social_links || {},
      };
    },
  });

  // Fetch open conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["support-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("user_type", "freelancer")
        .order("last_message_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      
      const { data, error } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          user_type: "freelancer",
          subject: "محادثة جديدة مع الدعم",
          status: "open",
          priority: "normal",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      // Navigate after successful creation
      navigate(`/freelancer/support/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartConversation = () => {
    createConversationMutation.mutate();
  };

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="الدعم الفني"
      subtitle="تواصل مع فريق الدعم للحصول على المساعدة"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5" />
              كيف يمكننا مساعدتك؟
            </CardTitle>
            <CardDescription>
              فريق الدعم متاح لمساعدتك في أي استفسارات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleStartConversation}
              className="w-full" 
              size="lg"
              disabled={createConversationMutation.isPending}
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {createConversationMutation.isPending ? "جاري الإنشاء..." : "بدء محادثة جديدة"}
            </Button>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold">البريد الإلكتروني</h4>
                  <p className="text-sm text-muted-foreground">{siteSettings?.contactInfo?.email || "support@example.com"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Phone className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold">الهاتف</h4>
                  <p className="text-sm text-muted-foreground" dir="ltr">{siteSettings?.contactInfo?.phone || "+20 123 456 7890"}</p>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            {siteSettings?.socialLinks && Object.keys(siteSettings.socialLinks).some(key => siteSettings.socialLinks[key]) && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">تابعنا على</h4>
                <div className="flex gap-3">
                  {siteSettings.socialLinks.facebook && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={siteSettings.socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {siteSettings.socialLinks.twitter && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={siteSettings.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {siteSettings.socialLinks.instagram && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={siteSettings.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {siteSettings.socialLinks.linkedin && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={siteSettings.socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>محادثاتك السابقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : conversations && conversations.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>محادثاتك السابقة</CardTitle>
              <CardDescription>آخر المحادثات مع فريق الدعم</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/freelancer/support/${conv.id}`)}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{conv.subject || "محادثة دعم"}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      conv.status === "open" ? "bg-green-100 text-green-700" :
                      conv.status === "closed" ? "bg-gray-100 text-gray-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {conv.status === "open" ? "مفتوحة" : conv.status === "closed" ? "مغلقة" : "قيد الانتظار"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    آخر رسالة: {new Date(conv.last_message_at).toLocaleString("ar-EG")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Help Resources */}
        <Card>
          <CardHeader>
            <CardTitle>موارد مساعدة إضافية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/faq" target="_blank">
                الأسئلة الشائعة
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/how-it-works" target="_blank">
                كيف يعمل النظام؟
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
