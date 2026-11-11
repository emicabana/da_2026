import { useEffect, useId, useMemo, useRef } from 'react';

function getPresetPath(shape, curviness = 1) {
  const c = curviness;
  switch (shape) {
    case 'arc':
      return `M -200,${210 + 40 * c} Q 720,${70 - 95 * c} 1640,${210 + 40 * c}`;
    case 'line':
      return 'M -200,170 L 1640,170';
    case 'wave':
    default:
      return `M -240,175 C 160,${55 - 50 * (c - 1)}, 520,${295 + 50 * (c - 1)}, 920,165 C 1240,${65 - 45 * (c - 1)}, 1480,255, 1720,155`;
  }
}

export default function TextLoop({
  text = 'REVELA ✦ CADA MOMENTO REVELADO ✦ ENCONTRÁ TUS FOTOS Y VIDEOS ✦ SHOWS · BODAS · EGRESOS · EVENTOS ✦',
  shape = 'wave',
  path,
  curviness = 1,
  speed = 1.35,
  direction = 'left',
  ribbon = true,
  ribbonColor = '#7c3aed',
  ribbonHeight = 76,
  color = '#ffffff',
  interactive = true,
  onClick,
  className = '',
}) {
  const rawId = useId();
  const safeId = useMemo(() => `rb-text-loop-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);

  const pathRef = useRef(null);
  const measureRef = useRef(null);
  const textPathARef = useRef(null);
  const textPathBRef = useRef(null);
  const stateRef = useRef({
    offset: 0,
    unitLength: 600,
    isDragging: false,
    startX: 0,
    lastX: 0,
    moved: 0,
    dir: direction === 'right' ? 1 : -1,
    boost: 0,
  });

  const unitString = useMemo(() => {
    const trimmed = String(text || '').trim();
    return trimmed ? `${trimmed}   ` : 'REVELA ✦ ';
  }, [text]);

  const repeatedText = useMemo(() => {
    return Array.from({ length: 8 }, () => unitString).join('');
  }, [unitString]);

  const dAttr = useMemo(() => path || getPresetPath(shape, curviness), [path, shape, curviness]);

  useEffect(() => {
    const measureEl = measureRef.current;
    const tpA = textPathARef.current;
    const tpB = textPathBRef.current;
    if (!measureEl || !tpA || !tpB) return undefined;

    const updateMeasurement = () => {
      const len = measureEl.getComputedTextLength?.() || 0;
      if (len > 20) {
        stateRef.current.unitLength = len;
      }
    };

    updateMeasurement();
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateMeasurement).catch(() => {});
    }
    window.addEventListener('resize', updateMeasurement);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;

    const tick = () => {
      const st = stateRef.current;
      const cycle = Math.max(100, st.unitLength);

      if (!st.isDragging) {
        const baseStep = prefersReducedMotion ? 0 : speed * st.dir;
        st.offset += baseStep + st.boost;
        st.boost *= 0.92;
      }

      // Wrap offset inside [-cycle, 0) so two adjacent repeated textPaths cover the entire curve seamlessly
      let wrapped = st.offset % cycle;
      if (wrapped > 0) {
        wrapped -= cycle;
      }

      tpA.setAttribute('startOffset', `${wrapped.toFixed(2)}px`);
      tpB.setAttribute('startOffset', `${(wrapped + cycle).toFixed(2)}px`);

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateMeasurement);
    };
  }, [speed, repeatedText]);

  const handlePointerDown = (event) => {
    if (!interactive) return;
    const st = stateRef.current;
    st.isDragging = true;
    st.startX = event.clientX;
    st.lastX = event.clientX;
    st.moved = 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!interactive) return;
    const st = stateRef.current;
    if (!st.isDragging) return;
    const dx = event.clientX - st.lastX;
    st.lastX = event.clientX;
    st.moved = Math.max(st.moved, Math.abs(event.clientX - st.startX));
    st.offset += dx * 1.35;
    st.boost = dx * 0.45;
    if (Math.abs(dx) > 1) {
      st.dir = dx > 0 ? 1 : -1;
    }
  };

  const handlePointerUp = () => {
    if (!interactive) return;
    const st = stateRef.current;
    if (!st.isDragging) return;
    st.isDragging = false;
    if (st.moved < 6 && typeof onClick === 'function') {
      onClick();
    }
  };

  return (
    <div
      className={`rb-text-loop ${interactive ? 'is-interactive' : ''} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={unitString.trim()}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <svg
        className="rb-text-loop-svg"
        viewBox="0 0 1440 340"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <path id={safeId} ref={pathRef} d={dAttr} fill="none" />
          <filter id={`${safeId}-glow`} x="-10%" y="-30%" width="120%" height="160%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor={ribbonColor} floodOpacity="0.42" />
          </filter>
        </defs>

        {/* Hidden measurement node for one unit cycle */}
        <text
          ref={measureRef}
          className="rb-text-loop-text"
          xmlSpace="preserve"
          style={{ opacity: 0, pointerEvents: 'none' }}
        >
          {unitString}
        </text>

        {ribbon && (
          <>
            <use
              href={`#${safeId}`}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={ribbonHeight + 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <use
              href={`#${safeId}`}
              stroke={ribbonColor}
              strokeWidth={ribbonHeight}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter={`url(#${safeId}-glow)`}
            />
          </>
        )}

        <text
          className="rb-text-loop-text"
          fill={color}
          dominantBaseline="central"
          xmlSpace="preserve"
        >
          <textPath ref={textPathARef} href={`#${safeId}`} startOffset="0px">
            {repeatedText}
          </textPath>
          <textPath ref={textPathBRef} href={`#${safeId}`} startOffset="600px">
            {repeatedText}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
