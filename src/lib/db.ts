
import { supabase } from '@/pages/supabase';

const supabaseUrl = 'https://reoxojwksgmmtribyree.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb3hvandrc2dtbXRyaWJ5cmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjM0NzAsImV4cCI6MjA2NTIzOTQ3MH0.XrT5swLBrW1cPgGvqMY8q7Gs_m2v2GPYtN5NPi2biyk'; // This should be replaced with your public anon key

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

// Database functions
export const saveWeatherHistory = async (userId: string, weatherData: any) => {
  const { data, error } = await supabase
    .from('weather_history')
    .insert({
      user_id: userId,
      location: weatherData.name,
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
      description: weatherData.weather[0].description,
    });
  
  return { data, error };
};

export const saveSoilData = async (location: string, soilData: any) => {
  const { data, error } = await supabase
    .from('soil_data')
    .insert({
      location,
      soil_type: soilData.type,
      characteristics: soilData.characteristics,
      suitable_crops: soilData.suitableCrops,
    });
  
  return { data, error };
};

export const getMarketPrices = async (location: string) => {
  const { data, error } = await supabase
    .from('market_prices')
    .select('*')
    .eq('location', location);
  
  return { data, error };
};

export const saveMarketPrice = async (marketPrice: Omit<MarketPrice, 'id' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('market_prices')
    .insert(marketPrice);
  
  return { data, error };
};
