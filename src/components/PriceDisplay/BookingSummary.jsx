import React, { useState } from "react";
import {
  Ticket,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
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
  guestInfo,
  setGuestInfo,
  currentUser,
  currentLang,
  isMobile,
  onBookCredits,
  onPayment, // Expected to handle ("pack"), ("individual"), or ("redeem", packCode)
}) {
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // New States for Guest Pack Redemption & Logged-in Stripe toggle
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const [packCode, setPackCode] = useState("");
  const [showStripeAlternative, setShowStripeAlternative] = useState(false);

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

  // UPDATED: Refined Pack Option layout for mobile
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
      {/* NEW: Header section is now wrapped in a conditional. 
        It only displays if we are NOT in redemption mode.
      */}
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
                margin: 0,
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
          <p
            style={{
              fontWeight: "700",
              margin: 0,
              color: "#4e5f28",
              fontSize: isMobile ? "1.4rem" : "1.1rem",
            }}
          >
            {pricing.priceFull} CHF
          </p>
        </div>
      )}

      {!currentUser && isRedeemingCode ? (
        // REDEEM CODE VIEW FOR GUESTS
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Optional: Add a simple title so the card isn't too empty at the top */}
          <h4
            style={{
              margin: "0 0 5px 0",
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: "1.2rem",
            }}
          >
            {currentLang === "en" ? "redeem code" : "code einlösen"}
          </h4>
          <input
            type="text"
            placeholder={
              currentLang === "en" ? "Enter pack code" : "Code eingeben"
            }
            value={packCode}
            onChange={(e) => setPackCode(e.target.value)}
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
        // BUY PACK VIEW
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => onPayment("pack")}
            style={S.primaryBtnStyle(isMobile)}
            disabled={
              !currentUser && (!guestInfo.firstName || !guestInfo.email)
            }
          >
            {currentLang === "en" ? "Buy Pack & Book" : "Karte kaufen & buchen"}
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

          {currentUser && hasSelection && (
            <p
              style={{
                fontSize: "0.7rem",
                opacity: 0.6,
                margin: 0,
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
      <button
        onClick={() => onPayment("individual")}
        style={S.secondaryBtnStyle(isMobile)}
        disabled={!currentUser && (!guestInfo.firstName || !guestInfo.email)}
      >
        {currentLang === "en"
          ? `Pay ${totalPrice} CHF`
          : `${totalPrice} CHF zahlen`}
      </button>
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
                        margin: 0,
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
                  placeholder={currentLang === "en" ? "First Name" : "Vorname"}
                  style={{ ...S.guestInputStyle, flex: 1 }}
                  value={guestInfo.firstName}
                  onChange={(e) =>
                    setGuestInfo({ ...guestInfo, firstName: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder={currentLang === "en" ? "Last Name" : "Nachname"}
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

            <div
              style={{
                color: "#4e5f28",
                fontSize: "0.75rem",
                lineHeight: "1.5",
                marginBottom: "1.5rem",
              }}
            >
              {currentLang === "en"
                ? "Buy without registering to receive a pack code via email. Sign up to save credits for easy payment and to see or cancel all your booked courses."
                : "Kaufe ohne Registrierung, um einen Code per E-Mail zu erhalten. Melde dich an, um Guthaben für einfache Zahlungen zu speichern und deine gebuchten Kurse einzusehen oder abzusagen."}
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {pricing?.hasPack && renderPackOption()}
              {renderIndividualOption()}
            </div>
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
                  {totalPrice} CHF
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

                  {showStripeAlternative && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      {pricing?.hasPack && renderPackOption()}
                      {renderIndividualOption()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {pricing?.hasPack && renderPackOption()}
                  {renderIndividualOption()}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
