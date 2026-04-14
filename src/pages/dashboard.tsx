import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { marketService, MarketPrice } from "@/services/marketService";
import { Loader2, Package, IndianRupee, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { fetchWithAuth } from "@/utils/authClient";



interface User {
  id: string;
  email?: string;
}

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const AgricultureVendorDashboard: React.FC = () => {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [commodity, setCommodity] = useState('');
  const [price, setPrice] = useState<number | string>('');
  const [unit, setUnit] = useState('kg');
  const [location, setLocation] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();

  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setIsAuthLoading(true);
        const res = await fetchWithAuth("/api/vendor/me");
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (!json?.vendor?.id) return;

        setUser({ id: json.vendor.id, email: json.vendor.email });
        fetchMarketPrices(json.vendor.id);
      } catch (error) {
        console.error('Error checking auth session:', error);
        showAlert('Authentication error. Please try logging in again.', 'error');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkUserSession();
    return;
  }, []);

  const fetchMarketPrices = async (userId: string) => {
    try {
      setLoading(true);
      // Fetch specifically with a timestamp to prevent browser caching (live data)
      const data = await marketService.getPrices();
      const vendorPrices = data.filter((p: MarketPrice) => p.vendor_id === userId);
      
      // Do not group by commodity, show all the vendor's active and inactive listings
      setMarketPrices(vendorPrices);
    } catch (error) {
      console.error('Error fetching market prices:', error);
      showAlert('Failed to load market prices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!user) {
      showAlert('Please sign in to add prices', 'warning');
      return;
    }

    if (!commodity || !price) {
      showAlert('Please fill in required fields (Commodity and Price)', 'warning');
      return;
    }

    try {
      const success = await marketService.addPrice({
        commodity,
        price: Number(price),
        unit,
        location,
        active,
        vendor_id: user.id
      });

      if (!success) throw new Error("Database insertion failed");
      
      // Refresh list
      fetchMarketPrices(user.id);
      clearForm();
      showAlert('Price entry added successfully!', 'success');
    } catch (error) {
      console.error('Error adding price:', error);
      showAlert('Failed to add price entry', 'error');
    }
  };

  const handleDeleteCommodity = async (commodityName: string) => {
    if (!user) return;

    try {
      const res = await fetchWithAuth("/api/market/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity: commodityName }),
      });
      if (!res.ok) throw new Error("delete_failed");

      setMarketPrices(marketPrices.filter(mp => mp.commodity !== commodityName));
      showAlert('Commodity deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting commodity:', error);
      showAlert('Failed to delete commodity', 'error');
    }
  };

  const clearForm = () => {
    setCommodity('');
    setPrice('');
    setUnit('kg');
    setLocation('');
    setActive(true);
  };

  const showAlert = (message: string, severity: AlertState['severity']) => {
    setAlert({ open: true, message, severity });
  };

  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 mt-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">Commodity Prices Dashboard</h1>
            <p className="text-lg text-amber-800 max-w-2xl mx-auto">Manage your commodity prices and market listings</p>
          </motion.div>

          {user ? (
            <>
              <Card className="w-full max-w-4xl mb-8">
                <CardHeader className="bg-amber-50">
                  <CardTitle className="text-2xl text-amber-900">Add New Price Entry</CardTitle>
                  <CardDescription className="text-amber-800">Enter details for your commodity listing</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">Commodity Name</label>
                      <Input
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        placeholder="Enter commodity name"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">Price</label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="Enter price"
                          className="w-full pl-8"
                        />
                        <IndianRupee className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">Unit</label>
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilogram (kg)</SelectItem>
                          <SelectItem value="g">Gram (g)</SelectItem>
                          <SelectItem value="ton">Ton</SelectItem>
                          <SelectItem value="quintal">Quintal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">Location</label>
                      <div className="relative">
                        <Input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Enter location"
                          className="w-full pl-8"
                        />
                        <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Switch
                      checked={active}
                      onCheckedChange={setActive}
                      id="active-listing"
                    />
                    <label htmlFor="active-listing" className="text-sm font-medium text-amber-900">
                      Active Listing
                    </label>
                  </div>
                  <Button 
                    onClick={handleAddPrice}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Add Price Entry
                  </Button>
                </CardContent>
              </Card>

              <Card className="w-full max-w-4xl">
                <CardHeader className="bg-amber-50">
                  <CardTitle className="text-2xl text-amber-900">Your Price Listings</CardTitle>
                  <CardDescription className="text-amber-800">Manage your current commodity listings</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                      <span className="ml-2 text-amber-900">Loading prices...</span>
                    </div>
                  ) : marketPrices.length === 0 ? (
                    <div className="text-center p-8 text-amber-800">
                      No price entries available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {marketPrices.map((entry) => (
                        <Card key={entry.id} className="border-amber-100">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Package className="h-8 w-8 text-amber-600" />
                                <div>
                                  <h3 className="font-semibold text-amber-900">{entry.commodity}</h3>
                                  <p className="text-sm text-amber-800">
                                    ₹{entry.price} / {entry.unit} • {entry.location}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  {entry.active ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  )}
                                  <span className="ml-2 text-sm text-amber-800">
                                    {entry.active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCommodity(entry.commodity)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-center text-amber-900">Please sign in to access the dashboard</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgricultureVendorDashboard;
