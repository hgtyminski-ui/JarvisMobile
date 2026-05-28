import { useCallback, useState } from 'react';

const VOICE_FALLBACK_MESSAGE =
  'Rozpoznawanie mowy na telefonie będzie dodane później.';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    setIsListening(false);
    setRecognizedText('');
    setError(VOICE_FALLBACK_MESSAGE);
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
