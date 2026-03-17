import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { groqChat } from '@/utils/groqApi';

interface VoiceAssistantProps {
  selectedLang: string;
  texts?: Record<string, any>;
}

const langToSpeechCode: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', mr: 'mr-IN',
  bn: 'bn-IN', pa: 'pa-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN',
  ur: 'ur-IN', or: 'or-IN', as: 'as-IN', sa: 'sa-IN',
};

const langNames: Record<string, string> = {
  en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', mr: 'Marathi',
  bn: 'Bengali', kn: 'Kannada', ml: 'Malayalam', gu: 'Gujarati',
  pa: 'Punjabi', ur: 'Urdu', or: 'Odia', as: 'Assamese', sa: 'Sanskrit',
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ selectedLang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      synthRef.current.cancel();
    };
  }, []);

  const startListening = () => {
    setError('');
    setTranscript('');
    setResponse('');
    lastTranscriptRef.current = '';

    if (!window.isSecureContext) {
      setError('Voice input requires HTTPS (secure context). Please use the deployed site or enable HTTPS locally.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use Chrome or Edge.');
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
      console.log("Voice Recognition Result:", current);
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = lastTranscriptRef.current.trim();
      console.log("Voice Recognition Ended. Final Text:", finalText);
      if (finalText) {
        processQuery(finalText);
      } else if (!error) {
        // Only show "No speech detected" if there wasn't a more specific error already
        // But often onend fires if the user just stops talking, so we check if there's any text
        if (!lastTranscriptRef.current.trim()) {
           // Don't necessarily error here, let the user try again
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error, event.message);
      setIsListening(false);
      if (event.error === 'no-speech') {
        // This often happens if the user doesn't say anything for a few seconds
        setError('No speech detected. Please speak clearly into the microphone.');
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied or not available. Please check browser permissions.');
      } else if (event.error === 'network') {
        setError('Voice recognition network error. Common causes: mic permission blocked, insecure HTTP site, or restricted networks/trackers blocking the speech service. Please try Chrome/Edge on HTTPS and allow microphone.');
      } else {
        setError(`Voice recognition error: ${event.error}. Please try again.`);
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

      const responseText = await groqChat([
        {
          role: "system",
          content: `You are CloudCrop AI, a helpful agricultural assistant for Indian farmers. You help with crop recommendations, weather guidance, market prices, soil analysis, and farming tips. Keep responses concise (2-3 sentences) since they will be spoken aloud. Respond in ${languageName} language.`,
        },
        { role: "user", content: query },
      ], { temperature: 0.7, maxTokens: 300 });

      setResponse(responseText || 'Sorry, I could not process your question.');
      speakText(responseText);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Voice assistant error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
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
            isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
          } text-white transition-all duration-300`}
          size="icon"
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
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Mic className="w-5 h-5" />
                CloudCrop AI Voice
              </h3>
              <p className="text-sm text-green-100">Tap the mic and ask anything about farming</p>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3 border border-red-100">{error}</div>
              )}

              {transcript && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">You said:</p>
                  <div className="bg-amber-50 text-amber-900 p-3 rounded-lg text-sm border border-amber-100">{transcript}</div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-green-700 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              )}

              {response && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">CloudCrop AI:</p>
                  <div className="bg-green-50 text-green-900 p-3 rounded-lg text-sm border border-green-100">{response}</div>
                </div>
              )}

              {!transcript && !response && !error && !isListening && !isProcessing && (
                <div className="text-center py-6 text-gray-500">
                  <Mic className="w-10 h-10 mx-auto mb-2 text-green-300" />
                  <p className="text-sm">Press the mic button and ask about crops, weather, prices, or farming tips</p>
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
                  <p className="text-sm text-red-600 mt-3 font-medium">Listening...</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-green-100 bg-gray-50 flex justify-center gap-3">
              {!isListening ? (
                <Button onClick={startListening} disabled={isProcessing} className="rounded-full w-12 h-12 bg-green-500 hover:bg-green-600 text-white shadow-md" size="icon">
                  <Mic className="w-5 h-5" />
                </Button>
              ) : (
                <Button onClick={stopListening} className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white shadow-md animate-pulse" size="icon">
                  <MicOff className="w-5 h-5" />
                </Button>
              )}
              {isSpeaking && (
                <Button onClick={stopSpeaking} variant="outline" className="rounded-full w-12 h-12 border-amber-300 text-amber-600" size="icon">
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
