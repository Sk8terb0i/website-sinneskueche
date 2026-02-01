import React, { useState, useEffect } from "react";
import TeamDesktop from "./TeamDesktop";
import TeamPortrait from "./TeamPortrait"; // Assuming you have or will create this

export default function Team({ currentLang, setCurrentLang }) {
  const [isMobile, setIsMobile] = useState(
    window.innerWidth / window.innerHeight < 1.1,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth / window.innerHeight < 1.1);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? (
    <TeamPortrait currentLang={currentLang} setCurrentLang={setCurrentLang} />
  ) : (
    <TeamDesktop currentLang={currentLang} setCurrentLang={setCurrentLang} />
  );
}
