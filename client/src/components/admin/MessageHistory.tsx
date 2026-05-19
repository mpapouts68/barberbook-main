import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Users, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";

interface PushMessage {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentAt: number;
}

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Όλοι οι χρήστες",
  nameday: "Σημερινές ονομαστικές",
  birthday: "Σημερινά γενέθλια",
  upcoming: "Προσεχείς ραντεβού",
  selected: "Επιλεγμένοι χρήστες",
};

const AUDIENCE_COLORS: Record<string, string> = {
  all: "bg-blue-600/20 text-blue-400 border-blue-600/50",
  nameday: "bg-purple-600/20 text-purple-400 border-purple-600/50",
  birthday: "bg-pink-600/20 text-pink-400 border-pink-600/50",
  upcoming: "bg-green-600/20 text-green-400 border-green-600/50",
  selected: "bg-amber-600/20 text-amber-300 border-amber-600/50",
};

export function MessageHistory() {
  const { data: messages = [], isLoading } = useQuery<PushMessage[]>({
    queryKey: ["/api/admin/message-history"],
    queryFn: async () => {
      const response = await fetch("/api/admin/push-notifications", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch message history");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="text-whiskey flex items-center gap-2">
            <History className="w-5 h-5" />
            Ιστορικό Μηνυμάτων
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">Φόρτωση...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="metal-gradient border-steel">
      <CardHeader>
        <CardTitle className="text-whiskey flex items-center gap-2">
          <History className="w-5 h-5" />
          Ιστορικό Μηνυμάτων
          {messages.length > 0 && (
            <Badge className="bg-whiskey text-black ml-2">{messages.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Δεν υπάρχουν αποσταλμένα μηνύματα</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg border ${AUDIENCE_COLORS[msg.audience] || "bg-charcoal/50 border-steel"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold truncate">{msg.title}</h4>
                      <Badge
                        variant="outline"
                        className={`${AUDIENCE_COLORS[msg.audience] || ""} border-current`}
                      >
                        {AUDIENCE_LABELS[msg.audience] || msg.audience}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{msg.body}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {msg.sentAt
                            ? format(new Date(msg.sentAt), "dd MMM yyyy, HH:mm", { locale: el })
                            : "Άγνωστη ημερομηνία"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}




