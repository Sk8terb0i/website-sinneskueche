import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  User,
  LayoutGrid,
} from "lucide-react";
import { planets } from "../../data/planets";

export default function EventsTab({ currentLang }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [selectedEventParticipants, setSelectedEventParticipants] =
    useState(null);

  // Form State
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [courseLink, setCourseLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const labels = {
    en: {
      addSession: "Create New Event (Session)",
      upcoming: "Manage Scheduled Events",
      date: "Event Date",
      timeLabel: "Event Time (e.g. 18:30 - 21:30)",
      course: "Assign to Course",
      select: "-- Choose Course Type --",
      create: "Add Event to Calendar",
      confirmDelete:
        "Delete this event? Users who booked this will still see it in their history.",
      booked: "booked",
      participants: "Participants",
      noParticipants: "No bookings yet.",
    },
    de: {
      addSession: "Neues Event (Termin) erstellen",
      upcoming: "Events verwalten",
      date: "Event-Datum",
      timeLabel: "Event-Zeit (z.B. 18:30 - 21:30)",
      course: "Kurs zuweisen",
      select: "-- Kurstyp wählen --",
      create: "Event hinzufügen",
      confirmDelete:
        "Dieses Event löschen? Nutzer, die bereits gebucht haben, sehen es weiterhin in ihrer Historie.",
      booked: "gebucht",
      participants: "Teilnehmer",
      noParticipants: "Noch keine Buchungen.",
    },
  }[currentLang || "en"];

  // Unique courses for the dropdown
  const allCourses = planets
    .flatMap((p) => p.courses || [])
    .filter(
      (course, index, self) =>
        index === self.findIndex((t) => t.link === course.link),
    );

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "events"), orderBy("date", "asc"));
      const querySnapshot = await getDocs(q);
      const eventsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const eventsWithCounts = await Promise.all(
        eventsList.map(async (event) => {
          const bQuery = query(
            collection(db, "bookings"),
            where("eventId", "==", event.id),
          );
          const bSnap = await getDocs(bQuery);
          const participantData = bSnap.docs.map((d) => d.data().userId);
          return {
            ...event,
            bookedCount: bSnap.size,
            participantIds: participantData,
          };
        }),
      );
      setEvents(eventsWithCounts);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowParticipants = async (event) => {
    if (selectedEventParticipants?.id === event.id) {
      setSelectedEventParticipants(null);
      return;
    }
    if (event.bookedCount === 0) return alert(labels.noParticipants);

    const userData = await Promise.all(
      event.participantIds.map(async (uid) => {
        const uSnap = await getDocs(
          query(collection(db, "users"), where("__name__", "==", uid)),
        );
        return (
          uSnap.docs[0]?.data() || {
            firstName: "Unknown",
            lastName: "User",
            email: "N/A",
          }
        );
      }),
    );
    setSelectedEventParticipants({ id: event.id, users: userData });
  };

  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.link]) acc[event.link] = [];
    acc[event.link].push(event);
    return acc;
  }, {});

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!date || !time || !courseLink) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "events"), {
        date,
        time,
        link: courseLink,
        createdAt: serverTimestamp(),
      });
      setDate("");
      setTime("");
      setCourseLink("");
      fetchEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm(labels.confirmDelete)) return;
    await deleteDoc(doc(db, "events", id));
    fetchEvents();
  };

  return (
    <div style={styles.container}>
      {/* 1. ADD EVENT FORM SECTION */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>
          <LayoutGrid size={20} /> {labels.addSession}
        </h3>
        <form onSubmit={handleAddEvent} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>{labels.date}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>{labels.timeLabel}</label>
            <input
              type="text"
              placeholder="18:30 - 21:30"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>{labels.course}</label>
            <select
              value={courseLink}
              onChange={(e) => setCourseLink(e.target.value)}
              style={styles.selectInput}
              required
            >
              <option value="" style={styles.optionText}>
                {labels.select}
              </option>
              {allCourses.map((c) => (
                <option key={c.link} value={c.link} style={styles.optionText}>
                  {c.text[currentLang]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={isSubmitting} style={styles.addBtn}>
            {isSubmitting ? (
              <Loader2 className="spinner" size={18} />
            ) : (
              labels.create
            )}
          </button>
        </form>
      </section>

      {/* 2. COLLAPSIBLE UPCOMING SESSIONS LIST */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>
          <Calendar size={20} /> {labels.upcoming}
        </h3>
        {loading ? (
          <div style={styles.loading}>
            <Loader2 className="spinner" size={30} color="#caaff3" />
          </div>
        ) : (
          <div style={styles.groupList}>
            {Object.entries(groupedEvents).map(([link, courseEvents]) => {
              const courseTitle =
                allCourses.find((c) => c.link === link)?.text[currentLang] ||
                link;
              const isExpanded = expandedCourse === link;

              return (
                <div key={link} style={styles.courseGroup}>
                  <button
                    onClick={() => setExpandedCourse(isExpanded ? null : link)}
                    style={styles.groupHeader}
                  >
                    <span style={styles.groupTitle}>
                      {courseTitle} ({courseEvents.length})
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>

                  {isExpanded && (
                    <div style={styles.expandedContent}>
                      {courseEvents.map((event) => (
                        <div key={event.id} style={styles.eventContainer}>
                          <div style={styles.eventRow}>
                            <div style={styles.eventMain}>
                              <div style={styles.dateBadge}>
                                <span style={styles.dateText}>
                                  {event.date.split("-")[2]}
                                </span>
                                <span style={styles.monthText}>
                                  {new Date(event.date).toLocaleString(
                                    currentLang === "en" ? "en-US" : "de-DE",
                                    { month: "short" },
                                  )}
                                </span>
                              </div>
                              <div style={styles.eventInfo}>
                                <div style={styles.metaRow}>
                                  <Clock size={14} /> <span>{event.time}</span>
                                </div>
                                <button
                                  onClick={() => handleShowParticipants(event)}
                                  style={styles.participantToggle}
                                >
                                  <Users size={14} /> {event.bookedCount}{" "}
                                  {labels.booked}
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              style={styles.deleteBtn}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {selectedEventParticipants?.id === event.id && (
                            <div style={styles.participantList}>
                              <h5 style={styles.participantListTitle}>
                                {labels.participants}
                              </h5>
                              {selectedEventParticipants.users.map((u, i) => (
                                <div key={i} style={styles.userRow}>
                                  <User size={14} opacity={0.5} />
                                  <div style={styles.userData}>
                                    <span style={styles.userName}>
                                      {u.firstName} {u.lastName}
                                    </span>
                                    <span style={styles.userContact}>
                                      {u.email} {u.phone && `• ${u.phone}`}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "2rem" },
  card: {
    backgroundColor: "#fdf8e1",
    padding: "2rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
  },
  cardTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.5rem",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
    alignItems: "flex-end",
  },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: {
    fontSize: "0.7rem",
    fontWeight: "800",
    textTransform: "uppercase",
    opacity: 0.4,
    fontFamily: "Satoshi",
  },
  input: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28,7,0,0.1)",
    fontFamily: "Satoshi",
    backgroundColor: "white",
    color: "#1c0700",
  },
  // FORCED DARK TEXT FOR SELECT
  selectInput: {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28,7,0,0.1)",
    fontFamily: "Satoshi",
    backgroundColor: "white",
    color: "#1c0700",
    appearance: "auto",
  },
  optionText: { color: "#1c0700", backgroundColor: "white" },

  addBtn: {
    padding: "12px",
    backgroundColor: "#9960a8",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "Satoshi",
  },
  groupList: { display: "flex", flexDirection: "column", gap: "12px" },
  courseGroup: {
    border: "1px solid rgba(28, 7, 0, 0.05)",
    borderRadius: "16px",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  groupHeader: {
    width: "100%",
    padding: "1.2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  groupTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.2rem",
    color: "#1c0700",
    textTransform: "lowercase",
  },
  expandedContent: {
    padding: "1rem",
    backgroundColor: "rgba(255,255,255,0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  eventContainer: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(0,0,0,0.03)",
    borderRadius: "12px",
    backgroundColor: "white",
  },
  eventRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.8rem",
  },
  eventMain: { display: "flex", alignItems: "center", gap: "1rem" },
  dateBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#caaff3",
    padding: "4px",
    borderRadius: "8px",
    width: "40px",
    color: "#1c0700",
  },
  dateText: {
    fontWeight: "bold",
    fontSize: "1rem",
    lineHeight: 1,
    fontFamily: "Harmond-SemiBoldCondensed",
  },
  monthText: {
    fontSize: "0.5rem",
    textTransform: "uppercase",
    fontWeight: "800",
    fontFamily: "Satoshi",
  },
  eventInfo: { display: "flex", gap: "15px", alignItems: "center" },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.85rem",
    opacity: 0.6,
    fontFamily: "Satoshi",
    fontWeight: "700",
  },
  participantToggle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(78, 95, 40, 0.1)",
    border: "none",
    color: "#4e5f28",
    padding: "4px 10px",
    borderRadius: "100px",
    fontSize: "0.75rem",
    fontWeight: "800",
    cursor: "pointer",
    fontFamily: "Satoshi",
  },
  participantList: {
    padding: "1rem",
    borderTop: "1px solid rgba(0,0,0,0.05)",
    backgroundColor: "rgba(78, 95, 40, 0.02)",
  },
  participantListTitle: {
    margin: "0 0 10px 0",
    fontSize: "0.7rem",
    textTransform: "uppercase",
    opacity: 0.5,
    letterSpacing: "0.05rem",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
  userData: { display: "flex", flexDirection: "column" },
  userName: { fontSize: "0.9rem", fontWeight: "700", color: "#1c0700" },
  userContact: { fontSize: "0.75rem", opacity: 0.6 },
  deleteBtn: {
    padding: "8px",
    background: "none",
    border: "none",
    color: "#ff4d4d",
    cursor: "pointer",
    opacity: 0.3,
  },
  loading: { display: "flex", justifyContent: "center", padding: "2rem" },
};
