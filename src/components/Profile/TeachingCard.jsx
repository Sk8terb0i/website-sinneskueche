import { useState, useEffect, useMemo } from "react";
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
} from "firebase/firestore";

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
  Users,
  Clock,
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

/**
 * --- INTERNAL TEACHING CARD COMPONENT ---
 * Styled exactly like BookingsCard
 */
function TeachingCard({ teachingEvents, isScheduleLoading, currentLang, t }) {
  const groupedTeaching = useMemo(() => {
    const grouped = {};
    teachingEvents.forEach((event) => {
      const title = getCleanCourseKey(event.link || event.coursePath);
      if (!grouped[title]) grouped[title] = [];
      grouped[title].push(event);
    });
    return grouped;
  }, [teachingEvents]);

  if (isScheduleLoading) {
    return (
      <section style={styles.adminCard}>
        <div style={styles.emptyState}>
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      </section>
    );
  }

  if (teachingEvents.length === 0) return null;

  return (
    <section style={styles.card}>
      <h3 style={styles.sectionHeading}>
        <BookOpen size={20} color="#4e5f28" />
        {t.teachingTitle}
      </h3>

      {Object.entries(groupedTeaching).map(([title, events]) => (
        <div key={title} style={styles.courseGroup}>
          <h4 style={styles.courseGroupTitle}>{title}</h4>
          <div style={styles.bookingsList}>
            {events.map((event) => {
              const dateObj = new Date(event.date);
              const hasCoInstructors =
                event.coInstructorNames && event.coInstructorNames.length > 0;

              return (
                <div key={event.id} style={styles.bookingItem}>
                  <div style={styles.bookingDateBox}>
                    <span style={styles.bookingMonth}>
                      {dateObj.toLocaleString(
                        currentLang === "en" ? "en-US" : "de-DE",
                        { month: "short" },
                      )}
                    </span>
                    <span style={styles.bookingDay}>{dateObj.getDate()}</span>
                  </div>

                  <div style={styles.bookingDetails}>
                    <div style={styles.row}>
                      <p style={styles.bookingTitle}>
                        {dateObj.toLocaleDateString(
                          currentLang === "en" ? "en-US" : "de-DE",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                      <div style={styles.infoRow}>
                        <div style={styles.metaItem}>
                          <Clock size={12} />{" "}
                          <span>{event.time || "--:--"}</span>
                        </div>
                        <div style={styles.metaItem}>
                          <Users size={12} />
                          <span
                            style={{
                              fontWeight: hasCoInstructors ? "800" : "500",
                              color: hasCoInstructors ? "#9960a8" : "inherit",
                            }}
                          >
                            {hasCoInstructors
                              ? `${t.workingWith} ${event.coInstructorNames.join(", ")}`
                              : t.workingAlone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * --- MAIN PROFILE PAGE ---
 */
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
      if (!currentUser) return;
      setIsScheduleLoading(true);
      try {
        const qPacks = query(
          collection(db, "course_settings"),
          where("hasPack", "==", true),
        );
        const packSnap = await getDocs(qPacks);
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
          ...eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          ...workSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ];

        const enriched = await Promise.all(
          rawEvents.map(async (ev) => {
            // Detect all instructor IDs from standard fields
            const instructorList =
              ev.instructors || (ev.instructorId ? [ev.instructorId] : []);
            const others = instructorList.filter(
              (id) => id !== currentUser.uid,
            );

            let names = [];
            if (others.length > 0) {
              const namePromises = others.map(async (id) => {
                const uDoc = await getDoc(doc(db, "users", id));
                return uDoc.exists() ? uDoc.data().firstName : null;
              });
              names = (await Promise.all(namePromises)).filter(Boolean);
            }
            return { ...ev, coInstructorNames: names };
          }),
        );

        setTeachingEvents(
          enriched
            .filter((e) => e.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
      } catch (err) {
        console.error("Error fetching profile data:", err);
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
      noEvents: "no upcoming classes.",
      workingWith: "working with:",
      workingAlone: "working alone",
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
      noEvents: "keine anstehenden kurse.",
      workingWith: "zusammen mit:",
      workingAlone: "alleine",
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
                  <TeachingCard
                    teachingEvents={teachingEvents}
                    isScheduleLoading={isScheduleLoading}
                    currentLang={currentLang}
                    t={t}
                  />
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
              <BuyPackCard
                packCourses={packCourses}
                currentLang={currentLang}
                t={t}
              />
            </div>
            <div style={styles.sideColumn}>
              <TeachingCard
                teachingEvents={teachingEvents}
                isScheduleLoading={isScheduleLoading}
                currentLang={currentLang}
                t={t}
              />
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

  // FIX: Added flexbox to the card header to ensure alignment
  card: {
    backgroundColor: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    width: "100%",
    boxSizing: "border-box",
  },
  sectionHeading: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    margin: "0 0 1.5rem 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
  },

  courseGroup: { marginBottom: "1.5rem" },
  courseGroupTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.3rem",
    color: "#9960a8",
    marginBottom: "0.8rem",
    textTransform: "lowercase",
    borderBottom: "1px solid rgba(153, 96, 168, 0.1)",
    paddingBottom: "4px",
  },
  bookingsList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  bookingItem: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.8rem",
    backgroundColor: "#fffce3",
    borderRadius: "16px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
  },
  bookingDateBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#caaff3",
    borderRadius: "10px",
    width: "45px",
    height: "45px",
    color: "#1c0700",
    flexShrink: 0,
  },
  bookingMonth: {
    fontSize: "0.55rem",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bookingDay: {
    fontSize: "1.1rem",
    fontFamily: "Harmond-SemiBoldCondensed",
    lineHeight: "1",
  },
  bookingDetails: { flex: 1 },
  bookingTitle: {
    margin: 0,
    fontFamily: "Satoshi",
    fontWeight: "700",
    fontSize: "0.95rem",
    color: "#1c0700",
  },
  infoRow: { display: "flex", gap: "12px", marginTop: "2px", flexWrap: "wrap" },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    opacity: 0.6,
  },
  emptyState: { padding: "1rem", textAlign: "center" },
  emptyText: { opacity: 0.5, fontStyle: "italic", fontSize: "0.9rem" },
};
