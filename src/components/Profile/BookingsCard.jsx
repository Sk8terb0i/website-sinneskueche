import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Calendar,
  Loader2,
  Clock,
  X,
  Check,
  Info,
  Star,
  User,
} from "lucide-react";
import { planets } from "../../data/planets";

export default function BookingsCard({ userId, currentLang, t, userData }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [courseSettings, setCourseSettings] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  // Helper to get linked profile name
  const getProfileName = (profileId) => {
    // If there are no linked profiles at all, we don't need to show names
    if (!userData?.linkedProfiles || userData.linkedProfiles.length === 0)
      return null;

    // If it's the main account holder
    if (!profileId || profileId === "main") {
      return userData.firstName || (currentLang === "en" ? "Me" : "Ich");
    }

    // Look up the linked profile
    const linked = userData?.linkedProfiles?.find((p) => p.id === profileId);
    return linked ? linked.firstName : null;
  };

  const getCourseTitle = (link) => {
    if (!link) return "Course";
    const normalizedLink = link.startsWith("/") ? link : `/${link}`;
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === normalizedLink);
      if (course) return course.text[currentLang];
    }
    return link.replace("/", "").replace(/-/g, " ");
  };

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", userId),
        );
        const querySnapshot = await getDocs(q);

        const settingsMap = {};

        const bookingsWithEventData = await Promise.all(
          querySnapshot.docs.map(async (bookingDoc) => {
            const bookingData = bookingDoc.data();
            let eventData = {};

            if (bookingData.eventId) {
              const eventRef = doc(db, "events", bookingData.eventId);
              const eventSnap = await getDoc(eventRef);
              if (eventSnap.exists()) eventData = eventSnap.data();
            }

            const coursePath = eventData.link || bookingData.coursePath;
            const sanitizedId = coursePath.replace(/\//g, "");

            let customName = null;
            if (sanitizedId && !settingsMap[sanitizedId]) {
              const sSnap = await getDoc(
                doc(db, "course_settings", sanitizedId),
              );
              if (sSnap.exists()) {
                const sData = sSnap.data();
                settingsMap[sanitizedId] = sData; // Store whole object
                customName = currentLang === "en" ? sData.nameEn : sData.nameDe;
              }
            } else if (sanitizedId && settingsMap[sanitizedId]) {
              const sData = settingsMap[sanitizedId];
              customName = currentLang === "en" ? sData.nameEn : sData.nameDe;
            }

            return {
              id: bookingDoc.id,
              ...bookingData,
              coursePath,
              courseTitle: customName || getCourseTitle(coursePath),
              time: eventData.time || "",
            };
          }),
        );

        setCourseSettings(settingsMap);
        bookingsWithEventData.sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );
        setBookings(bookingsWithEventData);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setDataLoading(false);
      }
    };
    if (userId) fetchUserBookings();
  }, [userId, currentLang]);

  // Group by Course Title, then by Date & Time & Profile
  const groupedBookings = useMemo(() => {
    const grouped = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    bookings.forEach((booking) => {
      // NEW: Filter out past bookings
      const bookingDate = new Date(booking.date);
      if (bookingDate < today) return;

      const title = booking.courseTitle;
      const profileName = getProfileName(booking.profileId);
      const dateKey = `${booking.date}_${booking.time}`;
      const sanitizedId = booking.coursePath?.replace(/\//g, "");

      if (!grouped[title]) grouped[title] = {};
      if (!grouped[title][dateKey]) {
        grouped[title][dateKey] = {
          date: booking.date,
          time: booking.time,
          attendees: [], // NEW: Store attendees as objects {name, count}
          ids: [],
          addons: [],
        };
      }

      grouped[title][dateKey].ids.push(booking.id);

      if (profileName) {
        // NEW: Group identical names and track their count
        const existing = grouped[title][dateKey].attendees.find(
          (a) => a.name === profileName,
        );
        if (existing) {
          existing.count += 1;
        } else {
          grouped[title][dateKey].attendees.push({
            name: profileName,
            count: 1,
          });
        }
      }

      if (booking.selectedAddons && Array.isArray(booking.selectedAddons)) {
        booking.selectedAddons.forEach((item) => {
          const addonId = typeof item === "object" ? item.id : item;
          const timeSlot = typeof item === "object" ? item.time : null;

          // FIX: Access .specialEvents before calling .find()
          const meta = courseSettings[sanitizedId]?.specialEvents?.find(
            (s) => s.id === addonId,
          );
          if (meta) {
            const baseName = currentLang === "de" ? meta.nameDe : meta.nameEn;
            const fullName = timeSlot ? `${baseName} (${timeSlot})` : baseName;
            if (!grouped[title][dateKey].addons.includes(fullName)) {
              grouped[title][dateKey].addons.push(fullName);
            }
          }
        });
      }
    });
    return grouped;
  }, [bookings, courseSettings, currentLang, userData]);

  const handleCancelGroup = async (bookingIds) => {
    const functions = getFunctions();
    const cancelBookings = httpsCallable(functions, "cancelBookings");

    try {
      setDataLoading(true);
      await cancelBookings({ bookingIds });
      setConfirmingId(null);
      window.location.reload();
    } catch (err) {
      alert(err.message);
      setDataLoading(false);
    }
  };

  const labels = {
    en: {
      cancelBtn: "cancel booking",
      policyNote: "cancellations are possible up to 5 days before the start.",
      confirm: (count) => `confirm cancellation? (+${count} credits)`,
    },
    de: {
      cancelBtn: "termin stornieren",
      policyNote: "stornierungen sind bis zu 5 tage vor beginn möglich.",
      confirm: (count) => `stornierung bestätigen? (+${count} guthaben)`,
    },
  }[currentLang];

  return (
    <section style={styles.card}>
      <h3 style={styles.sectionHeading}>
        <Calendar size={20} color="#4e5f28" />
        {t.myCourses}
      </h3>

      {dataLoading ? (
        <div
          style={{
            ...styles.emptyState,
            border: "none",
            backgroundColor: "transparent",
          }}
        >
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      ) : bookings.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>{t.noCourses}</p>
        </div>
      ) : (
        <>
          <div style={styles.policyBox}>
            <Info size={14} />
            <span>{labels.policyNote}</span>
          </div>

          {Object.entries(groupedBookings).map(([title, dateGroups]) => {
            const dateEntries = Object.entries(dateGroups);
            const needsScroll = dateEntries.length > 4;

            return (
              <div key={title} style={styles.courseGroup}>
                <h4 style={styles.courseGroupTitle}>{title}</h4>
                <div
                  className="custom-scrollbar"
                  style={{
                    ...styles.bookingsList,
                    maxHeight: needsScroll ? "450px" : "none",
                    overflowY: needsScroll ? "auto" : "visible",
                    paddingRight: needsScroll ? "8px" : "0",
                  }}
                >
                  {dateEntries.map(([dateKey, groupData]) => {
                    const dateObj = new Date(groupData.date);
                    const daysUntil =
                      (dateObj - new Date()) / (1000 * 60 * 60 * 24);
                    const canCancel = daysUntil >= 5;
                    const isConfirming = confirmingId === dateKey;

                    return (
                      <div key={dateKey} style={styles.bookingItem}>
                        <div style={styles.bookingDateBox}>
                          <span style={styles.bookingMonth}>
                            {dateObj.toLocaleString(
                              currentLang === "en" ? "en-US" : "de-DE",
                              { month: "short" },
                            )}
                          </span>
                          <span style={styles.bookingDay}>
                            {dateObj.getDate()}
                          </span>
                        </div>

                        <div style={styles.bookingDetails}>
                          {!isConfirming ? (
                            <div style={styles.row}>
                              <div style={{ width: "100%" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <p style={styles.bookingTitle}>
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
                                  {groupData.ids.length > 1 && (
                                    <span style={styles.ticketBadge}>
                                      {groupData.ids.length} Tickets
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    marginBottom: "8px",
                                  }}
                                >
                                  {groupData.attendees.map((att, idx) => (
                                    <span key={idx} style={styles.profileBadge}>
                                      <User size={10} color="#caaff3" />
                                      {att.name}
                                      {att.count > 1 ? ` (${att.count})` : ""}
                                    </span>
                                  ))}
                                </div>

                                <div style={styles.timeRow}>
                                  <Clock size={12} />{" "}
                                  <span>{groupData.time}</span>
                                </div>

                                {groupData.addons.length > 0 && (
                                  <div style={styles.addonsWrapper}>
                                    {groupData.addons.map((name, idx) => (
                                      <span key={idx} style={styles.addonBadge}>
                                        <Star
                                          size={10}
                                          fill="#9960a8"
                                          color="#9960a8"
                                        />{" "}
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {canCancel && (
                                <button
                                  onClick={() => setConfirmingId(dateKey)}
                                  style={{
                                    ...styles.cancelActionBtn,
                                    alignSelf: "flex-start",
                                    marginTop: "10px",
                                  }}
                                >
                                  {labels.cancelBtn}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={styles.confirmView}>
                              <span style={styles.confirmText}>
                                {labels.confirm(groupData.ids.length)}
                              </span>
                              <div style={styles.confirmActions}>
                                <button
                                  onClick={() =>
                                    handleCancelGroup(groupData.ids)
                                  }
                                  style={{
                                    ...styles.iconBtn,
                                    color: "#4e5f28",
                                  }}
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  style={{
                                    ...styles.iconBtn,
                                    color: "#ff4d4d",
                                  }}
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
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
    boxSizing: "border-box",
    width: "100%",
    height: "fit-content",
  },
  sectionHeading: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    margin: "0 0 1rem 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#1c0700",
  },
  policyBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: "0.75rem",
    fontFamily: "Satoshi",
    color: "#1c0700",
    opacity: 0.5,
    marginBottom: "1.5rem",
    fontStyle: "italic",
    lineHeight: "1.3",
  },
  courseGroup: { marginBottom: "2rem" },
  courseGroupTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.3rem",
    color: "#9960a8",
    marginBottom: "1rem",
    textTransform: "lowercase",
    borderBottom: "1px solid rgba(153, 96, 168, 0.1)",
    paddingBottom: "5px",
  },
  bookingsList: { display: "flex", flexDirection: "column", gap: "1rem" },
  bookingItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1rem",
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
  bookingDetails: { flex: 1, overflow: "hidden" },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "flex-start",
  },
  bookingTitle: {
    margin: 0,
    fontFamily: "Satoshi",
    fontWeight: "700",
    fontSize: "0.95rem",
    color: "#1c0700",
    lineHeight: "1.2",
  },
  ticketBadge: {
    backgroundColor: "rgba(202, 175, 243, 0.2)",
    color: "#9960a8",
    fontSize: "0.65rem",
    fontWeight: "900",
    padding: "2px 6px",
    borderRadius: "100px",
  },
  profileBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "rgba(28, 7, 0, 0.03)",
    color: "#1c0700",
    fontSize: "0.65rem",
    fontWeight: "800",
    padding: "2px 8px",
    borderRadius: "100px",
    border: "1px solid rgba(202, 175, 243, 0.3)",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    opacity: 0.6,
    marginTop: "4px",
  },
  addonsWrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "8px",
  },
  addonBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "rgba(78, 95, 40, 0.05)",
    color: "#4e5f28",
    fontSize: "0.7rem",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid rgba(78, 95, 40, 0.1)",
  },
  cancelActionBtn: {
    background: "rgba(255, 77, 77, 0.1)",
    border: "none",
    color: "#ff4d4d",
    padding: "6px 14px",
    borderRadius: "100px",
    fontSize: "0.65rem",
    fontWeight: "800",
    cursor: "pointer",
    textTransform: "uppercase",
  },
  emptyState: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fffce3",
    padding: "1rem",
    borderRadius: "14px",
    border: "1px dashed rgba(28, 7, 0, 0.1)",
    marginTop: "1rem",
    cursor: "default",
  },
  emptyText: {
    margin: 0,
    fontSize: "0.9rem",
    fontStyle: "italic",
    textAlign: "center",
    opacity: 0.6,
  },
  confirmView: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingTop: "5px",
  },
  confirmText: {
    fontSize: "0.8rem",
    color: "#4e5f28",
    fontWeight: "600",
  },
  confirmActions: {
    display: "flex",
    gap: "10px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
