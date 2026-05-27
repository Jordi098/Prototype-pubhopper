import { Pressable, StyleSheet, Text } from 'react-native';

export default function GameButton({ children, onPress, variant = 'primary', disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: '#111827' },
  secondary: { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  danger: { backgroundColor: '#991b1b' },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.99 }] },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondaryText: { color: '#111827' },
});
