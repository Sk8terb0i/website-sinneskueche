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

export default function RentalTab({ isMobile }) {
  const [rentRequests, setRentRequests] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [availDate, setAvailDate] = useState("");
  const [availTime, setAvailTime] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const requestsCollection = collection(db, "rent_requests");
  const availabilityCollection = collection(db, "rental_availability");

  useEffect(() => {
    fetchSettings();

    // Set up real-time listeners and cleanly unsubscribe on unmount
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    const snap = await getDocs(collection(db, "settings"));
    if (!snap.empty) {
      const config = snap.docs.find((d) => d.id === "admin_config");
      if (config) setNotifyEmail(config.data().adminEmail || "");
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
    if (availId) {
      await updateDoc(doc(db, "rental_availability", availId), {
        status: "available",
      });
    }
  };

  const deleteAvailability = async (id) => {
    if (window.confirm("Delete this availability?"))
      await deleteDoc(doc(db, "rental_availability", id));
  };

  const deleteRequest = async (id) => {
    if (window.confirm("Delete this request?"))
      await deleteDoc(doc(db, "rent_requests", id));
  };

  return (
    <div style={{ display: isMobile ? "block" : "flex", gap: "2rem" }}>
      <section style={{ width: isMobile ? "100%" : "400px" }}>
        <div style={formCardStyle}>
          <h3 style={sectionTitleStyle}>
            <PlusCircle size={16} /> Set Availability
          </h3>
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
              Publish Date
            </button>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h4 style={labelStyle}>Persistent Notification Email</h4>
            <div style={{ display: "flex", gap: "5px" }}>
              <input
                type="email"
                placeholder="Admin notification email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={updateNotifyEmail}
                style={{ ...btnStyle, width: "auto", padding: "0 15px" }}
                title="Save Email to Settings"
              >
                <Mail size={16} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={labelStyle}>Live Availabilities</h3>
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
                {a.date} — <strong>{a.status}</strong>
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
        <h3 style={sectionTitleStyle}>
          <Clock size={16} /> Incoming Rent Requests ({rentRequests.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {rentRequests.map((req) => (
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
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
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
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
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
                        onClick={() => handleReject(req.id, req.availabilityId)}
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
                  <a href={`mailto:${req.email}`} style={{ color: "#caaff3" }}>
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
                }}
              >
                <div>
                  <span style={labelStyle}>Email:</span> {req.email}
                </div>
                <div>
                  <span style={labelStyle}>Phone:</span> {req.phone}
                </div>
                <div>
                  <span style={labelStyle}>Requested Date:</span>{" "}
                  <strong>{req.date}</strong>
                </div>
                <div>
                  <span style={labelStyle}>Received:</span>{" "}
                  {new Date(req.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
