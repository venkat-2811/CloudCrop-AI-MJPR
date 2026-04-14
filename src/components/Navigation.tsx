import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Cloud, LogIn, LogOut } from "lucide-react";
import { clearToken, fetchWithAuth, getToken } from "@/utils/authClient";

interface NavigationProps {
  selectedLang: string;
  setSelectedLang: (lang: string) => void;
  texts: Record<string, string>;
  loading: boolean;
  languages: { code: string; label: string }[];
}

const Navigation = ({ selectedLang, setSelectedLang, texts, loading, languages }: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ full_name: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) { setUser(null); return; }
      try {
        const res = await fetchWithAuth("/api/vendor/me");
        if (!res.ok) { setUser(null); return; }
        const json = await res.json().catch(() => ({}));
        setUser(json?.vendor ?? null);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, [location.pathname]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
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
              <Cloud className="w-8 h-8 text-green-600" />
              <span className="text-xl font-semibold text-green-700">CloudCrop AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <select
              className="border rounded px-2 py-1 text-sm bg-white"
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              disabled={loading}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>

            {user ? (
              <>
                <span className="text-sm font-medium text-green-700">{user.full_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-green-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {loading ? "..." : (texts?.logout || "Logout")}
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  {loading ? "..." : (texts?.sign_in || "Sign In")}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex items-center md:hidden">
            <select
              className="border rounded px-1 py-1 text-xs bg-white mr-2"
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              disabled={loading}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <div className="px-3 py-2 text-sm font-medium text-green-700">{user.full_name}</div>
                <Button variant="default" className="w-full mt-2" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {loading ? "..." : (texts?.logout || "Logout")}
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="default" className="w-full mt-2 bg-green-600 hover:bg-green-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  {loading ? "..." : (texts?.sign_in || "Sign In")}
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