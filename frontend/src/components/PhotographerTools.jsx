import { useEffect, useState } from 'react';
import {
  addPhotographerCollaborator,
  createPhotographerCoupon,
  createQuantityDiscount,
  deletePhotographerCollaborator,
  deletePhotographerCoupon,
  deleteQuantityDiscount,
  getAlbums,
  getPhotographerCollaborations,
  getPhotographerCollaborators,
  getPhotographerCoupons,
  getPhotographerSales,
  getStudioProfile,
  leavePhotographerCollaboration,
  respondToPhotographerCollaboration,
  updateAlbumOffers,
  updatePhotographerCoupon,
  updateQuantityDiscount,
  updateStudioProfile,
} from '../services/api';

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const sections = {
  sales: { title: 'Ventas', eyebrow: 'ACTIVIDAD COMERCIAL' },
  discounts: { title: 'Descuentos y paquetes', eyebrow: 'PROMOCIONES' },
  coupons: { title: 'Cupones', eyebrow: 'CÓDIGOS PROMOCIONALES' },
  collaborators: { title: 'Colaboradores', eyebrow: 'TRABAJO EN EQUIPO' },
  billing: { title: 'Facturación', eyebrow: 'RESUMEN DE INGRESOS' },
  studio: { title: 'Studio', eyebrow: 'TU ESPACIO PROFESIONAL' },
};
const packageFields = [
  ['photo_package_quantity', 'Fotos por paquete (0 desactiva)'],
  ['photo_package_price', 'Precio del paquete'],
  ['video_package_quantity', 'Videos por paquete (0 desactiva)'],
  ['video_package_price', 'Precio del paquete de videos'],
];
const emptyQuantityDiscount = {
  name: 'Nuevo Descuento',
  description: '',
  content_type: 'photos',
  tiers: [{ min_quantity: 2, discount_percent: 5 }],
};
const emptyCoupon = {
  code: '',
  discount_type: 'percentage',
  value: '',
  max_discount_amount: '',
  max_uses: '',
  expires_at: '',
  description: '',
  album_id: '',
};
const emptyStudio = { description: '', location: '', website: '', instagram: '' };

function getId(item) {
  return item?._id || item?.id;
}

