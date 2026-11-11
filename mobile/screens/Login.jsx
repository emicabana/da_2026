import { useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useLogin from '../services/useLogin';
import useApi from '../services/useApi';
import useGlobal from '../services/useGlobal';
import Toast from 'react-native-toast-message';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d1020',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -110,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#6e6be8',
    opacity: 0.1,
  },
  form: {
    width: '100%',
    maxWidth: 460,
    gap: 17,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 26,
    backgroundColor: '#14172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 8,
  },
  formHeading: {
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  logoMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 255, 0.4)',
    borderRadius: 15,
    backgroundColor: '#8754df',
  },
  cameraBody: {
    width: 25,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 5,
  },
  cameraLens: {
    width: 9,
    height: 9,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 5,
  },
  cameraTop: {
    position: 'absolute',
    top: -5,
    left: 5,
    width: 8,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#fff',
  },
  eyebrow: {
    color: '#ba83ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  formTitle: {
    marginTop: 1,
    color: '#fff',
    fontSize: 27,
    fontWeight: '700',
  },
  formDescription: {
    color: '#9294a7',
    fontSize: 14,
  },
  errorMessage: {
    color: '#ff9c99',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: '#dad9e4',
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 13,
    backgroundColor: '#101326',
    color: '#f5f3fa',
    fontSize: 15,
  },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderRadius: 8,
    backgroundColor: '#8951e8',
    shadowColor: '#8754df',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 4,
  },
  submitButtonPressed: {
    backgroundColor: '#a15af4',
  },
  submitLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 2,
  },
  secureDot: {
    color: '#6ec49a',
    fontSize: 10,
  },
  secureText: {
    color: '#9294a7',
    fontSize: 12,
  },
  story: {
    width: '100%',
    maxWidth: 460,
    marginTop: 28,
  },
  storyTitle: {
    marginTop: 14,
    color: '#f8f6fc',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 41,
  },
  storyAccent: {
    color: '#ba83ff',
  },
  storyDescription: {
    marginTop: 12,
    color: '#b9b8c7',
    fontSize: 15,
    lineHeight: 25,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    color: '#85869a',
    fontSize: 12,
  },
  footnoteStar: {
    color: '#e2b14d',
  },
  accountTypes: {
    flexDirection: 'row',
    gap: 8,
  },
  accountType: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 9,
    backgroundColor: '#101326',
  },
  accountTypeActive: {
    borderColor: '#8951e8',
    backgroundColor: '#30204a',
  },
  accountTypeText: {
    color: '#b9b8c7',
    fontSize: 13,
    fontWeight: '600',
  },
  accountTypeTextActive: {
    color: '#fff',
  },
  modeSwitch: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  modeSwitchText: {
    color: '#c39aff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default function Login() {
  const { login, register } = useLogin();
  const { setAuthorization } = useApi();
  const { setUsername, setRole } = useGlobal();

  const [mode, setMode] = useState('login');
  const [account, setAccount] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'customer',
  });
  const [data, setData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loginHandler = useCallback(async () => {
    if (loading) return;
    if (!data.username.trim() || !data.password) {
      setError('Ingresá tu usuario o correo y tu contraseña.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await login({
        user_name: data.username.trim(),
        password: data.password,
      });
      setAuthorization('Bearer ' + res.authorizationToken);
      setUsername(res.username);
      setRole(res.role);
      Toast.show({
        type: 'success',
        text1: 'Sesión iniciada correctamente.'
      });
    } catch (loginError) {
      const message = loginError instanceof Error
        ? loginError.message
        : 'No se pudo iniciar sesión. Intentá nuevamente.';
      setError(message);
      Toast.show({
        type: 'error',
        text1: 'No se pudo iniciar sesión',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  }, [data, loading, login, setAuthorization, setRole, setUsername]);

  const registerHandler = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await register({
        ...account,
        first_name: account.first_name.trim(),
        last_name: account.last_name.trim(),
        email: account.email.trim(),
      });
      setAuthorization('Bearer ' + res.authorizationToken);
      setUsername(res.username);
      setRole(res.role);
      Toast.show({
        type: 'success',
        text1: 'Cuenta creada',
        text2: `Bienvenido/a, @${res.username}`,
      });
    } catch (registerError) {
      const message = registerError instanceof Error
        ? registerError.message
        : 'No se pudo crear la cuenta. Intentá nuevamente.';
      setError(message);
      Toast.show({ type: 'error', text1: 'No se pudo crear la cuenta', text2: message });
    } finally {
      setLoading(false);
    }
  }, [account, loading, register, setAuthorization, setRole, setUsername]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundGlow} />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.formHeading}>
              <View style={styles.logoMark} accessibilityLabel="Revela">
                <View style={styles.cameraBody}>
                  <View style={styles.cameraTop} />
                  <View style={styles.cameraLens} />
                </View>
              </View>
              <Text style={styles.eyebrow}>BIENVENIDO A REVELA</Text>
              <Text style={styles.formTitle}>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
              <Text style={styles.formDescription}>
                {mode === 'login' ? 'Ingresá tus datos para continuar.' : 'Elegí cómo querés usar Revela.'}
              </Text>
            </View>

            {mode === 'login' ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Correo electrónico o usuario</Text>
                  <TextInput
                    style={styles.field}
                    value={data.username}
                    onChangeText={(text) => setData({ ...data, username: text })}
                    placeholder="Tu correo o usuario"
                    placeholderTextColor="#6e7186"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    accessibilityLabel="Correo electrónico o usuario"
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Contraseña</Text>
                  <TextInput
                    style={styles.field}
                    value={data.password}
                    onChangeText={(text) => setData({ ...data, password: text })}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#6e7186"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    accessibilityLabel="Contraseña"
                    returnKeyType="done"
                    onSubmitEditing={loginHandler}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Tipo de cuenta</Text>
                  <View style={styles.accountTypes}>
                    {[
                      ['customer', 'Cliente'],
                      ['photographer', 'Fotógrafo'],
                    ].map(([role, label]) => (
                      <Pressable
                        key={role}
                        accessibilityRole="button"
                        accessibilityState={{ selected: account.role === role }}
                        style={[styles.accountType, account.role === role && styles.accountTypeActive]}
                        onPress={() => setAccount({ ...account, role })}
                      >
                        <Text style={[styles.accountTypeText, account.role === role && styles.accountTypeTextActive]}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nombre</Text>
                  <TextInput style={styles.field} value={account.first_name} onChangeText={(text) => setAccount({ ...account, first_name: text })} placeholder="Tu nombre" placeholderTextColor="#6e7186" autoComplete="given-name" maxLength={40} />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Apellido</Text>
                  <TextInput style={styles.field} value={account.last_name} onChangeText={(text) => setAccount({ ...account, last_name: text })} placeholder="Tu apellido" placeholderTextColor="#6e7186" autoComplete="family-name" maxLength={40} />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Correo electrónico</Text>
                  <TextInput style={styles.field} value={account.email} onChangeText={(text) => setAccount({ ...account, email: text })} placeholder="nombre@correo.com" placeholderTextColor="#6e7186" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Contraseña</Text>
                  <TextInput style={styles.field} value={account.password} onChangeText={(text) => setAccount({ ...account, password: text })} placeholder="Mínimo 8 caracteres" placeholderTextColor="#6e7186" secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
                  <Text style={styles.secureText}>Usá al menos 8 caracteres, una mayúscula, una minúscula y un número.</Text>
                </View>
              </>
            )}

            {error ? <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text> : null}

            <Pressable
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !loading && styles.submitButtonPressed,
                loading && { opacity: 0.65 },
              ]}
              onPress={mode === 'login' ? loginHandler : registerHandler}
            >
              <Text style={styles.submitLabel}>
                {loading ? (mode === 'login' ? 'Ingresando…' : 'Creando cuenta…') : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.modeSwitch}
              accessibilityRole="button"
              onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            >
              <Text style={styles.modeSwitchText}>
                {mode === 'login' ? '¿Todavía no tenés cuenta? Crear cuenta' : '¿Ya tenés cuenta? Iniciar sesión'}
              </Text>
            </Pressable>
            <View style={styles.secureNote}>
              <Text style={styles.secureDot}>●</Text>
              <Text style={styles.secureText}>Acceso seguro a tu espacio</Text>
            </View>
          </View>

          <View style={styles.story}>
            <Text style={styles.eyebrow}>FOTOGRAFÍA PARA CADA OCASIÓN</Text>
            <Text style={styles.storyTitle}>
              Cada evento{"\n"}tiene su <Text style={styles.storyAccent}>historia.</Text>
            </Text>
            <Text style={styles.storyDescription}>
              Ingresá a Revela para encontrar las fotos de tus celebraciones, shows y eventos,
              y volver a vivir cada momento.
            </Text>
            <Text style={styles.footnote}>
              <Text style={styles.footnoteStar}>✦</Text>
              <Text> Cada historia merece ser recordada.</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
