import { CheckCircle, Mail, Ticket, CreditCard } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../Header/Header";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function Success({ currentLang, setCurrentLang }) {
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // Get signals from URL
  const sessionId = searchParams.get("session_id");
  const redeemedCode = searchParams.get("code");
  const remainingParam = searchParams.get("remaining");
  const mode = searchParams.get("mode"); // 'pack' or 'individual'
  const type = searchParams.get("type"); // 'credit'
  const bookedParam = searchParams.get("booked"); // 'true' or 'false'

  const remainingCredits =
    remainingParam &&
    remainingParam !== "undefined" &&
    remainingParam !== "null"
      ? parseInt(remainingParam, 10)
      : null;

  // Determine if dates were actually selected and booked
  let hasBookedDates = false;
  if (bookedParam === "true") {
    hasBookedDates = true;
  } else if (bookedParam === "false") {
    hasBookedDates = false;
  } else {
    // Fallback for older URLs missing the parameter
    hasBookedDates =
      type === "credit" || mode === "individual" || mode === "redeem";
  }

  const content = {
    en: {
      titleBooking: "booking successful",
      titlePurchase: "purchase successful",
      message: "Thank you! Your transaction was successful.",
      dateConfirmation:
        "Your selected dates are confirmed. You will receive a confirmation email shortly.",
      packOnlyConfirmation:
        "Your session pack is ready! You will receive a receipt via email shortly.",
      memberPack: "Your credits have been added to your profile balance.",
      guestPack:
        "Since you purchased a session pack, we have sent a unique booking code to your email for future use.",
      individualPaid: "Your session payment has been processed successfully.",
      creditBooking: "One session has been deducted from your profile balance.",
      redeemNote:
        remainingCredits > 0
          ? `You have ${remainingCredits} ${remainingCredits === 1 ? "session" : "sessions"} left on your code: ${redeemedCode}`
          : `You have used the last session on your code: ${redeemedCode}.`,
      button: "Go to Profile",
      home: "Back to Home",
    },
    de: {
      titleBooking: "buchung erfolgreich",
      titlePurchase: "kauf erfolgreich",
      message: "Vielen Dank! Die Transaktion war erfolgreich.",
      dateConfirmation:
        "Deine gewählten Termine sind bestätigt. Du erhältst in Kürze eine Bestätigungs-E-Mail.",
      packOnlyConfirmation:
        "Dein Kurspaket ist bereit! Du erhältst in Kürze einen Beleg per E-Mail.",
      memberPack: "Dein Guthaben wurde deinem Profil gutgeschrieben.",
      guestPack:
        "Da du eine Karte gekauft hast, haben wir dir einen Buchungscode per E-Mail gesendet.",
      individualPaid:
        "Deine Zahlung für den Einzeltermin wurde erfolgreich verarbeitet.",
      creditBooking: "Der Termin wurde von deinem Profil-Guthaben abgezogen.",
      redeemNote:
        remainingCredits > 0
          ? `Du hast noch ${remainingCredits} ${remainingCredits === 1 ? "Termin" : "Termine"} auf deinem Code übrig: ${redeemedCode}`
          : `Du hast den letzten Termin auf deinem Code aufgebraucht: ${redeemedCode}.`,
      button: "Zum Profil",
      home: "Zurück zur Startseite",
    },
  };

  const t = content[currentLang];

  return (
    <div
      className="course-container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        isMenuOpen={isMenuOpen}
        onMenuToggle={setIsMenuOpen}
      />

      <main style={styles.main}>
        <CheckCircle
          size={80}
          color="#4e5f28"
          style={{ marginBottom: "2rem" }}
        />

        <h1 style={styles.title}>
          {hasBookedDates ? t.titleBooking : t.titlePurchase}
        </h1>
        <p style={styles.message}>{t.message}</p>
        <p style={styles.confirmation}>
          {hasBookedDates ? t.dateConfirmation : t.packOnlyConfirmation}
        </p>

        {/* SCENARIO 1: REDEEMED A PACK CODE */}
        {redeemedCode && remainingCredits !== null && (
          <div style={styles.infoBox}>
            <Ticket size={20} color="#9960a8" />
            <p style={styles.infoText}>{t.redeemNote}</p>
          </div>
        )}

        {/* SCENARIO 2: BOOKED WITH PROFILE CREDITS */}
        {type === "credit" && (
          <div style={styles.infoBox}>
            <Ticket size={20} color="#9960a8" />
            <p style={styles.infoText}>{t.creditBooking}</p>
          </div>
        )}

        {/* SCENARIO 3: BOUGHT A PACK AS A GUEST */}
        {!currentUser && mode === "pack" && sessionId && (
          <div
            style={{
              ...styles.infoBox,
              backgroundColor: "rgba(78, 95, 40, 0.1)",
              borderColor: "rgba(78, 95, 40, 0.2)",
            }}
          >
            <Mail size={20} color="#4e5f28" />
            <p style={{ ...styles.infoText, color: "#4e5f28" }}>
              {t.guestPack}
            </p>
          </div>
        )}

        {/* SCENARIO 4: BOUGHT A PACK AS A MEMBER */}
        {currentUser && mode === "pack" && sessionId && (
          <div style={styles.infoBox}>
            <Ticket size={20} color="#9960a8" />
            <p style={styles.infoText}>{t.memberPack}</p>
          </div>
        )}

        {/* SCENARIO 5: PAID INDIVIDUAL SESSION (Member or Guest) */}
        {mode === "individual" && sessionId && (
          <div
            style={{
              ...styles.infoBox,
              backgroundColor: "rgba(202, 175, 243, 0.05)",
            }}
          >
            <CreditCard size={20} color="#9960a8" />
            <p style={styles.infoText}>{t.individualPaid}</p>
          </div>
        )}

        <div style={styles.buttonContainer}>
          {currentUser && (
            <Link to="/profile" style={styles.primaryBtn}>
              {t.button}
            </Link>
          )}

          <Link
            to="/"
            style={currentUser ? styles.secondaryBtn : styles.primaryBtn}
          >
            {t.home}
          </Link>
        </div>

        {sessionId && (
          <p style={{ marginTop: "3rem", fontSize: "0.7rem", opacity: 0.4 }}>
            Session ID: {sessionId}
          </p>
        )}
      </main>
    </div>
  );
}

const styles = {
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "120px 20px 40px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "3rem",
    color: "#1c0700",
    marginBottom: "1rem",
    textTransform: "lowercase",
  },
  message: {
    fontSize: "1.1rem",
    color: "#1c0700",
    marginBottom: "0.5rem",
    fontWeight: "700",
  },
  confirmation: {
    fontSize: "0.95rem",
    color: "#1c0700",
    opacity: 0.7,
    marginBottom: "2.5rem",
    lineHeight: "1.5",
  },
  infoBox: {
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    padding: "18px 25px",
    borderRadius: "16px",
    border: "1px solid #caaff3",
    marginBottom: "2.5rem",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
  },
  infoText: {
    color: "#9960a8",
    fontWeight: "700",
    margin: 0,
    fontSize: "0.95rem",
    lineHeight: "1.4",
  },
  buttonContainer: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryBtn: {
    padding: "1rem 2.5rem",
    backgroundColor: "#9960a8",
    color: "#fdf8e1",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "700",
    fontFamily: "Satoshi",
    transition: "transform 0.2s ease",
  },
  secondaryBtn: {
    padding: "1rem 2.5rem",
    backgroundColor: "transparent",
    color: "#1c0700",
    border: "1px solid rgba(28, 7, 0, 0.2)",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Satoshi",
  },
};
