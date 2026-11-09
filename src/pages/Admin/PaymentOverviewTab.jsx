import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  DollarSign,
  Plus,
  Loader2,
  Link as LinkIcon,
  Trash2,
  Calendar,
  Copy,
  Check,
} from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  inputStyle,
  btnStyle,
  labelStyle,
} from "./AdminStyles";
import { planets } from "../../data/planets";

export default function PaymentOverviewTab({ currentLang }) {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [savedLinks, setSavedLinks] = useState([]);
  const [parentMap, setParentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [courseList, setCourseList] = useState([]);

  // Time Navigation State
  const [viewDate, setViewDate] = useState(new Date());

  // Link Generation State
  const [linkAmount, setLinkAmount] = useState("");
  const [linkCategory, setLinkCategory] = useState("admin");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLink = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const t = {
    en: {
      title: "Payment Overview",
      generateLink: "Generate Payment Link",
      amount: "Amount (CHF)",
      category: "Category",
      paymentTitle: "Payment Title (Visible to customer)",
      description: "Description (Visible to customer)",
      placeholderAmount: "e.g. 50.00",
      placeholderTitle: "e.g. Clay material fees",
      placeholderDesc: "Brief description for the customer...",
      generateBtn: "Generate Link",
      generating: "Generating...",
      activeLinks: "Created Payment Links",
      noLinks: "No active links.",
      monthlyOverview: "Monthly Revenue",
      recentPayments: "Transactions for",
      noPaymentsMonth: "No payments logged for this month.",
      dateLabel: "Date",
      customerLabel: "Customer",
      adminMisc: "Admin / Misc",
      drinks: "Drinks",
      uncategorized: "Uncategorized",
      coursesGroup: "Courses",
      customGroup: "Custom / Misc",
      deleteConfirm: "Remove this link from the list?",
      total: "Total",
    },
    de: {
      title: "Zahlungsübersicht",
      generateLink: "Zahlungslink erstellen",
      amount: "Betrag (CHF)",
      category: "Kategorie",
      paymentTitle: "Zahlungstitel (Sichtbar für Kunden)",
      description: "Beschreibung (Sichtbar für Kunden)",
      placeholderAmount: "z.B. 50.00",
      placeholderTitle: "z.B. Ton-Materialkosten",
      placeholderDesc: "Kurze Beschreibung für den Kunden...",
      generateBtn: "Link erstellen",
      generating: "Wird erstellt...",
      activeLinks: "Erstellte Zahlungslinks",
      noLinks: "Keine aktiven Links.",
      monthlyOverview: "Monatlicher Umsatz",
      recentPayments: "Transaktionen für",
      noPaymentsMonth: "Keine Zahlungen in diesem Monat protokolliert.",
      dateLabel: "Datum",
      customerLabel: "Kunde",
      adminMisc: "Admin / Sonstiges",
      drinks: "Getränke",
      uncategorized: "Nicht kategorisiert",
      coursesGroup: "Kurse",
      customGroup: "Benutzerdefiniert / Sonstiges",
      deleteConfirm: "Diesen Link aus der Liste entfernen?",
      total: "Gesamt",
    },
  }[currentLang || "en"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch available courses for the dropdown and deduplicate by link
        const baseCourses = planets
          .filter((p) => p.type === "courses")
          .flatMap((p) => p.courses || [])
          .filter((c) => c.link);

        const customSnap = await getDocs(collection(db, "custom_courses"));
        const customCourses = customSnap.docs.map((d) => ({
          link: d.data().link,
          text: { en: d.data().nameEn, de: d.data().nameDe },
        }));

        const uniqueCourses = [];
        const seenLinks = new Set();
        [...baseCourses, ...customCourses].forEach((c) => {
          if (!seenLinks.has(c.link)) {
            seenLinks.add(c.link);
            uniqueCourses.push(c);
          }
        });
        setCourseList(uniqueCourses);

        // 2. Fetch Calendar Groups to map sub-courses to parents
        const cgSnap = await getDocs(collection(db, "calendar_groups"));
        const pMap = {};
        cgSnap.docs.forEach((doc) => {
          const parentId = doc.id;
          const links = doc.data().includedLinks || [];
          links.forEach((link) => {
            pMap[link] = parentId;
          });
        });
        setParentMap(pMap);

        // 3. Fetch All Payments
        const paySnap = await getDocs(collection(db, "stripe_payments"));
        const historyList = [];
        paySnap.docs.forEach((doc) => {
          historyList.push({ id: doc.id, ...doc.data() });
        });
        historyList.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA; // Newest first
        });
        setPaymentHistory(historyList);

        // 4. Fetch Saved Links
        const linksSnap = await getDocs(
          query(collection(db, "payment_links"), orderBy("createdAt", "desc")),
        );
        const linksList = [];
        linksSnap.docs.forEach((doc) => {
          linksList.push({ id: doc.id, ...doc.data() });
        });
        setSavedLinks(linksList);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const functions = getFunctions();
      const createLink = httpsCallable(functions, "generateCustomPaymentLink");

      const payload = {
        amount: parseFloat(linkAmount),
        category: linkCategory,
        title: linkTitle || `Payment: ${linkCategory}`,
        description: linkDescription || undefined,
      };

      const res = await createLink(payload);

      // Save link to Firestore
      const newLinkObj = {
        ...payload,
        url: res.data.url,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "payment_links"), newLinkObj);

      // Update UI state
      setSavedLinks([
        { id: docRef.id, ...newLinkObj, createdAt: new Date() },
        ...savedLinks,
      ]);

      // Reset form
      setLinkAmount("");
      setLinkTitle("");
      setLinkDescription("");
    } catch (error) {
      alert("Error generating link: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteLink = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "payment_links", id));
      setSavedLinks(savedLinks.filter((link) => link.id !== id));
    } catch (error) {
      alert("Error deleting link: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(new Date(viewDate.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate(new Date(newYear, viewDate.getMonth(), 1));
  };

  const formatChf = (amount) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  };

  const formatCategoryName = (cat) => {
    if (!cat) return t.uncategorized;
    if (cat === "uncategorized") return t.uncategorized;
    if (cat === "admin") return t.adminMisc;
    if (cat === "drinks") return t.drinks;

    // Look up in course list for nice name
    const courseObj = courseList.find(
      (c) => c.link === cat || c.link.replace(/\//g, "") === cat,
    );
    if (courseObj) return courseObj.text[currentLang || "en"];

    return cat.replace(/\//g, "").replace(/-/g, " ");
  };

  // --- Dynamic Month & Year Lists for the Select Dropdowns ---
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2000, i, 1);
    return {
      value: i,
      label: d.toLocaleString(currentLang === "de" ? "de-DE" : "en-US", {
        month: "long",
      }),
    };
  });

  // Extract unique years from actual payment records, plus the current year
  const currentYear = new Date().getFullYear();
  const uniqueYears = new Set([currentYear]);

  paymentHistory.forEach((tx) => {
    if (tx.createdAt?.toDate) {
      uniqueYears.add(tx.createdAt.toDate().getFullYear());
    } else if (tx.createdAt) {
      uniqueYears.add(new Date(tx.createdAt).getFullYear());
    }
  });

  const yearOptions = Array.from(uniqueYears).sort((a, b) => a - b);

  // --- Filter & Group Payments by Selected Month/Year ---
  const currentMonthYearStr = viewDate.toLocaleString(
    currentLang === "de" ? "de-DE" : "en-US",
    { month: "long", year: "numeric" },
  );

  const monthlyTransactions = paymentHistory.filter((tx) => {
    if (!tx.createdAt) return false;
    const txDate = tx.createdAt.toDate
      ? tx.createdAt.toDate()
      : new Date(tx.createdAt);
    return (
      txDate.getMonth() === viewDate.getMonth() &&
      txDate.getFullYear() === viewDate.getFullYear()
    );
  });

  const monthlyGrouped = {};
  monthlyTransactions.forEach((tx) => {
    const amt = tx.amount || 0;
    let rawCategory = tx.category || "uncategorized";

    let parentId = "uncategorized";
    if (rawCategory === "drinks") parentId = "drinks";
    else if (rawCategory === "admin") parentId = "admin";
    else if (rawCategory.startsWith("/")) {
      parentId = parentMap[rawCategory] || rawCategory.replace(/\//g, "");
    } else {
      parentId = rawCategory;
    }

    if (!monthlyGrouped[parentId]) {
      monthlyGrouped[parentId] = { total: 0, subItems: {} };
    }
    monthlyGrouped[parentId].total += amt;

    if (!monthlyGrouped[parentId].subItems[rawCategory]) {
      monthlyGrouped[parentId].subItems[rawCategory] = 0;
    }
    monthlyGrouped[parentId].subItems[rawCategory] += amt;
  });

  return (
    <section
      style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "5rem" }}
    >
      <h3 style={sectionTitleStyle}>
        <DollarSign size={18} /> {t.title}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* --- 1. GENERATE LINK SECTION --- */}
        <div
          style={{
            ...cardStyle,
            flexDirection: "column",
            gap: "1.5rem",
            backgroundColor: "#fdf8e1",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <LinkIcon size={18} color="#9960a8" />
            <h4 style={{ margin: 0, color: "#1c0700", fontSize: "1.1rem" }}>
              {t.generateLink}
            </h4>
          </div>

          <form
            onSubmit={handleGenerateLink}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label style={labelStyle}>{t.amount}</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={linkAmount}
                  onChange={(e) => setLinkAmount(e.target.value)}
                  style={{
                    ...inputStyle,
                    backgroundColor: "rgba(255, 252, 227, 0.6)",
                  }}
                  placeholder={t.placeholderAmount}
                />
              </div>
              <div>
                <label style={labelStyle}>{t.category}</label>
                <select
                  value={linkCategory}
                  onChange={(e) => setLinkCategory(e.target.value)}
                  style={{
                    ...inputStyle,
                    backgroundColor: "rgba(255, 252, 227, 0.6)",
                  }}
                >
                  <optgroup label={t.customGroup}>
                    <option value="admin">{t.adminMisc}</option>
                  </optgroup>
                  <optgroup label={t.coursesGroup}>
                    {courseList.map((c) => (
                      <option key={c.link} value={c.link}>
                        {c.text[currentLang || "en"]}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t.paymentTitle}</label>
              <input
                required
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: "rgba(255, 252, 227, 0.6)",
                }}
                placeholder={t.placeholderTitle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.description}</label>
              <input
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: "rgba(255, 252, 227, 0.6)",
                }}
                placeholder={t.placeholderDesc}
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              style={{
                ...btnStyle,
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                width: "fit-content",
              }}
            >
              {generating ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <Plus size={16} />
              )}
              {generating ? t.generating : t.generateBtn}
            </button>
          </form>
        </div>

        {/* --- 2. ACTIVE LINKS LIST --- */}
        <div style={{ ...cardStyle, flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ margin: 0, color: "#9960a8", fontSize: "1.1rem" }}>
            {t.activeLinks}
          </h4>

          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "1rem",
              }}
            >
              <Loader2 className="spinner" size={20} color="#caaff3" />
            </div>
          ) : savedLinks.length === 0 ? (
            <p style={{ opacity: 0.6, fontSize: "0.9rem", margin: 0 }}>
              {t.noLinks}
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: "300px",
                overflowY: "auto",
                paddingRight: "5px",
              }}
              className="custom-scrollbar"
            >
              {savedLinks.map((link) => {
                const dateStr = link.createdAt?.toDate
                  ? link.createdAt
                      .toDate()
                      .toLocaleDateString(
                        currentLang === "de" ? "de-DE" : "en-US",
                      )
                  : "N/A";

                return (
                  <div
                    key={link.id}
                    style={{
                      backgroundColor: "rgba(202, 175, 243, 0.05)",
                      border: "1px dashed rgba(202, 175, 243, 0.4)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "900",
                            color: "#9960a8",
                            textTransform: "uppercase",
                          }}
                        >
                          {formatCategoryName(link.category)} • {dateStr}
                        </span>
                        <span
                          style={{
                            fontSize: "1rem",
                            fontWeight: "bold",
                            color: "#1c0700",
                          }}
                        >
                          {link.title}
                        </span>
                        {link.description && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              opacity: 0.7,
                              color: "#1c0700",
                            }}
                          >
                            {link.description}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "900",
                            color: "#4e5f28",
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatChf(link.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          disabled={deletingId === link.id}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ff4d4d",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          {deletingId === link.id ? (
                            <Loader2 size={16} className="spinner" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "rgba(255, 252, 227, 0.6)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        marginTop: "4px",
                      }}
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "0.75rem",
                          color: "#9960a8",
                          wordBreak: "break-all",
                          flex: 1,
                          paddingRight: "10px",
                        }}
                      >
                        {link.url}
                      </a>
                      <button
                        onClick={() => handleCopyLink(link.id, link.url)}
                        style={{
                          background: "rgba(202, 175, 243, 0.15)",
                          border: "1px solid rgba(202, 175, 243, 0.3)",
                          color: "#9960a8",
                          borderRadius: "6px",
                          padding: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {copiedId === link.id ? (
                          <Check size={14} color="#4e5f28" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- 3. REVENUE OVERVIEW & NAVIGATOR --- */}
        <div style={{ ...cardStyle, flexDirection: "column", gap: "1rem" }}>
          {/* Custom Styled Month/Year Picker Header */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(28, 7, 0, 0.1)",
              paddingBottom: "1rem",
              marginBottom: "1rem",
              gap: "16px",
            }}
          >
            <h4
              style={{
                margin: 0,
                color: "#1c0700",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Calendar size={18} color="#9960a8" /> {t.monthlyOverview}
            </h4>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <select
                value={viewDate.getMonth()}
                onChange={handleMonthChange}
                style={{
                  ...inputStyle,
                  width: "auto",
                  marginBottom: 0,
                  padding: "8px 12px",
                  backgroundColor: "rgba(255, 252, 227, 0.6)",
                  color: "#9960a8",
                  fontWeight: "bold",
                }}
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={viewDate.getFullYear()}
                onChange={handleYearChange}
                style={{
                  ...inputStyle,
                  width: "auto",
                  marginBottom: 0,
                  padding: "8px 12px",
                  backgroundColor: "rgba(255, 252, 227, 0.6)",
                  color: "#9960a8",
                  fontWeight: "bold",
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem",
              }}
            >
              <Loader2 className="spinner" size={24} color="#caaff3" />
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            >
              {/* Aggregated Grouped Categories */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {Object.entries(monthlyGrouped)
                  .sort((a, b) => b[1].total - a[1].total) // Sort highest revenue first
                  .map(([parentId, groupData]) => (
                    <div
                      key={parentId}
                      style={{
                        padding: "1.2rem",
                        backgroundColor: "rgba(202, 175, 243, 0.05)",
                        borderRadius: "12px",
                        border: "1px solid rgba(202, 175, 243, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "800",
                            fontSize: "1.05rem",
                            textTransform: "capitalize",
                            color: "#1c0700",
                          }}
                        >
                          {formatCategoryName(parentId)}
                        </span>
                        <span
                          style={{
                            color: "#4e5f28",
                            fontWeight: "900",
                            fontSize: "1.05rem",
                          }}
                        >
                          {formatChf(groupData.total)}
                        </span>
                      </div>

                      {/* Sub-courses Breakdown (Hide if there's only 1 matching sub-item or if it's admin/drinks) */}
                      {Object.keys(groupData.subItems).length > 0 &&
                        parentId !== "drinks" &&
                        parentId !== "admin" &&
                        parentId !== "uncategorized" && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px dashed rgba(202, 175, 243, 0.4)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            {Object.entries(groupData.subItems)
                              .sort((a, b) => b[1] - a[1]) // Sort sub-items by revenue
                              .map(([subLink, subAmt]) => (
                                <div
                                  key={subLink}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "0.85rem",
                                    opacity: 0.8,
                                    paddingLeft: "8px",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span style={{ color: "#9960a8" }}>•</span>{" "}
                                    {formatCategoryName(subLink)}
                                  </span>
                                  <span>{formatChf(subAmt)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                  ))}
                {Object.keys(monthlyGrouped).length === 0 && (
                  <div
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      backgroundColor: "rgba(28, 7, 0, 0.02)",
                      borderRadius: "12px",
                      border: "1px dashed rgba(28, 7, 0, 0.1)",
                    }}
                  >
                    <p style={{ margin: 0, opacity: 0.5, fontSize: "0.9rem" }}>
                      {t.noPaymentsMonth}
                    </p>
                  </div>
                )}
              </div>

              {/* Transactions List for Month */}
              {monthlyTransactions.length > 0 && (
                <div>
                  <h5
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "0.85rem",
                      opacity: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    {t.recentPayments} {currentMonthYearStr}
                  </h5>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "350px",
                      overflowY: "auto",
                      paddingRight: "5px",
                    }}
                    className="custom-scrollbar"
                  >
                    {monthlyTransactions.map((tx) => {
                      const txDate = tx.createdAt?.toDate
                        ? tx.createdAt
                            .toDate()
                            .toLocaleString(
                              currentLang === "de" ? "de-DE" : "en-US",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                        : "N/A";

                      return (
                        <div
                          key={tx.id}
                          style={{
                            backgroundColor: "rgba(255, 252, 227, 0.4)",
                            border: "1px solid rgba(28, 7, 0, 0.05)",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: "bold",
                                color: "#1c0700",
                                textTransform: "capitalize",
                              }}
                            >
                              {formatCategoryName(tx.category)}
                            </span>
                            <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                              {t.dateLabel}: {txDate}
                            </span>
                            <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                              {t.customerLabel}: {tx.customerEmail}
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: "900",
                              color: "#4e5f28",
                              fontSize: "0.95rem",
                            }}
                          >
                            {formatChf(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
