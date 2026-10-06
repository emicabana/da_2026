const roleNames = {
  admin: 'Administrador',
  photographer: 'Fotógrafo',
  customer: 'Cliente',
};

export default function Header({ session, onLogout }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Foco, inicio">
        <span className="brand-mark">f/</span>
        <span>foco<span className="brand-period">.</span></span>
      </a>
      {session && (
        <div className="account-controls">
          <div className="account-identity">
            <span className="account-name">@{session.username}</span>
            <span className="account-role">{roleNames[session.role] || 'Cuenta'}</span>
          </div>
          <button className="button button-topbar" type="button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      )}
    </header>
  );
}
