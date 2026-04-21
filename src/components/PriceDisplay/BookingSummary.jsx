import React, { useState, useEffect } from "react";
import {
  Ticket,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  Check,
  FileText,
  X,
  AlertCircle,
  Star,
  Clock,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import * as S from "./PriceDisplayStyles";

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const timesOverlap = (timeA, timeB) => {
  if (!timeA || !timeB) return false;
  // Assumes format "HH:mm-HH:mm"
  const [startA, endA] = timeA.split("-").map(parseTime);
  const [startB, endB] = timeB.split("-").map(parseTime);
  return startA < endB && startB < endA;
};

export default function BookingSummary({
  selectedDates,
  setSelectedDates,
  eventBookingCounts,
  totalPrice,
  availableCredits,
  pricing,
  scheduleData,
  addonBookingCounts,
  guestInfo,
  setGuestInfo,
  currentUser,
  userData,
  currentLang,
  isMobile,
  onBookCredits,
  onPayment,
  onRequestSubmit,
  coursePath,
  userBookedIds = [],
  userCreditBookedIds = [],
  hasBookedBefore = false,
}) {
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
  const [uncheckWarning, setUncheckWarning] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [showStripeAlternative, setShowStripeAlternative] = useState(false);

  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [activePromo, setActivePromo] = useState(null);
  const [activePackCode, setActivePackCode] = useState(null);
  const [codeStatus, setCodeStatus] = useState({ loading: false, error: "" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedPackIndex, setSelectedPackIndex] = useState(null);

  const [courseTerms, setCourseTerms] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [shakeTerms, setShakeTerms] = useState(false);

  const [manuallyExpandedDates, setManuallyExpandedDates] = useState({});
  const [showPackInfo, setShowPackInfo] = useState(false);

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
    const currentName = currentUser
      ? `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
      : `${guestInfo.firstName} ${guestInfo.lastName}`.trim();

    if (currentName) {
      setSelectedDates((prev) =>
        prev.map((date) => {
          const newNames = [...date.names];
          // Sync the first name if it matches the generic first-ticket name or is empty
          if (!newNames[0] || newNames[0] === "Primary Booker") {
            newNames[0] = currentName;
            return { ...date, names: newNames };
          }
          return date;
        }),
      );
    }
  }, [guestInfo.firstName, guestInfo.lastName, currentUser, userData]);

  useEffect(() => {
    const fetchTerms = async () => {
      const sanitizedId = coursePath.replace(/\//g, "");
      try {
        const docRef = doc(db, "course_terms", sanitizedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCourseTerms(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching terms:", err);
      }
    };
    if (coursePath) fetchTerms();
  }, [coursePath]);

  // --- NEW: CART CLEANER ---
  // If the user's completed status changes, remove those addons from the current selection
  // to prevent hidden time conflicts or double-booking.
  useEffect(() => {
    if (userData?.completedAddons?.length > 0 && selectedDates.length > 0) {
      setSelectedDates((prev) =>
        prev.map((date) => ({
          ...date,
          selectedAddons: (date.selectedAddons || []).filter((a) => {
            const addonId = typeof a === "string" ? a : a.id;
            return !userData.completedAddons.includes(addonId);
          }),
        })),
      );
    }
  }, [userData?.completedAddons, setSelectedDates]);

  const validateAndProceed = (actionFn) => {
    if (courseTerms && !agreedToTerms) {
      setShakeTerms(true);
      setTimeout(() => setShakeTerms(false), 500);
      return;
    }
    actionFn();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  };

  const toggleAddon = (eventId, addon, isMandatory, selectedTime = null) => {
    const dateObj = selectedDates.find((d) => d.id === eventId);

    // Check if the specific addon/time is currently selected
    const isSelected = dateObj?.selectedAddons?.some((a) =>
      typeof a === "string"
        ? a === addon.id
        : a.id === addon.id && (!selectedTime || a.time === selectedTime),
    );

    // --- CASE A: SELECTING (Adding an add-on) ---
    if (!isSelected) {
      // 1. Check for Time Conflicts
      if (selectedTime) {
        const conflict = dateObj?.selectedAddons?.find((a) => {
          // SAFETY: Ignore completed addons in conflict check
          const addonId = typeof a === "string" ? a : a.id;
          if (userData?.completedAddons?.includes(addonId)) return false;

          const existingTime = typeof a === "object" ? a.time : null;
          return existingTime && timesOverlap(selectedTime, existingTime);
        });

        if (conflict) {
          const conflictingAddon = pricing?.specialEvents?.find(
            (se) =>
              se.id === (typeof conflict === "string" ? conflict : conflict.id),
          );
          setUncheckWarning({
            type: "time_conflict",
            eventId,
            addonId: addon.id,
            conflictingName:
              currentLang === "en"
                ? conflictingAddon?.nameEn
                : conflictingAddon?.nameDe,
          });
          return;
        }
      }

      // 2. Prerequisite Check
      if (addon.requiresIntroId) {
        if (!currentUser) {
          setUncheckWarning({
            type: "login_required",
            eventId,
            addonId: addon.id,
          });
          return;
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const hasCompleted = userData?.completedAddons?.includes(
          addon.requiresIntroId,
        );

        const hadPastBooking = (userBookedIds || []).some((id) => {
          // Since userBookedIds is just IDs, we check the actual booking date from a separate source
          // or rely on the fact that if it was auto-selected and date passed, user is 'done'.
          // For efficiency, we rely on the Profile History we just enabled above.
          return false;
        });

        const inCart = selectedDates.some((d) =>
          d.selectedAddons?.some(
            (a) => (typeof a === "string" ? a : a.id) === addon.requiresIntroId,
          ),
        );

        if (!hasCompleted && !inCart) {
          setUncheckWarning({
            type: "missing_prerequisite",
            eventId,
            addonId: addon.id,
            requiredIntroId: addon.requiresIntroId,
          });
          return;
        }
      }

      // 3. Prerequisite for another check
      const isPrerequisiteForAnother = pricing?.specialEvents?.some(
        (se) => se.requiresIntroId === addon.id,
      );
      if (isPrerequisiteForAnother && !currentUser) {
        setUncheckWarning({
          type: "login_required_prerequisite",
          eventId,
          addonId: addon.id,
        });
        return;
      }
    }

    // --- CASE B: DESELECTING (Removing an add-on) ---
    else {
      const isFirstTimer = !currentUser || !hasBookedBefore;
      if (isMandatory && isFirstTimer) {
        setUncheckWarning({
          type: "mandatory",
          eventId,
          addonId: addon.id,
          selectedTime,
        });
        return;
      }
    }

    executeToggleAddon(eventId, addon.id, selectedTime);
  };

  const executeToggleAddon = (eventId, addonId, selectedTime = null) => {
    setSelectedDates((prev) =>
      prev.map((date) => {
        if (date.id === eventId) {
          const current = date.selectedAddons || [];
          const isAlreadySelected = current.some((a) =>
            typeof a === "string"
              ? a === addonId
              : a.id === addonId && a.time === selectedTime,
          );

          const updated = isAlreadySelected
            ? current.filter(
                (a) =>
                  !(typeof a === "string"
                    ? a === addonId
                    : a.id === addonId && a.time === selectedTime),
              )
            : [
                ...current,
                selectedTime ? { id: addonId, time: selectedTime } : addonId,
              ];

          return { ...date, selectedAddons: updated };
        }
        return date;
      }),
    );
  };

  const hasSelection = selectedDates.length > 0;

  // --- CREDIT & PAYMENT LOGIC ---
  const limitOnePerDay = pricing?.limitOnePerDay ?? true;
  let eligibleForCredit = 0;
  let ineligibleForCredit = 0;

  selectedDates.forEach((d) => {
    const count = d.count || 1;

    // Check if a credit was already used for this specific event
    let alreadyUsedCredit = false;
    if (currentUser) {
      alreadyUsedCredit = userCreditBookedIds?.includes(d.id);
    } else if (activePackCode) {
      alreadyUsedCredit = activePackCode.redeemedEventIds?.includes(d.id);
    }

    if (limitOnePerDay) {
      if (alreadyUsedCredit) {
        // They already used a credit for this day, so it defaults to cash
        eligibleForCredit += 0;
        ineligibleForCredit += count;
      } else {
        // They haven't used a credit yet, so 1 goes to credit, remainder goes to cash
        eligibleForCredit += 1;
        ineligibleForCredit += Math.max(0, count - 1);
      }
    } else {
      eligibleForCredit += count;
    }
  });

  const totalTicketsSelected = eligibleForCredit + ineligibleForCredit;
  const usableUserCredits = currentUser
    ? Math.min(availableCredits, eligibleForCredit)
    : 0;
  const usablePackCredits =
    activePackCode && activePackCode.remaining > 0
      ? Math.min(activePackCode.remaining, eligibleForCredit)
      : 0;

  const usableCredits = activePackCode ? usablePackCredits : usableUserCredits;
  const remainingEligibleToPay = eligibleForCredit - usableCredits;

  const ticketsToPayCash = remainingEligibleToPay + ineligibleForCredit;

  const baseTotalTicketsPrice =
    ticketsToPayCash * parseFloat(pricing?.priceSingle || 0);
  const basePackOptions = [
    {
      isIndividual: true,
      size: totalTicketsSelected,
      price: baseTotalTicketsPrice,
    },
    ...(pricing?.packs?.length > 0
      ? pricing.packs.map((p) => ({
          size: Number(p.size || 0),
          price: Number(p.price || 0),
        }))
      : pricing?.packSize
        ? [{ size: Number(pricing.packSize), price: Number(pricing.priceFull) }]
        : []),
  ];

  const isBuyingPack =
    selectedPackIndex !== null &&
    !basePackOptions[selectedPackIndex]?.isIndividual;
  const isUsingCredits =
    usableCredits > 0 || (activePackCode && activePackCode.remaining > 0);
  const qualifiesForFreeAddon = isBuyingPack || isUsingCredits;

  let addonCashTotal = 0;
  selectedDates.forEach((d) => {
    const count = d.count || 1;
    if (d.selectedAddons && d.selectedAddons.length > 0) {
      d.selectedAddons.forEach((selAddon) => {
        const addonId = typeof selAddon === "string" ? selAddon : selAddon.id;
        const addonDef = pricing?.specialEvents?.find(
          (se) => se.id === addonId,
        );

        if (addonDef && addonDef.price) {
          if (addonDef.freeWithPack && qualifiesForFreeAddon) {
            addonCashTotal += 0;
          } else {
            addonCashTotal += parseFloat(addonDef.price) * count;
          }
        }
      });
    }
  });

  const isMixedPayment =
    usableCredits > 0 && (ticketsToPayCash > 0 || addonCashTotal > 0);
  const coversEntirely =
    totalTicketsSelected > 0 && ticketsToPayCash === 0 && addonCashTotal === 0;

  useEffect(() => {
    if (isMixedPayment) {
      setSelectedPackIndex(0);
    } else if (coversEntirely) {
      setSelectedPackIndex(null);
    }
  }, [isMixedPayment, coversEntirely]);

  let finalTotalPrice = baseTotalTicketsPrice + addonCashTotal;

  const packOptions = basePackOptions.map((pack) => {
    if (pack.isIndividual) return { ...pack, price: finalTotalPrice };
    return pack;
  });

  const currentPack =
    selectedPackIndex !== null && packOptions[selectedPackIndex]
      ? packOptions[selectedPackIndex]
      : { size: 0, price: 0 };

  const extraEligible = currentPack.isIndividual
    ? 0
    : Math.max(0, remainingEligibleToPay - currentPack.size);
  const extraSessionsCount = currentPack.isIndividual
    ? 0
    : extraEligible + ineligibleForCredit;
  const extraSessionsCost =
    extraSessionsCount * parseFloat(pricing?.priceSingle || 0);

  let finalPackPrice =
    parseFloat(currentPack?.price || 0) + extraSessionsCost + addonCashTotal;

  const calculateSavings = (pack) => {
    if (pack.isIndividual) return 0;
    const singlePrice = Number(pricing?.priceSingle || 0);
    const normalPrice = singlePrice * pack.size;
    if (normalPrice <= 0 || pack.price >= normalPrice) return 0;
    return Math.round(((normalPrice - pack.price) / normalPrice) * 100);
  };

  const promoApplyTo = activePromo?.applyTo || "both";
  const promoAppliesToPack =
    activePromo && (promoApplyTo === "both" || promoApplyTo === "pack");
  const promoAppliesToSingle =
    activePromo && (promoApplyTo === "both" || promoApplyTo === "single");

  if (activePromo) {
    if (activePromo.discountType === "percent") {
      const multiplier = (100 - activePromo.discountValue) / 100;
      if (promoAppliesToSingle)
        finalTotalPrice = Math.max(0, finalTotalPrice * multiplier);
      if (promoAppliesToPack)
        finalPackPrice = Math.max(0, finalPackPrice * multiplier);
    } else if (activePromo.discountType === "free") {
      if (promoAppliesToSingle) finalTotalPrice = 0;
      if (promoAppliesToPack) finalPackPrice = 0;
    }
  }

  const formatPrice = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0";
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  const handleInlineAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await setDoc(doc(db, "users", userCred.user.uid), {
          firstName,
          lastName,
          email,
          phone,
          role: "user",
          createdAt: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleApplyCode = async () => {
    if (!codeInput.trim()) return;
    setCodeStatus({ loading: true, error: "" });
    setActivePromo(null);
    setActivePackCode(null);

    const upperCode = codeInput.trim().toUpperCase();

    try {
      const promoQ = query(
        collection(db, "promo_codes"),
        where("code", "==", upperCode),
      );
      const promoSnap = await getDocs(promoQ);

      if (!promoSnap.empty) {
        const promoData = promoSnap.docs[0].data();
        const activePath = (
          coursePath ||
          window.location.pathname ||
          ""
        ).replace(/\//g, "");
        if (
          promoData.coursePath &&
          promoData.coursePath !== "all" &&
          !activePath.includes(promoData.coursePath.replace(/\//g, ""))
        ) {
          setCodeStatus({
            loading: false,
            error:
              currentLang === "en"
                ? "Code not valid for this course."
                : "Code gilt nicht für diesen Kurs.",
          });
          return;
        }
        setActivePromo(promoData);
        setCodeStatus({ loading: false, error: "" });
        return;
      }

      const packDocRef = doc(db, "pack_codes", upperCode);
      const packSnap = await getDoc(packDocRef);

      if (packSnap.exists()) {
        const packData = packSnap.data();
        if (packData.remainingCredits > 0) {
          setActivePackCode({
            code: upperCode,
            remaining: packData.remainingCredits,
            redeemedEventIds: packData.redeemedEventIds || [], // Track which events this code was used for
          });
          setCodeStatus({ loading: false, error: "" });
          return;
        } else {
          setCodeStatus({
            loading: false,
            error:
              currentLang === "en"
                ? "This pack code has 0 credits left."
                : "Dieses Session-Pack hat kein Guthaben mehr.",
          });
          return;
        }
      }

      setCodeStatus({
        loading: false,
        error: currentLang === "en" ? "Invalid code." : "Ungültiger Code.",
      });
    } catch (err) {
      console.error(err);
      if (err.code === "permission-denied") {
        setActivePackCode({ code: upperCode, remaining: "?" });
        setCodeStatus({ loading: false, error: "" });
      } else {
        setCodeStatus({
          loading: false,
          error:
            currentLang === "en"
              ? "Error verifying code."
              : "Fehler bei der Code-Prüfung.",
        });
      }
    }
  };

  const renderTermsAgreement = () => {
    if (!courseTerms) return null;
    const termsText = currentLang === "de" ? courseTerms.de : courseTerms.en;
    if (!termsText) return null;

    return (
      <div
        className={shakeTerms ? "shake-animation" : ""}
        style={{
          marginTop: "1.2rem",
          padding: "12px",
          backgroundColor: shakeTerms
            ? "rgba(255, 77, 77, 0.1)"
            : "rgba(153, 96, 168, 0.05)",
          borderRadius: "12px",
          border: shakeTerms ? "2px solid #ff4d4d" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
          onClick={() => setAgreedToTerms(!agreedToTerms)}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              border: `2px solid ${agreedToTerms ? "#9960a8" : shakeTerms ? "#ff4d4d" : "#caaff3"}`,
              backgroundColor: agreedToTerms
                ? "#9960a8"
                : "rgba(255, 252, 227, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              flexShrink: 0,
            }}
          >
            {agreedToTerms && (
              <Check size={16} color="#fffce3" strokeWidth={4} />
            )}
          </div>

          <span
            style={{
              fontSize: isMobile ? "0.75rem" : "0.85rem",
              fontWeight: isMobile ? "400" : "600",
              color: "#1c0700",
              userSelect: "none",
            }}
          >
            {currentLang === "de" ? "Ich akzeptiere die " : "I accept the "}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowTermsPopup(true);
              }}
              style={{
                color: "#9960a8",
                textDecoration: "underline",
                cursor: "help",
              }}
            >
              {currentLang === "de" ? "AGB" : "terms & conditions"}
            </span>
          </span>
        </div>

        {shakeTerms && (
          <p
            style={{
              margin: "8px 0 0 32px",
              fontSize: "0.7rem",
              color: "#ff4d4d",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <AlertCircle size={12} />{" "}
            {currentLang === "de"
              ? "Bitte stimme den AGB zu."
              : "Please agree to the T&Cs."}
          </p>
        )}

        {showTermsPopup && (
          <div style={S.overlayStyle} onClick={() => setShowTermsPopup(false)}>
            <div
              style={{
                backgroundColor: "#fffce3",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "80vh",
                borderRadius: "24px",
                padding: "2rem",
                position: "relative",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTermsPopup(false)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.5,
                }}
              >
                <X size={24} />
              </button>
              <h2
                style={{
                  fontFamily: "Harmond-SemiBoldCondensed",
                  fontSize: "1.8rem",
                  marginBottom: "1.5rem",
                  marginTop: 0,
                }}
              >
                {currentLang === "de"
                  ? "Teilnahmebedingungen"
                  : "Terms & Conditions"}
              </h2>
              <div
                className="custom-scrollbar"
                style={{
                  overflowY: "auto",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                  whiteSpace: "pre-line",
                  color: "#1c0700",
                }}
              >
                {termsText}
              </div>
              <button
                onClick={() => setShowTermsPopup(false)}
                style={{
                  ...S.primaryBtnStyle(isMobile),
                  marginTop: "2rem",
                  width: "100%",
                }}
              >
                {currentLang === "de" ? "Schliessen" : "Close"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSelectionSummary = () => (
    <div
      style={{
        marginBottom: "1.5rem",
        borderBottom: "1px solid rgba(28, 7, 0, 0.1)",
        paddingBottom: "1rem",
      }}
    >
      <h4
        style={{
          fontSize: "0.85rem",
          letterSpacing: "1px",
          opacity: 0.6,
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: isMobile ? "center" : "left",
        }}
      >
        <Calendar size={14} />{" "}
        {currentLang === "en" ? "Your Selection" : "Deine Auswahl"}
      </h4>

      {!hasSelection ? (
        <div
          style={{
            padding: "0.85rem",
            border: "1px dashed rgba(28, 7, 0, 0.2)",
            borderRadius: "12px",
            textAlign: "center",
            backgroundColor: "rgba(255, 252, 227, 0.4)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              fontWeight: "400",
              color: "#1c0700",
              opacity: 0.7,
            }}
          >
            {currentLang === "en"
              ? "Select a date from the calendar to book a single session."
              : "Termin im Kalender wählen, um einen Einzelkurs zu buchen."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxHeight: "350px",
            overflowY: "auto",
            paddingRight: "5px",
          }}
          className="custom-scrollbar"
        >
          {selectedDates.map((d) => {
            const booked = eventBookingCounts[d.id] || 0;
            const cap = parseInt(pricing?.capacity || 99);
            const canAddMore = !pricing?.hasCapacity || booked + d.count < cap;

            const limitOnePerDay = pricing?.limitOnePerDay ?? true;
            let alreadyUsedCredit = false;
            if (currentUser) {
              alreadyUsedCredit = userCreditBookedIds?.includes(d.id);
            } else if (activePackCode) {
              alreadyUsedCredit = activePackCode.redeemedEventIds?.includes(
                d.id,
              );
            }

            return (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#fdf8e1",
                  padding: "12px",
                  borderRadius: "16px",
                  border: "1px solid rgba(28, 7, 0, 0.05)",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "800", fontSize: "0.9rem" }}>
                      {formatDate(d.date)}
                    </span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                      {d.time || ""}
                    </span>
                    {limitOnePerDay && alreadyUsedCredit && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "#e74c3c",
                          fontWeight: "800",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <AlertCircle size={10} />
                        {currentLang === "en"
                          ? "Credit already used for this date"
                          : "Guthaben für diesen Tag bereits genutzt"}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "rgba(202, 175, 243, 0.1)",
                        borderRadius: "8px",
                        padding: "4px",
                      }}
                    >
                      <button
                        onClick={() =>
                          setSelectedDates((prev) =>
                            prev.map((item) =>
                              item.id === d.id
                                ? {
                                    ...item,
                                    count: Math.max(1, item.count - 1),
                                    names: item.names.slice(0, -1), // Remove last name
                                  }
                                : item,
                            ),
                          )
                        }
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontWeight: "900",
                          color: "#9960a8",
                          padding: "0 6px",
                        }}
                      >
                        {" "}
                        -{" "}
                      </button>
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: "0.9rem",
                          minWidth: "15px",
                          textAlign: "center",
                        }}
                      >
                        {d.count}
                      </span>
                      <button
                        onClick={() =>
                          canAddMore &&
                          setSelectedDates((prev) =>
                            prev.map((item) =>
                              item.id === d.id
                                ? {
                                    ...item,
                                    count: item.count + 1,
                                    names: [...item.names, ""], // Add empty name
                                  }
                                : item,
                            ),
                          )
                        }
                        disabled={!canAddMore}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontWeight: "900",
                          color: "#9960a8",
                          padding: "0 6px",
                          opacity: canAddMore ? 1 : 0.3,
                        }}
                      >
                        {" "}
                        +{" "}
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedDates((prev) =>
                          prev.filter((item) => item.id !== d.id),
                        )
                      }
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "#1c0700",
                        opacity: 0.4,
                      }}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
                {/* Attendee Names List */}
                {d.count > 1 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginTop: "10px",
                      marginBottom: "15px",
                    }}
                  >
                    {d.names.map((name, nameIdx) => (
                      <div key={nameIdx}>
                        <label
                          style={{
                            fontSize: "0.65rem",
                            opacity: 0.5,
                            fontWeight: "900",
                            textTransform: "uppercase",
                          }}
                        >
                          {currentLang === "en"
                            ? `Attendee ${nameIdx + 1}`
                            : `Teilnehmer ${nameIdx + 1}`}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            nameIdx === 0
                              ? currentLang === "en"
                                ? "Your Name"
                                : "Dein Name"
                              : currentLang === "en"
                                ? "Guest Name"
                                : "Name des Gastes"
                          }
                          value={name}
                          onChange={(e) => {
                            const updatedNames = [...d.names];
                            updatedNames[nameIdx] = e.target.value;
                            setSelectedDates((prev) =>
                              prev.map((item) =>
                                item.id === d.id
                                  ? { ...item, names: updatedNames }
                                  : item,
                              ),
                            );
                          }}
                          style={{
                            ...S.guestInputStyle,
                            padding: "8px 12px",
                            fontSize: "0.85rem",
                            backgroundColor: "rgba(255, 252, 227, 0.6)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* --- 1. START OF REPLACEMENT --- */}
                {(() => {
                  const rawAddons = scheduleData?.specialAssignments?.[d.id];
                  const assignedAddonIds = Array.isArray(rawAddons)
                    ? rawAddons
                    : rawAddons
                      ? [rawAddons]
                      : [];

                  const visibleAddons = (pricing?.specialEvents || []).filter(
                    (se) =>
                      assignedAddonIds.includes(se.id) &&
                      !userData?.completedAddons?.includes(se.id), // Filter out completed addons
                  );

                  if (visibleAddons.length === 0) return null;

                  // Determine if this specific date should be expanded
                  // Default: Expanded if only 1 date is selected, otherwise collapsed
                  const isAddonsExpanded =
                    selectedDates.length === 1
                      ? manuallyExpandedDates[d.id] !== false
                      : manuallyExpandedDates[d.id] === true;

                  return (
                    <div
                      style={{
                        borderTop: "1px dashed rgba(28,7,0,0.1)",
                        paddingTop: "8px",
                      }}
                    >
                      {/* CLICKABLE HEADER TO EXPAND/COLLAPSE */}
                      <div
                        onClick={() =>
                          setManuallyExpandedDates((prev) => ({
                            ...prev,
                            [d.id]: !isAddonsExpanded,
                          }))
                        }
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          paddingBottom: isAddonsExpanded ? "8px" : "0",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: "900",
                            textTransform: "uppercase",
                            opacity: 0.5,
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Star size={10} fill="#9960a8" color="#9960a8" />
                          {currentLang === "en"
                            ? "Available Add-ons"
                            : "Verfügbare Extras"}
                        </p>
                        {isAddonsExpanded ? (
                          <ChevronUp size={14} color="#9960a8" />
                        ) : (
                          <ChevronDown size={14} color="#9960a8" />
                        )}
                      </div>

                      {/* THE ACTUAL LIST (ONLY SHOWS IF EXPANDED) */}
                      {isAddonsExpanded && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {visibleAddons.map((addon) => {
                            const addonColor = getAddonColor(addon.id);
                            const priceLabel = addon.price
                              ? ` (+${addon.price} CHF)`
                              : "";
                            const displayAddonName =
                              (currentLang === "en"
                                ? addon.nameEn
                                : addon.nameDe) + priceLabel;

                            if (addon.timeSlots && addon.timeSlots.length > 0) {
                              return (
                                <div
                                  key={addon.id}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                    padding: "10px 12px",
                                    borderRadius: "12px",
                                    backgroundColor: "rgba(28,7,0,0.02)",
                                    border: "1px dashed rgba(28,7,0,0.1)",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      fontWeight: "800",
                                      color: "#1c0700",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "8px",
                                          height: "8px",
                                          borderRadius: "50%",
                                          backgroundColor: addonColor,
                                        }}
                                      />
                                      {displayAddonName}
                                    </div>
                                    {/* Removed !isFull check since this is a general header for multiple slots */}
                                    {addon.freeWithPack &&
                                      !qualifiesForFreeAddon && (
                                        <span
                                          style={{
                                            fontSize: "0.65rem",
                                            color: "#9960a8",
                                            fontWeight: "600",
                                            paddingLeft: "14px",
                                          }}
                                        >
                                          {currentLang === "en"
                                            ? "Tip: Free with any session pack"
                                            : "Tipp: Gratis mit jedem Kurspaket"}
                                        </span>
                                      )}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "6px",
                                      paddingLeft: "14px",
                                    }}
                                  >
                                    {addon.timeSlots.map((ts) => {
                                      const timeString = `${ts.startTime}-${ts.endTime}`;
                                      const isSelected = d.selectedAddons?.some(
                                        (a) =>
                                          typeof a === "object" &&
                                          a.id === addon.id &&
                                          a.time === timeString,
                                      );
                                      const bookedKey = `${d.id}_${addon.id}_${timeString}`;
                                      const booked =
                                        addonBookingCounts[bookedKey] || 0;
                                      const isFull =
                                        booked >= parseInt(ts.capacity || 999);

                                      return (
                                        <div
                                          key={timeString}
                                          onClick={() =>
                                            !isFull &&
                                            toggleAddon(
                                              d.id,
                                              addon,
                                              addon.isMandatory,
                                              timeString,
                                            )
                                          }
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "8px 10px",
                                            borderRadius: "8px",
                                            cursor: isFull
                                              ? "not-allowed"
                                              : "pointer",
                                            backgroundColor: isSelected
                                              ? "rgba(78, 95, 40, 0.1)"
                                              : "rgba(28,7,0,0.03)",
                                            border:
                                              "1px solid rgba(28,7,0,0.05)",
                                            transition: "all 0.2s",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: "16px",
                                              height: "16px",
                                              borderRadius: "4px",
                                              border: `2px solid ${isSelected ? addonColor : "#caaff3"}`,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              backgroundColor: isSelected
                                                ? addonColor
                                                : "transparent",
                                            }}
                                          >
                                            {isSelected && (
                                              <Check
                                                size={12}
                                                color="#fdf8e1"
                                                strokeWidth={4}
                                              />
                                            )}
                                          </div>
                                          <div
                                            style={{
                                              flex: 1,
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                                color: isFull
                                                  ? "#ccc"
                                                  : "#1c0700",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                              }}
                                            >
                                              <Clock size={12} opacity={0.6} />{" "}
                                              {ts.startTime} - {ts.endTime}
                                            </span>
                                            {isFull && (
                                              <span
                                                style={{
                                                  fontSize: "0.6rem",
                                                  color: "#ff4d4d",
                                                  fontWeight: "800",
                                                }}
                                              >
                                                {currentLang === "en"
                                                  ? "FULL"
                                                  : "AUSGEBUCHT"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            } else {
                              const isSelected = d.selectedAddons?.some((a) =>
                                typeof a === "string"
                                  ? a === addon.id
                                  : a.id === addon.id,
                              );
                              const bookedKey = `${d.id}_${addon.id}`;
                              const booked = addonBookingCounts[bookedKey] || 0;
                              const isFull =
                                booked >= parseInt(addon.capacity || 999);

                              return (
                                <div
                                  key={addon.id}
                                  onClick={() =>
                                    !isFull &&
                                    toggleAddon(d.id, addon, addon.isMandatory)
                                  }
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 12px",
                                    borderRadius: "12px",
                                    cursor: isFull ? "not-allowed" : "pointer",
                                    backgroundColor: isSelected
                                      ? "rgba(78, 95, 40, 0.1)"
                                      : "rgba(28,7,0,0.03)",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "18px",
                                      height: "18px",
                                      borderRadius: "6px",
                                      border: `2px solid ${isSelected ? addonColor : "#caaff3"}`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: isSelected
                                        ? addonColor
                                        : "transparent",
                                    }}
                                  >
                                    {isSelected && (
                                      <Check
                                        size={14}
                                        color="#fdf8e1"
                                        strokeWidth={4}
                                      />
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: "700",
                                        color: isFull ? "#ccc" : "#1c0700",
                                        display: "flex",
                                        flexDirection: "column",
                                      }}
                                    >
                                      {displayAddonName}
                                      {/* NEW: Pack savings notice */}
                                      {addon.freeWithPack &&
                                        !qualifiesForFreeAddon &&
                                        !isFull && (
                                          <span
                                            style={{
                                              fontSize: "0.65rem",
                                              color: "#9960a8",
                                              fontWeight: "600",
                                              marginTop: "2px",
                                            }}
                                          >
                                            {currentLang === "en"
                                              ? "Tip: Free with any session pack"
                                              : "Tipp: Gratis mit jedem Kurspaket"}
                                          </span>
                                        )}
                                    </div>
                                    {isFull && (
                                      <span
                                        style={{
                                          fontSize: "0.6rem",
                                          color: "#ff4d4d",
                                          fontWeight: "800",
                                        }}
                                      >
                                        {currentLang === "en"
                                          ? "FULL"
                                          : "AUSGEBUCHT"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPackOption = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* NEW: Pack Header with Info Icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: "900",
            letterSpacing: "1px",
            opacity: 0.6,
            textTransform: "uppercase",
          }}
        >
          {currentLang === "en" ? "Select a Package" : "Paket wählen"}
        </span>
        <button
          onClick={() => setShowPackInfo(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9960a8",
            padding: "4px",
            display: "flex",
          }}
        >
          <Info size={18} />
        </button>
      </div>

      {packOptions.map((pack, idx) => {
        const isSelected = selectedPackIndex === idx;
        const savings = calculateSavings(pack);

        return (
          <div
            key={idx}
            onClick={() => setSelectedPackIndex(isSelected ? null : idx)}
            style={{
              backgroundColor: isSelected
                ? "rgba(202, 175, 243, 0.25)"
                : "rgba(202, 175, 243, 0.05)",
              borderRadius: "16px",
              padding: "1.2rem",
              border: isSelected
                ? "2px solid #9960a8"
                : "1px solid rgba(202, 175, 243, 0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isSelected && (
                    <Check size={16} color="#9960a8" strokeWidth={3} />
                  )}
                  <p
                    style={{
                      fontWeight: isMobile ? "600" : "800",
                      margin: 0,
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    }}
                  >
                    {pack.isIndividual && isMixedPayment ? (
                      <>
                        {ticketsToPayCash}{" "}
                        {currentLang === "en"
                          ? ticketsToPayCash === 1
                            ? "extra Session"
                            : "extra Sessions"
                          : ticketsToPayCash === 1
                            ? "zusätzlicher Termin"
                            : "zusätzliche Termine"}
                      </>
                    ) : (
                      <>
                        {pack.size}{" "}
                        {currentLang === "en"
                          ? pack.isIndividual
                            ? pack.size === 1
                              ? "Session"
                              : "Sessions"
                            : "Sessions Pack"
                          : pack.isIndividual
                            ? pack.size === 1
                              ? "Termin"
                              : "Termine"
                            : "er Karte"}
                      </>
                    )}
                  </p>
                </div>
                {savings >= 1 && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      color: "#9960a8",
                      backgroundColor: "rgba(153, 96, 168, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "900",
                      width: "fit-content",
                    }}
                  >
                    {currentLang === "en"
                      ? `SAVE ${savings}%`
                      : `${savings}% ERSPARNIS`}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontWeight: isMobile ? "600" : "700",
                  margin: 0,
                  color: "#4e5f28",
                  fontSize: isMobile ? "1rem" : "1.1rem",
                }}
              >
                {formatPrice(pack.price)} CHF
              </p>
            </div>
            {isSelected && extraSessionsCount > 0 && !pack.isIndividual && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "8px",
                  backgroundColor: "rgba(28, 7, 0, 0.05)",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  color: "#1c0700",
                }}
              >
                <p style={{ margin: 0, fontWeight: "700" }}>
                  {currentLang === "en"
                    ? `+ ${extraSessionsCount} extra session(s) @ single price`
                    : `+ ${extraSessionsCount} zusätzliche(r) Termin(e) zum Einzelpreis`}
                </p>
              </div>
            )}
            {isSelected &&
              isMixedPayment &&
              limitOnePerDay &&
              pack.isIndividual && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#4e5f28",
                    marginTop: "8px",
                    fontStyle: "italic",
                    lineHeight: "1.4",
                  }}
                >
                  {currentLang === "en"
                    ? "Only 1 ticket per day can be paid with a credit. Extra tickets are charged at the single price."
                    : "Pro Tag kann nur 1 Ticket mit Guthaben bezahlt werden. Zusätzliche Tickets werden zum Einzelpreis berechnet."}
                </p>
              )}
            {/* --- NEW: Remaining credits info inside the selected card --- */}
            {isSelected && !pack.isIndividual && (
              <p
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.6,
                  marginTop: "8px",
                  fontStyle: "italic",
                  lineHeight: "1.4",
                }}
              >
                {extraSessionsCount > 0
                  ? currentLang === "en"
                    ? "Selection exceeds available credits and pack size. Extras added at single price."
                    : "Auswahl überschreitet Guthaben und Kartengröße. Extras zum Einzelpreis berechnet."
                  : currentLang === "en"
                    ? `The remaining ${Math.max(0, pack.size - remainingEligibleToPay)} credits will be saved to your profile.`
                    : `Die restlichen ${Math.max(0, pack.size - remainingEligibleToPay)} Guthaben werden deinem Profil gutgeschrieben.`}
              </p>
            )}
            {/* ----------------------------------------------------------- */}
          </div>
        );
      })}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "10px",
        }}
      >
        {selectedPackIndex !== null && renderTermsAgreement()}
        <button
          onClick={() =>
            selectedPackIndex !== null &&
            validateAndProceed(() => {
              if (currentPack.isIndividual) {
                onPayment(
                  "individual",
                  activePackCode
                    ? activePackCode.code
                    : promoAppliesToSingle
                      ? activePromo?.code
                      : null,
                  0,
                  finalTotalPrice,
                  usableCredits,
                );
              } else {
                onPayment(
                  "pack",
                  promoAppliesToPack ? activePromo?.code : null,
                  currentPack.size,
                  finalPackPrice,
                  usableCredits,
                );
              }
            })
          }
          style={{
            ...S.primaryBtnStyle(isMobile),
            marginTop: "10px",
            opacity:
              selectedPackIndex === null ||
              (currentPack.isIndividual && !hasSelection)
                ? 0.5
                : 1,
            cursor:
              selectedPackIndex === null ||
              (currentPack.isIndividual && !hasSelection)
                ? "not-allowed"
                : "pointer",
          }}
          disabled={
            selectedPackIndex === null ||
            (!currentUser && (!guestInfo.firstName || !guestInfo.email)) ||
            (currentPack.isIndividual && !hasSelection)
          }
        >
          {selectedPackIndex === null ||
          (currentPack.isIndividual && !hasSelection)
            ? currentLang === "en"
              ? "Select dates or session pack"
              : "Termine oder Paket wählen"
            : currentPack.isIndividual
              ? isMixedPayment
                ? currentLang === "en"
                  ? `Pay Balance (${formatPrice(finalTotalPrice)} CHF) + Use ${usableCredits} Credit${usableCredits !== 1 ? "s" : ""}`
                  : `Restbetrag zahlen (${formatPrice(finalTotalPrice)} CHF) + ${usableCredits} Guthaben nutzen`
                : currentLang === "en"
                  ? `Pay ${formatPrice(finalTotalPrice)} CHF`
                  : `${formatPrice(finalTotalPrice)} CHF zahlen`
              : currentLang === "en"
                ? `${hasSelection ? "Buy & Book" : "Buy"} (${formatPrice(finalPackPrice)} CHF)`
                : `${hasSelection ? "Kaufen & Buchen" : "Kaufen"} (${formatPrice(finalPackPrice)} CHF)`}
        </button>
      </div>
    </div>
  );

  const renderPurchaseOptions = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "0.5rem",
      }}
    >
      {!currentUser && renderSelectionSummary()}

      <div
        style={{
          backgroundColor: "rgba(202, 175, 243, 0.1)",
          padding: "12px",
          borderRadius: "12px",
          border: "1px dashed rgba(202, 175, 243, 0.4)",
        }}
      >
        {!isCodeExpanded && !activePromo && !activePackCode ? (
          <button
            onClick={() => setIsCodeExpanded(true)}
            style={{
              background: "none",
              border: "none",
              color: "#9960a8",
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: 0,
              fontWeight: isMobile ? "400" : "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Ticket size={16} />{" "}
            {currentLang === "en"
              ? "Add Promo or Pack Code"
              : "Code hinzufügen"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "#9960a8",
                  textTransform: "uppercase",
                }}
              >
                {currentLang === "en" ? "Enter Code" : "Code eingeben"}
              </label>
              <button
                onClick={() => {
                  setIsCodeExpanded(false);
                  setCodeInput("");
                  setActivePromo(null);
                  setActivePackCode(null);
                  setCodeStatus({ loading: false, error: "" });
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1c0700",
                  opacity: 0.5,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {currentLang === "en" ? "Remove" : "Entfernen"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="e.g. SUMMER24 or X7B9K2"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                disabled={activePromo || activePackCode}
                style={{
                  ...S.guestInputStyle,
                  padding: "10px 12px",
                  flex: 1,
                  backgroundColor:
                    activePromo || activePackCode
                      ? "rgba(78, 95, 40, 0.05)"
                      : "rgba(255, 252, 227, 0.4)",
                }}
              />
              {!activePromo && !activePackCode && (
                <button
                  onClick={handleApplyCode}
                  disabled={codeStatus.loading || !codeInput}
                  style={{
                    padding: "0 15px",
                    backgroundColor: "#9960a8",
                    color: "#fdf8e1",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {codeStatus.loading ? (
                    <Loader2 size={16} className="spinner" />
                  ) : currentLang === "en" ? (
                    "Apply"
                  ) : (
                    "Anwenden"
                  )}
                </button>
              )}
            </div>
            {activePromo && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#4e5f28",
                  marginTop: "4px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle size={14} />{" "}
                {currentLang === "en"
                  ? `Promo applied: ${activePromo.discountValue}${activePromo.discountType === "percent" ? "% OFF" : " FREE"}`
                  : `Promo angewendet: ${activePromo.discountValue}${activePromo.discountType === "percent" ? "% RABATT" : " GRATIS"}`}
              </p>
            )}
            {activePackCode && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#4e5f28",
                  marginTop: "4px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle size={14} />{" "}
                {currentLang === "en"
                  ? `Pack Code applied: ${activePackCode.remaining !== "?" ? activePackCode.remaining : "Valid"} credits available`
                  : `Pack Code angewendet: ${activePackCode.remaining !== "?" ? activePackCode.remaining : "Gültige"} Guthaben verfügbar`}
              </p>
            )}
            {codeStatus.error && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#1c0700",
                  opacity: 0.7,
                  marginTop: "4px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <XCircle size={14} /> {codeStatus.error}
              </p>
            )}
          </div>
        )}
      </div>

      {activePackCode && coversEntirely ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          {renderTermsAgreement()}
          <button
            onClick={() =>
              validateAndProceed(() => onPayment("redeem", activePackCode.code))
            }
            style={{ ...S.primaryBtnStyle(isMobile), marginTop: "10px" }}
            disabled={
              (!currentUser && (!guestInfo.firstName || !guestInfo.email)) ||
              !hasSelection
            }
          >
            {currentLang === "en"
              ? "Redeem Code & Book"
              : "Code einlösen & Buchen"}
          </button>
        </div>
      ) : activePackCode && isMixedPayment ? (
        <>{renderPackOption()}</>
      ) : (
        <>{renderPackOption()}</>
      )}
    </div>
  );

  const renderRequestOption = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "0.5rem",
      }}
    >
      {!currentUser && renderSelectionSummary()}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {renderTermsAgreement()}
        <button
          onClick={() => validateAndProceed(onRequestSubmit)}
          style={{
            ...S.primaryBtnStyle(isMobile),
            marginTop: "10px",
            opacity:
              !hasSelection ||
              (!currentUser && (!guestInfo.firstName || !guestInfo.email))
                ? 0.5
                : 1,
            cursor:
              !hasSelection ||
              (!currentUser && (!guestInfo.firstName || !guestInfo.email))
                ? "not-allowed"
                : "pointer",
          }}
          disabled={
            !hasSelection ||
            (!currentUser && (!guestInfo.firstName || !guestInfo.email))
          }
        >
          {currentLang === "en"
            ? "Request Selected Dates"
            : "Ausgewählte Termine anfragen"}
        </button>
        <p
          style={{
            fontSize: "0.75rem",
            opacity: 0.6,
            textAlign: "center",
            fontStyle: "italic",
            marginTop: "4px",
          }}
        >
          {currentLang === "en"
            ? "No payment required yet. We will confirm availability via email."
            : "Noch keine Zahlung erforderlich. Wir bestätigen die Verfügbarkeit per E-Mail."}
        </p>
      </div>
    </div>
  );

  return (
    <div style={S.bookingCardStyle(isMobile, true)}>
      {/* LIGHTWEIGHT CONFIRMATION POPUP */}
      {uncheckWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setUncheckWarning(null)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              maxWidth: "350px",
              width: "100%",
              borderRadius: "24px",
              padding: "2rem 1.5rem 1.5rem 1.5rem",
              boxShadow: "0 20px 40px rgba(28, 7, 0, 0.2)",
              textAlign: "center",
              position: "relative",
              border: "1px solid #caaff3",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setUncheckWarning(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.3,
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>

            <h3
              style={{
                marginTop: 0,
                color: "#1c0700",
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.4rem",
              }}
            >
              {uncheckWarning.type === "time_conflict"
                ? currentLang === "en"
                  ? "Time Conflict"
                  : "Zeitkonflikt"
                : uncheckWarning.type === "login_required" ||
                    uncheckWarning.type === "login_required_prerequisite"
                  ? currentLang === "en"
                    ? "Profile Required"
                    : "Profil erforderlich"
                  : uncheckWarning.type === "missing_prerequisite"
                    ? currentLang === "en"
                      ? "Prerequisite Missing"
                      : "Voraussetzung fehlt"
                    : currentLang === "en"
                      ? "Check again"
                      : "Kurze Prüfung"}
            </h3>

            <p
              style={{
                fontSize: "0.85rem",
                color: "#1c0700",
                marginBottom: "1.5rem",
                lineHeight: 1.5,
              }}
            >
              {uncheckWarning.type === "time_conflict" ? (
                currentLang === "en" ? (
                  `This slot overlaps with your selection for "${uncheckWarning.conflictingName}". Please deselect the other slot first.`
                ) : (
                  `Dieser Slot überschneidet sich mit deiner Auswahl für "${uncheckWarning.conflictingName}". Bitte wähle den anderen Slot zuerst ab.`
                )
              ) : (
                <>
                  <strong>
                    {(() => {
                      const addon = pricing?.specialEvents?.find(
                        (se) => se.id === uncheckWarning.addonId,
                      );
                      return currentLang === "en"
                        ? addon?.nameEn
                        : addon?.nameDe;
                    })()}
                  </strong>{" "}
                  {uncheckWarning.type === "login_required"
                    ? currentLang === "en"
                      ? "requires you to have completed an intro course. Please log in or create a profile so we can verify your history."
                      : "erfordert, dass du einen Einführungskurs absolviert hast. Bitte logge dich ein, um dies zu überprüfen."
                    : uncheckWarning.type === "login_required_prerequisite"
                      ? currentLang === "en"
                        ? "is a prerequisite for advanced sessions. Please log in or create a profile so we can save your progress."
                        : "ist eine Voraussetzung für weiterführende Kurse. Bitte logge dich ein oder erstelle ein Profil, damit wir deinen Fortschritt speichern können."
                      : uncheckWarning.type === "missing_prerequisite"
                        ? currentLang === "en"
                          ? `requires you to complete the "${pricing?.specialEvents?.find((se) => se.id === uncheckWarning.requiredIntroId)?.nameEn || "Intro"}" first. Please add it to your selection.`
                          : `erfordert, dass du zuerst "${pricing?.specialEvents?.find((se) => se.id === uncheckWarning.requiredIntroId)?.nameDe || "die Einführung"}" absolvierst. Bitte füge es deiner Auswahl hinzu.`
                        : currentLang === "en"
                          ? "is mandatory for first-timers. Please confirm you have booked this course before to remove it."
                          : "ist für Erstkunden obligatorisch. Bitte bestätige, dass du diesen Kurs bereits gebucht hast."}
                </>
              )}
            </p>

            {/* The confirm button only shows for the 'mandatory' type (first-timers) */}
            {uncheckWarning.type !== "login_required" &&
              uncheckWarning.type !== "login_required_prerequisite" &&
              uncheckWarning.type !== "missing_prerequisite" &&
              uncheckWarning.type !== "time_conflict" && (
                <button
                  onClick={async () => {
                    // If the user is logged in, mark this specific addon as completed in their profile
                    if (currentUser) {
                      try {
                        await updateDoc(doc(db, "users", currentUser.uid), {
                          completedAddons: arrayUnion(uncheckWarning.addonId),
                        });
                      } catch (e) {
                        console.error("Error updating user progress:", e);
                      }
                    }

                    // Execute the removal and close the modal
                    executeToggleAddon(
                      uncheckWarning.eventId,
                      uncheckWarning.addonId,
                      uncheckWarning.selectedTime,
                    );
                    setUncheckWarning(null);
                  }}
                  style={{
                    ...S.primaryBtnStyle(isMobile),
                    width: "100%",
                    padding: "12px",
                    fontSize: "0.9rem",
                  }}
                >
                  {currentLang === "en" ? "I confirm" : "Ich bestätige"}
                </button>
              )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <div
        style={{
          minWidth: isMobile ? "100%" : "380px",
          opacity: 1,
          textAlign: "left",
        }}
      >
        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: isMobile ? "1.8rem" : "2rem",
            fontWeight: isMobile ? "400" : "bold",
            marginBottom: "1.5rem",
            marginTop: 0,
            textAlign: "center",
          }}
        >
          {hasSelection
            ? currentLang === "en"
              ? "booking summary"
              : "buchungsübersicht"
            : currentLang === "en"
              ? "course options"
              : "kursoptionen"}
        </h3>

        {!currentUser ? (
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              onClick={() => setIsAuthExpanded(!isAuthExpanded)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#4e5f28",
                fontSize: "0.9rem",
                fontWeight: "700",
              }}
            >
              {isAuthExpanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
              {currentLang === "en"
                ? "Login or Register"
                : "Einloggen oder Registrieren"}
            </button>
            {isAuthExpanded && (
              <div
                style={{
                  padding: "1.2rem",
                  backgroundColor: "rgba(28, 7, 0, 0.03)",
                  borderRadius: "16px",
                  marginBottom: "1.5rem",
                }}
              >
                <form
                  onSubmit={handleInlineAuth}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {isRegistering && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="text"
                        placeholder={
                          currentLang === "en" ? "First Name" : "Vorname"
                        }
                        required
                        style={{ ...S.guestInputStyle, flex: 1 }}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder={
                          currentLang === "en" ? "Last Name" : "Nachname"
                        }
                        required
                        style={{ ...S.guestInputStyle, flex: 1 }}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    style={S.guestInputStyle}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder={currentLang === "en" ? "Password" : "Passwort"}
                    required
                    style={S.guestInputStyle}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {authError && (
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "#1c0700",
                        opacity: 0.7,
                      }}
                    >
                      {authError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    style={S.primaryBtnStyle(isMobile)}
                  >
                    {authLoading ? (
                      <Loader2 size={16} className="spinner" />
                    ) : isRegistering ? (
                      currentLang === "en" ? (
                        "Register"
                      ) : (
                        "Registrieren"
                      )
                    ) : currentLang === "en" ? (
                      "Login"
                    ) : (
                      "Einloggen"
                    )}
                  </button>
                </form>
                <button
                  onClick={() => setIsRegistering(!isRegistering)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9960a8",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    marginTop: "12px",
                  }}
                >
                  {isRegistering
                    ? currentLang === "en"
                      ? "Already have an account?"
                      : "Bereits ein Konto?"
                    : currentLang === "en"
                      ? "Need an account?"
                      : "Noch kein Konto?"}
                </button>
              </div>
            )}
            {!isAuthExpanded && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginBottom: "1.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "900",
                    letterSpacing: "1px",
                    opacity: 0.6,
                  }}
                >
                  {currentLang === "en" ? "Guest details" : "Gast-Details"}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: "10px",
                  }}
                >
                  <input
                    type="text"
                    placeholder={
                      currentLang === "en" ? "First Name" : "Vorname"
                    }
                    style={{ ...S.guestInputStyle, flex: 1 }}
                    value={guestInfo.firstName}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, firstName: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder={
                      currentLang === "en" ? "Last Name" : "Nachname"
                    }
                    style={{ ...S.guestInputStyle, flex: 1 }}
                    value={guestInfo.lastName}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, lastName: e.target.value })
                    }
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  style={S.guestInputStyle}
                  value={guestInfo.email}
                  onChange={(e) =>
                    setGuestInfo({ ...guestInfo, email: e.target.value })
                  }
                />
              </div>
            )}
            {pricing?.isRequestOnly
              ? renderRequestOption()
              : renderPurchaseOptions()}
          </div>
        ) : (
          <>
            {renderSelectionSummary()}

            {availableCredits > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "rgba(78, 95, 40, 0.1)",
                  color: "#4e5f28",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  fontSize: "0.85rem",
                  marginBottom: "1.5rem",
                  width: "fit-content",
                  fontWeight: "400",
                }}
              >
                <Ticket size={16} />
                <span>
                  {currentLang === "en" ? "Your Balance:" : "Dein Guthaben:"}{" "}
                  {availableCredits}{" "}
                  {currentLang === "en" ? "credits" : "Karten"}
                </span>
              </div>
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {pricing?.isRequestOnly ? (
                renderRequestOption()
              ) : coversEntirely && !activePackCode ? (
                <>
                  {renderTermsAgreement()}
                  <button
                    onClick={() => validateAndProceed(onBookCredits)}
                    style={{
                      ...S.creditBtnStyle(isMobile),
                      padding: "14px",
                      marginTop: "10px",
                    }}
                  >
                    {currentLang === "en"
                      ? `Book with ${totalTicketsSelected} Credits`
                      : `Mit ${totalTicketsSelected} Guthaben buchen`}
                  </button>
                  <button
                    onClick={() =>
                      setShowStripeAlternative(!showStripeAlternative)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      textDecoration: "underline",
                      color: "#4e5f28",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      textAlign: "left",
                      padding: "4px 0",
                    }}
                  >
                    {currentLang === "en"
                      ? "Or pay with card"
                      : "Oder mit Karte zahlen"}
                  </button>
                  {showStripeAlternative && renderPurchaseOptions()}
                </>
              ) : (
                renderPurchaseOptions()
              )}
            </div>
          </>
        )}
      </div>
      {/* PACK INFO MODAL */}
      {showPackInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28, 7, 0, 0.2)",
            zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowPackInfo(false)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              maxWidth: "400px",
              width: "100%",
              borderRadius: "24px",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(28, 7, 0, 0.2)",
              position: "relative",
              border: "1px solid #caaff3",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPackInfo(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.4,
              }}
            >
              <X size={20} />
            </button>

            <h3
              style={{
                marginTop: 0,
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.6rem",
              }}
            >
              {currentLang === "en" ? "About Session Packs" : "Über Kurspakete"}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
                fontSize: "0.9rem",
                color: "#1c0700",
                lineHeight: 1.5,
              }}
            >
              <p>
                {currentUser ? (
                  currentLang === "en" ? (
                    <>
                      Credits are tied to your profile and are non-transferable.
                      <br />
                      You can use one credit per course day.
                    </>
                  ) : (
                    <>
                      Guthaben sind an dein Profil gebunden und nicht
                      übertragbar.
                      <br />
                      Pro Kurstag kann ein Guthaben genutzt werden.
                    </>
                  )
                ) : currentLang === "en" ? (
                  <>
                    Credits are tied to your email address.
                    <br />
                    They are non-transferable and limited to one ticket per
                    course day.
                  </>
                ) : (
                  <>
                    Guthaben sind an deine E-Mail-Adresse gebunden.
                    <br />
                    Sie sind nicht übertragbar und auf ein Ticket pro Kurstag
                    begrenzt.
                  </>
                )}
              </p>

              {pricing?.specialEvents?.some((se) => se.freeWithPack) && (
                <div
                  style={{
                    backgroundColor: "rgba(153, 96, 168, 0.1)",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(153, 96, 168, 0.2)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "700",
                      color: "#9960a8",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Star size={14} fill="#9960a8" />
                    {currentLang === "en"
                      ? "Intro Special"
                      : "Einführungs-Special"}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.85rem",
                      textAlign: "left",
                    }}
                  >
                    {currentLang === "en"
                      ? "When purchasing a pack, all mandatory intro courses for this session are free of charge."
                      : "Beim Kauf eines Pakets sind alle obligatorischen Einführungskurse für diesen Termin kostenlos."}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPackInfo(false)}
              style={{
                ...S.primaryBtnStyle(isMobile),
                marginTop: "1.5rem",
                padding: "12px",
              }}
            >
              {currentLang === "en" ? "Got it" : "Verstanden"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
