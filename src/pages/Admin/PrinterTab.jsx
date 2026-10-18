import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { ChevronLeft, ChevronRight, ShieldAlert, Check } from "lucide-react";
import * as S from "../../components/PriceDisplay/PriceDisplayStyles";

// Helper to get an array of dates between two date strings
const getDatesInRange = (start, end) => {
  if (!end) return [start];
  const dates = [];
  let curr = new Date(start);
  const last = new Date(end);
  while (curr <= last) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

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

export default function PrinterTab({ isMobile, currentLang, adminData }) {
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [selection, setSelection] = useState({ start: null, end: null });

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileEnabled, setIsProfileEnabled] = useState(
    !!adminData?.showPrinterInProfile,
  );

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  const monthName = currentViewDate.toLocaleString(
    currentLang === "en" ? "en-US" : "de-DE",
    { month: "long" },
  );

  useEffect(() => {
    fetchPrinterData();
  }, [currentViewDate]);

  const toggleProfileVisibility = async () => {
    if (!auth.currentUser) return;
    const newVal = !isProfileEnabled;
    setIsProfileEnabled(newVal);
    try {
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { showPrinterInProfile: newVal },
        { merge: true },
      );
    } catch (error) {
      console.error("Error toggling profile visibility:", error);
      setIsProfileEnabled(!newVal); // Revert on failure
    }
  };

  const fetchPrinterData = async () => {
    setIsLoading(true);
    try {
      const bSnap = await getDocs(collection(db, "printer_bookings"));
      setBookings(bSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const blSnap = await getDocs(collection(db, "printer_blocked"));
      setBlockedDates(blSnap.docs.map((d) => d.data().date));
    } catch (error) {
      console.error("Error fetching printer data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (dateStr) => {
    // Allow untoggling a single selected day
    if (selection.start === dateStr && !selection.end) {
      setSelection({ start: null, end: null });
      return;
    }

    if (!selection.start || (selection.start && selection.end)) {
      setSelection({ start: dateStr, end: null });
    } else {
      if (new Date(dateStr) >= new Date(selection.start)) {
        setSelection({ ...selection, end: dateStr });
      } else {
        setSelection({ start: dateStr, end: null });
      }
    }
  };

  const blockDates = async () => {
    if (!selection.start) return;
    const dates = getDatesInRange(selection.start, selection.end);
    try {
      await Promise.all(
        dates.map((d) => setDoc(doc(db, "printer_blocked", d), { date: d })),
      );
      setSelection({ start: null, end: null });
      fetchPrinterData();
    } catch (error) {
      console.error("Error blocking dates:", error);
    }
  };

  const unblockDates = async () => {
    if (!selection.start) return;
    const dates = getDatesInRange(selection.start, selection.end);
    try {
      await Promise.all(
        dates.map((d) => deleteDoc(doc(db, "printer_blocked", d))),
      );
      setSelection({ start: null, end: null });
      fetchPrinterData();
    } catch (error) {
      console.error("Error unblocking dates:", error);
    }
  };

  const submitBooking = async () => {
    if (selection.start) {
      try {
        const newBookingRef = doc(collection(db, "printer_bookings"));
        await setDoc(newBookingRef, {
          date: selection.start,
          endDate: selection.end || selection.start,
          startTime: startTime,
          endTime: endTime,
          userId: auth.currentUser.uid,
          userName: adminData.firstName || "Admin",
        });
        setSelection({ start: null, end: null });
        fetchPrinterData();
      } catch (error) {
        console.error("Error booking:", error);
      }
    }
  };

  const selectedDatesList = selection.start
    ? getDatesInRange(selection.start, selection.end)
    : [];
  const hasBlockedInSelection = selectedDatesList.some((d) =>
    blockedDates.includes(d),
  );

  // Pre-calculate all booked dates once to prevent severe lag during re-renders
  const bookedDatesSet = useMemo(() => {
    const dates = new Set();
    bookings.forEach((b) => {
      const range = getDatesInRange(b.date, b.endDate);
      range.forEach((d) => dates.add(d));
    });
    return dates;
  }, [bookings]);

  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <div style={S.calendarCardStyle(isMobile, true)}>
        <div style={S.calendarHeaderStyle(isMobile)}>
          <button
            onClick={() => setCurrentViewDate(new Date(year, month - 1))}
            style={S.navBtnStyle}
          >
            <ChevronLeft size={20} />
          </button>
          <h4 style={S.monthLabelStyle(isMobile)}>
            {monthName} {year}
          </h4>
          <button
            onClick={() => setCurrentViewDate(new Date(year, month + 1))}
            style={S.navBtnStyle}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={S.calendarGridStyle(isMobile)}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} style={S.dayOfWeekStyle(isMobile)}>
              {d}
            </div>
          ))}
          {[...Array((new Date(year, month, 1).getDay() + 6) % 7)].map(
            (_, i) => (
              <div key={`empty-${i}`} />
            ),
          )}

          {[...Array(new Date(year, month + 1, 0).getDate())].map((_, i) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            const isBlocked = blockedDates.includes(dateStr);
            const isBooked = bookedDatesSet.has(dateStr);
            const isSelected = selectedDatesList.includes(dateStr);

            return (
              <div
                key={i}
                onClick={() => handleDateClick(dateStr)}
                style={{
                  ...S.dayStyle(
                    true,
                    isSelected,
                    isMobile,
                    isBlocked && !isSelected,
                  ),
                  backgroundColor: isSelected
                    ? "#caaff3"
                    : isBlocked
                      ? "rgba(255,0,0,0.1)"
                      : "transparent",
                  color: isSelected
                    ? "#fffce3"
                    : isBlocked
                      ? "#ff0000"
                      : "#1c0700",
                  border:
                    isBooked && !isSelected ? "2px solid #caaff3" : "none",
                  cursor: "pointer",
                }}
              >
                {i + 1}
                {isBooked && !isSelected && (
                  <div style={S.dotStyle(false, false, isMobile)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.bookingCardStyle(isMobile, true)}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3
            style={{
              fontFamily: "Harmond-SemiBoldCondensed",
              margin: 0,
              fontSize: "1.5rem",
            }}
          >
            {currentLang === "en" ? "Manage Schedule" : "Zeitplan verwalten"}
          </h3>

          <div
            onClick={toggleProfileVisibility}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(28, 7, 0, 0.04)",
              padding: "8px 12px",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                border: isProfileEnabled
                  ? "none"
                  : "2px solid rgba(28, 7, 0, 0.2)",
                backgroundColor: isProfileEnabled ? "#4e5f28" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "0.2s",
              }}
            >
              {isProfileEnabled && (
                <Check size={14} color="#fff" strokeWidth={4} />
              )}
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: "bold",
                color: "#1c0700",
                opacity: 0.8,
                userSelect: "none",
              }}
            >
              {currentLang === "en" ? "Show in profile" : "Im Profil anzeigen"}
            </span>
          </div>
        </div>

        {selection.start && (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ marginBottom: "1rem" }}>
              <strong>Selected:</strong>{" "}
              {formatDateStr(selection.start, currentLang)}{" "}
              {selection.end
                ? ` to ${formatDateStr(selection.end, currentLang)}`
                : ""}
            </p>

            <div
              style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    opacity: 0.7,
                  }}
                >
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    display: "block",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "rgba(255, 252, 227, 0.4)",
                    color: "#1c0700",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    opacity: 0.7,
                  }}
                >
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{
                    display: "block",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "rgba(255, 252, 227, 0.4)",
                    color: "#1c0700",
                  }}
                />
              </div>
            </div>

            <button onClick={submitBooking} style={S.primaryBtnStyle(isMobile)}>
              Book Timeframe
            </button>

            {hasBlockedInSelection ? (
              <button
                onClick={unblockDates}
                style={{
                  ...S.secondaryBtnStyle(isMobile),
                  marginTop: "10px",
                  borderColor: "#4e5f28",
                  color: "#4e5f28",
                }}
              >
                <ShieldAlert size={14} style={{ marginRight: "5px" }} /> Unblock
                Selected Dates
              </button>
            ) : (
              <button
                onClick={blockDates}
                style={{
                  ...S.secondaryBtnStyle(isMobile),
                  marginTop: "10px",
                  borderColor: "#ff4d4d",
                  color: "#ff4d4d",
                }}
              >
                <ShieldAlert size={14} style={{ marginRight: "5px" }} /> Block
                Selected Dates
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <h4 style={{ fontSize: "1.1rem", opacity: 0.8 }}>Upcoming Prints</h4>
          {isLoading ? (
            <p style={{ opacity: 0.5 }}>Loading...</p>
          ) : bookings.length === 0 ? (
            <p style={{ opacity: 0.5 }}>No upcoming prints.</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: "bold" }}>{b.userName}</p>
                  <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
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
                <button
                  onClick={async () => {
                    await deleteDoc(doc(db, "printer_bookings", b.id));
                    fetchPrinterData();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff4d4d",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
