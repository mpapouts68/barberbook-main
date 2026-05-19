import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
// Removed Card imports - using custom div structure
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, Calendar, AlertCircle, Info, Gift, X, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { el } from "date-fns/locale";
import type { Notification } from "@shared/schema";

interface NotificationCenterProps {
  onClose?: () => void;
  hideHeader?: boolean;
}

export function NotificationCenter({ onClose, hideHeader = false }: NotificationCenterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications?limit=50", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const data = await response.json();
      // Ensure all notifications have message field
      return Array.isArray(data) ? data.map((n: Notification) => ({
        ...n,
        message: n.message || n.title || '',
      })) : [];
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10 seconds for better real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Επιτυχία",
        description: "Όλες οι ειδοποιήσεις σημειώθηκαν ως διαβασμένες",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete" }));
        throw new Error(errorData.message || "Failed to delete");
      }
      return id;
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/notifications"] });
      await queryClient.cancelQueries({ queryKey: ["/api/notifications/unread-count"] });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData<Notification[]>(["/api/notifications"]);
      const previousUnreadCount = queryClient.getQueryData<number>(["/api/notifications/unread-count"]);

      // Find the deleted notification to check if it was unread
      const deletedNotification = previousNotifications?.find(n => n.id === deletedId);
      const wasUnread = deletedNotification && !deletedNotification.read;

      // Optimistically remove from UI immediately
      queryClient.setQueryData<Notification[]>(["/api/notifications"], (old = []) => {
        return old.filter(n => n.id !== deletedId);
      });

      // Update unread count if deleted notification was unread
      if (wasUnread) {
        queryClient.setQueryData(["/api/notifications/unread-count"], (old: number = 0) => {
          return Math.max(0, old - 1);
        });
      }

      return { previousNotifications, previousUnreadCount, deletedId };
    },
    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(["/api/notifications"], context.previousNotifications);
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(["/api/notifications/unread-count"], context.previousUnreadCount);
      }
      const errorMessage = err instanceof Error ? err.message : "Αποτυχία διαγραφής ειδοποίησης";
      toast({
        title: "Σφάλμα",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (deletedId) => {
      // Clear expanded state if this notification was expanded
      setExpandedId((current) => current === deletedId ? null : current);
      toast({
        title: "Επιτυχία",
        description: "Η ειδοποίηση διαγράφηκε",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
      case 'appointment_confirmed':
        return <Calendar className="w-5 h-5 text-green-400" />;
      case 'appointment_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'appointment_reminder':
        return <Bell className="w-5 h-5 text-yellow-400" />;
      case 'promotion':
        return <Gift className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment_created':
      case 'appointment_confirmed':
        return 'bg-green-600/20 border-green-600/50 hover:bg-green-600/30';
      case 'appointment_cancelled':
        return 'bg-red-600/20 border-red-600/50 hover:bg-red-600/30';
      case 'appointment_reminder':
        return 'bg-yellow-600/20 border-yellow-600/50 hover:bg-yellow-600/30';
      case 'promotion':
        return 'bg-purple-600/20 border-purple-600/50 hover:bg-purple-600/30';
      default:
        return 'bg-blue-600/20 border-blue-600/50 hover:bg-blue-600/30';
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'appointment_created': 'Νέο Ραντεβού',
      'appointment_confirmed': 'Επιβεβαίωση',
      'appointment_cancelled': 'Ακύρωση',
      'appointment_reminder': 'Υπενθύμιση',
      'promotion': 'Προσφορά',
      'system': 'Σύστημα',
    };
    return labels[type] || 'Ειδοποίηση';
  };

  if (!user) {
    return null;
  }

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="metal-gradient border border-steel rounded-lg shadow-xl max-h-[80vh] flex flex-col bg-charcoal/95 backdrop-blur-sm">
      {!hideHeader && (
        <div className="border-b border-steel/50 flex-shrink-0 p-4">
          <div className="flex items-center justify-between">
            <div className="text-whiskey flex items-center gap-2 font-semibold text-lg">
              <Bell className="w-5 h-5 text-whiskey" />
              Ειδοποιήσεις
              {unreadCount > 0 && (
                <Badge className="bg-red-600 text-white animate-pulse ml-1">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-steel hover:bg-iron text-white border-steel"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Σημείωση Όλων
                </Button>
              )}
              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-0 overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whiskey"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-whiskey/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bell className="w-8 h-8 text-whiskey/50" />
            </div>
            <p className="text-gray-400">Δεν υπάρχουν ειδοποιήσεις</p>
            <p className="text-gray-500 text-sm mt-2">Θα εμφανιστούν εδώ όταν λάβετε νέες ειδοποιήσεις</p>
          </div>
        ) : (
          <div className="divide-y divide-steel/30 overflow-y-auto flex-1">
            {/* Unread Notifications */}
            {unreadNotifications.length > 0 && (
              <div className="p-4 bg-green-600/5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <h3 className="text-green-400 font-semibold text-sm uppercase tracking-wide">
                    Νέες ({unreadNotifications.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => markAsReadMutation.mutate(notification.id)}
                      onDelete={() => {
                        deleteMutation.mutate(notification.id);
                      }}
                      getIcon={getNotificationIcon}
                      getColor={getNotificationColor}
                      getTypeLabel={getNotificationTypeLabel}
                      expanded={expandedId === notification.id}
                      onExpand={() => setExpandedId(expandedId === notification.id ? null : notification.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Read Notifications */}
            {readNotifications.length > 0 && (
              <div className="p-4">
                {unreadNotifications.length > 0 && (
                  <h3 className="text-gray-400 font-semibold text-sm uppercase tracking-wide mb-3">
                    Παλαιότερες ({readNotifications.length})
                  </h3>
                )}
                <div className="space-y-3">
                  {readNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => markAsReadMutation.mutate(notification.id)}
                      onDelete={() => {
                        deleteMutation.mutate(notification.id);
                      }}
                      getIcon={getNotificationIcon}
                      getColor={getNotificationColor}
                      getTypeLabel={getNotificationTypeLabel}
                      expanded={expandedId === notification.id}
                      onExpand={() => setExpandedId(expandedId === notification.id ? null : notification.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  getIcon,
  getColor,
  getTypeLabel,
  expanded,
  onExpand,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
  getIcon: (type: string) => React.ReactNode;
  getColor: (type: string) => string;
  getTypeLabel: (type: string) => string;
  expanded: boolean;
  onExpand: () => void;
}) {
  // Handle createdAt - SQLite stores as integer timestamp (seconds)
  // When serialized to JSON, it becomes a number
  let createdAtDate: Date;
  
  try {
    if (notification.createdAt instanceof Date) {
      createdAtDate = notification.createdAt;
    } else if (typeof notification.createdAt === 'number') {
      // Check if it's milliseconds (> year 2001) or seconds
      // Timestamps > 1000000000000 are milliseconds (after year 2001)
      createdAtDate = notification.createdAt > 1000000000000 
        ? new Date(notification.createdAt) // Already milliseconds
        : new Date(notification.createdAt * 1000); // Convert seconds to milliseconds
    } else if (typeof notification.createdAt === 'string') {
      createdAtDate = new Date(notification.createdAt);
    } else {
      // Fallback to current date
      createdAtDate = new Date();
    }
  } catch (error) {
    // If date parsing fails, use current date
    createdAtDate = new Date();
  }
  
  // Validate date
  const isValidDate = !isNaN(createdAtDate.getTime());
  
  const timeAgo = isValidDate 
    ? formatDistanceToNow(createdAtDate, {
        addSuffix: true,
        locale: el,
      })
    : 'Πρόσφατα';
    
  const fullDate = isValidDate
    ? format(createdAtDate, "dd-MM-yyyy, HH:mm", { locale: el })
    : 'Άγνωστη ημερομηνία';

  return (
    <div
      className={`rounded-lg border transition-all ${getColor(notification.type)} ${
        !notification.read ? 'ring-2 ring-whiskey/30 shadow-lg' : ''
      } ${expanded ? 'ring-2 ring-whiskey/50 shadow-xl bg-charcoal/80' : ''}`}
    >
      <div className={`flex items-start gap-4 ${expanded ? 'p-6' : 'p-4'}`}>
        <div className={`flex-shrink-0 ${expanded ? 'mt-0.5' : 'mt-1'}`}>
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <h4 className={`font-bold ${expanded ? 'text-xl' : 'text-base'} ${notification.read ? 'text-gray-400' : 'text-white'}`}>
                  {notification.title}
                </h4>
                <Badge variant="outline" className="text-xs border-current">
                  {getTypeLabel(notification.type)}
                </Badge>
                {!notification.read && (
                  <span className="w-2.5 h-2.5 bg-whiskey rounded-full flex-shrink-0 animate-pulse" />
                )}
              </div>
              {notification.message && notification.message.trim() !== notification.title.trim() && (
                <div 
                  className={`cursor-pointer ${expanded ? '' : 'line-clamp-2'} mt-2`}
                  onClick={onExpand}
                >
                  <p className={`${expanded ? 'text-lg leading-7' : 'text-sm leading-5'} ${notification.read ? 'text-gray-400' : expanded ? 'text-white' : 'text-gray-200'} whitespace-pre-wrap break-words`}>
                    {notification.message}
                  </p>
                </div>
              )}
              <div className={`flex items-center gap-3 ${expanded ? 'mt-4' : 'mt-3'} text-xs ${expanded ? 'text-gray-300' : 'text-gray-400'}`}>
                <span className="font-medium">{expanded ? fullDate : timeAgo}</span>
                {!expanded && (
                  <button
                    onClick={onExpand}
                    className="text-whiskey hover:text-whiskey-300 underline text-xs font-medium"
                  >
                    Δείτε περισσότερα
                  </button>
                )}
                {expanded && (
                  <button
                    onClick={onExpand}
                    className="text-gray-400 hover:text-gray-200 underline text-xs font-medium"
                  >
                    Σύμπτυξη
                  </button>
                )}
              </div>
              {expanded && notification.link && (
                <div className="mt-5">
                  <Link href={notification.link}>
                    <Button
                      size="default"
                      variant="outline"
                      className="bg-steel/70 hover:bg-steel text-white border-steel font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Δείτε Περισσότερα →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {!notification.read && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-gray-400 hover:text-green-400 hover:bg-green-400/20 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead();
                  }}
                  title="Σημείωση ως διαβασμένη"
                >
                  <Check className="w-5 h-5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/20 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete();
                }}
                title="Διαγραφή"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
