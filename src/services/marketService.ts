import { fetchWithAuth } from "@/utils/authClient";

export interface MarketPrice {
  id: string;
  commodity: string;
  price: number;
  unit: string;
  location: string;
  active: boolean;
  created_at: string;
  vendor_id: string | null;
  vendor_name?: string;
  vendor_contact?: string;
}

/**
 * Market Service for abstraction between frontend and any database (Supabase/MySQL/etc)
 */
export const marketService = {
  /**
   * Fetch all active market prices
   */
  async getPrices(commodity?: string, location?: string): Promise<MarketPrice[]> {
    try {
      const params = new URLSearchParams();
      if (commodity) params.set("commodity", commodity);
      if (location) params.set("location", location);
      params.set("_t", Date.now().toString()); // Cache buster for live data

      const res = await fetch(`/api/market/prices?${params.toString()}`);
      if (!res.ok) {
        console.warn("Market prices fetch failed, falling back to mock data", await res.text().catch(() => ""));
        return this.getMockPrices(commodity, location);
      }
      const json = await res.json().catch(() => ({}));
      return (json.prices || []) as MarketPrice[];
    } catch (err) {
      console.error("Market Service Error:", err);
      return this.getMockPrices(commodity, location);
    }
  },

  /**
   * Add a new market price
   */
  async addPrice(priceData: Partial<MarketPrice>): Promise<boolean> {
    const res = await fetchWithAuth("/api/market/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(priceData),
    });
    return res.ok;
  },

  /**
   * Mock data fallback for when database is not configured
   */
  getMockPrices(commodity?: string, location?: string): MarketPrice[] {
    const mockData: MarketPrice[] = [
      { id: "1", commodity: "Wheat", price: 2300, unit: "quintal", location: "Punjab, India", active: true, created_at: new Date().toISOString(), vendor_id: null, vendor_name: "Punjab Mandi", vendor_contact: "9876543210" },
      { id: "2", commodity: "Rice", price: 3500, unit: "quintal", location: "Andhra Pradesh, India", active: true, created_at: new Date().toISOString(), vendor_id: null, vendor_name: "Apex Traders", vendor_contact: "8765432109" },
      { id: "3", commodity: "Rice", price: 3200, unit: "quintal", location: "Telangana, India", active: true, created_at: new Date().toISOString(), vendor_id: null, vendor_name: "Reddy Agency", vendor_contact: "7654321098" },
      { id: "4", commodity: "Onion", price: 1800, unit: "quintal", location: "Maharashtra, India", active: true, created_at: new Date().toISOString(), vendor_id: null, vendor_name: "Nashik Exports", vendor_contact: "6543210987" },
      { id: "5", commodity: "Tomato", price: 25, unit: "kg", location: "Karnataka, India", active: true, created_at: new Date().toISOString(), vendor_id: null, vendor_name: "Kolar Mandi", vendor_contact: "5432109876" },
    ];

    return mockData.filter(p => {
      const matchComm = !commodity || p.commodity.toLowerCase().includes(commodity.toLowerCase());
      const matchLoc = !location || p.location.toLowerCase().includes(location.toLowerCase());
      return matchComm && matchLoc;
    });
  }
};
