export interface User { id: number; email: string; emailVerified?: boolean; }

export interface Business {
  id: number; slug: string; name: string; category: string; city: string; district: string;
  address: string; phone: string; instagram: string; about: string; banner: string;
  hours: Record<string, [string, string]>; photos: string[];
  confirmRequired: boolean; reminderHours: number[]; verified: boolean;
}

export interface Service {
  id: number; grp: string; name: string; description: string;
  duration: number; price: number; sort: number;
}

export interface Meta {
  categories: { id: string; pl: string; emoji: string }[];
  cities: Record<string, string[]>;
}

export interface PublicBusiness {
  id: number; slug: string; name: string; category: string;
  city: string; district: string; address: string; phone: string;
  instagram: string; about: string; banner: string;
  hours: Record<string, [string, string]>; photos: string[];
  verified: boolean; services?: PublicService[];
}

export interface PublicService {
  id: number; grp: string; name: string; description: string;
  duration: number; price: number; sort: number;
}

export interface Appointment {
  id: number; businessId: number;
  serviceId: number | null; serviceName: string | null; servicePrice: number | null;
  clientName: string; clientPhone: string; clientEmail: string; comment: string;
  date: string; startMin: number; duration: number;
  status: "pending" | "confirmed" | "cancelled" | "done" | "no_show";
  createdAt: string;
}

export interface BookingResult {
  id: number; status: string; confirmRequired: boolean; businessName: string;
}

export interface Review {
  id: number; clientName: string; rating: number; text: string;
  hidden?: boolean; createdAt: string;
}
