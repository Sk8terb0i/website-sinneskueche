import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Pottery from "./pages/Pottery";
import Singing from "./pages/Singing";
import Team from "./pages/Team";
import Location from "./pages/Location";
import Contact from "./pages/Contact";
import Rent from "./pages/Rent";
import { defaultLang } from "./i18n";

export default function App() {
  const [currentLang, setCurrentLang] = useState(defaultLang);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Landing currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
      <Route
        path="/pottery"
        element={
          <Pottery currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
      <Route
        path="/singing"
        element={
          <Singing currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
      <Route
        path="/team"
        element={
          <Team currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
      <Route
        path="/location"
        element={
          <Location currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
      <Route
        path="/contact"
        element={
          <Contact currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
      <Route
        path="/rent"
        element={
          <Rent currentLang={currentLang} setCurrentLang={setCurrentLang} />
        }
      />
    </Routes>
  );
}
