
export const DOTS_VERTEX_SHADER = `
  attribute float size;
  attribute float brightness;
  varying float vBrightness;
  uniform float time;
  
  void main() {
    vBrightness = brightness;
    
    // Organic noise movement
    vec3 pos = position;
    float noise = sin(pos.x * 8.0 + time) * cos(pos.y * 6.0 + time * 0.7);
    pos.x += noise * 0.015;
    pos.y += cos(pos.z * 7.0 + time * 0.8) * 0.012;
    pos.z += sin(pos.y * 5.0 + time * 0.6) * 0.015;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`
export const DOTS_FRAGMENT_SHADER = `
  varying float vBrightness;
  uniform vec3 color;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.25, dist);
    vec3 finalColor = color * vBrightness * 0.85;
    gl_FragColor = vec4(finalColor, alpha * 0.75);
  }
`
