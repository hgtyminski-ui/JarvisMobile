import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { useHudScale } from '@/components/HudScaleProvider';
import type { ControlMode } from '@/services/storage';

type OnlineStatus = 'online' | 'offline';

type SettingsScreenProps = {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
  controlMode: ControlMode;
  backendStatus: OnlineStatus;
  lmStudioStatus: OnlineStatus;
  modelName: string;
  phonePcLinkStatus: string;
  textScale: string;
  hudScale: string;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceRate: string;
  voicePitch: string;
  microphoneEnabled: boolean;
  pttMode: boolean;
  onBackendUrlChange: (value: string) => void;
  onApiTokenChange: (value: string) => void;
  onDeviceIdChange: (value: string) => void;
  onControlModeChange: (value: ControlMode) => void;
  onRefreshConnection: () => void;
  onTextScaleChange: (value: string) => void;
  onHudScaleChange: (value: string) => void;
  onVoiceEnabledChange: (value: boolean) => void;
  onVoiceLanguageChange: (value: string) => void;
  onVoiceRateChange: (value: string) => void;
  onVoicePitchChange: (value: string) => void;
  onMicrophoneEnabledChange: (value: boolean) => void;
  onPttModeChange: (value: boolean) => void;
  onTestVoice: () => void;
  onStopVoice: () => void;
  onClearSettings: () => void;
};

const TEXT_SCALE_LIMITS = { min: 0.6, max: 1.8 };
const HUD_SCALE_LIMITS = { min: 0.6, max: 1.5 };

