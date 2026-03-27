import { useMemo, useState } from "react";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileText, Globe, Award, Briefcase, User, Download } from "lucide-react";

interface CVData {
  profile: any | null;
  freelancerProfile: any | null;
  skills: any[];
  certificates: any[];
  projects: any[];
}

const cvStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderColor: "#cccccc",
    paddingBottom: 8,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    color: "#555555",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
  },
  listItem: {
    marginBottom: 3,
  },
  bold: {
    fontWeight: 600,
  },
});

function FreelancerCVDocument({ data, language }: { data: CVData; language: "ar" | "en" }) {
  const name = data.profile?.full_name || "";
  const title = data.freelancerProfile?.experience || "";
  const bio = data.freelancerProfile?.bio || "";

  const labels = language === "ar"
    ? {
        cv: "السيرة الذاتية",
        contact: "بيانات التواصل",
        skills: "المهارات",
        projects: "المشاريع",
        certificates: "الشهادات",
      }
    : {
        cv: "Curriculum Vitae",
        contact: "Contact",
        skills: "Skills",
        projects: "Projects",
        certificates: "Certificates",
      };

  return (
    <Document>
      <Page size="A4" style={cvStyles.page}>
        <View style={cvStyles.header}>
          <Text style={cvStyles.name}>{name}</Text>
          {title ? <Text style={cvStyles.subtitle}>{title}</Text> : null}
          {bio ? <Text style={cvStyles.subtitle}>{bio}</Text> : null}
        </View>

        {/* Contact */}
        <View style={cvStyles.section}>
          <Text style={cvStyles.sectionTitle}>{labels.contact}</Text>
          {data.profile?.email && (
            <Text style={cvStyles.listItem}>{data.profile.email}</Text>
          )}
        </View>

        {/* Skills */}
        {data.skills.length > 0 && (
          <View style={cvStyles.section}>
            <Text style={cvStyles.sectionTitle}>{labels.skills}</Text>
            {data.skills.map((skill) => (
              <Text key={skill.id} style={cvStyles.listItem}>
                {skill.name}
                {skill.level ? ` - ${skill.level}` : ""}
              </Text>
            ))}
          </View>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <View style={cvStyles.section}>
            <Text style={cvStyles.sectionTitle}>{labels.projects}</Text>
            {data.projects.map((project) => (
              <View key={project.id} style={cvStyles.listItem}>
                <Text style={cvStyles.bold}>{project.title}</Text>
                {project.description ? <Text>{project.description}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Certificates */}
        {data.certificates.length > 0 && (
          <View style={cvStyles.section}>
            <Text style={cvStyles.sectionTitle}>{labels.certificates}</Text>
            {data.certificates.map((cert) => (
              <View key={cert.id} style={cvStyles.listItem}>
                <Text style={cvStyles.bold}>{cert.name}</Text>
                {cert.issuer ? <Text>{cert.issuer}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export default function FreelancerCV() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  const { data, isLoading } = useQuery<CVData | null>({
    queryKey: ["freelancer-cv", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [{ data: profile }, { data: freelancerProfile }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("freelancer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      const skillsRes = await supabase.from("freelancer_skills").select("*").eq("user_id", user.id).order("sort_order", { ascending: true });
      const certificatesRes = await supabase.from("freelancer_certificates").select("*").eq("user_id", user.id).order("issue_date", { ascending: false });
      
      const skills = skillsRes.data || [];
      const certificates = certificatesRes.data || [];

      return {
        profile,
        freelancerProfile,
        skills,
        certificates,
        projects: [],
      };
    },
    enabled: !!user,
  });

  const hasData = useMemo(() => {
    if (!data) return false;
    return !!(
      data.profile ||
      data.freelancerProfile ||
      data.skills.length ||
      data.certificates.length ||
      data.projects.length
    );
  }, [data]);

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="إنشاء CV تلقائي"
      subtitle="يتم توليد السيرة الذاتية تلقائيًا من بيانات بروفايلك وبورتفوليوك"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                معاينة السيرة الذاتية
              </CardTitle>
              <CardDescription>
                يتم إنشاء CV بتصميم بسيط ومتوافق مع أنظمة ATS، باللغة التي تختارها
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !data ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !hasData ? (
                <p className="text-muted-foreground text-sm">
                  لم يتم العثور على بيانات كافية. تأكد من تعبئة الملف الشخصي، المهارات، الشهادات، والمشاريع.
                </p>
              ) : (
                <PDFDownloadLink
                  document={<FreelancerCVDocument data={data} language={language} />}
                  fileName="freelancer-cv.pdf"
                >
                  {({ loading }) => (
                    <Button size="lg" disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <Download className="w-4 h-4 ml-2" />
                      )}
                      تحميل CV بصيغة PDF
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                إعدادات اللغة
              </CardTitle>
              <CardDescription>اختر لغة عرض العناوين في ملف الـ CV</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
                <TabsContent value="ar" className="mt-4 text-sm text-muted-foreground">
                  سيتم استخدام عناوين عربية مع دعم كامل لنصوصك العربية داخل الـ CV.
                </TabsContent>
                <TabsContent value="en" className="mt-4 text-sm text-muted-foreground">
                  Section titles will be in English, while your existing data is reused as-is.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                مصادر البيانات
              </CardTitle>
              <CardDescription>ما الذي يتم تضمينه داخل ملف الـ CV؟</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                الاسم وبيانات التواصل من الملف الشخصي
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                النبذة والتخصص من بروفايل الفريلانسر
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                المهارات والشهادات من أقسام Skills & Certificates
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                المشاريع من Portfolio Projects (المشاريع الموثقة داخل المنصة)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
