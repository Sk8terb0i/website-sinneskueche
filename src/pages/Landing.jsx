import { useState, useEffect, memo } from "react";
import userOrientation from "../hooks/userOrientation";
import LandingDesktop from "./LandingDesktop";
import LandingPortrait from "./LandingPortrait";
import { defaultLang } from "../i18n";
import { planets } from "../data/planets"; // Double check this path matches your folder structure

// 1. Isolated Preloader Component
const ImagePreloader = memo(() => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Start loading after 1.5s
    const timer = setTimeout(() => setShouldLoad(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad || !planets) return null;

  return (
    <div
      style={{
        position: "fixed",
        width: 0,
        height: 0,
        overflow: "hidden",
        zIndex: -1,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      {planets.map((planet) => (
        <div key={planet.id}>
          {/* Base icons */}
          {planet.icon?.en && <img src={planet.icon.en} alt="" />}
          {planet.icon?.de && <img src={planet.icon.de} alt="" />}
          {/* Hover icons */}
          {planet.iconHover?.en && <img src={planet.iconHover.en} alt="" />}
          {planet.iconHover?.de && <img src={planet.iconHover.de} alt="" />}
        </div>
      ))}
    </div>
  );
});

export default function Landing() {
  const isPortrait = userOrientation();
  const [currentLang, setCurrentLang] = useState(defaultLang);

  return (
    <>
      <ImagePreloader />
      {isPortrait ? (
        <LandingPortrait
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
        />
      ) : (
        <LandingDesktop
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
        />
      )}
    </>
  );
}
