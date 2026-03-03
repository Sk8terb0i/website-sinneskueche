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
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import * as S from "./PriceDisplayStyles";

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
  currentLang,
  isMobile,
  onBookCredits,
  onPayment,
  coursePath,
  userBookedIds = [], // NEW PROP EXTRACTED
}) {
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
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

  const toggleAddon = (eventId, addonId) => {
    setSelectedDates((prev) =>
      prev.map((date) => {
        if (date.id === eventId) {
          const current = date.selectedAddons || [];
          const updated = current.includes(addonId)
            ? current.filter((id) => id !== addonId)
            : [...current, addonId];
          return { ...date, selectedAddons: updated };
        }
        return date;
      }),
    );
  };

  const packOptions =
    pricing?.packs?.length > 0
      ? pricing.packs.map((p) => ({
          size: Number(p.size || 0),
          price: Number(p.price || 0),
        }))
      : pricing?.packSize
        ? [{ size: Number(pricing.packSize), price: Number(pricing.priceFull) }]
        : [];

  const currentPack =
    selectedPackIndex !== null && packOptions[selectedPackIndex]
      ? packOptions[selectedPackIndex]
      : { size: 0, price: 0 };

  const hasSelection = selectedDates.length > 0;

  // --- CREDIT & PAYMENT LOGIC ---
  const limitOnePerDay = pricing?.limitOnePerDay ?? true;
  let eligibleForCredit = 0;
  let ineligibleForCredit = 0;

  selectedDates.forEach((d) => {
    const count = d.count || 1;
    // Check if user already booked this specific event in the past
    const alreadyBooked = userBookedIds?.includes(d.id);

    if (limitOnePerDay) {
      if (alreadyBooked) {
        // They already used their 1 allowed credit for this day previously
        eligibleForCredit += 0;
        ineligibleForCredit += count;
      } else {
        // They haven't booked yet, so 1 goes to credit, remainder goes to cash
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

  // Mixed Payment happens if a credit is used but there is still cash owed
  const isMixedPayment = usableCredits > 0 && ticketsToPayCash > 0;
  // Full Coverage happens if we have tickets and NO cash is owed
  const coversEntirely = totalTicketsSelected > 0 && ticketsToPayCash === 0;

  const extraEligible = Math.max(0, remainingEligibleToPay - currentPack.size);
  const extraSessionsCount = extraEligible + ineligibleForCredit;
  const extraSessionsCost =
    extraSessionsCount * parseFloat(pricing?.priceSingle || 0);

  let finalTotalPrice =
    ticketsToPayCash * parseFloat(pricing?.priceSingle || 0);
  let finalPackPrice = parseFloat(currentPack?.price || 0) + extraSessionsCost;

  const calculateSavings = (pack) => {
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
        const activePath = (coursePath || window.location.hash || "").replace(
          /\//g,
          "",
        );
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
                                ? { ...item, count: item.count + 1 }
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

                {scheduleData?.specialAssignments?.[d.id] && (
                  <div
                    style={{
                      borderTop: "1px dashed rgba(28,7,0,0.1)",
                      paddingTop: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "900",
                        textTransform: "uppercase",
                        opacity: 0.5,
                        marginBottom: "8px",
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
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {(Array.isArray(scheduleData.specialAssignments[d.id])
                        ? scheduleData.specialAssignments[d.id]
                        : [scheduleData.specialAssignments[d.id]]
                      ).map((addonId) => {
                        const addon = pricing?.specialEvents?.find(
                          (se) => se.id === addonId,
                        );
                        if (!addon) return null;

                        const isSelected = d.selectedAddons?.includes(addonId);
                        const booked =
                          addonBookingCounts[`${d.id}_${addonId}`] || 0;
                        const capLimit = parseInt(addon.capacity || 999);
                        const isFull = booked >= capLimit;
                        const addonColor = getAddonColor(addonId);

                        return (
                          <div
                            key={addonId}
                            onClick={() =>
                              !isFull && toggleAddon(d.id, addonId)
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 12px",
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
                                  color="white"
                                  strokeWidth={4}
                                />
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: "700",
                                  color: isFull ? "#ccc" : "#1c0700",
                                }}
                              >
                                {currentLang === "en"
                                  ? addon.nameEn
                                  : addon.nameDe}
                              </div>
                              {isFull && (
                                <span
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "#ff4d4d",
                                    fontWeight: "800",
                                  }}
                                >
                                  {currentLang === "en" ? "FULL" : "AUSGEBUCHT"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPackOption = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                      fontWeight: "800",
                      margin: 0,
                      fontSize: "1rem",
                    }}
                  >
                    {pack.size}{" "}
                    {currentLang === "en" ? "Sessions Pack" : "er Karte"}
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
                  fontWeight: "700",
                  margin: 0,
                  color: "#4e5f28",
                  fontSize: "1.1rem",
                }}
              >
                {formatPrice(pack.price)} CHF
              </p>
            </div>
            {isSelected && extraSessionsCount > 0 && (
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
          </div>
        );
      })}

      {selectedPackIndex !== null && (
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
              validateAndProceed(() =>
                onPayment(
                  "pack",
                  promoAppliesToPack ? activePromo?.code : null,
                  currentPack.size,
                  finalPackPrice,
                  usableCredits,
                ),
              )
            }
            style={{ ...S.primaryBtnStyle(isMobile), marginTop: "10px" }}
            disabled={
              !currentUser && (!guestInfo.firstName || !guestInfo.email)
            }
          >
            {currentLang === "en"
              ? `${hasSelection ? "Buy & Book" : "Buy"} (${formatPrice(finalPackPrice)} CHF)`
              : `${hasSelection ? "Kaufen & Buchen" : "Kaufen"} (${formatPrice(finalPackPrice)} CHF)`}
          </button>

          <p
            style={{
              fontSize: "0.7rem",
              opacity: 0.6,
              marginTop: "5px",
              fontStyle: "italic",
              lineHeight: "1.4",
              textAlign: "center",
            }}
          >
            {extraSessionsCount > 0
              ? currentLang === "en"
                ? "Selection exceeds available credits and pack size. Extras added at single price."
                : "Auswahl überschreitet Guthaben und Kartengröße. Extras zum Einzelpreis berechnet."
              : currentLang === "en"
                ? `The remaining ${Math.max(0, currentPack.size - remainingEligibleToPay)} credits will be saved to your profile.`
                : `Die restlichen ${Math.max(0, currentPack.size - remainingEligibleToPay)} Guthaben werden deinem Profil gutgeschrieben.`}
          </p>
        </div>
      )}
    </div>
  );

  const renderIndividualOption = () => {
    // Dynamically show the credit usage in the button if it's a mixed payment
    const btnLabel = isMixedPayment
      ? currentLang === "en"
        ? `Pay Balance (${formatPrice(finalTotalPrice)} CHF) + Use ${usableCredits} Credit${usableCredits !== 1 ? "s" : ""}`
        : `Restbetrag zahlen (${formatPrice(finalTotalPrice)} CHF) + ${usableCredits} Guthaben nutzen`
      : currentLang === "en"
        ? `Pay ${hasSelection ? formatPrice(finalTotalPrice) : "0"} CHF`
        : `${hasSelection ? formatPrice(finalTotalPrice) : "0"} CHF zahlen`;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {pricing?.hasPack && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "10px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                backgroundColor: "rgba(28,7,0,0.1)",
              }}
            />
            <span
              style={{
                fontSize: "0.85rem",
                opacity: 0.5,
                fontWeight: "800",
                letterSpacing: "0.5px",
              }}
            >
              {currentLang === "en"
                ? "Or book single sessions"
                : "Oder Einzeltermine buchen"}
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                backgroundColor: "rgba(28,7,0,0.1)",
              }}
            />
          </div>
        )}

        {promoAppliesToSingle && hasSelection && (
          <div
            style={{
              fontSize: "0.85rem",
              textDecoration: "line-through",
              color: "#1c0700",
              opacity: 0.5,
              textAlign: "center",
            }}
          >
            {formatPrice(
              ticketsToPayCash * parseFloat(pricing?.priceSingle || 0),
            )}{" "}
            CHF
          </div>
        )}

        {(!pricing?.hasPack || selectedPackIndex === null) &&
          renderTermsAgreement()}

        <button
          onClick={() =>
            validateAndProceed(() =>
              onPayment(
                "individual",
                activePackCode
                  ? activePackCode.code
                  : promoAppliesToSingle
                    ? activePromo?.code
                    : null,
                0,
                finalTotalPrice,
                usableCredits, // Pass the credits we intend to deduct to Firebase
              ),
            )
          }
          style={{
            ...S.secondaryBtnStyle(isMobile),
            marginTop:
              !pricing?.hasPack || selectedPackIndex === null ? "10px" : 0,
            backgroundColor: hasSelection
              ? "rgba(153, 96, 168, 0.1)"
              : "transparent",
            border: hasSelection
              ? "1px solid #9960a8"
              : "1px solid rgba(28, 7, 0, 0.2)",
          }}
          disabled={
            !hasSelection ||
            (!currentUser && (!guestInfo.firstName || !guestInfo.email))
          }
        >
          {btnLabel}
        </button>

        {/* INELIGIBLE CREDIT USAGE HINT */}
        {isMixedPayment && limitOnePerDay && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "#4e5f28",
              marginTop: "8px",
              textAlign: "center",
              fontStyle: "italic",
              lineHeight: "1.4",
            }}
          >
            {currentLang === "en"
              ? "Only 1 ticket per day can be paid with a credit. Extra tickets are charged at the single price."
              : "Pro Tag kann nur 1 Ticket mit Guthaben bezahlt werden. Zusätzliche Tickets werden zum Einzelpreis berechnet."}
          </p>
        )}
      </div>
    );
  };

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
        <>{renderIndividualOption()}</>
      ) : (
        <>
          {pricing?.hasPack && renderPackOption()}
          {renderIndividualOption()}
        </>
      )}
    </div>
  );

  return (
    <div style={S.bookingCardStyle(isMobile, true)}>
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
            {renderPurchaseOptions()}
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
              {coversEntirely && !activePackCode ? (
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
    </div>
  );
}
