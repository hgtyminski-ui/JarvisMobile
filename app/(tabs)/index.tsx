import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { HudPanel } from '@/components/HudPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import {
  createNote as createBackendNote,
  deleteNote as deleteBackendNote,
  getAgents,
  getNote,
  getNotes,
  getPhonePending,
  getStatus,
  sendProcessText,
  toggleApp,
  type ApiConfig,
  type HistoryItem,
  type NoteDetail,
  type NoteSummary,
} from '@/services/api';
import {
  getMobileAppFromCommand,
  isMobileAppKey,
  MOBILE_APPS,
  openMobileApp,
  type MobileAppKey,
} from '@/services/mobileLinks';
import {
  clearSettings as clearStoredSettings,
  DEFAULT_API_TOKEN,
  DEFAULT_BACKEND_URL,
  DEFAULT_CONTROL_MODE,
  DEFAULT_DEVICE_ID,
  loadSettings,
  saveSettings as saveStoredSettings,
  type ControlMode,
} from '@/services/storage';
import { AppsScreen } from '@/screens/AppsScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { NotesScreen } from '@/screens/NotesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

type AppTab = 'chat' | 'apps' | 'notes' | 'settings';
type AgentStatus = 'online' | 'offline' | 'unknown';

function agentsPayloadContainsDevice(value: unknown, targetDeviceId: string): boolean {
  if (!targetDeviceId) {
    return false;
  }

  if (typeof value === 'string') {
    return value === targetDeviceId;
  }

  if (Array.isArray(value)) {
    return value.some((item) => agentsPayloadContainsDevice(item, targetDeviceId));
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;

    if (Object.prototype.hasOwnProperty.call(record, targetDeviceId)) {
      return true;
    }

    return Object.values(record).some((item) => agentsPayloadContainsDevice(item, targetDeviceId));
  }

  return false;
}

function formatAgentStatus(status: AgentStatus) {
  if (status === 'online') {
    return 'Online';
  }

  if (status === 'offline') {
    return 'Offline';
  }

  return 'Brak danych';
}

