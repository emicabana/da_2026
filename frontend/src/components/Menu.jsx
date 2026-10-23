const menuItems = {
  admin: [
    { id: 'users', label: 'Cuentas de usuarios', icon: '◉', group: 'PANEL ADMINISTRADOR' },
    { id: 'orders', label: 'Pedidos globales', icon: '▤', group: 'PANEL ADMINISTRADOR' },
    { id: 'photographer-profile', label: 'Álbumes y perfil', icon: '📷', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-photos', label: 'Fotografías', icon: '▧', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-sales', label: 'Ventas', icon: '$', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-discounts', label: 'Descuentos y paquetes', icon: '%', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-coupons', label: 'Cupones', icon: '⌑', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-collaborators', label: 'Colaboradores', icon: '♧', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-billing', label: 'Facturación', icon: '▤', group: 'PANEL FOTÓGRAFO' },
    { id: 'photographer-studio', label: 'Studio', icon: '✦', group: 'PANEL FOTÓGRAFO' },
    { id: 'customer-catalog', label: 'Explorar álbumes', icon: '🖼', group: 'PANEL USUARIO' },
    { id: 'customer-orders', label: 'Compras pendientes', icon: '🛒', group: 'PANEL USUARIO' },
  ],
  photographer: [
    { id: 'profile', label: 'Mi perfil', icon: '◉' },
    { id: 'sales', label: 'Ventas', icon: '$' },
    { id: 'discounts', label: 'Descuentos y paquetes', icon: '%' },
    { id: 'coupons', label: 'Cupones', icon: '⌑' },
    { id: 'collaborators', label: 'Colaboradores', icon: '♧' },
    { id: 'billing', label: 'Facturación', icon: '▤' },
    { id: 'studio', label: 'Studio', icon: '✦' },
    { id: 'photos', label: 'Mis fotografías', icon: '▧' },
  ],
  customer: [
    { id: 'catalog', label: 'Explorar fotos' },
    { id: 'orders', label: 'Compras pendientes' },
  ],
};

export default function Menu({ role, activeView, onNavigate }) {
  if (!role) return null;
  const items = menuItems[role] || [];
  const selectedView = activeView || items[0]?.id;

  return (
    <nav className="sidebar" aria-label="Navegación principal">
      {role !== 'admin' && <p className="eyebrow sidebar-label">ESPACIO DE TRABAJO</p>}
      <div className="sidebar-items">
        {items.map((item, index) => {
          const prevGroup = index > 0 ? items[index - 1].group : null;
          const showGroupHeader = item.group && item.group !== prevGroup;
          return (
            <div className="sidebar-item-wrap" key={item.id}>
              {showGroupHeader && (
                <p className="eyebrow sidebar-label sidebar-group-label">{item.group}</p>
              )}
              <button
                className={`sidebar-link ${selectedView === item.id ? 'is-active' : ''}`}
                type="button"
                aria-current={selectedView === item.id ? 'page' : undefined}
                onClick={() => onNavigate?.(item.id)}
              >
                {item.icon
                  ? <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                  : <span className="sidebar-indicator" />}
                {item.label}
              </button>
            </div>
          );
        })}
      </div>
      <p className="sidebar-caption">
        {role === 'admin'
          ? 'Control total: Administración, Fotógrafo y Usuario.'
          : 'Fotografía independiente, en un solo lugar.'}
      </p>
    </nav>
  );
}
