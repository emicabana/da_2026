import { useEffect, useMemo, useRef } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseTokens(textContent) {
  const raw = textContent.split(/(\s+)/).filter((token) => token.length > 0);
  const result = [];
  let wordCounter = 0;

  for (let idx = 0; idx < raw.length; idx += 1) {
    const token = raw[idx];
    if (/^\s+$/.test(token)) {
      result.push({ key: idx, text: token, isSpace: true, wordIndex: -1 });
    } else {
      result.push({ key: idx, text: token, isSpace: false, wordIndex: wordCounter });
      wordCounter += 1;
    }
  }

  return result;
}

export default function ScrollReveal({
  children,
  as: Component = 'div',
  id,
  baseOpacity = 0.1,
  enableBlur = true,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 0.55,
  wordAnimationEnd = 0.48,
  animateOnMount = false,
}) {
  const containerRef = useRef(null);
  const wordRefs = useRef([]);

  const textContent = useMemo(() => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
      return children
        .map((child) => (typeof child === 'string' ? child : ' '))
        .join('');
    }
    return String(children ?? '');
  }, [children]);

  const parsedTokens = useMemo(() => parseTokens(textContent), [textContent]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const words = wordRefs.current.filter(Boolean);
    const totalWords = Math.max(1, words.length);

    if (prefersReducedMotion) {
      el.style.transform = 'rotate(0deg)';
      words.forEach((wordEl) => {
        wordEl.style.opacity = '1';
        wordEl.style.filter = 'blur(0px)';
      });
      return undefined;
    }

    let rafId = 0;
    let mountRafId = 0;
    let mountProgress = animateOnMount ? 0 : 1;
    const mountStart = performance.now();
    const mountDuration = 1150;

    const applyProgress = (rotProgress, wordProgressOverall) => {
      const currentRotation = baseRotation * (1 - rotProgress);
      el.style.transformOrigin = '0% 50%';
      el.style.transform = `rotate(${currentRotation.toFixed(2)}deg)`;

      const staggerSpan = 0.66;
      const wordDuration = 1 - staggerSpan;

      for (let i = 0; i < words.length; i += 1) {
        const wordEl = words[i];
        if (!wordEl) continue;

        const ratio = totalWords > 1 ? i / (totalWords - 1) : 0;
        const start = ratio * staggerSpan;
        const local = clamp((wordProgressOverall - start) / wordDuration, 0, 1);
        const eased = 1 - (1 - local) * (1 - local);

        const opacity = baseOpacity + eased * (1 - baseOpacity);
        wordEl.style.opacity = opacity.toFixed(3);

        if (enableBlur) {
          const blur = (1 - eased) * blurStrength;
          wordEl.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'blur(0px)';
        } else {
          wordEl.style.filter = 'none';
        }
      }
    };

    const updateScrollReveal = () => {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

      const startY = vh * 0.95;
      const rotEndY = vh * rotationEnd;
      const wordEndY = vh * wordAnimationEnd;

      let rotProgress = (startY - rect.top) / Math.max(1, startY - rotEndY);
      let wordProgressOverall = (startY - rect.top) / Math.max(1, startY - wordEndY);

      if (animateOnMount) {
        rotProgress = Math.max(rotProgress, mountProgress);
        wordProgressOverall = Math.max(wordProgressOverall, mountProgress);
      }

      if (maxScroll > 0 && scrollTop >= maxScroll - 140) {
        const bottomBoost = clamp((scrollTop - (maxScroll - 220)) / 220, 0, 1);
        rotProgress = Math.max(rotProgress, bottomBoost);
        wordProgressOverall = Math.max(wordProgressOverall, bottomBoost);
      }

      rotProgress = clamp(rotProgress, 0, 1);
      wordProgressOverall = clamp(wordProgressOverall, 0, 1);

      applyProgress(rotProgress, wordProgressOverall);
    };

    const scheduleUpdate = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScrollReveal);
      }
    };

    if (animateOnMount) {
      const tickMount = (now) => {
        const elapsed = now - mountStart;
        mountProgress = clamp(elapsed / mountDuration, 0, 1);
        updateScrollReveal();
        if (mountProgress < 1) {
          mountRafId = window.requestAnimationFrame(tickMount);
        }
      };
      mountRafId = window.requestAnimationFrame(tickMount);
    } else {
      updateScrollReveal();
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (mountRafId) window.cancelAnimationFrame(mountRafId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [
    animateOnMount,
    baseOpacity,
    enableBlur,
    baseRotation,
    blurStrength,
    rotationEnd,
    wordAnimationEnd,
    parsedTokens,
  ]);

  return (
    <Component
      ref={containerRef}
      id={id}
      className={`rb-scroll-reveal ${containerClassName}`.trim()}
    >
      <span className={`rb-scroll-reveal-text ${textClassName}`.trim()}>
        {parsedTokens.map((item) => {
          if (item.isSpace) {
            return item.text;
          }
          return (
            <span
              key={item.key}
              ref={(node) => {
                wordRefs.current[item.wordIndex] = node;
              }}
              className="rb-scroll-reveal-word"
            >
              {item.text}
            </span>
          );
        })}
      </span>
    </Component>
  );
}
