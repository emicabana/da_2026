import { useEffect, useRef, useState } from 'react';

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    vUv.y = 1.0 - vUv.y;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform float uHover;
  uniform float uTime;
  uniform float uIntro;
  uniform float uPointerStrength;
  uniform float uPointerInfluence;
  uniform float uIdleDrift;
  uniform float uRefraction;
  uniform float uChromatic;
  uniform vec3 uClickRipple; // xy = origin, z = progress (0..1)

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Autonomous idle drift lens when pointer is away
    vec2 driftPos = vec2(
      0.5 + 0.32 * sin(uTime * 0.65) * cos(uTime * 0.31),
      0.5 + 0.18 * cos(uTime * 0.52)
    );
    vec2 activeCenter = mix(driftPos, uPointer, uHover);
    float activeStrength = mix(uPointerStrength * uIdleDrift, uPointerStrength, uHover);

    vec2 delta = uv - activeCenter;
    delta.x *= aspect;
    float dist = length(delta);

    // Smooth optical bulge lens + subtle ripple wave
    float radius = uPointerInfluence;
    float lensMask = exp(-(dist * dist) / max(radius * radius, 0.0001));
    float rippleWave = sin(dist * 28.0 - uTime * 5.2) * 0.08 * lensMask * (0.35 + 0.65 * uHover);

    vec2 dir = dist > 0.0001 ? normalize(delta) : vec2(0.0);
    dir.x /= aspect;

    // Velocity drag + optical bulge
    vec2 lensOffset = -dir * (lensMask * activeStrength * 0.14 + rippleWave * 0.06)
      - uVelocity * lensMask * 0.045;

    // Ambient organic warp + intro settle warp
    float introFactor = (1.0 - uIntro) * (1.0 - uIntro);
    vec2 ambientWarp = vec2(
      sin(uv.y * 5.5 + uTime * 1.35) * 0.0022,
      cos(uv.x * 4.5 + uTime * 1.15) * 0.0028
    ) * (1.0 + introFactor * 8.0);

    // Click shockwave ring
    vec2 clickOffset = vec2(0.0);
    float clickAberration = 0.0;
    if (uClickRipple.z > 0.0 && uClickRipple.z < 1.0) {
      vec2 cDelta = uv - uClickRipple.xy;
      cDelta.x *= aspect;
      float cDist = length(cDelta);
      float ringRadius = uClickRipple.z * 0.95;
      float ringWidth = 0.085;
      float band = exp(-pow((cDist - ringRadius) / ringWidth, 2.0));
      float fade = (1.0 - uClickRipple.z) * (1.0 - uClickRipple.z);
      vec2 cDir = cDist > 0.0001 ? normalize(cDelta) : vec2(0.0);
      cDir.x /= aspect;
      float wave = sin((cDist - ringRadius) * 42.0);
      clickOffset = cDir * wave * band * fade * 0.045;
      clickAberration = band * fade * 0.014;
    }

    vec2 totalOffset = lensOffset + ambientWarp + clickOffset;
    vec2 warpedUv = uv + totalOffset;

    // Chromatic aberration & glass edge RGB refraction
    float edgeSplit = (
      length(lensOffset) * (0.45 + uChromatic) +
      uRefraction * lensMask * (0.4 + 0.6 * uHover) +
      clickAberration +
      introFactor * 0.015
    );
    vec2 chromaShift = (dir + vec2(0.35, -0.25)) * edgeSplit;

    vec4 colR = texture2D(uTexture, clamp(warpedUv + chromaShift, 0.0, 1.0));
    vec4 colG = texture2D(uTexture, clamp(warpedUv, 0.0, 1.0));
    vec4 colB = texture2D(uTexture, clamp(warpedUv - chromaShift, 0.0, 1.0));

    float alpha = max(max(colR.a, colG.a), colB.a) * uIntro;
    vec3 color = vec3(colR.r, colG.g, colB.b);

    gl_FragColor = vec4(color, alpha);
  }
