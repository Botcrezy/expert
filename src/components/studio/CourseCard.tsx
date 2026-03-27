import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  Lock,
  CheckCircle2,
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  track: {
    id: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    level: string;
    is_free?: boolean;
    price?: number;
    cover_image?: string;
    enrollment_count?: number;
    required_stars?: number;
    modules_count?: number;
    lessons_count?: number;
  };
  enrollment?: {
    is_active: boolean;
    progress_percentage: number;
    completed_at?: string;
  } | null;
  userStars?: number;
  userType: "client" | "freelancer";
  showActions?: boolean;
  mode?: "track" | "course";
}


export function CourseCard({ 
  track, 
  enrollment, 
  userStars = 0, 
  userType,
  showActions = true,
  mode = "course",
}: CourseCardProps) {
  const isEnrolled = !!enrollment?.is_active;
  const isCompleted = !!enrollment?.completed_at;
  const isLocked = (track.required_stars || 0) > userStars;
  const progress = enrollment?.progress_percentage || 0;

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "beginner":
        return <Badge className="bg-success/10 text-success">مبتدئ</Badge>;
      case "intermediate":
        return <Badge className="bg-warning/10 text-warning">متوسط</Badge>;
      case "advanced":
        return <Badge className="bg-destructive/10 text-destructive">متقدم</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const detailUrl =
    mode === "track"
      ? userType === "freelancer"
        ? `/freelancer/studio/track/${track.id}`
        : `/courses/${track.id}`
      : userType === "freelancer"
        ? `/freelancer/course/${track.id}`
        : `/client/course/${track.id}`;

  let actionLabel = "ابدأ الآن";

  if (isEnrolled) {
    actionLabel = isCompleted ? "مراجعة المحتوى" : "متابعة التعلم";
  } else if (isLocked) {
    actionLabel = "مقفل";
  } else if (!track.is_free) {
    actionLabel = "معاينة الكورس";
  } else {
    actionLabel = "ابدأ مجانًا";
  }

  return (
    <Card className={cn(
      "group overflow-hidden transition-all hover:shadow-lg",
      isLocked && "opacity-75"
    )}>
      {/* Cover Image */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {track.cover_image ? (
          <img
            src={track.cover_image}
            alt={track.name_ar}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="w-12 h-12 text-primary/50" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-3 right-3 flex gap-2">
          {track.is_free && (
            <Badge className="bg-success text-white">مجاني</Badge>
          )}
          {!track.is_free && track.price && track.price > 0 && (
            <Badge className="bg-primary text-white">{track.price} ج.م</Badge>
          )}
        </div>

        {isLocked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <Lock className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">يتطلب {track.required_stars} نجمة</p>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-success text-white gap-1">
              <CheckCircle2 className="w-3 h-3" />
              مكتمل
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-1">
            {track.name_ar}
          </h3>
          {getLevelBadge(track.level)}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {track.description_ar || track.description || "لا يوجد وصف"}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {track.modules_count !== undefined && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {track.modules_count} وحدة
            </span>
          )}
          {track.lessons_count !== undefined && (
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              {track.lessons_count} درس
            </span>
          )}
          {track.enrollment_count !== undefined && track.enrollment_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {track.enrollment_count}
            </span>
          )}
          {track.required_stars && track.required_stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-warning" />
              {track.required_stars}
            </span>
          )}
        </div>

        {/* Progress bar for enrolled users */}
        {isEnrolled && !isCompleted && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">التقدم</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full"
            variant={isEnrolled ? "outline" : "default"}
            disabled={isLocked}
            asChild
          >
            <Link to={detailUrl}>
              {actionLabel}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
