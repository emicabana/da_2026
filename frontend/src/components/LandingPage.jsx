import { useEffect, useRef } from 'react';
import CircularCarousel from './CircularCarousel';
import ScrollReveal from './ScrollReveal';
import SideRays from './SideRays';
import WarpText from './WarpText';

const marqueePhrases = [
  'CADA MOMENTO, REVELADO',
  'FOTOGRAFÍA Y VIDEO DE EVENTOS',
  'RECITALES · BODAS · EGRESOS · CELEBRACIONES',
  'ENCONTRÁ TUS FOTOS EN SEGUNDOS',
  'GALERÍAS OFICIALES EN ALTA RESOLUCIÓN',
  'HISTORIAS REALES QUE PERDURAN',
];

const featuredEvents = [
  {
    image: '',
    category: 'MÚSICA EN VIVO · INDIOS X SESSION PRO',
    title: 'La energía de un show',
    description: 'La fuerza de la música en vivo, contada desde el escenario y entre el público.',
  },
  {
    image: '',
    category: 'AFTERMOVIE · SESSION PRO',
    title: 'Session Pro x Q’Lokura',
    description: 'Luces, música y todos esos instantes que hacen único a cada espectáculo.',
  },
  {
    image: '',
    category: 'BACKSTAGE · SESSION PRO X Q’LOKURA',
    title: 'Lo que pasa detrás de escena',
    description: 'Una mirada cercana a las personas y los momentos detrás de cada evento.',
  },
  {
    image: '',
    category: 'CELEBRACIONES · GALERÍAS EN VIVO',
    title: 'Noches que quedan para siempre',
    description: 'Encontrá tus retratos y momentos espontáneos junto a quienes compartieron la fecha.',
  },
  {
    image: '',
    category: 'ESCENARIO · COBERTURA OFICIAL',
    title: 'Cada ángulo del recital',
    description: 'Tomas de alta velocidad bajo las luces del show y la emoción del público.',
  },
  {
    image: '',
    category: 'SOCIALES · EGRESOS · FIESTAS',
    title: 'Historias reales en alta calidad',
    description: 'Descargá tus fotos favoritas directamente del álbum oficial de cada fotógrafo.',
  },
];

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

