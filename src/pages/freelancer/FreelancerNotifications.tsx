import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Bell,
  Loader2,
  CheckCircle2,
  MessageSquare,
  ClipboardCheck,
  Wallet,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function FreelancerNotifications() {
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-5 h-5 text-primary" />;
      case "assignment":
        return <ClipboardCheck className="w-5 h-5 text-success" />;
      case "status_change":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "payment":
      case "wallet":
        return <Wallet className="w-5 h-5 text-success" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ar });
    }
    return format(date, "dd MMM, h:mm a", { locale: ar });
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="الإشعارات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="الإشعارات"
      subtitle="تابع جميع التحديثات والتنبيهات"
    >
      <div className="card-elevated">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold text-foreground">جميع الإشعارات</h3>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
              <CheckCircle2 className="w-4 h-4" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                  !notification.is_read && "bg-primary/5"
                )}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn(
                          "font-medium text-foreground",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد إشعارات</h3>
            <p className="text-muted-foreground">ستظهر هنا جميع التنبيهات والتحديثات</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
