import React from "react";
import { Ticket, LogIn, UserCircle } from "lucide-react";
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
  const hasSelection = selectedDates.length > 0;

  const handleTriggerAuth = () => {
    window.dispatchEvent(new Event("open-auth"));
  };

  return (
    <div style={S.bookingCardStyle(isMobile, hasSelection)}>
      <div
        style={{
          minWidth: isMobile ? "auto" : "380px",
          opacity: hasSelection ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <h3
          style={{
            fontFamily: "Harmond-SemiBoldCondensed",
            fontSize: "2rem",
            marginBottom: "1.5rem",
          }}
        >
          {currentLang === "en" ? "Booking Summary" : "Buchungsübersicht"}
        </h3>

        {!currentUser && !isGuestMode && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
              marginBottom: "1.5rem",
              padding: "1.5rem",
              backgroundColor: "rgba(28, 7, 0, 0.03)",
              borderRadius: "18px",
            }}
          >
            <p style={{ fontSize: "0.9rem", fontWeight: "700" }}>
              {currentLang === "en"
                ? "How would you like to proceed?"
                : "Wie möchtest du fortfahren?"}
            </p>
            <button
              onClick={handleTriggerAuth}
              style={S.primaryBtnStyle(isMobile)}
            >
              <LogIn size={18} style={{ marginRight: "8px" }} />{" "}
              {currentLang === "en"
                ? "Login / Register"
                : "Login / Registrieren"}
            </button>
            <button
              onClick={() => setIsGuestMode(true)}
              style={{
                ...S.secondaryBtnStyle(isMobile),
                border: "1px solid #1c0700",
                opacity: 1,
              }}
            >
              <UserCircle size={18} style={{ marginRight: "8px" }} />{" "}
              {currentLang === "en"
                ? "Continue as Guest"
                : "Als Gast fortfahren"}
            </button>
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
            <div style={{ display: "flex", justifyContent: "space-between" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {currentUser && availableCredits >= selectedDates.length && (
            <button onClick={onBookCredits} style={S.creditBtnStyle(isMobile)}>
              {currentLang === "en"
                ? `Book with ${selectedDates.length} Credit${selectedDates.length > 1 ? "s" : ""}`
                : `Mit ${selectedDates.length} Guthaben buchen`}
            </button>
          )}

          {pricing.hasPack && !isGuestMode && (
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontWeight: "800", margin: 0 }}>
                  {currentLang === "en"
                    ? `${pricing.packSize}-Session Pack`
                    : `${pricing.packSize}er Karte`}
                </p>
                <p style={{ fontWeight: "700", margin: 0, color: "#4e5f28" }}>
                  {pricing.priceFull} CHF
                </p>
              </div>
              <button
                onClick={() => onPayment("pack")}
                style={S.primaryBtnStyle(isMobile)}
              >
                {currentLang === "en"
                  ? "Buy Pack & Book"
                  : "Karte kaufen & buchen"}
              </button>
            </div>
          )}

          {isGuestMode && !currentUser && (
            <div
              style={{
                textAlign: "center",
                padding: "10px",
                backgroundColor: "rgba(202, 175, 243, 0.05)",
                borderRadius: "12px",
              }}
            >
              <p style={{ fontSize: "0.75rem", opacity: 0.6, margin: 0 }}>
                {currentLang === "en"
                  ? "Log in or Register to unlock session packs."
                  : "Logge dich ein, um Pakete freizuschalten."}
              </p>
            </div>
          )}

          {(currentUser || isGuestMode) && (
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
