// --- BASE STYLES ---
export const initialLoaderStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "400px",
};

export const overarchingTitleStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "2.5rem" : "3.5rem",
  fontWeight: isMobile ? "400" : "bold",
  color: "#1c0700",
  textAlign: "center",
  textTransform: "lowercase",
  marginTop: "0",
  marginLeft: "0",
  marginRight: "0",
  marginBottom: isMobile ? "2rem" : "2.5rem",
});

export const outerWrapperStyle = {
  width: "100%",
  marginTop: "4rem",
  borderTop: "1px solid rgba(28, 7, 0, 0.05)",
  paddingTop: "3rem",
};

// --- CALENDAR CARD STYLES ---
export const calendarCardStyle = (isMobile, hasSelection) => ({
  background: "#fdf8e1",
  padding: isMobile ? "1.2rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : hasSelection ? "0 0 520px" : "0 1 600px",
  width: isMobile ? "100%" : "auto",
  boxSizing: "border-box",
});

export const calendarHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "2rem",
});

export const monthLabelStyle = (isMobile) => ({
  fontFamily: "Harmond-SemiBoldCondensed",
  fontSize: isMobile ? "1.8rem" : "2rem",
  fontWeight: isMobile ? "400" : "bold",
  margin: 0,
  textTransform: "lowercase",
});

export const calendarGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: isMobile ? "4px" : "10px",
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

// --- DAY STYLE ---
export const dayStyle = (hasEvent, isSelected, isMobile, isGreyedOut) => ({
  width: "100%",
  aspectRatio: "1/1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  fontSize: isMobile ? "0.95rem" : "1rem",
  cursor: hasEvent && !isGreyedOut ? "pointer" : "default",
  backgroundColor: isGreyedOut
    ? "rgba(0,0,0,0.05)"
    : isSelected
      ? "#caaff3"
      : hasEvent
        ? "rgba(202, 175, 243, 0.4)"
        : "transparent",
  color: isGreyedOut ? "#ccc" : "#1c0700",
  fontWeight: hasEvent ? "800" : "400",
  opacity: hasEvent ? 1 : 0.2,
  transition: "0.2s",
  position: "relative",
  boxSizing: "border-box",
  paddingBottom: hasEvent ? (isMobile ? "4px" : "2px") : "0",
});

// Container for the arc of add-on dots ABOVE the circle
export const addonArcContainerStyle = {
  position: "absolute",
  top: "-7px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: "4px",
  height: "12px",
  zIndex: 10,
};

export const addonDotStyle = (color, offset) => ({
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  backgroundColor: color,
  transform: `translateY(${offset}px)`,
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
});

export const dotStyle = (isSelected, isAlreadyBooked, isMobile) => ({
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  backgroundColor: isAlreadyBooked
    ? "#ccc"
    : isSelected
      ? "#1c0700"
      : "#caaff3",
  position: "absolute",
  bottom: isMobile ? "5px" : "15%",
  left: "50%",
  transform: "translateX(-50%)",
});

// --- LEGEND STYLES ---
export const legendWrapperStyle = (isMobile) => ({
  marginTop: isMobile ? "1.2rem" : "2.5rem",
  padding: isMobile ? "1rem" : "1.5rem 1rem",
  borderTop: "1px solid rgba(28, 7, 0, 0.05)",
  backgroundColor: "rgba(28, 7, 0, 0.02)",
  borderRadius: "16px",
  display: "flex",
  flexDirection: "column",
  gap: isMobile ? "0.6rem" : "1.2rem", // Tightened vertical gap between rows
});

export const legendStatusRowStyle = (isMobile) => ({
  display: "flex",
  // CHANGED: Use flex-start instead of space-between to remove large gaps
  justifyContent: "flex-start",
  alignItems: "center",
  // FIXED GAP: Ensures items sit close to each other
  gap: isMobile ? "12px" : "2rem",
  width: "100%",
  flexWrap: "wrap", // Allows wrapping if the screen is extremely narrow
});

export const legendItemStyle = (isMobile) => ({
  display: "flex",
  alignItems: "center",
  // Tightened internal gap between dot and text
  gap: isMobile ? "6px" : "10px",
  fontSize: isMobile ? "0.65rem" : "0.75rem",
  fontWeight: "700",
  color: "#1c0700",
  opacity: 0.9,
  whiteSpace: "nowrap",
});

export const legendIndicatorStyle = (color, isMobile) => ({
  width: isMobile ? "8px" : "10px",
  height: isMobile ? "8px" : "10px",
  borderRadius: "50%",
  backgroundColor: color,
  flexShrink: 0, // CRITICAL: Prevents squishing into ovals
  display: "inline-block",
});

// --- BOOKING SUMMARY STYLES ---
export const bookingCardStyle = (isMobile, hasSelection) => ({
  display: hasSelection ? "flex" : "none",
  flexDirection: "column",
  background: "#fdf8e1",
  padding: isMobile ? "1.5rem" : "2.5rem",
  borderRadius: "24px",
  border: "1px solid rgba(28,7,0,0.08)",
  flex: isMobile ? "0 0 auto" : "1 1 auto",
  width: isMobile ? "100%" : "auto",
  boxSizing: "border-box",
  opacity: hasSelection ? 1 : 0,
  transition: "all 0.6s ease",
});

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
  backgroundColor: "rgba(28, 7, 0, 0.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 10000,
  backdropFilter: "blur(5px)",
  padding: "20px",
  boxSizing: "border-box",
};

export const guestInputStyle = {
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(28, 7, 0, 0.1)",
  fontFamily: "Satoshi",
  fontSize: "0.9rem",
  background: "#fdf8e1",
  width: "100%",
  boxSizing: "border-box",
  color: "#1c0700",
};
