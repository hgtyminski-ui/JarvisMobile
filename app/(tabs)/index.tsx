import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DEFAULT_BACKEND_URL = 'http://192.168.68.50:8000';
const DEFAULT_API_TOKEN = '';
const DEFAULT_CONTROL_MODE = 'pc';
const COMMAND_PREFIXES = ['otwórz', 'zamknij', 'puść', 'znajdź na spotify'];
const SETTINGS_KEYS = {
  backendUrl: 'jarvis.settings.backendUrl',
  apiToken: 'jarvis.settings.apiToken',
  controlMode: 'jarvis.settings.controlMode',
};
const PHONE_APPS = {
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
const APP_KEYS = ['spotify', 'youtube', 'netflix', 'steam', 'discord', 'whatsapp', 'teams'] as const;
const NOTES = [
  {
    id: 'backend',
    title: 'Backend',
    body: 'Status backendu sprawdzisz z górnego panelu. Chat i komendy używają X-Jarvis-Token.',
  },
  {
    id: 'phone',
    title: 'Telefon',
    body: 'W trybie telefonu aplikacje otwierają się lokalnie przez deep link, a potem przez fallback web.',
  },
  {
    id: 'pc',
    title: 'PC',
    body: 'W trybie PC przyciski aplikacji wysyłają otwórz/zamknij do lokalnego backendu.',
  },
];

type HistoryItem = {
  id: number;
  title: string;
  detail: string;
  isError?: boolean;
};

type RequestMode = 'chat' | 'command';
type ControlMode = 'pc' | 'phone';
type PhoneAppKey = keyof typeof PHONE_APPS;
type AppTab = 'chat' | 'apps' | 'notes' | 'settings';
type PendingPhoneCommand = {
  action?: string;
  target?: string;
};

function trimSlash(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function isCommand(text: string) {
  const normalized = text.trim().toLowerCase();

  return COMMAND_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function getPhoneAppFromCommand(text: string) {
  const normalized = text.trim().toLowerCase();
  const match = normalized.match(/^otwórz\s+(.+)$/);

  if (!match) {
    return null;
  }

  const appName = match[1].trim();

  if (appName in PHONE_APPS) {
    return appName as PhoneAppKey;
  }

  return null;
}

function isPhoneAppKey(value: string): value is PhoneAppKey {
  return value in PHONE_APPS;
}

function readJsonValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

async function readBackendResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'OK';
  }

  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const responseValue = readJsonValue(data.response);
    const detailValue = readJsonValue(data.detail);

    if (responseValue) {
      return responseValue;
    }

    if (detailValue) {
      return `Błąd: ${detailValue}`;
    }

    return 'OK';
  } catch {
    return text;
  }
}

