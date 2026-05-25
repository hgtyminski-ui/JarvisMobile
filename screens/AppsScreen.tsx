import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { HudPanel } from '@/components/HudPanel';
import type { ControlMode } from '@/services/storage';
import { APP_KEYS, MOBILE_APPS, type MobileAppKey } from '@/services/mobileLinks';

type AppsScreenProps = {
  controlMode: ControlMode;
  loading: boolean;
  onAction: (appKey: MobileAppKey, action: 'otwórz' | 'zamknij') => void;
};

export function AppsScreen({ controlMode, loading, onAction }: AppsScreenProps) {
  return (
    <ScrollView style={styles.panelScroll} contentContainerStyle={styles.appsContent}>
      {APP_KEYS.map((appKey) => {
        const app = MOBILE_APPS[appKey];

        return (
          <HudPanel key={appKey} style={styles.appTile}>
            <View>
              <Text style={styles.appName}>{app.label}</Text>
              <Text style={styles.appMode}>
                {controlMode === 'pc' ? 'Backend PC' : 'Telefon lokalnie'}
              </Text>
            </View>

            <View style={styles.appActions}>
              <HudButton
                title="Otwórz"
                onPress={() => onAction(appKey, 'otwórz')}
                disabled={loading}
                style={styles.appButton}
              />

              {controlMode === 'pc' ? (
                <HudButton
                  title="Zamknij"
                  variant="secondary"
                  onPress={() => onAction(appKey, 'zamknij')}
                  disabled={loading}
                  style={styles.appButton}
                />
              ) : null}
            </View>
          </HudPanel>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panelScroll: {
    flex: 1,
  },
  appsContent: {
    gap: 16,
    padding: 18,
    paddingBottom: 26,
  },
  appTile: {
    gap: 16,
  },
  appName: {
    color: '#f2fbff',
    fontSize: 24,
    fontWeight: '900',
  },
  appMode: {
    color: '#9ab2ca',
    fontSize: 15,
    lineHeight: 22,
  },
  appActions: {
    flexDirection: 'row',
    gap: 12,
  },
  appButton: {
    flex: 1,
  },
});
