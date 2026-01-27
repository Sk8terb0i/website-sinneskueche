import userOrientation from "../hooks/userOrientation";
import LandingDesktop from "./LandingDesktop";
import LandingPortrait from "./LandingPortrait";

// Ensure the props ({ currentLang, setCurrentLang }) are here!
export default function Landing({ currentLang, setCurrentLang }) {
  const isPortrait = userOrientation();

  return isPortrait ? (
    <LandingPortrait
      currentLang={currentLang}
      setCurrentLang={setCurrentLang}
    />
  ) : (
    <LandingDesktop currentLang={currentLang} setCurrentLang={setCurrentLang} />
  );
}
