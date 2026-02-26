import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc, // Added getDoc for cleaner single-user fetching
  orderBy,
  setDoc,
} from "firebase/firestore";
import { planets } from "../../data/planets";
import {
  XCircle,
  BookOpen,
  Star,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Phone,
  Mail,
  Edit2,
  Clock,
} from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  cancelBtnStyle,
  labelStyle,
  toggleContainerStyle,
  toggleOptionStyle,
  inputStyle,
  btnStyle,
  cardStyle,
} from "./AdminStyles";

export default function EventsTab({ isMobile, currentLang }) {
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleDe, setTitleDe] = useState("");
  const [linkType, setLinkType] = useState("course");
  const [isCustomCourseLink, setIsCustomCourseLink] = useState(false);
  const [link, setLink] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [expandedGroups, setExpandedGroups] = useState({});
  const [showParticipantsFor, setShowParticipantsFor] = useState(null);
  const [participantCache, setParticipantCache] = useState({});

  const labels = {
    en: {
      newEntry: "NEW ENTRY",
      editEntry: "EDIT ENTRY",
      cancel: "CANCEL",
      source: "Source",
      course: "Course",
      event: "Event",
      dateLabel: "Date",
      timeLabel: "Time",
      titleEn: "Title EN",
      titleDe: "Title DE",
      addBtn: "Add to Calendar",
      updateBtn: "Update Entry",
      courseHeader: "COURSES",
      eventHeader: "INDIVIDUAL EVENTS",
      noCourses: "No courses scheduled.",
      noEvents: "No events scheduled.",
      cancelCourse: "CANCEL COURSE",
      deleteConfirm: "Delete this session?",
      participants: "Participants",
      noParticipants: "No bookings yet.",
    },
    de: {
      newEntry: "NEUER EINTRAG",
      editEntry: "EINTRAG BEARBEITEN",
      cancel: "ABBRECHEN",
      source: "Quelle",
      course: "Kurs",
      event: "Event",
      dateLabel: "Datum",
      timeLabel: "Uhrzeit",
      titleEn: "Titel EN",
      titleDe: "Titel DE",
      addBtn: "Zum Kalender hinzufügen",
      updateBtn: "Eintrag aktualisieren",
      courseHeader: "KURSE",
      eventHeader: "EINZEL-EVENTS",
      noCourses: "Keine Kurse geplant.",
      noEvents: "Keine Events geplant.",
      cancelCourse: "KURS ABSAGEN",
      deleteConfirm: "Diesen Termin löschen?",
      participants: "Teilnehmer",
      noParticipants: "Noch keine Buchungen.",
    },
  }[currentLang || "en"];

  const eventsCollection = collection(db, "events");

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  );

  useEffect(() => {
    fetchEvents();
    autoFillFirstCourse();
  }, []);

  const fetchEvents = async () => {
    try {
      const q = query(eventsCollection, orderBy("date", "asc"));
      const querySnapshot = await getDocs(q);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allFetchedEvents = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const bQuery = query(
            collection(db, "bookings"),
            where("eventId", "==", docSnap.id),
          );
          const bSnap = await getDocs(bQuery);

          return {
            ...data,
            id: docSnap.id,
            bookedCount: bSnap.size,
            // CHANGED: Store full booking data instead of just UIDs to catch guest names
            bookings: bSnap.docs.map((d) => d.data()),
          };
        }),
      );

      const validEvents = allFetchedEvents.filter((event) => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        if (eventDate < today) {
          deleteDoc(doc(db, "events", event.id));
          return false;
        }
        return true;
      });
      setEvents(validEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleShowParticipants = async (event) => {
    if (showParticipantsFor === event.id) {
      setShowParticipantsFor(null);
      return;
    }
    if (event.bookedCount === 0) return alert(labels.noParticipants);

    if (!participantCache[event.id]) {
      const userDetails = await Promise.all(
        event.bookings.map(async (b) => {
          // LOGIC: If Guest, use info stored directly on the booking document
          if (b.userId === "GUEST_USER") {
            return {
              firstName: b.guestName || "Guest",
              lastName: "(Guest)",
              email: b.guestEmail || "Email not found", // Display guest email
              phone: "",
              isGuest: true,
            };
          }

          // If registered user, fetch from the users collection as before
          const uSnap = await getDoc(doc(db, "users", b.userId));
          if (uSnap.exists()) {
            return uSnap.data();
          }

          return {
            firstName: "Unknown",
            lastName: "User",
            email: "N/A",
          };
        }),
      );
      setParticipantCache((prev) => ({ ...prev, [event.id]: userDetails }));
    }
    setShowParticipantsFor(event.id);
  };

  const autoFillFirstCourse = () => {
    if (availableCourses.length > 0 && !editingId && !isCustomCourseLink) {
      handleCourseSelection(availableCourses[0].link);
    }
  };

  const handleCourseSelection = (courseLink) => {
    const sel = availableCourses.find((c) => c.link === courseLink);
    setLink(courseLink);
    if (sel) {
      setTitleEn(sel.text.en);
      setTitleDe(sel.text.de);
      if (sel.text.en.toLowerCase().includes("pottery tuesdays")) {
        setTime("18:30 - 21:30");
      } else {
        setTime("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalLink =
        linkType === "event" || isCustomCourseLink ? externalLink : link;
      const eventData = {
        date,
        time,
        title: { en: titleEn, de: titleDe },
        link: finalLink,
        type: linkType,
      };

      if (editingId) {
        await setDoc(doc(db, "events", editingId), eventData);
      } else {
        await addDoc(eventsCollection, eventData);
      }
      resetForm();
      fetchEvents();
    } catch (e) {
      alert("Error saving: " + e.message);
    }
  };

  const startEdit = (event) => {
    setEditingId(event.id);
    setDate(event.date);
    setTime(event.time || "");
    setTitleEn(event.title.en);
    setTitleDe(event.title.de);
    const type =
      event.type || (event.link?.startsWith("http") ? "event" : "course");
    setLinkType(type);

    if (type === "course") {
      const isStandard = availableCourses.some((c) => c.link === event.link);
      if (isStandard) {
        setLink(event.link);
        setExternalLink("");
        setIsCustomCourseLink(false);
      } else {
        setExternalLink(event.link);
        setIsCustomCourseLink(true);
      }
    } else {
      setExternalLink(event.link || "");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setTime("");
    setExternalLink("");
    setTitleEn("");
    setTitleDe("");
    setIsCustomCourseLink(false);
    if (linkType === "course") autoFillFirstCourse();
  };

  const toggleGroup = (link) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [link]: !prev[link],
    }));
  };

  const scheduledCourses = events.filter((ev) => ev.type === "course");
  const scheduledEvents = events.filter((ev) => ev.type === "event");

  const groupedCourses = scheduledCourses.reduce((acc, course) => {
    const key = course.link;
    if (!acc[key]) {
      acc[key] = {
        title: course.title[currentLang || "en"],
        link: course.link,
        dates: [],
      };
    }
    acc[key].dates.push(course);
    return acc;
  }, {});

  return (
    <div
      style={{
        display: isMobile ? "block" : "flex",
        gap: "2rem",
        marginBottom: "5rem",
      }}
    >
      {/* 1. FORM SECTION */}
      <section style={{ width: isMobile ? "100%" : "400px" }}>
        <div style={formCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1.2rem",
            }}
          >
            <h3 style={sectionTitleStyle}>
              {editingId ? labels.editEntry : labels.newEntry}
            </h3>
            {editingId && (
              <button onClick={resetForm} style={cancelBtnStyle}>
                <XCircle size={14} /> {labels.cancel}
              </button>
            )}
          </div>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
          >
            <div>
              <label style={labelStyle}>{labels.source}</label>
              <div style={toggleContainerStyle}>
                <div
                  onClick={() => {
                    setLinkType("course");
                    setIsCustomCourseLink(false);
                  }}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      linkType === "course" ? "#caaff3" : "transparent",
                  }}
                >
                  {labels.course}
                </div>
                <div
                  onClick={() => setLinkType("event")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      linkType === "event" ? "#caaff3" : "transparent",
                  }}
                >
                  {labels.event}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <label style={{ ...labelStyle, opacity: 0.5 }}>
                  {labels.dateLabel}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <label style={{ ...labelStyle, opacity: 0.5 }}>
                  {labels.timeLabel}
                </label>
                <input
                  type="text"
                  placeholder="18:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            {linkType === "course" && !isCustomCourseLink ? (
              <select
                value={link}
                onChange={(e) => handleCourseSelection(e.target.value)}
                style={inputStyle}
                required
              >
                {availableCourses.map((c, i) => (
                  <option key={i} value={c.link}>
                    {c.text[currentLang || "en"]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="url"
                placeholder="URL https://..."
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                style={inputStyle}
                required
              />
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <input
                type="text"
                placeholder={labels.titleEn}
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder={labels.titleDe}
                value={titleDe}
                onChange={(e) => setTitleDe(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <button type="submit" style={btnStyle}>
              {editingId ? labels.updateBtn : labels.addBtn}
            </button>
          </form>
        </div>
      </section>

      {/* 2. SCHEDULE VIEW SECTION */}
      <section style={{ flex: 1 }}>
        <h3 style={{ ...sectionTitleStyle, marginBottom: "1rem" }}>
          <BookOpen size={16} /> {labels.courseHeader} (
          {scheduledCourses.length})
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "3rem",
          }}
        >
          {Object.values(groupedCourses).map((group) => {
            const isExpanded = expandedGroups[group.link];
            return (
              <div key={group.link} style={styles.courseGroupWrapper}>
                <div
                  onClick={() => toggleGroup(group.link)}
                  style={styles.groupHeader}
                >
                  <div style={styles.groupTitleText}>
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    {group.title} ({group.dates.length})
                  </div>
                </div>

                {isExpanded && (
                  <div style={styles.expandedContent}>
                    {group.dates.map((ev) => (
                      <div key={ev.id} style={styles.eventItemWrapper}>
                        <div
                          style={{
                            ...cardStyle,
                            padding: "0.8rem 1.2rem",
                            backgroundColor: "#fdf8e1",
                          }}
                        >
                          <button
                            onClick={() => startEdit(ev)}
                            style={styles.editBtnIcon}
                          >
                            <Edit2 size={16} />
                          </button>

                          <div style={styles.eventMainInfo}>
                            <span style={styles.dateLabel}>{ev.date}</span>
                            {ev.time && (
                              <span style={styles.timeLabel}>
                                <Clock size={12} /> {ev.time}
                              </span>
                            )}
                          </div>

                          <div style={styles.actionRow}>
                            <button
                              onClick={() => handleShowParticipants(ev)}
                              style={{
                                ...styles.participantBadge,
                                opacity: ev.bookedCount > 0 ? 1 : 0.3,
                              }}
                            >
                              <Users size={16} color="#4e5f28" />
                              <span style={{ fontWeight: "800" }}>
                                {ev.bookedCount}
                              </span>
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(labels.deleteConfirm))
                                  deleteDoc(doc(db, "events", ev.id)).then(
                                    fetchEvents,
                                  );
                              }}
                              style={styles.cancelCourseBtn}
                            >
                              {labels.cancelCourse}
                            </button>
                          </div>
                        </div>

                        {showParticipantsFor === ev.id &&
                          participantCache[ev.id] && (
                            <div style={styles.participantPanel}>
                              <h5
                                style={{
                                  fontSize: "0.6rem",
                                  marginBottom: "8px",
                                  opacity: 0.5,
                                }}
                              >
                                {labels.participants}
                              </h5>
                              {participantCache[ev.id].map((u, i) => (
                                <div key={i} style={styles.userRow}>
                                  <User size={12} />
                                  <strong
                                    style={{
                                      color: u.isGuest ? "#9960a8" : "inherit",
                                    }}
                                  >
                                    {u.firstName} {u.lastName}
                                  </strong>
                                  <span style={styles.contactText}>
                                    <Mail size={10} /> {u.email}
                                  </span>
                                  {u.phone && (
                                    <span style={styles.contactText}>
                                      <Phone size={10} /> {u.phone}
                                    </span>
                                  )}
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
          {scheduledCourses.length === 0 && (
            <p style={{ opacity: 0.4, fontSize: "0.8rem" }}>
              {labels.noCourses}
            </p>
          )}
        </div>

        <h3 style={{ ...sectionTitleStyle, marginBottom: "1rem" }}>
          <Star size={16} /> {labels.eventHeader} ({scheduledEvents.length})
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          {scheduledEvents.map((ev) => (
            <div key={ev.id} style={styles.eventItemWrapper}>
              <div
                onClick={() => startEdit(ev)}
                style={{ ...cardStyle, backgroundColor: "#fdf8e1" }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(ev);
                  }}
                  style={styles.editBtnIcon}
                >
                  <Edit2 size={16} />
                </button>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#caaff3",
                      fontWeight: "800",
                    }}
                  >
                    {ev.date} {ev.time && `• ${ev.time}`}
                  </div>
                  <span style={{ fontWeight: "600" }}>
                    {ev.title[currentLang || "en"]}
                  </span>
                </div>
                <div style={styles.actionRow}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowParticipants(ev);
                    }}
                    style={{
                      ...styles.participantBadge,
                      opacity: ev.bookedCount > 0 ? 1 : 0.3,
                    }}
                  >
                    <Users size={18} color="#4e5f28" />
                    <span style={{ fontWeight: "800" }}>{ev.bookedCount}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(labels.deleteConfirm))
                        deleteDoc(doc(db, "events", ev.id)).then(fetchEvents);
                    }}
                    style={styles.cancelCourseBtn}
                  >
                    {labels.cancelCourse}
                  </button>
                </div>
              </div>
              {showParticipantsFor === ev.id && participantCache[ev.id] && (
                <div style={styles.participantPanel}>
                  {participantCache[ev.id].map((u, i) => (
                    <div key={i} style={styles.userRow}>
                      <User size={12} />
                      <strong
                        style={{ color: u.isGuest ? "#9960a8" : "inherit" }}
                      >
                        {u.firstName} {u.lastName}
                      </strong>
                      <span style={styles.contactText}>
                        <Mail size={10} /> {u.email}
                      </span>
                      {u.phone && (
                        <span style={styles.contactText}>
                          <Phone size={10} /> {u.phone}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {scheduledEvents.length === 0 && (
            <p style={{ opacity: 0.4, fontSize: "0.8rem" }}>
              {labels.noEvents}
            </p>
          )}
        </div>
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const styles = {
  courseGroupWrapper: {
    borderLeft: "3px solid #caaff3",
    backgroundColor: "rgba(28, 7, 0, 0.02)",
    borderRadius: "0 12px 12px 0",
    padding: "0.5rem 1rem",
    marginBottom: "0.5rem",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    padding: "0.5rem 0",
  },
  groupTitleText: {
    fontWeight: "800",
    fontSize: "0.85rem",
    color: "#1c0700",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  expandedContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    marginTop: "1rem",
  },
  eventItemWrapper: { display: "flex", flexDirection: "column", gap: "8px" },
  editBtnIcon: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#caaff3",
    padding: "4px",
    marginRight: "8px",
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
  },
  eventMainInfo: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.85rem",
  },
  dateLabel: { color: "#caaff3", fontWeight: "700" },
  timeLabel: {
    opacity: 0.6,
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  actionRow: { display: "flex", gap: "15px", alignItems: "center" },
  participantBadge: {
    border: "none",
    background: "none",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
  },
  cancelCourseBtn: {
    background: "rgba(255, 77, 77, 0.1)",
    border: "none",
    color: "#ff4d4d",
    padding: "6px 12px",
    borderRadius: "100px",
    fontSize: "0.7rem",
    fontWeight: "800",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.03rem",
  },
  participantPanel: {
    backgroundColor: "rgba(78, 95, 40, 0.05)",
    padding: "10px 15px",
    borderRadius: "12px",
    border: "1px solid rgba(78, 95, 40, 0.1)",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.8rem",
    marginBottom: "5px",
    color: "#1c0700",
  },
  contactText: {
    opacity: 0.6,
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "3px",
  },
};
