import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import type { ControlMode } from '@/services/storage';

type SettingsScreenProps = {
  backendUrl: string;
  apiToken: string;
  controlMode: ControlMode;
  onBackendUrlChange: (value: string) => void;
  onApiTokenChange: (value: string) => void;
  onControlModeChange: (value: ControlMode) => void;
  onClearSettings: () => void;
};

export function SettingsScreen({
  backendUrl,
  apiToken,
  controlMode,
  onBackendUrlChange,
  onApiTokenChange,
  onControlModeChange,
  onClearSettings,
}: SettingsScreenProps) {
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
    gap: 18,
    padding: 18,
    paddingBottom: 26,
  },
  sectionTitle: {
    color: '#f2fbff',
    fontSize: 22,
    fontWeight: '900',
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
});
