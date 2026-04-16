import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  X,
  Check,
  Eye,
  EyeOff,
  Send,
  CornerDownRight,
  ExternalLink,
  Archive,
} from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  inputStyle,
  btnStyle,
  labelStyle,
  cardStyle,
} from "./AdminStyles";

export default function RentalTab({ isMobile, currentLang }) {
  const [rentRequests, setRentRequests] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [showInProfile, setShowInProfile] = useState(false);
  const [requestFilter, setRequestFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const [replyText, setReplyText] = useState({});
  const [isSendingReply, setIsSendingReply] = useState(null);

  const labels = {
    en: {
      showInCal: "Allow Rental Requests on Website",
      on: "on",
      off: "off",
      persistEmail: "Notification Settings",
      adminEmail: "Admin notification email(s)",
      rentReq: "Rental Management",
      inc: "Incoming",
      app: "Approved (Blocks Date)",
      arch: "Archive",
      email: "email:",
      phone: "phone:",
      reqDate: "requested date:",
      received: "received:",
      msg: "message:",
      replyLabel: "Write a response...",
      sendReply: "Send Response",
      responded: "Responded on",
      external: "Open in Mail App",
      successMsg: "Reply sent successfully!",
    },
    de: {
      showInCal: "Mietanfragen auf Website erlauben",
      on: "an",
      off: "aus",
      persistEmail: "Benachrichtigungs-Einstellungen",
      adminEmail: "Admin E-Mail(s) für Anfragen",
      rentReq: "Mietverwaltung",
      inc: "Eingehend",
      app: "Bestätigt (Blockiert Datum)",
      arch: "Archiv",
      email: "e-mail:",
      phone: "telefon:",
      reqDate: "gewünschtes datum:",
      received: "erhalten:",
      msg: "nachricht:",
      replyLabel: "Antwort schreiben...",
      sendReply: "Antwort senden",
      responded: "Beantwortet am",
      external: "In Mail-App öffnen",
      successMsg: "Antwort erfolgreich gesendet!",
    },
  }[currentLang || "en"];

  useEffect(() => {
    fetchSettings();
    const unsubRequests = onSnapshot(
      query(collection(db, "rent_requests"), orderBy("createdAt", "desc")),
      (snap) => {
        setRentRequests(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setLoading(false);
      },
    );
    return () => unsubRequests();
  }, []);

  const fetchSettings = async () => {
    const snap = await getDocs(collection(db, "settings"));
    const config = snap.docs.find((d) => d.id === "admin_config");
    if (config) {
      setNotifyEmail(config.data().adminEmail || "");
      setShowInProfile(config.data().showRentalInProfile || false);
    }
  };

  const toggleGlobalVisibility = async () => {
    const newVal = !showInProfile;
    await setDoc(
      doc(db, "settings", "admin_config"),
      { showRentalInProfile: newVal },
      { merge: true },
    );
    setShowInProfile(newVal);
  };

  const updateNotifyEmail = async () => {
    await setDoc(
      doc(db, "settings", "admin_config"),
      { adminEmail: notifyEmail },
      { merge: true },
    );
    alert("Notification settings saved!");
  };

  const handleSendReply = async (requestId) => {
    if (!replyText[requestId]) return;
    setIsSendingReply(requestId);
    try {
      const replyFn = httpsCallable(getFunctions(), "replyToRentalRequest");
      await replyFn({ requestId, replyText: replyText[requestId] });
      setReplyText((prev) => ({ ...prev, [requestId]: "" }));
      alert(labels.successMsg);
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setIsSendingReply(null);
    }
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "rent_requests", id), { status });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.split("-").reverse().join(".");
  };

  const renderRequestedPeriod = (req) => {
    const start = req.startDate || req.date; // Support new and old schema
    const end = req.endDate;

    if (start && end) {
      return `${formatDate(start)} — ${formatDate(end)}`;
    }
    return formatDate(start);
  };

  const subTabStyle = (active) => ({
    padding: "8px 18px",
    borderRadius: "100px",
    fontSize: "0.75rem",
    fontWeight: "800",
    cursor: "pointer",
    border: "none",
    backgroundColor: active ? "#caaff3" : "rgba(28, 7, 0, 0.05)",
    color: "#1c0700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  });

  if (loading)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="spinner" color="#caaff3" size={30} />
      </div>
    );

  return (
    <div
      style={{
        display: isMobile ? "block" : "flex",
        gap: "2.5rem",
        alignItems: "flex-start",
      }}
    >
      {/* SIDEBAR: SETTINGS ONLY */}
      <section style={{ width: isMobile ? "100%" : "380px" }}>
        <div style={{ ...formCardStyle, backgroundColor: "#fdf8e1" }}>
          <h3
            style={{
              ...sectionTitleStyle,
              textTransform: "none",
              marginBottom: "1.5rem",
            }}
          >
            {labels.persistEmail}
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              backgroundColor: "rgba(202, 175, 243, 0.1)",
              padding: "12px",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {showInProfile ? (
                <Eye size={16} color="#9960a8" />
              ) : (
                <EyeOff size={16} color="#4e5f28" />
              )}
              <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>
                {labels.showInCal}
              </span>
            </div>
            <button
              onClick={toggleGlobalVisibility}
              style={{
                padding: "4px 12px",
                borderRadius: "100px",
                border: "none",
                backgroundColor: showInProfile ? "#9960a8" : "#ccc",
                color: "#fffce3",
                fontSize: "0.7rem",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {showInProfile ? labels.on : labels.off}
            </button>
          </div>

          <h4
            style={{
              ...labelStyle,
              fontSize: "0.85rem",
              textTransform: "none",
              opacity: 0.6,
            }}
          >
            {labels.adminEmail}
          </h4>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="email"
              placeholder="email@address.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              style={{ ...inputStyle, backgroundColor: "#fffce3", flex: 1 }}
            />
            <button
              onClick={updateNotifyEmail}
              style={{
                ...btnStyle,
                width: "auto",
                padding: "0 15px",
                backgroundColor: "#caaff3",
                color: "#1c0700",
              }}
            >
              <Mail size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT: REQUESTS MANAGEMENT */}
      <section style={{ flex: 1, marginTop: isMobile ? "2rem" : 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <h3
            style={{
              ...sectionTitleStyle,
              margin: 0,
              fontFamily: "Harmond-SemiBoldCondensed",
              fontSize: "1.8rem",
              textTransform: "none",
            }}
          >
            {labels.rentReq}
          </h3>
          <div
            style={{
              display: "flex",
              gap: "6px",
              backgroundColor: "rgba(28,7,0,0.03)",
              padding: "4px",
              borderRadius: "100px",
            }}
          >
            <button
              onClick={() => setRequestFilter("pending")}
              style={subTabStyle(requestFilter === "pending")}
            >
              <Clock size={14} /> {labels.inc}
            </button>
            <button
              onClick={() => setRequestFilter("approved")}
              style={subTabStyle(requestFilter === "approved")}
            >
              <Check size={14} /> {labels.app}
            </button>
            <button
              onClick={() => setRequestFilter("archived")}
              style={subTabStyle(requestFilter === "archived")}
            >
              <Archive size={14} /> {labels.arch}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {rentRequests
            .filter((r) => {
              if (requestFilter === "pending") return r.status === "pending";
              if (requestFilter === "approved") return r.status === "approved";
              return r.status === "rejected" || r.status === "archived";
            })
            .map((req) => (
              <div
                key={req.id}
                style={{
                  ...cardStyle,
                  backgroundColor: "#fdf8e1",
                  borderLeft:
                    req.status === "approved"
                      ? "6px solid #4e5f28"
                      : "6px solid #caaff3",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "800",
                      fontSize: "1.2rem",
                      fontFamily: "Harmond-SemiBoldCondensed",
                    }}
                  >
                    {req.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    {req.status === "pending" && (
                      <>
                        <CheckCircle
                          size={22}
                          color="#4e5f28"
                          onClick={() => updateStatus(req.id, "approved")}
                          style={{ cursor: "pointer" }}
                        />
                        <XCircle
                          size={22}
                          color="#ff4d4d"
                          onClick={() => updateStatus(req.id, "rejected")}
                          style={{ cursor: "pointer" }}
                        />
                      </>
                    )}
                    <a
                      href={`mailto:${req.email}?subject=Rental Inquiry`}
                      style={{ color: "#caaff3" }}
                    >
                      <Mail size={22} />
                    </a>
                    <Archive
                      size={22}
                      color="rgba(28,7,0,0.15)"
                      onClick={() => updateStatus(req.id, "archived")}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "12px",
                    width: "100%",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  <div>
                    <span style={{ opacity: 0.4, fontWeight: "400" }}>
                      {labels.email}
                    </span>{" "}
                    {req.email}
                  </div>
                  <div>
                    <span style={{ opacity: 0.4, fontWeight: "400" }}>
                      {labels.phone}
                    </span>{" "}
                    {req.phone}
                  </div>
                  <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                    <span style={{ opacity: 0.4, fontWeight: "400" }}>
                      {labels.reqDate}
                    </span>{" "}
                    <strong style={{ fontSize: "1rem", color: "#9960a8" }}>
                      {renderRequestedPeriod(req)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ opacity: 0.4, fontWeight: "400" }}>
                      {labels.received}
                    </span>{" "}
                    {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {req.message && (
                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(28, 7, 0, 0.03)",
                      padding: "12px",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      border: "1px dashed rgba(28, 7, 0, 0.1)",
                      marginTop: "1rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontWeight: "900",
                        opacity: 0.4,
                        fontSize: "0.65rem",
                      }}
                    >
                      <MessageSquare size={10} /> {labels.msg}
                    </p>
                    <p style={{ margin: 0, fontStyle: "italic" }}>
                      "{req.message}"
                    </p>
                  </div>
                )}

                {req.response && (
                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(78, 95, 40, 0.05)",
                      padding: "1rem",
                      borderRadius: "12px",
                      borderLeft: "4px solid #4e5f28",
                      fontSize: "0.9rem",
                      marginTop: "1rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "0.65rem",
                        fontWeight: "900",
                        textTransform: "uppercase",
                        color: "#4e5f28",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CornerDownRight size={12} /> {labels.responded}{" "}
                      {req.respondedAt
                        ? new Date(
                            req.respondedAt.toDate(),
                          ).toLocaleDateString()
                        : ""}
                    </p>
                    <div
                      style={{ whiteSpace: "pre-wrap", fontStyle: "italic" }}
                    >
                      {req.response}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: "1.5rem",
                    borderTop: "1px solid rgba(28,7,0,0.05)",
                    paddingTop: "1rem",
                    width: "100%",
                  }}
                >
                  <textarea
                    placeholder={labels.replyLabel}
                    value={replyText[req.id] || ""}
                    onChange={(e) =>
                      setReplyText({ ...replyText, [req.id]: e.target.value })
                    }
                    style={{
                      ...inputStyle,
                      width: "100%",
                      minHeight: "100px",
                      backgroundColor: "#fffce3",
                      resize: "vertical",
                      marginBottom: "10px",
                      fontSize: "0.9rem",
                      padding: "12px",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <a
                      href={`mailto:${req.email}?subject=Rental Inquiry: ${renderRequestedPeriod(req)}`}
                      style={{
                        fontSize: "0.75rem",
                        color: "#caaff3",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        textDecoration: "none",
                        fontWeight: "700",
                      }}
                    >
                      <ExternalLink size={14} /> {labels.external}
                    </a>
                    <button
                      onClick={() => handleSendReply(req.id)}
                      disabled={isSendingReply === req.id || !replyText[req.id]}
                      style={{
                        ...btnStyle,
                        width: "auto",
                        padding: "8px 24px",
                        backgroundColor: "#9960a8",
                        color: "#fffce3",
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {isSendingReply === req.id ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Send size={16} />
                      )}
                      {labels.sendReply}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>
      <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
