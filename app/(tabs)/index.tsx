import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { HudBackground } from '@/components/HudBackground';
import { HudButton } from '@/components/HudButton';
import { HudPanel } from '@/components/HudPanel';
import { HudScaleProvider, useHudScale } from '@/components/HudScaleProvider';
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
  sendProcessTextDetailed,
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
  clearPendingNoteDraft as clearStoredPendingNoteDraft,
  DEFAULT_API_TOKEN,
  DEFAULT_BACKEND_URL,
  DEFAULT_CONTROL_MODE,
  DEFAULT_DEVICE_ID,
  DEFAULT_HUD_SCALE,
  DEFAULT_MICROPHONE_ENABLED,
  DEFAULT_PTT_MODE,
  DEFAULT_SHOW_STATUS_PANEL,
  DEFAULT_TEXT_SCALE,
  DEFAULT_VOICE_ENABLED,
  DEFAULT_VOICE_LANGUAGE,
  DEFAULT_VOICE_PITCH,
  DEFAULT_VOICE_RATE,
  loadSettings,
  loadPendingNoteDraft,
  savePendingNoteDraft as saveStoredPendingNoteDraft,
  saveSettings as saveStoredSettings,
  type ControlMode,
  type PendingNoteDraft,
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

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isBareNoteRequest(value: string) {
  const normalized = normalizeText(value);

  return normalized === 'zapisz notatke' || normalized === 'dodaj notatke';
}

function isCancelPendingNoteRequest(value: string) {
  const normalized = normalizeText(value);

  return normalized === 'anuluj' || normalized === 'cancel';
}

function looksLikeSavedNoteResponse(value: string) {
  const normalized = normalizeText(value);

  return (
    normalized.includes('notatk') &&
    (normalized.includes('zapis') ||
      normalized.includes('dod') ||
      normalized.includes('utworz'))
  );
}

