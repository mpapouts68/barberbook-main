import { apiRequest } from "@/lib/queryClient";
import type { InsertAppointment, Appointment, InsertPushMessage } from "@shared/schema";

export const api = {
  // Authentication
  async getMe() {
    const response = await apiRequest("/api/auth/me", "GET");
    return response.json();
  },

  async logout() {
    return apiRequest("/api/auth/logout", "POST");
  },

  // Appointments
  async createAppointment(appointment: InsertAppointment) {
    const response = await apiRequest("/api/appointments", "POST", appointment);
    return response.json();
  },

  async createGuestAppointment(data: {
    clientFirstName: string;
    clientLastName?: string;
    clientEmail?: string;
    clientPhone?: string;
    employeeId?: string;
    service: string;
    barber?: string;
    date: string;
    time: string;
    notes?: string;
    duration?: number;
  }) {
    const response = await fetch("/api/appointments/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.message || "Failed to book appointment");
    }
    return body;
  },

  async getMyAppointments(): Promise<Appointment[]> {
    const response = await apiRequest("/api/appointments", "GET");
    return response.json();
  },

  async getAllAppointments(): Promise<Appointment[]> {
    const response = await apiRequest("/api/appointments/all", "GET");
    return response.json();
  },

  async getTodaysAppointments(): Promise<Appointment[]> {
    const response = await apiRequest("/api/appointments/today", "GET");
    return response.json();
  },

  async cancelAppointment(id: string) {
    return apiRequest(`/api/appointments/${id}`, "DELETE");
  },

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>) {
    const response = await apiRequest(`/api/appointments/${id}`, "PUT", appointment);
    return response.json();
  },

  // Employees
  async getEmployees() {
    const response = await apiRequest("/api/employees", "GET");
    return response.json();
  },

  // Namedays
  async checkNamedays() {
    const response = await apiRequest("/api/nameday/check", "GET");
    return response.json();
  },

  async getTodaysNamedays(): Promise<string[]> {
    const response = await apiRequest("/api/nameday/today", "GET");
    return response.json();
  },

  // Push notifications
  async sendPushMessage(message: InsertPushMessage) {
    const response = await apiRequest("/api/push/send", "POST", message);
    return response.json();
  },

  async getPushHistory() {
    const response = await apiRequest("/api/push/history", "GET");
    return response.json();
  },

  // Settings
  async getSetting(key: string) {
    const response = await apiRequest(`/api/settings/${key}`, "GET");
    return response.json();
  },

  async updateSetting(key: string, value: string) {
    return apiRequest(`/api/settings/${key}`, "PUT", { value });
  }
};
