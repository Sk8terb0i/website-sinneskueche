import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  Mail,
  Loader2,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { planets } from "../../data/planets";
import * as S from "./AdminStyles";

export default function ProfilesTab({
  isMobile,
  currentUserRole,
  allowedCourses = [],
  currentLang,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const labels = {
    en: {
      search: "Search users...",
      first: "First Name",
      role: "Role",
      user: "User",
      instructor: "Instructor",
      courseAdmin: "Course Admin",
      fullAdmin: "Full Admin",
      permitted: "PERMITTED COURSES",
      save: "Save",
      cancel: "Cancel",
      accessTo: "ACCESS TO:",
    },
    de: {
      search: "Nutzer suchen...",
      first: "Vorname",
      role: "Rolle",
      user: "Nutzer",
      instructor: "Lehrer",
      courseAdmin: "Kurs-Admin",
      fullAdmin: "Haupt-Admin",
      permitted: "ERLAUBTE KURSE",
      save: "Speichern",
      cancel: "Abbrechen",
      accessTo: "ZUGRIFF AUF:",
    },
  }[currentLang || "en"];

  const allPossibleCourses = Array.from(
    new Map(
      planets
        .filter((p) => p.type === "courses")
        .flatMap((p) => p.courses || [])
        .filter((c) => c.link)
        .map((course) => [course.link, course.text[currentLang || "en"]]),
    ),
  );

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
      const updateData = {
        role: editForm.role || "user",
        firstName: editForm.firstName || "",
        lastName: editForm.lastName || "",
        credits: editForm.credits || {},
        // Allow instructors and course admins to have permitted courses if needed
        allowedCourses:
          editForm.role === "course_admin" || editForm.role === "instructor"
            ? editForm.allowedCourses || []
            : [],
      };
      await updateDoc(userRef, updateData);
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      alert("Update failed: " + error.message);
    }
  };

  const toggleCoursePermission = (path) => {
    const current = editForm.allowedCourses || [];
    const updated = current.includes(path)
      ? current.filter((p) => p !== path)
      : [...current, path];
    setEditForm({ ...editForm, allowedCourses: updated });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", maxWidth: "400px", flex: 1 }}>
          {/* FIX: Replaced non-existent S.SearchIconWrapper with standard div styling */}
          <div
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.3,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder={labels.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...S.inputStyle,
              paddingLeft: "40px",
              backgroundColor: "#fdf8e1",
            }}
          />
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
              : "repeat(auto-fill, minmax(380px, 1fr))",
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
                  <input
                    style={S.inputStyle}
                    value={editForm.firstName || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    placeholder={labels.first}
                  />
                  <label style={S.labelStyle}>{labels.role}</label>
                  <select
                    style={S.inputStyle}
                    value={editForm.role}
                    disabled={currentUserRole !== "admin"}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                  >
                    <option value="user">{labels.user}</option>
                    <option value="instructor">{labels.instructor}</option>
                    <option value="course_admin">{labels.courseAdmin}</option>
                    <option value="admin">{labels.fullAdmin}</option>
                  </select>

                  {(editForm.role === "course_admin" ||
                    editForm.role === "instructor") && (
                    <div style={{ marginTop: "5px" }}>
                      <label style={{ ...S.labelStyle, fontSize: "0.65rem" }}>
                        {labels.permitted}
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                          marginTop: "8px",
                        }}
                      >
                        {allPossibleCourses.map(([path, name]) => (
                          <button
                            key={path}
                            type="button"
                            onClick={() => toggleCoursePermission(path)}
                            style={{
                              padding: "5px 12px",
                              fontSize: "0.65rem",
                              borderRadius: "100px",
                              border: "1px solid #caaff3",
                              fontWeight: "bold",
                              backgroundColor:
                                editForm.allowedCourses?.includes(path)
                                  ? "#caaff3"
                                  : "transparent",
                              cursor: "pointer",
                            }}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{ display: "flex", gap: "10px", marginTop: "1rem" }}
                  >
                    <button
                      onClick={handleSave}
                      style={{ ...S.btnStyle, flex: 1 }}
                    >
                      <Save size={16} /> {labels.save}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        ...S.btnStyle,
                        flex: 1,
                        backgroundColor: "rgba(28,7,0,0.1)",
                      }}
                    >
                      <X size={16} /> {labels.cancel}
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
                        style={{ margin: 0, fontSize: "0.8rem", opacity: 0.6 }}
                      >
                        <Mail size={12} /> {u.email}
                      </p>
                    </div>
                    <div
                      style={{
                        backgroundColor:
                          u.role === "admin"
                            ? "#caaff3"
                            : u.role === "course_admin"
                              ? "#4e5f28"
                              : u.role === "instructor"
                                ? "#9960a8"
                                : "rgba(28,7,0,0.05)",
                        color:
                          u.role === "course_admin" || u.role === "instructor"
                            ? "white"
                            : "inherit",
                        padding: "4px 10px",
                        borderRadius: "100px",
                        fontSize: "0.6rem",
                        fontWeight: "900",
                        textTransform: "uppercase",
                      }}
                    >
                      {u.role === "admin"
                        ? labels.fullAdmin
                        : u.role === "course_admin"
                          ? labels.courseAdmin
                          : u.role === "instructor"
                            ? labels.instructor
                            : labels.user}
                    </div>
                  </div>

                  {(u.role === "course_admin" || u.role === "instructor") &&
                    u.allowedCourses?.length > 0 && (
                      <div style={{ marginBottom: "10px" }}>
                        <p
                          style={{
                            fontSize: "0.6rem",
                            opacity: 0.5,
                            marginBottom: "4px",
                          }}
                        >
                          {labels.accessTo}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {u.allowedCourses.map((p) => (
                            <span
                              key={p}
                              style={{
                                fontSize: "0.6rem",
                                background: "rgba(28,7,0,0.05)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  <button
                    onClick={() => handleEdit(u)}
                    style={{
                      position: "absolute",
                      bottom: "1.5rem",
                      right: "1.5rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0.4,
                    }}
                  >
                    <Edit2 size={18} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
