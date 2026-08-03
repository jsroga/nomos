export const SCULPTABLE_SURFACE_WORLD_SIZE = 64
export const SCULPTABLE_SURFACE_MAX_POLYGON_VERTICES = 32

export const sculptableSurfaceVertexShader = /* glsl */ `
    uniform sampler2D heightmapTexture;
    uniform float displacementScale;
    uniform vec2 boundsMin;
    uniform vec2 boundsSize;
    uniform float terrainWorldSize;
    uniform vec2 heightmapUVOffset;
    uniform vec2 heightmapUVScale;
    
    varying vec2 vWorldXZ;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    attribute vec3 color;
    
    float sampleHeight(vec2 worldXZ) {
        vec2 hmUV = (worldXZ + terrainWorldSize * 0.5) / terrainWorldSize;
        return texture2D(heightmapTexture, hmUV).r;
    }
    
    void main() {
        vUv = uv;
        vColor = color;
        vWorldXZ = position.xz;
        
        float height = sampleHeight(vWorldXZ);
        vHeight = height;
        
        vec3 newPosition = position;
        newPosition.y += (height - 0.5) * displacementScale;
        
        float epsilon = terrainWorldSize / 128.0;
        float hL = sampleHeight(vWorldXZ + vec2(-epsilon, 0.0));
        float hR = sampleHeight(vWorldXZ + vec2(epsilon, 0.0));
        float hD = sampleHeight(vWorldXZ + vec2(0.0, -epsilon));
        float hU = sampleHeight(vWorldXZ + vec2(0.0, epsilon));
        
        vec3 calcNormal = normalize(vec3(
            (hL - hR) * displacementScale,
            2.0 * epsilon,
            (hD - hU) * displacementScale
        ));
        vNormal = normalMatrix * calcNormal;
        
        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

export function buildSculptableSurfaceFragmentShader(maxVertices: number): string {
  return /* glsl */ `
    uniform vec3 groundColor;
    uniform float opacity;
    uniform vec2 polygonVertices[${maxVertices}];
    uniform int vertexCount;
    uniform sampler2D textureMap;
    uniform bool hasTexture;
    uniform float metalness;
    uniform float roughness;
    
    varying vec2 vWorldXZ;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    bool isInsidePolygon(vec2 point) {
        bool inside = false;
        
        for (int i = 0; i < ${maxVertices}; i++) {
            if (i >= vertexCount) break;
            
            int j = i == 0 ? vertexCount - 1 : i - 1;
            
            vec2 vi = polygonVertices[i];
            vec2 vj = polygonVertices[j];
            
            if ((vi.y > point.y) != (vj.y > point.y) &&
                point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    void main() {
        if (!isInsidePolygon(vWorldXZ)) {
            discard;
        }
        
        vec3 color = vColor;
        if (hasTexture) {
            color *= texture2D(textureMap, vUv * 4.0).rgb;
        }
        
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float NdotL = max(dot(normal, lightDir), 0.0);
        
        float ambient = 0.4;
        float diffuse = 0.6 * NdotL;
        
        float heightFactor = smoothstep(0.3, 0.7, vHeight);
        color = mix(color * 0.9, color * 1.1, heightFactor);
        
        color *= (ambient + diffuse);
        
        gl_FragColor = vec4(color, opacity);
    }
`
}