`;

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

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function WarpText({
  topLine = 'Cada momento,',
  bottomLine = 'REVELADO.',
  pointerStrength = 0.42,
  pointerInfluence = 0.27,
  idleDrift = 0.24,
  chromatic = 0.36,
  refraction = 0.018,
  clickRipple = true,
  intro = true,
  id = 'landing-title',
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      setWebglSupported(false);
      return undefined;
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) {
      setWebglSupported(false);
      return undefined;
    }

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uniforms = {
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uPointer: gl.getUniformLocation(program, 'uPointer'),
      uVelocity: gl.getUniformLocation(program, 'uVelocity'),
      uHover: gl.getUniformLocation(program, 'uHover'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uIntro: gl.getUniformLocation(program, 'uIntro'),
      uPointerStrength: gl.getUniformLocation(program, 'uPointerStrength'),
      uPointerInfluence: gl.getUniformLocation(program, 'uPointerInfluence'),
      uIdleDrift: gl.getUniformLocation(program, 'uIdleDrift'),
      uRefraction: gl.getUniformLocation(program, 'uRefraction'),
      uChromatic: gl.getUniformLocation(program, 'uChromatic'),
      uClickRipple: gl.getUniformLocation(program, 'uClickRipple'),
    };

    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');

    const renderTextTexture = () => {
      if (!textCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const rect = container.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width), 300);
      const height = Math.max(Math.round(rect.height), 180);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      textCanvas.width = canvas.width;
      textCanvas.height = canvas.height;
      textCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      textCtx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.dataset.theme === 'light';
      const computedStyle = window.getComputedStyle(container);
      const fontFamily = computedStyle.fontFamily || "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";

      const baseFontSize = Math.min(Math.max(width * 0.105, 38), 92);
      const bottomFontSize = Math.min(Math.max(width * 0.122, 44), 108);
      const lineGap = baseFontSize * 0.22;
      const totalBlockHeight = baseFontSize + bottomFontSize + lineGap;
      const startY = (height - totalBlockHeight) * 0.5;

      textCtx.textAlign = 'center';
      textCtx.textBaseline = 'top';

      // Line 1: "Cada momento,"
      textCtx.font = `800 ${baseFontSize}px ${fontFamily}`;
      textCtx.fillStyle = isLight ? '#17083d' : '#f9f5ff';
      textCtx.fillText(topLine, width * 0.5, startY);

      // Line 2: "REVELADO."
      textCtx.font = `900 ${bottomFontSize}px ${fontFamily}`;
      const gradient = textCtx.createLinearGradient(width * 0.18, 0, width * 0.82, 0);
      if (isLight) {
        gradient.addColorStop(0, '#74189d');
        gradient.addColorStop(0.52, '#a321b6');
        gradient.addColorStop(1, '#4f1475');
      } else {
        gradient.addColorStop(0, '#f3d9ff');
        gradient.addColorStop(0.48, '#c57cff');
        gradient.addColorStop(1, '#91a2df');
      }
      textCtx.fillStyle = gradient;
      textCtx.fillText(bottomLine, width * 0.5, startY + baseFontSize + lineGap);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    };

    renderTextTexture();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(renderTextTexture).catch(() => {});
    }

    const state = {
      pointerX: 0.5,
      pointerY: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      velocityX: 0,
      velocityY: 0,
      hover: 0,
      targetHover: 0,
      rippleX: 0.5,
      rippleY: 0.5,
      rippleStart: -10,
      startTime: performance.now(),
    };

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.targetX = (event.clientX - rect.left) / rect.width;
      state.targetY = (event.clientY - rect.top) / rect.height;
      state.targetHover = 1;
    };

    const handlePointerLeave = () => {
      state.targetHover = 0;
    };

    const handleClick = (event) => {
      if (!clickRipple) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.rippleX = (event.clientX - rect.left) / rect.width;
      state.rippleY = (event.clientY - rect.top) / rect.height;
      state.rippleStart = (performance.now() - state.startTime) * 0.001;
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerenter', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('click', handleClick);

    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(() => renderTextTexture())
      : null;
    resizeObserver?.observe(container);

    const themeObserver = new MutationObserver(() => renderTextTexture());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    let animationFrameId = 0;
    const renderFrame = (now) => {
      const elapsed = (now - state.startTime) * 0.001;

      const prevX = state.pointerX;
      const prevY = state.pointerY;
      state.pointerX += (state.targetX - state.pointerX) * 0.14;
      state.pointerY += (state.targetY - state.pointerY) * 0.14;
      state.velocityX = (state.pointerX - prevX) * 14.0;
      state.velocityY = (state.pointerY - prevY) * 14.0;
      state.hover += (state.targetHover - state.hover) * 0.09;

      const introProgress = !intro || prefersReducedMotion
        ? 1.0
        : Math.min(1.0, elapsed / 0.95);

      const rippleElapsed = elapsed - state.rippleStart;
      const rippleProgress = rippleElapsed >= 0 && rippleElapsed < 1.15
        ? rippleElapsed / 1.15
        : 0.0;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uPointer, state.pointerX, state.pointerY);
      gl.uniform2f(uniforms.uVelocity, state.velocityX, state.velocityY);
      gl.uniform1f(uniforms.uHover, prefersReducedMotion ? 0 : state.hover);
      gl.uniform1f(uniforms.uTime, prefersReducedMotion ? 0 : elapsed);
      gl.uniform1f(uniforms.uIntro, introProgress);
      gl.uniform1f(uniforms.uPointerStrength, prefersReducedMotion ? 0 : pointerStrength);
      gl.uniform1f(uniforms.uPointerInfluence, pointerInfluence);
      gl.uniform1f(uniforms.uIdleDrift, prefersReducedMotion ? 0 : idleDrift);
      gl.uniform1f(uniforms.uRefraction, refraction);
      gl.uniform1f(uniforms.uChromatic, chromatic);
      gl.uniform3f(uniforms.uClickRipple, state.rippleX, state.rippleY, rippleProgress);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerenter', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    };
  }, [topLine, bottomLine, pointerStrength, pointerInfluence, idleDrift, chromatic, refraction, clickRipple, intro]);

  return (
    <div className="landing-warp-heading" ref={containerRef}>
      <h1 id={id} className={webglSupported ? 'sr-only' : 'landing-warp-fallback'}>
        {topLine}{' '}
        <span>{bottomLine}</span>
      </h1>
      {webglSupported && (
        <canvas
          ref={canvasRef}
          className="landing-warp-canvas"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
