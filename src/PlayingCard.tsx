import * as React from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import { a, useSpring, SpringValue } from "@react-spring/three";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

// --- Type Definitions ---
type Rarity = "common" | "uncommon" | "rare" | "legendary";
export type CardLightingEffect = "none" | "flatSheen" | "normalMap";

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
  uLightingMode?: number;
  uIsActive?: number; // 0.0 for static, 1.0 for active
}

export type CardShaderMaterialType = THREE.ShaderMaterial &
  CardShaderMaterialUniforms;

// Props for the mesh, assuming it's used within a larger canvas
export interface CardMeshProps {
  key?: string; // For React lists
  rarity?: Rarity;
  frontImage?: string;
  contentImage?: string;
  contentNormalMap?: string;
  effectOverlay?: number;
  cornerRadius?: number;
  lightingEffect?: CardLightingEffect;
  position?: [number, number, number];
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
    uLightingMode: 2.0, // Default to normalMap lighting
    uIsActive: 0.0, // Default to inactive/static
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
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
    uniform float uIsActive;   // NEW: 0.0 for static, 1.0 for active

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

    float bounceOut(in float t) {
        const float n1 = 7.5625;
        const float d1 = 2.75;
        if (t < 1.0/d1) { return n1*t*t; }
        else if (t < 2.0/d1) { t -= 1.5/d1; return n1*t*t + 0.75; }
        else if (t < 2.5/d1) { t -= 2.25/d1; return n1*t*t + 0.9375; }
        else { t -= 2.625/d1; return n1*t*t + 0.984375; }
    }
    float bounceIn(float t) { return 1.0 - bounceOut(1.0 - t); }

    vec2 rot(vec2 v, float a){
        float s = sin(a);
        float c = cos(a);
        mat2 m = mat2(c, -s, s, c);
        return m * v;
    }

    float sdRoundedBox( vec2 p, vec2 b, float r ) {
        vec2 q = abs(p)-b+r;
        return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r;
    }

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

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 calculateLighting(vec3 surfaceColor, vec3 surfaceNormal, vec3 lightDir, vec3 lightColor, float ambientStrength, float specularStrength) {
        float diff = max(dot(surfaceNormal, lightDir), 0.0);
        vec3 diffuse = diff * lightColor;
        vec3 ambient = ambientStrength * lightColor;
        vec3 viewDir = normalize(vec3(-uMouse.x * 0.5, -uMouse.y * 0.5, 1.0)); // Adjusted for interactive tilt
        vec3 reflectDir = reflect(-lightDir, surfaceNormal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0); // Increased shininess
        vec3 specular = specularStrength * spec * lightColor;
        return (ambient + diffuse + specular) * surfaceColor;
    }

