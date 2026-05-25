import { useCallback, useState } from 'react';

const VOICE_UNAVAILABLE_ERROR = 'Voice recognition requires custom dev build';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    setRecognizedText('');
    setIsListening(false);
    setError(VOICE_UNAVAILABLE_ERROR);
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setIsListening(false);
    setRecognizedText('');
    setError(null);
  }, []);

  return {
    isListening,
    recognizedText,
    error,
    startListening,
    stopListening,
    reset,
  };
}
