import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

export default function PriceDisplay({ coursePath, currentLang }) {
  const [pricing, setPricing] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      // Clean path for Document ID: "/pottery" -> "pottery"
      const docId = coursePath.replace(/\//g, "");

      try {
        // 1. Fetch Pricing Settings from 'course_settings'
        const priceSnap = await getDoc(doc(db, "course_settings", docId));
        if (priceSnap.exists()) setPricing(priceSnap.data());

        // 2. Fetch Events from 'events' collection
        // We query for the exact path saved in EventsTab.jsx
        const eventsRef = collection(db, "events");
        const q = query(
          eventsRef,
          where("link", "==", coursePath), // Matches the link saved by EventsTab
          orderBy("date", "asc"),
        );

        const eventSnap = await getDocs(q);
        const events = eventSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setAvailableDates(events);

        // 3. Auto-jump to earliest month with dates
        if (events.length > 0) {
          const earliestDate = new Date(events[0].date);
          setCurrentViewDate(
            new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1),
          );
        }
      } catch (err) {
        console.error("Data fetch error in PriceDisplay:", err);
      } finally {
        setLoading(false);
      }
    };

    if (coursePath) fetchData();
  }, [coursePath]);

  if (loading || !pricing) return null;

  // --- CALENDAR HELPERS ---
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

  // --- PRICING HELPERS ---
  const pricePerSession = parseFloat(pricing.priceSingle) || 0;
  const totalPrice = selectedDates.length * pricePerSession;
  const packSize = parseInt(pricing.packSize) || 10;

  return (
    <div style={containerStyle}>
      {/* CALENDAR CARD */}
      <div style={calendarCardStyle}>
        <div style={calendarHeaderStyle}>
          <button
            onClick={() =>
              setCurrentViewDate(new Date(year, currentViewDate.getMonth() - 1))
            }
            style={navBtnStyle}
          >
            <ChevronLeft size={18} />
          </button>
          <h4 style={monthLabelStyle}>
            {monthName} {year}
          </h4>
          <button
            onClick={() =>
              setCurrentViewDate(new Date(year, currentViewDate.getMonth() + 1))
            }
            style={navBtnStyle}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={calendarGridStyle}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d} style={dayOfWeekStyle}>
              {d}
            </div>
          ))}
          {[...Array(firstDayOfMonth)].map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {[...Array(daysInMonth(year, currentViewDate.getMonth()))].map(
            (_, i) => {
              const day = i + 1;
              // Format to match "YYYY-MM-DD" stored in Firestore
              const dateStr = `${year}-${String(currentViewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

              const event = availableDates.find((e) => e.date === dateStr);
              const isSelected =
                event && selectedDates.find((d) => d.id === event.id);

              return (
                <div
                  key={day}
                  onClick={() => event && toggleDate(event)}
                  style={dayStyle(event, isSelected)}
                >
                  {day}
                  {event && <div style={dotStyle(isSelected)} />}
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* BOOKING SUMMARY CARD */}
      <div style={bookingCardStyle}>
        <h3 style={summaryTitleStyle}>
          {currentLang === "en" ? "Booking Summary" : "Buchungsübersicht"}
        </h3>

        <div style={selectionInfoStyle}>
          <span style={labelStyle}>
            {selectedDates.length}{" "}
            {currentLang === "en" ? "Sessions Selected" : "Termine ausgewählt"}
          </span>
          <span style={totalPriceStyle}>{totalPrice} CHF</span>
        </div>

        {selectedDates.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <button style={payBtnStyle}>
              {currentLang === "en"
                ? `Pay ${totalPrice} CHF`
                : `Zahlen ${totalPrice} CHF`}
            </button>
            {pricing.hasPack && (
              <div style={packOptionStyle}>
                <div>
                  <p style={{ fontWeight: "800", margin: 0 }}>
                    {currentLang === "en"
                      ? `${packSize}-Pack`
                      : `${packSize}er Karte`}
                  </p>
                  <p style={{ fontSize: "0.7rem", opacity: 0.6, margin: 0 }}>
                    {pricing.priceFull}
                  </p>
                </div>
                <button style={packBtnStyle}>
                  {currentLang === "en" ? "Buy Pack" : "Karte kaufen"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p
            style={{
              opacity: 0.4,
              fontSize: "0.9rem",
              textAlign: "center",
              marginTop: "auto",
            }}
          >
            <CalendarIcon size={14} style={{ marginRight: "6px" }} />
            {currentLang === "en"
              ? "Select dates to book"
              : "Wähle Termine aus"}
          </p>
        )}
      </div>
    </div>
  );
}

// --- STYLES (NO PURE WHITE) ---
const containerStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "2rem",
  margin: "2rem 0",
};
const calendarCardStyle = {
  background: "#fdf8e1",
  padding: "1.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
};
const calendarHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};
const monthLabelStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "1.2rem",
  margin: 0,
};
const calendarGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "5px",
};
const dayOfWeekStyle = {
  fontSize: "0.65rem",
  fontWeight: "800",
  opacity: 0.3,
  padding: "5px 0",
};
const navBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  opacity: 0.5,
};
const bookingCardStyle = {
  background: "#fdf8e1",
  padding: "2rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  display: "flex",
  flexDirection: "column",
};
const summaryTitleStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "1.5rem",
  marginBottom: "1rem",
};
const selectionInfoStyle = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(28,7,0,0.1)",
  paddingBottom: "1rem",
  marginBottom: "1rem",
};
const totalPriceStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "1.8rem",
  color: "#4e5f28",
};
const labelStyle = { fontWeight: "700", fontSize: "0.85rem" };
const payBtnStyle = {
  width: "100%",
  padding: "0.8rem",
  backgroundColor: "#1c0700",
  color: "white",
  border: "none",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "700",
};
const packOptionStyle = {
  padding: "1rem",
  backgroundColor: "rgba(202, 175, 243, 0.1)",
  borderRadius: "15px",
  border: "1px dashed #caaff3",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const packBtnStyle = {
  padding: "0.5rem 1rem",
  backgroundColor: "#caaff3",
  border: "none",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "0.75rem",
};

const dayStyle = (hasEvent, isSelected) => ({
  aspectRatio: "1/1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  fontSize: "0.85rem",
  cursor: hasEvent ? "pointer" : "default",
  backgroundColor: isSelected ? "#caaff3" : "transparent",
  color: "#1c0700",
  fontWeight: hasEvent ? "800" : "400",
  opacity: hasEvent ? 1 : 0.2,
  transition: "0.2s",
});

const dotStyle = (isSelected) => ({
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  backgroundColor: isSelected ? "#1c0700" : "#caaff3",
  marginTop: "2px",
});