export default function LandingPage({ onLogin }) {
  const landingRef = useRef(null);

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

  return (
    <div className="landing-page" ref={landingRef}>
      <SideRays
        rayColor1="#ffffff"
        rayColor2="#7c3aed"
        blend={0.6}
        origin="top-right"
        speed={2.5}
        intensity={2}
        spread={2}
        followMouse
      />
      <section className="landing-hero landing-hero-centered" id="inicio" aria-labelledby="landing-title">
        <div className="landing-hero-copy landing-hero-copy-centered" data-reveal="rise">
          <p className="landing-eyebrow"><span /> FOTOS Y VIDEOS DE EVENTOS</p>
          <WarpText
            id="landing-title"
            topLine="Cada momento,"
            bottomLine="REVELADO."
          />
          <ScrollReveal
            as="p"
            containerClassName="landing-lead"
            baseOpacity={0.1}
            enableBlur
            baseRotation={3}
            blurStrength={4}
            animateOnMount
          >
            Encontrá tus fotos y videos del casamiento, del egreso o del recital en los álbumes que publican los fotógrafos del evento.
          </ScrollReveal>
          <div className="landing-actions">
            <button className="landing-button landing-button-primary" type="button" onClick={onLogin} onPointerMove={handleMagneticPointerMove} onPointerLeave={resetPointerEffects}>
              Buscar mi evento
            </button>
            <button className="landing-button landing-button-outline" type="button" onClick={onLogin} onPointerMove={handleMagneticPointerMove} onPointerLeave={resetPointerEffects}>
              Soy fotógrafo
            </button>
          </div>
          <ScrollReveal
            as="p"
            containerClassName="landing-note"
            baseOpacity={0.1}
            enableBlur
            baseRotation={2}
            blurStrength={4}
            animateOnMount
          >
            Historias reales. Momentos que perduran.
          </ScrollReveal>
        </div>
      </section>

      <div className="landing-marquee-strip" aria-label="Franja informativa de Revela">
        <div className="landing-marquee-track">
          {[0, 1].map((copyIndex) => (
            <div className="landing-marquee-group" key={copyIndex} aria-hidden={copyIndex === 1 ? 'true' : undefined}>
              {marqueePhrases.map((phrase) => (
                <span className="landing-marquee-item" key={`${copyIndex}-${phrase}`}>
                  <span>{phrase}</span>
                  <span className="landing-marquee-separator" aria-hidden="true">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="landing-features landing-features-plain" id="nosotros" aria-labelledby="features-title">
        <div className="landing-section landing-scroll-reveal-showcase">
          <ScrollReveal
            as="p"
            containerClassName="landing-eyebrow"
            baseOpacity={0.1}
            enableBlur
            baseRotation={2}
            blurStrength={4}
          >
            HISTORIAS EN CADA ENCUENTRO
          </ScrollReveal>
          <ScrollReveal
            as="h2"
            id="features-title"
            containerClassName="landing-scroll-reveal-statement"
            baseOpacity={0.1}
            enableBlur
            baseRotation={3}
            blurStrength={4}
          >
            Un recuerdo para cada ocasión. Capturamos la energía, las personas y los detalles de cada celebración, recital y encuentro para que vuelvas a vivirlos cuando quieras.
          </ScrollReveal>
        </div>
      </section>

      <section className="landing-events landing-section" id="eventos" aria-labelledby="events-title">
        <div className="landing-section-heading landing-section-heading-row">
          <div>
            <ScrollReveal
              as="p"
              containerClassName="landing-eyebrow"
              baseOpacity={0.1}
              enableBlur
              baseRotation={2}
              blurStrength={4}
            >
              ÁLBUMES RECIENTES
            </ScrollReveal>
            <ScrollReveal
              as="h2"
              id="events-title"
              baseOpacity={0.1}
              enableBlur
              baseRotation={3}
              blurStrength={4}
            >
              Cada evento, una nueva historia.
            </ScrollReveal>
            <ScrollReveal
              as="p"
              baseOpacity={0.1}
              enableBlur
              baseRotation={3}
              blurStrength={4}
            >
              Una selección de proyectos de fotografía y video en vivo.
            </ScrollReveal>
          </div>
          <button className="landing-text-link" type="button" onClick={onLogin}>
            Ver álbumes <span aria-hidden="true">→</span>
          </button>
        </div>

        <CircularCarousel
          items={featuredEvents}
          onSelect={onLogin}
        />
      </section>

      <section className="landing-contact landing-contact-organizer landing-section" id="contacto" aria-labelledby="contact-title" data-reveal="rise">
        <p className="landing-contact-kicker">
          <span aria-hidden="true">✦</span> CONTACTO
        </p>

        <ScrollReveal
          as="h2"
          id="contact-title"
          containerClassName="landing-contact-organizer-title"
          baseOpacity={0.1}
          enableBlur
          baseRotation={2}
          blurStrength={4}
        >
          ¿ORGANIZÁS UN EVENTO?
        </ScrollReveal>

        <ScrollReveal
          as="p"
          containerClassName="landing-contact-organizer-copy"
          baseOpacity={0.1}
          enableBlur
          baseRotation={2}
          blurStrength={4}
        >
          Creamos y centralizamos coberturas fotográficas y audiovisuales para shows en vivo, celebraciones, bodas, egresos y eventos corporativos, pensadas para capturar la experiencia completa de los asistentes y potenciar la identidad de cada fecha. Desde la planificación y distribución del equipo de fotógrafos hasta la publicación del álbum y la entrega de las fotografías en alta resolución, desarrollamos una propuesta adaptada a cada evento y organización. Vos creás el momento. Nosotros nos encargamos de revelarlo.
        </ScrollReveal>

        <div className="landing-contact-organizer-actions">
          <a
            className="landing-contact-btn landing-contact-btn-whatsapp"
            href="https://wa.me/5492645029031?text=Hola%20Fede%2C%20quiero%20consultar%20por%20la%20cobertura%20de%20un%20evento"
            target="_blank"
            rel="noopener noreferrer"
            onPointerMove={handleMagneticPointerMove}
            onPointerLeave={resetPointerEffects}
          >
            ESCRIBINOS POR WHATSAPP
          </a>
          <a
            className="landing-contact-btn landing-contact-btn-email"
            href="mailto:contacto@revela.com?subject=Consulta%20por%20cobertura%20de%20evento"
            onPointerMove={handleMagneticPointerMove}
            onPointerLeave={resetPointerEffects}
          >
            ENVIAR EMAIL
          </a>
        </div>
      </section>
    </div>
  );
}
