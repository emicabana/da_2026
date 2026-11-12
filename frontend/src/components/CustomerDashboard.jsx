import { useEffect, useMemo, useState } from 'react';
import { createOrder, getMyOrders, getMyProfile, getPhotos, getPublicAlbums } from '../services/api';

const formatPrice = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatArsCode = (value) => {
  const numeric = Number(value || 0);
  return `ARS ${numeric.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const statusLabels = { pending: 'Pendiente', paid: 'Pagado', delivered: 'Entregado' };
const unassignedAlbumId = '__unassigned__';

const categoryIcons = {
  Fútbol: '⚽',
  Running: '🏃',
  Surf: '🏄',
  Carreras: '🏎️',
  Celebración: '🎉',
  'Música en vivo': '🎸',
  Corporativo: '💼',
  'Retratos y backstage': '📷',
};

function getId(item) {
  return item?._id || item?.id;
}

function formatLongDate(dateValue) {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  const formatted = parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatted.replace(/\b([a-záéíóúñ])/g, (match, letter) => letter.toUpperCase());
}

function calculateSelectionPricing(selectedPhotos, albums) {
  const albumsById = new Map(albums.map((album) => [String(getId(album)), album]));
  const groups = new Map();
  for (const photo of selectedPhotos) {
    const album = albumsById.get(String(photo.album_id));
    const type = photo.type === 'video' ? 'video' : 'photo';
    const key = `${String(photo.album_id || 'none')}:${type}`;
    const group = groups.get(key) || { album, type, photos: [] };
    group.photos.push(photo);
    groups.set(key, group);
  }

  const grossTotal = selectedPhotos.reduce((sum, photo) => sum + Number(photo.price || 0), 0);
  let subtotal = 0;
  for (const group of groups.values()) {
    const { album, type, photos: groupedPhotos } = group;
    const quantity = groupedPhotos.length;
    const discountPercent = Number(album?.[`${type}_discount_percent`] || 0);
    const minQuantity = Number(album?.[`${type}_discount_min_quantity`] || 1);
    const contentType = type === 'video' ? 'videos' : 'photos';
    const quantityDiscount = (album?.quantity_discounts || [])
      .filter((discount) => discount.active && discount.content_type === contentType)
      .flatMap((discount) => discount.tiers || [])
      .filter((tier) => quantity >= tier.min_quantity)
      .reduce((highest, tier) => Math.max(highest, Number(tier.discount_percent)), 0);
    const effectiveDiscount = Math.max(
      quantity >= minQuantity ? discountPercent : 0,
      quantityDiscount
    );
    const packageQuantity = Number(album?.[`${type}_package_quantity`] || 0);
    const packagePrice = Number(album?.[`${type}_package_price`] || 0);
    const discountedPrice = (price) => effectiveDiscount > 0
      ? price * (1 - effectiveDiscount / 100)
      : price;
    if (packageQuantity > 0 && packagePrice > 0 && quantity >= packageQuantity) {
      const packageCount = Math.floor(quantity / packageQuantity);
      const remainder = quantity % packageQuantity;
      const remainderTotal = groupedPhotos.slice(0, remainder)
        .reduce((sum, photo) => sum + discountedPrice(Number(photo.price || 0)), 0);
      subtotal += packageCount * packagePrice + remainderTotal;
    } else {
      subtotal += groupedPhotos.reduce((sum, photo) => sum + discountedPrice(Number(photo.price || 0)), 0);
    }
  }

  const total = Math.max(0, Number(subtotal.toFixed(2)));
  const discountTotal = Math.max(0, Number((grossTotal - total).toFixed(2)));
  return { grossTotal, total, discountTotal };
}

function isPaidOrder(order) {
  return order.status === 'paid' || order.status === 'delivered';
}

const watermarkStampRows = Array.from({ length: 5 }, (_, rowIndex) => rowIndex);

export default function CustomerDashboard({ token, username, view, onViewChange, onRequireLogin }) {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponAppliedMsg, setCouponAppliedMsg] = useState('');
  const [photoSearch, setPhotoSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [previewPhotoId, setPreviewPhotoId] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const accountDataRequest = token
      ? Promise.all([getMyOrders(token), getMyProfile(token).catch(() => null)])
      : Promise.resolve([[], null]);
    Promise.all([
      getPhotos(),
      getPublicAlbums(),
      accountDataRequest,
    ])
      .then(([catalog, publicAlbums, [customerOrders, profileData]]) => {
        if (active) {
          const publicAlbumIds = new Set(publicAlbums.map((album) => String(getId(album))));
          setAlbums(publicAlbums);
          setPhotos(catalog.filter((photo) =>
            photo.album_id
              ? publicAlbumIds.has(String(photo.album_id))
              : true
          ));
          setOrders(customerOrders);
          const purchasedIds = new Set(
            customerOrders
              .filter(isPaidOrder)
              .flatMap((order) => order.photos || [])
              .map((photo) => String(getId(photo)))
          );
          setSelectedIds((current) => current.filter((id) => !purchasedIds.has(id)));
          if (profileData?.email) {
            setCustomerEmail(profileData.email);
          } else if (!token) {
            setCustomerEmail('');
          }
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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setPreviewPhotoId('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const albumsById = new Map(displayAlbums.map((album) => [String(getId(album)), album]));

  const selectedAlbum = displayAlbums.find((album) => String(getId(album)) === selectedAlbumId);
  const albumPhotos = selectedAlbum
    ? selectedAlbum.is_unassigned
      ? unassignedPhotos
      : photos.filter((photo) => String(photo.album_id) === selectedAlbumId)
    : [];
  const normalizedQuery = photoSearch.trim().toLocaleLowerCase('es-AR');
  const visiblePhotos = normalizedQuery
    ? albumPhotos.filter((photo, index) => {
      const haystack = `${photo.title || ''} ${photo.description || ''} ${photo.owner_username || ''} #${index + 1}`.toLocaleLowerCase('es-AR');
      return haystack.includes(normalizedQuery);
    })
    : albumPhotos;

  const selectedPhotos = photos.filter((photo) => selectedIds.includes(String(getId(photo))));
  const { grossTotal, total, discountTotal } = calculateSelectionPricing(selectedPhotos, albums);

  // Group selected photos by album for the "Detalle" breakdown in "Revisá tu compra"
  const albumGroupMap = new Map();
  for (const photo of selectedPhotos) {
    const albumKey = String(photo.album_id || unassignedAlbumId);
    const albumObj = albumsById.get(albumKey);
    const entry = albumGroupMap.get(albumKey) || {
      id: albumKey,
      name: albumObj?.name || 'Evento',
      artistName: albumObj?.owner_display_name || albumObj?.owner_username || photo.owner_username || 'Fotógrafo',
      artistUsername: albumObj?.owner_username || photo.owner_username || 'fotografo',
      count: 0,
      amount: 0,
    };
    entry.count += 1;
    entry.amount += Number(photo.price || 0);
    albumGroupMap.set(albumKey, entry);
  }
  const selectedAlbumBreakdown = Array.from(albumGroupMap.values());

  // Group selected photos by artist for the "Compras pendientes" view
  const artistGroupMap = new Map();
  for (const photo of selectedPhotos) {
    const albumObj = albumsById.get(String(photo.album_id || unassignedAlbumId));
    const artistUsername = albumObj?.owner_username || photo.owner_username || 'fotografo';
    const artistDisplayName = albumObj?.owner_display_name || artistUsername;
    const entry = artistGroupMap.get(artistUsername) || {
      artistUsername,
      artistDisplayName,
      photos: [],
    };
    entry.photos.push(photo);
    artistGroupMap.set(artistUsername, entry);
  }
  const pendingCartGroups = Array.from(artistGroupMap.values()).map((group) => {
    const pricing = calculateSelectionPricing(group.photos, albums);
    return {
      ...group,
      total: pricing.total,
    };
  });

  const previewIndex = visiblePhotos.findIndex((photo) => String(getId(photo)) === previewPhotoId);
  const previewPhoto = previewIndex >= 0 ? visiblePhotos[previewIndex] : null;

  function togglePhoto(photoId) {
    const normalizedId = String(photoId);
    if (purchasedPhotoIds.has(normalizedId)) return;
    setSelectedIds((current) => current.includes(normalizedId)
      ? current.filter((id) => id !== normalizedId)
      : [...current, normalizedId]);
  }

  function clearArtistSelection(artistUsername) {
    if (!artistUsername) {
      setSelectedIds([]);
      return;
    }
    const idsToRemove = new Set(
      selectedPhotos
        .filter((photo) => {
          const albumObj = albumsById.get(String(photo.album_id || unassignedAlbumId));
          const owner = albumObj?.owner_username || photo.owner_username || 'fotografo';
          return owner === artistUsername;
        })
        .map((photo) => String(getId(photo)))
    );
    setSelectedIds((current) => current.filter((id) => !idsToRemove.has(id)));
  }

  async function handleCreateOrder() {
    if (!token) {
      onRequireLogin?.();
      return;
    }
    if (selectedIds.length === 0) return;
    setOrdering(true);
    setError('');
    setMessage('');
    try {
      await createOrder(token, selectedIds, couponCode);
      setSelectedIds([]);
      setCouponCode('');
      setCouponAppliedMsg('');
      setCheckoutOpen(false);
      setPreviewPhotoId('');
      setMessage('Compra confirmada. Las fotos se desbloquean cuando el pedido figure como pagado.');
      setLoading(true);
      onViewChange('orders');
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOrdering(false);
    }
  }

  function handleCheckout() {
    if (selectedIds.length === 0) return;
    if (!token) {
      onRequireLogin?.();
      return;
    }
    setCheckoutOpen(true);
  }

  const primaryArtistName = selectedAlbumBreakdown[0]?.artistName
    || selectedAlbum?.owner_display_name
    || selectedAlbum?.owner_username
    || 'Fotógrafo';

  const albumHeroPrice = selectedAlbum
    ? Number(selectedAlbum.photo_price || albumPhotos[0]?.price || 0)
    : 0;
  const albumBackdropUrl = selectedAlbum?.cover_url || albumPhotos[0]?.url || '';
  const albumCategory = selectedAlbum?.category || 'Evento';
  const albumCategoryIcon = categoryIcons[albumCategory] || '📷';
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const completedOrders = orders.filter((order) => order.status !== 'pending');
  const cartBadgeCount = selectedPhotos.length + pendingOrders.length;

  // =========================================================================
  // VIEW 1: "Revisá tu compra" (Full-screen Checkout Review View - Image 1)
  // =========================================================================
  if (checkoutOpen && view === 'catalog') {
    return (
      <section className="customer-dark-page customer-review-page" aria-labelledby="customer-review-title">
        <div className="customer-dark-topbar">
          <button
            type="button"
            className="customer-album-back-pill"
            onClick={() => {
              setCheckoutOpen(false);
              setError('');
            }}
          >
            <span aria-hidden="true">←</span> Volver
          </button>

          <button
            type="button"
            className="customer-topbar-cart-btn"
            onClick={() => {
              setCheckoutOpen(false);
              onViewChange('orders');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Carrito</span>
            {cartBadgeCount > 0 && (
              <span className="customer-topbar-cart-badge">{cartBadgeCount}</span>
            )}
          </button>
        </div>

        <header className="customer-review-header">
          <h1 id="customer-review-title">Revisá tu compra</h1>
          <p>Artista: {primaryArtistName}</p>
        </header>

        {error && <p className="notice notice-error" role="alert">{error}</p>}

        {selectedPhotos.length === 0 ? (
          <div className="customer-pending-empty">
            <strong>Tu carrito está vacío</strong>
            <p>Volvé al álbum y seleccioná las fotos que quieras comprar.</p>
            <button
              type="button"
              className="customer-confirm-purchase-btn"
              onClick={() => setCheckoutOpen(false)}
            >
              Volver al álbum
            </button>
          </div>
        ) : (
          <div className="customer-review-layout">
            <div className="customer-review-items-column">
              <div className="customer-review-items-header">
                <h2>Items ({selectedPhotos.length})</h2>
                <button
                  type="button"
                  className="customer-empty-cart-btn"
                  onClick={() => {
                    setSelectedIds([]);
                    setCouponAppliedMsg('');
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Vaciar carrito</span>
                </button>
              </div>

              <div className="customer-review-items-grid" role="list">
                {selectedPhotos.map((photo) => {
                  const id = String(getId(photo));
                  return (
                    <article className="customer-review-thumb-card" key={id} role="listitem">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        loading="lazy"
                        draggable={false}
                      />
                      <div className="customer-showcase-watermark" aria-hidden="true">
                        <div className="customer-watermark-pattern">
                          {watermarkStampRows.map((row) => (
                            <div className="customer-watermark-row" key={row}>
                              <span>revela</span>
                              <span>revela</span>
                              <span>revela</span>
                              <span>revela</span>
                            </div>
                          ))}
                        </div>
                        <div className="customer-watermark-center">
                          <span className="customer-watermark-emblem">◎</span>
                          <span className="customer-watermark-brand">revela</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="customer-tile-remove-btn"
                        aria-label={`Quitar ${photo.title} del carrito`}
                        title="Quitar del carrito"
                        onClick={() => togglePhoto(id)}
                      >
                        ✕
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="customer-review-detail-card" aria-label="Detalle de la compra">
              <h2>Detalle</h2>

              <div className="customer-review-coupon-box">
                <label htmlFor="customer-coupon-input">¿Tenés un cupón de descuento?</label>
                <div className="customer-review-coupon-row">
                  <input
                    id="customer-coupon-input"
                    type="text"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setCouponAppliedMsg('');
                    }}
                    placeholder="Ingresá tu cupón de descuento"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    className="customer-review-coupon-apply"
                    aria-label="Aplicar cupón"
                    onClick={() => {
                      if (couponCode.trim()) {
                        setCouponAppliedMsg(`Cupón ${couponCode.trim()} listo para aplicar al confirmar.`);
                      }
                    }}
                  >
                    ✓
                  </button>
                </div>
                {couponAppliedMsg && (
                  <small className="customer-review-coupon-hint">{couponAppliedMsg}</small>
                )}
              </div>

              <div className="customer-review-breakdown">
                {selectedAlbumBreakdown.map((albumGroup) => (
                  <div className="customer-review-album-line" key={albumGroup.id}>
                    <span className="customer-review-album-name">
                      {albumGroup.name} (<span aria-hidden="true">🖼</span> {albumGroup.count})
                    </span>
                    <strong>{formatArsCode(albumGroup.amount)}</strong>
                  </div>
                ))}

                <div className="customer-review-subline">
                  <span><span aria-hidden="true">🖼</span> Subtotal fotos</span>
                  <span>{formatArsCode(grossTotal)}</span>
                </div>

                {discountTotal > 0 && (
                  <div className="customer-review-subline customer-review-discount-line">
                    <span>Descuento aplicado</span>
                    <span>-{formatArsCode(discountTotal)}</span>
                  </div>
                )}

                <div className="customer-review-subline">
                  <span>Subtotal</span>
                  <span>{formatArsCode(total)}</span>
                </div>

                <div className="customer-review-total-line">
                  <strong>Total</strong>
                  <strong>{formatArsCode(total)}</strong>
                </div>
              </div>

              <div className="customer-review-email-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <div>
                  <span>Te enviamos las fotos a</span>
                  <strong>{customerEmail || `${username}@revela.com`}</strong>
                </div>
              </div>

              <p className="customer-review-terms">
                * Al continuar con la compra aceptas los{' '}
                <a href="#terminos" onClick={(event) => event.preventDefault()}>
                  terminos y condiciones
                </a>{' '}
                de la plataforma.
              </p>

              {ordering && (
                <div className="loader-status" role="status" aria-live="polite">
                  <div className="loader" />
                  <span>Confirmando compra…</span>
                </div>
              )}

              <button
                type="button"
                className="customer-confirm-purchase-btn"
                onClick={handleCreateOrder}
                disabled={ordering || selectedIds.length === 0}
              >
                {ordering ? 'Procesando compra…' : 'Confirmar compra'}
              </button>
            </aside>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="dashboard-stack" aria-labelledby="customer-title">
      {(!selectedAlbum && view === 'catalog') && (
        <div className="page-heading">
          <div>
            <p className="eyebrow">{token ? `GALERÍA / @${username}` : 'GALERÍA PÚBLICA'}</p>
            <h1 id="customer-title">Encontrá tu próxima foto</h1>
            <p className="heading-copy">Explorá los álbumes por fotógrafo y reuní tus favoritas.</p>
          </div>
          {token && (
            <div className="view-switch" role="tablist" aria-label="Secciones de cliente">
              <button type="button" role="tab" aria-selected={view === 'catalog'} className={view === 'catalog' ? 'is-active' : ''} onClick={() => onViewChange('catalog')}>Explorar álbumes</button>
              <button type="button" role="tab" aria-selected={view === 'orders'} className={view === 'orders' ? 'is-active' : ''} onClick={() => onViewChange('orders')}>
                Compras pendientes {cartBadgeCount > 0 ? `(${cartBadgeCount})` : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {message && <p className="notice notice-success" role="status">{message}</p>}

      {view === 'catalog' ? (
        <>
          {loading ? (
            <div className="empty-state" role="status" aria-live="polite">
              <div className="loader" />
              <strong>Cargando álbumes…</strong>
            </div>
          ) : selectedAlbum ? (
            <div className="customer-album-showcase">
              {albumBackdropUrl && (
                <div
                  className="customer-album-showcase-backdrop"
                  style={{ backgroundImage: `url(${albumBackdropUrl})` }}
                  aria-hidden="true"
                />
              )}

              <div className="customer-album-showcase-inner">
                <div className="customer-album-showcase-topbar">
                  <button
                    className="customer-album-back-pill"
                    type="button"
                    onClick={() => {
                      setSelectedAlbumId('');
                      setPhotoSearch('');
                      setSearchOpen(false);
                      setPreviewPhotoId('');
                    }}
                  >
                    <span aria-hidden="true">←</span> Volver a los álbumes
                  </button>
                  <div className="customer-album-topbar-actions">
                    {token ? (
                      <button
                        className="customer-topbar-cart-btn"
                        type="button"
                        onClick={() => onViewChange('orders')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        <span>Carrito</span>
                        {cartBadgeCount > 0 && (
                          <span className="customer-topbar-cart-badge">{cartBadgeCount}</span>
                        )}
                      </button>
                    ) : (
                      <button
                        className="customer-album-back-pill"
                        type="button"
                        onClick={onRequireLogin}
                      >
                        Iniciar sesión para comprar
                      </button>
                    )}
                    <button
                      className="customer-album-back-pill"
                      type="button"
                      onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }}
                      disabled={loading}
                    >
                      Actualizar
                    </button>
                  </div>
                </div>

                <header className="customer-album-hero-card" aria-label={`Álbum ${selectedAlbum.name}`}>
                  <div className="customer-album-hero-top">
                    <h1 id="customer-title" className="customer-album-hero-title">
                      {selectedAlbum.name}
                    </h1>
                    <div className="customer-album-hero-meta">
                      {selectedAlbum.date && (
                        <span className="customer-album-meta-item">
                          {formatLongDate(selectedAlbum.date)}
                        </span>
                      )}
                      <span className="customer-album-meta-item">
                        <span className="customer-album-meta-icon" aria-hidden="true">{albumCategoryIcon}</span>
                        {albumCategory}
                      </span>
                      <span className="customer-album-meta-item customer-album-meta-photographer">
                        <span className="customer-album-meta-icon" aria-hidden="true">📷</span>
                        <strong>{selectedAlbum.owner_display_name || selectedAlbum.owner_username}</strong>
                      </span>
                    </div>
                    {selectedAlbum.description && (
                      <p className="customer-album-hero-description">{selectedAlbum.description}</p>
                    )}
                  </div>

                  <div className="customer-album-hero-bottom">
                    <div className="customer-album-hero-pricing">
                      <span className="customer-album-price-badge">
                        <svg className="customer-camera-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <strong>{formatPrice.format(albumHeroPrice)}</strong>
                      </span>
                      {Number(selectedAlbum.photo_package_quantity || 0) > 0 && Number(selectedAlbum.photo_package_price || 0) > 0 && (
                        <span className="customer-album-promo-pill">
                          Pack {selectedAlbum.photo_package_quantity} fotos por {formatPrice.format(selectedAlbum.photo_package_price)}
                        </span>
                      )}
                    </div>

                    <div className="customer-album-find-wrap">
                      {searchOpen ? (
                        <div className="customer-album-find-input">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            type="search"
                            autoFocus
                            value={photoSearch}
                            onChange={(event) => setPhotoSearch(event.target.value)}
                            placeholder="Buscar por título o número…"
                            aria-label="Encontrá tus fotos en este álbum"
                          />
                          {photoSearch && (
                            <button
                              type="button"
                              className="customer-album-find-clear"
                              onClick={() => setPhotoSearch('')}
                              aria-label="Limpiar búsqueda"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="customer-album-find-btn"
                          onClick={() => setSearchOpen(true)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <span>Encontrá tus fotos</span>
                        </button>
                      )}
                    </div>
                  </div>
                </header>

                {visiblePhotos.length === 0 ? (
                  <div className="empty-state customer-showcase-empty">
                    <strong>{photoSearch ? 'No encontramos fotos con esa búsqueda.' : 'Este álbum todavía no tiene fotos.'}</strong>
                    <span>{photoSearch ? 'Probá con otra palabra o limpiá el filtro.' : 'Volvé más tarde para ver nuevas imágenes.'}</span>
                  </div>
                ) : (
                  <div className="customer-showcase-grid" role="list" aria-label={`Fotos de ${selectedAlbum.name}`}>
                    {visiblePhotos.map((photo) => {
                      const id = String(getId(photo));
                      const purchased = purchasedPhotoIds.has(id);
                      const selected = selectedIds.includes(id);
                      const isVideo = photo.type === 'video';
                      const watermarkLabel = 'revela';
                      return (
                        <article
                          className={`customer-showcase-tile ${selected ? 'is-selected' : ''} ${purchased ? 'is-unlocked' : ''}`}
                          key={id}
                          role="listitem"
                        >
                          <div
                            className={`customer-showcase-media${isVideo ? ' is-video' : ''}`}
                            role={isVideo ? undefined : 'button'}
                            tabIndex={isVideo ? undefined : 0}
                            aria-label={isVideo ? undefined : `Ver vista previa de ${photo.title || 'fotografía'}`}
                            onClick={isVideo ? undefined : () => setPreviewPhotoId(id)}
                            onKeyDown={isVideo ? undefined : (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setPreviewPhotoId(id);
                              }
                            }}
                          >
                            {isVideo ? (
                              <video
                                className="customer-showcase-video"
                                src={photo.url}
                                controls
                                preload="metadata"
                                playsInline
                                aria-label={photo.title || 'Video del álbum'}
                              />
                            ) : (
                              <img
                                className="customer-showcase-img"
                                src={photo.url}
                                alt={photo.title}
                                loading="lazy"
                                draggable={false}
                              />
                            )}

                            {!purchased && (
                              <div className="customer-showcase-watermark" aria-hidden="true">
                                <div className="customer-watermark-pattern">
                                  {watermarkStampRows.map((row) => (
                                    <div className="customer-watermark-row" key={row}>
                                      <span>{watermarkLabel}</span>
                                      <span>{watermarkLabel}</span>
                                      <span>{watermarkLabel}</span>
                                      <span>{watermarkLabel}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="customer-watermark-center">
                                  <span className="customer-watermark-emblem">◎</span>
                                  <span className="customer-watermark-brand">{watermarkLabel}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {purchased ? (
                            <span className="customer-tile-purchased-badge" role="status">
                              ✓ Comprada
                            </span>
                          ) : selected ? (
                            <button
                              type="button"
                              className="customer-tile-remove-btn"
                              aria-label={`Quitar ${photo.title} de la compra`}
                              title="Quitar de la selección"
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePhoto(id);
                              }}
                            >
                              ✕
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="customer-tile-add-btn"
                              aria-label={`Agregar ${photo.title} por ${formatPrice.format(photo.price)}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePhoto(id);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                              <span>Agregar</span>
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="customer-floating-buy-btn"
                onClick={handleCheckout}
                aria-label={`Comprar (${selectedPhotos.length} seleccionadas)`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span>Comprar</span>
                {selectedPhotos.length > 0 && (
                  <span className="customer-floating-buy-badge">{selectedPhotos.length}</span>
                )}
              </button>

              {previewPhoto && (
                <div
                  className="customer-lightbox-backdrop"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Vista previa de ${previewPhoto.title}`}
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setPreviewPhotoId('');
                  }}
                >
                  <div className="customer-lightbox-card">
                    <button
                      type="button"
                      className="customer-lightbox-close"
                      aria-label="Cerrar vista previa"
                      onClick={() => setPreviewPhotoId('')}
                    >
                      ✕
                    </button>

                    <div className="customer-lightbox-stage">
                      {visiblePhotos.length > 1 && (
                        <button
                          type="button"
                          className="customer-lightbox-nav customer-lightbox-prev"
                          aria-label="Foto anterior"
                          onClick={() => {
                            const prevIdx = (previewIndex - 1 + visiblePhotos.length) % visiblePhotos.length;
                            setPreviewPhotoId(String(getId(visiblePhotos[prevIdx])));
                          }}
                        >
                          ‹
                        </button>
                      )}

                      <div className="customer-lightbox-media">
                        {previewPhoto.type === 'video' ? (
                          <video
                            src={previewPhoto.url}
                            controls
                            autoPlay
                            playsInline
                            preload="metadata"
                            aria-label={previewPhoto.title || 'Video del álbum'}
                          />
                        ) : (
                          <img
                            src={previewPhoto.url}
                            alt={previewPhoto.title}
                            draggable={false}
                          />
                        )}
                        {!purchasedPhotoIds.has(String(getId(previewPhoto))) && (
                          <div className="customer-showcase-watermark" aria-hidden="true">
                            <div className="customer-watermark-pattern">
                              {watermarkStampRows.map((row) => (
                                <div className="customer-watermark-row" key={row}>
                                  <span>revela</span>
                                  <span>revela</span>
                                  <span>revela</span>
                                  <span>revela</span>
                                </div>
                              ))}
                            </div>
                            <div className="customer-watermark-center">
                              <span className="customer-watermark-emblem">◎</span>
                              <span className="customer-watermark-brand">revela</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {visiblePhotos.length > 1 && (
                        <button
                          type="button"
                          className="customer-lightbox-nav customer-lightbox-next"
                          aria-label="Foto siguiente"
                          onClick={() => {
                            const nextIdx = (previewIndex + 1) % visiblePhotos.length;
                            setPreviewPhotoId(String(getId(visiblePhotos[nextIdx])));
                          }}
                        >
                          ›
                        </button>
                      )}
                    </div>

                    <div className="customer-lightbox-footer">
                      <div>
                        <strong>{previewPhoto.title}</strong>
                        <span>
                          {formatPrice.format(previewPhoto.price)} · Foto {previewIndex + 1} de {visiblePhotos.length}
                        </span>
                      </div>
                      <div className="customer-lightbox-actions">
                        {purchasedPhotoIds.has(String(getId(previewPhoto))) ? (
                          <span className="customer-tile-purchased-badge">✓ Comprada · desbloqueada</span>
                        ) : selectedIds.includes(String(getId(previewPhoto))) ? (
                          <button
                            type="button"
                            className="button button-danger"
                            onClick={() => togglePhoto(getId(previewPhoto))}
                          >
                            ✕ Quitar de la selección
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="customer-tile-add-btn customer-lightbox-add-btn"
                            onClick={() => togglePhoto(getId(previewPhoto))}
                          >
                            <span>＋ Agregar al carrito</span>
                          </button>
                        )}
                        {selectedPhotos.length > 0 && (
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => {
                              setPreviewPhotoId('');
                              handleCheckout();
                            }}
                          >
                            Revisar compra ({selectedPhotos.length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
        /* =========================================================================
           VIEW 2: "Compras pendientes" (Pending Purchases & Orders View - Image 2)
           ========================================================================= */
        <section className="customer-dark-page customer-pending-page" aria-labelledby="orders-title">
          <div className="customer-dark-topbar">
            <button
              type="button"
              className="customer-album-back-pill"
              onClick={() => onViewChange('catalog')}
            >
              <span aria-hidden="true">←</span> Explorar álbumes
            </button>

            <div className="customer-album-topbar-actions">
              <span className="customer-topbar-cart-btn is-static">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span>Carrito</span>
                {cartBadgeCount > 0 && (
                  <span className="customer-topbar-cart-badge">{cartBadgeCount}</span>
                )}
              </span>
              <button
                className="customer-album-back-pill"
                type="button"
                onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }}
                disabled={loading}
              >
                Actualizar
              </button>
            </div>
          </div>

          <header className="customer-pending-header">
            <h1 id="orders-title">Compras pendientes</h1>
          </header>

          {loading ? (
            <div className="empty-state" role="status" aria-live="polite">
              <div className="loader" />
              <strong>Cargando compras pendientes…</strong>
            </div>
          ) : pendingCartGroups.length === 0 && pendingOrders.length === 0 ? (
            <div className="customer-pending-empty">
              <strong>No tenés compras pendientes.</strong>
              <p>Las fotos que agregues al carrito desde un álbum aparecerán acá listas para comprar.</p>
              <button
                type="button"
                className="customer-confirm-purchase-btn"
                onClick={() => onViewChange('catalog')}
              >
                Explorar álbumes
              </button>
            </div>
          ) : (
            <div className="customer-pending-list" role="list">
              {pendingCartGroups.map((group) => (
                <article className="customer-pending-row" key={`cart-${group.artistUsername}`} role="listitem">
                  <div className="customer-pending-artist">
                    <div className="customer-pending-avatar" aria-hidden="true">
                      <span>{(group.artistDisplayName || 'F').slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="customer-pending-artist-info">
                      <strong>{group.artistDisplayName}</strong>
                      <span>@{group.artistUsername}</span>
                    </div>
                  </div>

                  <div className="customer-pending-metrics">
                    <div className="customer-pending-metric">
                      <span>Items</span>
                      <strong>{group.photos.length}</strong>
                    </div>
                    <div className="customer-pending-metric">
                      <span>Total</span>
                      <strong>{formatArsCode(group.total)}</strong>
                    </div>
                  </div>

                  <div className="customer-pending-actions">
                    <button
                      type="button"
                      className="customer-pending-buy-btn"
                      onClick={() => {
                        onViewChange('catalog');
                        setCheckoutOpen(true);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                      <span>Comprar</span>
                    </button>
                    <button
                      type="button"
                      className="customer-pending-trash-btn"
                      aria-label={`Vaciar selección de ${group.artistDisplayName}`}
                      title="Eliminar compra pendiente"
                      onClick={() => clearArtistSelection(group.artistUsername)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}

              {pendingOrders.map((order) => {
                const orderId = String(getId(order));
                const firstPhoto = (order.photos || [])[0];
                const albumObj = firstPhoto?.album_id ? albumsById.get(String(firstPhoto.album_id)) : null;
                const artistUsername = albumObj?.owner_username || firstPhoto?.owner_username || 'fotografo';
                const artistDisplayName = albumObj?.owner_display_name || artistUsername;
                const itemCount = (order.photos || []).length;
                return (
                  <article className="customer-pending-row" key={orderId} role="listitem">
                    <div className="customer-pending-artist">
                      <div className="customer-pending-avatar" aria-hidden="true">
                        <span>{(artistDisplayName || 'F').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="customer-pending-artist-info">
                        <strong>{artistDisplayName}</strong>
                        <span>@{artistUsername} · Pedido #{orderId.slice(-6)}</span>
                      </div>
                    </div>

                    <div className="customer-pending-metrics">
                      <div className="customer-pending-metric">
                        <span>Items</span>
                        <strong>{itemCount}</strong>
                      </div>
                      <div className="customer-pending-metric">
                        <span>Total</span>
                        <strong>{formatArsCode(order.total)}</strong>
                      </div>
                    </div>

                    <div className="customer-pending-actions">
                      <span className="customer-pending-status-pill">
                        {statusLabels[order.status] || 'Pendiente de pago'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {completedOrders.length > 0 && (
            <div className="customer-completed-section">
              <h2>Compras desbloqueadas ({completedOrders.length})</h2>
              <div className="customer-pending-list">
                {completedOrders.map((order) => {
                  const orderId = String(getId(order));
                  const firstPhoto = (order.photos || [])[0];
                  const albumObj = firstPhoto?.album_id ? albumsById.get(String(firstPhoto.album_id)) : null;
                  const artistUsername = albumObj?.owner_username || firstPhoto?.owner_username || 'fotografo';
                  const artistDisplayName = albumObj?.owner_display_name || artistUsername;
                  return (
                    <article className="customer-pending-row" key={orderId}>
                      <div className="customer-pending-artist">
                        <div className="customer-pending-avatar" aria-hidden="true">
                          <span>{(artistDisplayName || 'F').slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="customer-pending-artist-info">
                          <strong>{artistDisplayName}</strong>
                          <span>@{artistUsername} · {new Date(order.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                      </div>
                      <div className="customer-pending-metrics">
                        <div className="customer-pending-metric">
                          <span>Items</span>
                          <strong>{(order.photos || []).length}</strong>
                        </div>
                        <div className="customer-pending-metric">
                          <span>Total</span>
                          <strong>{formatArsCode(order.total)}</strong>
                        </div>
                      </div>
                      <div className="customer-pending-actions">
                        <span className={`order-status status-${order.status}`}>
                          ✓ {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
