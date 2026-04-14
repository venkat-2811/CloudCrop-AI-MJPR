import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Loader2, MessageCircle, Globe, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { groqChat, checkGroqApiHealth } from '@/utils/groqApi';

interface VoiceAssistantProps {
  selectedLang: string;
  texts?: Record<string, any>;
}

const langToSpeechCode: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', ml: 'ml-IN',
  or: 'or-IN', as: 'as-IN', ur: 'ur-IN', bho: 'hi-IN',
};

const langNames: Record<string, string> = {
  en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', kn: 'Kannada',
  mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi',
  ml: 'Malayalam', or: 'Odia', as: 'Assamese', ur: 'Urdu', bho: 'Bhojpuri',
};

const langNativeNames: Record<string, string> = {
  en: 'English', hi: 'हिन्दी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ',
  mr: 'मराठी', bn: 'বাংলা', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ',
  ml: 'മലയാളം', or: 'ଓଡ଼ିଆ', as: 'অসমীয়া', ur: 'اردو', bho: 'भोजपुरी',
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ selectedLang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);
  // Safe: initialize synthRef lazily in useEffect to avoid SSR/undefined window issues
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastTranscriptRef = useRef('');

  // Initialize speechSynthesis safely after mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      synthRef.current?.cancel();
    };
  }, []);

  // Check API health when panel opens
  useEffect(() => {
    if (isOpen && apiHealthy === null) {
      checkGroqApiHealth().then(result => {
        setApiHealthy(result.ok);
        if (!result.ok) {
          console.warn('GROQ API health check failed:', result.error);
        }
      });
    }
  }, [isOpen]);

  // Stop speaking when language changes so old utterance doesn't overlap
  useEffect(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    // Reset transcript/response on language switch so user gets a fresh start
    if (isOpen) {
      setTranscript('');
      setResponse('');
      setError('');
    }
  }, [selectedLang]);

  const startListening = () => {
    setError('');
    setTranscript('');
    setResponse('');
    lastTranscriptRef.current = '';

    // Check API health first
    if (apiHealthy === false) {
      setError('The AI service is currently unavailable. Please type your question below instead.');
      return;
    }

    if (typeof window === 'undefined' || !window.isSecureContext) {
      setError('Voice input requires HTTPS. Please use the deployed site or localhost. You can type your question below.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use Chrome or Edge, or type your question below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langToSpeechCode[selectedLang] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }
      const current = finalTranscript || interimTranscript;
      setTranscript(current);
      lastTranscriptRef.current = current;
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = lastTranscriptRef.current.trim();
      if (finalText) {
        processQuery(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please speak clearly into the microphone, or type your question below.');
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone permission in your browser settings, or type your question below.');
      } else if (event.error === 'network') {
        setError('Speech recognition service is unavailable (requires internet and HTTPS). Please type your question below instead.');
      } else if (event.error === 'audio-capture') {
        setError('No microphone found. Please connect a microphone, or type your question below.');
      } else if (event.error === 'aborted') {
        // User aborted, no error needed
      } else {
        setError(`Voice recognition error: ${event.error}. You can type your question below instead.`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const processQuery = async (query: string) => {
    setIsProcessing(true);
    setError('');

    try {
      const languageName = langNames[selectedLang] || 'English';

      const responseText = await groqChat(
        [
          {
            role: 'system',
            content: `You are CloudCrop AI, a voice-first agricultural assistant for Indian farmers. Provide practical, actionable advice on crops, weather, market prices, pests, irrigation, and government schemes like PMFBY and MSP. Always respond concisely in ${languageName} language. Keep your answer under 3 sentences.`,
          },
          { role: 'user', content: query },
        ],
        { temperature: 0.7, maxTokens: 300 }
      );

      const finalResponse = responseText || 'Sorry, I could not process your question.';
      setResponse(finalResponse);
      speakText(finalResponse);
    } catch (err: any) {
      // Differentiate API errors from network errors
      const errMsg = err?.message || '';
      if (errMsg.includes('500') || errMsg.includes('502')) {
        setError('The AI service encountered an error. The GROQ API key may not be configured. Please try again later.');
      } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        setError('Cannot reach the AI service. Please check your internet connection and try again.');
      } else {
        setError('Failed to get a response from the AI service. Please try again.');
      }
      console.error('Voice assistant error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    const query = textInput.trim();
    if (!query || isProcessing) return;
    setTranscript(query);
    setTextInput('');
    processQuery(query);
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langToSpeechCode[selectedLang] || 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const currentLangNative = langNativeNames[selectedLang] || 'English';

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`rounded-full w-14 h-14 shadow-xl ${
            isOpen
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
          } text-white transition-all duration-300`}
          size="icon"
          title={isOpen ? 'Close voice assistant' : `Voice Assistant (${currentLangNative})`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Mic className="w-5 h-5" />
                CloudCrop AI Voice
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-green-200" />
                <p className="text-sm text-green-100">
                  Listening in <span className="font-semibold text-white">{currentLangNative}</span>
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {/* API Warning */}
              {apiHealthy === false && (
                <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg mb-3 border border-amber-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>AI service may be unavailable. You can still type your question below.</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3 border border-red-100">
                  {error}
                </div>
              )}

              {transcript && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">You said:</p>
                  <div className="bg-amber-50 text-amber-900 p-3 rounded-lg text-sm border border-amber-100">
                    {transcript}
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-green-700 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking in {currentLangNative}...
                </div>
              )}

              {response && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">CloudCrop AI:</p>
                  <div className="bg-green-50 text-green-900 p-3 rounded-lg text-sm border border-green-100">
                    {response}
                  </div>
                </div>
              )}

              {!transcript && !response && !error && !isListening && !isProcessing && apiHealthy !== false && (
                <div className="text-center py-6 text-gray-500">
                  <Mic className="w-10 h-10 mx-auto mb-2 text-green-300" />
                  <p className="text-sm">
                    Press the mic and ask about crops, weather, prices, or farming tips in{' '}
                    <span className="font-medium text-green-600">{currentLangNative}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Or type your question below</p>
                </div>
              )}

              {isListening && (
                <div className="text-center py-6">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-full bg-red-100 animate-pulse flex items-center justify-center">
                      <Mic className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping" />
                  </div>
                  <p className="text-sm text-red-600 mt-3 font-medium">Listening in {currentLangNative}...</p>
                </div>
              )}
            </div>

            {/* Text Input Fallback */}
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                  placeholder={`Type in ${currentLangNative}...`}
                  className="flex-1 text-sm h-9 border-green-100 focus-visible:ring-green-200"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleTextSubmit}
                  disabled={isProcessing || !textInput.trim()}
                  className="rounded-full w-9 h-9 bg-green-500 hover:bg-green-600 text-white p-0"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Controls */}
            <div className="p-3 border-t border-green-100 bg-gray-50 flex justify-center gap-3">
              {!isListening ? (
                <Button
                  onClick={startListening}
                  disabled={isProcessing}
                  className="rounded-full w-12 h-12 bg-green-500 hover:bg-green-600 text-white shadow-md"
                  size="icon"
                  title={`Speak in ${currentLangNative}`}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white shadow-md animate-pulse"
                  size="icon"
                >
                  <MicOff className="w-5 h-5" />
                </Button>
              )}
              {isSpeaking && (
                <Button
                  onClick={stopSpeaking}
                  variant="outline"
                  className="rounded-full w-12 h-12 border-amber-300 text-amber-600"
                  size="icon"
                  title="Stop speaking"
                >
                  <Volume2 className="w-5 h-5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
