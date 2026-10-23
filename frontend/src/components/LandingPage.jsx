import { useEffect, useRef, useState } from 'react';
import { getPhotos } from '../services/api';
import { BrandCameraLogo } from './Header';

function triggerCameraFlash(targetElement) {
  let x = '50vw';
  let y = '50vh';
  if (targetElement && typeof targetElement.getBoundingClientRect === 'function') {
    const rect = targetElement.getBoundingClientRect();
    x = `${Math.round(rect.left + rect.width / 2)}px`;
    y = `${Math.round(rect.top + rect.height / 2)}px`;
  }
  window.dispatchEvent(new CustomEvent('memories:camera-flash', { detail: { x, y } }));
}

const heroSlides = [
  { src: '/landing/hero-2.jpg', alt: 'Aftermovie Session Pro x Q’Lokura' },
  { src: '/landing/hero-3.jpg', alt: 'Aftermovie Chile y Jag' },
  { src: '/landing/hero-4.jpg', alt: 'Detrás del show de Session Pro x Q’Lokura' },
  { src: '/landing/hero-5.jpg', alt: 'Aftermovie Jag Cub' },
];

const featuredEvents = [
  {
    image: '/landing/event-1.jpg',
    category: 'MÚSICA EN VIVO · INDIOS X SESSION PRO',
    title: 'La energía de un show',
    description: 'La fuerza de la música en vivo, contada desde el escenario y entre el público.',
  },
  {
    image: '/landing/event-2.jpg',
    category: 'AFTERMOVIE · SESSION PRO',
    title: 'Session Pro x Q’Lokura',
    description: 'Luces, música y todos esos instantes que hacen único a cada espectáculo.',
  },
  {
    image: '/landing/event-3.jpg',
    category: 'BACKSTAGE · SESSION PRO X Q’LOKURA',
    title: 'Lo que pasa detrás de escena',
    description: 'Una mirada cercana a las personas y los momentos detrás de cada evento.',
  },
];

const featuredServices = [
  {
    title: 'Celebraciones',
    tag: 'SOCIALES · BODAS · EGRESOS',
    previewImage: '/landing/hero-4.jpg',
    previewCaption: 'Casamientos, 15 años, graduaciones y fiestas',
    description: 'Cumpleaños, fiestas y encuentros importantes con quienes más querés.',
    fullInfo: 'Reviví cada abrazo, brindis y baile con galerías organizadas por evento. Los fotógrafos suben el álbum completo para que cada invitado encuentre sus fotos favoritas en segundos y las descargue en su calidad original.',
    highlights: [
      'Cobertura de bodas, fiestas de 15, egresos y aniversarios',
      'Búsqueda simple por álbum y fecha del evento',
      'Descuentos automáticos por cantidad o paquetes de fotos',
      'Descarga inmediata en alta resolución al confirmar tu pedido',
    ],
  },
  {
    title: 'Shows en vivo',
    tag: 'RECITALES · FESTIVALES · ESCENARIO',
    previewImage: '/landing/event-1.jpg',
    previewCaption: 'Recitales, bandas en vivo y festivales',
    description: 'La música, el escenario y la energía compartida desde todos los ángulos.',
    fullInfo: 'Capturamos la potencia de cada show tanto sobre el escenario como entre el público. Encontrá las postales del recital al que asististe o el registro visual completo de tu banda y producción en vivo.',
    highlights: [
      'Fotografía de alta velocidad bajo luces de escenario',
      'Tomas del público, pogo y ambiente del recital',
      'Aftermovies y clips de video en alta definición',
      'Catálogo directo de los fotógrafos oficiales de cada fecha',
    ],
  },
  {
    title: 'Eventos corporativos',
    tag: 'CONFERENCIAS · MARCAS · EQUIPOS',
    previewImage: '/landing/event-2.jpg',
    previewCaption: 'Lanzamientos, congresos y encuentros de equipo',
    description: 'Encuentros de equipo, lanzamientos y momentos que conectan personas.',
    fullInfo: 'Documentación profesional para jornadas empresariales, presentaciones de producto, premiaciones y networking. Ideal para que asistentes, speakers y equipos accedan al material prensa y recuerdo del encuentro.',
    highlights: [
      'Cobertura de charlas, paneles, stands y entregas de premios',
      'Galerías centralizadas de fácil acceso para asistentes',
      'Material listo para redes profesionales y comunicación interna',
      'Opciones de compra por paquete completo o selección individual',
    ],
  },
  {
    title: 'Retratos y backstage',
    tag: 'DETRÁS DE ESCENA · AUTOR · RETRATO',
    previewImage: '/landing/event-3.jpg',
    previewCaption: 'Camarines, ensayos y retratos espontáneos',
    description: 'Las personas y los instantes espontáneos que suceden fuera de escena.',
    fullInfo: 'Más allá del momento principal, cada evento guarda historias íntimas en la previa, los camarines y los preparativos. Una mirada documental y cercana a los protagonistas antes y después de salir a escena.',
    highlights: [
      'Registro documental de ensayos, pruebas de sonido y previa',
      'Retratos naturales y espontáneos con estética editorial',
      'Trabajo colaborativo entre múltiples fotógrafos del staff',
      'Obra original protegida con entrega directa de su autor',
    ],
  },
];

