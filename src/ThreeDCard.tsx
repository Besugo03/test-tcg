import React from "react";
import Tilt from "react-parallax-tilt";
import { useGyro } from "./components/GyroProvider";
import { Canvas } from "@react-three/fiber";
import { CardMesh } from "./PlayingCard";

interface CardGridProps {
  imageUrl: string; // URL of the image to be displayed
  size?: number; // Optional size property
}

export default function ThreeDCard({ imageUrl, size = 250 }: CardGridProps) {
  const gyro = useGyro();
  const rx = -gyro.y * 15; // degrees
  const ry = gyro.x * 15; // degrees

  return (
    <div
      style={{
        margin: 0,
        padding: size / 12,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2d3748", // Dark page background
      }}
    >
      <Tilt
        className="inline-block shadow-lg"
        style={{
          transformStyle: "preserve-3d",
        }}
        perspective={800}
        glareEnable={true}
        glareMaxOpacity={0.3}
        glarePosition="all"
        scale={1.0}
        // when gyro is active we disable the library's mouse tilt so we can control transform directly
        tiltEnable={!gyro.enabled}
      >
        <div
          className=" h-[23em] bg-amber-500 shadow-xl rounded-[20px] flex flex-col items-center justify-center text-white relative"
          // The `relative` class is important here for absolute positioning of the image
          style={{
            transformStyle: "preserve-3d",
            perspective: "400px",
            width: size / 1.9,
            height: size,
            transform: `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`,

            transition: "transform 0.08s linear",
          }}
        >
          {/* WebGL Card Preview - use the real shader-driven CardMesh so you can test rarities */}
          <div
            className="absolute top-1/2 left-1/2 w-full h-full"
            style={{
              transform: "translateX(-50%) translateY(-50%)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              <Canvas
                camera={{ position: [0, 0, 6], fov: 50 }}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                }}
              >
                <ambientLight intensity={0.6} />
                <pointLight position={[5, 5, 10]} intensity={1.0} />
                <React.Suspense fallback={null}>
                  <CardMesh rarity="uncommon" />
                </React.Suspense>
              </Canvas>
            </div>
          </div>

          {/* Overlay UI (text) - kept on top of the WebGL canvas */}
          <div
            className="font-semibold p-1 rounded-xl flex flex-col items-center absolute"
            style={{
              transform: `translateZ(60px) translateY(${size / 4}px)`,
              background: "rgba(0, 0, 0, 0.3)",
              fontSize: `${size / 250}em`,
            }}
          >
            <div className="text-pink-300">Gotoh Hitori</div>
            <div className="text-[0.5em]">finalmente funziona</div>
            <div className="text-purple-400 text-border-2 bg-black ps-1 pe-1 rounded-md">
              Rare
            </div>
          </div>
        </div>
      </Tilt>
      {/* <CardGrid>
      <CardMesh rarity="legendary" />
    </CardGrid> */}
    </div>
  );
}
