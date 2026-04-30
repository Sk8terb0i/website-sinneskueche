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
  const [pricingMap, setPricingMap] = useState({}); // New State
  const [scheduleData, setScheduleData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [userBookedIds, setUserBookedIds] = useState([]);
  const [userCreditBookedIds, setUserCreditBookedIds] = useState([]);
  const [userBookedAddonIds, setUserBookedAddonIds] = useState([]);
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
  const [profileHistoryMap, setProfileHistoryMap] = useState({});

  useEffect(() => {
    if (forceExpand) {
      setIsMobileExpanded(true);
    }
  }, [forceExpand]);

  const balance = userData?.credits?.[getCreditKey(coursePath)] || 0;

  const profileBalances = {
    main: balance,
  };
  if (userData?.linkedProfiles) {
    userData.linkedProfiles.forEach((p) => {
      profileBalances[p.id] = p.credits?.[getCreditKey(coursePath)] || 0;
    });
  }
  // -----------------------------------------------------------

  // Thematic palettes: Purple, Olive Green, Sand/Gold, Blue, Rose
  const coursePalettes = [
    {
      base: "#9960a8",
      light: "rgba(153, 96, 168, 0.25)",
      addons: ["#7a4d86", "#b380c2", "#5c3a65"],
    },
    {
      base: "#4e5f28",
      light: "rgba(78, 95, 40, 0.25)",
      addons: ["#3e4c20", "#6b7d3f", "#2f3918"],
    },
    {
      base: "#d4a373",
      light: "rgba(212, 163, 115, 0.3)",
      addons: ["#b58455", "#e3bc98", "#8f6640"],
    },
    {
      base: "#457b9d",
      light: "rgba(69, 123, 157, 0.25)",
      addons: ["#37627d", "#6a9ab8", "#294a5e"],
    },
    {
      base: "#e5989b",
      light: "rgba(229, 152, 155, 0.3)",
      addons: ["#b87a7c", "#eeafb2", "#895b5d"],
    },
  ];

  const getCoursePalette = (courseLink) => {
    const keys = Object.keys(pricingMap).sort();
    const idx = keys.indexOf(courseLink);
    return idx !== -1
      ? coursePalettes[idx % coursePalettes.length]
      : coursePalettes[0];
  };

  const getAddonColor = (addonId, courseLink) => {
    const palette = getCoursePalette(courseLink);
    const pData = pricingMap[courseLink];
    const aIdx =
      pData?.specialEvents?.findIndex((se) => se.id === addonId) ?? -1;
    return aIdx !== -1 ? palette.addons[aIdx % palette.addons.length] : "#ccc";
  };

  const getProfileHistory = (pid) => {
    if (!pid || pid === "guest") return [];
    let completed = [];
    if (pid === "main") {
      completed = userData?.completedAddons || [];
    } else {
      const linked = userData?.linkedProfiles?.find((p) => p.id === pid);
      completed = linked?.completedAddons || [];
    }
    const alreadyBooked = profileHistoryMap?.[pid]?.addons || [];
    return [...new Set([...completed, ...alreadyBooked])];
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const docId = coursePath.replace(/\//g, "");
      try {
        const cgSnap = await getDoc(doc(db, "calendar_groups", docId));
        let includedLinks = [coursePath];
        if (cgSnap.exists() && cgSnap.data().includedLinks?.length > 0) {
          includedLinks = cgSnap.data().includedLinks;
        }

        const [pMapData, eSnap] = await Promise.all([
          Promise.all(
            includedLinks.map(async (link) => {
              const lId = link.replace(/\//g, "");
              const snap = await getDoc(doc(db, "course_settings", lId));
              return { link, data: snap.exists() ? snap.data() : null };
            }),
          ),
          getDocs(query(collection(db, "events"), orderBy("date", "asc"))),
        ]);

        const pricingMapObj = {};
        pMapData.forEach((p) => {
          if (p.data) pricingMapObj[p.link] = p.data;
        });

        if (isMounted) {
          setPricingMap(pricingMapObj);
          setPricing(pricingMapObj[coursePath]);
        }

        const filtered = eSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((ev) => includedLinks.includes(ev.link));

        if (isMounted) {
          setAvailableDates(filtered);
          if (filtered.length > 0) {
            setCurrentViewDate(
              new Date(
                new Date(filtered[0].date).getFullYear(),
                new Date(filtered[0].date).getMonth(),
                1,
              ),
            );
          }
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
                const id = typeof aid === "object" ? aid.id : aid;
                const time = typeof aid === "object" ? aid.time : null;
                const k = time
                  ? `${data.eventId}_${id}_${time}`
                  : `${data.eventId}_${id}`;
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
          // Only log if it's NOT a permission error (which is expected for guests)
          if (reqErr.code !== "permission-denied") {
            console.warn("Error fetching requests:", reqErr);
          }
        }
        if (currentUser && isMounted) {
          const uSnap = await getDocs(
            query(
              collection(db, "bookings"),
              where("userId", "==", currentUser.uid),
            ),
          );
          const allUserBookings = uSnap.docs.map((d) => d.data());

          // 1. Define variables clearly before using them
          const profileBookedMap = {};
          const allAddonIds = allUserBookings.flatMap((b) =>
            (b.selectedAddons || []).map((a) =>
              typeof a === "object" ? a.id : a,
            ),
          );

          allUserBookings.forEach((b) => {
            const pid = b.profileId || "main";
            if (!profileBookedMap[pid])
              profileBookedMap[pid] = { courses: [], addons: [] };

            profileBookedMap[pid].courses.push(b.coursePath);

            const addons = (b.selectedAddons || []).map((a) =>
              typeof a === "object" ? a.id : a,
            );
            profileBookedMap[pid].addons.push(...addons);
          });

          // 2. Set the state variables
          setProfileHistoryMap(profileBookedMap);
          setUserBookedAddonIds(allAddonIds);

          // Keep these for existing legacy logic if needed
          setHasBookedBefore(
            allUserBookings.some((b) => b.coursePath === coursePath),
          );
          setUserBookedIds(allUserBookings.map((b) => b.eventId));
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
        (d.attendees || []).map((att, idx) => ({
          id: d.id,
          date: d.date,
          time: d.time,
          attendeeName:
            att.name || (idx === 0 ? "Primary Booker" : `Guest ${idx + 1}`),
          profileId: att.profileId || null,
          selectedAddons: att.selectedAddons || [], // <-- Now pulls from attendee
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
        (d.attendees || []).map((att, idx) => ({
          id: d.id,
          date: d.date,
          time: d.time,
          attendeeName:
            att.name || (idx === 0 ? "Primary Booker" : `Guest ${idx + 1}`),
          profileId: att.profileId || null,
          selectedAddons: att.selectedAddons || [], // <-- Now pulls from attendee
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
        (d.attendees || []).map((att, idx) => ({
          id: d.id,
          date: d.date,
          time: d.time,
          attendeeName:
            att.name || (idx === 0 ? "Primary Booker" : `Guest ${idx + 1}`),
          profileId: att.profileId || null,
          selectedAddons: att.selectedAddons || [], // <-- Now pulls from attendee
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

              const evPricing = realEvent
                ? pricingMap[realEvent.link]
                : pricing;

              // 3. Determine if the date is full
              const isRealEventFull =
                realEvent &&
                evPricing?.hasCapacity &&
                (eventBookingCounts[realEvent.id] || 0) >=
                  parseInt(evPricing.capacity);
              const isRequestedByOther = requestedDates.includes(dateStr);
              const isFull = isRealEventFull || isRequestedByOther;

              // 4. Create a "Virtual Event" if we are in Request Mode and the date is valid
              let event = realEvent;
              if (evPricing?.isRequestOnly && !realEvent && !isPast) {
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

              const rawAddons =
                event && scheduleData?.specialAssignments
                  ? scheduleData.specialAssignments[event.id]
                  : [];

              const activeAddons = Array.isArray(rawAddons)
                ? rawAddons
                : rawAddons
                  ? [rawAddons]
                  : [];

              const palette = getCoursePalette(event?.link || coursePath);

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!event || isFull || isPast) return; // Prevent clicking invalid dates
                    setSelectedDates((prev) => {
                      if (prev.find((x) => x.id === event.id)) {
                        return prev.filter((x) => x.id !== event.id);
                      } else {
                        // Determine the initial name for the first ticket
                        const initialName = currentUser
                          ? `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
                          : `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
                        let autoAddons = [];
                        let hasMandatoryInCart = prev.some((d) =>
                          d.selectedAddons?.some((aid) => {
                            const idToCheck =
                              typeof aid === "string" ? aid : aid.id;
                            const def = pricing?.specialEvents?.find(
                              (se) => se.id === idToCheck,
                            );
                            return def?.isMandatory;
                          }),
                        );

                        if (!currentUser || !hasBookedBefore) {
                          activeAddons.forEach((aid) => {
                            const def = evPricing?.specialEvents?.find(
                              (se) => se.id === aid,
                            );

                            // UPDATED: Check if completed in profile OR already booked for the future
                            const isAlreadyDone =
                              userData?.completedAddons?.includes(aid) ||
                              userBookedAddonIds.includes(aid);

                            if (
                              def?.isMandatory &&
                              !hasMandatoryInCart &&
                              !isAlreadyDone
                            ) {
                              if (def.timeSlots && def.timeSlots.length > 0) {
                                autoAddons.push({
                                  id: aid,
                                  time: `${def.timeSlots[0].startTime}-${def.timeSlots[0].endTime}`,
                                });
                              } else {
                                autoAddons.push(aid);
                              }
                              hasMandatoryInCart = true;
                            }
                          });
                        }
                        return [
                          ...prev,
                          {
                            ...event,
                            count: 1,
                            attendees: [
                              {
                                profileId: currentUser ? "main" : null,
                                name: initialName || "",
                                selectedAddons: (() => {
                                  let auto = [];
                                  // Use our new helper to check the "main" user's history
                                  const history = getProfileHistory("main");

                                  activeAddons.forEach((aid) => {
                                    const def = evPricing?.specialEvents?.find(
                                      (se) => se.id === aid,
                                    );

                                    // Check if THIS specific person needs this mandatory addon
                                    const isAlreadyDone = history.includes(aid);

                                    if (def?.isMandatory && !isAlreadyDone) {
                                      if (def.timeSlots?.length > 0) {
                                        auto.push({
                                          id: aid,
                                          time: `${def.timeSlots[0].startTime}-${def.timeSlots[0].endTime}`,
                                        });
                                      } else {
                                        auto.push(aid);
                                      }
                                    }
                                  });
                                  return auto;
                                })(),
                              },
                            ],
                          },
                        ];
                      }
                    });
                  }}
                  style={{
                    ...S.dayStyle(
                      !!event,
                      !!isSelected,
                      isMobile,
                      isFull || isPast,
                    ),
                    backgroundColor:
                      isFull || isPast
                        ? "rgba(0,0,0,0.05)"
                        : isSelected
                          ? palette.base
                          : event
                            ? palette.light
                            : "transparent",
                    color:
                      isFull || isPast
                        ? "#ccc"
                        : isSelected
                          ? "#fffce3"
                          : "#1c0700",
                  }}
                >
                  {activeAddons.length > 0 && (
                    <div style={S.addonArcContainerStyle}>
                      {activeAddons
                        .filter(
                          (id) => !userData?.completedAddons?.includes(id),
                        )
                        .map((id, idx, filteredArray) => (
                          <div
                            key={idx}
                            style={S.addonDotStyle(
                              getAddonColor(id, event.link),
                              Math.pow(
                                Math.abs(idx - (filteredArray.length - 1) / 2),
                                2,
                              ) * 3,
                            )}
                          />
                        ))}
                    </div>
                  )}
                  {i + 1}
                  {event && !event.isVirtual && !isFull && (
                    <div
                      style={{
                        ...S.dotStyle(
                          !!isSelected,
                          userBookedIds.includes(event.id),
                          isMobile,
                        ),
                        backgroundColor: userBookedIds.includes(event.id)
                          ? "#ccc"
                          : isSelected
                            ? "#fffce3"
                            : palette.base,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              ...S.legendWrapperStyle(isMobile),
              alignItems: "flex-start",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                width: "100%",
              }}
            >
              {Object.keys(pricingMap)
                .sort((a, b) =>
                  a === coursePath
                    ? -1
                    : b === coursePath
                      ? 1
                      : a.localeCompare(b),
                )
                .map((link) => {
                  const pData = pricingMap[link];
                  const palette = getCoursePalette(link);
                  const validAddons =
                    pData.specialEvents?.filter(
                      (se) => !userData?.completedAddons?.includes(se.id),
                    ) || [];

                  const matchingEvent = availableDates.find(
                    (e) => e.link === link,
                  );
                  const title = matchingEvent?.title
                    ? typeof matchingEvent.title === "object"
                      ? matchingEvent.title[currentLang || "en"]
                      : matchingEvent.title
                    : pData.courseName || link.replace(/\//g, "");

                  return (
                    <div
                      key={link}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          color: palette.base,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "12px",
                          rowGap: "8px",
                        }}
                      >
                        <div style={S.legendItemStyle(isMobile)}>
                          <div
                            style={S.legendIndicatorStyle(
                              palette.light,
                              isMobile,
                            )}
                          />
                          {currentLang === "de" ? "Verfügbar" : "Available"}
                        </div>
                        {/* Removed the "Selected" legend item here */}
                        {validAddons.map((se) => (
                          <div key={se.id} style={S.legendItemStyle(isMobile)}>
                            <div
                              style={S.legendIndicatorStyle(
                                getAddonColor(se.id, link),
                                isMobile,
                              )}
                            />
                            {currentLang === "en" ? se.nameEn : se.nameDe}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
        <BookingSummary
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          eventBookingCounts={eventBookingCounts}
          totalPrice={selectedDates.length * (pricing?.priceSingle || 0)}
          availableCredits={balance}
          profileBalances={profileBalances}
          profileHistoryMap={profileHistoryMap}
          pricing={pricing}
          pricingMap={pricingMap}
          scheduleData={scheduleData}
          addonBookingCounts={addonBookingCounts}
          guestInfo={guestInfo}
          setGuestInfo={setGuestInfo}
          currentUser={currentUser}
          userData={userData}
          currentLang={currentLang}
          isMobile={isMobile}
          onBookCredits={handleBookWithCredits}
          onPayment={handlePayment}
          onRequestSubmit={handleRequestSubmit}
          coursePath={coursePath}
          userBookedIds={userBookedIds}
          userCreditBookedIds={userCreditBookedIds}
          hasBookedBefore={hasBookedBefore}
          getAddonColor={getAddonColor}
        />
      </div>
    </div>
  );
}
