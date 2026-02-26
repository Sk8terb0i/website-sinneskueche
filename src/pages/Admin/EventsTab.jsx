import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { planets } from "../../data/planets";
import {
  Trash2,
  Calendar as CalendarIcon,
  XCircle,
  BookOpen,
  Star,
  ChevronDown,
  ChevronRight,
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
  deleteBtnStyle,
} from "./AdminStyles";

export default function EventsTab({ isMobile }) {
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

  // Toggle State for Grouped Courses
  const [expandedGroups, setExpandedGroups] = useState({});

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

      const allFetchedEvents = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

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

  // --- GROUPING LOGIC ---
  const scheduledCourses = events.filter((ev) => ev.type === "course");
  const scheduledEvents = events.filter((ev) => ev.type === "event");

  const groupedCourses = scheduledCourses.reduce((acc, course) => {
    const key = course.link;
    if (!acc[key]) {
      acc[key] = {
        title: course.title.en,
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
      {/* FORM SECTION */}
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
              {editingId ? "EDIT ENTRY" : "NEW ENTRY"}
            </h3>
            {editingId && (
              <button onClick={resetForm} style={cancelBtnStyle}>
                <XCircle size={14} /> CANCEL
              </button>
            )}
          </div>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
          >
            <div>
              <label style={labelStyle}>Source</label>
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
                  Course
                </div>
                <div
                  onClick={() => setLinkType("event")}
                  style={{
                    ...toggleOptionStyle,
                    backgroundColor:
                      linkType === "event" ? "#caaff3" : "transparent",
                  }}
                >
                  Event
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
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={inputStyle}
              />
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
                    {c.text.en}
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
                placeholder="Title EN"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Title DE"
                value={titleDe}
                onChange={(e) => setTitleDe(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <button type="submit" style={btnStyle}>
              {editingId ? "Update Entry" : "Add to Calendar"}
            </button>
          </form>
        </div>
      </section>

      {/* SCHEDULE VIEW SECTION */}
      <section style={{ flex: 1 }}>
        {/* COURSES SECTION */}
        <h3 style={{ ...sectionTitleStyle, marginBottom: "1rem" }}>
          <BookOpen size={16} /> COURSES ({scheduledCourses.length})
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
              <div
                key={group.link}
                style={{
                  borderLeft: "3px solid #caaff3",
                  paddingLeft: "1rem",
                  backgroundColor: "rgba(28, 7, 0, 0.02)",
                  borderRadius: "0 12px 12px 0",
                  padding: "0.5rem 1rem",
                }}
              >
                <div
                  onClick={() => toggleGroup(group.link)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    padding: "0.5rem 0",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "800",
                      fontSize: "0.85rem",
                      color: "#1c0700",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      marginTop: "0.8rem",
                      paddingBottom: "0.5rem",
                      animation: "fadeIn 0.3s ease-out",
                    }}
                  >
                    {group.dates.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => startEdit(ev)}
                        style={{
                          ...cardStyle,
                          padding: "0.6rem 1rem",
                          backgroundColor: "#fdf8e1", // Matching card theme
                        }}
                      >
                        <div style={{ flex: 1, fontSize: "0.85rem" }}>
                          <span style={{ color: "#caaff3", fontWeight: "700" }}>
                            {ev.date}
                          </span>
                          {ev.time && (
                            <span style={{ opacity: 0.6 }}> • {ev.time}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete?"))
                              deleteDoc(doc(db, "events", ev.id)).then(
                                fetchEvents,
                              );
                          }}
                          style={deleteBtnStyle}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {scheduledCourses.length === 0 && (
            <p style={{ opacity: 0.4, fontSize: "0.8rem" }}>
              No courses scheduled.
            </p>
          )}
        </div>

        {/* EVENTS SECTION */}
        <h3 style={{ ...sectionTitleStyle, marginBottom: "1rem" }}>
          <Star size={16} /> INDIVIDUAL EVENTS ({scheduledEvents.length})
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          {scheduledEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => startEdit(ev)}
              style={{ ...cardStyle, backgroundColor: "#fdf8e1" }}
            >
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
                <span style={{ fontWeight: "600" }}>{ev.title.en}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Delete?"))
                    deleteDoc(doc(db, "events", ev.id)).then(fetchEvents);
                }}
                style={deleteBtnStyle}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {scheduledEvents.length === 0 && (
            <p style={{ opacity: 0.4, fontSize: "0.8rem" }}>
              No events scheduled.
            </p>
          )}
        </div>
      </section>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
