// src/react-three-fiber.d.ts

// This line can help ensure the file is treated as a module, which is good practice for global declarations.
export {};

import type { ShaderMaterialProps } from '@react-three/fiber';
// Make sure CardShaderMaterialUniforms is exported from PlayingCard.tsx
import type { CardShaderMaterialUniforms } from './PlayingCard';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // The key 'cardShaderMaterial' must be the lowercase version of the key
      // you used in `extend`. Since you used `extend({ CardShaderMaterial })`,
      // the JSX tag is `cardShaderMaterial`.
      cardShaderMaterial: ShaderMaterialProps & CardShaderMaterialUniforms;
    }
  }
}