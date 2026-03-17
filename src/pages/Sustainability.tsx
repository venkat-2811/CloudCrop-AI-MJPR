import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Leaf,
  Droplets,
  Sun,
  Wind,
  Recycle,
  Sprout,
  Shield,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { batchTranslateText } from "../utils/translate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { groqJsonQuery } from "@/utils/groqApi";

interface SmartTip {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  icon: string;
  fertilizerType?: string;
  dosage?: string;
  applicationMethod?: string;
  bestSeason?: string;
  estimatedCost?: string;
  expectedBenefit?: string;
  commonMistake?: string;
  farmerTip?: string;
}

const textContent = {
  pageTitle: "Farm Smart Tips",
  pageSubtitle: "Learn simple ways to make your farm more eco-friendly",
  waterConservation: "Water Conservation",
  soilHealth: "Soil Health",
  energyEfficiency: "Energy Efficiency",
  wasteManagement: "Waste Management",
  biodiversity: "Biodiversity",
  pestControl: "Natural Pest Control",
  climateAction: "Climate Action",
  impact: "Environmental Impact",
  difficulty: "Implementation Difficulty",
  easy: "Easy",
  medium: "Medium",
  advanced: "Advanced",
  loading: "Loading smart tips...",
  error: "Failed to load tips. Please try again.",
};

// Most grown crops in India (static fallback)
const mostGrownCrops = [
  "Rice", "Wheat", "Maize", "Sugarcane", "Cotton", "Pulses", "Potato", "Tomato", "Onion", "Groundnut", "Soybean", "Barley", "Sorghum", "Millets", "Mustard"
];

// Example static fallback tips
const staticTips: SmartTip[] = [
  {
    id: "static1",
    category: "Soil Health",
    title: "Add Organic Matter",
    description: "Mix compost or manure into your soil to improve fertility and structure.",
    impact: "Improves soil fertility and water retention.",
    difficulty: "Easy",
    icon: "Sprout",
    fertilizerType: "Compost",
    dosage: "2 tons/acre",
    applicationMethod: "Mix into topsoil before planting",
    bestSeason: "Pre-monsoon",
    estimatedCost: "Low cost",
    expectedBenefit: "Better crop growth and yield",
    commonMistake: "Do not use fresh manure directly.",
    farmerTip: "My yields improved after using compost!",
  },
  {
    id: "static2",
    category: "Water Conservation",
    title: "Drip Irrigation",
    description: "Install drip irrigation to deliver water directly to plant roots.",
    impact: "Reduces water usage by up to 60%.",
    difficulty: "Medium",
    icon: "Droplets",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Install pipes along crop rows",
    bestSeason: "Any",
    estimatedCost: "₹10,000/acre",
    expectedBenefit: "Saves water and increases efficiency",
    commonMistake: "Check for leaks regularly.",
    farmerTip: "Drip saved my water bill!",
  },
];

