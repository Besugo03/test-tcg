import React from "react";
import Tilt from "react-parallax-tilt";

interface CardGridProps {
  imageUrl: string; // URL of the image to be displayed
  size?: number; // Optional size property
}

export default function ThreeDCard({ imageUrl, size = 250 }: CardGridProps) {
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
      >
        <div
          className=" h-[23em] bg-amber-500 shadow-xl rounded-[16px] flex flex-col items-center justify-center text-white relative"
          // The `relative` class is important here for absolute positioning of the image
          style={{
            transformStyle: "preserve-3d",
            perspective: "600px",
            width: size / 1.4,
            height: size,
          }}
        >
          {/* NEW: Image Layer - Positioned visually and with translateZ */}
          {/* We'll position this image absolutely to center it, then apply translateZ */}
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

          {/* Inner Layer 3: Closer */}
          <div
            className="font-semibold p-1 rounded-xl flex flex-col items-center absolute" // Removed z-index
            style={{
              transform: `translateZ(60px) translateY(${size / 4}px)`, // Adjusted Y for spacing
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
