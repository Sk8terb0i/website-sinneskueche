import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { Edit2, Trash2, Save, X, Search, Mail, Loader2 } from "lucide-react";
import * as S from "./AdminStyles";

export default function ProfilesTab({ isMobile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("email", "asc"));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ ...user });
  };

  const handleSave = async () => {
    try {
      const userRef = doc(db, "users", editingId);
      await updateDoc(userRef, {
        role: editForm.role || "user",
        credits: editForm.credits || {},
        firstName: editForm.firstName || "",
        lastName: editForm.lastName || "",
      });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      alert("Update failed: " + error.message);
    }
  };

  // UPDATED: Deletes user document AND all associated bookings
  const handleDelete = async (userId) => {
    const confirmMessage = isMobile
      ? "Delete profile and all their bookings?"
      : "Are you sure? This will delete the profile data and ALL associated bookings. The login account must still be removed manually in the Firebase Auth console.";

    if (window.confirm(confirmMessage)) {
      try {
        const batch = writeBatch(db);

        // 1. Find all bookings for this user
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("userId", "==", userId),
        );
        const bookingsSnap = await getDocs(bookingsQuery);

        // 2. Add booking deletions to batch
        bookingsSnap.forEach((bookingDoc) => {
          batch.delete(bookingDoc.ref);
        });

        // 3. Add user profile deletion to batch
        batch.delete(doc(db, "users", userId));

        // 4. Commit the batch
        await batch.commit();

        fetchUsers();
      } catch (error) {
        alert("Delete failed: " + error.message);
      }
    }
  };

  const updateCredit = (courseKey, val) => {
    setEditForm({
      ...editForm,
      credits: {
        ...editForm.credits,
        [courseKey]: parseInt(val) || 0,
      },
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ position: "relative", maxWidth: "400px", flex: 1 }}>
          <Search
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.3,
            }}
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...S.inputStyle,
              paddingLeft: "40px",
              backgroundColor: "#fdf8e1",
            }}
          />
        </div>
        <div style={{ fontSize: "0.8rem", opacity: 0.5, fontWeight: "700" }}>
          TOTAL PROFILES: {users.length}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <Loader2 className="spinner" size={30} color="#caaff3" />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              style={{
                backgroundColor: "#fdf8e1",
                padding: "1.5rem",
                borderRadius: "20px",
                border: "1px solid rgba(28,7,0,0.05)",
                position: "relative",
              }}
            >
              {editingId === u.id ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      style={S.inputStyle}
                      value={editForm.firstName || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstName: e.target.value })
                      }
                      placeholder="First Name"
                    />
                    <input
                      style={S.inputStyle}
                      value={editForm.lastName || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastName: e.target.value })
                      }
                      placeholder="Last Name"
                    />
                  </div>

                  <label style={S.labelStyle}>Role</label>
                  <select
                    style={S.inputStyle}
                    value={editForm.role || "user"}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>

                  <label style={S.labelStyle}>Manually Edit Credits</label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "150px",
                      overflowY: "auto",
                      padding: "10px",
                      backgroundColor: "rgba(28,7,0,0.03)",
                      borderRadius: "10px",
                    }}
                  >
                    {Object.keys(editForm.credits || {}).length > 0 ? (
                      Object.entries(editForm.credits).map(([key, val]) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.7rem", fontWeight: "bold" }}
                          >
                            {key}:
                          </span>
                          <input
                            type="number"
                            style={{
                              ...S.inputStyle,
                              width: "60px",
                              padding: "4px 8px",
                              fontSize: "0.8rem",
                            }}
                            value={val}
                            onChange={(e) => updateCredit(key, e.target.value)}
                          />
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                        No credits yet.
                      </p>
                    )}
                  </div>

                  <div
                    style={{ display: "flex", gap: "10px", marginTop: "1rem" }}
                  >
                    <button
                      onClick={handleSave}
                      style={{ ...S.btnStyle, flex: 1 }}
                    >
                      <Save size={16} /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        ...S.btnStyle,
                        flex: 1,
                        backgroundColor: "rgba(28,7,0,0.1)",
                      }}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontFamily: "Harmond-SemiBoldCondensed",
                        }}
                      >
                        {u.firstName || "Unnamed"} {u.lastName || ""}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          opacity: 0.6,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Mail size={12} /> {u.email}
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor:
                          u.role === "admin" ? "#caaff3" : "rgba(28,7,0,0.05)",
                        padding: "4px 10px",
                        borderRadius: "100px",
                        fontSize: "0.6rem",
                        fontWeight: "900",
                        textTransform: "uppercase",
                      }}
                    >
                      {u.role || "user"}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid rgba(28,7,0,0.05)",
                      paddingTop: "1rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        opacity: 0.5,
                      }}
                    >
                      CREDITS BALANCE
                    </p>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                    >
                      {Object.entries(u.credits || {}).map(
                        ([key, val]) =>
                          val > 0 && (
                            <div
                              key={key}
                              style={{
                                backgroundColor: "rgba(202, 175, 243, 0.15)",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                color: "#9960a8",
                                fontWeight: "bold",
                              }}
                            >
                              {key}: {val}
                            </div>
                          ),
                      )}
                      {(!u.credits ||
                        Object.values(u.credits).every((v) => v === 0)) && (
                        <span style={{ fontSize: "0.7rem", opacity: 0.4 }}>
                          No active credits
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "1.5rem",
                    }}
                  >
                    <button
                      onClick={() => handleEdit(u)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#1c0700",
                        opacity: 0.4,
                      }}
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#1c0700",
                        opacity: 0.4,
                      }}
                      title="Delete Profile & Bookings"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
