import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { planets } from "../../data/planets";
import {
  CalendarClock,
  Wand2,
  Users,
  Send,
  Loader2,
  CheckCircle,
  Save,
  Clock,
  UserPlus,
  Search,
  X,
  Plus,
} from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  labelStyle,
  inputStyle,
  btnStyle,
  primaryBtnStyle,
} from "./AdminStyles";

export default function ScheduleTab({
  isMobile,
  userRole,
  allowedCourses = [],
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseEvents, setCourseEvents] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  const [scheduleDoc, setScheduleDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Setup State
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [instructorsPerSlot, setInstructorsPerSlot] = useState(1);

  // Editable Assignments State
  const [assignments, setAssignments] = useState({});
  const [specialAssignments, setSpecialAssignments] = useState({});

  const isFullAdmin = userRole === "admin";
  const functions = getFunctions();

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  // Helper: Format date to DD.MM.YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(availableCourses[0].link);
    }
  }, [availableCourses, selectedCourse]);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(
        query(collection(db, "users"), orderBy("firstName")),
      );
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;

    setIsLoading(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");

    const fetchEvents = async () => {
      const snap = await getDocs(
        query(
          collection(db, "events"),
          where("link", "==", selectedCourse),
          orderBy("date"),
        ),
      );
      setCourseEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, "course_settings", sanitizedId));
      if (snap.exists()) {
        setSpecialEvents(snap.data().specialEvents || []);
      } else {
        setSpecialEvents([]);
      }
    };

    fetchEvents();
    fetchSettings();

    const unsub = onSnapshot(doc(db, "schedules", sanitizedId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScheduleDoc(data);
        setAssignments(data.assignments || {});
        setSpecialAssignments(data.specialAssignments || {});
        setSelectedInstructors(data.instructors || []);
        setInstructorsPerSlot(data.instructorsPerSlot || 1);
      } else {
        setScheduleDoc(null);
        setAssignments({});
        setSpecialAssignments({});
        setSelectedInstructors([]);
        setInstructorsPerSlot(1);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [selectedCourse]);

  // --- ACTIONS ---

  const initSchedule = async (mode) => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      await setDoc(doc(db, "schedules", sanitizedId), {
        courseId: selectedCourse,
        mode: mode,
        status: mode === "auto" ? "setup" : "draft",
        instructors: [],
        instructorsPerSlot: 1,
        availabilities: {},
        assignments: {},
        specialAssignments: {},
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      alert(err.message);
    }
    setIsProcessing(false);
  };

  const saveInstructorList = async () => {
    const sanitizedId = selectedCourse.replace(/\//g, "");
    await setDoc(
      doc(db, "schedules", sanitizedId),
      {
        instructors: selectedInstructors,
        instructorsPerSlot,
      },
      { merge: true },
    );
    alert("Instructor list updated.");
  };

  const saveDraft = async () => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      await setDoc(
        doc(db, "schedules", sanitizedId),
        {
          assignments,
          specialAssignments,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      alert("Draft saved successfully.");
    } catch (err) {
      alert("Error saving draft.");
    }
    setIsProcessing(false);
  };

  const sendAvailabilityRequests = async () => {
    if (selectedInstructors.length === 0)
      return alert("Select at least one instructor.");
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      await setDoc(
        doc(db, "schedules", sanitizedId),
        {
          instructors: selectedInstructors,
          instructorsPerSlot,
          status: "requesting",
        },
        { merge: true },
      );

      const sendMails = httpsCallable(functions, "requestAvailabilities");
      await sendMails({
        courseId: selectedCourse,
        instructors: selectedInstructors,
      });

      alert("Availability requests sent!");
    } catch (err) {
      alert("Status updated locally. Cloud Function failed.");
    }
    setIsProcessing(false);
  };

  const autoGenerateSchedule = async () => {
    setIsProcessing(true);
    const availabilities = scheduleDoc.availabilities || {};
    const perSlot = scheduleDoc.instructorsPerSlot || 1;
    const newAssignments = {};

    const shiftCount = {};
    const consecutive = {};
    scheduleDoc.instructors.forEach((id) => {
      shiftCount[id] = 0;
      consecutive[id] = 0;
    });

    courseEvents.forEach((ev) => {
      let available = scheduleDoc.instructors.filter((id) =>
        availabilities[id]?.includes(ev.id),
      );

      available.sort((a, b) => {
        if (shiftCount[a] !== shiftCount[b])
          return shiftCount[a] - shiftCount[b];
        return consecutive[a] - consecutive[b];
      });

      let preferred = available.filter((id) => consecutive[id] < 3);
      if (preferred.length < perSlot) preferred = available;

      const picked = preferred.slice(0, perSlot);
      newAssignments[ev.id] = picked;

      scheduleDoc.instructors.forEach((id) => {
        if (picked.includes(id)) {
          consecutive[id]++;
          shiftCount[id]++;
        } else {
          consecutive[id] = 0;
        }
      });
    });

    const sanitizedId = selectedCourse.replace(/\//g, "");
    await setDoc(
      doc(db, "schedules", sanitizedId),
      { assignments: newAssignments, status: "generated" },
      { merge: true },
    );
    setIsProcessing(false);
  };

  const publishSchedule = async () => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      await setDoc(
        doc(db, "schedules", sanitizedId),
        { assignments, specialAssignments, status: "published" },
        { merge: true },
      );
      const sendSchedules = httpsCallable(functions, "sendFinalSchedules");
      await sendSchedules({
        courseId: selectedCourse,
        assignments,
        specialAssignments,
      });
      alert("Schedule published and instructors notified!");
    } catch (err) {
      alert("Error publishing.");
    }
    setIsProcessing(false);
  };

  const getUserName = (id) => {
    const u = allUsers.find((u) => u.id === id);
    return u ? `${u.firstName} ${u.lastName}` : "Unknown";
  };

  const toggleInstructorSetup = (id) => {
    setSelectedInstructors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const updateAssignment = (eventId, instructorId) => {
    setAssignments((prev) => {
      const current = prev[eventId] || [];
      const updated = current.includes(instructorId)
        ? current.filter((id) => id !== instructorId)
        : [...current, instructorId];
      return { ...prev, [eventId]: updated };
    });
  };

  // Logic to toggle multiple session add-ons
  const toggleSpecialAssignment = (eventId, addonId) => {
    setSpecialAssignments((prev) => {
      const current = Array.isArray(prev[eventId]) ? prev[eventId] : [];
      const updated = current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId];
      return { ...prev, [eventId]: updated };
    });
  };

  const filteredUserResults = allUsers
    .filter(
      (u) =>
        !selectedInstructors.includes(u.id) &&
        (u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase())),
    )
    .slice(0, 5);

  if (isLoading)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="spinner" size={30} color="#caaff3" />
      </div>
    );

  return (
    <section
      style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexDirection: isMobile ? "column" : "row",
          gap: "1rem",
        }}
      >
        <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
          <CalendarClock size={18} /> Work Schedule Management
        </h3>

        <div
          style={{
            backgroundColor: "#fdf8e1",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid rgba(28, 7, 0, 0.05)",
            width: isMobile ? "100%" : "300px",
          }}
        >
          <label style={{ ...labelStyle, marginBottom: "4px" }}>Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              ...inputStyle,
              padding: "8px",
              marginBottom: 0,
              backgroundColor: "rgba(255, 252, 227, 0.4)",
            }}
          >
            {availableCourses.map((c) => (
              <option key={c.link} value={c.link}>
                {c.text.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!scheduleDoc ? (
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              ...cardStyle,
              flex: 1,
              flexDirection: "column",
              gap: "1.5rem",
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "rgba(202, 175, 243, 0.1)",
            }}
          >
            <Wand2 size={40} color="#9960a8" />
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "1.2rem" }}>
                Automatic Schedule
              </h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: 0 }}>
                Request availability and let the system generate the shifts.
              </p>
            </div>
            <button
              onClick={() => initSchedule("auto")}
              disabled={isProcessing}
              style={{ ...primaryBtnStyle(isMobile), width: "100%" }}
            >
              {isProcessing ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                "Start Auto Schedule"
              )}
            </button>
          </div>

          <div
            style={{
              ...cardStyle,
              flex: 1,
              flexDirection: "column",
              gap: "1.5rem",
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "#fdf8e1",
            }}
          >
            <UserPlus size={40} color="#4e5f28" />
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "1.2rem" }}>
                Manual Schedule
              </h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: 0 }}>
                Assign instructors manually to each date.
              </p>
            </div>
            <button
              onClick={() => initSchedule("manual")}
              disabled={isProcessing}
              style={{ ...btnStyle, width: "100%" }}
            >
              {isProcessing ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                "Start Manual Schedule"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#fdf8e1",
              padding: "16px 24px",
              borderRadius: "16px",
              border: "1px solid rgba(28,7,0,0.1)",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  fontWeight: "bold",
                }}
              >
                Status
              </span>
              <h4
                style={{
                  margin: "4px 0 0 0",
                  color: "#9960a8",
                  textTransform: "capitalize",
                }}
              >
                {scheduleDoc.mode} Mode — {scheduleDoc.status.replace("_", " ")}
              </h4>
            </div>
            {scheduleDoc.status !== "published" && (
              <button
                onClick={() => {
                  if (window.confirm("Reset schedule?"))
                    deleteDoc(
                      doc(db, "schedules", selectedCourse.replace(/\//g, "")),
                    );
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff4d4d",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* INSTRUCTOR SEARCH */}
          {scheduleDoc.status !== "published" && (
            <div
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "stretch",
                gap: "1.5rem",
                padding: "1.5rem",
                backgroundColor: "#fdf8e1",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>
                Course Instructors
              </h4>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedInstructors.length === 0 && (
                  <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>
                    No instructors added yet. Search below.
                  </p>
                )}
                {selectedInstructors.map((id) => (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      backgroundColor: "#caaff3",
                      borderRadius: "100px",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                    }}
                  >
                    {getUserName(id)}
                    <X
                      size={14}
                      onClick={() => toggleInstructorSetup(id)}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: 0.4,
                    }}
                  />
                  <input
                    placeholder="Search users to add as instructors..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: "36px",
                      marginBottom: 0,
                      backgroundColor: "rgba(255, 252, 227, 0.4)",
                    }}
                  />
                </div>

                {userSearch && filteredUserResults.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "#fdf8e1",
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "12px",
                      marginTop: "4px",
                      zIndex: 10,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {filteredUserResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          toggleInstructorSetup(u.id);
                          setUserSearch("");
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(0,0,0,0.05)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{ fontWeight: "bold", fontSize: "0.9rem" }}
                          >
                            {u.firstName} {u.lastName}
                          </div>
                          <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                            {u.email}
                          </div>
                        </div>
                        <Plus size={16} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {scheduleDoc.mode === "auto" &&
                scheduleDoc.status === "setup" && (
                  <button
                    onClick={sendAvailabilityRequests}
                    style={primaryBtnStyle(isMobile)}
                  >
                    Request Availabilities
                  </button>
                )}
              {scheduleDoc.mode === "manual" && (
                <button
                  onClick={saveInstructorList}
                  style={{ ...btnStyle, fontSize: "0.85rem", padding: "8px" }}
                >
                  Save Instructor List
                </button>
              )}
            </div>
          )}

          {/* CALENDAR ASSIGNMENTS */}
          {(scheduleDoc.status === "generated" ||
            scheduleDoc.status === "draft" ||
            scheduleDoc.status === "published") && (
            <div
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "stretch",
                gap: "1.5rem",
                padding: isMobile ? "1rem" : "2rem",
                backgroundColor: "#fdf8e1",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "1.2rem" }}>
                Schedule Assignments
              </h4>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {courseEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      gap: "15px",
                      padding: "16px",
                      backgroundColor: "rgba(202, 175, 243, 0.05)",
                      border: "1px solid rgba(202, 175, 243, 0.15)",
                      borderRadius: "16px",
                    }}
                  >
                    <div style={{ minWidth: "120px" }}>
                      <div
                        style={{
                          fontWeight: "900",
                          color: "#1c0700",
                          fontSize: "1.1rem",
                        }}
                      >
                        {formatDate(ev.date)}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                        {ev.time || "No time set"}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, fontSize: "0.65rem" }}>
                        Instructors
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {selectedInstructors.map((uid) => {
                          const isAssigned = assignments[ev.id]?.includes(uid);
                          return (
                            <button
                              key={uid}
                              onClick={() =>
                                scheduleDoc.status !== "published" &&
                                updateAssignment(ev.id, uid)
                              }
                              disabled={scheduleDoc.status === "published"}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "100px",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                border: "1px solid",
                                transition: "all 0.2s",
                                backgroundColor: isAssigned
                                  ? "#caaff3"
                                  : "transparent",
                                borderColor: isAssigned
                                  ? "#caaff3"
                                  : "rgba(28,7,0,0.2)",
                                color: "#1c0700",
                                cursor:
                                  scheduleDoc.status === "published"
                                    ? "default"
                                    : "pointer",
                              }}
                            >
                              {getUserName(uid)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* NEW: Multi-select Session Add-ons */}
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <label style={{ ...labelStyle, fontSize: "0.65rem" }}>
                        Session Add-ons
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {specialEvents.length === 0 ? (
                          <span style={{ fontSize: "0.7rem", opacity: 0.4 }}>
                            No add-ons defined
                          </span>
                        ) : (
                          specialEvents.map((se) => {
                            const isSelected = Array.isArray(
                              specialAssignments[ev.id],
                            )
                              ? specialAssignments[ev.id].includes(se.id)
                              : specialAssignments[ev.id] === se.id;

                            return (
                              <button
                                key={se.id}
                                onClick={() =>
                                  scheduleDoc.status !== "published" &&
                                  toggleSpecialAssignment(ev.id, se.id)
                                }
                                disabled={scheduleDoc.status === "published"}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "8px",
                                  fontSize: "0.7rem",
                                  fontWeight: "700",
                                  border: "1px solid",
                                  transition: "all 0.2s",
                                  backgroundColor: isSelected
                                    ? "#4e5f28"
                                    : "transparent",
                                  borderColor: isSelected
                                    ? "#4e5f28"
                                    : "rgba(28,7,0,0.2)",
                                  color: isSelected ? "white" : "#1c0700",
                                  cursor:
                                    scheduleDoc.status === "published"
                                      ? "default"
                                      : "pointer",
                                }}
                              >
                                {se.nameEn}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {scheduleDoc.status !== "published" && (
                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}
                >
                  <button
                    onClick={saveDraft}
                    disabled={isProcessing}
                    style={{
                      ...btnStyle,
                      flex: 1,
                      backgroundColor: "rgba(28, 7, 0, 0.05)",
                      color: "#1c0700",
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 className="spinner" size={18} />
                    ) : (
                      "Save Draft"
                    )}
                  </button>
                  <button
                    onClick={publishSchedule}
                    disabled={isProcessing}
                    style={{ ...primaryBtnStyle(isMobile), flex: 2 }}
                  >
                    {isProcessing ? (
                      <Loader2 className="spinner" size={18} />
                    ) : (
                      "Publish & Email Schedule"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
