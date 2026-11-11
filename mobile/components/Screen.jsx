import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import styles from '../style';

export default function Screen({
  children,
  title,
}) {
  return <SafeAreaView
    style={styles.screen}
  >
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {children}
  </SafeAreaView>;
}