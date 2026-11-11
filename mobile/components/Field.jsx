import { View, Text } from 'react-native';
import styles from '../style';

export default function Field({
  label,
  children
}) {
  return <View
    style={styles.field}
  >
    {label && <Text style={styles.fieldLabel}>{label}</Text> || null}
    {children}
  </View>;
}