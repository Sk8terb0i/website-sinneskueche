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
  getDoc,
  deleteDoc,
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
  BookOpen,
  Check, // Added this icon
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

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyCourse, setHistoryCourse] = useState("");
  const [courseAddons, setCourseAddons] = useState([]);
  const [completedAddons, setCompletedAddons] = useState([]);
  const [bookedAddonsInfo, setBookedAddonsInfo] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

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
      historyTitle: "Add-on History",
      selectCourse: "Select a course to view add-ons",
      noAddons: "No add-ons found for this course.",
      close: "Close",
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
      historyTitle: "Add-on Verlauf",
      selectCourse: "Kurs wählen, um Extras zu sehen",
      noAddons: "Keine Extras für diesen Kurs gefunden.",
      close: "Schliessen",
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

  const getGroupTint = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 35%, 94%)`;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const roleOrder = { admin: 0, course_admin: 1, instructor: 2, user: 3 };
      const q = query(collection(db, "users"), orderBy("email", "asc"));
      const querySnapshot = await getDocs(q);

      // Sort main users by role priority
      const sortedMainDocs = querySnapshot.docs.sort((a, b) => {
        const priorityA = roleOrder[a.data().role] ?? 99;
        const priorityB = roleOrder[b.data().role] ?? 99;
        return priorityA - priorityB;
      });

      const allProfiles = [];
      sortedMainDocs.forEach((docSnap) => {
        const mainId = docSnap.id;
        const data = docSnap.data();
        const hasSubs = data.linkedProfiles && data.linkedProfiles.length > 0;
        const groupColor = hasSubs ? getGroupTint(mainId) : null;

        allProfiles.push({
          id: mainId,
          ...data,
          isMain: true,
          groupColor: groupColor,
        });

        if (hasSubs) {
          data.linkedProfiles.forEach((lp) => {
            allProfiles.push({
              ...lp,
              id: `${mainId}_${lp.id}`, // Unique ID for the UI
              realSubId: lp.id, // Original ID for DB updates
              parentId: mainId,
              parentEmail: data.email,
              isMain: false,
              groupColor: groupColor,
              role: "user",
            });
          });
        }
      });
      setUsers(allProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    // Ensure allowedCourses is initialized as an array if missing
    setEditForm({
      ...user,
      allowedCourses: user.allowedCourses || [],
    });
  };

  const handleSave = async () => {
    try {
      const docId = editForm.isMain ? editingId : editForm.parentId;
      const userRef = doc(db, "users", docId);

      if (editForm.isMain) {
        await updateDoc(userRef, {
          role: editForm.role || "user",
          firstName: editForm.firstName || "",
          lastName: editForm.lastName || "",
          // Save the permitted courses
          allowedCourses: editForm.allowedCourses || [],
        });
      } else {
        const parentSnap = await getDoc(userRef);
        const updatedLinked = parentSnap.data().linkedProfiles.map((lp) =>
          lp.id === editForm.realSubId
            ? {
                ...lp,
                firstName: editForm.firstName,
                lastName: editForm.lastName,
              }
            : lp,
        );
        await updateDoc(userRef, { linkedProfiles: updatedLinked });
      }
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

  const handleDeleteUser = async (u) => {
    const msg = u.isMain
      ? "Delete main user? Linked profiles will be lost."
      : `Delete sub-user ${u.firstName}?`;

    if (window.confirm(msg)) {
      try {
        const userRef = doc(db, "users", u.isMain ? u.id : u.parentId);
        if (u.isMain) {
          await deleteDoc(userRef);
        } else {
          const parentSnap = await getDoc(userRef);
          const updatedLinked = parentSnap
            .data()
            .linkedProfiles.filter((lp) => lp.id !== u.realSubId);
          await updateDoc(userRef, { linkedProfiles: updatedLinked });
        }
        fetchUsers();
      } catch (e) {
        alert("Delete failed: " + e.message);
      }
    }
  };

  const openHistory = async (user) => {
    setHistoryUser(user);
    setCompletedAddons(user.completedAddons || []);
    if (allPossibleCourses.length > 0) {
      setHistoryCourse(allPossibleCourses[0][0]);
    }
    setHistoryLoading(true);
    setHistoryModalOpen(true);

    try {
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", user.isMain ? user.id : user.parentId),
      );
      const snap = await getDocs(q);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const addonMap = {};
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (
          data.profileId === (user.isMain ? "main" : user.id.split("_")[1]) &&
          data.selectedAddons
        ) {
          data.selectedAddons.forEach((item) => {
            const aid = typeof item === "object" ? item.id : item;
            if (!addonMap[aid]) addonMap[aid] = [];
            const bookingDate = new Date(data.date);
            addonMap[aid].push({
              date: data.date,
              isPast: bookingDate < today,
            });
          });
        }
      });
      setBookedAddonsInfo(addonMap);
    } catch (e) {
      console.error("Error fetching user booking history:", e);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (!historyCourse) return;
    const fetchAddons = async () => {
      setHistoryLoading(true);
      try {
        const docId = historyCourse.replace(/\//g, "");
        const snap = await getDoc(doc(db, "course_settings", docId));
        if (snap.exists()) setCourseAddons(snap.data().specialEvents || []);
        else setCourseAddons([]);
      } catch (e) {
        console.error(e);
      }
      setHistoryLoading(false);
    };
    fetchAddons();
  }, [historyCourse]);

  const toggleHistoryAddon = (addonId) => {
    setCompletedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  };

  const saveHistory = async () => {
    setHistoryLoading(true);
    try {
      const docId = historyUser.isMain ? historyUser.id : historyUser.parentId;
      const userRef = doc(db, "users", docId);
      if (historyUser.isMain) {
        await updateDoc(userRef, { completedAddons });
      } else {
        const parentSnap = await getDoc(userRef);
        const parentData = parentSnap.data();
        const updatedLinked = parentData.linkedProfiles.map((lp) => {
          if (lp.id === historyUser.id.split("_")[1])
            return { ...lp, completedAddons };
          return lp;
        });
        await updateDoc(userRef, { linkedProfiles: updatedLinked });
      }
      fetchUsers();
      setHistoryModalOpen(false);
    } catch (e) {
      alert("Error saving history: " + e.message);
    }
    setHistoryLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    const search = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(search) ||
      u.firstName?.toLowerCase().includes(search) ||
      u.lastName?.toLowerCase().includes(search) ||
      u.parentEmail?.toLowerCase().includes(search)
    );
  });

  const familyStacks = [];
  let currentStack = [];
  filteredUsers.forEach((u) => {
    if (u.isMain) {
      if (currentStack.length > 0) familyStacks.push(currentStack);
      currentStack = [u];
    } else {
      if (currentStack.length === 0) familyStacks.push([u]);
      else currentStack.push(u);
    }
  });
  if (currentStack.length > 0) familyStacks.push(currentStack);

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
            // Use columns to pack items vertically and remove the gaps
            columns: isMobile ? "auto" : "2 380px",
            columnGap: "1.5rem",
            width: "100%",
          }}
        >
          {familyStacks.map((stack, stackIdx) => (
            <div
              key={stackIdx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "1.5rem",
                breakInside: "avoid", // Prevents family members from splitting across columns
              }}
            >
              {stack.map((u) => (
                <div
                  key={u.id}
                  style={{
                    backgroundColor: u.groupColor || "#fdf8e1",
                    padding: "1.5rem",
                    borderRadius: "20px",
                    border: u.isMain
                      ? u.groupColor
                        ? "1px solid rgba(153, 96, 168, 0.2)"
                        : "1px solid rgba(28,7,0,0.05)"
                      : "2px dashed rgba(153, 96, 168, 0.3)",
                    position: "relative",
                    marginLeft:
                      !isMobile &&
                      !u.isMain &&
                      filteredUsers.some((f) => f.id === u.parentId)
                        ? "30px"
                        : "0",
                    transition: "all 0.2s ease",
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
                          setEditForm({
                            ...editForm,
                            firstName: e.target.value,
                          })
                        }
                        placeholder={labels.first}
                      />
                      <label style={S.labelStyle}>{labels.role}</label>
                      <select
                        style={S.inputStyle}
                        value={editForm.role}
                        disabled={currentUserRole !== "admin" || !u.isMain}
                        onChange={(e) =>
                          setEditForm({ ...editForm, role: e.target.value })
                        }
                      >
                        <option value="user">{labels.user}</option>
                        <option value="instructor">{labels.instructor}</option>
                        <option value="course_admin">
                          {labels.courseAdmin}
                        </option>
                        <option value="admin">{labels.fullAdmin}</option>
                      </select>
                      {(editForm.role === "instructor" ||
                        editForm.role === "course_admin") && (
                        <div style={{ marginTop: "1rem" }}>
                          <label
                            style={{
                              ...S.labelStyle,
                              marginBottom: "8px",
                              display: "block",
                            }}
                          >
                            {labels.permitted}
                          </label>
                          <div style={customStyles.courseGrid}>
                            {allPossibleCourses.map(([path, name]) => {
                              const isSelected = (
                                editForm.allowedCourses || []
                              ).includes(path);
                              return (
                                <div
                                  key={path}
                                  onClick={() => toggleCoursePermission(path)}
                                  style={{
                                    ...customStyles.courseItem,
                                    backgroundColor: isSelected
                                      ? "rgba(153, 96, 168, 0.15)"
                                      : "rgba(28, 7, 0, 0.03)",
                                    border: isSelected
                                      ? "1px solid #9960a8"
                                      : "1px solid rgba(28, 7, 0, 0.05)",
                                  }}
                                >
                                  <div
                                    style={{
                                      ...customStyles.checkbox,
                                      backgroundColor: isSelected
                                        ? "#9960a8"
                                        : "transparent",
                                      borderColor: isSelected
                                        ? "#9960a8"
                                        : "rgba(28, 7, 0, 0.2)",
                                    }}
                                  >
                                    {isSelected && (
                                      <Check
                                        size={10}
                                        color="#fff"
                                        strokeWidth={4}
                                      />
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: "700",
                                      color: "#1c0700",
                                    }}
                                  >
                                    {name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "1rem",
                        }}
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
                            {!u.isMain && (
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  color: "#9960a8",
                                  marginLeft: "8px",
                                  backgroundColor: "rgba(255,255,255,0.7)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                }}
                              >
                                SUB-USER
                              </span>
                            )}
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.8rem",
                              opacity: 0.6,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Mail size={12} />
                            {u.isMain ? u.email : `Linked to: ${u.parentEmail}`}
                          </p>

                          {u.allowedCourses?.length > 0 && (
                            <div
                              style={{
                                marginTop: "0.5rem",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                              }}
                            >
                              {u.allowedCourses.map((path) => (
                                <span
                                  key={path}
                                  style={{
                                    fontSize: "0.6rem",
                                    padding: "2px 6px",
                                    backgroundColor: "rgba(28,7,0,0.05)",
                                    borderRadius: "4px",
                                    fontWeight: "900",
                                    textTransform: "uppercase",
                                    color: "#4e5f28",
                                  }}
                                >
                                  {allPossibleCourses.find(
                                    (c) => c[0] === path,
                                  )?.[1] || path}
                                </span>
                              ))}
                            </div>
                          )}
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
                                    : "rgba(28,7,0,0.1)",
                            color:
                              u.role === "course_admin" ||
                              u.role === "instructor"
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
                      <div
                        style={{
                          position: "absolute",
                          bottom: "1.5rem",
                          right: "1.5rem",
                          display: "flex",
                          gap: "12px",
                        }}
                      >
                        <button
                          onClick={() => openHistory(u)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            opacity: 0.4,
                          }}
                        >
                          <BookOpen size={18} />
                        </button>
                        {currentUserRole === "admin" && (
                          <>
                            <button
                              onClick={() => handleEdit(u)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                opacity: 0.4,
                              }}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                opacity: 0.4,
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {historyModalOpen && historyUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28, 7, 0, 0.4)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setHistoryModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#fffce3",
              width: "100%",
              maxWidth: "450px",
              borderRadius: "24px",
              padding: "2rem",
              position: "relative",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setHistoryModalOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.5,
              }}
            >
              <X size={20} />
            </button>
            <h3
              style={{
                margin: "0 0 1.5rem 0",
                fontFamily: "Harmond-SemiBoldCondensed",
                fontSize: "1.5rem",
                color: "#1c0700",
              }}
            >
              {labels.historyTitle} - {historyUser.firstName}
            </h3>
            <select
              value={historyCourse}
              onChange={(e) => setHistoryCourse(e.target.value)}
              style={{
                ...S.inputStyle,
                backgroundColor: "rgba(202, 175, 243, 0.1)",
                marginBottom: "1.5rem",
              }}
            >
              <option value="" disabled>
                {labels.selectCourse}
              </option>
              {allPossibleCourses.map(([path, name]) => (
                <option key={path} value={path}>
                  {name}
                </option>
              ))}
            </select>
            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Loader2 size={24} className="spinner" color="#caaff3" />
              </div>
            ) : historyCourse && courseAddons.length === 0 ? (
              <p
                style={{
                  opacity: 0.5,
                  textAlign: "center",
                  fontSize: "0.85rem",
                }}
              >
                {labels.noAddons}
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
              >
                {courseAddons
                  .filter(
                    (addon) =>
                      addon.isMandatory ||
                      courseAddons.some(
                        (se) => se.requiresIntroId === addon.id,
                      ),
                  )
                  .map((addon) => {
                    const manualDone = completedAddons.includes(addon.id);
                    const bookingInfo = bookedAddonsInfo[addon.id] || [];
                    const hasPastBooking = bookingInfo.some((b) => b.isPast);
                    const upcomingBookings = bookingInfo.filter(
                      (b) => !b.isPast,
                    );
                    const isEffectiveDone = manualDone || hasPastBooking;
                    return (
                      <div
                        key={addon.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px",
                            backgroundColor: isEffectiveDone
                              ? "rgba(78, 95, 40, 0.1)"
                              : "rgba(28, 7, 0, 0.03)",
                            borderRadius: "12px",
                            cursor: "pointer",
                            border: isEffectiveDone
                              ? "1px solid rgba(78, 95, 40, 0.3)"
                              : "1px solid transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isEffectiveDone}
                            disabled={hasPastBooking}
                            onChange={() => toggleHistoryAddon(addon.id)}
                            style={{
                              transform: "scale(1.2)",
                              accentColor: "#4e5f28",
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              flex: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                color: "#1c0700",
                              }}
                            >
                              {currentLang === "en"
                                ? addon.nameEn
                                : addon.nameDe}
                            </span>
                            {hasPastBooking && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#4e5f28",
                                  fontWeight: "bold",
                                }}
                              >
                                ✓{" "}
                                {currentLang === "en"
                                  ? "Attended on "
                                  : "Besucht am "}
                                {bookingInfo
                                  .filter((b) => b.isPast)
                                  .map((b) =>
                                    b.date.split("-").reverse().join("."),
                                  )
                                  .join(", ")}
                              </span>
                            )}
                            {upcomingBookings.length > 0 && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#9960a8",
                                  fontWeight: "bold",
                                }}
                              >
                                ○{" "}
                                {currentLang === "en"
                                  ? "Upcoming: "
                                  : "Geplant: "}
                                {upcomingBookings
                                  .map((b) =>
                                    b.date.split("-").reverse().join("."),
                                  )
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "2rem" }}>
              <button
                onClick={saveHistory}
                disabled={historyLoading}
                style={{
                  ...S.btnStyle,
                  flex: 1,
                  backgroundColor: "#9960a8",
                  color: "white",
                }}
              >
                {historyLoading ? (
                  <Loader2 size={16} className="spinner" />
                ) : (
                  <Save size={16} />
                )}{" "}
                {labels.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const customStyles = {
  courseGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backgroundColor: "#fffce3",
    padding: "12px",
    borderRadius: "16px",
    border: "1px solid rgba(28, 7, 0, 0.1)",
    maxHeight: "200px",
    overflowY: "auto",
  },
  courseItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
};
