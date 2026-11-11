import { useState } from 'react';
import { createAlbum } from '../services/api';
import { BrandCameraLogo } from './Header';

const emptyAccount = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
};

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function AuthPage({
  userName,
  password,
  onUsernameChange,
  onPasswordChange,
  onLogin,
  onRegister,
  onRegistrationComplete,
  onClearError,
  loading,
  error,
  initialMode = 'login',
}) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState('customer');
  const [account, setAccount] = useState({ ...emptyAccount });
  const [photographerSession, setPhotographerSession] = useState(null);
  const [album, setAlbum] = useState({
    name: '',
    date: localDate(),
    category: '',
    description: '',
  });
  const [cover, setCover] = useState(null);
  const [albumError, setAlbumError] = useState('');
  const [albumLoading, setAlbumLoading] = useState(false);
  const visibleError = albumError || error;

  async function handleRegister(event) {
    event.preventDefault();
    setAlbumError('');
    try {
      const registeredSession = await onRegister({ ...account, role });
      if (role === 'photographer') {
        setPhotographerSession(registeredSession);
        setMode('album');
      } else {
        onRegistrationComplete(registeredSession);
      }
    } catch {
      // The parent surfaces API errors in the authentication form.
    }
  }

  async function handleCreateAlbum(event) {
    event.preventDefault();
    if (!photographerSession || !cover) {
      setAlbumError('Seleccioná una portada para continuar.');
      return;
    }

    setAlbumError('');
    setAlbumLoading(true);
    try {
      await createAlbum(photographerSession.authorizationToken, {
        ...album,
        photo_price: 0,
        video_price: 0,
      }, cover);
      onRegistrationComplete(photographerSession);
    } catch (albumCreateError) {
      setAlbumError(albumCreateError.message);
    } finally {
      setAlbumLoading(false);
    }
  }

  function showLogin() {
    setMode('login');
    setAlbumError('');
    onClearError();
  }

  return (
    <section className="login-layout login-page auth-page">
      <div className="login-copy">
        <p className="landing-eyebrow"><span /> FOTOGRAFÍA PARA CADA OCASIÓN</p>
        <h1>Cada evento<br />tiene su <span>historia.</span></h1>
        <p className="login-description">
          Ingresá a Revela para encontrar las fotos de tus celebraciones, shows y eventos,
          y volver a vivir cada momento.
        </p>
        <p className="login-footnote"><span aria-hidden="true">✦</span> Cada historia merece ser recordada.</p>
      </div>

      {mode === 'login' && (
        <form className="surface login-form auth-form" onSubmit={onLogin}>
          <div className="login-form-heading">
            <span className="login-form-mark" aria-hidden="true"><BrandCameraLogo /></span>
            <p className="landing-eyebrow">BIENVENIDO A REVELA</p>
            <h2>Iniciar sesión</h2>
            <p>Ingresá tus datos para continuar.</p>
          </div>
          <label>Correo electrónico o usuario
            <input className="field" type="text" value={userName} onChange={(event) => onUsernameChange(event.target.value)} placeholder="Tu correo o usuario" autoComplete="username" required />
          </label>
          <label>Contraseña
            <input className="field" type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required />
          </label>
          {loading && <div className="loader-status" role="status" aria-live="polite"><div className="loader" /><span>Iniciando sesión…</span></div>}
          <button className="button button-primary button-wide" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="auth-switch">¿Todavía no tenés cuenta? <button type="button" onClick={() => { setMode('register'); setAlbumError(''); onClearError(); }}>Crear cuenta</button></p>
          {visibleError && <p className="notice notice-error" role="alert">{visibleError}</p>}
          <p className="login-secure-note"><span aria-hidden="true">●</span> Acceso seguro a tu espacio</p>
        </form>
      )}

      {mode === 'register' && (
        <form className="surface login-form auth-form" onSubmit={handleRegister}>
          <div className="login-form-heading">
            <span className="login-form-mark" aria-hidden="true"><BrandCameraLogo /></span>
            <p className="landing-eyebrow">UN ESPACIO PARA TUS HISTORIAS</p>
            <h2>Crear cuenta</h2>
            <p>Elegí cómo querés usar Revela.</p>
          </div>
          <div className="auth-role-options" role="group" aria-label="Tipo de cuenta">
            <button className={role === 'customer' ? 'is-selected' : ''} type="button" aria-pressed={role === 'customer'} onClick={() => setRole('customer')}>
              <strong>Soy usuario</strong><span>Quiero encontrar mis fotos</span>
            </button>
            <button className={role === 'photographer' ? 'is-selected' : ''} type="button" aria-pressed={role === 'photographer'} onClick={() => setRole('photographer')}>
              <strong>Soy fotógrafo</strong><span>Quiero publicar mis eventos</span>
            </button>
          </div>
          <div className="auth-name-fields">
            <label>Nombre
              <input className="field" type="text" value={account.first_name} onChange={(event) => setAccount({ ...account, first_name: event.target.value })} autoComplete="given-name" maxLength={40} required />
            </label>
            <label>Apellido
              <input className="field" type="text" value={account.last_name} onChange={(event) => setAccount({ ...account, last_name: event.target.value })} autoComplete="family-name" maxLength={40} required />
            </label>
          </div>
          <label>Correo electrónico
            <input className="field" type="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} placeholder="nombre@correo.com" autoComplete="email" required />
          </label>
          <label>Contraseña
            <input className="field" type="password" value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}" title="Usá al menos 8 caracteres, con una mayúscula, una minúscula y un número." required />
          </label>
          <small className="auth-password-hint">Al menos 8 caracteres, una mayúscula, una minúscula y un número.</small>
          {loading && <div className="loader-status" role="status" aria-live="polite"><div className="loader" /><span>Iniciando sesión…</span></div>}
          <button className="button button-primary button-wide" type="submit" disabled={loading}>
            {loading ? 'Creando cuenta…' : role === 'photographer' ? 'Continuar' : 'Crear cuenta'}
          </button>
          {visibleError && <p className="notice notice-error" role="alert">{visibleError}</p>}
          <p className="auth-switch">¿Ya tenés cuenta? <button type="button" onClick={showLogin}>Iniciar sesión</button></p>
        </form>
      )}

      {mode === 'album' && (
        <form className="surface login-form auth-form auth-album-form" onSubmit={handleCreateAlbum}>
          <div className="login-form-heading">
            <span className="login-form-mark" aria-hidden="true"><BrandCameraLogo /></span>
            <p className="landing-eyebrow">TU PERFIL DE FOTÓGRAFO</p>
            <h2>Creá tu primer álbum</h2>
            <p>Sumá un evento para completar tu perfil y empezar a compartir tu trabajo.</p>
          </div>
          <label>Nombre del álbum
            <input className="field" type="text" value={album.name} onChange={(event) => setAlbum({ ...album, name: event.target.value })} maxLength={100} required />
          </label>
          <div className="auth-name-fields">
            <label>Fecha del evento
              <input className="field" type="date" value={album.date} onChange={(event) => setAlbum({ ...album, date: event.target.value })} required />
            </label>
            <label>Categoría
              <select className="field" value={album.category} onChange={(event) => setAlbum({ ...album, category: event.target.value })} required>
                <option value="" disabled>Elegí una</option>
                <option value="Celebración">Celebración</option>
                <option value="Música en vivo">Música en vivo</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Retratos y backstage">Retratos y backstage</option>
                <option value="Otro">Otro</option>
              </select>
            </label>
          </div>
          <label>Descripción
            <textarea className="field" value={album.description} onChange={(event) => setAlbum({ ...album, description: event.target.value })} maxLength={1000} rows={3} placeholder="Contá brevemente sobre este evento." />
          </label>
          <label>Portada del álbum
            <input className="field auth-file-input" type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0] || null)} required />
          </label>
          {albumLoading && <div className="loader-status" role="status" aria-live="polite"><div className="loader" /><span>Creando álbum…</span></div>}
          <button className="button button-primary button-wide" type="submit" disabled={albumLoading}>
            {albumLoading ? 'Creando álbum…' : 'Crear álbum y perfil'}
          </button>
          {visibleError && <p className="notice notice-error" role="alert">{visibleError}</p>}
        </form>
      )}
    </section>
  );
}
