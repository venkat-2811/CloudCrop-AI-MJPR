import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Weather from "./pages/Weather";
import Crops from "./pages/Crops";
import Auth from "./pages/Auth";
import Dashboard from "./pages/dashboard";
import Market from "./pages/MarketTrend";
import NotFound from "./pages/NotFound";
import Soils from "./pages/Soils";
import Sustainability from "./pages/Sustainability";
import YieldEstimation from "./pages/YieldEstimation";
import Advisor from "./pages/Advisor";
import VoiceAssistant from "./components/VoiceAssistant";
import { batchTranslateText } from "./utils/translate";

const queryClient = new QueryClient();



const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "ur", label: "اردو" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "as", label: "অসমীয়া" },
  { code: "sa", label: "संस्कृतम्" }
];

const defaultTexts = {
  weather: "Weather",
  dashboard: "Dashboard",
  logout: "Logout",
  sign_in: "Sign In",
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
  pageTitle: "Weather Insights for Farmers",
  pageSubtitle: "Get real-time weather updates for your farming decisions",
  searchPlaceholder: "Enter location (city, village, district)",
  searchButton: "Search",
  loading: "Loading...",
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
  smartFarmingAssistant: "Smart Farming Assistant",
  aiPoweredAnalysis: "AI-powered agricultural analysis and recommendations",
  enterLocation: "Enter location (e.g., Mumbai, Maharashtra)",
  analyze: "Analyze",
  analyzing: "Analyzing...",
  soilAnalysis: "Soil Analysis",
  soilAnalysisDesc: "Find common soil types in your location",
  soilSearchPlaceholder: "Enter location (city or country)",
  soilAnalyze: "Analyze",
  soilAnalyzing: "Analyzing...",
  soilAnalyzingLocation: "Analyzing soil types for",
  soilLocationRequired: "Location Required",
  soilLocationRequiredDesc: "Please enter a location to get soil data.",
  soilError: "Error",
  soilAvailableTypes: "Available Soil Types in",
  soilSelectType: "Select a soil type to see crop recommendations",
  cropRecommendations: "Crop Recommendations",
  marketTrends: "Market Trends",
  weatherConditions: "Weather Conditions",
  suitableCrops: "Suitable Crops",
  soilCharacteristics: "Soil Characteristics",
  soilType: "Soil Type",
  soilDescription: "Description",
  soilSelect: "Select",
  temperature: "Temperature",
  pressure: "Pressure",
  currentPrice: "Current Price",
  trend: "Trend",
  demandLevel: "Demand Level",
  step1: "Step 1: Select Soil Type",
  step2: "Step 2: View Analysis",
  soilInfo: {
    texture: "Soil Texture",
    ph: "pH Level",
    nutrients: "Nutrient Content",
    drainage: "Water Drainage",
    organic: "Organic Matter"
  }
};

const App = () => {
  const [selectedLang, setSelectedLang] = useState("en");
  const [texts, setTexts] = useState(defaultTexts);
  const [loading, setLoading] = useState(false);

  // Function to handle language change
  const handleLanguageChange = async (newLang: string) => {
    if (newLang === "en") {
      setTexts(defaultTexts);
      setSelectedLang(newLang);
      return;
    }

    setLoading(true);
    try {
      // Convert defaultTexts to array of objects with text property
      const textArray = [];
      const textMap = new Map(); // To keep track of original structure

      Object.entries(defaultTexts).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (typeof subValue === 'string') {
              textArray.push({
                key: `${key}.${subKey}`,
                text: subValue
              });
            }
          });
        } else if (typeof value === 'string') {
          textArray.push({
            key,
            text: value
          });
        }
      });

      const translatedTexts = await batchTranslateText(textArray, newLang);

      // Convert back to object structure
      const newTexts = { ...defaultTexts };
      translatedTexts.forEach(({ key, text }) => {
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          if (!newTexts[parent]) newTexts[parent] = {};
          newTexts[parent][child] = text;
        } else {
          newTexts[key] = text;
        }
      });

      setTexts(newTexts);
      setSelectedLang(newLang);
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback to English if translation fails
      setTexts(defaultTexts);
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
            <Route path="/" element={<Index selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/weather" element={<Weather selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/crops" element={<Crops selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/soils" element={<Soils selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/sustainability" element={<Sustainability selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/yield" element={<YieldEstimation selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/advisor" element={<Advisor selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="/Auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/market" element={<Market selectedLang={selectedLang} texts={texts} loading={loading} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <VoiceAssistant selectedLang={selectedLang} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
