import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DEFAULT_BACKEND_URL = 'http://192.168.68.50:8000';
const COMMAND_PREFIXES = ['otwórz', 'zamknij', 'puść', 'znajdź na spotify'];
const QUICK_COMMANDS = ['Spotify', 'YouTube', 'Netflix', 'Steam'];

type HistoryItem = {
  id: number;
  title: string;
  detail: string;
  isError?: boolean;
};

type RequestMode = 'chat' | 'command';

function trimSlash(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function isCommand(text: string) {
  const normalized = text.trim().toLowerCase();

  return COMMAND_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return 'OK';
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export default function HomeScreen() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [apiToken, setApiToken] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(() => message.trim().length > 0 && !loading, [loading, message]);

  function addHistory(title: string, detail: string, isError = false) {
    setHistory((items) => [
      {
        id: Date.now(),
        title,
        detail,
        isError,
      },
      ...items,
    ]);
  }

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

    const detail = await readResponse(response);

    if (!response.ok) {
      throw new Error(`Backend zwrócił błąd ${response.status}: ${detail}`);
    }

    return detail;
  }

  async function checkStatus() {
    setLoading(true);

    try {
      const detail = await requestBackend('/status');
      addHistory('Status', detail);
    } catch (error) {
      addHistory('Status', error instanceof Error ? error.message : 'Nieznany błąd.', true);
    } finally {
      setLoading(false);
    }
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
    sendText(cleanText, isCommand(cleanText) ? 'command' : 'chat');
  }

  function sendQuickCommand(name: string) {
    sendText(`otwórz ${name.toLowerCase()}`, 'command');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.kicker}>LOCAL AI CONTROL</Text>
        <Text style={styles.title}>JARVIS MOBILE</Text>
        <Text selectable style={styles.subtitle}>
          Secure command bridge for your local backend.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          value={backendUrl}
          onChangeText={setBackendUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.68.50:8000"
          placeholderTextColor="#557082"
          style={styles.input}
        />

        <Text style={styles.label}>API Token</Text>
        <TextInput
          value={apiToken}
          onChangeText={setApiToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="X-Jarvis-Token"
          placeholderTextColor="#557082"
          style={styles.input}
        />

        <ActionButton title="Sprawdź status" onPress={checkStatus} disabled={loading} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Wiadomość</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Napisz wiadomość albo komendę..."
          placeholderTextColor="#557082"
          style={[styles.input, styles.messageInput]}
        />

        <ActionButton title="Wyślij" onPress={sendMessage} disabled={!canSend} />
      </View>

      <View style={styles.quickGrid}>
        {QUICK_COMMANDS.map((name) => (
          <Pressable
            key={name}
            onPress={() => sendQuickCommand(name)}
            disabled={loading}
            style={({ pressed }) => [
              styles.quickButton,
              (pressed || loading) && styles.buttonPressed,
            ]}>
            <Text style={styles.quickButtonText}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Historia odpowiedzi</Text>
        {loading ? <ActivityIndicator color="#22f2ff" /> : null}
      </View>

      <View style={styles.historyList}>
        {history.length === 0 ? (
          <Text selectable style={styles.emptyText}>
            Brak odpowiedzi. Wyślij komendę albo sprawdź status backendu.
          </Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={[styles.historyItem, item.isError && styles.errorItem]}>
              <Text style={[styles.historyTitle, item.isError && styles.errorText]}>
                {item.title}
              </Text>
              <Text selectable style={styles.historyDetail}>
                {item.detail}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({ title, onPress, disabled }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        (pressed || disabled) && styles.buttonPressed,
      ]}>
      <Text style={styles.actionButtonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020711',
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    gap: 8,
    paddingTop: 18,
  },
  kicker: {
    color: '#22f2ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title: {
    color: '#e9fbff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#8fb4c5',
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#114d62',
    backgroundColor: '#061321',
    borderRadius: 8,
    padding: 14,
  },
  label: {
    color: '#9fefff',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#166b84',
    borderRadius: 6,
    backgroundColor: '#03101c',
    color: '#e9fbff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  actionButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#22f2ff',
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: '#021019',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.55,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickButton: {
    minHeight: 46,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22f2ff',
    borderRadius: 6,
    backgroundColor: '#041521',
    paddingHorizontal: 12,
  },
  quickButtonText: {
    color: '#d7fbff',
    fontSize: 15,
    fontWeight: '800',
  },
  historyHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#e9fbff',
    fontSize: 18,
    fontWeight: '800',
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#153649',
    borderRadius: 8,
    backgroundColor: '#071625',
    padding: 12,
  },
  errorItem: {
    borderColor: '#ff4d6d',
    backgroundColor: '#210712',
  },
  historyTitle: {
    color: '#22f2ff',
    fontSize: 13,
    fontWeight: '800',
  },
  historyDetail: {
    color: '#d8edf4',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#ff8ba0',
  },
  emptyText: {
    color: '#7695a5',
    fontSize: 14,
    lineHeight: 20,
  },
});
