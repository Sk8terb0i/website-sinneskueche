import userOrientation from "../hooks/userOrientation";
import LandingDesktop from "./LandingDesktop";
import LandingPortrait from "./LandingPortrait";
import { defaultLang } from "../i18n";
import { useState } from "react";

export default function Landing() {
  const isPortrait = userOrientation();
  const [currentLang, setCurrentLang] = useState(defaultLang);

  return isPortrait ? (
    <LandingPortrait
      currentLang={currentLang}
      setCurrentLang={setCurrentLang}
    />
  ) : (
    <LandingDesktop currentLang={currentLang} setCurrentLang={setCurrentLang} />
  );
}
