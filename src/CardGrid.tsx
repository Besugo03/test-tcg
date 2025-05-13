import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface CardGridProps {
  children: React.ReactNode;
}

export default function CardGrid({ children }: CardGridProps) {
  const cardHeightEstimate = 3 / (2.5 / 3.5);
  const numRowsEstimate = 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1c1c1e",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 15 + (numRowsEstimate * cardHeightEstimate) / 3],
          fov: 55,
        }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        gl={{
          alpha: true, // For transparent canvas background if needed for baking
          antialias: false, // Antialiasing can sometimes affect pixel-perfect bakes
          preserveDrawingBuffer: true, // VERY IMPORTANT FOR CAPTURE
        }}
        onCreated={({ gl }) => {
          // Optional: Set clear color for baking if you want a specific background (e.g., fully transparent)
          gl.setClearColor(0x000000, 0); // Transparent black background
        }}
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

        <React.Suspense fallback={null}>{children}</React.Suspense>
        {/* <OrbitControls /> */}
      </Canvas>
    </div>
  );
}
