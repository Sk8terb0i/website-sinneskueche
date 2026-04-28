import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";

import Header from "../components/Header/Header";
import PersonalInfoCard from "../components/Profile/PersonalInfoCard";
import BookingsCard from "../components/Profile/BookingsCard";
import BuyPackCard from "../components/Profile/BuyPackCard";
import PackStatusCard from "../components/Profile/PackStatusCard";
import RentalBookingsCard from "../components/Profile/RentalBookingsCard";
import PotteryFiringCard from "../components/Profile/PotteryFiringCard";
import TeachingCard from "../components/Profile/TeachingCard";
import FamilyMemberCard from "../components/Profile/FamilyMemberCard";

import { LogOut, Loader2, User, Ticket, LayoutDashboard } from "lucide-react";

export default function Profile({ currentLang, setCurrentLang }) {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [packCourses, setPackCourses] = useState([]);
  const [teachingEvents, setTeachingEvents] = useState([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  const [hasPotteryHistory, setHasPotteryHistory] = useState(false);
  const [hasRentalAccess, setHasRentalAccess] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState("dashboard");

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
        const snap = await getDocs(
          query(
            collection(db, "bookings"),
            where("userId", "==", currentUser.uid),
          ),
        );
        setHasPotteryHistory(
          snap.docs.some((doc) =>
            doc.data().coursePath?.toLowerCase().includes("pottery"),
          ),
        );
      } catch (e) {
        console.error(e);
      }
    };
    checkPottery();
  }, [currentUser, userData]);

  useEffect(() => {
    const checkRentalAccess = async () => {
      if (!currentUser || !userData) return;
      try {
        const configDoc = await getDoc(doc(db, "settings", "admin_config"));
        if (configDoc.exists() && configDoc.data().showRentalInProfile) {
          setHasRentalAccess(true);
          return;
        }
        const snap = await getDocs(
          query(
            collection(db, "rental_bookings"),
            where("userId", "==", currentUser.uid),
            limit(1),
          ),
        );
        if (!snap.empty) setHasRentalAccess(true);
      } catch (e) {
        console.error(e);
      }
    };
    checkRentalAccess();
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
      if (!currentUser) return;
      setIsScheduleLoading(true);
      try {
        const packSnap = await getDocs(
          query(
            collection(db, "course_settings"),
            where("hasPack", "==", true),
          ),
        );
        setPackCourses(
          packSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );

        const today = new Date().toISOString().split("T")[0];
        const qEvents = query(
          collection(db, "events"),
          where("instructorId", "==", currentUser.uid),
          orderBy("date", "asc"),
        );
        const qWork = query(
          collection(db, "work_schedule"),
          where("userId", "==", currentUser.uid),
          orderBy("date", "asc"),
        );

        const [eventsSnap, workSnap] = await Promise.all([
          getDocs(qEvents),
          getDocs(qWork),
        ]);

        const rawEvents = [
          ...eventsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            fromEventsTable: true,
          })),
          ...workSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            fromEventsTable: false,
          })),
        ];

        const enriched = await Promise.all(
          rawEvents.map(async (ev) => {
            let coInstructorNames = [];
            if (ev.instructors) {
              const others = ev.instructors.filter(
                (id) => id !== currentUser.uid,
              );
              const names = await Promise.all(
                others.map(async (id) => {
                  const uDoc = await getDoc(doc(db, "users", id));
                  return uDoc.exists() ? uDoc.data().firstName : null;
                }),
              );
              coInstructorNames = names.filter(Boolean);
            } else {
              const othersSnap = await getDocs(
                query(
                  collection(db, "work_schedule"),
                  where("date", "==", ev.date),
                  where("coursePath", "==", ev.coursePath || ""),
                ),
              );
              const otherIds = othersSnap.docs
                .map((d) => d.data().userId)
                .filter((id) => id !== currentUser.uid);
              const names = await Promise.all(
                otherIds.map(async (id) => {
                  const uDoc = await getDoc(doc(db, "users", id));
                  return uDoc.exists() ? uDoc.data().firstName : null;
                }),
              );
              coInstructorNames = names.filter(Boolean);
            }
            return { ...ev, coInstructorNames };
          }),
        );
        setTeachingEvents(
          enriched
            .filter((e) => e.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setIsScheduleLoading(false);
      }
    };
    fetchProfileData();
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
      tabDashboard: "Home",
      tabShop: "Shop",
      tabMe: "Me",
      teachingTitle: "teaching schedule",
      workingWith: "working with:",
      workingAlone: "working alone",
      myCourses: "my booked dates",
      noCourses: "no bookings yet.",
      buyPack: "buy session pack",
      selectCourse: "select a course",
      buyNow: "buy pack",
      noCredits: "no active session packs yet.",
      rentalTitle: "rental management",
      credits: "credits",
      remaining: "remaining",
    },
    de: {
      title: "mein profil",
      logout: "abmelden",
      tabDashboard: "Home",
      tabShop: "Shop",
      tabMe: "Ich",
      teachingTitle: "stundenplan",
      workingWith: "zusammen mit:",
      workingAlone: "alleine",
      myCourses: "geplante termine",
      noCourses: "keine buchungen.",
      buyPack: "session-karte kaufen",
      selectCourse: "kurs auswählen",
      buyNow: "karte kaufen",
      noCredits: "noch kein guthaben vorhanden.",
      rentalTitle: "gemieteter raum",
      credits: "guthaben",
      remaining: "verbleibend",
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
          <h1 style={styles.title(isMobile)}>{t.title}</h1>
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
                <LayoutDashboard size={16} /> {t.tabDashboard}
              </button>
              <button
                onClick={() => setActiveTab("shop")}
                style={styles.tabBtn(activeTab === "shop")}
              >
                <Ticket size={16} /> {t.tabShop}
              </button>
              <button
                onClick={() => setActiveTab("me")}
                style={styles.tabBtn(activeTab === "me")}
              >
                <User size={16} /> {t.tabMe}
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
                  <TeachingCard
                    teachingEvents={teachingEvents}
                    isScheduleLoading={isScheduleLoading}
                    currentLang={currentLang}
                    t={t}
                    isMobile={isMobile}
                  />
                  <BookingsCard
                    userId={currentUser.uid}
                    currentLang={currentLang}
                    t={t}
                    userData={userData}
                  />
                  {hasRentalAccess && (
                    <RentalBookingsCard t={t} currentLang={currentLang} />
                  )}
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
                    userData={userData}
                  />
                </>
              )}
              {activeTab === "me" && (
                <>
                  <PersonalInfoCard
                    currentUser={currentUser}
                    userData={userData}
                    currentLang={currentLang}
                    t={t}
                  />
                  {/* Add Family Member Card Here */}
                  <FamilyMemberCard
                    currentUser={currentUser}
                    userData={userData}
                    currentLang={currentLang}
                  />
                </>
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
              {/* Add Family Member Card Here */}
              <FamilyMemberCard
                currentUser={currentUser}
                userData={userData}
                currentLang={currentLang}
              />
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
                userData={userData}
              />
            </div>
            <div style={styles.sideColumn}>
              <TeachingCard
                teachingEvents={teachingEvents}
                isScheduleLoading={isScheduleLoading}
                currentLang={currentLang}
                t={t}
                isMobile={isMobile}
              />
              {hasPotteryHistory && (
                <PotteryFiringCard
                  currentUser={currentUser}
                  currentLang={currentLang}
                />
              )}
              {hasRentalAccess && (
                <RentalBookingsCard t={t} currentLang={currentLang} />
              )}
              <BookingsCard
                userId={currentUser.uid}
                currentLang={currentLang}
                t={t}
                userData={userData}
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
  title: (isMobile) => ({
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "3.5rem",
    color: "#1c0700",
    margin: 0,
    textTransform: "lowercase",
    fontWeight: isMobile ? "normal" : undefined,
  }),
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    padding: "10px 5px",
    border: "none",
    background: isActive ? "#caaff3" : "transparent",
    color: "#1c0700",
    fontWeight: "800",
    borderRadius: "100px",
    cursor: "pointer",
    fontSize: "0.75rem",
  }),
  mobileContentStack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
};
