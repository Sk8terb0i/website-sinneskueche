import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { CalendarHeart, Loader2, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header/Header";

export default function InstructorAvailability({
  currentLang,
  setCurrentLang,
}) {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseParam = searchParams.get("course");

  const [courseEvents, setCourseEvents] = useState([]);
  const [scheduleDoc, setScheduleDoc] = useState(null);
  const [myAvailabilities, setMyAvailabilities] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const labels = {
    en: {
      instViewTitle: "My Availabilities",
      instViewDesc:
        "Select the dates you are available to work. We will use this to generate the final schedule.",
      availableBtn: "✓ Available",
      unavailableBtn: "Mark as Available",
      saveMyAvail: "Submit My Availabilities",
      msgMyAvailSaved: "Your availabilities have been saved. Thank you!",
      noTime: "No time set",
      unauthorized:
        "You are not assigned to any active schedules for this course.",
      loginRequired: "Please log in to submit your availability.",
      loginBtn: "Go to Login",
      courseNotFound: "Course schedule not found.",
    },
    de: {
      instViewTitle: "Meine Verfügbarkeiten",
      instViewDesc:
        "Wähle die Termine, an denen du arbeiten kannst. Diese werden genutzt, um den finalen Plan zu erstellen.",
      availableBtn: "✓ Verfügbar",
      unavailableBtn: "Als verfügbar markieren",
      saveMyAvail: "Meine Verfügbarkeiten absenden",
      msgMyAvailSaved: "Deine Verfügbarkeiten wurden gespeichert. Danke!",
      noTime: "Keine Zeit",
      unauthorized:
        "Du bist für diesen Kurs keinem aktiven Stundenplan zugewiesen.",
      loginRequired: "Bitte logge dich ein, um deine Verfügbarkeit anzugeben.",
      loginBtn: "Zum Login",
      courseNotFound: "Kurs-Stundenplan nicht gefunden.",
    },
  }[currentLang || "en"];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  useEffect(() => {
    if (!courseParam) {
      setIsLoading(false);
      return;
    }

    const fetchEvents = async () => {
      // Reconstruct the link format from the ID (e.g. "potterytuesdays" -> "/pottery-tuesdays" depending on how you structure links,
      // but usually the event.link matches the course settings ID or has a slash)
      // We will do a generic query where link ends with the courseParam
      const snap = await getDocs(
        query(collection(db, "events"), orderBy("date")),
      );
      const filtered = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => d.link && d.link.replace(/\//g, "") === courseParam);
      setCourseEvents(filtered);
    };

    fetchEvents();

    const unsub = onSnapshot(doc(db, "schedules", courseParam), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScheduleDoc(data);
        if (currentUser) {
          setMyAvailabilities(data.availabilities?.[currentUser.uid] || []);
        }
      } else {
        setScheduleDoc(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [courseParam, currentUser]);

  const toggleMyAvailability = (eventId) => {
    setMyAvailabilities((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId],
    );
  };

  const submitMyAvailabilities = async () => {
    setIsProcessing(true);
    try {
      const currentAvailabilities = scheduleDoc.availabilities || {};
      await setDoc(
        doc(db, "schedules", courseParam),
        {
          availabilities: {
            ...currentAvailabilities,
            [currentUser.uid]: myAvailabilities,
          },
        },
        { merge: true },
      );

      alert(labels.msgMyAvailSaved);
      navigate("/"); // Redirect to homepage so the user knows they are done
    } catch (err) {
      alert("Error: " + err.message);
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <Header
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          isMenuOpen={isMenuOpen}
          onMenuToggle={setIsMenuOpen}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
          }}
        >
          <Loader2 className="spinner" size={40} color="#caaff3" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#fffce3",
      }}
    >
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main
        style={{
          flex: 1,
          padding: "120px 20px 60px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "800px" }}>
          {!currentUser ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                backgroundColor: "#fdf8e1",
                borderRadius: "24px",
                border: "1px solid rgba(28,7,0,0.1)",
              }}
            >
              <LogIn
                size={48}
                color="#9960a8"
                style={{ marginBottom: "1rem" }}
              />
              <h2
                style={{
                  fontFamily: "Harmond-SemiBoldCondensed",
                  fontSize: "2rem",
                  color: "#1c0700",
                  margin: "0 0 1rem 0",
                }}
              >
                {labels.loginRequired}
              </h2>
              <button
                onClick={() => navigate("/profile")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#9960a8",
                  color: "white",
                  border: "none",
                  borderRadius: "100px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                {labels.loginBtn}
              </button>
            </div>
          ) : !scheduleDoc ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                opacity: 0.5,
              }}
            >
              <h2>{labels.courseNotFound}</h2>
            </div>
          ) : !scheduleDoc.instructors.includes(currentUser.uid) ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
              <HelpCircle
                size={48}
                color="#ff4d4d"
                style={{ marginBottom: "1rem", opacity: 0.5 }}
              />
              <h2 style={{ opacity: 0.5 }}>{labels.unauthorized}</h2>
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  backgroundColor: "rgba(28,7,0,0.05)",
                  borderRadius: "12px",
                  fontSize: "0.7rem",
                  textAlign: "left",
                  fontFamily: "monospace",
                }}
              >
                <p style={{ margin: "0 0 5px 0" }}>
                  <strong>Your UID:</strong> {currentUser.uid}
                </p>
                <p style={{ margin: "0" }}>
                  <strong>Authorized IDs:</strong>{" "}
                  {scheduleDoc.instructors.join(", ")}
                </p>
              </div>
              <p
                style={{ fontSize: "0.8rem", marginTop: "1rem", opacity: 0.6 }}
              >
                {currentLang === "en"
                  ? "Ensure the 'Your UID' above matches one of the 'Authorized IDs' in the Admin Panel configuration."
                  : "Stelle sicher, dass deine oben gezeigte UID mit einer der autorisierten IDs in der Admin-Konfiguration übereinstimmt."}
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fdf8e1",
                borderRadius: "24px",
                padding: "2.5rem",
                border: "1px solid rgba(28,7,0,0.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.8rem",
                  fontFamily: "Harmond-SemiBoldCondensed",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#1c0700",
                }}
              >
                <CalendarHeart size={28} color="#9960a8" />{" "}
                {labels.instViewTitle}
              </h3>
              <p
                style={{
                  margin: "0 0 2rem 0",
                  fontSize: "1rem",
                  opacity: 0.8,
                  color: "#1c0700",
                }}
              >
                {labels.instViewDesc}
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginBottom: "2rem",
                }}
              >
                {courseEvents.map((ev) => {
                  const isAvail = myAvailabilities.includes(ev.id);
                  const assignments = scheduleDoc.assignments || {};
                  const isFinalAssigned = assignments[ev.id]?.includes(
                    currentUser.uid,
                  );

                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px",
                        backgroundColor: isFinalAssigned
                          ? "rgba(78, 95, 40, 0.1)"
                          : "rgba(28,7,0,0.02)",
                        border: `1px solid ${isFinalAssigned ? "#4e5f28" : "rgba(28,7,0,0.08)"}`,
                        borderRadius: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "900",
                            color: "#1c0700",
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatDate(ev.date)}
                        </div>
                        <div style={{ fontSize: "0.85rem", opacity: 0.6 }}>
                          {ev.time || labels.noTime}
                        </div>
                        {isFinalAssigned && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#4e5f28",
                              fontWeight: "bold",
                              marginTop: "6px",
                            }}
                          >
                            {currentLang === "en"
                              ? "✓ Assigned to work"
                              : "✓ Für Schicht eingeteilt"}
                          </div>
                        )}
                      </div>

                      {!isFinalAssigned && (
                        <button
                          onClick={() => toggleMyAvailability(ev.id)}
                          style={{
                            padding: "10px 20px",
                            borderRadius: "100px",
                            fontSize: "0.85rem",
                            fontWeight: "800",
                            border: "2px solid",
                            transition: "all 0.2s",
                            // Purple background when available, subtle dash when not
                            backgroundColor: isAvail
                              ? "#caaff3"
                              : "rgba(153, 96, 168, 0.05)",
                            borderColor: isAvail
                              ? "#9960a8"
                              : "rgba(153, 96, 168, 0.3)",
                            color: isAvail ? "#1c0700" : "#9960a8",
                            cursor: "pointer",
                            boxShadow: isAvail
                              ? "0 2px 8px rgba(153, 96, 168, 0.2)"
                              : "none",
                          }}
                        >
                          {isAvail
                            ? labels.availableBtn
                            : labels.unavailableBtn}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={submitMyAvailabilities}
                disabled={isProcessing}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor: "#9960a8",
                  color: "white",
                  border: "none",
                  borderRadius: "100px",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {isProcessing ? (
                  <Loader2 className="spinner" size={20} />
                ) : (
                  labels.saveMyAvail
                )}
              </button>
            </div>
          )}
        </div>
      </main>
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
