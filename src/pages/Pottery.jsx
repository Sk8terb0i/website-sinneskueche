import { useState } from "react";
import Header from "../components/Header/Header";
import "./Course.css";

export default function Pottery({ currentLang, setCurrentLang }) {
  const [currentTab, setCurrentTab] = useState("info");

  // --- ADD MENU STATE ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const content = {
    en: {
      title: "Pottery Tuesdays",
      description:
        "Join our pottery course almost every Tuesday. Suitable for beginners and advanced learners alike.",
    },
    de: {
      title: "Pottery Tuesdays",
      description:
        "Besuche unseren Töpferkurs fast jeden Dienstag. Für Anfänger und Fortgeschrittene geeignet.",
    },
  };

  const lang = currentLang;

  return (
    <div className="course-container">
      {/* --- PASS MENU PROPS TO HEADER --- */}
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
