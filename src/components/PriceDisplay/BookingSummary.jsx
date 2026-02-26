import React, { useState } from "react";
import {
  Ticket,
  LogIn,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import * as S from "./PriceDisplayStyles";

export default function BookingSummary({
  selectedDates,
  totalPrice,
  availableCredits,
  pricing,
  isGuestMode,
  setIsGuestMode,
  guestInfo,
  setGuestInfo,
  currentUser,
  currentLang,
  isMobile,
  onBookCredits,
  onPayment,
}) {
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPackHint, setShowPackHint] = useState(false);

  // Form States matching AuthOverlay
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const hasSelection = selectedDates.length > 0;

  // Calculate savings percentage
  const singlePriceTotal =
    parseFloat(pricing?.priceSingle || 0) * parseInt(pricing?.packSize || 1);
  const packPrice = parseFloat(pricing?.priceFull || 0);
  const savingsPercent =
    singlePriceTotal > 0
      ? Math.round(((singlePriceTotal - packPrice) / singlePriceTotal) * 100)
      : 0;

  const handleTriggerAuth = () => {
    window.dispatchEvent(new Event("open-auth"));
  };

  const handlePackClick = () => {
    if (!currentUser) {
      setShowPackHint(true);
      setTimeout(() => setShowPackHint(false), 5000);
      return;
    }
    onPayment("pack");
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
        // Store full profile info in Firestore as done in AuthOverlay
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

  return (
    <div style={S.bookingCardStyle(isMobile, true)}>
      <div
        style={{
          minWidth: isMobile ? "auto" : "380px",
          opacity: 1,
          transition: "opacity 0.4s ease",
          textAlign: "left",
        }}
      >
        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: "2rem",
            marginBottom: "1.5rem",
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

        {!currentUser && !isGuestMode && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
              marginBottom: "1.5rem",
              padding: hasSelection ? "1.5rem" : "0",
              backgroundColor: hasSelection
                ? "rgba(28, 7, 0, 0.03)"
                : "transparent",
              borderRadius: "18px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#4e5f28",
                  lineHeight: "1.4",
                  margin: "0 0 5px 0",
                }}
              >
                {isRegistering
                  ? currentLang === "en"
                    ? "Create an account"
                    : "Konto erstellen"
                  : currentLang === "en"
                    ? "Sign in"
                    : "Anmelden"}{" "}
                {currentLang === "en"
                  ? "to unlock the pack and save"
                  : "um die Karte freizuschalten und"}{" "}
                {savingsPercent}% {currentLang === "en" ? "" : "zu sparen."}
              </p>

              <form
                onSubmit={handleInlineAuth}
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {isRegistering && (
                  <>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder={
                          currentLang === "en" ? "First Name" : "Vorname"
                        }
                        required
                        style={{
                          ...S.guestInputStyle,
                          padding: "8px 12px",
                          fontSize: "0.8rem",
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
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          flex: 1,
                        }}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                    <input
                      type="tel"
                      placeholder={
                        currentLang === "en"
                          ? "Phone (optional)"
                          : "Telefon (optional)"
                      }
                      style={{
                        ...S.guestInputStyle,
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                      }}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </>
                )}

                <input
                  type="email"
                  placeholder="Email"
                  required
                  style={{
                    ...S.guestInputStyle,
                    padding: "8px 12px",
                    fontSize: "0.8rem",
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder={currentLang === "en" ? "Password" : "Passwort"}
                  required
                  style={{
                    ...S.guestInputStyle,
                    padding: "8px 12px",
                    fontSize: "0.8rem",
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {authError && (
                  <p
                    style={{ fontSize: "0.7rem", color: "#ff4d4d", margin: 0 }}
                  >
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    ...S.primaryBtnStyle(isMobile),
                    padding: "10px",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
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

              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#9960a8",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
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
                {hasSelection && (
                  <button
                    onClick={() => setIsGuestMode(true)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#1c0700",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                      opacity: 0.6,
                    }}
                  >
                    {currentLang === "en"
                      ? "Continue as Guest"
                      : "Als Gast fortfahren"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <button
                onClick={() => setIsBenefitsExpanded(!isBenefitsExpanded)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#4e5f28",
                  fontSize: "0.8rem",
                  fontWeight: "400",
                }}
              >
                {isBenefitsExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                {currentLang === "en" ? "why sign up?" : "warum registrieren?"}
              </button>

              {isBenefitsExpanded && (
                <ul
                  style={{
                    margin: "0.8rem 0 0 0",
                    paddingLeft: "1.1rem",
                    fontSize: "0.75rem",
                    color: "#4e5f28",
                    opacity: 0.9,
                    lineHeight: "1.5",
                    textAlign: "left",
                  }}
                >
                  <li>
                    {currentLang === "en"
                      ? "Keep track of all your courses in one dashboard"
                      : "Alle deine Kurse im Überblick behalten"}
                  </li>
                  <li>
                    {currentLang === "en"
                      ? "Cancel sessions with just one click"
                      : "Termine mit einem Klick absagen"}
                  </li>
                  <li>
                    {currentLang === "en"
                      ? "Book instantly with credits - no checkout needed"
                      : "Mit Guthaben buchen - ganz ohne Bezahlvorgang"}
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}

        {isGuestMode && !currentUser && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: "800" }}>
                {currentLang === "en" ? "GUEST DETAILS" : "GAST-DETAILS"}
              </span>
              <button
                onClick={() => setIsGuestMode(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.7rem",
                  textDecoration: "underline",
                  cursor: "pointer",
                  opacity: 0.5,
                }}
              >
                {currentLang === "en" ? "Back" : "Zurück"}
              </button>
            </div>
            <input
              type="text"
              placeholder={currentLang === "en" ? "First Name" : "Vorname"}
              style={S.guestInputStyle}
              value={guestInfo.firstName}
              onChange={(e) =>
                setGuestInfo({ ...guestInfo, firstName: e.target.value })
              }
            />
            <input
              type="text"
              placeholder={currentLang === "en" ? "Last Name" : "Nachname"}
              style={S.guestInputStyle}
              value={guestInfo.lastName}
              onChange={(e) =>
                setGuestInfo({ ...guestInfo, lastName: e.target.value })
              }
            />
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

        {currentUser && (
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
              fontWeight: "600",
            }}
          >
            <Ticket size={16} />
            <span>
              {currentLang === "en" ? "Your Balance:" : "Dein Guthaben:"}{" "}
              <strong>{availableCredits}</strong>
            </span>
          </div>
        )}

        {hasSelection && (
          <div style={S.selectionInfoStyle(isMobile)}>
            <span style={S.labelStyle(isMobile)}>
              {selectedDates.length}{" "}
              {currentLang === "en"
                ? selectedDates.length === 1
                  ? "Session"
                  : "Sessions"
                : "Termine"}
            </span>
            <span style={S.totalPriceStyle(isMobile)}>{totalPrice} CHF</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {currentUser &&
            availableCredits >= selectedDates.length &&
            hasSelection && (
              <button
                onClick={onBookCredits}
                style={S.creditBtnStyle(isMobile)}
              >
                {currentLang === "en"
                  ? `Book with ${selectedDates.length} Credit${selectedDates.length > 1 ? "s" : ""}`
                  : `Mit ${selectedDates.length} Guthaben buchen`}
              </button>
            )}

          {pricing.hasPack && (
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                  }}
                >
                  <p style={{ fontWeight: "800", margin: 0 }}>
                    {currentLang === "en"
                      ? `${pricing.packSize}-Session Pack`
                      : `${pricing.packSize}er Karte`}
                  </p>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "#9960a8",
                      fontWeight: "900",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentLang === "en"
                      ? `SAVE ${savingsPercent}%`
                      : `${savingsPercent}% ERSPARNIS`}
                  </span>
                </div>
                <p style={{ fontWeight: "700", margin: 0, color: "#4e5f28" }}>
                  {pricing.priceFull} CHF
                </p>
              </div>

              <button
                onClick={handlePackClick}
                style={S.primaryBtnStyle(isMobile)}
              >
                {currentLang === "en"
                  ? "Buy Pack & Book"
                  : "Karte kaufen & buchen"}
              </button>

              {showPackHint && !currentUser && (
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "#ff4d4d",
                    textAlign: "left",
                    fontWeight: "700",
                    marginTop: "-5px",
                  }}
                >
                  {currentLang === "en"
                    ? "Sign in above to purchase this pack."
                    : "Melde dich oben an, um diese Karte zu kaufen."}
                </p>
              )}

              {currentUser && hasSelection && (
                <p
                  style={{
                    fontSize: "0.7rem",
                    opacity: 0.6,
                    margin: 0,
                    fontStyle: "italic",
                    textAlign: "left",
                  }}
                >
                  {currentLang === "en"
                    ? `The remaining ${pricing.packSize - selectedDates.length} credits will be saved to your profile.`
                    : `Die restlichen ${pricing.packSize - selectedDates.length} Guthaben werden deinem Profil gutgeschrieben.`}
                </p>
              )}
            </div>
          )}

          {(currentUser || isGuestMode) && hasSelection && (
            <button
              onClick={() => onPayment("individual")}
              style={S.secondaryBtnStyle(isMobile)}
              disabled={
                isGuestMode && (!guestInfo.firstName || !guestInfo.email)
              }
            >
              {currentLang === "en"
                ? `Pay ${totalPrice} CHF`
                : `${totalPrice} CHF zahlen`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
