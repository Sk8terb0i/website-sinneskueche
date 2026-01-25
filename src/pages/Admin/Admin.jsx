import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
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
  PlusCircle,
  Calendar as CalendarIcon,
  LogOut,
  Lock,
  Edit2,
  XCircle,
  Loader2, // Added for loading icon
} from "lucide-react";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // New state for loading
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleDe, setTitleDe] = useState("");
  const [linkType, setLinkType] = useState("course");
  const [link, setLink] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

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

  const autoFillFirstCourse = () => {
    if (availableCourses.length > 0 && !editingId) {
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchEvents();
        autoFillFirstCourse();
      }
    });
    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
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
        return eventDate >= today;
      });

      setEvents(validEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
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
      } else {
        setExternalLink(event.link);
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
    if (linkType === "course") {
      autoFillFirstCourse();
    }
  };

  const handleToggle = (type) => {
    setLinkType(type);
    setExternalLink("");
    if (type === "course") {
      autoFillFirstCourse();
    } else {
      setLink("");
      setTitleEn("");
      setTitleDe("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalLink =
        linkType === "event" ? externalLink : externalLink || link || "";

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

  const deleteEvent = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this entry?")) {
      await deleteDoc(doc(db, "events", id));
      if (editingId === id) resetForm();
      fetchEvents();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true); // START LOADING
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setIsLoading(false); // STOP LOADING
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Reset link sent to " + email);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  if (!user) {
    return (
      <div style={loginWrapperStyle}>
        <form onSubmit={handleLogin} style={loginCardStyle(isMobile)}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Lock
              size={isMobile ? 32 : 40}
              color="#caaff3"
              style={{ marginBottom: "1rem" }}
            />
            <h1
              style={{
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "2rem",
              }}
            >
              Atelier Login
            </h1>
          </div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: "1.2rem" }}
            required
            disabled={isLoading}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <label style={labelStyle}>Password</label>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={forgotLinkStyle}
              disabled={isLoading}
            >
              Forgot?
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: "2rem" }}
            required
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...btnStyle,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="spinner" size={18} /> Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
        <style>{`
          .spinner {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#fffce3",
        color: "#1c0700",
        fontFamily: "Satoshi",
        overflowX: "hidden",
      }}
    >
      <div style={{ padding: isMobile ? "1.5rem" : "4vw" }}>
        <header style={headerStyle(isMobile)}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: isMobile ? "2.2rem" : "3.5rem",
                marginBottom: "0.2rem",
              }}
            >
              Atelier Management
            </h1>
            <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>
              Admin: {user.email}
            </p>
          </div>
          <button onClick={() => signOut(auth)} style={logoutBtnStyle}>
            <LogOut size={16} /> {!isMobile && "Logout"}
          </button>
        </header>

        <div
          style={{
            display: isMobile ? "block" : "flex",
            gap: isMobile ? "3rem" : "4rem",
            alignItems: "flex-start",
          }}
        >
          <section
            style={{
              width: isMobile ? "100%" : "420px",
              position: isMobile ? "relative" : "sticky",
              top: "2rem",
              marginBottom: isMobile ? "3rem" : 0,
            }}
          >
            <div style={formCardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.2rem",
                }}
              >
                <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
                  {editingId ? (
                    <Edit2 size={18} color="#caaff3" />
                  ) : (
                    <PlusCircle size={18} color="#caaff3" />
                  )}
                  {editingId ? "EDIT ENTRY" : "NEW ENTRY"}
                </h2>
                {editingId && (
                  <button
                    onClick={resetForm}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ff4d4d",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.7rem",
                      fontWeight: "bold",
                    }}
                  >
                    <XCircle size={14} /> CANCEL
                  </button>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.2rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Source</label>
                  <div style={toggleContainerStyle}>
                    <div
                      onClick={() => handleToggle("course")}
                      style={{
                        ...toggleOptionStyle,
                        backgroundColor:
                          linkType === "course" ? "#caaff3" : "transparent",
                        color: linkType === "course" ? "#fff" : "#1c0700",
                      }}
                    >
                      Course
                    </div>
                    <div
                      onClick={() => handleToggle("event")}
                      style={{
                        ...toggleOptionStyle,
                        backgroundColor:
                          linkType === "event" ? "#caaff3" : "transparent",
                        color: linkType === "event" ? "#fff" : "#1c0700",
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
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 18:30"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {linkType === "course" ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.2rem",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Template</label>
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
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Override Link (Custom URL)
                      </label>
                      <input
                        type="url"
                        placeholder={link}
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Link / URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={externalLink}
                      onChange={(e) => setExternalLink(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
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
                <button
                  type="submit"
                  style={{
                    ...btnStyle,
                    backgroundColor: editingId ? "#1c0700" : "#caaff3",
                    color: editingId ? "#fff" : "#1c0700",
                  }}
                >
                  {editingId ? "Update Entry" : "Add to Calendar"}
                </button>
              </form>
            </div>
          </section>

          <section style={{ flex: 1, width: "100%", paddingBottom: "10vh" }}>
            <h2 style={sectionTitleStyle}>
              <CalendarIcon size={18} color="#caaff3" /> SCHEDULED (
              {events.length})
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => startEdit(event)}
                  style={{
                    ...cardStyle,
                    cursor: "pointer",
                    border:
                      editingId === event.id
                        ? "2px solid #caaff3"
                        : "2px solid transparent",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#caaff3",
                        fontWeight: "800",
                        marginBottom: "4px",
                      }}
                    >
                      {new Date(event.date).toLocaleDateString("de-DE")}{" "}
                      {event.time && `• ${event.time}`}
                    </div>
                    <span
                      style={{
                        fontSize: isMobile ? "0.95rem" : "1.1rem",
                        fontWeight: "600",
                      }}
                    >
                      {event.title.en}
                    </span>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        opacity: 0.4,
                        marginTop: "4px",
                      }}
                    >
                      TYPE: {event.type || "unknown"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteEvent(e, event.id)}
                    style={deleteBtnStyle}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const loginWrapperStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  backgroundColor: "#fffce3",
  padding: "1.5rem",
};
const loginCardStyle = (isMobile) => ({
  backgroundColor: "white",
  padding: isMobile ? "2rem" : "3rem",
  borderRadius: "24px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
  width: "100%",
  maxWidth: "400px",
});
const headerStyle = (isMobile) => ({
  marginBottom: isMobile ? "2rem" : "4rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
});
const logoutBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "white",
  border: "1px solid #1c0700",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};
const formCardStyle = {
  backgroundColor: "#ffffff",
  padding: "1.8rem",
  borderRadius: "24px",
  boxShadow: "0 10px 40px rgba(28, 7, 0, 0.04)",
};
const labelStyle = {
  display: "block",
  fontSize: "0.65rem",
  marginBottom: "6px",
  opacity: 0.5,
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
};
const inputStyle = {
  width: "100%",
  padding: "0.85rem",
  borderRadius: "12px",
  border: "1px solid #eee",
  fontFamily: "Satoshi",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "1rem",
};
const btnStyle = {
  marginTop: "0.5rem",
  padding: "1rem",
  backgroundColor: "#caaff3",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  color: "#1c0700",
  fontSize: "1rem",
  width: "100%",
};
const forgotLinkStyle = {
  background: "none",
  border: "none",
  color: "#caaff3",
  cursor: "pointer",
  fontSize: "0.65rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  padding: 0,
};
const sectionTitleStyle = {
  fontSize: "0.9rem",
  marginBottom: "1.2rem",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
};
const cardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "1.2rem",
  backgroundColor: "#fff",
  borderRadius: "18px",
  boxShadow: "0 4px 15px rgba(28, 7, 0, 0.02)",
  transition: "all 0.2s ease",
};
const deleteBtnStyle = {
  color: "#ff4d4d",
  background: "none",
  border: "none",
  cursor: "pointer",
  opacity: 0.4,
  padding: "8px",
};
const toggleContainerStyle = {
  display: "flex",
  backgroundColor: "#f0f0f0",
  padding: "4px",
  borderRadius: "12px",
  width: "fit-content",
};
const toggleOptionStyle = {
  padding: "8px 20px",
  borderRadius: "9px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: "600",
  transition: "all 0.2s ease",
};
