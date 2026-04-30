import {
  CheckCircle,
  Mail,
  Ticket,
  CreditCard,
  AlertTriangle,
  Calendar,
} from "lucide-react";
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
  const mode = searchParams.get("mode"); // 'pack', 'individual', or 'redeem'
  const type = searchParams.get("type"); // 'credit' or 'request'
  const bookedParam = searchParams.get("booked"); // 'true' or 'false'
  const status = searchParams.get("status");

  const remainingCredits =
    remainingParam &&
    remainingParam !== "undefined" &&
    remainingParam !== "null"
      ? parseInt(remainingParam, 10)
      : null;

  const hasBookedDates = bookedParam === "true";
  const isPackPurchase = mode === "pack";
  const isRequest = type === "request";
  const isRedeem = mode === "redeem";
  const isCreditBooking = type === "credit";

  const content = {
    en: {
      titleBooking: "booking successful",
      titlePurchase: "purchase successful",
      titleMixed: "purchase & booking successful",
      titleRequest: "request sent",
      message: "Thank you! Your transaction was successful.",
      requestMessage: "Thank you! We have received your request.",

      // Main Content
      dateConfirmation:
        "Your selected dates are now confirmed and blocked for you.",
      packConfirmation: "Your new session pack has been activated.",
      requestConfirmation:
        "We have received your availability request. We will review the dates and contact you via email shortly.",

      // Email / Location Info
      memberCredits:
        "Your credits have been added directly to your profile balance.",
      guestCredits:
        "We have sent a unique booking code to your email. You can use this code for future bookings.",
      emailSent:
        "A confirmation email and receipt have been sent to your inbox.",
      spamWarning:
        "If you don't see our email within a few minutes, please check your spam folder.",

      // Breakdown Items
      itemBooking: "Confirmed Session(s)",
      itemPack: "Session Pack Credits",
      itemRequest: "Availability Request",

      // Secondary Info
      redeemNote:
        remainingCredits > 0
          ? `Remaining on code ${redeemedCode}: ${remainingCredits} ${remainingCredits === 1 ? "session" : "sessions"}.`
          : `You have used the last session on your code: ${redeemedCode}.`,

      buttonProfile: "Go to Profile",
      buttonHome: "Back to Home",
    },
    de: {
      titleBooking: "buchung erfolgreich",
      titlePurchase: "kauf erfolgreich",
      titleMixed: "kauf & buchung erfolgreich",
      titleRequest: "anfrage gesendet",
      message: "Vielen Dank! Die Transaktion war erfolgreich.",
      requestMessage: "Vielen Dank! Wir haben deine Anfrage erhalten.",

      // Main Content
      dateConfirmation:
        "Deine gewählten Termine sind nun bestätigt und für dich reserviert.",
      packConfirmation: "Dein neues Kurspaket wurde aktiviert.",
      requestConfirmation:
        "Wir haben deine Anfrage erhalten. Wir prüfen die Termine und kontaktieren dich in Kürze per E-Mail.",

      // Email / Location Info
      memberCredits:
        "Dein Guthaben wurde deinem Profil-Konto direkt gutgeschrieben.",
      guestCredits:
        "Wir haben dir einen persönlichen Buchungscode per E-Mail gesendet. Diesen kannst du für zukünftige Buchungen nutzen.",
      emailSent:
        "Eine Bestätigung sowie der Beleg wurden an deine E-Mail-Adresse gesendet.",
      spamWarning:
        "Solltest du in den nächsten Minuten keine E-Mail erhalten, schaue bitte auch in deinen Spam-Ordner.",

      // Breakdown Items
      itemBooking: "Bestätigte Termine",
      itemPack: "Kurspaket Guthaben",
      itemRequest: "Verfügbarkeitsanfrage",

      // Secondary Info
      redeemNote:
        remainingCredits > 0
          ? `Restguthaben auf Code ${redeemedCode}: ${remainingCredits} ${remainingCredits === 1 ? "Termin" : "Termine"}.`
          : `Du hast den letzten Termin auf deinem Code aufgebraucht: ${redeemedCode}.`,

      buttonProfile: "Zum Profil",
      buttonHome: "Zurück zur Startseite",
    },
  };

  const t = content[currentLang || "en"];

  // Determine the Title
  let displayTitle = t.titlePurchase;
  if (isRequest) displayTitle = t.titleRequest;
  else if (hasBookedDates && isPackPurchase) displayTitle = t.titleMixed;
  else if (hasBookedDates) displayTitle = t.titleBooking;

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

        <h1 style={styles.title}>{displayTitle}</h1>
        <p style={styles.message}>{isRequest ? t.requestMessage : t.message}</p>

        {/* SUMMARY SECTION */}
        <div style={styles.summaryBox}>
          {hasBookedDates && (
            <div style={styles.summaryItem}>
              <Calendar size={18} color="#9960a8" />
              <span>{t.itemBooking}</span>
            </div>
          )}
          {isPackPurchase && (
            <div style={styles.summaryItem}>
              <Ticket size={18} color="#9960a8" />
              <span>{t.itemPack}</span>
            </div>
          )}
          {isRequest && (
            <div style={styles.summaryItem}>
              <Mail size={18} color="#9960a8" />
              <span>{t.itemRequest}</span>
            </div>
          )}
        </div>

        <p style={styles.confirmation}>
          {isRequest
            ? t.requestConfirmation
            : hasBookedDates
              ? t.dateConfirmation
              : t.packConfirmation}
        </p>

        {/* DETAILS BOX */}
        <div style={styles.detailsContainer}>
          {isPackPurchase && (
            <div style={styles.infoRow}>
              <Ticket size={20} color="#9960a8" />
              <p style={styles.infoText}>
                {currentUser ? t.memberCredits : t.guestCredits}
              </p>
            </div>
          )}

          {(isRedeem || isCreditBooking) && (
            <div style={styles.infoRow}>
              <Ticket size={20} color="#9960a8" />
              <p style={styles.infoText}>
                {isRedeem ? t.redeemNote : t.dateConfirmation}
              </p>
            </div>
          )}

          {!isRequest && (
            <div style={styles.infoRow}>
              <Mail size={20} color="#9960a8" />
              <p style={styles.infoText}>{t.emailSent}</p>
            </div>
          )}

          {/* SPAM WARNING */}
          <div
            style={{
              ...styles.infoRow,
              backgroundColor: "rgba(231, 76, 60, 0.05)",
              border: "1px solid rgba(231, 76, 60, 0.2)",
            }}
          >
            <AlertTriangle size={20} color="#e74c3c" />
            <p style={{ ...styles.infoText, color: "#c0392b" }}>
              {t.spamWarning}
            </p>
          </div>
        </div>

        <div style={styles.buttonContainer}>
          {currentUser && (
            <Link to="/profile" style={styles.primaryBtn}>
              {t.buttonProfile}
            </Link>
          )}

          <Link
            to="/"
            style={currentUser ? styles.secondaryBtn : styles.primaryBtn}
          >
            {t.buttonHome}
          </Link>
        </div>

        {sessionId && (
          <p style={{ marginTop: "3rem", fontSize: "0.7rem", opacity: 0.4 }}>
            Transaction ID: {sessionId}
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
    padding: "120px 20px 60px",
    maxWidth: "650px",
    margin: "0 auto",
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "clamp(2rem, 8vw, 3rem)",
    color: "#1c0700",
    marginBottom: "1rem",
    textTransform: "lowercase",
  },
  message: {
    fontSize: "1.1rem",
    color: "#1c0700",
    marginBottom: "1.5rem",
    fontWeight: "700",
  },
  summaryBox: {
    display: "flex",
    gap: "15px",
    marginBottom: "2rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  summaryItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(202, 175, 243, 0.15)",
    padding: "6px 14px",
    borderRadius: "100px",
    fontSize: "0.8rem",
    fontWeight: "800",
    color: "#1c0700",
    textTransform: "uppercase",
  },
  confirmation: {
    fontSize: "1rem",
    color: "#1c0700",
    opacity: 0.8,
    marginBottom: "2rem",
    lineHeight: "1.5",
  },
  detailsContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "3rem",
  },
  infoRow: {
    backgroundColor: "rgba(255, 252, 227, 0.5)",
    padding: "16px 20px",
    borderRadius: "16px",
    border: "1px solid rgba(28, 7, 0, 0.05)",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    textAlign: "left",
  },
  infoText: {
    color: "#1c0700",
    fontWeight: "600",
    margin: 0,
    fontSize: "0.9rem",
    lineHeight: "1.4",
    flex: 1,
  },
  buttonContainer: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtn: {
    flex: 1,
    minWidth: "200px",
    padding: "1rem 2rem",
    backgroundColor: "#9960a8",
    color: "#fdf8e1",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "700",
    fontFamily: "Satoshi",
    textAlign: "center",
  },
  secondaryBtn: {
    flex: 1,
    minWidth: "200px",
    padding: "1rem 2rem",
    backgroundColor: "transparent",
    color: "#1c0700",
    border: "1px solid rgba(28, 7, 0, 0.2)",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Satoshi",
    textAlign: "center",
  },
};
