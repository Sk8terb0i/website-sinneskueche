import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";

import Header from "../components/Header/Header";
import PersonalInfoCard from "../components/Profile/PersonalInfoCard";
import BookingsCard from "../components/Profile/BookingsCard";

import { LogOut, Loader2 } from "lucide-react";

export default function Profile({ currentLang, setCurrentLang }) {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || userData?.role === "admin") {
      navigate("/");
    }
  }, [currentUser, userData, authLoading, navigate]);

  if (authLoading || (!currentUser && !userData)) {
    return (
      <div style={styles.loadingWrapper}>
        <Loader2 className="spinner" size={40} color="#caaff3" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const t = {
    en: {
      title: "my profile",
      logout: "log out",
      edit: "edit info",
      save: "save",
      cancel: "cancel",
      firstName: "first name",
      lastName: "last name",
      email: "email address",
      phone: "phone",
      myCourses: "my booked dates",
      noCourses: "you haven't booked any dates yet.",
      browseCourses: "browse courses",
      credits: "Credits",
      remaining: "sessions remaining",
    },
    de: {
      title: "mein profil",
      logout: "abmelden",
      edit: "bearbeiten",
      save: "speichern",
      cancel: "abbrechen",
      firstName: "vorname",
      lastName: "nachname",
      email: "e-mail adresse",
      phone: "telefon",
      myCourses: "meine gebuchten termine",
      noCourses: "du hast noch keine termine gebucht.",
      browseCourses: "kurse durchstöbern",
      credits: "Guthaben",
      remaining: "termine übrig",
    },
  }[currentLang];

  return (
    <div style={styles.pageWrapper}>
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main style={styles.main}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>{t.title}</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={16} /> {t.logout}
          </button>
        </div>

        <div style={styles.grid}>
          {/* We pass the translation object 't' down to the components so we don't have to redefine it */}
          <PersonalInfoCard
            currentUser={currentUser}
            userData={userData}
            currentLang={currentLang}
            t={t}
          />
          <BookingsCard
            userId={currentUser.uid}
            currentLang={currentLang}
            t={t}
          />
        </div>
      </main>
    </div>
  );
}

const styles = {
  loadingWrapper: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffce3",
  },
  pageWrapper: {
    minHeight: "100vh",
    backgroundColor: "#fffce3",
    paddingBottom: "5rem",
  },
  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "140px 20px 20px 20px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "3.5rem",
    color: "#1c0700",
    margin: 0,
    textTransform: "lowercase",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fdf8e1",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    padding: "10px 20px",
    borderRadius: "100px",
    cursor: "pointer",
    fontFamily: "Satoshi",
    fontSize: "0.85rem",
    fontWeight: "bold",
    color: "#1c0700",
    transition: "all 0.2s",
  },
  grid: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
};
