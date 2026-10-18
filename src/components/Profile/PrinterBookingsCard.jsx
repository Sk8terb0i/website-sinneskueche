import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Printer, Trash2, Loader2, Plus, Pencil } from "lucide-react";

// Helper to format YYYY-MM-DD to short day + DD.MM.YYYY
const formatDateStr = (dateStr, lang) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const d = new Date(year, month - 1, day);
  const dayShort = d.toLocaleDateString(lang === "en" ? "en-US" : "de-DE", {
    weekday: "short",
  });
  return `${dayShort} ${day}.${month}.${year}`;
};

// Helper to get an array of dates between two date strings
const getDatesInRange = (start, end) => {
  if (!end) return [start];
  const dates = [];
  let curr = new Date(start);
  const last = new Date(end);
  while (curr <= last) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

export default function PrinterBookingsCard({ userId, currentLang, userData }) {
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [isBooking, setIsBooking] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "printer_bookings"));
      const sortedBookings = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setBookings(sortedBookings);

      const blSnap = await getDocs(collection(db, "printer_blocked"));
      setBlockedDates(blSnap.docs.map((d) => d.data().date).sort());
    } catch (error) {
      console.error("Error fetching printer data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const toggleForm = () => {
    if (isBooking) {
      setEditingId(null);
      setStartDate("");
      setEndDate("");
      setStartTime("09:00");
      setEndTime("17:00");
    }
    setIsBooking(!isBooking);
  };

  const handleEdit = (booking) => {
    setEditingId(booking.id);
    setStartDate(booking.date);
    setEndDate(booking.endDate || booking.date);
    setStartTime(booking.startTime || "09:00");
    setEndTime(booking.endTime || "17:00");
    setIsBooking(true);
  };

  const handleBook = async () => {
    if (!startDate) return;

    const datesToBook = getDatesInRange(startDate, endDate || startDate);
    const hasBlocked = datesToBook.some((d) => blockedDates.includes(d));
    if (hasBlocked) {
      alert(
        currentLang === "de"
          ? "Einige der ausgewählten Daten sind blockiert."
          : "Some of the selected dates are blocked.",
      );
      return;
    }

    try {
      const payload = {
        date: startDate,
        endDate: endDate || startDate,
        startTime: startTime,
        endTime: endTime,
        userId: userId,
        userName: userData?.firstName || "Unknown User",
      };

      if (editingId) {
        await updateDoc(doc(db, "printer_bookings", editingId), payload);
      } else {
        const newBookingRef = doc(collection(db, "printer_bookings"));
        await setDoc(newBookingRef, payload);
      }

      toggleForm(); // Reset and close form
      fetchBookings();
    } catch (error) {
      console.error("Error booking:", error);
    }
  };

  const handleDelete = async (id) => {
    const isDe = currentLang === "de";
    if (
      window.confirm(
        isDe ? "Diese Buchung stornieren?" : "Cancel this booking?",
      )
    ) {
      await deleteDoc(doc(db, "printer_bookings", id));
      fetchBookings();
    }
  };

  const t = {
    en: {
      title: "3D Printer Schedule",
      noBookings: "No upcoming prints.",
      cancel: "Cancel",
      book: "Book Time",
      start: "Start",
      end: "End",
      submit: "Confirm Booking",
    },
    de: {
      title: "3D-Drucker Zeitplan",
      noBookings: "Keine anstehenden Drucke.",
      cancel: "Stornieren",
      book: "Zeit Buchen",
      start: "Start",
      end: "Ende",
      submit: "Buchung Bestätigen",
    },
  }[currentLang] || {
    title: "3D Printer Schedule",
    noBookings: "No upcoming prints.",
    cancel: "Cancel",
    book: "Book Time",
    start: "Start",
    end: "End",
    submit: "Confirm Booking",
  };

  return (
    <div style={styles.card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={styles.header}>
          <Printer size={20} color="#1c0700" />
          <h2 style={styles.title}>{t.title}</h2>
        </div>
        <button
          onClick={toggleForm}
          style={{
            background: "#caaff3",
            border: "none",
            color: "#1c0700",
            fontWeight: "bold",
            padding: "6px 12px",
            borderRadius: "100px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.8rem",
          }}
        >
          {isBooking ? (
            t.cancel
          ) : (
            <>
              <Plus size={14} /> {t.book}
            </>
          )}
        </button>
      </div>

      {isBooking && (
        <div
          style={{
            background: "rgba(255,255,255,0.5)",
            padding: "15px",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {blockedDates.length > 0 && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "#ff4d4d",
                marginBottom: "5px",
                background: "rgba(255, 77, 77, 0.1)",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <strong>
                {currentLang === "de" ? "Blockierte Daten:" : "Blocked Dates:"}
              </strong>{" "}
              {blockedDates
                .map((d) => formatDateStr(d, currentLang))
                .join(", ")}
            </div>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  opacity: 0.7,
                }}
              >
                {t.start} Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  opacity: 0.7,
                }}
              >
                {t.end} Date (Opt)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  opacity: 0.7,
                }}
              >
                {t.start} Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  opacity: 0.7,
                }}
              >
                {t.end} Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>
          <button
            onClick={handleBook}
            disabled={!startDate}
            style={{
              background: "#4e5f28",
              color: "#fff",
              border: "none",
              padding: "10px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: startDate ? "pointer" : "not-allowed",
              opacity: startDate ? 1 : 0.5,
            }}
          >
            {editingId
              ? currentLang === "en"
                ? "Update Booking"
                : "Buchung aktualisieren"
              : t.submit}
          </button>
        </div>
      )}

      {loading ? (
        <Loader2 className="spinner" size={24} color="#caaff3" />
      ) : bookings.length === 0 ? (
        <p style={styles.empty}>{t.noBookings}</p>
      ) : (
        <div style={styles.list}>
          {bookings.map((b) => (
            <div key={b.id} style={styles.item}>
              <div>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>
                  {b.userName}
                </p>
                <p style={styles.date}>
                  {formatDateStr(b.date, currentLang)}{" "}
                  {b.endDate && b.endDate !== b.date
                    ? ` - ${formatDateStr(b.endDate, currentLang)}`
                    : ""}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    opacity: 0.7,
                    color: "#9960a8",
                    fontWeight: "bold",
                  }}
                >
                  {b.startTime} - {b.endTime}
                </p>
              </div>
              {/* Only show edit/delete buttons if it's the user's own booking */}
              {b.userId === userId && (
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={() => handleEdit(b)}
                    style={{ ...styles.actionBtn, color: "#4e5f28" }}
                    title={currentLang === "en" ? "Edit" : "Bearbeiten"}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    style={{ ...styles.actionBtn, color: "#ff4d4d" }}
                    title={t.cancel}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#fdf8e1",
    padding: "1.5rem",
    borderRadius: "24px",
    border: "1px solid rgba(28,7,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    margin: 0,
    fontSize: "1.2rem",
    fontFamily: "Harmond-SemiBoldCondensed",
    color: "#1c0700",
  },
  empty: {
    margin: 0,
    fontSize: "0.9rem",
    opacity: 0.6,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    background: "rgba(202, 175, 243, 0.15)",
    borderRadius: "12px",
  },
  date: {
    margin: 0,
    fontWeight: "bold",
    fontSize: "0.95rem",
  },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "0.2s",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(255, 252, 227, 0.4)",
    color: "#1c0700",
    boxSizing: "border-box",
  },
};
