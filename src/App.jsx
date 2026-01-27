import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Landing from "./pages/Landing";
import Pottery from "./pages/Pottery";
import Singing from "./pages/Singing";
import Team from "./pages/Team";
import Location from "./pages/Location";
import Contact from "./pages/Contact";
import Rent from "./pages/Rent";

import PageTransition from "./components/PageTransition";
import { defaultLang, languages } from "./i18n";

// Dynamic Import for Admin
const Admin = lazy(() => import("./pages/Admin/Admin"));

export default function App() {
  // 1. Initialize state from localStorage.
  // If nothing is saved, fall back to defaultLang.
  const [currentLang, setCurrentLang] = useState(() => {
    const savedLang = localStorage.getItem("userLanguage");
    // Ensure the saved language is actually valid based on your i18n file
    return savedLang && languages[savedLang] ? savedLang : defaultLang;
  });

  // 2. Sync language preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("userLanguage", currentLang);
  }, [currentLang]);

  const location = useLocation();

  return (
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
          path="/team"
          element={
            <PageTransition>
              <Team currentLang={currentLang} setCurrentLang={setCurrentLang} />
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
              <Rent currentLang={currentLang} setCurrentLang={setCurrentLang} />
            </PageTransition>
          }
        />

        <Route
          path="/admin-sinneskueche"
          element={
            <Suspense fallback={<div style={loadingContainerStyle} />}>
              <PageTransition>
                <Admin />
              </PageTransition>
            </Suspense>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

// Simple style to prevent layout shift while Admin loads
const loadingContainerStyle = {
  width: "100vw",
  height: "100vh",
  backgroundColor: "#fffce3",
};
