import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";

import Header from "../components/Header/Header";
import PersonalInfoCard from "../components/Profile/PersonalInfoCard";
import BookingsCard from "../components/Profile/BookingsCard";
import BuyPackCard from "../components/Profile/BuyPackCard";

import { LogOut, Loader2 } from "lucide-react";

export default function Profile({ currentLang, setCurrentLang }) {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [packCourses, setPackCourses] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || userData?.role === "admin") navigate("/");
  }, [currentUser, userData, authLoading, navigate]);

  useEffect(() => {
    const fetchPackSettings = async () => {
      try {
        const q = query(
          collection(db, "course_settings"),
          where("hasPack", "==", true),
        );
        const snap = await getDocs(q);
        setPackCourses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching pack settings:", err);
      }
    };
    if (currentUser) fetchPackSettings();
  }, [currentUser]);

  if (authLoading || (!currentUser && !userData)) {
    return (
      <div style={styles.loadingWrapper}>
        <Loader2 className="spinner" size={40} color="#caaff3" />
      </div>
    );
  }

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
      noCourses: "no bookings yet.",
      credits: "credits",
      remaining: "sessions remaining",
      buyPack: "buy session pack",
      selectCourse: "select a course",
      buyNow: "buy pack",
      topUp: "top up credits",
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
      myCourses: "geplante termine",
      noCourses: "keine buchungen.",
      credits: "guthaben",
      remaining: "termine übrig",
      buyPack: "session-karte kaufen",
      selectCourse: "kurs auswählen",
      buyNow: "karte kaufen",
      topUp: "guthaben aufladen",
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
          <button onClick={() => signOut(auth)} style={styles.logoutBtn}>
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
        <div style={styles.grid}>
          <PersonalInfoCard
            currentUser={currentUser}
            userData={userData}
            currentLang={currentLang}
            packCourses={packCourses}
            t={t}
          />
          <div style={styles.sideColumn}>
            <BuyPackCard
              packCourses={packCourses}
              currentLang={currentLang}
              t={t}
            />
            <BookingsCard
              userId={currentUser.uid}
              currentLang={currentLang}
              t={t}
            />
          </div>
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
    maxWidth: "1200px",
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
  },
  grid: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  sideColumn: {
    flex: "1 1 500px",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
};
