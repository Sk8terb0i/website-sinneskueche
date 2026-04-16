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

  // New Request State
  const [requests, setRequests] = useState([]);
  const [notificationEmails, setNotificationEmails] = useState("");
  const [isSavingEmails, setIsSavingEmails] = useState(false);

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
    fetchRequests();
    fetchAdminSettings();
  }, [userRole, allowedCourses]);

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

          // Check if all dates in the request are in the past
          if (req.selectedDates && req.selectedDates.length > 0) {
            const hasFutureDate = req.selectedDates.some((sd) => {
              const eventDate = new Date(sd.date);
              eventDate.setHours(0, 0, 0, 0);
              return eventDate >= today;
            });

            if (!hasFutureDate) {
              // If all requested dates have passed, delete the request
              await deleteDoc(doc(db, "requests", req.id));
              return; // Skip adding to the UI array
            }
          }

          // Filter out archived/cancelled requests for the UI
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

          const addonNames = (b.selectedAddons || []).map((id) => {
            const match = specialEvents.find((se) => se.id === id);
            return match
              ? currentLang === "de"
                ? match.nameDe
                : match.nameEn
              : id;
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
        const key = u.email; // Use email as the unique key to group multiple tickets from one person
        if (!groupedUsersMap[key]) {
          // Initialize the group with the first ticket's data
          groupedUsersMap[key] = {
            ...u,
            ticketCount: 1,
            attendeeNames: [u.attendeeName || u.firstName],
          };
        } else {
          // Increment count and add the next attendee's name to the list
          groupedUsersMap[key].ticketCount += 1;
          groupedUsersMap[key].attendeeNames.push(
            u.attendeeName || u.firstName,
          );
          groupedUsersMap[key].addons.push(...u.addons);
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
          ? "18:30 - 21:30"
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

      if (editingId) await setDoc(doc(db, "events", editingId), eventData);
      else await addDoc(eventsCollection, eventData);

      resetForm();
      fetchEvents();
      if (isMobile) setIsFormExpanded(false);
    } catch (e) {
      alert("Error saving: " + e.message);
    }
  };

  const startEdit = (event) => {
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
      } else {
        setExternalLink(event.link);
        setIsCustomCourseLink(true);
      }
    } else setExternalLink(event.link || "");
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

  // Group Courses
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

  // Group Events
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

  // Group Requests
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
          {participantCache[ev.id].map((u, i) => (
            <div key={i} style={styles.userRow}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <User size={14} color="#4e5f28" />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {/* Primary Booker Info */}
                    <strong
                      style={{
                        color: u.isGuest ? "#9960a8" : "inherit",
                        fontSize: "0.85rem",
                      }}
                    >
                      {u.firstName} {u.lastName}{" "}
                      {u.ticketCount > 1 ? `(${u.ticketCount})` : ""}
                    </strong>

                    {/* ONLY show list of attendee names if they booked more than 1 ticket */}
                    {u.ticketCount > 1 && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          opacity: 0.7,
                          fontStyle: "italic",
                          marginTop: "2px",
                          color: "#1c0700",
                        }}
                      >
                        {u.attendeeNames.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {u.addons?.length > 0 && (
                  <div style={styles.addonList}>
                    {u.addons.map((an, ai) => (
                      <span key={ai} style={styles.addonBadge}>
                        <Star size={10} fill="#caaff3" color="#caaff3" /> {an}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span style={styles.contactText}>
                <Mail size={10} /> {u.email}
              </span>
            </div>
          ))}
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
                    placeholder="18:30"
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
                      width: isMobile ? "100%" : "auto", // Fixes the crushing issue
                      whiteSpace: "nowrap", // Keeps the text on one line
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
  addonList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-end",
  },
  addonBadge: {
    fontSize: "0.65rem",
    fontWeight: "800",
    color: "#9960a8",
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    padding: "2px 8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
};
