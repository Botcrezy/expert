import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Github, Linkedin, Mail, Phone, User, Link as LinkIcon, Briefcase, Star } from "lucide-react";

type Props = {
  profile: any | null | undefined;
  freelancerProfile: any | null | undefined;
  portfolioLink: string;
  onEditProfile: () => void;
  serviceRatingsSummary?: {
    totalRatings: number;
    averageRating: number;
  };
};

const experienceLabel = (value?: string | null) => {
  if (!value) return "-";
  const map: Record<string, string> = {
    less_than_1: "أقل من سنة",
    "1-3": "1-3 سنوات",
    "3-5": "3-5 سنوات",
    "5+": "أكثر من 5 سنوات",
  };
  return map[value] || value;
};

export function FreelancerPortfolioProfileCard({
  profile,
  freelancerProfile,
  portfolioLink,
  onEditProfile,
  serviceRatingsSummary,
}: Props) {
  const fullName = profile?.full_name || "-";
  const username = freelancerProfile?.username ? `@${freelancerProfile.username}` : null;

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="h-24 bg-gradient-to-br from-primary/25 via-accent/20 to-primary/15" />
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary))_0%,transparent_60%),radial-gradient(circle_at_80%_10%,hsl(var(--accent))_0%,transparent_55%)]" aria-hidden />
      </div>

      <CardContent className="p-5 sm:p-6 -mt-10">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url || ""} alt={fullName} />
            <AvatarFallback className="text-xl">{String(fullName).charAt(0) || "U"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold truncate">{fullName}</h2>
              {freelancerProfile?.is_verified ? (
                <Badge variant="default">موثق</Badge>
              ) : (
                <Badge variant="secondary">غير موثق</Badge>
              )}
              {username && <Badge variant="outline">{username}</Badge>}
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              معلوماتك الأساسية التي تظهر للمنصة
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {typeof freelancerProfile?.hourly_rate === "number" && (
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {freelancerProfile.hourly_rate} ج.م/ساعة
                </Badge>
              )}
              {freelancerProfile?.experience && (
                <Badge variant="secondary" className="gap-1">
                  <User className="h-3.5 w-3.5" />
                  {experienceLabel(freelancerProfile.experience)}
                </Badge>
              )}
              {!!serviceRatingsSummary?.totalRatings && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {serviceRatingsSummary.averageRating.toFixed(1)} / 5
                  <span className="text-muted-foreground">({serviceRatingsSummary.totalRatings})</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={onEditProfile}>
              تعديل البيانات
            </Button>
            <Button
              variant="secondary"
              onClick={() => portfolioLink && window.open(portfolioLink, "_blank")}
              disabled={!portfolioLink}
            >
              <ExternalLink className="h-4 w-4 ml-2" />
              عرض البورتفوليو
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">الاسم الكامل</p>
              <p className="font-medium truncate">{fullName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
              <p className="font-medium truncate">{profile?.email || "-"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">رقم الهاتف</p>
              <p className="font-medium truncate">{profile?.phone || "-"}</p>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">نبذة عنك</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {freelancerProfile?.bio || "لم يتم إضافة نبذة بعد"}
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <LinkIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">رابط Portfolio خارجي</p>
              {freelancerProfile?.portfolio_url ? (
                <a
                  href={freelancerProfile.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium truncate block hover:underline"
                >
                  {freelancerProfile.portfolio_url}
                </a>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <Linkedin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">LinkedIn</p>
              {(freelancerProfile as any)?.linkedin_url ? (
                <a
                  href={(freelancerProfile as any).linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium truncate block hover:underline"
                >
                  {(freelancerProfile as any).linkedin_url}
                </a>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <Github className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">GitHub</p>
              {(freelancerProfile as any)?.github_url ? (
                <a
                  href={(freelancerProfile as any).github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium truncate block hover:underline"
                >
                  {(freelancerProfile as any).github_url}
                </a>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
