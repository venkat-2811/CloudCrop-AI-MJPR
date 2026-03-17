import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Cloud, Droplets, Wind, Thermometer, Search, Calendar, ThumbsUp, ThumbsDown, BarChart2, Languages } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { batchTranslateText, translateText } from "../utils/translate";
import { groqQuery } from "@/utils/groqApi";

// Interfaces for data types
interface WeatherData {
  main: {
    temp: number;
    humidity: number;
    feels_like: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
  wind: {
    speed: number;
  };
  name: string;
  sys: {
    country: string;
  };
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  dt: number;
}

interface ForecastData {
  dt: number;
  main: {
    temp: number;
    humidity: number;
    feels_like: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
  wind: {
    speed: number;
  };
  pop: number; // Probability of precipitation
  rain?: {
    "3h"?: number;
  };
}

interface DailyForecast {
  date: string;
  temp: number;
  description: string;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  icon: string;
}

interface PollData {
  total: number;
  accurate: number;
  inaccurate: number;
}

const textContent = {
  pageTitle: "Weather Insights for Farmers",
  pageSubtitle: "Get real-time weather updates for your farming decisions",
  searchPlaceholder: "Enter Indian location (city, village, district)",
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
  getStartedDescription: "Search for your village, town, or city to see weather information"
};

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "72cb03ddb9cc38658bd51e4b865978ff";

// Fetch current weather from OpenWeatherMap
async function fetchCurrentWeather(location) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch current weather');
  return response.json();
}

// Fetch 5-day forecast from OpenWeatherMap
async function fetchForecast(location) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch forecast');
  return response.json();
}

