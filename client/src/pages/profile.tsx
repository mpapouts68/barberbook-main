import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Save, Lock, Bell, User, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/language-context";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const text = {
    success: isEnglish ? "Success" : "Επιτυχία",
    error: isEnglish ? "Error" : "Σφάλμα",
    profileUpdated: isEnglish ? "Your profile was updated successfully." : "Το προφίλ σας ενημερώθηκε επιτυχώς.",
    profileUpdateFailed: isEnglish ? "Failed to update profile" : "Αποτυχία ενημέρωσης προφίλ",
    passwordUpdated: isEnglish ? "Your password was updated successfully." : "Ο κωδικός πρόσβασης ενημερώθηκε επιτυχώς.",
    passwordUpdateFailed: isEnglish ? "Failed to update password" : "Αποτυχία ενημέρωσης κωδικού",
    notificationsUpdated: isEnglish ? "Notification preferences updated." : "Οι προτιμήσεις ειδοποιήσεων ενημερώθηκαν.",
    passwordsMismatch: isEnglish ? "Passwords do not match" : "Οι κωδικοί δεν ταιριάζουν",
    passwordTooShort: isEnglish ? "Password must be at least 8 characters" : "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες",
    fileTooLarge: isEnglish ? "File is too large (maximum 5MB)" : "Το αρχείο είναι πολύ μεγάλο (μέγιστο 5MB)",
    avatarUploadFailed: isEnglish ? "Failed to upload photo" : "Αποτυχία ανέβασματος φωτογραφίας",
    mustBeLoggedIn: isEnglish ? "You must be signed in" : "Πρέπει να είστε συνδεδεμένοι",
    signIn: isEnglish ? "Sign In" : "Σύνδεση",
    loading: isEnglish ? "Loading..." : "Φόρτωση...",
    title: isEnglish ? "Profile" : "Προφίλ",
    back: isEnglish ? "Back" : "Πίσω",
    profileTab: isEnglish ? "Profile" : "Προφίλ",
    passwordTab: isEnglish ? "Password" : "Κωδικός",
    notificationsTab: isEnglish ? "Notifications" : "Ειδοποιήσεις",
    favoritesTab: isEnglish ? "Favorites" : "Αγαπημένοι",
    personalInfo: isEnglish ? "Personal Information" : "Προσωπικά Στοιχεία",
    changePhoto: isEnglish ? "Change Photo" : "Αλλαγή Φωτογραφίας",
    firstName: isEnglish ? "First name" : "Όνομα",
    lastName: isEnglish ? "Last name" : "Επώνυμο",
    emailCannotChange: isEnglish ? "Email cannot be changed" : "Το email δεν μπορεί να αλλάξει",
    phone: isEnglish ? "Phone" : "Τηλέφωνο",
    phonePlaceholder: isEnglish ? "e.g. 6941234567" : "π.χ. 6941234567",
    birthday: isEnglish ? "Birthday" : "Ημερομηνία Γέννησης",
    birthdayFormat: isEnglish ? "Format: DD-MM-YYYY" : "Μορφή: DD-MM-YYYY",
    saving: isEnglish ? "Saving..." : "Αποθήκευση...",
    save: isEnglish ? "Save" : "Αποθήκευση",
    changePassword: isEnglish ? "Change Password" : "Αλλαγή Κωδικού",
    currentPassword: isEnglish ? "Current password" : "Τρέχων Κωδικός",
    newPassword: isEnglish ? "New password" : "Νέος Κωδικός",
    minEight: isEnglish ? "Minimum 8 characters" : "Ελάχιστο 8 χαρακτήρες",
    confirmPassword: isEnglish ? "Confirm password" : "Επιβεβαίωση Κωδικού",
    changing: isEnglish ? "Changing..." : "Αλλαγή...",
    changePasswordButton: isEnglish ? "Change Password" : "Αλλαγή Κωδικού",
    notificationPreferences: isEnglish ? "Notification Preferences" : "Προτιμήσεις Ειδοποιήσεων",
    emailNotifications: isEnglish ? "Email Notifications" : "Email Ειδοποιήσεις",
    emailNotificationsDesc: isEnglish ? "Receive notifications by email" : "Λάβετε ειδοποιήσεις μέσω email",
    pushNotifications: isEnglish ? "Push Notifications" : "Push Ειδοποιήσεις",
    pushNotificationsDesc: isEnglish ? "On-screen notifications" : "Ειδοποιήσεις στην οθόνη",
    smsNotifications: isEnglish ? "SMS Notifications" : "SMS Ειδοποιήσεις",
    smsNotificationsDesc: isEnglish
      ? "SMS notifications (currently disabled)"
      : "Ειδοποιήσεις μέσω SMS (προς το παρόν απενεργοποιημένες)",
    appointmentReminders: isEnglish ? "Appointment Reminders" : "Υπενθυμίσεις Ραντεβού",
    hours24Before: isEnglish ? "24 Hours Before" : "24 Ώρες Πριν",
    hours24BeforeDesc: isEnglish ? "Reminder 24 hours before your appointment" : "Υπενθύμιση 24 ώρες πριν το ραντεβού",
    hours2Before: isEnglish ? "2 Hours Before" : "2 Ώρες Πριν",
    hours2BeforeDesc: isEnglish ? "Reminder 2 hours before your appointment" : "Υπενθύμιση 2 ώρες πριν το ραντεβού",
  };

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: "",
    birthday: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    sms: false,
    reminder24h: true,
    reminder2h: true,
  });

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!user,
  });

  // Load profile data when fetched
  useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        avatar: profile.avatar || "",
        birthday: profile.birthday || "",
      });
      
      if (profile.notificationPreferences) {
        const prefs = typeof profile.notificationPreferences === 'string' 
          ? JSON.parse(profile.notificationPreferences)
          : profile.notificationPreferences;
        setNotificationPrefs({
          email: prefs.email !== false,
          push: prefs.push !== false,
          sms: prefs.sms === true,
          reminder24h: prefs.reminder24h !== false,
          reminder2h: prefs.reminder2h !== false,
        });
      }
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: text.success,
        description: text.profileUpdated,
      });
    },
    onError: (error: any) => {
      toast({
        title: text.error,
        description: error.message || text.profileUpdateFailed,
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update password");
      }
      return response.json();
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: text.success,
        description: text.passwordUpdated,
      });
    },
    onError: (error: any) => {
      toast({
        title: text.error,
        description: error.message || text.passwordUpdateFailed,
        variant: "destructive",
      });
    },
  });

  // Update notification preferences mutation
  const updateNotificationPrefsMutation = useMutation({
    mutationFn: async (prefs: typeof notificationPrefs) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationPreferences: prefs }),
      });
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: text.success,
        description: text.notificationsUpdated,
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: text.error,
        description: text.passwordsMismatch,
        variant: "destructive",
      });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast({
        title: text.error,
        description: text.passwordTooShort,
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: text.error,
        description: text.fileTooLarge,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }
      
      setProfileData({ ...profileData, avatar: data.url });
      updateProfileMutation.mutate({ ...profileData, avatar: data.url });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: text.error,
        description: error.message || text.avatarUploadFailed,
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <Card className="metal-gradient border-steel max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-white mb-4">{text.mustBeLoggedIn}</p>
            <Button onClick={() => setLocation("/login")} className="whiskey-gradient">
              {text.signIn}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <p className="text-white">{text.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-whiskey">{text.title}</h1>
          <Link href="/dashboard">
            <Button variant="outline" className="bg-steel hover:bg-iron text-white border-steel">
              {text.back}
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-slate border-steel">
            <TabsTrigger value="profile" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">
              <User className="w-4 h-4 mr-2" />
              {text.profileTab}
            </TabsTrigger>
            <TabsTrigger value="password" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">
              <Lock className="w-4 h-4 mr-2" />
              {text.passwordTab}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">
              <Bell className="w-4 h-4 mr-2" />
              {text.notificationsTab}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">
              <Heart className="w-4 h-4 mr-2" />
              {text.favoritesTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey">{text.personalInfo}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="w-24 h-24 border-4 border-steel">
                      <AvatarImage src={profileData.avatar} alt={profileData.firstName} />
                      <AvatarFallback className="whiskey-gradient text-black text-2xl">
                        {profileData.firstName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Label
                        htmlFor="avatar-upload"
                        className="cursor-pointer bg-steel hover:bg-iron text-white px-4 py-2 rounded border border-steel inline-flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {text.changePhoto}
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-whiskey">{text.firstName}</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="bg-slate border-steel text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-whiskey">{text.lastName}</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="bg-slate border-steel text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-whiskey">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-slate/50 border-steel text-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">{text.emailCannotChange}</p>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-whiskey">{text.phone}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="bg-slate border-steel text-white"
                      placeholder={text.phonePlaceholder}
                    />
                  </div>

                  <div>
                    <Label htmlFor="birthday" className="text-whiskey">{text.birthday}</Label>
                    <Input
                      id="birthday"
                      type="text"
                      value={profileData.birthday}
                      onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                      className="bg-slate border-steel text-white"
                      placeholder="DD-MM-YYYY"
                      pattern="\d{2}-\d{2}-\d{4}"
                    />
                    <p className="text-xs text-gray-400 mt-1">{text.birthdayFormat}</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="whiskey-gradient hover:opacity-90 text-black font-semibold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? text.saving : text.save}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey">{text.changePassword}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword" className="text-whiskey">{text.currentPassword}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="bg-slate border-steel text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword" className="text-whiskey">{text.newPassword}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="bg-slate border-steel text-white"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-400 mt-1">{text.minEight}</p>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-whiskey">{text.confirmPassword}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="bg-slate border-steel text-white"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="whiskey-gradient hover:opacity-90 text-black font-semibold"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    {updatePasswordMutation.isPending ? text.changing : text.changePasswordButton}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey">{text.notificationPreferences}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">{text.emailNotifications}</Label>
                      <p className="text-sm text-gray-400">{text.emailNotificationsDesc}</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.email}
                      onCheckedChange={(checked) => {
                        const updated = { ...notificationPrefs, email: checked };
                        setNotificationPrefs(updated);
                        updateNotificationPrefsMutation.mutate(updated);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">{text.pushNotifications}</Label>
                      <p className="text-sm text-gray-400">{text.pushNotificationsDesc}</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.push}
                      onCheckedChange={(checked) => {
                        const updated = { ...notificationPrefs, push: checked };
                        setNotificationPrefs(updated);
                        updateNotificationPrefsMutation.mutate(updated);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">{text.smsNotifications}</Label>
                      <p className="text-sm text-gray-400">{text.smsNotificationsDesc}</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.sms}
                      onCheckedChange={(checked) => {
                        const updated = { ...notificationPrefs, sms: checked };
                        setNotificationPrefs(updated);
                        updateNotificationPrefsMutation.mutate(updated);
                      }}
                      disabled
                    />
                  </div>

                  <div className="border-t border-steel pt-4 mt-4">
                    <h3 className="text-whiskey font-semibold mb-4">{text.appointmentReminders}</h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-white">{text.hours24Before}</Label>
                        <p className="text-sm text-gray-400">{text.hours24BeforeDesc}</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.reminder24h}
                        onCheckedChange={(checked) => {
                          const updated = { ...notificationPrefs, reminder24h: checked };
                          setNotificationPrefs(updated);
                          updateNotificationPrefsMutation.mutate(updated);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">{text.hours2Before}</Label>
                        <p className="text-sm text-gray-400">{text.hours2BeforeDesc}</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.reminder2h}
                        onCheckedChange={(checked) => {
                          const updated = { ...notificationPrefs, reminder2h: checked };
                          setNotificationPrefs(updated);
                          updateNotificationPrefsMutation.mutate(updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites">
            <FavoriteBarbersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Favorite Barbers Component
function FavoriteBarbersTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const text = {
    loading: isEnglish ? "Loading..." : "Φόρτωση...",
    favorites: isEnglish ? "Favorite Barbers" : "Αγαπημένοι Κομμωτές",
    empty: isEnglish ? "You haven't selected any favorite barbers yet." : "Δεν έχετε επιλέξει αγαπημένους κομμωτές ακόμα.",
    book: isEnglish ? "Book" : "Κλείσιμο",
    allBarbers: isEnglish ? "All Barbers" : "Όλοι οι Κομμωτές",
  };

  const { data: favoriteBarbers = [], isLoading } = useQuery({
    queryKey: ["/api/favorites/barbers"],
    queryFn: async () => {
      const response = await fetch("/api/favorites/barbers", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  const favoriteIds = favoriteBarbers.map((emp: any) => emp.id);
  const availableBarbers = allEmployees.filter((emp: any) => emp.isActive && !favoriteIds.includes(emp.id));

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ employeeId, isFavorite }: { employeeId: string; isFavorite: boolean }) => {
      const url = isFavorite 
        ? `/api/favorites/barbers/${employeeId}`
        : `/api/favorites/barbers/${employeeId}`;
      const method = isFavorite ? "DELETE" : "POST";
      
      const response = await fetch(url, {
        method,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update favorite");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/barbers"] });
    },
  });

  const handleQuickBook = (employeeId: string) => {
    setLocation(`/booking?employee=${employeeId}`);
  };

  if (isLoading) {
    return (
      <Card className="metal-gradient border-steel">
        <CardContent className="p-6">
          <p className="text-gray-400">{text.loading}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Favorite Barbers */}
      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="text-whiskey flex items-center gap-2">
            <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            {text.favorites}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteBarbers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              {text.empty}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteBarbers.map((employee: any) => (
                <Card key={employee.id} className="bg-slate/20 border-steel">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-whiskey/20">
                          {employee.avatar ? (
                            <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-whiskey font-bold">
                              {employee.name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{employee.name}</h3>
                          <p className="text-gray-400 text-sm">
                            {Array.isArray(employee.specialties) 
                              ? employee.specialties.join(", ")
                              : JSON.parse(employee.specialties || "[]").join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-steel hover:bg-iron text-white border-steel"
                          onClick={() => handleQuickBook(employee.id)}
                        >
                          {text.book}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                          onClick={() => toggleFavoriteMutation.mutate({ employeeId: employee.id, isFavorite: true })}
                        >
                          <Heart className="w-4 h-4 fill-white" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Barbers */}
      {availableBarbers.length > 0 && (
        <Card className="metal-gradient border-steel">
          <CardHeader>
            <CardTitle className="text-whiskey">{text.allBarbers}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableBarbers.map((employee: any) => (
                <Card key={employee.id} className="bg-slate/20 border-steel">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-whiskey/20">
                          {employee.avatar ? (
                            <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-whiskey font-bold">
                              {employee.name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{employee.name}</h3>
                          <p className="text-gray-400 text-sm">
                            {Array.isArray(employee.specialties) 
                              ? employee.specialties.join(", ")
                              : JSON.parse(employee.specialties || "[]").join(", ")}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-steel hover:bg-iron text-white border-steel"
                        onClick={() => toggleFavoriteMutation.mutate({ employeeId: employee.id, isFavorite: false })}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

