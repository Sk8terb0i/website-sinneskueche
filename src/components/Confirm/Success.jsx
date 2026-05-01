import {
  CheckCircle,
  Mail,
  Ticket,
  CreditCard,
  AlertTriangle,
  Calendar,
  Download,
  Printer,
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
  const mode = searchParams.get("mode");
  const type = searchParams.get("type");
  const bookedParam = searchParams.get("booked");

  // New Itemized Summaries
  const packSummary = searchParams.get("packs") || "";
  const sessionSummary = searchParams.get("sessions") || "";

  const giftCodesParam = searchParams.get("giftCodes");
  const giftCodes = giftCodesParam
    ? giftCodesParam.split(",").filter(Boolean)
    : [];
  const giftNamesParam = searchParams.get("giftNames");
  const giftNames = giftNamesParam
    ? giftNamesParam.split(",").map(decodeURIComponent).filter(Boolean)
    : [];

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

  const hasGift = giftCodes.length > 0;
  const giftPacks = packSummary
    ? packSummary.split(" + ").filter((p) => p.includes("[GIFT"))
    : [];

  const handlePrintReceipt = () => {
    document.body.classList.add("print-receipt");
    window.print();
    document.body.classList.remove("print-receipt");
  };

  const handlePrintGiftCard = () => {
    document.body.classList.add("print-giftcard");
    window.print();
    document.body.classList.remove("print-giftcard");
  };

  const content = {
    en: {
      titleBooking: "booking successful",
      titlePurchase: "purchase successful",
      titleMixed: "purchase & booking successful",
      titleRequest: "request sent",
      message: "Thank you! Your transaction was successful.",

      // Breakdown Wording
      detailsHeader: "Items Details",
      itemBooking: "Confirmed Session(s)",
      itemPack: "Session Pack(s)",

      // Guest Wording Fix
      memberCredits:
        "Your credits have been added directly to your profile balance.",
      guestCredits:
        "We have sent a Session Pack Code to your email. You can use this code for future bookings.",
      emailSent:
        "A confirmation email and receipt have been sent to your inbox.",
      spamWarning:
        "If you don't see our email within a few minutes, please check your spam folder.",

      // Actions
      printBtn: "Save Receipt as PDF",
      printGiftBtn: "Download Gift Card",
      buttonProfile: "Go to Profile",
      buttonHome: "Back to Home",
    },
    de: {
      titleBooking: "buchung erfolgreich",
      titlePurchase: "kauf erfolgreich",
      titleMixed: "kauf & buchung erfolgreich",
      titleRequest: "anfrage gesendet",
      message: "Vielen Dank! Die Transaktion war erfolgreich.",

      detailsHeader: "Details der Buchung",
      itemBooking: "Bestätigte Termine",
      itemPack: "Kurspaket(e)",

      memberCredits:
        "Dein Guthaben wurde deinem Profil-Konto direkt gutgeschrieben.",
      guestCredits:
        "Wir haben dir einen Session-Pack-Code per E-Mail gesendet. Diesen kannst du für zukünftige Buchungen nutzen.",
      emailSent:
        "Eine Bestätigung sowie der Beleg wurden an deine E-Mail-Adresse gesendet.",
      spamWarning:
        "Solltest du keine E-Mail erhalten, schaue bitte auch in deinen Spam-Ordner.",

      printBtn: "Beleg als PDF speichern",
      printGiftBtn: "Gutschein Herunterladen",
      buttonProfile: "Zum Profil",
      buttonHome: "Zurück zur Startseite",
    },
  };

  const t = content[currentLang || "en"];

  let displayTitle = t.titlePurchase;
  if (isRequest) displayTitle = t.titleRequest;
  else if (hasBookedDates && isPackPurchase) displayTitle = t.titleMixed;
  else if (hasBookedDates) displayTitle = t.titleBooking;

  return (
    <div
      className="course-container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Hide Header on print */}
      <div className="no-print">
        <Header
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          isMenuOpen={isMenuOpen}
          onMenuToggle={setIsMenuOpen}
        />
      </div>

      <main style={styles.main}>
        {/* RECEIPT SECTION */}
        <div
          className="receipt-section"
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CheckCircle
            size={80}
            color="#4e5f28"
            style={{ marginBottom: "2rem" }}
            className="no-print"
          />

          <h1 style={styles.title}>{displayTitle}</h1>
          <p style={styles.message}>{t.message}</p>

          {/* ITEMIZED BREAKDOWN */}
          <div style={styles.detailsBox}>
            <h3 style={styles.detailsTitle}>{t.detailsHeader}</h3>

            <div style={styles.itemsWrapper}>
              {sessionSummary &&
                sessionSummary.split(", ").map((s, i) => {
                  const [mainInfo, ...addons] = s.split(" + ");
                  const courseMatch = mainInfo.match(/\(([^)]+)\)/);
                  const courseName = courseMatch ? courseMatch[1] : "Session";
                  const dateTime = mainInfo.replace(/\([^)]+\)/, "").trim();

                  return (
                    <div key={i} style={styles.itemEntry}>
                      <div
                        style={{
                          ...styles.itemHeader,
                          alignItems: "flex-start",
                        }}
                      >
                        <Calendar
                          size={16}
                          color="#9960a8"
                          style={{ flexShrink: 0, marginTop: "2px" }}
                        />
                        <span style={styles.itemCourseTitle}>{courseName}</span>
                      </div>
                      <div style={styles.itemSubDetail}>{dateTime}</div>
                      {addons.length > 0 && (
                        <div style={styles.itemAddons}>
                          {addons.map((a, ai) => (
                            <div key={ai} style={styles.addonTag}>
                              + {a}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {packSummary &&
                packSummary.split(" + ").map((p, i) => {
                  const giftMatch = p.match(/\[GIFT FOR (.*?)\]/i);
                  let cleanTitle = p.replace(/\[.*?\]/g, "").trim();

                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.itemEntry,
                        borderLeft: "4px solid #4e5f28",
                      }}
                    >
                      <div
                        style={{
                          ...styles.itemHeader,
                          alignItems: "flex-start",
                        }}
                      >
                        <Ticket
                          size={16}
                          color="#4e5f28"
                          style={{ flexShrink: 0, marginTop: "3px" }}
                        />
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              ...styles.itemCourseTitle,
                              color: "#4e5f28",
                              lineHeight: 1.3,
                            }}
                          >
                            {cleanTitle}
                          </span>
                          {giftMatch && (
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: "700",
                                color: "#9960a8",
                                textTransform: "none",
                              }}
                            >
                              {currentLang === "en"
                                ? "Gift for:"
                                : "Geschenk für:"}{" "}
                              {giftMatch[1]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* NOTIFICATIONS CONTAINER */}
          <div style={styles.notificationContainer} className="no-print">
            <div style={styles.infoRow}>
              <Ticket size={20} color="#9960a8" />
              <p style={styles.infoText}>
                {currentUser ? t.memberCredits : t.guestCredits}
              </p>
            </div>

            <div style={styles.infoRow}>
              <Mail size={20} color="#9960a8" />
              <p style={styles.infoText}>{t.emailSent}</p>
            </div>

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

          <p style={styles.transactionId}>Transaction ID: {sessionId}</p>
        </div>

        {/* GIFT CARD SECTION */}
        {hasGift && (
          <div
            className="gift-card-section"
            style={{
              ...styles.giftCardWrapper,
              flexDirection: "column",
              gap: "2rem",
              alignItems: "center",
            }}
          >
            {giftCodes.map((code, idx) => {
              const packDetailStr = giftPacks[idx]
                ? giftPacks[idx].replace(/\[GIFT.*?\]/i, "").trim()
                : "";

              return (
                <div key={idx} style={styles.giftCard}>
                  <h2 style={styles.giftCardTitle}>
                    {t.titlePurchase === "kauf erfolgreich"
                      ? "Geschenkgutschein"
                      : "Gift Card"}
                  </h2>
                  {giftNames[idx] &&
                    giftNames[idx] !== "Someone" &&
                    giftNames[idx] !== "Jemanden" && (
                      <h3
                        style={{
                          fontFamily: "Satoshi",
                          fontSize: "1.2rem",
                          margin: "0 0 0.5rem 0",
                          color: "#4e5f28",
                        }}
                      >
                        {currentLang === "en" ? "For: " : "Für: "}{" "}
                        {giftNames[idx]}
                      </h3>
                    )}
                  {packDetailStr && (
                    <p
                      style={{
                        fontSize: "1rem",
                        fontWeight: "700",
                        color: "#1c0700",
                        opacity: 0.8,
                        margin: "0 0 1rem 0",
                      }}
                    >
                      {packDetailStr}
                    </p>
                  )}
                  <p style={styles.giftCardSub}>
                    {t.titlePurchase === "kauf erfolgreich"
                      ? "Dieser Code kann bei der Buchung eingelöst werden:"
                      : "This code can be redeemed during booking:"}
                  </p>
                  <div style={styles.giftCardCodeBox}>{code}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ACTIONS */}
        <div style={styles.buttonContainer} className="no-print">
          <button onClick={handlePrintReceipt} style={styles.printBtn}>
            <Printer size={18} /> {t.printBtn}
          </button>

          {hasGift && (
            <button
              onClick={handlePrintGiftCard}
              style={{ ...styles.printBtn, backgroundColor: "#9960a8" }}
            >
              <Download size={18} /> {t.printGiftBtn}
            </button>
          )}

          {currentUser && (
            <Link to="/profile" style={styles.secondaryBtn}>
              {t.buttonProfile}
            </Link>
          )}

          <Link to="/" style={styles.secondaryBtn}>
            {t.buttonHome}
          </Link>
        </div>

        {/* Print specific CSS */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            
            /* Removes Browser Headers (URL, Date, Page Numbers) */
            @page { margin: 0mm; size: portrait; }
            
            html, body { 
               margin: 0 !important; 
               padding: 0 !important;
               background-color: white !important; 
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
               height: 100% !important;
            }

            .course-container {
               min-height: 0 !important;
               height: 100% !important;
               display: block !important;
            }
            
            main { 
               padding: 10mm !important; 
               margin: 0 !important; 
               max-width: 100% !important; 
               height: 100% !important;
               display: block !important;
            }

            /* Hiding Logic - Requires body classes injected by print handlers */
            body.print-receipt .gift-card-section { display: none !important; }
            body.print-giftcard .receipt-section { display: none !important; }

            /* Compress Receipt slightly so it doesn't spill over */
            .receipt-section {
               padding: 0 !important; 
               box-sizing: border-box;
               transform: scale(0.95);
               transform-origin: top center;
            }

            /* Centers the gift card while leaving room for the footer */
            .gift-card-section {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                padding: 0 !important;
                margin-top: 15mm !important;
                box-sizing: border-box;
                transform: scale(0.9);
                transform-origin: top center;
            }
          }
        `}</style>
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
    padding: window.innerWidth < 768 ? "80px 15px 40px" : "120px 20px 60px",
    maxWidth: "700px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
    overflowX: "hidden", // Extra safety for mobile
  },
  title: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "clamp(2rem, 8vw, 3rem)",
    color: "#1c0700",
    marginBottom: "1rem",
    textTransform: "lowercase",
    wordBreak: "break-word",
  },
  message: {
    fontSize: "1.1rem",
    color: "#1c0700",
    marginBottom: "2.5rem",
    fontWeight: "700",
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#fffce3",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    borderRadius: "24px",
    padding: window.innerWidth < 768 ? "1rem" : "1.5rem",
    textAlign: "left",
    marginBottom: "2rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
    boxSizing: "border-box",
  },
  detailsTitle: {
    fontSize: "0.65rem",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    opacity: 0.4,
    marginBottom: "1.5rem",
    marginTop: 0,
  },
  itemsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  itemEntry: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    paddingLeft: "12px",
    borderLeft: "4px solid #9960a8",
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  itemCourseTitle: {
    fontWeight: "900",
    fontSize: "1rem",
    color: "#1c0700",
    textTransform: "uppercase",
  },
  itemSubDetail: {
    fontSize: "0.9rem",
    fontWeight: "700",
    opacity: 0.6,
    paddingLeft: window.innerWidth < 768 ? "0" : "24px",
  },
  itemAddons: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    paddingLeft: window.innerWidth < 768 ? "0" : "24px",
    marginTop: "4px",
  },
  addonTag: {
    fontSize: "0.8rem",
    fontWeight: "800",
    color: "#9960a8",
  },
  notificationContainer: {
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
  printBtn: {
    flex: "1 1 100%",
    minWidth: window.innerWidth < 480 ? "100%" : "200px",
    padding: "1rem",
    backgroundColor: "#4e5f28",
    color: "#fdf8e1",
    borderRadius: "100px",
    border: "none",
    fontWeight: "700",
    fontFamily: "Satoshi",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  secondaryBtn: {
    flex: "1 1 45%",
    minWidth: window.innerWidth < 480 ? "100%" : "150px",
    padding: "1rem",
    backgroundColor: "transparent",
    color: "#1c0700",
    border: "1px solid rgba(28, 7, 0, 0.2)",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Satoshi",
    textAlign: "center",
    boxSizing: "border-box",
  },
  transactionId: {
    marginTop: "3rem",
    fontSize: "0.65rem",
    opacity: 0.4,
    wordBreak: "break-all", // Fixes the cutoff by forcing wrapping
    width: "100%",
    padding: "0 10px",
    boxSizing: "border-box",
    textAlign: "center",
  },
  giftCardWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    marginBottom: "3rem",
  },
  giftCard: {
    width: "100%",
    maxWidth: "550px",
    backgroundColor: "#fdf8e1", // Retains the creamy website background specifically for the card
    border: "2px solid #9960a8", // Primary purple border
    borderRadius: "24px",
    padding: "3rem 2rem",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(153, 96, 168, 0.15)",
    position: "relative",
    overflow: "hidden",
    WebkitPrintColorAdjust: "exact", // Forces background colors to print natively
    printColorAdjust: "exact",
    breakInside: "avoid", // Prevents splitting across pages
  },
  giftCardTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "2.5rem",
    color: "#4e5f28",
    margin: "0 0 1rem 0",
    textTransform: "lowercase",
  },
  giftCardSub: {
    fontSize: "0.9rem",
    color: "#1c0700",
    fontWeight: "600",
    marginBottom: "2rem",
    opacity: 0.8,
  },
  giftCardCodeBox: {
    background: "rgba(255,255,255,0.5)",
    border: "2px dashed #9960a8",
    borderRadius: "12px",
    padding: "1rem",
    fontSize: "1.5rem",
    letterSpacing: "8px",
    color: "#1c0700",
    fontWeight: "800",
    margin: "0 auto",
    width: "80%",
  },
};
