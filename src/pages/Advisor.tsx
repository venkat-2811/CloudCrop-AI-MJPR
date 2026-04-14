import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Bot, User, Leaf, Cloud, TrendingUp, Bug, Landmark, Droplets, Mic, MicOff, Sparkles, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { groqChat, type GroqMessage } from "@/utils/groqApi";
import type { PageProps } from "@/types/common";
import { getUserProfile, addInteraction } from "@/utils/userProfile";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { label: "Best crop for my region", icon: Leaf },
  { label: "Current market prices", icon: TrendingUp },
  { label: "Weather advisory", icon: Cloud },
  { label: "Pest control tips", icon: Bug },
  { label: "Government schemes", icon: Landmark },
  { label: "Irrigation planning", icon: Droplets },
];

const langToSpeechCode: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN", mr: "mr-IN",
  bn: "bn-IN", pa: "pa-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN",
  ur: "ur-IN", or: "or-IN", as: "as-IN", bho: "hi-IN",
};

const langNames: Record<string, string> = {
  en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
  bn: "Bengali", kn: "Kannada", ml: "Malayalam", gu: "Gujarati",
  pa: "Punjabi", ur: "Urdu", or: "Odia", as: "Assamese", bho: "Bhojpuri",
};

const SYSTEM_PROMPT = `You are CloudCrop AI, a knowledgeable agricultural advisor for Indian farmers with deep expertise in: crop selection and rotation, weather-based farming decisions, market price intelligence, soil health and fertilizer recommendations, pest and disease management, irrigation planning, yield optimization, government schemes (PMFBY, PM-KISAN, MSP, e-NAM, Kisan Credit Card), and sustainable farming practices. Always provide specific, practical, actionable advice. When asked about prices or yield, give realistic numbers relevant to Indian agriculture.`;

const Advisor = ({ selectedLang, texts, loading: externalLoading }: PageProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Welcome message
    setMessages([{
      role: "assistant",
      content: "🌾 **Namaste! I'm CloudCrop AI**, your agricultural advisor.\n\nI can help you with:\n- 🌱 Crop recommendations for your region\n- ☁️ Weather-based farming guidance\n- 📈 Market price analysis and trends\n- 🏞️ Soil analysis and improvement\n- 📊 Yield estimation and optimization\n\nAsk me anything about farming, or try one of the quick actions below!",
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const languageName = langNames[selectedLang] || "English";
      const langInstruction = selectedLang !== "en"
        ? `\nRespond in ${languageName} language only.`
        : "";

      const profile = getUserProfile();
      const profileContext = profile.location || profile.cropPreferences.length
        ? `\nUser profile: ${JSON.stringify(profile)}`
        : "";

      const conversationHistory: GroqMessage[] = [
        { role: "system", content: SYSTEM_PROMPT + langInstruction + profileContext },
      ];

      // Add last 6 messages for context
      const recentMessages = messages.slice(-6);
      recentMessages.forEach(msg => {
        conversationHistory.push({ role: msg.role, content: msg.content });
      });
      conversationHistory.push({ role: "user", content: text.trim() });

      const response = await groqChat(conversationHistory, {
        temperature: 0.7,
        maxTokens: 1500,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response || "I apologize, I couldn't process your question. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Append interaction summary to profile
      try {
        addInteraction(text.trim().slice(0, 100));
      } catch {}
    } catch (err) {
      console.error("Advisor error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm(texts?.clearChatConfirm || "Are you sure you want to clear the chat history?")) {
      setMessages([{
        role: "assistant",
        content: "Chat cleared. How can I help you today?",
        timestamp: new Date(),
      }]);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Voice input is not supported in this browser. Please use Chrome or Edge.",
        timestamp: new Date(),
      }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langToSpeechCode[selectedLang] || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      sendMessage(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const formatMessage = (text: string) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- /gm, '• ')
      .replace(/^### (.*$)/gm, '<h4 class="font-semibold text-base mt-2 mb-1">$1</h4>')
      .replace(/^## (.*$)/gm, '<h3 class="font-bold text-lg mt-3 mb-1">$1</h3>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 mt-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent mb-3">
              {texts?.advisorTitle || "AI Agricultural Advisor"}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {texts?.advisorSubtitle || "Ask anything about farming — crops, weather, markets, soil, or tips"}
            </p>
          </motion.div>

          {/* Chat Container */}
          <div className="w-full max-w-3xl">
            {/* Clear Chat Button */}
            {messages.length > 1 && (
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-gray-500 hover:text-red-500">
                  <Trash2 className="w-4 h-4 mr-1" />{texts?.clearChat || "Clear Chat"}
                </Button>
              </div>
            )}
            {/* Messages */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 mb-4 overflow-hidden">
              <div className="h-[55vh] overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === "user"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                      }`}>
                        <div
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />
                        <p className={`text-xs mt-1 ${msg.role === "user" ? "text-green-200" : "text-gray-400"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Thinking...</span>
                          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-auto p-3 text-left border-green-100 hover:bg-green-50 hover:border-green-200 transition-all"
                    onClick={() => setInput(action.label)}
                    disabled={loading}
                  >
                    <action.icon className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-700">{action.label}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <Card className="border-purple-100 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {/* Voice Input */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    className={`rounded-full flex-shrink-0 ${isListening ? "bg-red-100 text-red-600 animate-pulse" : "text-gray-500 hover:text-green-600"}`}
                    disabled={loading}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>

                  <Input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage(input)}
                    placeholder="Ask about crops, weather, market prices..."
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    disabled={loading}
                  />

                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                    className="rounded-full bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                    size="icon"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-gray-400 mt-2">
              Powered by CloudCrop AI • Supports 15 Indian languages via voice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advisor;
