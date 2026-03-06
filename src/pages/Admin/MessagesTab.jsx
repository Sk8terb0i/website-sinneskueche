import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Mail,
  Trash2,
  PlusCircle,
  MessageSquare,
  CheckCircle,
  Loader2,
  Users,
  ExternalLink,
  Send,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
  Archive,
  ArchiveRestore,
  Inbox,
} from "lucide-react";
import {
  formCardStyle,
  sectionTitleStyle,
  inputStyle,
  btnStyle,
  labelStyle,
  cardStyle,
} from "./AdminStyles";

export default function MessagesTab({ isMobile, currentLang }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [replyText, setReplyText] = useState({});
  const [isSendingReply, setIsSendingReply] = useState(null);
  const [expandedMsgs, setExpandedMsgs] = useState({});
  const [msgFilter, setMsgFilter] = useState("pending");

  // Settings State
  const [contactEmails, setContactEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");

  const labels = {
    en: {
      settingsTitle: "Notification Emails",
      settingsDesc:
        "Add email addresses that should receive a copy of new contact form submissions.",
      addManual: "Add manually",
      addProfile: "Add existing profile",
      addBtn: "Add Email",
      messagesTitle: "Inbox",
      noMessages: "No messages found.",
      markRead: "Mark Read",
      markUnread: "Mark Unread",
      replyLabel: "Write a response...",
      sendReply: "Send Response",
      responded: "Responded on",
      selectProfile: "-- Select a profile --",
      external: "Open in Mail App",
      tabPending: "Pending",
      tabArchive: "Archive",
      actionArchive: "Archive",
      actionUnarchive: "Move to Inbox",
    },
    de: {
      settingsTitle: "Benachrichtigungen",
      settingsDesc:
        "Füge E-Mail-Adressen hinzu, die eine Kopie neuer Kontaktanfragen erhalten sollen.",
      addManual: "Manuell hinzufügen",
      addProfile: "Existierendes Profil",
      addBtn: "Hinzufügen",
      messagesTitle: "Posteingang",
      noMessages: "Keine Nachrichten gefunden.",
      markRead: "Gelesen",
      markUnread: "Ungelesen",
      replyLabel: "Antwort schreiben...",
      sendReply: "Antwort senden",
      responded: "Beantwortet am",
      selectProfile: "-- Profil auswählen --",
      external: "In Mail-App öffnen",
      tabPending: "Ausstehend",
      tabArchive: "Archiv",
      actionArchive: "Archivieren",
      actionUnarchive: "In Posteingang",
    },
  }[currentLang || "en"];

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, "settings", "admin_config"));
      if (snap.exists()) {
        setContactEmails(snap.data().contactEmails || []);
      }
    };
    fetchSettings();

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const usersList = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.email);
      setAllUsers(
        usersList.sort((a, b) =>
          (a.firstName || "").localeCompare(b.firstName || ""),
        ),
      );
    });

    const unsubMessages = onSnapshot(
      query(collection(db, "contact_messages"), orderBy("createdAt", "desc")),
      (snap) => {
        setMessages(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
    );

    return () => {
      unsubUsers();
      unsubMessages();
    };
  }, []);

  const toggleExpand = (id) => {
    setExpandedMsgs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const saveEmails = async (newEmailsArray) => {
    await setDoc(
      doc(db, "settings", "admin_config"),
      { contactEmails: newEmailsArray },
      { merge: true },
    );
    setContactEmails(newEmailsArray);
  };

  const handleAddManualEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || contactEmails.includes(newEmail.toLowerCase())) return;
    const updated = [...contactEmails, newEmail.toLowerCase()];
    await saveEmails(updated);
    setNewEmail("");
  };

  const handleAddProfileEmail = async (e) => {
    e.preventDefault();
    if (!selectedUserEmail || contactEmails.includes(selectedUserEmail)) return;
    const updated = [...contactEmails, selectedUserEmail];
    await saveEmails(updated);
    setSelectedUserEmail("");
  };

  const handleRemoveEmail = async (emailToRemove) => {
    const updated = contactEmails.filter((e) => e !== emailToRemove);
    await saveEmails(updated);
  };

  const handleSendReply = async (msgId) => {
    if (!replyText[msgId]) return;
    setIsSendingReply(msgId);
    try {
      const replyFn = httpsCallable(getFunctions(), "replyToContactMessage");
      await replyFn({ messageId: msgId, replyText: replyText[msgId] });
      setReplyText((prev) => ({ ...prev, [msgId]: "" }));
    } catch (err) {
      alert("Failed to send reply: " + err.message);
    } finally {
      setIsSendingReply(null);
    }
  };

  const toggleArchive = async (id, currentIsArchived) => {
    await updateDoc(doc(db, "contact_messages", id), {
      archived: !currentIsArchived,
    });
  };

  const toggleReadStatus = async (id, currentStatus) => {
    await updateDoc(doc(db, "contact_messages", id), {
      status: currentStatus === "new" ? "read" : "new",
    });
  };

  const deleteMessage = async (id) => {
    if (window.confirm("Delete this message forever?")) {
      await deleteDoc(doc(db, "contact_messages", id));
    }
  };

  const filteredMessages = messages.filter((m) =>
    msgFilter === "archived" ? m.archived === true : !m.archived,
  );

  const subTabStyle = (active) => ({
    padding: "10px 22px",
    borderRadius: "100px",
    fontSize: "0.8rem",
    fontWeight: "800",
    cursor: "pointer",
    border: "none",
    backgroundColor: active ? "#caaff3" : "rgba(28, 7, 0, 0.05)",
    color: "#1c0700",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  });

  if (loading)
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <Loader2 className="spinner" color="#caaff3" size={30} />
      </div>
    );

  return (
    <div
      style={{
        display: isMobile ? "block" : "flex",
        gap: "2.5rem",
        alignItems: "flex-start",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* SIDEBAR */}
      <section
        style={{
          width: isMobile ? "100%" : "380px",
          marginBottom: isMobile ? "2rem" : 0,
          flexShrink: 0,
        }}
      >
        <div style={{ ...formCardStyle, backgroundColor: "#fdf8e1" }}>
          <h3 style={{ ...sectionTitleStyle, textTransform: "none" }}>
            <Mail size={18} /> {labels.settingsTitle}
          </h3>
          <p
            style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: "1.5rem" }}
          >
            {labels.settingsDesc}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "2rem",
            }}
          >
            {contactEmails.map((em, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "rgba(28, 7, 0, 0.05)",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  wordBreak: "break-all",
                }}
              >
                {em}
                <Trash2
                  size={16}
                  color="#ff4d4d"
                  style={{
                    cursor: "pointer",
                    opacity: 0.7,
                    flexShrink: 0,
                    marginLeft: "10px",
                  }}
                  onClick={() => handleRemoveEmail(em)}
                />
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: "1px dashed rgba(28,7,0,0.1)",
              paddingTop: "1.5rem",
            }}
          >
            <label style={labelStyle}>
              <Users size={14} /> {labels.addProfile}
            </label>
            <form
              onSubmit={handleAddProfileEmail}
              style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}
            >
              <select
                value={selectedUserEmail}
                onChange={(e) => setSelectedUserEmail(e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: "#fffce3",
                  flex: 1,
                  padding: "10px",
                  width: "10px" /* hack to prevent overflow in flex */,
                }}
              >
                <option value="">{labels.selectProfile}</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                style={{
                  ...btnStyle,
                  width: "auto",
                  padding: "0 15px",
                  backgroundColor: "#4e5f28",
                  color: "#fffce3",
                }}
              >
                <PlusCircle size={16} />
              </button>
            </form>

            <label style={labelStyle}>{labels.addManual}</label>
            <form
              onSubmit={handleAddManualEmail}
              style={{ display: "flex", gap: "6px" }}
            >
              <input
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: "#fffce3",
                  flex: 1,
                  padding: "10px",
                }}
              />
              <button
                type="submit"
                style={{
                  ...btnStyle,
                  width: "auto",
                  padding: "0 15px",
                  backgroundColor: "#caaff3",
                  color: "#1c0700",
                }}
              >
                <PlusCircle size={16} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* INBOX CONTENT */}
      <section
        style={{ flex: 1, width: isMobile ? "100%" : "auto", minWidth: 0 }}
      >
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
              fontSize: "2.5rem",
              textTransform: "none",
            }}
          >
            {labels.messagesTitle}
          </h3>
          <div
            style={{
              display: "flex",
              gap: "8px",
              backgroundColor: "rgba(28,7,0,0.03)",
              padding: "6px",
              borderRadius: "100px",
            }}
          >
            <button
              onClick={() => setMsgFilter("pending")}
              style={subTabStyle(msgFilter === "pending")}
            >
              <Inbox size={16} /> {labels.tabPending}
            </button>
            <button
              onClick={() => setMsgFilter("archived")}
              style={subTabStyle(msgFilter === "archived")}
            >
              <Archive size={16} /> {labels.tabArchive}
            </button>
          </div>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {filteredMessages.length === 0 ? (
            <div
              style={{
                padding: "5rem 3rem",
                textAlign: "center",
                opacity: 0.5,
                backgroundColor: "rgba(28,7,0,0.02)",
                borderRadius: "32px",
                border: "1px dashed rgba(28,7,0,0.1)",
              }}
            >
              <MessageSquare
                size={48}
                style={{ marginBottom: "1.2rem", opacity: 0.2 }}
              />
              <p style={{ fontWeight: "600" }}>{labels.noMessages}</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isExpanded = expandedMsgs[msg.id];
              return (
                <div
                  key={msg.id}
                  style={{
                    ...cardStyle,
                    backgroundColor:
                      msg.status === "new" ? "#fffce3" : "#fdf8e1",
                    borderLeft:
                      msg.status === "new"
                        ? "8px solid #caaff3"
                        : "8px solid rgba(28,7,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    padding: "0",
                    width: "100%",
                    maxWidth: "none",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    boxShadow: isExpanded
                      ? "0 10px 30px rgba(0,0,0,0.05)"
                      : "none",
                  }}
                >
                  {/* HEADER */}
                  <div
                    onClick={() => toggleExpand(msg.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: isMobile ? "1.5rem" : "2rem 2.5rem",
                      cursor: "pointer",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <h4
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: isMobile ? "1.1rem" : "1.4rem",
                          fontWeight: "800",
                          color: "#1c0700",
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.subject}
                      </h4>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          opacity: 0.6,
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: "800", color: "#1c0700" }}>
                          {msg.name}
                        </span>
                        <span
                          style={{
                            width: "4px",
                            height: "4px",
                            backgroundColor: "rgba(28,7,0,0.3)",
                            borderRadius: "50%",
                          }}
                        />
                        <span style={{ fontWeight: "600" }}>
                          {msg.createdAt
                            ? formatDate(msg.createdAt)
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: isMobile ? "12px" : "20px",
                        alignItems: "center",
                        marginLeft: "10px",
                        flexShrink: 0,
                      }}
                    >
                      {msg.status === "new" && !isExpanded && (
                        <TabBadge count={1} />
                      )}
                      {isExpanded ? (
                        <ChevronDown size={isMobile ? 24 : 28} opacity={0.4} />
                      ) : (
                        <ChevronRight size={isMobile ? 24 : 28} opacity={0.4} />
                      )}
                    </div>
                  </div>

                  {/* COLLAPSIBLE BODY */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: isMobile
                          ? "0 1.5rem 1.5rem"
                          : "0 2.5rem 2.5rem",
                        animation: "fadeIn 0.2s ease-out",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1.5rem",
                          borderTop: "1px dashed rgba(28,7,0,0.1)",
                          paddingTop: "1.5rem",
                          flexWrap: "wrap",
                          gap: "15px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.95rem",
                            opacity: 0.7,
                            fontWeight: "600",
                            wordBreak: "break-all",
                          }}
                        >
                          <strong>Email:</strong> {msg.email}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReadStatus(msg.id, msg.status);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color:
                                msg.status === "new" ? "#caaff3" : "#4e5f28",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "0.85rem",
                              fontWeight: "900",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {msg.status === "new" ? (
                              <CheckCircle size={20} />
                            ) : (
                              <Mail size={20} />
                            )}
                            {msg.status === "new"
                              ? labels.markRead
                              : labels.markUnread}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchive(msg.id, msg.archived);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#1c0700",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "0.85rem",
                              fontWeight: "900",
                              opacity: 0.6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {msg.archived ? (
                              <ArchiveRestore size={20} />
                            ) : (
                              <Archive size={20} />
                            )}
                            {msg.archived
                              ? labels.actionUnarchive
                              : labels.actionArchive}
                          </button>

                          <Trash2
                            size={22}
                            color="#ff4d4d"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(msg.id);
                            }}
                            style={{ cursor: "pointer", opacity: 0.5 }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "rgba(28, 7, 0, 0.03)",
                          padding: isMobile ? "1.2rem" : "2rem",
                          borderRadius: "20px",
                          fontSize: "1.05rem",
                          lineHeight: 1.7,
                          border: "1px dashed rgba(28, 7, 0, 0.15)",
                          whiteSpace: "pre-wrap",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        {msg.message}
                      </div>

                      {/* Response History - Updated to full width */}
                      {msg.response && (
                        <div
                          style={{
                            width: "100%",
                            backgroundColor: "rgba(78, 95, 40, 0.05)",
                            padding: "1.5rem",
                            borderRadius: "20px",
                            borderLeft: "6px solid #4e5f28",
                            fontSize: "1rem",
                            marginTop: "2rem",
                            boxSizing: "border-box",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 12px 0",
                              fontSize: "0.75rem",
                              fontWeight: "900",
                              textTransform: "uppercase",
                              color: "#4e5f28",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <CornerDownRight size={14} /> {labels.responded}{" "}
                            {msg.respondedAt ? formatDate(msg.respondedAt) : ""}
                          </p>
                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              fontStyle: "italic",
                              lineHeight: 1.6,
                            }}
                          >
                            {msg.response}
                          </div>
                        </div>
                      )}

                      {/* Direct Reply Area */}
                      <div
                        style={{
                          marginTop: "2.5rem",
                          borderTop: "1px solid rgba(28,7,0,0.1)",
                          paddingTop: "2.5rem",
                          width: "100%",
                        }}
                      >
                        <textarea
                          placeholder={labels.replyLabel}
                          value={replyText[msg.id] || ""}
                          onChange={(e) =>
                            setReplyText({
                              ...replyText,
                              [msg.id]: e.target.value,
                            })
                          }
                          style={{
                            ...inputStyle,
                            width: "100%",
                            minHeight: "180px",
                            backgroundColor: "#fffce3",
                            resize: "vertical",
                            marginBottom: "24px",
                            fontSize: "1.1rem",
                            padding: "24px",
                            border: "1px solid rgba(28,7,0,0.15)",
                            borderRadius: "24px",
                            lineHeight: 1.5,
                            boxSizing: "border-box",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            justifyContent: "space-between",
                            alignItems: isMobile ? "stretch" : "center",
                            gap: "24px",
                          }}
                        >
                          <a
                            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                            style={{
                              fontSize: "0.9rem",
                              color: "#caaff3",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: isMobile
                                ? "center"
                                : "flex-start",
                              gap: "10px",
                              textDecoration: "none",
                              fontWeight: "800",
                            }}
                          >
                            <ExternalLink size={18} /> {labels.external}
                          </a>
                          <button
                            onClick={() => handleSendReply(msg.id)}
                            disabled={
                              isSendingReply === msg.id || !replyText[msg.id]
                            }
                            style={{
                              ...btnStyle,
                              width: isMobile ? "100%" : "auto",
                              padding: "16px 50px",
                              backgroundColor: "#9960a8",
                              color: "#fffce3",
                              fontSize: "1rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "14px",
                              border: "none",
                              borderRadius: "100px",
                              boxShadow: "0 4px 15px rgba(153, 96, 168, 0.2)",
                            }}
                          >
                            {isSendingReply === msg.id ? (
                              <Loader2 className="spinner" size={20} />
                            ) : (
                              <Send size={20} />
                            )}
                            {labels.sendReply}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// TabBadge helper
const TabBadge = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span
      style={{
        backgroundColor: "#9960a8",
        color: "white",
        fontSize: "10px",
        fontWeight: "bold",
        padding: "2px 6px",
        borderRadius: "10px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "18px",
        height: "18px",
        lineHeight: 1,
      }}
    >
      {count}
    </span>
  );
};
