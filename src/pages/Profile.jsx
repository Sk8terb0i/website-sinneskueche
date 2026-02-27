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

import { LogOut, Loader2, Calendar, User, Ticket } from "lucide-react";

export default function Profile({ currentLang, setCurrentLang }) {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [packCourses, setPackCourses] = useState([]);

  // --- NEW STATE FOR TABS AND RESPONSIVE DESIGN ---
  const [activeTab, setActiveTab] = useState("bookings");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || userData?.role === "admin") navigate("/");
  }, [currentUser, userData, authLoading, navigate]);

  // --- HANDLE SCREEN RESIZING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- SCROLL TO TOP ON TAB CHANGE ---
  useEffect(() => {
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab, isMobile]);

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
      tabBookings: "Bookings",
      tabProfile: "Info",
      tabPacks: "Packs",
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
      tabBookings: "Termine",
      tabProfile: "Profil",
      tabPacks: "Karten",
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

        {/* --- MOBILE TAB NAVIGATION --- */}
        {isMobile && (
          <div style={styles.tabNav}>
            <button
              onClick={() => setActiveTab("bookings")}
              style={styles.tabBtn(activeTab === "bookings")}
            >
              <Calendar size={16} /> {t.tabBookings}
            </button>
            <button
              onClick={() => setActiveTab("info")}
              style={styles.tabBtn(activeTab === "info")}
            >
              <User size={16} /> {t.tabProfile}
            </button>
            <button
              onClick={() => setActiveTab("packs")}
              style={styles.tabBtn(activeTab === "packs")}
            >
              <Ticket size={16} /> {t.tabPacks}
            </button>
          </div>
        )}

        <div style={styles.grid}>
          {/* PERSONAL INFO CARD */}
          {(!isMobile || activeTab === "info") && (
            <PersonalInfoCard
              currentUser={currentUser}
              userData={userData}
              currentLang={currentLang}
              packCourses={packCourses}
              t={t}
            />
          )}

          <div style={styles.sideColumn}>
            {/* BUY PACK CARD */}
            {(!isMobile || activeTab === "packs") && (
              <BuyPackCard
                packCourses={packCourses}
                currentLang={currentLang}
                t={t}
              />
            )}

            {/* BOOKINGS CARD */}
            {(!isMobile || activeTab === "bookings") && (
              <BookingsCard
                userId={currentUser.uid}
                currentLang={currentLang}
                t={t}
              />
            )}
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
    padding:
      window.innerWidth < 1024
        ? "120px 15px 20px 15px"
        : "140px 20px 20px 20px",
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
    fontSize: window.innerWidth < 768 ? "2.5rem" : "3.5rem",
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
    width: "100%",
  },
  // --- STYLES FOR TABS ---
  tabNav: {
    display: "flex",
    background: "rgba(202, 175, 243, 0.1)",
    padding: "6px",
    borderRadius: "100px",
    marginBottom: "2rem",
    gap: "6px",
    border: "1px solid rgba(202, 175, 243, 0.3)",
  },
  tabBtn: (isActive) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 10px",
    border: "none",
    background: isActive ? "#caaff3" : "transparent",
    color: "#1c0700",
    fontWeight: "800",
    borderRadius: "100px",
    cursor: "pointer",
    fontFamily: "Satoshi",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.03rem",
    transition: "all 0.2s ease",
  }),
};
