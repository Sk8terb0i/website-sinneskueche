import { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Loader2,
  BookOpen,
  Users,
  Clock,
  Star,
  ChevronDown,
  ChevronRight,
  User,
} from "lucide-react";

const courseMapping = {
  "/pottery": "pottery tuesdays",
  "/artistic-vision": "artistic vision",
  "/get-ink": "get ink!",
  "/singing": "vocal coaching",
  "/extended-voice-lab": "extended voice lab",
  "/performing-words": "performing words",
  "/singing-basics": "singing basics weekend",
};

const getCleanCourseKey = (path) =>
  courseMapping[path] || (path ? path.replace(/\//g, "") : "workshop");

const formatPronouns = (pronouns, currentLang) => {
  if (!pronouns) return "";
  const mapping = {
    they: currentLang === "de" ? "Keine" : "They/Them",
    she: currentLang === "de" ? "Sie/Ihr" : "She/Her",
    he: currentLang === "de" ? "Er/Ihm" : "He/Him",
  };
  return pronouns
    .split(", ")
    .map((p) => mapping[p.trim()] || p)
    .join(", ");
};

export default function TeachingCard({
  teachingEvents,
  isScheduleLoading,
  currentLang,
  t,
  isMobile,
}) {
  const [enrichedEvents, setEnrichedEvents] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState({});

  const toggleExpand = (eventId) => {
    setExpandedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  useEffect(() => {
    const enrichData = async () => {
      if (!teachingEvents || teachingEvents.length === 0) return;
      setLoadingMetadata(true);
      try {
        const enriched = await Promise.all(
          teachingEvents.map(async (ev) => {
            const actualEventId = ev.fromEventsTable ? ev.id : ev.eventId;
            const courseLink = ev.link || ev.coursePath || "";
            const sanitizedId = courseLink.replace(/\//g, "");

            let studentCount = 0;
            let participantGroups = [];
            let addonSummary = [];
            const coworkerList = ev.fullCoInstructors || [];

            if (actualEventId) {
              const bSnap = await getDocs(
                query(
                  collection(db, "bookings"),
                  where("eventId", "==", actualEventId),
                ),
              );
              studentCount = bSnap.size;

              const settingsSnap = await getDoc(
                doc(db, "course_settings", sanitizedId),
              );
              const specialEvents = settingsSnap.exists()
                ? settingsSnap.data().specialEvents || []
                : [];

              // Resolve attendee details exactly like EventsTab.jsx
              const userDetails = await Promise.all(
                bSnap.docs.map(async (bDoc) => {
                  const b = bDoc.data();
                  let baseInfo = {
                    firstName: "Unknown",
                    lastName: "User",
                    email: "N/A",
                    pronouns: "",
                  };

                  if (b.userId === "GUEST_USER") {
                    baseInfo = {
                      firstName: b.guestName || "Guest",
                      lastName: "(Guest)",
                      email: b.guestEmail || "N/A",
                      isGuest: true,
                      pronouns: "",
                    };
                  } else {
                    const userSnap = await getDoc(doc(db, "users", b.userId));
                    if (userSnap.exists()) {
                      const fullUserData = userSnap.data();
                      baseInfo = { ...fullUserData };
                      if (
                        b.profileId &&
                        b.profileId !== "main" &&
                        fullUserData.linkedProfiles
                      ) {
                        const sub = fullUserData.linkedProfiles.find(
                          (p) => p.id === b.profileId,
                        );
                        if (sub) baseInfo.pronouns = sub.pronouns || "";
                      }
                    }
                  }

                  const addonNames = (b.selectedAddons || []).map((item) => {
                    const aid = typeof item === "object" ? item.id : item;
                    const time = typeof item === "object" ? item.time : null;
                    const match = specialEvents.find(
                      (se) => String(se.id) === String(aid),
                    );
                    const baseName = match
                      ? currentLang === "de"
                        ? match.nameDe
                        : match.nameEn
                      : aid;
                    return time ? `${baseName} (${time})` : baseName;
                  });

                  return {
                    ...baseInfo,
                    ticketName:
                      b.attendeeName || b.guestName || baseInfo.firstName,
                    addons: addonNames,
                  };
                }),
              );

              const groupedMap = {};
              const summaryMap = {};

              userDetails.forEach((u) => {
                const key = u.email;
                if (!groupedMap[key]) {
                  groupedMap[key] = { ...u, tickets: [] };
                }
                // Push every ticket individually (don't merge names) so addons stay linked to the right ticket row
                groupedMap[key].tickets.push({
                  name: u.ticketName,
                  addons: u.addons,
                  pronouns: u.pronouns,
                });

                u.addons.forEach((aName) => {
                  summaryMap[aName] = (summaryMap[aName] || 0) + 1;
                });
              });

              participantGroups = Object.values(groupedMap);
              addonSummary = Object.entries(summaryMap).map(
                ([name, count]) => ({ name, count }),
              );
            }

            return {
              ...ev,
              studentCount,
              participantGroups,
              fullCoInstructors: coworkerList,
              addonSummary,
            };
          }),
        );
        setEnrichedEvents(enriched);
      } catch (err) {
        console.error("Error enriching teaching data:", err);
      } finally {
        setLoadingMetadata(false);
      }
    };
    enrichData();
  }, [teachingEvents, currentLang]);

  const groupedTeaching = useMemo(() => {
    const grouped = {};
    enrichedEvents.forEach((event) => {
      const title = getCleanCourseKey(event.link || event.coursePath);
      if (!grouped[title]) grouped[title] = [];
      grouped[title].push(event);
    });
    return grouped;
  }, [enrichedEvents]);

  if (isScheduleLoading)
    return (
      <section style={styles.card}>
        <div style={styles.emptyState}>
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      </section>
    );
  if (teachingEvents.length === 0) return null;

  return (
    <section style={styles.card}>
      <h3 style={styles.sectionHeading(isMobile)}>
        <BookOpen size={20} color="#4e5f28" />
        <span>{t.teachingTitle}</span>
      </h3>

      {loadingMetadata && enrichedEvents.length === 0 ? (
        <div style={{ padding: "1rem", textAlign: "center" }}>
          <Loader2 className="spinner" size={20} color="#caaff3" />
        </div>
      ) : (
        Object.entries(groupedTeaching).map(([title, events]) => (
          <div key={title} style={styles.courseGroup}>
            <h4 style={styles.courseGroupTitle(isMobile)}>{title}</h4>
            <div style={styles.bookingsList}>
              {events.map((event) => {
                const dateObj = new Date(event.date);
                const isExpanded = expandedEvents[event.id];

                return (
                  <div key={event.id} style={styles.bookingItem}>
                    <div style={styles.bookingDateBox}>
                      <span style={styles.bookingMonth}>
                        {dateObj.toLocaleString(
                          currentLang === "en" ? "en-US" : "de-DE",
                          { month: "short" },
                        )}
                      </span>
                      <span style={styles.bookingDay}>{dateObj.getDate()}</span>
                    </div>

                    <div style={styles.bookingDetails}>
                      <div style={styles.row}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <p style={styles.bookingTitle(isMobile)}>
                            {dateObj.toLocaleDateString(
                              currentLang === "en" ? "en-US" : "de-DE",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          <button
                            onClick={() => toggleExpand(event.id)}
                            style={styles.expandToggle}
                          >
                            <span style={styles.studentBadge}>
                              {event.studentCount || 0}{" "}
                              {currentLang === "en" ? "booked" : "gebucht"}
                            </span>
                            {isExpanded ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>
                        </div>

                        <div style={styles.infoRow}>
                          <div style={styles.metaItem}>
                            <Clock size={12} />
                            <span>{event.time || "--:--"}</span>
                          </div>
                          <div style={styles.metaItem}>
                            <Users size={12} />
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                                alignItems: "center",
                              }}
                            >
                              {event.fullCoInstructors?.length > 0 ? (
                                <>
                                  <span style={{ opacity: 0.7 }}>
                                    {t.workingWith}
                                  </span>
                                  {event.fullCoInstructors.map((co, ci) => (
                                    <div
                                      key={ci}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: "800",
                                          color: "#9960a8",
                                        }}
                                      >
                                        {co.name}
                                      </span>
                                      {co.pronouns && (
                                        <span style={styles.pronounSmallBadge}>
                                          {formatPronouns(
                                            co.pronouns,
                                            currentLang,
                                          )}
                                        </span>
                                      )}
                                      {ci <
                                      event.fullCoInstructors.length - 1 ? (
                                        <span style={{ opacity: 0.4 }}>,</span>
                                      ) : (
                                        ""
                                      )}
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <span style={{ fontWeight: "600" }}>
                                  {t.workingAlone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* UPFRONT SUMMARY: Always visible */}
                        {event.addonSummary?.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginTop: "12px",
                            }}
                          >
                            {event.addonSummary.map((addon, idx) => (
                              <div
                                key={idx}
                                style={{
                                  ...styles.addonSummaryPill,
                                  backgroundColor: "rgba(153, 96, 168, 0.08)",
                                  border: "1px solid rgba(153, 96, 168, 0.15)",
                                }}
                              >
                                <Star
                                  size={12}
                                  fill="#9960a8"
                                  color="#9960a8"
                                />
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: "900",
                                  }}
                                >
                                  {addon.name}{" "}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* EXPANDABLE PARTICIPANT PANEL */}
                        {isExpanded && event.participantGroups?.length > 0 && (
                          <div style={styles.participantPanel}>
                            {event.participantGroups.map((group, i) => (
                              <div
                                key={i}
                                style={{
                                  ...styles.userRowGroup,
                                  backgroundColor: "rgba(28, 7, 0, 0.02)",
                                  padding: "8px",
                                  borderRadius: "12px",
                                  marginBottom: "4px",
                                  border: "1px solid rgba(28,7,0,0.05)",
                                }}
                              >
                                <div style={styles.participantGroupHeader}>
                                  <span
                                    style={{
                                      fontWeight: "800",
                                      color: "#9960a8",
                                      fontSize: "0.65rem",
                                    }}
                                  >
                                    {group.email}
                                  </span>
                                </div>
                                {group.tickets.map((tk, ti) => (
                                  <div key={ti} style={styles.participantRow}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        flex: 1,
                                      }}
                                    >
                                      <User size={14} opacity={0.5} />
                                      <span
                                        style={{
                                          fontWeight: "700",
                                          color: "#1c0700",
                                          fontSize: "0.9rem",
                                        }}
                                      >
                                        {tk.name}{" "}
                                        {tk.count > 1 && (
                                          <span style={{ color: "#9960a8" }}>
                                            ({tk.count})
                                          </span>
                                        )}
                                      </span>
                                      {tk.pronouns && (
                                        <span style={styles.pronounSmallBadge}>
                                          {formatPronouns(
                                            tk.pronouns,
                                            currentLang,
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    <div style={styles.ticketAddonList}>
                                      {tk.addons.map((an, ai) => (
                                        <span
                                          key={ai}
                                          style={styles.addonBadge}
                                        >
                                          <Star
                                            size={10}
                                            fill="#caaff3"
                                            color="#caaff3"
                                          />{" "}
                                          {an}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    width: "100%",
    boxSizing: "border-box",
  },
  sectionHeading: (isMobile) => ({
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    margin: "0 0 1.5rem 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
  }),
  courseGroup: { marginBottom: "1.5rem" },
  courseGroupTitle: (isMobile) => ({
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.3rem",
    color: "#9960a8",
    marginBottom: "0.8rem",
    borderBottom: "1px solid rgba(153, 96, 168, 0.1)",
    paddingBottom: "4px",
  }),
  bookingsList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  bookingItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1.2rem",
    backgroundColor: "#fffce3",
    borderRadius: "20px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
  },
  bookingDateBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#caaff3",
    borderRadius: "10px",
    width: "45px",
    height: "45px",
    color: "#1c0700",
    flexShrink: 0,
  },
  bookingMonth: {
    fontSize: "0.55rem",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bookingDay: {
    fontSize: "1.1rem",
    fontFamily: "Harmond-SemiBoldCondensed",
    lineHeight: "1",
  },
  bookingDetails: { flex: 1 },
  bookingTitle: (isMobile) => ({
    margin: 0,
    fontFamily: "Satoshi",
    fontWeight: "700",
    fontSize: "1rem",
    color: "#1c0700",
  }),
  expandToggle: {
    background: "none",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    color: "#9960a8",
  },
  infoRow: {
    display: "flex",
    gap: "12px",
    marginTop: "4px",
    flexWrap: "wrap",
    opacity: 0.6,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
  },
  studentBadge: {
    backgroundColor: "rgba(78, 95, 40, 0.1)",
    color: "#4e5f28",
    fontSize: "0.7rem",
    fontWeight: "900",
    padding: "3px 10px",
    borderRadius: "100px",
    textTransform: "uppercase",
  },

  addonSummaryPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(153, 96, 168, 0.08)",
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#9960a8",
    border: "1px solid rgba(153, 96, 168, 0.1)",
  },

  participantPanel: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    borderTop: "1px dashed rgba(28,7,0,0.1)",
    paddingTop: "1rem",
  },
  participantGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.7rem",
    opacity: 0.6,
    padding: "0 8px 4px 8px",
    borderBottom: "1px solid rgba(28,7,0,0.05)",
    marginBottom: "8px",
  },
  participantRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 8px",
  },
  groupIndicator: {
    width: "2px",
    height: "20px",
    backgroundColor: "#caaff3",
    borderRadius: "2px",
  },
  ticketAddonList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-end",
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
  pronounSmallBadge: {
    backgroundColor: "rgba(153, 96, 168, 0.1)",
    color: "#9960a8",
    padding: "1px 6px",
    borderRadius: "4px",
    fontSize: "0.6rem",
    fontWeight: "800",
    marginLeft: "4px",
  },

  row: { display: "flex", flexDirection: "column", gap: "4px" },
  emptyState: { padding: "1rem", textAlign: "center" },
};