export function SettingsScreen({
  backendUrl,
  apiToken,
  deviceId,
  controlMode,
  backendStatus,
  lmStudioStatus,
  modelName,
  phonePcLinkStatus,
  textScale,
  hudScale,
  voiceEnabled,
  voiceLanguage,
  voiceRate,
  voicePitch,
  microphoneEnabled,
  pttMode,
  onBackendUrlChange,
  onApiTokenChange,
  onDeviceIdChange,
  onControlModeChange,
  onRefreshConnection,
  onTextScaleChange,
  onHudScaleChange,
  onVoiceEnabledChange,
  onVoiceLanguageChange,
  onVoiceRateChange,
  onVoicePitchChange,
  onMicrophoneEnabledChange,
  onPttModeChange,
  onTestVoice,
  onStopVoice,
  onClearSettings,
}: SettingsScreenProps) {
  const { scaleHud, scaleText } = useHudScale();
  const [tokenVisible, setTokenVisible] = useState(false);

  return (
    <ScrollView
      style={styles.panelScroll}
      contentContainerStyle={[
        styles.settingsContent,
        {
          gap: scaleHud(14),
          paddingHorizontal: scaleHud(18),
          paddingTop: scaleHud(16),
          paddingBottom: scaleHud(24),
        },
      ]}>
      <SettingsSection title="Połączenie">
        <View style={[styles.connectionRows, { gap: scaleHud(8) }]}>
          <ConnectionRow
            label="Backend PC"
            value={backendStatus === 'online' ? 'Online' : 'Offline'}
            online={backendStatus === 'online'}
          />
          <ConnectionRow
            label="LM Studio"
            value={lmStudioStatus === 'online' ? 'Online' : 'Offline'}
            online={lmStudioStatus === 'online'}
          />
          <ConnectionRow label="Model" value={modelName || 'brak'} online={modelName !== 'brak'} />
          <ConnectionRow
            label="Telefon/PC link"
            value={phonePcLinkStatus}
            online={phonePcLinkStatus === 'aktywny'}
          />
        </View>
        <HudButton title="Odśwież połączenie" onPress={onRefreshConnection} />

        <Field label="Backend URL">
          <TextInput
            value={backendUrl}
            onChangeText={onBackendUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.68.50:8000"
            placeholderTextColor="#60758d"
            style={[
              styles.input,
              {
                minHeight: scaleHud(44),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(12),
                paddingVertical: scaleHud(8),
                fontSize: scaleText(14),
              },
            ]}
          />
        </Field>

        <Field label="API Token">
          <View
            style={[
              styles.secretInput,
              {
                minHeight: scaleHud(44),
                gap: scaleHud(10),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(12),
              },
            ]}>
            <TextInput
              value={apiToken}
              onChangeText={onApiTokenChange}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!tokenVisible}
              placeholder="X-Jarvis-Token"
              placeholderTextColor="#60758d"
              style={[styles.secretTextInput, { paddingVertical: scaleHud(8), fontSize: scaleText(14) }]}
            />
            <Pressable onPress={() => setTokenVisible((value) => !value)} hitSlop={10}>
              <Feather name={tokenVisible ? 'eye-off' : 'eye'} size={scaleHud(17)} color="#8d75c9" />
            </Pressable>
          </View>
        </Field>

        <Field label="Device ID">
          <TextInput
            value={deviceId}
            onChangeText={onDeviceIdChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="hubert-pc"
            placeholderTextColor="#60758d"
            style={[
              styles.input,
              {
                minHeight: scaleHud(44),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(12),
                paddingVertical: scaleHud(8),
                fontSize: scaleText(14),
              },
            ]}
          />
        </Field>

        <View style={[styles.modeSwitch, { gap: scaleHud(10) }]}>
          <HudButton
            title="Steruj PC"
            active={controlMode === 'pc'}
            variant="ghost"
            onPress={() => onControlModeChange('pc')}
            style={[styles.modeButton, { minHeight: scaleHud(38) }]}
          />
          <HudButton
            title="Steruj telefonem"
            active={controlMode === 'phone'}
            variant="ghost"
            onPress={() => onControlModeChange('phone')}
            style={[styles.modeButton, { minHeight: scaleHud(38) }]}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Wygląd">
        <OptionRow label="Text Scale">
          <ScaleInput
            value={textScale}
            min={TEXT_SCALE_LIMITS.min}
            max={TEXT_SCALE_LIMITS.max}
            onChange={onTextScaleChange}
          />
        </OptionRow>
        <OptionRow label="HUD Scale">
          <ScaleInput
            value={hudScale}
            min={HUD_SCALE_LIMITS.min}
            max={HUD_SCALE_LIMITS.max}
            onChange={onHudScaleChange}
          />
        </OptionRow>
      </SettingsSection>

      <SettingsSection title="Głos">
        <ToggleRow label="Voice enabled" value={voiceEnabled} onValueChange={onVoiceEnabledChange} />
        <Field label="Voice language">
          <TextInput
            value={voiceLanguage}
            onChangeText={onVoiceLanguageChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="pl-PL"
            placeholderTextColor="#60758d"
            style={[
              styles.input,
              {
                minHeight: scaleHud(44),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(12),
                paddingVertical: scaleHud(8),
                fontSize: scaleText(14),
              },
            ]}
          />
        </Field>
        <Field label="Voice rate">
          <TextInput
            value={voiceRate}
            onChangeText={onVoiceRateChange}
            keyboardType="decimal-pad"
            placeholder="1.0"
            placeholderTextColor="#60758d"
            style={[
              styles.input,
              {
                minHeight: scaleHud(44),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(12),
                paddingVertical: scaleHud(8),
                fontSize: scaleText(14),
              },
            ]}
          />
        </Field>
        <Field label="Voice pitch">
          <TextInput
            value={voicePitch}
            onChangeText={onVoicePitchChange}
            keyboardType="decimal-pad"
            placeholder="1.0"
            placeholderTextColor="#60758d"
            style={[
              styles.input,
              {
                minHeight: scaleHud(44),
                borderRadius: scaleHud(8),
                paddingHorizontal: scaleHud(12),
                paddingVertical: scaleHud(8),
                fontSize: scaleText(14),
              },
            ]}
          />
        </Field>
        <Text selectable style={[styles.placeholderNote, { fontSize: scaleText(12), lineHeight: scaleText(18) }]}>
          Jarvis czyta odpowiedzi z chatu, gdy Voice enabled jest włączone.
        </Text>
        <View style={[styles.voiceActions, { gap: scaleHud(8) }]}>
          <HudButton title="Test głosu" onPress={onTestVoice} style={styles.voiceActionButton} />
          <HudButton
            title="Stop voice"
            variant="secondary"
            onPress={onStopVoice}
            style={styles.voiceActionButton}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Mikrofon">
        <ToggleRow
          label="Microphone enabled"
          value={microphoneEnabled}
          onValueChange={onMicrophoneEnabledChange}
        />
        <ToggleRow label="PTT mode" value={pttMode} onValueChange={onPttModeChange} />
        <Text selectable style={[styles.placeholderNote, { fontSize: scaleText(12), lineHeight: scaleText(18) }]}>
          Mikrofon zostanie dodany w kolejnym etapie.
        </Text>
      </SettingsSection>

      <HudButton title="Wyczyść ustawienia" variant="danger" onPress={onClearSettings} />
    </ScrollView>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { scaleHud, scaleText } = useHudScale();

  return (
    <View style={[styles.section, { gap: scaleHud(12), borderRadius: scaleHud(9), padding: scaleHud(12) }]}>
      <Text selectable style={[styles.sectionTitle, { fontSize: scaleText(12), letterSpacing: scaleText(3) }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { scaleHud, scaleText } = useHudScale();

  return (
    <View style={[styles.fieldGroup, { gap: scaleHud(7) }]}>
      <Text selectable style={[styles.label, { fontSize: scaleText(12) }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function OptionRow({ label, children }: { label: string; children: ReactNode }) {
  const { scaleHud, scaleText } = useHudScale();

  return (
    <View style={[styles.optionRow, { gap: scaleHud(8) }]}>
      <Text selectable style={[styles.label, { fontSize: scaleText(12) }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function clampScale(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatScale(value: number) {
  return value.toFixed(2).replace(/0$/, '').replace(/\.0$/, '.0');
}

function ScaleInput({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const { scaleHud, scaleText } = useHudScale();
  const [draftValue, setDraftValue] = useState(value);
  const numericValue = Number.parseFloat(value);
  const safeValue = Number.isFinite(numericValue) ? clampScale(numericValue, min, max) : 1;

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function commit(nextValue: string) {
    const parsed = Number.parseFloat(nextValue.replace(',', '.'));

    if (!Number.isFinite(parsed)) {
      setDraftValue(value);
      return;
    }

    const formatted = formatScale(clampScale(parsed, min, max));
    setDraftValue(formatted);
    onChange(formatted);
  }

  function step(delta: number) {
    commit(formatScale(safeValue + delta));
  }

  return (
    <View style={[styles.scaleControl, { gap: scaleHud(8) }]}>
      <TextInput
        value={draftValue}
        onChangeText={setDraftValue}
        onBlur={() => commit(draftValue)}
        keyboardType="decimal-pad"
        placeholder={formatScale(safeValue)}
        placeholderTextColor="#60758d"
        style={[
          styles.scaleInput,
          {
            minHeight: scaleHud(40),
            borderRadius: scaleHud(8),
            paddingHorizontal: scaleHud(12),
            fontSize: scaleText(14),
          },
        ]}
      />
      <HudButton title="+" onPress={() => step(0.05)} style={styles.scaleStepButton} />
      <HudButton title="-" variant="secondary" onPress={() => step(-0.05)} style={styles.scaleStepButton} />
    </View>
  );
}

function ConnectionRow({ label, value, online }: { label: string; value: string; online: boolean }) {
  const { scaleHud, scaleText } = useHudScale();

  return (
    <View
      style={[
        styles.connectionRow,
        {
          minHeight: scaleHud(32),
          borderRadius: scaleHud(7),
          paddingHorizontal: scaleHud(10),
          paddingVertical: scaleHud(6),
        },
      ]}>
      <Text selectable style={[styles.connectionLabel, { fontSize: scaleText(12) }]}>
        {label}
      </Text>
      <Text
        selectable
        numberOfLines={1}
        style={[
          styles.connectionValue,
          { fontSize: scaleText(12) },
          online ? styles.connectionOnline : styles.connectionOffline,
        ]}>
        {value}
      </Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { scaleHud, scaleText } = useHudScale();

  return (
    <View style={[styles.toggleRow, { minHeight: scaleHud(38), gap: scaleHud(12) }]}>
      <Text selectable style={[styles.label, { fontSize: scaleText(12) }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#101a2c', true: '#0c5f72' }}
        thumbColor={value ? '#24c7d6' : '#8d75c9'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panelScroll: {
    flex: 1,
  },
  settingsContent: {},
  section: {
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.22)',
    backgroundColor: 'rgba(5, 15, 30, 0.58)',
  },
  sectionTitle: {
    color: '#24c7d6',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fieldGroup: {},
  label: {
    color: '#8d75c9',
    fontWeight: '900',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.24)',
    backgroundColor: 'rgba(3, 10, 22, 0.78)',
    color: '#d8edf4',
  },
  secretInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.24)',
    backgroundColor: 'rgba(3, 10, 22, 0.78)',
  },
  secretTextInput: {
    flex: 1,
    color: '#d8edf4',
  },
  modeSwitch: {
    flexDirection: 'row',
  },
  modeButton: {
    flex: 1,
  },
  optionRow: {},
  scaleControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scaleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.24)',
    backgroundColor: 'rgba(3, 10, 22, 0.78)',
    color: '#d8edf4',
    fontWeight: '800',
  },
  scaleStepButton: {
    width: 46,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderNote: {
    color: '#788aa5',
  },
  voiceActions: {
    flexDirection: 'row',
  },
  voiceActionButton: {
    flex: 1,
  },
  connectionRows: {},
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.16)',
    backgroundColor: 'rgba(3, 10, 22, 0.5)',
  },
  connectionLabel: {
    flex: 1,
    color: '#8d75c9',
    fontWeight: '900',
  },
  connectionValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '900',
  },
  connectionOnline: {
    color: '#24c7d6',
  },
  connectionOffline: {
    color: '#788aa5',
  },
});