const fallbackFilmFrames = [
  { id: 'film-1', url: '/landing/event-1.jpg', title: 'Indios x Session Pro', code: '01A' },
  { id: 'film-2', url: '/landing/hero-2.jpg', title: 'Session Pro x Q’Lokura', code: '02A' },
  { id: 'film-3', url: '/landing/event-2.jpg', title: 'Escenario en vivo', code: '03A' },
  { id: 'film-4', url: '/landing/hero-3.jpg', title: 'Chile y Jag', code: '04A' },
  { id: 'film-5', url: '/landing/event-3.jpg', title: 'Detrás de escena', code: '05A' },
  { id: 'film-6', url: '/landing/hero-5.jpg', title: 'Aftermovie Jag Cub', code: '06A' },
];

function handleCardPointerMove(event) {
  if (event.pointerType !== 'mouse') return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;
  event.currentTarget.style.setProperty('--card-rotate-x', `${(0.5 - y) * 5}deg`);
  event.currentTarget.style.setProperty('--card-rotate-y', `${(x - 0.5) * 5}deg`);
  event.currentTarget.style.setProperty('--spotlight-x', `${x * 100}%`);
  event.currentTarget.style.setProperty('--spotlight-y', `${y * 100}%`);
}

function handleMagneticPointerMove(event) {
  if (event.pointerType !== 'mouse') return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  event.currentTarget.style.setProperty('--magnetic-x', `${x * 6}px`);
  event.currentTarget.style.setProperty('--magnetic-y', `${y * 6}px`);
}

function resetPointerEffects(event) {
  const element = event.currentTarget;
  element.style.removeProperty('--pointer-shift-x');
  element.style.removeProperty('--pointer-shift-y');
  element.style.removeProperty('--card-rotate-x');
  element.style.removeProperty('--card-rotate-y');
  element.style.removeProperty('--magnetic-x');
  element.style.removeProperty('--magnetic-y');
  element.style.removeProperty('--spotlight-x');
  element.style.removeProperty('--spotlight-y');
}

