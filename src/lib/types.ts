export type Role = 'tourist' | 'agency' | 'admin';
export type AgencyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid_demo' | 'refunded_demo';
export const CATEGORIES = ['nature', 'adventure', 'culture', 'family', 'relaxation', 'city'] as const;
export interface Profile { id: string; full_name: string; preferred_language: 'en' | 'ru'; theme: 'light' | 'dark'; is_suspended: boolean }
export interface Agency { id: string; owner_id: string | null; name: string; description: string; contact_email: string | null; status: AgencyStatus; verified_at: string | null; created_at: string }
export interface Destination {
  id: string;
  country: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  image_path?: string | null;
}
export interface CatalogTour {
  id: string; title: string; description: string; category: string; duration_days: number; price_kzt: number; status: string;
  meeting_point: string | null; latitude: number | null; longitude: number | null; created_at: string;
  agency_id: string; agency_name: string; destination_id: string; country: string; city: string;
  cover_path: string | null; next_date: string | null; seats_left: number; avg_rating: number | null; review_count: number;
}
export interface TourDate { id: string; tour_id: string; start_date: string; end_date: string; capacity: number; active: boolean }
export interface Step { id: string; tour_id: string; day_number: number; step_order: number; start_time: string | null; title: string; details: string }
export interface TourImage { id: string; tour_id: string; storage_path: string; alt_text: string; position: number }
type Pay = { status: PaymentStatus; processed_at: string | null; method_label: string; amount_kzt: number };
export interface Booking {
  id: string; tour_date_id: string; tourist_id: string | null; participants_count: number; total_kzt: number; discount_kzt: number;
  status: BookingStatus; created_at: string; guest_name: string | null;
  tour_dates: { start_date: string; end_date: string; tour_id: string; tours: { id: string; title: string; price_kzt: number; agencies: { name: string } } };
  demo_payments: Pay[] | Pay | null;
}
export interface AgencyBookingRow {
  booking_id: string; created_at: string; status: BookingStatus; tour_id: string; tour_title: string; tour_date_id: string; start_date: string;
  participants_count: number; total_kzt: number; discount_kzt: number; payment_status: PaymentStatus | null; customer_name: string; customer_email: string; source: 'online' | 'manual';
}
export interface Notification { id: string; title: string; message: string; title_key: string | null; params: Record<string, unknown>; is_read: boolean; created_at: string }
export const payOf = (b: Booking): Pay | null => (Array.isArray(b.demo_payments) ? b.demo_payments[0] ?? null : b.demo_payments);
