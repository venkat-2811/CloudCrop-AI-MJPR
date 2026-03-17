export const db: never = (() => {
  throw new Error("Supabase has been removed. Use the MySQL-backed /api endpoints instead.");
})() as never;

// User types
export type UserRole = 'farmer' | 'vendor';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  location?: string;
  created_at: string;
}

// Weather history
export interface WeatherHistory {
  id: string;
  user_id: string;
  location: string;
  temperature: number;
  humidity: number;
  description: string;
  created_at: string;
}

// Market prices
export interface MarketPrice {
  id: string;
  crop_name: string;
  price_per_kg: number;
  location: string;
  updated_by: string;
  updated_at: string;
}

// Soil data
export interface SoilData {
  id: string;
  location: string;
  soil_type: string;
  characteristics: string;
  suitable_crops: string[];
  created_at: string;
}