export default function HomeScreen() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [apiToken, setApiToken] = useState(DEFAULT_API_TOKEN);
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [controlMode, setControlMode] = useState<ControlMode>(DEFAULT_CONTROL_MODE);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [backendStatus, setBackendStatus] = useState('Nie sprawdzono');
  const [pcConnectionStatus, setPcConnectionStatus] = useState<'aktywne' | 'brak'>('brak');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('unknown');
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [notesStatus, setNotesStatus] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const skipNextSettingsSave = useRef(false);
  const pollingInFlight = useRef(false);
  const agentsStatusInFlight = useRef(false);
  const lastRecognizedText = useRef('');
  const speech = useSpeechRecognition();

  const apiConfig = useMemo<ApiConfig>(
    () => ({ backendUrl, apiToken, deviceId }),
    [apiToken, backendUrl, deviceId]
  );
  const canSend = useMemo(() => message.trim().length > 0 && !loading, [loading, message]);
  const voiceStatus = useMemo(() => {
    if (speech.isListening) {
      return 'Słucham...';
    }

    if (speech.recognizedText) {
      return `Rozpoznano: ${speech.recognizedText}`;
    }

    if (speech.error) {
      return speech.error;
    }

    return '';
  }, [speech.error, speech.isListening, speech.recognizedText]);

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

  const openPhoneAppWithHistory = useCallback(
    async (appKey: MobileAppKey, showStartMessage = true) => {
      if (showStartMessage) {
        addHistory('Telefon', `Otwieram ${MOBILE_APPS[appKey].label} na telefonie.`);
      }

      try {
        await openMobileApp(appKey, {
          onFallback: () => {
            addHistory('Telefon', 'Nie udało się otworzyć aplikacji, otwieram wersję web.', true);
          },
        });
      } catch {
        addHistory('Telefon', 'Nie udało się otworzyć aplikacji ani strony.', true);
      }
    },
    [addHistory]
  );

  const refreshAgentsStatus = useCallback(async () => {
    const cleanDeviceId = deviceId.trim();

    if (!settingsLoaded || !backendUrl.trim() || !apiToken.trim() || !cleanDeviceId) {
      setAgentStatus('unknown');
      return;
    }

    if (agentsStatusInFlight.current) {
      return;
    }

    agentsStatusInFlight.current = true;

    try {
      const agents = await getAgents(apiConfig);
      setAgentStatus(agentsPayloadContainsDevice(agents, cleanDeviceId) ? 'online' : 'offline');
    } catch {
      setAgentStatus('unknown');
    } finally {
      agentsStatusInFlight.current = false;
    }
  }, [apiConfig, apiToken, backendUrl, deviceId, settingsLoaded]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSettings() {
      try {
        const settings = await loadSettings();

        if (!isMounted) {
          return;
        }

        setBackendUrl(settings.backendUrl);
        setApiToken(settings.apiToken);
        setDeviceId(settings.deviceId);
        setControlMode(settings.controlMode);
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

    hydrateSettings();

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
        deviceId === DEFAULT_DEVICE_ID &&
        controlMode === DEFAULT_CONTROL_MODE
      ) {
        return;
      }
    }

    saveStoredSettings({ backendUrl, apiToken, deviceId, controlMode }).catch(() => {
      addHistory('Ustawienia', 'Nie udało się zapisać ustawień.', true);
    });
  }, [addHistory, apiToken, backendUrl, controlMode, deviceId, settingsLoaded]);

  useEffect(() => {
    refreshAgentsStatus();

    const intervalId = setInterval(refreshAgentsStatus, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshAgentsStatus]);

  useEffect(() => {
    if (!settingsLoaded || !backendUrl.trim() || !apiToken.trim()) {
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
        const result = await getPhonePending(apiConfig);

        if (!isMounted) {
          return;
        }

        setPcConnectionStatus(result.active ? 'aktywne' : 'brak');

        if (
          result.command?.action !== 'open_mobile_app' ||
          !result.command.target ||
          !isMobileAppKey(result.command.target)
        ) {
          return;
        }

        await openPhoneAppWithHistory(result.command.target, false);
        addHistory('PC', `Komenda z PC: otwieram ${result.command.target}`);
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
  }, [addHistory, apiConfig, apiToken, backendUrl, openPhoneAppWithHistory, settingsLoaded]);

  const loadNoteDetails = useCallback(
    async (noteId: string) => {
      setNotesLoading(true);
      setNotesStatus('');

      try {
        const detail = await getNote(apiConfig, noteId);
        setSelectedNoteId(detail.id);
        setSelectedNote(detail);
      } catch (error) {
        setNotesStatus(error instanceof Error ? error.message : 'Nieznany błąd.');
      } finally {
        setNotesLoading(false);
      }
    },
    [apiConfig]
  );

  const loadNotesList = useCallback(
    async (selectFirst = false) => {
      setNotesLoading(true);
      setNotesStatus('');

      try {
        const nextNotes = await getNotes(apiConfig);
        setNotes(nextNotes);

        if (selectFirst && nextNotes.length > 0) {
          await loadNoteDetails(nextNotes[0].id);
        } else if (nextNotes.length === 0) {
          setSelectedNoteId(null);
          setSelectedNote(null);
          setNotesStatus('Brak notatek.');
        }
      } catch (error) {
        setNotesStatus(error instanceof Error ? error.message : 'Nieznany błąd.');
      } finally {
        setNotesLoading(false);
      }
    },
    [apiConfig, loadNoteDetails]
  );

  const createNote = useCallback(async () => {
    const title = newNoteTitle.trim();
    const content = newNoteContent.trim();

    if (!title || !content) {
      setNotesStatus('Podaj tytuł i treść notatki.');
      return;
    }

    setNotesLoading(true);
    setNotesStatus('');

    try {
      await createBackendNote(apiConfig, { title, content });
      setNewNoteTitle('');
      setNewNoteContent('');
      setIsNewNoteOpen(false);
      await loadNotesList(true);
    } catch (error) {
      setNotesStatus(error instanceof Error ? error.message : 'Nieznany błąd.');
    } finally {
      setNotesLoading(false);
    }
  }, [apiConfig, loadNotesList, newNoteContent, newNoteTitle]);

  const deleteNote = useCallback(
    async (noteId: string) => {
      setNotesLoading(true);
      setNotesStatus('');

      try {
        await deleteBackendNote(apiConfig, noteId);
        setSelectedNoteId(null);
        setSelectedNote(null);
        await loadNotesList(true);
      } catch (error) {
        setNotesStatus(error instanceof Error ? error.message : 'Nieznany błąd.');
      } finally {
        setNotesLoading(false);
      }
    },
    [apiConfig, loadNotesList]
  );

  useEffect(() => {
    if (activeTab === 'notes' && settingsLoaded) {
      loadNotesList(notes.length === 0);
    }
  }, [activeTab, loadNotesList, notes.length, settingsLoaded]);

  useEffect(() => {
    const text = speech.recognizedText.trim();

    if (!text || text === lastRecognizedText.current) {
      return;
    }

    lastRecognizedText.current = text;
    setMessage(text);
  }, [speech.recognizedText]);

  async function checkStatus() {
    setLoading(true);

    try {
      const detail = await getStatus(apiConfig);
      setBackendStatus('Backend online / LM Studio gotowe');
      addHistory('Status', detail);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Nieznany błąd.';
      setBackendStatus(detail === 'Unauthorized' ? 'Unauthorized' : 'Backend offline');
      addHistory('Status', detail, true);
    } finally {
      refreshAgentsStatus();
      setLoading(false);
    }
  }

  async function clearSettings() {
    skipNextSettingsSave.current = true;

    try {
      await clearStoredSettings();
    } catch {
      skipNextSettingsSave.current = false;
      addHistory('Ustawienia', 'Nie udało się wyczyścić ustawień.', true);
      return;
    }

    setBackendUrl(DEFAULT_BACKEND_URL);
    setApiToken(DEFAULT_API_TOKEN);
    setDeviceId(DEFAULT_DEVICE_ID);
    setControlMode(DEFAULT_CONTROL_MODE);
    addHistory('Ustawienia', 'Ustawienia wyczyszczone.');
  }

  async function sendText(text: string) {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setLoading(true);

    try {
      const detail = await sendProcessText(apiConfig, cleanText);

      addHistory('Jarvis', detail);
      setMessage('');
    } catch (error) {
      addHistory(
        'Jarvis',
        error instanceof Error ? error.message : 'Nieznany błąd.',
        true
      );
    } finally {
      refreshAgentsStatus();
      setLoading(false);
    }
  }

  function sendMessage() {
    const cleanText = message.trim();

    if (controlMode === 'phone') {
      const phoneApp = getMobileAppFromCommand(cleanText);

      if (phoneApp) {
        setMessage('');
        openPhoneAppWithHistory(phoneApp);
        return;
      }

      sendText(cleanText);
      return;
    }

    sendText(cleanText);
  }

  function sendAppAction(appKey: MobileAppKey, action: 'otwórz' | 'zamknij') {
    if (controlMode === 'phone') {
      openPhoneAppWithHistory(appKey);
      return;
    }

    setLoading(true);
    toggleApp(apiConfig, appKey, action)
      .then((detail) => {
        addHistory('Command', detail);
      })
      .catch((error) => {
        addHistory('Command', error instanceof Error ? error.message : 'Nieznany błąd.', true);
      })
      .finally(() => {
        refreshAgentsStatus();
        setLoading(false);
      });
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

        <Pressable onPress={checkStatus} disabled={loading}>
          <HudPanel style={styles.statusPanel}>
            <Text style={styles.statusLabel}>Backend / LM Studio</Text>
            <Text selectable style={styles.statusValue}>
              {backendStatus}
            </Text>
            <StatusBadge
              label={`Połączenie z PC: ${pcConnectionStatus}`}
              status={pcConnectionStatus === 'aktywne' ? 'online' : 'offline'}
            />
            <StatusBadge
              label={`Agent PC: ${formatAgentStatus(agentStatus)}`}
              status={
                agentStatus === 'online'
                  ? 'online'
                  : agentStatus === 'offline'
                    ? 'offline'
                    : 'error'
              }
            />
            <Text selectable style={styles.statusMeta}>
              Device ID: {deviceId || 'hubert-pc'}
            </Text>
          </HudPanel>
        </Pressable>

        <View style={styles.modeSwitch}>
          <HudButton
            title="Steruj PC"
            active={controlMode === 'pc'}
            variant="ghost"
            onPress={() => setControlMode('pc')}
            style={styles.modeButton}
          />
          <HudButton
            title="Steruj telefonem"
            active={controlMode === 'phone'}
            variant="ghost"
            onPress={() => setControlMode('phone')}
            style={styles.modeButton}
          />
        </View>
      </View>

      <View style={styles.main}>
        {activeTab === 'chat' ? (
          <ChatScreen
            history={history}
            message={message}
            canSend={canSend}
            voiceStatus={voiceStatus}
            isListening={speech.isListening}
            onMessageChange={setMessage}
            onSend={sendMessage}
            onPushToTalkStart={speech.startListening}
            onPushToTalkEnd={speech.stopListening}
          />
        ) : null}
        {activeTab === 'apps' ? (
          <AppsScreen controlMode={controlMode} onAction={sendAppAction} loading={loading} />
        ) : null}
        {activeTab === 'notes' ? (
          <NotesScreen
            notes={notes}
            selectedNote={selectedNote}
            selectedNoteId={selectedNoteId}
            notesStatus={notesStatus}
            notesLoading={notesLoading}
            newNoteTitle={newNoteTitle}
            newNoteContent={newNoteContent}
            isNewNoteOpen={isNewNoteOpen}
            onRefresh={() => loadNotesList(true)}
            onSelectNote={loadNoteDetails}
            onDeleteNote={deleteNote}
            onCreateNote={createNote}
            onNewNoteTitleChange={setNewNoteTitle}
            onNewNoteContentChange={setNewNoteContent}
            onToggleNewNote={() => setIsNewNoteOpen((value) => !value)}
          />
        ) : null}
        {activeTab === 'settings' ? (
          <SettingsScreen
            backendUrl={backendUrl}
            apiToken={apiToken}
            deviceId={deviceId}
            controlMode={controlMode}
            onBackendUrlChange={setBackendUrl}
            onApiTokenChange={setApiToken}
            onDeviceIdChange={setDeviceId}
            onControlModeChange={setControlMode}
            onClearSettings={clearSettings}
          />
        ) : null}
      </View>

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

type NavButtonProps = {
  title: string;
  active: boolean;
  onPress: () => void;
};

function NavButton({ title, active, onPress }: NavButtonProps) {
  return (
    <HudButton
      title={title}
      active={active}
      variant="ghost"
      onPress={onPress}
      style={styles.navButton}
    />
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
    gap: 8,
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
  statusMeta: {
    color: '#9ab2ca',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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
    flex: 1,
  },
  main: {
    flex: 1,
    backgroundColor: '#05070d',
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
    paddingHorizontal: 4,
  },
});
