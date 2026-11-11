import { useCallback, useEffect, useRef, useState } from 'react';

const PlaceholderGradients = [
  'linear-gradient(145deg, #2d1254 0%, #582196 52%, #190933 100%)',
  'linear-gradient(145deg, #230f45 0%, #6d28d9 50%, #15082b 100%)',
  'linear-gradient(145deg, #34135e 0%, #4c1d95 52%, #130726 100%)',
  'linear-gradient(145deg, #28104a 0%, #6025c0 50%, #17092e 100%)',
  'linear-gradient(145deg, #311458 0%, #531f99 52%, #140829 100%)',
  'linear-gradient(145deg, #261147 0%, #7c3aed 50%, #16092c 100%)',
];

function shortestAngleDiff(from, to) {
  const twoPi = Math.PI * 2;
  return ((((to - from) % twoPi) + Math.PI * 3) % twoPi) - Math.PI;
}

function normalizePositiveIndex(index, count) {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

export default function CircularCarousel({
  items = [],
  radius = 480,
  cardWidth = 340,
  cardHeight = 420,
  bend = 0.85,
  autoplay = true,
  autoplayInterval = 3800,
  onSelect,
}) {
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const stateRef = useRef({
    angle: 0,
    targetAngle: 0,
    velocity: 0,
    isDragging: false,
    isHovered: false,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    dragDistance: 0,
    activeIndex: 0,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const count = items.length;
  const stepAngle = count > 0 ? (Math.PI * 2) / count : 1;

  const snapToIndex = useCallback(
    (index) => {
      if (count <= 0) return;
      const normalized = normalizePositiveIndex(index, count);
      const st = stateRef.current;
      const desiredAngle = normalized * stepAngle;
      const diff = shortestAngleDiff(st.targetAngle, desiredAngle);
      st.targetAngle += diff;
      st.velocity = 0;
    },
    [count, stepAngle]
  );

  useEffect(() => {
    if (!autoplay || count <= 1) return undefined;
    const timer = window.setInterval(() => {
      const st = stateRef.current;
      if (st.isDragging || st.isHovered) return;
      const currentIdx = Math.round(st.targetAngle / stepAngle);
      st.targetAngle = (currentIdx + 1) * stepAngle;
    }, autoplayInterval);

    return () => window.clearInterval(timer);
  }, [autoplay, autoplayInterval, count, stepAngle]);

  useEffect(() => {
    if (count === 0) return undefined;
    let rafId = 0;

    const animate = () => {
      const st = stateRef.current;
      const stageWidth = stageRef.current ? stageRef.current.clientWidth : 1100;
      const responsiveScale = Math.min(1, Math.max(0.62, stageWidth / 1140));
      const effectiveRadius = radius * responsiveScale;

      if (!st.isDragging) {
        if (Math.abs(st.velocity) > 0.00025) {
          st.targetAngle += st.velocity;
          st.velocity *= 0.91;
          if (Math.abs(st.velocity) <= 0.00025) {
            st.velocity = 0;
            st.targetAngle = Math.round(st.targetAngle / stepAngle) * stepAngle;
          }
        } else {
          const snapped = Math.round(st.targetAngle / stepAngle) * stepAngle;
          st.targetAngle += (snapped - st.targetAngle) * 0.14;
        }
      }

      st.angle += (st.targetAngle - st.angle) * 0.1;

      const nearestIndex = normalizePositiveIndex(
        Math.round(st.angle / stepAngle),
        count
      );
      if (nearestIndex !== st.activeIndex) {
        st.activeIndex = nearestIndex;
        setActiveIndex(nearestIndex);
      }

      for (let i = 0; i < count; i += 1) {
        const cardEl = cardRefs.current[i];
        if (!cardEl) continue;

        const itemAngle = i * stepAngle;
        const theta = shortestAngleDiff(st.angle, itemAngle);

        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        const x = sinT * effectiveRadius;
        const z = (cosT - 1) * (effectiveRadius * 0.78);
        const rotateY = theta * (180 / Math.PI) * bend;
        const rotateZ = -sinT * 3.5;

        const depthNorm = (cosT + 1) * 0.5;
        const scale = (0.74 + 0.26 * Math.pow(depthNorm, 1.15)) * responsiveScale;
        const opacity = 0.22 + 0.78 * Math.pow(depthNorm, 1.35);
        const brightness = 0.52 + 0.48 * Math.pow(depthNorm, 1.2);
        const zIndex = Math.round(depthNorm * 100);

        cardEl.style.transform = `translate3d(-50%, -50%, 0) translate3d(${x.toFixed(
          2
        )}px, 0px, ${z.toFixed(2)}px) rotateY(${rotateY.toFixed(
          2
        )}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        cardEl.style.opacity = opacity.toFixed(3);
        cardEl.style.filter = `brightness(${brightness.toFixed(3)})`;
        cardEl.style.zIndex = String(zIndex);
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafId);
  }, [bend, count, radius, stepAngle]);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const st = stateRef.current;
    st.isDragging = true;
    st.startX = event.clientX;
    st.lastX = event.clientX;
    st.lastTime = performance.now();
    st.dragDistance = 0;
    st.velocity = 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    const now = performance.now();
    const dx = event.clientX - st.lastX;
    const dt = Math.max(8, now - st.lastTime);

    st.dragDistance += Math.abs(dx);
    const dragSensitivity = 0.0042;
    const deltaAngle = -dx * dragSensitivity;

    st.targetAngle += deltaAngle;
    st.velocity = (deltaAngle / dt) * 14;

    st.lastX = event.clientX;
    st.lastTime = now;
  };

  const handlePointerUp = () => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    st.isDragging = false;
    if (Math.abs(st.velocity) < 0.002) {
      st.velocity = 0;
      st.targetAngle = Math.round(st.targetAngle / stepAngle) * stepAngle;
    }
  };

  const handleCardClick = (index) => {
    const st = stateRef.current;
    if (st.dragDistance > 8) return;

    if (index === activeIndex) {
      if (onSelect) onSelect(items[index], index);
    } else {
      snapToIndex(index);
    }
  };

  const currentItem = items[activeIndex] || items[0];
  const paddedActive = String(activeIndex + 1).padStart(2, '0');
  const paddedTotal = String(count).padStart(2, '0');

  return (
    <div
      className="rb-circular-carousel"
      onMouseEnter={() => {
        stateRef.current.isHovered = true;
      }}
      onMouseLeave={() => {
        stateRef.current.isHovered = false;
      }}
    >
      <div
        ref={stageRef}
        className="rb-circular-carousel-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="rb-circular-carousel-ring">
          {items.map((item, idx) => {
            const isCurrent = idx === activeIndex;
            const numLabel = String(idx + 1).padStart(2, '0');
            const bgGradient =
              PlaceholderGradients[idx % PlaceholderGradients.length];

            return (
              <div
                key={item.title || idx}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                role="button"
                tabIndex={0}
                aria-label={item.title || `Evento ${numLabel}`}
                className={`rb-circular-carousel-card ${
                  isCurrent ? 'is-active' : ''
                }`}
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                }}
                onClick={() => handleCardClick(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(idx);
                  }
                }}
              >
                <div
                  className="rb-circular-carousel-card-media"
                  style={{ background: bgGradient }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title || ''}
                      draggable={false}
                    />
                  ) : (
                    <div className="rb-circular-carousel-card-placeholder">
                      <div className="rb-circular-carousel-card-glow" />
                    </div>
                  )}
                  <span className="rb-circular-carousel-card-index">
                    {numLabel}
                  </span>
                </div>

                <div className="rb-circular-carousel-card-body">
                  {item.category && (
                    <span className="rb-circular-carousel-card-kicker">
                      {item.category}
                    </span>
                  )}
                  <h3 className="rb-circular-carousel-card-title">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="rb-circular-carousel-card-desc">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rb-circular-carousel-footer">
        <div className="rb-circular-carousel-controls">
          <button
            type="button"
            className="rb-circular-carousel-nav-btn"
            aria-label="Evento anterior"
            onClick={() => snapToIndex(activeIndex - 1)}
          >
            ←
          </button>

          <div className="rb-circular-carousel-dots" role="tablist">
            {items.map((item, idx) => (
              <button
                key={item.title || idx}
                type="button"
                role="tab"
                aria-selected={idx === activeIndex}
                aria-label={`Ir al evento ${idx + 1}`}
                className={`rb-circular-carousel-dot ${
                  idx === activeIndex ? 'is-active' : ''
                }`}
                onClick={() => snapToIndex(idx)}
              />
            ))}
          </div>

          <span className="rb-circular-carousel-counter">
            <strong>{paddedActive}</strong> / {paddedTotal}
          </span>

          <button
            type="button"
            className="rb-circular-carousel-nav-btn"
            aria-label="Siguiente evento"
            onClick={() => snapToIndex(activeIndex + 1)}
          >
            →
          </button>
        </div>

        {currentItem && onSelect && (
          <button
            type="button"
            className="landing-text-link rb-circular-carousel-cta"
            onClick={() => onSelect(currentItem, activeIndex)}
          >
            Encontrar mis fotos <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
    </div>
  );
}
