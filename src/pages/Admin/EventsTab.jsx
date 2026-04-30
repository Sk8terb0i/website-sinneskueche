import React, { useState, useEffect, useRef } from "react";
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
  Mail,
  Edit2,
  Clock,
  Loader2,
  PlusCircle,
  MapPin,
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
  const [location, setLocation] = useState("");
  const [festivalName, setFestivalName] = useState("");
  const [eventGroup, setEventGroup] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleDe, setTitleDe] = useState("");
  const [linkType, setLinkType] = useState("course");
  const [isCustomCourseLink, setIsCustomCourseLink] = useState(false);
  const [link, setLink] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [isProcessingId, setIsProcessingId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("courses");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showParticipantsFor, setShowParticipantsFor] = useState(null);
  const [participantCache, setParticipantCache] = useState({});
  const [isFormExpanded, setIsFormExpanded] = useState(!isMobile);

  const [requests, setRequests] = useState([]);
  const [notificationEmails, setNotificationEmails] = useState("");
  const [isSavingEmails, setIsSavingEmails] = useState(false);

  const [expandedParticipants, setExpandedParticipants] = useState({});
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // --- NEW STATES FOR DROPDOWN & ADD-ON DISPLAY ---
  const [calendarGroups, setCalendarGroups] = useState({});
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef(null);

  const [schedulesMap, setSchedulesMap] = useState({});
  const [settingsMap, setSettingsMap] = useState({});

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
      locationLabel: "Location",
      festivalNameLabel: "Festival Name (Optional)",
      groupNameLabel: "Tab Group Name (Optional)",
      titleEn: "Title EN",
      titleDe: "Title DE",
      addBtn: "Add to Calendar",
      updateBtn: "Update Entry",
      courseHeader: "COURSES",
      eventHeader: "EVENTS",
      noCourses: "No courses scheduled.",
      noEvents: "No events scheduled.",
      cancelCourse: "CANCEL COURSE",
      cancelConfirm:
        "Are you sure? This will refund all participants and delete the course.",
      cancelSuccess: "Course successfully cancelled and participants refunded.",
      deleteEvent: "DELETE EVENT",
      deleteConfirm: "Are you sure? This will delete the event.",
      deleteSuccess: "Event successfully deleted.",
      participants: "Participants",
      noParticipants: "No bookings yet.",
      addons: "Add-ons:",
      requestsHeader: "REQUESTS",
      notificationEmailsLabel: "Notification Emails (comma separated)",
      saveEmails: "Save Emails",
      noRequests: "No pending requests.",
      requestedDates: "Requested Dates:",
      markResolved: "Archive / Resolve",
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
      locationLabel: "Ort",
      festivalNameLabel: "Festival Name (Optional)",
      groupNameLabel: "Tab-Gruppenname (Optional)",
      titleEn: "Titel EN",
      titleDe: "Titel DE",
      addBtn: "Hinzufügen",
      updateBtn: "Eintrag aktualisieren",
      courseHeader: "KURSE",
      eventHeader: "EVENTS",
      noCourses: "Keine Kurse geplant.",
      noEvents: "Keine Events geplant.",
      cancelCourse: "KURS ABSAGEN",
      cancelConfirm:
        "Bist du sicher? Alle Teilnehmer erhalten eine Rückerstattung und der Termin wird gelöscht.",
      cancelSuccess: "Kurs erfolgreich abgesagt und Teilnehmer erstattet.",
      deleteEvent: "EVENT LÖSCHEN",
      deleteConfirm: "Bist du sicher? Das Event wird unwiderruflich gelöscht.",
      deleteSuccess: "Event erfolgreich gelöscht.",
      participants: "Teilnehmer",
      noParticipants: "Noch keine Buchungen.",
      addons: "Extras:",
      requestsHeader: "ANFRAGEN",
      notificationEmailsLabel: "Benachrichtigungs-E-Mails (kommagetrennt)",
      saveEmails: "E-Mails speichern",
      noRequests: "Keine ausstehenden Anfragen.",
      requestedDates: "Angefragte Termine:",
      markResolved: "Archivieren / Erledigt",
    },
  }[currentLang || "en"];

  const eventsCollection = collection(db, "events");
  const [availableCourses, setAvailableCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const base = Array.from(
        new Map(
          planets
            .filter((p) => p.type === "courses")
            .flatMap((p) => p.courses || [])
            .filter((c) => c.link)
            .map((course) => [course.link, course]),
        ).values(),
      );
      try {
        const snap = await getDocs(collection(db, "custom_courses"));
        const custom = snap.docs.map((d) => ({
          link: d.data().link,
          text: { en: d.data().nameEn, de: d.data().nameDe },
        }));
        const combined = [...base, ...custom];
        setAvailableCourses(
          combined.filter(
            (c) => isFullAdmin || allowedCourses.includes(c.link),
          ),
        );
      } catch (err) {
        setAvailableCourses(
          base.filter((c) => isFullAdmin || allowedCourses.includes(c.link)),
        );
      }
    };
    fetchCourses();
  }, [userRole, allowedCourses, isFullAdmin]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target)
      ) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchExtraData = async () => {
      const [cgSnap, schedSnap, setSnap] = await Promise.all([
        getDocs(collection(db, "calendar_groups")),
        getDocs(collection(db, "schedules")),
        getDocs(collection(db, "course_settings")),
      ]);
      const cgMap = {};
      cgSnap.docs.forEach((d) => (cgMap[d.id] = d.data().includedLinks || []));
      setCalendarGroups(cgMap);

      const sMap = {};
      schedSnap.docs.forEach((d) => (sMap[d.id] = d.data()));
      setSchedulesMap(sMap);

      const cSetMap = {};
      setSnap.docs.forEach((d) => (cSetMap[d.id] = d.data()));
      setSettingsMap(cSetMap);
    };
    fetchExtraData();
  }, []);

  useEffect(() => {
    if (availableCourses.length > 0) {
      fetchEvents();
      if (!editingId && !isCustomCourseLink && !link) {
        handleCourseSelection(availableCourses[0].link);
      }
    }
    fetchRequests();
    fetchAdminSettings();
  }, [availableCourses, userRole, allowedCourses]);

  useEffect(() => {
    const fetchAddons = async () => {
      if (linkType === "course" && link) {
        const sanitizedId = link.replace(/\//g, "");
        const snap = await getDoc(doc(db, "course_settings", sanitizedId));
        if (snap.exists() && snap.data().specialEvents) {
          setAvailableAddons(snap.data().specialEvents);
        } else {
          setAvailableAddons([]);
        }
      } else {
        setAvailableAddons([]);
      }
    };
    fetchAddons();
  }, [link, linkType]);

  const fetchEvents = async () => {
    const q = query(eventsCollection, orderBy("date", "asc"));
    const querySnapshot = await getDocs(q);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allFetchedEvents = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let bSnap = { size: 0, docs: [] };

        const bQuery = query(
          collection(db, "bookings"),
          where("eventId", "==", docSnap.id),
        );
        bSnap = await getDocs(bQuery);

        return {
          ...data,
          id: docSnap.id,
          bookedCount: bSnap.size,
          bookings: bSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
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
  };

  const fetchRequests = async () => {
    try {
      const reqSnap = await getDocs(collection(db, "requests"));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const validRequests = [];

      await Promise.all(
        reqSnap.docs.map(async (docSnap) => {
          const req = { id: docSnap.id, ...docSnap.data() };

          if (req.selectedDates && req.selectedDates.length > 0) {
            const hasFutureDate = req.selectedDates.some((sd) => {
              const eventDate = new Date(sd.date);
              eventDate.setHours(0, 0, 0, 0);
              return eventDate >= today;
            });

            if (!hasFutureDate) {
              await deleteDoc(doc(db, "requests", req.id));
              return;
            }
          }

          if (
            req.status !== "rejected" &&
            req.status !== "cancelled" &&
            req.status !== "archived"
          ) {
            validRequests.push(req);
          }
        }),
      );

      setRequests(validRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, "admin_settings", "requests"));
      if (docSnap.exists()) {
        setNotificationEmails(docSnap.data().emails || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSaveEmails = async () => {
    setIsSavingEmails(true);
    try {
      await setDoc(
        doc(db, "admin_settings", "requests"),
        { emails: notificationEmails },
        { merge: true },
      );
      alert("Emails successfully saved!");
    } catch (error) {
      alert("Error saving emails: " + error.message);
    } finally {
      setIsSavingEmails(false);
    }
  };

  const handleArchiveRequest = async (requestId) => {
    if (
      !window.confirm(
        currentLang === "de" ? "Anfrage archivieren?" : "Archive this request?",
      )
    )
      return;
    try {
      await setDoc(
        doc(db, "requests", requestId),
        { status: "archived" },
        { merge: true },
      );
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      alert("Error archiving request: " + error.message);
    }
  };

  const handleShowParticipants = async (event) => {
    if (showParticipantsFor === event.id) {
      setShowParticipantsFor(null);
      return;
    }
    if (event.bookedCount === 0) return alert(labels.noParticipants);

    if (!participantCache[event.id]) {
      const sanitizedId = event.link.replace(/\//g, "");
      const settingsSnap = await getDoc(
        doc(db, "course_settings", sanitizedId),
      );
      const specialEvents = settingsSnap.exists()
        ? settingsSnap.data().specialEvents || []
        : [];

      const userDetails = await Promise.all(
        event.bookings.map(async (b) => {
          let baseInfo =
            b.userId === "GUEST_USER"
              ? {
                  firstName: b.guestName || "Guest",
                  lastName: "(Guest)",
                  email: b.guestEmail || "Email not found",
                  isGuest: true,
                }
              : (await getDoc(doc(db, "users", b.userId))).exists()
                ? (await getDoc(doc(db, "users", b.userId))).data()
                : { firstName: "Unknown", lastName: "User", email: "N/A" };

          const addonNames = (b.selectedAddons || []).map((item) => {
            const addonId = typeof item === "object" ? item.id : item;
            const timeSlot = typeof item === "object" ? item.time : null;
            const match = specialEvents.find((se) => se.id === addonId);
            const baseName = match
              ? currentLang === "de"
                ? match.nameDe
                : match.nameEn
              : "Unknown Add-on";
            return timeSlot ? `${baseName} (${timeSlot})` : baseName;
          });

          return {
            ...baseInfo,
            attendeeName: b.attendeeName,
            addons: addonNames,
          };
        }),
      );

      const groupedUsersMap = {};
      userDetails.forEach((u) => {
        const key = u.email;
        if (!groupedUsersMap[key]) {
          groupedUsersMap[key] = {
            ...u,
            ticketCount: 1,
            tickets: [
              { name: u.attendeeName || u.firstName, addons: u.addons },
            ], // Store individual ticket info
          };
        } else {
          groupedUsersMap[key].ticketCount += 1;
          groupedUsersMap[key].tickets.push({
            name: u.attendeeName || u.firstName,
            addons: u.addons,
          });
        }
      });

      setParticipantCache((prev) => ({
        ...prev,
        [event.id]: Object.values(groupedUsersMap),
      }));
    }
    setShowParticipantsFor(event.id);
  };

  const handleCourseSelection = (courseLink) => {
    const sel = availableCourses.find((c) => c.link === courseLink);
    setLink(courseLink);
    if (sel) {
      setTitleEn(sel.text.en);
      setTitleDe(sel.text.de);
      setTime(
        sel.text.en.toLowerCase().includes("pottery tuesdays")
          ? "19:00 - 21:00"
          : "",
      );
    }
  };

  const autoFillFirstCourse = () => {
    if (availableCourses.length > 0 && !editingId && !isCustomCourseLink)
      handleCourseSelection(availableCourses[0].link);
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

      if (linkType === "event") {
        if (location) eventData.location = location;
        if (eventGroup) eventData.eventGroup = eventGroup;
        if (festivalName) eventData.festivalName = festivalName;
      }

      let savedEventId = editingId;
      if (editingId) {
        await setDoc(doc(db, "events", editingId), eventData);
      } else {
        const newDocRef = await addDoc(eventsCollection, eventData);
        savedEventId = newDocRef.id;
      }

      // Automatically assign the selected addons to the schedule document
      if (linkType === "course" && finalLink) {
        const sanitizedId = finalLink.replace(/\//g, "");
        await setDoc(
          doc(db, "schedules", sanitizedId),
          { specialAssignments: { [savedEventId]: selectedAddons } },
          { merge: true },
        );
      }

      resetForm();
      fetchEvents();
      if (isMobile) setIsFormExpanded(false);
    } catch (e) {
      alert("Error saving: " + e.message);
    }
  };

  const startEdit = async (event) => {
    setEditingId(event.id);
    setDate(event.date);
    setTime(event.time || "");
    setLocation(event.location || "");
    setFestivalName(event.festivalName || "");
    setEventGroup(event.eventGroup || "");
    setTitleEn(event.title.en);
    setTitleDe(event.title.de);
    setIsFormExpanded(true);

    const type =
      event.type || (event.link?.startsWith("http") ? "event" : "course");
    setLinkType(type);
    if (type === "course") {
      if (availableCourses.some((c) => c.link === event.link)) {
        setLink(event.link);
        setIsCustomCourseLink(false);

        // Load existing addon assignments for this event
        const sanitizedId = event.link.replace(/\//g, "");
        const scheduleSnap = await getDoc(doc(db, "schedules", sanitizedId));
        if (scheduleSnap.exists()) {
          const spAss = scheduleSnap.data().specialAssignments || {};
          const existing = spAss[event.id] || [];
          setSelectedAddons(Array.isArray(existing) ? existing : [existing]);
        } else {
          setSelectedAddons([]);
        }
      } else {
        setExternalLink(event.link);
        setIsCustomCourseLink(true);
        setSelectedAddons([]);
      }
    } else {
      setExternalLink(event.link || "");
      setSelectedAddons([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setTime("");
    setLocation("");
    setFestivalName("");
    setEventGroup("");
    setExternalLink("");
    setTitleEn("");
    setTitleDe("");
    setSelectedAddons([]);
    setIsCustomCourseLink(false);
    if (linkType === "course") autoFillFirstCourse();
  };

  const handleAction = async (e, ev, isEvent) => {
    e.stopPropagation();

    if (isEvent) {
      if (!window.confirm(labels.deleteConfirm)) return;
      setIsProcessingId(ev.id);
      try {
        await deleteDoc(doc(db, "events", ev.id));
        await fetchEvents();
        alert(labels.deleteSuccess);
      } catch (err) {
        alert("Error deleting event: " + err.message);
      } finally {
        setIsProcessingId(null);
      }
    } else {
      if (!window.confirm(labels.cancelConfirm)) return;
      setIsProcessingId(ev.id);
      const adminCancelFn = httpsCallable(getFunctions(), "adminCancelEvent");
      try {
        await adminCancelFn({
          eventId: ev.id,
          currentLang: currentLang || "en",
        });
        await fetchEvents();
        alert(labels.cancelSuccess);
      } catch (err) {
        alert("Error cancelling course: " + err.message);
      } finally {
        setIsProcessingId(null);
      }
    }
  };

  const scheduledCourses = events.filter((ev) => ev.type === "course");
  const scheduledEvents = events.filter((ev) => ev.type === "event");

  const groupedCourses = scheduledCourses.reduce((acc, course) => {
    const key = course.link;
    if (!acc[key])
      acc[key] = {
        isGroup: true,
        title: course.title[currentLang || "en"],
        link: course.link,
        dates: [],
      };
    acc[key].dates.push(course);
    return acc;
  }, {});

  const groupedEvents = [];
  const eventGroupsMap = {};

  scheduledEvents.forEach((ev) => {
    if (ev.eventGroup && ev.eventGroup.trim() !== "") {
      const groupName = ev.eventGroup.trim();
      if (!eventGroupsMap[groupName]) {
        eventGroupsMap[groupName] = {
          isGroup: true,
          title: groupName,
          id: groupName,
          dates: [],
        };
        groupedEvents.push(eventGroupsMap[groupName]);
      }
      eventGroupsMap[groupName].dates.push(ev);
    } else {
      groupedEvents.push({
        isGroup: false,
        id: ev.id,
        title: ev.title[currentLang || "en"],
        dates: [ev],
      });
    }
  });

  const groupedRequests = requests.reduce((acc, req) => {
    const key = req.coursePath || "unknown";
    if (!acc[key]) {
      const courseDef = availableCourses.find(
        (c) =>
          c.link === key ||
          c.link === `/${key}` ||
          c.link.replace(/\//g, "") === key,
      );
      acc[key] = {
        isGroup: true,
        title: courseDef ? courseDef.text[currentLang || "en"] : key,
        link: key,
        items: [],
      };
    }
    acc[key].items.push(req);
    return acc;
  }, {});

  const renderEventCard = (ev, isEvent) => (
    <div key={ev.id} style={styles.eventItemWrapper}>
      <div
        style={{
          ...cardStyle,
          padding: isMobile ? "1rem" : "1rem 1.2rem",
          backgroundColor: "#fdf8e1",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "16px" : "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flex: 1,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            {!isMobile && (
              <button
                onClick={() => startEdit(ev)}
                style={{ ...styles.editBtnIcon, marginTop: "2px" }}
              >
                <Edit2 size={16} />
              </button>
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontWeight: "800",
                    color: "#1c0700",
                    fontSize: isMobile ? "1.05rem" : "1.1rem",
                    lineHeight: "1.2",
                  }}
                >
                  {typeof ev.title === "object"
                    ? ev.title[currentLang || "en"]
                    : ev.title}
                </span>

                {ev.festivalName && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "800",
                      color: "#9960a8",
                      backgroundColor: "rgba(202, 175, 243, 0.15)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.02rem",
                    }}
                  >
                    {ev.festivalName}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    ...styles.dateLabel,
                    fontSize: "0.85rem",
                  }}
                >
                  {formatDisplayDate(ev.date)}
                </span>

                {ev.time && (
                  <span style={{ ...styles.timeLabel, fontSize: "0.85rem" }}>
                    <Clock size={14} /> {ev.time}
                  </span>
                )}

                {isEvent && ev.location && (
                  <span style={{ ...styles.timeLabel, fontSize: "0.85rem" }}>
                    <MapPin size={14} /> {ev.location}
                  </span>
                )}

                {/* DISPLAY ADD-ONS IF SCHEDULED */}
                {!isEvent &&
                  (() => {
                    const sanitizedId = ev.link.replace(/\//g, "");
                    const spAss =
                      schedulesMap[sanitizedId]?.specialAssignments?.[ev.id];
                    if (!spAss) return null;

                    const addonIds = Array.isArray(spAss) ? spAss : [spAss];
                    if (addonIds.length === 0) return null;

                    const specialEvents =
                      settingsMap[sanitizedId]?.specialEvents || [];

                    return (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {addonIds.map((aid) => {
                          const addonDef = specialEvents.find(
                            (se) => se.id === aid,
                          );
                          const name = addonDef
                            ? currentLang === "de"
                              ? addonDef.nameDe
                              : addonDef.nameEn
                            : aid;
                          return (
                            <span
                              key={aid}
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "800",
                                color: "#4e5f28",
                                backgroundColor: "rgba(78, 95, 40, 0.15)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Star size={10} fill="#4e5f28" /> {name}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>
            </div>
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
                alignItems: "center",
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
            borderTop: isMobile ? "1px solid rgba(28, 7, 0, 0.08)" : "none",
            paddingTop: isMobile ? "12px" : "0",
            marginTop: isMobile ? "4px" : "0",
          }}
        >
          {!isEvent ? (
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
          ) : (
            <div />
          )}

          <button
            onClick={(e) => handleAction(e, ev, isEvent)}
            style={styles.cancelBtn}
            disabled={isProcessingId === ev.id}
          >
            {isProcessingId === ev.id ? (
              <Loader2 size={14} className="spinner" />
            ) : isEvent ? (
              labels.deleteEvent
            ) : (
              labels.cancelCourse
            )}
          </button>
        </div>
      </div>

      {!isEvent && showParticipantsFor === ev.id && participantCache[ev.id] && (
        <div style={styles.participantPanel}>
          {participantCache[ev.id].map((group, i) => {
            const hasMultiple = group.ticketCount > 1;

            return (
              <div
                key={i}
                style={{
                  ...styles.userRowGroup,
                  backgroundColor: hasMultiple
                    ? "rgba(153, 96, 168, 0.03)"
                    : "transparent",
                  borderRadius: "12px",
                  padding: hasMultiple ? "8px" : "4px 0",
                  marginBottom: "4px",
                  border: hasMultiple
                    ? "1px solid rgba(153, 96, 168, 0.1)"
                    : "none",
                  borderBottom: !hasMultiple
                    ? "1px solid rgba(28,7,0,0.05)"
                    : "none",
                }}
              >
                {/* Contact Info Header (Only show once per group) */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.7rem",
                    opacity: 0.6,
                    padding: "0 8px 4px 8px",
                    borderBottom: "1px solid rgba(28,7,0,0.05)",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: "800", color: "#9960a8" }}>
                    {group.isGuest ? "GUEST BOOKING" : "USER BOOKING"}
                  </span>
                  <span>{group.email}</span>
                </div>

                {/* Individual Tickets */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {group.tickets.map((t, ti) => (
                    <div
                      key={ti}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {/* Visual indicator for grouped bookings */}
                        {hasMultiple && (
                          <div
                            style={{
                              width: "2px",
                              height: "20px",
                              backgroundColor: "#caaff3",
                              borderRadius: "2px",
                            }}
                          />
                        )}
                        <User size={14} opacity={0.5} />
                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "0.9rem",
                            color: "#1c0700",
                          }}
                        >
                          {t.name}
                        </span>
                      </div>

                      {t.addons?.length > 0 && (
                        <div style={styles.addonList}>
                          {t.addons.map((an, ai) => (
                            <span key={ai} style={styles.addonBadge}>
                              <Star size={10} fill="#caaff3" color="#caaff3" />{" "}
                              {an}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const itemsToRender =
    activeSubTab === "courses" ? Object.values(groupedCourses) : groupedEvents;

  return (
    <div
      style={{
        display: isMobile ? "block" : "flex",
        gap: "2rem",
        marginBottom: "5rem",
      }}
    >
      <section style={{ width: isMobile ? "100%" : "400px" }}>
        {isMobile && (
          <button
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            style={{
              width: "100%",
              backgroundColor: isFormExpanded ? "#caaff3" : "#fdf8e1",
              border: "1px solid rgba(28, 7, 0, 0.05)",
              borderRadius: isFormExpanded ? "24px 24px 0 0" : "24px",
              padding: "1.2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: isFormExpanded ? 0 : "1rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                lineHeight: 1,
              }}
            >
              <PlusCircle
                size={20}
                color={isFormExpanded ? "#1c0700" : "#9960a8"}
              />
              <h3
                style={{
                  ...sectionTitleStyle,
                  marginBottom: 0,
                  marginTop: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {editingId ? labels.editEntry : labels.newEntry}
              </h3>
            </div>
            {isFormExpanded ? (
              <ChevronDown size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
        )}

        {(!isMobile || isFormExpanded) && (
          <div
            style={{
              ...formCardStyle,
              borderRadius: isMobile ? "0 0 24px 24px" : "24px",
              borderTop: isMobile ? "none" : "1px solid rgba(28, 7, 0, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
              }}
            >
              {!isMobile && (
                <h3 style={sectionTitleStyle}>
                  {editingId ? labels.editEntry : labels.newEntry}
                </h3>
              )}
              {editingId && (
                <button onClick={resetForm} style={cancelBtnStyle}>
                  <XCircle size={14} /> {labels.cancel}
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <label style={{ ...labelStyle, opacity: 0.5 }}>
                    {labels.timeLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="19:00"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {linkType === "event" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <label style={{ ...labelStyle, opacity: 0.5 }}>
                      {labels.locationLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        currentLang === "de"
                          ? "Zürich, Schweiz"
                          : "Zurich, Switzerland"
                      }
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <label style={{ ...labelStyle, opacity: 0.5 }}>
                      {labels.groupNameLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        currentLang === "de"
                          ? "z.B. Sommer-Workshops"
                          : "e.g. Summer Workshops"
                      }
                      value={eventGroup}
                      onChange={(e) => setEventGroup(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <label style={{ ...labelStyle, opacity: 0.5 }}>
                      {labels.festivalNameLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        currentLang === "de"
                          ? "z.B. Zürich Openair"
                          : "e.g. Zurich Openair"
                      }
                      value={festivalName}
                      onChange={(e) => setFestivalName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {linkType === "course" && !isCustomCourseLink ? (
                <div style={{ position: "relative" }} ref={courseDropdownRef}>
                  <div
                    onClick={() =>
                      setIsCourseDropdownOpen(!isCourseDropdownOpen)
                    }
                    style={{
                      ...inputStyle,
                      backgroundColor: "#fffce3",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      userSelect: "none",
                    }}
                  >
                    <span>
                      {availableCourses.find((c) => c.link === link)?.text[
                        currentLang || "en"
                      ] || "Select Course"}
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isCourseDropdownOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        color: "#1c0700",
                        opacity: 0.5,
                      }}
                    />
                  </div>

                  {isCourseDropdownOpen && (
                    <div
                      className="custom-scrollbar"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "#fdf8e1",
                        border: "1px solid rgba(28,7,0,0.1)",
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
                        const groups = Array.from(
                          new Map(
                            planets
                              .filter((p) => p.type === "courses")
                              .flatMap((p) => p.courses || [])
                              .filter((c) => c.link)
                              .map((c) => [c.link, c]),
                          ).values(),
                        )
                          .filter(
                            (base) =>
                              isFullAdmin || allowedCourses.includes(base.link),
                          )
                          .map((base) => {
                            const baseId = base.link.replace(/\//g, "");
                            const includedLinks = calendarGroups[baseId] || [
                              base.link,
                            ];
                            const groupOptions = includedLinks
                              .map((l) =>
                                availableCourses.find((ac) => ac.link === l),
                              )
                              .filter(Boolean);

                            if (groupOptions.length === 0) return null;
                            includedLinks.forEach((l) => renderedLinks.add(l));

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
                                  {base.text[currentLang || "en"]} Group
                                </div>
                                {groupOptions.map((opt) => {
                                  const isSelected = link === opt.link;
                                  return (
                                    <div
                                      key={opt.link}
                                      onClick={() => {
                                        handleCourseSelection(opt.link);
                                        setIsCourseDropdownOpen(false);
                                      }}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        backgroundColor: isSelected
                                          ? "rgba(202, 175, 243, 0.2)"
                                          : "transparent",
                                        color: isSelected
                                          ? "#9960a8"
                                          : "#1c0700",
                                        fontWeight: isSelected
                                          ? "bold"
                                          : "normal",
                                        transition: "background-color 0.2s",
                                        fontSize: "0.9rem",
                                        display: "flex",
                                        flexDirection: "column",
                                      }}
                                    >
                                      <span>
                                        {opt.text[currentLang || "en"]}
                                      </span>
                                      {opt.link !== base.link && (
                                        <span
                                          style={{
                                            fontSize: "0.65rem",
                                            opacity: 0.5,
                                            fontFamily: "monospace",
                                          }}
                                        >
                                          {opt.link}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          });

                        const ungrouped = availableCourses.filter(
                          (ac) => !renderedLinks.has(ac.link),
                        );
                        if (ungrouped.length > 0) {
                          groups.push(
                            <div
                              key="ungrouped"
                              style={{ marginBottom: "8px" }}
                            >
                              <div
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: "900",
                                  textTransform: "uppercase",
                                  color: "#ff4d4d",
                                  padding: "8px 12px 4px 12px",
                                  opacity: 0.8,
                                }}
                              >
                                Unassigned Sub-Courses
                              </div>
                              {ungrouped.map((opt) => {
                                const isSelected = link === opt.link;
                                return (
                                  <div
                                    key={opt.link}
                                    onClick={() => {
                                      handleCourseSelection(opt.link);
                                      setIsCourseDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: "10px 12px",
                                      borderRadius: "8px",
                                      cursor: "pointer",
                                      backgroundColor: isSelected
                                        ? "rgba(202, 175, 243, 0.2)"
                                        : "transparent",
                                      color: isSelected ? "#9960a8" : "#1c0700",
                                      fontWeight: isSelected
                                        ? "bold"
                                        : "normal",
                                      transition: "background-color 0.2s",
                                      fontSize: "0.9rem",
                                      display: "flex",
                                      flexDirection: "column",
                                    }}
                                  >
                                    <span>{opt.text[currentLang || "en"]}</span>
                                    <span
                                      style={{
                                        fontSize: "0.65rem",
                                        opacity: 0.5,
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {opt.link}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>,
                          );
                        }

                        return groups;
                      })()}
                    </div>
                  )}
                </div>
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

              {/* Add-on Checkboxes directly inside the form */}
              {linkType === "course" && availableAddons.length > 0 && (
                <div
                  style={{
                    backgroundColor: "rgba(202, 175, 243, 0.05)",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(202, 175, 243, 0.2)",
                  }}
                >
                  <label
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    <Star size={14} color="#9960a8" /> {labels.addons}
                  </label>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {availableAddons.map((addon) => {
                      const isSelected = selectedAddons.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddons((prev) =>
                              prev.includes(addon.id)
                                ? prev.filter((id) => id !== addon.id)
                                : [...prev, addon.id],
                            );
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "100px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            border: "1px solid",
                            backgroundColor: isSelected
                              ? "#4e5f28"
                              : "transparent",
                            borderColor: isSelected
                              ? "#4e5f28"
                              : "rgba(28,7,0,0.2)",
                            color: isSelected ? "white" : "#1c0700",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {currentLang === "de" ? addon.nameDe : addon.nameEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="submit" style={btnStyle}>
                {editingId ? labels.updateBtn : labels.addBtn}
              </button>
            </form>
          </div>
        )}
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
          <button
            onClick={() => setActiveSubTab("requests")}
            style={styles.subTabBtn(activeSubTab === "requests")}
          >
            <Mail size={16} /> {labels.requestsHeader} ({requests.length})
          </button>
        </div>

        <div style={styles.tabContent}>
          {activeSubTab === "requests" ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            >
              <div
                style={{
                  ...cardStyle,
                  padding: "1.5rem",
                  backgroundColor: "#fdf8e1",
                  flexDirection: "column",
                  alignItems: "stretch",
                }}
              >
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Mail size={16} color="#9960a8" />{" "}
                  {labels.notificationEmailsLabel}
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: "10px",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="hello@atelier.com, booking@atelier.com"
                    value={notificationEmails}
                    onChange={(e) => setNotificationEmails(e.target.value)}
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  />
                  <button
                    onClick={handleSaveEmails}
                    disabled={isSavingEmails}
                    style={{
                      ...btnStyle,
                      marginTop: 0,
                      padding: "0 20px",
                      width: isMobile ? "100%" : "auto",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isSavingEmails ? (
                      <Loader2 size={16} className="spinner" />
                    ) : (
                      labels.saveEmails
                    )}
                  </button>
                </div>
              </div>

              {Object.keys(groupedRequests).length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>
                  {labels.noRequests}
                </p>
              ) : (
                Object.values(groupedRequests).map((group) => {
                  const groupKey = `req_${group.link}`;
                  const isExpanded = expandedGroups[groupKey];

                  return (
                    <div key={groupKey} style={styles.courseGroupWrapper}>
                      <div
                        onClick={() =>
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [groupKey]: !prev[groupKey],
                          }))
                        }
                        style={styles.groupHeader}
                      >
                        <div style={styles.groupTitleText}>
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          {group.title} ({group.items.length})
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            ...styles.expandedContent,
                            paddingBottom: "10px",
                          }}
                        >
                          {group.items.map((req) => (
                            <div
                              key={req.id}
                              style={{
                                ...cardStyle,
                                padding: "1rem",
                                backgroundColor: "#fdf8e1",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: "10px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  alignItems: "flex-start",
                                }}
                              >
                                <div>
                                  <strong
                                    style={{
                                      display: "block",
                                      fontSize: "1rem",
                                      color: "#1c0700",
                                    }}
                                  >
                                    {req.guestInfo?.firstName}{" "}
                                    {req.guestInfo?.lastName}
                                  </strong>
                                  <a
                                    href={`mailto:${req.guestInfo?.email}`}
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "#9960a8",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {req.guestInfo?.email}
                                  </a>
                                </div>
                                <button
                                  onClick={() => handleArchiveRequest(req.id)}
                                  style={{
                                    ...styles.cancelBtn,
                                    background: "rgba(0,0,0,0.05)",
                                    color: "#1c0700",
                                  }}
                                >
                                  {labels.markResolved}
                                </button>
                              </div>

                              <div
                                style={{
                                  width: "100%",
                                  borderTop: "1px dashed rgba(0,0,0,0.1)",
                                  paddingTop: "10px",
                                  marginTop: "5px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                    opacity: 0.6,
                                  }}
                                >
                                  {labels.requestedDates}
                                </span>
                                <ul
                                  style={{
                                    margin: "5px 0 0 0",
                                    paddingLeft: "20px",
                                    fontSize: "0.85rem",
                                    color: "#1c0700",
                                  }}
                                >
                                  {(req.selectedDates || []).map((sd, i) => (
                                    <li key={i}>
                                      <strong>
                                        {formatDisplayDate(sd.date)}
                                      </strong>
                                      {sd.selectedAddons?.length > 0 &&
                                        ` (+ ${sd.selectedAddons.length} Extras)`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            itemsToRender.map((item) => {
              const isEvent = activeSubTab === "events";

              if (!item.isGroup) {
                return (
                  <div key={item.id} style={{ marginBottom: "0.5rem" }}>
                    {renderEventCard(item.dates[0], isEvent)}
                  </div>
                );
              }

              const groupKey = isEvent ? item.id : item.link;
              const isExpanded = expandedGroups[groupKey];

              return (
                <div key={groupKey} style={styles.courseGroupWrapper}>
                  <div
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [groupKey]: !prev[groupKey],
                      }))
                    }
                    style={styles.groupHeader}
                  >
                    <div style={styles.groupTitleText}>
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      {item.title} ({item.dates.length})
                    </div>
                  </div>
                  {isExpanded && (
                    <div
                      className="custom-scrollbar"
                      style={{
                        ...styles.expandedContent,
                        maxHeight: item.dates.length > 3 ? "400px" : "auto",
                        overflowY: item.dates.length > 3 ? "auto" : "visible",
                      }}
                    >
                      {item.dates.map((ev) => renderEventCard(ev, isEvent))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(28, 7, 0, 0.05); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #caaff3; border-radius: 10px; } .spinner { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
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
  cancelBtn: {
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
    backgroundColor: "rgba(28, 7, 0, 0.02)", // Subtler background
    padding: "12px",
    borderRadius: "16px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px", // Space between groups
  },
  userRowGroup: {
    // Styles are now handled inline above to accommodate dynamic grouping
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
  addonList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-end", // Keeps them neatly tucked to the right
  },
  addonBadge: {
    fontSize: "0.6rem",
    fontWeight: "800",
    color: "#9960a8",
    backgroundColor: "rgba(202, 175, 243, 0.12)",
    padding: "3px 10px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    whiteSpace: "nowrap",
  },
};
