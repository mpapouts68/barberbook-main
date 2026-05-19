import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Users, Eye, Loader2, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  icon: string;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "christmas",
    name: "Καλά Χριστούγεννα",
    title: "Καλά Χριστούγεννα!",
    message: "Καλά Χριστούγεννα {name}! Ευχόμαστε υγεία και ευτυχία!",
    icon: "🎄"
  },
  {
    id: "newyear",
    name: "Ευτυχισμένο το Νέο Έτος",
    title: "Ευτυχισμένο το Νέο Έτος!",
    message: "Ευτυχισμένο το Νέο Έτος {name}! Καλή χρονιά με υγεία και ευτυχία!",
    icon: "🎉"
  },
  {
    id: "special_offer",
    name: "Ειδική Προσφορά",
    title: "Ειδική Προσφορά!",
    message: "Αγαπητέ/ή {name}, έχουμε μια ειδική προσφορά για εσάς! Επισκεφτείτε μας για περισσότερες λεπτομέρειες.",
    icon: "🎁"
  },
  {
    id: "holiday",
    name: "Εορταστικό Μήνυμα",
    title: "Εορταστικό Μήνυμα",
    message: "Καλή εορτή {name}! Ευχόμαστε να περάσετε όμορφα!",
    icon: "🎊"
  },
  {
    id: "custom",
    name: "Προσαρμοσμένο",
    title: "",
    message: "",
    icon: "✏️"
  }
];

interface AudienceInfo {
  value: string;
  label: string;
  description: string;
  count?: number;
}

interface NotificationRecipient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isWalkIn: boolean;
}

