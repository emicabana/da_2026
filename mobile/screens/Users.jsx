import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import useUser from '../services/useUser';
import useGlobal from '../services/useGlobal';
import styles from '../style';

const emptyUser = {
  user_name: '',
  password: '',
  display_name: '',
  email: '',
  role: 'customer',
};

const roleOptions = [
  ['customer', 'Cliente'],
  ['photographer', 'Fotógrafo'],
  ['admin', 'Admin'],
];

export default function Users() {
  const { getUsers, addUser, updateUser, deleteUser } = useUser();
  const { username: currentUsername } = useGlobal();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...emptyUser });
  const [editingUsername, setEditingUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, [getUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function resetForm() {
    setEditingUsername('');
    setForm({ ...emptyUser });
  }

  async function saveUser() {
    setSaving(true);
    setError('');
    setMessage('');
    const data = { ...form };
    if (editingUsername && !data.password) delete data.password;
    try {
      const saved = editingUsername
        ? await updateUser(editingUsername, data)
        : await addUser(data);
      setMessage(`La cuenta @${saved.user_name} se ${editingUsername ? 'actualizó' : 'creó'} correctamente.`);
      resetForm();
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la cuenta.');
    } finally {
      setSaving(false);
    }
  }

  function editUser(user) {
    setEditingUsername(user.user_name);
    setForm({
      user_name: user.user_name || '',
      password: '',
      display_name: user.display_name || '',
      email: user.email || '',
      role: user.role || 'customer',
    });
    setMessage('');
    setError('');
  }

  function confirmDelete(user) {
    if (user.user_name === currentUsername) {
      setError('No podés eliminar la cuenta que está usando esta sesión.');
      return;
    }
    Alert.alert('Eliminar cuenta', `¿Eliminar la cuenta @${user.user_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setError('');
          setMessage('');
          try {
            await deleteUser(user.user_name);
            if (editingUsername === user.user_name) resetForm();
            setMessage(`Se eliminó la cuenta @${user.user_name}.`);
            await loadUsers();
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la cuenta.');
          }
        },
      },
    ]);
  }

  return (
    <Screen title="Cuentas de usuarios">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }}>
        <Text style={styles.bodyText}>Creá y administrá los accesos de clientes, fotógrafos y administradores.</Text>

        <View style={styles.card}>
          <Text style={styles.buttonText}>{editingUsername ? `Editar @${editingUsername}` : 'Crear cuenta'}</Text>
          <Text style={styles.fieldLabel}>Usuario</Text>
          <TextInput
            style={styles.field}
            value={form.user_name}
            onChangeText={(value) => setForm({ ...form, user_name: value })}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            placeholder="usuario"
            placeholderTextColor="#6e7186"
          />
          <Text style={styles.fieldLabel}>Nombre visible</Text>
          <TextInput
            style={styles.field}
            value={form.display_name}
            onChangeText={(value) => setForm({ ...form, display_name: value })}
            maxLength={80}
            placeholder="Nombre y apellido"
            placeholderTextColor="#6e7186"
          />
          <Text style={styles.fieldLabel}>Correo electrónico</Text>
          <TextInput
            style={styles.field}
            value={form.email}
            onChangeText={(value) => setForm({ ...form, email: value })}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="nombre@correo.com"
            placeholderTextColor="#6e7186"
          />
          <Text style={styles.fieldLabel}>{editingUsername ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Text>
          <TextInput
            style={styles.field}
            value={form.password}
            onChangeText={(value) => setForm({ ...form, password: value })}
            secureTextEntry
            autoCapitalize="none"
            placeholder={editingUsername ? 'Dejar vacía para conservarla' : 'Mínimo 8 caracteres'}
            placeholderTextColor="#6e7186"
          />
          <Text style={styles.fieldLabel}>Tipo de cuenta</Text>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {roleOptions.map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: form.role === value }}
                onPress={() => setForm({ ...form, role: value })}
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { marginHorizontal: 0, paddingHorizontal: 12 },
                  form.role === value && { backgroundColor: '#513281' },
                ]}
              >
                <Text style={styles.buttonText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          <Button label={saving ? 'Guardando…' : editingUsername ? 'Guardar cambios' : 'Crear cuenta'} onPress={saveUser} disabled={saving} />
          {editingUsername ? <Button label="Cancelar edición" variant="secondary" onPress={resetForm} /> : null}
        </View>

        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 16 }]}>
          <Text style={styles.buttonText}>Cuentas ({users.length})</Text>
          <Pressable onPress={loadUsers} accessibilityRole="button">
            <Text style={{ color: '#c39aff', fontWeight: '700' }}>{loading ? 'Cargando…' : 'Actualizar'}</Text>
          </Pressable>
        </View>
        {users.map((user) => (
          <View key={user.id || user._id || user.user_name} style={styles.card}>
            <Text style={styles.buttonText}>{user.display_name || user.user_name}</Text>
            <Text style={styles.mutedText}>@{user.user_name} · {user.role}</Text>
            <Text style={styles.bodyText}>{user.email}</Text>
            <View style={[styles.row, { marginTop: 8 }]}>
              <View style={styles.flex}>
                <Button label="Editar" variant="secondary" onPress={() => editUser(user)} />
              </View>
              <View style={styles.flex}>
                <Button label="Eliminar" variant="danger" onPress={() => confirmDelete(user)} />
              </View>
            </View>
          </View>
        ))}
        {!loading && !users.length ? <Text style={styles.mutedText}>No hay cuentas para mostrar.</Text> : null}
      </ScrollView>
    </Screen>
  );
}
