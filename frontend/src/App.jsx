import { useEffect, useState } from 'react';
import './App.css';
import './ProjectTheme.css';
import MainLayout from './layouts/MainLayout';
import { createUser, login, registerAccount, getUsers, logout, updateUser, deleteUser } from './services/api';
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
  const [customerView, setCustomerView] = useState('catalog');
  const [photographerView, setPhotographerView] = useState('profile');
  const [users, setUsers] = useState([]);
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
        setUsers(await getUsers(loggedInSession.authorizationToken));
      } else {
        setUsers([]);
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
    setUsers([]);
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
      activeView={session?.role === 'photographer' ? photographerView : customerView}
      onNavigate={session?.role === 'photographer' ? setPhotographerView : setCustomerView}
      showPublicNavigation={!session && !showLogin}
      showLogin={!session && showLogin}
      onShowLogin={() => { setShowLogin(true); setError(''); }}
      onHome={() => { setShowLogin(false); setError(''); }}
    >
      {!session && !showLogin && <LandingPage onLogin={() => { setShowLogin(true); setError(''); }} />}

      {!session && showLogin && (
        <AuthPage
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
        <section className="dashboard-stack" aria-labelledby="admin-title">
          <div className="page-heading">
            <div><p className="eyebrow">ADMINISTRACIÓN</p><h1 id="admin-title">Cuentas</h1><p className="heading-copy">Gestioná los accesos de clientes y fotógrafos.</p></div>
          </div>
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
                  {editingUsername && <button className="button button-quiet" type="button" onClick={handleCancelEdit}>Cancelar</button>}
                </div>
              </form>
            </section>
            <section className="catalog-panel">
              <div className="section-heading"><div><p className="eyebrow">ACCESOS</p><h2>Usuarios registrados</h2></div><button className="button button-quiet button-small" type="button" onClick={handleLoadUsers} disabled={loading}>Actualizar</button></div>
              {users.length === 0 ? <div className="empty-state"><strong>{loading ? 'Cargando usuarios…' : 'No hay usuarios registrados.'}</strong><span>{loading ? 'La lista se está actualizando.' : 'Las cuentas aparecerán acá.'}</span></div> : (
                <div className="user-list">{users.map((user) => (
                  <article className="user-row" key={user.id || user.user_name}><div className="user-avatar">{(user.display_name || user.user_name).slice(0, 1).toUpperCase()}</div><div><strong>{user.display_name || user.user_name}</strong><span>@{user.user_name} · {user.email}</span></div><span className="role-pill">{roleLabels[user.role] || user.role}</span><div className="user-actions"><button className="button button-quiet button-small" type="button" onClick={() => handleEditUser(user)}>Editar</button><button className="button button-danger button-small" type="button" onClick={() => handleDeleteUser(user)} disabled={loading || user.user_name === session.username} title={user.user_name === session.username ? 'No podés eliminar tu propia cuenta activa' : 'Eliminar usuario'}>Eliminar</button></div></article>
                ))}</div>
              )}</section>
          </div>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          {message && <p className="notice notice-success" role="status">{message}</p>}
        </section>
      )}

      {session?.role === 'photographer' && (photographerView === 'profile' || photographerView === 'photos'
        ? <PhotographerDashboard token={session.authorizationToken} username={session.username} />
        : <PhotographerTools token={session.authorizationToken} username={session.username} view={photographerView} onBack={() => setPhotographerView('profile')} />)}
      {session?.role === 'customer' && <CustomerDashboard token={session.authorizationToken} username={session.username} view={customerView} onViewChange={setCustomerView} />}
    </MainLayout>
  );
}