    //----------------------------------------------------
    // MAIN SHADER LOGIC
    //----------------------------------------------------
    void main() {vec2 uv = vUv;

    vec4 baseColorTex = texture2D(uBaseTexture, uv);
    vec4 contentColorTex = texture2D(uContentTexture, uv);
    // For normal map, even if not used actively in static, sample it if lightingMode hints at it
    // to avoid potential issues if uNormalMap is null and lightingMode expects it.
    // Or, ensure uNormalMap always has a placeholder.
    vec4 normalTexSample = texture2D(uNormalMap, uv);


    // --- Rounded Corners (applied to both static and active) ---
    vec2 centeredUv = uv - 0.5;
    vec2 boxHalfSize = vec2(0.5) - uCornerRadius; 
    float dist = sdRoundedBox(centeredUv, boxHalfSize, uCornerRadius);
    if (dist > 0.001) { discard; } // Discard pixels outside rounded rectangle

    // --- Static Card Rendering Path ---
    // In the STATIC PATH (if (uIsActive < 0.5))
    if (uIsActive < 0.5) {
        vec3 baseColor = baseColorTex.rgb;
        vec3 contentColor = contentColorTex.rgb;
        float contentAlpha = contentColorTex.a;

        // Apply lighting to the content part
        float K_ambient = 0.6; // How much ambient light affects the content
        float K_diffuse = 0.0; // How much diffuse light affects the content

        if (uLightingMode == 1.0) { // flatSheen
            vec3 staticLightDir = normalize(vec3(0.3, 0.4, 1.0));
            float NdotL = max(dot(vec3(0.0,0.0,1.0), staticLightDir), 0.0);
            K_diffuse = NdotL * 0.4; // Contribution from diffuse
        } else if (uLightingMode == 2.0) { // normalMap
            vec3 staticLightDir = normalize(vec3(0.3, 0.4, 1.0));
            vec3 staticNormal = normalize(normalTexSample.rgb * 2.0 - 1.0);
            float NdotL = max(dot(staticNormal, staticLightDir), 0.0);
            K_diffuse = NdotL * 0.5; // Contribution from diffuse
        }
        
        // Calculate lit content color: content * (ambient_factor + diffuse_factor)
        // Ensure the content doesn't become overly dark if K_ambient + K_diffuse is low.
        // A common way is: ContentColor * AmbientLight + ContentColor * DiffuseLight
        // Or: ContentColor * (AmbientFactor + DiffuseFactor)
        // Let's try to make it so it doesn't go darker than a certain base ambient.
        vec3 litContent = contentColor * (K_ambient + K_diffuse); 
        // If lighting mode is 'none', K_diffuse is 0, so litContent = contentColor * K_ambient.
        // If you want 'none' to be brighter, increase K_ambient or handle uLightingMode == 0.0 separately.
        if (uLightingMode == 0.0) {
            litContent = contentColor * 0.8; // Or just contentColor if you want it full brightness
        }


        vec3 combinedColor = mix(baseColor, litContent, contentAlpha);

        // Apply cheap static rarity tint
        vec3 rarityTint = vec3(1.0);
        if (uRarity >= 0.2 && uRarity < 0.5) { rarityTint = vec3(0.9, 1.0, 0.9); }
        else if (uRarity >= 0.5 && uRarity < 0.75) { rarityTint = vec3(0.9, 0.9, 1.0); }
        else if (uRarity >= 0.75) { rarityTint = vec3(1.0, 0.95, 0.85); }
        combinedColor *= rarityTint;
        
        float edgeWidth = 0.005;
        float finalShapeAlpha = smoothstep(edgeWidth, -edgeWidth, dist);

        gl_FragColor = vec4(clamp(combinedColor, 0.0, 1.0), baseColorTex.a * finalShapeAlpha);
        return;
    }

        // --- Active Card Rendering Path (Full Original Logic) ---
        vec3 sampledNormalTex = texture2D(uNormalMap, uv).rgb;
        vec3 litContentColor;
        // uMouse is (-1 to 1) for card surface. Adjust for light direction.
        vec3 lightDir = normalize(vec3(uMouse.x * 0.7, uMouse.y * 0.7, 0.8));
        float ambientStrength = 0.7; // Ambient for active card content

        if (uLightingMode == 2.0) { // normalMap
            vec3 processedNormal = normalize(sampledNormalTex * 2.0 - 1.0);
            litContentColor = calculateLighting(contentColorTex.rgb, processedNormal, lightDir, vec3(1.0), ambientStrength, 1.5);
        } else if (uLightingMode == 1.0) { // flatSheen
            vec3 flatNormal = vec3(0.0, 0.0, 1.0);
            litContentColor = calculateLighting(contentColorTex.rgb, flatNormal, lightDir, vec3(1.0), ambientStrength, 0.9);
        } else { // none
            litContentColor = contentColorTex.rgb * ambientStrength;
        }

        vec3 baseOutput = mix(baseColorTex.rgb, litContentColor, contentColorTex.a);
        vec3 fullRarityEffectColor = baseOutput;

        // Rarity effects (only for active cards)
        if (uRarity >= 0.2 && uRarity < 0.5) { // Uncommon
            vec3 uncommonEffect = calculateUncommonEffect(uv, uTime, uMouse);
            float rarityFade = smoothstep(0.2, 0.35, uRarity) - smoothstep(0.5, 0.6, uRarity);
            fullRarityEffectColor = mix(fullRarityEffectColor, uncommonEffect, rarityFade * 0.8); // Modulate effect strength
        }
        else if (uRarity >= 0.5 && uRarity < 0.75) { // Rare Shimmer + Sheen
            float shimmerStrength = smoothstep(0.5, 0.6, uRarity) - smoothstep(0.75, 0.85, uRarity);
            float shimmer = pow(noise(uv * 6.0 + uTime * 0.2), 10.0) * 0.3;
            shimmer += pow(noise(uv * 12.0 - uTime * 0.1), 16.0) * 0.4;
            fullRarityEffectColor += shimmer * shimmerStrength * 0.8;

            if (uLightingMode == 2.0) {
                 vec3 processedNormalForSheen = normalize(sampledNormalTex * 2.0 - 1.0);
                 float rareSheenStrength = pow(max(0.0, dot(processedNormalForSheen, normalize(vec3(uMouse.x, uMouse.y, 0.7)))), 4.0);
                 fullRarityEffectColor += vec3(rareSheenStrength * 0.35 * shimmerStrength) * contentColorTex.a;
            }
        }
        else if (uRarity >= 0.75) { // Legendary Effect
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

        float overlayMixFactor = mix(1.0, uEffectOverlay, contentColorTex.a);
        vec3 finalColor = mix(baseOutput, fullRarityEffectColor, overlayMixFactor);
        finalColor += uHover * 0.12; // Hover glow for active card

        float edgeWidth = 0.005;
        float finalAlpha = smoothstep(edgeWidth, -edgeWidth, dist);
        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), baseColorTex.a * finalAlpha);
    }
  `
);

extend({ CardShaderMaterial });

// --- Card Mesh Component ---
export function CardMesh({
  rarity = "common", // Default rarity
  frontImage = "/textures/card_base.png", // Ensure this path is correct relative to public
  contentImage = "/textures/art/card_art_1.png", // Ensure this path is correct
  contentNormalMap = "/textures/placeholder_normal.png", // Default to placeholder
  effectOverlay = 0.0,
  cornerRadius = 0.05,
  lightingEffect = "flatSheen",
  position = [0, 0, 0],
}: CardMeshProps) {
  const meshRef = React.useRef<THREE.Mesh>(null!);
  const matRef = React.useRef<CardShaderMaterialType>(null!);
  const { gl } = useThree();

  const textures = useTexture([frontImage, contentImage, contentNormalMap]);
  const [baseTex, contentTex, normalMapTexture] = textures;

  React.useLayoutEffect(() => {
    textures.forEach((tex) => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      }
    });
    if (matRef.current) {
      matRef.current.uniforms.uBaseTexture.value = baseTex;
      matRef.current.uniforms.uContentTexture.value = contentTex;
      matRef.current.uniforms.uNormalMap.value = normalMapTexture;
    }
  }, [textures, baseTex, contentTex, normalMapTexture, gl.capabilities]);

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
    return 0.0;
  }, [lightingEffect]);

  const [isActive, setIsActive] = React.useState(false);
  const localMousePos = React.useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  const [{ rotX, rotY, scale, hover }, api] = useSpring(() => ({
    rotX: 0,
    rotY: 0,
    scale: 1,
    hover: 0,
    config: { mass: 0.4, tension: 200, friction: 25 },
  }));

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uTime += delta;
      matRef.current.uIsActive = isActive ? 1.0 : 0.0;
      matRef.current.uHover = (hover as SpringValue<number>).get();

      if (isActive) {
        matRef.current.uMouse.lerp(localMousePos.current, 0.12);
      } else {
        matRef.current.uMouse.lerp(new THREE.Vector2(0, 0), 0.12);
      }
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isActive || !meshRef.current) return;
    e.stopPropagation();

    if (e.uv) {
      const x = e.uv.x * 2 - 1;
      const y = -(e.uv.y * 2 - 1);
      localMousePos.current.set(x, y);

      const maxTilt = 20 * (Math.PI / 180);
      api.start({
        rotX: y * maxTilt * 0.4,
        rotY: x * maxTilt * 0.6,
      });
    }
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (e.object === meshRef.current) {
      e.stopPropagation();
      setIsActive(true);
      api.start({ scale: 1.08, hover: 1 });
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    if (
      !e.relatedTarget ||
      !meshRef.current.contains(e.relatedTarget as THREE.Object3D)
    ) {
      setIsActive(false);
      api.start({ rotX: 0, rotY: 0, scale: 1, hover: 0 });
      localMousePos.current.set(0, 0);
      document.body.style.cursor = "auto";
    }
  };

  const cardAspectRatio = 2.5 / 3.5;
  const cardWidth = 3;
  const cardHeight = cardWidth / cardAspectRatio;

  return (
    <a.mesh
      ref={meshRef}
      position={position}
      rotation-x={rotX as any}
      rotation-y={rotY as any}
      scale={scale as any}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <planeGeometry args={[cardWidth, cardHeight, 1, 1]} />
      <cardShaderMaterial
        ref={matRef}
        uRarity={rarityValue}
        transparent={true}
        side={THREE.DoubleSide}
        uEffectOverlay={effectOverlay}
        uCornerRadius={cornerRadius}
        uLightingMode={lightingModeValue}
      />
    </a.mesh>
  );
}
