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
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
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

  // --- LOGIC UPDATE: Take existing credits into account ---
  // 1. How many credits do we still need after using existing ones?
  const neededCreditsAfterExisting = currentUser
    ? Math.max(0, totalTicketsSelected - availableCredits)
    : totalTicketsSelected;

  // 2. How many sessions are still not covered after adding the new pack?
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
          const removeDate = () => {
            setSelectedDates((prev) => prev.filter((item) => item.id !== d.id));
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
                  onClick={removeDate}
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
            // Updated comparison logic for individual pack highlights
            const isExceededForThisPack = currentUser
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
                {isSelected && isExceededForThisPack && (
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
                        ? `+ ${extraSessionsCount} extra sessions @ single price`
                        : `+ ${extraSessionsCount} zusätzliche Termine zum Einzelpreis`}
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
          <button
            onClick={() => onPayment("redeem", packCode)}
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
          <button
            onClick={() =>
              onPayment(
                "pack",
                promoAppliesToPack ? activePromo?.code : null,
                currentPack.size,
                finalPackPrice,
              )
            }
            style={S.primaryBtnStyle(isMobile)}
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
            {totalTicketsSelected >
            (currentUser
              ? availableCredits + currentPack.size
              : currentPack.size)
              ? currentLang === "en"
                ? "Selection exceeds available credits and pack size. Extras added at single price."
                : "Auswahl überschreitet Guthaben und Kartengröße. Extras zum Einzelpreis berechnet."
              : currentUser
                ? currentLang === "en"
                  ? `The ${totalTicketsSelected === 0 ? "full" : "remaining"} ${availableCredits + currentPack.size - totalTicketsSelected} credits will be saved to your profile.`
                  : `Die ${totalTicketsSelected === 0 ? "vollen" : "restlichen"} ${availableCredits + currentPack.size - totalTicketsSelected} Guthaben werden deinem Profil gutgeschrieben.`
                : currentLang === "en"
                  ? `You will receive a code for the ${totalTicketsSelected === 0 ? "full" : "remaining"} ${currentPack.size - totalTicketsSelected} credits via email.`
                  : `Du erhältst einen Code für die ${totalTicketsSelected === 0 ? "vollen" : "restlichen"} ${currentPack.size - totalTicketsSelected} Guthaben per E-Mail.`}
          </p>
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
        <button
          onClick={() =>
            onPayment(
              "individual",
              promoAppliesToSingle ? activePromo?.code : null,
            )
          }
          style={S.secondaryBtnStyle(isMobile)}
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
                  ? `Code applied: ${activePromo.discountValue}${activePromo.discountType === "percent" ? "% OFF" : " FREE"}`
                  : `Code angewendet: ${activePromo.discountValue}${activePromo.discountType === "percent" ? "% RABATT" : " GRATIS"}`}
              </p>
            )}
            {promoStatus.error && (
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
                <XCircle size={14} /> {promoStatus.error}
              </p>
            )}
          </div>
        )}
      </div>
      {pricing?.hasPack && renderPackOption()}
      {renderIndividualOption()}
    </div>
  );

  return (
    <div style={S.bookingCardStyle(isMobile, true)}>
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

        {!currentUser && (
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
        )}

        {currentUser && (
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
            {hasSelection && (
              <div
                style={{
                  ...S.selectionInfoStyle(isMobile),
                  marginBottom: "1.5rem",
                }}
              >
                <span style={S.labelStyle(isMobile)}>
                  {totalTicketsSelected}{" "}
                  {currentLang === "en"
                    ? totalTicketsSelected === 1
                      ? "Session"
                      : "Sessions"
                    : "Termine"}
                </span>
                <span style={S.totalPriceStyle(isMobile)}>
                  {formatPrice(totalPrice)} CHF
                </span>
              </div>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {hasEnoughCredits && hasSelection ? (
                <>
                  <button
                    onClick={onBookCredits}
                    style={{ ...S.creditBtnStyle(isMobile), padding: "14px" }}
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
