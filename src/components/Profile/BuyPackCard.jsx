import React, { useState, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ShoppingBag, Loader2, User, PlusCircle, XCircle } from "lucide-react";

export default function BuyPackCard({ packCourses, currentLang, t, userData }) {
  const [selectedCoursePack, setSelectedCoursePack] = useState("");
  const [cart, setCart] = useState([]);
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

  const handleAddToCart = () => {
    if (!selectedCoursePack) return;
    const [courseId, packSize] = selectedCoursePack.split("|");
    const course = packCourses.find((c) => c.id === courseId);
    const packIdx = course?.packs?.findIndex(
      (p) => String(p.size) === String(packSize),
    );
    const pack = course?.packs?.[packIdx];
    const targetProfile = allProfiles.find((p) => p.id === selectedProfileId);

    if (course && pack) {
      setCart((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          course,
          pack,
          packIdx,
          profileId: selectedProfileId,
          profileName: targetProfile?.name || "Unknown",
          isGift: selectedProfileId === "gift",
          recipientName: giftRecipient,
        },
      ]);
      setGiftRecipient("");
    }
  };

  const handleRemoveFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + parseFloat(item.pack.price),
    0,
  );

  const handleBuy = async () => {
    if (cart.length === 0) return;
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

      let giftCodes = [];
      let giftNames = [];

      const modifiedSize = cart.map((item) => {
        if (item.isGift) {
          const code = Math.random()
            .toString(36)
            .substring(2, 10)
            .toUpperCase();
          giftCodes.push(code);
          giftNames.push(
            encodeURIComponent(
              item.recipientName ||
                (currentLang === "en" ? "Someone" : "Jemanden"),
            ),
          );
          return {
            link: `/${item.course.id}`,
            packIdx: item.packIdx,
            profileId: "guest", // Webhook handles guest assignment if it's a gift code
            isGift: true,
            giftCode: code,
            recipientName:
              item.recipientName ||
              (currentLang === "en" ? "Someone" : "Jemanden"),
          };
        }
        return {
          link: `/${item.course.id}`,
          packIdx: item.packIdx,
          profileId: item.profileId,
          isGift: false,
          recipientName: "",
        };
      });

      const packSummary = cart
        .map((item) => {
          const cName =
            item.course[`name${currentLang === "en" ? "En" : "De"}`] ||
            item.course.courseName;
          let suffix = "";
          if (item.isGift) {
            suffix = ` [GIFT for ${item.recipientName || (currentLang === "en" ? "Someone" : "Jemanden")}]`;
          } else if (item.profileId !== "main" && item.profileId !== "guest") {
            suffix = ` [SUB-PROFILE]`;
          }
          return `${item.pack.size} Session Pack (${cName})${suffix}`;
        })
        .join(" + ");

      const result = await createCheckout({
        mode: "pack",
        packPrice: totalPrice,
        packSize: JSON.stringify(modifiedSize),
        packSummary: packSummary,
        coursePath: `/${cart[0].course.id}`,
        selectedDates: [],
        currentLang: currentLang,
        profileId: "main",
        profileName: userData?.firstName || "Main User",
        successUrl: `${getBaseUrl()}#/success?session_id={CHECKOUT_SESSION_ID}&mode=pack&booked=false${giftCodes.length > 0 ? `&giftCodes=${giftCodes.join(",")}&giftNames=${giftNames.join(",")}` : ""}`,
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
          value={selectedCoursePack}
          onChange={(e) => setSelectedCoursePack(e.target.value)}
          style={styles.select}
        >
          <option value="">{t.selectCourse || "Select a course"}</option>
          {Object.entries(groupedPacks).map(([courseName, courses]) => (
            <optgroup key={courseName} label={courseName}>
              {courses.map((courseDoc) =>
                (courseDoc.packs || []).map((p, idx) => {
                  const dynamicCourseName =
                    courseDoc[`name${currentLang === "en" ? "En" : "De"}`] ||
                    courseName;
                  return (
                    <option
                      key={`${courseDoc.id}-${p.size}-${idx}`}
                      value={`${courseDoc.id}|${p.size}`}
                    >
                      {p.size} {currentLang === "de" ? "Paket" : "Pack"} ·{" "}
                      {dynamicCourseName} · {p.price} CHF
                    </option>
                  );
                }),
              )}
            </optgroup>
          ))}
        </select>
        <button
          onClick={handleAddToCart}
          disabled={
            !selectedCoursePack ||
            (selectedProfileId === "gift" && !giftRecipient.trim())
          }
          style={{
            ...styles.addBtn,
            opacity:
              !selectedCoursePack ||
              (selectedProfileId === "gift" && !giftRecipient.trim())
                ? 0.5
                : 1,
          }}
        >
          <PlusCircle size={20} />
          {currentLang === "en" ? "Add" : "Hinzufügen"}
        </button>
      </div>

      {/* CART SECTION */}
      {cart.length > 0 && (
        <div style={styles.cartContainer}>
          <h4 style={styles.cartTitle}>
            {currentLang === "en" ? "Selected Packs" : "Ausgewählte Pakete"}
          </h4>
          <div style={styles.cartList}>
            {cart.map((item) => {
              const cName =
                item.course[`name${currentLang === "en" ? "En" : "De"}`] ||
                item.course.courseName;
              return (
                <div key={item.id} style={styles.cartItem}>
                  <div style={styles.cartItemTop}>
                    <span style={styles.cartItemName}>
                      {item.pack.size} Session Pack - {cName}
                    </span>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      style={styles.removeBtn}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                  <div style={styles.cartItemDetails}>
                    <span>
                      {currentLang === "en" ? "For:" : "Für:"}{" "}
                      {item.isGift
                        ? `${currentLang === "en" ? "Gift" : "Geschenk"} (${item.recipientName})`
                        : item.profileName}
                    </span>
                    <span>{item.pack.price} CHF</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={styles.totalRow}>
            <span>Total:</span>
            <span>{totalPrice} CHF</span>
          </div>
          <button
            onClick={handleBuy}
            disabled={isProcessing}
            style={{
              ...styles.buyBtn,
              opacity: isProcessing ? 0.7 : 1,
              marginTop: "1rem",
              width: "100%",
            }}
          >
            {isProcessing ? (
              <Loader2 className="spinner" size={18} />
            ) : (
              `${currentLang === "en" ? "Checkout" : "Kaufen"} (${totalPrice} CHF)`
            )}
          </button>
        </div>
      )}
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  addBtn: {
    padding: "12px 20px",
    borderRadius: "12px",
    border: "1px solid rgba(153, 96, 168, 0.3)",
    background: "rgba(202, 175, 243, 0.15)",
    color: "#9960a8",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "opacity 0.2s",
  },
  cartContainer: {
    marginTop: "1.5rem",
    borderTop: "1px dashed rgba(28,7,0,0.1)",
    paddingTop: "1.5rem",
  },
  cartTitle: {
    fontSize: "0.85rem",
    fontWeight: "900",
    color: "#9960a8",
    textTransform: "uppercase",
    marginBottom: "1rem",
    marginTop: 0,
    opacity: 0.8,
  },
  cartList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cartItem: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(202, 175, 243, 0.08)",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(202, 175, 243, 0.2)",
    gap: "6px",
  },
  cartItemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartItemName: {
    fontSize: "0.9rem",
    fontWeight: "800",
    color: "#1c0700",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#1c0700",
    opacity: 0.4,
    cursor: "pointer",
    padding: 0,
  },
  cartItemDetails: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    opacity: 0.8,
    fontWeight: "600",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "1rem",
    fontSize: "1.1rem",
    fontWeight: "900",
    color: "#4e5f28",
  },
};
