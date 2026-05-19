import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Calendar, Settings, HelpCircle, TestTube, Eye, EyeOff } from "lucide-react";
import { GoogleCalendarSetupGuide } from "@/components/GoogleCalendarSetupGuide";
import type { GoogleCalendarConfig } from "@shared/schema";

export function GoogleCalendarSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [configForm, setConfigForm] = useState({
    serviceAccountEmail: "",
    serviceAccountKey: "",
    projectId: "",
    isEnabled: false,
    timeZone: "Europe/Athens",
    defaultEventDuration: 30,
    appointmentPrefix: "Ραντεβού κουρείου"
  });
  
  const [testCalendarId, setTestCalendarId] = useState("");
  const [showServiceAccountKey, setShowServiceAccountKey] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  // Fetch current Google Calendar configuration
  const { data: config, isLoading } = useQuery<GoogleCalendarConfig & { isConfigured: boolean }>({
    queryKey: ["/api/admin/google-calendar-config"]
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/google-calendar-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update configuration");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Η διαμόρφωση Google Calendar ενημερώθηκε επιτυχώς!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-calendar-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία ενημέρωσης διαμόρφωσης",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (calendarId: string) => {
      const response = await fetch("/api/admin/google-calendar-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });
      if (!response.ok) {
        let message = "Connection test failed";
        try {
          const error = await response.json();
          message = error.message || error.error || message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Επιτυχής σύνδεση",
        description: data.calendarTitle
          ? `«${data.calendarTitle}»: ${data.eventsFound ?? 0} συμβάντα (επόμενες 7 μέρες)`
          : `Βρέθηκαν ${data.eventsFound ?? 0} συμβάντα στο ημερολόγιο`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Αποτυχία σύνδεσης",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/google-calendar-config", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete configuration");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Η διαμόρφωση Google Calendar διαγράφηκε επιτυχώς!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/google-calendar-config"] });
      setConfigForm({
        serviceAccountEmail: "",
        serviceAccountKey: "",
        projectId: "",
        isEnabled: false,
        timeZone: "Europe/Athens",
        defaultEventDuration: 30,
        appointmentPrefix: "Ραντεβού κουρείου"
      });
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία διαγραφής διαμόρφωσης",
        variant: "destructive",
      });
    },
  });

  // Load existing configuration
  useEffect(() => {
    if (config && config.isConfigured) {
      setConfigForm({
        serviceAccountEmail: config.serviceAccountEmail || "",
        serviceAccountKey: config.serviceAccountKey === "[HIDDEN]" ? "" : config.serviceAccountKey || "",
        projectId: config.projectId || "",
        isEnabled: config.isEnabled || false,
        timeZone: config.timeZone || "Europe/Athens",
        defaultEventDuration: config.defaultEventDuration || 30,
        appointmentPrefix: config.appointmentPrefix || "Ραντεβού κουρείου"
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...configForm };
    if (config?.isConfigured && !payload.serviceAccountKey.trim()) {
      delete (payload as { serviceAccountKey?: string }).serviceAccountKey;
    }
    updateConfigMutation.mutate(payload);
  };

  const handleTestConnection = () => {
    if (!testCalendarId.trim()) {
      toast({
        title: "Σφάλμα",
        description: "Παρακαλώ εισάγετε ένα Calendar ID για δοκιμή",
        variant: "destructive",
      });
      return;
    }
    testConnectionMutation.mutate(testCalendarId);
  };

  if (isLoading) {
    return <div>Φόρτωση διαμόρφωσης...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Διαμόρφωση Google Calendar</CardTitle>
          {config?.isConfigured && (
            <Badge variant={config.isEnabled ? "default" : "secondary"}>
              {config.isEnabled ? "Ενεργό" : "Ανενεργό"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Βοήθεια
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Οδηγός Εγκατάστασης Google Calendar</DialogTitle>
                <DialogDescription>
                  Ακολουθήστε αυτά τα βήματα για να συνδέσετε το Google Calendar με την εφαρμογή σας
                </DialogDescription>
              </DialogHeader>
              <GoogleCalendarSetupGuide />
            </DialogContent>
          </Dialog>
          
          {config?.isConfigured && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => deleteConfigMutation.mutate()}
              disabled={deleteConfigMutation.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Διαγραφή
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceAccountEmail">Service Account Email</Label>
              <Input
                id="serviceAccountEmail"
                type="email"
                placeholder="barbershop-calendar@project.iam.gserviceaccount.com"
                value={configForm.serviceAccountEmail}
                onChange={(e) => setConfigForm({ ...configForm, serviceAccountEmail: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                placeholder="my-barbershop-project"
                value={configForm.projectId}
                onChange={(e) => setConfigForm({ ...configForm, projectId: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="serviceAccountKey">Service Account Key (JSON)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowServiceAccountKey(!showServiceAccountKey)}
              >
                {showServiceAccountKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Textarea
              id="serviceAccountKey"
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={configForm.serviceAccountKey}
              onChange={(e) => setConfigForm({ ...configForm, serviceAccountKey: e.target.value })}
              className="font-mono text-xs"
              rows={4}
              required={!config?.isConfigured}
            />
            <p className="text-xs text-gray-500">
              {config?.isConfigured
                ? "Αφήστε κενό για να κρατήσετε το υπάρχον κλειδί, ή επικολλήστε νέο JSON για αλλαγή."
                : "Αντιγράψτε όλο το περιεχόμενο του JSON αρχείου από το Google Cloud Console"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeZone">Ζώνη Ώρας</Label>
              <Input
                id="timeZone"
                value={configForm.timeZone}
                onChange={(e) => setConfigForm({ ...configForm, timeZone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultEventDuration">Διάρκεια Ραντεβού (λεπτά)</Label>
              <Input
                id="defaultEventDuration"
                type="number"
                min="15"
                max="240"
                value={configForm.defaultEventDuration}
                onChange={(e) => setConfigForm({ ...configForm, defaultEventDuration: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentPrefix">Πρόθεμα Ραντεβού</Label>
              <Input
                id="appointmentPrefix"
                value={configForm.appointmentPrefix}
                onChange={(e) => setConfigForm({ ...configForm, appointmentPrefix: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isEnabled"
              checked={configForm.isEnabled}
              onCheckedChange={(checked) => setConfigForm({ ...configForm, isEnabled: checked })}
            />
            <Label htmlFor="isEnabled">Ενεργοποίηση Google Calendar Integration</Label>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              type="submit" 
              disabled={updateConfigMutation.isPending}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {updateConfigMutation.isPending ? "Αποθήκευση..." : "Αποθήκευση Διαμόρφωσης"}
            </Button>

            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={!config?.isConfigured}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Δοκιμή Σύνδεσης
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Δοκιμή Google Calendar Σύνδεσης</DialogTitle>
                  <DialogDescription>
                    Εισάγετε ένα Calendar ID για να δοκιμάσετε τη σύνδεση
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testCalendarId">Calendar ID</Label>
                    <Input
                      id="testCalendarId"
                      placeholder="john.doe@gmail.com ή abc123@group.calendar.google.com"
                      value={testCalendarId}
                      onChange={(e) => setTestCalendarId(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Βρίσκεται στα Calendar Settings, στην ενότητα "Integrate calendar"
                    </p>
                  </div>
                  <Button 
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                    className="w-full"
                  >
                    {testConnectionMutation.isPending ? "Δοκιμή σε εξέλιξη..." : "Δοκιμή Σύνδεσης"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </form>

        {config?.isConfigured && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Google Calendar διαμορφωμένο {config.isEnabled ? "και ενεργό" : "αλλά ανενεργό"}
              </span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Project: {config.projectId} | Service Account: {config.serviceAccountEmail}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}