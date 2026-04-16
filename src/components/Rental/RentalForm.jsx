import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  CheckCircle,
  X,
  ArrowRight,
} from "lucide-react";

export default function RentalForm({ lang }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    startDate: "", // Changed for range
    endDate: "", // Added for range
    message: "",
  });

  // Track blocked dates (pending or approved)
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen only for Rental Requests (Independent of courses)
  useEffect(() => {
    const q = query(
      collection(db, "rent_requests"),
      where("status", "in", ["pending", "approved", "confirmed"]),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      let allDates = [];

      snap.docs.forEach((doc) => {
        const data = doc.data();
        const start = data.startDate || data.date;
        const end = data.endDate;

        if (start && end && start !== end) {
          // If there is a range, find every day in between
          let current = new Date(start);
          const last = new Date(end);
          while (current <= last) {
            allDates.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
          }
        } else if (start) {
          // Single day request
          allDates.push(start);
        }
      });

      setBlockedDates([...new Set(allDates)]);
    });

    return () => unsubscribe();
  }, []);

  const changeMonth = (off) =>
    setCurrentMonth(
      new Date(currentMonth.setMonth(currentMonth.getMonth() + off)),
    );

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  const handleDateClick = (dStr) => {
    // If no start date exists, or a full range is already selected, start a new range
    if (!formData.startDate || (formData.startDate && formData.endDate)) {
      setFormData({ ...formData, startDate: dStr, endDate: "" });
    }
    // If user clicks the exact same date as the start date, treat it as a single-day selection
    else if (dStr === formData.startDate) {
      setFormData({ ...formData, endDate: dStr });
    } else {
      if (dStr < formData.startDate) {
        // If they click an earlier date, reset that as the new start date
        setFormData({ ...formData, startDate: dStr, endDate: "" });
      } else {
        // Check for blocked dates in between
        const hasBlockedInRange = blockedDates.some(
          (bd) => bd > formData.startDate && bd < dStr,
        );
        if (hasBlockedInRange) {
          alert(
            lang === "en"
              ? "Range contains occupied dates."
              : "Zeitraum enthält belegte Tage.",
          );
          return;
        }
        setFormData({ ...formData, endDate: dStr });
      }
    }
  };

  const isDateInRange = (dStr) => {
    if (!formData.startDate || !formData.endDate) return false;
    return dStr > formData.startDate && dStr < formData.endDate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "rent_requests"), {
        ...formData,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        startDate: "",
        endDate: "",
        message: "",
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();
  const monthName = currentMonth.toLocaleString(
    lang === "en" ? "en-US" : "de-DE",
    { month: "long" },
  );

  // YOUR ORIGINAL STYLES (UNTOUCHED)
  const S = {
    calendarCardStyle: {
      background: "#fdf8e1",
      padding: isMobile ? "1.2rem" : "2.5rem",
      borderRadius: "24px",
      border: "1px solid rgba(28,7,0,0.08)",
      flex: isMobile
        ? "0 0 auto"
        : !!formData.startDate
          ? "0 0 520px"
          : "0 1 600px",
      width: isMobile ? "100%" : "auto",
      boxSizing: "border-box",
    },
    bookingCardStyle: {
      display: "flex",
      flexDirection: "column",
      background: "#fdf8e1",
      padding: isMobile ? "1.5rem" : "2.5rem",
      borderRadius: "24px",
      border: "1px solid rgba(28,7,0,0.08)",
      flex: isMobile ? "0 0 auto" : "1 1 auto",
      width: isMobile ? "100%" : "auto",
      boxSizing: "border-box",
    },
    calendarHeaderStyle: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "2rem",
    },
    navBtnStyle: {
      background: "none",
      border: "none",
      cursor: "pointer",
      opacity: 0.5,
    },
    monthLabelStyle: {
      fontFamily: "Harmond-SemiBoldCondensed",
      fontSize: isMobile ? "1.1rem" : "1.5rem",
      margin: 0,
      textTransform: "lowercase",
    },
    calendarGridStyle: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: isMobile ? "4px" : "10px",
    },
    dayOfWeekStyle: {
      fontSize: "0.75rem",
      fontWeight: "800",
      opacity: 0.3,
      textAlign: "center",
    },

    // UPDATED dayStyle: Keeps original colors/shape, handles range tint
    dayStyle: (isBlocked, isPast, isSelected, inRange) => ({
      width: "100%",
      aspectRatio: "1/1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: inRange ? "0" : "50%", // Keep circles for selection, square for range fill
      fontSize: isMobile ? "0.95rem" : "1rem",
      cursor: isBlocked || isPast ? "default" : "pointer",
      backgroundColor: isSelected
        ? "#caaff3"
        : inRange
          ? "rgba(202, 175, 243, 0.2)"
          : !isBlocked && !isPast
            ? "rgba(202, 175, 243, 0.4)"
            : "transparent",
      color: "#1c0700",
      fontWeight: !isBlocked && !isPast ? "800" : "400",
      opacity: isPast ? 0.1 : isBlocked ? 0.2 : 1,
      transition: "0.2s",
      position: "relative",
      boxSizing: "border-box",
      paddingBottom: !isBlocked && !isPast ? (isMobile ? "4px" : "2px") : "0",
    }),

    dotStyle: (isSelected) => ({
      width: "4px",
      height: "4px",
      borderRadius: "50%",
      backgroundColor: isSelected ? "#1c0700" : "#caaff3",
      position: "absolute",
      bottom: isMobile ? "5px" : "15%",
      left: "50%",
      transform: "translateX(-50%)",
    }),
    guestInputStyle: {
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid rgba(28, 7, 0, 0.1)",
      fontFamily: "Satoshi",
      fontSize: "0.9rem",
      background: "rgba(255, 252, 227, 0.5)",
      width: "100%",
      boxSizing: "border-box",
      color: "#1c0700",
    },
    primaryBtnStyle: {
      width: "100%",
      padding: isMobile ? "1rem" : "1.2rem",
      backgroundColor: "#9960a8",
      color: "#ffffff",
      border: "none",
      borderRadius: "100px",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: isMobile ? "1rem" : "1.1rem",
      marginTop: "10px",
    },
    legendWrapperStyle: {
      marginTop: isMobile ? "1.2rem" : "2.5rem",
      padding: isMobile ? "1rem" : "1.5rem 1rem",
      borderTop: "1px solid rgba(28, 7, 0, 0.05)",
      backgroundColor: "rgba(28, 7, 0, 0.02)",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
    },
    legendItemStyle: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.75rem",
      fontWeight: "700",
      color: "#1c0700",
      opacity: 0.9,
    },
    legendIndicatorStyle: (color) => ({
      width: "10px",
      height: "10px",
      borderRadius: "50%",
      backgroundColor: color,
    }),
    popup: {
      position: "fixed",
      bottom: "30px",
      right: "30px",
      backgroundColor: "#4e5f28",
      color: "white",
      padding: "16px 24px",
      borderRadius: "20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      zIndex: 10000,
      transform: showSuccess ? "translateY(0)" : "translateY(120%)",
      opacity: showSuccess ? 1 : 0,
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      pointerEvents: showSuccess ? "all" : "none",
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.6)",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      marginLeft: "8px",
    },
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.split("-").reverse().join(".");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: "2rem",
        width: "100%",
      }}
    >
      {/* SUCCESS POPUP */}
      <div style={S.popup}>
        <CheckCircle size={20} />
        <span
          style={{
            fontSize: "0.9rem",
            fontWeight: "500",
            fontFamily: "Satoshi",
          }}
        >
          {lang === "en"
            ? "Request sent successfully!"
            : "Anfrage erfolgreich gesendet!"}
        </span>
        <button onClick={() => setShowSuccess(false)} style={S.closeBtn}>
          <X size={16} />
        </button>
      </div>

      <div style={S.calendarCardStyle}>
        <div style={S.calendarHeaderStyle}>
          <button onClick={() => changeMonth(-1)} style={S.navBtnStyle}>
            <ChevronLeft size={20} />
          </button>
          <h4 style={S.monthLabelStyle}>
            {monthName} {year}
          </h4>
          <button onClick={() => changeMonth(1)} style={S.navBtnStyle}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={S.calendarGridStyle}>
          {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
            <div key={i} style={S.dayOfWeekStyle}>
              {l}
            </div>
          ))}
          {[...Array(firstDay(year, month))].map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {[...Array(daysInMonth(year, month))].map((_, i) => {
            const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            const isBlocked = blockedDates.includes(dStr);
            const isPast =
              new Date(year, month, i + 1) < new Date().setHours(0, 0, 0, 0);
            const isSelected =
              formData.startDate === dStr || formData.endDate === dStr;
            const inRange = isDateInRange(dStr);

            return (
              <div
                key={i}
                onClick={() => !isBlocked && !isPast && handleDateClick(dStr)}
                style={S.dayStyle(isBlocked, isPast, isSelected, inRange)}
              >
                {i + 1}
                {(isSelected ||
                  (formData.startDate === dStr && !formData.endDate)) && (
                  <div style={S.dotStyle(true)} />
                )}
              </div>
            );
          })}
        </div>

        <div style={S.legendWrapperStyle}>
          <div style={S.legendItemStyle}>
            <div style={S.legendIndicatorStyle("rgba(202, 175, 243, 0.4)")} />
            {lang === "en" ? "Available" : "Frei"}
          </div>
          <div style={S.legendItemStyle}>
            <div style={S.legendIndicatorStyle("rgba(0,0,0,0.05)")} />
            {lang === "en" ? "Occupied" : "Belegt"}
          </div>
        </div>
      </div>

      <div style={S.bookingCardStyle}>
        {/* LEFT ALIGNED TITLE */}
        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: "2rem",
            marginBottom: "1.5rem",
            marginTop: 0,
            textAlign: "left",
          }}
        >
          {lang === "en" ? "rental request" : "mietanfrage"}
        </h3>

        {!formData.startDate ? (
          <div
            style={{
              padding: "1.5rem",
              border: "1px dashed rgba(28, 7, 0, 0.2)",
              borderRadius: "12px",
              textAlign: "left",
              backgroundColor: "rgba(255, 252, 227, 0.4)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#1c0700",
                opacity: 0.7,
              }}
            >
              {lang === "en" ? "Select a start date." : "Wähle ein Startdatum."}
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* LEFT ALIGNED INFO BOX */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start", // Left justify contents
                backgroundColor: "rgba(202, 175, 243, 0.1)",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid rgba(202, 175, 243, 0.3)",
                gap: "4px",
              }}
            >
              <h4
                style={{
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  opacity: 0.5,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Calendar size={12} />{" "}
                {lang === "en" ? "Selected Period" : "Gewählter Zeitraum"}
              </h4>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "4px",
                }}
              >
                <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>
                  {formatDateShort(formData.startDate)}
                </span>
                {formData.endDate && (
                  <>
                    <ArrowRight size={16} opacity={0.3} />
                    <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>
                      {formatDateShort(formData.endDate)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "12px",
                }}
              >
                <input
                  style={S.guestInputStyle}
                  placeholder={lang === "en" ? "Name" : "Name"}
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <input
                  style={S.guestInputStyle}
                  type="tel"
                  placeholder={lang === "en" ? "Phone" : "Telefon"}
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <input
                style={S.guestInputStyle}
                type="email"
                placeholder={lang === "en" ? "E-mail" : "E-Mail"}
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <textarea
                style={{
                  ...S.guestInputStyle,
                  resize: "vertical",
                  minHeight: "80px",
                }}
                rows={3}
                placeholder={
                  lang === "en"
                    ? "Briefly explain your project..."
                    : "Kurze Erklärung zu deinem Projekt..."
                }
                required
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
              />

              <button
                type="submit"
                disabled={loading || !formData.startDate}
                style={S.primaryBtnStyle}
              >
                {loading ? (
                  <Loader2 size={18} className="spinner" />
                ) : lang === "en" ? (
                  "Send Request"
                ) : (
                  "Anfrage Senden"
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
