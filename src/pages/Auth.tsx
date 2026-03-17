import { useState, useEffect } from "react";
import { db } from "@/utils/dbClient"
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Loader2, User, Mail, Lock, MapPin, Phone, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [type, setType] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [locationInputType, setLocationInputType] = useState("select");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available locations when the component mounts
  useEffect(() => {
    if (type === "signup") {
      fetchLocations();
    }
  }, [type]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from('user_profiles')
        .select('location')
        .order('location');
        
      if (error) throw error;
      
      // Extract unique locations
      const uniqueLocations = Array.from(
        new Set(data?.map(item => item.location))
      ).filter(Boolean);
      
      setAvailableLocations(uniqueLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    setError(null);
    setIsLoading(true);
    
    // Validate location is provided for signup
    if (type === "signup" && !location.trim()) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Location is required to help farmers find you",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      if (type === "signup") {
        // First, create auth user
        const { data, error: authError } = await db.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              location: location,
              phone_number: phoneNumber,
            },
          },
        });
        
        if (authError) throw authError;
        
        // Then, ensure user profile exists
        if (data.user) {
          const { error: profileError } = await db
            .from('user_profiles')
            .upsert([
              { 
                id: data.user.id,
                name: fullName,
                location: location,
                phone: phoneNumber,
                role: 'vendor'
              }
            ]);
            
          if (profileError) throw profileError;
        }

        toast({
          title: "Account Created",
          description: "Your vendor account has been created successfully!",
        });
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;

        toast({
          title: "Welcome Back!",
          description: "You have been logged in successfully.",
        });
      }
      
      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocationInput = () => {
    setLocationInputType(prev => prev === "select" ? "custom" : "select");
    setLocation(""); // Clear location when switching input type
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mt-20"
          >
            <Card className="border-amber-100/50 backdrop-blur-md bg-white/70 shadow-xl">
              <CardHeader className="bg-amber-50/50 backdrop-blur-sm border-b border-amber-100/50">
                <CardTitle className="text-2xl text-amber-900">
                  {type === "signup" ? "Vendor Sign Up" : "Vendor Login"}
                </CardTitle>
                <CardDescription className="text-amber-800">
                  {type === "signup" 
                    ? "Create your vendor account to start listing prices" 
                    : "Sign in to manage your commodity listings"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-white/50 backdrop-blur-sm">
                {type === "signup" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">Full Name</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="pl-8"
                        />
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">
                        Location <span className="text-red-500">*</span>
                      </label>
                      
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-amber-800">
                          {locationInputType === "select" 
                            ? "Select from existing locations" 
                            : "Enter custom location"}
                        </span>
                        <Button
                          variant="link"
                          onClick={toggleLocationInput}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          {locationInputType === "select" 
                            ? "Enter custom location" 
                            : "Select from list"}
                        </Button>
                      </div>
                      
                      {locationInputType === "select" ? (
                        <Select value={location} onValueChange={setLocation} disabled={isLoading}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your location" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLocations.map((loc, index) => (
                              <SelectItem key={index} value={loc}>
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="relative">
                          <Input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City, District, State"
                            className="pl-8"
                          />
                          <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                        </div>
                      )}
                      <p className="text-sm text-amber-600">
                        Use format: "City, District, State" for best visibility
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">Phone Number</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Contact number for farmers"
                          className="pl-8"
                        />
                        <Phone className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-amber-900">Email</label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      className="pl-8"
                    />
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-amber-900">Password</label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="pl-8"
                    />
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                  </div>
                </div>
                
                <Button 
                  onClick={handleAuth}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {type === "signup" ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : (
                    <>
                      {type === "signup" ? "Sign Up as Vendor" : "Login"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                
                <p className="text-center text-sm text-amber-800">
                  {type === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <Button
                        variant="link"
                        onClick={() => setType("login")}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        Login
                      </Button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{" "}
                      <Button
                        variant="link"
                        onClick={() => setType("signup")}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        Sign Up
                      </Button>
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;