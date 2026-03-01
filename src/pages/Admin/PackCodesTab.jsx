import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  Ticket,
  Trash2,
  User,
  Mail,
  CreditCard,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  sectionTitleStyle,
  cardStyle,
  btnStyle,
  inputStyle,
} from "./AdminStyles";

export default function PackCodesTab({ isMobile }) {
  const [packCodes, setPackCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Track which user groups are expanded
  const [expandedGroups, setExpandedGroups] = useState({});

  // Track column count for JS-driven Masonry layout
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    fetchPackCodes();

    // Determine how many columns to show based on screen width
    const updateColumns = () => {
      if (window.innerWidth < 800) setColumnCount(1);
      else if (window.innerWidth < 1200) setColumnCount(2);
      else setColumnCount(3);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const fetchPackCodes = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "pack_codes"),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      setPackCodes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching pack codes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this pack code? Any remaining credits will be lost forever.",
      )
    ) {
      try {
        await deleteDoc(doc(db, "pack_codes", id));
        fetchPackCodes();
      } catch (error) {
        alert("Error deleting code: " + error.message);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // 1. Filter the raw list first
  const filteredCodes = packCodes.filter((code) => {
    const searchLower = searchTerm.toLowerCase();
    const codeString = (code.code || "").toLowerCase();
    const emailString = (code.buyerEmail || "").toLowerCase();
    const nameString = (code.buyerName || "").toLowerCase();
    const courseString = (code.courseKey || "").toLowerCase();

    return (
      codeString.includes(searchLower) ||
      emailString.includes(searchLower) ||
      nameString.includes(searchLower) ||
      courseString.includes(searchLower)
    );
  });

  // 2. Group the filtered list by BOTH user email AND name
  const groupedCodes = filteredCodes.reduce((acc, code) => {
    const emailKey = (code.buyerEmail || "no-email").toLowerCase();
    const nameKey = (code.buyerName || "no-name").toLowerCase();

    // Composite key combining both email and name
    const groupKey = `${emailKey}_${nameKey}`;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupKey: groupKey,
        email: code.buyerEmail,
        name: code.buyerName,
        totalCredits: 0,
        codes: [],
      };
    }

    acc[groupKey].codes.push(code);
    acc[groupKey].totalCredits += code.remainingCredits || 0;

    return acc;
  }, {});

  // Convert the grouped object back into an array
  const groupedArray = Object.values(groupedCodes);

  // 3. Split the array into columns for the Masonry effect
  const columns = Array.from({ length: columnCount }, () => []);
  groupedArray.forEach((group, index) => {
    columns[index % columnCount].push(group);
  });

  return (
    <section>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <h3 style={{ ...sectionTitleStyle, margin: 0 }}>
          <Ticket size={18} /> Active Session Packs
        </h3>

        <div
          style={{
            display: "flex",
            gap: "10px",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9960a8",
              }}
            />
            <input
              type="text"
              placeholder="Search codes, emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: "36px",
                marginBottom: 0,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={fetchPackCodes}
            style={{
              ...btnStyle,
              width: "auto",
              padding: "0 14px",
              backgroundColor: "rgba(28,7,0,0.05)",
              color: "#1c0700",
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ opacity: 0.5 }}>Loading codes...</p>
      ) : groupedArray.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            opacity: 0.5,
            padding: "2rem",
          }}
        >
          {searchTerm
            ? "No codes match your search."
            : "No active pack codes found."}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "flex-start",
          }}
        >
          {columns.map((colGroups, colIndex) => (
            <div
              key={colIndex}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                minWidth: 0,
              }}
            >
              {colGroups.map((userGroup) => {
                const isExpanded = expandedGroups[userGroup.groupKey];
                const displayedCodes = isExpanded
                  ? userGroup.codes
                  : userGroup.codes.slice(0, 1);

                return (
                  <div
                    key={userGroup.groupKey}
                    style={{
                      ...cardStyle,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      borderTop: "4px solid #4e5f28",
                      marginBottom: 0,
                    }}
                  >
                    {/* USER HEADER */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        borderBottom: "1px solid rgba(28,7,0,0.1)",
                        paddingBottom: "10px",
                        gap: "8px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            color: "#1c0700",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <User
                            size={16}
                            color="#9960a8"
                            style={{ flexShrink: 0 }}
                          />{" "}
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {userGroup.name || "Guest User"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.85rem",
                            opacity: 0.7,
                            marginTop: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Mail size={14} style={{ flexShrink: 0 }} />{" "}
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {userGroup.email || "No email provided"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "#caaff3",
                          color: "#1c0700",
                          padding: "6px 12px",
                          borderRadius: "100px",
                          fontWeight: "900",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.85rem",
                          flexShrink: 0, // Prevents total badge from squishing
                        }}
                      >
                        <CreditCard size={14} /> {userGroup.totalCredits} Total
                      </div>
                    </div>

                    {/* INDIVIDUAL CODES FOR THIS USER */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {displayedCodes.map((code) => (
                        <div
                          key={code.id}
                          style={{
                            backgroundColor: "rgba(28,7,0,0.03)",
                            padding: "10px",
                            borderRadius: "8px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px", // Ensures space between left and right sides
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {" "}
                            {/* Allows left side to shrink appropriately */}
                            <div
                              style={{
                                fontWeight: "900",
                                letterSpacing: "1px",
                                color: "#1c0700",
                                wordBreak: "break-all", // Ensures very long codes wrap cleanly
                              }}
                            >
                              {code.code}
                            </div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#9960a8",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                                marginTop: "2px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {code.courseKey}
                            </div>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                opacity: 0.5,
                                marginTop: "2px",
                              }}
                            >
                              Created: {formatDate(code.createdAt)}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flexShrink: 0, // IMPORTANT: Prevents this entire right block from squishing
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                color: "#4e5f28",
                                whiteSpace: "nowrap", // IMPORTANT: Prevents the text from wrapping
                              }}
                            >
                              {code.remainingCredits} left
                            </span>
                            <button
                              onClick={() => handleDelete(code.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ff4d4d",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Delete Code"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* EXPAND/COLLAPSE BUTTON */}
                      {userGroup.codes.length > 1 && (
                        <button
                          onClick={() => toggleGroup(userGroup.groupKey)}
                          style={{
                            background: "rgba(153, 96, 168, 0.1)",
                            border: "none",
                            color: "#9960a8",
                            padding: "8px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            marginTop: "4px",
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={16} /> Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} /> Show{" "}
                              {userGroup.codes.length - 1} More
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
