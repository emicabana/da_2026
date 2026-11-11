import SideRays from './SideRays';
import photographerPhoto from '../assets/photographer-profile.jpg';
import developerPhoto from '../assets/developer-profile.jpg';

export default function AboutPage({ onBackHome, onOpenAlbums }) {
  return (
    <div className="about-page">
      <SideRays />

      <div className="about-page-container">
        <div className="about-page-top-nav">
          <button
            type="button"
            className="about-back-link"
            onClick={onBackHome}
          >
            <span aria-hidden="true">←</span> Volver al inicio
          </button>
        </div>

        <header className="about-page-header">
          <p className="about-page-kicker">
            <span aria-hidden="true">✦</span> NOSOTROS · DETRÁS DE CADA HISTORIA
          </p>
          <h1 className="about-page-title">
            Pasión por capturar lo que pasa una sola vez.
          </h1>
          <p className="about-page-subtitle">
            Conocé a quienes están detrás del lente en cada cobertura y del desarrollo de la plataforma.
          </p>
        </header>

        {/* SECCIÓN PRINCIPAL: EL FOTÓGRAFO (DESTACADO) */}
        <section
          className="about-photographer-showcase"
          aria-labelledby="photographer-heading"
        >
          <div className="about-photographer-photo-col">
            <div className="about-photographer-photo-frame">
              <img
                src={photographerPhoto}
                alt="Fotógrafo principal de Revela"
                className="about-photographer-photo-img"
              />

              <div className="about-photographer-badge">
                <span className="about-photographer-badge-dot" aria-hidden="true" />
                FOTÓGRAFO PRINCIPAL
              </div>
            </div>
          </div>

          <div className="about-photographer-info-col">
            <div className="about-photographer-header">
              <span className="about-role-pill">FOTOGRAFÍA · FILMMAKING · MARKETING & PUBLICIDAD</span>
              <h2 id="photographer-heading" className="about-photographer-name">
                Federico Funes
              </h2>
              <p className="about-photographer-tagline">
                Fotógrafo y Filmmaker profesional · Recibido de la Tecnicatura en Marketing y Publicidad.
              </p>
            </div>

            <div className="about-photographer-bio">
              <p>
                Apasionado por congelar la energía real de cada fecha. Mi enfoque combina la cobertura fotográfica y audiovisual en vivo con una mirada estratégica desde el <strong>Marketing y la Publicidad</strong>, potenciando tanto los recuerdos de cada asistente como la identidad visual de cada evento, artista o marca.
              </p>
              <p>
                Desde el escenario y el backstage hasta la emoción entre el público, trabajo con equipos de alta luminosidad y flujo de entrega ágil para que encuentres tus fotos y videos en máxima calidad.
              </p>
            </div>

            <div className="about-photographer-highlights">
              <div className="about-highlight-item">
                <strong>Foto & Film</strong>
                <span>Cobertura integral en vivo</span>
              </div>
              <div className="about-highlight-item">
                <strong>Marketing</strong>
                <span>Téc. en Marketing y Publicidad</span>
              </div>
              <div className="about-highlight-item">
                <strong>San Juan</strong>
                <span>Eventos · Recitales · Sociales</span>
              </div>
            </div>

            <div className="about-contact-box">
              <h3 className="about-contact-box-title">Información de contacto y redes</h3>
              <div className="about-contact-grid">
                <a
                  href="https://www.instagram.com/fedefunes.film"
                  target="_blank"
                  rel="noreferrer"
                  className="about-contact-pill"
                >
                  <span className="about-contact-label">Instagram</span>
                  <strong>@fedefunes.film</strong>
                </a>
                <a
                  href="https://wa.me/5492645029031"
                  target="_blank"
                  rel="noreferrer"
                  className="about-contact-pill"
                >
                  <span className="about-contact-label">WhatsApp / Contrataciones</span>
                  <strong>+54 9 2645 02-9031</strong>
                </a>
                <div className="about-contact-pill">
                  <span className="about-contact-label">Formación</span>
                  <strong>Téc. en Marketing y Publicidad</strong>
                </div>
                <div className="about-contact-pill">
                  <span className="about-contact-label">Ubicación & Cobertura</span>
                  <strong>San Juan, Argentina</strong>
                </div>
              </div>

              <div className="about-photographer-actions">
                <a
                  className="button button-primary landing-button landing-button-primary"
                  href="https://wa.me/5492645029031?text=Hola%20Fede!%20Me%20gustar%C3%ADa%20consultar%20por%20la%20cobertura%20de%20un%20evento."
                  target="_blank"
                  rel="noreferrer"
                >
                  Contactar por WhatsApp
                </a>
                <button
                  type="button"
                  className="button button-outline landing-button landing-button-outline"
                  onClick={onOpenAlbums}
                >
                  Ver álbumes publicados
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN SECUNDARIA Y DISCRETA: EL DESARROLLADOR */}
        <section
          className="about-developer-section"
          aria-labelledby="developer-heading"
        >
          <div className="about-developer-divider">
            <span>PLATAFORMA & DESARROLLO</span>
          </div>

          <div className="about-developer-card">
            <div className="about-developer-photo-frame">
              <img
                src={developerPhoto}
                alt="Emiliano Funes — Desarrollador Web"
                className="about-developer-photo-img"
              />
            </div>

            <div className="about-developer-info">
              <div className="about-developer-head">
                <span className="about-developer-tag">DISEÑO & DESARROLLO DE LA PÁGINA</span>
                <h3 id="developer-heading" className="about-developer-name">
                  Emiliano Funes · Desarrollador Web
                </h3>
              </div>

              <p className="about-developer-desc">
                Creador y desarrollador de la plataforma <strong>Revela</strong>, diseñada a medida para gestionar galerías de eventos, selección rápida de fotografías y entrega digital directa para clientes.
              </p>

              <div className="about-developer-links">
                <span>
                  Correo:{' '}
                  <a href="mailto:emilianofunes2012@gmail.com">
                    <strong>emilianofunes2012@gmail.com</strong>
                  </a>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  GitHub:{' '}
                  <a
                    href="https://github.com/emicabana"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>github.com/emicabana</strong>
                  </a>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
