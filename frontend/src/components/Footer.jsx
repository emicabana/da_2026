export default function Footer({ isPublic = false, isAuth = false }) {
  return (
    <footer className={`site-footer ${isPublic || isAuth ? 'site-footer-public' : ''}`}>
      <span>Revela · Galería de fotografía</span>
      <span>Obra original, de sus autores.</span>
      {isPublic && <span>© {new Date().getFullYear()} Revela</span>}
    </footer>
  );
}
