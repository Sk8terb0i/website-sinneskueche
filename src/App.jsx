import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { AuthProvider } from "./contexts/AuthContext";

import { syncPlanetCourseNames } from "./data/planets";

import Landing from "./pages/Landing";
import Pottery from "./pages/Pottery";
import Singing from "./pages/Singing";
import Team from "./pages/Team";
import Location from "./pages/Location";
import Contact from "./pages/Contact";
import Rent from "./pages/Rent";
import TermsOfService from "./pages/Legal/TermsOfService";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
const Gallery = lazy(() => import("./pages/Gallery"));

import ArtisticVision from "./pages/ArtisticVision";
import ExtendedVoiceLab from "./pages/ExtendedVoiceLab";
import PerformingWords from "./pages/PerformingWords";
import SingingBasics from "./pages/SingingBasicsWeekend";
import GetInk from "./pages/GetInk";

// New Auth & Profile imports
import Profile from "./pages/Profile";
import Success from "./components/Confirm/Success";
import RegisterGuest from "./components/Profile/RegisterGuest";
import StudentFiringForm from "./pages/StudentFiringForm";
import InstructorAvailability from "./pages/InstructorAvailability";

import PageTransition from "./components/PageTransition";
import Footer from "./components/Footer/Footer";
import { defaultLang, languages } from "./i18n";
import { planets } from "./data/planets";

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

  useEffect(() => {
    syncPlanetCourseNames();
  }, []);

  const location = useLocation();

  useEffect(() => {
    // 1. Get the current path (e.g., '/pottery')
    const path = location.pathname;

    // 2. Find if this path matches a course in your planets data
    const allCourses = planets
      .filter((p) => p.type === "courses")
      .flatMap((p) => p.courses || []);
    const activeCourse = allCourses.find((c) => c.link === path);

    // 3. Select the <meta name="description"> tag
    const metaDescription = document.querySelector('meta[name="description"]');

    if (activeCourse) {
      // If it's a course page, set specific title and description
      document.title = `${activeCourse.text[currentLang]} | Sinnesküche`;
      if (metaDescription) {
        // You can add a specific 'seoDesc' to your planets data later,
        // or just use a generic one for now:
        metaDescription.content =
          currentLang === "en"
            ? `Join our ${activeCourse.text.en} course at Sinnesküche Schlieren. Creative community space.`
            : `Besuche ${activeCourse.text.de} in der Sinnesküche Schlieren. Kreativer Gemeinschaftsort.`;
      }
    } else if (path === "/") {
      // Reset for the homepage
      document.title = "Sinnesküche";
      if (metaDescription) {
        metaDescription.content =
          currentLang === "en"
            ? "The Sinnesküche is a creative community space offering multisensory courses."
            : "Die Sinnesküche ist ein kreativer Gemeinschaftsort in Schlieren.";
      }
    }
  }, [location.pathname, currentLang]);

  return (
    <div style={layoutStyle}>
      <div style={contentWrapperStyle}>
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
              path="/success"
              element={
                <PageTransition>
                  <Success
                    currentLang={currentLang}
                    setCurrentLang={setCurrentLang}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/gallery"
              element={
                <Suspense fallback={<div style={loadingContainerStyle} />}>
                  <PageTransition>
                    <Gallery
                      currentLang={currentLang}
                      setCurrentLang={setCurrentLang}
                    />
                  </PageTransition>
                </Suspense>
              }
            />

            <Route
              path="/privacy"
              element={
                <PageTransition>
                  <PrivacyPolicy
                    currentLang={currentLang}
                    setCurrentLang={setCurrentLang}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/terms"
              element={
                <PageTransition>
                  <TermsOfService
                    currentLang={currentLang}
                    setCurrentLang={setCurrentLang}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/terms/:courseId"
              element={
                <PageTransition>
                  <TermsOfService
                    currentLang={currentLang}
                    setCurrentLang={setCurrentLang}
                  />
                </PageTransition>
              }
            />

            <Route
              path="/register-guest"
              element={
                <PageTransition>
                  <RegisterGuest
                    currentLang={currentLang}
                    setCurrentLang={setCurrentLang}
                  />
                </PageTransition>
              }
            />

            <Route
              path="/firing-registration"
              element={
                <PageTransition>
                  <StudentFiringForm />
                </PageTransition>
              }
            />

            <Route
              path="/availability"
              element={
                <PageTransition>
                  <InstructorAvailability
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
      </div>
      <Footer currentLang={currentLang} key={location.pathname} />
    </div>
  );
}

const layoutStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#fffce3",
};

const contentWrapperStyle = {
  flex: 1,
};

const loadingContainerStyle = {
  width: "100vw",
  height: "100vh",
  backgroundColor: "#fffce3",
};
