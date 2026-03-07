import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
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
  PlusCircle,
  Trash2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  Loader2,
  Phone,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  CornerDownRight,
  ExternalLink,
} from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  inputStyle,
  btnStyle,
  labelStyle,
  cardStyle,
  deleteBtnStyle,
} from "./AdminStyles";

export default function RentalTab({ isMobile, currentLang }) {
  const [rentRequests, setRentRequests] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [availDate, setAvailDate] = useState("");
  const [availTime, setAvailTime] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [showInProfile, setShowInProfile] = useState(false);
  const [requestFilter, setRequestFilter] = useState("avail");
  const [loading, setLoading] = useState(true);
  const [viewingRequest, setViewingRequest] = useState(null);

  const [replyText, setReplyText] = useState({});
  const [isSendingReply, setIsSendingReply] = useState(null);

  const labels = {
    en: {
      setAvail: "set availability",
      showInCal: "show approved requests in my calendar",
      on: "on",
      off: "off",
      pubDate: "publish date",
      persistEmail: "persistent notification email",
      adminEmail: "admin notification email",
      liveTab: "live dates",
      rentReq: "rent requests",
      inc: "incoming",
      app: "approved",
      noReq: "no",
      reqFound: "requests found.",
      email: "email:",
      phone: "phone:",
      reqDate: "requested date:",
      received: "received:",
      msg: "message:",
      statusOpen: "available",
      statusPending: "request pending",
      statusBooked: "booked",
      detailsTitle: "request details",
      close: "close",
      replyLabel: "Write a response...",
      sendReply: "Send Response",
      responded: "Responded on",
      external: "Open in Mail App",
      successMsg: "Reply sent successfully!",
    },
    de: {
      setAvail: "verfügbarkeit einstellen",
      showInCal: "akzeptierte anfragen im kalender zeigen",
      on: "an",
      off: "aus",
      pubDate: "datum veröffentlichen",
      persistEmail: "benachrichtigungs-e-mail",
      adminEmail: "admin benachrichtigungs-e-mail",
      liveTab: "aktuelle daten",
      rentReq: "mietanfragen",
      inc: "eingehend",
      app: "bestätigt",
      noReq: "keine",
      reqFound: "anfragen gefunden.",
      email: "e-mail:",
      phone: "telefon:",
      reqDate: "gewünschtes datum:",
      received: "erhalten:",
      msg: "nachricht:",
      statusOpen: "verfügbar",
      statusPending: "anfrage offen",
      statusBooked: "gebucht",
      detailsTitle: "details zur anfrage",
      close: "schließen",
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
    const unsubAvail = onSnapshot(
      query(collection(db, "rental_availability"), orderBy("date", "asc")),
      (snap) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validAvail = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            if (itemDate < today) {
              deleteDoc(doc(db, "rental_availability", item.id));
              return false;
            }
            return true;
          });
        setAvailabilities(validAvail);
      },
    );
    return () => {
      unsubRequests();
      unsubAvail();
    };
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
    alert("notification email saved!");
  };

  const handleSendReply = async (requestId) => {
    if (!replyText[requestId]) return;
    setIsSendingReply(requestId);
    try {
      const replyFn = httpsCallable(getFunctions(), "replyToRentalRequest");
      await replyFn({ requestId, replyText: replyText[requestId] });
      setReplyText((prev) => ({ ...prev, [requestId]: "" }));
      alert(labels.successMsg); // Feedback provided here
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setIsSendingReply(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.split("-").reverse().join(".");
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
      {/* SIDEBAR */}
      <section style={{ width: isMobile ? "100%" : "380px" }}>
        <div style={{ ...formCardStyle, backgroundColor: "#fdf8e1" }}>
          <h3 style={{ ...sectionTitleStyle, textTransform: "none" }}>
            <PlusCircle size={18} /> {labels.setAvail}
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input
              type="date"
              value={availDate}
              onChange={(e) => setAvailDate(e.target.value)}
              style={{ ...inputStyle, backgroundColor: "#fffce3" }}
            />
            <input
              type="text"
              placeholder="time slot"
              value={availTime}
              onChange={(e) => setAvailTime(e.target.value)}
              style={{ ...inputStyle, backgroundColor: "#fffce3" }}
            />
            <button
              onClick={async () => {
                if (!availDate) return alert("select a date");
                await addDoc(collection(db, "rental_availability"), {
                  date: availDate,
                  time: availTime,
                  status: "available",
                });
                setAvailDate("");
                setAvailTime("");
                setRequestFilter("avail");
              }}
              style={{
                ...btnStyle,
                backgroundColor: "#4e5f28",
                color: "#fffce3",
                fontWeight: "800",
                textTransform: "none",
              }}
            >
              {labels.pubDate}
            </button>
          </div>
          <div
            style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px dashed rgba(28,7,0,0.1)",
            }}
          >
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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
                  textTransform: "none",
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
              }}
            >
              {labels.persistEmail}
            </h4>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="email"
                placeholder={labels.adminEmail}
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
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
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
              onClick={() => setRequestFilter("avail")}
              style={{
                ...subTabStyle(requestFilter === "avail"),
                textTransform: "none",
              }}
            >
              <Calendar size={14} /> {labels.liveTab}
            </button>
            <button
              onClick={() => setRequestFilter("pending")}
              style={{
                ...subTabStyle(requestFilter === "pending"),
                textTransform: "none",
              }}
            >
              <Clock size={14} /> {labels.inc}
            </button>
            <button
              onClick={() => setRequestFilter("approved")}
              style={{
                ...subTabStyle(requestFilter === "approved"),
                textTransform: "none",
              }}
            >
              <Check size={14} /> {labels.app}
            </button>
          </div>
        </div>

        {/* TAB 1: LIVE AVAILABILITIES */}
        {requestFilter === "avail" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
          >
            {availabilities.map((a) => {
              const rel = rentRequests.filter((r) => r.availabilityId === a.id);
              const isBooked = rel.some((r) => r.status === "approved");
              const hasInc = rel.some((r) => r.status === "pending");
              const relevantRequest = isBooked
                ? rel.find((r) => r.status === "approved")
                : rel.find((r) => r.status === "pending");
              return (
                <div
                  key={a.id}
                  onClick={() =>
                    (isBooked || hasInc) && setViewingRequest(relevantRequest)
                  }
                  style={{
                    ...cardStyle,
                    backgroundColor: "#fdf8e1",
                    padding: "1.2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: isBooked || hasInc ? "pointer" : "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#caaff3",
                        color: "#1c0700",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontWeight: "900",
                      }}
                    >
                      {formatDate(a.date)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                        {a.time || "full day"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: "800",
                          color: isBooked
                            ? "#1c0700"
                            : hasInc
                              ? "#9960a8"
                              : "#4e5f28",
                          textTransform: "none",
                        }}
                      >
                        {isBooked
                          ? labels.statusBooked
                          : hasInc
                            ? labels.statusPending
                            : labels.statusOpen}
                      </span>
                    </div>
                  </div>
                  <Trash2
                    size={22}
                    color="rgba(28,7,0,0.2)"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm("delete?"))
                        await deleteDoc(doc(db, "rental_availability", a.id));
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2 & 3: REQUESTS */}
        {requestFilter !== "avail" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {rentRequests
              .filter((r) =>
                requestFilter === "approved"
                  ? r.status === "approved"
                  : r.status !== "approved",
              )
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
                            onClick={async () =>
                              await updateDoc(
                                doc(db, "rent_requests", req.id),
                                { status: "approved" },
                              )
                            }
                            style={{ cursor: "pointer" }}
                          />
                          <XCircle
                            size={22}
                            color="#ff4d4d"
                            onClick={async () => {
                              await updateDoc(
                                doc(db, "rent_requests", req.id),
                                { status: "rejected" },
                              );
                              if (req.availabilityId)
                                await updateDoc(
                                  doc(
                                    db,
                                    "rental_availability",
                                    req.availabilityId,
                                  ),
                                  { status: "available" },
                                );
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </>
                      )}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <a
                          href={`mailto:${req.email}`}
                          style={{
                            color: "#caaff3",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Mail size={22} />
                        </a>
                      </div>
                      <Trash2
                        size={22}
                        color="rgba(28,7,0,0.15)"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm("delete?"))
                            await deleteDoc(doc(db, "rent_requests", req.id));
                        }}
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
                    <div>
                      <span style={{ opacity: 0.4, fontWeight: "400" }}>
                        {labels.reqDate}
                      </span>{" "}
                      <strong>{formatDate(req.date)}</strong>
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
                          textTransform: "none",
                        }}
                      >
                        <MessageSquare size={10} /> {labels.msg}
                      </p>
                      <p style={{ margin: 0, fontStyle: "italic" }}>
                        "{req.message}"
                      </p>
                    </div>
                  )}
                  {/* RESPONSE HISTORY - Visible in the card */}
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
                        boxSizing: "border-box",
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
                  {/* DIRECT REPLY AREA - Inside the card */}
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
                        boxSizing: "border-box",
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
                        href={`mailto:${req.email}?subject=Rental Inquiry`}
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
                        disabled={
                          isSendingReply === req.id || !replyText[req.id]
                        }
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
                          border: "none",
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
        )}
      </section>

      {/* REQUEST DETAIL POPUP */}
      {viewingRequest &&
        (() => {
          // Find the "live" version of this request from our state array
          const liveRequest =
            rentRequests.find((r) => r.id === viewingRequest.id) ||
            viewingRequest;

          return (
            <div style={modalOverlay} onClick={() => setViewingRequest(null)}>
              <div style={modalContent} onClick={(e) => e.stopPropagation()}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2rem",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "Harmond-SemiBoldCondensed",
                      fontSize: "2rem",
                      textTransform: "none",
                    }}
                  >
                    {labels.detailsTitle}
                  </h3>
                  <button
                    onClick={() => setViewingRequest(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0.5,
                    }}
                  >
                    <X />
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  <div>
                    <span style={{ ...labelSub, textTransform: "none" }}>
                      name
                    </span>
                    <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>
                      {liveRequest.name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <span style={{ ...labelSub, textTransform: "none" }}>
                        {labels.email}
                      </span>
                      <div style={dataText}>{liveRequest.email}</div>
                    </div>
                    <div>
                      <span style={{ ...labelSub, textTransform: "none" }}>
                        {labels.phone}
                      </span>
                      <div style={dataText}>{liveRequest.phone}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <span style={{ ...labelSub, textTransform: "none" }}>
                        {labels.reqDate}
                      </span>
                      <div style={dataText}>{formatDate(liveRequest.date)}</div>
                    </div>
                    <div>
                      <span style={{ ...labelSub, textTransform: "none" }}>
                        {labels.received}
                      </span>
                      <div style={dataText}>
                        {liveRequest.createdAt
                          ? new Date(liveRequest.createdAt).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* ORIGINAL MESSAGE */}
                  {liveRequest.message && (
                    <div
                      style={{
                        backgroundColor: "rgba(28, 7, 0, 0.03)",
                        padding: "1.5rem",
                        borderRadius: "16px",
                        border: "1px dashed rgba(28, 7, 0, 0.1)",
                      }}
                    >
                      <span style={{ ...labelSub, textTransform: "none" }}>
                        {labels.msg}
                      </span>
                      <div
                        style={{
                          marginTop: "8px",
                          fontStyle: "italic",
                          lineHeight: 1.5,
                        }}
                      >
                        "{liveRequest.message}"
                      </div>
                    </div>
                  )}

                  {/* RESPONSE HISTORY - Now visible in popup when updated */}
                  {liveRequest.response && (
                    <div
                      style={{
                        backgroundColor: "rgba(78, 95, 40, 0.05)",
                        padding: "1.2rem",
                        borderRadius: "16px",
                        borderLeft: "4px solid #4e5f28",
                      }}
                    >
                      <span
                        style={{
                          ...labelSub,
                          color: "#4e5f28",
                          textTransform: "none",
                        }}
                      >
                        {labels.responded}{" "}
                        {liveRequest.respondedAt?.toDate
                          ? liveRequest.respondedAt
                              .toDate()
                              .toLocaleDateString()
                          : new Date().toLocaleDateString()}
                      </span>
                      <div style={{ marginTop: "4px", fontWeight: "600" }}>
                        {liveRequest.response}
                      </div>
                    </div>
                  )}

                  {/* MODAL REPLY UI */}
                  <div
                    style={{
                      borderTop: "1px solid rgba(28,7,0,0.1)",
                      paddingTop: "1.5rem",
                    }}
                  >
                    <textarea
                      placeholder={labels.replyLabel}
                      value={replyText[liveRequest.id] || ""}
                      onChange={(e) =>
                        setReplyText({
                          ...replyText,
                          [liveRequest.id]: e.target.value,
                        })
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
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      onClick={() => handleSendReply(liveRequest.id)}
                      disabled={
                        isSendingReply === liveRequest.id ||
                        !replyText[liveRequest.id]
                      }
                      style={{
                        ...btnStyle,
                        width: "100%",
                        backgroundColor: "#9960a8",
                        color: "#fffce3",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        border: "none",
                      }}
                    >
                      {isSendingReply === liveRequest.id ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Send size={16} />
                      )}
                      {labels.sendReply}
                    </button>
                  </div>

                  <button
                    onClick={() => setViewingRequest(null)}
                    style={{
                      ...btnStyle,
                      backgroundColor: "#caaff3",
                      color: "#1c0700",
                      marginTop: "0.5rem",
                      fontWeight: "800",
                      textTransform: "none",
                    }}
                  >
                    {labels.close}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// POPUP STYLES
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(28,7,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fffce3",
  padding: "2.5rem",
  borderRadius: "32px",
  width: "100%",
  maxWidth: "500px",
  color: "#1c0700",
  border: "1px solid rgba(28,7,0,0.1)",
};
const labelSub = {
  fontSize: "0.65rem",
  fontWeight: "900",
  opacity: 0.5,
  display: "block",
  marginBottom: "4px",
};
const dataText = { fontSize: "0.95rem", fontWeight: "700" };
