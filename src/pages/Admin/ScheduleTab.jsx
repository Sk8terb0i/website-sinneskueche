import React, { useState, useEffect, useRef } from "react";
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
  Settings,
  Mail,
  ListChecks,
  CalendarHeart,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
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
  const { currentUser } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const courseDropdownRef = useRef(null);
  const [courseEvents, setCourseEvents] = useState([]);
  const [customCourses, setCustomCourses] = useState([]); // NEW: Firestore custom courses
  const [calendarGroups, setCalendarGroups] = useState({});
  const [specialEvents, setSpecialEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  const [scheduleDoc, setScheduleDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [instructorsPerSlot, setInstructorsPerSlot] = useState(1);
  const [maxConsecutiveShifts, setMaxConsecutiveShifts] = useState(2);
  const [maxShifts, setMaxShifts] = useState(0);

  const [assignments, setAssignments] = useState({});
  const [specialAssignments, setSpecialAssignments] = useState({});

  // Instructor View State
  const [myAvailabilities, setMyAvailabilities] = useState([]);

  const isFullAdmin = userRole === "admin" || userRole === "course_admin";
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
      reset: "Reset Completely",
      confirmReset: "Reset schedule completely? All data will be lost.",
      instructors: "Course Instructors",
      noInstructors: "No instructors added yet. Search below.",
      searchPlace: "Search users to add as instructors...",
      reqAvail: "Request Availabilities",
      resendReq: "Resend Requests",
      reqSent: "Requests have been sent.",
      saveList: "Save Configuration",
      assignmentsTitle: "4. Review & Publish",
      instLabel: "Instructors",
      addonsLabel: "Session Add-ons",
      noAddons: "No add-ons defined",
      saveDraft: "Save Draft",
      publishSilent: "Publish (No Email)",
      publish: "Publish & Email Schedule",
      noTime: "No time set",
      errAvail: "Select at least one instructor.",
      msgUpdated: "Configuration saved successfully.",
      msgDraft: "Draft saved successfully.",
      msgErrDraft: "Error saving draft.",
      msgReq: "Availability requests sent!",
      msgErrReq: "Status updated locally. Cloud Function failed.",
      msgPub: "Schedule published and instructors notified!",
      msgPubSilent: "Schedule published (no emails sent)!",
      msgErrPub: "Error publishing: ",
      processing: "Processing...",

      step1: "1. Rules & Instructors",
      step2: "2. Collect Availabilities",
      step3: "3. Generate Schedule",
      maxConsecutive: "Max. Consecutive Shifts",
      instPerSlot: "Instructors per Shift",
      maxShiftsLabel: "Max. Total Shifts (0 = no limit)",
      fillUnassigned: "Auto-Fill Empty Shifts",
      regenAll: "Regenerate All Shifts",
      availStatus1: "instructors have submitted their availabilities so far.",
      availStatus0: "No availabilities submitted yet.",
      waitingOn: "Waiting...",
      submitted: "Submitted",

      instViewTitle: "My Availabilities",
      instViewDesc:
        "Select the dates you are available to work. We will use this to generate the final schedule.",
      availableBtn: "Available",
      unavailableBtn: "Not Available",
      saveMyAvail: "Submit My Availabilities",
      msgMyAvailSaved: "Your availabilities have been saved. Thank you!",
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
      reset: "Komplett Zurücksetzen",
      confirmReset:
        "Stundenplan komplett zurücksetzen? Alle Daten gehen verloren.",
      instructors: "Kursleiter",
      noInstructors: "Noch keine Kursleiter hinzugefügt. Suche unten.",
      searchPlace: "Nutzer suchen und als Kursleiter hinzufügen...",
      reqAvail: "Verfügbarkeiten anfragen",
      resendReq: "Anfragen erneut senden",
      reqSent: "Anfragen wurden gesendet.",
      saveList: "Konfiguration speichern",
      assignmentsTitle: "4. Prüfen & Veröffentlichen",
      instLabel: "Kursleiter",
      addonsLabel: "Session Extras",
      noAddons: "Keine Extras definiert",
      saveDraft: "Entwurf speichern",
      publishSilent: "Veröffentlichen (Ohne E-Mail)",
      publish: "Veröffentlichen & E-Mail senden",
      noTime: "Keine Zeit",
      errAvail: "Wähle mindestens einen Kursleiter aus.",
      msgUpdated: "Konfiguration erfolgreich gespeichert.",
      msgDraft: "Entwurf erfolgreich gespeichert.",
      msgErrDraft: "Fehler beim Speichern des Entwurfs.",
      msgReq: "Verfügbarkeitsanfragen gesendet!",
      msgErrReq: "Status lokal aktualisiert. Cloud Function fehlgeschlagen.",
      msgPub: "Stundenplan veröffentlicht und Kursleiter benachrichtigt!",
      msgPubSilent: "Stundenplan veröffentlicht (keine E-Mails)! ",
      msgErrPub: "Fehler beim Veröffentlichen: ",
      processing: "Wird bearbeitet...",

      step1: "1. Regeln & Kursleiter",
      step2: "2. Verfügbarkeiten sammeln",
      step3: "3. Stundenplan generieren",
      maxConsecutive: "Max. Schichten am Stück",
      instPerSlot: "Kursleiter pro Schicht",
      maxShiftsLabel: "Max. Gesamtschichten (0 = kein Limit)",
      fillUnassigned: "Leere Schichten füllen",
      regenAll: "Alle Schichten neu generieren",
      availStatus1: "Kursleiter haben bisher ihre Verfügbarkeiten eingetragen.",
      availStatus0: "Noch keine Verfügbarkeiten eingetragen.",
      waitingOn: "Wartet...",
      submitted: "Eingereicht",

      instViewTitle: "Meine Verfügbarkeiten",
      instViewDesc:
        "Wähle die Termine, an denen du arbeiten kannst. Diese werden genutzt, um den finalen Plan zu erstellen.",
      availableBtn: "Verfügbar",
      unavailableBtn: "Nicht Verfügbar",
      saveMyAvail: "Meine Verfügbarkeiten absenden",
      msgMyAvailSaved: "Deine Verfügbarkeiten wurden gespeichert. Danke!",
    },
  }[currentLang || "en"];

  const flatCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course]),
    ).values(),
  ).filter((c) => isFullAdmin || allowedCourses.includes(c.link));

  // Add custom courses to the flat list for lookup
  customCourses.forEach((cc) => {
    if (!flatCourses.find((fc) => fc.link === cc.link)) {
      flatCourses.push({
        link: cc.link,
        text: { en: cc.nameEn, de: cc.nameDe },
      });
    }
  });
  const selectedCourseData = flatCourses.find((c) => c.link === selectedCourse);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  useEffect(() => {
    if (flatCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(flatCourses[0].link);
    }
  }, [flatCourses, selectedCourse]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(
        query(collection(db, "users"), orderBy("firstName")),
      );
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    const fetchCustomData = async () => {
      // Fetch custom courses
      const ccSnap = await getDocs(collection(db, "custom_courses"));
      setCustomCourses(ccSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Fetch calendar groupings
      const cgSnap = await getDocs(collection(db, "calendar_groups"));
      const cgMap = {};
      cgSnap.docs.forEach((d) => (cgMap[d.id] = d.data().includedLinks || []));
      setCalendarGroups(cgMap);
    };

    if (isFullAdmin) {
      fetchUsers();
      fetchCustomData();
    }
  }, [isFullAdmin]);

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
    if (isFullAdmin) fetchSettings();

    const unsub = onSnapshot(doc(db, "schedules", sanitizedId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScheduleDoc(data);
        setAssignments(data.assignments || {});
        setSpecialAssignments(data.specialAssignments || {});
        setSelectedInstructors(data.instructors || []);
        setInstructorsPerSlot(data.instructorsPerSlot || 1);
        setMaxConsecutiveShifts(data.maxConsecutiveShifts || 2);
        setMaxShifts(data.maxShifts || 0);
      } else {
        setScheduleDoc(null);
        setAssignments({});
        setSpecialAssignments({});
        setSelectedInstructors([]);
        setInstructorsPerSlot(1);
        setMaxConsecutiveShifts(2);
        setMaxShifts(0);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [selectedCourse, isFullAdmin, currentUser]);

  // ==========================================
  // ADMIN ONLY LOGIC & VIEW
  // ==========================================

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
        maxConsecutiveShifts: 2,
        maxShifts: 0,
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

  const saveConfiguration = async () => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    const batch = writeBatch(db);

    try {
      batch.set(
        doc(db, "schedules", sanitizedId),
        {
          instructors: selectedInstructors,
          instructorsPerSlot,
          maxConsecutiveShifts,
          maxShifts,
        },
        { merge: true },
      );

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
      alert(labels.msgUpdated);
    } catch (err) {
      console.error(err);
      alert("Error updating config: " + err.message);
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
          maxConsecutiveShifts,
          maxShifts,
          status: "requesting",
        },
        { merge: true },
      );

      const sendMails = httpsCallable(functions, "requestAvailabilities");
      await sendMails({
        courseId: selectedCourse,
        instructors: selectedInstructors,
        baseUrl: window.location.origin, // NEW: Passes localhost or live URL automatically
      });

      alert(labels.msgReq);
    } catch (err) {
      alert(labels.msgErrReq);
    }
    setIsProcessing(false);
  };

  const autoGenerateSchedule = async (onlyUnassigned = true) => {
    setIsProcessing(true);
    const availabilities = scheduleDoc.availabilities || {};
    const perSlot = instructorsPerSlot || 2;
    const maxConsec = maxConsecutiveShifts || 3;
    const maxShiftsLimit = maxShifts || 0;

    const newAssignments = { ...(onlyUnassigned ? assignments : {}) };

    const shiftCount = {};
    const consecutive = {};

    selectedInstructors.forEach((id) => {
      shiftCount[id] = 0;
      consecutive[id] = 0;
    });

    const scoreInstructor = (id) => {
      let score = shiftCount[id];
      if (consecutive[id] >= maxConsec) score += 1000;
      if (maxShiftsLimit > 0 && shiftCount[id] >= maxShiftsLimit) score += 2000;
      return score;
    };

    courseEvents.forEach((ev) => {
      let currentAssigned = newAssignments[ev.id] || [];

      if (onlyUnassigned && currentAssigned.length >= perSlot) {
        selectedInstructors.forEach((id) => {
          if (currentAssigned.includes(id)) {
            consecutive[id]++;
            shiftCount[id]++;
          } else {
            consecutive[id] = 0;
          }
        });
        return;
      }

      const needed = perSlot - currentAssigned.length;

      // STRICTLY ONLY SELECT FROM PEOPLE WHO SUBMITTED AVAILABILITY FOR THIS SLOT
      let available = selectedInstructors.filter(
        (id) =>
          availabilities[id]?.includes(ev.id) && !currentAssigned.includes(id),
      );

      available.sort((a, b) => scoreInstructor(a) - scoreInstructor(b));

      const picked = available.slice(0, needed);
      const finalAssigned = [...currentAssigned, ...picked];
      newAssignments[ev.id] = finalAssigned;

      selectedInstructors.forEach((id) => {
        if (finalAssigned.includes(id)) {
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
      {
        assignments: newAssignments,
        status: "generated",
      },
      { merge: true },
    );

    setAssignments(newAssignments);
    setIsProcessing(false);
  };

  const publishSchedule = async (sendEmail = true) => {
    setIsProcessing(true);
    const sanitizedId = selectedCourse.replace(/\//g, "");
    try {
      const batch = writeBatch(db);

      const oldShiftsQuery = query(
        collection(db, "work_schedule"),
        where("coursePath", "==", selectedCourse),
      );
      const oldShiftsSnap = await getDocs(oldShiftsQuery);
      oldShiftsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      batch.set(
        doc(db, "schedules", sanitizedId),
        {
          instructors: selectedInstructors,
          instructorsPerSlot,
          maxConsecutiveShifts,
          maxShifts,
          assignments,
          specialAssignments,
          status: "published",
        },
        { merge: true },
      );

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
      const existingData = prev[eventId];
      const current = Array.isArray(existingData)
        ? existingData
        : existingData
          ? [existingData]
          : [];
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

  const respondedCount = Object.keys(scheduleDoc?.availabilities || {}).length;

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
            position: "relative",
            width: isMobile ? "100%" : "320px",
            zIndex: 1000,
          }}
          ref={courseDropdownRef}
        >
          <label
            style={{ ...labelStyle, marginBottom: "4px", paddingLeft: "4px" }}
          >
            {labels.course}
          </label>
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              ...inputStyle,
              backgroundColor: "rgba(202, 175, 243, 0.1)",
              cursor: "pointer",
              marginBottom: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "600",
              border: isDropdownOpen
                ? "2px solid #caaff3"
                : "1px solid rgba(28,7,0,0.1)",
            }}
          >
            <span>
              {selectedCourseData?.text[currentLang || "en"] || "Select Course"}
            </span>
            <ChevronDown
              size={18}
              style={{
                transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                color: "#9960a8",
              }}
            />
          </div>

          {isDropdownOpen && (
            <div
              className="custom-scrollbar"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "8px",
                backgroundColor: "#fffce3",
                border: "1px solid rgba(202, 175, 243, 0.4)",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(28, 7, 0, 0.1)",
                zIndex: 50,
                maxHeight: "350px",
                overflowY: "auto",
                padding: "8px",
              }}
            >
              {(() => {
                const renderedLinks = new Set();

                // 1. Get all base courses from the planets data
                const baseCourses = Array.from(
                  new Map(
                    planets
                      .filter((p) => p.type === "courses")
                      .flatMap((p) => p.courses || [])
                      .filter((c) => c.link)
                      .map((c) => [c.link, c]),
                  ).values(),
                ).filter(
                  (base) => isFullAdmin || allowedCourses.includes(base.link),
                );

                // 2. Map over each base course to create groups, matching PricingTab logic
                return baseCourses.map((base) => {
                  const baseId = base.link.replace(/\//g, "");
                  const includedLinks = calendarGroups[baseId] || [base.link];

                  const groupOptions = includedLinks
                    .map((link) => {
                      if (renderedLinks.has(link)) return null;

                      // If it's the base course itself
                      if (link === base.link) {
                        renderedLinks.add(link);
                        return base;
                      }

                      // If it's a custom sub-course
                      const custom = customCourses.find(
                        (cc) => cc.link === link,
                      );
                      if (custom) {
                        renderedLinks.add(link);
                        return {
                          link: custom.link,
                          text: { en: custom.nameEn, de: custom.nameDe },
                        };
                      }
                      return null;
                    })
                    .filter(Boolean);

                  if (groupOptions.length === 0) return null;

                  const groupTitle = base.text[currentLang || "en"];

                  return (
                    <div key={baseId} style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          color: "#4e5f28",
                          padding: "8px 12px 4px 12px",
                          opacity: 0.6,
                        }}
                      >
                        {groupTitle} Group
                      </div>
                      {groupOptions.map((opt) => (
                        <div
                          key={opt.link}
                          onClick={() => {
                            setSelectedCourse(opt.link);
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            backgroundColor:
                              selectedCourse === opt.link
                                ? "rgba(202, 175, 243, 0.2)"
                                : "transparent",
                            color:
                              selectedCourse === opt.link
                                ? "#9960a8"
                                : "#1c0700",
                            fontWeight:
                              selectedCourse === opt.link ? "bold" : "normal",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {selectedCourse === opt.link && (
                            <Check size={14} strokeWidth={3} />
                          )}
                          {opt.text[currentLang || "en"]}
                        </div>
                      ))}
                    </div>
                  );
                });

                return groups;
              })()}
            </div>
          )}
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
          {/* HEADER BAR */}
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

          {/* AUTO-SCHEDULER WIZARD STEPS */}
          {scheduleDoc.mode === "auto" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* STEP 1: RULES & INSTRUCTORS */}
              <div
                style={{
                  ...cardStyle,
                  flexDirection: "column",
                  alignItems: "stretch",
                  padding: "1.5rem",
                  backgroundColor: "#fdf8e1",
                  borderLeft: "6px solid #caaff3",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 1.2rem 0",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#1c0700",
                  }}
                >
                  <Settings size={18} color="#9960a8" /> {labels.step1}
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "1rem",
                  }}
                >
                  {selectedInstructors.length === 0 && (
                    <p style={{ opacity: 0.5, fontSize: "0.85rem", margin: 0 }}>
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

                <div style={{ position: "relative", marginBottom: "1.5rem" }}>
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

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    backgroundColor: "rgba(202, 175, 243, 0.1)",
                    padding: "1rem",
                    borderRadius: "12px",
                    border: "1px solid rgba(202, 175, 243, 0.3)",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "140px" }}>
                    <label
                      style={{
                        ...labelStyle,
                        fontSize: "0.75rem",
                        color: "#9960a8",
                      }}
                    >
                      {labels.instPerSlot}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={instructorsPerSlot}
                      onChange={(e) =>
                        setInstructorsPerSlot(parseInt(e.target.value) || 1)
                      }
                      style={{
                        ...inputStyle,
                        marginBottom: 0,
                        backgroundColor: "#fffce3",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "140px" }}>
                    <label
                      style={{
                        ...labelStyle,
                        fontSize: "0.75rem",
                        color: "#9960a8",
                      }}
                    >
                      {labels.maxConsecutive}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={maxConsecutiveShifts}
                      onChange={(e) =>
                        setMaxConsecutiveShifts(parseInt(e.target.value) || 1)
                      }
                      style={{
                        ...inputStyle,
                        marginBottom: 0,
                        backgroundColor: "#fffce3",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "140px" }}>
                    <label
                      style={{
                        ...labelStyle,
                        fontSize: "0.75rem",
                        color: "#9960a8",
                      }}
                    >
                      {labels.maxShiftsLabel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maxShifts}
                      onChange={(e) =>
                        setMaxShifts(parseInt(e.target.value) || 0)
                      }
                      style={{
                        ...inputStyle,
                        marginBottom: 0,
                        backgroundColor: "#fffce3",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={saveConfiguration}
                  style={{ ...btnStyle, fontSize: "0.85rem", padding: "10px" }}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="spinner" />
                  ) : (
                    labels.saveList
                  )}
                </button>
              </div>

              {/* STEP 2: AVAILABILITIES TRACKER */}
              <div
                style={{
                  ...cardStyle,
                  flexDirection: "column",
                  alignItems: "stretch",
                  padding: "1.5rem",
                  backgroundColor: "#fdf8e1",
                  borderLeft: "6px solid #caaff3",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#1c0700",
                  }}
                >
                  <Mail size={18} color="#9960a8" /> {labels.step2}
                </h4>
                <p
                  style={{
                    margin: "0 0 1.2rem 0",
                    fontSize: "0.85rem",
                    opacity: 0.8,
                  }}
                >
                  {respondedCount > 0 ? (
                    <strong>
                      {respondedCount} / {selectedInstructors.length}
                    </strong>
                  ) : (
                    ""
                  )}{" "}
                  {respondedCount > 0
                    ? labels.availStatus1
                    : labels.availStatus0}
                </p>

                {/* Visual Tracker of who responded */}
                {selectedInstructors.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    {selectedInstructors.map((id) => {
                      const hasResponded =
                        scheduleDoc.availabilities?.hasOwnProperty(id);
                      return (
                        <div
                          key={id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            backgroundColor: "rgba(28,7,0,0.03)",
                            borderRadius: "8px",
                            border: `1px solid ${hasResponded ? "#4e5f28" : "rgba(28,7,0,0.1)"}`,
                          }}
                        >
                          {hasResponded ? (
                            <CheckCircle size={16} color="#4e5f28" />
                          ) : (
                            <Clock size={16} opacity={0.3} />
                          )}
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                color: "#1c0700",
                              }}
                            >
                              {getUserName(id)}
                            </span>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: hasResponded
                                  ? "#4e5f28"
                                  : "rgba(28,7,0,0.5)",
                              }}
                            >
                              {hasResponded
                                ? labels.submitted
                                : labels.waitingOn}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {scheduleDoc.status !== "setup" &&
                  scheduleDoc.status !== "draft" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#4e5f28",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        marginBottom: "1rem",
                      }}
                    >
                      <CheckCircle size={16} /> {labels.reqSent}
                    </div>
                  )}

                <button
                  onClick={sendAvailabilityRequests}
                  style={{
                    ...btnStyle,
                    padding: "10px",
                    fontSize: "0.85rem",
                    maxWidth: "250px",
                  }}
                  disabled={isProcessing || selectedInstructors.length === 0}
                >
                  {scheduleDoc.status !== "setup" &&
                  scheduleDoc.status !== "draft"
                    ? labels.resendReq
                    : labels.reqAvail}
                </button>
              </div>

              {/* STEP 3: GENERATE */}
              <div
                style={{
                  ...cardStyle,
                  flexDirection: "column",
                  alignItems: "stretch",
                  padding: "1.5rem",
                  backgroundColor: "#fdf8e1",
                  borderLeft: "6px solid #caaff3",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#1c0700",
                  }}
                >
                  <Wand2 size={18} color="#9960a8" /> {labels.step3}
                </h4>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <button
                    onClick={() => autoGenerateSchedule(true)}
                    style={{
                      ...primaryBtnStyle(isMobile),
                      flex: 1,
                      margin: 0,
                      padding: "12px",
                      fontSize: "0.9rem",
                    }}
                    disabled={isProcessing || selectedInstructors.length === 0}
                  >
                    {isProcessing ? (
                      <Loader2 className="spinner" size={16} />
                    ) : (
                      labels.fillUnassigned
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Overwrite all assignments and start from scratch?",
                        )
                      ) {
                        autoGenerateSchedule(false);
                      }
                    }}
                    style={{
                      ...btnStyle,
                      flex: 1,
                      margin: 0,
                      padding: "12px",
                      fontSize: "0.9rem",
                      borderColor: "#ff4d4d",
                      color: "#ff4d4d",
                      backgroundColor: "transparent",
                    }}
                    disabled={isProcessing || selectedInstructors.length === 0}
                  >
                    {isProcessing ? (
                      <Loader2 className="spinner" size={16} />
                    ) : (
                      labels.regenAll
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MANUAL MODE INSTRUCTORS SETUP */}
          {scheduleDoc.mode === "manual" && (
            <div
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "stretch",
                padding: "1.5rem",
                backgroundColor: "#fdf8e1",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  marginBottom: "1.2rem",
                }}
              >
                {labels.instructors}
              </h4>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "1.5rem",
                }}
              >
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

              <div style={{ position: "relative", marginBottom: "1.5rem" }}>
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

              <button
                onClick={saveConfiguration}
                style={{ ...btnStyle, fontSize: "0.85rem", padding: "10px" }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 size={16} className="spinner" />
                ) : (
                  labels.saveList
                )}
              </button>
            </div>
          )}

          {/* STEP 4: ASSIGNMENTS & PUBLISH */}
          <div
            style={{
              ...cardStyle,
              flexDirection: "column",
              alignItems: "stretch",
              gap: "1.5rem",
              padding: isMobile ? "1rem" : "2rem",
              backgroundColor: "#fdf8e1",
              borderLeft:
                scheduleDoc.mode === "auto" ? "6px solid #caaff3" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h4
                style={{
                  margin: "0",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {scheduleDoc.mode === "auto" && (
                  <ListChecks size={20} color="#9960a8" />
                )}
                {scheduleDoc.mode === "auto"
                  ? labels.assignmentsTitle
                  : "Schichtzuweisungen"}
              </h4>

              {scheduleDoc.mode === "auto" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "0.7rem",
                    backgroundColor: "rgba(28,7,0,0.03)",
                    padding: "6px 12px",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: "bold",
                      color: "#9960a8",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        border: "2px solid #caaff3",
                        borderRadius: "3px",
                      }}
                    />{" "}
                    Available
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      opacity: 0.5,
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        border: "2px dashed rgba(28,7,0,0.3)",
                        borderRadius: "3px",
                      }}
                    />{" "}
                    Unavailable
                  </span>
                </div>
              )}
            </div>

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
                        // In auto mode, show who is actually available based on their submission
                        const isAvailable =
                          scheduleDoc.mode === "auto"
                            ? scheduleDoc.availabilities?.[uid]?.includes(ev.id)
                            : true;

                        return (
                          <button
                            key={uid}
                            onClick={() => updateAssignment(ev.id, uid)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "100px",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              border: isAssigned
                                ? "2px solid #caaff3"
                                : isAvailable
                                  ? "2px solid #caaff3"
                                  : "2px dashed rgba(28,7,0,0.3)",
                              transition: "all 0.2s",
                              backgroundColor: isAssigned
                                ? "#caaff3"
                                : "transparent",
                              color: isAssigned
                                ? "#1c0700"
                                : isAvailable
                                  ? "#1c0700"
                                  : "rgba(28,7,0,0.5)",
                              cursor: "pointer",
                              opacity: !isAssigned && !isAvailable ? 0.7 : 1,
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
