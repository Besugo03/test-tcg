// src/App.tsx
import React from "react";
// No external App.css needed if styles are inline or via Tailwind arbitrary values

import Tilt from "react-parallax-tilt";
import { CardMesh } from "./PlayingCard";
import CardGrid from "./CardGrid";
import ThreeDCard from "./ThreeDCard";

// Assume your image is in the public folder: /image-to-add.png
const imageUrl = "/card_art_1.png"; // Replace with your actual image path

function App() {
  return (
    <>
      {/* <div
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
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
        >
          <div
            className="w-[250px] h-[350px] bg-amber-500 shadow-xl rounded-[16px] flex flex-col items-center justify-center text-white relative"
            // The `relative` class is important here for absolute positioning of the image
            style={{
              transformStyle: "preserve-3d",
              perspective: "600px",
            }}
          >
            {/* Inner Layer 1: Further Back 
            <div
              className="mb-[15px] text-[1.1em]" // Removed z-index as translateZ primarily dictates depth rendering
              style={{
                transform: "translateZ(-50px) translateY(-50px)", // Adjusted Y for spacing
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              Foto
            </div>

            {/* Inner Layer 2: Middle (Reference Plane) 
            <div
              className="mb-[15px] text-[1.2em] font-bold" // Removed z-index
              style={{
                // transform: "translateZ(0px)" // Explicitly 0, or omit for same effect
                color: "white",
                // No translateY, let it be naturally centered by flex column for now
                // Or give it a slight translateY if needed: translateY(0px)
              }}
            >
              Del mio pislelo
            </div>

            {/* NEW: Image Layer - Positioned visually and with translateZ h
            {/* We'll position this image absolutely to center it, then apply translateZ 
            <div
              // This div wrapper is for positioning and 3D transform.
              // It needs to be a block or inline-block to respect width/height for centering.
              className="absolute top-1/2 left-1/2 w-full" // Tailwind for centering via transform
              style={{
                // The transform below achieves centering AND the 3D effect
                transform: "translateX(-50%) translateY(-50%) translateZ(30px)",
                // translateZ(30px) places it between "Del mio pislelo" (0px) and "👀" (60px)
              }}
            >
              <img
                src={imageUrl}
                alt="Centered Card Art"
                className="w-full h-full object-contain rounded-md" // Tailwind for image styling
                // You might want object-cover or object-contain depending on the image aspect ratio
              />
            </div>

            {/* Inner Layer 3: Closer 
            <div
              className="text-[1.2em] font-semibold p-1 rounded-xl flex flex-col items-center" // Removed z-index
              style={{
                transform: "translateZ(60px) translateY(70px)", // Adjusted Y for spacing
                background: "rgba(0, 0, 0, 0.3)",
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
        <CardGrid>
        <CardMesh rarity="legendary" />
      </CardGrid>
      </div> */}
      <div className="flex">
        <ThreeDCard imageUrl={imageUrl} size={150} />
        <ThreeDCard imageUrl={imageUrl} />
        <ThreeDCard imageUrl={imageUrl} size={350} />
      </div>
    </>
  );
}

export default App;
