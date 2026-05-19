import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "./NotificationCenter";
import { useAuth } from "@/context/auth-context";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count;
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10 seconds for better real-time updates
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative text-whiskey hover:text-whiskey-300 hover:bg-charcoal-700 flex items-center gap-2"
          title={`Ειδοποιήσεις${unreadCount > 0 ? ` (${unreadCount} νέες)` : ''}`}
        >
          <Bell className="h-5 w-5 text-whiskey" />
          <span className="hidden md:inline text-sm font-medium">Ειδοποιήσεις</span>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-[90vw] sm:w-96 p-0 bg-transparent border-none shadow-xl z-[100]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <NotificationCenter onClose={() => setIsOpen(false)} hideHeader={true} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}