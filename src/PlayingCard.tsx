// src/PlayingCard.tsx
import * as React from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import { a, useSpring, SpringValue } from "@react-spring/three";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

// --- Type Definitions ---
type Rarity = "common" | "uncommon" | "rare" | "legendary";
export type CardLightingEffect = "none" | "flatSheen" | "normalMap"; // New type for prop

export interface CardShaderMaterialUniforms {
  uTime?: number;
  uMouse?: THREE.Vector2;
  uBaseTexture?: THREE.Texture | null;
  uContentTexture?: THREE.Texture | null;
  uNormalMap?: THREE.Texture | null;
  uRarity?: number;
  uHover?: number;
  uEffectOverlay?: number;
  uCornerRadius?: number;
  uLightingMode?: number; // <-- NEW: 0=none, 1=flatSheen, 2=normalMap
}

export type CardShaderMaterialType = THREE.ShaderMaterial &
  CardShaderMaterialUniforms;

interface PlayingCardProps {
  rarity?: Rarity;
  frontImage?: string;
  contentImage?: string;
  contentNormalMap?: string;
  style?: React.CSSProperties;
  effectOverlay?: number;
  cornerRadius?: number;
  lightingEffect?: CardLightingEffect; // <-- NEW Prop
}

interface CardMeshProps {
  rarity: Rarity;
  frontImage: string;
  contentImage: string;
  contentNormalMap: string;
  effectOverlay: number;
  cornerRadius: number;
  lightingEffect: CardLightingEffect; // <-- NEW Prop
}

