import { useState } from 'react';
import type { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { useHudScale } from '@/components/HudScaleProvider';
import type { ControlMode } from '@/services/storage';

type SettingsScreenProps = {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
  controlMode: ControlMode;
  textScale: string;
  hudScale: string;
  showStatusPanel: boolean;
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
  onTextScaleChange: (value: string) => void;
  onHudScaleChange: (value: string) => void;
  onShowStatusPanelChange: (value: boolean) => void;
  onVoiceEnabledChange: (value: boolean) => void;
  onVoiceLanguageChange: (value: string) => void;
  onVoiceRateChange: (value: string) => void;
  onVoicePitchChange: (value: string) => void;
  onMicrophoneEnabledChange: (value: boolean) => void;
  onPttModeChange: (value: boolean) => void;
  onClearSettings: () => void;
};

const TEXT_SCALES = ['0.85', '1.0', '1.15', '1.3'];
const HUD_SCALES = ['1.0', '1.15', '1.3'];

export function SettingsScreen({
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
  onBackendUrlChange,
  onApiTokenChange,
  onDeviceIdChange,
  onControlModeChange,
  onTextScaleChange,
  onHudScaleChange,
  onShowStatusPanelChange,
  onVoiceEnabledChange,
  onVoiceLanguageChange,
  onVoiceRateChange,
  onVoicePitchChange,
  onMicrophoneEnabledChange,
  onPttModeChange,
  onClearSettings,
}: SettingsScreenProps) {
  const { scaleHud, scaleText } = useHudScale();
  const [tokenVisible, setTokenVisible] = useState(false);

  return (
    <ScrollView
      style={styles.panelScroll}
      contentContainerStyle={[
        styles.settingsContent,
        { gap: scaleHud(14), paddingHorizontal: scaleHud(18), paddingTop: scaleHud(16), paddingBottom: scaleHud(24) },
      ]}>
      <SettingsSection title="Połączenie">
        <Field label="Backend URL">
          <TextInput
            value={backendUrl}
            onChangeText={onBackendUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.68.50:8000"
            placeholderTextColor="#60758d"
            style={[styles.input, { minHeight: scaleHud(44), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(12), paddingVertical: scaleHud(8), fontSize: scaleText(14) }]}
          />
        </Field>

        <Field label="API Token">
          <View style={[styles.secretInput, { minHeight: scaleHud(44), gap: scaleHud(10), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(12) }]}>
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
            style={[styles.input, { minHeight: scaleHud(44), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(12), paddingVertical: scaleHud(8), fontSize: scaleText(14) }]}
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
          <SegmentedOptions values={TEXT_SCALES} selected={textScale} onSelect={onTextScaleChange} />
        </OptionRow>
        <OptionRow label="HUD Scale">
          <SegmentedOptions values={HUD_SCALES} selected={hudScale} onSelect={onHudScaleChange} />
        </OptionRow>
        <ToggleRow
          label="Show status panel"
          value={showStatusPanel}
          onValueChange={onShowStatusPanelChange}
        />
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
            style={[styles.input, { minHeight: scaleHud(44), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(12), paddingVertical: scaleHud(8), fontSize: scaleText(14) }]}
          />
        </Field>
        <Field label="Voice rate">
          <TextInput
            value={voiceRate}
            onChangeText={onVoiceRateChange}
            keyboardType="decimal-pad"
            placeholder="1.0"
            placeholderTextColor="#60758d"
            style={[styles.input, { minHeight: scaleHud(44), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(12), paddingVertical: scaleHud(8), fontSize: scaleText(14) }]}
          />
        </Field>
        <Field label="Voice pitch">
          <TextInput
            value={voicePitch}
            onChangeText={onVoicePitchChange}
            keyboardType="decimal-pad"
            placeholder="1.0"
            placeholderTextColor="#60758d"
            style={[styles.input, { minHeight: scaleHud(44), borderRadius: scaleHud(8), paddingHorizontal: scaleHud(12), paddingVertical: scaleHud(8), fontSize: scaleText(14) }]}
          />
        </Field>
        <Text selectable style={styles.placeholderNote}>
          TTS jest przygotowane w ustawieniach i zostanie podpięte w kolejnym etapie.
        </Text>
      </SettingsSection>

      <SettingsSection title="Mikrofon">
        <ToggleRow
          label="Microphone enabled"
          value={microphoneEnabled}
          onValueChange={onMicrophoneEnabledChange}
        />
        <ToggleRow label="PTT mode" value={pttMode} onValueChange={onPttModeChange} />
        <Text selectable style={styles.placeholderNote}>
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

function SegmentedOptions({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const { scaleHud } = useHudScale();

  return (
    <View style={[styles.segmented, { gap: scaleHud(7) }]}>
      {values.map((value) => (
        <HudButton
          key={value}
          title={value}
          active={selected === value}
          variant="ghost"
          onPress={() => onSelect(value)}
          style={[styles.segmentButton, { minHeight: scaleHud(34) }]}
        />
      ))}
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
  settingsContent: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.22)',
    borderRadius: 9,
    backgroundColor: 'rgba(5, 15, 30, 0.58)',
    padding: 12,
  },
  sectionTitle: {
    color: '#24c7d6',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  fieldGroup: {
    gap: 7,
  },
  label: {
    color: '#8d75c9',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.24)',
    borderRadius: 8,
    backgroundColor: 'rgba(3, 10, 22, 0.78)',
    color: '#d8edf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  secretInput: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.24)',
    borderRadius: 8,
    backgroundColor: 'rgba(3, 10, 22, 0.78)',
    paddingHorizontal: 12,
  },
  secretTextInput: {
    flex: 1,
    color: '#d8edf4',
    paddingVertical: 8,
    fontSize: 14,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 38,
  },
  optionRow: {
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    gap: 7,
  },
  segmentButton: {
    flex: 1,
    minHeight: 34,
  },
  toggleRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  placeholderNote: {
    color: '#788aa5',
    fontSize: 12,
    lineHeight: 18,
  },
});
