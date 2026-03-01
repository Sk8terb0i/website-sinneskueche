import React, { useState } from "react";
import {
  Ticket,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
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
  totalPrice,
  availableCredits,
  pricing,
  guestInfo,
  setGuestInfo,
  currentUser,
  currentLang,
  isMobile,
  onBookCredits,
  onPayment, // Expected to handle ("pack", promoCode), ("individual", promoCode), or ("redeem", packCode)
  coursePath, // Optional: if missing, validation falls back to window URL
}) {
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // States for Guest Pack Redemption & Logged-in Stripe toggle
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const [packCode, setPackCode] = useState("");
  const [showStripeAlternative, setShowStripeAlternative] = useState(false);

  // States for Promo / Discount Codes
  const [isPromoExpanded, setIsPromoExpanded] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [activePromo, setActivePromo] = useState(null);
  const [promoStatus, setPromoStatus] = useState({ loading: false, error: "" });

  // Form States for Inline Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const hasSelection = selectedDates.length > 0;
  const hasEnoughCredits = availableCredits >= selectedDates.length;

  // Calculate savings percentage
  const singlePriceTotal =
    parseFloat(pricing?.priceSingle || 0) * parseInt(pricing?.packSize || 1);
  const packPrice = parseFloat(pricing?.priceFull || 0);
  const savingsPercent =
    singlePriceTotal > 0
      ? Math.round(((singlePriceTotal - packPrice) / singlePriceTotal) * 100)
      : 0;

  // NEW: Determine what the active promo code applies to (fallback to "both" for old codes)
  const promoApplyTo = activePromo?.applyTo || "both";
  const promoAppliesToPack =
    activePromo && (promoApplyTo === "both" || promoApplyTo === "pack");
  const promoAppliesToSingle =
    activePromo && (promoApplyTo === "both" || promoApplyTo === "single");

  // Calculate discounted prices based on where the promo applies
  let finalTotalPrice = parseFloat(totalPrice || 0);
  let finalPackPrice = parseFloat(pricing?.priceFull || 0);

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

  // Format to remove .00 if whole number
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

      // Robust Validation: Check if the promo applies to the active URL or passed coursePath
      const promoPath = (promoData.coursePath || "").replace(/\//g, "");
      const activePath = (
        coursePath ||
        window.location.hash ||
        window.location.pathname ||
        ""
      ).replace(/\//g, "");

      if (promoPath && promoPath !== "all" && !activePath.includes(promoPath)) {
        setPromoStatus({
          loading: false,
          error:
            currentLang === "en"
              ? "Code not valid for this course."
              : "Code gilt nicht für diesen Kurs.",
        });
        return;
      }

      if (
        promoData.limitType === "uses" &&
        promoData.timesUsed >= promoData.maxUses
      ) {
        setPromoStatus({
          loading: false,
          error:
            currentLang === "en"
              ? "Code limit reached."
              : "Code-Limit erreicht.",
        });
        return;
      }
      if (
        promoData.limitType === "date" &&
        new Date(promoData.expiryDate) < new Date()
      ) {
        setPromoStatus({
          loading: false,
          error: currentLang === "en" ? "Code expired." : "Code abgelaufen.",
        });
        return;
      }

      setActivePromo(promoData);
      setPromoStatus({ loading: false, error: "" });
    } catch (err) {
      console.error(err);
      setPromoStatus({ loading: false, error: "Error verifying code." });
    }
  };

  const renderPackOption = () => (
    <div
      style={{
        backgroundColor: "rgba(202, 175, 243, 0.15)",
        borderRadius: "20px",
        padding: isMobile ? "1.2rem" : "1.8rem",
        border: "1px solid #caaff3",
        display: "flex",
        flexDirection: "column",
        gap: "1.2rem",
      }}
    >
      {!isRedeemingCode && (
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "baseline",
            gap: isMobile ? "8px" : "0",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p
              style={{
                fontWeight: "800",
                marginTop: 0,
                marginBottom: 0,
                fontSize: "1.1rem",
                lineHeight: 1.2,
              }}
            >
              {currentLang === "en"
                ? `${pricing.packSize}-Session Pack`
                : `${pricing.packSize}er Karte`}
            </p>
            <span
              style={{
                fontSize: "0.6rem",
                color: "#9960a8",
                backgroundColor: "rgba(153, 96, 168, 0.1)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "900",
                width: "fit-content",
              }}
            >
              {currentLang === "en"
                ? `SAVE ${savingsPercent}%`
                : `${savingsPercent}% ERSPARNIS`}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMobile ? "flex-start" : "flex-end",
            }}
          >
            {promoAppliesToPack && (
              <span
                style={{
                  fontSize: "0.85rem",
                  textDecoration: "line-through",
                  color: "#1c0700",
                  opacity: 0.5,
                }}
              >
                {formatPrice(pricing.priceFull)} CHF
              </span>
            )}
            <p
              style={{
                fontWeight: "700",
                marginTop: 0,
                marginBottom: 0,
                color: "#4e5f28",
                fontSize: isMobile ? "1.4rem" : "1.1rem",
              }}
            >
              {formatPrice(finalPackPrice)} CHF
            </p>
          </div>
        </div>
      )}

      {!currentUser && isRedeemingCode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() =>
              onPayment("pack", promoAppliesToPack ? activePromo?.code : null)
            }
            style={S.primaryBtnStyle(isMobile)}
            disabled={
              !currentUser && (!guestInfo.firstName || !guestInfo.email)
            }
          >
            {currentLang === "en"
              ? hasSelection
                ? "Buy & Book"
                : "Buy"
              : hasSelection
                ? "Kaufen & Buchen"
                : "Kaufen"}
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

          {!currentUser && (
            <div
              style={{
                color: "#4e5f28",
                fontSize: "0.75rem",
                lineHeight: "1.5",
                marginTop: "0.5rem",
                backgroundColor: "rgba(78, 95, 40, 0.05)",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              {currentLang === "en" ? (
                <>
                  <strong>Guest:</strong> Get a pack code via email to use
                  later.
                  <br />
                  <strong>Member:</strong> Save credits to your profile for easy
                  booking.
                  <br />
                  <br />
                  <em>Note:</em> You can select dates now (deducted from pack),
                  or buy without dates to use later.
                </>
              ) : (
                <>
                  <strong>Gast:</strong> Erhalte einen Code per E-Mail für
                  später.
                  <br />
                  <strong>Mitglied:</strong> Speichere Guthaben im Profil für
                  einfache Zahlungen.
                  <br />
                  <br />
                  <em>Hinweis:</em> Termine können sofort gewählt (werden
                  abgezogen) oder für später aufbewahrt werden.
                </>
              )}
            </div>
          )}

          {currentUser && hasSelection && (
            <p
              style={{
                fontSize: "0.7rem",
                opacity: 0.6,
                marginTop: 0,
                marginBottom: 0,
                fontStyle: "italic",
                textAlign: "left",
                lineHeight: "1.3",
              }}
            >
              {currentLang === "en"
                ? `The remaining ${pricing.packSize - selectedDates.length} credits will be saved to your profile.`
                : `Die restlichen ${pricing.packSize - selectedDates.length} Guthaben werden deinem Profil gutgeschrieben.`}
            </p>
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
      {/* PROMO CODE INTERFACE */}
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
            <Ticket size={16} />
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
                  color: "#ff4d4d",
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
                    color: "#fff",
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
                  marginBottom: 0,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle size={14} />
                {currentLang === "en"
                  ? `Code applied: ${activePromo.discountValue}${
                      activePromo.discountType === "percent" ? "% OFF" : " FREE"
                    }`
                  : `Code angewendet: ${activePromo.discountValue}${
                      activePromo.discountType === "percent"
                        ? "% RABATT"
                        : " GRATIS"
                    }`}
              </p>
            )}
            {promoStatus.error && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#ff4d4d",
                  marginTop: "4px",
                  marginBottom: 0,
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
          transition: "opacity 0.4s ease",
          textAlign: "left",
        }}
      >
        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: isMobile ? "1.8rem" : "2rem",
            marginBottom: "1.5rem",
            marginTop: 0,
            textAlign: "left",
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
                        style={{
                          ...S.guestInputStyle,
                          flex: 1,
                        }}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder={
                          currentLang === "en" ? "Last Name" : "Nachname"
                        }
                        required
                        style={{
                          ...S.guestInputStyle,
                          flex: 1,
                        }}
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
                        color: "#ff4d4d",
                        marginTop: 0,
                        marginBottom: 0,
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
                  {currentLang === "en" ? "GUEST DETAILS" : "GAST-DETAILS"}
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

            {hasSelection && (
              <div
                style={{
                  ...S.selectionInfoStyle(isMobile),
                  marginBottom: "1.5rem",
                }}
              >
                <span style={S.labelStyle(isMobile)}>
                  {selectedDates.length}{" "}
                  {currentLang === "en"
                    ? selectedDates.length === 1
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
                      ? `Book with ${selectedDates.length} Credits`
                      : `Mit ${selectedDates.length} Guthaben buchen`}
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
