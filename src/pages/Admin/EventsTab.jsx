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
  getDoc,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
  Loader2,
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

// Helper to format date from YYYY-MM-DD to DD.MM.YYYY
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
};

export default function EventsTab({
  isMobile,
  currentLang,
  userRole,
  allowedCourses = [],
}) {
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
  const [isCancellingId, setIsCancellingId] = useState(null);

  const [activeSubTab, setActiveSubTab] = useState("courses");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showParticipantsFor, setShowParticipantsFor] = useState(null);
  const [participantCache, setParticipantCache] = useState({});

  const isFullAdmin = userRole === "admin";

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
      deleteConfirm:
        "Are you sure? This will refund all participants and delete the event.",
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
      deleteConfirm:
        "Bist du sicher? Alle Teilnehmer erhalten eine Rückerstattung und der Termin wird gelöscht.",
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
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  useEffect(() => {
    fetchEvents();
    autoFillFirstCourse();
  }, [userRole, allowedCourses]);

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
        return isFullAdmin || allowedCourses.includes(event.link);
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
          if (b.userId === "GUEST_USER") {
            return {
              firstName: b.guestName || "Guest",
              lastName: "(Guest)",
              email: b.guestEmail || "Email not found",
              isGuest: true,
            };
          }
          const uSnap = await getDoc(doc(db, "users", b.userId));
          return uSnap.exists()
            ? uSnap.data()
            : { firstName: "Unknown", lastName: "User", email: "N/A" };
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
      setTime(
        sel.text.en.toLowerCase().includes("pottery tuesdays")
          ? "18:30 - 21:30"
          : "",
      );
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
      if (editingId) await setDoc(doc(db, "events", editingId), eventData);
      else await addDoc(eventsCollection, eventData);
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
    setExpandedGroups((prev) => ({ ...prev, [link]: !prev[link] }));
  };

  const handleCancelEvent = async (e, ev) => {
    e.stopPropagation();
    if (!window.confirm(labels.deleteConfirm)) return;
    setIsCancellingId(ev.id);
    const functions = getFunctions();
    const adminCancelFn = httpsCallable(functions, "adminCancelEvent");
    try {
      await adminCancelFn({ eventId: ev.id, currentLang: currentLang || "en" });
      await fetchEvents();
    } catch (err) {
      alert("Error cancelling event: " + err.message);
    } finally {
      setIsCancellingId(null);
    }
  };

  const scheduledCourses = events.filter((ev) => ev.type === "course");
  const scheduledEvents = events.filter((ev) => ev.type === "event");

  const groupedCourses = scheduledCourses.reduce((acc, course) => {
    const key = course.link;
    if (!acc[key])
      acc[key] = {
        title: course.title[currentLang || "en"],
        link: course.link,
        dates: [],
      };
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

      <section style={{ flex: 1, marginTop: isMobile ? "2rem" : 0 }}>
        <div style={styles.tabNav}>
          <button
            onClick={() => setActiveSubTab("courses")}
            style={styles.subTabBtn(activeSubTab === "courses")}
          >
            <BookOpen size={16} /> {labels.courseHeader} (
            {scheduledCourses.length})
          </button>
          <button
            onClick={() => setActiveSubTab("events")}
            style={styles.subTabBtn(activeSubTab === "events")}
          >
            <Star size={16} /> {labels.eventHeader} ({scheduledEvents.length})
          </button>
        </div>

        {activeSubTab === "courses" && (
          <div style={styles.tabContent}>
            {Object.values(groupedCourses).map((group) => {
              const isExpanded = expandedGroups[group.link];
              const hasManyDates = group.dates.length > 3;
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
                    <div
                      className="custom-scrollbar"
                      style={{
                        ...styles.expandedContent,
                        maxHeight: hasManyDates ? "400px" : "auto",
                        overflowY: hasManyDates ? "auto" : "visible",
                      }}
                    >
                      {group.dates.map((ev) => (
                        <div key={ev.id} style={styles.eventItemWrapper}>
                          <div
                            style={{
                              ...cardStyle,
                              padding: isMobile ? "1rem" : "0.8rem 1.2rem",
                              backgroundColor: "#fdf8e1",
                              flexDirection: isMobile ? "column" : "row",
                              alignItems: isMobile ? "stretch" : "center",
                              gap: isMobile ? "12px" : "16px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {!isMobile && (
                                  <button
                                    onClick={() => startEdit(ev)}
                                    style={styles.editBtnIcon}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                <span
                                  style={{
                                    ...styles.dateLabel,
                                    fontSize: isMobile ? "1rem" : "0.9rem",
                                  }}
                                >
                                  {formatDisplayDate(ev.date)}
                                </span>
                                {ev.time && (
                                  <span style={styles.timeLabel}>
                                    <Clock size={14} /> {ev.time}
                                  </span>
                                )}
                              </div>
                              {isMobile && (
                                <button
                                  onClick={() => startEdit(ev)}
                                  style={{
                                    background: "rgba(202, 175, 243, 0.15)",
                                    border: "none",
                                    padding: "8px",
                                    borderRadius: "8px",
                                    color: "#9960a8",
                                    display: "flex",
                                  }}
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                            </div>

                            <div
                              style={{
                                ...styles.actionRow,
                                width: isMobile ? "100%" : "auto",
                                justifyContent: isMobile
                                  ? "space-between"
                                  : "flex-end",
                                borderTop: isMobile
                                  ? "1px solid rgba(28, 7, 0, 0.08)"
                                  : "none",
                                paddingTop: isMobile ? "12px" : "0",
                              }}
                            >
                              <button
                                onClick={() => handleShowParticipants(ev)}
                                style={{
                                  ...styles.participantBadge,
                                  opacity: ev.bookedCount > 0 ? 1 : 0.3,
                                }}
                              >
                                <Users size={18} color="#4e5f28" />
                                <span
                                  style={{
                                    fontWeight: "800",
                                    fontSize: "1rem",
                                    color: "#1c0700",
                                  }}
                                >
                                  {ev.bookedCount}
                                </span>
                              </button>
                              <button
                                onClick={(e) => handleCancelEvent(e, ev)}
                                style={styles.cancelCourseBtn}
                                disabled={isCancellingId === ev.id}
                              >
                                {isCancellingId === ev.id ? (
                                  <Loader2 size={14} className="spinner" />
                                ) : (
                                  labels.cancelCourse
                                )}
                              </button>
                            </div>
                          </div>

                          {showParticipantsFor === ev.id &&
                            participantCache[ev.id] && (
                              <div style={styles.participantPanel}>
                                {participantCache[ev.id].map((u, i) => (
                                  <div key={i} style={styles.userRow}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <User size={12} />
                                      <strong
                                        style={{
                                          color: u.isGuest
                                            ? "#9960a8"
                                            : "inherit",
                                          fontSize: "0.85rem",
                                        }}
                                      >
                                        {u.firstName} {u.lastName}
                                      </strong>
                                    </div>
                                    <span style={styles.contactText}>
                                      <Mail size={10} /> {u.email}
                                    </span>
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
        )}

        {activeSubTab === "events" && (
          <div style={styles.tabContent}>
            {scheduledEvents.map((ev) => (
              <div key={ev.id} style={styles.eventItemWrapper}>
                <div
                  style={{
                    ...cardStyle,
                    backgroundColor: "#fdf8e1",
                    padding: isMobile ? "1rem" : "1.2rem",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: isMobile ? "12px" : "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      {!isMobile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(ev);
                          }}
                          style={styles.editBtnIcon}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#caaff3",
                            fontWeight: "800",
                            marginBottom: "2px",
                          }}
                        >
                          {formatDisplayDate(ev.date)}{" "}
                          {ev.time && `• ${ev.time}`}
                        </div>
                        <div
                          style={{
                            fontWeight: "700",
                            fontSize: isMobile ? "1rem" : "1.05rem",
                            color: "#1c0700",
                          }}
                        >
                          {ev.title[currentLang || "en"]}
                        </div>
                      </div>
                    </div>
                    {isMobile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(ev);
                        }}
                        style={{
                          background: "rgba(202, 175, 243, 0.15)",
                          border: "none",
                          padding: "8px",
                          borderRadius: "8px",
                          color: "#9960a8",
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      ...styles.actionRow,
                      width: isMobile ? "100%" : "auto",
                      justifyContent: isMobile ? "space-between" : "flex-end",
                      borderTop: isMobile
                        ? "1px solid rgba(28, 7, 0, 0.08)"
                        : "none",
                      paddingTop: isMobile ? "12px" : "0",
                    }}
                  >
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
                      <span
                        style={{
                          fontWeight: "800",
                          fontSize: "1rem",
                          color: "#1c0700",
                        }}
                      >
                        {ev.bookedCount}
                      </span>
                    </button>
                    <button
                      onClick={(e) => handleCancelEvent(e, ev)}
                      style={styles.cancelCourseBtn}
                      disabled={isCancellingId === ev.id}
                    >
                      {isCancellingId === ev.id ? (
                        <Loader2 size={14} className="spinner" />
                      ) : (
                        labels.cancelCourse
                      )}
                    </button>
                  </div>
                </div>

                {showParticipantsFor === ev.id && participantCache[ev.id] && (
                  <div style={styles.participantPanel}>
                    {participantCache[ev.id].map((u, i) => (
                      <div key={i} style={styles.userRow}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <User size={12} />
                          <strong
                            style={{
                              color: u.isGuest ? "#9960a8" : "inherit",
                              fontSize: "0.85rem",
                            }}
                          >
                            {u.firstName} {u.lastName}
                          </strong>
                        </div>
                        <span style={styles.contactText}>
                          <Mail size={10} /> {u.email}
                        </span>
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
        )}
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(28, 7, 0, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #caaff3; border-radius: 10px; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  tabNav: {
    display: "flex",
    gap: "10px",
    marginBottom: "1.5rem",
    borderBottom: "1px solid rgba(28, 7, 0, 0.05)",
    paddingBottom: "10px",
    overflowX: "auto",
    paddingRight: "10px",
  },
  subTabBtn: (isActive) => ({
    background: isActive ? "#caaff3" : "transparent",
    border: isActive ? "none" : "1px solid rgba(202, 175, 243, 0.3)",
    padding: "8px 16px",
    borderRadius: "100px",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#1c0700",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  }),
  tabContent: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    animation: "fadeIn 0.3s ease-out",
  },
  courseGroupWrapper: {
    borderLeft: "3px solid #caaff3",
    backgroundColor: "rgba(28, 7, 0, 0.02)",
    borderRadius: "0 12px 12px 0",
    padding: "0.5rem 0.8rem",
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
    lineHeight: "1.2",
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
    flexWrap: "wrap",
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
    gap: "6px",
    cursor: "pointer",
    padding: "4px 0",
  },
  cancelCourseBtn: {
    background: "rgba(255, 77, 77, 0.1)",
    border: "none",
    color: "#ff4d4d",
    padding: "8px 16px",
    borderRadius: "100px",
    fontSize: "0.65rem",
    fontWeight: "800",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.03rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "110px",
  },
  participantPanel: {
    backgroundColor: "rgba(78, 95, 40, 0.05)",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(78, 95, 40, 0.1)",
    marginTop: "5px",
  },
  userRow: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "0.8rem",
    marginBottom: "10px",
    color: "#1c0700",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(0,0,0,0.03)",
  },
  contactText: {
    opacity: 0.6,
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    wordBreak: "break-all",
    paddingLeft: "20px",
  },
};
