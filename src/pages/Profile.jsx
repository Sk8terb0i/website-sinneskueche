import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

import Header from "../components/Header/Header";
import PersonalInfoCard from "../components/Profile/PersonalInfoCard";
import BookingsCard from "../components/Profile/BookingsCard";
import BuyPackCard from "../components/Profile/BuyPackCard";
import PackStatusCard from "../components/Profile/PackStatusCard";
import RentalBookingsCard from "../components/Profile/RentalBookingsCard";
import PotteryFiringCard from "../components/Profile/PotteryFiringCard";

import {
  LogOut,
  Loader2,
  Calendar,
  User,
  Ticket,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";

const courseMapping = {
  "/pottery": "pottery tuesdays",
  "/artistic-vision": "artistic vision",
  "/get-ink": "get ink!",
  "/singing": "vocal coaching",
  "/extended-voice-lab": "extended voice lab",
  "/performing-words": "performing words",
  "/singing-basics": "singing basics weekend",
};

const getCleanCourseKey = (path) =>
  courseMapping[path] || (path ? path.replace(/\//g, "") : "workshop");

export default function Profile({ currentLang, setCurrentLang }) {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [packCourses, setPackCourses] = useState([]);
  const [teachingEvents, setTeachingEvents] = useState([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [hasPotteryHistory, setHasPotteryHistory] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState("dashboard");

  const isAdmin =
    userData?.role === "admin" || userData?.role === "course_admin";

  // POTTERY LOGIC: Firing status visible if user has a code or past pottery bookings
  useEffect(() => {
    const checkPottery = async () => {
      if (!currentUser || !userData) return;

      const hasCode = !!userData.firingCode;
      const hasCredits =
        userData.credits &&
        Object.keys(userData.credits).some((k) =>
          k.toLowerCase().includes("pottery"),
        );

      if (hasCode || hasCredits) {
        setHasPotteryHistory(true);
        return;
      }

      try {
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", currentUser.uid),
        );
        const snap = await getDocs(q);
        const bookedPottery = snap.docs.some((doc) =>
          doc.data().coursePath?.toLowerCase().includes("pottery"),
        );
        setHasPotteryHistory(bookedPottery);
      } catch (e) {
        console.error(e);
      }
    };
    checkPottery();
  }, [currentUser, userData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!authLoading && !currentUser) navigate("/");
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const qPacks = query(
          collection(db, "course_settings"),
          where("hasPack", "==", true),
        );
        const packSnap = await getDocs(qPacks);
        setPackCourses(
          packSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );

        if (isAdmin) {
          setIsScheduleLoading(true);
          const qTeach = query(
            collection(db, "events"),
            where("instructorId", "==", currentUser.uid),
            orderBy("date", "asc"),
          );
          const teachSnap = await getDocs(qTeach);
          const today = new Date().toISOString().split("T")[0];
          setTeachingEvents(
            teachSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((e) => e.date >= today),
          );
          setIsScheduleLoading(false);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (currentUser) fetchProfileData();
  }, [currentUser, isAdmin]);

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
      tabDashboard: "Home",
      tabShop: "Shop",
      tabMe: "Me",
      teachingTitle: "teaching schedule",
      noEvents: "no upcoming classes to teach.",
      myCourses: "my booked dates",
      noCourses: "no bookings yet.",
      rentalTitle: "rental management",
      buyPack: "buy session pack",
      selectCourse: "select a course",
      buyNow: "buy pack",
      credits: "existing credits",
      noCredits: "no active session packs yet.",
      firstName: "first name",
      lastName: "last name",
      email: "email address",
      phone: "phone",
    },
    de: {
      title: "mein profil",
      logout: "abmelden",
      tabDashboard: "Home",
      tabShop: "Shop",
      tabMe: "Ich",
      teachingTitle: "stundenplan",
      noEvents: "keine anstehenden kurse als lehrer.",
      myCourses: "geplante termine",
      noCourses: "keine buchungen.",
      rentalTitle: "gemieteter raum",
      buyPack: "session-karte kaufen",
      selectCourse: "kurs auswählen",
      buyNow: "karte kaufen",
      credits: "vorhandenes guthaben",
      noCredits: "noch kein guthaben vorhanden.",
      firstName: "vorname",
      lastName: "nachname",
      email: "e-mail adresse",
      phone: "telefon",
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

        {isMobile ? (
          <>
            <div style={styles.tabNav}>
              <button
                onClick={() => setActiveTab("dashboard")}
                style={styles.tabBtn(activeTab === "dashboard")}
              >
                <LayoutDashboard size={18} /> {t.tabDashboard}
              </button>
              <button
                onClick={() => setActiveTab("shop")}
                style={styles.tabBtn(activeTab === "shop")}
              >
                <Ticket size={18} /> {t.tabShop}
              </button>
              <button
                onClick={() => setActiveTab("me")}
                style={styles.tabBtn(activeTab === "me")}
              >
                <User size={18} /> {t.tabMe}
              </button>
            </div>
            <div style={styles.mobileContentStack}>
              {activeTab === "dashboard" && (
                <>
                  {hasPotteryHistory && (
                    <PotteryFiringCard
                      currentUser={currentUser}
                      currentLang={currentLang}
                    />
                  )}
                  {isAdmin && (
                    <div style={styles.adminCard}>
                      <h2 style={styles.cardTitle}>
                        <BookOpen size={20} /> {t.teachingTitle}
                      </h2>
                      {isScheduleLoading ? (
                        <Loader2 className="spinner" />
                      ) : teachingEvents.length > 0 ? (
                        teachingEvents.map((e) => (
                          <div key={e.id} style={styles.miniEvent}>
                            {e.date} — {getCleanCourseKey(e.link)}
                          </div>
                        ))
                      ) : (
                        <p style={styles.emptyText}>{t.noEvents}</p>
                      )}
                    </div>
                  )}
                  <BookingsCard
                    userId={currentUser.uid}
                    currentLang={currentLang}
                    t={t}
                  />
                  <RentalBookingsCard t={t} currentLang={currentLang} />
                </>
              )}
              {activeTab === "shop" && (
                <>
                  <PackStatusCard
                    currentUser={currentUser}
                    userData={userData}
                    currentLang={currentLang}
                    packCourses={packCourses}
                    t={t}
                  />
                  <BuyPackCard
                    packCourses={packCourses}
                    currentLang={currentLang}
                    t={t}
                  />
                </>
              )}
              {activeTab === "me" && (
                <PersonalInfoCard
                  currentUser={currentUser}
                  userData={userData}
                  currentLang={currentLang}
                  t={t}
                />
              )}
            </div>
          </>
        ) : (
          <div style={styles.grid}>
            <div style={styles.leftColumn}>
              <PersonalInfoCard
                currentUser={currentUser}
                userData={userData}
                currentLang={currentLang}
                t={t}
              />
              <PackStatusCard
                currentUser={currentUser}
                userData={userData}
                currentLang={currentLang}
                packCourses={packCourses}
                t={t}
              />
              {/* BuyPackCard moved here for Desktop view */}
              <BuyPackCard
                packCourses={packCourses}
                currentLang={currentLang}
                t={t}
              />
            </div>
            <div style={styles.sideColumn}>
              {isAdmin && teachingEvents.length > 0 && (
                <div style={styles.adminCard}>
                  <h2 style={styles.cardTitle}>
                    <BookOpen size={20} /> {t.teachingTitle}
                  </h2>
                  {teachingEvents.map((e) => (
                    <div key={e.id} style={styles.miniEvent}>
                      {e.date} — {getCleanCourseKey(e.link)}
                    </div>
                  ))}
                </div>
              )}
              {hasPotteryHistory && (
                <PotteryFiringCard
                  currentUser={currentUser}
                  currentLang={currentLang}
                />
              )}
              <RentalBookingsCard t={t} currentLang={currentLang} />
              <BookingsCard
                userId={currentUser.uid}
                currentLang={currentLang}
                t={t}
              />
            </div>
          </div>
        )}
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
    fontWeight: "bold",
  },
  grid: { display: "flex", gap: "2rem", alignItems: "flex-start" },
  leftColumn: {
    flex: "1 1 400px",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  sideColumn: {
    flex: "1 1 600px",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
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
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "12px 5px",
    border: "none",
    background: isActive ? "#caaff3" : "transparent",
    color: "#1c0700",
    fontWeight: "800",
    borderRadius: "100px",
    cursor: "pointer",
    fontSize: "0.7rem",
  }),
  mobileContentStack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  adminCard: {
    backgroundColor: "#fdf8e1",
    padding: "2rem",
    borderRadius: "24px",
    border: "1px solid rgba(78, 95, 40, 0.1)",
    marginBottom: "1rem",
  },
  cardTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    color: "#1c0700",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "1.5rem",
  },
  miniEvent: {
    padding: "12px",
    borderBottom: "1px solid rgba(28,7,0,0.05)",
    fontSize: "0.95rem",
    fontWeight: "600",
  },
  emptyText: { opacity: 0.5, fontStyle: "italic", fontSize: "0.9rem" },
};
