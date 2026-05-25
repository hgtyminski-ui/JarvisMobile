import { StyleSheet, Text, View } from 'react-native';

type StatusBadgeProps = {
  label: string;
  status: 'online' | 'offline' | 'error';
};

export function StatusBadge({ label, status }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[status]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  online: {
    backgroundColor: '#073a42',
  },
  offline: {
    backgroundColor: '#171d2d',
  },
  error: {
    backgroundColor: '#1b0815',
  },
  text: {
    color: '#d9f7ff',
    fontSize: 13,
    fontWeight: '900',
  },
});
