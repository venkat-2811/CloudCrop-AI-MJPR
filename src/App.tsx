import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Weather from "./pages/Weather";
import Auth from "./pages/Auth";
import Market from "./pages/MarketTrend";
import NotFound from "./pages/NotFound";
import YieldEstimation from "./pages/YieldEstimation";
import Advisor from "./pages/Advisor";
import SmartTips from "./pages/SmartTips";
import VoiceAssistant from "./components/VoiceAssistant";
import { groqTranslate } from "./utils/groqApi";
import { getTranslationCache, setTranslationCache, getUserProfile, saveUserProfile } from "./utils/userProfile";

const queryClient = new QueryClient();

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ml", label: "മലയാളം" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "as", label: "অসমীয়া" },
  { code: "ur", label: "اردو" },
  { code: "bho", label: "भोजपुरी" },
];

export const defaultTexts: Record<string, string> = {
  // Global
  weather: "Weather",
  dashboard: "Dashboard",
  logout: "Logout",
  sign_in: "Sign In",
  loading: "Loading...",
  error: "Error",
  retry: "Retry",
  cancel: "Cancel",
  confirm: "Confirm",
  close: "Close",
  submit: "Submit",
  search: "Search",

  // Home / Dashboard
  welcome: "Welcome to CloudCrop AI",
  subtitle: "Your farming friend - helping you grow better crops and make smarter decisions",
  weather_watch: "Weather Watch",
  weather_watch_desc: "Get daily weather updates and forecasts for your farm.",
  smart_crop_guide: "Smart Crop Guide",
  smart_crop_guide_desc: "Find the best crops to grow based on your soil and climate.",
  farm_smart_tips: "Farm Smart Tips",
  farm_smart_tips_desc: "Learn simple ways to make your farm more eco-friendly.",
  market_watch: "Market Watch",
  market_watch_desc: "See what crops are selling best in your area.",
  yield_estimation: "Yield Estimation",
  yield_estimation_desc: "Predict your harvest based on soil and weather data.",
  ai_advisor: "AI Advisor",
  ai_advisor_desc: "Chat with our expert AI for personalized farming advice.",
  footer: "Made for farmers, by farmers. Simple tools for better farming.",

  // Weather
  pageTitle: "Weather Insights for Farmers",
  pageSubtitle: "Get real-time weather updates for your farming decisions",
  searchPlaceholder: "Enter location (city, village, district)",
  searchButton: "Search",
  currentWeather: "Current Weather",
  forecast: "5-Day Forecast",
  poll: "Local Opinion",
  feelsLike: "Feels Like",
  humidity: "Humidity",
  windSpeed: "Wind Speed",
  hourlyForecast: "Today's Hourly Forecast",
  noRain: "No rain",
  rain: "rain",
  farmingAdvisory: "Farming Weather Advisory",
  forecastTitle: "5-Day Weather Forecast",
  forecastDescription: "Extended forecast to help plan your farming activities",
  pollTitle: "Local Weather Opinion Poll",
  pollDescription: "Help us improve forecasts by sharing if today's prediction matches your local experience",
  pollQuestion: "Is today's weather forecast accurate for your location?",
  yesAccurate: "Yes, it's accurate",
  noDifferent: "No, it's different",
  communityResults: "Community Results",
  farmersShared: "farmers have shared their opinion",
  accurate: "Accurate",
  inaccurate: "Inaccurate",
  votes: "votes",
  getStartedTitle: "Enter a location to get started",
  getStartedDescription: "Search for your village, town, or city to see weather information",

  // Market
  marketPageTitle: "Agricultural Market Prices",
  marketPageSubtitle: "Find real-time market prices for agricultural commodities across India",
  commodityPlaceholder: "Search commodity (e.g., Wheat, Rice)",
  locationPlaceholder: "Location (District/State)",
  searchPrices: "Search Prices",
  searching: "Searching...",
  noResults: "No matching prices found. Try different search terms.",
  price: "Price",
  updated: "Updated",
  vendorDetails: "Vendor Details",
  showContact: "Show Contact",
  hideContact: "Hide Contact",
  active: "Active",
  closed: "Closed",
  notAvailable: "Not available",
  aiEstimated: "AI Estimated",

  // Yield
  yieldPageTitle: "Crop Yield Estimation",
  yieldPageSubtitle: "AI-powered yield prediction using soil, weather, and historical data",
  enterFarmDetails: "Enter Farm Details",
  farmDetailsDesc: "Provide your farm information for accurate yield estimation",
  location: "Location",
  crop: "Crop",
  soilType: "Soil Type",
  areaHectares: "Area (hectares)",
  estimateYield: "Estimate Yield",
  estimatingYield: "Estimating Yield...",
  predictedYield: "Predicted Yield",
  historicalAvg: "Historical Average",
  modelConfidence: "Model Confidence",
  aiRecommendation: "AI Recommendation",
  weatherConditions: "Weather Conditions",
  yieldFactors: "Yield Factors",

  // Advisor
  advisorTitle: "AI Agricultural Advisor",
  advisorSubtitle: "Ask anything about farming — crops, weather, markets, soil, or tips",
  askPlaceholder: "Ask about crops, weather, market prices...",
  clearChat: "Clear Chat",
  clearChatConfirm: "Are you sure you want to clear the chat history?",

  // Smart Tips
  smartTipsTitle: "Smart Crop Guide & Farm Tips",
  smartTipsSubtitle: "Get personalized crop recommendations based on your region and season",
  region: "Region",
  season: "Season",
  getTips: "Get Smart Tips",
  gettingTips: "Getting Tips...",
  topCrops: "Top Recommended Crops",
  farmingTips: "Farming Tips",
  warnings: "Warnings",
  getFullAdvisory: "Get Full Advisory",
  expectedYield: "Expected Yield",
  marketDemand: "Market Demand",
  waterRequirement: "Water Requirement",
  growingDays: "Growing Days",

  // Auth
  vendorSignUp: "Vendor Sign Up",
  vendorLogin: "Vendor Login",
  signUpDesc: "Create your vendor account to start listing prices",
  loginDesc: "Sign in to manage your commodity listings",
  fullName: "Full Name",
  email: "Email",
  password: "Password",
  phone: "Phone",
  businessName: "Business Name",
  signUp: "Sign Up as Vendor",
  login: "Login",
  alreadyHaveAccount: "Already have an account?",
  dontHaveAccount: "Don't have an account?",
};

