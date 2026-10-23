import Header from '../components/Header';
import Footer from '../components/Footer';
import Menu from '../components/Menu';

export default function MainLayout({
  children,
  theme,
  onToggleTheme,
  session,
  onLogout,
  activeView,
  onNavigate,
  showPublicNavigation,
  showLogin,
  onShowLogin,
  onHome,
}) {
  return (
    <div className={`app-shell ${session ? 'app-shell-authenticated' : 'app-shell-public'} ${showLogin ? 'app-shell-auth' : ''}`} data-theme={theme}>
      <Header
        theme={theme}
        onToggleTheme={onToggleTheme}
        session={session}
        onLogout={onLogout}
        showPublicNavigation={showPublicNavigation}
        showLogin={showLogin}
        onShowLogin={onShowLogin}
        onHome={onHome}
      />
      <div className={`app-frame ${session ? '' : 'app-frame-login'} ${showPublicNavigation ? 'app-frame-public' : ''} ${showLogin ? 'app-frame-auth' : ''}`}>
        <Menu
          role={session?.role}
          activeView={session?.role ? activeView : undefined}
          onNavigate={onNavigate}
        />
        <main className={`main-content ${showPublicNavigation ? 'main-content-public' : ''} ${showLogin ? 'main-content-auth' : ''}`}>{children}</main>
      </div>
      <Footer isPublic={showPublicNavigation} isAuth={showLogin} />
    </div>
  );
}
