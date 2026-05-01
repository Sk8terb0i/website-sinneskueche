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
import { Loader2, BookOpen, Users, Clock, Star } from "lucide-react";

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

export default function TeachingCard({
  teachingEvents,
  isScheduleLoading,
  currentLang,
  t,
  isMobile,
}) {
  const [enrichedEvents, setEnrichedEvents] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    const enrichData = async () => {
      if (!teachingEvents || teachingEvents.length === 0) return;
      setLoadingMetadata(true);
      try {
        const enriched = await Promise.all(
          teachingEvents.map(async (ev) => {
            // Check if ID comes from 'events' (doc id) or 'work_schedule' (field eventId)
            const actualEventId = ev.fromEventsTable ? ev.id : ev.eventId;
            const courseLink = ev.link || ev.coursePath || "";
            const sanitizedId = courseLink.replace(/\//g, "");

            let studentCount = 0;
            let addonSummary = [];

            if (actualEventId) {
              // 1. Get participant count
              const bSnap = await getDocs(
                query(
                  collection(db, "bookings"),
                  where("eventId", "==", actualEventId),
                ),
              );
              studentCount = bSnap.size;

              // 2. Aggregate add-ons
              const addonCounts = {};
              bSnap.docs.forEach((d) => {
                const data = d.data();
                if (data.selectedAddons) {
                  data.selectedAddons.forEach((aid) => {
                    addonCounts[aid] = (addonCounts[aid] || 0) + 1;
                  });
                }
              });

              // 3. Map add-on IDs to display names
              if (Object.keys(addonCounts).length > 0) {
                const sSnap = await getDoc(
                  doc(db, "course_settings", sanitizedId),
                );
                if (sSnap.exists()) {
                  const defs = sSnap.data().specialEvents || [];
                  addonSummary = Object.entries(addonCounts).map(
                    ([id, count]) => {
                      const def = defs.find((s) => s.id === id);
                      const name =
                        currentLang === "de" ? def?.nameDe : def?.nameEn;
                      return { name: name || id, count };
                    },
                  );
                }
              }
            }

            return { ...ev, studentCount, addonSummary };
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

  if (isScheduleLoading) {
    return (
      <section style={styles.card}>
        <div style={styles.emptyState}>
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      </section>
    );
  }

  if (teachingEvents.length === 0) return null;

  return (
    <section style={styles.card}>
      <h3 style={styles.sectionHeading(isMobile)}>
        <BookOpen size={20} color="#4e5f28" />
        <span style={{ lineHeight: 1 }}>{t.teachingTitle}</span>
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
                const hasCoInstructors =
                  event.coInstructorNames && event.coInstructorNames.length > 0;

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
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
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
                          <span style={styles.studentBadge}>
                            {event.studentCount || 0}{" "}
                            {currentLang === "en" ? "booked" : "gebucht"}
                          </span>
                        </div>

                        <div style={styles.infoRow}>
                          <div style={styles.metaItem}>
                            <Clock size={12} />{" "}
                            <span>{event.time || "--:--"}</span>
                          </div>
                          <div style={styles.metaItem}>
                            <Users size={12} />
                            <span
                              style={{
                                fontWeight: hasCoInstructors ? "800" : "500",
                                color: hasCoInstructors ? "#9960a8" : "inherit",
                              }}
                            >
                              {hasCoInstructors
                                ? `${t.workingWith} ${event.coInstructorNames.join(", ")}`
                                : t.workingAlone}
                            </span>
                          </div>
                        </div>

                        {event.addonSummary?.length > 0 && (
                          <div style={styles.addonsRow}>
                            <Star size={12} fill="#9960a8" color="#9960a8" />
                            <div style={styles.addonsList}>
                              {event.addonSummary.map((addon, idx) => (
                                <span key={idx} style={styles.addonText}>
                                  {/* Changed format here */}
                                  {addon.name} ({addon.count})
                                  {idx < event.addonSummary.length - 1
                                    ? ", "
                                    : ""}
                                </span>
                              ))}
                            </div>
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
    fontWeight: isMobile ? "normal" : undefined,
  }),
  courseGroup: { marginBottom: "1.5rem" },
  courseGroupTitle: (isMobile) => ({
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.3rem",
    color: "#9960a8",
    marginBottom: "0.8rem",
    borderBottom: "1px solid rgba(153, 96, 168, 0.1)",
    paddingBottom: "4px",
    fontWeight: isMobile ? "normal" : undefined,
  }),
  bookingsList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  bookingItem: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.8rem",
    backgroundColor: "#fffce3",
    borderRadius: "16px",
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
    fontWeight: isMobile ? "500" : "700",
    fontSize: "0.95rem",
    color: "#1c0700",
  }),
  infoRow: { display: "flex", gap: "12px", marginTop: "2px", flexWrap: "wrap" },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    opacity: 0.6,
  },
  studentBadge: {
    backgroundColor: "rgba(78, 95, 40, 0.1)",
    color: "#4e5f28",
    fontSize: "0.65rem",
    fontWeight: "900",
    padding: "2px 8px",
    borderRadius: "100px",
    textTransform: "uppercase",
  },
  addonsRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "6px",
    padding: "6px 10px",
    backgroundColor: "rgba(153, 96, 168, 0.05)",
    borderRadius: "8px",
    width: "fit-content",
    border: "1px solid rgba(153, 96, 168, 0.1)",
  },
  addonsList: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  addonText: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#9960a8",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  emptyState: { padding: "1rem", textAlign: "center" },
};
