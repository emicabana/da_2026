import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uRayColor1;
  uniform vec3 uRayColor2;
  uniform float uBlend;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uSpread;
  uniform vec2 uOrigin;
  uniform vec2 uMainDir;
  uniform vec2 uMouse;
  uniform float uFollowMouse;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }

  float rayLayer(float angle, float dist, float t, float seed, float freq) {
    float n1 = noise(angle * freq + t * 0.42 + seed);
    float n2 = noise(angle * (freq * 2.15) - t * 0.68 + seed * 2.3);
    float n3 = noise(angle * (freq * 4.1) + t * 0.95 - seed * 1.7);
    float combined = n1 * 0.52 + n2 * 0.33 + n3 * 0.15;
    float shafts = smoothstep(0.32, 0.88, combined);
    float fineShafts = pow(max(0.0, sin(angle * freq * 3.8 + t * 0.5 + n1 * 3.0)), 3.0) * 0.45;
    float radialFade = exp(-dist * 0.62) * smoothstep(0.0, 0.12, dist);
    return (shafts + fineShafts) * radialFade;
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 uv = vUv * aspect;
    vec2 origin = uOrigin * aspect;

    vec2 toPixel = uv - origin;
    float dist = length(toPixel);
    vec2 dir = dist > 0.0001 ? toPixel / dist : vec2(0.0, -1.0);

    // Base direction from origin into the viewport, tilted slightly toward mouse
    vec2 mouseWorld = uMouse * aspect;
    vec2 toMouse = normalize(mouseWorld - origin + vec2(0.0001));
    vec2 centerDir = normalize(mix(uMainDir, toMouse, uFollowMouse * 0.28));

    float cosTheta = clamp(dot(dir, centerDir), -1.0, 1.0);
    float crossSign = dir.x * centerDir.y - dir.y * centerDir.x;
    float signedAngle = atan(crossSign, cosTheta);

    // Fan cone envelope controlled by spread
    float coneWidth = 0.36 * uSpread;
    float coneMask = exp(-(signedAngle * signedAngle) / max(coneWidth * coneWidth, 0.001));

    float t = uTime * uSpeed * 0.35;

    // Upper fan layer (rayColor1) and lower fan layer (rayColor2)
    float angle1 = signedAngle + 0.11 * uSpread;
    float angle2 = signedAngle - 0.11 * uSpread;

    float rays1 = rayLayer(angle1, dist, t, 1.7, 9.5 / max(uSpread * 0.55, 0.4));
    float rays2 = rayLayer(angle2, dist, t * 1.08, 7.3, 10.5 / max(uSpread * 0.55, 0.4));

    // Directional split across the fan + blend balance
    float sideSplit = smoothstep(-0.28 * uSpread, 0.28 * uSpread, signedAngle);
    float weight1 = mix(1.0 - uBlend, 1.0, sideSplit) * (1.0 - uBlend * 0.45);
    float weight2 = mix(uBlend, 1.0, 1.0 - sideSplit) * (0.55 + uBlend * 0.45);

    // Soft source glow near the corner origin
    float coreGlow = exp(-dist * 1.45) * 0.55;

    // Subtle cursor brightening along the rays
    float mouseDist = length(uv - mouseWorld);
    float mouseBoost = 1.0 + uFollowMouse * 0.35 * exp(-mouseDist * 2.4);

    vec3 col1 = uRayColor1 * (rays1 * coneMask + coreGlow * 0.65) * weight1;
    vec3 col2 = uRayColor2 * (rays2 * coneMask + coreGlow * 0.85) * weight2;

    vec3 finalColor = (col1 + col2) * uIntensity * mouseBoost;

    // Soft tone mapping so bright white/violet shafts never clip harshly
    finalColor = 1.0 - exp(-finalColor);
    float alpha = clamp(max(finalColor.r, max(finalColor.g, finalColor.b)), 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

function hexToRgbNormalized(hex) {
  const clean = String(hex || '#ffffff').replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, 'f');
  const num = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(num)) return [1, 1, 1];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

function getOriginVectors(origin) {
  switch (origin) {
    case 'top-left':
      return { pos: [-0.08, 1.08], dir: [0.68, -0.73] };
    case 'bottom-right':
      return { pos: [1.08, -0.08], dir: [-0.68, 0.73] };
    case 'bottom-left':
      return { pos: [-0.08, -0.08], dir: [0.68, 0.73] };
    case 'left':
      return { pos: [-0.1, 0.5], dir: [1.0, 0.0] };
    case 'right':
      return { pos: [1.1, 0.5], dir: [-1.0, 0.0] };
    case 'top-right':
    default:
      return { pos: [1.08, 1.08], dir: [-0.68, -0.73] };
  }
}

function compileShader(gl, type, source) {
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

export default function SideRays({
  rayColor1 = '#ffffff',
  rayColor2 = '#7c3aed',
  blend = 0.6,
  origin = 'top-right',
  speed = 2.5,
  intensity = 2.0,
  spread = 2.0,
  followMouse = true,
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) return undefined;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return undefined;

    const program = gl.createProgram();
    if (!program) return undefined;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return undefined;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
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

    const locs = {
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uRayColor1: gl.getUniformLocation(program, 'uRayColor1'),
      uRayColor2: gl.getUniformLocation(program, 'uRayColor2'),
      uBlend: gl.getUniformLocation(program, 'uBlend'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uIntensity: gl.getUniformLocation(program, 'uIntensity'),
      uSpread: gl.getUniformLocation(program, 'uSpread'),
      uOrigin: gl.getUniformLocation(program, 'uOrigin'),
      uMainDir: gl.getUniformLocation(program, 'uMainDir'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uFollowMouse: gl.getUniformLocation(program, 'uFollowMouse'),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const mouseState = {
      x: 0.65,
      y: 0.65,
      targetX: 0.65,
      targetY: 0.65,
    };

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseState.targetX = (event.clientX - rect.left) / rect.width;
      mouseState.targetY = 1.0 - (event.clientY - rect.top) / rect.height;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startTime = performance.now();
    let frameId = 0;

    const render = (now) => {
      const elapsed = prefersReducedMotion ? 0 : (now - startTime) * 0.001;
      mouseState.x += (mouseState.targetX - mouseState.x) * 0.06;
      mouseState.y += (mouseState.targetY - mouseState.y) * 0.06;

      const rgb1 = hexToRgbNormalized(rayColor1);
      const rgb2 = hexToRgbNormalized(rayColor2);
      const { pos, dir } = getOriginVectors(origin);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(locs.uResolution, canvas.width, canvas.height);
      gl.uniform1f(locs.uTime, elapsed);
      gl.uniform3f(locs.uRayColor1, rgb1[0], rgb1[1], rgb1[2]);
      gl.uniform3f(locs.uRayColor2, rgb2[0], rgb2[1], rgb2[2]);
      gl.uniform1f(locs.uBlend, blend);
      gl.uniform1f(locs.uSpeed, speed);
      gl.uniform1f(locs.uIntensity, intensity);
      gl.uniform1f(locs.uSpread, spread);
      gl.uniform2f(locs.uOrigin, pos[0], pos[1]);
      gl.uniform2f(locs.uMainDir, dir[0], dir[1]);
      gl.uniform2f(locs.uMouse, mouseState.x, mouseState.y);
      gl.uniform1f(locs.uFollowMouse, followMouse && !prefersReducedMotion ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [rayColor1, rayColor2, blend, origin, speed, intensity, spread, followMouse]);

  return (
    <div className={`landing-side-rays ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="landing-side-rays-canvas" />
    </div>
  );
}
