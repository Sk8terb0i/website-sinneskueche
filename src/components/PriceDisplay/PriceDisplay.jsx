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
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import { ChevronLeft, ChevronRight, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import BookingSummary from "./BookingSummary";
import * as S from "./PriceDisplayStyles";

const courseMapping = {
  "/pottery": "pottery tuesdays",
  "/artistic-vision": "artistic vision",
  "/get-ink": "get ink!",
  "/singing": "vocal coaching",
  "/extended-voice-lab": "extended voice lab",
  "/performing-words": "performing words",
  "/singing-basics": "singing basics weekend",
};
const getCreditKey = (path) =>
  courseMapping[path] || (path ? path.replace(/\//g, "") : "workshop");

export default function PriceDisplay({ coursePath, currentLang, forceExpand }) {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [userBookedIds, setUserBookedIds] = useState([]);
  const [userCreditBookedIds, setUserCreditBookedIds] = useState([]);
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
  const [hasBookedBefore, setHasBookedBefore] = useState(false);
  const [requestedDates, setRequestedDates] = useState([]);

  useEffect(() => {
    if (forceExpand) {
      setIsMobileExpanded(true);
    }
  }, [forceExpand]);

  const balance = userData?.credits?.[getCreditKey(coursePath)] || 0;
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
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const docId = coursePath.replace(/\//g, "");
      try {
        const [pSnap, eSnap] = await Promise.all([
          getDoc(doc(db, "course_settings", docId)),
          getDocs(query(collection(db, "events"), orderBy("date", "asc"))),
        ]);
        if (pSnap.exists() && isMounted) setPricing(pSnap.data());
        const filtered = eSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((ev) => ev.link === coursePath);
        if (isMounted) {
          setAvailableDates(filtered);
          if (filtered.length > 0)
            setCurrentViewDate(
              new Date(
                new Date(filtered[0].date).getFullYear(),
                new Date(filtered[0].date).getMonth(),
                1,
              ),
            );
        }
        try {
          const sSnap = await getDoc(doc(db, "schedules", docId));
          if (sSnap.exists() && isMounted) setScheduleData(sSnap.data());
          const bSnap = await getDocs(
            query(
              collection(db, "bookings"),
              where("coursePath", "==", coursePath),
            ),
          );
          const c = {};
          const ac = {};
          bSnap.docs.forEach((d) => {
            const data = d.data();
            c[data.eventId] = (c[data.eventId] || 0) + 1;
            if (data.selectedAddons)
              data.selectedAddons.forEach((aid) => {
                const k = `${data.eventId}_${aid}`;
                ac[k] = (ac[k] || 0) + 1;
              });
          });
          if (isMounted) {
            setEventBookingCounts(c);
            setAddonBookingCounts(ac);
          }
        } catch (sub) {
          console.warn(sub);
        }
        try {
          const reqSnap = await getDocs(
            query(
              collection(db, "requests"),
              where("coursePath", "==", coursePath),
            ),
          );
          const rDates = reqSnap.docs.flatMap((d) => {
            const data = d.data();
            if (data.status !== "rejected" && data.status !== "cancelled") {
              return (data.selectedDates || []).map((sd) => sd.date);
            }
            return [];
          });
          if (isMounted) setRequestedDates(rDates);
        } catch (reqErr) {
          console.warn("Error fetching requests:", reqErr);
        }
        if (currentUser && isMounted) {
          const uSnap = await getDocs(
            query(
              collection(db, "bookings"),
              where("userId", "==", currentUser.uid),
            ),
          );
          const allUserBookings = uSnap.docs.map((d) => d.data());

          setHasBookedBefore(
            allUserBookings.some((b) => b.coursePath === coursePath),
          );
          setUserBookedIds(allUserBookings.map((b) => b.eventId));
          // Filter out ONLY the bookings made with credits
          setUserCreditBookedIds(
            allUserBookings
              .filter((b) => b.usedCredit === true)
              .map((b) => b.eventId),
          );
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

  const handleBookWithCredits = async () => {
    setIsProcessing(true);
    try {
      const expandedDates = selectedDates.flatMap((d) =>
        Array(d.count || 1)
          .fill(null)
          .map(() => ({
            id: d.id,
            date: d.date,
            time: d.time,
            selectedAddons: d.selectedAddons || [],
          })),
      );
      const functions = getFunctions();
      const bookCredits = httpsCallable(functions, "bookWithCredits");

      const baseUrl = window.location.origin;

      await bookCredits({
        coursePath,
        selectedDates: expandedDates,
        currentLang,
        baseUrl, // PASS TO BACKEND
      });
      // Credits always mean dates were booked
      navigate("/success?type=credit&booked=true");
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handlePayment = async (mode, code, size, price, creditsToUse = 0) => {
    setIsProcessing(true);
    try {
      const expandedDates = selectedDates.flatMap((d) =>
        Array(d.count || 1)
          .fill(null)
          .map(() => ({
            id: d.id,
            date: d.date,
            time: d.time,
            selectedAddons: d.selectedAddons || [],
          })),
      );
      const functions = getFunctions();
      const baseUrl = window.location.origin;

      // INTERCEPT REDEEM MODE AND ROUTE TO CORRECT BACKEND FUNCTION
      if (mode === "redeem") {
        const redeemPack = httpsCallable(functions, "redeemPackCode");
        await redeemPack({
          coursePath,
          selectedDates: expandedDates,
          packCode: code,
          guestInfo: !currentUser ? guestInfo : null,
          currentLang,
          baseUrl, // PASS TO BACKEND
        });
        // Redeeming a code always involves booking a date
        navigate(`/success?type=credit&mode=redeem&code=${code}&booked=true`);
        setIsProcessing(false);
        return;
      }

      const bookedStatus = expandedDates.length > 0 ? "true" : "false";

      const stripe = httpsCallable(functions, "createStripeCheckout");
      const res = await stripe({
        mode,
        packPrice: mode === "pack" ? price || 0 : 0,
        totalPrice: mode !== "pack" ? price || 0 : 0, // MAPS CALCULATED CASH TOTAL FROM BOOKINGSUMMARY
        packSize: size || 0,
        coursePath,
        selectedDates: expandedDates,
        guestInfo: !currentUser ? guestInfo : null,
        currentLang,
        creditsToUse,
        baseUrl, // PASS TO BACKEND
        successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&mode=${mode}&booked=${bookedStatus}`,
        cancelUrl: window.location.href,
      });
      if (res.data?.url) window.location.assign(res.data.url);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleRequestSubmit = async () => {
    setIsProcessing(true);
    try {
      const expandedDates = selectedDates.flatMap((d) =>
        Array(d.count || 1)
          .fill(null)
          .map(() => ({
            id: d.id,
            date: d.date,
            time: d.time,
            selectedAddons: d.selectedAddons || [],
          })),
      );

      // Call a new Firebase Function (e.g., 'submitAvailabilityRequest')
      // OR write directly to a 'requests' Firestore collection here.
      const functions = getFunctions();
      const submitRequest = httpsCallable(
        functions,
        "submitAvailabilityRequest",
      );

      await submitRequest({
        coursePath,
        selectedDates: expandedDates,
        guestInfo: !currentUser ? guestInfo : null,
        currentLang,
      });

      // Navigate to a custom success page for requests
      navigate("/success?type=request&status=submitted");
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  const monthName = currentViewDate.toLocaleString(
    currentLang === "en" ? "en-US" : "de-DE",
    { month: "long" },
  );

  return (
    <div style={{ ...S.outerWrapperStyle, position: "relative" }}>
      {isProcessing && (
        <div style={S.overlayStyle}>
          <div style={{ textAlign: "center" }}>
            <Loader2 className="spinner" size={50} color="#caaff3" />
            <p
              style={{ marginTop: "1.5rem", color: "#fff", fontWeight: "700" }}
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
          marginBottom: isMobile ? "1.5rem" : "2.5rem", // slightly tighter on mobile

          // --- NEW: Mobile Tab Styling ---
          ...(isMobile && {
            backgroundColor: isMobileExpanded
              ? "transparent"
              : "rgba(202, 175, 243, 0.15)",
            padding: isMobileExpanded ? "0" : "0.8rem 0.8rem",
            borderRadius: "16px",
            border: isMobileExpanded
              ? "1px solid transparent"
              : "1px solid rgba(202, 175, 243, 0.3)",
            transition: "all 0.3s ease",
          }),
        }}
      >
        <h2 style={S.overarchingTitleStyle(isMobile)}>
          {isMobile
            ? currentLang === "en"
              ? "Available Dates & Packs"
              : "Termine & Kurspakete"
            : currentLang === "en"
              ? "Available Dates & Session Packs"
              : "Termine & Kurspakete"}
        </h2>
        {isMobile &&
          (isMobileExpanded ? (
            <ChevronDown size={28} color="#9960a8" />
          ) : (
            <ChevronRight size={28} color="#9960a8" />
          ))}
      </div>
      <div
        style={{
          display: !isMobile || isMobileExpanded ? "flex" : "none",
          flexDirection: isMobile ? "column" : "row",
          gap: "2rem",
        }}
      >
        <div style={S.calendarCardStyle(isMobile, selectedDates.length > 0)}>
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
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={S.dayOfWeekStyle(isMobile)}>
                {d}
              </div>
            ))}
            {[...Array(new Date(year, month, 1).getDay())].map((_, i) => (
              <div key={i} />
            ))}
            {[...Array(new Date(year, month + 1, 0).getDate())].map((_, i) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;

              // 1. Find if an actual admin-created event exists here
              const realEvent = availableDates.find((e) => e.date === dateStr);

              // 2. Check if the date is in the past
              const cellDate = new Date(year, month, i + 1);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = cellDate < today;

              // 3. Determine if the date is full (either via real bookings, or pending requests)
              const isRealEventFull =
                realEvent &&
                pricing?.hasCapacity &&
                (eventBookingCounts[realEvent.id] || 0) >=
                  parseInt(pricing.capacity);
              const isRequestedByOther = requestedDates.includes(dateStr);
              const isFull = isRealEventFull || isRequestedByOther;

              // 4. Create a "Virtual Event" if we are in Request Mode and the date is valid
              let event = realEvent;
              if (pricing?.isRequestOnly && !realEvent && !isPast) {
                event = {
                  id: `request_${dateStr}`,
                  date: dateStr,
                  time: "To be agreed", // Placeholder time for requests
                  isVirtual: true, // Flag so we don't show the purple dot
                };
              }

              // Ensure past dates without real events are completely unclickable
              if (isPast && !realEvent) {
                event = null;
              }

              const isSelected = selectedDates.find((d) => d.id === event?.id);

              const rawAddons = scheduleData?.specialAssignments?.[event?.id];
              const activeAddons = Array.isArray(rawAddons)
                ? rawAddons
                : rawAddons
                  ? [rawAddons]
                  : [];

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!event || isFull || isPast) return; // Prevent clicking invalid dates
                    setSelectedDates((prev) => {
                      if (prev.find((x) => x.id === event.id)) {
                        return prev.filter((x) => x.id !== event.id);
                      } else {
                        let autoAddons = [];
                        let hasMandatoryInCart = prev.some((d) =>
                          d.selectedAddons?.some((aid) => {
                            const def = pricing?.specialEvents?.find(
                              (se) => se.id === aid,
                            );
                            return def?.isMandatory;
                          }),
                        );

                        if (!currentUser || !hasBookedBefore) {
                          activeAddons.forEach((aid) => {
                            const def = pricing?.specialEvents?.find(
                              (se) => se.id === aid,
                            );
                            if (def?.isMandatory && !hasMandatoryInCart) {
                              autoAddons.push(aid);
                              hasMandatoryInCart = true;
                            }
                          });
                        }
                        return [
                          ...prev,
                          { ...event, count: 1, selectedAddons: autoAddons },
                        ];
                      }
                    });
                  }}
                  style={S.dayStyle(!!event, !!isSelected, isMobile, isFull)}
                >
                  {activeAddons.length > 0 && (
                    <div style={S.addonArcContainerStyle}>
                      {activeAddons.map((id, idx) => (
                        <div
                          key={idx}
                          style={S.addonDotStyle(
                            getAddonColor(id),
                            Math.pow(
                              Math.abs(idx - (activeAddons.length - 1) / 2),
                              2,
                            ) * 3,
                          )}
                        />
                      ))}
                    </div>
                  )}
                  {i + 1}
                  {/* Only show the purple dot if it's a REAL scheduled event, not a virtual request date */}
                  {event && !event.isVirtual && !isFull && (
                    <div
                      style={S.dotStyle(
                        !!isSelected,
                        userBookedIds.includes(event.id),
                        isMobile,
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div style={S.legendWrapperStyle(isMobile)}>
            <div style={S.legendStatusRowStyle(isMobile)}>
              <div style={S.legendItemStyle(isMobile)}>
                <div
                  style={S.legendIndicatorStyle(
                    "rgba(202, 175, 243, 0.4)",
                    isMobile,
                  )}
                />
                Available
              </div>
              <div style={S.legendItemStyle(isMobile)}>
                <div style={S.legendIndicatorStyle("#caaff3", isMobile)} />
                Selected
              </div>
              <div style={S.legendItemStyle(isMobile)}>
                <div
                  style={S.legendIndicatorStyle("rgba(0,0,0,0.05)", isMobile)}
                />
                Full
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {pricing?.specialEvents?.map((se) => (
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
          </div>
        </div>
        <BookingSummary
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          eventBookingCounts={eventBookingCounts}
          totalPrice={selectedDates.length * (pricing?.priceSingle || 0)}
          availableCredits={balance}
          pricing={pricing}
          scheduleData={scheduleData}
          addonBookingCounts={addonBookingCounts}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          currentUser={currentUser}
          currentLang={currentLang}
          isMobile={isMobile}
          onBookCredits={handleBookWithCredits}
          onPayment={handlePayment}
          onRequestSubmit={handleRequestSubmit}
          coursePath={coursePath}
          userBookedIds={userBookedIds}
          userCreditBookedIds={userCreditBookedIds}
          hasBookedBefore={hasBookedBefore}
        />
      </div>
    </div>
  );
}