function parseScaleValue(value: string, fallback = 1) {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function HomeScreen() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [apiToken, setApiToken] = useState(DEFAULT_API_TOKEN);
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [controlMode, setControlMode] = useState<ControlMode>(DEFAULT_CONTROL_MODE);
  const [textScale, setTextScale] = useState(DEFAULT_TEXT_SCALE);
  const [hudScale, setHudScale] = useState(DEFAULT_HUD_SCALE);
  const [showStatusPanel, setShowStatusPanel] = useState(DEFAULT_SHOW_STATUS_PANEL);
  const [voiceEnabled, setVoiceEnabled] = useState(DEFAULT_VOICE_ENABLED);
  const [voiceLanguage, setVoiceLanguage] = useState(DEFAULT_VOICE_LANGUAGE);
  const [voiceRate, setVoiceRate] = useState(DEFAULT_VOICE_RATE);
  const [voicePitch, setVoicePitch] = useState(DEFAULT_VOICE_PITCH);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(DEFAULT_MICROPHONE_ENABLED);
  const [pttMode, setPttMode] = useState(DEFAULT_PTT_MODE);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
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
  const [pendingNoteDraft, setPendingNoteDraft] = useState<PendingNoteDraft | null>(null);
  const skipNextSettingsSave = useRef(false);
  const pollingInFlight = useRef(false);
  const agentsStatusInFlight = useRef(false);
  const lastRecognizedText = useRef('');
  const speech = useSpeechRecognition();

  const apiConfig = useMemo<ApiConfig>(
    () => ({ backendUrl, apiToken, deviceId }),
    [apiToken, backendUrl, deviceId]
  );
  const resolvedTextScale = parseScaleValue(textScale);
  const resolvedHudScale = parseScaleValue(hudScale);
  const scaleText = useCallback(
    (size: number) => Math.round(size * resolvedTextScale),
    [resolvedTextScale]
  );
  const scaleHud = useCallback(
    (size: number) => Math.round(size * resolvedHudScale),
    [resolvedHudScale]
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
  const coreStatus = useMemo(() => {
    if (speech.isListening) {
      return 'LISTENING';
    }

    if (loading) {
      return 'PROCESSING';
    }

    return 'READY';
  }, [loading, speech.isListening]);

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
    } catch (error) {
        addHistory(
          'Telefon',
          error instanceof Error ? error.message : 'Nie udało się otworzyć aplikacji ani strony.',
          true
        );
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
        setTextScale(settings.textScale);
        setHudScale(settings.hudScale);
        setShowStatusPanel(settings.showStatusPanel);
        setVoiceEnabled(settings.voiceEnabled);
        setVoiceLanguage(settings.voiceLanguage);
        setVoiceRate(settings.voiceRate);
        setVoicePitch(settings.voicePitch);
        setMicrophoneEnabled(settings.microphoneEnabled);
        setPttMode(settings.pttMode);

        const draft = await loadPendingNoteDraft();

        if (isMounted) {
          setPendingNoteDraft(draft);
        }
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
        controlMode === DEFAULT_CONTROL_MODE &&
        textScale === DEFAULT_TEXT_SCALE &&
        hudScale === DEFAULT_HUD_SCALE &&
        showStatusPanel === DEFAULT_SHOW_STATUS_PANEL &&
        voiceEnabled === DEFAULT_VOICE_ENABLED &&
        voiceLanguage === DEFAULT_VOICE_LANGUAGE &&
        voiceRate === DEFAULT_VOICE_RATE &&
        voicePitch === DEFAULT_VOICE_PITCH &&
        microphoneEnabled === DEFAULT_MICROPHONE_ENABLED &&
        pttMode === DEFAULT_PTT_MODE
      ) {
        return;
      }
    }

    saveStoredSettings({
      backendUrl,
      apiToken,
      deviceId,
      controlMode,
      textScale,
      hudScale,
      showStatusPanel,
      voiceEnabled,
      voiceLanguage,
      voiceRate,
      voicePitch,
      microphoneEnabled,
      pttMode,
    }).catch(() => {
      addHistory('Ustawienia', 'Nie udało się zapisać ustawień.', true);
    });
  }, [
    addHistory,
    apiToken,
    backendUrl,
    controlMode,
    deviceId,
    hudScale,
    microphoneEnabled,
    pttMode,
    settingsLoaded,
    showStatusPanel,
    textScale,
    voiceEnabled,
    voiceLanguage,
    voicePitch,
    voiceRate,
  ]);

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

  const clearPendingNote = useCallback(async () => {
    setPendingNoteDraft(null);
    await clearStoredPendingNoteDraft();
  }, []);

  const savePendingNoteWithTitle = useCallback(
    async (title: string) => {
      const cleanTitle = title.trim();

      if (!pendingNoteDraft || pendingNoteDraft.waitingFor !== 'title' || !cleanTitle) {
        return;
      }

      setLoading(true);

      try {
        await createBackendNote(apiConfig, {
          title: cleanTitle,
          content: pendingNoteDraft.content,
        });
        await clearPendingNote();
        setMessage('');
        addHistory('Notatki', `Zapisałem notatkę: ${cleanTitle}`);
        await loadNotesList(true);
      } catch {
        addHistory('Notatki', 'Nie udało się zapisać notatki. Spróbuj ponownie.', true);
      } finally {
        setLoading(false);
      }
    },
    [addHistory, apiConfig, clearPendingNote, loadNotesList, pendingNoteDraft]
  );

  useEffect(() => {
    if (activeTab === 'notes' && settingsLoaded) {
      loadNotesList(false);
    }
  }, [activeTab, loadNotesList, settingsLoaded]);

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
      addHistory('Status', detail);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Nieznany błąd.';
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
    setTextScale(DEFAULT_TEXT_SCALE);
    setHudScale(DEFAULT_HUD_SCALE);
    setShowStatusPanel(DEFAULT_SHOW_STATUS_PANEL);
    setVoiceEnabled(DEFAULT_VOICE_ENABLED);
    setVoiceLanguage(DEFAULT_VOICE_LANGUAGE);
    setVoiceRate(DEFAULT_VOICE_RATE);
    setVoicePitch(DEFAULT_VOICE_PITCH);
    setMicrophoneEnabled(DEFAULT_MICROPHONE_ENABLED);
    setPttMode(DEFAULT_PTT_MODE);
    addHistory('Ustawienia', 'Ustawienia wyczyszczone.');
  }

  async function sendText(text: string) {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setLoading(true);

    try {
      const result = await sendProcessTextDetailed(apiConfig, cleanText);
      const detail = result.response;

      addHistory('Jarvis', detail);
      setMessage('');

      if (
        result.status === 'need_input' &&
        result.missing === 'title' &&
        result.draft?.content
      ) {
        const draft: PendingNoteDraft = {
          content: result.draft.content,
          waitingFor: 'title',
        };

        setPendingNoteDraft(draft);
        await saveStoredPendingNoteDraft(draft);
      }

      if (looksLikeSavedNoteResponse(detail)) {
        await loadNotesList(true);
      }
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

    if (pendingNoteDraft?.waitingFor === 'title') {
      if (isCancelPendingNoteRequest(cleanText)) {
        setMessage('');
        clearPendingNote()
          .then(() => {
            addHistory('Notatki', 'Anulowano zapisywanie notatki.');
          })
          .catch(() => {
            addHistory('Notatki', 'Anulowano zapisywanie notatki.');
          });
        return;
      }

      savePendingNoteWithTitle(cleanText);
      return;
    }

    if (isBareNoteRequest(cleanText)) {
      setMessage('');
      setNewNoteContent('');
      setIsNewNoteOpen(true);
      setActiveTab('notes');
      setNotesStatus('Podaj tytuł notatki.');
      addHistory('Notatki', 'Podaj tytuł notatki.');
      return;
    }

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
      if (action === 'zamknij') {
        addHistory(
          'Telefon',
          'Zamykanie aplikacji telefonu wymaga Tasker/MacroDroid lub Accessibility.',
          true
        );
        return;
      }

      openPhoneAppWithHistory(appKey);
      return;
    }

    setLoading(true);
    const actionRequest =
      appKey === 'whatsapp' && action === 'zamknij'
        ? sendProcessText(apiConfig, 'zamknij whatsapp')
        : toggleApp(apiConfig, appKey, action);

    actionRequest
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
    <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
      <StatusBar hidden />
      <HudBackground />
      <HudScaleProvider textScale={textScale} hudScale={hudScale}>
      <KeyboardAvoidingView style={styles.keyboard} behavior="padding">
      <View style={[styles.header, { gap: scaleHud(9), paddingHorizontal: scaleHud(24), paddingTop: scaleHud(10), paddingBottom: scaleHud(7) }]}>
        <View style={[styles.headerTop, { minHeight: scaleHud(56), gap: scaleHud(16) }]}>
          <View>
            <Text style={[styles.kicker, { fontSize: scaleText(11), letterSpacing: scaleText(4) }]}>LOCAL AI CONTROL</Text>
            <Text style={[styles.title, { fontSize: scaleText(28), letterSpacing: scaleText(7) }]}>JARVIS MOBILE</Text>
          </View>
          {loading ? <ActivityIndicator color="#22f2ff" style={[styles.loadingIndicator, { top: scaleHud(18) }]} /> : null}
        </View>

        {showStatusPanel ? (
        <Pressable onPress={checkStatus} disabled={loading}>
            <HudPanel style={[styles.statusPanel, { minHeight: scaleHud(44), gap: scaleHud(8), paddingHorizontal: scaleHud(8), paddingVertical: scaleHud(5) }]}>
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
          </HudPanel>
        </Pressable>
        ) : null}

        <View style={[styles.modeSwitch, { gap: scaleHud(10), paddingHorizontal: scaleHud(20) }]}>
          <HudButton
            title="Steruj PC"
            active={controlMode === 'pc'}
            variant="ghost"
            onPress={() => setControlMode('pc')}
            style={[styles.modeButton, { minHeight: scaleHud(36) }]}
          />
          <HudButton
            title="Steruj telefonem"
            active={controlMode === 'phone'}
            variant="ghost"
            onPress={() => setControlMode('phone')}
            style={[styles.modeButton, { minHeight: scaleHud(36) }]}
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
            coreStatus={coreStatus}
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
            textScale={textScale}
            hudScale={hudScale}
            showStatusPanel={showStatusPanel}
            voiceEnabled={voiceEnabled}
            voiceLanguage={voiceLanguage}
            voiceRate={voiceRate}
            voicePitch={voicePitch}
            microphoneEnabled={microphoneEnabled}
            pttMode={pttMode}
            onBackendUrlChange={setBackendUrl}
            onApiTokenChange={setApiToken}
            onDeviceIdChange={setDeviceId}
            onControlModeChange={setControlMode}
            onTextScaleChange={setTextScale}
            onHudScaleChange={setHudScale}
            onShowStatusPanelChange={setShowStatusPanel}
            onVoiceEnabledChange={setVoiceEnabled}
            onVoiceLanguageChange={setVoiceLanguage}
            onVoiceRateChange={setVoiceRate}
            onVoicePitchChange={setVoicePitch}
            onMicrophoneEnabledChange={setMicrophoneEnabled}
            onPttModeChange={setPttMode}
            onClearSettings={clearSettings}
          />
        ) : null}
      </View>

      <View style={[styles.bottomNav, { gap: scaleHud(6), marginHorizontal: scaleHud(18), marginBottom: scaleHud(7), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(8), paddingTop: scaleHud(9), paddingBottom: scaleHud(7) }]}>
        <NavButton
          title="Chat"
          icon="message-circle"
          active={activeTab === 'chat'}
          onPress={() => setActiveTab('chat')}
        />
        <NavButton
          title="Aplikacje"
          icon="grid"
          active={activeTab === 'apps'}
          onPress={() => setActiveTab('apps')}
        />
        <NavButton
          title="Notatki"
          icon="file-text"
          active={activeTab === 'notes'}
          onPress={() => setActiveTab('notes')}
        />
        <NavButton
          title="Ustawienia"
          icon="settings"
          active={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
        />
      </View>
      </KeyboardAvoidingView>
      </HudScaleProvider>
    </SafeAreaView>
  );
}

type NavButtonProps = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
};

function NavButton({ title, icon, active, onPress }: NavButtonProps) {
  const { scaleHud, scaleText } = useHudScale();
  const color = active ? '#24c7d6' : '#8896b4';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        { minHeight: scaleHud(54), gap: scaleHud(4), paddingHorizontal: scaleHud(2) },
        pressed && styles.navButtonPressed,
      ]}>
      <Feather name={icon} size={scaleHud(22)} color={color} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          styles.navButtonText,
          { fontSize: scaleText(12), lineHeight: scaleText(14) },
          active ? styles.navButtonTextActive : styles.navButtonTextInactive,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#030814',
  },
  keyboard: {
    flex: 1,
  },
  header: {
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 0,
  },
  kicker: {
    color: '#8d75c9',
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: '#24c7d6',
    fontWeight: '300',
    textAlign: 'center',
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeSwitch: {
    flexDirection: 'row',
  },
  modeButton: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.28)',
    backgroundColor: 'rgba(3, 8, 20, 0.82)',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPressed: {
    opacity: 0.62,
  },
  navButtonText: {
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
  navButtonTextActive: {
    color: '#24c7d6',
  },
  navButtonTextInactive: {
    color: '#8896b4',
  },
});
