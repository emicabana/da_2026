import Screen from '../components/Screen';
import { Text, View } from 'react-native';
import styles from '../style';

export default function About() {
  return <Screen
    title="Acerca de Revela"
  >
    <View style={styles.card}>
      <Text style={styles.buttonText}>Fotografía para cada ocasión</Text>
      <Text style={[styles.bodyText, { marginTop: 8 }]}>
        Revela conecta a fotógrafos con las personas que quieren volver a vivir sus eventos.
        Explorá álbumes, guardá tus fotos favoritas y gestioná tus pedidos desde un solo lugar.
      </Text>
      <Text style={styles.mutedText}>Desarrollo de Aplicativos · 2026</Text>
    </View>
 </Screen>;
}