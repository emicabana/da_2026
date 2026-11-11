import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Login from './screens/Login';
import About from './screens/About';
import Users from './screens/Users';
import Catalog from './screens/Catalog';
import Orders from './screens/Orders';
import Photographer from './screens/Photographer';
import useApi from './services/useApi';
import useGlobal from './services/useGlobal';
import styles from './style';

const Drawer = createDrawerNavigator();

const photographerScreens = [
  ['PhotographerProfile', 'Álbumes y perfil'],
  ['PhotographerPhotos', 'Fotografías'],
  ['PhotographerSales', 'Ventas'],
  ['PhotographerDiscounts', 'Descuentos y paquetes'],
  ['PhotographerCoupons', 'Cupones'],
  ['PhotographerCollaborators', 'Colaboradores'],
  ['PhotographerBilling', 'Facturación'],
  ['PhotographerStudio', 'Studio'],
];

function DrawerContent(props) {
  const api = useApi();
  const { username, role, setAuthorization, setUsername, setRole } = useGlobal();

  async function logout() {
    let message = '';
    try {
      await api.post('/logout');
    } catch (error) {
      message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión en el servidor.';
    } finally {
      setAuthorization('');
      setUsername(null);
      setRole(null);
      if (message) {
        Toast.show({ type: 'error', text1: 'Sesión cerrada localmente', text2: message });
      }
    }
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.card, { marginHorizontal: 12, marginTop: 16 }]}>
        <Text style={styles.buttonText}>REVELA</Text>
        <Text style={styles.mutedText}>
          {username ? `@${username} · ${role === 'admin' ? 'Administrador' : role === 'photographer' ? 'Fotógrafo' : 'Cliente'}` : 'Fotografía para cada ocasión'}
        </Text>
      </View>
      <DrawerItemList {...props} />
      {username ? (
        <DrawerItem
          label="Cerrar sesión"
          labelStyle={{ color: '#ff9c99' }}
          onPress={logout}
        />
      ) : null}
    </DrawerContentScrollView>
  );
}

function ScreenOptions({ title }) {
  return { title, headerStyle: { backgroundColor: '#14172a' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' }, sceneStyle: { backgroundColor: '#0d1020' } };
}

export default function Router() {
  const { authorization, role } = useGlobal();
  const loggedIn = Boolean(authorization && role);
  const key = loggedIn ? `signed-in-${role}` : 'guest';

  return (
    <Drawer.Navigator
      key={key}
      initialRouteName={!loggedIn ? 'Login' : role === 'admin' ? 'Users' : role === 'photographer' ? 'PhotographerProfile' : 'Catalog'}
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#14172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        drawerStyle: { backgroundColor: '#101326' },
        drawerActiveTintColor: '#fff',
        drawerInactiveTintColor: '#b9b8c7',
        drawerActiveBackgroundColor: '#513281',
        sceneStyle: { backgroundColor: '#0d1020' },
      }}
    >
      {!loggedIn ? (
        <>
          <Drawer.Screen name="Login" component={Login} options={ScreenOptions({ title: 'Iniciar sesión' })} />
          <Drawer.Screen name="Catalog" component={Catalog} options={ScreenOptions({ title: 'Explorar fotografías' })} />
          <Drawer.Screen name="About" component={About} options={ScreenOptions({ title: 'Acerca de Revela' })} />
        </>
      ) : role === 'customer' ? (
        <>
          <Drawer.Screen name="Catalog" component={Catalog} options={ScreenOptions({ title: 'Explorar fotografías' })} />
          <Drawer.Screen name="Orders" component={Orders} options={ScreenOptions({ title: 'Mis compras' })} />
          <Drawer.Screen name="About" component={About} options={ScreenOptions({ title: 'Acerca de Revela' })} />
        </>
      ) : role === 'photographer' ? (
        <>
          {photographerScreens.map(([name, title]) => (
            <Drawer.Screen key={name} name={name} component={Photographer} options={ScreenOptions({ title })} />
          ))}
          <Drawer.Screen name="About" component={About} options={ScreenOptions({ title: 'Acerca de Revela' })} />
        </>
      ) : (
        <>
          <Drawer.Screen name="Users" component={Users} options={ScreenOptions({ title: 'Cuentas de usuarios' })} />
          <Drawer.Screen name="Orders" component={Orders} options={ScreenOptions({ title: 'Pedidos globales' })} />
          <Drawer.Screen name="Catalog" component={Catalog} options={ScreenOptions({ title: 'Explorar fotografías' })} />
          {photographerScreens.map(([name, title]) => (
            <Drawer.Screen key={name} name={name} component={Photographer} options={ScreenOptions({ title: `Fotógrafo · ${title}` })} />
          ))}
          <Drawer.Screen name="About" component={About} options={ScreenOptions({ title: 'Acerca de Revela' })} />
        </>
      )}
    </Drawer.Navigator>
  );
}
