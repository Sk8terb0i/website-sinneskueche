// --- BASE STYLES ---
export const initialLoaderStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "400px",
};
export const overarchingTitleStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "2.2rem" : "3.5rem",
  color: "#1c0700",
  marginBottom: isMobile ? "1.5rem" : "2.5rem",
  textAlign: "center",
  textTransform: "lowercase",
});
export const outerWrapperStyle = {
  width: "100%",
  marginTop: "4rem",
  borderTop: "1px solid rgba(28, 7, 0, 0.05)",
  paddingTop: "3rem",
};
export const containerStyle = (isMobile, hasSelection) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: hasSelection ? (isMobile ? "1.5rem" : "2.5rem") : "0",
  margin: "0 auto",
  width: "100%",
  maxWidth: "1200px",
  justifyContent: "center",
});

// --- CALENDAR CARD STYLES ---
export const calendarCardStyle = (isMobile, hasSelection) => ({
  background: "#fdf8e1",
  padding: isMobile ? "1.5rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : hasSelection ? "0 0 520px" : "0 1 600px",
});
export const calendarHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "2rem",
});
export const monthLabelStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "1.1rem" : "1.5rem",
  margin: 0,
});
export const calendarGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "10px",
});
export const dayOfWeekStyle = (isMobile) => ({
  fontSize: "0.75rem",
  fontWeight: "800",
  opacity: 0.3,
  textAlign: "center",
});
export const navBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  opacity: 0.5,
};

// --- UPDATED DAY STYLE ---
export const dayStyle = (hasEvent, isSelected, isMobile, isGreyedOut) => ({
  width: "100%", // Ensure it fills the grid cell
  aspectRatio: "1/1", // Forces height to match width
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  fontSize: isMobile ? "0.85rem" : "1rem",
  cursor: hasEvent && !isGreyedOut ? "pointer" : "default",
  backgroundColor: isGreyedOut
    ? "rgba(0,0,0,0.05)"
    : isSelected
      ? "#caaff3"
      : hasEvent
        ? "rgba(202, 175, 243, 0.15)"
        : "transparent",
  color: isGreyedOut ? "#ccc" : "#1c0700",
  fontWeight: hasEvent ? "800" : "400",
  opacity: hasEvent ? 1 : 0.2,
  transition: "0.2s",
  position: "relative", // Keeps absolute children (dots/labels) contained
  boxSizing: "border-box",
});

// --- UPDATED DOT STYLE ---
export const dotStyle = (isSelected, isAlreadyBooked) => ({
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  backgroundColor: isAlreadyBooked
    ? "#ccc"
    : isSelected
      ? "#1c0700"
      : "#caaff3",
  // CHANGED: Absolute positioning prevents the dot from "pushing" the circle's height
  position: "absolute",
  bottom: "15%",
  left: "50%",
  transform: "translateX(-50%)",
});

// --- BOOKING SUMMARY STYLES ---
export const bookingCardStyle = (isMobile, hasSelection) => ({
  display: hasSelection ? "flex" : "none",
  background: "#fdf8e1",
  padding: isMobile ? "1.5rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : "1 1 auto",
  opacity: hasSelection ? 1 : 0,
  transition: "all 0.6s ease",
});
export const selectionInfoStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(28,7,0,0.1)",
  paddingBottom: "1.5rem",
  marginBottom: "2rem",
});
export const totalPriceStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: "2.4rem",
  color: "#4e5f28",
});
export const labelStyle = (isMobile) => ({
  fontWeight: "700",
  fontSize: "1rem",
});

// --- BUTTONS & OVERLAYS ---
export const primaryBtnStyle = (isMobile) => ({
  width: "100%",
  padding: isMobile ? "1rem" : "1.2rem",
  backgroundColor: "#9960a8",
  color: "#ffffff",
  border: "none",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: isMobile ? "1rem" : "1.1rem",
});
export const secondaryBtnStyle = (isMobile) => ({
  width: "100%",
  padding: isMobile ? "0.9rem" : "1.1rem",
  backgroundColor: "transparent",
  color: "#1c0700",
  border: "1px solid rgba(28, 7, 0, 0.2)",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: isMobile ? "0.8rem" : "0.9rem",
  opacity: 0.7,
});
export const creditBtnStyle = (isMobile) => ({
  width: "100%",
  padding: isMobile ? "1rem" : "1.2rem",
  backgroundColor: "#4e5f28",
  color: "#ffffff",
  border: "none",
  borderRadius: "100px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: isMobile ? "1rem" : "1.1rem",
});

export const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(253, 248, 225, 0.85)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(5px)",
  animation: "fadeIn 0.3s ease-out",
};
export const choiceCardStyle = {
  background: "#fdf8e1",
  padding: "2.5rem",
  borderRadius: "24px",
  textAlign: "center",
  boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
  width: "90%",
  maxWidth: "400px",
};

export const guestInputStyle = {
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(28, 7, 0, 0.1)",
  fontFamily: "Satoshi",
  fontSize: "0.9rem",
  background: "#fffce3",
  width: "100%",
  boxSizing: "border-box",
  color: "#1c0700",
};
