import type { Business, Service, Meta, User, PublicBusiness, Appointment, BookingResult, Review } from "./types";

const BASE = (import.meta.env.VITE_API_URL || "") + "/api";
const TOKEN = "rz_token";
export const getToken = () => localStorage.getItem(TOKEN);
export const setToken = (t: string) => localStorage.setItem(TOKEN, t);
export const clearToken = () => localStorage.removeItem(TOKEN);

async function req<T>(path: string, opt: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opt, credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opt.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Error ${res.status}`);
  return data as T;
}

type AuthOk = { user: User; token: string };

export const api = {
  /* auth */
  register: (email: string, password: string, businessName: string, category: string) =>
    req<AuthOk>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, businessName, category }) }),
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
  appointments: (params: { date?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return req<Appointment[]>(`/appointments${qs ? "?" + qs : ""}`);
  },
  updateAppointment: (id: number, status: string) =>
    req<Appointment>(`/appointments/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  /* owner: service requests */
  serviceRequests: () =>
    req<{ id: number; clientPhone: string; text: string; handled: boolean; createdAt: string }[]>("/service-requests"),
  resolveServiceRequest: (id: number) =>
    req<{ ok: boolean }>(`/service-requests/${id}`, { method: "PUT" }),

  /* owner: CRM */
  clientHistory: (phone: string) =>
    req<{ history: Appointment[]; note: string }>(`/clients/${encodeURIComponent(phone)}`),
  saveClientNote: (phone: string, note: string) =>
    req<{ ok: boolean }>(`/clients/${encodeURIComponent(phone)}/note`, { method: "PUT", body: JSON.stringify({ note }) }),

  /* public marketplace */
  publicBusinesses: (params: { city?: string; district?: string; category?: string; q?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString();
    return req<PublicBusiness[]>(`/public/businesses${qs ? "?" + qs : ""}`);
  },
  publicBusiness: (slug: string) =>
    req<PublicBusiness & { services: PublicBusiness["services"] }>(`/public/businesses/${slug}`),
  slots: (slug: string, date: string, serviceId: number) =>
    req<{ slots: number[]; slotTimes: string[]; duration: number }>(
      `/public/businesses/${slug}/slots?date=${date}&service_id=${serviceId}`
    ),
  book: (slug: string, data: {
    service_id: number; client_name: string; client_phone: string;
    client_email?: string; comment?: string; date: string; start_min: number;
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
};
