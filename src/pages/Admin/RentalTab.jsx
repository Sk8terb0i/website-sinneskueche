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
import {
  PlusCircle,
  Trash2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Check,
  Eye,
  EyeOff,
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
  const [requestFilter, setRequestFilter] = useState("pending");

  const labels = {
    en: {
      setAvail: "Set Availability",
      showInCal: "show approved requests in my calendar",
      on: "ON",
      off: "OFF",
      pubDate: "Publish Date",
      persistEmail: "Persistent Notification Email",
      adminEmail: "Admin notification email",
      liveAvail: "Live Availabilities",
      rentReq: "Rent Requests",
      inc: "Incoming",
      app: "Approved",
      noReq: "No",
      reqFound: "requests found.",
      email: "Email:",
      phone: "Phone:",
      reqDate: "Requested Date:",
      received: "Received:",
      msg: "Message:",
    },
    de: {
      setAvail: "Verfügbarkeit einstellen",
      showInCal: "Akzeptierte Anfragen im Kalender zeigen",
      on: "AN",
      off: "AUS",
      pubDate: "Datum veröffentlichen",
      persistEmail: "Benachrichtigungs-E-Mail",
      adminEmail: "Admin Benachrichtigungs-E-Mail",
      liveAvail: "Aktuelle Verfügbarkeiten",
      rentReq: "Mietanfragen",
      inc: "Eingehend",
      app: "Bestätigt",
      noReq: "Keine",
      reqFound: "Anfragen gefunden.",
      email: "E-Mail:",
      phone: "Telefon:",
      reqDate: "Gewünschtes Datum:",
      received: "Erhalten:",
      msg: "Nachricht:",
    },
  }[currentLang || "en"];

  const requestsCollection = collection(db, "rent_requests");
  const availabilityCollection = collection(db, "rental_availability");

  useEffect(() => {
    fetchSettings();
    const unsubRequests = onSnapshot(
      query(requestsCollection, orderBy("createdAt", "desc")),
      (snap) => {
        setRentRequests(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
    );

    const unsubAvail = onSnapshot(
      query(availabilityCollection, orderBy("date", "asc")),
      (snap) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allDocs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const validAvail = allDocs.filter((item) => {
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
    if (!snap.empty) {
      const config = snap.docs.find((d) => d.id === "admin_config");
      if (config) {
        setNotifyEmail(config.data().adminEmail || "");
        setShowInProfile(config.data().showRentalInProfile || false);
      }
    }
  };

  const toggleGlobalVisibility = async () => {
    const newVal = !showInProfile;
    try {
      await setDoc(
        doc(db, "settings", "admin_config"),
        { showRentalInProfile: newVal },
        { merge: true },
      );
      setShowInProfile(newVal);
    } catch (err) {
      console.error("Error updating visibility:", err);
    }
  };

  const updateNotifyEmail = async () => {
    try {
      await setDoc(
        doc(db, "settings", "admin_config"),
        { adminEmail: notifyEmail },
        { merge: true },
      );
      alert("Notification email saved!");
    } catch (err) {
      alert("Error saving email: " + err.message);
    }
  };

  const handleAddAvailability = async () => {
    if (!availDate) return alert("Select a date");
    await addDoc(availabilityCollection, {
      date: availDate,
      time: availTime,
      status: "available",
    });
    setAvailDate("");
    setAvailTime("");
  };

  const handleApprove = async (reqId) => {
    await updateDoc(doc(db, "rent_requests", reqId), { status: "approved" });
  };

  const handleReject = async (reqId, availId) => {
    await updateDoc(doc(db, "rent_requests", reqId), { status: "rejected" });
    if (availId)
      await updateDoc(doc(db, "rental_availability", availId), {
        status: "available",
      });
  };

  const deleteAvailability = async (id) => {
    if (window.confirm("Delete this availability?"))
      await deleteDoc(doc(db, "rental_availability", id));
  };

  const deleteRequest = async (id) => {
    if (window.confirm("Delete this request?"))
      await deleteDoc(doc(db, "rent_requests", id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const filteredRequests = rentRequests.filter((req) => {
    if (requestFilter === "approved") return req.status === "approved";
    return req.status !== "approved";
  });

  const subTabStyle = (active) => ({
    padding: "6px 16px",
    borderRadius: "100px",
    fontSize: "0.75rem",
    fontWeight: "700",
    cursor: "pointer",
    border: active ? "1px solid #caaff3" : "1px solid rgba(28, 7, 0, 0.1)",
    backgroundColor: active ? "#caaff3" : "transparent",
    color: "#1c0700",
    transition: "all 0.2s ease",
  });

  return (
    <div style={{ display: isMobile ? "block" : "flex", gap: "2rem" }}>
      <section style={{ width: isMobile ? "100%" : "400px" }}>
        <div style={formCardStyle}>
          <h3 style={sectionTitleStyle}>
            <PlusCircle size={16} /> {labels.setAvail}
          </h3>
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "12px",
              backgroundColor: "rgba(202, 175, 243, 0.1)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {showInProfile ? (
                <Eye size={16} color="#9960a8" />
              ) : (
                <EyeOff size={16} color="#4e5f28" />
              )}
              <span style={{ fontSize: "0.8rem", fontWeight: "700" }}>
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
                color: "white",
                fontSize: "0.7rem",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {showInProfile ? labels.on : labels.off}
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <input
              type="date"
              value={availDate}
              onChange={(e) => setAvailDate(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Time slot (e.g. 10:00 - 16:00)"
              value={availTime}
              onChange={(e) => setAvailTime(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={handleAddAvailability}
              style={{
                ...btnStyle,
                backgroundColor: "#4e5f28",
                color: "white",
              }}
            >
              {labels.pubDate}
            </button>
          </div>
          <div style={{ marginTop: "2rem" }}>
            <h4 style={labelStyle}>{labels.persistEmail}</h4>
            <div style={{ display: "flex", gap: "5px" }}>
              <input
                type="email"
                placeholder={labels.adminEmail}
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={updateNotifyEmail}
                style={{ ...btnStyle, width: "auto", padding: "0 15px" }}
              >
                <Mail size={16} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={labelStyle}>{labels.liveAvail}</h3>
          {availabilities.map((a) => (
            <div
              key={a.id}
              style={{
                ...cardStyle,
                padding: "0.8rem",
                marginBottom: "0.5rem",
                opacity: a.status === "available" ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>
                {formatDate(a.date)} — <strong>{a.status}</strong>
              </span>
              <button
                onClick={() => deleteAvailability(a.id)}
                style={deleteBtnStyle}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
            <Clock size={16} /> {labels.rentReq}
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setRequestFilter("pending")}
              style={subTabStyle(requestFilter === "pending")}
            >
              {labels.inc} (
              {rentRequests.filter((r) => r.status !== "approved").length})
            </button>
            <button
              onClick={() => setRequestFilter("approved")}
              style={subTabStyle(requestFilter === "approved")}
            >
              <Check size={12} style={{ marginRight: "4px" }} /> {labels.app} (
              {rentRequests.filter((r) => r.status === "approved").length})
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredRequests.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                opacity: 0.5,
                fontStyle: "italic",
                fontSize: "0.9rem",
              }}
            >
              {labels.noReq}{" "}
              {requestFilter === "pending" ? labels.inc : labels.app}{" "}
              {labels.reqFound}
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  ...cardStyle,
                  alignItems: "flex-start",
                  flexDirection: "column",
                  borderLeft:
                    req.status === "approved"
                      ? "6px solid #4e5f28"
                      : req.status === "rejected"
                        ? "6px solid #ff4d4d"
                        : "6px solid #caaff3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      {req.name}
                    </span>
                    {req.status !== "pending" && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          background: "#eee",
                          padding: "2px 8px",
                          borderRadius: "100px",
                          textTransform: "uppercase",
                        }}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    {req.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          style={{
                            ...deleteBtnStyle,
                            color: "#4e5f28",
                            opacity: 1,
                          }}
                        >
                          <CheckCircle size={22} />
                        </button>
                        <button
                          onClick={() =>
                            handleReject(req.id, req.availabilityId)
                          }
                          style={{
                            ...deleteBtnStyle,
                            color: "#ff4d4d",
                            opacity: 1,
                          }}
                        >
                          <XCircle size={22} />
                        </button>
                      </>
                    )}
                    <a
                      href={`mailto:${req.email}`}
                      style={{ color: "#caaff3" }}
                    >
                      <Mail size={20} />
                    </a>
                    <button
                      onClick={() => deleteRequest(req.id)}
                      style={deleteBtnStyle}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "10px",
                    width: "100%",
                    fontSize: "0.9rem",
                    marginBottom: "15px",
                  }}
                >
                  <div>
                    <span style={labelStyle}>{labels.email}</span> {req.email}
                  </div>
                  <div>
                    <span style={labelStyle}>{labels.phone}</span> {req.phone}
                  </div>
                  <div>
                    <span style={labelStyle}>{labels.reqDate}</span>{" "}
                    <strong>{formatDate(req.date)}</strong>
                  </div>
                  <div>
                    <span style={labelStyle}>{labels.received}</span>{" "}
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
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: 0.6,
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <MessageSquare size={12} /> {labels.msg}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        fontStyle: "italic",
                      }}
                    >
                      "{req.message}"
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
