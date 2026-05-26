import AsyncStorage from '@react-native-async-storage/async-storage';

export type ControlMode = 'pc' | 'phone';

export type JarvisSettings = {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
  controlMode: ControlMode;
};

export const DEFAULT_BACKEND_URL = 'http://192.168.68.50:8000';
export const DEFAULT_API_TOKEN = '';
export const DEFAULT_DEVICE_ID = 'hubert-pc';
export const DEFAULT_CONTROL_MODE: ControlMode = 'pc';

const SETTINGS_KEYS = {
  backendUrl: 'jarvis.settings.backendUrl',
  apiToken: 'jarvis.settings.apiToken',
  deviceId: 'jarvis.settings.deviceId',
  controlMode: 'jarvis.settings.controlMode',
};

export async function loadSettings(): Promise<JarvisSettings> {
  const values = await AsyncStorage.multiGet([
    SETTINGS_KEYS.backendUrl,
    SETTINGS_KEYS.apiToken,
    SETTINGS_KEYS.deviceId,
    SETTINGS_KEYS.controlMode,
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
  };
}

export async function saveSettings(settings: JarvisSettings) {
  await AsyncStorage.multiSet([
    [SETTINGS_KEYS.backendUrl, settings.backendUrl],
    [SETTINGS_KEYS.apiToken, settings.apiToken],
    [SETTINGS_KEYS.deviceId, settings.deviceId],
    [SETTINGS_KEYS.controlMode, settings.controlMode],
  ]);
}

export async function clearSettings() {
  await AsyncStorage.multiRemove([
    SETTINGS_KEYS.backendUrl,
    SETTINGS_KEYS.apiToken,
    SETTINGS_KEYS.deviceId,
    SETTINGS_KEYS.controlMode,
  ]);
}
