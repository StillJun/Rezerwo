export interface User { id: number; email: string; emailVerified?: boolean; role?: "owner" | "admin"; }

export interface BusinessContacts {
  email?: string; telegram?: string; whatsapp?: string;
  facebook?: string; tiktok?: string; website?: string; googleMaps?: string;
}

export interface Business {
  id: number; slug: string; name: string; category: string; categories: string[]; city: string; district: string;
  address: string; phone: string; instagram: string; about: string; banner: string;
  hours: Record<string, [string, string]>; photos: string[];
  confirmRequired: boolean; reminderHours: number[]; verified: boolean;
  status: "pending" | "approved" | "rejected";
  isVisible: boolean;
  contacts?: BusinessContacts;
  amenities?: string[];
  languages?: string[];
}

export interface Service {
  id: number; grp: string; name: string; description: string;
  duration: number; price: number; sort: number; color: string;
}

export interface Meta {
  categories: { id: string; pl: string; emoji: string }[];
  cities: Record<string, string[]>;
}

export interface PublicBusiness {
  id: number; slug: string; name: string; category: string; categories: string[];
  city: string; district: string; address: string; phone: string;
  instagram: string; about: string; banner: string;
  hours: Record<string, [string, string]>; photos: string[];
  verified: boolean; services?: PublicService[];
  avgRating?: number | null; reviewCount?: number;
  contacts?: BusinessContacts;
  amenities?: string[];
  languages?: string[];
}

export interface PublicService {
  id: number; grp: string; name: string; description: string;
  duration: number; price: number; sort: number; color: string;
}

export interface PublicMaster {
  id: number; businessId: number; name: string; photo: string | null; bio: string | null;
  isActive: boolean; sort: number;
  workingHours: Record<string, [string, string]>;
  serviceIds: number[];
}

export interface Appointment {
  id: number; businessId: number;
  serviceId: number | null; serviceName: string | null; servicePrice: number | null;
  masterId?: number | null; masterName?: string | null;
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

export interface Client {
  id: number; name: string; phone: string; email: string;
  notes: string; tags: string[]; rodoConsent: boolean; createdAt: string;
}
