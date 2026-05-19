import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { Calendar, Clock, User, MessageSquare, Users, Zap, Settings, TrendingUp, CheckCircle, AlertCircle, Building, Plus, Edit, Trash2, Upload, Shield, ArrowLeft, AlertTriangle, MailCheck, Phone } from "lucide-react";
import type { Appointment, PushMessage, Employee, CompanyInfo } from "@shared/schema";
import { WorkingHoursManager } from "@/components/WorkingHoursManager";
import { EmployeeWorkingHoursEditor, parseEmployeeWorkingHours, type EmployeeWorkingHoursConfig } from "@/components/EmployeeWorkingHoursEditor";
import { GoogleCalendarSetup } from "@/components/GoogleCalendarSetup";
import { OAuthSettings } from "@/components/OAuthSettings";
import { AppointmentCalendar } from "@/components/AppointmentCalendar";
import { MessageComposer } from "@/components/admin/MessageComposer";
import { MessageHistory } from "@/components/admin/MessageHistory";

// Users Management Component
function UsersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | "real_email" | "walk_in">("all");
  const [nameSort, setNameSort] = useState<"name_asc" | "name_desc">("name_asc");
  const limit = 10;

  // Fetch users with pagination
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/admin/users", page, search, clientFilter, nameSort],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        filter: clientFilter,
        sort: nameSort,
      });
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const response = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to change role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Ο ρόλος χρήστη ενημερώθηκε επιτυχώς" });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία αλλαγής ρόλου",
        variant: "destructive",
      });
    },
  });

  // Suspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}/suspend`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to suspend user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Ο χρήστης ανασταλλήκε επιτυχώς" });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία αναστολής χρήστη",
        variant: "destructive",
      });
    },
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to activate user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Ο χρήστης ενεργοποιήθηκε επιτυχώς" });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία ενεργοποίησης χρήστη",
        variant: "destructive",
      });
    },
  });

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}/verify-email`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify email");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ 
        title: "Επιτυχία", 
        description: "Το email του χρήστη επιβεβαιώθηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία επιβεβαίωσης email",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
      toast({ 
        title: "Επιτυχία", 
        description: "Ο χρήστης διαγράφηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία διαγραφής χρήστη",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center text-gray-400">Φόρτωση χρηστών...</div>;
  }

  const users = usersData?.users || [];
  const totalPages = usersData?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <h2 className="text-2xl font-bold text-whiskey">Διαχείριση Χρηστών / Πελατών</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Όνομα, email, τηλέφωνο..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-full md:w-56 bg-charcoal border-steel text-white"
          />
          <Select
            value={clientFilter}
            onValueChange={(v) => {
              setPage(1);
              setClientFilter(v as "all" | "real_email" | "walk_in");
            }}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-charcoal border-steel text-white">
              <SelectValue placeholder="Φίλτρο" />
            </SelectTrigger>
            <SelectContent className="bg-charcoal border-steel">
              <SelectItem value="all" className="text-white">Όλοι οι πελάτες</SelectItem>
              <SelectItem value="real_email" className="text-white">Με πραγματικό email</SelectItem>
              <SelectItem value="walk_in" className="text-white">Walk-in (χωρίς email)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={nameSort}
            onValueChange={(v) => {
              setPage(1);
              setNameSort(v as "name_asc" | "name_desc");
            }}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-charcoal border-steel text-white">
              <SelectValue placeholder="Ταξινόμηση" />
            </SelectTrigger>
            <SelectContent className="bg-charcoal border-steel">
              <SelectItem value="name_asc" className="text-white">Αλφαβητικά (Α→Ω)</SelectItem>
              <SelectItem value="name_desc" className="text-white">Αλφαβητικά (Ω→Α)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="metal-gradient border-steel">
        <CardContent className="p-6">
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Δεν βρέθηκαν χρήστες
              </div>
            ) : (
              users.map((user: any) => (
                <div
                  key={user.id}
                  className="bg-slate/20 p-4 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-semibold">
                        {user.firstName} {user.lastName || ""}
                      </h3>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={
                          user.role === "admin"
                            ? "bg-whiskey text-black"
                            : "bg-gray-600"
                        }
                      >
                        {user.role === "admin" ? "ADMIN" : "CUSTOMER"}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="destructive">ΑΝΑΣΤΑΛΜΕΝΟΣ</Badge>
                      )}
                      {!user.emailVerified && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                          ΔΕΝ ΕΠΙΒΕΒΑΙΩΘΗΚΕ
                        </Badge>
                      )}
                      {user.email?.endsWith("@no-email.local") && (
                        <Badge variant="outline" className="text-amber-400 border-amber-400">
                          Walk-in
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {user.email?.endsWith("@no-email.local") ? "— (χωρίς email)" : user.email}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {user.oauthProvider
                        ? `OAuth: ${user.oauthProvider}`
                        : "Email/Password"}
                      {user.lastLoginAt &&
                        ` • Τελευταία σύνδεση: ${new Date(
                          user.lastLoginAt
                        ).toLocaleDateString("el-GR")}`}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!user.emailVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyEmailMutation.mutate(user.id)}
                        disabled={verifyEmailMutation.isPending}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
                        title="Επιβεβαίωση Email"
                      >
                        <MailCheck className="w-4 h-4 mr-1" />
                        {verifyEmailMutation.isPending ? "Επιβεβαίωση..." : "Επιβεβαίωση Email"}
                      </Button>
                    )}

                    {user.role === "customer" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          changeRoleMutation.mutate({ id: user.id, role: "admin" })
                        }
                        disabled={changeRoleMutation.isPending}
                        className="bg-whiskey hover:bg-whiskey/80 text-black"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Προαγωγή σε Admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          changeRoleMutation.mutate({ id: user.id, role: "customer" })
                        }
                        disabled={changeRoleMutation.isPending}
                        className="bg-steel hover:bg-iron text-white border-steel"
                      >
                        Υποβιβασμός
                      </Button>
                    )}

                    {user.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => suspendUserMutation.mutate(user.id)}
                        disabled={suspendUserMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                      >
                        Αναστολή
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateUserMutation.mutate(user.id)}
                        disabled={activateUserMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                      >
                        Ενεργοποίηση
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUserToDelete(user.id)}
                      disabled={deleteUserMutation.isPending}
                      className="bg-red-800 hover:bg-red-900 text-white border-red-800"
                      title="Διαγραφή χρήστη"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <DialogContent className="metal-gradient border-steel">
              <DialogHeader>
                <DialogTitle className="text-whiskey flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Επιβεβαίωση Διαγραφής
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                  {userToDelete && (() => {
                    const user = users.find((u: any) => u.id === userToDelete);
                    return user ? (
                      <>
                        Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη{" "}
                        <strong className="text-white">
                          {user.firstName} {user.lastName || ""} ({user.email})
                        </strong>
                        ?
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded">
                          <p className="text-sm text-red-300">
                            <strong>Προσοχή:</strong> Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                          </p>
                          <ul className="text-sm text-red-200 mt-2 list-disc list-inside">
                            <li>Όλα τα ραντεβού του χρήστη θα ακυρωθούν</li>
                            <li>Όλες οι ειδοποιήσεις θα διαγραφούν</li>
                            <li>Όλα τα FCM tokens θα διαγραφούν</li>
                            {!user.emailVerified && (
                              <li className="text-yellow-300">
                                ⚠️ Αυτός ο χρήστης δεν έχει επιβεβαιώσει το email του
                              </li>
                            )}
                          </ul>
                        </div>
                      </>
                    ) : null;
                  })()}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUserToDelete(null)}
                  className="bg-steel hover:bg-iron text-white border-steel"
                >
                  Ακύρωση
                </Button>
                <Button
                  onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete)}
                  disabled={deleteUserMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {deleteUserMutation.isPending ? "Διαγραφή..." : "Διαγραφή"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="bg-steel text-white border-steel"
              >
                Προηγούμενη
              </Button>
              <span className="text-white px-4">
                Σελίδα {page} από {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="bg-steel text-white border-steel"
              >
                Επόμενη
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Services Management Component
function ServicesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: 0,
    duration: 30,
    displayOrder: 0,
    isActive: true
  });
  
  const [editingService, setEditingService] = useState<any>(null);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);

  // Fetch services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Η υπηρεσία δημιουργήθηκε επιτυχώς" });
      setIsServiceDialogOpen(false);
      setServiceForm({ name: "", description: "", price: 0, duration: 30, displayOrder: 0, isActive: true });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Η υπηρεσία ενημερώθηκε επιτυχώς" });
      setIsServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm({ name: "", description: "", price: 0, duration: 30, displayOrder: 0, isActive: true });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete service");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Η υπηρεσία διαγράφηκε επιτυχώς" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: serviceForm });
    } else {
      createServiceMutation.mutate(serviceForm);
    }
  };

  const openEditService = (service: any) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || "",
      price: service.price,
      duration: service.duration,
      displayOrder: service.displayOrder,
      isActive: service.isActive
    });
    setIsServiceDialogOpen(true);
  };

  const openCreateService = () => {
    setEditingService(null);
    setServiceForm({ name: "", description: "", price: 0, duration: 30, displayOrder: 0, isActive: true });
    setIsServiceDialogOpen(true);
  };

  if (isLoading) return <div>Loading services...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-whiskey">Services Management</h2>
        <Button onClick={openCreateService} className="whiskey-gradient text-black">
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service: any) => (
          <Card key={service.id} className="metal-gradient border-steel">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-whiskey">{service.name}</h3>
                  <p className="text-gray-400 text-sm">{service.description}</p>
                </div>
                <Badge variant={service.isActive ? "default" : "secondary"}>
                  {service.isActive ? "Ενεργό" : "Ανενεργό"}
                </Badge>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-whiskey font-semibold">${service.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white">{service.duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order:</span>
                  <span className="text-white">{service.displayOrder}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditService(service)}
                  className="flex-1 bg-steel hover:bg-iron text-white border-steel"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteServiceMutation.mutate(service.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="bg-charcoal border-steel">
          <DialogHeader>
            <DialogTitle className="text-whiskey">
              {editingService ? "Επεξεργασία Υπηρεσίας" : "Δημιουργία Υπηρεσίας"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingService ? "Ενημερώστε τα στοιχεία της υπηρεσίας παρακάτω." : "Προσθέστε μια νέα υπηρεσία στις προσφορές του κουρείου σας."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Service Name</Label>
              <Input
                id="name"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                className="bg-steel border-steel text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                className="bg-steel border-steel text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-white">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                  className="bg-steel border-steel text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="duration" className="text-white">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) })}
                  className="bg-steel border-steel text-white"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="displayOrder" className="text-white">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={serviceForm.displayOrder}
                onChange={(e) => setServiceForm({ ...serviceForm, displayOrder: parseInt(e.target.value) })}
                className="bg-steel border-steel text-white"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={serviceForm.isActive}
                onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive" className="text-white">Active</Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsServiceDialogOpen(false)}
                className="bg-steel hover:bg-iron text-white border-steel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="whiskey-gradient text-black"
                disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
              >
                {editingService ? "Ενημέρωση" : "Δημιουργία"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const [pushMessage, setPushMessage] = useState({
    title: "",
    message: "",
    audience: "all"
  });

  const [namedayMessage, setNamedayMessage] = useState("");

  const [companyForm, setCompanyForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    logoUrl: ""
  });

  const [employeeForm, setEmployeeForm] = useState<{
    name: string;
    specialties: string[];
    avatar: string | null;
    description: string;
    googleCalendarId: string | null;
    googleCalendarEnabled: boolean;
    autoSyncEnabled: boolean;
    workingHours: EmployeeWorkingHoursConfig;
  }>({
    name: "",
    specialties: [],
    avatar: null,
    description: "",
    googleCalendarId: null,
    googleCalendarEnabled: false,
    autoSyncEnabled: false,
    workingHours: {
      monday: { start: "09:00", end: "18:00" },
      tuesday: { start: "09:00", end: "18:00" },
      wednesday: { start: "09:00", end: "18:00" },
      thursday: { start: "09:00", end: "18:00" },
      friday: { start: "09:00", end: "18:00" },
      saturday: { start: "09:00", end: "15:00" },
      sunday: { start: "closed", end: "closed" },
    },
  });

  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [testingCalendar, setTestingCalendar] = useState<string | null>(null);
  /** When false, only active staff are listed (soft-removed employees are hidden). */
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);

  // Fetch all appointments for admin view
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/all"]
  });

  // Fetch push message history
  const { data: pushHistory = [], isLoading: isLoadingHistory } = useQuery<PushMessage[]>({
    queryKey: ["/api/admin/push-notifications"]
  });

  // Fetch nameday message setting
  const { data: namedaySetting, isLoading: isLoadingNamedayMessage } = useQuery<{ key: string; value: string }>({
    queryKey: ["/api/settings/nameday_message"],
    enabled: true,
  });

  // Fetch employees (admin: all rows including inactive / “removed”)
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/admin/employees"],
    queryFn: async () => {
      const response = await fetch("/api/admin/employees", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  const displayedEmployees = useMemo(() => {
    if (showInactiveEmployees) return employees;
    return employees.filter((e) => e.isActive);
  }, [employees, showInactiveEmployees]);

  // Fetch company info
  const { data: companyInfo, isLoading: isLoadingCompany } = useQuery<CompanyInfo>({
    queryKey: ["/api/company"]
  });

  // Fetch services for specialties dropdown
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
  });

  // Fetch users for total count
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Calculate statistics
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => 
    apt.date === today
  );
  const confirmedToday = todayAppointments.filter(apt => apt.status === 'confirmed').length;
  const pendingToday = todayAppointments.filter(apt => apt.status === 'pending').length;
  const totalUsers = users.length;

  // Send push notification mutation
  const sendPushMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; audience: string }) => {
      const response = await fetch("/api/admin/push-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to send push notification");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Η ειδοποίηση στάλθηκε επιτυχώς!",
      });
      setPushMessage({ title: "", message: "", audience: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/push-notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία αποστολής ειδοποίησης",
        variant: "destructive",
      });
    },
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          specialties: JSON.stringify(data.specialties.filter((s: string) => s.trim() !== "")),
          workingHours: typeof data.workingHours === "string" ? data.workingHours : JSON.stringify(data.workingHours || {}),
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create employee");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Ο υπάλληλος δημιουργήθηκε επιτυχώς!",
      });
      setIsEmployeeDialogOpen(false);
      setEditingEmployee(null);
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      resetEmployeeForm();
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία δημιουργίας υπαλλήλου",
        variant: "destructive",
      });
    },
  });

  // Update company info mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update company info");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Οι πληροφορίες εταιρείας ενημερώθηκαν!",
      });
      setIsCompanyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης πληροφοριών",
        variant: "destructive",
      });
    },
  });

  // Initialize company form when data loads
  useEffect(() => {
    if (companyInfo) {
      setCompanyForm({
        name: companyInfo.name || "",
        description: companyInfo.description || "",
        phone: companyInfo.phone || "",
        email: companyInfo.email || "",
        address: companyInfo.address || "",
        logoUrl: companyInfo.logoUrl || ""
      });
    }
  }, [companyInfo]);

  // Initialize nameday message when data loads
  useEffect(() => {
    if (namedaySetting) {
      setNamedayMessage(namedaySetting.value || "");
    }
  }, [namedaySetting]);

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: { id: string; employee: any }) => {
      const payload = {
        ...data.employee,
        specialties: JSON.stringify(data.employee.specialties.filter((s: string) => s.trim() !== "")),
        workingHours: typeof data.employee.workingHours === "string" ? data.employee.workingHours : JSON.stringify(data.employee.workingHours || {}),
      };
      const response = await fetch(`/api/employees/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update employee: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Ο υπάλληλος ενημερώθηκε επιτυχώς!",
      });
      setIsEmployeeDialogOpen(false);
      setEditingEmployee(null);
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      resetEmployeeForm();
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης υπαλλήλου",
        variant: "destructive",
      });
    },
  });

  // Delete employee mutation (hard delete: employee row + all their appointments + favorites cleanup)
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 404) {
        throw new Error("Ο υπάλληλος δεν βρέθηκε");
      }
      if (!response.ok) throw new Error("Αποτυχία διαγραφής υπαλλήλου");
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description:
          "Ο υπάλληλος διαγράφηκε οριστικά μαζί με όλα τα ραντεβού του. Τα συμβάντα Google Calendar αφαιρέθηκαν όπου ήταν δυνατό.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία διαγραφής υπαλλήλου",
        variant: "destructive",
      });
    },
  });

  // Update nameday message mutation
  const updateNamedayMessageMutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await fetch("/api/settings/nameday_message", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update nameday message");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Το μήνυμα ονομαστικής ενημερώθηκε!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/nameday_message"] });
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία ενημέρωσης μηνύματος",
        variant: "destructive",
      });
    },
  });

  const handleUpdateNamedayMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namedayMessage.trim()) {
      toast({
        title: "Σφάλμα",
        description: "Το μήνυμα δεν μπορεί να είναι κενό",
        variant: "destructive",
      });
      return;
    }
    updateNamedayMessageMutation.mutate(namedayMessage);
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushMessage.title || !pushMessage.message) {
      toast({
        title: "Σφάλμα",
        description: "Παρακαλώ συμπληρώστε όλα τα πεδία",
        variant: "destructive",
      });
      return;
    }
    sendPushMutation.mutate(pushMessage);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name) {
      toast({
        title: "Σφάλμα",
        description: "Το όνομα είναι υποχρεωτικό",
        variant: "destructive",
      });
      return;
    }
    
    if (editingEmployee) {
      // Update existing employee
      updateEmployeeMutation.mutate({
        id: editingEmployee.id,
        employee: employeeForm
      });
    } else {
      // Create new employee
      createEmployeeMutation.mutate(employeeForm);
    }
  };

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(companyForm);
  };

  const removeSpecialty = (index: number) => {
    const newSpecialties = employeeForm.specialties.filter((_, i) => i !== index);
    setEmployeeForm({
      ...employeeForm,
      specialties: newSpecialties
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Σφάλμα",
        description: "Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Σφάλμα",
        description: "Μη υποστηριζόμενος τύπος αρχείου. Επιτρέπονται: JPEG, PNG, GIF, WebP",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        // Don't set Content-Type header - let browser set it with boundary
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      setEmployeeForm({
        ...employeeForm,
        avatar: result.url
      });

      toast({
        title: "Επιτυχία",
        description: "Η φωτογραφία ανέβηκε επιτυχώς!",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία ανεβάσματος φωτογραφίας",
        variant: "destructive",
      });
    }
  };

  // Reset employee form
  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: "",
      specialties: [],
      avatar: null,
      description: "",
      googleCalendarId: null,
      googleCalendarEnabled: false,
      autoSyncEnabled: false,
      workingHours: {
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: { start: "09:00", end: "18:00" },
        saturday: { start: "09:00", end: "15:00" },
        sunday: { start: "closed", end: "closed" },
      },
    });
  };

  // Open edit employee dialog
  const openEditEmployee = (employee: Employee) => {
    console.log("Opening edit dialog for employee:", employee.name);
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      specialties: Array.isArray(employee.specialties) ? employee.specialties : (typeof employee.specialties === 'string' ? JSON.parse(employee.specialties) : [""]),
      avatar: employee.avatar || null,
      description: employee.description || "",
      googleCalendarId: employee.googleCalendarId || null,
      googleCalendarEnabled: employee.googleCalendarEnabled || false,
      autoSyncEnabled: employee.autoSyncEnabled || false,
      workingHours: parseEmployeeWorkingHours((employee as any).workingHours),
    });
    setIsEmployeeDialogOpen(true);
  };

  const testCalendarConnection = async (employeeId: string) => {
    setTestingCalendar(employeeId);
    try {
      const response = await fetch(`/api/employees/${employeeId}/test-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Επιτυχία",
          description: `Σύνδεση Google Calendar επιτυχής! Calendar: ${result.calendar?.summary || 'Άγνωστο'}`,
        });
      } else {
        toast({
          title: "Σφάλμα Σύνδεσης",
          description: result.message || "Η σύνδεση με το Google Calendar απέτυχε",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία δοκιμής σύνδεσης calendar",
        variant: "destructive",
      });
    } finally {
      setTestingCalendar(null);
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-whiskey transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Επιστροφή
            </Button>
          </Link>
        </div>
        <div className="text-center">
          <h1 className="font-oswald text-4xl font-bold text-whiskey mb-2">
            ADMIN DASHBOARD
          </h1>
          <p className="text-gray-400">Διαχείριση συστήματος και εταιρείας</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-charcoal border border-steel">
          <TabsTrigger value="overview" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Χρήστες</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Υπηρεσίες</TabsTrigger>
          <TabsTrigger value="hours" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Ωράριο</TabsTrigger>
          <TabsTrigger value="employees" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Υπάλληλοι</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Google Calendar</TabsTrigger>
          <TabsTrigger value="oauth" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">OAuth</TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Εταιρεία</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Ειδοποιήσεις</TabsTrigger>
          <TabsTrigger value="manual-booking" className="data-[state=active]:bg-whiskey data-[state=active]:text-black">Κράτηση Τηλεφώνου</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Appointments */}
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  ΠΡΟΣΦΑΤΑ ΡΑΝΤΕΒΟΥ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAppointments ? (
                  <p className="text-gray-400">Φόρτωση...</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {appointments.slice(0, 10).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between bg-slate/20 p-3 rounded">
                        <div>
                          <p className="text-white font-medium">{appointment.barber}</p>
                          <p className="text-gray-400 text-sm">{appointment.date} - {appointment.time}</p>
                        </div>
                        <Badge variant={
                          appointment.status === 'confirmed' ? 'default' : 
                          appointment.status === 'completed' ? 'secondary' : 
                          'destructive'
                        }>
                          {appointment.status === 'confirmed' ? 'Επιβεβαιωμένο' :
                           appointment.status === 'completed' ? 'Ολοκληρώθηκε' :
                           appointment.status === 'cancelled' ? 'Ακυρώθηκε' : 'Εκκρεμεί'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  ΓΡΗΓΟΡΕΣ ΕΝΕΡΓΕΙΕΣ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  type="button"
                  className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold"
                  onClick={() => {
                    setEditingEmployee(null);
                    resetEmployeeForm();
                    setIsEmployeeDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Προσθήκη Υπαλλήλου
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full bg-steel hover:bg-iron text-white border-steel"
                  onClick={() => setActiveTab("manual-booking")}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Κράτηση Τηλεφώνου
                </Button>
                <Link href="/tv-display" target="_blank">
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full bg-steel hover:bg-iron text-white border-steel"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    TV Display
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="metal-gradient border-steel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Σημερινά Ραντεβού</CardTitle>
                <Calendar className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{todayAppointments.length}</div>
                <p className="text-xs text-gray-400 mt-1">Συνολικά ραντεβού σήμερα</p>
              </CardContent>
            </Card>

            <Card className="metal-gradient border-steel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Εκκρεμή</CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">{pendingToday}</div>
                <p className="text-xs text-gray-400 mt-1">Αναμονή επιβεβαίωσης</p>
              </CardContent>
            </Card>

            <Card className="metal-gradient border-steel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Επιβεβαιωμένα</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{confirmedToday}</div>
                <p className="text-xs text-gray-400 mt-1">Επιβεβαιωμένα σήμερα</p>
              </CardContent>
            </Card>

            <Card className="metal-gradient border-steel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Σύνολο Χρηστών</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{totalUsers}</div>
                <p className="text-xs text-gray-400 mt-1">Εγγεγραμμένοι χρήστες</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  ΓΡΗΓΟΡΕΣ ΕΝΕΡΓΕΙΕΣ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  type="button"
                  className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold"
                  onClick={() => {
                    setEditingEmployee(null);
                    resetEmployeeForm();
                    setIsEmployeeDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Προσθήκη Υπαλλήλου
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full bg-steel hover:bg-iron text-white border-steel"
                  onClick={() => setActiveTab("manual-booking")}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Κράτηση Τηλεφώνου
                </Button>
                <Link href="/tv-display" target="_blank">
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full bg-steel hover:bg-iron text-white border-steel"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    TV Display
                  </Button>
                </Link>
                <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full bg-steel hover:bg-iron text-white border-steel">
                      <Building className="w-4 h-4 mr-2" />
                      Επεξεργασία Εταιρείας
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-charcoal border-steel text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-whiskey">Επεξεργασία Στοιχείων Εταιρείας</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Ενημερώστε τα στοιχεία της εταιρείας σας.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateCompany} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyName" className="text-whiskey">Όνομα Εταιρείας</Label>
                          <Input
                            id="companyName"
                            value={companyForm.name}
                            onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                            className="bg-slate border-steel text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="companyPhone" className="text-whiskey">Τηλέφωνο</Label>
                          <Input
                            id="companyPhone"
                            value={companyForm.phone}
                            onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                            className="bg-slate border-steel text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyEmail" className="text-whiskey">Email</Label>
                          <Input
                            id="companyEmail"
                            type="email"
                            value={companyForm.email}
                            onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                            className="bg-slate border-steel text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="logoUrl" className="text-whiskey">Logo URL</Label>
                          <Input
                            id="logoUrl"
                            value={companyForm.logoUrl}
                            onChange={(e) => setCompanyForm({...companyForm, logoUrl: e.target.value})}
                            className="bg-slate border-steel text-white"
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="companyAddress" className="text-whiskey">Διεύθυνση</Label>
                        <Input
                          id="companyAddress"
                          value={companyForm.address}
                          onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                          className="bg-slate border-steel text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="companyDescription" className="text-whiskey">Περιγραφή</Label>
                        <Textarea
                          id="companyDescription"
                          value={companyForm.description}
                          onChange={(e) => setCompanyForm({...companyForm, description: e.target.value})}
                          className="bg-slate border-steel text-white resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCompanyDialogOpen(false)}
                          className="flex-1 bg-steel hover:bg-iron text-white border-steel"
                        >
                          Ακύρωση
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateCompanyMutation.isPending}
                          className="flex-1 whiskey-gradient hover:opacity-90 text-black font-semibold"
                        >
                          {updateCompanyMutation.isPending ? "Αποθήκευση..." : "Αποθήκευση"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  className="w-full bg-steel hover:bg-iron text-white border-steel"
                  onClick={() => {
                    toast({
                      title: "Ενημέρωση",
                      description: "Η λειτουργία εισαγωγής δεδομένων θα είναι διαθέσιμη σύντομα!",
                    });
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Εισαγωγή Δεδομένων
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServicesManagement />
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <WorkingHoursManager />
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-2xl font-bold text-whiskey">Διαχείριση Υπαλλήλων</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                <Checkbox
                  id="show-inactive-employees"
                  checked={showInactiveEmployees}
                  onCheckedChange={(v) => setShowInactiveEmployees(v === true)}
                  className="border-steel data-[state=checked]:bg-whiskey data-[state=checked]:text-black"
                />
                <span>Εμφάνιση ανενεργών (αφαιρεθέντων)</span>
              </label>
              <Button 
                className="whiskey-gradient hover:opacity-90 text-black font-semibold shrink-0"
                onClick={() => {
                  setEditingEmployee(null);
                  resetEmployeeForm();
                  setIsEmployeeDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Νέος Υπάλληλος
              </Button>
            </div>
          </div>

          {isLoadingEmployees ? (
            <div className="text-center text-gray-400 py-8">Φόρτωση υπαλλήλων...</div>
          ) : employees.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="mb-4">Δεν υπάρχουν υπάλληλοι.</p>
              <p className="text-sm">Κάντε κλικ στο "Νέος Υπάλληλος" για να προσθέσετε έναν.</p>
            </div>
          ) : displayedEmployees.length === 0 ? (
            <div className="text-center text-gray-400 py-8 space-y-2">
              <p>Δεν εμφανίζονται ενεργοί υπάλληλοι.</p>
              <p className="text-sm">
                Ενεργοποιήστε «Εμφάνιση ανενεργών» αν θέλετε να δείτε προσωπικό που έχει αφαιρεθεί από την ενεργή λίστα.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedEmployees.map((employee) => (
                <Card key={employee.id} className="metal-gradient border-steel">
                  <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden cursor-pointer hover:ring-2 hover:ring-whiskey/50 transition-all group relative"
                      style={{ aspectRatio: '1/1', width: '64px', height: '64px' }}
                      title="Κάντε κλικ για μεγαλύτερη εικόνα"
                      onClick={() => {
                        if (employee.avatar) {
                          // Create modal to show larger image
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
                          modal.innerHTML = `
                            <div class="relative max-w-lg w-full">
                              <div class="w-full h-96 rounded-lg overflow-hidden shadow-2xl">
                                <img 
                                  src="${employee.avatar}" 
                                  alt="${employee.name}" 
                                  class="w-full h-full object-cover object-center"
                                />
                              </div>
                              <button 
                                onclick="this.closest('.fixed').remove()"
                                class="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                              >
                                ×
                              </button>
                              <div class="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-4 rounded-lg">
                                <h3 class="font-semibold text-xl">${employee.name}</h3>
                                <p class="text-sm opacity-90 mt-1">${Array.isArray(employee.specialties) ? employee.specialties.join(", ") : (typeof employee.specialties === 'string' ? JSON.parse(employee.specialties).join(", ") : "")}</p>
                                ${employee.description ? `<p class="text-xs opacity-75 mt-2 italic">"${employee.description}"</p>` : ''}
                                <div class="flex gap-2 mt-2">
                                  <span class="px-2 py-1 bg-whiskey text-black text-xs rounded">${employee.isActive ? "Ενεργός" : "Ανενεργός"}</span>
                                  ${employee.googleCalendarEnabled ? '<span class="px-2 py-1 bg-green-600 text-white text-xs rounded">Google Calendar</span>' : ''}
                                  ${employee.autoSyncEnabled ? '<span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">Auto Sync</span>' : ''}
                                </div>
                              </div>
                            </div>
                          `;
                          document.body.appendChild(modal);
                          modal.addEventListener('click', (e) => {
                            if (e.target === modal) modal.remove();
                          });
                        }
                      }}
                    >
                      {employee.avatar ? (
                        <>
                          <img 
                            src={employee.avatar} 
                            alt={employee.name}
                            className="w-full h-full object-cover object-center"
                            style={{ aspectRatio: '1/1', width: '100%', height: '100%' }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-full flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-whiskey/80 rounded-full p-1.5">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full whiskey-gradient rounded-full flex items-center justify-center">
                      <span className="text-2xl text-black">👨</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-lg">{employee.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {Array.isArray(employee.specialties) ? employee.specialties.join(", ") : (typeof employee.specialties === 'string' ? JSON.parse(employee.specialties).join(", ") : "")}
                    </p>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Badge variant={employee.isActive ? "default" : "secondary"}>
                      {employee.isActive ? "Ενεργός" : "Ανενεργός"}
                    </Badge>
                    {employee.googleCalendarEnabled && (
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Google Calendar
                      </Badge>
                    )}
                    {employee.autoSyncEnabled && (
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        Auto Sync
                      </Badge>
                    )}
                    {employee.lastSyncAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Τελευταίος συγχρονισμός: {new Date(employee.lastSyncAt).toLocaleString('el-GR')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {employee.googleCalendarEnabled && employee.googleCalendarId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                        onClick={() => testCalendarConnection(employee.id)}
                        disabled={testingCalendar === employee.id}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        {testingCalendar === employee.id ? "Δοκιμή..." : "Δοκιμή Calendar"}
                      </Button>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-steel hover:bg-iron text-white border-steel"
                        onClick={() => openEditEmployee(employee)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Επεξεργασία
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Οριστική διαγραφή: θα αφαιρεθεί ο υπάλληλος, όλα τα ραντεβού του από τη βάση και οι συνδέσεις στα αγαπημένα. Δεν αναιρείται. Συνέχεια;"
                            )
                          ) {
                            return;
                          }
                          deleteEmployeeMutation.mutate(employee.id);
                        }}
                        disabled={deleteEmployeeMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="max-w-6xl mx-auto">
            <GoogleCalendarSetup />
          </div>
        </TabsContent>

        <TabsContent value="oauth" className="space-y-6">
          <div className="max-w-6xl mx-auto">
            <OAuthSettings />
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-whiskey">Στοιχεία Εταιρείας</h2>
            <Button 
              className="whiskey-gradient hover:opacity-90 text-black font-semibold"
              onClick={() => setIsCompanyDialogOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Επεξεργασία
            </Button>
          </div>

          <Card className="metal-gradient border-steel">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    {companyInfo?.logoUrl ? (
                      <img 
                        src={companyInfo.logoUrl} 
                        alt="Company Logo" 
                        className="w-32 h-32 object-contain mx-auto rounded-lg bg-slate/20 p-4"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-slate/20 rounded-lg flex items-center justify-center mx-auto">
                        <Building className="w-16 h-16 text-whiskey" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-whiskey font-semibold text-lg">{companyInfo?.name || "PEQI Haircut Studio"}</h3>
                    <p className="text-gray-400">{companyInfo?.description || "Το καλύτερο κουρείο στην πόλη"}</p>
                  </div>
                  
                  {companyInfo?.phone && (
                    <div>
                      <p className="text-whiskey font-medium">Τηλέφωνο:</p>
                      <p className="text-white">{companyInfo.phone}</p>
                    </div>
                  )}
                  
                  {companyInfo?.email && (
                    <div>
                      <p className="text-whiskey font-medium">Email:</p>
                      <p className="text-white">{companyInfo.email}</p>
                    </div>
                  )}
                  
                  {companyInfo?.address && (
                    <div>
                      <p className="text-whiskey font-medium">Διεύθυνση:</p>
                      <p className="text-white">{companyInfo.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual-booking" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <Card className="metal-gradient border-steel">
              <CardHeader>
                <CardTitle className="text-whiskey flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  ΚΡΑΤΗΣΗ ΤΗΛΕΦΩΝΟΥ
                </CardTitle>
                <p className="text-gray-400">
                  Δημιουργήστε ραντεβού για πελάτες που καλούν τηλεφωνικά
                </p>
              </CardHeader>
              <CardContent>
                <ManualAppointmentBooking />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Message Composer - Enhanced */}
            <MessageComposer />

            {/* Message History - Enhanced */}
            <MessageHistory />
          </div>

          {/* Nameday Message Template Editor */}
          <Card className="metal-gradient border-steel mt-8">
            <CardHeader>
              <CardTitle className="text-whiskey flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Μήνυμα Ονομαστικής/Γενεθλίων
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateNamedayMessage} className="space-y-4">
                <div>
                  <Label htmlFor="namedayMessage" className="text-whiskey">
                    Προεπιλεγμένο Μήνυμα
                  </Label>
                  <p className="text-gray-400 text-sm mt-1 mb-3">
                    Χρησιμοποιήστε {"{name}"} για να εισαχθεί το όνομα του χρήστη. Αυτό το μήνυμα αποστέλλεται αυτόματα κάθε μέρα στις 9:00 π.μ. σε χρήστες που γιορτάζουν ονομαστική ή γενέθλια.
                  </p>
                  {isLoadingNamedayMessage ? (
                    <p className="text-gray-400">Φόρτωση...</p>
                  ) : (
                    <>
                      <Textarea
                        id="namedayMessage"
                        value={namedayMessage}
                        onChange={(e) => setNamedayMessage(e.target.value)}
                        className="bg-charcoal border-steel text-white resize-none min-h-[100px]"
                        placeholder="π.χ. Χρόνια Πολλά {name}! Enjoy a 20% discount today!"
                      />
                      <div className="mt-2 p-3 bg-slate/20 rounded border border-steel">
                        <p className="text-gray-400 text-xs mb-1">Προεπισκόπηση:</p>
                        <p className="text-white text-sm">
                          {namedayMessage.replace(/{name}/g, "Γιάννης") || "Εισάγετε μήνυμα..."}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  type="submit"
                  className="whiskey-gradient hover:opacity-90 text-black font-semibold"
                  disabled={updateNamedayMessageMutation.isPending || isLoadingNamedayMessage}
                >
                  {updateNamedayMessageMutation.isPending ? "Αποθήκευση..." : "Αποθήκευση Μηνύματος"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog - Moved outside tabs to be accessible from anywhere */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={(open) => {
        setIsEmployeeDialogOpen(open);
        if (!open) {
          setEditingEmployee(null);
          resetEmployeeForm();
        }
      }}>
        <DialogContent className="bg-charcoal border-steel text-white max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-whiskey">
              {editingEmployee ? "Επεξεργασία Υπαλλήλου" : "Προσθήκη Νέου Υπαλλήλου"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingEmployee ? "Ενημερώστε τα στοιχεία του υπαλλήλου." : "Προσθέστε έναν νέο υπάλληλο στο σύστημα."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[75vh] pr-2">
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <Label htmlFor="employeeName" className="text-whiskey">Όνομα</Label>
                <Input
                  id="employeeName"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                  className="bg-slate border-steel text-white"
                  placeholder="π.χ. Νίκος Παπαδόπουλος"
                />
              </div>

              <div>
                <Label className="text-whiskey">Φωτογραφία Προφίλ</Label>
                <div className="mt-2 space-y-4">
                  {employeeForm.avatar && (
                    <div className="flex items-center space-x-4">
                      <img 
                        src={employeeForm.avatar} 
                        alt="Employee avatar" 
                        className="w-20 h-20 rounded-full object-cover border-2 border-steel"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeeForm({...employeeForm, avatar: null})}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Αφαίρεση
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Label 
                      htmlFor="avatar-upload" 
                      className="cursor-pointer bg-steel hover:bg-iron text-white px-4 py-2 rounded border border-steel inline-block"
                    >
                      <Upload className="w-4 h-4 mr-2 inline" />
                      {employeeForm.avatar ? 'Αλλαγή Φωτογραφίας' : 'Επιλογή Φωτογραφίας'}
                    </Label>
                    <span className="text-gray-400 text-sm">
                      JPEG, PNG, GIF, WebP (μέχρι 5MB)
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-whiskey">Σύντομη Περιγραφή</Label>
                <Textarea
                  value={employeeForm.description}
                  onChange={(e) => setEmployeeForm({...employeeForm, description: e.target.value})}
                  className="bg-slate border-steel text-white mt-2"
                  placeholder="π.χ. Με 10+ χρόνια εμπειρίας, ειδικεύομαι σε παραδοσιακά στυλ και σύγχρονες τάσεις..."
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-whiskey">Ειδικότητες (Υπηρεσίες)</Label>
                <div className="space-y-2 mt-2">
                  {services
                    .filter((service: any) => service.isActive)
                    .map((service: any) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`specialty-${service.id}`}
                          checked={employeeForm.specialties.includes(service.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!employeeForm.specialties.includes(service.name)) {
                                setEmployeeForm({
                                  ...employeeForm,
                                  specialties: [...employeeForm.specialties, service.name]
                                });
                              }
                            } else {
                              setEmployeeForm({
                                ...employeeForm,
                                specialties: employeeForm.specialties.filter(s => s !== service.name)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <Label 
                          htmlFor={`specialty-${service.id}`} 
                          className="text-white cursor-pointer flex-1"
                        >
                          {service.name} - ${service.price} ({service.duration} min)
                        </Label>
                      </div>
                    ))}
                </div>
              </div>

              {/* Google Calendar Configuration */}
              {/* Employee Working Hours */}
              <div className="border-t border-steel pt-4 mt-4">
                <EmployeeWorkingHoursEditor
                  value={employeeForm.workingHours}
                  onChange={(workingHours) => setEmployeeForm({ ...employeeForm, workingHours })}
                />
              </div>

              <div className="border-t border-steel pt-4 mt-4">
                <Label className="text-whiskey text-lg mb-4 block">Google Calendar Ρυθμίσεις</Label>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="googleCalendarEnabled"
                      checked={employeeForm.googleCalendarEnabled}
                      onChange={(e) => setEmployeeForm({
                        ...employeeForm,
                        googleCalendarEnabled: e.target.checked,
                        // If disabling, also disable auto sync
                        autoSyncEnabled: e.target.checked ? employeeForm.autoSyncEnabled : false
                      })}
                      className="rounded"
                    />
                    <Label 
                      htmlFor="googleCalendarEnabled" 
                      className="text-white cursor-pointer"
                    >
                      Ενεργοποίηση Google Calendar
                    </Label>
                  </div>

                  {employeeForm.googleCalendarEnabled && (
                    <>
                      <div>
                        <Label htmlFor="googleCalendarId" className="text-whiskey">
                          Google Calendar ID
                        </Label>
                        <Input
                          id="googleCalendarId"
                          value={employeeForm.googleCalendarId || ""}
                          onChange={(e) => setEmployeeForm({
                            ...employeeForm,
                            googleCalendarId: e.target.value || null
                          })}
                          className="bg-slate border-steel text-white mt-2"
                          placeholder="π.χ. fadefactoryapp@gmail.com ή calendar ID"
                        />
                        <p className="text-gray-400 text-xs mt-1">
                          Εισάγετε το email ή το Calendar ID του υπαλλήλου. Το Calendar πρέπει να είναι κοινοποιημένο με το service account.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoSyncEnabled"
                          checked={employeeForm.autoSyncEnabled}
                          onChange={(e) => setEmployeeForm({
                            ...employeeForm,
                            autoSyncEnabled: e.target.checked
                          })}
                          className="rounded"
                          disabled={!employeeForm.googleCalendarEnabled}
                        />
                        <Label 
                          htmlFor="autoSyncEnabled" 
                          className="text-white cursor-pointer"
                        >
                          Αυτόματος Συγχρονισμός
                        </Label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEmployeeDialogOpen(false)}
                  className="flex-1 bg-steel hover:bg-iron text-white border-steel"
                >
                  Ακύρωση
                </Button>
                <Button
                  type="submit"
                  disabled={createEmployeeMutation.isPending}
                  className="flex-1 whiskey-gradient hover:opacity-90 text-black font-semibold"
                >
                  {createEmployeeMutation.isPending ? "Αποθήκευση..." : "Αποθήκευση"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Manual Appointment Booking Component (for use in tab)
function ManualAppointmentBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchClient, setSearchClient] = useState("");
  const [clientType, setClientType] = useState<"registered" | "new">("registered");
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [appointmentForm, setAppointmentForm] = useState({
    userId: "",
    employeeId: "",
    service: "",
    date: "",
    time: "",
    notes: "",
    status: "confirmed" as "pending" | "confirmed",
    // For unregistered clients
    clientFirstName: "",
    clientLastName: "",
    clientEmail: "",
    clientPhone: "",
  });

  // Fetch all users for client selection
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users", searchClient],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/users?page=1&limit=100&search=${searchClient}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return data.users || [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  // Fetch services
  const { data: servicesData = [], error: servicesError, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
  });

  const services = Array.isArray(servicesData) ? servicesData.filter((s: any) => s.isActive) : [];
  const activeEmployees = Array.isArray(employees) ? employees.filter(emp => emp.isActive) : [];

  // Show calendar when employee and service are selected
  useEffect(() => {
    if (appointmentForm.employeeId && appointmentForm.employeeId !== "auto" && appointmentForm.service) {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
    }
  }, [appointmentForm.employeeId, appointmentForm.service]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create appointment");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Επιτυχία!",
        description: data.message || "Το ραντεβού δημιουργήθηκε επιτυχώς.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/date"] });
      // Invalidate employee availability queries
      if (appointmentForm.employeeId && appointmentForm.employeeId !== "auto") {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/employees", appointmentForm.employeeId, "availability"] 
        });
      }
      setAppointmentForm({
        userId: "",
        employeeId: "",
        service: "",
        date: "",
        time: "",
        notes: "",
        status: "confirmed",
        clientFirstName: "",
        clientLastName: "",
        clientEmail: "",
        clientPhone: "",
      });
      setSearchClient("");
      setShowCalendar(false);
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία δημιουργίας ραντεβού.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate based on client type
    if (clientType === "registered") {
      if (!appointmentForm.userId || !appointmentForm.service || !appointmentForm.date || !appointmentForm.time) {
        toast({
          title: "Σφάλμα",
          description: "Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!appointmentForm.clientFirstName || !appointmentForm.service || !appointmentForm.date || !appointmentForm.time) {
        toast({
          title: "Σφάλμα",
          description: "Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία (Όνομα, Υπηρεσία, Ημερομηνία, Ώρα).",
          variant: "destructive",
        });
        return;
      }
    }

    const selectedService = services.find((s: any) => s.id === appointmentForm.service);
    const selectedEmployee = activeEmployees.find(emp => emp.id === appointmentForm.employeeId);

    const appointmentData: any = {
      employeeId: appointmentForm.employeeId === "auto" ? "" : appointmentForm.employeeId,
      service: appointmentForm.service,
      barber: selectedEmployee?.name || "",
      date: appointmentForm.date,
      time: appointmentForm.time,
      notes: appointmentForm.notes,
      duration: selectedService?.duration || 30,
      status: appointmentForm.status,
    };

    // Add client info based on type
    if (clientType === "registered") {
      appointmentData.userId = appointmentForm.userId;
    } else {
      appointmentData.clientFirstName = appointmentForm.clientFirstName;
      appointmentData.clientLastName = appointmentForm.clientLastName;
      appointmentData.clientEmail = appointmentForm.clientEmail;
      appointmentData.clientPhone = appointmentForm.clientPhone;
    }

    createAppointmentMutation.mutate(appointmentData);
  };

  const handleTimeSelect = (date: string, time: string) => {
    setAppointmentForm({ ...appointmentForm, date, time });
  };

  const selectedUser = usersData?.find((u: any) => u.id === appointmentForm.userId);

  // Show loading state
  if (isLoadingUsers || isLoadingServices) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-400">Φόρτωση...</p>
      </div>
    );
  }

  // Show error state if queries fail
  if (servicesError) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded">
        <p className="text-red-400">Σφάλμα φόρτωσης υπηρεσιών: {servicesError.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client Type Selection */}
      <div>
        <Label className="text-whiskey mb-2 block">Τύπος Πελάτη *</Label>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={clientType === "registered" ? "default" : "outline"}
            onClick={() => {
              setClientType("registered");
              setAppointmentForm({ ...appointmentForm, userId: "", clientFirstName: "", clientLastName: "", clientEmail: "", clientPhone: "" });
              setSearchClient("");
            }}
            className={clientType === "registered" ? "whiskey-gradient text-black" : "bg-slate border-steel text-white"}
          >
            Εγγεγραμμένος Πελάτης
          </Button>
          <Button
            type="button"
            variant={clientType === "new" ? "default" : "outline"}
            onClick={() => {
              setClientType("new");
              setAppointmentForm({ ...appointmentForm, userId: "", clientFirstName: "", clientLastName: "", clientEmail: "", clientPhone: "" });
              setSearchClient("");
            }}
            className={clientType === "new" ? "whiskey-gradient text-black" : "bg-slate border-steel text-white"}
          >
            Νέος Πελάτης (Χωρίς λογαριασμό)
          </Button>
        </div>
      </div>

      {/* Registered Client Selection */}
      {clientType === "registered" && (
        <div>
          <Label htmlFor="client-search" className="text-whiskey">Επιλογή Πελάτη *</Label>
          <div className="mt-2 space-y-2">
          <Input
            id="client-search"
            placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο..."
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            className="bg-slate border-steel text-white"
          />
          {isLoadingUsers ? (
            <p className="text-gray-400 text-sm">Φόρτωση...</p>
          ) : usersData && usersData.length > 0 ? (
            <div className="max-h-40 overflow-y-auto border border-steel rounded p-2 space-y-1">
              {usersData.map((user: any) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setAppointmentForm({ ...appointmentForm, userId: user.id });
                    setSearchClient(`${user.firstName} ${user.lastName} (${user.email})`);
                  }}
                  className={`p-2 rounded cursor-pointer hover:bg-steel/50 ${
                    appointmentForm.userId === user.id ? "bg-whiskey/20 border border-whiskey" : ""
                  }`}
                >
                  <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-400 text-xs">{user.email} {user.phone ? `• ${user.phone}` : ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Δεν βρέθηκαν χρήστες</p>
          )}
          {selectedUser && (
            <div className="mt-2 p-2 bg-whiskey/10 border border-whiskey rounded">
              <p className="text-whiskey font-medium">Επιλεγμένος Πελάτης:</p>
              <p className="text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
              <p className="text-gray-400 text-sm">{selectedUser.email}</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* New Client Information */}
      {clientType === "new" && (
        <div className="space-y-4 p-4 bg-slate/20 border border-steel rounded">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientFirstName" className="text-whiskey">Όνομα *</Label>
              <Input
                id="clientFirstName"
                value={appointmentForm.clientFirstName}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, clientFirstName: e.target.value })}
                className="bg-slate border-steel text-white"
                placeholder="Όνομα πελάτη"
                required
              />
            </div>
            <div>
              <Label htmlFor="clientLastName" className="text-whiskey">Επώνυμο</Label>
              <Input
                id="clientLastName"
                value={appointmentForm.clientLastName}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, clientLastName: e.target.value })}
                className="bg-slate border-steel text-white"
                placeholder="Επώνυμο πελάτη"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientEmail" className="text-whiskey">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={appointmentForm.clientEmail}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, clientEmail: e.target.value })}
                className="bg-slate border-steel text-white"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone" className="text-whiskey">Τηλέφωνο</Label>
              <Input
                id="clientPhone"
                type="tel"
                value={appointmentForm.clientPhone}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, clientPhone: e.target.value })}
                className="bg-slate border-steel text-white"
                placeholder="+30 123 456 7890"
              />
            </div>
          </div>
        </div>
      )}

      {/* Service Selection */}
      <div>
        <Label htmlFor="service" className="text-whiskey">Υπηρεσία *</Label>
        {services.length === 0 ? (
          <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
            <p className="text-yellow-400 text-sm">Δεν υπάρχουν διαθέσιμες υπηρεσίες. Παρακαλώ προσθέστε υπηρεσίες πρώτα.</p>
          </div>
        ) : (
          <Select
            value={appointmentForm.service || undefined}
            onValueChange={(value) => setAppointmentForm({ ...appointmentForm, service: value })}
          >
            <SelectTrigger className="bg-slate border-steel text-white">
              <SelectValue placeholder="Επιλέξτε υπηρεσία" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service: any) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - €{service.price} ({service.duration} min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Employee Selection */}
      <div>
        <Label htmlFor="employee" className="text-whiskey">Υπάλληλος</Label>
        <Select
          value={appointmentForm.employeeId || "auto"}
          onValueChange={(value) => {
            setAppointmentForm({ ...appointmentForm, employeeId: value === "auto" ? "" : value, date: "", time: "" });
            setShowCalendar(false);
          }}
        >
          <SelectTrigger className="bg-slate border-steel text-white">
            <SelectValue placeholder="Αυτόματη ανάθεση (ή επιλέξτε)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Αυτόματη Ανάθεση</SelectItem>
            {activeEmployees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar for Date/Time Selection - Show when employee and service are selected */}
      {showCalendar && appointmentForm.employeeId && appointmentForm.employeeId !== "auto" && appointmentForm.service ? (
        <div>
          <Label className="text-whiskey mb-2 block">Επιλογή Ημερομηνίας & Ώρας *</Label>
          <AppointmentCalendar
            selectedEmployeeId={appointmentForm.employeeId}
            selectedService={appointmentForm.service}
            onTimeSelect={handleTimeSelect}
            selectedDate={appointmentForm.date}
            selectedTime={appointmentForm.time}
            employees={activeEmployees.map(emp => {
              try {
                let specialties: string[] = [];
                if (typeof emp.specialties === 'string') {
                  try {
                    specialties = JSON.parse(emp.specialties);
                  } catch {
                    specialties = [];
                  }
                } else if (Array.isArray(emp.specialties)) {
                  specialties = emp.specialties;
                }
                return { id: emp.id, name: emp.name, specialties };
              } catch (err) {
                console.error("Error mapping employee:", emp, err);
                return { id: emp.id, name: emp.name || "Unknown", specialties: [] };
              }
            })}
          />
        </div>
      ) : (
        <>
          {/* Fallback Date/Time Selection when no employee selected */}
          <div>
            <Label htmlFor="date" className="text-whiskey">Ημερομηνία *</Label>
            <Input
              id="date"
              type="date"
              value={appointmentForm.date}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value, time: "" })}
              min={new Date().toISOString().split('T')[0]}
              className="bg-slate border-steel text-white"
            />
          </div>

          {/* Time Selection */}
          {appointmentForm.date && (
            <div>
              <Label htmlFor="time" className="text-whiskey">Ώρα *</Label>
              <Input
                id="time"
                type="time"
                value={appointmentForm.time}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                className="bg-slate border-steel text-white"
              />
            </div>
          )}
        </>
      )}

      {/* Status */}
      <div>
        <Label htmlFor="status" className="text-whiskey">Κατάσταση</Label>
        <Select
          value={appointmentForm.status}
          onValueChange={(value: "pending" | "confirmed") => setAppointmentForm({ ...appointmentForm, status: value })}
        >
          <SelectTrigger className="bg-slate border-steel text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">Επιβεβαιωμένο</SelectItem>
            <SelectItem value="pending">Εκκρεμεί</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-whiskey">Σημειώσεις</Label>
        <Textarea
          id="notes"
          value={appointmentForm.notes}
          onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
          className="bg-slate border-steel text-white"
          rows={3}
          placeholder="Προαιρετικές σημειώσεις..."
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAppointmentForm({
              userId: "",
              employeeId: "",
              service: "",
              date: "",
              time: "",
              notes: "",
              status: "confirmed",
              clientFirstName: "",
              clientLastName: "",
              clientEmail: "",
              clientPhone: "",
            });
            setSearchClient("");
            setShowCalendar(false);
            setClientType("registered");
          }}
          className="flex-1 bg-steel hover:bg-iron text-white border-steel"
        >
          Καθαρισμός
        </Button>
        <Button
          type="submit"
          disabled={createAppointmentMutation.isPending}
          className="flex-1 whiskey-gradient hover:opacity-90 text-black font-semibold"
        >
          {createAppointmentMutation.isPending ? "Δημιουργία..." : "Δημιουργία Ραντεβού"}
        </Button>
      </div>
    </form>
  );
}