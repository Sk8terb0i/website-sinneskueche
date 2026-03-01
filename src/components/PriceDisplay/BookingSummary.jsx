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
  AlertCircle, // Added for the error feedback
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
  guestInfo,
  setGuestInfo,
  currentUser,
  currentLang,
  isMobile,
  onBookCredits,
  onPayment,
  coursePath,
}) {
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const [packCode, setPackCode] = useState("");
  const [showStripeAlternative, setShowStripeAlternative] = useState(false);

  const [isPromoExpanded, setIsPromoExpanded] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [activePromo, setActivePromo] = useState(null);
  const [promoStatus, setPromoStatus] = useState({ loading: false, error: "" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  // --- Terms and Conditions State ---
  const [courseTerms, setCourseTerms] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [shakeTerms, setShakeTerms] = useState(false); // NEW: Controls the shake animation

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

  // --- NEW: Validation Helper ---
  const validateAndProceed = (actionFn) => {
    if (courseTerms && !agreedToTerms) {
      setShakeTerms(true);
      setTimeout(() => setShakeTerms(false), 500); // Reset animation
      return;
    }
    actionFn();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
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

  const currentPack = packOptions[selectedPackIndex] || { size: 0, price: 0 };
  const hasSelection = selectedDates.length > 0;
  const totalTicketsSelected = selectedDates.reduce(
    (sum, d) => sum + (d.count || 1),
    0,
  );
  const hasEnoughCredits = availableCredits >= totalTicketsSelected;

  const neededCreditsAfterExisting = currentUser
    ? Math.max(0, totalTicketsSelected - availableCredits)
    : totalTicketsSelected;

  const extraSessionsCount = Math.max(
    0,
    neededCreditsAfterExisting - currentPack.size,
  );
  const extraSessionsCost =
    extraSessionsCount * parseFloat(pricing?.priceSingle || 0);

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

  let finalTotalPrice = parseFloat(totalPrice || 0);
  let finalPackPrice = parseFloat(currentPack?.price || 0) + extraSessionsCost;

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

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoStatus({ loading: true, error: "" });
    setActivePromo(null);
    try {
      const q = query(
        collection(db, "promo_codes"),
        where("code", "==", promoCodeInput.trim().toUpperCase()),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setPromoStatus({
          loading: false,
          error: currentLang === "en" ? "Invalid code." : "Ungültiger Code.",
        });
        return;
      }
      const promoData = snap.docs[0].data();
      const activePath = (coursePath || window.location.hash || "").replace(
        /\//g,
        "",
      );
      if (
        promoData.coursePath &&
        promoData.coursePath !== "all" &&
        !activePath.includes(promoData.coursePath.replace(/\//g, ""))
      ) {
        setPromoStatus({
          loading: false,
          error:
            currentLang === "en"
              ? "Code not valid for this course."
              : "Code gilt nicht für diesen Kurs.",
        });
        return;
      }
      setActivePromo(promoData);
      setPromoStatus({ loading: false, error: "" });
    } catch (err) {
      setPromoStatus({ loading: false, error: "Error verifying code." });
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
              fontSize: "0.85rem",
              fontWeight: "600",
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

        {/* Modal Overlay */}
        {showTermsPopup && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(28, 7, 0, 0.6)",
              zIndex: 10000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px",
            }}
            onClick={() => setShowTermsPopup(false)}
          >
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
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "1px",
          opacity: 0.6,
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Calendar size={14} />{" "}
        {currentLang === "en" ? "Your Selection" : "Deine Auswahl"}
      </h4>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxHeight: "210px",
          overflowY: "auto",
          paddingRight: "5px",
        }}
        className="custom-scrollbar"
      >
        {selectedDates.map((d) => {
          const booked = eventBookingCounts[d.id] || 0;
          const cap = parseInt(pricing?.capacity || 99);
          const canAddMore = !pricing?.hasCapacity || booked + d.count < cap;
          const updateCount = (delta) => {
            setSelectedDates((prev) =>
              prev.map((item) => {
                if (item.id === d.id) {
                  const newCount = Math.max(1, item.count + delta);
                  if (delta > 0 && !canAddMore) return item;
                  return { ...item, count: newCount };
                }
                return item;
              }),
            );
          };
          return (
            <div
              key={d.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#fdf8e1",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(28, 7, 0, 0.05)",
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
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
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
                    onClick={() => updateCount(-1)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontWeight: "900",
                      color: "#9960a8",
                      padding: "0 6px",
                    }}
                  >
                    -
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
                    onClick={() => updateCount(1)}
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
                    +
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
          );
        })}
      </div>
    </div>
  );

  const renderPackOption = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {!isRedeemingCode && (
        <>
          {packOptions.map((pack, idx) => {
            const isSelected = selectedPackIndex === idx;
            const savings = calculateSavings(pack);
            const isExceeded = currentUser
              ? totalTicketsSelected > availableCredits + pack.size
              : totalTicketsSelected > pack.size;
            return (
              <div
                key={idx}
                onClick={() => setSelectedPackIndex(idx)}
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
                {isSelected && isExceeded && (
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
                        ? `+ ${totalTicketsSelected - (currentUser ? availableCredits + pack.size : pack.size)} extra sessions @ single price`
                        : `+ ${totalTicketsSelected - (currentUser ? availableCredits + pack.size : pack.size)} zusätzliche Termine zum Einzelpreis`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {!currentUser && isRedeemingCode ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "10px",
          }}
        >
          <h4
            style={{
              marginTop: 0,
              marginBottom: "5px",
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: "1.2rem",
            }}
          >
            {currentLang === "en"
              ? "redeem session-pack"
              : "session-pack einlösen"}
          </h4>
          <input
            type="text"
            placeholder={
              currentLang === "en" ? "Enter pack code" : "Code eingeben"
            }
            value={packCode}
            onChange={(e) => setPackCode(e.target.value.toUpperCase())}
            style={{
              ...S.guestInputStyle,
              padding: "12px 14px",
              fontSize: "0.9rem",
            }}
          />
          {renderTermsAgreement()}
          <button
            onClick={() =>
              validateAndProceed(() => onPayment("redeem", packCode))
            }
            style={S.primaryBtnStyle(isMobile)}
            disabled={!packCode || !guestInfo.email}
          >
            {currentLang === "en" ? "Redeem & Book" : "Einlösen & Buchen"}
          </button>
          <button
            onClick={() => setIsRedeemingCode(false)}
            style={{
              background: "none",
              border: "none",
              textDecoration: "underline",
              color: "#4e5f28",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "8px 0",
            }}
          >
            {currentLang === "en" ? "Back to buy pack" : "Zurück zum Kauf"}
          </button>
        </div>
      ) : (
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
          {!currentUser && (
            <button
              onClick={() => setIsRedeemingCode(true)}
              style={{
                background: "none",
                border: "none",
                textDecoration: "underline",
                color: "#4e5f28",
                cursor: "pointer",
                fontSize: "0.75rem",
                padding: "4px 0",
              }}
            >
              {currentLang === "en"
                ? "Have a pack code? Redeem here."
                : "Hast du einen Code? Hier einlösen."}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderIndividualOption = () =>
    hasSelection && (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {promoAppliesToSingle && (
          <div
            style={{
              fontSize: "0.85rem",
              textDecoration: "line-through",
              color: "#1c0700",
              opacity: 0.5,
              textAlign: "center",
            }}
          >
            {formatPrice(totalPrice)} CHF
          </div>
        )}
        {!pricing?.hasPack && renderTermsAgreement()}
        <button
          onClick={() =>
            validateAndProceed(() =>
              onPayment(
                "individual",
                promoAppliesToSingle ? activePromo?.code : null,
              ),
            )
          }
          style={{
            ...S.secondaryBtnStyle(isMobile),
            marginTop: !pricing?.hasPack ? "10px" : 0,
          }}
          disabled={!currentUser && (!guestInfo.firstName || !guestInfo.email)}
        >
          {currentLang === "en"
            ? `Pay ${formatPrice(finalTotalPrice)} CHF`
            : `${formatPrice(finalTotalPrice)} CHF zahlen`}
        </button>
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
        {!isPromoExpanded && !activePromo ? (
          <button
            onClick={() => setIsPromoExpanded(true)}
            style={{
              background: "none",
              border: "none",
              color: "#9960a8",
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: 0,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Ticket size={16} />{" "}
            {currentLang === "en"
              ? "Add Promo / Discount Code"
              : "Aktions- / Rabattcode hinzufügen"}
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
                {currentLang === "en" ? "Discount Code" : "Rabattcode"}
              </label>
              <button
                onClick={() => {
                  setIsPromoExpanded(false);
                  setPromoCodeInput("");
                  setActivePromo(null);
                  setPromoStatus({ loading: false, error: "" });
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
                placeholder="e.g. SUMMER24"
                value={promoCodeInput}
                onChange={(e) =>
                  setPromoCodeInput(e.target.value.toUpperCase())
                }
                disabled={activePromo}
                style={{
                  ...S.guestInputStyle,
                  padding: "10px 12px",
                  flex: 1,
                  backgroundColor: activePromo
                    ? "rgba(78, 95, 40, 0.05)"
                    : "rgba(255, 252, 227, 0.4)",
                }}
              />
              {!activePromo && (
                <button
                  onClick={handleApplyPromo}
                  disabled={promoStatus.loading || !promoCodeInput}
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
                  {promoStatus.loading ? (
                    <Loader2 size={16} className="spinner" />
                  ) : currentLang === "en" ? (
                    "Apply"
                  ) : (
                    "Anwenden"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {pricing?.hasPack && renderPackOption()}
      {renderIndividualOption()}
    </div>
  );

  return (
    <div style={S.bookingCardStyle(isMobile, true)}>
      {/* CSS For Shake Animation */}
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
            marginBottom: "1.5rem",
            marginTop: 0,
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(78, 95, 40, 0.1)",
                color: "#4e5f28",
                padding: "10px 18px",
                borderRadius: "100px",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
                width: "fit-content",
                fontWeight: "600",
              }}
            >
              <Ticket size={16} />
              <span>
                {currentLang === "en" ? "Your Balance:" : "Dein Guthaben:"}{" "}
                <strong>{availableCredits}</strong>
              </span>
            </div>
            {hasSelection && renderSelectionSummary()}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {hasEnoughCredits && hasSelection ? (
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
