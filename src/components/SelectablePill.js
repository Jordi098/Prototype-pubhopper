import { Pressable, StyleSheet, Text } from 'react-native';

export default function SelectablePill({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  selected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  pressed: { opacity: 0.8 },
  label: { color: '#374151', fontWeight: '700' },
  selectedLabel: { color: '#075985' },
});