// --- Shader Definition ---
export const CardShaderMaterial = shaderMaterial<CardShaderMaterialUniforms>(
  // Uniforms
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0, 0),
    uBaseTexture: null,
    uContentTexture: null,
    uNormalMap: null,
    uRarity: 0.0,
    uHover: 0.0,
    uEffectOverlay: 1.0,
    uCornerRadius: 0.05,
    uLightingMode: 2.0, // Default to normalMap lighting (2.0)
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader (COMPLETE AND FIXED with new lighting logic)
  `
    precision mediump float;

    #define PI 3.14159265358979323846

    // Uniforms
    uniform float uTime;
    uniform vec2 uMouse;
    uniform sampler2D uBaseTexture;
    uniform sampler2D uContentTexture;
    uniform sampler2D uNormalMap;
    uniform float uRarity;
    uniform float uHover;
    uniform float uEffectOverlay;
    uniform float uCornerRadius;
    uniform float uLightingMode; // 0.0 = none, 1.0 = flatSheen, 2.0 = normalMap

    varying vec2 vUv;

    // --- Constants for Uncommon Effect ---
    const float UNCOMMON_SPIN_ROTATION = -2.0;
    const float UNCOMMON_SPIN_SPEED = 7.0;
    const vec2 UNCOMMON_OFFSET = vec2(0.0);
    const vec4 UNCOMMON_COLOUR_1 = vec4(0.871, 0.267, 0.231, 1.0);
    const vec4 UNCOMMON_COLOUR_2 = vec4(0.0, 0.42, 0.706, 1.0);
    const vec4 UNCOMMON_COLOUR_3 = vec4(0.086, 0.137, 0.145, 1.0);
    const float UNCOMMON_CONTRAST = 3.5;
    const float UNCOMMON_LIGHTING = 0.4;
    const float UNCOMMON_SPIN_AMOUNT = 0.25;
    const float UNCOMMON_SPIN_EASE = 1.0;

    // --- Helper Functions ---

    // PSRDNoise
    float psrdnoise(vec2 x, vec2 period, float alpha, out vec2 gradient) {
        vec2 uv = vec2(x.x + x.y*0.5, x.y);
        vec2 i0 = floor(uv);
        vec2 f0 = fract(uv);
        float cmp = step(f0.y, f0.x);
        vec2 o1 = vec2(cmp, 1.0-cmp);
        vec2 i1 = i0 + o1;
        vec2 i2 = i0 + vec2(1.0, 1.0);
        vec2 v0 = vec2(i0.x - i0.y * 0.5, i0.y);
        vec2 v1 = vec2(v0.x + o1.x - o1.y * 0.5, v0.y + o1.y);
        vec2 v2 = vec2(v0.x + 0.5, v0.y + 1.0);
        vec2 x0 = x - v0;
        vec2 x1 = x - v1;
        vec2 x2 = x - v2;
        vec3 iu, iv;
        vec3 xw, yw;
        if(any(greaterThan(period, vec2(0.0)))) {
            xw = vec3(v0.x, v1.x, v2.x);
            yw = vec3(v0.y, v1.y, v2.y);
            if(period.x > 0.0) xw = mod(xw, period.x);
            if(period.y > 0.0) yw = mod(yw, period.y);
            iu = floor(xw + 0.5*yw + 0.5);
            iv = floor(yw + 0.5);
        } else {
            iu = vec3(i0.x, i1.x, i2.x);
            iv = vec3(i0.y, i1.y, i2.y);
        }
        vec3 hash = mod(iu, 289.0);
        hash = mod((hash*51.0 + 2.0)*hash + iv, 289.0);
        hash = mod((hash*34.0 + 10.0)*hash, 289.0);
        vec3 psi = hash * 0.07482 + alpha;
        vec3 gx = cos(psi);
        vec3 gy = sin(psi);
        vec2 g0 = vec2(gx.x,gy.x);
        vec2 g1 = vec2(gx.y,gy.y);
        vec2 g2 = vec2(gx.z,gy.z);
        vec3 w = 0.8 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
        w = max(w, 0.0);
        vec3 w2 = w * w;
        vec3 w4 = w2 * w2;
        vec3 gdotx = vec3(dot(g0, x0), dot(g1, x1), dot(g2, x2));
        float n = dot(w4, gdotx);
        vec3 w3 = w2 * w;
        vec3 dw = -8.0 * w3 * gdotx;
        vec2 dn0 = w4.x * g0 + dw.x * x0;
        vec2 dn1 = w4.y * g1 + dw.y * x1;
        vec2 dn2 = w4.z * g2 + dw.z * x2;
        gradient = 10.9 * (dn0 + dn1 + dn2);
        return 10.9 * n;
    }

    // Easing functions
    float bounceOut(in float t) {
        const float n1 = 7.5625;
        const float d1 = 2.75;
        if (t < 1.0/d1) { return n1*t*t; }
        else if (t < 2.0/d1) { t -= 1.5/d1; return n1*t*t + 0.75; }
        else if (t < 2.5/d1) { t -= 2.25/d1; return n1*t*t + 0.9375; }
        else { t -= 2.625/d1; return n1*t*t + 0.984375; }
    }
    float bounceIn(float t) { return 1.0 - bounceOut(1.0 - t); }

    // Rotation function
    vec2 rot(vec2 v, float a){
        float s = sin(a);
        float c = cos(a);
        mat2 m = mat2(c, -s, s, c);
        return m * v;
    }

    // SDF for Rounded Box
    float sdRoundedBox( vec2 p, vec2 b, float r ) {
        vec2 q = abs(p)-b+r;
        return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
    }

    // Function for Uncommon Effect Logic
    vec3 calculateUncommonEffect(vec2 uvCoord, float time, vec2 mouse) {
        vec2 uv = (uvCoord - 0.5) * 2.0;
        uv -= UNCOMMON_OFFSET;
        float uv_len = length(uv);
        float timeSpeed = time * (UNCOMMON_SPIN_ROTATION * UNCOMMON_SPIN_EASE * 0.2);
        float mouseSpeed = mouse.x * 2.0;
        float speed = timeSpeed + mouseSpeed + 302.2;
        float baseAngle = atan(uv.y, uv.x);
        float spinFactor = UNCOMMON_SPIN_EASE * 20.0 * (1.0 * UNCOMMON_SPIN_AMOUNT * uv_len + (1.0 - 1.0 * UNCOMMON_SPIN_AMOUNT));
        float new_pixel_angle = baseAngle + speed - spinFactor;
        uv = vec2(uv_len * cos(new_pixel_angle), uv_len * sin(new_pixel_angle));
        uv *= 30.;
        float loopTimeSpeed = time * (UNCOMMON_SPIN_SPEED);
        float loopMouseSpeed = mouse.y * 3.0;
        float currentLoopSpeed = loopTimeSpeed + loopMouseSpeed;
        vec2 uv2 = vec2(uv.x+uv.y);
        for(int i=0; i < 5; i++) {
            uv2 += sin(max(uv.x, uv.y)) + uv;
            uv  += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + currentLoopSpeed * 0.131121),
                              sin(uv2.x - 0.113 * currentLoopSpeed));
            uv  -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
        }
        float contrast_mod = (0.25 * UNCOMMON_CONTRAST + 0.5 * UNCOMMON_SPIN_AMOUNT + 1.2);
        float paint_res = min(2.0, max(0.0, length(uv) * (0.035) * contrast_mod));
        float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
        float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
        float c3p = 1.0 - min(1.0, c1p + c2p);
        float light = (UNCOMMON_LIGHTING - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + UNCOMMON_LIGHTING * max(c2p * 5.0 - 4.0, 0.0);
        vec3 finalUncommonColor = (0.3 / UNCOMMON_CONTRAST) * UNCOMMON_COLOUR_1.rgb +
                                 (1.0 - 0.3 / UNCOMMON_CONTRAST) * (UNCOMMON_COLOUR_1.rgb * c1p + UNCOMMON_COLOUR_2.rgb * c2p + UNCOMMON_COLOUR_3.rgb * c3p) +
                                 light;
        return finalUncommonColor;
    }

    // Simple pseudo-random noise (used for Rare sparkle)
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Lighting calculation function
    vec3 calculateLighting(vec3 surfaceColor, vec3 surfaceNormal, vec3 lightDir, vec3 lightColor, float ambientStrength, float specularStrength) {
        float diff = max(dot(surfaceNormal, lightDir), 0.0);
        vec3 diffuse = diff * lightColor;
        vec3 ambient = ambientStrength * lightColor;
        vec3 viewDir = normalize(vec3(-uMouse.x, -uMouse.y, 1.0));
        vec3 reflectDir = reflect(-lightDir, surfaceNormal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
        vec3 specular = specularStrength * spec * lightColor;
        return (ambient + diffuse + specular) * surfaceColor;
    }

    //----------------------------------------------------
    // MAIN SHADER LOGIC
    //----------------------------------------------------
    void main() {
        vec2 uv = vUv;

        // --- Rounded Corners ---
        vec2 centeredUv = uv - 0.5;
        vec2 boxHalfSize = vec2(0.5);
        float clampedRadius = min(uCornerRadius, 0.5);
        float dist = sdRoundedBox(centeredUv, boxHalfSize, clampedRadius);
        if (dist > 0.001) { discard; }
        // --- End Rounded Corners ---

        // Sample base textures
        vec4 baseColorTex = texture2D(uBaseTexture, uv);
        vec4 contentColorTex = texture2D(uContentTexture, uv);
        vec3 sampledNormalTex = texture2D(uNormalMap, uv).rgb;

        // --- Determine Lit Content Color based on uLightingMode ---
    vec3 litContentColor;
    vec3 lightDir = normalize(vec3(uMouse.x * 0.6, uMouse.y * 0.6, 0.8));
    float ambient = 1.0; // Base ambient for content when lit

    if (uLightingMode == 2.0) { // 2.0 == normalMap
        vec3 processedNormal = normalize(sampledNormalTex * 2.0 - 1.0);
        float normalMapSpecularStrength = 1.5; 
        litContentColor = calculateLighting(contentColorTex.rgb, processedNormal, lightDir, vec3(1.0), ambient, normalMapSpecularStrength);
    } else if (uLightingMode == 1.0) { // 1.0 == flatSheen
        vec3 flatNormal = vec3(0.5, 0.5, 0.5);
        float flatSheenSpecularStrength = 0.8; // Potentially too bright
        litContentColor = calculateLighting(contentColorTex.rgb, flatNormal, lightDir, vec3(1.0), ambient, flatSheenSpecularStrength);
    } else { // 0.0 == none (or any other value)
        litContentColor = contentColorTex.rgb * ambient; // This makes it dark
    }
    // --- End Lit Content Color ---

        // --- Base Output (Before Rarity) ---
        vec3 baseOutput = mix(baseColorTex.rgb, litContentColor, contentColorTex.a);

        // --- Calculate Full Rarity Effect (start with base, modify per rarity) ---
        vec3 fullRarityEffectColor = baseOutput;

        // 2. Uncommon
        if (uRarity >= 0.2 && uRarity < 0.5) {
            vec3 uncommonEffect = calculateUncommonEffect(uv, uTime, uMouse);
            float rarityFade = smoothstep(0.2, 0.35, uRarity) - smoothstep(0.5, 0.6, uRarity);
            fullRarityEffectColor = mix(fullRarityEffectColor, uncommonEffect, rarityFade);
        }
        // 3. Rare Shimmer + Sheen
        else if (uRarity >= 0.5 && uRarity < 0.75) {
            float shimmerStrength = smoothstep(0.5, 0.6, uRarity) - smoothstep(0.75, 0.85, uRarity);
            float shimmer = pow(noise(uv * 6.0 + uTime * 0.2), 10.0) * 0.3;
            shimmer += pow(noise(uv * 12.0 - uTime * 0.1), 16.0) * 0.4;
            fullRarityEffectColor += shimmer * shimmerStrength * 0.8;

            // Additive Rare Sheen (only if normal map lighting is active for detail)
            if (uLightingMode == 2.0) { // If normalMap lighting is on
                 vec3 processedNormalForSheen = normalize(sampledNormalTex * 2.0 - 1.0);
                 float rareSheenStrength = pow(max(0.0, dot(processedNormalForSheen, normalize(vec3(uMouse.x, uMouse.y, 0.7)))), 4.0);
                 fullRarityEffectColor += vec3(rareSheenStrength * 0.35 * shimmerStrength) * contentColorTex.a;
            }
        }
        // 4. Legendary Effect
        else if (uRarity >= 0.75) {
            float legendaryStrength = smoothstep(0.75, 0.85, uRarity);
            vec3 color1 = vec3(0.949, 0.561, 0.792);
            vec3 color2 = vec3(0.463, 0.169, 0.690);
            vec2 st = rot(uv, -PI / 8.0);
            float noiseAngleInfluence = uMouse.y * (PI * 0.5);
            float noiseTimeRotation = 1.2 * uTime;
            float alphaN = noiseTimeRotation + noiseAngleInfluence;
            float linesOffsetInfluence = uMouse.x * 0.5;
            vec2 gradient;
            float n = psrdnoise(vec2(3.0) * st, vec2(0.0), alphaN, gradient);
            float lines = cos((st.x + n * 0.1 + linesOffsetInfluence + 0.2) * PI);
            vec3 legendaryProcColor = mix(color1, color2, bounceIn(lines * 0.5 + 0.5));
            fullRarityEffectColor = mix(fullRarityEffectColor, legendaryProcColor, legendaryStrength * 0.7);
        }

        // --- Apply Overlay ---
        float overlayMixFactor = mix(1.0, uEffectOverlay, contentColorTex.a);
        vec3 finalColor = mix(baseOutput, fullRarityEffectColor, overlayMixFactor);

        // --- Hover Glow ---
        finalColor += uHover * 0.0;

        // --- Final Output ---
        float edgeWidth = 0.005;
        float finalAlpha = smoothstep(edgeWidth, -edgeWidth, dist);
        gl_FragColor = vec4(finalColor, baseColorTex.a * finalAlpha);
    }
  `
);