const WeatherApp = ({ selectedLang, texts, loading }) => {
  // State declarations
  const [location, setLocation] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [hourlyForecast, setHourlyForecast] = useState<ForecastData[]>([]);
  const [pollData, setPollData] = useState<PollData>({ total: 0, accurate: 0, inaccurate: 0 });
  const [translatedAdvisory, setTranslatedAdvisory] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to get translated text from props or fallback
  const getText = (key) => (texts && texts[key]) || textContent[key] || key;

  // Load initial data
  useEffect(() => {
    // Load mock poll data
    const savedPoll = localStorage.getItem("weatherPoll");
    if (savedPoll) {
      setPollData(JSON.parse(savedPoll));
    }
  }, []);

  // Handle poll votes
  const handlePollVote = (isAccurate: boolean) => {
    const newPollData = {
      total: pollData.total + 1,
      accurate: isAccurate ? pollData.accurate + 1 : pollData.accurate,
      inaccurate: !isAccurate ? pollData.inaccurate + 1 : pollData.inaccurate
    };
    setPollData(newPollData);
    localStorage.setItem("weatherPoll", JSON.stringify(newPollData));
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
    setLocation(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    // Fetch weather data
    fetchWeatherData(suggestion);
  };

  // Handle user typing in the location search
  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocation(value);
  };

  // Handle keyboard events
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      fetchWeatherData();
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
      if (location.length > 2) {
        try {
          const response = await groqQuery(
            `Given the partial location "${location}", suggest 5 most relevant Indian city/town/village names. Return ONLY a comma-separated list, nothing else.`,
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

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [location]);

  // Replace generateWeatherWithGemini and fetchWeatherData with real API logic
  const fetchWeatherData = async (locationQuery = location) => {
    if (!locationQuery.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a location to get weather data.",
        variant: "destructive",
      });
      return;
    }
    try {
      setWeatherData(null);
      setForecast([]);
      setHourlyForecast([]);
      console.log('Fetching weather for location:', locationQuery);
      
      // Fetch current weather
      const current = await fetchCurrentWeather(locationQuery);
      console.log('Current weather response:', current);
      
      // Fetch 5-day forecast
      const forecastData = await fetchForecast(locationQuery);
      console.log('Forecast response:', forecastData);
      
      // Parse forecast into daily and hourly
      const dailyMap = {};
      const dailyForecast = [];
      const hourlyForecast = [];
      forecastData.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            temp: item.main.temp,
            description: item.weather[0].description,
            humidity: item.main.humidity,
            windSpeed: item.wind.speed,
            rainChance: item.pop ? Math.round(item.pop * 100) : 0,
            icon: item.weather[0].icon
          };
          dailyForecast.push(dailyMap[date]);
        }
        hourlyForecast.push({
          dt: item.dt,
          main: item.main,
          weather: item.weather,
          wind: item.wind,
          pop: item.pop,
          rain: item.rain
        });
      });
      setWeatherData(current);
      setForecast(dailyForecast.slice(0, 5));
      setHourlyForecast(hourlyForecast.slice(0, 24));
    } catch (error) {
      console.error('Error fetching weather data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch weather data",
        variant: "destructive",
      });
    }
  };

  // Weather icon component
  const WeatherIcon = ({ icon }) => {
    const iconMap = {
      "01d": "☀️",
      "01n": "🌙",
      "02d": "⛅",
      "02n": "☁️",
      "03d": "☁️",
      "03n": "☁️",
      "04d": "☁️",
      "04n": "☁️", 
      "09d": "🌧️",
      "09n": "🌧️",
      "10d": "🌦️",
      "10n": "🌧️",
      "11d": "⛈️",
      "11n": "⛈️",
      "13d": "❄️",
      "13n": "❄️",
      "50d": "🌫️",
      "50n": "🌫️"
    };
    
    return <span className="text-3xl">{iconMap[icon] || "🌤️"}</span>;
  };

  // Translate advisory when it changes or language changes
  useEffect(() => {
    if (!weatherData || !forecast.length) {
      setTranslatedAdvisory("");
      return;
    }
    let advisory = "";
    if (weatherData.weather[0].description.includes("rain")) {
      advisory = "Rain expected in your area. Hold off on applying fertilizers or pesticides as they may wash away. This is a good time for planting if your soil isn't waterlogged. Consider checking drainage systems in fields.";
    } else if (weatherData.main.temp > 30) {
      advisory = "High temperatures expected. Ensure crops receive adequate irrigation, preferably in early morning or evening to minimize evaporation. Monitor for heat stress in livestock and provide ample shade and water.";
    } else {
      advisory = "Weather conditions are favorable for most farming activities. A good time for field work, crop maintenance, and regular irrigation. Monitor soil moisture levels as moderate temperatures continue.";
    }
    if (selectedLang === "en") {
      setTranslatedAdvisory(advisory);
    } else {
      translateText(advisory, selectedLang).then(setTranslatedAdvisory);
    }
  }, [weatherData, forecast, selectedLang]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-8">
          <div className="text-center mb-12 mt-12">
            <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">{getText("pageTitle")}</h1>
            <p className="text-lg text-amber-800 max-w-2xl mx-auto">{getText("pageSubtitle")}</p>
          </div>

          <div className="w-full max-w-md mb-6 relative">
            <div className="flex w-full items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={getText("searchPlaceholder")}
                  value={location}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full pr-10"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-amber-100 max-h-60 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 cursor-pointer text-amber-900 border-b border-amber-100 last:border-b-0 flex items-center"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(suggestion);
                        }}
                      >
                        <Search className="h-4 w-4 mr-2 text-amber-600" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => {
                  setShowSuggestions(false);
                  fetchWeatherData();
                }} 
                disabled={loading} 
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {getText("loading")}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {getText("searchButton")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {weatherData && (
            <div className="w-full max-w-4xl">
              <Tabs defaultValue="current" className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-3 bg-white/90 rounded-xl shadow-md border border-amber-100">
                  <TabsTrigger value="current" className="text-amber-900">{getText("currentWeather")}</TabsTrigger>
                  <TabsTrigger value="forecast" className="text-amber-900">{getText("forecast")}</TabsTrigger>
                  <TabsTrigger value="poll" className="text-amber-900">{getText("poll")}</TabsTrigger>
                </TabsList>
                <TabsContent value="current" className="w-full">
                  <div className="overflow-hidden rounded-2xl shadow-lg border border-amber-100 bg-white/90 mb-6">
                    <div className="h-3 w-full bg-gradient-to-r from-amber-500 to-yellow-600" />
                    <CardHeader className="bg-amber-50 text-amber-900">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-2xl">{weatherData.name}, {weatherData.sys.country}</CardTitle>
                          <CardDescription className="text-amber-800/90 text-lg capitalize">
                            {weatherData.weather[0].description}
                          </CardDescription>
                          <p className="text-sm text-amber-800/80 mt-1">
                            {new Date(weatherData.dt * 1000).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-4xl font-bold flex items-center">
                          <WeatherIcon icon={weatherData.weather[0].icon} />
                          <span className="ml-2">{Math.round(weatherData.main.temp)}°C</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center p-4 bg-amber-50 rounded-lg">
                          <Thermometer className="h-8 w-8 text-amber-600 mr-4" />
                          <div>
                            <p className="text-sm text-amber-800">{getText("feelsLike")}</p>
                            <p className="text-xl font-semibold">{Math.round(weatherData.main.feels_like)}°C</p>
                          </div>
                        </div>
                        <div className="flex items-center p-4 bg-amber-50 rounded-lg">
                          <Droplets className="h-8 w-8 text-amber-600 mr-4" />
                          <div>
                            <p className="text-sm text-amber-800">{getText("humidity")}</p>
                            <p className="text-xl font-semibold">{weatherData.main.humidity}%</p>
                          </div>
                        </div>
                        <div className="flex items-center p-4 bg-amber-50 rounded-lg">
                          <Wind className="h-8 w-8 text-amber-600 mr-4" />
                          <div>
                            <p className="text-sm text-amber-800">{getText("windSpeed")}</p>
                            <p className="text-xl font-semibold">{weatherData.wind.speed} m/s</p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-2 text-amber-900">{getText("hourlyForecast")}</h3>
                        <div className="overflow-x-auto">
                          <div className="flex space-x-4 pb-2" style={{ minWidth: "max-content" }}>
                            {hourlyForecast.slice(0, 8).map((hour, index) => {
                              const time = new Date(hour.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              return (
                                <div key={index} className="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm">
                                  <p className="text-sm text-amber-800">{time}</p>
                                  <WeatherIcon icon={hour.weather[0].icon} />
                                  <p className="font-medium text-amber-900">{Math.round(hour.main.temp)}°C</p>
                                  <p className="text-xs text-amber-800">
                                    {hour.pop > 0.3 ? `${Math.round(hour.pop * 100)}% ${getText("rain")}` : getText("noRain")}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2 text-green-900">{getText("farmingAdvisory")}</h3>
                        <p className="text-green-900">
                          {weatherData && forecast.length > 0 ? translatedAdvisory : "Advisory will appear once weather data is loaded."}
                        </p>
                      </div>
                    </CardContent>
                  </div>
                </TabsContent>
                
                <TabsContent value="forecast">
                  <div className="overflow-hidden rounded-2xl shadow-lg border border-amber-100 bg-white/90 mb-6">
                    <div className="h-2 w-full bg-gradient-to-r from-amber-500 to-yellow-600" />
                    <CardHeader className="bg-amber-50 text-amber-900">
                      <CardTitle className="text-xl md:text-2xl">{getText("forecastTitle")}</CardTitle>
                      <CardDescription className="text-amber-800/90">{getText("forecastDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {forecast.map((day, index) => (
                          <div key={index} className="bg-white/90 p-4 rounded-lg shadow-sm border border-amber-100 flex flex-col items-center">
                            <p className="font-semibold text-amber-900">{formatDate(day.date)}</p>
                            <div className="my-2">
                              <WeatherIcon icon={day.icon} />
                            </div>
                            <p className="text-xl font-bold text-amber-900">{Math.round(day.temp)}°C</p>
                            <p className="text-sm text-amber-800 capitalize">{day.description}</p>
                            <div className="mt-3 text-xs text-amber-800 grid grid-cols-2 gap-1 w-full">
                              <div>
                                <Droplets className="h-3 w-3 inline mr-1" />
                                {day.humidity}%
                              </div>
                              <div>
                                <Wind className="h-3 w-3 inline mr-1" />
                                {day.windSpeed} m/s
                              </div>
                              <div className="col-span-2">
                                <Cloud className="h-3 w-3 inline mr-1" />
                                {day.rainChance}% {getText("rain")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </TabsContent>
                
                <TabsContent value="poll">
                  <div className="overflow-hidden rounded-2xl shadow-lg border border-green-200 bg-white/90 mb-6">
                    <div className="h-2 w-full bg-gradient-to-r from-green-400 to-green-600" />
                    <CardHeader className="bg-green-50 text-green-900">
                      <CardTitle className="text-xl md:text-2xl">{getText("pollTitle")}</CardTitle>
                      <CardDescription className="text-green-800/90">{getText("pollDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <h3 className="font-medium text-center mb-4 text-green-900">{getText("pollQuestion")}</h3>
                        <div className="flex justify-center gap-4">
                          <Button 
                            onClick={() => handlePollVote(true)}
                            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold"
                          >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            {getText("yesAccurate")}
                          </Button>
                          <Button 
                            onClick={() => handlePollVote(false)}
                            variant="outline"
                            className="flex items-center border-green-600 text-green-900"
                          >
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            {getText("noDifferent")}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-8">
                        <h3 className="font-medium text-center mb-4 text-green-900">{getText("communityResults")}</h3>
                        <p className="text-center text-sm mb-4 text-green-800">
                          <span className="font-bold text-lg">{pollData.total}</span> {getText("farmersShared")}
                        </p>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-green-900">{getText("accurate")}: {pollData.accurate} {getText("votes")}</span>
                              <span className="text-sm font-medium text-green-900">{pollData.total > 0 ? Math.round(pollData.accurate / pollData.total * 100) : 0}%</span>
                            </div>
                            <Progress value={pollData.total > 0 ? (pollData.accurate / pollData.total * 100) : 0} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-green-900">{getText("inaccurate")}: {pollData.inaccurate} {getText("votes")}</span>
                              <span className="text-sm font-medium text-green-900">{pollData.total > 0 ? Math.round(pollData.inaccurate / pollData.total * 100) : 0}%</span>
                            </div>
                            <Progress value={pollData.total > 0 ? (pollData.inaccurate / pollData.total * 100) : 0} className="h-2" />
                          </div>
                        </div>
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
                <CardTitle>{getText("getStartedTitle")}</CardTitle>
                <CardDescription>{getText("getStartedDescription")}</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherApp;