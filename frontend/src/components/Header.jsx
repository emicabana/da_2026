import { useState } from 'react';

const roleNames = {
  admin: 'Administrador',
  photographer: 'Fotógrafo',
  customer: 'Cliente',
};

const publicLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#eventos', label: 'Eventos' },
  { href: '#nosotros', label: 'Nosotros' },
  { href: '#contacto', label: 'Contacto' },
];

export default function Header({ session, onLogout, showPublicNavigation, showLogin, onShowLogin, onHome }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`topbar ${showPublicNavigation || showLogin ? 'topbar-public' : ''}`}>
      <a
        className="brand"
        href={showPublicNavigation || !session ? '#inicio' : '/'}
        aria-label="Memories, inicio"
        onClick={() => { if (!session) onHome?.(); }}
      >
        <span className="brand-mark">M</span>
        <span>Memories</span>
      </a>
      {showPublicNavigation && (
        <>
          <nav className={`topbar-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
            {publicLinks.map((link) => (
              <a href={link.href} key={link.href} onClick={closeMenu}>{link.label}</a>
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
      {session && (
        <div className="account-controls">
          <div className="account-identity">
            <span className="account-name">@{session.username}</span>
            <span className="account-role">{roleNames[session.role] || 'Cuenta'}</span>
          </div>
          <button className="button button-topbar" type="button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      )}
      {!session && !showPublicNavigation && (
        <button className="button button-topbar" type="button" onClick={onHome}>Volver al inicio</button>
      )}
    </header>
  );
}
