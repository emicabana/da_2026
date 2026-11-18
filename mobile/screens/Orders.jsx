import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Screen from '../components/Screen';
import Button from '../components/Button';
import useGlobal from '../services/useGlobal';
import useApi from '../services/useApi';
import useProject from '../services/useProject';
import styles from '../style';

const statusLabels = {
  pending: 'Pendiente',
  receipt_sent: 'Comprobante enviado',
  paid: 'Pagado',
  rejected: 'Rechazado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function orderId(order) {
  return String(order?._id || order?.id || '');
}

function saleStatusForPhoto(order, photo) {
  const sale = (order.sales_statuses || []).find((item) =>
    item.photographer_username === photo?.owner_username
  );
  return sale?.status || (order.status === 'paid' || order.status === 'delivered' ? order.status : 'pending');
}

function isPhotoUnlocked(order, photo) {
  return ['paid', 'delivered'].includes(saleStatusForPhoto(order, photo));
}

function isOrderCompleted(order) {
  const sales = order.sales_statuses || [];
  return sales.length > 0
    ? sales.every((sale) => ['paid', 'delivered'].includes(sale.status))
    : order.status === 'paid' || order.status === 'delivered';
}

export default function Orders() {
  const { role } = useGlobal();
  const api = useApi();
  const project = useProject();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const result = await project.getOrders(role);
      setOrders(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [role]);

  async function updateStatus(order, status) {
    const id = orderId(order);
    setUpdating(id);
    setError('');
    try {
      const updated = await project.updateOrderStatus(id, status);
      setOrders((current) => current.map((item) => orderId(item) === id ? updated : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el pedido.');
    } finally {
      setUpdating('');
    }
  }

  async function submitReceipt(order, sale) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Necesitás permitir el acceso a archivos e imágenes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const form = new FormData();
    form.append('receipt', {
      uri: asset.uri,
      name: asset.fileName || 'comprobante.jpg',
      type: asset.mimeType || 'image/jpeg',
    });
    setUpdating(orderId(order));
    setError('');
    setMessage('');
    try {
      await project.submitSaleReceipt(orderId(order), sale.photographerId, form);
      setMessage('Comprobante enviado.');
      await loadOrders();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el comprobante.');
    } finally {
      setUpdating('');
    }
  }

  async function sendWhatsappNotice(order, sale) {
    setUpdating(orderId(order));
    setError('');
    setMessage('');
    try {
      await project.registerSaleWhatsappNotice(orderId(order), sale.photographerId);
      setMessage('Aviso por WhatsApp registrado.');
      await loadOrders();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo registrar el aviso.');
    } finally {
      setUpdating('');
    }
  }

  async function downloadProtected(urlPath, fileName) {
    if (!api.authorization) throw new Error('Necesitás iniciar sesión nuevamente.');
    const base = api.urlBase.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const destination = `${FileSystem.cacheDirectory}${fileName}`;
    const download = await FileSystem.downloadAsync(
      `${base}${urlPath}`,
      destination,
      { headers: { Authorization: api.authorization } }
    );
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(download.uri);
    } else {
      setMessage('Archivo descargado: ' + download.uri);
    }
  }

  return (
    <Screen title={role === 'admin' ? 'Pedidos globales' : 'Mis compras'}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <Text style={styles.bodyText}>
          {role === 'admin' ? 'Revisá los pedidos y actualizá su estado.' : 'Consultá el estado de tus compras.'}
        </Text>
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.mutedText}>{message}</Text> : null}
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 14 }]}>
          <Text style={styles.buttonText}>Pedidos ({orders.length})</Text>
          <Pressable onPress={loadOrders} accessibilityRole="button">
            <Text style={{ color: '#c39aff', fontWeight: '700' }}>{loading ? 'Cargando…' : 'Actualizar'}</Text>
          </Pressable>
        </View>
        {orders.map((order, index) => {
          const id = orderId(order) || String(index);
          const photos = Array.isArray(order.photos) ? order.photos : [];
          return (
            <View key={id} style={styles.card}>
              <Text style={styles.buttonText}>Pedido {id.slice(-8)}</Text>
              {role === 'admin' ? <Text style={styles.mutedText}>Cliente: @{order.username || '—'}</Text> : null}
              <Text style={styles.bodyText}>Estado: {statusLabels[order.status] || order.status || 'Pendiente'}</Text>
              <Text style={styles.bodyText}>Total: {money.format(Number(order.total) || 0)}</Text>
              <Text style={styles.mutedText}>
                {order.created_at ? new Date(order.created_at).toLocaleDateString('es-AR') : 'Fecha no disponible'}
                {photos.length ? ` · ${photos.length} ${photos.length === 1 ? 'artículo' : 'artículos'}` : ''}
              </Text>
              {photos.map((photo, photoIndex) => (
                <View key={photo._id || photo.id || photoIndex}>
                  <Text style={styles.mutedText}>
                    · {photo.title || photo.name || 'Fotografía'} · {saleStatusForPhoto(order, photo) === 'paid' || saleStatusForPhoto(order, photo) === 'delivered' ? 'Desbloqueada' : 'Con marca de agua'}
                  </Text>
                  {isPhotoUnlocked(order, photo) ? (
                    <Button
                      label="Descargar original"
                      variant="secondary"
                      onPress={async () => {
                        try {
                          await downloadProtected(
                            `/api/orders/${encodeURIComponent(id)}/photos/${encodeURIComponent(orderId(photo))}/download`,
                            `${orderId(photo)}.jpg`
                          );
                        } catch (downloadError) {
                          setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el original.');
                        }
                      }}
                    />
                  ) : null}
                </View>
              ))}
              {role === 'customer' ? (order.sales_statuses || []).map((sale) => {
                const saleStatus = sale.status || 'pending';
                const payment = sale.photographer?.paymentInfo || {};
                const whatsapp = String(sale.photographer?.whatsapp || '').replace(/\D/g, '');
                const subtotal = Number(sale.subtotal) || 0;
                return (
                  <View key={sale.photographerId || sale.photographer_username} style={[styles.card, { marginHorizontal: 0 }]}>
                    <Text style={styles.buttonText}>@{sale.photographer_username}</Text>
                    <Text style={styles.mutedText}>Estado: {statusLabels[saleStatus] || 'Pendiente'} · Subtotal: {money.format(subtotal)}</Text>
                    {payment.alias || payment.cbu ? (
                      <Text style={styles.mutedText}>
                        {payment.alias ? `Alias: ${payment.alias}\n` : ''}
                        {payment.cbu ? `CBU/CVU: ${payment.cbu}\n` : ''}
                        {payment.accountHolder ? `Titular: ${payment.accountHolder}\n` : ''}
                        {payment.bankName ? `Banco: ${payment.bankName}` : ''}
                      </Text>
                    ) : null}
                    {sale.rejectionReason ? <Text style={styles.errorText}>Motivo: {sale.rejectionReason}</Text> : null}
                    {['pending', 'rejected'].includes(saleStatus) ? (
                      <>
                        <Button label="Adjuntar comprobante" variant="secondary" onPress={() => submitReceipt(order, sale)} disabled={updating === id} />
                        {whatsapp ? (
                          <>
                            <Button
                              label="Enviar por WhatsApp"
                              variant="secondary"
                              onPress={() => Linking.openURL(`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, te envío el comprobante del pedido ${id}. Subtotal: ${money.format(subtotal)}.`)}`)}
                            />
                            <Button label="Ya envié por WhatsApp" onPress={() => sendWhatsappNotice(order, sale)} disabled={updating === id} />
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                );
              }) : null}
              {Array.isArray(order.events) ? (
                <View style={{ marginTop: 8 }}>
                  {order.events.map((event, eventIndex) => (
                    <Text key={`${event.createdAt || eventIndex}-${event.type}`} style={styles.mutedText}>
                      {event.createdAt ? new Date(event.createdAt).toLocaleString('es-AR') : ''} · {event.type}{event.note ? ` · ${event.note}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
              {role === 'admin' ? (
                <View style={[styles.row, { marginTop: 8 }]}>
                  <View style={styles.flex}>
                    <Button label="Marcar pagado" variant="secondary" disabled={updating === id || order.status === 'paid'} onPress={() => updateStatus(order, 'paid')} />
                  </View>
                  <View style={styles.flex}>
                    <Button label="Entregado" variant="secondary" disabled={updating === id || order.status === 'delivered'} onPress={() => updateStatus(order, 'delivered')} />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        {!orders.length && !loading ? <Text style={styles.mutedText}>Todavía no hay pedidos.</Text> : null}
      </ScrollView>
    </Screen>
  );
}
