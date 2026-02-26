import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { AuthProvider } from "./contexts/AuthContext";

import Landing from "./pages/Landing";
import Pottery from "./pages/Pottery";
import Singing from "./pages/Singing";
import Team from "./pages/Team";
import Location from "./pages/Location";
import Contact from "./pages/Contact";
import Rent from "./pages/Rent";

import ArtisticVision from "./pages/ArtisticVision";
import ExtendedVoiceLab from "./pages/ExtendedVoiceLab";
import PerformingWords from "./pages/PerformingWords";
import SingingBasics from "./pages/SingingBasicsWeekend";
import GetInk from "./pages/GetInk";

// New Auth & Profile imports
import Profile from "./pages/Profile";

import PageTransition from "./components/PageTransition";
import { defaultLang, languages } from "./i18n";

// dynamic import for admin
const Admin = lazy(() => import("./pages/Admin/Admin"));

export default function App() {
  const [currentLang, setCurrentLang] = useState(() => {
    const savedLang = localStorage.getItem("userLanguage");
    return savedLang && languages[savedLang] ? savedLang : defaultLang;
  });

  useEffect(() => {
    localStorage.setItem("userLanguage", currentLang);
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const location = useLocation();

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Landing
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/profile"
            element={
              <PageTransition>
                <Profile
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/pottery"
            element={
              <PageTransition>
                <Pottery
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/singing"
            element={
              <PageTransition>
                <Singing
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/artistic-vision"
            element={
              <PageTransition>
                <ArtisticVision
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/extended-voice-lab"
            element={
              <PageTransition>
                <ExtendedVoiceLab
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/performing-words"
            element={
              <PageTransition>
                <PerformingWords
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/singing-basics"
            element={
              <PageTransition>
                <SingingBasics
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/get-ink"
            element={
              <PageTransition>
                <GetInk
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/team"
            element={
              <PageTransition>
                <Team
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/location"
            element={
              <PageTransition>
                <Location
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/contact"
            element={
              <PageTransition>
                <Contact
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/rent"
            element={
              <PageTransition>
                <Rent
                  currentLang={currentLang}
                  setCurrentLang={setCurrentLang}
                />
              </PageTransition>
            }
          />

          <Route
            path="/admin-sinneskueche"
            element={
              <Suspense fallback={<div style={loadingContainerStyle} />}>
                <PageTransition>
                  {/* Pass the props here! */}
                  <Admin
                    currentLang={currentLang}
                    setCurrentLang={setCurrentLang}
                  />
                </PageTransition>
              </Suspense>
            }
          />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
}

const loadingContainerStyle = {
  width: "100vw",
  height: "100vh",
  backgroundColor: "#fffce3",
};
