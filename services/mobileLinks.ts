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

const OPEN_COMMAND_PREFIXES = ['open', 'otwórz', 'otworz', 'uruchom', 'odpal'];
const WHATSAPP_LINKS = [
  { url: 'whatsapp://', checkCanOpen: true },
  { url: 'whatsapp://send', checkCanOpen: true },
  { url: 'intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;end', checkCanOpen: false },
  { url: 'market://details?id=com.whatsapp', checkCanOpen: false },
];

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

async function tryOpenUrl(url: string, checkCanOpen = true) {
  if (checkCanOpen) {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      return false;
    }
  }

  await Linking.openURL(url);
  return true;
}

async function openWhatsApp(): Promise<OpenMobileAppResult> {
  for (const [index, link] of WHATSAPP_LINKS.entries()) {
    try {
      const opened = await tryOpenUrl(link.url, link.checkCanOpen);

      if (opened) {
        return { label: MOBILE_APPS.whatsapp.label, usedFallback: index > 0 };
      }
    } catch {
      // Try the next WhatsApp-compatible Android link.
    }
  }

  throw new Error('Nie udało się otworzyć WhatsApp.');
}

export async function openMobileApp(
  target: MobileAppKey,
  options?: { onFallback?: () => void }
): Promise<OpenMobileAppResult> {
  const app = MOBILE_APPS[target];

  if (target === 'whatsapp') {
    return openWhatsApp();
  }

  try {
    await Linking.openURL(app.deepLink);
    return { label: app.label, usedFallback: false };
  } catch {
    options?.onFallback?.();
    await Linking.openURL(app.webLink);
    return { label: app.label, usedFallback: true };
  }
}
