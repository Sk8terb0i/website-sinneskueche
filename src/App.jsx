import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Landing from "./pages/Landing";
import Pottery from "./pages/Pottery";
import Singing from "./pages/Singing";
import Team from "./pages/Team";
import Location from "./pages/Location";
import Contact from "./pages/Contact";
import Rent from "./pages/Rent";
import Admin from "./pages/Admin/Admin";
import PageTransition from "./components/PageTransition";
import { defaultLang } from "./i18n";

export default function App() {
  const [currentLang, setCurrentLang] = useState(defaultLang);
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
            <PageTransition>
              <Admin />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}
