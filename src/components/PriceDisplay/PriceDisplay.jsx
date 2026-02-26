import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebase";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

export default function PriceDisplay({ coursePath, currentLang }) {
  const [pricing, setPricing] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);

    const fetchData = async () => {
      const docId = coursePath.replace(/\//g, "");
      try {
        const priceSnap = await getDoc(doc(db, "course_settings", docId));
        if (priceSnap.exists()) {
          setPricing(priceSnap.data());
        }

        const eventsRef = collection(db, "events");
        const q = query(eventsRef, orderBy("date", "asc"));
        const eventSnap = await getDocs(q);
        const allEvents = eventSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const filteredEvents = allEvents.filter((ev) => ev.link === coursePath);
        setAvailableDates(filteredEvents);

        if (filteredEvents.length > 0) {
          const earliestDate = new Date(filteredEvents[0].date);
          setCurrentViewDate(
            new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1),
          );
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => window.removeEventListener("resize", handleResize);
  }, [coursePath]);

  if (loading || !pricing) return null;

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(
    currentViewDate.getFullYear(),
    currentViewDate.getMonth(),
    1,
  ).getDay();
  const monthName = currentViewDate.toLocaleString(
    currentLang === "en" ? "en-US" : "de-DE",
    { month: "long" },
  );
  const year = currentViewDate.getFullYear();

  const toggleDate = (event) => {
    setSelectedDates((prev) =>
      prev.find((d) => d.id === event.id)
        ? prev.filter((d) => d.id !== event.id)
        : [...prev, event],
    );
  };

  const pricePerSession = parseFloat(pricing.priceSingle) || 0;
  const totalPrice = selectedDates.length * pricePerSession;
  const packSize = parseInt(pricing.packSize) || 10;
  const packPrice = parseFloat(pricing.priceFull) || 0;
  const hasSelection = selectedDates.length > 0;

  // --- PERCENTAGE SAVINGS CALCULATION ---
  const normalTotal = pricePerSession * packSize;
  const savingsPercent =
    normalTotal > 0
      ? Math.round(((normalTotal - packPrice) / normalTotal) * 100)
      : 0;

  return (
    <div style={outerWrapperStyle}>
      <h2 style={overarchingTitleStyle(isMobile)}>
        {currentLang === "en" ? "Available Dates" : "Verfügbare Termine"}
      </h2>

      <div style={containerStyle(isMobile)}>
        {/* 1. CALENDAR */}
        <div style={calendarCardStyle(isMobile, hasSelection)}>
          <div style={calendarHeaderStyle(isMobile)}>
            <button
              onClick={() =>
                setCurrentViewDate(
                  new Date(year, currentViewDate.getMonth() - 1),
                )
              }
              style={navBtnStyle}
            >
              <ChevronLeft size={isMobile ? 18 : 20} />
            </button>
            <h4 style={monthLabelStyle(isMobile)}>
              {monthName} {year}
            </h4>
            <button
              onClick={() =>
                setCurrentViewDate(
                  new Date(year, currentViewDate.getMonth() + 1),
                )
              }
              style={navBtnStyle}
            >
              <ChevronRight size={isMobile ? 18 : 20} />
            </button>
          </div>

          <div style={calendarGridStyle(isMobile)}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} style={dayOfWeekStyle(isMobile)}>
                {d}
              </div>
            ))}
            {[...Array(firstDayOfMonth)].map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {[...Array(daysInMonth(year, currentViewDate.getMonth()))].map(
              (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(currentViewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const event = availableDates.find((e) => e.date === dateStr);
                const isSelected =
                  event && selectedDates.find((d) => d.id === event.id);
                return (
                  <div
                    key={day}
                    onClick={() => event && toggleDate(event)}
                    style={dayStyle(event, isSelected, isMobile)}
                  >
                    {day}
                    {event && <div style={dotStyle(isSelected)} />}
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* 2. SUMMARY (PACK-FOCUSED) */}
        <div style={bookingCardStyle(isMobile, hasSelection)}>
          <div
            style={{
              minWidth: isMobile ? "auto" : "380px",
              opacity: hasSelection ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            <h3 style={summaryTitleStyle(isMobile)}>
              {currentLang === "en" ? "Booking Summary" : "Buchungsübersicht"}
            </h3>

            <div style={selectionInfoStyle(isMobile)}>
              <span style={labelStyle(isMobile)}>
                {selectedDates.length}{" "}
                {currentLang === "en" ? "Sessions" : "Termine"}
              </span>
              <span style={totalPriceStyle(isMobile)}>{totalPrice} CHF</span>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* PRIMARY FOCUS: PACK OPTION */}
              {pricing.hasPack && pricing.priceFull && (
                <div style={highlightedPackStyle(isMobile)}>
                  <div style={packHeaderStyle}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <p style={packTitleStyle(isMobile)}>
                        {currentLang === "en"
                          ? `${packSize}-Session Pack`
                          : `${packSize}er Karte`}
                      </p>
                      {savingsPercent > 0 && (
                        <span style={savingsBadgeStyle(isMobile)}>
                          -{savingsPercent}%
                        </span>
                      )}
                    </div>
                    <p style={packPriceStyle(isMobile)}>{packPrice} CHF</p>
                  </div>

                  <button style={primaryBtnStyle(isMobile)}>
                    {currentLang === "en"
                      ? "Buy Pack & Book"
                      : "Karte kaufen & buchen"}
                  </button>

                  <div style={creditNoteStyle(isMobile)}>
                    <Info size={isMobile ? 12 : 14} style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0 }}>
                      {currentLang === "en"
                        ? "Packs are credited to your profile. You can book sessions flexibly whenever you like."
                        : "Guthaben wird in deinem Profil gespeichert. Damit kannst du deine Termine später ganz flexibel buchen."}
                    </p>
                  </div>
                </div>
              )}

              {/* SECONDARY: SINGLE SESSION PAYMENT */}
              <button style={secondaryBtnStyle(isMobile)}>
                {currentLang === "en"
                  ? `Pay for ${selectedDates.length} sessions (${totalPrice} CHF)`
                  : `Nur ${selectedDates.length} Termine zahlen (${totalPrice} CHF)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---

const outerWrapperStyle = {
  width: "100%",
  marginTop: "4rem",
  borderTop: "1px solid rgba(28, 7, 0, 0.05)",
  paddingTop: "3rem",
};
const overarchingTitleStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "2.2rem" : "3.5rem",
  color: "#1c0700",
  marginBottom: isMobile ? "1.5rem" : "2.5rem",
  textAlign: "center",
  textTransform: "lowercase",
  fontWeight: isMobile ? "500" : "inherit",
});
const containerStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: isMobile ? "1.5rem" : "2.5rem",
  margin: "0 auto",
  width: "100%",
  maxWidth: "1200px",
  justifyContent: "center",
  alignItems: isMobile ? "center" : "stretch",
});

const calendarCardStyle = (isMobile, hasSelection) => ({
  background: "#fdf8e1",
  padding: isMobile ? "1.5rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : hasSelection ? "0 0 520px" : "0 1 600px",
  width: isMobile ? "100%" : "auto",
  boxSizing: "border-box",
  transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
});
const bookingCardStyle = (isMobile, hasSelection) => ({
  background: "#fdf8e1",
  padding: hasSelection ? (isMobile ? "1.5rem" : "2.5rem") : "0",
  borderRadius: "24px",
  border: hasSelection
    ? "1px solid rgba(28,7,0,0.08)"
    : "1px solid transparent",
  display: "flex",
  flexDirection: "column",
  flex: hasSelection ? (isMobile ? "0 0 auto" : "1 1 auto") : "0 0 0",
  width: isMobile ? "100%" : "auto",
  opacity: hasSelection ? 1 : 0,
  transform: hasSelection ? "translateX(0)" : "translateX(20px)",
  transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
  overflow: "hidden",
  boxSizing: "border-box",
});

const highlightedPackStyle = (isMobile) => ({
  backgroundColor: "rgba(202, 175, 243, 0.15)",
  borderRadius: "20px",
  padding: isMobile ? "1.2rem" : "1.8rem",
  border: "1px solid #caaff3",
  display: "flex",
  flexDirection: "column",
  gap: "1.2rem",
  marginBottom: "0.5rem",
});
const packHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  width: "100%",
};
const packTitleStyle = (isMobile) => ({
  fontWeight: isMobile ? "600" : "800",
  margin: 0,
  fontSize: isMobile ? "1rem" : "1.1rem",
  color: "#1c0700",
});
const packPriceStyle = (isMobile) => ({
  fontWeight: "700",
  margin: 0,
  fontSize: isMobile ? "1rem" : "1.1rem",
  color: "#4e5f28",
});

const primaryBtnStyle = (isMobile) => ({
  width: "100%",
  padding: isMobile ? "1rem" : "1.2rem",
  backgroundColor: "#9960a8",
  color: "#ffffff",
  border: "none",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: isMobile ? "1rem" : "1.1rem",
  fontFamily: "Satoshi",
});

const secondaryBtnStyle = (isMobile) => ({
  width: "100%",
  padding: isMobile ? "0.9rem" : "1.1rem",
  backgroundColor: "transparent",
  color: "#1c0700",
  border: "1px solid rgba(28, 7, 0, 0.2)",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: isMobile ? "0.8rem" : "0.9rem",
  opacity: 0.7,
  fontFamily: "Satoshi",
});

const savingsBadgeStyle = (isMobile) => ({
  fontSize: isMobile ? "0.55rem" : "0.65rem",
  backgroundColor: "#4e5f28",
  color: "#fff",
  padding: "3px 10px",
  borderRadius: "100px",
  fontWeight: "800",
  textTransform: "uppercase",
});
const creditNoteStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  fontSize: isMobile ? "0.65rem" : "0.75rem",
  lineHeight: "1.4",
  color: "#1c0700",
  opacity: 0.6,
  textAlign: "left",
});

const calendarHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: isMobile ? "1rem" : "2rem",
});
const monthLabelStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "1.1rem" : "1.5rem",
  fontWeight: isMobile ? "500" : "inherit",
  margin: 0,
  textTransform: "lowercase",
});
const calendarGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: isMobile ? "6px" : "10px",
});
const dayOfWeekStyle = (isMobile) => ({
  fontSize: isMobile ? "0.65rem" : "0.75rem",
  fontWeight: "800",
  opacity: 0.3,
  padding: "5px 0",
  textAlign: "center",
});
const navBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  opacity: 0.5,
};
const summaryTitleStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "1.4rem" : "2rem",
  fontWeight: isMobile ? "500" : "inherit",
  marginBottom: isMobile ? "0.8rem" : "1.5rem",
  textAlign: "left",
});
const selectionInfoStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(28,7,0,0.1)",
  paddingBottom: isMobile ? "0.8rem" : "1.5rem",
  marginBottom: isMobile ? "1rem" : "2rem",
});
const totalPriceStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "1.8rem" : "2.4rem",
  color: "#4e5f28",
});
const labelStyle = (isMobile) => ({
  fontWeight: "700",
  fontSize: isMobile ? "0.85rem" : "1rem",
});

const dayStyle = (hasEvent, isSelected, isMobile) => ({
  aspectRatio: "1/1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  fontSize: isMobile ? "0.85rem" : "1rem",
  cursor: hasEvent ? "pointer" : "default",
  backgroundColor: isSelected
    ? "#caaff3"
    : hasEvent
      ? "rgba(202, 175, 243, 0.15)"
      : "transparent",
  color: "#1c0700",
  fontWeight: hasEvent ? "800" : "400",
  opacity: hasEvent ? 1 : 0.2,
  transition: "0.2s",
});
const dotStyle = (isSelected) => ({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  backgroundColor: isSelected ? "#1c0700" : "#caaff3",
  marginTop: "4px",
});
