type SpeakJarvisOptions = {
  enabled: boolean;
  language: string;
  rate: string;
  pitch: string;
};

type SpeechResult = {
  ok: boolean;
  reason?: string;
};

type ExpoSpeechModule = {
  speak?: (
    text: string,
    options?: {
      language?: string;
      rate?: number;
      pitch?: number;
    }
  ) => void;
  stop?: () => void;
};

let speechModulePromise: Promise<ExpoSpeechModule | null> | null = null;

function parseSpeechNumber(value: string, fallback = 1) {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1.3, Math.max(0.8, parsed));
}

async function getSpeechModule() {
  if (!speechModulePromise) {
    speechModulePromise = import('expo-speech')
      .then((module) => module as ExpoSpeechModule)
      .catch((error) => {
        console.warn('expo-speech unavailable', error);
        return null;
      });
  }

  return speechModulePromise;
}

export async function stopJarvisSpeech(): Promise<SpeechResult> {
  const speech = await getSpeechModule();

  if (!speech?.stop) {
    return { ok: false, reason: 'TTS niedostępny na tym urządzeniu' };
  }

  try {
    speech.stop();
    return { ok: true };
  } catch (error) {
    console.warn('Could not stop speech', error);
    return { ok: false, reason: 'TTS niedostępny na tym urządzeniu' };
  }
}

export async function speakJarvisText(
  text: string,
  options: SpeakJarvisOptions
): Promise<SpeechResult> {
  const cleanText = text.trim();

  if (!options.enabled || !cleanText) {
    return { ok: true };
  }

  const speech = await getSpeechModule();

  if (!speech?.speak) {
    return { ok: false, reason: 'TTS niedostępny na tym urządzeniu' };
  }

  try {
    speech.stop?.();
    speech.speak(cleanText, {
      language: options.language.trim() || 'pl-PL',
      rate: parseSpeechNumber(options.rate),
      pitch: parseSpeechNumber(options.pitch),
    });
    return { ok: true };
  } catch (error) {
    console.warn('Could not speak Jarvis response', error);
    return { ok: false, reason: 'TTS niedostępny na tym urządzeniu' };
  }
}
