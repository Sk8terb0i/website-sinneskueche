import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  orderBy,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { ChevronLeft, ChevronRight, Loader2, ChevronDown } from "lucide-react";
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
  const [guestInfo, setGuestInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const scrollRef = useRef(null);

  const getCreditKey = (link) => {
    for (const planet of planets) {
      const course = planet.courses?.find((c) => c.link === link);
      if (course) return course.text[currentLang];
    }
    return link.replace(/\//g, "");
  };

  const courseKey = getCreditKey(coursePath);
  const availableCredits = userData?.credits?.[courseKey] || 0;

  // Helpers for multi-ticket calculations
  const totalTickets = selectedDates.reduce(
    (sum, d) => sum + (d.count || 1),
    0,
  );
  const currentTotalPrice =
    totalTickets * parseFloat(pricing?.priceSingle || 0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const docId = coursePath.replace(/\//g, "");
      try {
        const priceSnap = await getDoc(doc(db, "course_settings", docId));
        if (priceSnap.exists() && isMounted) setPricing(priceSnap.data());

        const eventSnap = await getDocs(
          query(collection(db, "events"), orderBy("date", "asc")),
        );
        const filteredEvents = eventSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((ev) => ev.link === coursePath);

        if (isMounted) setAvailableDates(filteredEvents);

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
        if (isMounted) setEventBookingCounts(counts);

        if (currentUser) {
          const userBSnap = await getDocs(
            query(
              collection(db, "bookings"),
              where("userId", "==", currentUser.uid),
            ),
          );
          if (isMounted)
            setUserBookedIds(userBSnap.docs.map((d) => d.data().eventId));
        }

        if (filteredEvents.length > 0 && isMounted) {
          const nextAvailable = filteredEvents[0];
          const d = new Date(nextAvailable.date);
          setCurrentViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [coursePath, currentUser]);

  useEffect(() => {
    if (isMobile && isMobileExpanded && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    }
  }, [isMobileExpanded, isMobile]);

  const toggleDate = (event) => {
    // UPDATED: Removed userBookedIds blocking logic
    const isFull =
      pricing?.hasCapacity &&
      (eventBookingCounts[event.id] || 0) >= parseInt(pricing.capacity);
    if (isFull) return;

    setSelectedDates((prev) => {
      const existing = prev.find((d) => d.id === event.id);
      if (existing) {
        return prev.filter((d) => d.id !== event.id);
      } else {
        return [...prev, { ...event, count: 1 }];
      }
    });
  };

  const handlePayment = async (
    mode,
    packCode = null,
    selectedPackSize = null,
    selectedPackPrice = null,
  ) => {
    if (!currentUser && (!guestInfo.email || !guestInfo.firstName)) {
      alert(
        currentLang === "en"
          ? "Name and email required."
          : "Name und E-Mail erforderlich.",
      );
      return;
    }
    setIsProcessing(true);
    try {
      const functions = getFunctions();
      const expandedDates = [];
      selectedDates.forEach((d) => {
        for (let i = 0; i < d.count; i++) {
          expandedDates.push({ id: d.id, date: d.date, time: d.time });
        }
      });

      if (mode === "redeem") {
        const redeemPack = httpsCallable(functions, "redeemPackCode");
        const res = await redeemPack({
          coursePath,
          selectedDates: expandedDates,
          packCode,
          guestInfo: !currentUser ? guestInfo : null,
          currentLang,
        });

        if (currentUser) {
          await addDoc(collection(db, "credit_history"), {
            userId: currentUser.uid,
            amount: parseInt(selectedPackSize || pricing.packSize),
            type: "purchase",
            courseKey,
            createdAt: serverTimestamp(),
          });
          if (totalTickets > 0) {
            await addDoc(collection(db, "credit_history"), {
              userId: currentUser.uid,
              amount: -totalTickets,
              type: "booking",
              courseKey,
              createdAt: serverTimestamp(),
            });
          }
        }
        navigate(
          `/success?code=${packCode}&remaining=${res.data.remainingCredits}`,
        );
      } else {
        const createCheckout = httpsCallable(functions, "createStripeCheckout");
        const getBaseUrl = () => {
          const origin = window.location.origin;
          return origin.includes("github.io")
            ? `${origin}/website-sinneskueche/`
            : `${origin}/`;
        };

        const result = await createCheckout({
          mode,
          packPrice:
            mode === "pack"
              ? parseFloat(selectedPackPrice)
              : parseFloat(pricing.priceFull),
          totalPrice: currentTotalPrice,
          packSize:
            mode === "pack"
              ? parseInt(selectedPackSize)
              : parseInt(pricing.packSize),
          coursePath,
          selectedDates: expandedDates,
          guestInfo: !currentUser ? guestInfo : null,
          currentLang,
          successUrl: `${getBaseUrl()}#/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        });
        if (result.data?.url) window.location.assign(result.data.url);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleBookWithCredits = async () => {
    setIsProcessing(true);
    try {
      const expandedDates = [];
      selectedDates.forEach((d) => {
        for (let i = 0; i < d.count; i++) {
          expandedDates.push({ id: d.id, date: d.date, time: d.time });
        }
      });

      const bookCall = httpsCallable(getFunctions(), "bookWithCredits");
      await bookCall({
        coursePath,
        selectedDates: expandedDates,
        currentLang,
      });

      await addDoc(collection(db, "credit_history"), {
        userId: currentUser.uid,
        amount: -totalTickets,
        type: "booking",
        courseKey,
        createdAt: serverTimestamp(),
      });
      navigate("/success");
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  if (loading)
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
    <div
      ref={scrollRef}
      style={{ ...S.outerWrapperStyle, position: "relative" }}
    >
      {isProcessing && (
        <div style={S.overlayStyle}>
          <Loader2 className="spinner" size={50} color="#caaff3" />
          <p style={{ marginTop: "1.5rem", fontWeight: "700" }}>
            {currentLang === "en" ? "Processing..." : "Verarbeitung..."}
          </p>
        </div>
      )}

      <div
        onClick={() => isMobile && setIsMobileExpanded(!isMobileExpanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: isMobile ? "pointer" : "default",
          borderBottom:
            isMobile && !isMobileExpanded
              ? "1px solid rgba(28,7,0,0.1)"
              : "none",
          paddingBottom: isMobile ? "1rem" : "0",
          marginBottom: isMobile ? "0" : "2rem",
        }}
      >
        <h2 style={{ ...S.overarchingTitleStyle(isMobile), margin: 0 }}>
          {currentLang === "en"
            ? "Available Dates & Session Packs"
            : "Verfügbare Termine & Kurspakete"}
        </h2>
        {isMobile &&
          (isMobileExpanded ? (
            <ChevronDown size={28} opacity={0.5} />
          ) : (
            <ChevronRight size={28} opacity={0.5} />
          ))}
      </div>

      <div
        style={{
          display: !isMobile || isMobileExpanded ? "flex" : "none",
          flexDirection: isMobile ? "column" : "row",
          gap: "2rem",
          marginTop: isMobile ? "2rem" : "0",
          animation: "fadeIn 0.5s ease-out",
          alignItems: "flex-start",
        }}
      >
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
              const isSelected =
                event && selectedDates.find((d) => d.id === event.id);
              return (
                <div
                  key={i}
                  // UPDATED: Removed !isBooked condition
                  onClick={() => event && !isFull && toggleDate(event)}
                  // UPDATED: Removed isBooked from disabled style logic
                  style={S.dayStyle(event, isSelected, isMobile, isFull)}
                >
                  {i + 1}
                  {event && !isFull && (
                    <div style={S.dotStyle(isSelected, isBooked)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <BookingSummary
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          eventBookingCounts={eventBookingCounts}
          totalPrice={currentTotalPrice}
          availableCredits={availableCredits}
          pricing={pricing}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          currentUser={currentUser}
          currentLang={currentLang}
          isMobile={isMobile}
          onBookCredits={handleBookWithCredits}
          onPayment={handlePayment}
          coursePath={coursePath} // Ensure this is passed
        />
      </div>
    </div>
  );
}
