import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import useApi from '../services/useApi';
import useGlobal from '../services/useGlobal';
import useProject from '../services/useProject';
import Toast from 'react-native-toast-message';
import styles from '../style';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const watermarkRows = [0, 1, 2, 3];

function itemId(item) {
  return String(item?._id || item?.id || '');
}

function isPaidOrder(order) {
  return order?.status === 'paid' || order?.status === 'delivered';
}

export default function Catalog() {
  const api = useApi();
  const { role } = useGlobal();
  const project = useProject();
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState('all');
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  async function loadCatalog() {
    setLoading(true);
    setError('');
    try {
      const [photoList, albumList, orderList] = await Promise.all([
        project.getPhotos(),
        project.getPublicAlbums(),
        role ? project.getOrders(role).catch(() => []) : Promise.resolve([]),
      ]);
      setPhotos(Array.isArray(photoList) ? photoList : []);
      setAlbums(Array.isArray(albumList) ? albumList : []);
      setOrders(Array.isArray(orderList) ? orderList : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, [role]);

  const purchasedPhotoIds = useMemo(() => new Set(
    orders
      .filter(isPaidOrder)
      .flatMap((order) => order.photos || [])
      .map((photo) => itemId(photo))
  ), [orders]);

  const visiblePhotos = useMemo(() => photos.filter((photo) => (
    photo.available !== false
    && (selectedAlbum === 'all' || String(photo.album_id?._id || photo.album_id) === selectedAlbum)
  )), [photos, selectedAlbum]);

  function toggleCart(photoId) {
    if (purchasedPhotoIds.has(photoId)) return;
    setCart((current) => current.includes(photoId)
      ? current.filter((id) => id !== photoId)
      : [...current, photoId]);
  }

  async function checkout() {
    if (!['customer', 'admin'].includes(role)) {
      Toast.show({ type: 'info', text1: 'Iniciá sesión como cliente para comprar.' });
      return;
    }
    if (!cart.length) return;

    setCheckingOut(true);
    setError('');
    try {
      const order = await project.createOrder(cart, couponCode.trim());
      setCart([]);
      setCouponCode('');
      Toast.show({
        type: 'success',
        text1: 'Pedido creado',
        text2: `Número ${(order?._id || order?.id || '').toString().slice(-8)}`,
      });
    } catch (orderError) {
      const message = orderError instanceof Error ? orderError.message : 'No se pudo crear el pedido.';
      setError(message);
      Toast.show({ type: 'error', text1: 'No se pudo completar la compra', text2: message });
    } finally {
      setCheckingOut(false);
    }
  }

  function renderPhoto({ item }) {
    const id = itemId(item);
    const purchased = purchasedPhotoIds.has(id);
    const inCart = cart.includes(id);
    return (
      <View style={styles.card}>
        {item.url ? (
          <View style={styles.imageFrame}>
            <Image source={{ uri: api.mediaUrl(item.url) }} style={styles.imageInFrame} resizeMode="cover" />
            {!purchased ? (
              <View pointerEvents="none" style={styles.watermarkOverlay}>
                <View style={styles.watermarkPattern}>
                  {watermarkRows.map((row) => (
                    <View key={row} style={styles.watermarkRow}>
                      <Text style={styles.watermarkRepeatText}>revela</Text>
                      <Text style={styles.watermarkRepeatText}>revela</Text>
                      <Text style={styles.watermarkRepeatText}>revela</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.watermarkCenterText}>◎ revela</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.buttonText}>{item.title || 'Fotografía'}</Text>
        <Text style={styles.bodyText}>{item.description || 'Un momento para recordar.'}</Text>
        <Text style={[styles.mutedText, { marginTop: 8 }]}>{money.format(Number(item.price) || 0)}</Text>
        {purchased ? (
          <Text style={styles.successText}>✓ Comprada · Sin marca de agua</Text>
        ) : (
          <Button
            label={inCart ? 'Quitar del pedido' : 'Agregar al pedido'}
            variant={inCart ? 'secondary' : undefined}
            onPress={() => toggleCart(id)}
          />
        )}
      </View>
    );
  }

  return (
    <Screen title="Explorar fotografías">
      <FlatList
        data={visiblePhotos}
        keyExtractor={(item, index) => itemId(item) || String(index)}
        renderItem={renderPhoto}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={
          <View>
            <Text style={styles.bodyText}>Encontrá las fotos de tus eventos y reuní tus favoritas en un pedido.</Text>
            <Text style={[styles.buttonText, { marginTop: 16, marginBottom: 8 }]}>Álbumes</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {[{ _id: 'all', name: 'Todos' }, ...albums].map((album) => {
                const id = itemId(album);
                const active = selectedAlbum === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedAlbum(id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.button, styles.secondaryButton, { marginHorizontal: 0, paddingHorizontal: 12 }, active && { backgroundColor: '#513281' }]}
                  >
                    <Text style={styles.buttonText}>{album.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {cart.length ? (
              <View style={[styles.card, { marginTop: 14 }]}>
                <Text style={styles.buttonText}>Tu pedido · {cart.length} {cart.length === 1 ? 'foto' : 'fotos'}</Text>
                <TextInput
                  style={styles.field}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                  placeholder="Código de cupón (opcional)"
                  placeholderTextColor="#6e7186"
                />
                <Button label={checkingOut ? 'Procesando…' : 'Confirmar pedido'} onPress={checkout} disabled={checkingOut} />
              </View>
            ) : null}
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
            <View style={[styles.row, { justifyContent: 'space-between', marginTop: 14 }]}>
              <Text style={styles.buttonText}>Fotografías ({visiblePhotos.length})</Text>
              <Pressable onPress={loadCatalog} accessibilityRole="button">
                <Text style={{ color: '#c39aff', fontWeight: '700' }}>{loading ? 'Cargando…' : 'Actualizar'}</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.mutedText}>{loading ? 'Cargando catálogo…' : 'Todavía no hay fotografías disponibles en este álbum.'}</Text>
        }
      />
    </Screen>
  );
}
