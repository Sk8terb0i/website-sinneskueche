import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { loadStripe } from "@stripe/stripe-js";
import { db } from "../../firebase";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const stripePromise = loadStripe("pk_test_YOUR_PUBLISHABLE_KEY_HERE");

export default function PriceDisplay({ coursePath, currentLang }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [userBookedIds, setUserBookedIds] = useState([]);
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

        let bookedIds = [];
        if (currentUser) {
          const bookingsRef = collection(db, "bookings");
          const bQuery = query(
            bookingsRef,
            where("userId", "==", currentUser.uid),
          );
          const bSnap = await getDocs(bQuery);
          bookedIds = bSnap.docs.map((d) => d.data().eventId);
          setUserBookedIds(bookedIds);
        }

        // Logic to jump to the next bookable date (not yet booked by user)
        if (filteredEvents.length > 0) {
          const nextAvailable =
            filteredEvents.find((ev) => !bookedIds.includes(ev.id)) ||
            filteredEvents[0];
          const jumpDate = new Date(nextAvailable.date);
          setCurrentViewDate(
            new Date(jumpDate.getFullYear(), jumpDate.getMonth(), 1),
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
  }, [coursePath, currentUser]);

  const handlePayment = async (mode) => {
    if (!currentUser) {
      alert(currentLang === "en" ? "Please log in." : "Bitte logge dich ein.");
      return;
    }
    const functions = getFunctions();
    const createCheckout = httpsCallable(functions, "createStripeCheckout");

    try {
      const result = await createCheckout({
        mode: mode,
        packPrice: parseFloat(pricing.priceFull),
        totalPrice: selectedDates.length * parseFloat(pricing.priceSingle),
        packSize: parseInt(pricing.packSize),
        coursePath: coursePath,
        selectedDates: selectedDates.map((d) => ({ id: d.id, date: d.date })),
      });

      if (result.data && result.data.url) {
        window.location.assign(result.data.url);
      }
    } catch (err) {
      console.error("Payment failed:", err);
    }
  };

  const handleBookWithCredits = async () => {
    const cleanPath = coursePath.replace(/\//g, "");
    const userCredits = userData?.credits?.[cleanPath] || 0;

    if (selectedDates.length > userCredits) {
      alert(
        currentLang === "en" ? "Not enough credits!" : "Nicht genug Guthaben!",
      );
      return;
    }

    const functions = getFunctions();
    const bookWithCredits = httpsCallable(functions, "bookWithCredits");

    try {
      setLoading(true);
      await bookWithCredits({
        coursePath: coursePath,
        selectedDates: selectedDates.map((d) => ({ id: d.id, date: d.date })),
      });
      navigate("/success");
    } catch (err) {
      console.error(err);
      alert("Booking failed.");
    } finally {
      setLoading(false);
    }
  };

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
    if (userBookedIds.includes(event.id)) return;
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
  const cleanPath = coursePath.replace(/\//g, "");
  const availableCredits = userData?.credits?.[cleanPath] || 0;

  return (
    <div style={outerWrapperStyle}>
      <h2 style={overarchingTitleStyle(isMobile)}>
        {currentLang === "en" ? "Available Dates" : "Verfügbare Termine"}
      </h2>

      <div style={containerStyle(isMobile, hasSelection)}>
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
            {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
              <div key={`${d}-${index}`} style={dayOfWeekStyle(isMobile)}>
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
                const isAlreadyBooked =
                  event && userBookedIds.includes(event.id);

                return (
                  <div
                    key={day}
                    onClick={() =>
                      event && !isAlreadyBooked && toggleDate(event)
                    }
                    style={dayStyle(
                      event,
                      isSelected,
                      isMobile,
                      isAlreadyBooked,
                    )}
                  >
                    {day}
                    {event && (
                      <div style={dotStyle(isSelected, isAlreadyBooked)} />
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>

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
              {availableCredits >= selectedDates.length && (
                <button
                  onClick={handleBookWithCredits}
                  style={primaryBtnStyle(isMobile)}
                >
                  {currentLang === "en"
                    ? `Use ${selectedDates.length} Credits`
                    : `${selectedDates.length} Guthaben nutzen`}
                </button>
              )}
              {pricing.hasPack && (
                <div style={highlightedPackStyle(isMobile)}>
                  <div style={packHeaderStyle}>
                    <p style={packTitleStyle(isMobile)}>
                      {currentLang === "en"
                        ? `${packSize}-Session Pack`
                        : `${packSize}er Karte`}
                    </p>
                    <p style={packPriceStyle(isMobile)}>{packPrice} CHF</p>
                  </div>
                  <button
                    onClick={() => handlePayment("pack")}
                    style={primaryBtnStyle(isMobile)}
                  >
                    {currentLang === "en"
                      ? "Buy Pack & Book"
                      : "Karte kaufen & buchen"}
                  </button>
                </div>
              )}
              <button
                onClick={() => handlePayment("individual")}
                style={secondaryBtnStyle(isMobile)}
              >
                {currentLang === "en"
                  ? `Pay ${totalPrice} CHF`
                  : `${totalPrice} CHF zahlen`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const dayStyle = (hasEvent, isSelected, isMobile, isAlreadyBooked) => ({
  aspectRatio: "1/1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  fontSize: isMobile ? "0.85rem" : "1rem",
  cursor: hasEvent && !isAlreadyBooked ? "pointer" : "default",
  backgroundColor: isAlreadyBooked
    ? "rgba(0,0,0,0.05)"
    : isSelected
      ? "#caaff3"
      : hasEvent
        ? "rgba(202, 175, 243, 0.15)"
        : "transparent",
  color: isAlreadyBooked ? "#ccc" : "#1c0700",
  fontWeight: hasEvent ? "800" : "400",
  opacity: hasEvent ? 1 : 0.2,
  transition: "0.2s",
});

const dotStyle = (isSelected, isAlreadyBooked) => ({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  backgroundColor: isAlreadyBooked
    ? "#ccc"
    : isSelected
      ? "#1c0700"
      : "#caaff3",
  marginTop: "4px",
});

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
});
const containerStyle = (isMobile, hasSelection) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: hasSelection ? (isMobile ? "1.5rem" : "2.5rem") : "0",
  margin: "0 auto",
  width: "100%",
  maxWidth: "1200px",
  justifyContent: "center",
});
const calendarCardStyle = (isMobile, hasSelection) => ({
  background: "#fdf8e1",
  padding: isMobile ? "1.5rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : hasSelection ? "0 0 520px" : "0 1 600px",
});
const bookingCardStyle = (isMobile, hasSelection) => ({
  display: hasSelection ? "flex" : "none",
  background: "#fdf8e1",
  padding: isMobile ? "1.5rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : "1 1 auto",
  opacity: hasSelection ? 1 : 0,
  transition: "all 0.6s ease",
});
const highlightedPackStyle = (isMobile) => ({
  backgroundColor: "rgba(202, 175, 243, 0.15)",
  borderRadius: "20px",
  padding: isMobile ? "1.2rem" : "1.8rem",
  border: "1px solid #caaff3",
  display: "flex",
  flexDirection: "column",
  gap: "1.2rem",
});
const packHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  width: "100%",
};
const packTitleStyle = (isMobile) => ({
  fontWeight: "800",
  margin: 0,
  fontSize: isMobile ? "1rem" : "1.1rem",
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
});
const calendarHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "2rem",
});
const monthLabelStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "1.1rem" : "1.5rem",
  margin: 0,
});
const calendarGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "10px",
});
const dayOfWeekStyle = (isMobile) => ({
  fontSize: "0.75rem",
  fontWeight: "800",
  opacity: 0.3,
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
  fontSize: "2rem",
  marginBottom: "1.5rem",
});
const selectionInfoStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(28,7,0,0.1)",
  paddingBottom: "1.5rem",
  marginBottom: "2rem",
});
const totalPriceStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "2.4rem",
  color: "#4e5f28",
});
const labelStyle = (isMobile) => ({ fontWeight: "700", fontSize: "1rem" });
