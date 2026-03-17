import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Cloud, Sun, LogIn, LogOut, LayoutDashboard, Leaf, Sprout, Recycle, TrendingUp, Bot, BarChart2 } from "lucide-react";
import { clearAuthToken, fetchWithAuth } from "@/utils/authClient";



const defaultTexts = {
  weather: "Weather",
  dashboard: "Dashboard",
  logout: "Logout",
  sign_in: "Sign In"
};

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'ur', label: 'اردو' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'অসমীয়া' },
  { code: 'sa', label: 'संस्कृतम्' }
];

const Navigation = ({ selectedLang, setSelectedLang, texts, loading, languages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth("/api/vendor/me");
        if (!res.ok) {
          setUser(null);
          return;
        }
        const json = await res.json().catch(() => ({}));
        setUser(json?.vendor ?? null);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const publicRoutes = [
    { name: texts?.weather || "Weather", path: "/weather", icon: Sun },
    { name: texts?.smart_crop_guide || "Crop Guide", path: "/crops", icon: Leaf },
    { name: texts?.soilAnalysis || "Soils", path: "/soils", icon: Sprout },
    { name: texts?.farm_smart_tips || "Sustainability", path: "/sustainability", icon: Recycle },
    { name: "Yield", path: "/yield", icon: BarChart2 },
    { name: "AI Advisor", path: "/advisor", icon: Bot },
    { name: texts?.market_watch || "Market", path: "/market", icon: TrendingUp },
  ];

  const authRoutes = [
    { name: texts.dashboard, path: "/dashboard", icon: LayoutDashboard },
  ];

  const handleLogout = async () => {
    clearAuthToken();
    navigate("/");
    setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-lg border-b z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Cloud className="w-8 h-8 text-primary" />
              <span className="text-xl font-semibold text-primary">CloudCrop AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Language Selector */}
            <select
              className="border rounded px-2 py-1 text-sm mr-2 bg-white"
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
            {user ? (
              <>
                {authRoutes.map((route) => (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(route.path)
                        ? "text-primary bg-primary/10"
                        : "text-gray-600 hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    <route.icon className="w-5 h-5" />
                    <span>{loading ? "..." : route.name}</span>
                  </Link>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-primary"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {loading ? "..." : texts.logout}
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  {loading ? "..." : texts.sign_in}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2"
            >
              {isOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {(user ? authRoutes : publicRoutes).map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                    isActive(route.path)
                      ? "text-primary bg-primary/10"
                      : "text-gray-600 hover:text-primary hover:bg-primary/5"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{loading ? "..." : route.name}</span>
                </Link>
              );
            })}
            {user ? (
              <Button
                variant="default"
                className="w-full mt-4"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {loading ? "..." : texts.logout}
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="default" className="w-full mt-4">
                  <LogIn className="w-4 h-4 mr-2" />
                  {loading ? "..." : texts.sign_in}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;