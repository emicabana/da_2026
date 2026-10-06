import { useEffect, useState } from 'react';
import { createOrder, getMyOrders, getPhotos } from '../services/api';

const formatPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const statusLabels = { pending: 'Pendiente', paid: 'Pagado', delivered: 'Entregado' };

export default function CustomerDashboard({ token, username, view, onViewChange }) {
  const [photos, setPhotos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getPhotos(), getMyOrders(token)])
      .then(([catalog, customerOrders]) => {
        if (active) {
          setPhotos(catalog);
          setOrders(customerOrders);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token, refreshKey]);

  const selectedPhotos = photos.filter((photo) => selectedIds.includes(photo._id || photo.id));
  const total = selectedPhotos.reduce((sum, photo) => sum + Number(photo.price || 0), 0);

  function togglePhoto(photoId) {
    setSelectedIds((current) => current.includes(photoId)
      ? current.filter((id) => id !== photoId)
      : [...current, photoId]);
  }

  async function handleCreateOrder() {
    if (selectedIds.length === 0) return;
    setOrdering(true);
    setError('');
    setMessage('');
    try {
      await createOrder(token, selectedIds);
      setSelectedIds([]);
      setMessage('Pedido creado. El pago todavía no está integrado, por eso figura pendiente.');
      setLoading(true);
      onViewChange('orders');
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOrdering(false);
    }
  }

  return (
    <section className="dashboard-stack" aria-labelledby="customer-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">GALERÍA / @{username}</p>
          <h1 id="customer-title">Encontrá tu próxima foto</h1>
          <p className="heading-copy">Explorá el catálogo y reuní tus favoritas.</p>
        </div>
        <div className="view-switch" role="tablist" aria-label="Secciones de cliente">
          <button type="button" role="tab" aria-selected={view === 'catalog'} className={view === 'catalog' ? 'is-active' : ''} onClick={() => onViewChange('catalog')}>Explorar</button>
          <button type="button" role="tab" aria-selected={view === 'orders'} className={view === 'orders' ? 'is-active' : ''} onClick={() => onViewChange('orders')}>Mis pedidos</button>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {message && <p className="notice notice-success" role="status">{message}</p>}

      {view === 'catalog' ? (
        <div className="customer-catalog-layout">
          <section className="catalog-panel" aria-label="Fotos disponibles">
            <div className="section-heading">
              <div><p className="eyebrow">DISPONIBLES</p><h2>Catálogo</h2></div>
              <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }} disabled={loading}>Actualizar</button>
            </div>
            {loading ? <p className="empty-state">Cargando el catálogo…</p> : photos.length === 0 ? (
              <div className="empty-state"><strong>Todavía no hay fotos publicadas.</strong><span>Volvé más tarde para ver nuevas imágenes.</span></div>
            ) : (
              <div className="photo-grid">
                {photos.map((photo) => {
                  const id = photo._id || photo.id;
                  const selected = selectedIds.includes(id);
                  return (
                    <article className={`photo-card ${selected ? 'is-selected' : ''}`} key={id}>
                      <img className="photo-image" src={photo.url} alt={photo.title} loading="lazy" />
                      <div className="photo-card-body">
                        <div className="photo-card-title"><h3>{photo.title}</h3><span>{formatPrice.format(photo.price)}</span></div>
                        <p className="photo-byline">Por @{photo.owner_username || 'fotógrafo'}</p>
                        {photo.description && <p className="photo-description">{photo.description}</p>}
                        <button className={`button ${selected ? 'button-selected' : 'button-quiet'} photo-select`} type="button" aria-pressed={selected} onClick={() => togglePhoto(id)}>
                          {selected ? 'Seleccionada' : 'Seleccionar foto'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="surface order-summary" aria-label="Resumen del pedido">
            <p className="eyebrow">TU SELECCIÓN</p>
            <h2>Pedido</h2>
            <p className="selection-count">{selectedPhotos.length} {selectedPhotos.length === 1 ? 'foto' : 'fotos'}</p>
            <div className="summary-total"><span>Total</span><strong>{formatPrice.format(total)}</strong></div>
            <button className="button button-primary button-wide" type="button" onClick={handleCreateOrder} disabled={ordering || selectedIds.length === 0}>
              {ordering ? 'Creando pedido…' : 'Crear pedido'}
            </button>
            <p className="form-note">El pedido queda pendiente. Los pagos todavía no están integrados.</p>
          </aside>
        </div>
      ) : (
        <section className="catalog-panel" aria-labelledby="orders-title">
          <div className="section-heading"><div><p className="eyebrow">TU ACTIVIDAD</p><h2 id="orders-title">Mis pedidos</h2></div></div>
          {loading ? <p className="empty-state">Cargando pedidos…</p> : orders.length === 0 ? (
            <div className="empty-state"><strong>Todavía no hiciste pedidos.</strong><span>Las fotos que selecciones van a aparecer acá.</span></div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-row" key={order._id || order.id}>
                  <div><strong>Pedido {String(order._id || order.id).slice(-7)}</strong><span>{new Date(order.created_at).toLocaleDateString('es-AR')}</span></div>
                  <div className="order-photos">{(order.photos || []).map((photo) => photo?.title).filter(Boolean).join(', ') || `${(order.photos || []).length} fotos`}</div>
                  <span className={`order-status status-${order.status}`}>{statusLabels[order.status] || order.status}</span>
                  <strong>{formatPrice.format(order.total)}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
