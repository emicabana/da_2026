import { useEffect, useState } from 'react';
import { getPhotos } from '../services/api';

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

const formatPrice = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export default function LandingPage({ onLogin }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;

    getPhotos()
      .then((catalog) => {
        if (active) setPhotos(catalog.slice(0, 4));
      })
      .catch((error) => {
        if (active) setPhotoError(error.message);
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="landing-page">
      <section className="landing-hero" id="inicio" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> FOTOGRAFÍA Y VIDEO PARA EVENTOS</p>
          <h1 id="landing-title">Cada evento<br /><span>tiene su historia.</span></h1>
          <p className="landing-lead">
            Desde celebraciones y encuentros sociales hasta shows y eventos corporativos:
            capturamos esos momentos que vale la pena volver a vivir.
          </p>
          <div className="landing-actions">
            <a className="landing-button landing-button-primary" href="#eventos">
              Explorar el portfolio <span aria-hidden="true">→</span>
            </a>
            <button className="landing-button landing-button-outline" type="button" onClick={onLogin}>
              Iniciar sesión
            </button>
          </div>
          <p className="landing-note">Historias reales. Momentos que perduran.</p>
        </div>

        <div className="landing-carousel" aria-roledescription="carrusel" aria-label="Fotografía y video de eventos">
          {heroSlides.map((slide, index) => (
            <img
              className={`landing-slide ${activeSlide === index ? 'is-active' : ''}`}
              src={slide.src}
              alt={activeSlide === index ? slide.alt : ''}
              aria-hidden={activeSlide !== index}
              key={slide.src}
            />
          ))}
          <div className="landing-carousel-shade" />
          <div className="landing-carousel-caption">
            <span>FOTOGRAFÍA · VIDEO · EVENTOS</span>
            <strong>La esencia de cada momento.</strong>
          </div>
          <div className="landing-carousel-dots" aria-label="Elegir imagen">
            {heroSlides.map((slide, index) => (
              <button
                className={activeSlide === index ? 'is-active' : ''}
                type="button"
                aria-label={`Mostrar imagen ${index + 1}`}
                aria-pressed={activeSlide === index}
                key={slide.src}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-features" id="nosotros" aria-labelledby="features-title">
        <div className="landing-section">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">HISTORIAS EN CADA ENCUENTRO</p>
            <h2 id="features-title">Un recuerdo para cada ocasión.</h2>
            <p>Una mirada atenta a la energía, las personas y los detalles de cada evento.</p>
          </div>
          <div className="landing-feature-grid">
            <article className="landing-feature">
              <span className="landing-feature-number">01</span>
              <h3>Celebraciones</h3>
              <p>Cumpleaños, fiestas y encuentros importantes con quienes más querés.</p>
            </article>
            <article className="landing-feature">
              <span className="landing-feature-number">02</span>
              <h3>Shows en vivo</h3>
              <p>La música, el escenario y la energía compartida desde todos los ángulos.</p>
            </article>
            <article className="landing-feature">
              <span className="landing-feature-number">03</span>
              <h3>Eventos corporativos</h3>
              <p>Encuentros de equipo, lanzamientos y momentos que conectan personas.</p>
            </article>
            <article className="landing-feature">
              <span className="landing-feature-number">04</span>
              <h3>Retratos y backstage</h3>
              <p>Las personas y los instantes espontáneos que suceden fuera de escena.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-events landing-section" id="eventos" aria-labelledby="events-title">
        <div className="landing-section-heading landing-section-heading-row">
          <div>
            <p className="landing-eyebrow">TRABAJOS DESTACADOS</p>
            <h2 id="events-title">Cada evento, una nueva historia.</h2>
            <p>Una selección de proyectos de fotografía y video en vivo.</p>
          </div>
          <button className="landing-text-link" type="button" onClick={onLogin}>
            Ver la galería <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="landing-event-grid">
          {featuredEvents.map((event, index) => (
            <article className="landing-event-card" key={event.title}>
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

      <section className="landing-gallery" aria-labelledby="gallery-title">
        <div className="landing-section">
          <div className="landing-section-heading landing-section-heading-row">
            <div>
              <p className="landing-eyebrow">DE LA GALERÍA</p>
              <h2 id="gallery-title">Imágenes de eventos reales.</h2>
            </div>
            <button className="landing-text-link" type="button" onClick={onLogin}>
              Entrar a la galería <span aria-hidden="true">→</span>
            </button>
          </div>
          {photoError && <p className="landing-gallery-message" role="alert">No pudimos cargar la galería: {photoError}</p>}
          {loadingPhotos ? (
            <p className="landing-gallery-message" role="status">Cargando fotos…</p>
          ) : photos.length === 0 ? (
            <p className="landing-gallery-message">Pronto vas a encontrar acá imágenes de los últimos eventos.</p>
          ) : (
            <div className="landing-photo-grid">
              {photos.map((photo) => (
                <button
                  className="landing-photo-card"
                  type="button"
                  key={photo._id || photo.id}
                  onClick={onLogin}
                  aria-label={`Iniciar sesión para ver ${photo.title}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    loading="lazy"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (image.dataset.fallback === 'true') return;
                      image.dataset.fallback = 'true';
                      image.src = '/landing/hero-2.jpg';
                    }}
                  />
                  <span className="landing-photo-caption">
                    <strong>{photo.title}</strong>
                    <span>{formatPrice.format(Number(photo.price) || 0)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="landing-contact landing-section" id="contacto" aria-labelledby="contact-title">
        <div className="landing-contact-mark" aria-hidden="true">M.</div>
        <p className="landing-eyebrow">CADA HISTORIA MERECE SER CONTADA</p>
        <h2 id="contact-title">Volvé a vivir cada momento.</h2>
        <p>Ingresá a la galería para encontrar y elegir las fotos de los eventos que compartiste.</p>
        <button className="landing-button landing-button-primary" type="button" onClick={onLogin}>
          Entrar a Memories <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}
