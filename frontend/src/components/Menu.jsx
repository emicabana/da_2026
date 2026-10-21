const menuItems = {
  admin: [{ id: 'users', label: 'Cuentas' }],
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
    { id: 'orders', label: 'Mis pedidos' },
  ],
};

export default function Menu({ role, activeView, onNavigate }) {
  if (!role) return null;
  const selectedView = activeView || menuItems[role]?.[0]?.id;

  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <p className="eyebrow sidebar-label">ESPACIO DE TRABAJO</p>
      <div className="sidebar-items">
        {(menuItems[role] || []).map((item) => (
          <button
            className={`sidebar-link ${selectedView === item.id ? 'is-active' : ''}`}
            type="button"
            key={item.id}
            aria-current={selectedView === item.id ? 'page' : undefined}
            onClick={() => onNavigate?.(item.id)}
          >
            {item.icon
              ? <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              : <span className="sidebar-indicator" />}
            {item.label}
          </button>
        ))}
      </div>
      <p className="sidebar-caption">Fotografía independiente, en un solo lugar.</p>
    </nav>
  );
}