// General fallback tips for all farmers
const generalTips: SmartTip[] = [
  {
    id: "general1",
    category: "Soil Health",
    title: "Rotate Crops",
    description: "Change the type of crop grown in a field each season to improve soil fertility and reduce pests.",
    impact: "Reduces soil depletion and pest buildup.",
    difficulty: "Easy",
    icon: "Sprout",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Rotate crops every season",
    bestSeason: "Any",
    estimatedCost: "No extra cost",
    expectedBenefit: "Healthier soil and better yields",
    commonMistake: "Planting the same crop repeatedly.",
    farmerTip: "Rotation helped my soil stay rich!",
  },
  {
    id: "general2",
    category: "Water Conservation",
    title: "Mulching",
    description: "Cover soil with straw or leaves to retain moisture and reduce weeds.",
    impact: "Saves water and prevents soil erosion.",
    difficulty: "Easy",
    icon: "Droplets",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Spread mulch after planting",
    bestSeason: "Any",
    estimatedCost: "Low cost",
    expectedBenefit: "Less watering needed",
    commonMistake: "Using too thick a layer.",
    farmerTip: "Mulch keeps my soil cool!",
  },
  {
    id: "general3",
    category: "Energy Efficiency",
    title: "Use Solar Pumps",
    description: "Install solar-powered pumps to reduce electricity costs and use renewable energy.",
    impact: "Reduces carbon footprint and saves money.",
    difficulty: "Medium",
    icon: "Sun",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Install solar pump for irrigation",
    bestSeason: "Any",
    estimatedCost: "High initial, low running cost",
    expectedBenefit: "Lower energy bills",
    commonMistake: "Not maintaining solar panels.",
    farmerTip: "Solar pumps work even on cloudy days!",
  },
  {
    id: "general4",
    category: "Waste Management",
    title: "Compost Farm Waste",
    description: "Turn crop residues and animal waste into compost instead of burning or dumping.",
    impact: "Reduces pollution and improves soil health.",
    difficulty: "Easy",
    icon: "Recycle",
    fertilizerType: "Compost",
    dosage: "2 tons/acre",
    applicationMethod: "Apply compost before planting",
    bestSeason: "Pre-monsoon",
    estimatedCost: "Low cost",
    expectedBenefit: "Better soil and less waste",
    commonMistake: "Composting plastic or chemicals.",
    farmerTip: "My compost pile gives me free fertilizer!",
  },
  {
    id: "general5",
    category: "Biodiversity",
    title: "Plant Flower Borders",
    description: "Grow flowers around fields to attract pollinators and beneficial insects.",
    impact: "Increases pollination and natural pest control.",
    difficulty: "Easy",
    icon: "Leaf",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Plant flowers along field edges",
    bestSeason: "Spring",
    estimatedCost: "Low cost",
    expectedBenefit: "More bees and better yields",
    commonMistake: "Using pesticides near flowers.",
    farmerTip: "Bees love my marigold borders!",
  },
  {
    id: "general6",
    category: "Natural Pest Control",
    title: "Release Ladybugs",
    description: "Ladybugs eat aphids and other pests. Release them in your fields for natural pest control.",
    impact: "Reduces need for chemical pesticides.",
    difficulty: "Easy",
    icon: "Shield",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Release ladybugs in infested areas",
    bestSeason: "Spring",
    estimatedCost: "Low cost",
    expectedBenefit: "Fewer pests, healthier crops",
    commonMistake: "Using pesticides after releasing ladybugs.",
    farmerTip: "Ladybugs cleared my aphids in a week!",
  },
  {
    id: "general7",
    category: "Climate Action",
    title: "Plant Trees on Boundaries",
    description: "Trees on field boundaries provide shade, reduce wind, and capture carbon.",
    impact: "Helps fight climate change and protects crops.",
    difficulty: "Medium",
    icon: "Wind",
    fertilizerType: "None",
    dosage: "N/A",
    applicationMethod: "Plant native trees along borders",
    bestSeason: "Monsoon",
    estimatedCost: "Low cost",
    expectedBenefit: "Cooler fields, less wind damage",
    commonMistake: "Planting invasive species.",
    farmerTip: "My trees give shade and wood!",
  },
];

const uiTextKeys = [
  "pageTitle",
  "pageSubtitle",
  "waterConservation",
  "soilHealth",
  "energyEfficiency",
  "wasteManagement",
  "biodiversity",
  "pestControl",
  "climateAction",
  "impact",
  "difficulty",
  "easy",
  "medium",
  "advanced",
  "loading",
  "error",
  "selectCropLabel",
  "selectCropPlaceholder",
  "clearButton",
  "noTipsAvailable",
  "showingTipsFor"
];

