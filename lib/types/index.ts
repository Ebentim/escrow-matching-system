// Shared TypeScript types for the Digital Farmer-Buyer Matching System

export type UserRole = "farmer" | "buyer" | "agent" | "admin";

export type ProductStatus = "pending_approval" | "available" | "reserved" | "sold";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "in_escrow"
  | "out_for_delivery"
  | "delivered"
  | "verified"
  | "completed"
  | "disputed"
  | "cancelled";

export type EscrowStatus = "held" | "released" | "refunded";

export type DeliveryStatus = "assigned" | "picked_up" | "in_transit" | "delivered";

export type VerificationMethod = "otp" | "qr";

export type VerificationStatus = "pending" | "verified" | "failed";

export type DisputeStatus = "open" | "investigating" | "resolved" | "rejected";

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  email: string;
  location: string;
  created_at: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface FarmerProfile {
  user_id: string;
  farm_name: string;
  farm_location: string;
  geolocation: { lat: number; lng: number } | null;
  bio: string;
  rating_avg: number;
}

export interface BuyerProfile {
  user_id: string;
  business_name: string;
  delivery_address: string;
  geolocation: { lat: number; lng: number } | null;
  rating_avg: number;
}

export interface DeliveryAgentProfile {
  user_id: string;
  vehicle_type: string;
  coverage_area: string;
  rating_avg: number;
  availability_status: boolean;
}

export interface Product {
  id: string;
  farmer_id: string;
  name: string;
  crop_type: string;
  quantity: number;
  unit: string;
  price: number;
  harvest_date: string;
  location: string;
  geolocation: { lat: number; lng: number } | null;
  status: ProductStatus;
  created_at: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}
