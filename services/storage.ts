import AsyncStorage from '@react-native-async-storage/async-storage';

export type ControlMode = 'pc' | 'phone';

export type JarvisSettings = {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
  controlMode: ControlMode;
  textScale: string;
  hudScale: string;
  showStatusPanel: boolean;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceRate: string;
  voicePitch: string;
  microphoneEnabled: boolean;
  pttMode: boolean;
};

export type PendingNoteDraft = {
  content: string;
  waitingFor: 'title';
};

export const DEFAULT_BACKEND_URL = 'http://192.168.68.50:8000';
export const DEFAULT_API_TOKEN = '';
export const DEFAULT_DEVICE_ID = 'hubert-pc';
export const DEFAULT_CONTROL_MODE: ControlMode = 'pc';
export const DEFAULT_TEXT_SCALE = '1.0';
export const DEFAULT_HUD_SCALE = '1.0';
export const DEFAULT_SHOW_STATUS_PANEL = true;
export const DEFAULT_VOICE_ENABLED = false;
export const DEFAULT_VOICE_LANGUAGE = 'pl-PL';
export const DEFAULT_VOICE_RATE = '1.0';
export const DEFAULT_VOICE_PITCH = '1.0';
export const DEFAULT_MICROPHONE_ENABLED = false;
export const DEFAULT_PTT_MODE = true;

const SETTINGS_KEYS = {
  backendUrl: 'jarvis.settings.backendUrl',
  apiToken: 'jarvis.settings.apiToken',
  deviceId: 'jarvis.settings.deviceId',
  controlMode: 'jarvis.settings.controlMode',
  textScale: 'jarvis.settings.textScale',
  hudScale: 'jarvis.settings.hudScale',
  showStatusPanel: 'jarvis.settings.showStatusPanel',
  voiceEnabled: 'jarvis.settings.voiceEnabled',
  voiceLanguage: 'jarvis.settings.voiceLanguage',
  voiceRate: 'jarvis.settings.voiceRate',
  voicePitch: 'jarvis.settings.voicePitch',
  microphoneEnabled: 'jarvis.settings.microphoneEnabled',
  pttMode: 'jarvis.settings.pttMode',
};

const PENDING_NOTE_DRAFT_KEY = 'jarvis.pendingNoteDraft';

function readBoolean(value: string | null | undefined, fallback: boolean) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}

export async function loadSettings(): Promise<JarvisSettings> {
  const values = await AsyncStorage.multiGet([
    SETTINGS_KEYS.backendUrl,
    SETTINGS_KEYS.apiToken,
    SETTINGS_KEYS.deviceId,
    SETTINGS_KEYS.controlMode,
    SETTINGS_KEYS.textScale,
    SETTINGS_KEYS.hudScale,
    SETTINGS_KEYS.showStatusPanel,
    SETTINGS_KEYS.voiceEnabled,
    SETTINGS_KEYS.voiceLanguage,
    SETTINGS_KEYS.voiceRate,
    SETTINGS_KEYS.voicePitch,
    SETTINGS_KEYS.microphoneEnabled,
    SETTINGS_KEYS.pttMode,
  ]);
  const settings = Object.fromEntries(values);
  const savedControlMode = settings[SETTINGS_KEYS.controlMode];

  return {
    backendUrl: settings[SETTINGS_KEYS.backendUrl] ?? DEFAULT_BACKEND_URL,
    apiToken: settings[SETTINGS_KEYS.apiToken] ?? DEFAULT_API_TOKEN,
    deviceId: settings[SETTINGS_KEYS.deviceId] ?? DEFAULT_DEVICE_ID,
    controlMode:
      savedControlMode === 'phone' || savedControlMode === 'pc'
        ? savedControlMode
        : DEFAULT_CONTROL_MODE,
    textScale: settings[SETTINGS_KEYS.textScale] ?? DEFAULT_TEXT_SCALE,
    hudScale: settings[SETTINGS_KEYS.hudScale] ?? DEFAULT_HUD_SCALE,
    showStatusPanel: readBoolean(
      settings[SETTINGS_KEYS.showStatusPanel],
      DEFAULT_SHOW_STATUS_PANEL
    ),
    voiceEnabled: readBoolean(settings[SETTINGS_KEYS.voiceEnabled], DEFAULT_VOICE_ENABLED),
    voiceLanguage: settings[SETTINGS_KEYS.voiceLanguage] ?? DEFAULT_VOICE_LANGUAGE,
    voiceRate: settings[SETTINGS_KEYS.voiceRate] ?? DEFAULT_VOICE_RATE,
    voicePitch: settings[SETTINGS_KEYS.voicePitch] ?? DEFAULT_VOICE_PITCH,
    microphoneEnabled: readBoolean(
      settings[SETTINGS_KEYS.microphoneEnabled],
      DEFAULT_MICROPHONE_ENABLED
    ),
    pttMode: readBoolean(settings[SETTINGS_KEYS.pttMode], DEFAULT_PTT_MODE),
  };
}

export async function saveSettings(settings: JarvisSettings) {
  await AsyncStorage.multiSet([
    [SETTINGS_KEYS.backendUrl, settings.backendUrl],
    [SETTINGS_KEYS.apiToken, settings.apiToken],
    [SETTINGS_KEYS.deviceId, settings.deviceId],
    [SETTINGS_KEYS.controlMode, settings.controlMode],
    [SETTINGS_KEYS.textScale, settings.textScale],
    [SETTINGS_KEYS.hudScale, settings.hudScale],
    [SETTINGS_KEYS.showStatusPanel, String(settings.showStatusPanel)],
    [SETTINGS_KEYS.voiceEnabled, String(settings.voiceEnabled)],
    [SETTINGS_KEYS.voiceLanguage, settings.voiceLanguage],
    [SETTINGS_KEYS.voiceRate, settings.voiceRate],
    [SETTINGS_KEYS.voicePitch, settings.voicePitch],
    [SETTINGS_KEYS.microphoneEnabled, String(settings.microphoneEnabled)],
    [SETTINGS_KEYS.pttMode, String(settings.pttMode)],
  ]);
}

export async function clearSettings() {
  await AsyncStorage.multiRemove([
    SETTINGS_KEYS.backendUrl,
    SETTINGS_KEYS.apiToken,
    SETTINGS_KEYS.deviceId,
    SETTINGS_KEYS.controlMode,
    SETTINGS_KEYS.textScale,
    SETTINGS_KEYS.hudScale,
    SETTINGS_KEYS.showStatusPanel,
    SETTINGS_KEYS.voiceEnabled,
    SETTINGS_KEYS.voiceLanguage,
    SETTINGS_KEYS.voiceRate,
    SETTINGS_KEYS.voicePitch,
    SETTINGS_KEYS.microphoneEnabled,
    SETTINGS_KEYS.pttMode,
  ]);
}

export async function loadPendingNoteDraft(): Promise<PendingNoteDraft | null> {
  const rawValue = await AsyncStorage.getItem(PENDING_NOTE_DRAFT_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const value = JSON.parse(rawValue) as Partial<PendingNoteDraft>;

    if (value.waitingFor === 'title' && typeof value.content === 'string' && value.content.trim()) {
      return {
        content: value.content,
        waitingFor: 'title',
      };
    }
  } catch {
    await clearPendingNoteDraft();
  }

  return null;
}

export async function savePendingNoteDraft(draft: PendingNoteDraft) {
  await AsyncStorage.setItem(PENDING_NOTE_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearPendingNoteDraft() {
  await AsyncStorage.removeItem(PENDING_NOTE_DRAFT_KEY);
}
