import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import useGlobal from '../services/useGlobal';
import useProject from '../services/useProject';
import styles from '../style';

const statusLabels = {
  pending: 'Pendiente',
  paid: 'Pagado',
  delivered: 'Entregado',
};
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function orderId(order) {
  return String(order?._id || order?.id || '');
}

export default function Orders() {
  const { role } = useGlobal();
  const project = useProject();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');

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

  return (
    <Screen title={role === 'admin' ? 'Pedidos globales' : 'Mis compras'}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <Text style={styles.bodyText}>
          {role === 'admin' ? 'Revisá los pedidos y actualizá su estado.' : 'Consultá el estado de tus compras.'}
        </Text>
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
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
                <Text key={photo._id || photo.id || photoIndex} style={styles.mutedText}>
                  · {photo.title || photo.name || 'Fotografía'}
                </Text>
              ))}
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
