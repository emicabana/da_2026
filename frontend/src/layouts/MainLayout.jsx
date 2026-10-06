import Header from '../components/Header';
import Footer from '../components/Footer';
import Menu from '../components/Menu';

export default function MainLayout({ children, session, onLogout, activeView, onNavigate }) {
  return (
    <div className="app-shell">
      <Header session={session} onLogout={onLogout} />
      <div className={`app-frame ${session ? '' : 'app-frame-login'}`}>
        <Menu
          role={session?.role}
          activeView={session?.role === 'customer' ? activeView : undefined}
          onNavigate={onNavigate}
        />
        <main className="main-content">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
