export const tabContainerStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "2.5rem",
  borderBottom: "1px solid #eee",
  paddingBottom: "10px",
  overflowX: "auto",
};

export const tabButtonStyle = (isActive) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 24px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontFamily: "Satoshi",
  fontWeight: "bold",
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
  transition: "all 0.3s ease",
  backgroundColor: isActive ? "#caaff3" : "transparent",
  color: isActive ? "#1c0700" : "#1c070080",
});

export const loginWrapperStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  padding: "1.5rem",
};

export const loginCardStyle = (isMobile) => ({
  backgroundColor: "white",
  padding: isMobile ? "2rem" : "3rem",
  borderRadius: "24px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
  width: "100%",
  maxWidth: "400px",
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
  background: "white",
  border: "1px solid #1c0700",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

export const formCardStyle = {
  backgroundColor: "#ffffff",
  padding: "1.8rem",
  borderRadius: "24px",
  boxShadow: "0 10px 40px rgba(28, 7, 0, 0.04)",
};

export const labelStyle = {
  display: "block",
  fontSize: "0.65rem",
  marginBottom: "6px",
  opacity: 0.5,
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
};

export const inputStyle = {
  width: "100%",
  padding: "0.85rem",
  borderRadius: "12px",
  border: "1px solid #eee",
  fontFamily: "Satoshi",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "1rem",
};

export const btnStyle = {
  marginTop: "0.5rem",
  padding: "1rem",
  backgroundColor: "#caaff3",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  color: "#1c0700",
  fontSize: "1rem",
  width: "100%",
};

export const forgotLinkStyle = {
  background: "none",
  border: "none",
  color: "#caaff3",
  cursor: "pointer",
  fontSize: "0.65rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  padding: 0,
};

export const sectionTitleStyle = {
  fontSize: "0.9rem",
  marginBottom: "1.2rem",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
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
  backgroundColor: "#fff",
  borderRadius: "18px",
  boxShadow: "0 4px 15px rgba(28, 7, 0, 0.02)",
  transition: "all 0.2s ease",
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
  backgroundColor: "#f0f0f0",
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
