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
  updateDoc,
  onSnapshot,
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
  Loader2,
  Mail,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  // --- EVENT STATES ---
  const [events, setEvents] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleDe, setTitleDe] = useState("");
  const [linkType, setLinkType] = useState("course");
  const [link, setLink] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [editingId, setEditingId] = useState(null);

  // --- RENTAL STATES ---
  const [rentRequests, setRentRequests] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [availDate, setAvailDate] = useState("");
  const [availTime, setAvailTime] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const eventsCollection = collection(db, "events");
  const requestsCollection = collection(db, "rent_requests");
  const availabilityCollection = collection(db, "rental_availability");

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
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchEvents();
        autoFillFirstCourse();
        setupRealtimeListeners();
        fetchSettings();
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const setupRealtimeListeners = () => {
    // Requests Listener
    onSnapshot(
      query(requestsCollection, orderBy("createdAt", "desc")),
      (snap) => {
        setRentRequests(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
    );

    // Availability Listener with AUTO-CLEANUP
    onSnapshot(
      query(availabilityCollection, orderBy("date", "asc")),
      (snap) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allDocs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const validAvail = allDocs.filter((item) => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);

          if (itemDate < today) {
            // Delete from Firestore if date is in the past
            deleteDoc(doc(db, "rental_availability", item.id));
            return false;
          }
          return true;
        });

        setAvailabilities(validAvail);
      },
    );
  };

  const fetchSettings = async () => {
    const snap = await getDocs(collection(db, "settings"));
    if (!snap.empty) {
      const config = snap.docs.find((d) => d.id === "admin_config");
      if (config) {
        setNotifyEmail(config.data().adminEmail || "");
      }
    }
  };

  const updateNotifyEmail = async () => {
    try {
      await setDoc(
        doc(db, "settings", "admin_config"),
        { adminEmail: notifyEmail },
        { merge: true },
      );
      alert("Notification email saved!");
    } catch (err) {
      alert("Error saving email: " + err.message);
    }
  };

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

      // Filter logic with AUTO-CLEANUP
      const validEvents = allFetchedEvents.filter((event) => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);

        if (eventDate < today) {
          // Delete from Firestore if date is in the past
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

  // --- HANDLERS ---
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

  const handleAddAvailability = async () => {
    if (!availDate) return alert("Select a date");
    await addDoc(availabilityCollection, {
      date: availDate,
      time: availTime,
      status: "available",
    });
    setAvailDate("");
    setAvailTime("");
  };

  const handleApprove = async (reqId) => {
    await updateDoc(doc(db, "rent_requests", reqId), { status: "approved" });
  };

  const handleReject = async (reqId, availId) => {
    await updateDoc(doc(db, "rent_requests", reqId), { status: "rejected" });
    if (availId) {
      await updateDoc(doc(db, "rental_availability", availId), {
        status: "available",
      });
    }
  };

  const deleteAvailability = async (id) => {
    if (window.confirm("Delete this availability?")) {
      await deleteDoc(doc(db, "rental_availability", id));
    }
  };

  const deleteRequest = async (id) => {
    if (window.confirm("Delete this request?")) {
      await deleteDoc(doc(db, "rent_requests", id));
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
    if (linkType === "course") autoFillFirstCourse();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setIsLoading(false);
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
              onClick={() => sendPasswordResetEmail(auth, email)}
              style={forgotLinkStyle}
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
          />
          <button type="submit" disabled={isLoading} style={btnStyle}>
            {isLoading ? <Loader2 className="spinner" size={18} /> : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? "1.5rem" : "4vw",
        minHeight: "100vh",
        fontFamily: "Satoshi",
        color: "#1c0700",
      }}
    >
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

      <h2
        style={{ ...sectionTitleStyle, color: "#4e5f28", fontSize: "1.2rem" }}
      >
        1. Calendar Events
      </h2>
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
                    onClick={() => setLinkType("course")}
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
              {linkType === "course" ? (
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

        <section style={{ flex: 1 }}>
          <h3 style={sectionTitleStyle}>
            <CalendarIcon size={16} /> Scheduled Events ({events.length})
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
          >
            {events.map((ev) => (
              <div key={ev.id} onClick={() => startEdit(ev)} style={cardStyle}>
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
          </div>
        </section>
      </div>

      <hr style={{ opacity: 0.1, marginBottom: "4rem" }} />
      <h2
        style={{ ...sectionTitleStyle, color: "#4e5f28", fontSize: "1.2rem" }}
      >
        2. Rental Management
      </h2>

      <div style={{ display: isMobile ? "block" : "flex", gap: "2rem" }}>
        <section style={{ width: isMobile ? "100%" : "400px" }}>
          <div style={formCardStyle}>
            <h3 style={sectionTitleStyle}>
              <PlusCircle size={16} /> Set Availability
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <input
                type="date"
                value={availDate}
                onChange={(e) => setAvailDate(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Time slot (e.g. 10:00 - 16:00)"
                value={availTime}
                onChange={(e) => setAvailTime(e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={handleAddAvailability}
                style={{
                  ...btnStyle,
                  backgroundColor: "#4e5f28",
                  color: "white",
                }}
              >
                Publish Date
              </button>
            </div>

            <div style={{ marginTop: "2rem" }}>
              <h4 style={labelStyle}>Persistent Notification Email</h4>
              <div style={{ display: "flex", gap: "5px" }}>
                <input
                  type="email"
                  placeholder="Admin notification email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={updateNotifyEmail}
                  style={{ ...btnStyle, width: "auto", padding: "0 15px" }}
                  title="Save Email to Settings"
                >
                  <Mail size={16} />
                </button>
              </div>
              <p style={{ fontSize: "0.7rem", opacity: 0.5, marginTop: "5px" }}>
                Requests will be sent to this email until changed.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={labelStyle}>Live Availabilities</h3>
            {availabilities.map((a) => (
              <div
                key={a.id}
                style={{
                  ...cardStyle,
                  padding: "0.8rem",
                  marginBottom: "0.5rem",
                  opacity: a.status === "available" ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>
                  {a.date} — <strong>{a.status}</strong>
                </span>
                <button
                  onClick={() => deleteAvailability(a.id)}
                  style={deleteBtnStyle}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ flex: 1 }}>
          <h3 style={sectionTitleStyle}>
            <Clock size={16} /> Incoming Rent Requests ({rentRequests.length})
          </h3>
          {rentRequests.length === 0 && (
            <p style={{ opacity: 0.5 }}>No requests yet.</p>
          )}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {rentRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  ...cardStyle,
                  alignItems: "flex-start",
                  flexDirection: "column",
                  borderLeft:
                    req.status === "approved"
                      ? "6px solid #4e5f28"
                      : req.status === "rejected"
                        ? "6px solid #ff4d4d"
                        : "6px solid #caaff3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      {req.name}
                    </span>
                    {req.status !== "pending" && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          background: "#eee",
                          padding: "2px 8px",
                          borderRadius: "100px",
                          textTransform: "uppercase",
                        }}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    {req.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          style={{
                            ...deleteBtnStyle,
                            color: "#4e5f28",
                            opacity: 1,
                          }}
                        >
                          <CheckCircle size={22} />
                        </button>
                        <button
                          onClick={() =>
                            handleReject(req.id, req.availabilityId)
                          }
                          style={{
                            ...deleteBtnStyle,
                            color: "#ff4d4d",
                            opacity: 1,
                          }}
                        >
                          <XCircle size={22} />
                        </button>
                      </>
                    )}
                    <a
                      href={`mailto:${req.email}`}
                      style={{ color: "#caaff3" }}
                    >
                      <Mail size={20} />
                    </a>
                    <button
                      onClick={() => deleteRequest(req.id)}
                      style={deleteBtnStyle}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "10px",
                    width: "100%",
                    fontSize: "0.9rem",
                  }}
                >
                  <div>
                    <span style={labelStyle}>Email:</span> {req.email}
                  </div>
                  <div>
                    <span style={labelStyle}>Phone:</span> {req.phone}
                  </div>
                  <div>
                    <span style={labelStyle}>Requested Date:</span>{" "}
                    <strong>{req.date}</strong>
                  </div>
                  <div>
                    <span style={labelStyle}>Received:</span>{" "}
                    {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// STYLES (Kept exactly as provided)
const loginWrapperStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
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
const cancelBtnStyle = {
  background: "none",
  border: "none",
  color: "#ff4d4d",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "0.7rem",
  fontWeight: "bold",
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