export function MessageComposer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Get audience counts
  const { data: audienceCounts } = useQuery({
    queryKey: ["/api/admin/audience-counts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/audience-counts", { credentials: "include" });
      if (!response.ok) return {};
      return response.json();
    },
  });

  const { data: recipientsData, isLoading: loadingRecipients } = useQuery({
    queryKey: ["/api/admin/notification-recipients"],
    queryFn: async () => {
      const response = await fetch("/api/admin/notification-recipients", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recipients");
      return response.json() as Promise<{ users: NotificationRecipient[] }>;
    },
  });

  const recipientUsers = recipientsData?.users ?? [];

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipientUsers;
    return recipientUsers.filter((u) => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [recipientUsers, recipientSearch]);

  const audiences: AudienceInfo[] = [
    {
      value: "all",
      label: "Όλοι οι χρήστες",
      description: "Όλοι οι εγγεγραμμένοι χρήστες",
      count: audienceCounts?.all || 0,
    },
    {
      value: "nameday",
      label: "Σημερινές ονομαστικές",
      description: "Χρήστες με σημερινή ονομαστική",
      count: audienceCounts?.nameday || 0,
    },
    {
      value: "birthday",
      label: "Σημερινά γενέθλια",
      description: "Χρήστες με σημερινά γενέθλια",
      count: audienceCounts?.birthday || 0,
    },
    {
      value: "upcoming",
      label: "Προσεχείς ραντεβού",
      description: "Χρήστες με προσεχή ραντεβού",
      count: audienceCounts?.upcoming || 0,
    },
    {
      value: "selected",
      label: "Επιλεγμένοι χρήστες",
      description: "Επιλέξτε συγκεκριμένους πελάτες από τη λίστα",
      count: audience === "selected" ? selectedUserIds.length : undefined,
    },
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template && templateId !== "custom") {
      setTitle(template.title);
      setMessage(template.message);
    } else {
      setTitle("");
      setMessage("");
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/push-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          message: message,
          audience,
          ...(audience === "selected" ? { userIds: selectedUserIds } : {}),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Το μήνυμα στάλθηκε επιτυχώς!",
      });
      setTitle("");
      setMessage("");
      setSelectedTemplate("custom");
      setSelectedUserIds([]);
      setRecipientSearch("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/push-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/message-history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία αποστολής μηνύματος",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Σφάλμα",
        description: "Παρακαλώ συμπληρώστε τίτλο και μήνυμα",
        variant: "destructive",
      });
      return;
    }
    if (audience === "selected" && selectedUserIds.length === 0) {
      toast({
        title: "Σφάλμα",
        description: "Επιλέξτε τουλάχιστον έναν παραλήπτη από τη λίστα",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate();
  };

  const toggleRecipient = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredRecipients.map((u) => u.id);
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => setSelectedUserIds([]);

  const deselectFiltered = () => {
    const remove = new Set(filteredRecipients.map((u) => u.id));
    setSelectedUserIds((prev) => prev.filter((id) => !remove.has(id)));
  };

  const previewMessage = message.replace(/{name}/g, "Γιάννης"); // Sample name for preview
  const selectedAudience = audiences.find(a => a.value === audience);

  return (
    <Card className="metal-gradient border-steel">
      <CardHeader>
        <CardTitle className="text-whiskey flex items-center gap-2">
          <Send className="w-5 h-5" />
          Σύνθεση Μηνύματος
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-charcoal border-steel">
            <TabsTrigger value="compose" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">
              Σύνθεση
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">
              <Eye className="w-4 h-4 mr-2" />
              Προεπισκόπηση
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-4">
            {/* Template Selection */}
            <div>
              <Label className="text-whiskey mb-2 block">Πρότυπο Μηνύματος</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MESSAGE_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className={`h-auto py-3 flex flex-col items-center gap-1 ${
                      selectedTemplate === template.id
                        ? "whiskey-gradient text-black"
                        : "bg-charcoal border-steel text-white hover:bg-iron"
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Audience Selection */}
            <div>
              <Label htmlFor="audience" className="text-whiskey mb-2 block">
                Κοινό
                {selectedAudience && selectedAudience.count !== undefined && (
                  <Badge className="ml-2 bg-whiskey text-black">
                    {selectedAudience.count} χρήστες
                  </Badge>
                )}
              </Label>
              <Select
                value={audience}
                onValueChange={(v) => {
                  setAudience(v);
                  if (v !== "selected") setSelectedUserIds([]);
                }}
              >
                <SelectTrigger className="bg-charcoal border-steel text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-charcoal border-steel">
                  {audiences.map((aud) => (
                    <SelectItem key={aud.value} value={aud.value} className="text-white">
                      <div className="flex items-center justify-between w-full">
                        <span>{aud.label}</span>
                        {aud.count !== undefined && (
                          <Badge variant="secondary" className="ml-2">
                            {aud.count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAudience && (
                <p className="text-xs text-gray-400 mt-1">{selectedAudience.description}</p>
              )}

              {audience === "selected" && (
                <div className="mt-4 space-y-3 rounded-lg border border-steel bg-slate/10 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        placeholder="Αναζήτηση ονόματος ή email..."
                        className="bg-charcoal border-steel pl-8 text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-steel bg-charcoal text-white hover:bg-iron"
                        onClick={selectAllFiltered}
                        disabled={filteredRecipients.length === 0}
                      >
                        + Όλοι ορατοί
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-steel bg-charcoal text-white hover:bg-iron"
                        onClick={deselectFiltered}
                        disabled={filteredRecipients.length === 0}
                      >
                        − Ορατοί
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-steel bg-charcoal text-white hover:bg-iron"
                        onClick={clearSelection}
                        disabled={selectedUserIds.length === 0}
                      >
                        Καθαρισμός
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Επιλεγμένοι: <span className="font-medium text-whiskey">{selectedUserIds.length}</span>
                    {recipientUsers.length > 0 && (
                      <span className="text-gray-500"> · Σύνολο πελατών: {recipientUsers.length}</span>
                    )}
                  </p>
                  {loadingRecipients ? (
                    <p className="py-6 text-center text-sm text-gray-400">Φόρτωση λίστας...</p>
                  ) : (
                    <ScrollArea className="h-[min(320px,50vh)] rounded-md border border-steel/60 bg-charcoal/30 pr-2">
                      <div className="space-y-0.5 p-1">
                        {filteredRecipients.length === 0 ? (
                          <p className="py-6 text-center text-sm text-gray-500">
                            Δεν βρέθηκαν χρήστες με αυτό το φίλτρο
                          </p>
                        ) : (
                          filteredRecipients.map((u) => (
                            <label
                              key={u.id}
                              className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-white/5"
                            >
                              <Checkbox
                                checked={selectedUserIds.includes(u.id)}
                                onCheckedChange={(c) => toggleRecipient(u.id, c === true)}
                                className="mt-0.5 border-steel data-[state=checked]:bg-whiskey data-[state=checked]:text-black"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-white">
                                  {u.firstName} {u.lastName}
                                </span>
                                <span className="block truncate text-xs text-gray-500">{u.email}</span>
                              </span>
                              {u.isWalkIn && (
                                <Badge variant="secondary" className="shrink-0 bg-gray-700 text-gray-200">
                                  Walk-in
                                </Badge>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-whiskey">
                Τίτλος
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-charcoal border-steel text-white"
                placeholder="Τίτλος μηνύματος..."
              />
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message" className="text-whiskey">
                Μήνυμα
                <span className="text-xs text-gray-400 ml-2">
                  (Χρησιμοποιήστε {"{name}"} για προσωποποίηση)
                </span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-charcoal border-steel text-white resize-none"
                rows={5}
                placeholder="Περιεχόμενο μηνύματος..."
              />
              <p className="text-xs text-gray-400 mt-1">
                {message.length} χαρακτήρες
              </p>
              <p className="text-xs text-amber-200/90 mt-2 border border-amber-700/50 rounded-md p-2 bg-amber-950/20">
                Αποστέλλεται και <strong>email</strong> με το ίδιο θέμα/κείμενο (όπως στις επιβεβαιώσεις) σε όσους έχουν πραγματικό email. Οι πελάτες walk-in χωρίς email λαμβάνουν μόνο ειδοποίηση στην εφαρμογή.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                sendMessageMutation.isPending ||
                !title.trim() ||
                !message.trim() ||
                (audience === "selected" && (loadingRecipients || selectedUserIds.length === 0))
              }
              className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποστολή...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Αποστολή Μηνύματος
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="space-y-4">
              <div className="bg-charcoal/50 p-4 rounded-lg border border-steel">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-whiskey" />
                  <span className="text-whiskey font-medium">
                    {selectedAudience?.label} (
                    {audience === "selected"
                      ? selectedUserIds.length
                      : selectedAudience?.count ?? 0}{" "}
                    χρήστες)
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-whiskey/20 to-charcoal/50 p-6 rounded-lg border border-whiskey/30">
                <div className="flex items-start gap-3">
                  <div className="bg-whiskey/20 p-2 rounded-full">
                    <Sparkles className="w-5 h-5 text-whiskey" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">
                      {title || "Τίτλος μηνύματος"}
                    </h3>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {previewMessage || "Περιεχόμενο μηνύματος..."}
                    </p>
                    <div className="mt-4 pt-4 border-t border-steel/50">
                      <p className="text-xs text-gray-400">
                        📱 Αυτό το μήνυμα θα σταλεί ως push notification και θα εμφανιστεί στην εφαρμογή
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}




