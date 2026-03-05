import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { storage, db } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Camera,
  UploadCloud,
  CheckCircle,
  Loader2,
  XCircle,
  PlusCircle,
  ArrowRight,
  Flame,
  AlertCircle,
  Clock,
  Package,
  User,
} from "lucide-react";

export default function PotteryFiringCard({ currentUser, currentLang }) {
  const [existingObjects, setExistingObjects] = useState([]);
  const [activeTab, setActiveTab] = useState("active"); // 'active', 'ready', 'done'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const labels = {
    en: {
      cardTitle: "pottery status",
      glazeAction: "ready to glaze!",
      pickupAction: "mark picked up",
      registerNew: "register new object",
      registerDesc: "starting a new piece? register it for bisque firing.",
      noPieces: "no pieces found.",
      takePhoto: "take photo",
      submit: "register piece",
      success: "registration successful!",
      close: "close",
      processing: "processing...",
      status_bisque_pending: "in queue (bisque)",
      status_bisque_ready: "ready to glaze",
      status_glaze_pending: "in queue (glaze)",
      status_glaze_ready: "ready for pickup",
      status_broken: "piece broken",
      status_done: "archived",
      tab_active: "active",
      tab_ready: "ready",
      tab_done: "done",
    },
    de: {
      cardTitle: "brenn-status",
      glazeAction: "bereit zum glasieren!",
      pickupAction: "als abgeholt markieren",
      registerNew: "neues objekt registrieren",
      registerDesc: "neu angefangen? registriere es für den schrühbrand.",
      noPieces: "keine stücke gefunden.",
      takePhoto: "foto machen",
      submit: "objekt registrieren",
      success: "registrierung erfolgreich!",
      close: "schließen",
      processing: "verarbeitung...",
      status_bisque_pending: "warteschlange (schrüh)",
      status_bisque_ready: "bereit zum glasieren",
      status_glaze_pending: "warteschlange (glasur)",
      status_glaze_ready: "abholbereit",
      status_broken: "stück kaputt",
      status_done: "archiv",
      tab_active: "aktiv",
      tab_ready: "bereit",
      tab_done: "erledigt",
    },
  }[currentLang];

  const fetchPieces = useCallback(async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    try {
      const lookupFn = httpsCallable(getFunctions(), "getStudentObjects");
      const res = await lookupFn({ email: currentUser.email.toLowerCase() });
      const sorted = (res.data || []).sort(
        (a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0),
      );
      setExistingObjects(sorted);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  const handleMoveStage = async (objectId) => {
    setLoading(true);
    try {
      const moveFn = httpsCallable(getFunctions(), "moveToGlazeStage");
      await moveFn({ objectId, currentLang });
      await fetchPieces();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPickedUp = async (objectId) => {
    setLoading(true);
    try {
      // Since it's just a status change to 'done', we can use the cloud function or write directly
      // Using direct write here as it's allowed for the user's own items by the rules,
      // but let's use the secure cloud function to be safe if rules are strict.
      const updateFn = httpsCallable(getFunctions(), "updateFiringStatus");
      await updateFn({ objectId, newStatus: "done" });
      await fetchPieces();
    } catch (err) {
      // Fallback if cloud function requires full admin: direct write.
      try {
        await updateDoc(doc(db, "firings", objectId), {
          status: "done",
          updatedAt: serverTimestamp(),
        });
        await fetchPieces();
      } catch (e) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!imageFile || !currentUser?.email) return;
    setLoading(true);
    try {
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `firings/${Date.now()}.${fileExt}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      const registerFn = httpsCallable(getFunctions(), "registerFiringObject");
      await registerFn({
        email: currentUser.email.toLowerCase(),
        stage: "bisque",
        imageUrl,
        currentLang,
      });

      await fetchPieces();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setSuccess(false);
    setImagePreview(null);
    setImageFile(null);
    setError("");
  };

  const getStatusBadge = (obj) => {
    let key = "status_bisque_pending";
    let icon = <Clock size={12} />;
    let color = "#9960a8";

    if (obj.status === "broken") {
      key = "status_broken";
      icon = <AlertCircle size={12} />;
      color = "#ff4d4d";
    } else if (obj.status === "done") {
      key = "status_done";
      icon = <CheckCircle size={12} />;
      color = "#1c0700";
    } else if (obj.status === "bisque_ready") {
      key = "status_bisque_ready";
      icon = <Package size={12} />;
      color = "#4e5f28";
    } else if (obj.status === "glaze_ready") {
      key = "status_glaze_ready";
      icon = <CheckCircle size={12} />;
      color = "#4e5f28";
    } else if (obj.stage === "glaze" && obj.status === "pending") {
      key = "status_glaze_pending";
      icon = <Flame size={12} />;
      color = "#4e5f28";
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 10px",
          borderRadius: "100px",
          fontSize: "0.65rem",
          fontWeight: "800",
          backgroundColor: `${color}15`,
          color: color,
        }}
      >
        {icon} {labels[key]}
      </span>
    );
  };

  // CATEGORIZE ITEMS FOR TABS
  const categorized = useMemo(() => {
    return {
      active: existingObjects.filter((o) => o.status === "pending"),
      ready: existingObjects.filter(
        (o) => o.status === "bisque_ready" || o.status === "glaze_ready",
      ),
      done: existingObjects.filter(
        (o) => o.status === "done" || o.status === "broken",
      ),
    };
  }, [existingObjects]);

  const activeItems = categorized[activeTab] || [];

  return (
    <div style={cardContainer}>
      <h2 style={cardTitleStyle}>
        <Flame size={22} color="#9960a8" /> {labels.cardTitle}
      </h2>

      {/* NEW TAB NAVIGATION */}
      <div style={tabNavContainer}>
        {["active", "ready", "done"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...tabBtnStyle,
              backgroundColor: activeTab === tab ? "#caaff3" : "transparent",
            }}
          >
            {labels[`tab_${tab}`]}
            <span
              style={{
                ...badgeStyle,
                backgroundColor:
                  activeTab === tab ? "#fffce3" : "rgba(28, 7, 0, 0.1)",
              }}
            >
              {categorized[tab].length}
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "1.5rem",
        }}
      >
        {loading && existingObjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <Loader2 className="spinner" size={24} color="#caaff3" />
          </div>
        ) : activeItems.length > 0 ? (
          activeItems.map((obj) => (
            <div
              key={obj.id}
              style={{
                ...objectCardStyle,
                opacity:
                  obj.status === "done" || obj.status === "broken" ? 0.6 : 1,
              }}
            >
              <div style={imageWrapper}>
                <img src={obj.imageUrl} style={thumbStyle} alt="pottery" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                    {new Date(
                      obj.createdAt?._seconds * 1000,
                    ).toLocaleDateString()}
                  </div>
                  {getStatusBadge(obj)}
                </div>

                {obj.status === "bisque_ready" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveStage(obj.id);
                    }}
                    disabled={loading}
                    style={actionButtonStyle("#caaff3", "#1c0700")}
                  >
                    {loading ? (
                      <Loader2 size={12} className="spinner" />
                    ) : (
                      <ArrowRight size={12} />
                    )}{" "}
                    {labels.glazeAction}
                  </button>
                )}

                {obj.status === "glaze_ready" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkPickedUp(obj.id);
                    }}
                    disabled={loading}
                    style={actionButtonStyle("#4e5f28", "#fffce3")}
                  >
                    {loading ? (
                      <Loader2 size={12} className="spinner" />
                    ) : (
                      <CheckCircle size={12} />
                    )}{" "}
                    {labels.pickupAction}
                  </button>
                )}

                {obj.status !== "bisque_ready" &&
                  obj.status !== "glaze_ready" && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        opacity: 0.4,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <User size={12} /> {currentUser.displayName || obj.email}
                    </div>
                  )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <p
              style={{ fontSize: "0.9rem", opacity: 0.5, fontStyle: "italic" }}
            >
              {labels.noPieces}
            </p>
          </div>
        )}
      </div>

      <div onClick={() => setIsModalOpen(true)} style={registerTriggerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <PlusCircle size={20} color="#4e5f28" />
          <ArrowRight size={16} opacity={0.3} />
        </div>
        <h3
          style={{ margin: "4px 0 0 0", fontSize: "1rem", fontWeight: "700" }}
        >
          {labels.registerNew}
        </h3>
        <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
          {labels.registerDesc}
        </p>
      </div>

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div style={modalOverlay} onClick={() => !loading && resetModal()}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            {!success ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "Harmond-SemiBoldCondensed",
                      fontSize: "1.8rem",
                    }}
                  >
                    {labels.registerNew}
                  </h3>
                  <button
                    onClick={resetModal}
                    style={closeBtn}
                    disabled={loading}
                  >
                    <XCircle />
                  </button>
                </div>
                <form onSubmit={handleRegister}>
                  <div style={photoBox}>
                    {imagePreview ? (
                      <div style={{ position: "relative" }}>
                        <img
                          src={imagePreview}
                          style={previewImg}
                          alt="preview"
                        />
                        {!loading && (
                          <button
                            type="button"
                            onClick={() => setImagePreview(null)}
                            style={removeImg}
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current.click()}
                        style={cameraPrompt}
                      >
                        <Camera size={32} /> {labels.takePhoto}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !imageFile}
                    style={submitBtn}
                  >
                    {loading ? (
                      <Loader2 className="spinner" size={20} />
                    ) : (
                      <UploadCloud size={20} />
                    )}
                    {loading ? labels.processing : labels.submit}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle
                  size={50}
                  color="#4e5f28"
                  style={{ marginBottom: "1rem" }}
                />
                <h3
                  style={{
                    fontFamily: "Harmond-SemiBoldCondensed",
                    fontSize: "2rem",
                  }}
                >
                  {labels.success}
                </h3>
                <button onClick={resetModal} style={submitBtn}>
                  {labels.close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}

// STYLES
const cardContainer = {
  backgroundColor: "#fdf8e1",
  padding: "2rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.06)",
};
const cardTitleStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "1.8rem",
  color: "#1c0700",
  marginTop: 0,
  marginBottom: "1rem",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const tabNavContainer = {
  display: "flex",
  backgroundColor: "rgba(28, 7, 0, 0.04)",
  borderRadius: "100px",
  padding: "4px",
  gap: "4px",
  overflowX: "auto",
  marginBottom: "1.5rem",
};
const tabBtnStyle = {
  borderRadius: "100px",
  color: "#1c0700",
  padding: "8px 16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "0.75rem",
  transition: "all 0.2s",
};
const badgeStyle = {
  padding: "2px 8px",
  borderRadius: "10px",
  fontSize: "0.6rem",
  fontWeight: "900",
};

const objectCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
  padding: "12px",
  backgroundColor: "#fffce3",
  borderRadius: "16px",
  border: "1px solid rgba(202,175,243,0.15)",
  marginBottom: "4px",
  transition: "all 0.2s ease",
};
const imageWrapper = {
  width: "65px",
  height: "65px",
  borderRadius: "10px",
  overflow: "hidden",
  flexShrink: 0,
  backgroundColor: "rgba(28,7,0,0.03)",
};
const thumbStyle = { width: "100%", height: "100%", objectFit: "cover" };
const actionButtonStyle = (bg, text) => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  backgroundColor: bg,
  color: text,
  border: "none",
  borderRadius: "100px",
  padding: "6px 12px",
  fontSize: "0.75rem",
  fontWeight: "800",
  cursor: "pointer",
  marginTop: "8px",
});

const registerTriggerStyle = {
  backgroundColor: "rgba(28,7,0,0.03)",
  padding: "1.2rem",
  borderRadius: "18px",
  border: "1px dashed rgba(28,7,0,0.1)",
  cursor: "pointer",
};
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(28,7,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: "20px",
};
const modalContent = {
  backgroundColor: "#fffce3",
  padding: "2.5rem",
  borderRadius: "28px",
  width: "100%",
  maxWidth: "450px",
  color: "#1c0700",
};
const closeBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  opacity: 0.5,
};
const photoBox = { marginBottom: "1.5rem" };
const cameraPrompt = {
  width: "100%",
  aspectRatio: "1/1",
  border: "2px dashed #caaff3",
  borderRadius: "20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  color: "#9960a8",
  fontWeight: "700",
  backgroundColor: "#fdf8e1",
  cursor: "pointer",
};
const previewImg = {
  width: "100%",
  aspectRatio: "1/1",
  borderRadius: "20px",
  objectFit: "cover",
};
const removeImg = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "rgba(0,0,0,0.5)",
  color: "#fffce3",
  border: "none",
  borderRadius: "50%",
  width: "32px",
  height: "32px",
  cursor: "pointer",
};
const submitBtn = {
  width: "100%",
  padding: "16px",
  backgroundColor: "#9960a8",
  color: "#fffce3",
  border: "none",
  borderRadius: "100px",
  fontSize: "1rem",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
  marginTop: "1rem",
};
