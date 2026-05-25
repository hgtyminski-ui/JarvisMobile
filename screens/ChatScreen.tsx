import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { HudPanel } from '@/components/HudPanel';
import type { HistoryItem } from '@/services/api';

type ChatScreenProps = {
  history: HistoryItem[];
  message: string;
  canSend: boolean;
  voiceStatus: string;
  isListening: boolean;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onPushToTalkStart: () => void;
  onPushToTalkEnd: () => void;
};

export function ChatScreen({
  history,
  message,
  canSend,
  voiceStatus,
  isListening,
  onMessageChange,
  onSend,
  onPushToTalkStart,
  onPushToTalkEnd,
}: ChatScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={styles.logContent}
        contentInsetAdjustmentBehavior="automatic">
        {history.length === 0 ? (
          <HudPanel style={styles.emptyLog}>
            <Text style={styles.emptyTitle}>System log gotowy</Text>
            <Text selectable style={styles.emptyText}>
              Sprawdź status backendu albo wyślij wiadomość do Jarvisa.
            </Text>
          </HudPanel>
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

      <View style={styles.composer}>
        <View style={styles.voiceColumn}>
          <HudButton
            title="PTT"
            variant={isListening ? 'primary' : 'secondary'}
            onPressIn={onPushToTalkStart}
            onPressOut={onPushToTalkEnd}
            style={styles.voiceButton}
          />
          {voiceStatus ? (
            <Text selectable style={styles.voiceStatus}>
              {voiceStatus}
            </Text>
          ) : null}
        </View>
        <TextInput
          value={message}
          onChangeText={onMessageChange}
          multiline
          placeholder="Wiadomość albo komenda..."
          placeholderTextColor="#6e8397"
          style={styles.messageInput}
        />
        <HudButton title="Wyślij" onPress={onSend} disabled={!canSend} style={styles.sendButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  voiceColumn: {
    width: 76,
    gap: 6,
  },
  voiceButton: {
    minWidth: 76,
  },
  voiceStatus: {
    color: '#9ab2ca',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
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
    minWidth: 92,
  },
});
