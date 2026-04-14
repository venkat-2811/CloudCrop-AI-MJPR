import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { marketService, MarketPrice } from "@/services/marketService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, MapPin, Calendar, IndianRupee, Phone, Building2, Loader2, Sparkles } from "lucide-react";
import { groqQuery, groqJsonQuery } from "@/utils/groqApi";
import type { PageProps } from "@/types/common";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

const Sparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const trending = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-8 inline-block" preserveAspectRatio="none">
      <polyline fill="none" stroke={trending ? "#16a34a" : "#dc2626"} strokeWidth="2" points={points} />
    </svg>
  );
};

export default function MarketPriceSearch({ selectedLang, texts, loading: externalLoading }: PageProps) {
  const [commodity, setCommodity] = useState("");
  const [location, setLocation] = useState("");
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showContacts, setShowContacts] = useState<{ [key: string]: boolean }>({});
  const [commoditySuggestions, setCommoditySuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showCommoditySuggestions, setShowCommoditySuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const commodityInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  const [isAiEstimated, setIsAiEstimated] = useState(false);
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({});

  const fetchMarketPrices = async () => {
    if (!commodity.trim() && !location.trim()) {
      setError("Please enter a commodity name or location to search");
      return;
    }

    setLoading(true);
    setError(null);
    setSearchPerformed(true);
    setIsAiEstimated(false);
    setSparklineData({});

    try {
      const data = await marketService.getPrices(commodity, location);

      if (data.length === 0) {
        // AI fallback
        try {
          const aiData = await groqJsonQuery<any[]>(
            `Estimate current market prices for "${commodity || "common crops"}" in "${location || "India"}". Return a JSON array of objects: [{"commodity": "<name>", "price": <number INR per quintal>, "location": "<market location>", "trend": "up|down|stable"}]. Include 3-5 entries. Return ONLY valid JSON.`
          );
          if (Array.isArray(aiData) && aiData.length > 0) {
            const mapped: MarketPrice[] = aiData.map((item, idx) => ({
              id: `ai-${idx}`,
              commodity: item.commodity || commodity,
              price: item.price || 0,
              unit: "quintal",
              location: item.location || location,
              active: true,
              created_at: new Date().toISOString(),
              vendor_id: null,
            }));
            setPrices(mapped);
            setIsAiEstimated(true);
          } else {
            setPrices([]);
          }
        } catch {
          setPrices([]);
        }
      } else {
        setPrices(data);
      }

      // Generate sparkline data for each result
      try {
        const sparkPrompt = `Generate 7-day price trend data for commodities. Return a JSON object where keys are commodity names and values are arrays of 7 numbers (daily prices in INR). Commodities: ${commodity || "Wheat, Rice"}. Return ONLY valid JSON.`;
        const sparkData = await groqJsonQuery<Record<string, number[]>>(sparkPrompt);
        if (sparkData && typeof sparkData === "object") {
          setSparklineData(sparkData);
        }
      } catch {
        // sparkline is optional, don't fail
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch prices.");
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (priceId: string) => {
    setShowContacts(prev => ({ ...prev, [priceId]: !prev[priceId] }));
  };


  const handleCommoditySuggestionClick = (suggestion: string) => {
    setCommodity(suggestion);
    setShowCommoditySuggestions(false);
    fetchMarketPrices();
  };

  const handleLocationSuggestionClick = (suggestion: string) => {
    setLocation(suggestion);
    setShowLocationSuggestions(false);
    fetchMarketPrices();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commodityInputRef.current && !commodityInputRef.current.contains(event.target as Node)) {
        setShowCommoditySuggestions(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (commodity.length > 2) {
        try {
          const response = await groqQuery(
            `Suggest 5 relevant Indian crops for "${commodity}". Return only a comma-separated list, nothing else.`,
            "You are an Indian agriculture commodity suggestion system.",
            { temperature: 0.3, maxTokens: 50 }
          );
          const suggestions = response.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 5);
          setCommoditySuggestions(suggestions);
          setShowCommoditySuggestions(true);
        } catch {
          setCommoditySuggestions([]);
          setShowCommoditySuggestions(false);
        }
      } else {
        setCommoditySuggestions([]);
        setShowCommoditySuggestions(false);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [commodity]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (location.length > 2) {
        try {
          const response = await groqQuery(
            `Suggest 5 relevant Indian locations for "${location}". Return only a comma-separated list, nothing else.`,
            "You are an Indian location suggestion system.",
            { temperature: 0.3, maxTokens: 50 }
          );
          const suggestions = response.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 5);
          setLocationSuggestions(suggestions);
          setShowLocationSuggestions(true);
        } catch {
          setLocationSuggestions([]);
          setShowLocationSuggestions(false);
        }
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 font-sans">
      <div className="container mx-auto px-4 pt-32 pb-10">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-amber-900 mb-3 tracking-tight">{texts?.marketPageTitle || "Agricultural Market Prices"}</h1>
          <p className="text-lg text-amber-800 max-w-2xl mx-auto">{texts?.marketPageSubtitle || "Find real-time market prices for agricultural commodities across India"}</p>
        </div>

        {isAiEstimated && (
          <div className="max-w-2xl mx-auto mb-4">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">{texts?.aiEstimated || "AI Estimated"}</span> — No database records found. Showing AI-powered estimates.
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  ref={commodityInputRef}
                  type="text"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchMarketPrices()}
                  placeholder={texts?.commodityPlaceholder || "Search commodity (e.g., Wheat, Rice)"}
                  className="pl-10 bg-gray-50"
                />
                {showCommoditySuggestions && commoditySuggestions.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white rounded shadow z-50">
                    {commoditySuggestions.map((s, i) => (
                      <div key={i} onMouseDown={() => handleCommoditySuggestionClick(s)} className="px-4 py-2 cursor-pointer hover:bg-amber-50">
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  ref={locationInputRef}
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchMarketPrices()}
                  placeholder={texts?.locationPlaceholder || "Location (District/State)"}
                  className="pl-10 bg-gray-50"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white rounded shadow z-50">
                    {locationSuggestions.map((s, i) => (
                      <div key={i} onMouseDown={() => handleLocationSuggestionClick(s)} className="px-4 py-2 cursor-pointer hover:bg-amber-50">
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={fetchMarketPrices} disabled={loading} className="w-full mt-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold">
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />{texts?.searching || "Searching..."}</>) : (texts?.searchPrices || "Search Prices")}
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {searchPerformed && prices.length === 0 && !loading ? (
            <div className="text-center bg-white rounded-xl shadow-lg p-8 text-lg text-gray-600">
              {texts?.noResults || "No matching prices found. Try different search terms."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prices.map((priceEntry) => (
                <Card key={priceEntry.id} className="shadow-lg border-t-4 border-amber-600">
                  <CardContent className="p-6">
                    <div className="flex justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-amber-900">{priceEntry.commodity}</h3>
                        <div className="text-sm text-gray-600 flex items-center"><MapPin className="w-4 h-4 mr-1" />{priceEntry.location}</div>
                      </div>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${priceEntry.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {priceEntry.active ? (texts?.active || "Active") : (texts?.closed || "Closed")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="text-amber-900 font-medium flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{texts?.price || "Price"}</div>
                        <p className="text-lg font-bold text-amber-900">{formatCurrency(priceEntry.price)}/{priceEntry.unit}</p>
                        {sparklineData[priceEntry.commodity] && (
                          <Sparkline data={sparklineData[priceEntry.commodity]} />
                        )}
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="text-amber-900 font-medium flex items-center"><Calendar className="w-4 h-4 mr-1" />{texts?.updated || "Updated"}</div>
                        <p className="text-lg font-bold text-amber-900">{new Date(priceEntry.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {(priceEntry.vendor_name || priceEntry.vendor_contact) && (
                      <div className="border-t pt-4">
                        <div className="flex items-center text-gray-600 mb-2"><Building2 className="w-4 h-4 mr-1" />{texts?.vendorDetails || "Vendor Details"}</div>
                        <Button variant="outline" onClick={() => toggleContact(priceEntry.id)} className="w-full text-amber-900 border-gray-300">
                          {showContacts[priceEntry.id] ? (texts?.hideContact || "Hide Contact") : (texts?.showContact || "Show Contact")}
                        </Button>
                        {showContacts[priceEntry.id] && (
                          <div className="mt-3 text-sm bg-gray-50 p-3 rounded-lg space-y-2">
                            <div className="flex items-center font-bold text-amber-900">{priceEntry.vendor_name}</div>
                            <div className="flex items-center"><Phone className="w-4 h-4 mr-2" />{priceEntry.vendor_contact || (texts?.notAvailable || "Not available")}</div>
                            <div className="flex items-center"><MapPin className="w-4 h-4 mr-2" />{priceEntry.location}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
