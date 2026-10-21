import { SafeAreaProvider } from "react-native-safe-area-context";
import Login from "./screens/Login";

export default function App() {
  return (
    <SafeAreaProvider>
      <Login />
    </SafeAreaProvider>
  );
}