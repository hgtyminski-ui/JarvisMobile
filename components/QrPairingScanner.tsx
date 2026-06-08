import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HudButton } from '@/components/HudButton';

type QrPairingScannerProps = {
  onClose: () => void;
  onDenied: () => void;
  onScanned: (rawValue: string) => void;
};

export function QrPairingScanner({
  onClose,
  onDenied,
  onScanned,
}: QrPairingScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();

  function handleBarcodeScanned(event: BarcodeScanningResult) {
    onScanned(event.data);
  }

  if (!permission) {
    return <SafeAreaView style={styles.shell} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.shell}>
        <View style={styles.permissionCard}>
          <Text style={styles.title}>SKANER QR</Text>
          <Text style={styles.message}>Jarvis potrzebuje kamery, aby zeskanować pairing QR.</Text>
          <HudButton
            title="Włącz kamerę"
            onPress={async () => {
              const nextPermission = await requestPermission();

              if (!nextPermission.granted) {
                onDenied();
              }
            }}
          />
          <HudButton title="Zamknij" variant="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.topBar}>
        <Text style={styles.title}>SKANER QR</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>Zamknij</Text>
        </Pressable>
      </View>

      <View style={styles.cameraFrame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
        </View>
      </View>

      <Text style={styles.message}>Skieruj kamerę na kod QR z Jarvisa na PC.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#030814',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#24c7d6',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeText: {
    color: '#8d75c9',
    fontSize: 14,
    fontWeight: '800',
  },
  cameraFrame: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.28)',
    borderRadius: 12,
    backgroundColor: '#061224',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 8, 20, 0.22)',
  },
  scanBox: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: 'rgba(36, 199, 214, 0.72)',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  message: {
    color: '#9cb2c9',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 16,
  },
});
