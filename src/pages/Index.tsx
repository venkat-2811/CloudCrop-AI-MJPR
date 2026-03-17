import { motion } from "framer-motion";
import { Sun, Leaf, Cloud, LineChart, BarChart2, Bot } from "lucide-react";
import { Link } from "react-router-dom";



const defaultTexts = {
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
  footer: "Made for farmers, by farmers. Simple tools for better farming."
};

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

const Index = ({ selectedLang, texts, loading }) => {
  const features = [
    {
      icon: Sun,
      title: texts.weather_watch,
      description: texts.weather_watch_desc,
      link: "/weather",
      color: "from-amber-500 to-yellow-600",
    },
    {
      icon: Leaf,
      title: texts.smart_crop_guide,
      description: texts.smart_crop_guide_desc,
      link: "/crops",
      color: "from-emerald-500 to-green-700",
    },
    {
      icon: Cloud,
      title: texts.farm_smart_tips,
      description: texts.farm_smart_tips_desc,
      link: "/sustainability",
      color: "from-sky-500 to-blue-700",
    },
    {
      icon: LineChart,
      title: texts?.market_watch || "Market Watch",
      description: texts?.market_watch_desc || "Explore market trends.",
      link: "/market",
      color: "from-amber-800 to-orange-900",
    },
    {
      icon: BarChart2,
      title: texts?.yield_estimation || "Yield Prediction",
      description: texts?.yield_estimation_desc || "Estimate harvest yields.",
      link: "/yield",
      color: "from-purple-500 to-indigo-700",
    },
    {
      icon: Bot,
      title: texts?.ai_advisor || "AI Advisor",
      description: texts?.ai_advisor_desc || "Get expert farming help.",
      link: "/advisor",
      color: "from-pink-500 to-rose-700",
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
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
            {loading ? "Translating..." : texts.welcome}
          </h1>
          <p className="text-lg text-amber-800 max-w-2xl mx-auto">
            {loading ? "" : texts.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link
                to={feature.link}
                className="block group h-full"
              >
                <div className="flex flex-col h-full bg-white/90 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-amber-100">
                  <div className={`h-3 w-full bg-gradient-to-r ${feature.color}`} />
                  <div className="flex-1 flex items-center p-6">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${feature.color} text-white shadow-sm flex-shrink-0 mr-4`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-amber-900 group-hover:text-amber-800 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-amber-800/80 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12 text-amber-800/70"
        >
          <p className="text-sm">
            {loading ? "" : texts.footer}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