extend({ CardShaderMaterial });

// --- Card Mesh Component ---
function CardMesh({
  rarity,
  frontImage,
  contentImage,
  contentNormalMap,
  effectOverlay,
  cornerRadius,
  lightingEffect, // <-- Use new prop
}: CardMeshProps) {
  const meshRef = React.useRef<THREE.Mesh>(null!);
  const matRef = React.useRef<CardShaderMaterialType>(null!);
  const { gl } = useThree();

  const textures = useTexture([frontImage, contentImage, contentNormalMap]);
  const [baseTex, contentTex, normalMapTexture] = textures;

  textures.forEach((tex) => {
    if (tex) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    }
  });

  const rarityValue = React.useMemo<number>(() => {
    switch (rarity) {
      case "common":
        return 0.1;
      case "uncommon":
        return 0.35;
      case "rare":
        return 0.6;
      case "legendary":
        return 0.85;
      default:
        return 0.0;
    }
  }, [rarity]);

  const lightingModeValue = React.useMemo<number>(() => {
    if (lightingEffect === "normalMap") return 2.0;
    if (lightingEffect === "flatSheen") return 1.0;
    return 0.0; // 'none' or any other fallback
  }, [lightingEffect]);

  const [mousePos, setMousePos] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [{ rotX, rotY, hover }, api] = useSpring(() => ({
    rotX: 0,
    rotY: 0,
    hover: 0,
    config: { mass: 1, tension: 170, friction: 26 },
  }));

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uTime += delta;
      matRef.current.uMouse.set(mousePos.x, mousePos.y);
      matRef.current.uHover = (hover as SpringValue<number>).get();
    }
  });

  const handleMouseMove = (e: ThreeEvent<globalThis.PointerEvent>) => {
    if (
      !meshRef.current ||
      e.intersections.length === 0 ||
      e.intersections[0].object !== meshRef.current
    ) {
      return;
    }
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const maxTilt = 15 * (Math.PI / 180);
    api.start({
      rotX: (y - 0.5) * maxTilt,
      rotY: (x - 0.5) * maxTilt,
    });
    setMousePos({ x: (x - 0.5) * 2, y: (y - 0.5) * -2 });
  };

  const handleMouseLeave = (e: ThreeEvent<globalThis.PointerEvent>) => {
    api.start({ rotX: 0, rotY: 0, hover: 0 });
    setMousePos({ x: 0, y: 0 });
  };

  const handlePointerEnter = (e: ThreeEvent<globalThis.PointerEvent>) => {
    if (e.object === meshRef.current) {
      api.start({ hover: 1 });
    }
  };

  const cardAspectRatio = 2.5 / 3.5;
  const cardWidth = 3;
  const cardHeight = cardWidth / cardAspectRatio;

  return (
    <a.mesh
      ref={meshRef}
      rotation-x={rotX as any}
      rotation-y={rotY as any}
      onPointerMove={handleMouseMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handleMouseLeave}
    >
      <planeGeometry args={[cardWidth, cardHeight, 64, 64]} />
      <cardShaderMaterial
        ref={matRef}
        uBaseTexture={baseTex}
        uContentTexture={contentTex}
        uNormalMap={normalMapTexture}
        uRarity={rarityValue}
        transparent={true}
        side={THREE.DoubleSide}
        uEffectOverlay={effectOverlay}
        uCornerRadius={cornerRadius}
        uLightingMode={lightingModeValue} // <-- Pass new lighting mode uniform
      />
    </a.mesh>
  );
}

// --- Main Exported Component ---
export default function PlayingCard({
  rarity = "legendary",
  frontImage = "/textures/card_base.png",
  contentImage = "/textures/card_content_art.png",
  contentNormalMap = "/textures/card_content_normal.png",
  style,
  effectOverlay = 0.0,
  cornerRadius = 0.05,
  lightingEffect = "flatSheen", // <-- Default for new prop
}: PlayingCardProps) {
  return (
    <div
      style={{ width: "300px", height: "420px", cursor: "pointer", ...style }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 55 }}
        dpr={window.devicePixelRatio || 1}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -5, 5]} intensity={0.5} />
        <React.Suspense fallback={null}>
          <CardMesh
            rarity={rarity}
            frontImage={frontImage}
            contentImage={contentImage}
            contentNormalMap={contentNormalMap}
            effectOverlay={effectOverlay}
            cornerRadius={cornerRadius}
            lightingEffect={lightingEffect} // <-- Pass down new prop
          />
        </React.Suspense>
        {/* <OrbitControls /> */}
      </Canvas>
    </div>
  );
}
