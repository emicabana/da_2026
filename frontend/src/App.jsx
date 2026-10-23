import { useEffect, useState } from 'react';
import './App.css';
import './ProjectTheme.css';
import MainLayout from './layouts/MainLayout';
import { createUser, login, registerAccount, getUsers, getAllOrders, updateOrderStatus, logout, updateUser, deleteUser } from './services/api';
import CustomerDashboard from './components/CustomerDashboard';
import PhotographerDashboard from './components/PhotographerDashboard';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import PhotographerTools from './components/PhotographerTools';

const roleLabels = {
  admin: 'Administrador',
  photographer: 'Fotógrafo',
  customer: 'Cliente',
};

const orderStatusLabels = {
  pending: 'Pendiente',
  paid: 'Pagado',
  delivered: 'Entregado',
};

const formatOrderPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

const emptyUserForm = {
  user_name: '',
  password: '',
  display_name: '',
  email: '',
  role: 'customer',
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem('memories-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [customerView, setCustomerView] = useState('catalog');
  const [photographerView, setPhotographerView] = useState('profile');
  const [adminView, setAdminView] = useState('users');
  const [users, setUsers] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [newUser, setNewUser] = useState({ ...emptyUserForm });
  const [editingUsername, setEditingUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const token = session?.authorizationToken;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('memories-theme', theme);
    } catch {
      // The theme still applies for this session if storage is unavailable.
    }
  }, [theme]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loggedInSession = await login({ user_name: userName, password });
      enterSession(loggedInSession);
      if (loggedInSession.role === 'admin') {
        const [loadedUsers, loadedOrders] = await Promise.all([
          getUsers(loggedInSession.authorizationToken),
          getAllOrders(loggedInSession.authorizationToken),
        ]);
        setUsers(loadedUsers);
        setAdminOrders(loadedOrders);
      } else {
        setUsers([]);
        setAdminOrders([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(account) {
    setLoading(true);
    setError('');
    try {
      return await registerAccount(account);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function enterSession(authSession) {
    setSession(authSession);
    setShowLogin(false);
    setPassword('');
    setCustomerView('catalog');
    setPhotographerView('profile');
    setAdminView('users');
    setUsers([]);
    setAdminOrders([]);
  }

  async function handleLoadUsers() {
    if (!token) {
      setError('Primero inicia sesión');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getUsers(token);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadOrders() {
    if (!token) {
      setError('Primero inicia sesión');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getAllOrders(token);
      setAdminOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderStatusChange(order, nextStatus) {
    const orderId = order._id || order.id;
    setUpdatingOrderId(String(orderId));
    setError('');
    setMessage('');

    try {
      const updated = await updateOrderStatus(token, orderId, nextStatus);
      setAdminOrders((current) => current.map((item) =>
        String(item._id || item.id) === String(orderId) ? updated : item
      ));
      setMessage(`Pedido ${String(orderId).slice(-7)} actualizado a ${orderStatusLabels[nextStatus] || nextStatus}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingOrderId('');
    }
  }

  async function handleSaveUser(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const userData = { ...newUser };
      if (editingUsername && !userData.password) delete userData.password;
      const savedUser = editingUsername
        ? await updateUser(token, editingUsername, userData)
        : await createUser(token, userData);
      setMessage(`Cuenta ${savedUser.user_name} ${editingUsername ? 'actualizada' : 'creada'} como ${roleLabels[savedUser.role]}.`);
      setNewUser({ ...emptyUserForm });
      setEditingUsername('');
      setUsers(await getUsers(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(user) {
    if (user.user_name === session?.username) {
      setError('No podés eliminar la cuenta que está usando esta sesión.');
      return;
    }
    if (!window.confirm(`¿Eliminar la cuenta @${user.user_name}? Esta acción no se puede deshacer.`)) return;

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await deleteUser(token, user.user_name);
      if (editingUsername === user.user_name) handleCancelEdit();
      setUsers(await getUsers(token));
      setMessage(`Se eliminó la cuenta @${user.user_name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditUser(user) {
    setEditingUsername(user.user_name);
    setNewUser({
      user_name: user.user_name,
      password: '',
      display_name: user.display_name,
      email: user.email,
      role: user.role,
    });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingUsername('');
    setNewUser({ ...emptyUserForm });
    setError('');
    setMessage('');
  }

  async function handleLogout() {
    let logoutError = '';

    try {
      await logout(token);
    } catch {
      logoutError = 'Se limpiaron los datos locales, pero no se pudo invalidar la sesión en el servidor.';
    } finally {
      setSession(null);
      setUserName('');
      setPassword('');
      setCustomerView('catalog');
      setPhotographerView('profile');
      setUsers([]);
      setNewUser({ ...emptyUserForm });
      setEditingUsername('');
      setError(logoutError);
      setMessage('');
      window.location.reload();
    }
  }

  return (
    <MainLayout
      theme={theme}
      onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      session={session}
      onLogout={handleLogout}
      activeView={session?.role === 'admin' ? adminView : session?.role === 'photographer' ? photographerView : customerView}
      onNavigate={session?.role === 'admin' ? setAdminView : session?.role === 'photographer' ? setPhotographerView : setCustomerView}
      showPublicNavigation={!session && !showLogin}
      showLogin={!session && showLogin}
      onShowLogin={() => { setAuthInitialMode('login'); setShowLogin(true); setError(''); }}
      onHome={() => { setShowLogin(false); setError(''); }}
    >
      {!session && !showLogin && (
        <LandingPage
          onLogin={() => { setAuthInitialMode('login'); setShowLogin(true); setError(''); }}
          onRegister={() => { setAuthInitialMode('register'); setShowLogin(true); setError(''); }}
        />
      )}

      {!session && showLogin && (
        <AuthPage
          key={authInitialMode}
          initialMode={authInitialMode}
          userName={userName}
          password={password}
          onUsernameChange={setUserName}
          onPasswordChange={setPassword}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onRegistrationComplete={enterSession}
          onClearError={() => setError('')}
          loading={loading}
          error={error}
        />
      )}

      {session?.role === 'admin' && (
        <div className="dashboard-stack">
          <div className="admin-panel-switcher surface" role="navigation" aria-label="Paneles de control del Administrador">
            <div className="admin-panel-switcher-copy">
              <span className="eyebrow">MODO SUPER ADMINISTRADOR</span>
              <strong>Control total de la plataforma</strong>
            </div>
            <div className="admin-panel-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={adminView === 'users' || adminView === 'orders'}
                className={`admin-panel-tab ${adminView === 'users' || adminView === 'orders' ? 'is-active' : ''}`}
                onClick={() => { setAdminView('users'); setError(''); setMessage(''); }}
              >
                <span aria-hidden="true">◉</span> Panel de Administración
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={adminView.startsWith('photographer-')}
                className={`admin-panel-tab ${adminView.startsWith('photographer-') ? 'is-active' : ''}`}
                onClick={() => { setAdminView('photographer-profile'); setError(''); setMessage(''); }}
              >
                <span aria-hidden="true">📷</span> Panel de Fotógrafo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={adminView.startsWith('customer-')}
                className={`admin-panel-tab ${adminView.startsWith('customer-') ? 'is-active' : ''}`}
                onClick={() => { setAdminView('customer-catalog'); setError(''); setMessage(''); }}
              >
                <span aria-hidden="true">🛍</span> Panel de Usuario
              </button>
            </div>
          </div>

          {adminView.startsWith('photographer-') && (
            <div className="admin-subpanel-nav" role="tablist" aria-label="Secciones del panel de fotógrafo">
              {[
                ['photographer-profile', 'Álbumes y perfil'],
                ['photographer-photos', 'Fotografías'],
                ['photographer-sales', 'Ventas'],
                ['photographer-discounts', 'Descuentos y paquetes'],
                ['photographer-coupons', 'Cupones'],
                ['photographer-collaborators', 'Colaboradores'],
                ['photographer-billing', 'Facturación'],
                ['photographer-studio', 'Studio'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={adminView === id}
                  className={`admin-subpanel-pill ${adminView === id ? 'is-active' : ''}`}
                  onClick={() => { setAdminView(id); setError(''); setMessage(''); }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {(adminView === 'users' || adminView === 'orders') && (
            <section className="dashboard-stack" aria-labelledby="admin-title">
              <div className="page-heading">
                <div><p className="eyebrow">ADMINISTRACIÓN</p><h1 id="admin-title">{adminView === 'orders' ? 'Pedidos' : 'Cuentas'}</h1><p className="heading-copy">{adminView === 'orders' ? 'Supervisá los pedidos y confirmá pagos o entregas.' : 'Gestioná los accesos de clientes y fotógrafos.'}</p></div>
                <div className="view-switch" role="tablist" aria-label="Secciones de administración">
                  <button type="button" role="tab" aria-selected={adminView === 'users'} className={adminView === 'users' ? 'is-active' : ''} onClick={() => { setAdminView('users'); setError(''); setMessage(''); }}>Cuentas</button>
                  <button type="button" role="tab" aria-selected={adminView === 'orders'} className={adminView === 'orders' ? 'is-active' : ''} onClick={() => { setAdminView('orders'); setError(''); setMessage(''); }}>Pedidos</button>
                </div>
              </div>
              {adminView === 'users' ? (
              <div className="dashboard-columns admin-columns">
                <section className="surface editor-panel">
                  <div className="section-heading"><div><p className="eyebrow">{editingUsername ? 'EDITAR ACCESO' : 'NUEVO ACCESO'}</p><h2>{editingUsername ? 'Editar cuenta' : 'Crear cuenta'}</h2></div></div>
                  <form className="photo-form" onSubmit={handleSaveUser}>
                    <label>Usuario
                      <input className="field" required value={newUser.user_name} placeholder="Usuario (sin @)" autoCapitalize="none" spellCheck={false} maxLength={30} pattern="(?!\\.)(?!.*\\.\\.)(?!.*\\.$)[A-Za-z0-9._]{1,30}" title="Hasta 30 caracteres: letras, números, punto o guion bajo. Sin punto inicial, final ni puntos seguidos." onChange={(event) => setNewUser({ ...newUser, user_name: event.target.value })} />
                      <small>Hasta 30 caracteres: letras, números, punto o guion bajo.</small>
                    </label>
                    <label>Contraseña
                      <input className="field" required={!editingUsername} type="password" value={newUser.password} placeholder={editingUsername ? 'Dejar vacía para conservarla' : 'Contraseña segura'} minLength={8} pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}" title="Mínimo 8 caracteres, con una mayúscula, una minúscula y un número." autoComplete="new-password" onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
                      <small>{editingUsername ? 'Opcional. Dejala vacía para conservar la contraseña actual.' : 'Mínimo 8 caracteres, con mayúscula, minúscula y número.'}</small>
                    </label>
                    <label>Nombre visible<input className="field" required value={newUser.display_name} placeholder="Nombre y apellido" onChange={(event) => setNewUser({ ...newUser, display_name: event.target.value })} /></label>
                    <label>Correo electrónico<input className="field" required type="email" value={newUser.email} placeholder="nombre@correo.com" onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
                    <label>Perfil
                      <select className="field" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>
                        <option value="customer">Cliente</option><option value="photographer">Fotógrafo</option><option value="admin">Administrador</option>
                      </select>
                    </label>
                    <div className="form-actions">
                      <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Guardando…' : editingUsername ? 'Guardar cambios' : 'Crear cuenta'}</button>
                      {loading && <div className="loader-status" role="status" aria-live="polite"><div className="loader" /><span>Procesando…</span></div>}
                      {editingUsername && <button className="button button-quiet" type="button" onClick={handleCancelEdit}>Cancelar</button>}
                    </div>
                  </form>
                </section>
                <section className="catalog-panel">
                  <div className="section-heading"><div><p className="eyebrow">ACCESOS</p><h2>Usuarios registrados</h2></div><button className="button button-quiet button-small" type="button" onClick={handleLoadUsers} disabled={loading}>Actualizar</button></div>
                  {users.length === 0 ? <div className="empty-state">{loading && <div className="loader" />}<strong>{loading ? 'Cargando usuarios…' : 'No hay usuarios registrados.'}</strong><span>{loading ? 'La lista se está actualizando.' : 'Las cuentas aparecerán acá.'}</span></div> : (
                    <div className="user-list">{users.map((user) => (
                      <article className="user-row" key={user.id || user.user_name}><div className="user-avatar">{(user.display_name || user.user_name).slice(0, 1).toUpperCase()}</div><div><strong>{user.display_name || user.user_name}</strong><span>@{user.user_name} · {user.email}</span></div><span className="role-pill">{roleLabels[user.role] || user.role}</span><div className="user-actions"><button className="button button-quiet button-small" type="button" onClick={() => handleEditUser(user)}>Editar</button><button className="button button-danger button-small" type="button" onClick={() => handleDeleteUser(user)} disabled={loading || user.user_name === session.username} title={user.user_name === session.username ? 'No podés eliminar tu propia cuenta activa' : 'Eliminar usuario'}>Eliminar</button></div></article>
                    ))}</div>
                  )}</section>
              </div>
              ) : (
                <section className="catalog-panel" aria-label="Listado de pedidos">
                  <div className="section-heading">
                    <div><p className="eyebrow">OPERACIONES</p><h2>Pedidos registrados</h2></div>
                    <button className="button button-quiet button-small" type="button" onClick={handleLoadOrders} disabled={loading}>Actualizar</button>
                  </div>
                  {adminOrders.length === 0 ? (
                    <div className="empty-state">{loading && <div className="loader" />}<strong>{loading ? 'Cargando pedidos…' : 'No hay pedidos registrados.'}</strong><span>{loading ? 'La lista se está actualizando.' : 'Los pedidos de los clientes aparecerán acá.'}</span></div>
                  ) : (
                    <div className="orders-list">
                      {adminOrders.map((order) => {
                        const orderId = String(order._id || order.id);
                        return (
                          <article className="order-row" key={orderId}>
                            <div>
                              <strong>Pedido {orderId.slice(-7)} · @{order.username}</strong>
                              <span>{new Date(order.created_at).toLocaleDateString('es-AR')}{order.coupon_code ? ` · Cupón ${order.coupon_code}` : ''}</span>
                            </div>
                            <div className="order-photos">{(order.photos || []).map((photo) => photo?.title).filter(Boolean).join(', ') || `${(order.photos || []).length} fotos`}</div>
                            <select
                              className="field"
                              aria-label={`Estado del pedido ${orderId.slice(-7)}`}
                              value={order.status}
                              disabled={updatingOrderId === orderId}
                              onChange={(event) => handleOrderStatusChange(order, event.target.value)}
                            >
                              <option value="pending">{orderStatusLabels.pending}</option>
                              <option value="paid">{orderStatusLabels.paid}</option>
                              <option value="delivered">{orderStatusLabels.delivered}</option>
                            </select>
                            <strong>{formatOrderPrice.format(order.total)}</strong>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
              {error && <p className="notice notice-error" role="alert">{error}</p>}
              {message && <p className="notice notice-success" role="status">{message}</p>}
            </section>
          )}

          {(adminView === 'photographer-profile' || adminView === 'photographer-photos') && (
            <PhotographerDashboard
              key={adminView}
              token={session.authorizationToken}
              username={session.username}
              isAdmin
              sectionView={adminView === 'photographer-photos' ? 'photos' : 'profile'}
              onSelectSection={(nextSection) => setAdminView(`photographer-${nextSection}`)}
            />
          )}

          {adminView.startsWith('photographer-') && adminView !== 'photographer-profile' && adminView !== 'photographer-photos' && (
            <PhotographerTools
              token={session.authorizationToken}
              username={session.username}
              isAdmin
              view={adminView.replace('photographer-', '')}
              onBack={() => setAdminView('photographer-profile')}
            />
          )}

          {adminView.startsWith('customer-') && (
            <CustomerDashboard
              token={session.authorizationToken}
              username={session.username}
              view={adminView === 'customer-orders' ? 'orders' : 'catalog'}
              onViewChange={(nextCustomerView) => setAdminView(`customer-${nextCustomerView}`)}
            />
          )}
        </div>
      )}

      {session?.role === 'photographer' && (photographerView === 'profile' || photographerView === 'photos'
        ? <PhotographerDashboard key={photographerView} token={session.authorizationToken} username={session.username} sectionView={photographerView} onSelectSection={setPhotographerView} />
        : <PhotographerTools token={session.authorizationToken} username={session.username} view={photographerView} onBack={() => setPhotographerView('profile')} />)}
      {session?.role === 'customer' && <CustomerDashboard token={session.authorizationToken} username={session.username} view={customerView} onViewChange={setCustomerView} />}
    </MainLayout>
  );
}
