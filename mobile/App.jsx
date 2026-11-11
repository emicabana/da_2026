import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import Router from './Router';
import { ApiProvider } from './services/useApi';
import { GlobalProvider } from './services/useGlobal';
import Toast from 'react-native-toast-message';

export default function App() {
  return <SafeAreaProvider>
    <NavigationContainer>
      <ApiProvider>
        <GlobalProvider>
          <Router />
          <Toast />
        </GlobalProvider>
      </ApiProvider>
    </NavigationContainer>
  </SafeAreaProvider>;
}