const uiTextDefaults = {
  pageTitle: "Farm Smart Tips",
  pageSubtitle: "Learn simple ways to make your farm more eco-friendly",
  waterConservation: "Water Conservation",
  soilHealth: "Soil Health",
  energyEfficiency: "Energy Efficiency",
  wasteManagement: "Waste Management",
  biodiversity: "Biodiversity",
  pestControl: "Natural Pest Control",
  climateAction: "Climate Action",
  impact: "Environmental Impact",
  difficulty: "Implementation Difficulty",
  easy: "Easy",
  medium: "Medium",
  advanced: "Advanced",
  loading: "Loading smart tips...",
  error: "Failed to load tips. Please try again.",
  selectCropLabel: "Select Crop:",
  selectCropPlaceholder: "Search or select crop...",
  clearButton: "Clear",
  noTipsAvailable: "No tips available for this category/crop.",
  showingTipsFor: "Showing tips for: {crop}"
};

const Sustainability = ({ selectedLang, texts, loading: externalLoading }) => {
  const [smartTips, setSmartTips] = useState<SmartTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedCrop, setSelectedCrop] = useState("");
  const [cropSearch, setCropSearch] = useState("");
  const [cropOptions, setCropOptions] = useState(mostGrownCrops);
  const [categoryTips, setCategoryTips] = useState({}); // { [categoryId]: SmartTip[] }
  const [uiTexts, setUiTexts] = useState(uiTextDefaults);

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

  const getText = (key) => {
    if (key === "pageTitle") return uiTexts.pageTitle;
    if (key === "pageSubtitle") return uiTexts.pageSubtitle;
    if (texts && texts[key]) return texts[key];
    return uiTexts[key] || textContent[key] || key;
  };

  const categories = [
    { id: "Water Conservation", key: "waterConservation", label: getText("waterConservation") },
    { id: "Soil Health", key: "soilHealth", label: getText("soilHealth") },
    { id: "Energy Efficiency", key: "energyEfficiency", label: getText("energyEfficiency") },
    { id: "Waste Management", key: "wasteManagement", label: getText("wasteManagement") },
    { id: "Biodiversity", key: "biodiversity", label: getText("biodiversity") },
    { id: "Natural Pest Control", key: "pestControl", label: getText("pestControl") },
    { id: "Climate Action", key: "climateAction", label: getText("climateAction") },
  ];

  const [activeTab, setActiveTab] = useState(categories[0].id);

  // Helper to translate an array of SmartTip objects
  const translateTipsArray = async (tipsArr, lang) => {
    if (!lang || lang === "en" || !tipsArr.length) return tipsArr;
    const textsToTranslate = tipsArr.flatMap(t => [
      { text: t.title },
      { text: t.description },
      { text: t.impact },
      { text: t.farmerTip || "" },
      { text: t.applicationMethod || "" },
      { text: t.expectedBenefit || "" },
      { text: t.commonMistake || "" },
    ]);
    const translated = await batchTranslateText(
      textsToTranslate,
      lang
    );
    return tipsArr.map((t, i) => ({
      ...t,
      title: translated[i * 7]?.text || t.title,
      description: translated[i * 7 + 1]?.text || t.description,
      impact: translated[i * 7 + 2]?.text || t.impact,
      farmerTip: translated[i * 7 + 3]?.text || t.farmerTip,
      applicationMethod: translated[i * 7 + 4]?.text || t.applicationMethod,
      expectedBenefit: translated[i * 7 + 5]?.text || t.expectedBenefit,
      commonMistake: translated[i * 7 + 6]?.text || t.commonMistake,
    }));
  };

  const fetchGeminiData = async <T,>(prompt: string, isRetry = false): Promise<T> => {
    const fullPrompt = `${prompt}\n${selectedLang ? `Respond in ${selectedLang} language.` : ""}`;
    try {
      return await groqJsonQuery<T>(fullPrompt);
    } catch (err) {
      if (!isRetry) {
        const simplePrompt = `Generate ONLY a JSON array of practical farming tips${selectedCrop ? ` for the crop '${selectedCrop}'` : ""}. Each tip must have: id, category, title, description, impact, difficulty, icon. JSON array only, no extra text.`;
        return fetchGeminiData<T>(simplePrompt, true);
      }
      throw new Error("API Error: Failed to get valid data. Please try again later.");
    }
  };

  const fetchGeminiCategoryTips = async (crop, category) => {
    const prompt = `You are a sustainable farming expert. Generate ONLY a JSON array of tips for the crop "${crop}" in the category "${category}" for farmers in India. Each tip object MUST have these fields:
- id: string (unique)
- category: string (must be exactly: ${category})
- title: string (short, clear)
- description: string (detailed, simple language)
- impact: string (environmental impact)
- difficulty: string (Easy, Medium, Advanced)
- icon: string (Leaf, Droplets, Sun, Wind, Recycle, Sprout, Shield, Zap)
- fertilizerType: string (e.g., NPK, compost, manure, biofertilizer, or "None")
- dosage: string (e.g., 2 tons/acre, 50kg/bigha, or "N/A")
- applicationMethod: string (how/when to apply, or "N/A")
- bestSeason: string (e.g., Pre-monsoon, Winter, or "Any")
- estimatedCost: string (e.g., ₹3,000/acre, or "Low cost")
- expectedBenefit: string (e.g., Increases yield by 10%)
- commonMistake: string (e.g., Don't apply before rain, or "N/A")
- farmerTip: string (short quote or tip from a real farmer, or "N/A")

Return ONLY the JSON array, no extra text or markdown. Use simple, practical tips for small/medium farmers. Give at least 2 tips.`;
    return fetchGeminiData<SmartTip[]>(prompt);
  };

  const fetchAllCategoryTips = async (crop) => {
    setLoading(true);
    setError(null);
    const tipsByCategory = {};
    try {
      await Promise.all(categories.map(async (cat) => {
        try {
          const tips = await fetchGeminiCategoryTips(crop, cat.key);
          tipsByCategory[cat.key] = tips && tips.length ? tips : [];
        } catch (e) {
          tipsByCategory[cat.key] = [];
        }
      }));
      if (selectedLang && selectedLang !== "en") {
        const translatedCategoryTips = {};
        for (const cat of categories) {
          translatedCategoryTips[cat.key] = await translateTipsArray(tipsByCategory[cat.key], selectedLang);
        }
        setCategoryTips(translatedCategoryTips);
      } else {
        setCategoryTips(tipsByCategory);
      }
    } catch (err) {
      setError(getText("error"));
    } finally {
      setLoading(false);
    }
  };

  const fetchSmartTips = async () => {
    try {
      setLoading(true);
      setError(null);
      let tips: SmartTip[] = [];
      if (!selectedCrop) {
        // Strict prompt for general tips by category
        const prompt = `You are a sustainable farming expert. For each of these categories: Water Conservation, Soil Health, Energy Efficiency, Waste Management, Biodiversity, Natural Pest Control, Climate Action, Fertilizers, Organic Farming, generate at least 2 practical, general sustainable farming tips for Indian farmers. Each tip object MUST have these fields:
- id: string (unique)
- category: string (must be exactly one of the categories above)
- title: string (short, clear)
- description: string (detailed, simple language)
- impact: string (environmental impact)
- difficulty: string (Easy, Medium, Advanced)
- icon: string (Leaf, Droplets, Sun, Wind, Recycle, Sprout, Shield, Zap)
- fertilizerType: string (e.g., NPK, compost, manure, biofertilizer, or "None")
- dosage: string (e.g., 2 tons/acre, 50kg/bigha, or "N/A")
- applicationMethod: string (how/when to apply, or "N/A")
- bestSeason: string (e.g., Pre-monsoon, Winter, or "Any")
- estimatedCost: string (e.g., ₹3,000/acre, or "Low cost")
- expectedBenefit: string (e.g., Increases yield by 10%)
- commonMistake: string (e.g., Don't apply before rain, or "N/A")
- farmerTip: string (short quote or tip from a real farmer, or "N/A")

Return ONLY a single JSON array, no extra text or markdown. Each tip must have a category field matching one of the categories above. Do not repeat tips.`;
        try {
          tips = await fetchGeminiData<SmartTip[]>(prompt);
        } catch (err) {
          tips = generalTips;
        }
      } else {
        // Fetch crop-specific tips
        const cropPart = ` for the crop "${selectedCrop}"`;
        const prompt = `You are a sustainable farming expert. Generate ONLY a JSON array of tips${cropPart} for farmers in India. Each tip object MUST have these fields:
- id: string (unique)
- category: string (one of: Water Conservation, Soil Health, Energy Efficiency, Waste Management, Biodiversity, Natural Pest Control, Climate Action, Fertilizers, Organic Farming)
- title: string (short, clear)
- description: string (detailed, simple language)
- impact: string (environmental impact)
- difficulty: string (Easy, Medium, Advanced)
- icon: string (Leaf, Droplets, Sun, Wind, Recycle, Sprout, Shield, Zap)
- fertilizerType: string (e.g., NPK, compost, manure, biofertilizer, or "None")
- dosage: string (e.g., 2 tons/acre, 50kg/bigha, or "N/A")
- applicationMethod: string (how/when to apply, or "N/A")
- bestSeason: string (e.g., Pre-monsoon, Winter, or "Any")
- estimatedCost: string (e.g., ₹3,000/acre, or "Low cost")
- expectedBenefit: string (e.g., Increases yield by 10%)
- commonMistake: string (e.g., Don't apply before rain, or "N/A")
- farmerTip: string (short quote or tip from a real farmer, or "N/A")

Return ONLY the JSON array, no extra text or markdown. Use simple, practical tips for small/medium farmers. Include at least 3 tips for each category, especially for Fertilizers and Organic Farming.`;
        tips = await fetchGeminiData<SmartTip[]>(prompt);
      }
      if (selectedLang && selectedLang !== "en") {
        const textsToTranslate = tips.flatMap(t => [
          { text: t.title },
          { text: t.description },
          { text: t.impact },
          { text: t.farmerTip || "" },
          { text: t.applicationMethod || "" },
          { text: t.expectedBenefit || "" },
          { text: t.commonMistake || "" },
        ]);
        const translated = await batchTranslateText(
          textsToTranslate,
          selectedLang
        );
        const translatedTips = tips.map((t, i) => ({
          ...t,
          title: translated[i * 7]?.text || t.title,
          description: translated[i * 7 + 1]?.text || t.description,
          impact: translated[i * 7 + 2]?.text || t.impact,
          farmerTip: translated[i * 7 + 3]?.text || t.farmerTip,
          applicationMethod: translated[i * 7 + 4]?.text || t.applicationMethod,
          expectedBenefit: translated[i * 7 + 5]?.text || t.expectedBenefit,
          commonMistake: translated[i * 7 + 6]?.text || t.commonMistake,
        }));
        setSmartTips(translatedTips);
      } else {
        setSmartTips(tips);
      }
    } catch (err) {
      console.error(err);
      setError(getText("error"));
      // Fallback: show static tips
      setSmartTips(generalTips);
    } finally {
      setLoading(false);
    }
  };

  // Main fetch logic
  useEffect(() => {
    if (!selectedCrop) {
      setCategoryTips({});
      fetchSmartTips(); // general tips logic
    } else {
      setSmartTips([]); // clear general tips
      fetchAllCategoryTips(selectedCrop);
    }
    // eslint-disable-next-line
  }, [selectedLang, selectedCrop]);

  // Crop search filter
  const filteredCrops = cropSearch
    ? cropOptions.filter((c) => c.toLowerCase().includes(cropSearch.toLowerCase()))
    : cropOptions;

  const getDifficultyColor = (d: string) => {
    const color = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800",
    };
    return color[d.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getIconComponent = (icon: string) => {
    const icons = {
      Leaf: <Leaf className="h-6 w-6" />,
      Droplets: <Droplets className="h-6 w-6" />,
      Sun: <Sun className="h-6 w-6" />,
      Wind: <Wind className="h-6 w-6" />,
      Recycle: <Recycle className="h-6 w-6" />,
      Sprout: <Sprout className="h-6 w-6" />,
      Shield: <Shield className="h-6 w-6" />,
      Zap: <Zap className="h-6 w-6" />,
    };
    return icons[icon] || <Leaf className="h-6 w-6" />;
  };

  // Category color mapping for card accent
  const categoryColors = {
    "Water Conservation": "border-blue-400",
    "Soil Health": "border-green-400",
    "Energy Efficiency": "border-yellow-400",
    "Waste Management": "border-purple-400",
    "Biodiversity": "border-emerald-400",
    "Natural Pest Control": "border-orange-400",
    "Climate Action": "border-cyan-400",
  };

  // Before rendering the cards, add a debug log
  console.log('smartTips:', smartTips);
  console.log('categories:', categories);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 font-sans">
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="text-center mt-10 mb-8 sm:mt-16 sm:mb-10 lg:mt-20 lg:mb-12">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-900 mb-2 sm:mb-3 tracking-tight">
            {getText("pageTitle")}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-blue-700 mx-auto font-medium leading-relaxed">
            {getText("pageSubtitle")}
          </p>
        </div>

        {/* Crop Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow border border-blue-100">
          <label htmlFor="crop-select" className="font-semibold text-blue-900 text-base">{getText("selectCropLabel")}</label>
          <div className="relative w-full max-w-xs">
            <Input
              id="crop-select"
              type="text"
              placeholder={getText("selectCropPlaceholder")}
              value={cropSearch || selectedCrop}
              onChange={e => {
                setCropSearch(e.target.value);
                setSelectedCrop("");
              }}
              className="pr-8 h-8 text-sm border border-blue-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded-lg"
              autoComplete="off"
              onFocus={() => setCropSearch("")}
            />
            {filteredCrops.length > 0 && cropSearch && (
              <div className="absolute z-10 w-full bg-white border border-blue-200 rounded-lg shadow mt-1 max-h-40 overflow-y-auto">
                {filteredCrops.map((crop) => (
                  <div
                    key={crop}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-blue-900 text-sm transition-colors duration-150"
                    onMouseDown={() => {
                      setSelectedCrop(crop);
                      setCropSearch("");
                    }}
                  >
                    {crop}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedCrop && (
            <Button 
              variant="outline" 
              className="h-8 px-3 text-sm border border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-colors duration-150"
              onClick={() => setSelectedCrop("")}
            >
              {getText("clearButton")}
            </Button>
          )}
        </div>
        {selectedCrop && (
          <div className="text-center mb-4 text-blue-800 font-medium text-base">
            {getText('showingTipsFor').replace('{crop}', selectedCrop)}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 p-4 font-semibold text-base bg-red-50 rounded-xl border border-red-200">
            {error}
          </div>
        ) : (
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-nowrap justify-center items-center gap-0 mb-6 bg-white border-b border-blue-200 rounded-lg p-0 shadow-none max-w-full mx-auto overflow-hidden">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className={`relative text-xs font-semibold text-blue-900 px-2 py-1 bg-transparent rounded-none border-none shadow-none transition-all duration-200 focus:outline-none focus:ring-0 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-1 data-[state=active]:after:bg-blue-400 data-[state=active]:after:rounded-b hover:bg-blue-100`}
                  style={{ minWidth: 0, flex: 1, textAlign: 'center' }}
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((cat) => {
              let tipsToShow = [];
              if (selectedCrop) {
                tipsToShow = (categoryTips[cat.key] && categoryTips[cat.key].length)
                  ? categoryTips[cat.key]
                  : generalTips.filter(tip => tip.category && tip.category.toLowerCase().includes(cat.key.toLowerCase()));
              } else {
                // General tips logic
                tipsToShow = smartTips.filter(
                  tip => tip.category && tip.category.toLowerCase().includes(cat.key.toLowerCase())
                );
                // Fallback: if Gemini missed this category, use hardcoded generalTips
                if (tipsToShow.length === 0) {
                  tipsToShow = generalTips.filter(tip => tip.category && tip.category.toLowerCase().includes(cat.key.toLowerCase()));
                }
              }
              return (
                <TabsContent key={cat.key} value={cat.key} className="mt-4">
                  {tipsToShow.length === 0 ? (
                    <div className="text-center text-blue-700 py-6 text-base bg-blue-50 rounded-xl border border-blue-200">
                      {getText('noTipsAvailable')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tipsToShow.map((tip) => (
                        <Card
                          key={tip.id}
                          className={`bg-white shadow rounded-xl border-t-4 ${categoryColors[cat.key] || "border-blue-300"} transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-opacity-80 group`}
                          style={{ minHeight: 180 }}
                        >
                          <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-3 px-4">
                            <div className="p-1 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors duration-200">
                              {getIconComponent(tip.icon)}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-bold text-blue-900 group-hover:text-blue-700 transition-colors duration-150">
                                {tip.title}
                              </CardTitle>
                              <CardDescription className="text-xs text-blue-500 font-medium mt-1">{cat.label}</CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 flex flex-col gap-1.5">
                            <div className="flex items-center mb-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold shadow-sm transition-all duration-150 ${getDifficultyColor(tip.difficulty)} ${
                                  tip.difficulty === "Easy"
                                    ? "ring-1 ring-green-200"
                                    : tip.difficulty === "Medium"
                                    ? "ring-1 ring-yellow-200"
                                    : "ring-1 ring-red-200"
                                }`}
                              >
                                {getText(tip.difficulty?.toLowerCase?.() || "")}
                              </span>
                            </div>
                            <p className="text-blue-900 text-xs sm:text-sm mb-1 font-medium leading-relaxed">
                              {tip.description}
                            </p>
                            {tip.fertilizerType && tip.fertilizerType !== "None" && (
                              <div className="text-xs text-blue-800"><strong>Fertilizer:</strong> {tip.fertilizerType}</div>
                            )}
                            {tip.dosage && tip.dosage !== "N/A" && (
                              <div className="text-xs text-blue-800"><strong>Dosage:</strong> {tip.dosage}</div>
                            )}
                            {tip.applicationMethod && tip.applicationMethod !== "N/A" && (
                              <div className="text-xs text-blue-800"><strong>Application:</strong> {tip.applicationMethod}</div>
                            )}
                            {tip.bestSeason && tip.bestSeason !== "Any" && (
                              <div className="text-xs text-blue-800"><strong>Best Season:</strong> {tip.bestSeason}</div>
                            )}
                            {tip.estimatedCost && tip.estimatedCost !== "Low cost" && (
                              <div className="text-xs text-blue-800"><strong>Estimated Cost:</strong> {tip.estimatedCost}</div>
                            )}
                            {tip.expectedBenefit && (
                              <div className="text-xs text-blue-800"><strong>Expected Benefit:</strong> {tip.expectedBenefit}</div>
                            )}
                            {tip.commonMistake && tip.commonMistake !== "N/A" && (
                              <div className="text-xs text-red-700 bg-red-50 rounded px-2 py-1 mt-1 border border-red-100">
                                <strong>Common Mistake:</strong> {tip.commonMistake}
                              </div>
                            )}
                            <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 border border-blue-100">
                              <strong>{getText("impact")}:</strong> {tip.impact}
                            </div>
                            {tip.farmerTip && tip.farmerTip !== "N/A" && (
                              <div className="text-xs italic text-green-700 mt-1 bg-green-50 rounded px-2 py-1 border border-green-100">
                                "{tip.farmerTip}"
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Sustainability;