const App = () => {
  const [selectedLang, setSelectedLang] = useState("en");
  const [texts, setTexts] = useState<Record<string, string>>(defaultTexts);
  const [loading, setLoading] = useState(false);

  // On app load, read profile and restore language
  useEffect(() => {
    const profile = getUserProfile();
    if (profile.language && profile.language !== "en") {
      handleLanguageChange(profile.language);
    }
  }, []);

  const handleLanguageChange = async (newLang: string) => {
    if (newLang === "en") {
      setTexts(defaultTexts);
      setSelectedLang(newLang);
      saveUserProfile({ language: "en" });
      return;
    }

    // Check localStorage cache first
    const cached = getTranslationCache(newLang);
    const expectedKeyCount = Object.keys(defaultTexts).length;

    if (cached && Object.keys(cached).length === expectedKeyCount) {
      setTexts(cached);
      setSelectedLang(newLang);
      saveUserProfile({ language: newLang });
      return;
    }

    // Clear stale cache with mismatched keys
    if (cached) {
      try {
        localStorage.removeItem(`cloudcrop_translations_${newLang}`);
      } catch {}
    }

    setLoading(true);
    try {
      const keys = Object.keys(defaultTexts);
      const values = Object.values(defaultTexts);

      const translated = await groqTranslate(values, newLang);

      // Count how many strings were actually translated (differ from originals)
      let translatedCount = 0;
      const newTexts: Record<string, string> = {};
      keys.forEach((key, i) => {
        const val = translated[i];
        if (val && typeof val === "string" && val.trim()) {
          newTexts[key] = val;
          if (val !== defaultTexts[key]) translatedCount++;
        } else {
          newTexts[key] = defaultTexts[key];
        }
      });

      setTexts(newTexts);
      setSelectedLang(newLang);
      saveUserProfile({ language: newLang });

      // Only cache if we actually got meaningful translations (at least 50% changed)
      if (translatedCount > expectedKeyCount * 0.5) {
        setTranslationCache(newLang, newTexts);
      }
    } catch (error) {
      console.error("Translation error:", error);
      // Keep the current language but show English texts as fallback
      setTexts(defaultTexts);
      setSelectedLang(newLang);
      saveUserProfile({ language: newLang });
    } finally {
      setLoading(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation
            selectedLang={selectedLang}
            setSelectedLang={handleLanguageChange}
            texts={texts}
            loading={loading}
            languages={languages}
          />
          <Routes>
            <Route path="/" element={<Index selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="/weather" element={<Weather selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="/market" element={<Market selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="/advisor" element={<Advisor selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="/yield" element={<YieldEstimation selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="/auth" element={<Auth selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="/smart-tips" element={<SmartTips selectedLang={selectedLang} texts={texts} handleLanguageChange={handleLanguageChange} loading={loading} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <VoiceAssistant selectedLang={selectedLang} texts={texts} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
