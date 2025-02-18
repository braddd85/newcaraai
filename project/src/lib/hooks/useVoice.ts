import { useState, useRef, useEffect } from 'react';
import { AI_CONFIG } from '../constants';

interface UseVoiceProps {
  onTranscript?: (transcript: string) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export function useVoice({ onTranscript, onSpeakStart, onSpeakEnd }: UseVoiceProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscript?.(transcript);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [onTranscript]);

  const startListening = () => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition is not supported');
      return false;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) {
      console.warn('Speech synthesis is not supported');
      return false;
    }

    // Cancel any ongoing speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = AI_CONFIG.VOICE.DEFAULT_RATE;
    utterance.pitch = AI_CONFIG.VOICE.DEFAULT_PITCH;
    utterance.volume = AI_CONFIG.VOICE.DEFAULT_VOLUME;

    // Use a female voice if available
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakStart?.();
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };

    synthRef.current.speak(utterance);
    return true;
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      onSpeakEnd?.();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleSpeaking = (text?: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (text) {
      speak(text);
    }
  };

  return {
    isListening,
    isSpeaking,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleListening,
    toggleSpeaking,
    isVoiceSupported: !!recognitionRef.current,
    isSpeechSupported: !!synthRef.current,
  };
}