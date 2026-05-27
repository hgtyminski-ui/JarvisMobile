import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import type { ControlMode } from '@/services/storage';

type SettingsScreenProps = {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
  controlMode: ControlMode;
  onBackendUrlChange: (value: string) => void;
  onApiTokenChange: (value: string) => void;
  onDeviceIdChange: (value: string) => void;
  onControlModeChange: (value: ControlMode) => void;
  onClearSettings: () => void;
};

export function SettingsScreen({
  backendUrl,
  apiToken,
  deviceId,
  controlMode,
  onBackendUrlChange,
  onApiTokenChange,
  onDeviceIdChange,
  onControlModeChange,
  onClearSettings,
}: SettingsScreenProps) {
  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.settingsContent}>
      <Text style={styles.sectionTitle}>USTAWIENIA</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          value={backendUrl}
          onChangeText={onBackendUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.68.50:8000"
          placeholderTextColor="#6f829b"
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
          placeholderTextColor="#6f829b"
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Device ID</Text>
        <TextInput
          value={deviceId}
          onChangeText={onDeviceIdChange}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="hubert-pc"
          placeholderTextColor="#6f829b"
          style={styles.input}
        />
      </View>

      <View style={styles.modeSwitch}>
        <HudButton
          title="Steruj PC"
          active={controlMode === 'pc'}
          variant="ghost"
          onPress={() => onControlModeChange('pc')}
          style={styles.modeButton}
        />
        <HudButton
          title="Steruj telefonem"
          active={controlMode === 'phone'}
          variant="ghost"
          onPress={() => onControlModeChange('phone')}
          style={styles.modeButton}
        />
      </View>

      <HudButton title="Wyczyść ustawienia" variant="danger" onPress={onClearSettings} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panelScroll: {
    flex: 1,
  },
  settingsContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#35e7f5',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#a17dff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(21, 223, 255, 0.32)',
    borderRadius: 10,
    backgroundColor: 'rgba(6, 18, 36, 0.62)',
    color: '#e9fbff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
  },
});
