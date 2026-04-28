import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  increment,
} from "firebase/firestore";
import {
  Ticket,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  X,
  ShieldCheck,
} from "lucide-react";
import { planets } from "../../data/planets";
import * as S from "./AdminStyles";

export default function PackCodesTab({ isMobile, currentLang }) {
  const [userCredits, setUserCredits] = useState([]);
  const [guestCodes, setGuestCodes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  const labels = {
    en: {
      title: "Credits & Packs",
      search: "Search...",
      users: "User Balances",
      guests: "Guest Codes",
      addBtn: "Add Credit",
      selectUser: "Search any user...",
      loading: "Loading...",
      deleteConfirm: "Delete code?",
    },
    de: {
      title: "Guthaben & Codes",
      search: "Suchen...",
      users: "Nutzer-Guthaben",
      guests: "Gast-Codes",
      addBtn: "Guthaben hinzufügen",
      selectUser: "Nutzer suchen...",
      loading: "Laden...",
      deleteConfirm: "Code löschen?",
    },
  }[currentLang || "en"];

  const courseKeys = Array.from(
    new Set(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .map((c) => c.link?.replace(/\//g, ""))
        .filter(Boolean),
    ),
  ).sort();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [codesSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, "pack_codes"))),
        getDocs(query(collection(db, "users"))),
      ]);

      const guests = codesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        type: "guest",
      }));

      const usersWithCredits = [];
      const everyUser = [];

      usersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const mainUser = { id: docSnap.id, ...data, isMain: true };
        everyUser.push(mainUser);

        if (data.credits && Object.values(data.credits).some((v) => v > 0)) {
          usersWithCredits.push(mainUser);
        }

        if (data.linkedProfiles) {
          data.linkedProfiles.forEach((lp) => {
            const subUser = {
              ...lp,
              id: lp.id,
              realSubId: lp.id,
              parentId: docSnap.id,
              isMain: false,
            };
            everyUser.push(subUser);
            if (lp.credits && Object.values(lp.credits).some((v) => v > 0)) {
              usersWithCredits.push(subUser);
            }
          });
        }
      });

      setGuestCodes(guests);
      setUserCredits(usersWithCredits);
      setAllUsers(everyUser);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateBalance = async (user, courseKey, delta) => {
    setIsUpdating(true);
    try {
      const parentId = user.isMain ? user.id : user.parentId;
      const userRef = doc(db, "users", parentId);

      if (user.isMain) {
        await updateDoc(userRef, {
          [`credits.${courseKey}`]: increment(delta),
        });
      } else {
        const snap = await getDoc(userRef);
        const updatedLinked = snap.data().linkedProfiles.map((lp) => {
          if (lp.id === user.realSubId) {
            const cur = lp.credits?.[courseKey] || 0;
            return {
              ...lp,
              credits: { ...lp.credits, [courseKey]: Math.max(0, cur + delta) },
            };
          }
          return lp;
        });
        await updateDoc(userRef, { linkedProfiles: updatedLinked });
      }
      fetchData();
    } catch (e) {
      alert(e.message);
    }
    setIsUpdating(false);
  };

  const updateGuestBalance = async (codeId, delta) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "pack_codes", codeId), {
        remainingCredits: increment(delta),
      });
      fetchData();
    } catch (e) {
      alert(e.message);
    }
    setIsUpdating(false);
  };

  const handleDeleteGuest = async (id) => {
    if (window.confirm(labels.deleteConfirm)) {
      await deleteDoc(doc(db, "pack_codes", id));
      fetchData();
    }
  };

  const filterFn = (list) =>
    list.filter((item) => {
      const s = searchTerm.toLowerCase();
      const name = (
        item.buyerName ||
        item.firstName ||
        item.name ||
        ""
      ).toLowerCase();
      const code = (item.id || "").toLowerCase();
      return name.includes(s) || code.includes(s);
    });

  const renderControls = (val, onUpdate) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        backgroundColor: "rgba(28, 7, 0, 0.04)",
        padding: "4px 12px",
        borderRadius: "100px",
        border: "1px solid rgba(78, 95, 40, 0.1)",
        minWidth: isMobile ? "100px" : "auto",
        justifyContent: "center",
      }}
    >
      <button
        onClick={() => onUpdate(-1)}
        disabled={isUpdating}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          fontWeight: "900",
          color: "#4e5f28",
          fontSize: "1.1rem",
        }}
      >
        -
      </button>
      <span
        style={{
          fontWeight: "900",
          minWidth: "18px",
          textAlign: "center",
          fontSize: "0.9rem",
          color: "#1c0700",
        }}
      >
        {val}
      </span>
      <button
        onClick={() => onUpdate(1)}
        disabled={isUpdating}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          fontWeight: "900",
          color: "#4e5f28",
          fontSize: "1.1rem",
        }}
      >
        +
      </button>
    </div>
  );

  return (
    <section>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: "2.5rem",
          gap: "1.2rem",
        }}
      >
        <h3 style={{ ...S.sectionTitleStyle, margin: 0 }}>
          <Ticket size={20} /> {labels.title}
        </h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div style={{ position: "relative", flex: isMobile ? 1 : "initial" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.3,
              }}
            />
            <input
              type="text"
              placeholder={labels.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...S.inputStyle,
                paddingLeft: "36px",
                marginBottom: 0,
                width: isMobile ? "100%" : "240px",
                backgroundColor: "#fdf8e1",
              }}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: "#9960a8",
              color: "#fffce3",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(153, 96, 168, 0.2)",
              flexShrink: 0,
            }}
          >
            <Plus size={22} />
          </button>
          <button
            onClick={fetchData}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.4,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ textAlign: "center", opacity: 0.5 }}>{labels.loading}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {/* User Section */}
          <div>
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: "900",
                opacity: 0.4,
                textTransform: "uppercase",
                marginBottom: "1rem",
                letterSpacing: "1.5px",
              }}
            >
              {labels.users}
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filterFn(userCredits).map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    padding: isMobile ? "16px 20px" : "14px 24px",
                    backgroundColor: "#fdf8e1",
                    borderRadius: "16px",
                    border: "1px solid rgba(28,7,0,0.06)",
                    gap: isMobile ? "12px" : "0",
                  }}
                >
                  <p
                    style={{
                      fontWeight: "800",
                      margin: 0,
                      color: "#1c0700",
                      fontSize: "0.95rem",
                    }}
                  >
                    {u.firstName} {u.lastName}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      gap: isMobile ? "10px" : "20px",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {Object.entries(u.credits || {})
                      .filter(([_, v]) => v > 0)
                      .map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: isMobile
                              ? "space-between"
                              : "flex-start",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: "900",
                              opacity: 0.4,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {k}
                          </span>
                          {renderControls(v, (d) => updateBalance(u, k, d))}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guest Section */}
          <div>
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: "900",
                opacity: 0.4,
                textTransform: "uppercase",
                marginBottom: "1rem",
                letterSpacing: "1.5px",
              }}
            >
              {labels.guests}
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filterFn(guestCodes).map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    padding: isMobile ? "16px 20px" : "14px 24px",
                    backgroundColor: "#fdf8e1",
                    borderRadius: "16px",
                    border: "1px solid rgba(28,7,0,0.06)",
                    gap: isMobile ? "12px" : "0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "900",
                        margin: 0,
                        color: "#9960a8",
                        letterSpacing: "1px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {g.id}
                    </p>
                    <p
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: "800",
                        opacity: 0.4,
                        margin: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      {g.courseKey} • {g.buyerName}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isMobile ? "space-between" : "flex-end",
                      gap: isMobile ? "12px" : "18px",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    {renderControls(g.remainingCredits, (d) =>
                      updateGuestBalance(g.id, d),
                    )}
                    <button
                      onClick={() => handleDeleteGuest(g.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                        opacity: 0.3,
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28,7,0,0.3)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              width: "100%",
              maxWidth: "440px",
              borderRadius: "28px",
              padding: isMobile ? "1.5rem" : "2.5rem",
              position: "relative",
              boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                border: "none",
                background: "none",
                cursor: "pointer",
                opacity: 0.3,
              }}
            >
              <X size={24} />
            </button>
            <h3
              style={{
                margin: "0 0 1.5rem 0",
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: isMobile ? "1.6rem" : "2rem",
                color: "#1c0700",
              }}
            >
              {labels.addBtn}
            </h3>
            <input
              type="text"
              placeholder={labels.selectUser}
              style={{
                ...S.inputStyle,
                backgroundColor: "rgba(255,255,255,0.5)",
                borderRadius: "14px",
              }}
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
            />
            <div
              style={{
                maxHeight: isMobile ? "280px" : "320px",
                overflowY: "auto",
                marginTop: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
              className="custom-scrollbar"
            >
              {allUsers
                .filter((u) =>
                  (u.firstName + " " + (u.lastName || ""))
                    .toLowerCase()
                    .includes(modalSearch.toLowerCase()),
                )
                .slice(0, 8)
                .map((u) => (
                  <div
                    key={u.id}
                    style={{
                      padding: "14px",
                      border: "1px solid rgba(28,7,0,0.08)",
                      borderRadius: "16px",
                      backgroundColor: "rgba(255,255,255,0.4)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "800",
                          fontSize: "0.95rem",
                          color: "#1c0700",
                        }}
                      >
                        {u.firstName} {u.lastName}
                      </p>
                      <ShieldCheck size={18} color="#4e5f28" opacity={0.3} />
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      {courseKeys.map((key) => (
                        <button
                          key={key}
                          onClick={() => {
                            updateBalance(u, key, 1);
                            setIsAddModalOpen(false);
                          }}
                          style={{
                            fontSize: "0.55rem",
                            padding: "6px 12px",
                            borderRadius: "100px",
                            border: "1.5px solid #4e5f28",
                            background: "none",
                            cursor: "pointer",
                            fontWeight: "900",
                            textTransform: "uppercase",
                            color: "#4e5f28",
                          }}
                        >
                          + {key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
