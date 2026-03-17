import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { marketService, MarketPrice } from "@/services/marketService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, MapPin, Calendar, IndianRupee, Phone, Building2 } from "lucide-react";
import { groqQuery } from "@/utils/groqApi";

interface MarketPriceSearchProps {
  selectedLang: string;
  texts?: any;
  loading?: boolean;
}

const defaultTexts = {
  pageTitle: "Agricultural Market Prices",
  pageSubtitle: "Find real-time market prices for agricultural commodities across India",
  commodityPlaceholder: "Search commodity (e.g., Wheat, Rice)",
  locationPlaceholder: "Location (District/State)",
  searchButton: "Search Prices",
  searching: "Searching...",
  noResults: "No matching prices found. Try different search terms.",
  price: "Price",
  updated: "Updated",
  vendorDetails: "Vendor Details",
  showContact: "Show Contact",
  hideContact: "Hide Contact",
  active: "Active",
  closed: "Closed",
  notAvailable: "Not available"
};

export default function MarketPriceSearch({ selectedLang, texts = defaultTexts, loading: externalLoading }: MarketPriceSearchProps) {
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

  const fetchMarketPrices = async () => {
    if (!commodity.trim() && !location.trim()) {
      setError("Please enter a commodity name or location to search");
      return;
    }

    setLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const data = await marketService.getPrices(commodity, location);
      setPrices(data);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-amber-900 mb-3 tracking-tight">{texts.pageTitle}</h1>
          <p className="text-lg text-amber-800 max-w-2xl mx-auto">{texts.pageSubtitle}</p>
        </div>

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
                  placeholder={texts.commodityPlaceholder}
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
                  placeholder={texts.locationPlaceholder}
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
              {loading ? texts.searching : texts.searchButton}
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {searchPerformed && prices.length === 0 ? (
            <div className="text-center bg-white rounded-xl shadow-lg p-8 text-lg text-gray-600">
              {loading ? texts.searching : texts.noResults}
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
                        {priceEntry.active ? texts.active : texts.closed}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="text-amber-900 font-medium flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{texts.price}</div>
                        <p className="text-lg font-bold text-amber-900">{formatCurrency(priceEntry.price)}/{priceEntry.unit}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="text-amber-900 font-medium flex items-center"><Calendar className="w-4 h-4 mr-1" />{texts.updated}</div>
                        <p className="text-lg font-bold text-amber-900">{new Date(priceEntry.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {(priceEntry.vendor_name || priceEntry.vendor_contact) && (
                      <div className="border-t pt-4">
                        <div className="flex items-center text-gray-600 mb-2"><Building2 className="w-4 h-4 mr-1" />{texts.vendorDetails}</div>
                        <Button variant="outline" onClick={() => toggleContact(priceEntry.id)} className="w-full text-amber-900 border-gray-300">
                          {showContacts[priceEntry.id] ? texts.hideContact : texts.showContact}
                        </Button>
                        {showContacts[priceEntry.id] && (
                          <div className="mt-3 text-sm bg-gray-50 p-3 rounded-lg space-y-2">
                            <div className="flex items-center font-bold text-amber-900">{priceEntry.vendor_name}</div>
                            <div className="flex items-center"><Phone className="w-4 h-4 mr-2" />{priceEntry.vendor_contact || texts.notAvailable}</div>
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
