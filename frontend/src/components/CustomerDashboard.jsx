import { useEffect, useMemo, useState } from 'react';
import { createOrder, getMyOrders, getPhotos, getPublicAlbums } from '../services/api';

const formatPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const statusLabels = { pending: 'Pendiente', paid: 'Pagado', delivered: 'Entregado' };
const unassignedAlbumId = '__unassigned__';

function getId(item) {
  return item?._id || item?.id;
}

function isPaidOrder(order) {
  return order.status === 'paid' || order.status === 'delivered';
}

export default function CustomerDashboard({ token, username, view, onViewChange }) {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getPhotos(), getPublicAlbums(), getMyOrders(token)])
      .then(([catalog, publicAlbums, customerOrders]) => {
        if (active) {
          const publicAlbumIds = new Set(publicAlbums.map((album) => String(getId(album))));
          setAlbums(publicAlbums);
          setPhotos(catalog.filter((photo) =>
            photo.album_id
              ? publicAlbumIds.has(String(photo.album_id))
              : true
          ));
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

  const purchasedPhotoIds = useMemo(() => new Set(
    orders
      .filter(isPaidOrder)
      .flatMap((order) => order.photos || [])
      .map((photo) => String(getId(photo)))
  ), [orders]);
  const unassignedPhotos = photos.filter((photo) => !photo.album_id);
  const displayAlbums = unassignedPhotos.length
    ? [...albums, {
      _id: unassignedAlbumId,
      name: 'Fotos sin álbum',
      owner_display_name: 'Varios fotógrafos',
      is_unassigned: true,
    }]
    : albums;
  const selectedAlbum = displayAlbums.find((album) => String(getId(album)) === selectedAlbumId);
  const visiblePhotos = selectedAlbum
    ? selectedAlbum.is_unassigned
      ? unassignedPhotos
      : photos.filter((photo) => String(photo.album_id) === selectedAlbumId)
    : [];
  const selectedPhotos = photos.filter((photo) => selectedIds.includes(String(getId(photo))));
  const total = selectedPhotos.reduce((sum, photo) => sum + Number(photo.price || 0), 0);

  function togglePhoto(photoId) {
    const normalizedId = String(photoId);
    if (purchasedPhotoIds.has(normalizedId)) return;
    setSelectedIds((current) => current.includes(normalizedId)
      ? current.filter((id) => id !== normalizedId)
      : [...current, normalizedId]);
  }

  async function handleCreateOrder() {
    if (selectedIds.length === 0) return;
    setOrdering(true);
    setError('');
    setMessage('');
    try {
      await createOrder(token, selectedIds, couponCode);
      setSelectedIds([]);
      setCouponCode('');
      setMessage('Pedido creado. Las fotos se desbloquean cuando el pedido figure como pagado.');
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
          <p className="heading-copy">Explorá los álbumes por fotógrafo y reuní tus favoritas.</p>
        </div>
        <div className="view-switch" role="tablist" aria-label="Secciones de cliente">
          <button type="button" role="tab" aria-selected={view === 'catalog'} className={view === 'catalog' ? 'is-active' : ''} onClick={() => onViewChange('catalog')}>Explorar álbumes</button>
          <button type="button" role="tab" aria-selected={view === 'orders'} className={view === 'orders' ? 'is-active' : ''} onClick={() => onViewChange('orders')}>Mis pedidos</button>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {message && <p className="notice notice-success" role="status">{message}</p>}

      {view === 'catalog' ? (
        <>
          {loading ? <p className="empty-state">Cargando álbumes…</p> : selectedAlbum ? (
            <div className="customer-catalog-layout">
              <section className="catalog-panel" aria-label={`Fotos del álbum ${selectedAlbum.name}`}>
                <div className="section-heading customer-album-heading">
                  <div>
                    <button className="button button-quiet button-small" type="button" onClick={() => setSelectedAlbumId('')}>← Volver a los álbumes</button>
                    <p className="eyebrow">POR {selectedAlbum.owner_display_name || selectedAlbum.owner_username}</p>
                    <h2>{selectedAlbum.name}</h2>
                    {selectedAlbum.description && <p className="heading-copy">{selectedAlbum.description}</p>}
                  </div>
                  <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }} disabled={loading}>Actualizar</button>
                </div>
                {visiblePhotos.length === 0 ? (
                  <div className="empty-state"><strong>Este álbum todavía no tiene fotos.</strong><span>Volvé más tarde para ver nuevas imágenes.</span></div>
                ) : (
                  <div className="photo-grid">
                    {visiblePhotos.map((photo) => {
                      const id = String(getId(photo));
                      const purchased = purchasedPhotoIds.has(id);
                      const selected = selectedIds.includes(id);
                      return (
                        <article className={`photo-card ${selected ? 'is-selected' : ''}`} key={id}>
                          <div className={`customer-photo-preview ${purchased ? 'is-unlocked' : ''}`}>
                            <img className="photo-image" src={photo.url} alt={photo.title} loading="lazy" />
                            {!purchased && (
                              <div className="photo-watermark" aria-hidden="true">
                                <span>MEMORIES · VISTA PREVIA · @{photo.owner_username || 'FOTÓGRAFO'}</span>
                              </div>
                            )}
                          </div>
                          <div className="photo-card-body">
                            <div className="photo-card-title"><h3>{photo.title}</h3><span>{formatPrice.format(photo.price)}</span></div>
                            <p className="photo-byline">Por {selectedAlbum.is_unassigned ? `@${photo.owner_username || 'fotógrafo'}` : selectedAlbum.owner_display_name || `@${photo.owner_username || 'fotógrafo'}`}</p>
                            {photo.description && <p className="photo-description">{photo.description}</p>}
                            {purchased ? (
                              <span className="customer-photo-unlocked" role="status">✓ Comprada · desbloqueada</span>
                            ) : (
                              <button className={`button ${selected ? 'button-selected' : 'button-quiet'} photo-select`} type="button" aria-pressed={selected} onClick={() => togglePhoto(id)}>
                                {selected ? 'Seleccionada' : 'Seleccionar foto'}
                              </button>
                            )}
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
                <label className="coupon-checkout-field">Cupón de descuento
                  <input className="field" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Código promocional" maxLength="30" />
                </label>
                <button className="button button-primary button-wide" type="button" onClick={handleCreateOrder} disabled={ordering || selectedIds.length === 0}>
                  {ordering ? 'Creando pedido…' : 'Crear pedido'}
                </button>
                <p className="form-note">El pedido queda pendiente. Las fotos se desbloquean al confirmar el pago.</p>
              </aside>
            </div>
          ) : displayAlbums.length === 0 ? (
            <section className="catalog-panel">
              <div className="empty-state"><strong>Todavía no hay álbumes publicados.</strong><span>Volvé más tarde para explorar las fotos de los fotógrafos.</span></div>
            </section>
          ) : (
            <section className="catalog-panel customer-albums-panel" aria-label="Álbumes disponibles">
              <div className="section-heading">
                <div><p className="eyebrow">DISPONIBLES</p><h2>Álbumes</h2></div>
                <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }} disabled={loading}>Actualizar</button>
              </div>
              <div className="customer-album-grid">
                {displayAlbums.map((album) => (
                  <button
                    className="customer-album-card"
                    key={getId(album)}
                    type="button"
                    onClick={() => setSelectedAlbumId(String(getId(album)))}
                  >
                    {album.cover_url ? <img src={album.cover_url} alt="" loading="lazy" /> : <span className="customer-album-cover-placeholder" aria-hidden="true">▦</span>}
                    <span className="customer-album-copy">
                      <strong>{album.name}</strong>
                      <span>Fotógrafo: {album.owner_display_name || album.owner_username}</span>
                      {album.date && <span>{new Date(album.date).toLocaleDateString('es-AR')}</span>}
                    </span>
                    <span className="customer-album-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="catalog-panel" aria-labelledby="orders-title">
          <div className="section-heading">
            <div><p className="eyebrow">TU ACTIVIDAD</p><h2 id="orders-title">Mis pedidos</h2></div>
            <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }} disabled={loading}>Actualizar</button>
          </div>
          {loading ? <p className="empty-state">Cargando pedidos…</p> : orders.length === 0 ? (
            <div className="empty-state"><strong>Todavía no hiciste pedidos.</strong><span>Las fotos que selecciones van a aparecer acá.</span></div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-row" key={getId(order)}>
                  <div><strong>Pedido {String(getId(order)).slice(-7)}</strong><span>{new Date(order.created_at).toLocaleDateString('es-AR')}</span></div>
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
