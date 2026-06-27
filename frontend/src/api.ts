import type { Business, Service, Meta, User, PublicBusiness, PublicMaster, Appointment, BookingResult, Review, Client, BlockedSlot } from "./types";

const BASE = (import.meta.env.VITE_API_URL || "") + "/api";
const TOKEN = "rz_token";
export const getToken = () => localStorage.getItem(TOKEN);
export const setToken = (t: string) => localStorage.setItem(TOKEN, t);
export const clearToken = () => localStorage.removeItem(TOKEN);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function req<T>(path: string, opt: RequestInit = {}, _retries = 3): Promise<T> {
  const isRead = !opt.method || opt.method === "GET";
  const token = getToken();
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opt, credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opt.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (isRead && (res.status === 502 || res.status === 503) && _retries > 0) {
        await sleep(2500);
        return req<T>(path, opt, _retries - 1);
      }
      throw new Error((data as { error?: string }).error || `Error ${res.status}`);
    }
    return data as T;
  } catch (e) {
    if (isRead && e instanceof TypeError && _retries > 0) {
      await sleep(2500);
      return req<T>(path, opt, _retries - 1);
    }
    throw e;
  }
}

type AuthOk = { user: User; token: string };

export const api = {
  /* auth */
  register: (email: string, password: string, businessName: string, categories: string[]) =>
    req<AuthOk>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, businessName, categories }) }),
  login: (email: string, password: string) =>
    req<AuthOk>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => req<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => req<{ user: User }>("/auth/me"),
  verifyEmail: (token: string) => req<{ ok: boolean }>(`/auth/verify-email/${encodeURIComponent(token)}`),
  resendVerification: () => req<{ ok: boolean }>("/auth/resend-verification", { method: "POST" }),

  /* meta */
  meta: () => req<Meta>("/meta"),

  /* owner: business */
  business: () => req<Business>("/business"),
  createBusiness: (name: string, categories: string[]) =>
    req<Business>("/business", { method: "POST", body: JSON.stringify({ name, categories }) }),
  saveBusiness: (b: Partial<Business>) =>
    req<Business>("/business", { method: "PUT", body: JSON.stringify(b) }),

  /* owner: services */
  services: () => req<Service[]>("/services"),
  addService: (s: Partial<Service>) =>
    req<Service>("/services", { method: "POST", body: JSON.stringify(s) }),
  updateService: (id: number, s: Partial<Service>) =>
    req<Service>(`/services/${id}`, { method: "PUT", body: JSON.stringify(s) }),
  deleteService: (id: number) =>
    req<{ ok: boolean }>(`/services/${id}`, { method: "DELETE" }),

  /* owner: appointments */
  appointments: (params: { date?: string; status?: string; start_date?: string; end_date?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v != null)) as Record<string,string>
    ).toString();
    return req<Appointment[]>(`/appointments${qs ? "?" + qs : ""}`);
  },
  createAppointment: (data: { service_id?: number; master_id?: number; client_name: string; client_phone: string; client_email?: string; comment?: string; date: string; start_min: number; color?: string }) =>
    req<Appointment>("/appointments", { method: "POST", body: JSON.stringify(data) }),
  updateAppointment: (id: number, status: string) =>
    req<Appointment>(`/appointments/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  rescheduleAppointment: (id: number, date: string, start_min: number) =>
    req<Appointment>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify({ date, start_min }) }),

  /* blocked slots */
  blocked: (start_date: string, end_date: string) =>
    req<BlockedSlot[]>(`/blocked?start_date=${start_date}&end_date=${end_date}`),
  addBlocked: (data: { master_id?: number; date: string; start_min: number; duration?: number; label?: string; color?: string }) =>
    req<BlockedSlot>("/blocked", { method: "POST", body: JSON.stringify(data) }),
  deleteBlocked: (id: number) =>
    req<{ ok: boolean }>(`/blocked/${id}`, { method: "DELETE" }),

  /* owner: service requests */
  serviceRequests: () =>
    req<{ id: number; clientPhone: string; text: string; handled: boolean; createdAt: string }[]>("/service-requests"),
  resolveServiceRequest: (id: number) =>
    req<{ ok: boolean }>(`/service-requests/${id}`, { method: "PUT" }),

  /* owner: CRM */
  clientHistory: (phone: string) =>
    req<{ history: Appointment[]; note: string }>(`/clients/history?phone=${encodeURIComponent(phone)}`),
  saveClientNote: (phone: string, note: string) =>
    req<{ ok: boolean }>(`/clients/note`, { method: "PUT", body: JSON.stringify({ phone, note }) }),

  /* public marketplace */
  publicBusinesses: (params: { city?: string; district?: string; category?: string; q?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString();
    return req<PublicBusiness[]>(`/public/businesses${qs ? "?" + qs : ""}`);
  },
  publicBusiness: (slug: string) =>
    req<PublicBusiness & { services: PublicBusiness["services"] }>(`/public/businesses/${slug}`),
  /* owner: masters */
  masters: () => req<PublicMaster[]>("/masters"),
  addMaster: (data: { name: string; photo?: string|null; bio?: string|null; sort?: number }) =>
    req<PublicMaster>("/masters", { method: "POST", body: JSON.stringify(data) }),
  updateMaster: (id: number, data: { name?: string; photo?: string|null; bio?: string|null; isActive?: boolean; sort?: number }) =>
    req<PublicMaster>(`/masters/${id}`, { method: "PUT", body: JSON.stringify({ name: data.name, photo: data.photo, bio: data.bio, is_active: data.isActive, sort: data.sort }) }),
  deleteMaster: (id: number) => req<{ ok: boolean }>(`/masters/${id}`, { method: "DELETE" }),
  updateMasterHours: (id: number, hours: Record<string, [string,string]>) =>
    req<PublicMaster>(`/masters/${id}/hours`, { method: "PUT", body: JSON.stringify({ hours }) }),
  updateMasterServices: (id: number, serviceIds: number[]) =>
    req<{ ok: boolean; serviceIds: number[] }>(`/masters/${id}/services`, { method: "PUT", body: JSON.stringify({ serviceIds }) }),

  /* public: masters */
  publicMasters: (slug: string) =>
    req<PublicMaster[]>(`/p/${slug}/masters`),
  slots: (slug: string, date: string, serviceId: number, masterId?: number) => {
    let url = `/public/businesses/${slug}/slots?date=${date}&service_id=${serviceId}`;
    if (masterId) url += `&master_id=${masterId}`;
    return req<{ slots: number[]; slotTimes: string[]; duration: number }>(url);
  },
  book: (slug: string, data: {
    service_id: number; client_name: string; client_phone: string;
    client_email?: string; comment?: string; date: string; start_min: number; master_id?: number;
  }) => req<BookingResult>(`/public/businesses/${slug}/book`, { method: "POST", body: JSON.stringify(data) }),
  serviceRequest: (slug: string, data: { client_phone: string; text: string }) =>
    req<{ ok: boolean }>(`/public/businesses/${slug}/service-request`, { method: "POST", body: JSON.stringify(data) }),

  /* public: reviews */
  reviews: (slug: string) =>
    req<{ reviews: Review[]; avg: number | null; total: number }>(`/public/businesses/${slug}/reviews`),
  addReview: (slug: string, data: { client_name: string; rating: number; text?: string }) =>
    req<{ ok: boolean; id: number }>(`/public/businesses/${slug}/reviews`, { method: "POST", body: JSON.stringify(data) }),

  /* owner: reviews + reports */
  ownerReviews: () =>
    req<Review[]>("/reviews"),
  reportReview: (id: number, reason: string) =>
    req<{ ok: boolean }>(`/reviews/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) }),

  /* support */
  submitSupport: (data: { email: string; subject: string; message: string }) =>
    req<{ ok: boolean }>("/support", { method: "POST", body: JSON.stringify(data) }),

  /* waitlist */
  joinWaitlist: (slug: string, data: { service_id?: number; client_name: string; client_phone: string; client_email?: string; preferred_date?: string }) =>
    req<{ ok: boolean }>(`/public/businesses/${slug}/waitlist`, { method: "POST", body: JSON.stringify(data) }),
  waitlist: () =>
    req<{ id: number; clientName: string; clientPhone: string; clientEmail: string; serviceName: string | null; preferredDate: string | null; createdAt: string }[]>("/waitlist"),
  notifyWaitlist: (id: number) =>
    req<{ ok: boolean }>(`/waitlist/${id}/notify`, { method: "PUT" }),

  /* feedback */
  submitFeedback: (data: { kind: string; message: string; email?: string; page?: string }) =>
    req<{ ok: boolean }>("/feedback", { method: "POST", body: JSON.stringify(data) }),

  /* owner: CRM contacts book */
  crmClients: (search?: string) => {
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    return req<Client[]>(`/crm/clients${qs}`);
  },
  crmAddClient: (data: { name: string; phone: string; email?: string; notes?: string; tags?: string[]; rodo_consent: boolean }) =>
    req<Client>("/crm/clients", { method: "POST", body: JSON.stringify(data) }),
  crmUpdateClient: (id: number, data: { name?: string; phone?: string; email?: string; notes?: string; tags?: string[] }) =>
    req<Client>(`/crm/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  crmDeleteClient: (id: number) =>
    req<{ ok: boolean }>(`/crm/clients/${id}`, { method: "DELETE" }),

  /* admin */
  adminBusinesses: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return req<{ id: number; ownerId: number; slug: string; name: string; category: string; categories: string[]; city: string; status: string; verified: boolean; isVisible: boolean; ownerEmail: string; createdAt: string }[]>(`/admin/businesses${qs}`);
  },
  adminApprove:      (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}/approve`,  { method: "POST" }),
  adminReject:       (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}/reject`,   { method: "POST" }),
  adminVerify:       (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}/verify`,   { method: "POST" }),
  adminUnverify:     (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}/unverify`, { method: "POST" }),
  adminShow:         (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}/show`,     { method: "POST" }),
  adminHide:         (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}/hide`,     { method: "POST" }),
  adminDelete:       (id: number) => req<{ ok: boolean }>(`/admin/businesses/${id}`,          { method: "DELETE" }),
  adminDeleteOwner:  (id: number) => req<{ ok: boolean }>(`/admin/owners/${id}`,              { method: "DELETE" }),
  adminStats:    () => req<{ owners: number; businesses: Record<string, number>; appointments7d: number }>("/admin/stats"),
  adminFeedback: () => req<{ id: number; kind: string; message: string; email: string; page: string; createdAt: string }[]>("/admin/feedback"),
};
