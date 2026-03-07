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
  writeBatch,
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
  currentLang,
}) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseEvents, setCourseEvents] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  const [scheduleDoc, setScheduleDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [instructorsPerSlot, setInstructorsPerSlot] = useState(1);

  const [assignments, setAssignments] = useState({});
  const [specialAssignments, setSpecialAssignments] = useState({});

  const isFullAdmin = userRole === "admin";
  const functions = getFunctions();

  const labels = {
    en: {
      title: "Work Schedule Management",
      course: "Course",
      autoTitle: "Automatic Schedule",
      autoDesc: "Request availability and let the system generate the shifts.",
      startAuto: "Start Auto Schedule",
      manTitle: "Manual Schedule",
      manDesc: "Assign instructors manually to each date.",
      startMan: "Start Manual Schedule",
      status: "Status",
      reset: "Reset",
      confirmReset: "Reset schedule?",
      instructors: "Course Instructors",
      noInstructors: "No instructors added yet. Search below.",
      searchPlace: "Search users to add as instructors...",
      reqAvail: "Request Availabilities",
      saveList: "Save Instructor List",
      assignmentsTitle: "Schedule Assignments",
      instLabel: "Instructors",
      addonsLabel: "Session Add-ons",
      noAddons: "No add-ons defined",
      saveDraft: "Save Draft",
      publishSilent: "Publish (No Email)",
      publish: "Publish & Email Schedule",
      noTime: "No time set",
      errAvail: "Select at least one instructor.",
      msgUpdated: "Instructor list updated.",
      msgDraft: "Draft saved successfully.",
      msgErrDraft: "Error saving draft.",
      msgReq: "Availability requests sent!",
      msgErrReq: "Status updated locally. Cloud Function failed.",
      msgPub: "Schedule published and instructors notified!",
      msgPubSilent: "Schedule published (no emails sent)!",
      msgErrPub: "Error publishing: ",
      processing: "Processing...",
    },
    de: {
      title: "Stundenplan Verwaltung",
      course: "Kurs",
      autoTitle: "Automatischer Plan",
      autoDesc:
        "Verfügbarkeiten anfragen und Schichten automatisch generieren lassen.",
      startAuto: "Auto-Planung starten",
      manTitle: "Manueller Plan",
      manDesc: "Kursleiter manuell den Terminen zuweisen.",
      startMan: "Manuelle Planung starten",
      status: "Status",
      reset: "Zurücksetzen",
      confirmReset: "Stundenplan zurücksetzen?",
      instructors: "Kursleiter",
      noInstructors: "Noch keine Kursleiter hinzugefügt. Suche unten.",
      searchPlace: "Nutzer suchen und als Kursleiter hinzufügen...",
      reqAvail: "Verfügbarkeiten anfragen",
      saveList: "Kursleiter-Liste speichern",
      assignmentsTitle: "Schichtzuweisungen",
      instLabel: "Kursleiter",
      addonsLabel: "Session Extras",
      noAddons: "Keine Extras definiert",
      saveDraft: "Entwurf speichern",
      publishSilent: "Veröffentlichen (Ohne E-Mail)",
      publish: "Veröffentlichen & E-Mail senden",
      noTime: "Keine Zeit",
      errAvail: "Wähle mindestens einen Kursleiter aus.",
      msgUpdated: "Kursleiter-Liste aktualisiert.",
      msgDraft: "Entwurf erfolgreich gespeichert.",
      msgErrDraft: "Fehler beim Speichern des Entwurfs.",
      msgReq: "Verfügbarkeitsanfragen gesendet!",
      msgErrReq: "Status lokal aktualisiert. Cloud Function fehlgeschlagen.",
      msgPub: "Stundenplan veröffentlicht und Kursleiter benachrichtigt!",
      msgPubSilent: "Stundenplan veröffentlicht (keine E-Mails)! ",
      msgErrPub: "Fehler beim Veröffentlichen: ",
      processing: "Wird bearbeitet...",
    },
  }[currentLang || "en"];

  const availableCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

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
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    const batch = writeBatch(db);

    try {
      // 1. Update the master schedule document
      batch.set(
        doc(db, "schedules", sanitizedId),
        {
          instructors: selectedInstructors,
          instructorsPerSlot,
        },
        { merge: true },
      );

      // 2. Automatically sync roles & course permissions for the instructors
      for (const uid of selectedInstructors) {
        const userRef = doc(db, "users", uid);
        const userData = allUsers.find((u) => u.id === uid);
        if (!userData) continue;

        // Upgrade role to 'instructor' only if they are a standard 'user'
        const newRole =
          userData.role === "admin" || userData.role === "course_admin"
            ? userData.role
            : "instructor";

        // Add current course to their allowed list if it's not already there
        const currentAllowed = userData.allowedCourses || [];
        const updatedAllowed = currentAllowed.includes(selectedCourse)
          ? currentAllowed
          : [...currentAllowed, selectedCourse];

        batch.update(userRef, {
          role: newRole,
          allowedCourses: updatedAllowed,
        });
      }

      await batch.commit();
      alert(labels.msgUpdated);
    } catch (err) {
      console.error(err);
      alert("Error updating instructors: " + err.message);
    }
    setIsProcessing(false);
  };

  const saveDraft = async () => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      await setDoc(
        doc(db, "schedules", sanitizedId),
        {
          instructors: selectedInstructors, // Added to ensure list is saved
          instructorsPerSlot, // Added to ensure slot count is saved
          assignments,
          specialAssignments,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      alert(labels.msgDraft);
    } catch (err) {
      alert(labels.msgErrDraft);
    }
    setIsProcessing(false);
  };

  const sendAvailabilityRequests = async () => {
    if (selectedInstructors.length === 0) return alert(labels.errAvail);
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

      alert(labels.msgReq);
    } catch (err) {
      alert(labels.msgErrReq);
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

  const publishSchedule = async (sendEmail = true) => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      const batch = writeBatch(db);

      // 1. Delete existing shifts for this course to prevent old coworkers from showing up
      const oldShiftsQuery = query(
        collection(db, "work_schedule"),
        where("coursePath", "==", selectedCourse),
      );
      const oldShiftsSnap = await getDocs(oldShiftsQuery);
      oldShiftsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Update the master schedule document
      batch.set(
        doc(db, "schedules", sanitizedId),
        {
          instructors: selectedInstructors,
          instructorsPerSlot,
          assignments,
          specialAssignments,
          status: "published",
        },
        { merge: true },
      );

      // 3. Sync individual 'work_schedule' docs for Profile.jsx visibility
      for (const eventId in assignments) {
        const instructorIds = assignments[eventId];
        for (const uid of instructorIds) {
          const workDocId = `${eventId}_${uid}`;
          const eventData = courseEvents.find((e) => e.id === eventId);

          const workRef = doc(db, "work_schedule", workDocId);
          batch.set(workRef, {
            userId: uid,
            eventId: eventId,
            coursePath: selectedCourse,
            courseName:
              eventData?.title?.[currentLang || "en"] || selectedCourse,
            date: eventData?.date || "",
            time: eventData?.time || "",
          });
        }
      }

      // 4. Sync Instructor Roles & Permissions
      for (const uid of selectedInstructors) {
        const userRef = doc(db, "users", uid);
        const userData = allUsers.find((u) => u.id === uid);
        if (!userData) continue;

        const newRole =
          userData.role === "admin" || userData.role === "course_admin"
            ? userData.role
            : "instructor";

        const currentAllowed = userData.allowedCourses || [];
        const updatedAllowed = currentAllowed.includes(selectedCourse)
          ? currentAllowed
          : [...currentAllowed, selectedCourse];

        batch.update(userRef, {
          role: newRole,
          allowedCourses: updatedAllowed,
        });
      }

      await batch.commit();

      if (sendEmail) {
        // 5. Trigger Cloud Function for emails
        const sendSchedules = httpsCallable(functions, "sendFinalSchedules");
        await sendSchedules({
          courseId: selectedCourse,
          assignments,
          specialAssignments,
          baseUrl: window.location.origin,
        });
        alert(labels.msgPub);
      } else {
        alert(labels.msgPubSilent);
      }
    } catch (err) {
      console.error(err);
      alert(labels.msgErrPub + err.message);
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

  const toggleSpecialAssignment = (eventId, addonId) => {
    setSpecialAssignments((prev) => {
      // Safely check what is currently stored for this event
      const existingData = prev[eventId];

      // If it's an array, use it. If it's a string, wrap it in an array. Otherwise, empty array.
      const current = Array.isArray(existingData)
        ? existingData
        : existingData
          ? [existingData]
          : [];

      // Toggle the selection
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
          <CalendarClock size={18} /> {labels.title}
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
          <label style={{ ...labelStyle, marginBottom: "4px" }}>
            {labels.course}
          </label>
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
                {c.text[currentLang || "en"]}
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
                {labels.autoTitle}
              </h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: 0 }}>
                {labels.autoDesc}
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
                labels.startAuto
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
                {labels.manTitle}
              </h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: 0 }}>
                {labels.manDesc}
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
                labels.startMan
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
                {labels.status}
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
            <button
              onClick={() => {
                if (window.confirm(labels.confirmReset))
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
              {labels.reset}
            </button>
          </div>

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
              {labels.instructors}
            </h4>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {selectedInstructors.length === 0 && (
                <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>
                  {labels.noInstructors}
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
                  placeholder={labels.searchPlace}
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
                        <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
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

            {scheduleDoc.mode === "auto" && scheduleDoc.status === "setup" && (
              <button
                onClick={sendAvailabilityRequests}
                style={primaryBtnStyle(isMobile)}
              >
                {labels.reqAvail}
              </button>
            )}
            {scheduleDoc.mode === "manual" && (
              <button
                onClick={saveInstructorList}
                style={{ ...btnStyle, fontSize: "0.85rem", padding: "8px" }}
              >
                {labels.saveList}
              </button>
            )}
          </div>

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
              {labels.assignmentsTitle}
            </h4>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
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
                      {ev.time || labels.noTime}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, fontSize: "0.65rem" }}>
                      {labels.instLabel}
                    </label>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {selectedInstructors.map((uid) => {
                        const isAssigned = assignments[ev.id]?.includes(uid);
                        return (
                          <button
                            key={uid}
                            onClick={() => updateAssignment(ev.id, uid)}
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
                              cursor: "pointer",
                            }}
                          >
                            {getUserName(uid)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ ...labelStyle, fontSize: "0.65rem" }}>
                      {labels.addonsLabel}
                    </label>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {specialEvents.length === 0 ? (
                        <span style={{ fontSize: "0.7rem", opacity: 0.4 }}>
                          {labels.noAddons}
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
                                toggleSpecialAssignment(ev.id, se.id)
                              }
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
                                cursor: "pointer",
                              }}
                            >
                              {currentLang === "de" ? se.nameDe : se.nameEn}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "1rem",
                marginTop: "1rem",
              }}
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
                  labels.saveDraft
                )}
              </button>
              <button
                onClick={() => publishSchedule(false)}
                disabled={isProcessing}
                style={{
                  ...btnStyle,
                  flex: 1.5,
                  backgroundColor: "rgba(202, 175, 243, 0.15)",
                  color: "#9960a8",
                  border: "1px solid #caaff3",
                }}
              >
                {isProcessing ? (
                  <Loader2 className="spinner" size={18} />
                ) : (
                  labels.publishSilent
                )}
              </button>
              <button
                onClick={() => publishSchedule(true)}
                disabled={isProcessing}
                style={{ ...primaryBtnStyle(isMobile), flex: 2 }}
              >
                {isProcessing ? (
                  <Loader2 className="spinner" size={18} />
                ) : (
                  labels.publish
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(28, 7, 0, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #caaff3; border-radius: 10px; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
