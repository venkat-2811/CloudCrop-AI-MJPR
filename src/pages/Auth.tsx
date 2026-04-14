import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Loader2, User, Mail, Lock, MapPin, Phone, ArrowRight, Building } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { setToken } from "@/utils/authClient";
import type { PageProps } from "@/types/common";

const AuthPage = ({ selectedLang, texts, loading: externalLoading }: PageProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [type, setType] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetch("/api/vendor/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      const json = await res.json();
      setAvailableLocations(json.locations || []);
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
        const res = await fetch("/api/vendor/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName,
            location,
            phoneNumber,
            businessName,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = json?.error === "email_exists" ? "Email already exists" : "Signup failed";
          throw new Error(msg);
        }

        if (json?.token) setToken(json.token);

        toast({
          title: "Account Created",
          description: "Your vendor account has been created successfully!",
        });
      } else {
        const res = await fetch("/api/vendor/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = json?.error === "invalid_credentials" ? "Invalid email or password" : "Login failed";
          throw new Error(msg);
        }

        if (json?.token) setToken(json.token);

        toast({
          title: "Welcome Back!",
          description: "You have been logged in successfully.",
        });
      }
      
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error?.message || "An unexpected error occurred",
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
                  {type === "signup" ? (texts?.vendorSignUp || "Vendor Sign Up") : (texts?.vendorLogin || "Vendor Login")}
                </CardTitle>
                <CardDescription className="text-amber-800">
                  {type === "signup" 
                    ? (texts?.signUpDesc || "Create your vendor account to start listing prices") 
                    : (texts?.loginDesc || "Sign in to manage your commodity listings")}
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
                      <label className="text-sm font-medium text-amber-900">{texts?.businessName || "Business Name"}</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Your business or farm name"
                          className="pl-8"
                        />
                        <Building className="absolute left-3 top-2.5 h-5 w-5 text-amber-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-900">{texts?.phone || "Phone"}</label>
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
                      {type === "signup" ? (texts?.signUp || "Sign Up as Vendor") : (texts?.login || "Login")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                
                <p className="text-center text-sm text-amber-800">
                  {type === "signup" ? (
                    <>
                      {texts?.alreadyHaveAccount || "Already have an account?"}{" "}
                      <Button
                        variant="link"
                        onClick={() => setType("login")}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        {texts?.login || "Login"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {texts?.dontHaveAccount || "Don't have an account?"}{" "}
                      <Button
                        variant="link"
                        onClick={() => setType("signup")}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        {texts?.signUp || "Sign Up"}
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