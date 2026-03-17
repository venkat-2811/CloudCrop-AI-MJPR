import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { groqJsonQuery } from "@/utils/groqApi";

// API keys
const WEATHER_API_KEY = "72cb03ddb9cc38658bd51e4b865978ff";

interface SoilOption {
  id: string;
  name: string;
  description: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
  icon: string;
  windSpeed: number;
  pressure: number;
}

const textContent = {
  pageTitle: "soilAnalysis",
  pageSubtitle: "soilAnalysisDesc",
  searchPlaceholder: "soilSearchPlaceholder",
  analyze: "soilAnalyze",
  analyzing: "soilAnalyzing",
  analyzingLocation: "soilAnalyzingLocation",
  locationRequired: "soilLocationRequired",
  locationRequiredDesc: "soilLocationRequiredDesc",
  error: "soilError",
  availableSoilTypes: "soilAvailableTypes",
  selectSoilType: "soilSelectType",
  soilCharacteristics: "soilCharacteristics",
  soilType: "soilType",
  soilDescription: "soilDescription",
  select: "soilSelect"
};

const SoilAnalysis = ({ selectedLang, texts, loading: externalLoading }) => {
  const [location, setLocation] = useState("");
  const [availableSoilTypes, setAvailableSoilTypes] = useState<SoilOption[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [locationFound, setLocationFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper to get translated text from props or fallback
  const getText = (key) => {
    if (texts && texts[key]) return texts[key];
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      return (texts && texts[parent] && texts[parent][child]) || textContent[parent][child] || key;
    }
    return textContent[key] || key;
  };

  useEffect(() => {
    // Restore last searched location from localStorage
    const lastLocation = localStorage.getItem("lastLocationCrops");
    if (lastLocation) {
      setLocation(lastLocation);
    }
  }, []);

  // Fetch initial data when user submits location
  const fetchInitialData = async () => {
    if (!location.trim()) {
      toast({
        title: getText('locationRequired'),
        description: getText('locationRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAvailableSoilTypes([]);
      
      // First, get weather data
      const weatherResult = await fetchWeatherData(location);
      
      // Then, get available soil types for this location
      await fetchAvailableSoilTypes(location);
      
      setLocationFound(true);
      localStorage.setItem("lastLocationCrops", location);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError("Failed to fetch data for this location. Please try again or check the location name.");
      toast({
        title: getText('error'),
        description: error instanceof Error ? error.message : "Failed to fetch location data",
        variant: "destructive",
      });
      setLocationFound(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available soil types for the location from Gemini API
  const fetchAvailableSoilTypes = async (location: string) => {
    try {
      const prompt = `Based on the geographic location ${location} in India, provide a JSON array of common soil types found in this region. 
                    Include at least 3-5 soil types with these fields for each: 
                    id (a short identifier), name (the soil type name), and description (brief characteristics of the soil).
                    Return ONLY a raw JSON array.`;
      
      const soilTypesJson = await groqJsonQuery<SoilOption[]>(prompt);
      setAvailableSoilTypes(soilTypesJson);
    } catch (error) {
      console.error("Error fetching soil types:", error);
      throw new Error("Unable to retrieve soil types for this location");
    }
  };

  // Fetch weather data from OpenWeather API
  const fetchWeatherData = async (locationQuery: string) => {
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationQuery)}&appid=${WEATHER_API_KEY}&units=metric`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Location not found. Please check the spelling and try again.");
        }
        throw new Error(`Weather API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      const weatherData = {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        conditions: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure
      };
      
      setWeatherData(weatherData);
      return weatherData;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      throw error;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchInitialData();
    }
  };

  // Handle soil type selection and redirect to crop recommendation page
  const handleSoilTypeSelect = (soil: SoilOption) => {
    // Navigate to crop recommendation page with params
    navigate('/crop-recommendation', {
      state: { 
        location, 
        soilId: soil.id,
        soilName: soil.name,
        soilDescription: soil.description,
        weatherData: weatherData ? JSON.stringify(weatherData) : null
      }
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gradient-to-b from-white to-green-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tighter mb-2 sm:text-4xl md:text-5xl">{getText('pageTitle')}</h1>
            <p className="text-gray-500 md:text-xl">{getText('pageSubtitle')}</p>
          </motion.div>

          <div className="w-full max-w-md mb-8">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder={getText('searchPlaceholder')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={fetchInitialData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? getText('analyzing') : getText('analyze')}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-500">{getText('analyzingLocation')} {location}...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center bg-red-50 text-red-800 p-4 rounded-lg mb-6 w-full max-w-4xl">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {locationFound && !loading && availableSoilTypes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl"
            >
              <Card>
                <CardHeader className="bg-primary text-white">
                  <CardTitle>{getText('availableSoilTypes')} {location}</CardTitle>
                  <CardDescription className="text-white/90">
                    {getText('selectSoilType')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid gap-4">
                    {availableSoilTypes.map((soil) => (
                      <Card key={soil.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSoilTypeSelect(soil)}>
                        <CardHeader>
                          <CardTitle className="text-lg">{soil.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600">{soil.description}</p>
                          <Button className="mt-4" variant="outline">
                            {getText('select')}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoilAnalysis;