import { Linking } from 'react-native';

export const MOBILE_APPS = {
  spotify: {
    label: 'Spotify',
    deepLink: 'spotify:',
    webLink: 'https://open.spotify.com',
  },
  youtube: {
    label: 'YouTube',
    deepLink: 'vnd.youtube://',
    webLink: 'https://www.youtube.com',
  },
  netflix: {
    label: 'Netflix',
    deepLink: 'nflx://',
    webLink: 'https://www.netflix.com',
  },
  steam: {
    label: 'Steam',
    deepLink: 'steam://',
    webLink: 'https://store.steampowered.com',
  },
  discord: {
    label: 'Discord',
    deepLink: 'discord://',
    webLink: 'https://discord.com/app',
  },
  whatsapp: {
    label: 'WhatsApp',
    deepLink: 'whatsapp://',
    webLink: 'https://wa.me/',
  },
  teams: {
    label: 'Teams',
    deepLink: 'msteams://',
    webLink: 'https://teams.microsoft.com',
  },
};

export const APP_KEYS = [
  'spotify',
  'youtube',
  'netflix',
  'steam',
  'discord',
  'whatsapp',
  'teams',
] as const;

export type MobileAppKey = keyof typeof MOBILE_APPS;

export type OpenMobileAppResult = {
  label: string;
  usedFallback: boolean;
};

const OPEN_COMMAND_PREFIXES = ['open', 'otw\u00f3rz', 'otworz', 'uruchom', 'odpal'];

export function isMobileAppKey(value: string): value is MobileAppKey {
  return value in MOBILE_APPS;
}

export function getMobileAppFromCommand(text: string) {
  const normalized = text.trim().toLowerCase();
  const prefix = OPEN_COMMAND_PREFIXES.find((command) => normalized.startsWith(`${command} `));

  if (!prefix) {
    return null;
  }

  const appName = normalized.slice(prefix.length).trim();

  return isMobileAppKey(appName) ? appName : null;
}

export async function openMobileApp(
  target: MobileAppKey,
  options?: { onFallback?: () => void }
): Promise<OpenMobileAppResult> {
  const app = MOBILE_APPS[target];

  try {
    await Linking.openURL(app.deepLink);
    return { label: app.label, usedFallback: false };
  } catch {
    options?.onFallback?.();
    await Linking.openURL(app.webLink);
    return { label: app.label, usedFallback: true };
  }
}
