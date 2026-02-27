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
import { db } from "../../firebase";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { planets } from "../../data/planets";
import BookingSummary from "./BookingSummary";
import * as S from "./PriceDisplayStyles";

export default function PriceDisplay({ coursePath, currentLang }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [userBookedIds, setUserBookedIds] = useState([]);
  const [eventBookingCounts, setEventBookingCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const getCreditKey = (link) => {
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === link);
      if (course) return course.text[currentLang];
    }
    return link.replace(/\//g, "");
  };

  const courseKey = getCreditKey(coursePath);
  const availableCredits = userData?.credits?.[courseKey] || 0;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);

    const fetchData = async () => {
      const docId = coursePath.replace(/\//g, "");
      try {
        const priceSnap = await getDoc(doc(db, "course_settings", docId));
        let pricingData = null;
        if (priceSnap.exists()) {
          pricingData = priceSnap.data();
          setPricing(pricingData);
        }

        const eventSnap = await getDocs(
          query(collection(db, "events"), orderBy("date", "asc")),
        );
        const filteredEvents = eventSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((ev) => ev.link === coursePath);
        setAvailableDates(filteredEvents);

        const globalBSnap = await getDocs(
          query(
            collection(db, "bookings"),
            where("coursePath", "==", coursePath),
          ),
        );
        const counts = {};
        globalBSnap.docs.forEach((d) => {
          counts[d.data().eventId] = (counts[d.data().eventId] || 0) + 1;
        });
        setEventBookingCounts(counts);

        let bookedIds = [];
        if (currentUser) {
          const userBSnap = await getDocs(
            query(
              collection(db, "bookings"),
              where("userId", "==", currentUser.uid),
            ),
          );
          bookedIds = userBSnap.docs.map((d) => d.data().eventId);
          setUserBookedIds(bookedIds);
        }

        if (filteredEvents.length > 0) {
          const nextAvailable =
            filteredEvents.find((ev) => {
              const isFull =
                pricingData?.hasCapacity &&
                (counts[ev.id] || 0) >= parseInt(pricingData.capacity);
              const isBooked = bookedIds.includes(ev.id);
              return !isFull && !isBooked;
            }) || filteredEvents[0];
          setCurrentViewDate(
            new Date(
              new Date(nextAvailable.date).getFullYear(),
              new Date(nextAvailable.date).getMonth(),
              1,
            ),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => window.removeEventListener("resize", handleResize);
  }, [coursePath, currentUser]);

  const toggleDate = (event) => {
    if (userBookedIds.includes(event.id)) return;
    const isFull =
      pricing?.hasCapacity &&
      (eventBookingCounts[event.id] || 0) >= parseInt(pricing.capacity);
    if (isFull) return;
    setSelectedDates((prev) =>
      prev.find((d) => d.id === event.id)
        ? prev.filter((d) => d.id !== event.id)
        : [...prev, event],
    );
  };

  const handlePayment = async (mode, packCode = null) => {
    const functions = getFunctions();

    try {
      setIsProcessing(true);

      // 1. REDEEM CODE LOGIC
      if (mode === "redeem") {
        const redeemPack = httpsCallable(functions, "redeemPackCode");

        await redeemPack({
          coursePath,
          selectedDates: selectedDates.map((d) => ({ id: d.id, date: d.date })),
          packCode,
          guestInfo: isGuestMode ? guestInfo : null,
        });

        // If successful, go straight to success page
        navigate("/success");
        return;
      }

      // 2. STRIPE CHECKOUT LOGIC (for "pack" or "individual")
      const createCheckout = httpsCallable(functions, "createStripeCheckout");
      const result = await createCheckout({
        mode,
        packPrice: parseFloat(pricing.priceFull),
        totalPrice: selectedDates.length * parseFloat(pricing.priceSingle),
        packSize: parseInt(pricing.packSize),
        coursePath,
        selectedDates: selectedDates.map((d) => ({ id: d.id, date: d.date })),
        guestInfo: isGuestMode ? guestInfo : null,
        currentLang: currentLang, // <--- ADD THIS LINE
      });

      if (result.data?.url) window.location.assign(result.data.url);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);

      // Provide user feedback if the code they entered is invalid
      if (mode === "redeem") {
        alert(
          currentLang === "en"
            ? "Invalid code or insufficient pack credits."
            : "Ungültiger Code oder unzureichendes Guthaben.",
        );
      }
    }
  };

  const handleBookWithCredits = async () => {
    const bookWithCredits = httpsCallable(getFunctions(), "bookWithCredits");
    try {
      setIsProcessing(true);
      await bookWithCredits({
        coursePath,
        selectedDates: selectedDates.map((d) => ({ id: d.id, date: d.date })),
      });
      navigate("/success");
    } catch (err) {
      setIsProcessing(false);
    }
  };

  if (loading && !pricing)
    return (
      <div style={S.initialLoaderStyle}>
        <Loader2 className="spinner" size={40} color="#caaff3" />
      </div>
    );

  const monthName = currentViewDate.toLocaleString(
    currentLang === "en" ? "en-US" : "de-DE",
    { month: "long" },
  );
  const year = currentViewDate.getFullYear();

  return (
    <div style={{ ...S.outerWrapperStyle, position: "relative" }}>
      {isProcessing && (
        <div style={S.overlayStyle}>
          <Loader2 className="spinner" size={50} color="#caaff3" />
          <p style={{ marginTop: "1.5rem", fontWeight: "700" }}>
            {currentLang === "en" ? "Processing..." : "Verarbeitung..."}
          </p>
        </div>
      )}

      <h2 style={S.overarchingTitleStyle(isMobile)}>
        {currentLang === "en" ? "Available Dates" : "Verfügbare Termine"}
      </h2>

      {/* CHANGED: Container and Calendar show summary as soon as pricing is loaded */}
      <div style={S.containerStyle(isMobile, !!pricing)}>
        <div style={S.calendarCardStyle(isMobile, !!pricing)}>
          <div style={S.calendarHeaderStyle(isMobile)}>
            <button
              onClick={() =>
                setCurrentViewDate(
                  new Date(year, currentViewDate.getMonth() - 1),
                )
              }
              style={S.navBtnStyle}
            >
              <ChevronLeft size={20} />
            </button>
            <h4 style={S.monthLabelStyle(isMobile)}>
              {monthName} {year}
            </h4>
            <button
              onClick={() =>
                setCurrentViewDate(
                  new Date(year, currentViewDate.getMonth() + 1),
                )
              }
              style={S.navBtnStyle}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div style={S.calendarGridStyle(isMobile)}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={S.dayOfWeekStyle(isMobile)}>
                {d}
              </div>
            ))}
            {[
              ...Array(new Date(year, currentViewDate.getMonth(), 1).getDay()),
            ].map((_, i) => (
              <div key={i} />
            ))}
            {[
              ...Array(
                new Date(year, currentViewDate.getMonth() + 1, 0).getDate(),
              ),
            ].map((_, i) => {
              const dateStr = `${year}-${String(currentViewDate.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              const event = availableDates.find((e) => e.date === dateStr);
              const isFull =
                event &&
                pricing?.hasCapacity &&
                (eventBookingCounts[event.id] || 0) >=
                  parseInt(pricing.capacity);
              const isBooked = event && userBookedIds.includes(event.id);

              return (
                <div
                  key={i}
                  onClick={() =>
                    event && !isBooked && !isFull && toggleDate(event)
                  }
                  style={S.dayStyle(
                    event,
                    event && selectedDates.find((d) => d.id === event.id),
                    isMobile,
                    isBooked || isFull,
                  )}
                >
                  {i + 1}
                  {event && !isFull && (
                    <div
                      style={S.dotStyle(
                        selectedDates.find((d) => d.id === event.id),
                        isBooked,
                      )}
                    />
                  )}
                  {isFull && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        fontWeight: "900",
                        color: "#ff4d4d",
                        position: "absolute",
                        bottom: "4px",
                      }}
                    >
                      {currentLang === "en" ? "FULL" : "VOLL"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <BookingSummary
          selectedDates={selectedDates}
          totalPrice={selectedDates.length * parseFloat(pricing.priceSingle)}
          availableCredits={availableCredits}
          pricing={pricing}
          isGuestMode={isGuestMode}
          setIsGuestMode={setIsGuestMode}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          currentUser={currentUser}
          currentLang={currentLang}
          isMobile={isMobile}
          onBookCredits={handleBookWithCredits}
          onPayment={handlePayment}
        />
      </div>
    </div>
  );
}
