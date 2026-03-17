import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Leaf, Search, AlertTriangle, Cloud, Droplets, Thermometer, Wind, BarChart2, X, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { batchTranslateText, translateText } from "../utils/translate";
import { useLocation } from "react-router-dom";

import { groqJsonQuery, groqQuery } from "@/utils/groqApi";

interface CropRecommendation {
  crop: string;
  suitability: string;
  description: string;
  marketPotential?: string;
  riskFactors?: string[];
}

interface SoilData {
  type: string;
  characteristics: string;
  suitableCrops: string[];
}

interface SoilOption {
  id: string;
  name: string;
  description: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
  windSpeed: number;
  pressure: number;
  validLocation: boolean;
}

interface MarketTrend {
  crop: string;
  currentPrice: string;
  trend: string;
  demandLevel: string;
}

interface HistoricalData {
  previousYearYield: string;
  commonIssues: string[];
  successRate: string;
}

const textContent = {
  pageTitle: "Smart Farming Assistant",
  pageSubtitle: "AI-powered agricultural analysis and recommendations",
  searchPlaceholder: "Enter location (e.g., Mumbai, Maharashtra)",
  searchButton: "Analyze",
  loading: "Analyzing...",
  soilAnalysis: "Soil Analysis",
  cropRecommendations: "Crop Recommendations",
  marketTrends: "Market Trends",
  weatherConditions: "Weather Conditions",
  suitableCrops: "Suitable Crops",
  characteristics: "Soil Characteristics",
  temperature: "Temperature",
  humidity: "Humidity",
  windSpeed: "Wind Speed",
  pressure: "Pressure",
  currentPrice: "Current Price",
  trend: "Trend",
  demandLevel: "Demand Level",
  getStartedTitle: "Enter a location to get started",
  getStartedDescription: "Search for your village, town, or city to see crop recommendations",
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

const uiTextKeys = [
  "pageTitle_crops",
  "pageSubtitle_crops",
  "searchPlaceholder",
  "searchButton",
  "loading",
  "soilAnalysis",
  "cropRecommendations",
  "marketTrends",
  "weatherConditions",
  "suitableCrops",
  "characteristics",
  "temperature",
  "humidity",
  "windSpeed",
  "pressure",
  "currentPrice",
  "trend",
  "demandLevel",
  "getStartedTitle",
  "getStartedDescription",
  "step1",
  "step2"
];

const uiTextDefaults = {
  pageTitle_crops: "Smart Farming Assistant",
  pageSubtitle_crops: "AI-powered agricultural analysis and recommendations",
  searchPlaceholder: "Enter location (e.g., Mumbai, Maharashtra)",
  searchButton: "Analyze",
  loading: "Analyzing...",
  soilAnalysis: "Soil Analysis",
  cropRecommendations: "Crop Recommendations",
  marketTrends: "Market Trends",
  weatherConditions: "Weather Conditions",
  suitableCrops: "Suitable Crops",
  characteristics: "Soil Characteristics",
  temperature: "Temperature",
  humidity: "Humidity",
  windSpeed: "Wind Speed",
  pressure: "Pressure",
  currentPrice: "Current Price",
  trend: "Trend",
  demandLevel: "Demand Level",
  getStartedTitle: "Enter a location to get started",
  getStartedDescription: "Search for your village, town, or city to see crop recommendations",
  step1: "Step 1: Select Soil Type",
  step2: "Step 2: View Analysis"
};

const Crops = ({ selectedLang, texts, loading: externalLoading }) => {
  const location = useLocation();
  const [locationInput, setLocationInput] = useState("");
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [cropRecommendations, setCropRecommendations] = useState<CropRecommendation[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [availableSoilTypes, setAvailableSoilTypes] = useState<SoilOption[]>([]);
  const [selectedSoilType, setSelectedSoilType] = useState<string>("");
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [locationFound, setLocationFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isSoilSectionCollapsed, setIsSoilSectionCollapsed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uiTexts, setUiTexts] = useState(uiTextDefaults);

  // Handle incoming soil selection data
  useEffect(() => {
    if (location.state) {
      const { location: selectedLocation, soilId, soilName, soilDescription, weatherData: incomingWeatherData } = location.state;
      
      // Set location
      setLocationInput(selectedLocation);
      
      // Set weather data if available
      if (incomingWeatherData) {
        try {
          const parsedWeatherData = JSON.parse(incomingWeatherData);
          setWeatherData(parsedWeatherData);
        } catch (error) {
          console.error('Error parsing weather data:', error);
        }
      }

      // Create soil option from incoming data
      const soilOption: SoilOption = {
        id: soilId,
        name: soilName,
        description: soilDescription
      };

      // Set available soil types and selected soil
      setAvailableSoilTypes([soilOption]);
      setSelectedSoilType(soilId);
      setIsSoilSectionCollapsed(true);

      // Fetch soil data and crop recommendations
      fetchSoilData(soilId);
    }
  }, [location.state]);

  useEffect(() => {
    resetState();
  }, []);

  // Translate UI text on language change
  useEffect(() => {
    const translateUiText = async () => {
      if (!selectedLang || selectedLang === "en") {
        setUiTexts(uiTextDefaults);
        return;
      }
      const textsToTranslate = uiTextKeys.map(key => ({ text: uiTextDefaults[key] }));
      const translated = await batchTranslateText(
        textsToTranslate,
        selectedLang
      );
      const newUiTexts = { ...uiTextDefaults };
      uiTextKeys.forEach((key, i) => {
        newUiTexts[key] = translated[i]?.text || uiTextDefaults[key];
      });
      setUiTexts(newUiTexts);
    };
    translateUiText();
    // eslint-disable-next-line
  }, [selectedLang]);

  // Helper to get translated text from props or fallback
  const getText = (key) => {
    if (texts && texts[key]) return texts[key];
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      return (texts && texts[parent] && texts[parent][child]) || textContent[parent][child] || key;
    }
    return uiTexts[key] || textContent[key] || key;
  };

  const fetchGeminiData = async <T,>(prompt: string): Promise<T> => {
    try {
      const languageInstruction = selectedLang ? `Respond in ${selectedLang} language.` : '';
      const fullPrompt = `${prompt}\n${languageInstruction}`;
      return await groqJsonQuery<T>(fullPrompt);
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  // Helper to batch translate an array of objects
  const batchTranslateFields = async (items, fields, lang) => {
    if (!lang || lang === 'en' || !items || !items.length) return items;
    const textsToTranslate = [];
    items.forEach(item => {
      fields.forEach(field => {
        if (Array.isArray(item[field])) {
          item[field].forEach(val => textsToTranslate.push({ text: val }));
        } else {
          textsToTranslate.push({ text: item[field] });
        }
      });
    });
    let translated = [];
    try {
      translated = await batchTranslateText(textsToTranslate, lang);
    } catch (e) {
      translated = textsToTranslate;
    }
    let idx = 0;
    return items.map(item => {
      const newItem = { ...item };
      fields.forEach(field => {
        if (Array.isArray(item[field])) {
          newItem[field] = item[field].map(() => translated[idx++]?.text || '');
        } else {
          newItem[field] = translated[idx++]?.text || item[field];
        }
      });
      return newItem;
    });
  };

  // Helper to batch translate a single object
  const batchTranslateObjectFields = async (obj, fields, lang) => {
    if (!lang || lang === 'en' || !obj) return obj;
    const textsToTranslate = fields.map(field => obj[field]);
    let translated = [];
    try {
      translated = await batchTranslateText(textsToTranslate.map(text => ({ text })), lang);
    } catch (e) {
      translated = textsToTranslate;
    }
    const newObj = { ...obj };
    fields.forEach((field, i) => {
      newObj[field] = translated[i]?.text || obj[field];
    });
    return newObj;
  };

  const fetchWeatherData = async (location: string) => {
    try {
      const prompt = `You are a weather data API. For the location "${location}", return ONLY a JSON object with the following structure, with no additional text or formatting:
      {
        "temperature": number,
        "humidity": number,
        "conditions": string,
        "windSpeed": number,
        "pressure": number,
        "validLocation": boolean
      }
      If the location is invalid, set validLocation to false. For valid locations, provide realistic weather data.`;
      
      let weather = await fetchGeminiData<WeatherData>(prompt);
      if (selectedLang && selectedLang !== 'en' && weather && weather.conditions) {
        const translated = await batchTranslateText([{ text: weather.conditions }], selectedLang);
        weather.conditions = translated[0]?.text || weather.conditions;
      }
      if (!weather.validLocation) {
        throw new Error("Location not found");
      }
      setWeatherData(weather);
      return true;
    } catch (error) {
      setLocationFound(false);
      throw error;
    }
  };

  const fetchAvailableSoilTypes = async (location: string) => {
    const prompt = `You are a soil data API. For the location "${location}", return ONLY a JSON array of soil types with the following structure, with no additional text or formatting:
    [
      {
        "id": string,
        "name": string,
        "description": string
      }
    ]
    Include 5 main soil types found in this region. Keep the response as a clean JSON array.`;
    
    const soils = await fetchGeminiData<SoilOption[]>(prompt);

    // Prepare texts for translation: both name and description for each soil
    const textsToTranslate = [];
    soils.forEach(soil => {
      textsToTranslate.push({ text: soil.name });
      textsToTranslate.push({ text: soil.description });
    });

    // Translate using batchTranslateText
    let translated = [];
    try {
      translated = await batchTranslateText(textsToTranslate, selectedLang);
    } catch (e) {
      // fallback to original if translation fails
      translated = textsToTranslate;
    }

    // Map translations back to soil objects
    const translatedSoils = soils.map((soil, idx) => ({
      ...soil,
      name: translated[idx * 2]?.text || soil.name,
      description: translated[idx * 2 + 1]?.text || soil.description,
    }));

    setAvailableSoilTypes(translatedSoils);
  };

  const fetchMarketTrends = async (location: string) => {
    const prompt = `Provide current agricultural market trends for ${location} as JSON array with:
                  crop, currentPrice, trend (Increasing/Decreasing/Stable), demandLevel (High/Medium/Low)`;
    
    let trends = await fetchGeminiData<MarketTrend[]>(prompt);
    if (selectedLang && selectedLang !== 'en') {
      trends = await batchTranslateFields(
        trends,
        ['crop', 'currentPrice', 'trend', 'demandLevel'],
        selectedLang
      );
    }
    setMarketTrends(trends);
  };

  const fetchHistoricalData = async (location: string) => {
    const prompt = `Provide agricultural historical data for ${location} as JSON with:
                  previousYearYield (%), commonIssues (array), successRate (%)`;
    
    let history = await fetchGeminiData<HistoricalData>(prompt);
    if (selectedLang && selectedLang !== 'en' && history) {
      history = await batchTranslateObjectFields(
        history,
        ['previousYearYield', 'successRate'],
        selectedLang
      );
      if (history.commonIssues && Array.isArray(history.commonIssues)) {
        const translated = await batchTranslateText(history.commonIssues.map(text => ({ text })), selectedLang);
        history.commonIssues = translated.map(t => t.text);
      }
    }
    setHistoricalData(history);
  };

  const fetchSoilData = async (soilTypeId: string) => {
    try {
      setLoading(true);
      const soil = availableSoilTypes.find(s => s.id === soilTypeId);
      if (!soil) throw new Error("Soil type not found");

      const prompt = `Provide detailed analysis of ${soil.name} soil in ${locationInput} as JSON with:
                    type (full soil name), 
                    characteristics (detailed description),
                    suitableCrops (array of 5-7 crop names).
                    Format: {
                      "type": "...",
                      "characteristics": "...",
                      "suitableCrops": ["crop1", "crop2"]
                    }`;
      
      const soilInfo = await fetchGeminiData<SoilData>(prompt);
      
      if (!soilInfo.type || !soilInfo.characteristics || !Array.isArray(soilInfo.suitableCrops)) {
        throw new Error("Invalid soil data format received");
      }

      setSoilData(soilInfo);
      
      if (weatherData) {
        await fetchCropRecommendations(soilInfo, weatherData);
      }
    } catch (error) {
      console.error("Soil data error:", error);
      handleError(error);
      setSoilData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCropRecommendations = async (soil: SoilData, weather: WeatherData) => {
    const prompt = `Generate crop recommendations for ${locationInput} with:
                  Soil: ${soil.type} (${soil.characteristics})
                  Weather: ${weather.temperature}°C, ${weather.conditions}
                  Market Trends: ${JSON.stringify(marketTrends)}
                  Historical Data: ${JSON.stringify(historicalData)}

                  Respond in JSON array with fields:
                  crop, suitability (High/Medium/Low), description,
                  marketPotential, riskFactors (array)`;

    let recommendations = await fetchGeminiData<CropRecommendation[]>(prompt);
    if (selectedLang && selectedLang !== 'en') {
      recommendations = await batchTranslateFields(
        recommendations,
        ['crop', 'suitability', 'description', 'marketPotential', 'riskFactors'],
        selectedLang
      );
    }
    setCropRecommendations(recommendations);
  };

  const fetchInitialData = async () => {
    if (!locationInput.trim()) {
      toast({ title: "Location Required", description: "Please enter a location", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      resetState();

      const isValidLocation = await fetchWeatherData(locationInput);
      if (!isValidLocation) return;

      await Promise.all([
        fetchAvailableSoilTypes(locationInput),
        fetchMarketTrends(locationInput),
        fetchHistoricalData(locationInput)
      ]);

      setLocationFound(true);
      localStorage.setItem("lastLocationCrops", locationInput);
    } catch (error) {
      handleError(error);
      setLocationFound(false);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSoilData(null);
    setCropRecommendations([]);
    setAvailableSoilTypes([]);
    setSelectedSoilType("");
    setMarketTrends([]);
    setHistoricalData(null);
    setError(null);
  };

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Failed to fetch data";
    setError(message);
    toast({
      title: "Error",
      description: message.includes("Location") ? "Invalid location. Please check and try again." : message,
      variant: "destructive"
    });
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increasing': return 'bg-green-100 text-green-800';
      case 'decreasing': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSuitabilityColor = (suitability: string) => {
    switch (suitability.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const clearSearch = () => {
    setLocationInput("");
    resetState();
    setLocationFound(false);
    setError(null);
  };

  // Helper to extract points from soil description (simple split, fallback to generic points)
  const getSoilPoints = (soil: SoilOption) => {
    if (soil.description) {
      // Try to split by common delimiters
      const points = soil.description.split(/[.;•\n\-]/).map(p => p.trim()).filter(Boolean);
      if (points.length > 1) return points.slice(0, 5);
    }
    // Fallback generic points
    return [
      'Color: Typical for this soil',
      'Texture: See above',
      'Fertility: Moderate',
      'Drainage: Good',
      'Organic matter: Medium',
    ];
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    console.log('Selected suggestion:', suggestion);
    // Force update the input value
    const input = inputRef.current;
    if (input) {
      input.value = suggestion;
    }
    // Update state
    setLocationInput(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    // Fetch initial data instead of soil data directly
    fetchInitialData();
  };

  // Handle user typing in the location search
  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocationInput(value);
  };

  // Handle keyboard events
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      fetchInitialData();
    }
  };

  // Add click outside handler to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add debounce to prevent too many API calls
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (locationInput.length > 2) {
        try {
          const response = await groqQuery(
            `Given the partial location "${locationInput}", suggest 5 most relevant Indian city/town/village names. Return ONLY a comma-separated list, nothing else.`,
            "You are a location suggestion system for India.",
            { temperature: 0.3, maxTokens: 50 }
          );
          
          const suggestionsList = response
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .slice(0, 5);
          
          if (suggestionsList.length > 0) {
            setSuggestions(suggestionsList);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300); // 300ms delay
    return () => clearTimeout(timer);
  }, [locationInput]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-8">
          <div className="text-center mb-12 mt-12">
            <h1 className="text-4xl md:text-5xl font-bold text-green-900 mb-4">{getText('pageTitle_crops')}</h1>
            <p className="text-lg text-green-800 max-w-2xl mx-auto">{getText('pageSubtitle_crops')}</p>
          </div>

          <div className="w-full max-w-md mb-6 relative">
            <div className="flex w-full items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={getText('searchPlaceholder')}
                  value={locationInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full pr-10"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-green-100 max-h-60 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="w-full text-left px-4 py-3 hover:bg-green-50 cursor-pointer text-green-900 border-b border-green-100 last:border-b-0 flex items-center"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(suggestion);
                        }}
                      >
                        <Search className="h-4 w-4 mr-2 text-green-600" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => {
                  setShowSuggestions(false);
                  fetchInitialData();
                }} 
                disabled={loading} 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {getText('loading')}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {getText('searchButton')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
              <p className="text-green-800">{getText('loading')} {locationInput}...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center bg-red-50 text-red-800 p-4 rounded-lg mb-6 w-full max-w-4xl">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {locationFound && !loading && availableSoilTypes.length > 0 && (
            <div className="w-full max-w-4xl mb-8">
              <div className="overflow-hidden rounded-2xl shadow-lg border border-green-100 bg-white/90">
                <div className="h-3 w-full bg-gradient-to-r from-green-500 to-emerald-600" />
                <CardHeader className="bg-green-50 text-green-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{getText('step1')}</CardTitle>
                      <CardDescription className="text-green-800/90">Choose your farm's soil type to get started</CardDescription>
                    </div>
                    {selectedSoilType && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSoilSectionCollapsed(!isSoilSectionCollapsed)}
                        className="text-green-700 hover:text-green-800"
                      >
                        {isSoilSectionCollapsed ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronUp className="h-5 w-5" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {(!isSoilSectionCollapsed || !selectedSoilType) && (
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {availableSoilTypes.map((soil) => (
                        <div 
                          key={soil.id} 
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            selectedSoilType === soil.id 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-green-100 hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            <input
                              type="radio"
                              id={soil.id}
                              name="soilType"
                              value={soil.id}
                              checked={selectedSoilType === soil.id}
                              onChange={() => {
                                setSelectedSoilType(soil.id);
                                fetchSoilData(soil.id);
                                setIsSoilSectionCollapsed(true);
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <label htmlFor={soil.id} className="font-medium text-green-900 text-lg">
                                  {soil.name}
                                </label>
                                {selectedSoilType === soil.id && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                              </div>
                              <div className="mt-3 space-y-2">
                                {getSoilPoints(soil).map((point, idx) => (
                                  <div key={idx} className="flex items-center space-x-2 text-green-800">
                                    {idx === 0 && <Droplets className="h-4 w-4 text-green-600" />} {/* Color/Texture */}
                                    {idx === 1 && <Thermometer className="h-4 w-4 text-green-600" />} {/* pH/Temp */}
                                    {idx === 2 && <Leaf className="h-4 w-4 text-green-600" />} {/* Nutrients */}
                                    {idx === 3 && <Cloud className="h-4 w-4 text-green-600" />} {/* Drainage */}
                                    {idx === 4 && <BarChart2 className="h-4 w-4 text-green-600" />} {/* Organic matter */}
                                    <span className="text-sm">{point}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </div>
            </div>
          )}

          {soilData && !loading && (
            <div className="w-full max-w-4xl">
              <div className="mb-4 text-center">
                <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {getText('step2')}
                </span>
              </div>
              <Tabs defaultValue="soil" className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-3 bg-white/90 rounded-xl shadow-md border border-green-100">
                  <TabsTrigger value="soil" className="text-green-900">{getText('soilAnalysis')}</TabsTrigger>
                  <TabsTrigger value="crops" className="text-green-900">{getText('cropRecommendations')}</TabsTrigger>
                  <TabsTrigger value="market" className="text-green-900">{getText('marketTrends')}</TabsTrigger>
                </TabsList>

                <TabsContent value="soil">
                  <div className="overflow-hidden rounded-2xl shadow-lg border border-green-100 bg-white/90 mb-6">
                    <div className="h-3 w-full bg-gradient-to-r from-green-500 to-emerald-600" />
                    <CardHeader className="bg-green-50 text-green-900">
                      <CardTitle className="text-2xl">{soilData.type}</CardTitle>
                      <CardDescription className="text-green-800/90">{getText('characteristics')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Soil Texture Section */}
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center mb-3">
                              <Droplets className="h-6 w-6 text-green-600 mr-2" />
                              <h3 className="font-semibold text-lg text-green-900">{getText('soilInfo.texture')}</h3>
                            </div>
                            <p className="text-green-800">{soilData.characteristics.split('.')[0]}</p>
                          </div>

                          {/* Soil pH Section */}
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center mb-3">
                              <Thermometer className="h-6 w-6 text-green-600 mr-2" />
                              <h3 className="font-semibold text-lg text-green-900">{getText('soilInfo.ph')}</h3>
                            </div>
                            <p className="text-green-800">{soilData.characteristics.split('.')[1]}</p>
                          </div>

                          {/* Nutrient Content Section */}
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center mb-3">
                              <Leaf className="h-6 w-6 text-green-600 mr-2" />
                              <h3 className="font-semibold text-lg text-green-900">{getText('soilInfo.nutrients')}</h3>
                            </div>
                            <p className="text-green-800">{soilData.characteristics.split('.')[2]}</p>
                          </div>

                          {/* Water Retention Section */}
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center mb-3">
                              <Cloud className="h-6 w-6 text-green-600 mr-2" />
                              <h3 className="font-semibold text-lg text-green-900">{getText('soilInfo.drainage')}</h3>
                            </div>
                            <p className="text-green-800">{soilData.characteristics.split('.')[3]}</p>
                          </div>
                        </div>
                        
                        {/* Suitable Crops Section */}
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center mb-3">
                            <BarChart2 className="h-6 w-6 text-green-600 mr-2" />
                            <h3 className="font-semibold text-lg text-green-900">{getText('suitableCrops')}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {soilData.suitableCrops.map((crop, index) => (
                              <span 
                                key={index}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                              >
                                {crop}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Weather Impact Section */}
                        {weatherData && (
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center mb-3">
                              <Wind className="h-6 w-6 text-green-600 mr-2" />
                              <h3 className="font-semibold text-lg text-green-900">{getText('weatherConditions')}</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="flex items-center">
                                <Thermometer className="h-5 w-5 text-green-600 mr-2" />
                                <div>
                                  <p className="text-sm text-green-700">{getText('temperature')}</p>
                                  <p className="font-medium text-green-900">{weatherData.temperature}°C</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Droplets className="h-5 w-5 text-green-600 mr-2" />
                                <div>
                                  <p className="text-sm text-green-700">{getText('humidity')}</p>
                                  <p className="font-medium text-green-900">{weatherData.humidity}%</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Wind className="h-5 w-5 text-green-600 mr-2" />
                                <div>
                                  <p className="text-sm text-green-700">{getText('windSpeed')}</p>
                                  <p className="font-medium text-green-900">{weatherData.windSpeed} m/s</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Cloud className="h-5 w-5 text-green-600 mr-2" />
                                <div>
                                  <p className="text-sm text-green-700">{getText('pressure')}</p>
                                  <p className="font-medium text-green-900">{weatherData.pressure} hPa</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </TabsContent>

                <TabsContent value="crops">
                  <div className="overflow-hidden rounded-2xl shadow-lg border border-green-100 bg-white/90 mb-6">
                    <div className="h-3 w-full bg-gradient-to-r from-green-500 to-emerald-600" />
                    <CardHeader className="bg-green-50 text-green-900">
                      <CardTitle className="text-2xl">{getText('cropRecommendations')}</CardTitle>
                      <CardDescription className="text-green-800/90">Based on your soil and weather conditions</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cropRecommendations.map((crop, index) => (
                          <Card key={index} className="border-green-100">
                            <CardHeader className="bg-green-50">
                              <CardTitle className="text-xl text-green-900">{crop.crop}</CardTitle>
                              <CardDescription className="text-green-800/90">
                                Suitability: <span className={`font-semibold ${getSuitabilityColor(crop.suitability)}`}>{crop.suitability}</span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                              <p className="text-green-900 mb-3">{crop.description}</p>
                              {crop.marketPotential && (
                                <div className="mt-2">
                                  <h4 className="font-medium text-green-900">Market Potential:</h4>
                                  <p className="text-green-800/90">{crop.marketPotential}</p>
                                </div>
                              )}
                              {crop.riskFactors && crop.riskFactors.length > 0 && (
                                <div className="mt-2">
                                  <h4 className="font-medium text-green-900">Risk Factors:</h4>
                                  <ul className="list-disc list-inside text-green-800/90">
                                    {crop.riskFactors.map((risk, i) => (
                                      <li key={i}>{risk}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </TabsContent>

                <TabsContent value="market">
                  <div className="overflow-hidden rounded-2xl shadow-lg border border-green-100 bg-white/90 mb-6">
                    <div className="h-3 w-full bg-gradient-to-r from-green-500 to-emerald-600" />
                    <CardHeader className="bg-green-50 text-green-900">
                      <CardTitle className="text-2xl">{getText('marketTrends')}</CardTitle>
                      <CardDescription className="text-green-800/90">Current market conditions and trends</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {marketTrends.map((trend, index) => (
                          <Card key={index} className="border-green-100">
                            <CardHeader className="bg-green-50">
                              <CardTitle className="text-xl text-green-900">{trend.crop}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-green-900">{getText('currentPrice')}:</span>
                                  <span className="font-semibold text-green-900">{trend.currentPrice}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-green-900">{getText('trend')}:</span>
                                  <span className={`font-semibold ${getTrendColor(trend.trend)}`}>{trend.trend}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-green-900">{getText('demandLevel')}:</span>
                                  <span className="font-semibold text-green-900">{trend.demandLevel}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!weatherData && !loading && (
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{getText('getStartedTitle')}</CardTitle>
                <CardDescription>{getText('getStartedDescription')}</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Crops;