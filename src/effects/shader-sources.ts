/**
 * GLSL ES 1.0 (WebGL 1) sources for the shader background presets.
 *
 * Every preset shares the same uniforms: `u_time` (seconds, already scaled
 * by the speed setting), `u_resolution` (drawing-buffer pixels), three
 * palette colors, and `u_intensity` (0 = base color only, 1 = full effect,
 * up to 2 = boosted).
 */

import { ShaderPreset } from '../types';

export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_intensity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.0 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

vec3 applyIntensity(vec3 col) {
  vec3 c = mix(u_color1, col, min(u_intensity, 1.0));
  return c * (1.0 + max(u_intensity - 1.0, 0.0) * 0.6);
}
`;

const FRAGMENT_MAINS: Record<ShaderPreset, string> = {
  aurora: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time * 0.15;
  vec3 col = u_color1;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float n = fbm(vec2(uv.x * aspect * (1.2 + fi * 0.4) + t * (0.6 + fi * 0.2), fi * 3.1 + t * 0.3));
    float center = 0.55 + fi * 0.1 + (n - 0.5) * 0.5;
    float offsetY = (uv.y - center) * (6.0 - fi);
    float band = exp(-offsetY * offsetY);
    float shimmer = 0.6 + 0.4 * fbm(vec2(uv.x * aspect * 6.0 - t * 2.0, uv.y * 3.0));
    vec3 tint = mix(u_color2, u_color3, clamp(fi / 2.0 + (n - 0.5), 0.0, 1.0));
    col += tint * band * shimmer * 0.55;
  }
  col = mix(col, u_color1, (1.0 - smoothstep(-0.1, 0.35, uv.y)) * 0.6);
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  liquid: `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.2;
  vec2 q = p;
  q += 0.35 * vec2(sin(q.y * 2.1 + t), cos(q.x * 1.7 - t * 0.8));
  q += 0.25 * vec2(sin(q.y * 3.3 - t * 0.6), cos(q.x * 2.9 + t * 1.1));
  float a = 0.5 + 0.5 * sin(q.x * 2.0 + t * 0.4);
  float b = 0.5 + 0.5 * cos(q.y * 2.4 - t * 0.5);
  vec3 col = mix(mix(u_color1, u_color2, a), u_color3, b * 0.85);
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  plasma: `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * 3.0;
  float t = u_time * 0.4;
  float v = sin(p.x + t);
  v += sin((p.y + t) * 0.8);
  v += sin((p.x + p.y) * 0.7 + t * 1.3);
  vec2 c = p + vec2(sin(t * 0.4) * 2.0, cos(t * 0.3) * 2.0);
  v += sin(length(c) * 1.5 + t);
  // The four-sine sum clusters near 0, so stretch it to use all 3 colors.
  v = clamp(v * 0.3 + 0.5, 0.0, 1.0);
  vec3 col = mix(u_color1, u_color2, smoothstep(0.1, 0.45, v));
  col = mix(col, u_color3, smoothstep(0.55, 0.9, v));
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  waves: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time * 0.5;
  vec3 col = u_color1;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float y = 0.5 + (fi - 2.0) * 0.07
      + 0.1 * sin(uv.x * aspect * (1.4 + fi * 0.35) + t * (0.7 + fi * 0.13) + fi * 1.7)
      + 0.04 * sin(uv.x * aspect * 3.1 - t * 1.1 + fi);
    float d = abs(uv.y - y);
    vec3 lineColor = mix(u_color2, u_color3, fi / 4.0);
    col += lineColor * (0.0035 / (d + 0.0035)) * 0.35;
    col += lineColor * (1.0 - smoothstep(0.0, 0.12, d)) * 0.06;
  }
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  nebula: `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * 2.5;
  float t = u_time * 0.05;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.5), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float n = fbm(p + 3.0 * r);
  vec3 col = mix(u_color1, u_color2, clamp(n * n * 2.2, 0.0, 1.0));
  col = mix(col, u_color3, clamp(length(q) * 0.9 * n, 0.0, 1.0));
  vec2 cell = floor(gl_FragCoord.xy / 2.0);
  float star = step(0.996, hash(cell));
  star *= 0.6 + 0.4 * sin(u_time * 2.0 + hash(cell + 7.0) * 40.0);
  col += vec3(star);
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  starfield: `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.08;
  vec3 col = u_color1;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float depth = fract(t + fi * 0.25);
    float scale = mix(24.0, 1.5, depth);
    float fade = smoothstep(0.0, 0.3, depth) * (1.0 - smoothstep(0.85, 1.0, depth));
    vec2 gv = p * scale + fi * 13.7;
    vec2 id = floor(gv);
    vec2 f = fract(gv) - 0.5;
    float h = hash(id + fi * 3.1);
    vec2 offset = vec2(hash(id + 1.7), hash(id + 4.3)) - 0.5;
    float d = length(f - offset * 0.7);
    float star = (1.0 - smoothstep(0.0, 0.06, d)) * step(0.7, h);
    col += mix(u_color2, u_color3, h) * star * fade * 1.4;
  }
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  rain: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec3 col = u_color1;
  float t = u_time;
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float cols = 40.0 + fl * 25.0;
    float speed = 0.6 + fl * 0.5;
    vec2 p = vec2(uv.x * aspect * cols, uv.y * 14.0 - t * speed * 10.0 - fl * 50.0);
    vec2 id = floor(p);
    vec2 f = fract(p);
    float h = hash(id);
    float dropY = fract(f.y + h * 10.0);
    float streak = smoothstep(1.0, 0.85, dropY) * step(0.5, h);
    float dCenter = abs(f.x - 0.5 - (hash(id + 3.1) - 0.5) * 0.3);
    float thickness = 1.0 - smoothstep(0.02, 0.08, dCenter);
    float bright = streak * thickness * (0.5 + 0.5 / (fl + 1.0));
    col += mix(u_color2, u_color3, h) * bright;
  }
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  grid: `
void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;
  float t = u_time * 0.6;
  float horizon = 0.05;
  vec3 col = mix(u_color1, u_color2, smoothstep(-1.0, 1.0, uv.y) * 0.4);
  if (uv.y > -horizon) {
    float glow = 1.0 - smoothstep(-horizon, 0.9, uv.y);
    col += u_color3 * glow * 0.5;
  } else {
    float perspective = -uv.y - horizon;
    float scale = 1.0 / (perspective + 0.06);
    vec2 gp = vec2(uv.x * scale, scale + t);
    vec2 gridUv = fract(gp) - 0.5;
    float lineWidth = clamp(0.05 * scale, 0.015, 0.45);
    float lx = 1.0 - smoothstep(0.0, lineWidth, abs(gridUv.x));
    float ly = 1.0 - smoothstep(0.0, lineWidth, abs(gridUv.y));
    float line = clamp(lx + ly, 0.0, 1.0);
    float fade = clamp(1.0 - perspective * 0.6, 0.0, 1.0);
    col = mix(col, u_color3, line * fade);
  }
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`,
  embers: `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.3;
  vec3 col = u_color1;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float scale = 3.0 + fi * 2.5;
    vec2 gv = p * scale + vec2(0.0, t * (0.6 + fi * 0.2));
    gv.x += sin(gv.y * 1.5 + t * 2.0 + fi * 2.1) * 0.2;
    vec2 id = floor(gv);
    vec2 f = fract(gv) - 0.5;
    float h = hash(id + fi * 5.7);
    vec2 jitter = vec2(hash(id + 1.1), hash(id + 4.4)) - 0.5;
    float d = length(f - jitter * 0.6);
    float flicker = 0.5 + 0.5 * sin(t * 10.0 + h * 40.0);
    float glow = (1.0 - smoothstep(0.0, 0.08 + 0.04 * flicker, d)) * step(0.6, h);
    vec3 tint = mix(u_color2, u_color3, h);
    col += tint * glow * (0.8 + flicker) * (1.0 - fi * 0.15);
  }
  gl_FragColor = vec4(applyIntensity(col), 1.0);
}
`
};

/** Full fragment shader source for a preset. */
export function fragmentShaderFor(preset: ShaderPreset): string {
  return FRAGMENT_HEADER + FRAGMENT_MAINS[preset];
}
