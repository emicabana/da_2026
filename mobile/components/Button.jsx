import { Pressable, Text } from 'react-native';
import styles from '../style';

export default function Button({
  label,
  onPress,
  children,
  variant,
  disabled = false,
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      variant === 'secondary' && styles.secondaryButton,
      variant === 'danger' && styles.dangerButton,
      disabled && { opacity: 0.55 },
      pressed && !disabled && { opacity: 0.8 },
    ]}
    onPress={onPress}
  >
    {label ? <Text style={styles.buttonText}>{label}</Text> : null}
    {children}
  </Pressable>;
}