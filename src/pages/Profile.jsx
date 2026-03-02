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
} from "lucide-react";

// --- EXACT MAPPING FROM YOUR CLOUD FUNCTIONS ---
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

  // Teaching Schedule State
  const [teachingEvents, setTeachingEvents] = useState([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // Tabs for mobile view
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

  // Fetch pack settings
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

  // FETCH TEACHING SCHEDULE (Resolved with Co-Instructors and Add-ons)
  useEffect(() => {
    const fetchAssignedSchedule = async () => {
      if (!userData || !isAdmin || !currentUser) return;

      setIsScheduleLoading(true);
      try {
        // 1. Get ALL assignments and special assignments
        const scheduleRef = collection(db, "work_schedule");
        const allAssignmentsSnap = await getDocs(scheduleRef);
        const allData = allAssignmentsSnap.docs.map((d) => d.data());

        // Also fetch the main schedule docs to get specialAssignments (Add-ons assigned to dates)
        const schedulesSnap = await getDocs(collection(db, "schedules"));
        const schedulesMap = {};
        schedulesSnap.docs.forEach((d) => {
          schedulesMap[d.id] = d.data();
        });

        // 2. Identify Event IDs assigned to current user
        const myAssignedEventIds = allData
          .filter((d) => d.userId === currentUser.uid)
          .map((d) => d.eventId);

        if (myAssignedEventIds.length === 0) {
          setTeachingEvents([]);
          return;
        }

        // 3. Resolve user names
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap = {};
        usersSnap.docs.forEach((d) => {
          const u = d.data();
          usersMap[d.id] = `${u.firstName} ${u.lastName}`;
        });

        // 4. Fetch the actual event details
        const eventsRef = collection(db, "events");
        const today = new Date().toISOString().split("T")[0];
        const eventsQuery = query(eventsRef, orderBy("date", "asc"));
        const eventsSnap = await getDocs(eventsQuery);

        // 5. Fetch global bookings to count add-on bookings
        const bookingsSnap = await getDocs(collection(db, "bookings"));
        const allBookings = bookingsSnap.docs.map((d) => d.data());

        const filteredEvents = await Promise.all(
          eventsSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (event) =>
                myAssignedEventIds.includes(event.id) && event.date >= today,
            )
            .map(async (event) => {
              const sanitizedId = (
                event.coursePath ||
                event.link ||
                ""
              ).replace(/\//g, "");

              // Find co-instructors
              const coInstructorNames = allData
                .filter(
                  (d) => d.eventId === event.id && d.userId !== currentUser.uid,
                )
                .map((d) => usersMap[d.userId] || "Unknown Instructor");

              // Resolve Add-on names and booking counts
              const scheduleConfig = schedulesMap[sanitizedId];
              const assignedAddonIds =
                scheduleConfig?.specialAssignments?.[event.id] || [];
              const addonList = Array.isArray(assignedAddonIds)
                ? assignedAddonIds
                : assignedAddonIds
                  ? [assignedAddonIds]
                  : [];

              // Fetch course settings for add-on names
              const settingsSnap = await getDoc(
                doc(db, "course_settings", sanitizedId),
              );
              const settingsData = settingsSnap.exists()
                ? settingsSnap.data()
                : {};
              const definedAddons = settingsData.specialEvents || [];

              const resolvedAddons = addonList.map((addonId) => {
                const addonDef = definedAddons.find((a) => a.id === addonId);
                const bookedCount = allBookings.filter(
                  (b) =>
                    b.eventId === event.id &&
                    b.selectedAddons?.includes(addonId) &&
                    b.status === "confirmed",
                ).length;

                return {
                  id: addonId,
                  name:
                    currentLang === "de" ? addonDef?.nameDe : addonDef?.nameEn,
                  bookedCount,
                };
              });

              return {
                ...event,
                displayName: getCleanCourseKey(event.coursePath || event.link),
                coInstructors: coInstructorNames,
                addons: resolvedAddons,
              };
            }),
        );

        setTeachingEvents(filteredEvents);
      } catch (err) {
        console.error("Error fetching assigned schedule:", err);
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
      historyTitle: "credit history",
      teachingTitle: "my teaching schedule",
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
      historyTitle: "guthaben-verlauf",
      teachingTitle: "mein stundenplan",
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
                        <div style={styles.eventMain}>
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

                          {/* ADD-ON DISPLAY */}
                          {event.addons?.length > 0 && (
                            <div style={styles.addonContainer}>
                              {event.addons.map((addon, idx) => (
                                <div key={idx} style={styles.addonBadge}>
                                  <Star
                                    size={10}
                                    fill="#9960a8"
                                    color="#9960a8"
                                  />
                                  <span>
                                    {addon.name}:{" "}
                                    <strong>{addon.bookedCount}</strong>{" "}
                                    {t.booked}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* CO-INSTRUCTOR DISPLAY */}
                          {event.coInstructors?.length > 0 && (
                            <div style={styles.coInstructorRow}>
                              <Users size={12} />
                              <span style={{ fontWeight: 600 }}>{t.with}</span>
                              {event.coInstructors.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.emptyText}>{t.noEvents}</p>
                )}
              </div>
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
    padding: "2rem",
    borderRadius: "30px",
    border: "1px solid rgba(78, 95, 40, 0.1)",
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
  eventList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
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
  eventMeta: {
    display: "flex",
    gap: "15px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.8rem",
    color: "#4e5f28",
    opacity: 0.8,
  },
  addonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "12px",
    backgroundColor: "rgba(202, 175, 243, 0.05)",
    padding: "10px",
    borderRadius: "12px",
    border: "1px dashed rgba(153, 96, 168, 0.2)",
  },
  addonBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.75rem",
    color: "#1c0700",
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
  emptyText: {
    opacity: 0.5,
    fontStyle: "italic",
    fontSize: "0.9rem",
  },
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
