import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useState } from 'react';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript?.trim();

    if (transcript) {
      setRecognizedText(transcript);
      setError(null);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setError(event.message || 'Nie udało się rozpoznać mowy.');
  });

  const startListening = useCallback(async () => {
    try {
      setRecognizedText('');
      setError(null);

      const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permissions.granted) {
        setIsListening(false);
        setError('Brak pozwolenia na mikrofon.');
        return;
      }

      await ExpoSpeechRecognitionModule.start({
        lang: 'pl-PL',
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      setIsListening(false);
      setError(err instanceof Error ? err.message : 'Nie udało się uruchomić mikrofonu.');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignorujemy, bo Android czasem rzuca błąd gdy rozpoznawanie już się zatrzymało.
    } finally {
      setIsListening(false);
    }
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