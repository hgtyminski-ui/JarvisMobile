import { StyleSheet, Text, View } from 'react-native';

type StatusBadgeProps = {
  label: string;
  status: 'online' | 'offline' | 'error';
};

export function StatusBadge({ label, status }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[status]]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  online: {
    borderColor: 'rgba(36, 199, 214, 0.28)',
    backgroundColor: 'rgba(5, 15, 30, 0.74)',
  },
  offline: {
    borderColor: 'rgba(136, 150, 180, 0.2)',
    backgroundColor: 'rgba(7, 21, 40, 0.6)',
  },
  error: {
    borderColor: 'rgba(140, 117, 201, 0.3)',
    backgroundColor: 'rgba(22, 14, 48, 0.56)',
  },
  text: {
    color: '#d8edf4',
    fontSize: 11,
    fontWeight: '900',
  },
});
