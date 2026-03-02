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
  const [scheduleData, setScheduleData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [userBookedIds, setUserBookedIds] = useState([]);
  const [eventBookingCounts, setEventBookingCounts] = useState({});
  const [addonBookingCounts, setAddonBookingCounts] = useState({});
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

  const addonColors = [
    "#9960a8",
    "#4e5f28",
    "#f39c12",
    "#e74c3c",
    "#3498db",
    "#1abc9c",
  ];

  const getAddonColor = (addonId) => {
    if (!pricing?.specialEvents) return "#ccc";
    const index = pricing.specialEvents.findIndex((se) => se.id === addonId);
    return index !== -1 ? addonColors[index % addonColors.length] : "#ccc";
  };

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

        const scheduleSnap = await getDoc(doc(db, "schedules", docId));
        if (scheduleSnap.exists() && isMounted)
          setScheduleData(scheduleSnap.data());

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
        const addonCounts = {};
        globalBSnap.docs.forEach((d) => {
          const bData = d.data();
          counts[bData.eventId] = (counts[bData.eventId] || 0) + 1;
          if (bData.selectedAddons && Array.isArray(bData.selectedAddons)) {
            bData.selectedAddons.forEach((addonId) => {
              const key = `${bData.eventId}_${addonId}`;
              addonCounts[key] = (addonCounts[key] || 0) + 1;
            });
          }
        });
        if (isMounted) {
          setEventBookingCounts(counts);
          setAddonBookingCounts(addonCounts);
        }

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
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [coursePath, currentUser]);

  const toggleDate = (event) => {
    const isFull =
      pricing?.hasCapacity &&
      (eventBookingCounts[event.id] || 0) >= parseInt(pricing.capacity);
    if (isFull) return;
    setSelectedDates((prev) => {
      const existing = prev.find((d) => d.id === event.id);
      return existing
        ? prev.filter((d) => d.id !== event.id)
        : [...prev, { ...event, count: 1, selectedAddons: [] }];
    });
  };

  const handlePayment = async (
    mode,
    packCode = null,
    selectedPackSize = null,
    selectedPackPrice = null,
  ) => {
    setIsProcessing(true);
    try {
      const expandedDates = [];
      selectedDates.forEach((d) => {
        for (let i = 0; i < d.count; i++) {
          expandedDates.push({
            id: d.id,
            date: d.date,
            time: d.time,
            selectedAddons: d.selectedAddons || [],
          });
        }
      });
      const functions = getFunctions();
      if (mode === "redeem") {
        const redeemPack = httpsCallable(functions, "redeemPackCode");
        const res = await redeemPack({
          coursePath,
          selectedDates: expandedDates,
          packCode,
          guestInfo: !currentUser ? guestInfo : null,
          currentLang,
        });
        navigate(
          `/success?code=${packCode}&remaining=${res.data.remainingCredits}`,
        );
      } else {
        const createCheckout = httpsCallable(functions, "createStripeCheckout");
        const result = await createCheckout({
          mode,
          packPrice: parseFloat(selectedPackPrice),
          totalPrice:
            selectedDates.reduce((s, d) => s + (d.count || 1), 0) *
            parseFloat(pricing?.priceSingle || 0),
          packSize: parseInt(selectedPackSize),
          coursePath,
          selectedDates: expandedDates,
          guestInfo: !currentUser ? guestInfo : null,
          currentLang,
          successUrl: `${window.location.origin}/#/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        });
        if (result.data?.url) window.location.assign(result.data.url);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

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
          <div style={{ textAlign: "center" }}>
            <Loader2 className="spinner" size={50} color="#caaff3" />
            <p
              style={{
                marginTop: "1.5rem",
                fontWeight: "700",
                color: "#fdf8e1",
              }}
            >
              {currentLang === "en" ? "Processing..." : "Verarbeitung..."}
            </p>
          </div>
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
        <h2 style={S.overarchingTitleStyle(isMobile)}>
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
          alignItems: isMobile ? "stretch" : "flex-start",
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

              const rawAddons = scheduleData?.specialAssignments?.[event?.id];
              const activeAddons = Array.isArray(rawAddons)
                ? rawAddons
                : rawAddons
                  ? [rawAddons]
                  : [];

              return (
                <div
                  key={i}
                  onClick={() => event && !isFull && toggleDate(event)}
                  style={S.dayStyle(event, isSelected, isMobile, isFull)}
                >
                  {activeAddons.length > 0 && (
                    <div style={S.addonArcContainerStyle}>
                      {activeAddons.map((id, idx) => {
                        const mid = (activeAddons.length - 1) / 2;
                        const offset = Math.pow(Math.abs(idx - mid), 2) * 3;
                        return (
                          <div
                            key={id}
                            style={S.addonDotStyle(getAddonColor(id), -offset)}
                          />
                        );
                      })}
                    </div>
                  )}
                  {i + 1}
                  {event && !isFull && (
                    <div style={S.dotStyle(isSelected, isBooked, isMobile)} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={S.legendWrapperStyle(isMobile)}>
            {/* Status Row: Available / Selected / Full sitting close together */}
            <div style={S.legendStatusRowStyle(isMobile)}>
              <div style={S.legendItemStyle(isMobile)}>
                <div
                  style={S.legendIndicatorStyle(
                    "rgba(202, 175, 243, 0.4)",
                    isMobile,
                  )}
                />
                {currentLang === "en" ? "Available" : "Verfügbar"}
              </div>

              <div style={S.legendItemStyle(isMobile)}>
                <div style={S.legendIndicatorStyle("#caaff3", isMobile)} />
                {currentLang === "en" ? "Selected" : "Ausgewählt"}
              </div>

              <div style={S.legendItemStyle(isMobile)}>
                <div
                  style={S.legendIndicatorStyle("rgba(0,0,0,0.05)", isMobile)}
                />
                {currentLang === "en" ? "Full" : "Voll"}
              </div>
            </div>

            {/* Special Add-on Events Flowing Below with tighter spacing */}
            {pricing?.specialEvents && pricing.specialEvents.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: isMobile ? "0.6rem 12px" : "1rem 2rem",
                }}
              >
                {pricing.specialEvents.map((se) => (
                  <div key={se.id} style={S.legendItemStyle(isMobile)}>
                    <div
                      style={S.legendIndicatorStyle(
                        getAddonColor(se.id),
                        isMobile,
                      )}
                    />
                    {currentLang === "en" ? se.nameEn : se.nameDe}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <BookingSummary
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          eventBookingCounts={eventBookingCounts}
          totalPrice={
            selectedDates.reduce((s, d) => s + (d.count || 1), 0) *
            parseFloat(pricing?.priceSingle || 0)
          }
          availableCredits={userData?.credits?.[coursePath] || 0}
          pricing={pricing}
          scheduleData={scheduleData}
          addonBookingCounts={addonBookingCounts}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          currentUser={currentUser}
          currentLang={currentLang}
          isMobile={isMobile}
          coursePath={coursePath}
          onPayment={handlePayment}
        />
      </div>
    </div>
  );
}
