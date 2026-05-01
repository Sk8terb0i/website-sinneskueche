import React, { useState, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ShoppingBag, Loader2, User } from "lucide-react";

export default function BuyPackCard({ packCourses, currentLang, t, userData }) {
  const [selectedPackData, setSelectedPackData] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState("main");
  const [giftRecipient, setGiftRecipient] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Build the array of available profiles
  const allProfiles = useMemo(() => {
    const profiles = [
      { id: "main", name: currentLang === "de" ? "Mich" : "Me" },
    ];
    // Add Gift Option
    profiles.push({
      id: "gift",
      name: currentLang === "en" ? "Buy as a Gift" : "Als Geschenk kaufen",
      isGift: true,
    });
    if (userData?.linkedProfiles) {
      userData.linkedProfiles.forEach((p) => {
        profiles.push({ id: p.id, name: `${p.firstName} ${p.lastName}` });
      });
    }
    return profiles;
  }, [userData, currentLang]);

  // Group packs by course name
  const groupedPacks = useMemo(() => {
    return packCourses.reduce((acc, pack) => {
      const name = pack.courseName || "Other";
      if (!acc[name]) acc[name] = [];
      acc[name].push(pack);
      return acc;
    }, {});
  }, [packCourses]);

  const handleBuy = async () => {
    if (!selectedPackData) return;
    const { course, pack } = selectedPackData;
    const targetProfile = allProfiles.find((p) => p.id === selectedProfileId);

    setIsProcessing(true);
    const functions = getFunctions();
    const createCheckout = httpsCallable(functions, "createStripeCheckout");

    try {
      const getBaseUrl = () => {
        const origin = window.location.origin;
        if (origin.includes("github.io")) {
          return `${origin}/website-sinneskueche/`;
        }
        const path = window.location.pathname;
        return `${origin}${path}${path.endsWith("/") ? "" : "/"}`;
      };

      const isGift = selectedProfileId === "gift";
      const giftCode = isGift
        ? Math.random().toString(36).substring(2, 10).toUpperCase()
        : null;

      const result = await createCheckout({
        mode: "pack",
        packPrice: parseFloat(pack.price),
        packSize: isGift
          ? JSON.stringify([
              {
                link: `/${course.id}`,
                packIdx: course.packs.findIndex((p) => p.size === pack.size),
                isGift: true,
                giftCode: giftCode,
                recipientName: giftRecipient,
              },
            ])
          : parseInt(pack.size),
        coursePath: `/${course.id}`,
        selectedDates: [],
        currentLang: currentLang,
        profileId: selectedProfileId,
        profileName: isGift
          ? `GIFT: ${giftRecipient}`
          : targetProfile?.name || "Main User",
        successUrl: `${getBaseUrl()}#/success?session_id={CHECKOUT_SESSION_ID}&mode=pack&booked=false${isGift ? `&giftCodes=${giftCode}&giftNames=${encodeURIComponent(giftRecipient)}` : ""}`,
        cancelUrl: window.location.href,
      });

      if (result.data?.url) window.location.assign(result.data.url);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert("Checkout failed. Please try again.");
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>
        <ShoppingBag size={20} /> {t.buyPack}
      </h3>

      {/* Profile Selector */}
      {allProfiles.length > 1 && (
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <User size={16} color="#9960a8" />
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            style={{
              ...styles.select,
              padding: "8px 12px",
              flex: "none",
              width: "auto",
            }}
          >
            {allProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {currentLang === "de" ? "Für: " : "For: "} {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProfileId === "gift" && (
        <input
          type="text"
          placeholder={
            currentLang === "en" ? "Recipient Name" : "Name des Beschenkten"
          }
          value={giftRecipient}
          onChange={(e) => setGiftRecipient(e.target.value)}
          style={{ ...styles.select, marginBottom: "1rem" }}
        />
      )}

      <div style={styles.row}>
        <select
          value={
            selectedPackData
              ? `${selectedPackData.course.id}|${selectedPackData.pack.size}`
              : ""
          }
          onChange={(e) => {
            const val = e.target.value;
            if (!val) {
              setSelectedPackData(null);
              return;
            }
            const [courseId, packSize] = val.split("|");
            const course = packCourses.find((c) => c.id === courseId);
            const pack = course?.packs?.find(
              (p) => String(p.size) === String(packSize),
            );
            setSelectedPackData(course && pack ? { course, pack } : null);
          }}
          style={styles.select}
        >
          <option value="">{t.selectCourse || "Select a course"}</option>
          {Object.entries(groupedPacks).map(([courseName, courses]) => (
            <optgroup key={courseName} label={courseName}>
              {courses.map((courseDoc) =>
                (courseDoc.packs || []).map((p, idx) => (
                  <option
                    key={`${courseDoc.id}-${p.size}-${idx}`}
                    value={`${courseDoc.id}|${p.size}`}
                  >
                    {p.size} {currentLang === "de" ? "Paket" : "Pack"} ·{" "}
                    {p.price} CHF
                  </option>
                )),
              )}
            </optgroup>
          ))}
        </select>
        <button
          onClick={handleBuy}
          disabled={!selectedPackData || isProcessing}
          style={{
            ...styles.buyBtn,
            opacity: !selectedPackData || isProcessing ? 0.7 : 1,
          }}
        >
          {isProcessing ? (
            <Loader2 className="spinner" size={18} />
          ) : (
            t.buyNow || "Buy Now"
          )}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fdf8e1",
    padding: window.innerWidth < 768 ? "1.5rem" : "2rem",
    borderRadius: "24px",
    border: "1px solid rgba(28, 7, 0, 0.08)",
    width: "100%",
    boxSizing: "border-box",
  },
  cardTitle: {
    fontFamily: "Harmond-SemiBoldCondensed",
    fontSize: "1.8rem",
    marginTop: 0,
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textTransform: "lowercase",
  },
  row: {
    display: "flex",
    gap: "12px",
    flexDirection: window.innerWidth < 480 ? "column" : "row",
    width: "100%",
  },
  select: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(28,7,0,0.1)",
    background: "#fffce3",
    fontFamily: "Satoshi",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
  buyBtn: {
    padding: "12px 24px",
    borderRadius: "100px",
    border: "none",
    background: "#9960a8",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    width: window.innerWidth < 480 ? "100%" : "auto",
    transition: "opacity 0.2s",
  },
};
