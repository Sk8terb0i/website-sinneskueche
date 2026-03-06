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
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"; // Fixed path based on your Profile.jsx location
import Cropper from "react-easy-crop";
import {
  Camera,
  UploadCloud,
  CheckCircle,
  Loader2,
  XCircle,
  Search,
  PlusCircle,
  Home,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  Flame,
  AlertCircle,
  Clock,
  Package,
  User,
} from "lucide-react";

// --- CROP & COMPRESSION HELPER FUNCTIONS ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop, quality = 0.7) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}
// -------------------------------------------

export default function PotteryFiringCard({ currentLang }) {
  const navigate = useNavigate();
  // Pulled userData in addition to currentUser
  const { currentUser, userData } = useAuth();

  const [step, setStep] = useState("email");
  const [activeTab, setActiveTab] = useState("active");
  const [userCode, setUserCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [existingObjects, setExistingObjects] = useState([]);
  const [abandonedObjects, setAbandonedObjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimingPiece, setClaimingPiece] = useState(null);

  const [claimCode, setClaimCode] = useState("");
  const [claimName, setClaimName] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --- CROPPER STATE ---
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  // ---------------------

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const fetchAbandoned = useCallback(async () => {
    try {
      const q = query(
        collection(db, "firings"),
        where("status", "==", "abandoned"),
      );
      const snap = await getDocs(q);
      setAbandonedObjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchPieces = useCallback(async (targetCode) => {
    if (!targetCode) return;
    setLoading(true);
    setError("");
    try {
      const lookupFn = httpsCallable(getFunctions(), "getStudentObjects");
      const res = await lookupFn({ userCode: targetCode.toUpperCase() });
      const sorted = (res.data || []).sort(
        (a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0),
      );
      setExistingObjects(sorted);
      setStep("selection");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAbandoned();
    const initUser = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          let code = snap.data()?.firingCode;

          if (!code) {
            code = Math.random().toString(36).substring(2, 6).toUpperCase();
            await updateDoc(userRef, { firingCode: code });
          }

          setUserCode(code);
          fetchPieces(code);
        } catch (err) {}
      }
    };
    initUser();
  }, [currentUser, fetchPieces, fetchAbandoned]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fileInputRef = useRef(null);

  const labels = {
    en: {
      cardTitle: "pottery status",
      lookupStep: "Enter your code",
      lookupDesc: "Enter your 4-character code to find your pieces.",
      codePlaceholder: "4-character code (e.g. A1B2)",
      namePlaceholder: "Full Name",
      emailPlaceholder: "Email Address",
      findExisting: "Search my pieces",
      registerDirectly: "Register new object",
      registerDirectlyDesc: "Start a fresh registration (Initial Bisque).",
      noExisting: "No objects found.",
      isThisYours: "Manage your pieces",
      glazeAction: "Move to Glaze firing",
      pickupAction: "Mark picked up",
      orRegisterNew: "None of these / New object",
      takePhoto: "Open Camera / Select Photo",
      dragToCrop: "Drag to frame your object",
      submit: "Confirm Registration",
      successTitle: "All Set!",
      successText:
        "Your object is in the queue. We'll email you when it's ready!",
      goHome: "Back to Home",
      goProfile: "My Profile",
      or: "OR",
      processing: "Processing...",
      searching: "Finding your pieces...",
      back: "Back",
      codeTaken: "This code is already in use. Please choose another.",
      codeLength: "Code must be exactly 4 characters.",
      requiredFields: "Please fill out all fields.",
      tab_active: "active",
      tab_ready: "ready",
      tab_done: "done",
      adoptTitle: "adopt a piece",
      adoptDesc: "These pieces have been abandoned. Claim one for free!",
      claimAction: "claim piece",
      claimTitle: "Claim Piece",
      claimDesc: "Take ownership of this overdue piece.",
      claimConfirm: "Are you sure you want to claim this piece?",
      noAdopt: "No adoptable pieces right now.",
      emptyTab: "currently no pieces.",
      status_bisque_pending: "in queue (bisque)",
      status_bisque_ready: "ready to glaze",
      status_glaze_pending: "in queue (glaze)",
      status_glaze_ready: "ready for pickup",
      status_broken: "piece broken",
      status_done: "archived",
      status_abandoned: "adoptable",
      registerNew: "register new object",
      registerDesc: "starting a new piece? register it for bisque firing.",
    },
    de: {
      cardTitle: "brenn-status",
      lookupStep: "Code eingeben",
      lookupDesc: "Gib deinen 4-stelligen Code ein, um deine Stücke zu finden.",
      codePlaceholder: "4-stelliger Code (z.B. A1B2)",
      namePlaceholder: "Vollständiger Name",
      emailPlaceholder: "E-Mail Adresse",
      findExisting: "Meine Stücke suchen",
      registerDirectly: "Neues Objekt registrieren",
      registerDirectlyDesc: "Beginne eine neue Registrierung (Schrühbrand).",
      noExisting: "Keine Stücke gefunden.",
      isThisYours: "Verwalte deine Objekte",
      glazeAction: "Zum Glasurbrand bewegen",
      pickupAction: "Als abgeholt markieren",
      orRegisterNew: "Keines davon / Neu registrieren",
      takePhoto: "Kamera öffnen / Foto wählen",
      dragToCrop: "Ziehe das Bild passend in den Rahmen",
      submit: "Registrierung bestätigen",
      successTitle: "Erledigt!",
      successText:
        "Dein Objekt ist in der Warteschlange. Wir melden uns per E-Mail!",
      goHome: "Zur Startseite",
      goProfile: "Mein Profil",
      or: "ODER",
      processing: "Verarbeitung...",
      searching: "Suche deine Stücke...",
      back: "Zurück",
      codeTaken: "Dieser Code ist bereits vergeben. Bitte wähle einen anderen.",
      codeLength: "Der Code muss genau 4 Zeichen lang sein.",
      requiredFields: "Bitte fülle alle Felder aus.",
      tab_active: "aktiv",
      tab_ready: "bereit",
      tab_done: "fertig",
      adoptTitle: "stück adoptieren",
      adoptDesc: "Diese Stücke wurden verlassen. Adoptiere eines kostenlos!",
      claimAction: "adoptieren",
      claimTitle: "Stück adoptieren",
      claimDesc: "Übernimm dieses überfällige Stück.",
      claimConfirm: "Dieses Stück wirklich als dein eigenes übernehmen?",
      noAdopt: "Momentan keine adoptierbaren Stücke.",
      emptyTab: "aktuell keine stücke.",
      status_bisque_pending: "warteschlange (schrüh)",
      status_bisque_ready: "bereit zum glasieren",
      status_glaze_pending: "warteschlange (glasur)",
      status_glaze_ready: "abholbereit",
      status_broken: "stück kaputt",
      status_done: "archiv",
      status_abandoned: "adoptierbar",
      registerNew: "neues objekt registrieren",
      registerDesc: "neu angefangen? registriere es für den schrühbrand.",
    },
  }[currentLang || "en"];

  const handleLookup = (e) => {
    e.preventDefault();
    if (userCode.length !== 4) return setError(labels.codeLength);
    fetchPieces(userCode);
  };

  const handleMoveStage = async (objectId) => {
    setLoading(true);
    try {
      const moveFn = httpsCallable(getFunctions(), "moveToGlazeStage");
      await moveFn({ objectId, currentLang });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPickedUp = async (objectId) => {
    setLoading(true);
    try {
      const updateFn = httpsCallable(getFunctions(), "updateFiringStatus");
      await updateFn({ objectId, newStatus: "done" });
      setSuccess(true);
    } catch (err) {
      try {
        await updateDoc(doc(db, "firings", objectId), {
          status: "done",
          updatedAt: serverTimestamp(),
        });
        setSuccess(true);
      } catch (e) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const finalCode = currentUser ? userCode : claimCode.toUpperCase();
      const finalName = currentUser?.displayName || claimName || "Guest";
      const finalEmail = currentUser?.email || "";

      if (!finalCode || finalCode.length !== 4)
        throw new Error(labels.codeLength);

      if (!currentUser) {
        const q = query(
          collection(db, "firings"),
          where("userCode", "==", finalCode),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().email !== finalEmail) {
          throw new Error(labels.codeTaken);
        }
      }

      await updateDoc(doc(db, "firings", claimingPiece.id), {
        status: claimingPiece.previousStatus || "pending",
        stage: claimingPiece.previousStage || claimingPiece.stage,
        userCode: finalCode,
        name: finalName,
        email: finalEmail,
        updatedAt: serverTimestamp(),
      });

      setClaimingPiece(null);
      fetchPieces(finalCode);
      fetchAbandoned();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRegistration = async (e) => {
    e.preventDefault();
    if (!imagePreview || !croppedAreaPixels) return setError("Photo required.");
    setError("");

    const isFirstTimeGuest = !currentUser && existingObjects.length === 0;
    const finalCode = userCode.toUpperCase();

    if (isFirstTimeGuest) {
      if (finalCode.length !== 4) return setError(labels.codeLength);
      if (!guestName || !guestEmail) return setError(labels.requiredFields);
      setLoading(true);
      try {
        const q = query(
          collection(db, "firings"),
          where("userCode", "==", finalCode),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLoading(false);
          return setError(labels.codeTaken);
        }
      } catch (err) {
        setLoading(false);
        return setError("Database error. Please try again.");
      }
    }

    const finalEmail =
      currentUser?.email ||
      (existingObjects.length > 0 ? existingObjects[0].email : guestEmail);

    // Fix for "Guest" issue. Use userData if available, else currentUser, else previous, else "Guest"
    const finalName =
      (userData?.firstName
        ? `${userData.firstName} ${userData.lastName || ""}`.trim()
        : currentUser?.displayName) ||
      (existingObjects.length > 0 ? existingObjects[0].name : guestName) ||
      "Guest";

    setLoading(true);
    try {
      // 1. Generate the cropped and compressed Blob
      const croppedBlob = await getCroppedImg(
        imagePreview,
        croppedAreaPixels,
        0.7,
      );

      // 2. Upload the compressed Blob
      const storageRef = ref(storage, `firings/${Date.now()}.jpg`);
      await uploadBytes(storageRef, croppedBlob);
      const imageUrl = await getDownloadURL(storageRef);

      // 3. Register entry in database
      const registerFn = httpsCallable(getFunctions(), "registerFiringObject");
      await registerFn({
        email: finalEmail.toLowerCase(),
        name: finalName,
        userCode: finalCode,
        stage: "bisque",
        imageUrl,
        currentLang,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setClaimingPiece(null);
    setSuccess(false);
    setImagePreview(null);
    setImageFile(null);
    setZoom(1);
    setError("");
  };

  const getStatusBadge = (obj) => {
    let key = "status_bisque_pending";
    let icon = <Clock size={12} />;
    let color = "#9960a8";

    if (obj.status === "broken") {
      key = "status_broken";
      icon = <AlertCircle size={12} />;
      color = "#9960a8";
    } else if (obj.status === "done") {
      key = "status_done";
      icon = <CheckCircle size={12} />;
      color = "#1c0700";
    } else if (obj.status === "abandoned") {
      key = "status_abandoned";
      icon = <AlertCircle size={12} />;
      color = "#9960a8";
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

  const RegisterNewCard = () => (
    <div
      onClick={() => setStep("form")}
      style={{
        ...sectionStyle,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.6 : 1,
        display: "flex",
        alignItems: "center",
        gap: "15px",
      }}
    >
      <PlusCircle size={24} color="#4e5f28" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, textAlign: "left" }}>
        <h3
          style={{
            margin: 0,
            fontWeight: isMobile ? "600" : "700",
            fontSize: "1rem",
            color: "#1c0700",
          }}
        >
          {labels.registerDirectly}
        </h3>
        <p
          style={{
            margin: "2px 0 0 0",
            fontSize: "0.75rem",
            opacity: 0.6,
            fontWeight: "400",
          }}
        >
          {labels.registerDirectlyDesc}
        </p>
      </div>
      <ArrowRight size={18} opacity={0.3} style={{ flexShrink: 0 }} />
    </div>
  );

  const renderDivider = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        margin: "2rem 0",
        color: "rgba(28,7,0,0.25)",
      }}
    >
      <div
        style={{ flex: 1, height: "1px", backgroundColor: "rgba(28,7,0,0.1)" }}
      />
      <span
        style={{
          padding: "0 15px",
          fontSize: "0.75rem",
          fontWeight: "900",
          letterSpacing: "1.5px",
        }}
      >
        {labels.or}
      </span>
      <div
        style={{ flex: 1, height: "1px", backgroundColor: "rgba(28,7,0,0.1)" }}
      />
    </div>
  );

  if (success) {
    return (
      <div style={cardStyle}>
        <CheckCircle
          size={isMobile ? 50 : 70}
          color="#4e5f28"
          style={{ marginBottom: "1.5rem" }}
        />
        <h2 style={{ ...titleStyle, fontSize: isMobile ? "2.2rem" : "3.2rem" }}>
          {labels.successTitle}
        </h2>
        <p
          style={{
            opacity: 0.7,
            lineHeight: 1.6,
            marginBottom: "2.5rem",
            fontSize: isMobile ? "0.95rem" : "1.1rem",
          }}
        >
          {labels.successText}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={() => {
              setSuccess(false);
              setStep("email");
              fetchPieces(userCode);
              fetchAbandoned();
            }}
            style={{
              ...primaryBtnStyle,
              backgroundColor: "#caaff3",
              color: "#1c0700",
            }}
          >
            <Home size={18} /> {labels.goHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          opacity: loading && currentUser && step === "email" ? 0.5 : 1,
        }}
      >
        {loading && currentUser && step === "email" && (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <Loader2
              className="spinner"
              size={40}
              color="#caaff3"
              style={{ marginBottom: "1rem" }}
            />
            <p style={{ fontWeight: "600", opacity: 0.6 }}>
              {labels.searching}
            </p>
          </div>
        )}

        {/* STEP 1: LOOKUP GUEST VIEW */}
        {step === "email" && (!currentUser || !loading) && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {!currentUser && (
              <>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{labels.lookupStep}</label>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.5,
                      marginBottom: "1.2rem",
                      fontWeight: "400",
                    }}
                  >
                    {labels.lookupDesc}
                  </p>
                  <form
                    onSubmit={handleLookup}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="text"
                      maxLength="4"
                      placeholder={labels.codePlaceholder}
                      value={userCode}
                      onChange={(e) =>
                        setUserCode(e.target.value.toUpperCase())
                      }
                      required
                      style={{ ...inputStyle, textTransform: "uppercase" }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        ...primaryBtnStyle,
                        padding: "14px",
                        borderRadius: "14px",
                      }}
                    >
                      {loading ? (
                        <Loader2 className="spinner" size={18} />
                      ) : (
                        <Search size={18} />
                      )}
                      {loading ? labels.processing : labels.findExisting}
                    </button>
                  </form>
                </div>
                {renderDivider()}
              </>
            )}

            {/* INJECTING CARD STYLING FOR LOGGED IN USERS WHO HAVE NO PIECES YET */}
            <div style={currentUser ? cardContainer : {}}>
              {currentUser && (
                <h2 style={cardTitleStyle}>
                  <Flame size={22} color="#9960a8" /> {labels.cardTitle}
                </h2>
              )}
              <RegisterNewCard />
            </div>
          </div>
        )}

        {/* STEP 2: PIECES LIST / TABS */}
        {step === "selection" && (
          <div style={cardContainer}>
            <h2 style={cardTitleStyle}>
              <Flame size={22} color="#9960a8" /> {labels.cardTitle}
            </h2>

            {!currentUser && (
              <button
                type="button"
                onClick={() => setStep("email")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1c0700",
                  opacity: 0.5,
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >
                <ArrowLeft size={16} /> {labels.back}
              </button>
            )}

            <div style={tabNavContainer} className="hide-scrollbar">
              {["active", "ready", "done"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...tabBtnStyle,
                    backgroundColor:
                      activeTab === tab ? "#caaff3" : "transparent",
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
              className="custom-scrollbar"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "1.5rem",
                maxHeight: activeItems.length > 3 ? "330px" : "auto",
                overflowY: activeItems.length > 3 ? "auto" : "visible",
                paddingRight: activeItems.length > 3 ? "10px" : "0",
              }}
            >
              {!userCode ? (
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      opacity: 0.5,
                      fontStyle: "italic",
                    }}
                  >
                    Please return to search and enter your code.
                  </p>
                </div>
              ) : activeItems.length > 0 ? (
                activeItems.map((obj) => (
                  <div
                    key={obj.id}
                    style={{
                      ...objectCardStyle,
                      opacity:
                        obj.status === "done" || obj.status === "broken"
                          ? 0.6
                          : 1,
                    }}
                  >
                    <div style={imageWrapper}>
                      <img
                        src={obj.imageUrl}
                        style={thumbStyle}
                        alt="pottery"
                      />
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
                            <User size={12} />{" "}
                            {currentUser?.displayName || obj.email}
                          </div>
                        )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    ...objectCardStyle,
                    justifyContent: "center",
                    padding: "2rem",
                    borderStyle: "dashed",
                    borderColor: "rgba(28, 7, 0, 0.1)",
                    cursor: "default",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                      textAlign: "center",
                      opacity: 0.6,
                    }}
                  >
                    {labels.emptyTab}
                  </p>
                </div>
              )}
            </div>

            <div
              onClick={() => setStep("form")}
              style={{
                ...registerTriggerStyle,
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <PlusCircle size={24} color="#4e5f28" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "#1c0700",
                  }}
                >
                  {labels.registerNew}
                </h3>
                <p
                  style={{
                    margin: "2px 0 0 0",
                    fontSize: "0.75rem",
                    opacity: 0.6,
                  }}
                >
                  {labels.registerDesc}
                </p>
              </div>
              <ArrowRight size={18} opacity={0.3} style={{ flexShrink: 0 }} />
            </div>
          </div>
        )}

        {/* SEPARATE ADOPT SECTION (Always visible below the main content when looking at pieces or form) */}
        {step !== "email" && abandonedObjects.length > 0 && (
          <div style={{ ...cardContainer, marginTop: "2rem" }}>
            <h3
              style={{
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.5rem",
                color: "#1c0700",
                marginBottom: "0.5rem",
              }}
            >
              <Flame size={18} color="#caaff3" style={{ marginRight: "8px" }} />{" "}
              {labels.adoptTitle}
            </h3>
            <p
              style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: "1rem" }}
            >
              {labels.adoptDesc}
            </p>

            <div
              className="custom-scrollbar"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: abandonedObjects.length > 3 ? "330px" : "auto",
                overflowY: abandonedObjects.length > 3 ? "auto" : "visible",
                paddingRight: abandonedObjects.length > 3 ? "10px" : "0",
              }}
            >
              {abandonedObjects.map((obj) => (
                <div key={obj.id} style={{ ...objectCardStyle }}>
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
                    <button
                      onClick={() => setClaimingPiece(obj)}
                      disabled={loading}
                      style={actionButtonStyle("#caaff3", "#1c0700")}
                    >
                      {labels.claimAction}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGISTRATION MODAL (The Form) */}
        {step === "form" && (
          <form
            onSubmit={handleNewRegistration}
            style={{ ...cardContainer, marginTop: "1.5rem" }}
          >
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
                type="button"
                onClick={() => setStep("selection")}
                style={closeBtn}
                disabled={loading}
              >
                <XCircle size={24} />
              </button>
            </div>

            {!currentUser && existingObjects.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "1.5rem",
                }}
              >
                <input
                  type="text"
                  maxLength="4"
                  placeholder={labels.codePlaceholder}
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  required
                  style={{ ...inputStyle, textTransform: "uppercase" }}
                />
                <input
                  type="text"
                  placeholder={labels.namePlaceholder}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  style={inputStyle}
                />
                <input
                  type="email"
                  placeholder={labels.emailPlaceholder}
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value.toLowerCase())}
                  required
                  style={inputStyle}
                />
              </div>
            )}

            <div style={photoBox}>
              <label style={labelStyle}>
                {imagePreview ? labels.dragToCrop : labels.takePhoto}
              </label>

              {imagePreview ? (
                <div
                  style={{
                    position: "relative",
                    borderRadius: "16px",
                    overflow: "hidden",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    backgroundColor: "#1c0700",
                  }}
                >
                  <Cropper
                    image={imagePreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    style={{
                      containerStyle: { width: "100%", height: "100%" },
                    }}
                  />
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setZoom(1);
                      }}
                      style={{ ...removeImgStyle, zIndex: 10 }}
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current.click()}
                  style={cameraBoxStyle}
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
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImagePreview(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !imagePreview}
              style={{
                ...submitBtn,
                opacity: loading || !imagePreview ? 0.8 : 1,
              }}
            >
              {loading ? (
                <Loader2 className="spinner" size={20} />
              ) : (
                <UploadCloud size={20} />
              )}
              {loading ? labels.processing : labels.submit}
            </button>
          </form>
        )}

        {/* CLAIM MODAL */}
        {claimingPiece && (
          <div style={modalOverlay} onClick={() => !loading && resetModal()}>
            <div style={modalContent} onClick={(e) => e.stopPropagation()}>
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
                  {labels.claimTitle}
                </h3>
                <button
                  onClick={resetModal}
                  style={closeBtn}
                  disabled={loading}
                >
                  <XCircle />
                </button>
              </div>

              <form onSubmit={handleClaim}>
                <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>
                  {labels.claimDesc}
                </p>

                {!currentUser && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <input
                      type="text"
                      maxLength="4"
                      placeholder={labels.codePlaceholder}
                      value={claimCode}
                      onChange={(e) =>
                        setClaimCode(e.target.value.toUpperCase())
                      }
                      required
                      style={{ ...inputStyle, textTransform: "uppercase" }}
                    />
                    <input
                      type="text"
                      placeholder={labels.namePlaceholder}
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                )}
                {currentUser && (
                  <p
                    style={{
                      fontWeight: "bold",
                      marginBottom: "1.5rem",
                      color: "#4e5f28",
                    }}
                  >
                    {labels.claimConfirm}
                  </p>
                )}

                <button type="submit" disabled={loading} style={submitBtn}>
                  {loading ? (
                    <Loader2 className="spinner" size={20} />
                  ) : (
                    <CheckCircle size={20} />
                  )}
                  {loading ? labels.processing : labels.submit}
                </button>
              </form>
            </div>
          </div>
        )}

        {error && (
          <p
            style={{
              color: "#9960a8",
              textAlign: "center",
              marginTop: "1rem",
              fontWeight: "600",
            }}
          >
            {error}
          </p>
        )}
      </div>

      <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(28, 7, 0, 0.03); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(202, 175, 243, 0.8); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9960a8; }`}</style>
    </div>
  );
}

// --- STYLES ---
const containerStyle = {}; // REMOVED FULL PAGE WRAPPER STYLES
const titleStyle = {
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "2.8rem",
  margin: "0 0 1.5rem 0",
  lineHeight: 1,
  textAlign: "center",
  fontWeight: "normal",
};
const labelStyle = {
  display: "block",
  fontWeight: "600",
  marginBottom: "0.5rem",
  fontSize: "0.95rem",
};
const sectionStyle = {
  backgroundColor: "#fdf8e1",
  padding: "1.2rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.06)",
  marginBottom: "0.5rem",
};
const cardStyle = {
  textAlign: "center",
  backgroundColor: "#fdf8e1",
  padding: "2.5rem 1.5rem",
  borderRadius: "32px",
  border: "1px solid rgba(28,7,0,0.1)",
  maxWidth: "500px",
  margin: "0 auto",
};
const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid rgba(28, 7, 0, 0.1)",
  backgroundColor: "#fffce3",
  fontSize: "1rem",
  boxSizing: "border-box",
  color: "#1c0700",
};
const primaryBtnStyle = {
  width: "100%",
  padding: "16px",
  backgroundColor: "#9960a8",
  color: "#fdf8e1",
  border: "none",
  borderRadius: "100px",
  fontSize: "1rem",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.2s ease",
};
const secondaryBtnStyle = {
  width: "100%",
  padding: "12px",
  background: "none",
  border: "1px solid rgba(153,96,168,0.2)",
  color: "#9960a8",
  borderRadius: "100px",
  marginTop: "1rem",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.85rem",
};
const objectCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px",
  backgroundColor: "#fffce3",
  borderRadius: "14px",
  border: "1px solid rgba(202,175,243,0.2)",
  cursor: "pointer",
  transition: "all 0.2s ease",
  flexShrink: 0,
};
const cameraBoxStyle = {
  width: "100%",
  aspectRatio: "1 / 1",
  border: "2px dashed #caaff3",
  borderRadius: "16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  color: "#9960a8",
  fontWeight: "600",
  backgroundColor: "rgba(202,175,243,0.03)",
  cursor: "pointer",
};
const removeImgStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "rgba(0,0,0,0.5)",
  color: "#fffce3",
  border: "none",
  borderRadius: "50%",
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
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
const previewImg = {
  width: "100%",
  aspectRatio: "1/1",
  borderRadius: "20px",
  objectFit: "cover",
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
const registerTriggerStyle = {
  backgroundColor: "rgba(28,7,0,0.03)",
  padding: "1.2rem",
  borderRadius: "18px",
  border: "1px dashed rgba(28,7,0,0.1)",
  cursor: "pointer",
};
