import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type GyroValue = {
  x: number; // normalized -1..1 (gamma)
  y: number; // normalized -1..1 (beta)
  // raw device values for debugging (gamma/beta from DeviceOrientation)
  deviceGamma: number;
  deviceBeta: number;
  // auto-calibration multiplier (applied to normalized values)
  sensitivity: number;
  // baseline (zeroing) values (normalized before sensitivity)
  baselineX: number;
  baselineY: number;
  recalibrate: () => void;
  recenter: () => void;
  enabled: boolean;
  hasPermission: boolean;
  requestAccess: () => Promise<void>;
  disable: () => void;
};

const DEFAULT: GyroValue = {
  x: 0,
  y: 0,
  deviceGamma: 0,
  deviceBeta: 0,
  sensitivity: 1,
  baselineX: 0,
  baselineY: 0,
  recalibrate: () => {},
  recenter: () => {},
  enabled: false,
  hasPermission: false,
  requestAccess: async () => {},
  disable: () => {},
};

const GyroContext = createContext<GyroValue>(DEFAULT);

export function GyroProvider({ children }: { children: React.ReactNode }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [deviceGamma, setDeviceGamma] = useState(0);
  const [deviceBeta, setDeviceBeta] = useState(0);

  // Auto-calibration state
  const [sensitivity, setSensitivity] = useState(1);
  const peakRef = useRef({ maxNorm: 0 });
  const calibratingRef = useRef(false);

  // Baseline (zeroing) accumulation while calibrating
  const baselineRef = useRef({ x: 0, y: 0 });
  const [baselineX, setBaselineX] = useState(0);
  const [baselineY, setBaselineY] = useState(0);
  const baselineSumRef = useRef({ x: 0, y: 0 });
  const baselineCountRef = useRef(0);

  function handleOrientation(e: DeviceOrientationEvent) {
    // gamma: left to right, range approx [-90, 90]
    // beta: front to back, range approx [-180, 180]
    const gamma = e.gamma ?? 0; // left/right
    const beta = e.beta ?? 0; // front/back

    // Store raw device values for debugging
    setDeviceGamma(gamma);
    setDeviceBeta(beta);

    // Normalize to -1..1
    const nx = gamma / 90;
    const ny = beta / 90;

    // Track peaks during calibration window
    const absNorm = Math.max(Math.abs(nx), Math.abs(ny));
    if (calibratingRef.current) {
      if (absNorm > peakRef.current.maxNorm) peakRef.current.maxNorm = absNorm;
      // accumulate baseline sum for zeroing
      baselineSumRef.current.x += nx;
      baselineSumRef.current.y += ny;
      baselineCountRef.current += 1;
    }

    // Bound to [-1,1] for context.x/y (raw normalized, will be scaled/offset later)
    targetRef.current.x = Math.max(-1, Math.min(1, nx));
    targetRef.current.y = Math.max(-1, Math.min(1, ny));
  }

  // Smoothly animate current -> target
  useEffect(() => {
    const step = () => {
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;
      // faster lerp for more responsive device tilt
      currentRef.current.x += (tx - currentRef.current.x) * 0.22;
      currentRef.current.y += (ty - currentRef.current.y) * 0.22;

      // Apply baseline zeroing then sensitivity scaling
      const adjX = currentRef.current.x - baselineRef.current.x;
      const adjY = currentRef.current.y - baselineRef.current.y;
      setX(adjX * sensitivity);
      setY(adjY * sensitivity);

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sensitivity]);

  const requestAccess = async () => {
    // iOS 13+ requires permission request
    if (
      typeof (DeviceOrientationEvent as any) !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const resp = await (DeviceOrientationEvent as any).requestPermission();
        if (resp === "granted") {
          setHasPermission(true);
          setEnabled(true);
          window.addEventListener("deviceorientation", handleOrientation);
          // start a short calibration by default
          startCalibration();
        } else {
          alert("Gyroscope permission denied");
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // non-iOS defaults
      setHasPermission(true);
      setEnabled(true);
      window.addEventListener("deviceorientation", handleOrientation);
      startCalibration();
    }
  };

  const disable = () => {
    setEnabled(false);
    setHasPermission(false);
    window.removeEventListener("deviceorientation", handleOrientation);
    targetRef.current = { x: 0, y: 0 };
  };

  // Calibration: measure peak normalized values for a short duration and compute sensitivity
  const startCalibration = (duration = 2000) => {
    peakRef.current.maxNorm = 0;
    calibratingRef.current = true;
    setTimeout(() => {
      calibratingRef.current = false;
      const peak = peakRef.current.maxNorm || 0.01;
      // sensitivity maps observed peak -> ~0.9 target normalized amplitude
      let computed = 0.9 / peak;
      // clamp reasonable bounds
      if (!isFinite(computed) || computed > 20) computed = 20;
      if (computed < 0.5) computed = 0.5;
      setSensitivity(computed);

      // compute baseline average from accumulated sums
      const count = baselineCountRef.current || 1;
      const bx = baselineSumRef.current.x / count;
      const by = baselineSumRef.current.y / count;
      baselineRef.current = { x: bx, y: by };
      setBaselineX(bx);
      setBaselineY(by);
      // reset sums
      baselineSumRef.current = { x: 0, y: 0 };
      baselineCountRef.current = 0;

      console.info(
        "Gyro auto-calibrated sensitivity:",
        computed.toFixed(2),
        "peak:",
        peak.toFixed(3),
        "baseline:",
        bx.toFixed(3),
        by.toFixed(3),
      );
    }, duration);
  };

  const recalibrate = () => startCalibration(2000);

  const recenter = () => {
    // Set baseline to current (raw normalized) readings
    baselineRef.current = { x: currentRef.current.x, y: currentRef.current.y };
    setBaselineX(baselineRef.current.x);
    setBaselineY(baselineRef.current.y);
    console.info("Gyro recentered baseline:", baselineRef.current);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <GyroContext.Provider
      value={{
        x,
        y,
        deviceGamma,
        deviceBeta,
        sensitivity,
        baselineX,
        baselineY,
        recalibrate,
        recenter,
        enabled,
        hasPermission,
        requestAccess,
        disable,
      }}
    >
      {children}
    </GyroContext.Provider>
  );
}

export function useGyro() {
  return useContext(GyroContext);
}

// Small UI toggle you can place anywhere in the app
export function GyroToggle() {
  const {
    enabled,
    hasPermission,
    requestAccess,
    disable,
    x,
    y,
    deviceGamma,
    deviceBeta,
    sensitivity,
    baselineX,
    baselineY,
    recalibrate,
    recenter,
  } = useGyro();

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        top: 12,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {!hasPermission ? (
        <button
          onClick={requestAccess}
          style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
        >
          Enable Gyro
        </button>
      ) : (
        <>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.6)",
              color: "white",
              fontSize: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div>
              x: {x.toFixed(2)} y: {y.toFixed(2)}
            </div>
            <div style={{ opacity: 0.85, fontSize: 11 }}>
              {enabled ? "On" : "Off"}
            </div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.45)",
              color: "white",
              fontSize: 11,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>gamma: {deviceGamma.toFixed(1)}</div>
            <div>beta: {deviceBeta.toFixed(1)}</div>
            <div style={{ opacity: 0.8, fontSize: 11 }}>
              {enabled ? "On" : "Off"}
            </div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.45)",
              color: "white",
              fontSize: 11,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>gamma: {deviceGamma.toFixed(1)}</div>
            <div>beta: {deviceBeta.toFixed(1)}</div>
            <div style={{ opacity: 0.8, fontSize: 11 }}>
              sens: {sensitivity.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.35)",
              color: "white",
              fontSize: 11,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>baselineX: {baselineX.toFixed(3)}</div>
            <div>baselineY: {baselineY.toFixed(3)}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => recalibrate()}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Recalibrate
            </button>
            <button
              onClick={() => recenter()}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Recenter
            </button>
            <button
              onClick={disable}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Disable
            </button>
          </div>
        </>
      )}
    </div>
  );
}
