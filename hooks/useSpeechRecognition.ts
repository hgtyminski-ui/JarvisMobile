import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice';
import { useCallback, useEffect, useState } from 'react';

const VOICE_UNAVAILABLE_ERROR = 'Voice recognition requires custom dev build';
const VOICE_MODULE_UNAVAILABLE_ERROR = 'Voice module unavailable';

function getVoiceErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return VOICE_UNAVAILABLE_ERROR;
}

function warnVoiceError(context: string, error: unknown) {
  console.warn(`[Jarvis Voice] ${context}`, error);
}

function isVoiceReady() {
  return Boolean(
    Voice &&
      typeof Voice.start === 'function' &&
      typeof Voice.stop === 'function' &&
      typeof Voice.destroy === 'function' &&
      typeof Voice.removeAllListeners === 'function'
  );
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVoiceReady()) {
      setError(VOICE_MODULE_UNAVAILABLE_ERROR);
      return;
    }

    Voice.onSpeechStart = () => {
      setIsListening(true);
      setError(null);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechResults = (event: SpeechResultsEvent) => {
      setRecognizedText(event.value?.[0] ?? '');
    };

    Voice.onSpeechError = (event: SpeechErrorEvent) => {
      setError(event.error?.message ?? event.error?.code ?? 'Voice recognition error');
      setIsListening(false);
    };

    return () => {
      if (!isVoiceReady()) {
        return;
      }

      Voice.destroy()
        .then(Voice.removeAllListeners)
        .catch((destroyError) => {
          warnVoiceError('destroy failed', destroyError);
        });
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isVoiceReady()) {
      setError(VOICE_MODULE_UNAVAILABLE_ERROR);
      setIsListening(false);
      return;
    }

    setRecognizedText('');
    setError(null);

    try {
      await Voice.start('pl-PL');
    } catch (startError) {
      warnVoiceError('start failed', startError);
      setError(getVoiceErrorMessage(startError) || VOICE_MODULE_UNAVAILABLE_ERROR);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!isVoiceReady()) {
      setError(VOICE_MODULE_UNAVAILABLE_ERROR);
      setIsListening(false);
      return;
    }

    try {
      await Voice.stop();
    } catch (stopError) {
      warnVoiceError('stop failed', stopError);
      setError('Voice module unavailable');
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