export default function LandingPage({ onLogin, onRegister }) {
  const landingRef = useRef(null);
  const [activeTile, setActiveTile] = useState(null);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const root = landingRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    root.classList.add('landing-reveal-ready');
    const revealVisibleElements = () => {
      root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight && bounds.bottom > 0) {
          element.classList.add('is-visible');
        }
      });
    };
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
      : null;

    root.querySelectorAll('[data-reveal]').forEach((element) => observer?.observe(element));
    window.addEventListener('scroll', revealVisibleElements, { passive: true });
    revealVisibleElements();
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', revealVisibleElements);
      root.classList.remove('landing-reveal-ready');
    };
  }, []);

  useEffect(() => {
    let active = true;

    getPhotos()
      .then((catalog) => {
        if (active) setPhotos(catalog.slice(0, 6));
      })
      .catch(() => {
        // Fallback film frames are shown automatically when the API is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const mappedCatalogFrames = photos.map((photo, index) => ({
    id: String(photo._id || photo.id || `catalog-${index}`),
    url: photo.url,
    title: photo.title || 'Evento en vivo',
    code: `0${index + 1}A`,
  }));
  const baseFilmFrames = [...mappedCatalogFrames, ...fallbackFilmFrames]
    .slice(0, 6)
    .map((frame, index) => ({ ...frame, code: `0${index + 1}A` }));
  const filmStripFrames = [...baseFilmFrames, ...baseFilmFrames];

  return (
    <div className="landing-page" ref={landingRef}>
      <section className="landing-hero" id="inicio" aria-labelledby="landing-title">
        <div className="landing-hero-copy" data-reveal="left">
          <p className="landing-eyebrow"><span /> FOTOS Y VIDEOS DE EVENTOS</p>
          <h1 id="landing-title">Cada<br />momento,<br /><span>revelado.</span></h1>
          <p className="landing-lead">
            Encontrá tus fotos y videos del casamiento, del egreso o del recital en los álbumes
            que publican los fotógrafos del evento.
          </p>
          <div className="landing-actions">
            <button className="landing-button landing-button-primary" type="button" onClick={onLogin} onPointerMove={handleMagneticPointerMove} onPointerLeave={resetPointerEffects}>
              Buscar mi evento
            </button>
            <button className="landing-button landing-button-outline" type="button" onClick={onLogin} onPointerMove={handleMagneticPointerMove} onPointerLeave={resetPointerEffects}>
              Soy fotógrafo
            </button>
          </div>
          <p className="landing-note">Historias reales. Momentos que perduran.</p>
        </div>

        <div className="landing-mosaic" data-active={activeTile ?? ''} role="group" aria-label="Fotografías de eventos" data-reveal="right">
          {heroSlides.map((slide, index) => (
            <div
              className={`landing-mosaic-tile landing-mosaic-tile-${index} ${activeTile === index ? 'is-focused' : ''}`}
              key={slide.src}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setActiveTile(index);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setActiveTile(null);
              }}
            >
              <img src={slide.src} alt={slide.alt} />
            </div>
          ))}
        </div>
      </section>

      <section className="landing-features" id="nosotros" aria-labelledby="features-title">
        <div className="landing-section">
          <div className="landing-section-heading" data-reveal="rise">
            <p className="landing-eyebrow">HISTORIAS EN CADA ENCUENTRO</p>
            <h2 id="features-title">Un recuerdo para cada ocasión.</h2>
            <p>Una mirada atenta a la energía, las personas y los detalles de cada evento.</p>
          </div>
          <div className="landing-feature-grid" data-reveal="rise">
            {featuredServices.map((service, index) => {
              const isExpanded = expandedFeature === index;
              return (
                <article
                  className={`landing-feature ${isExpanded ? 'is-expanded' : ''}`}
                  key={service.title}
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={resetPointerEffects}
                  onClick={() => setExpandedFeature((current) => (current === index ? null : index))}
                >
                  <div className="landing-feature-top">
                    <span className="landing-feature-number">0{index + 1}</span>
                    <span className="landing-feature-tag">{service.tag}</span>
                  </div>

                  <div className="landing-feature-preview">
                    <img src={service.previewImage} alt={service.previewCaption} loading="lazy" />
                    <div className="landing-feature-preview-overlay">
                      <span>Vista previa · {service.previewCaption}</span>
                    </div>
                  </div>

                  <div className="landing-feature-body">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>

                  <div
                    className={`landing-feature-details ${isExpanded ? 'is-open' : ''}`}
                    aria-hidden={!isExpanded}
                  >
                    <div className="landing-feature-details-inner">
                      <p className="landing-feature-full-copy">{service.fullInfo}</p>
                      <ul className="landing-feature-highlights">
                        {service.highlights.map((item) => (
                          <li key={item}>
                            <span aria-hidden="true">✦</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        className="landing-feature-explore-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onLogin();
                        }}
                      >
                        Buscar fotos de {service.title.toLowerCase()} <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>

                  <button
                    className="landing-feature-trigger"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedFeature((current) => (current === index ? null : index));
                    }}
                  >
                    <span className="landing-feature-trigger-dot" aria-hidden="true" />
                    <span>{isExpanded ? 'Ocultar información' : 'Clickee aquí'}</span>
                    <span className="landing-feature-trigger-arrow" aria-hidden="true">{isExpanded ? '↑' : '→'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-events landing-section" id="eventos" aria-labelledby="events-title">
        <div className="landing-section-heading landing-section-heading-row" data-reveal="rise">
          <div>
            <p className="landing-eyebrow">ÁLBUMES RECIENTES</p>
            <h2 id="events-title">Cada evento, una nueva historia.</h2>
            <p>Una selección de proyectos de fotografía y video en vivo.</p>
          </div>
          <button className="landing-text-link" type="button" onClick={onLogin}>
            Ver álbumes <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="landing-event-grid">
          {featuredEvents.map((event, index) => (
            <article
              className="landing-event-card"
              key={event.title}
              data-reveal="rise"
              style={{ '--reveal-delay': `${index * 120}ms` }}
              onPointerMove={handleCardPointerMove}
              onPointerLeave={resetPointerEffects}
            >
              <button className="landing-event-image" type="button" onClick={onLogin} aria-label={`Explorar: ${event.title}`}>
                <img src={event.image} alt="" loading="lazy" />
                <span>0{index + 1}</span>
              </button>
              <div className="landing-event-copy">
                <p className="landing-eyebrow">{event.category}</p>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <button className="landing-card-link" type="button" onClick={onLogin}>
                  Encontrar mis fotos <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-gallery landing-film-section" aria-labelledby="gallery-title">
        <div className="landing-section">
          <div className="landing-film-cta-banner" data-reveal="rise">
            <div className="landing-film-roll" aria-hidden="true">
              <div className="landing-film-sprockets landing-film-sprockets-top" />
              <div className="landing-film-viewport">
                <div className="landing-film-scanner" />
                <div className="landing-film-track">
                  {filmStripFrames.map((frame, index) => (
                    <div
                      className="landing-film-frame"
                      key={`${frame.id}-${index}`}
                      style={{ '--develop-delay': `${(index % 6) * -1.4}s` }}
                    >
                      <div className="landing-film-frame-meta">
                        <span>REVELA 400</span>
                        <span>◀ {frame.code}</span>
                      </div>
                      <div className="landing-film-frame-window">
                        <img
                          src={frame.url}
                          alt={frame.title}
                          loading="lazy"
                          onError={(event) => {
                            const image = event.currentTarget;
                            if (image.dataset.fallback === 'true') return;
                            image.dataset.fallback = 'true';
                            image.src = '/landing/hero-2.jpg';
                          }}
                        />
                        <span className="landing-film-chemical-veil" />
                      </div>
                      <div className="landing-film-frame-footer">
                        <span>{frame.title}</span>
                        <span>ISO 400 · REVELADO</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="landing-film-sprockets landing-film-sprockets-bottom" />
            </div>

            <div className="landing-event-cta-card">
              <div className="landing-event-cta-copy">
                <h2 id="gallery-title">
                  ¿Fuiste a un evento? Tus fotos ya<br />
                  pueden estar acá.
                </h2>
              </div>
              <button
                className="landing-event-cta-button"
                type="button"
                onClick={onRegister || onLogin}
                onPointerMove={handleMagneticPointerMove}
                onPointerLeave={resetPointerEffects}
              >
                Crear mi cuenta
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-contact landing-section" id="contacto" aria-labelledby="contact-title" data-reveal="rise">
        <button
          className="landing-contact-mark landing-camera-flash-btn"
          type="button"
          aria-label="Disparar flash e ir a Iniciar sesión"
          title="Click para sacar foto e iniciar sesión"
          onClick={(event) => triggerCameraFlash(event.currentTarget)}
        >
          <BrandCameraLogo />
        </button>
        <p className="landing-eyebrow">CADA HISTORIA MERECE SER CONTADA</p>
        <h2 id="contact-title">Volvé a vivir cada momento.</h2>
        <p>Ingresá a la galería para encontrar y elegir las fotos de los eventos que compartiste.</p>
        <button
          className="landing-button landing-button-primary"
          type="button"
          onClick={(event) => {
            const cameraBtn = event.currentTarget.parentElement?.querySelector('.landing-camera-flash-btn') || event.currentTarget;
            triggerCameraFlash(cameraBtn);
          }}
          onPointerMove={handleMagneticPointerMove}
          onPointerLeave={resetPointerEffects}
        >
          Click en la camarita <span aria-hidden="true">↑</span>
        </button>
      </section>
    </div>
  );
}
