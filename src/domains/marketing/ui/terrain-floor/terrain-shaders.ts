import { TERRAIN_TRAIL_LENGTH } from '@/domains/marketing/constants/terrain-floor'

const TRAIL = TERRAIN_TRAIL_LENGTH

export const TERRAIN_FLOOR_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uBaseAmplitude;
  uniform float uBumpAmplitude;
  uniform float uBumpRadius;
  uniform float uErodeRate;
  uniform float uDriftSpeed;
  uniform float uNoiseScale;
  uniform float uPointSize;
  uniform float uHover;
  uniform vec4 uTrail[${TRAIL}];

  varying float vHeight;
  varying float vFade;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    float frequency = 1.0;
    for (int i = 0; i < 3; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.1;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 pos = position;

    float base = fbm(pos.xz * uNoiseScale + vec2(0.0, uTime * uDriftSpeed));
    float height = base * uBaseAmplitude;

    float bump = 0.0;
    for (int i = 0; i < ${TRAIL}; i++) {
      vec4 t = uTrail[i];
      float age = uTime - t.z;
      if (t.w <= 0.0 || age < 0.0) continue;
      float w = t.w * exp(-age * uErodeRate);
      vec2 d = pos.xz - t.xy;
      bump += w * exp(-dot(d, d) / (uBumpRadius * uBumpRadius));
    }
    height += bump * uBumpAmplitude * uHover;

    pos.y = height;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uPointSize * (120.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vHeight = clamp(height / (uBaseAmplitude + uBumpAmplitude), 0.0, 1.0);
    vFade = smoothstep(-5.5, 1.5, position.z);
  }
`

export const TERRAIN_FLOOR_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;

  varying float vHeight;
  varying float vFade;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.18, dist) * vFade * 0.45;
    vec3 color = mix(uColorLow, uColorHigh, vHeight * vHeight);
    gl_FragColor = vec4(color, alpha);
  }
`
