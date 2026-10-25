import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import kulturlegiLogo from "../../assets/kulturlegi/kulturlegi.png";
import { UploadCloud, CheckCircle, Loader2, Camera, Check } from "lucide-react";

export default function KulturlegiUpload({ currentLang }) {
  const { currentUser, userData } = useAuth();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (userData?.kulturlegi) return null;

  const compressImage = (imageFile) => {
    return new Promise((resolve) => {
      if (!imageFile.type.startsWith("image/")) {
        return resolve(imageFile);
      }
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxWidth = 1200;
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((maxWidth / width) * height);
            width = maxWidth;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(blob || imageFile),
            "image/jpeg",
            0.75,
          );
        };
        img.onerror = () => resolve(imageFile);
      };
      reader.onerror = () => resolve(imageFile);
    });
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;
    setIsUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(
        storage,
        `kulturlegi/${currentUser.uid}_${file.name}`,
      );

      // 1. Compress image client-side to ~150KB for near-instant upload
      const fileToUpload = await compressImage(file);
      await uploadBytes(storageRef, fileToUpload);
      const url = await getDownloadURL(storageRef);

      const functions = getFunctions();
      const sendEmail = httpsCallable(functions, "sendEmailNotification");
      const baseUrl = window.location.origin;

      // 2. Run database entry and email trigger concurrently
      await Promise.all([
        addDoc(collection(db, "kulturlegi_requests"), {
          userId: currentUser.uid,
          email: currentUser.email,
          name: `${userData?.firstName || ""} ${userData?.lastName || ""}`,
          proofUrl: url,
          createdAt: new Date().toISOString(),
        }),
        sendEmail({
          to: "salut@sinneskueche.ch",
          subject: "New Kulturlegi Proof Uploaded",
          text: `User ${userData?.firstName} ${userData?.lastName} (${currentUser.email}) uploaded a Kulturlegi proof.\n\nView the proof here: ${url}\n\nGo to Admin Profiles to activate the discount: ${baseUrl}/admin-sinneskueche?tab=profiles`,
        }),
      ]);

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert(currentLang === "en" ? "Upload failed." : "Upload fehlgeschlagen.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spinKultur {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .kultur-spinner {
          animation: spinKultur 1s linear infinite;
        }
        .kulturlegi-choose-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kulturlegi-choose-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(153, 96, 168, 0.2);
          background-color: #ffffff !important;
        }
        .kulturlegi-choose-btn:active {
          transform: translateY(0);
        }
        .kulturlegi-submit-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kulturlegi-submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          background-color: #854f94 !important;
          box-shadow: 0 6px 18px rgba(153, 96, 168, 0.35);
        }
        .kulturlegi-submit-btn:not(:disabled):active {
          transform: translateY(0);
        }
      `}</style>

      {/* Divider separating this from the accordion above */}
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "rgba(28, 7, 0, 0.1)",
          marginTop: isMobile ? "2rem" : "4rem",
          marginBottom: isMobile ? "2rem" : "3rem",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : "100vw",
          margin: "0 auto",
          boxSizing: "border-box",
          marginBottom: isMobile ? "0.5rem" : "1rem",
          padding: isMobile ? "1.5rem" : "2rem 2.5rem",
          backgroundColor: "rgba(202, 175, 243, 0.05)",
          borderRadius: "20px",
          border: "1px dashed rgba(202, 175, 243, 0.6)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          gap: isMobile ? "1.5rem" : "2.5rem",
        }}
      >
        {/* Logo Section */}
        <div style={{ flexShrink: 0 }}>
          <img
            src={kulturlegiLogo}
            alt="Kulturlegi"
            style={{ height: isMobile ? "45px" : "55px", objectFit: "contain" }}
          />
        </div>

        {/* Content Section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          <h4 style={{ margin: 0, color: "#1c0700", fontSize: "1.2rem" }}>
            {currentLang === "en"
              ? "We proudly support Kulturlegi"
              : "Wir unterstützen die Kulturlegi"}
          </h4>

          {!currentUser ? (
            <p
              style={{
                fontSize: "0.9rem",
                opacity: 0.8,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {currentLang === "en"
                ? "Please log in or register below to upload your card and unlock the discount."
                : "Bitte logge dich unten ein oder registriere dich, um deine Karte hochzuladen."}
            </p>
          ) : success ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isMobile ? "center" : "flex-start",
                gap: "8px",
                color: "#4e5f28",
                fontWeight: "bold",
                fontSize: "0.95rem",
                marginTop: "4px",
              }}
            >
              <CheckCircle size={20} />
              {currentLang === "en"
                ? "Thank you! We'll review and activate your discount shortly."
                : "Danke! Wir prüfen das und aktivieren deinen Rabatt in Kürze."}
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: "0.9rem",
                  opacity: 0.8,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {currentLang === "en"
                  ? "Upload a quick picture of your card so we can verify it and unlock a 30% discount for your profile."
                  : "Lade kurz ein Foto deiner Karte hoch, damit wir sie verifizieren und 30% Rabatt für dein Profil freischalten können."}
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.6,
                  margin: "-4px 0 0 0",
                  fontStyle: "italic",
                }}
              >
                {currentLang === "en"
                  ? "To protect your privacy, your photo will be permanently deleted immediately after verification."
                  : "Zum Schutz deiner Daten wird das Bild nach der Überprüfung direkt gelöscht."}
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: "center",
                  justifyContent: isMobile ? "center" : "flex-start",
                  gap: "12px",
                  marginTop: "8px",
                }}
              >
                {/* Dynamic File Button */}
                <label
                  className="kulturlegi-choose-btn"
                  style={{
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px 20px",
                    backgroundColor: file ? "rgba(78, 95, 40, 0.1)" : "#fffce3",
                    color: file ? "#4e5f28" : "#9960a8",
                    borderRadius: "100px",
                    border: file
                      ? "1px solid rgba(78, 95, 40, 0.3)"
                      : "1px solid rgba(153, 96, 168, 0.3)",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    width: isMobile ? "100%" : "auto",
                    boxSizing: "border-box",
                  }}
                >
                  {file ? <Check size={18} /> : <Camera size={18} />}
                  <span
                    style={{
                      maxWidth: "150px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {file
                      ? file.name
                      : currentLang === "en"
                        ? "Choose Image"
                        : "Bild auswählen"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </label>

                {/* Submit Button */}
                {file && (
                  <button
                    className="kulturlegi-submit-btn"
                    onClick={handleUpload}
                    disabled={isUploading}
                    style={{
                      padding: isMobile ? "12px 16px" : "12px 24px",
                      backgroundColor: isUploading
                        ? "rgba(153, 96, 168, 0.7)"
                        : "#9960a8",
                      color: "#fffce3",
                      border: "none",
                      borderRadius: "100px",
                      cursor: isUploading ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      width: isMobile ? "100%" : "auto",
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="kultur-spinner" />
                    ) : (
                      <UploadCloud size={18} />
                    )}
                    {currentLang === "en"
                      ? "Submit for Verification"
                      : "Zur Prüfung einreichen"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
