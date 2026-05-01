import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Flame,
  CheckCircle,
  AlertTriangle,
  Package,
  Clock,
  Loader2,
  Mail,
  User,
  Check,
  ShoppingBag,
  Brush,
  ArrowRightLeft,
  Square,
  CheckSquare,
  Send,
  Calendar,
  AlertOctagon,
  Trash2,
} from "lucide-react";
import { cardStyle, tabContainerStyle, tabButtonStyle } from "./AdminStyles";

export default function FiringTab({ isMobile, currentLang }) {
  const [firings, setFirings] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("bisque_pending");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  const labels = {
    en: {
      bisque_pending: "bisque firing",
      glaze_pending: "glaze firing",
      ready_glaze: "ready for glaze",
      ready_pickup: "ready for pickup",
      completed: "archived",
      abandoned: "overdue",
      bisque: "bisque",
      glaze: "glaze",
      markBisque: "mark ready",
      markGlaze: "mark ready",
      markBroken: "broken",
      markDone: "picked up",
      adminTools: "internal move",
      moveToGlaze: "to glaze queue",
      moveToBisque: "to bisque",
      moveToQueue: "reset",
      noItems: "no items found.",
      confirmAction: "confirm status change?",
      confirmBatch: "process {count} items?",
      deselectAll: "deselect",
      groupSelect: "select all",
      groupDeselect: "deselect",
      batch_bisque_pending: "mark ready to glaze",
      batch_glaze_pending: "mark ready for pickup",
      batch_ready_glaze: "move to glaze queue",
      batch_ready_pickup: "mark as picked up",
      batchAction: "process selection",
      overdueBadge: "overdue",
      archiveOverdue: "to adoption pool",
      confirmArchive: "Move this overdue piece to the adoption pool?",
      trashPiece: "trash piece",
      confirmTrash:
        "Are you sure you want to permanently delete this piece? This cannot be undone.",
    },
    de: {
      bisque_pending: "bisque fire",
      glaze_pending: "glasurbrand",
      ready_glaze: "glasierbereit",
      ready_pickup: "abholbereit",
      completed: "archiv",
      abandoned: "überfällig",
      bisque: "bisque",
      glaze: "glasur",
      markBisque: "fertig",
      markGlaze: "fertig",
      markBroken: "kaputt",
      markDone: "abgeholt",
      adminTools: "interne korrektur",
      moveToGlaze: "in glasur-warteschlange",
      moveToBisque: "zu bisque",
      moveToQueue: "reset",
      noItems: "keine objekte gefunden.",
      confirmAction: "status ändern?",
      confirmBatch: "{count} objekte verarbeiten?",
      deselectAll: "abwählen",
      groupSelect: "alle wählen",
      groupDeselect: "abwählen",
      batch_bisque_pending: "fertig zum glasieren",
      batch_glaze_pending: "abholbereit markieren",
      batch_ready_glaze: "in glasur-warteschlange verschieben",
      batch_ready_pickup: "als abgeholt markieren",
      batchAction: "auswahl verarbeiten",
      overdueBadge: "überfällig",
      overdueBadge: "überfällig",
      archiveOverdue: "Zur Adoption freigeben",
      confirmArchive: "Dieses überfällige Stück zur Adoption freigegeben?",
      trashPiece: "wegwerfen",
      confirmTrash:
        "Soll dieses Stück wirklich endgültig gelöscht werden? Das kann nicht rückgängig gemacht werden.",
    },
  }[currentLang || "en"];

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleDateString(currentLang === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.email)
          map[data.email.toLowerCase()] = `${data.firstName} ${data.lastName}`;
      });
      setUserMap(map);
    });
    return () => unsubUsers();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "firings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFirings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeFilter]);

  const tabCounts = useMemo(
    () => ({
      bisque_pending: firings.filter(
        (f) => f.stage === "bisque" && f.status === "pending",
      ).length,
      glaze_pending: firings.filter(
        (f) => f.stage === "glaze" && f.status === "pending",
      ).length,
      ready_glaze: firings.filter((f) => f.status === "bisque_ready").length,
      ready_pickup: firings.filter((f) => f.status === "glaze_ready").length,
      abandoned: firings.filter((f) => f.status === "abandoned").length,
      completed: firings.filter(
        (f) => f.status === "done" || f.status === "broken",
      ).length,
    }),
    [firings],
  );

  const groupedItems = useMemo(() => {
    const filtered = firings.filter((f) => {
      if (activeFilter === "bisque_pending")
        return f.stage === "bisque" && f.status === "pending";
      if (activeFilter === "glaze_pending")
        return f.stage === "glaze" && f.status === "pending";
      if (activeFilter === "ready_glaze") return f.status === "bisque_ready";
      if (activeFilter === "ready_pickup") return f.status === "glaze_ready";
      if (activeFilter === "abandoned") return f.status === "abandoned";
      if (activeFilter === "completed")
        return f.status === "done" || f.status === "broken";
      return false;
    });

    const groups = {};
    filtered.forEach((item) => {
      const dateKey = formatDate(item.createdAt) || "Unknown";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [firings, activeFilter, currentLang]);

  const handleUpdateStatus = async (objectId, newStatus, newStage = null) => {
    if (!window.confirm(labels.confirmAction)) return;
    setProcessingId(objectId);
    try {
      if (newStage) {
        await updateDoc(doc(db, "firings", objectId), {
          status: newStatus,
          stage: newStage,
          updatedAt: serverTimestamp(),
        });
      } else {
        const updateFn = httpsCallable(getFunctions(), "updateFiringStatus");
        await updateFn({ objectId, newStatus });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualMove = async (
    objectId,
    newStage,
    newStatus = "pending",
  ) => {
    setProcessingId(objectId);
    try {
      await updateDoc(doc(db, "firings", objectId), {
        stage: newStage,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchiveOverdue = async (item) => {
    if (!window.confirm(labels.confirmArchive)) return;
    setProcessingId(item.id);
    try {
      await updateDoc(doc(db, "firings", item.id), {
        status: "abandoned",
        previousStatus: item.status,
        previousStage: item.stage,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleTrashPiece = async (item) => {
    if (!window.confirm(labels.confirmTrash)) return;
    setProcessingId(item.id);
    try {
      await deleteDoc(doc(db, "firings", item.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchUpdate = async () => {
    if (
      !window.confirm(
        labels.confirmBatch.replace("{count}", selectedIds.length),
      )
    )
      return;
    setIsBatchProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          if (activeFilter === "ready_glaze") {
            return updateDoc(doc(db, "firings", id), {
              status: "pending",
              stage: "glaze",
              updatedAt: serverTimestamp(),
            });
          } else {
            let targetStatus =
              activeFilter === "bisque_pending"
                ? "bisque_ready"
                : activeFilter === "glaze_pending"
                  ? "glaze_ready"
                  : "done";
            const updateFn = httpsCallable(
              getFunctions(),
              "updateFiringStatus",
            );
            return updateFn({ objectId: id, newStatus: targetStatus });
          }
        }),
      );
      setSelectedIds([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // CHECK: 8 weeks (56 days) for Bisque, 4 weeks (28 days) for Glaze
  const checkOverdue = (item) => {
    if (!item.updatedAt) return false;
    const diffDays = Math.ceil(
      Math.abs(new Date() - item.updatedAt.toDate()) / (1000 * 60 * 60 * 24),
    );
    if (item.status === "bisque_ready" && diffDays >= 56) return true;
    if (item.status === "glaze_ready" && diffDays >= 28) return true;
    return false;
  };

  const renderCard = (item) => {
    const isSelected = selectedIds.includes(item.id);

    // --- FIX FOR THE "GUEST" BUG ON DISPLAY ---
    const studentName = userMap[item.email?.toLowerCase()];
    // Prioritize the real name from the userMap if the database accidentally saved "Guest"
    const savedName = item.name === "Guest" ? null : item.name;
    const displayName =
      item.name && item.name !== "Guest" && item.name !== "Student"
        ? item.name
        : userMap[item.email?.toLowerCase()] || item.email || "Guest";
    // ------------------------------------------

    const isOverdue = checkOverdue(item);

    let mainActions = [];
    let internalActions = [];

    if (activeFilter === "bisque_pending") {
      mainActions = [
        {
          label: labels.markBisque,
          status: "bisque_ready",
          color: "#9960a8",
          icon: <Check size={14} />,
        },
      ];
      internalActions = [
        {
          label: labels.moveToGlaze,
          stage: "glaze",
          status: "pending",
          icon: <ArrowRightLeft size={12} />,
        },
      ];
    } else if (activeFilter === "glaze_pending") {
      mainActions = [
        {
          label: labels.markGlaze,
          status: "glaze_ready",
          color: "#4e5f28",
          icon: <Check size={14} />,
        },
      ];
      internalActions = [
        {
          label: labels.moveToBisque,
          stage: "bisque",
          status: "pending",
          icon: <ArrowRightLeft size={12} />,
        },
      ];
    } else if (activeFilter === "ready_glaze") {
      mainActions = [
        {
          label: labels.moveToGlaze,
          status: "pending",
          stage: "glaze",
          color: "#4e5f28",
          icon: <Flame size={14} />,
        },
      ];
      internalActions = [
        {
          label: labels.moveToQueue,
          stage: "bisque",
          status: "pending",
          icon: <ArrowRightLeft size={12} />,
        },
      ];
    } else if (activeFilter === "ready_pickup") {
      mainActions = [
        {
          label: labels.markDone,
          status: "done",
          color: "#1c0700",
          icon: <CheckCircle size={14} />,
        },
      ];
      internalActions = [
        {
          label: labels.moveToQueue,
          stage: "glaze",
          status: "pending",
          icon: <ArrowRightLeft size={12} />,
        },
      ];
    } else if (activeFilter === "abandoned") {
      internalActions = [
        {
          label: "Restore",
          onClick: () =>
            handleManualMove(
              item.id,
              item.previousStage || item.stage,
              item.previousStatus || "pending",
            ),
        },
        {
          label: labels.trashPiece,
          icon: <Trash2 size={10} />,
          color: "#1c0700",
          borderColor: "rgba(28, 7, 0, 0.2)",
          onClick: () => handleTrashPiece(item),
        },
      ];
    }

    if (activeFilter.includes("pending")) {
      mainActions.push({
        label: labels.markBroken,
        status: "broken",
        color: "#978672",
        icon: <AlertTriangle size={14} />,
      });
    }

    // Overdue Archive Button
    if (
      isOverdue &&
      activeFilter !== "completed" &&
      activeFilter !== "abandoned"
    ) {
      // Button 1: Adoption Pool (Soft Archive)
      internalActions.push({
        label: labels.archiveOverdue,
        icon: <AlertOctagon size={10} />,
        color: "#ff4d4d",
        borderColor: "rgba(255, 77, 77, 0.4)",
        onClick: () => handleArchiveOverdue(item),
      });
      // Button 2: Trash (Permanent Delete)
      internalActions.push({
        label: labels.trashPiece,
        icon: <Trash2 size={10} />,
        color: "#1c0700",
        borderColor: "rgba(28, 7, 0, 0.2)",
        onClick: () => handleTrashPiece(item),
      });
    }

    return (
      <div
        key={item.id}
        onClick={() =>
          setSelectedIds((prev) =>
            prev.includes(item.id)
              ? prev.filter((i) => i !== item.id)
              : [...prev, item.id],
          )
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px",
          backgroundColor: isSelected
            ? "rgba(202, 175, 243, 0.15)"
            : isOverdue
              ? "rgba(255, 77, 77, 0.05)"
              : "#fffce3",
          borderRadius: "14px",
          border: isSelected
            ? "2px solid #9960a8"
            : isOverdue
              ? "1px solid #ff4d4d"
              : "1px solid rgba(202,175,243,0.2)",
          boxShadow:
            isOverdue && !isSelected
              ? "0 0 10px rgba(255, 77, 77, 0.1)"
              : "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {activeFilter !== "abandoned" && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              color: isSelected ? "#9960a8" : "rgba(28,7,0,0.15)",
              zIndex: 5,
            }}
          >
            {isSelected ? (
              <CheckSquare size={16} fill="#caaff3" />
            ) : (
              <Square size={16} />
            )}
          </div>
        )}

        <div
          onClick={(e) => {
            e.stopPropagation(); // Prevents the card from being selected
            setViewingImage(item.imageUrl);
          }}
          style={{
            width: "65px",
            height: "65px",
            borderRadius: "10px",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "rgba(28,7,0,0.03)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "zoom-in", // Shows the user it is clickable
          }}
        >
          <img
            src={item.imageUrl}
            alt="Pottery"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div
          style={{
            flex: 1,
            paddingRight: activeFilter !== "abandoned" ? "20px" : "0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                backgroundColor:
                  item.stage === "bisque"
                    ? "rgba(202,175,243,0.15)"
                    : "rgba(78,95,40,0.1)",
                color: item.stage === "bisque" ? "#9960a8" : "#4e5f28",
                padding: "2px 8px",
                borderRadius: "100px",
                fontSize: "0.6rem",
                fontWeight: "900",
              }}
            >
              {item.stage === "bisque" ? labels.bisque : labels.glaze}
            </span>
            {isOverdue && activeFilter !== "abandoned" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "#ff4d4d",
                  color: "#fffce3",
                  padding: "2px 8px",
                  borderRadius: "100px",
                  fontSize: "0.6rem",
                  fontWeight: "900",
                }}
              >
                <AlertOctagon size={10} /> {labels.overdueBadge}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "700",
              fontSize: "0.85rem",
              color: "#1c0700",
            }}
          >
            {displayName !== item.email ? (
              <User size={12} color="#caaff3" />
            ) : (
              <Mail size={12} color="#caaff3" />
            )}
            {displayName}
          </div>
          {item.userCode && (
            <div
              style={{
                fontSize: "0.65rem",
                color: "#9960a8",
                fontWeight: "bold",
                marginTop: "2px",
              }}
            >
              Code: {item.userCode}
            </div>
          )}

          <div style={{ marginTop: "6px", width: "100%" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              {mainActions.map((act, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(item.id, act.status, act.stage);
                  }}
                  disabled={processingId === item.id}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "100px",
                    border: "none",
                    fontSize: "0.65rem",
                    fontWeight: "800",
                    cursor: "pointer",
                    backgroundColor: act.color,
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {processingId === item.id ? (
                    <Loader2 size={10} className="spinner" />
                  ) : (
                    React.cloneElement(act.icon, { size: 10 })
                  )}{" "}
                  {act.label}
                </button>
              ))}
            </div>

            {internalActions.length > 0 && (
              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                {internalActions.map((act, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      act.onClick
                        ? act.onClick()
                        : handleManualMove(item.id, act.stage, act.status);
                    }}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "100px",
                      border: act.borderColor
                        ? `1px solid ${act.borderColor}`
                        : "1px solid rgba(28,7,0,0.15)",
                      background: "transparent",
                      fontSize: "0.6rem",
                      fontWeight: "600",
                      color: act.color || "rgba(28,7,0,0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {act.icon ? (
                      React.cloneElement(act.icon, { size: 8 })
                    ) : (
                      <ArrowRightLeft size={8} />
                    )}{" "}
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Loader2 className="spinner" color="#caaff3" size={30} />
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
        <div
          style={{
            ...tabContainerStyle,
            backgroundColor: "rgba(28, 7, 0, 0.04)",
            borderRadius: "100px",
            padding: "4px",
            display: "flex",
            overflowX: isMobile ? "auto" : "visible",
            whiteSpace: "nowrap",
            gap: "4px",
          }}
          className="hide-scrollbar"
        >
          {[
            { id: "bisque_pending", icon: <Flame size={14} /> },
            { id: "glaze_pending", icon: <Flame size={14} /> },
            { id: "ready_glaze", icon: <Brush size={14} /> },
            { id: "ready_pickup", icon: <ShoppingBag size={14} /> },
            { id: "abandoned", icon: <AlertOctagon size={14} /> },
            { id: "completed", icon: <CheckCircle size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                ...tabButtonStyle(activeFilter === tab.id, isMobile),
                backgroundColor:
                  activeFilter === tab.id ? "#caaff3" : "transparent",
                borderRadius: "100px",
                color: "#1c0700",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: isMobile ? "8px 12px" : "8px 20px",
              }}
            >
              {tab.icon} {labels[tab.id]}
              <span
                style={{
                  backgroundColor:
                    activeFilter === tab.id ? "#fffce3" : "rgba(28, 7, 0, 0.1)",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "0.65rem",
                  fontWeight: "900",
                }}
              >
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && activeFilter !== "abandoned" && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? "20px" : "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5000,
            backgroundColor: "#1c0700",
            padding: isMobile ? "10px 16px" : "12px 24px",
            borderRadius: "100px",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "12px" : "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            color: "white",
            width: isMobile ? "90%" : "auto",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontWeight: "bold",
              fontSize: isMobile ? "0.75rem" : "0.9rem",
            }}
          >
            {selectedIds.length}
          </span>
          <button
            onClick={handleBatchUpdate}
            disabled={isBatchProcessing}
            style={{
              backgroundColor: "#caaff3",
              border: "none",
              padding: isMobile ? "6px 14px" : "8px 20px",
              borderRadius: "100px",
              color: "#1c0700",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: isMobile ? "0.7rem" : "0.85rem",
            }}
          >
            {isBatchProcessing ? (
              <Loader2 className="spinner" size={14} />
            ) : (
              <Send size={14} />
            )}{" "}
            Process
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              opacity: 0.6,
              fontSize: "0.7rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {labels.deselectAll}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {Object.entries(groupedItems).length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
            {labels.noItems}
          </div>
        ) : (
          Object.entries(groupedItems).map(([date, items]) => (
            <section key={date}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.6rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#4e5f28",
                  }}
                >
                  <Calendar size={16} />
                  <h4
                    style={{
                      margin: 0,
                      fontWeight: "800",
                      fontSize: isMobile ? "0.85rem" : "1.1rem",
                      fontFamily: "Harmond-SemiBoldCondensed",
                    }}
                  >
                    {date}
                  </h4>
                </div>
                {activeFilter !== "abandoned" && (
                  <button
                    onClick={() => {
                      const itemIds = items.map((i) => i.id);
                      const allInSelected = itemIds.every((id) =>
                        selectedIds.includes(id),
                      );
                      setSelectedIds((prev) =>
                        allInSelected
                          ? prev.filter((id) => !itemIds.includes(id))
                          : [...new Set([...prev, ...itemIds])],
                      );
                    }}
                    style={{
                      background: "rgba(78, 95, 40, 0.05)",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "100px",
                      fontSize: "0.6rem",
                      fontWeight: "bold",
                      color: "#4e5f28",
                      cursor: "pointer",
                    }}
                  >
                    {items
                      .map((i) => i.id)
                      .every((id) => selectedIds.includes(id))
                      ? labels.groupDeselect
                      : labels.groupSelect}
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                {items.map((item) => renderCard(item))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* FULLSCREEN IMAGE MODAL */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28,7,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: "20px",
            cursor: "zoom-out",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "90vh",
            }}
          >
            <img
              src={viewingImage}
              alt="Enlarged Pottery"
              onClick={(e) => e.stopPropagation()} // Prevents closing when clicking the image itself
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                borderRadius: "16px",
                objectFit: "contain",
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                cursor: "default",
              }}
            />
            <button
              onClick={() => setViewingImage(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                background: "#fffce3",
                border: "none",
                color: "#1c0700",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
