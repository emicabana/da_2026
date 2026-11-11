import { useCallback, useEffect, useRef, useState } from 'react';

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  attribute vec2 aUv;

  uniform vec2 uResolution;
  uniform vec2 uCardSize;
  uniform float uCardX;
  uniform float uBend;
  uniform float uTilt;
  uniform float uReach;

  varying vec2 vUv;
  varying float vScreenNormX;
  varying float vCurveAmount;

  void main() {
    vUv = aUv;

    // Continuous world-space coordinates (in pixels, origin at stage center)
    // Using ONLY worldX and worldY guarantees adjacent cards share the exact same smooth curve with zero kinks.
    float worldX = uCardX + aPosition.x * (uCardSize.x * 0.5);
    float worldY = aPosition.y * (uCardSize.y * 0.5);

    float halfW = max(uResolution.x * 0.5, 300.0);
    float halfH = max(uResolution.y * 0.5, 200.0);

    // Normalized horizontal position across the stage (-1 at left edge, +1 at right edge)
    float nx = worldX / halfW;
    float absNx = abs(nx);
    float side = sign(nx);

    // Flat central zone where cards sit on a straight horizontal baseline
    float flatZone = clamp(0.28 / max(0.5, uReach), 0.14, 0.36);
    float t = max(0.0, (absNx - flatZone) / max(0.001, 1.0 - flatZone));

    // Smooth progressive S-curve envelope
    float curve = pow(t, 2.05) * uBend;
    float slope = 2.05 * pow(max(t, 0.0001), 1.05) * uBend;

    // Right side (side > 0) sweeps smoothly UPWARD (negative Y in screen space);
    // Left side (side < 0) sweeps smoothly DOWNWARD (positive Y in screen space).
    float centerlineY = -side * curve * (halfH * 0.64);

    // Fan/expand card height slightly along the outer curve and tilt perpendicular to the curve tangent
    float verticalFan = 1.0 + curve * 0.24;
    float normY = worldY / max(1.0, uCardSize.y * 0.5);
    float tangentShearX = -normY * slope * (halfH * 0.16) * uTilt;

    // Slight horizontal compression near the extreme edges
    float edgePullX = -side * pow(t, 2.4) * (halfW * 0.06);

    float finalX = worldX + tangentShearX + edgePullX;
    float finalY = worldY * verticalFan + centerlineY;

    vScreenNormX = finalX / halfW;
    vCurveAmount = clamp(t, 0.0, 1.2);

    vec2 clipSpace = vec2(finalX / halfW, -finalY / halfH);
    gl_Position = vec4(clipSpace, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 vUv;
  varying float vScreenNormX;
  varying float vCurveAmount;

  uniform sampler2D uTexture;
  uniform vec2 uCardSize;
  uniform vec2 uImageSize;
  uniform float uRadius;

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 halfSize = uCardSize * 0.5;
    vec2 pixelPos = (vUv - 0.5) * uCardSize;
    float dist = sdRoundedBox(pixelPos, halfSize - 0.5, uRadius);

    float alpha = 1.0 - smoothstep(-0.8, 0.8, dist);
    if (alpha <= 0.005) discard;

    // Aspect-correct cover UV
    float cardAspect = uCardSize.x / max(1.0, uCardSize.y);
    float imgAspect = uImageSize.x / max(1.0, uImageSize.y);
    vec2 scale = vec2(1.0);
    if (cardAspect > imgAspect) {
      scale.y = imgAspect / cardAspect;
    } else {
      scale.x = cardAspect / imgAspect;
    }

    vec2 baseUv = (vUv - 0.5) * scale + 0.5;

    // Invisible liquid-glass refraction & RGB chromatic dispersion at the far left/right viewport edges
    float absEdge = abs(vScreenNormX);
    float glassZone = smoothstep(0.76, 0.99, absEdge);
    float glassPower = glassZone * glassZone;

    // Subtle horizontal fluted-glass ripple + multi-sample chromatic dispersion at the edges
    float flute = sin(vUv.y * 42.0 + vScreenNormX * 18.0) * 0.008 * glassPower;
    float disp = glassPower * 0.048 + flute;

    vec2 uvR1 = clamp(baseUv + vec2(disp * 1.15, 0.0), 0.0, 1.0);
    vec2 uvR2 = clamp(baseUv + vec2(disp * 0.65, 0.0), 0.0, 1.0);
    vec2 uvG  = clamp(baseUv + vec2(flute * 0.5, 0.0), 0.0, 1.0);
    vec2 uvB1 = clamp(baseUv - vec2(disp * 0.65, 0.0), 0.0, 1.0);
    vec2 uvB2 = clamp(baseUv - vec2(disp * 1.15, 0.0), 0.0, 1.0);

    float r = 0.55 * texture2D(uTexture, uvR1).r + 0.45 * texture2D(uTexture, uvR2).r;
    float g = texture2D(uTexture, uvG).g;
    float b = 0.55 * texture2D(uTexture, uvB1).b + 0.45 * texture2D(uTexture, uvB2).b;

    vec3 color = vec3(r, g, b);

    // Subtle specular glass highlight right inside the edge refraction zone
    float edgeHighlight = smoothstep(0.78, 0.93, absEdge) * (1.0 - smoothstep(0.94, 1.0, absEdge));
    color += vec3(0.95, 0.88, 1.0) * edgeHighlight * 0.14;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Varied editorial card aspect ratios (square, portrait, landscape) matching ReactBits FlexCarousel
const CARD_ASPECTS = [1.0, 0.76, 1.34, 0.88, 1.24, 0.8];

const PLACEHOLDER_PALETTES = [
  ['#2d1254', '#6d28d9', '#1b0936'],
  ['#1b0c38', '#4c1d95', '#110624'],
  ['#3b1566', '#7c3aed', '#220b3d'],
  ['#251047', '#5b21b6', '#15072b'],
  ['#33125c', '#70249f', '#1c0933'],
  ['#1f0e3d', '#522296', '#130626'],
];

function createPlaceholderCanvas(index) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const [c1, c2, c3] = PLACEHOLDER_PALETTES[index % PLACEHOLDER_PALETTES.length];
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.52, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const radial = ctx.createRadialGradient(
    canvas.width * 0.68,
    canvas.height * 0.28,
    12,
    canvas.width * 0.68,
    canvas.height * 0.28,
    canvas.width * 0.65
  );
  radial.addColorStop(0, 'rgba(232, 200, 255, 0.24)');
  radial.addColorStop(1, 'rgba(232, 200, 255, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createSubdividedPlane(segmentsX = 40, segmentsY = 20) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let y = 0; y <= segmentsY; y += 1) {
    const v = y / segmentsY;
    const py = (v - 0.5) * 2.0;
    for (let x = 0; x <= segmentsX; x += 1) {
      const u = x / segmentsX;
      const px = (u - 0.5) * 2.0;
      positions.push(px, py);
      uvs.push(u, v);
    }
  }

  const rowVerts = segmentsX + 1;
  for (let y = 0; y < segmentsY; y += 1) {
    for (let x = 0; x < segmentsX; x += 1) {
      const a = y * rowVerts + x;
      const b = a + 1;
      const c = a + rowVerts;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

function wrapOffset(value, totalSpan) {
  if (totalSpan <= 0) return value;
  const half = totalSpan * 0.5;
  return ((((value + half) % totalSpan) + totalSpan) % totalSpan) - half;
}

export default function FlexCarousel({
  items = [],
  bend = 1.0,
  tilt = 1.0,
  reach = 1.0,
  gap = 16,
  radius = 2,
  autoplay = true,
  autoplayInterval = 3200,
  captions = true,
  onSelect,
  onChange,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    scroll: 0,
    targetScroll: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartScroll: 0,
    movedDistance: 0,
    isHovered: false,
    activeIndex: 0,
    layout: {
      cardH: 300,
      widths: [],
      centers: [],
      totalSpan: 1800,
    },
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [webglReady] = useState(() => {
    if (typeof document === 'undefined') return true;
    try {
      const testCanvas = document.createElement('canvas');
      return Boolean(testCanvas.getContext('webgl'));
    } catch {
      return false;
    }
  });

  const count = items.length;

  const snapToCardIndex = useCallback(
    (index) => {
      if (count === 0) return;
      const st = stateRef.current;
      const { centers, totalSpan } = st.layout;
      if (!centers.length || totalSpan <= 0) return;
      const targetCenter = centers[index] || 0;
      const currentWrapped = wrapOffset(st.targetScroll, totalSpan);
      const desired = -targetCenter;
      const diff = wrapOffset(desired - currentWrapped, totalSpan);
      st.targetScroll += diff;
    },
    [count]
  );

  useEffect(() => {
    if (!autoplay || count <= 1) return undefined;
    const timer = window.setInterval(() => {
      const st = stateRef.current;
      if (st.isDragging || st.isHovered) return;
      const nextIdx = (st.activeIndex + 1) % count;
      snapToCardIndex(nextIdx);
    }, autoplayInterval);

    return () => window.clearInterval(timer);
  }, [autoplay, autoplayInterval, count, snapToCardIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || count === 0) return undefined;

    let gl = null;
    let program = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      });
      if (!gl) {
        return undefined;
      }
      program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
      if (!program) {
        return undefined;
      }
    } catch {
      return undefined;
    }

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = createSubdividedPlane(40, 20);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);
    const aUv = gl.getAttribLocation(program, 'aUv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uCardSize = gl.getUniformLocation(program, 'uCardSize');
    const uCardX = gl.getUniformLocation(program, 'uCardX');
    const uBend = gl.getUniformLocation(program, 'uBend');
    const uTilt = gl.getUniformLocation(program, 'uTilt');
    const uReach = gl.getUniformLocation(program, 'uReach');
    const uTexture = gl.getUniformLocation(program, 'uTexture');
    const uImageSize = gl.getUniformLocation(program, 'uImageSize');
    const uRadius = gl.getUniformLocation(program, 'uRadius');

    const textures = items.map((item, idx) => {
      const tex = gl.createTexture();
      const placeholder = createPlaceholderCanvas(idx);
      const meta = {
        tex,
        width: placeholder.width,
        height: placeholder.height,
        aspect: item?.aspect || CARD_ASPECTS[idx % CARD_ASPECTS.length],
      };
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

      const src = typeof item === 'string' ? item : item?.image;
      if (src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          meta.width = img.naturalWidth || 800;
          meta.height = img.naturalHeight || 600;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        };
        img.src = src;
      }
      return meta;
    });

    let width = 1;
    let height = 1;

    const computeLayout = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(320, Math.round(rect.width));
      height = Math.max(300, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Uniform card height across the row so top and bottom edges align seamlessly
      const cardH = Math.round(Math.min(height * 0.56, Math.max(200, width * 0.25)));
      const widths = textures.map((t) => Math.round(cardH * t.aspect));
      const centers = [];
      let cursor = 0;

      for (let i = 0; i < count; i += 1) {
        if (i === 0) {
          centers.push(0);
          cursor = widths[0] * 0.5 + gap;
        } else {
          const w = widths[i];
          const c = cursor + w * 0.5;
          centers.push(c);
          cursor += w + gap;
        }
      }

      const totalSpan = cursor + widths[0] * 0.5;
      stateRef.current.layout = { cardH, widths, centers, totalSpan };
    };

    computeLayout();
    window.addEventListener('resize', computeLayout);

    let rafId = 0;

    const render = () => {
      const st = stateRef.current;
      const { cardH, widths, centers, totalSpan } = st.layout;

      st.scroll += (st.targetScroll - st.scroll) * 0.095;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uBend, bend);
      gl.uniform1f(uTilt, tilt);
      gl.uniform1f(uReach, reach);
      gl.uniform1f(uRadius, radius);
      gl.uniform1i(uTexture, 0);

      let closestIdx = 0;
      let minAbsX = Infinity;

      for (let i = 0; i < count; i += 1) {
        const wrappedX = wrapOffset(centers[i] + st.scroll, totalSpan);
        const absX = Math.abs(wrappedX);
        if (absX < minAbsX) {
          minAbsX = absX;
          closestIdx = i;
        }
      }

      if (closestIdx !== st.activeIndex) {
        st.activeIndex = closestIdx;
        setActiveIndex(closestIdx);
        if (typeof onChange === 'function') {
          onChange(closestIdx, items[closestIdx]);
        }
      }

      const minCopies = Math.max(1, Math.ceil((width * 1.5) / Math.max(1, totalSpan)));
      const drawList = [];

      for (let copy = -minCopies; copy <= minCopies; copy += 1) {
        for (let i = 0; i < count; i += 1) {
          const baseWrapped = wrapOffset(centers[i] + st.scroll, totalSpan);
          const x = baseWrapped + copy * totalSpan;
          if (copy !== 0 && Math.abs(x - baseWrapped) < 1) continue;

          const cardW = widths[i];
          const absX = Math.abs(x);
          if (absX > width * 0.72 + cardW) continue;

          drawList.push({ index: i, x, absX, cardW });
        }
      }

      // Draw from outside in
      drawList.sort((a, b) => b.absX - a.absX);

      for (let i = 0; i < drawList.length; i += 1) {
        const card = drawList[i];
        const texMeta = textures[card.index];
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texMeta.tex);
        gl.uniform2f(uCardSize, card.cardW, cardH);
        gl.uniform2f(uImageSize, texMeta.width, texMeta.height);
        gl.uniform1f(uCardX, card.x);

        gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', computeLayout);
      textures.forEach((t) => gl.deleteTexture(t.tex));
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
    };
  }, [items, count, bend, tilt, reach, gap, radius, onChange]);

  const handlePointerDown = (event) => {
    const st = stateRef.current;
    st.isDragging = true;
    st.dragStartX = event.clientX;
    st.dragStartScroll = st.targetScroll;
    st.movedDistance = 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    const deltaX = event.clientX - st.dragStartX;
    st.movedDistance = Math.max(st.movedDistance, Math.abs(deltaX));
    st.targetScroll = st.dragStartScroll + deltaX * 1.15;
  };

  const handlePointerUp = (event) => {
    const st = stateRef.current;
    if (!st.isDragging) return;
    st.isDragging = false;

    const { centers, totalSpan } = st.layout;
    if (!centers.length || totalSpan <= 0) return;

    if (st.movedDistance < 8) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - (rect.left + rect.width * 0.5);

      let clickedIdx = st.activeIndex;
      let bestDist = Infinity;
      for (let i = 0; i < count; i += 1) {
        const cardX = wrapOffset(centers[i] + st.scroll, totalSpan);
        const d = Math.abs(clickX - cardX);
        if (d < bestDist) {
          bestDist = d;
          clickedIdx = i;
        }
      }

      if (clickedIdx === st.activeIndex && bestDist < 140) {
        onSelect?.(items[clickedIdx], clickedIdx);
      } else {
        snapToCardIndex(clickedIdx);
      }
      return;
    }

    // Snap to closest card center after dragging
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < count; i += 1) {
      const wrappedX = wrapOffset(centers[i] + st.targetScroll, totalSpan);
      const d = Math.abs(wrappedX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    snapToCardIndex(bestIdx);
  };

  const handlePointerEnter = () => {
    stateRef.current.isHovered = true;
  };

  const handlePointerLeave = () => {
    stateRef.current.isHovered = false;
  };

  const currentItem = items[activeIndex] || items[0];
  const paddedActive = String(activeIndex + 1).padStart(2, '0');
  const paddedTotal = String(count).padStart(2, '0');

  return (
    <div className="rb-flex-carousel-wrapper">
      <div
        ref={containerRef}
        className="rb-flex-carousel-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {webglReady ? (
          <canvas ref={canvasRef} className="rb-flex-carousel-canvas" />
        ) : (
          <div className="rb-flex-carousel-fallback">
            {items.map((item, idx) => (
              <button
                key={item.title || idx}
                type="button"
                className={`rb-flex-carousel-fallback-card ${idx === activeIndex ? 'is-active' : ''}`}
                onClick={() => snapToCardIndex(idx)}
              >
                {item.image ? (
                  <img src={item.image} alt={item.title || ''} />
                ) : (
                  <div className="rb-flex-carousel-placeholder" />
                )}
              </button>
            ))}
          </div>
        )}

        {captions && currentItem && (
          <div className="rb-flex-carousel-bottom-caption" aria-live="polite">
            <strong className="rb-flex-carousel-bottom-title">{currentItem.title}</strong>
            <span className="rb-flex-carousel-bottom-counter">
              {paddedActive} / {paddedTotal}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
