import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HudBackground } from '@/components/HudBackground';
import { HudButton } from '@/components/HudButton';
import { HudPanel } from '@/components/HudPanel';
import { HudScaleProvider, useHudScale } from '@/components/HudScaleProvider';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AppsScreen } from '@/screens/AppsScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { NotesScreen } from '@/screens/NotesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import {
  createNote as createBackendNote,
  deleteNote as deleteBackendNote,
  getBackendStatus,
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
import { speakJarvisText, stopJarvisSpeech } from '@/services/speech';
import {
  clearPendingNoteDraft as clearStoredPendingNoteDraft,
  clearSettings as clearStoredSettings,
  DEFAULT_API_TOKEN,
  DEFAULT_BACKEND_URL,
  DEFAULT_CONTROL_MODE,
  DEFAULT_DEVICE_ID,
  DEFAULT_HUD_SCALE,
  DEFAULT_MICROPHONE_ENABLED,
  DEFAULT_PTT_MODE,
  DEFAULT_TEXT_SCALE,
  DEFAULT_VOICE_ENABLED,
  DEFAULT_VOICE_LANGUAGE,
  DEFAULT_VOICE_PITCH,
  DEFAULT_VOICE_RATE,
  loadPendingNoteDraft,
  loadSettings,
  savePendingNoteDraft as saveStoredPendingNoteDraft,
  saveSettings as saveStoredSettings,
  type ControlMode,
  type PendingNoteDraft,
} from '@/services/storage';

type AppTab = 'chat' | 'apps' | 'notes' | 'settings';
type OnlineStatus = 'online' | 'offline';

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isBareNoteRequest(value: string) {
  const normalized = normalizeText(value);

  return (
    normalized === 'zapisz notatke' ||
    normalized === 'dodaj notatke' ||
    normalized === 'utworz notatke' ||
    normalized === 'zanotuj' ||
    normalized === 'zapisz mi' ||
    normalized === 'zapisz to'
  );
}

function extractNoteContentFromChat(value: string) {
  const original = value.trim();

  if (!original) {
    return null;
  }

  const normalized = normalizeText(original);

  const prefixes = [
    'zapisz mi',
    'zanotuj',
    'zapisz notatke',
    'dodaj notatke',
    'utworz notatke',
    'zapisz to',
  ];

  const matchedPrefix = prefixes.find(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `)
  );

  if (!matchedPrefix) {
    return null;
  }

  if (normalized === matchedPrefix) {
    return '';
  }

  const originalWords = original.split(/\s+/);
  const prefixWordCount = matchedPrefix.split(/\s+/).length;
  const content = originalWords.slice(prefixWordCount).join(' ').trim();

  return content;
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

function shouldSpeakJarvisResponse(value: string) {
  const normalized = normalizeText(value);
  const technicalMessages = ['backend offline', 'unauthorized', 'brak polaczenia', 'backendu'];

  return !technicalMessages.some((message) => normalized.includes(message));
}

function formatShortStatus(loading: boolean, backendStatus: OnlineStatus) {
  if (loading) {
    return 'Wysyłam';
  }

  if (backendStatus === 'offline') {
    return 'Łączenie';
  }

  return 'Gotowy';
}

function getNotesUiError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();

    if (
      normalized.includes('akcja nieobsługiwana') ||
      normalized.includes('akcja nieobslugiwana')
    ) {
      return 'Nie udało się obsłużyć notatki.';
    }

    return error.message;
  }

  return fallback;
}

export default function HomeScreen() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [apiToken, setApiToken] = useState(DEFAULT_API_TOKEN);
  const [deviceId, setDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [controlMode, setControlMode] = useState<ControlMode>(DEFAULT_CONTROL_MODE);
  const [textScale, setTextScale] = useState(DEFAULT_TEXT_SCALE);
  const [hudScale, setHudScale] = useState(DEFAULT_HUD_SCALE);
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
  const [backendStatus, setBackendStatus] = useState<OnlineStatus>('offline');
  const [lmStudioStatus, setLmStudioStatus] = useState<OnlineStatus>('offline');
  const [modelName, setModelName] = useState('brak');
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
  const backendStatusInFlight = useRef(false);
  const lastRecognizedText = useRef('');
  const lastAutoSentText = useRef('');
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

  const shortStatus = useMemo(
    () => formatShortStatus(loading, backendStatus),
    [backendStatus, loading]
  );

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

  const refreshBackendStatus = useCallback(async () => {
    if (!settingsLoaded || !backendUrl.trim() || !apiToken.trim()) {
      setBackendStatus('offline');
      setLmStudioStatus('offline');
      setModelName('brak');
      return;
    }

    if (backendStatusInFlight.current) {
      return;
    }

    backendStatusInFlight.current = true;

    try {
      const status = await getBackendStatus(apiConfig);
      setBackendStatus(status.backendOnline ? 'online' : 'offline');
      setLmStudioStatus(status.lmStudioOnline ? 'online' : 'offline');
      setModelName(status.model || 'brak');
    } catch {
      setBackendStatus('offline');
      setLmStudioStatus('offline');
      setModelName('brak');
    } finally {
      backendStatusInFlight.current = false;
    }
  }, [apiConfig, apiToken, backendUrl, settingsLoaded]);

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
    textScale,
    voiceEnabled,
    voiceLanguage,
    voicePitch,
    voiceRate,
  ]);

  useEffect(() => {
    refreshBackendStatus();

    const intervalId = setInterval(refreshBackendStatus, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshBackendStatus]);

  useEffect(() => {
    if (!settingsLoaded || !backendUrl.trim() || !apiToken.trim()) {
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

  const openNote = useCallback(
    async (noteId: string) => {
      setNotesLoading(true);
      setNotesStatus('');

      try {
        const detail = await getNote(apiConfig, noteId);
        setSelectedNoteId(detail.id);
        setSelectedNote(detail);
      } catch (error) {
        setNotesStatus(getNotesUiError(error, 'Nie udało się odczytać notatki.'));
      } finally {
        setNotesLoading(false);
      }
    },
    [apiConfig]
  );

  const loadNotes = useCallback(
    async (selectFirst = false) => {
      setNotesLoading(true);
      setNotesStatus('');

      try {
        const nextNotes = await getNotes(apiConfig);
        setNotes(nextNotes);

        if (selectFirst && nextNotes.length > 0) {
          await openNote(nextNotes[0].id);
        } else if (nextNotes.length === 0) {
          setSelectedNoteId(null);
          setSelectedNote(null);
          setNotesStatus('Brak notatek.');
        }
      } catch (error) {
        setNotesStatus(getNotesUiError(error, 'Nie udało się wczytać notatek.'));
      } finally {
        setNotesLoading(false);
      }
    },
    [apiConfig, openNote]
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
      setNotesStatus('Notatka zapisana.');
      setNewNoteTitle('');
      setNewNoteContent('');
      setIsNewNoteOpen(false);
      await loadNotes(false);
    } catch {
      setNotesStatus('Nie udało się zapisać notatki.');
    } finally {
      setNotesLoading(false);
    }
  }, [apiConfig, loadNotes, newNoteContent, newNoteTitle]);

  const deleteNote = useCallback(
    async (noteId: string) => {
      setNotesLoading(true);
      setNotesStatus('');

      try {
        await deleteBackendNote(apiConfig, noteId);
        setSelectedNoteId(null);
        setSelectedNote(null);
        setNotesStatus('Notatka usunięta.');
        await loadNotes(false);
      } catch (error) {
        setNotesStatus(getNotesUiError(error, 'Nie udało się usunąć notatki.'));
      } finally {
        setNotesLoading(false);
      }
    },
    [apiConfig, loadNotes]
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
        await loadNotes(true);
      } catch {
        addHistory('Notatki', 'Nie udało się zapisać notatki. Spróbuj ponownie.', true);
      } finally {
        setLoading(false);
      }
    },
    [addHistory, apiConfig, clearPendingNote, loadNotes, pendingNoteDraft]
  );

  useEffect(() => {
    if (activeTab === 'notes' && settingsLoaded) {
      loadNotes(false);
    }
  }, [activeTab, loadNotes, settingsLoaded]);

  useEffect(() => {
    const text = speech.recognizedText.trim();

    if (!text || text === lastRecognizedText.current) {
      return;
    }

    lastRecognizedText.current = text;
    setMessage(text);
  }, [speech.recognizedText]);

  useEffect(() => {
    const text = speech.recognizedText.trim();

    if (speech.isListening || !text || loading) {
      return;
    }

    if (lastAutoSentText.current === text) {
      return;
    }

    lastAutoSentText.current = text;

    const timeoutId = setTimeout(() => {
      handleUserText(text);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [speech.isListening, speech.recognizedText, loading]);

  async function checkStatus() {
    setLoading(true);

    try {
      const detail = await getStatus(apiConfig);
      addHistory('Status', detail);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Nieznany błąd.';
      addHistory('Status', detail, true);
    } finally {
      refreshBackendStatus();
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

      if (voiceEnabled && shouldSpeakJarvisResponse(detail)) {
        const speechResult = await speakJarvisText(detail, {
          enabled: voiceEnabled,
          language: voiceLanguage,
          rate: voiceRate,
          pitch: voicePitch,
        });

        if (!speechResult.ok && speechResult.reason) {
          addHistory('Głos', speechResult.reason, true);
        }
      }

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
        await loadNotes(true);
      }
    } catch (error) {
      addHistory(
        'Jarvis',
        error instanceof Error ? error.message : 'Nieznany błąd.',
        true
      );
    } finally {
      refreshBackendStatus();
      setLoading(false);
    }
  }

  function handleUserText(text: string) {
    const cleanText = text.trim();

    if (!cleanText || loading) {
      return;
    }

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

    const noteContent = extractNoteContentFromChat(cleanText);

    if (noteContent !== null) {
      setMessage('');

      if (!noteContent) {
        setNewNoteContent('');
        setIsNewNoteOpen(true);
        setActiveTab('notes');
        setNotesStatus('Podaj treść notatki.');
        addHistory('Notatki', 'Podaj treść notatki.');
        return;
      }

      const draft: PendingNoteDraft = {
        content: noteContent,
        waitingFor: 'title',
      };

      setPendingNoteDraft(draft);
      saveStoredPendingNoteDraft(draft).catch(() => {
        addHistory('Notatki', 'Nie udało się zapisać szkicu notatki.', true);
      });

      addHistory('Notatki', 'Jaki ma być tytuł notatki?');
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

  function sendMessage() {
    handleUserText(message);
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
        refreshBackendStatus();
        setLoading(false);
      });
  }

  return (
    <SafeAreaView style={styles.app} edges={['top', 'bottom']}>
      <StatusBar hidden />
      <HudBackground />
      <HudScaleProvider textScale={textScale} hudScale={hudScale}>
        <KeyboardAvoidingView style={styles.keyboard} behavior="padding">
          <View
            style={[
              styles.header,
              {
                gap: scaleHud(9),
                paddingHorizontal: scaleHud(24),
                paddingTop: scaleHud(10),
                paddingBottom: scaleHud(7),
              },
            ]}>
            <View style={[styles.headerTop, { minHeight: scaleHud(56), gap: scaleHud(16) }]}>
              <View>
                <Text style={[styles.kicker, { fontSize: scaleText(11), letterSpacing: scaleText(4) }]}>
                  LOCAL AI CONTROL
                </Text>
                <Text style={[styles.title, { fontSize: scaleText(28), letterSpacing: scaleText(7) }]}>
                  JARVIS MOBILE
                </Text>
              </View>
              {loading ? <ActivityIndicator color="#22f2ff" style={[styles.loadingIndicator, { top: scaleHud(18) }]} /> : null}
            </View>

            <Pressable onPress={checkStatus} disabled={loading}>
              <HudPanel
                style={[
                  styles.shortStatusPanel,
                  {
                    minHeight: scaleHud(34),
                    paddingHorizontal: scaleHud(12),
                    paddingVertical: scaleHud(5),
                  },
                ]}>
                <Text
                  selectable
                  style={[styles.shortStatusText, { fontSize: scaleText(12), lineHeight: scaleText(16) }]}>
                  {shortStatus}
                </Text>
              </HudPanel>
            </Pressable>

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
                onPushToTalkStart={async () => {
                  await stopJarvisSpeech();
                  await speech.startListening();
                }}
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
                onRefresh={() => loadNotes(true)}
                onSelectNote={openNote}
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
                backendStatus={backendStatus}
                lmStudioStatus={lmStudioStatus}
                modelName={modelName}
                phonePcLinkStatus="aktywny"
                textScale={textScale}
                hudScale={hudScale}
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
                onRefreshConnection={refreshBackendStatus}
                onTextScaleChange={setTextScale}
                onHudScaleChange={setHudScale}
                onVoiceEnabledChange={setVoiceEnabled}
                onVoiceLanguageChange={setVoiceLanguage}
                onVoiceRateChange={setVoiceRate}
                onVoicePitchChange={setVoicePitch}
                onMicrophoneEnabledChange={setMicrophoneEnabled}
                onPttModeChange={setPttMode}
                onTestVoice={async () => {
                  const speechResult = await speakJarvisText('Jarvis gotowy.', {
                    enabled: true,
                    language: voiceLanguage,
                    rate: voiceRate,
                    pitch: voicePitch,
                  });

                  if (!speechResult.ok && speechResult.reason) {
                    addHistory('Głos', speechResult.reason, true);
                  }
                }}
                onStopVoice={async () => {
                  const speechResult = await stopJarvisSpeech();

                  if (!speechResult.ok && speechResult.reason) {
                    addHistory('Głos', speechResult.reason, true);
                  }
                }}
                onClearSettings={clearSettings}
              />
            ) : null}
          </View>

          <View
            style={[
              styles.bottomNav,
              {
                gap: scaleHud(6),
                marginHorizontal: scaleHud(18),
                marginBottom: scaleHud(7),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(8),
                paddingTop: scaleHud(9),
                paddingBottom: scaleHud(7),
              },
            ]}>
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
  header: {},
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
  shortStatusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  shortStatusText: {
    color: '#24c7d6',
    fontWeight: '900',
    letterSpacing: 1,
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