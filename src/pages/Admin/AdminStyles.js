export const tabButtonStyle = (isActive) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 20px", // Use horizontal padding instead of fixed width
  border: "none",
  cursor: "pointer",
  fontFamily: "Satoshi",
  fontSize: "0.9rem",
  fontWeight: "600",
  transition: "all 0.3s ease",
  whiteSpace: "nowrap", // Prevents text from wrapping inside the button
  // Remove any fixed width/height and border-radius: 50%
});

export const tabContainerStyle = {
  display: "flex",
  gap: "8px",
  overflowX: "auto", // Allows scrolling on very small screens
  padding: "6px",
  scrollbarWidth: "none", // Hides scrollbar on Firefox
  msOverflowStyle: "none", // Hides scrollbar on IE/Edge
};
export const loginWrapperStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  padding: "1.5rem",
  backgroundColor: "#fffce3",
};

export const loginCardStyle = (isMobile) => ({
  backgroundColor: "#fdf8e1", // Theme beige
  padding: isMobile ? "2rem" : "3rem",
  borderRadius: "24px",
  boxShadow: "0 10px 40px rgba(28, 7, 0, 0.05)",
  width: "100%",
  maxWidth: "400px",
  border: "1px solid rgba(28, 7, 0, 0.05)",
});

export const headerStyle = (isMobile) => ({
  marginBottom: isMobile ? "2rem" : "4rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
});

export const logoutBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#fdf8e1",
  border: "1px solid rgba(28, 7, 0, 0.2)",
  padding: "10px 18px",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "bold",
  fontFamily: "Satoshi",
  fontSize: "0.85rem",
};

export const formCardStyle = {
  backgroundColor: "#fdf8e1", // Theme beige
  padding: "1.8rem",
  borderRadius: "24px",
  boxShadow: "0 10px 40px rgba(28, 7, 0, 0.04)",
  border: "1px solid rgba(28, 7, 0, 0.05)",
};

export const labelStyle = {
  display: "block",
  fontSize: "0.6rem",
  marginBottom: "6px",
  opacity: 0.4,
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
};

export const inputStyle = {
  width: "100%",
  padding: "0.85rem",
  borderRadius: "12px",
  border: "1px solid rgba(28, 7, 0, 0.1)",
  backgroundColor: "rgba(255, 252, 227, 0.5)", // Semi-transparent theme
  fontFamily: "Satoshi",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "1rem",
  color: "#1c0700",
};

export const btnStyle = {
  marginTop: "0.5rem",
  padding: "1rem",
  backgroundColor: "#caaff3",
  border: "none",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "bold",
  color: "#1c0700",
  fontSize: "1rem",
  width: "100%",
  fontFamily: "Satoshi",
};

export const forgotLinkStyle = {
  background: "none",
  border: "none",
  color: "#9960a8",
  cursor: "pointer",
  fontSize: "0.65rem",
  fontWeight: "bold",
  textTransform: "lowercase",
  padding: 0,
  opacity: 0.8,
};

export const sectionTitleStyle = {
  fontSize: "0.9rem",
  marginBottom: "1.2rem",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.1rem",
  color: "#1c0700",
};

export const cancelBtnStyle = {
  background: "none",
  border: "none",
  color: "#ff4d4d",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "0.7rem",
  fontWeight: "bold",
};

export const cardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "1.2rem",
  backgroundColor: "#fdf8e1",
  borderRadius: "18px",
  border: "1px solid rgba(28, 7, 0, 0.05)",
  boxShadow: "0 4px 15px rgba(28, 7, 0, 0.02)",
  transition: "all 0.2s ease",
  cursor: "pointer",
};

export const deleteBtnStyle = {
  color: "#ff4d4d",
  background: "none",
  border: "none",
  cursor: "pointer",
  opacity: 0.4,
  padding: "8px",
};

export const toggleContainerStyle = {
  display: "flex",
  backgroundColor: "rgba(28, 7, 0, 0.05)",
  padding: "4px",
  borderRadius: "12px",
  width: "fit-content",
};

export const toggleOptionStyle = {
  padding: "8px 20px",
  borderRadius: "9px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: "600",
  transition: "all 0.2s ease",
};
