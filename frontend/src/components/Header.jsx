import { useEffect, useRef, useState } from 'react';

const roleNames = {
  admin: 'Administrador',
  photographer: 'Fotógrafo',
  customer: 'Cliente',
};

const publicLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#albums', label: 'Álbumes' },
  { href: '#eventos', label: 'Eventos' },
  { href: '#nosotros', label: 'Nosotros' },
  { href: '#contacto', label: 'Contacto' },
];

export function BrandCameraLogo({ className = 'brand-camera-svg' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="6.5" height="20" rx="3.25" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2H25C28.3137 2 31 4.68629 31 8V16C31 19.3137 28.3137 22 25 22H16C12.6863 22 10 19.3137 10 16V8C10 4.68629 12.6863 2 16 2ZM20.5 16.8C23.151 16.8 25.3 14.651 25.3 12C25.3 9.34903 23.151 7.2 20.5 7.2C17.849 7.2 15.7 9.34903 15.7 12C15.7 14.651 17.849 16.8 20.5 16.8ZM26.8 7.5C27.4627 7.5 28 6.96274 28 6.3C28 5.63726 27.4627 5.1 26.8 5.1C26.1373 5.1 25.6 5.63726 25.6 6.3C25.6 6.96274 26.1373 7.5 26.8 7.5Z"
        fill="currentColor"
      />
      <circle cx="20.5" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

function triggerCameraFlashToLogin(targetElement) {
  let x = '50vw';
  let y = '50vh';

  if (targetElement && typeof targetElement.getBoundingClientRect === 'function') {
    const rect = targetElement.getBoundingClientRect();
    x = `${Math.round(rect.left + rect.width / 2)}px`;
    y = `${Math.round(rect.top + rect.height / 2)}px`;
  }

  window.dispatchEvent(
    new CustomEvent('memories:camera-flash', {
      detail: { x, y },
    })
  );
}

export default function Header({
  theme,
  onToggleTheme,
  session,
  onLogout,
  showPublicNavigation,
  showLogin,
  onShowLogin,
  onOpenAlbums,
  onHome,
  publicPage = 'landing',
  onOpenAbout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapseProgress, setCollapseProgress] = useState(0);
  const [flashEffect, setFlashEffect] = useState(null);
  const timersRef = useRef([]);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const progress = Math.min(1, Math.max(0, (scrollY - 16) / 180));
      setCollapseProgress(progress);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleCameraFlash(event) {
      const x = event.detail?.x || '50vw';
      const y = event.detail?.y || '50vh';

      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current = [];

      setFlashEffect({ x, y, key: Date.now() });

      const navTimer = setTimeout(() => {
        setMenuOpen(false);
        onShowLogin?.();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 260);

      const clearTimer = setTimeout(() => {
        setFlashEffect(null);
      }, 820);

      timersRef.current.push(navTimer, clearTimer);
    }

    window.addEventListener('memories:camera-flash', handleCameraFlash);
    return () => {
      window.removeEventListener('memories:camera-flash', handleCameraFlash);
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
    };
  }, [onShowLogin]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleNavLinkClick(event, href) {
    closeMenu();
    if (href === '#albums') {
      event.preventDefault();
      onOpenAlbums?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (href === '#nosotros') {
      event.preventDefault();
      onOpenAbout?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (publicPage !== 'landing') {
      event.preventDefault();
      onHome?.(href);
      return;
    }

    if (typeof href === 'string' && href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history?.replaceState?.(null, '', href);
      }
    }
  }

  function handleBrandClick(event) {
    if (showPublicNavigation) {
      event.preventDefault();
      const cameraMark = event.currentTarget.querySelector('.brand-mark-camera') || event.currentTarget;
      triggerCameraFlashToLogin(cameraMark);
      return;
    }

    if (!session) {
      event.preventDefault();
      onHome?.();
    }
  }

  const isBrandCollapsed = collapseProgress >= 0.98;

  return (
    <>
      {flashEffect && (
        <div
          key={flashEffect.key}
          className="camera-shutter-flash"
          style={{
            '--flash-x': flashEffect.x,
            '--flash-y': flashEffect.y,
          }}
          aria-hidden="true"
        >
          <span className="camera-shutter-flash-flare" />
        </div>
      )}
      <header className={`topbar ${showPublicNavigation || showLogin ? 'topbar-public' : ''} ${collapseProgress > 0.15 ? 'is-scrolled' : ''}`}>
        <a
          className={`brand brand-collapsible ${isBrandCollapsed ? 'is-collapsed' : ''}`}
          href={showPublicNavigation ? '#iniciar-sesion' : !session ? '#inicio' : '/'}
          aria-label={showPublicNavigation ? 'Disparar flash e iniciar sesión en Revela' : 'Revela, inicio'}
          title={showPublicNavigation ? 'Click para iniciar sesión' : 'Revela'}
          onClick={handleBrandClick}
        >
          <span className="brand-mark brand-mark-camera" aria-hidden="true">
            <BrandCameraLogo />
          </span>
          <span
            className="brand-wordmark-clip"
            style={{
              maxWidth: `${Math.round((1 - collapseProgress) * 148)}px`,
              opacity: Math.max(0, 1 - collapseProgress * 1.15),
              marginLeft: `${((1 - collapseProgress) * 10).toFixed(1)}px`,
            }}
          >
            <span
              className="brand-wordmark"
              style={{
                transform: `translate3d(${(-collapseProgress * 100).toFixed(1)}%, 0, 0)`,
              }}
            >
              Revela
            </span>
          </span>
        </a>
        {showPublicNavigation && (
          <>
            <nav className={`topbar-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
              {publicLinks.map((link) => (
                <a
                  href={link.href}
                  key={link.href}
                  className={
                    (publicPage === 'about' && link.href === '#nosotros')
                      || (publicPage === 'catalog' && link.href === '#albums')
                      ? 'is-active'
                      : ''
                  }
                  onClick={(event) => handleNavLinkClick(event, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <button className="button button-nav-login" type="button" onClick={() => { closeMenu(); onShowLogin(); }}>
                Iniciar sesión
              </button>
            </nav>
            <button
              className={`topbar-menu-toggle ${menuOpen ? 'is-open' : ''}`}
              type="button"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span /><span /><span />
            </button>
          </>
        )}
        <div className="topbar-actions">
          {session && (
            <div className="account-controls">
              <div className="account-identity">
                <span className="account-name">@{session.username}</span>
                <span className="account-role">{roleNames[session.role] || 'Cuenta'}</span>
              </div>
              {session.role === 'photographer' && (
                <span className="photographer-account-avatar" aria-hidden="true">
                  {(session.username || 'F').slice(0, 1).toUpperCase()}
                </span>
              )}
              <button className="button button-topbar" type="button" onClick={onLogout}>Cerrar sesión</button>
            </div>
          )}
          {!session && !showPublicNavigation && (
            <button className="button button-topbar" type="button" onClick={onHome}>Volver al inicio</button>
          )}
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Activar modo ${theme === 'dark' ? 'claro' : 'nocturno'}`}
            aria-pressed={theme === 'dark'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>
    </>
  );
}