export default function HomeScreen() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [apiToken, setApiToken] = useState(DEFAULT_API_TOKEN);
  const [controlMode, setControlMode] = useState<ControlMode>(DEFAULT_CONTROL_MODE);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [backendStatus, setBackendStatus] = useState('Nie sprawdzono');
  const [pcConnectionStatus, setPcConnectionStatus] = useState<'aktywne' | 'brak'>('brak');
  const [selectedNoteId, setSelectedNoteId] = useState(NOTES[0].id);
  const skipNextSettingsSave = useRef(false);
  const pollingInFlight = useRef(false);

  const canSend = useMemo(() => message.trim().length > 0 && !loading, [loading, message]);
  const selectedNote = NOTES.find((note) => note.id === selectedNoteId) ?? NOTES[0];

  const addHistory = useCallback((title: string, detail: string, isError = false) => {
    setHistory((items) => [
      {
        id: Date.now() + Math.random(),
        title,
        detail,
        isError,
      },
      ...items,
    ]);
  }, []);

  const openPhoneApp = useCallback(
    async (appKey: PhoneAppKey, showStartMessage = true) => {
      const app = PHONE_APPS[appKey];

      if (showStartMessage) {
        addHistory('Telefon', `Otwieram ${app.label} na telefonie.`);
      }

      try {
        await Linking.openURL(app.deepLink);
      } catch {
        addHistory('Telefon', 'Nie udało się otworzyć aplikacji, otwieram wersję web.', true);

        try {
          await Linking.openURL(app.webLink);
        } catch {
          addHistory('Telefon', 'Nie udało się otworzyć aplikacji ani strony.', true);
        }
      }
    },
    [addHistory]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const values = await AsyncStorage.multiGet([
          SETTINGS_KEYS.backendUrl,
          SETTINGS_KEYS.apiToken,
          SETTINGS_KEYS.controlMode,
        ]);
        const settings = Object.fromEntries(values);
        const savedControlMode = settings[SETTINGS_KEYS.controlMode];

        if (!isMounted) {
          return;
        }

        setBackendUrl(settings[SETTINGS_KEYS.backendUrl] ?? DEFAULT_BACKEND_URL);
        setApiToken(settings[SETTINGS_KEYS.apiToken] ?? DEFAULT_API_TOKEN);
        setControlMode(
          savedControlMode === 'phone' || savedControlMode === 'pc'
            ? savedControlMode
            : DEFAULT_CONTROL_MODE
        );
      } catch {
        if (isMounted) {
          addHistory('Ustawienia', 'Nie udało się wczytać ustawień.', true);
        }
      } finally {
        if (isMounted) {
          setSettingsLoaded(true);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [addHistory]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    if (skipNextSettingsSave.current) {
      skipNextSettingsSave.current = false;

      if (
        backendUrl === DEFAULT_BACKEND_URL &&
        apiToken === DEFAULT_API_TOKEN &&
        controlMode === DEFAULT_CONTROL_MODE
      ) {
        return;
      }
    }

    AsyncStorage.multiSet([
      [SETTINGS_KEYS.backendUrl, backendUrl],
      [SETTINGS_KEYS.apiToken, apiToken],
      [SETTINGS_KEYS.controlMode, controlMode],
    ]).catch(() => {
      addHistory('Ustawienia', 'Nie udało się zapisać ustawień.', true);
    });
  }, [addHistory, apiToken, backendUrl, controlMode, settingsLoaded]);

  useEffect(() => {
    const baseUrl = trimSlash(backendUrl);
    const token = apiToken.trim();

    if (!settingsLoaded || !baseUrl || !token) {
      setPcConnectionStatus('brak');
      return;
    }

    let isMounted = true;

    async function pollPendingCommand() {
      if (pollingInFlight.current) {
        return;
      }

      pollingInFlight.current = true;

      try {
        const response = await fetch(`${baseUrl}/phone/pending`, {
          method: 'GET',
          headers: {
            'X-Jarvis-Token': token,
          },
        });

        if (!isMounted) {
          return;
        }

        setPcConnectionStatus('aktywne');

        if (!response.ok) {
          return;
        }

        if (response.status === 204) {
          return;
        }

        const text = await response.text();

        if (!text) {
          return;
        }

        let pending: PendingPhoneCommand;

        try {
          pending = JSON.parse(text) as PendingPhoneCommand;
        } catch {
          return;
        }

        if (pending.action !== 'open_mobile_app' || !pending.target) {
          return;
        }

        const target = pending.target.toLowerCase();

        if (!isPhoneAppKey(target)) {
          return;
        }

        await openPhoneApp(target, false);
        addHistory('PC', `Komenda z PC: otwieram ${target}`);
      } catch {
        if (isMounted) {
          setPcConnectionStatus('brak');
        }
      } finally {
        pollingInFlight.current = false;
      }
    }

    pollPendingCommand();
    const intervalId = setInterval(pollPendingCommand, 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [addHistory, apiToken, backendUrl, openPhoneApp, settingsLoaded]);

  async function requestBackend(path: string, options?: RequestInit) {
    const baseUrl = trimSlash(backendUrl);
    let response: Response;

    if (!baseUrl) {
      throw new Error('Podaj Backend URL.');
    }

    try {
      response = await fetch(`${baseUrl}${path}`, options);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Nie można połączyć się z backendem. ${error.message}`);
      }

      throw new Error('Nie można połączyć się z backendem.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }

    const detail = await readBackendResponse(response);

    if (!response.ok) {
      throw new Error(`Backend zwrócił błąd ${response.status}: ${detail}`);
    }

    return detail;
  }

  async function checkStatus() {
    setLoading(true);

    try {
      const detail = await requestBackend('/status');
      setBackendStatus('Backend online / LM Studio gotowe');
      addHistory('Status', detail);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Nieznany błąd.';
      setBackendStatus(detail === 'Unauthorized' ? 'Unauthorized' : 'Backend offline');
      addHistory('Status', detail, true);
    } finally {
      setLoading(false);
    }
  }

  async function clearSettings() {
    skipNextSettingsSave.current = true;

    try {
      await AsyncStorage.multiRemove([
        SETTINGS_KEYS.backendUrl,
        SETTINGS_KEYS.apiToken,
        SETTINGS_KEYS.controlMode,
      ]);
    } catch {
      skipNextSettingsSave.current = false;
      addHistory('Ustawienia', 'Nie udało się wyczyścić ustawień.', true);
      return;
    }

    setBackendUrl(DEFAULT_BACKEND_URL);
    setApiToken(DEFAULT_API_TOKEN);
    setControlMode(DEFAULT_CONTROL_MODE);
    addHistory('Ustawienia', 'Ustawienia wyczyszczone.');
  }

  async function sendText(text: string, mode: RequestMode) {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setLoading(true);

    try {
      const detail = await requestBackend(mode === 'command' ? '/command' : '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Jarvis-Token': apiToken,
        },
        body: JSON.stringify(mode === 'command' ? { command: cleanText } : { message: cleanText }),
      });

      addHistory(mode === 'command' ? 'Command' : 'Chat', detail);
      setMessage('');
    } catch (error) {
      addHistory(
        mode === 'command' ? 'Command' : 'Chat',
        error instanceof Error ? error.message : 'Nieznany błąd.',
        true
      );
    } finally {
      setLoading(false);
    }
  }

  function sendMessage() {
    const cleanText = message.trim();

    if (controlMode === 'phone') {
      const phoneApp = getPhoneAppFromCommand(cleanText);

      if (phoneApp) {
        setMessage('');
        openPhoneApp(phoneApp);
        return;
      }

      sendText(cleanText, 'chat');
      return;
    }

    sendText(cleanText, isCommand(cleanText) ? 'command' : 'chat');
  }

  function sendAppAction(appKey: PhoneAppKey, action: 'otwórz' | 'zamknij') {
    if (controlMode === 'phone') {
      openPhoneApp(appKey);
      return;
    }

    sendText(`${action} ${appKey}`, 'command');
  }

  return (
    <KeyboardAvoidingView style={styles.app} behavior="padding">
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.kicker}>LOCAL AI CONTROL</Text>
            <Text style={styles.title}>JARVIS MOBILE</Text>
          </View>
          {loading ? <ActivityIndicator color="#22f2ff" /> : null}
        </View>

        <Pressable onPress={checkStatus} disabled={loading} style={styles.statusPanel}>
          <Text style={styles.statusLabel}>Backend / LM Studio</Text>
          <Text selectable style={styles.statusValue}>
            {backendStatus}
          </Text>
          <Text selectable style={styles.pcConnectionValue}>
            Połączenie z PC: {pcConnectionStatus}
          </Text>
        </Pressable>

        <View style={styles.modeSwitch}>
          <ModeButton
            title="Steruj PC"
            active={controlMode === 'pc'}
            onPress={() => setControlMode('pc')}
          />
          <ModeButton
            title="Steruj telefonem"
            active={controlMode === 'phone'}
            onPress={() => setControlMode('phone')}
          />
        </View>
      </View>

      <View style={styles.main}>
        {activeTab === 'chat' ? <ChatLog history={history} /> : null}
        {activeTab === 'apps' ? (
          <AppsPanel
            controlMode={controlMode}
            onAction={sendAppAction}
            loading={loading}
          />
        ) : null}
        {activeTab === 'notes' ? (
          <NotesPanel
            selectedNote={selectedNote}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
          />
        ) : null}
        {activeTab === 'settings' ? (
          <SettingsPanel
            backendUrl={backendUrl}
            apiToken={apiToken}
            onBackendUrlChange={setBackendUrl}
            onApiTokenChange={setApiToken}
            onClearSettings={clearSettings}
          />
        ) : null}
      </View>

      {activeTab === 'chat' ? (
        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Wiadomość albo komenda..."
            placeholderTextColor="#6e8397"
            style={styles.messageInput}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              (pressed || !canSend) && styles.buttonPressed,
            ]}>
            <Text style={styles.sendButtonText}>Wyślij</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bottomNav}>
        <NavButton title="Chat" active={activeTab === 'chat'} onPress={() => setActiveTab('chat')} />
        <NavButton
          title="Aplikacje"
          active={activeTab === 'apps'}
          onPress={() => setActiveTab('apps')}
        />
        <NavButton
          title="Notatki"
          active={activeTab === 'notes'}
          onPress={() => setActiveTab('notes')}
        />
        <NavButton
          title="Ustawienia"
          active={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

type ChatLogProps = {
  history: HistoryItem[];
};

function ChatLog({ history }: ChatLogProps) {
  return (
    <ScrollView
      style={styles.panelScroll}
      contentContainerStyle={styles.logContent}
      contentInsetAdjustmentBehavior="automatic">
      {history.length === 0 ? (
        <View style={styles.emptyLog}>
          <Text style={styles.emptyTitle}>System log gotowy</Text>
          <Text selectable style={styles.emptyText}>
            Sprawdź status backendu albo wyślij wiadomość do Jarvisa.
          </Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.id} style={[styles.logItem, item.isError && styles.errorItem]}>
            <Text style={[styles.logTitle, item.isError && styles.errorText]}>{item.title}</Text>
            <Text selectable style={styles.logDetail}>
              {item.detail}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

type AppsPanelProps = {
  controlMode: ControlMode;
  loading: boolean;
  onAction: (appKey: PhoneAppKey, action: 'otwórz' | 'zamknij') => void;
};

function AppsPanel({ controlMode, loading, onAction }: AppsPanelProps) {
  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.appsContent}>
      {APP_KEYS.map((appKey) => {
        const app = PHONE_APPS[appKey];

        return (
          <View key={appKey} style={styles.appTile}>
            <View>
              <Text style={styles.appName}>{app.label}</Text>
              <Text style={styles.appMode}>
                {controlMode === 'pc' ? 'Backend PC' : 'Telefon lokalnie'}
              </Text>
            </View>

            <View style={styles.appActions}>
              <Pressable
                onPress={() => onAction(appKey, 'otwórz')}
                disabled={loading}
                style={({ pressed }) => [
                  styles.appActionPrimary,
                  (pressed || loading) && styles.buttonPressed,
                ]}>
                <Text style={styles.appActionPrimaryText}>Otwórz</Text>
              </Pressable>

              {controlMode === 'pc' ? (
                <Pressable
                  onPress={() => onAction(appKey, 'zamknij')}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.appActionSecondary,
                    (pressed || loading) && styles.buttonPressed,
                  ]}>
                  <Text style={styles.appActionSecondaryText}>Zamknij</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

type NotesPanelProps = {
  selectedNote: (typeof NOTES)[number];
  selectedNoteId: string;
  onSelectNote: (noteId: string) => void;
};

function NotesPanel({ selectedNote, selectedNoteId, onSelectNote }: NotesPanelProps) {
  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.notesContent}>
      <View style={styles.noteList}>
        {NOTES.map((note) => (
          <Pressable
            key={note.id}
            onPress={() => onSelectNote(note.id)}
            style={[styles.noteRow, selectedNoteId === note.id && styles.noteRowActive]}>
            <Text style={styles.noteTitle}>{note.title}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.notePreview}>
        <Text style={styles.sectionTitle}>{selectedNote.title}</Text>
        <Text selectable style={styles.noteBody}>
          {selectedNote.body}
        </Text>
      </View>
    </ScrollView>
  );
}

type SettingsPanelProps = {
  backendUrl: string;
  apiToken: string;
  onBackendUrlChange: (value: string) => void;
  onApiTokenChange: (value: string) => void;
  onClearSettings: () => void;
};

function SettingsPanel({
  backendUrl,
  apiToken,
  onBackendUrlChange,
  onApiTokenChange,
  onClearSettings,
}: SettingsPanelProps) {
  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.settingsContent}>
      <Text style={styles.sectionTitle}>Ustawienia</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          value={backendUrl}
          onChangeText={onBackendUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.68.50:8000"
          placeholderTextColor="#6e8397"
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>API Token</Text>
        <TextInput
          value={apiToken}
          onChangeText={onApiTokenChange}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="X-Jarvis-Token"
          placeholderTextColor="#6e8397"
          style={styles.input}
        />
      </View>

      <Pressable onPress={onClearSettings} style={styles.clearButton}>
        <Text style={styles.clearButtonText}>Wyczyść ustawienia</Text>
      </Pressable>
    </ScrollView>
  );
}

type ModeButtonProps = {
  title: string;
  active: boolean;
  onPress: () => void;
};

function ModeButton({ title, active, onPress }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{title}</Text>
    </Pressable>
  );
}

type NavButtonProps = {
  title: string;
  active: boolean;
  onPress: () => void;
};

function NavButton({ title, active, onPress }: NavButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        active && styles.navButtonActive,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={[styles.navButtonText, active && styles.navButtonTextActive]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#05070d',
  },
  header: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#151d35',
    backgroundColor: '#05070d',
  },
  headerTop: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: {
    color: '#9b7cff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#f2fbff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statusPanel: {
    gap: 4,
    borderWidth: 1,
    borderColor: '#1e6f9b',
    borderRadius: 8,
    backgroundColor: '#081322',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusLabel: {
    color: '#22f2ff',
    fontSize: 13,
    fontWeight: '800',
  },
  statusValue: {
    color: '#d9f7ff',
    fontSize: 16,
    lineHeight: 22,
  },
  pcConnectionValue: {
    color: '#9b7cff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#182a50',
    borderRadius: 8,
    backgroundColor: '#080d1b',
    padding: 6,
  },
  modeButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  modeButtonActive: {
    backgroundColor: '#22f2ff',
  },
  modeButtonText: {
    color: '#9ab2ca',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: '#03101a',
  },
  main: {
    flex: 1,
    backgroundColor: '#05070d',
  },
  panelScroll: {
    flex: 1,
  },
  logContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 24,
  },
  emptyLog: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#173559',
    borderRadius: 8,
    backgroundColor: '#081322',
    padding: 18,
  },
  emptyTitle: {
    color: '#f2fbff',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: '#9ab2ca',
    fontSize: 16,
    lineHeight: 24,
  },
  logItem: {
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#22f2ff',
    borderRadius: 8,
    backgroundColor: '#081322',
    padding: 16,
  },
  errorItem: {
    borderLeftColor: '#ff5b8a',
    backgroundColor: '#1b0815',
  },
  logTitle: {
    color: '#22f2ff',
    fontSize: 15,
    fontWeight: '900',
  },
  logDetail: {
    color: '#d8edf4',
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    color: '#ff8eb0',
  },
  appsContent: {
    gap: 16,
    padding: 18,
    paddingBottom: 26,
  },
  appTile: {
    gap: 16,
    borderWidth: 1,
    borderColor: '#1e3569',
    borderRadius: 8,
    backgroundColor: '#081322',
    padding: 18,
  },
  appName: {
    color: '#f2fbff',
    fontSize: 24,
    fontWeight: '900',
  },
  appMode: {
    color: '#9ab2ca',
    fontSize: 15,
    lineHeight: 22,
  },
  appActions: {
    flexDirection: 'row',
    gap: 12,
  },
  appActionPrimary: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#22f2ff',
  },
  appActionPrimaryText: {
    color: '#03101a',
    fontSize: 17,
    fontWeight: '900',
  },
  appActionSecondary: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9b7cff',
    borderRadius: 8,
    backgroundColor: '#110d28',
  },
  appActionSecondaryText: {
    color: '#dbcfff',
    fontSize: 17,
    fontWeight: '900',
  },
  notesContent: {
    gap: 18,
    padding: 18,
    paddingBottom: 26,
  },
  noteList: {
    gap: 12,
  },
  noteRow: {
    minHeight: 58,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3569',
    borderRadius: 8,
    backgroundColor: '#081322',
    paddingHorizontal: 16,
  },
  noteRowActive: {
    borderColor: '#22f2ff',
    backgroundColor: '#0a1b30',
  },
  noteTitle: {
    color: '#f2fbff',
    fontSize: 18,
    fontWeight: '900',
  },
  notePreview: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#2c1f70',
    borderRadius: 8,
    backgroundColor: '#0d0a22',
    padding: 18,
  },
  sectionTitle: {
    color: '#f2fbff',
    fontSize: 22,
    fontWeight: '900',
  },
  noteBody: {
    color: '#d8edf4',
    fontSize: 17,
    lineHeight: 26,
  },
  settingsContent: {
    gap: 18,
    padding: 18,
    paddingBottom: 26,
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    color: '#9fefff',
    fontSize: 15,
    fontWeight: '800',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#1e6f9b',
    borderRadius: 8,
    backgroundColor: '#081322',
    color: '#f2fbff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
  },
  clearButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff5b8a',
    borderRadius: 8,
    backgroundColor: '#1b0815',
    paddingHorizontal: 14,
  },
  clearButtonText: {
    color: '#ffc0d0',
    fontSize: 17,
    fontWeight: '900',
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#151d35',
    backgroundColor: '#05070d',
  },
  messageInput: {
    minHeight: 54,
    maxHeight: 116,
    flex: 1,
    borderWidth: 1,
    borderColor: '#1e6f9b',
    borderRadius: 8,
    backgroundColor: '#081322',
    color: '#f2fbff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    textAlignVertical: 'top',
  },
  sendButton: {
    minHeight: 54,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#22f2ff',
    paddingHorizontal: 16,
  },
  sendButtonText: {
    color: '#03101a',
    fontSize: 17,
    fontWeight: '900',
  },
  bottomNav: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#151d35',
    backgroundColor: '#05070d',
  },
  navButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  navButtonActive: {
    backgroundColor: '#121a36',
  },
  navButtonText: {
    color: '#7e91a8',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  navButtonTextActive: {
    color: '#22f2ff',
  },
  buttonPressed: {
    opacity: 0.55,
  },
});
