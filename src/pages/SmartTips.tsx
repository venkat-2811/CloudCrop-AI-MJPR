import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Leaf, Droplets, Calendar, TrendingUp, AlertTriangle, Lightbulb, X } from "lucide-react";
import { motion } from "framer-motion";
import { groqJsonQuery, groqQuery } from "@/utils/groqApi";
import type { PageProps } from "@/types/common";

interface CropInfo {
  name: string;
  expectedYield: string;
  marketDemand: string;
  waterRequirement: string;
  growingDays: number;
}

interface TipsResult {
  topCrops: CropInfo[];
  tips: string[];
  warnings: string[];
}

const regions = ["North India", "South India", "East India", "West India", "Central India"];
const seasons = ["Kharif", "Rabi", "Zaid"];
const soilTypes = ["Alluvial", "Red", "Black", "Laterite", "Sandy", "Clay"];

const SmartTips = ({ selectedLang, texts, loading: externalLoading }: PageProps) => {
  const [region, setRegion] = useState("");
  const [season, setSeason] = useState("");
  const [soilType, setSoilType] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TipsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalCrop, setModalCrop] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchTips = async () => {
    if (!region || !season || !soilType) {
      setError("Please select region, season, and soil type.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `You are an Indian agriculture expert. Based on these inputs:
Region: ${region}
Season: ${season}
Soil Type: ${soilType}

Return a JSON object with:
{
  "topCrops": [
    { "name": "<crop name>", "expectedYield": "<yield in q/ha>", "marketDemand": "High|Medium|Low", "waterRequirement": "High|Medium|Low", "growingDays": <number> }
  ],
  "tips": ["<farming tip 1>", "<farming tip 2>", ...],
  "warnings": ["<warning 1>", ...]
}

Include 5-6 top crops, 4-5 practical farming tips, and 2-3 relevant warnings. Return ONLY valid JSON.`;

      const data = await groqJsonQuery<TipsResult>(prompt);
      setResult(data);
    } catch (err) {
      console.error("Smart tips error:", err);
      setError("Failed to get recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openAdvisoryModal = async (cropName: string) => {
    setModalCrop(cropName);
    setModalContent("");
    setModalLoading(true);

    try {
      const content = await groqQuery(
        `Give a comprehensive farming advisory for growing ${cropName} in ${region} during ${season} season on ${soilType} soil. Include: optimal planting time, seed variety recommendations, irrigation schedule, fertilizer plan, pest management, harvesting tips, and expected market price. Be specific and practical for Indian farmers.`,
        "You are an expert Indian agricultural advisor. Provide detailed, actionable farming guidance.",
        { temperature: 0.4, maxTokens: 1500 }
      );
      setModalContent(content);
    } catch {
      setModalContent("Failed to load advisory. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case "High": return "text-green-700 bg-green-100";
      case "Medium": return "text-amber-700 bg-amber-100";
      case "Low": return "text-red-700 bg-red-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  const getWaterColor = (req: string) => {
    switch (req) {
      case "High": return "text-blue-700";
      case "Medium": return "text-blue-500";
      case "Low": return "text-blue-300";
      default: return "text-blue-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 mt-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-green-900 mb-4">
            {texts?.smartTipsTitle || "Smart Crop Guide & Farm Tips"}
          </h1>
          <p className="text-lg text-green-800 max-w-2xl mx-auto">
            {texts?.smartTipsSubtitle || "Get personalized crop recommendations based on your region and season"}
          </p>
        </motion.div>

        {/* Input Form */}
        <Card className="max-w-2xl mx-auto mb-8 border-green-100 shadow-lg">
          <div className="h-2 w-full bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-900">{texts?.region || "Region"}</label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-900">{texts?.season || "Season"}</label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-900">{texts?.soilType || "Soil Type"}</label>
                <Select value={soilType} onValueChange={setSoilType}>
                  <SelectTrigger><SelectValue placeholder="Select soil type" /></SelectTrigger>
                  <SelectContent>
                    {soilTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={fetchTips}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" />{texts?.gettingTips || "Getting Tips..."}</>
              ) : (
                <><Leaf className="h-5 w-5 mr-2" />{texts?.getTips || "Get Smart Tips"}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center bg-red-50 text-red-800 p-4 rounded-lg mb-6 max-w-2xl mx-auto border border-red-200">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            {/* Top Crops Grid */}
            <div>
              <h2 className="text-2xl font-bold text-green-900 mb-4">{texts?.topCrops || "Top Recommended Crops"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.topCrops?.map((crop, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="border-green-100 shadow-md hover:shadow-lg transition-shadow h-full">
                      <CardContent className="p-5">
                        <h3 className="text-lg font-bold text-green-900 mb-3">{crop.name}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 flex items-center"><TrendingUp className="w-4 h-4 mr-1" />{texts?.expectedYield || "Expected Yield"}</span>
                            <span className="font-semibold text-green-800">{crop.expectedYield}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">{texts?.marketDemand || "Market Demand"}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDemandColor(crop.marketDemand)}`}>{crop.marketDemand}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 flex items-center"><Droplets className={`w-4 h-4 mr-1 ${getWaterColor(crop.waterRequirement)}`} />{texts?.waterRequirement || "Water Requirement"}</span>
                            <span className="font-medium">{crop.waterRequirement}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 flex items-center"><Calendar className="w-4 h-4 mr-1" />{texts?.growingDays || "Growing Days"}</span>
                            <span className="font-medium">{crop.growingDays} days</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => openAdvisoryModal(crop.name)}
                          className="w-full mt-4 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          variant="outline"
                          size="sm"
                        >
                          {texts?.getFullAdvisory || "Get Full Advisory"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tips & Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.tips?.length > 0 && (
                <Card className="border-green-100 shadow-md">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-green-900 flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-amber-500" />{texts?.farmingTips || "Farming Tips"}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {result.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.warnings?.length > 0 && (
                <Card className="border-amber-100 shadow-md">
                  <CardHeader className="bg-amber-50">
                    <CardTitle className="text-amber-900 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />{texts?.warnings || "Warnings"}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <Card className="max-w-md mx-auto border-green-100">
            <CardContent className="p-8 text-center">
              <Leaf className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Select Your Farm Details</h3>
              <p className="text-sm text-green-700">Choose your region, season, and soil type to get personalized crop recommendations</p>
            </CardContent>
          </Card>
        )}

        {/* Advisory Modal */}
        {modalCrop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalCrop(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">{modalCrop} — Full Advisory</h3>
                <Button variant="ghost" size="icon" onClick={() => setModalCrop(null)} className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {modalLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    <span className="ml-3 text-green-700">Generating advisory...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{modalContent}</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartTips;
