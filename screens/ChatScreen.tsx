import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { JarvisRadar } from '@/components/JarvisRadar';
import { useHudScale } from '@/components/HudScaleProvider';
import type { HistoryItem } from '@/services/api';

type ChatScreenProps = {
  history: HistoryItem[];
  message: string;
  canSend: boolean;
  voiceStatus: string;
  isListening: boolean;
  coreStatus: string;
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
  coreStatus,
  onMessageChange,
  onSend,
  onPushToTalkStart,
  onPushToTalkEnd,
}: ChatScreenProps) {
  const { scaleHud, scaleText } = useHudScale();
  const latestItem = history[0];
  const toastTitle = latestItem?.title ?? (voiceStatus ? 'VOICE' : '');
  const toastDetail = latestItem?.detail ?? voiceStatus;
  const isToastError = Boolean(latestItem?.isError);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={[
          styles.logContent,
          {
            paddingHorizontal: scaleHud(18),
            paddingTop: scaleHud(10),
            paddingBottom: scaleHud(18),
          },
        ]}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.coreSpace}>
          <JarvisRadar stateLabel={coreStatus} active={isListening || history.length > 0} />
        </View>
      </ScrollView>

      {toastDetail ? (
        <View
          style={[
            styles.toast,
            {
              minHeight: scaleHud(44),
              maxHeight: scaleHud(96),
              gap: scaleHud(2),
              marginHorizontal: scaleHud(28),
              marginBottom: scaleHud(12),
              borderRadius: scaleHud(6),
              paddingHorizontal: scaleHud(10),
              paddingVertical: scaleHud(7),
            },
            isToastError && styles.errorToast,
          ]}>
          <Text
            style={[styles.toastTitle, { fontSize: scaleText(9) }, isToastError && styles.errorText]}
            numberOfLines={1}>
            {toastTitle}
          </Text>
          <ScrollView style={[styles.toastScroll, { maxHeight: scaleHud(60) }]} nestedScrollEnabled>
            <Text selectable style={[styles.toastDetail, { fontSize: scaleText(11), lineHeight: scaleText(14) }]}>
              {toastDetail}
            </Text>
          </ScrollView>
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          { gap: scaleHud(8), marginHorizontal: scaleHud(28), marginBottom: scaleHud(5) },
        ]}>
        <Pressable
          onPressIn={onPushToTalkStart}
          onPressOut={onPushToTalkEnd}
          style={({ pressed }) => [
            styles.voiceButton,
            { width: scaleHud(46), height: scaleHud(44), borderRadius: scaleHud(6) },
            isListening && styles.voiceButtonActive,
            pressed && styles.pressed,
          ]}>
          <Feather name="mic" size={scaleHud(21)} color={isListening ? '#24c7d6' : '#8d75c9'} />
        </Pressable>

        <TextInput
          value={message}
          onChangeText={onMessageChange}
          multiline
          placeholder="Wiadomość lub komenda..."
          placeholderTextColor="#6f829b"
          style={[
            styles.messageInput,
            {
              minHeight: scaleHud(44),
              maxHeight: scaleHud(44),
              borderRadius: scaleHud(6),
              paddingHorizontal: scaleHud(12),
              paddingVertical: scaleHud(6),
              fontSize: scaleText(13),
            },
          ]}
        />

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendButton,
            { width: scaleHud(58), height: scaleHud(44), gap: scaleHud(2), borderRadius: scaleHud(6) },
            (pressed || !canSend) && styles.pressed,
          ]}>
          <Feather name="send" size={scaleHud(19)} color="#24c7d6" />
          <Text style={styles.sendText}>WYŚLIJ</Text>
        </Pressable>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  coreSpace: {
    minHeight: 342,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    minHeight: 44,
    maxHeight: 96,
    gap: 2,
    marginHorizontal: 28,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(36, 199, 214, 0.56)',
    borderRadius: 6,
    backgroundColor: 'rgba(6, 18, 36, 0.48)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  errorToast: {
    borderLeftColor: '#ff5b8a',
    backgroundColor: 'rgba(27, 8, 21, 0.28)',
  },
  toastTitle: {
    color: '#24c7d6',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  toastScroll: {
    maxHeight: 60,
  },
  toastDetail: {
    color: '#d8edf4',
    fontSize: 11,
    lineHeight: 14,
  },
  errorText: {
    color: '#ff8eb0',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginHorizontal: 28,
    marginBottom: 5,
  },
  voiceButton: {
    width: 46,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 96, 210, 0.72)',
    borderRadius: 6,
    backgroundColor: 'rgba(13, 10, 28, 0.78)',
  },
  voiceButtonActive: {
    borderColor: 'rgba(36, 199, 214, 0.72)',
    backgroundColor: 'rgba(36, 199, 214, 0.1)',
  },
  messageInput: {
    minHeight: 44,
    maxHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(12, 160, 190, 0.34)',
    borderRadius: 6,
    backgroundColor: 'rgba(3, 10, 22, 0.82)',
    color: '#d8f3f7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 58,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(25, 190, 215, 0.78)',
    borderRadius: 6,
    backgroundColor: 'rgba(3, 125, 150, 0.08)',
  },
  sendText: {
    color: '#24c7d6',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.58,
  },
});
