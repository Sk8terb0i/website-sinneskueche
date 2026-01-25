import { useState } from "react";
import Header from "../components/Header/Header";
import "./Course.css";

export default function Pottery({ currentLang, setCurrentLang }) {
  const [currentTab, setCurrentTab] = useState("info"); // optional: tabs for sessions, materials, etc.

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const content = {
    en: {
      title: "Location",
      description: "",
    },
    de: {
      title: "Navigation",
      description: "",
    },
  };

  const lang = currentLang;

  return (
    <div className="course-container">
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main className="course-main">
        <h1 className="course-title">{content[lang].title}</h1>
        <p className="course-description">{content[lang].description}</p>
      </main>
    </div>
  );
}
