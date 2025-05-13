// src/App.tsx
import React from "react";
import CardGrid from "./CardGrid";
import { CardMesh } from "./PlayingCard"; // Import CardMesh here
import "./App.css"; // Or your global stylesheet

function App() {
  // Ensure texture paths are correct relative to your `public` folder
  const baseCardTexture = "/textures/card_base.png";
  const placeholderNormal = "/textures/placeholder_normal.png";
  const artImage1 = "/textures/art/card_art_1.png";
  const artImage2 = "/textures/art/card_art_1.png";
  const artImage3 = "/textures/art/card_art_1.png";
  const normalImage1 = "/textures/normals/card_normal_1.png";

  return (
    <div
      className="App"
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <CardGrid>
        <CardMesh
          key="card-1"
          position={[-3.75, 0, 0]}
          rarity="common"
          lightingEffect="none"
          frontImage={baseCardTexture}
          contentImage={artImage1}
          contentNormalMap={placeholderNormal}
        />
        <CardMesh
          key="card-2"
          position={[0, 0, 0]}
          rarity="legendary"
          lightingEffect="normalMap"
          frontImage={baseCardTexture}
          contentImage={artImage2}
          contentNormalMap={normalImage1} // Assuming this normal map exists
        />
        <CardMesh
          key="card-3"
          position={[3.75, 0, 0]}
          rarity="rare"
          lightingEffect="flatSheen"
          frontImage={baseCardTexture}
          contentImage={artImage3}
          contentNormalMap={placeholderNormal}
        />
        {/* Add more CardMesh components as needed */}
      </CardGrid>
    </div>
  );
}

export default App;
