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
import { planets } from "../../data/planets"; // Import your course data

export default function BookingsCard({ userId, currentLang, t }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  // Helper to get course title from planets.js based on the link (e.g., "/pottery")
  const getCourseTitle = (link) => {
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === link);
      if (course) return course.text[currentLang];
    }
    return link?.replace("/", "") || "Course";
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

  // Group bookings by courseTitle
  const groupedBookings = useMemo(() => {
    return bookings.reduce((acc, booking) => {
      if (!acc[booking.courseTitle]) acc[booking.courseTitle] = [];
      acc[booking.courseTitle].push(booking);
      return acc;
    }, {});
  }, [bookings]);

  const handleCancel = async (bookingId) => {
    const functions = getFunctions();
    const cancelBooking = httpsCallable(functions, "cancelBooking");

    try {
      setDataLoading(true);
      await cancelBooking({ bookingId });
      setConfirmingId(null);
      window.location.reload();
    } catch (err) {
      alert(err.message);
      setDataLoading(false);
    }
  };

  const labels = {
    en: {
      cancelBtn: "cancel course",
      policyNote: "cancellations are possible up to 4 days before the start.",
      confirm: "confirm cancellation? (+1 credit)",
    },
    de: {
      cancelBtn: "termin stornieren",
      policyNote: "stornierungen sind bis zu 4 tage vor beginn möglich.",
      confirm: "stornierung bestätigen? (+1 guthaben)",
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
        Object.entries(groupedBookings).map(([title, courseBookings]) => (
          <div key={title} style={styles.courseGroup}>
            <h4 style={styles.courseGroupTitle}>{title}</h4>
            <div style={styles.bookingsList}>
              {courseBookings.map((booking) => {
                const dateObj = new Date(booking.date);
                const daysUntil =
                  (dateObj - new Date()) / (1000 * 60 * 60 * 24);
                const canCancel = daysUntil >= 4;
                const isConfirming = confirmingId === booking.id;

                return (
                  <div key={booking.id} style={styles.bookingItem}>
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
                            <div style={styles.timeRow}>
                              <Clock size={12} /> <span>{booking.time}</span>
                            </div>
                          </div>
                          {canCancel && (
                            <button
                              onClick={() => setConfirmingId(booking.id)}
                              style={styles.cancelActionBtn}
                            >
                              {labels.cancelBtn}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={styles.confirmView}>
                          <span style={styles.confirmText}>
                            {labels.confirm}
                          </span>
                          <div style={styles.confirmActions}>
                            <button
                              onClick={() => handleCancel(booking.id)}
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
    padding: "2.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    boxShadow: "0 10px 30px rgba(28, 7, 0, 0.02)",
    flex: 2,
    minWidth: "320px",
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
    alignItems: "center",
    gap: "8px",
    fontSize: "0.75rem",
    fontFamily: "Satoshi",
    color: "#1c0700",
    opacity: 0.5,
    marginBottom: "2rem",
    fontStyle: "italic",
  },
  courseGroup: { marginBottom: "2.5rem" },
  courseGroupTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.4rem",
    color: "#9960a8",
    marginBottom: "1rem",
    textTransform: "lowercase",
    borderBottom: "1px solid rgba(153, 96, 168, 0.2)",
    paddingBottom: "5px",
  },
  bookingsList: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  bookingItem: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
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
    width: "50px",
    height: "50px",
    color: "#1c0700",
    flexShrink: 0,
  },
  bookingMonth: {
    fontSize: "0.6rem",
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: "Satoshi",
  },
  bookingDay: {
    fontSize: "1.2rem",
    fontFamily: "Harmond-SemiBoldCondensed",
    lineHeight: "1",
  },
  bookingDetails: { flex: 1 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingTitle: {
    margin: 0,
    fontFamily: "Satoshi",
    fontWeight: "700",
    fontSize: "1rem",
    color: "#1c0700",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    opacity: 0.6,
    marginTop: "2px",
  },
  cancelActionBtn: {
    background: "rgba(255, 77, 77, 0.1)",
    border: "none",
    color: "#ff4d4d",
    padding: "6px 12px",
    borderRadius: "100px",
    fontSize: "0.7rem",
    fontWeight: "800",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.03rem",
    transition: "all 0.2s",
  },
  confirmView: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmText: {
    fontFamily: "Satoshi",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#1c0700",
  },
  confirmActions: { display: "flex", gap: "8px" },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    textAlign: "center",
  },
  browseBtn: {
    marginTop: "1rem",
    padding: "10px 20px",
    backgroundColor: "#caaff3",
    border: "none",
    borderRadius: "100px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
