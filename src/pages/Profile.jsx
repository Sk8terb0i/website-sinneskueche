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
} from "firebase/firestore";

import Header from "../components/Header/Header";
import PersonalInfoCard from "../components/Profile/PersonalInfoCard";
import BookingsCard from "../components/Profile/BookingsCard";
import BuyPackCard from "../components/Profile/BuyPackCard";
import RentalBookingsCard from "../components/Profile/RentalBookingsCard";
import PotteryFiringCard from "../components/Profile/PotteryFiringCard";

import {
  LogOut,
  Loader2,
  Calendar,
  User,
  Ticket,
  BookOpen,
  Clock,
  Users,
  Star,
  MapPin,
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
  const [activeTab, setActiveTab] = useState("bookings");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const isAdmin =
    userData?.role === "admin" || userData?.role === "course_admin";

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) navigate("/");
  }, [currentUser, userData, authLoading, navigate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    const fetchAssignedSchedule = async () => {
      if (!userData || !isAdmin || !currentUser) return;
      setIsScheduleLoading(true);
      try {
        const sSnap = await getDocs(collection(db, "work_schedule"));
        const allData = sSnap.docs.map((d) => d.data());
        const schSnap = await getDocs(collection(db, "schedules"));
        const schMap = {};
        schSnap.docs.forEach((d) => (schMap[d.id] = d.data()));
        const myIds = allData
          .filter((d) => d.userId === currentUser.uid)
          .map((d) => d.eventId);
        if (myIds.length === 0) {
          setTeachingEvents([]);
          return;
        }
        const uSnap = await getDocs(collection(db, "users"));
        const uMap = {};
        uSnap.docs.forEach(
          (d) => (uMap[d.id] = `${d.data().firstName} ${d.data().lastName}`),
        );
        const today = new Date().toISOString().split("T")[0];
        const eSnap = await getDocs(
          query(collection(db, "events"), orderBy("date", "asc")),
        );
        const bSnap = await getDocs(collection(db, "bookings"));
        const allB = bSnap.docs.map((d) => d.data());

        const filtered = await Promise.all(
          eSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((e) => myIds.includes(e.id) && e.date >= today)
            .map(async (e) => {
              const sid = (e.coursePath || e.link || "").replace(/\//g, "");
              const co = allData
                .filter(
                  (d) => d.eventId === e.id && d.userId !== currentUser.uid,
                )
                .map((d) => uMap[d.userId] || "Unknown");
              const config = schMap[sid];
              const aList = config?.specialAssignments?.[e.id] || [];
              const rAddons = (Array.isArray(aList) ? aList : [aList])
                .filter(Boolean)
                .map((aid) => {
                  const bCount = allB.filter(
                    (b) =>
                      b.eventId === e.id &&
                      b.selectedAddons?.includes(aid) &&
                      b.status === "confirmed",
                  ).length;
                  return { name: aid, bookedCount: bCount };
                });
              return {
                ...e,
                displayName: getCleanCourseKey(e.coursePath || e.link),
                coInstructors: co, // Normalized property name
                addons: rAddons,
              };
            }),
        );
        setTeachingEvents(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setIsScheduleLoading(false);
      }
    };
    fetchAssignedSchedule();
  }, [userData, isAdmin, currentUser, currentLang]);

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
      tabSchedule: "Schedule",
      tabRental: "Rentals",
      historyTitle: "credit history",
      teachingTitle: "my teaching schedule",
      rentalTitle: "my rental bookings",
      noEvents: "no upcoming classes.",
      with: "with:",
      booked: "booked",
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
      tabSchedule: "Plan",
      tabRental: "Mieten",
      historyTitle: "guthaben-verlauf",
      teachingTitle: "mein stundenplan",
      rentalTitle: "meine mietbuchungen",
      noEvents: "keine anstehenden kurse.",
      with: "mit:",
      booked: "gebucht",
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

        {isMobile && (
          <div style={styles.tabNav}>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("schedule")}
                style={styles.tabBtn(activeTab === "schedule")}
              >
                <BookOpen size={16} /> {t.tabSchedule}
              </button>
            )}
            <button
              onClick={() => setActiveTab("bookings")}
              style={styles.tabBtn(activeTab === "bookings")}
            >
              <Calendar size={16} /> {t.tabBookings}
            </button>
            <button
              onClick={() => setActiveTab("rentals")}
              style={styles.tabBtn(activeTab === "rentals")}
            >
              <MapPin size={16} /> {t.tabRental}
            </button>
            <button
              onClick={() => setActiveTab("packs")}
              style={styles.tabBtn(activeTab === "packs")}
            >
              <Ticket size={16} /> {t.tabPacks}
            </button>
            <button
              onClick={() => setActiveTab("info")}
              style={styles.tabBtn(activeTab === "info")}
            >
              <User size={16} /> {t.tabProfile}
            </button>
          </div>
        )}

        <div style={styles.grid}>
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
            {(!isMobile || activeTab === "bookings") && (
              <PotteryFiringCard
                currentUser={currentUser}
                currentLang={currentLang}
              />
            )}
            {isAdmin && (!isMobile || activeTab === "schedule") && (
              <div style={styles.adminCard}>
                <h2 style={styles.cardTitle}>
                  <BookOpen size={20} color="#4e5f28" /> {t.teachingTitle}
                </h2>
                {isScheduleLoading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "20px",
                    }}
                  >
                    <Loader2 className="spinner" color="#caaff3" />
                  </div>
                ) : teachingEvents.length > 0 ? (
                  <div style={styles.eventList}>
                    {teachingEvents.map((event) => (
                      <div key={event.id} style={styles.eventItem}>
                        <span style={styles.eventCourse}>
                          {event.displayName}
                        </span>
                        <div style={styles.eventMeta}>
                          <div style={styles.metaItem}>
                            <Calendar size={12} />{" "}
                            {event.date.split("-").reverse().join(".")}
                          </div>
                          <div style={styles.metaItem}>
                            <Clock size={12} /> {event.time}
                          </div>
                        </div>
                        {event.coInstructors?.length > 0 && (
                          <div style={styles.coInstructorRow}>
                            <Users size={12} />{" "}
                            <span style={{ fontWeight: 600 }}>{t.with}</span>{" "}
                            {event.coInstructors.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.emptyText}>{t.noEvents}</p>
                )}
              </div>
            )}

            {(!isMobile || activeTab === "rentals") && (
              <RentalBookingsCard t={t} currentLang={currentLang} />
            )}

            {(!isMobile || activeTab === "packs") && (
              <BuyPackCard
                packCourses={packCourses}
                currentLang={currentLang}
                t={t}
              />
            )}

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
  adminCard: {
    backgroundColor: "#fdf8e1",
    padding: "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(78, 95, 40, 0.05)",
  },
  cardTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    color: "#1c0700",
    marginTop: 0,
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textTransform: "lowercase",
  },
  eventList: { display: "flex", flexDirection: "column", gap: "12px" },
  eventItem: {
    background: "rgba(255, 252, 227, 0.5)",
    padding: "15px 20px",
    borderRadius: "18px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
  },
  eventCourse: {
    display: "block",
    fontWeight: "bold",
    color: "#1c0700",
    fontSize: "1rem",
    marginBottom: "6px",
  },
  eventMeta: { display: "flex", gap: "15px" },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.8rem",
    color: "#4e5f28",
    opacity: 0.8,
  },
  coInstructorRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.75rem",
    color: "#9960a8",
    marginTop: "10px",
    paddingTop: "8px",
    borderTop: "1px dashed rgba(153, 96, 168, 0.2)",
  },
  emptyText: { opacity: 0.5, fontStyle: "italic", fontSize: "0.9rem" },
  tabNav: {
    display: "flex",
    background: "rgba(202, 175, 243, 0.1)",
    padding: "6px",
    borderRadius: "100px",
    marginBottom: "2rem",
    gap: "6px",
    border: "1px solid rgba(202, 175, 243, 0.3)",
    overflowX: "auto",
  },
  tabBtn: (isActive) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
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
    whiteSpace: "nowrap",
  }),
};