function orderDate(order) {
  return new Date(order.created_at).toLocaleDateString('es-AR');
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialDateRange() {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function getPresetRange(preset) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  if (preset === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (preset === 'month') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  } else if (preset === 'year') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return { from: toDateInputValue(start), to: toDateInputValue(end) };
}

export default function PhotographerTools({ token, username, view, onBack }) {
  const [sales, setSales] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [myCollaborations, setMyCollaborations] = useState([]);
  const [couponDraft, setCouponDraft] = useState(emptyCoupon);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [collaboratorDraft, setCollaboratorDraft] = useState({ email: '', permission_level: 'event', album_id: '' });
  const [collaboratorTab, setCollaboratorTab] = useState('manage');
  const [collaboratorDialogOpen, setCollaboratorDialogOpen] = useState(false);
  const [studio, setStudio] = useState(emptyStudio);
  const [offers, setOffers] = useState({});
  const [discountTab, setDiscountTab] = useState('quantity');
  const [selectedDiscountAlbum, setSelectedDiscountAlbum] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState(emptyQuantityDiscount);
  const [salesRange, setSalesRange] = useState(createInitialDateRange);
  const [salesPreset, setSalesPreset] = useState('month');
  const [salesSearch, setSalesSearch] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loadedView, setLoadedView] = useState('');
  const loading = loadedView !== view;
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ view: '', error: '', message: '' });
  const error = feedback.view === view ? feedback.error : '';
  const message = feedback.view === view ? feedback.message : '';

  useEffect(() => {
    let active = true;
    const requests = {
      sales: () => getPhotographerSales(token).then((data) => { if (active) setSales(data); }),
      billing: () => Promise.resolve(),
      discounts: () => getAlbums(token).then((data) => {
        if (!active) return;
        const ownedAlbums = data.filter((album) => album.owner_username === username);
        setAlbums(ownedAlbums);
        setSelectedDiscountAlbum((current) => current || String(getId(ownedAlbums[0]) || ''));
        setOffers(Object.fromEntries(ownedAlbums.map((album) => [getId(album), Object.fromEntries(
          packageFields.map(([field]) => [field, album[field] ?? 0])
        )])));
      }),
      coupons: () => Promise.all([getPhotographerCoupons(token), getAlbums(token)]).then(([data, userAlbums]) => {
        if (active) { setCoupons(data); setAlbums(userAlbums.filter((album) => album.owner_username === username)); }
      }),
      collaborators: () => Promise.all([
        getPhotographerCollaborators(token),
        getPhotographerCollaborations(token),
        getAlbums(token),
      ]).then(([data, incoming, userAlbums]) => {
        if (active) {
          setCollaborators(data);
          setMyCollaborations(incoming);
          setAlbums(userAlbums);
        }
      }),
      studio: () => getStudioProfile(token).then((data) => {
        if (active) setStudio({
          description: data.description || '',
          location: data.location || '',
          website: data.website || '',
          instagram: data.instagram || '',
        });
      }),
    };
    const load = requests[view];
    if (!load) return () => { active = false; };
    load()
      .catch((requestError) => {
        if (active) setFeedback({ view, error: requestError.message, message: '' });
      })
      .finally(() => { if (active) setLoadedView(view); });
    return () => { active = false; };
  }, [token, username, view]);

  useEffect(() => {
    if (!discountDialogOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setDiscountDialogOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [discountDialogOpen]);

  useEffect(() => {
    if (!collaboratorDialogOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setCollaboratorDialogOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [collaboratorDialogOpen]);

  useEffect(() => {
    if (!couponDialogOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setCouponDialogOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [couponDialogOpen]);

  async function runSave(operation, successMessage) {
    setSaving(true);
    setFeedback({ view, error: '', message: '' });
    try {
      await operation();
      setFeedback({ view, error: '', message: successMessage });
    } catch (requestError) {
      setFeedback({ view, error: requestError.message, message: '' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCouponSubmit(event) {
    event.preventDefault();
    await runSave(async () => {
      const created = await createPhotographerCoupon(token, couponDraft);
      setCoupons((current) => [created, ...current]);
      setCouponDraft(emptyCoupon);
      setCouponDialogOpen(false);
    }, 'Cupón creado y disponible para usar en pedidos.');
  }

  async function handleCouponToggle(coupon) {
    await runSave(async () => {
      const updated = await updatePhotographerCoupon(token, getId(coupon), { active: !coupon.active });
      setCoupons((current) => current.map((item) => getId(item) === getId(coupon) ? updated : item));
    }, coupon.active ? 'Cupón pausado.' : 'Cupón activado.');
  }

  async function handleCouponDelete(coupon) {
    if (!window.confirm(`¿Eliminar el cupón ${coupon.code}?`)) return;
    await runSave(async () => {
      await deletePhotographerCoupon(token, getId(coupon));
      setCoupons((current) => current.filter((item) => getId(item) !== getId(coupon)));
    }, 'Cupón eliminado.');
  }

  async function handleCollaboratorSubmit(event) {
    event.preventDefault();
    await runSave(async () => {
      const created = await addPhotographerCollaborator(token, collaboratorDraft);
      const album = albums.find((item) => String(getId(item)) === String(collaboratorDraft.album_id));
      setCollaborators((current) => [{ ...created, album_id: album || created.album_id }, ...current]);
      setCollaboratorDialogOpen(false);
      setCollaboratorDraft({ email: '', permission_level: 'event', album_id: '' });
    }, 'Invitación creada. El fotógrafo la verá en “Mis colaboraciones” al iniciar sesión.');
  }

  async function handleCollaboratorDelete(collaborator) {
    const name = collaborator.invite_email || collaborator.collaborator_username;
    if (!window.confirm(`¿Revocar el acceso de ${name}?`)) return;
    await runSave(async () => {
      await deletePhotographerCollaborator(token, getId(collaborator));
      setCollaborators((current) => current.filter((item) => getId(item) !== getId(collaborator)));
    }, 'Acceso revocado.');
  }

  async function handleCollaborationResponse(collaboration, response) {
    await runSave(async () => {
      const updated = await respondToPhotographerCollaboration(token, getId(collaboration), response);
      setMyCollaborations((current) => current.map((item) => getId(item) === getId(collaboration) ? updated : item));
    }, response === 'accepted' ? 'Invitación aceptada.' : 'Invitación rechazada.');
  }

  async function handleLeaveCollaboration(collaboration) {
    if (!window.confirm('¿Querés dejar esta colaboración?')) return;
    await runSave(async () => {
      await leavePhotographerCollaboration(token, getId(collaboration));
      setMyCollaborations((current) => current.filter((item) => getId(item) !== getId(collaboration)));
    }, 'Dejaste la colaboración.');
  }

  function handleDiscountTierChange(index, field, value) {
    setDiscountDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier, tierIndex) => tierIndex === index
        ? { ...tier, [field]: value }
        : tier),
    }));
  }

  async function handleQuantityDiscountSubmit(event) {
    event.preventDefault();
    const albumId = selectedDiscountAlbum;
    await runSave(async () => {
      const created = await createQuantityDiscount(token, albumId, discountDraft);
      setAlbums((current) => current.map((album) => String(getId(album)) === String(albumId)
        ? { ...album, quantity_discounts: [...(album.quantity_discounts || []), created] }
        : album));
      setDiscountDialogOpen(false);
      setDiscountDraft(emptyQuantityDiscount);
    }, 'Descuento por cantidad creado.');
  }

  async function handleQuantityDiscountToggle(album, discount) {
    const albumId = getId(album);
    const discountId = getId(discount);
    await runSave(async () => {
      const updated = await updateQuantityDiscount(token, albumId, discountId, { active: !discount.active });
      setAlbums((current) => current.map((item) => String(getId(item)) === String(albumId)
        ? { ...item, quantity_discounts: item.quantity_discounts.map((entry) => String(getId(entry)) === String(discountId) ? updated : entry) }
        : item));
    }, discount.active ? 'Descuento pausado.' : 'Descuento activado.');
  }

  async function handleQuantityDiscountDelete(album, discount) {
    if (!window.confirm(`¿Eliminar el descuento “${discount.name}”?`)) return;
    const albumId = getId(album);
    const discountId = getId(discount);
    await runSave(async () => {
      await deleteQuantityDiscount(token, albumId, discountId);
      setAlbums((current) => current.map((item) => String(getId(item)) === String(albumId)
        ? { ...item, quantity_discounts: item.quantity_discounts.filter((entry) => String(getId(entry)) !== String(discountId)) }
        : item));
    }, 'Descuento eliminado.');
  }

  async function handlePackageSave(album) {
    await runSave(async () => {
      const albumId = getId(album);
      const updated = await updateAlbumOffers(token, albumId, offers[albumId]);
      setAlbums((current) => current.map((item) => String(getId(item)) === String(albumId) ? updated : item));
    }, `Paquetes de “${album.name}” actualizados.`);
  }

  async function handleStudioSubmit(event) {
    event.preventDefault();
    await runSave(async () => { setStudio(await updateStudioProfile(token, studio)); }, 'Información de Studio guardada.');
  }

  const section = sections[view];
  if (!section) return null;
  const rangedSales = sales.filter((sale) => {
    const date = new Date(sale.created_at);
    const day = toDateInputValue(date);
    return (!salesRange.from || day >= salesRange.from) && (!salesRange.to || day <= salesRange.to);
  });
  const query = salesSearch.trim().toLocaleLowerCase('es-AR');
  const visibleSales = rangedSales.filter((sale) => {
    if (!query) return true;
    const customer = sale.customer || {};
    const searchableText = [
      customer.display_name,
      customer.user_name,
      customer.email,
      customer.phone,
      sale.username,
    ].filter(Boolean).join(' ').toLocaleLowerCase('es-AR');
    return searchableText.includes(query);
  });
  const total = rangedSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const customerCount = new Set(rangedSales.map((sale) => sale.username)).size;
  const contentCount = rangedSales.reduce((sum, sale) => sum + (sale.photos?.length || 0), 0);
  function selectSalesPreset(preset) {
    setSalesPreset(preset);
    setSalesRange(getPresetRange(preset));
  }

  function requestPlanChange() {
    setFeedback({
      view: 'billing',
      error: '',
      message: 'La contratación de Pixel Pro todavía no está disponible. No se realizó ningún cobro.',
    });
  }

  return (
    <section className="dashboard-stack photographer-tools" aria-labelledby="photographer-tools-title">
      {view !== 'discounts' && view !== 'coupons' && view !== 'collaborators' && <div className="page-heading">
        <div>{view !== 'sales' && view !== 'billing' && <p className="eyebrow">{section.eyebrow}</p>}<h1 id="photographer-tools-title">{view === 'sales' ? 'Mis ventas' : section.title}</h1></div>
        {view !== 'sales' && <button className="button button-quiet" type="button" onClick={onBack}>Volver a mi perfil</button>}
      </div>}
      {error && !discountDialogOpen && !couponDialogOpen && !collaboratorDialogOpen && <p className="notice notice-error" role="alert">{error}</p>}
      {message && <p className="notice notice-success" role="status">{message}</p>}
      {loading ? <div className="empty-state">Cargando información…</div> : null}

      {(view === 'sales' || view === 'billing') && !loading && (
        <>
          {view === 'sales' && (
            <div className="photographer-sales-filters">
              <div className="photographer-sales-presets" role="group" aria-label="Filtrar ventas por período">
                {[['today', 'Hoy'], ['week', 'Esta semana'], ['month', 'Este mes'], ['year', 'Este año']].map(([preset, label]) => (
                  <button
                    className={`photographer-sales-preset ${salesPreset === preset ? 'is-active' : ''}`}
                    key={preset}
                    type="button"
                    aria-pressed={salesPreset === preset}
                    onClick={() => selectSalesPreset(preset)}
                  >{label}</button>
                ))}
              </div>
              <div className="photographer-sales-date-range">
                <label><span>Desde</span><input className="field" type="date" value={salesRange.from} onChange={(event) => { setSalesPreset('custom'); setSalesRange((range) => ({ ...range, from: event.target.value })); }} /></label>
                <label><span>Hasta</span><input className="field" type="date" value={salesRange.to} onChange={(event) => { setSalesPreset('custom'); setSalesRange((range) => ({ ...range, to: event.target.value })); }} /></label>
              </div>
            </div>
          )}
          {view === 'sales' ? (
            <>
              <div className="photographer-tool-stats photographer-sales-stats">
                <article className="surface"><span className="photographer-sales-stat-icon sales-icon-money" aria-hidden="true">◉</span><div><strong>{currency.format(total)}</strong><span>Monto total</span></div></article>
                <article className="surface"><span className="photographer-sales-stat-icon sales-icon-orders" aria-hidden="true">▱</span><div><strong>{rangedSales.length}</strong><span>Ventas</span></div></article>
                <article className="surface"><span className="photographer-sales-stat-icon sales-icon-clients" aria-hidden="true">♧</span><div><strong>{customerCount}</strong><span>Clientes</span></div></article>
                <article className="surface"><span className="photographer-sales-stat-icon sales-icon-content" aria-hidden="true">▧</span><div><strong>{contentCount}</strong><span>Contenido vendido</span></div></article>
              </div>
              <section className="photographer-sales-table">
                <div className="photographer-sales-table-heading">
                  <h2>Ventas</h2>
                  <label className="photographer-sales-search">
                    <span className="sr-only">Buscar por email, teléfono o usuario</span>
                    <span aria-hidden="true">✉</span>
                    <input value={salesSearch} onChange={(event) => setSalesSearch(event.target.value)} placeholder="Email o teléfono (+54...)" />
                  </label>
                </div>
                <div className="photographer-sales-table-scroll">
                  <table>
                    <thead><tr><th>Fecha</th><th>Cliente</th><th>Contenido</th><th>Monto</th><th>Recibís</th></tr></thead>
                    <tbody>
                      {visibleSales.map((sale) => {
                        const client = sale.customer || {};
                        return (
                          <tr key={getId(sale)}>
                            <td>{orderDate(sale)}</td>
                            <td><strong>{client.display_name || client.user_name || sale.username}</strong><span>{client.email || `@${sale.username}`}</span></td>
                            <td><strong>{sale.photos?.length || 0} {sale.photos?.length === 1 ? 'elemento' : 'elementos'}</strong><span>{sale.photos?.map((photo) => photo?.title).filter(Boolean).join(', ')}</span></td>
                            <td>{currency.format(sale.total)}</td>
                            <td>{sale.status === 'paid' || sale.status === 'delivered' ? currency.format(sale.total) : <span className="photographer-sales-pending">Pendiente</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!visibleSales.length && <div className="photographer-sales-empty">No hay ventas por álbum</div>}
                </div>
              </section>
            </>
          ) : (
            <div className="photographer-billing">
              <section className="photographer-billing-panel photographer-billing-current" aria-labelledby="current-plan-title">
                <h2 id="current-plan-title">Plan actual <span className="photographer-billing-badge">Pixel Go</span></h2>
                <p>Plan gratuito con límites fijos de almacenamiento y álbumes</p>
              </section>

              <section className="photographer-billing-panel" aria-labelledby="available-plans-title">
                <h2 id="available-plans-title">Planes disponibles</h2>
                <div className="photographer-billing-plans">
                  <article className="photographer-billing-plan">
                    <div className="photographer-billing-plan-heading">
                      <h3>Pixel Go</h3>
                      <span className="photographer-billing-badge">Tu plan</span>
                    </div>
                    <p className="photographer-billing-price">$0</p>
                    <ul>
                      <li>100 subidas/mes</li>
                      <li>1 GB de almacenamiento</li>
                      <li>10% de comisión</li>
                    </ul>
                  </article>

                  <article className="photographer-billing-plan photographer-billing-plan-pro">
                    <div className="photographer-billing-plan-heading">
                      <h3>Pixel Pro</h3>
                    </div>
                    <p className="photographer-billing-price">
                      {billingPeriod === 'monthly' ? '$16.00' : '$160'}
                      <span>/{billingPeriod === 'monthly' ? 'mes' : 'año'}</span>
                    </p>
                    <p className="photographer-billing-credit-note">2000 créditos/mes · se acumulan</p>
                    <ul>
                      <li>2000 créditos/mes</li>
                      <li>0% de comisión</li>
                      <li>1 GB almacenado = 4 créditos/mes</li>
                      <li>Excedente: $0.009/crédito</li>
                    </ul>
                    <div className="photographer-billing-periods" aria-label="Elegir período de Pixel Pro">
                      <button
                        className={billingPeriod === 'monthly' ? 'is-selected' : ''}
                        type="button"
                        aria-pressed={billingPeriod === 'monthly'}
                        onClick={() => { setBillingPeriod('monthly'); requestPlanChange(); }}
                      >$16.00/mes</button>
                      <button
                        className={billingPeriod === 'yearly' ? 'is-selected' : ''}
                        type="button"
                        aria-pressed={billingPeriod === 'yearly'}
                        onClick={() => { setBillingPeriod('yearly'); requestPlanChange(); }}
                      >$160/año</button>
                    </div>
                  </article>
                </div>
              </section>

              <section className="photographer-billing-panel photographer-billing-invoices" aria-labelledby="invoices-title">
                <h2 id="invoices-title">Facturas</h2>
                <p>No hay facturas aún.</p>
              </section>
            </div>
          )}
        </>
      )}

      {view === 'discounts' && !loading && (
        <>
          <section className="photographer-discounts-workspace">
            <div className="photographer-discounts-heading">
              <h1 id="photographer-tools-title">Descuentos y Paquetes</h1>
              {albums.length > 0 && (
                <label className="photographer-discount-album-select">
                  <span>Álbum</span>
                  <select className="field" value={selectedDiscountAlbum || String(getId(albums[0]))} onChange={(event) => setSelectedDiscountAlbum(event.target.value)}>
                    {albums.map((album) => <option key={getId(album)} value={getId(album)}>{album.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="photographer-discount-tabs" role="tablist" aria-label="Descuentos y paquetes">
              <button type="button" role="tab" aria-selected={discountTab === 'quantity'} className={discountTab === 'quantity' ? 'is-active' : ''} onClick={() => setDiscountTab('quantity')}>Descuentos por cantidad</button>
              <button type="button" role="tab" aria-selected={discountTab === 'packages'} className={discountTab === 'packages' ? 'is-active' : ''} onClick={() => setDiscountTab('packages')}>Paquetes</button>
            </div>
            {!albums.length ? (
              <div className="photographer-discount-empty"><span className="photographer-discount-empty-icon" aria-hidden="true">♧</span><h3>Primero creá un álbum</h3><p>Los descuentos y paquetes se configuran para el contenido de un álbum.</p><button className="button button-primary" type="button" onClick={onBack}>Ir a crear álbum</button></div>
            ) : discountTab === 'quantity' ? (
              <div className="photographer-discount-content">
                {(albums.find((album) => String(getId(album)) === String(selectedDiscountAlbum || getId(albums[0])))?.quantity_discounts || []).length === 0 ? (
                  <div className="photographer-discount-empty">
                    <span className="photographer-discount-empty-icon" aria-hidden="true">♧</span>
                    <h3>Comenzá con tu primer descuento por cantidad</h3>
                    <p>Los descuentos por cantidad pueden incentivar<br className="desktop-break" /> compras mayores en tu tienda.</p>
                    <button className="button button-primary photographer-create-discount" type="button" onClick={() => { setDiscountDraft(emptyQuantityDiscount); setDiscountDialogOpen(true); }}><span aria-hidden="true">⊕</span> Crear Descuento</button>
                  </div>
                ) : (
                  <>
                    <div className="photographer-discount-list-heading">
                      <p>Aplicá descuentos según la cantidad de contenido comprado.</p>
                      <button className="button button-primary photographer-create-discount" type="button" onClick={() => { setDiscountDraft(emptyQuantityDiscount); setDiscountDialogOpen(true); }}><span aria-hidden="true">⊕</span> Crear Descuento</button>
                    </div>
                    <div className="photographer-tool-list">
                      {(albums.find((album) => String(getId(album)) === String(selectedDiscountAlbum || getId(albums[0])))?.quantity_discounts || []).map((discount) => (
                        <article className="surface photographer-tool-row photographer-discount-row" key={getId(discount)}>
                          <div><strong>{discount.name}</strong><span>{discount.content_type === 'photos' ? 'Fotos' : 'Videos'}{discount.description ? ` · ${discount.description}` : ''}</span><span>{discount.tiers.map((tier) => `${tier.min_quantity}+ ${discount.content_type === 'photos' ? 'fotos' : 'videos'}: ${tier.discount_percent}%`).join(' · ')}</span></div>
                          <span className={`role-pill ${discount.active ? '' : 'is-inactive'}`}>{discount.active ? 'Activo' : 'Pausado'}</span>
                          <div className="user-actions"><button className="button button-quiet button-small" type="button" disabled={saving} onClick={() => handleQuantityDiscountToggle(albums.find((album) => String(getId(album)) === String(selectedDiscountAlbum || getId(albums[0]))), discount)}>{discount.active ? 'Pausar' : 'Activar'}</button><button className="button button-danger button-small" type="button" disabled={saving} onClick={() => handleQuantityDiscountDelete(albums.find((album) => String(getId(album)) === String(selectedDiscountAlbum || getId(albums[0]))), discount)}>Eliminar</button></div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="photographer-discount-content photographer-package-content">
                <div className="photographer-package-intro"><h3>Paquetes por álbum</h3><p>Definí un precio especial para grupos de contenido. Se aplica por cada paquete completo.</p></div>
                {albums.filter((album) => String(getId(album)) === String(selectedDiscountAlbum || getId(albums[0]))).map((album) => {
                  const albumId = getId(album);
                  return (
                    <form className="surface photographer-offer-card" key={albumId} onSubmit={(event) => { event.preventDefault(); handlePackageSave(album); }}>
                      <div className="photographer-offer-fields">
                        {packageFields.map(([field, label]) => (
                          <label key={field}>{label}
                            <input className="field" type="number" min="0" step={field.endsWith('_quantity') ? '1' : '0.01'} value={offers[albumId]?.[field] ?? 0} onChange={(event) => setOffers((current) => ({
                              ...current,
                              [albumId]: { ...current[albumId], [field]: event.target.value },
                            }))} />
                          </label>
                        ))}
                      </div>
                      <button className="button button-primary" type="submit" disabled={saving}>Guardar paquetes</button>
                    </form>
                  );
                })}
              </div>
            )}
          </section>
          {discountDialogOpen && (
            <div className="photographer-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDiscountDialogOpen(false); }}>
              <section className="photographer-dialog photographer-discount-dialog" role="dialog" aria-modal="true" aria-labelledby="create-discount-title">
                <div className="photographer-dialog-heading"><h2 id="create-discount-title">Crear descuento por cantidad</h2><button className="photographer-dialog-close" type="button" aria-label="Cerrar" onClick={() => setDiscountDialogOpen(false)}>×</button></div>
                <form className="photographer-discount-form" onSubmit={handleQuantityDiscountSubmit}>
                  <label>Nombre del descuento
                    <input className="field" autoFocus required maxLength="50" value={discountDraft.name} onChange={(event) => setDiscountDraft({ ...discountDraft, name: event.target.value })} />
                    <span className="photographer-field-counter">{discountDraft.name.length}/50</span>
                  </label>
                  <label>Descripción (opcional)
                    <input className="field" maxLength="250" value={discountDraft.description} onChange={(event) => setDiscountDraft({ ...discountDraft, description: event.target.value })} />
                    <span className="photographer-field-counter">{discountDraft.description.length}/250</span>
                  </label>
                  <label>Tipo de contenido
                    <select className="field" value={discountDraft.content_type} onChange={(event) => setDiscountDraft({ ...discountDraft, content_type: event.target.value })}><option value="photos">Fotos</option><option value="videos">Videos</option></select>
                  </label>
                  <div className="photographer-discount-levels">
                    <div className="photographer-discount-level-heading"><strong>Niveles de descuento</strong><span>Cantidad mínima y porcentaje de descuento</span></div>
                    {discountDraft.tiers.map((tier, index) => (
                      <div className="photographer-discount-tier" key={`discount-tier-${index}`}>
                        <label>Cantidad mínima<input className="field" type="number" required min="1" step="1" value={tier.min_quantity} onChange={(event) => handleDiscountTierChange(index, 'min_quantity', event.target.value)} /></label>
                        <label>Descuento (%)<input className="field" type="number" required min="0.01" max="100" step="0.01" value={tier.discount_percent} onChange={(event) => handleDiscountTierChange(index, 'discount_percent', event.target.value)} /></label>
                        {discountDraft.tiers.length > 1 && <button className="photographer-remove-tier" type="button" aria-label={`Quitar nivel ${index + 1}`} onClick={() => setDiscountDraft((current) => ({ ...current, tiers: current.tiers.filter((_, tierIndex) => tierIndex !== index) }))}>×</button>}
                      </div>
                    ))}
                    <button className="photographer-add-tier" type="button" onClick={() => setDiscountDraft((current) => ({ ...current, tiers: [...current.tiers, { min_quantity: '', discount_percent: '' }] }))}><span aria-hidden="true">⊕</span> Agregar nivel</button>
                  </div>
                  {error && <p className="notice notice-error" role="alert">{error}</p>}
                  <div className="photographer-discount-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear'}</button></div>
                </form>
              </section>
            </div>
          )}
        </>
      )}

      {view === 'coupons' && !loading && (
        <>
          <section className="photographer-coupons-page">
            <div className="photographer-coupons-heading">
              <div><h1 id="photographer-tools-title">Cupones</h1><p>Creá, pausá y compartí cupones de descuento para tus compradores.</p></div>
              <button className="photographer-create-coupon" type="button" onClick={() => { setCouponDraft(emptyCoupon); setCouponDialogOpen(true); }}>Crear cupón</button>
            </div>
            <div className="photographer-coupons-list">
              <h3>Tus cupones</h3>
              {!coupons.length ? <p>Todavía no tenés cupones.</p> : (
                <div className="photographer-tool-list">
                  {coupons.map((coupon) => (
                    <article className="surface photographer-tool-row" key={getId(coupon)}>
                      <div><strong>{coupon.code}</strong><span>{coupon.discount_type === 'percentage' ? `${coupon.value}% de descuento` : currency.format(coupon.value)} · {coupon.used_count || 0}{coupon.max_uses ? `/${coupon.max_uses}` : ''} usos</span>{coupon.description && <span>{coupon.description}</span>}</div>
                      <span className={`role-pill ${coupon.active ? '' : 'is-inactive'}`}>{coupon.active ? 'Activo' : 'Pausado'}</span>
                      <div className="user-actions"><button className="button button-quiet button-small" type="button" disabled={saving} onClick={() => handleCouponToggle(coupon)}>{coupon.active ? 'Pausar' : 'Activar'}</button><button className="button button-danger button-small" type="button" disabled={saving} onClick={() => handleCouponDelete(coupon)}>Eliminar</button></div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
          {couponDialogOpen && (
            <div className="photographer-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCouponDialogOpen(false); }}>
              <section className="photographer-dialog photographer-coupon-dialog" role="dialog" aria-modal="true" aria-labelledby="create-coupon-title">
                <div className="photographer-dialog-heading"><h2 id="create-coupon-title">Crear cupón</h2><button className="photographer-dialog-close" type="button" aria-label="Cerrar" onClick={() => setCouponDialogOpen(false)}>×</button></div>
                <form className="photographer-coupon-form" onSubmit={handleCouponSubmit}>
                  <label>Código
                    <input className="field" autoFocus required minLength="3" maxLength="30" pattern="[A-Za-z0-9_-]+" value={couponDraft.code} onChange={(event) => setCouponDraft({ ...couponDraft, code: event.target.value.toUpperCase() })} placeholder="PICS-20" />
                  </label>
                  <label>% de descuento
                    <input className="field" type="number" required min="0.01" max="90" step="0.01" value={couponDraft.value} onChange={(event) => setCouponDraft({ ...couponDraft, value: event.target.value })} />
                    <small>Los cupones llegan al 90%. Con Pro, al 100%.</small>
                  </label>
                  <label>Tope de descuento
                    <input className="field" type="number" min="0.01" step="0.01" value={couponDraft.max_discount_amount} onChange={(event) => setCouponDraft({ ...couponDraft, max_discount_amount: event.target.value })} placeholder="Opcional" />
                  </label>
                  <label>Usos máximos
                    <input className="field" type="number" min="1" step="1" value={couponDraft.max_uses} onChange={(event) => setCouponDraft({ ...couponDraft, max_uses: event.target.value })} placeholder="Opcional" />
                  </label>
                  <label>Expira el
                    <input className="field" type="date" value={couponDraft.expires_at} onChange={(event) => setCouponDraft({ ...couponDraft, expires_at: event.target.value })} />
                  </label>
                  <label>Descripción
                    <input className="field" maxLength="250" value={couponDraft.description} onChange={(event) => setCouponDraft({ ...couponDraft, description: event.target.value })} placeholder="Solo la ves vos" />
                  </label>
                  <label className="photographer-coupon-album">Álbum
                    <select className="field" value={couponDraft.album_id} onChange={(event) => setCouponDraft({ ...couponDraft, album_id: event.target.value })}><option value="">Todos tus álbumes</option>{albums.map((album) => <option key={getId(album)} value={getId(album)}>{album.name}</option>)}</select>
                  </label>
                  {error && <p className="notice notice-error photographer-coupon-error" role="alert">{error}</p>}
                  <div className="photographer-coupon-actions"><button className="photographer-create-coupon" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear cupón'}</button></div>
                </form>
              </section>
            </div>
          )}
        </>
      )}

      {view === 'collaborators' && !loading && (
        <>
          <section className="photographer-collaboration-page">
            <h1 id="photographer-tools-title">Gestión de colaboraciones</h1>
            <div className="photographer-collaboration-tabs" role="tablist" aria-label="Secciones de colaboraciones">
              <button type="button" role="tab" aria-selected={collaboratorTab === 'manage'} className={collaboratorTab === 'manage' ? 'is-active' : ''} onClick={() => setCollaboratorTab('manage')}>Gestionar colaboradores</button>
              <button type="button" role="tab" aria-selected={collaboratorTab === 'mine'} className={collaboratorTab === 'mine' ? 'is-active' : ''} onClick={() => setCollaboratorTab('mine')}>Mis colaboraciones{myCollaborations.filter((item) => item.status === 'pending').length > 0 && <span className="photographer-collaboration-count">{myCollaborations.filter((item) => item.status === 'pending').length}</span>}</button>
            </div>
            {collaboratorTab === 'manage' ? (
              <>
                <div className="photographer-collaboration-intro">
                  <h2>Gestionar colaboradores</h2>
                  <p>Invitá otros fotógrafos para colaborar en tus eventos. Pueden subir contenido y ayudarte a gestionar tus eventos mientras vos mantenés el control sobre los pagos y configuraciones.</p>
                </div>
                {!collaborators.length ? (
                  <div className="photographer-collaboration-empty">
                    <span className="photographer-collaboration-empty-icon" aria-hidden="true">♧</span>
                    <h3>Sin colaboradores aún</h3>
                    <p>Invitá colaboradores para ayudarte a gestionar tus eventos y contenido.</p>
                    <button className="photographer-create-coupon" type="button" onClick={() => { setCollaboratorDraft({ email: '', permission_level: 'event', album_id: '' }); setCollaboratorDialogOpen(true); }}>Invitar colaborador</button>
                  </div>
                ) : (
                  <div className="photographer-collaboration-list">
                    <div className="photographer-collaboration-list-heading"><h3>Tus colaboradores</h3><button className="photographer-create-coupon" type="button" onClick={() => { setCollaboratorDraft({ email: '', permission_level: 'event', album_id: '' }); setCollaboratorDialogOpen(true); }}>Invitar colaborador</button></div>
                    {collaborators.map((collaborator) => {
                      const status = collaborator.status || 'accepted';
                      return <article className="surface photographer-tool-row" key={getId(collaborator)}>
                              <div><strong>{collaborator.invite_email || collaborator.collaborator_username}</strong><span>@{collaborator.collaborator_username} · {(collaborator.permission_level || 'event') === 'full' ? 'Acceso completo' : `Colaborador de eventos · ${collaborator.album_id?.name || albums.find((album) => String(getId(album)) === String(collaborator.album_id))?.name || 'Evento'}`}</span></div>
                              <span className={`role-pill ${status === 'accepted' ? '' : 'is-inactive'}`}>{status === 'accepted' ? 'Activo' : status === 'pending' ? 'Invitación pendiente' : 'Rechazada'}</span>
                              <button className="button button-danger button-small" type="button" disabled={saving} onClick={() => handleCollaboratorDelete(collaborator)}>Revocar</button>
                            </article>;
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="photographer-collaboration-intro">
                  <h2>Mis colaboraciones</h2>
                  <p>Ve y gestiona colaboraciones donde has sido invitado a ayudar con eventos y gestión de contenido.</p>
                </div>
                {!myCollaborations.length ? (
                  <div className="photographer-collaboration-empty">
                    <span className="photographer-collaboration-empty-icon" aria-hidden="true">♧</span>
                    <h3>Sin colaboraciones</h3>
                    <p>Aún no has sido invitado a ninguna colaboración. Cuando alguien te invite a colaborar en sus eventos, aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="photographer-collaboration-list">
                    {myCollaborations.map((collaboration) => (
                      <article className="surface photographer-tool-row" key={getId(collaboration)}>
                        <div><strong>{collaboration.owner_username}</strong><span>{(collaboration.permission_level || 'event') === 'full' ? 'Acceso completo · todos los eventos' : `Colaborador de eventos · ${collaboration.album_id?.name || 'Evento'}`}</span><span>{collaboration.invite_email}</span></div>
                        {(collaboration.status || 'accepted') === 'pending' ? (
                          <div className="user-actions"><button className="button button-primary button-small" type="button" disabled={saving} onClick={() => handleCollaborationResponse(collaboration, 'accepted')}>Aceptar</button><button className="button button-danger button-small" type="button" disabled={saving} onClick={() => handleCollaborationResponse(collaboration, 'declined')}>Rechazar</button></div>
                        ) : (collaboration.status || 'accepted') === 'accepted' ? (
                          <div className="user-actions"><span className="role-pill">Activa</span><button className="button button-quiet button-small" type="button" disabled={saving} onClick={() => handleLeaveCollaboration(collaboration)}>Dejar colaboración</button></div>
                        ) : <span className="role-pill is-inactive">Rechazada</span>}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
          {collaboratorDialogOpen && (
            <div className="photographer-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCollaboratorDialogOpen(false); }}>
              <section className="photographer-dialog photographer-collaborator-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-collaborator-title">
                <div className="photographer-dialog-heading"><h2 id="invite-collaborator-title">Invitar colaborador</h2><button className="photographer-dialog-close" type="button" aria-label="Cerrar" onClick={() => setCollaboratorDialogOpen(false)}>×</button></div>
                <form className="photographer-collaborator-form" onSubmit={handleCollaboratorSubmit}>
                  <label>Email del colaborador<input className="field" autoFocus required type="email" value={collaboratorDraft.email} onChange={(event) => setCollaboratorDraft({ ...collaboratorDraft, email: event.target.value })} placeholder="colaborador@ejemplo.com" /></label>
                  <fieldset>
                    <legend>Nivel de permisos</legend>
                    <label className={`photographer-permission-option ${collaboratorDraft.permission_level === 'event' ? 'is-selected' : ''}`}>
                      <input type="radio" name="permission-level" value="event" checked={collaboratorDraft.permission_level === 'event'} onChange={() => setCollaboratorDraft({ ...collaboratorDraft, permission_level: 'event' })} />
                      <span><strong>Colaborador de eventos</strong><span>Puede colaborar en eventos específicos y subir contenido</span></span><span aria-hidden="true">♧</span>
                    </label>
                    <label className={`photographer-permission-option ${collaboratorDraft.permission_level === 'full' ? 'is-selected' : ''}`}>
                      <input type="radio" name="permission-level" value="full" checked={collaboratorDraft.permission_level === 'full'} onChange={() => setCollaboratorDraft({ ...collaboratorDraft, permission_level: 'full', album_id: '' })} />
                      <span><strong>Acceso completo</strong><span>Puede crear, editar y gestionar todos los eventos y colaboradores</span></span><span aria-hidden="true">♢</span>
                    </label>
                  </fieldset>
                  {collaboratorDraft.permission_level === 'event' && (
                    <label>Evento
                      <select className="field" required value={collaboratorDraft.album_id} onChange={(event) => setCollaboratorDraft({ ...collaboratorDraft, album_id: event.target.value })}>
                        <option value="">Seleccioná un evento</option>{albums.filter((album) => album.owner_username === username || album.shared_permission === 'full').map((album) => <option key={getId(album)} value={getId(album)}>{album.name}</option>)}
                      </select>
                    </label>
                  )}
                  <p className="photographer-collaboration-invite-note">La invitación aparecerá dentro de Memories en “Mis colaboraciones”. El correo no se envía porque el proyecto aún no tiene un servicio de email integrado.</p>
                  {error && <p className="notice notice-error" role="alert">{error}</p>}
                  <div className="photographer-collaborator-actions"><button className="button button-quiet" type="button" onClick={() => setCollaboratorDialogOpen(false)}>Cancelar</button><button className="photographer-create-coupon" type="submit" disabled={saving || (collaboratorDraft.permission_level === 'event' && !albums.some((album) => album.owner_username === username || album.shared_permission === 'full'))}>{saving ? 'Enviando…' : 'Enviar invitación'}</button></div>
                </form>
              </section>
            </div>
          )}
        </>
      )}

      {view === 'studio' && !loading && (
        <div className="dashboard-columns photographer-tools-columns">
          <section className="surface editor-panel">
            <div className="section-heading"><div><p className="eyebrow">PRESENTACIÓN PÚBLICA</p><h2>Perfil de tu Studio</h2></div></div>
            <form className="photo-form" onSubmit={handleStudioSubmit}>
              <label>Descripción<textarea className="field" rows="4" maxLength="500" value={studio.description} onChange={(event) => setStudio({ ...studio, description: event.target.value })} placeholder="Contá qué tipo de fotografía realizás." /></label>
              <label>Ubicación<input className="field" maxLength="120" value={studio.location} onChange={(event) => setStudio({ ...studio, location: event.target.value })} placeholder="Ciudad, país" /></label>
              <label>Sitio web<input className="field" type="url" maxLength="200" value={studio.website} onChange={(event) => setStudio({ ...studio, website: event.target.value })} placeholder="https://tustudio.com" /></label>
              <label>Instagram<input className="field" maxLength="60" value={studio.instagram} onChange={(event) => setStudio({ ...studio, instagram: event.target.value })} placeholder="@tustudio" /></label>
              <button className="button button-primary" type="submit" disabled={saving}>Guardar Studio</button>
            </form>
          </section>
          <aside className="surface photographer-studio-preview">
            <p className="eyebrow">VISTA PREVIA</p><div className="photographer-avatar">{username.slice(0, 1).toUpperCase()}</div><h2>{username} Studio</h2>
            <p>{studio.description || 'Tu descripción aparecerá acá.'}</p>
            {studio.location && <span>{studio.location}</span>}
            {studio.website && <a href={studio.website} target="_blank" rel="noreferrer">{studio.website}</a>}
            {studio.instagram && <span>{studio.instagram.startsWith('@') ? studio.instagram : `@${studio.instagram}`}</span>}
          </aside>
        </div>
      )}
    </section>
  );
}
