import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import PlayingCard from "./PlayingCard";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>New card found!</h1>
      <h1>Gotoh Hitori</h1>
      {/* pink text */}
      <h2 style={{ color: "pink" }}>Rare</h2>
      {/* flex center */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <PlayingCard />
      </div>
    </>
  );
}

export default App;
