import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei"; // Optional

interface CardGridProps {
  children: React.ReactNode; // To accept <CardMesh /> components as children
}

export default function CardGrid({ children }: CardGridProps) {
  // Destructure children from props
  // Card dimensions for camera positioning (can be approximate or removed if not needed)
  const cardWidth = 3;
  const cardHeight = cardWidth / (2.5 / 3.5);
  const numRowsEstimate = 2; // Estimate for camera, or make it a prop

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#1c1c1e",
        margin: 0,
        padding: 0,
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 15 + (numRowsEstimate * cardHeight) / 2],
          fov: 55,
        }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
      >
        <ambientLight intensity={0.6} />
        <pointLight
          position={[0, 10, 20]}
          intensity={1.0}
          distance={80}
          decay={1.5}
        />
        <pointLight
          position={[-15, -5, 15]}
          intensity={0.5}
          distance={70}
          decay={1.5}
          color="#aaccff"
        />

        <React.Suspense fallback={null}>
          {children} {/* Render the children passed to CardGrid */}
        </React.Suspense>
        {/* <OrbitControls /> */}
      </Canvas>
    </div>
  );
}
