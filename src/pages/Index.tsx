import { motion } from "framer-motion";
import { Sun, Leaf, Lightbulb, LineChart, BarChart2, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import type { PageProps } from "@/types/common";

const Index = ({ selectedLang, texts, loading }: PageProps) => {
  const features = [
    {
      icon: Sun,
      title: texts?.weather_watch || "Weather Watch",
      description: texts?.weather_watch_desc || "Get daily weather updates and forecasts for your farm.",
      link: "/weather",
      color: "from-amber-500 to-yellow-600",
    },
    {
      icon: Leaf,
      title: texts?.smart_crop_guide || "Smart Crop Guide",
      description: texts?.smart_crop_guide_desc || "Find the best crops to grow based on your soil and climate.",
      link: "/smart-tips",
      color: "from-emerald-500 to-green-700",
    },
    {
      icon: Lightbulb,
      title: texts?.farm_smart_tips || "Farm Smart Tips",
      description: texts?.farm_smart_tips_desc || "Learn simple ways to make your farm more eco-friendly.",
      link: "/smart-tips",
      color: "from-sky-500 to-blue-700",
    },
    {
      icon: LineChart,
      title: texts?.market_watch || "Market Watch",
      description: texts?.market_watch_desc || "See what crops are selling best in your area.",
      link: "/market",
      color: "from-amber-800 to-orange-900",
    },
    {
      icon: BarChart2,
      title: texts?.yield_estimation || "Yield Estimation",
      description: texts?.yield_estimation_desc || "Predict your harvest based on soil and weather data.",
      link: "/yield",
      color: "from-purple-500 to-indigo-700",
    },
    {
      icon: Bot,
      title: texts?.ai_advisor || "AI Advisor",
      description: texts?.ai_advisor_desc || "Chat with our expert AI for personalized farming advice.",
      link: "/advisor",
      color: "from-green-600 to-emerald-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 mt-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">
            {loading ? "Translating..." : (texts?.welcome || "Welcome to CloudCrop AI")}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {loading ? "" : (texts?.subtitle || "Your farming friend")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.link + index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link to={feature.link} className="block group h-full">
                <div className="flex flex-col h-full bg-white/90 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
                  <div className={`h-2 w-full bg-gradient-to-r ${feature.color}`} />
                  <div className="flex-1 flex items-center p-6">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${feature.color} text-white shadow-sm flex-shrink-0 mr-4`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">{feature.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-16 py-6 border-t border-gray-200"
        >
          <p className="text-sm text-gray-500 mb-2">
            {loading ? "" : (texts?.footer || "Made for farmers, by farmers. Simple tools for better farming.")}
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">GitHub</a>
            <span>|</span>
            <span>CloudCrop AI</span>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
