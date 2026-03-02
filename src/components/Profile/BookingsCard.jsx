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
import { Calendar, Loader2, Clock, X, Check, Info } from "lucide-react";
import { planets } from "../../data/planets";

export default function BookingsCard({ userId, currentLang, t }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null); // Use the combined key for this

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
            return {
              id: bookingDoc.id,
              ...bookingData,
              coursePath,
              courseTitle: getCourseTitle(coursePath),
              time: eventData.time || "",
            };
          }),
        );
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

  // Group by Course Title, then by Date & Time
  const groupedBookings = useMemo(() => {
    const grouped = {};
    bookings.forEach((booking) => {
      const title = booking.courseTitle;
      // Use date+time to uniquely identify a session slot
      const dateKey = `${booking.date}_${booking.time}`;

      if (!grouped[title]) grouped[title] = {};
      if (!grouped[title][dateKey]) {
        grouped[title][dateKey] = {
          date: booking.date,
          time: booking.time,
          count: 0,
          ids: [], // Store all IDs for this slot
        };
      }
      grouped[title][dateKey].count += 1;
      grouped[title][dateKey].ids.push(booking.id);
    });
    return grouped;
  }, [bookings]);

  // Handle bulk cancellation
  const handleCancelGroup = async (bookingIds) => {
    const functions = getFunctions();
    const cancelBookings = httpsCallable(functions, "cancelBookings"); // Updated to call bulk function

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

      <div style={styles.policyBox}>
        <Info size={14} />
        <span>{labels.policyNote}</span>
      </div>

      {dataLoading ? (
        <div style={styles.emptyState}>
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      ) : bookings.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ opacity: 0.6 }}>{t.noCourses}</p>
          <button onClick={() => navigate("/")} style={styles.browseBtn}>
            {t.browseCourses}
          </button>
        </div>
      ) : (
        Object.entries(groupedBookings).map(([title, dateGroups]) => (
          <div key={title} style={styles.courseGroup}>
            <h4 style={styles.courseGroupTitle}>{title}</h4>
            <div style={styles.bookingsList}>
              {Object.entries(dateGroups).map(([dateKey, groupData]) => {
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
                      <span style={styles.bookingDay}>{dateObj.getDate()}</span>
                    </div>

                    <div style={styles.bookingDetails}>
                      {!isConfirming ? (
                        <div style={styles.row}>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
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
                              {/* Ticket Badge */}
                              {groupData.count > 1 && (
                                <span
                                  style={{
                                    backgroundColor: "rgba(202, 175, 243, 0.2)",
                                    color: "#9960a8",
                                    fontSize: "0.65rem",
                                    fontWeight: "900",
                                    padding: "2px 6px",
                                    borderRadius: "100px",
                                  }}
                                >
                                  {groupData.count} Tickets
                                </span>
                              )}
                            </div>
                            <div style={styles.timeRow}>
                              <Clock size={12} /> <span>{groupData.time}</span>
                            </div>
                          </div>
                          {canCancel && (
                            <button
                              onClick={() => setConfirmingId(dateKey)}
                              style={styles.cancelActionBtn}
                            >
                              {labels.cancelBtn}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={styles.confirmView}>
                          <span style={styles.confirmText}>
                            {labels.confirm(groupData.count)}
                          </span>
                          <div style={styles.confirmActions}>
                            <button
                              onClick={() => handleCancelGroup(groupData.ids)}
                              style={{ ...styles.iconBtn, color: "#4e5f28" }}
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              style={{ ...styles.iconBtn, color: "#ff4d4d" }}
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
    boxSizing: "border-box",
    flex: 2,
    width: "100%",
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
    marginBottom: "2rem",
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
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    opacity: 0.6,
    marginTop: "4px",
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
  emptyState: { padding: "2rem", textAlign: "center" },
  browseBtn: {
    marginTop: "1rem",
    padding: "10px 20px",
    backgroundColor: "#caaff3",
    borderRadius: "100px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
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
