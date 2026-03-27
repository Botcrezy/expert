import { useState } from "react";
import { Bell, Check, MessageSquare, ClipboardList, RefreshCw, Wallet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="w-4 h-4 text-primary" />,
  assignment: <ClipboardList className="w-4 h-4 text-primary" />,
  status_change: <RefreshCw className="w-4 h-4 text-primary" />,
  payment: <Wallet className="w-4 h-4 text-primary" />,

  // Portfolio purchase flow
  service_purchase: <ClipboardList className="w-4 h-4 text-primary" />,
  brief_submitted: <MessageSquare className="w-4 h-4 text-primary" />,
  admin_approved: <Check className="w-4 h-4 text-primary" />,

  system: <Bell className="w-4 h-4 text-muted-foreground" />,
  admin: <AlertCircle className="w-4 h-4 text-destructive" />,
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const { userRole } = useAuth();
  const [open, setOpen] = useState(false);

  const getNotificationLink = (notification: any) => {
    if (!notification.reference_id) return null;
    
    const isFreelancer = userRole === "freelancer";
    const isAdmin = userRole === "admin" || userRole === "team_leader";
    
    switch (notification.reference_type) {
      case "request":
        if (isAdmin) return `/admin/requests/${notification.reference_id}`;
        if (isFreelancer) return `/freelancer/tasks`; // request-level link, show within assignments list
        return `/client/requests/${notification.reference_id}`;
      case "withdrawal":
        return isFreelancer ? "/freelancer/wallet" : "/admin/wallets";
      case "wallet":
        return isFreelancer ? "/freelancer/wallet" : "/client/wallet";
      case "order":
        return isAdmin ? "/admin/orders" : "/client/billing";
      case "assignment":
        return isFreelancer ? "/freelancer/tasks" : "/admin/assignments";
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-foreground">الإشعارات</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2"
              onClick={() => markAllAsRead()}
            >
              <Check className="w-3 h-3 ml-1" />
              قراءة الكل
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              جاري التحميل...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {typeIcons[notification.type] || typeIcons.system}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm text-foreground",
                            !notification.is_read && "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ar,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return link ? (
                  <Link
                    key={notification.id}
                    to={link}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
