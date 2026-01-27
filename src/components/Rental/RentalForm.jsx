import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function RentalForm({ lang }) {
  // Added 'phone' to the initial state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
  });
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const q = query(
      collection(db, "rental_availability"),
      where("status", "==", "available"),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setAvailabilities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const changeMonth = (off) =>
    setCurrentMonth(
      new Date(currentMonth.setMonth(currentMonth.getMonth() + off)),
    );

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selected = availabilities.find((a) => a.date === formData.date);
    if (!selected) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "rent_requests"), {
        ...formData,
        availabilityId: selected.id,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "rental_availability", selected.id), {
        status: "pending",
      });

      // Reset form including phone
      setFormData({ name: "", email: "", phone: "", date: "" });
      alert(lang === "en" ? "Request sent!" : "Anfrage gesendet!");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const styles = {
    container: {
      width: "100%",
      maxWidth: "320px",
      display: "flex",
      flexDirection: "column",
      gap: "25px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "15px",
      fontSize: "0.7rem",
      fontWeight: "700",
      letterSpacing: "0.1em",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: "2px",
    },
    dayLabel: {
      fontSize: "0.55rem",
      opacity: 0.4,
      fontWeight: "800",
      marginBottom: "5px",
    },
    cell: (isAvail, isSel) => ({
      aspectRatio: "1/1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.75rem",
      borderRadius: "50%",
      cursor: isAvail ? "pointer" : "default",
      background: isSel
        ? "#caaff3"
        : isAvail
          ? "rgba(202, 175, 243, 0.1)"
          : "transparent",
      color: isAvail ? "#1c0700" : "rgba(28, 7, 0, 0.2)",
      fontWeight: isAvail ? "700" : "400",
      transition: "all 0.2s ease",
    }),
    input: {
      background: "transparent",
      border: "none",
      borderBottom: "1px solid rgba(28, 7, 0, 0.1)",
      padding: "10px 0",
      fontSize: "0.85rem",
      textAlign: "center",
      outline: "none",
      width: "100%",
    },
    submit: {
      background: "#caaff3", // Your requested background color
      color: "#1c0700", // Your requested text color
      border: "none", // Removed border for a cleaner look with the solid color
      borderRadius: "100px",
      padding: "10px 24px", // Vertical and Horizontal padding
      fontSize: "0.7rem",
      fontWeight: "400",
      cursor: "pointer",
      alignSelf: "center", // Prevents the button from stretching to full width
      width: "auto", // Ensures it only takes up needed space + padding
    },
  };

  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();
  const days = [];
  for (let i = 0; i < firstDay(year, month); i++)
    days.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const avail = availabilities.find((a) => a.date === dStr);
    days.push(
      <div
        key={d}
        style={styles.cell(!!avail, formData.date === dStr)}
        onClick={() => avail && setFormData({ ...formData, date: dStr })}
      >
        {d}
      </div>,
    );
  }

  return (
    <div style={styles.container}>
      <div>
        <div style={styles.header}>
          <ChevronLeft
            size={14}
            onClick={() => changeMonth(-1)}
            style={{ cursor: "pointer" }}
          />
          <span>
            {currentMonth.toLocaleDateString(
              lang === "en" ? "en-US" : "de-DE",
              { month: "long", year: "numeric" },
            )}
          </span>
          <ChevronRight
            size={14}
            onClick={() => changeMonth(1)}
            style={{ cursor: "pointer" }}
          />
        </div>
        <div style={styles.grid}>
          {["S", "M", "T", "W", "T", "F", "S"].map((l) => (
            <div key={l} style={styles.dayLabel}>
              {l}
            </div>
          ))}
          {days}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <input
          style={styles.input}
          placeholder={lang === "en" ? "Name" : "Name"}
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          style={styles.input}
          type="email"
          placeholder={lang === "en" ? "E-mail" : "E-Mail"}
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          style={styles.input}
          type="tel"
          placeholder={lang === "en" ? "Phone Number" : "Telefonnummer"}
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />

        {/* The updated button */}
        <button
          type="submit"
          disabled={!formData.date || loading}
          style={{
            ...styles.submit,
            opacity: formData.date ? 1 : 0.4,
            marginTop: "10px",
          }}
        >
          {loading ? "..." : lang === "en" ? "Request Space" : "Anfrage senden"}
        </button>
      </form>
    </div>
  );
}
