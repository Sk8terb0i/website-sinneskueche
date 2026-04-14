import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function AtelierCalendar({
  currentLang,
  isMobile,
  events = [],
}) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLang === "en" ? "en-GB" : "de-DE");
  };

  const handleNavigate = (e, link) => {
    if (!link) return;
    if (!link.startsWith("http")) {
      e.preventDefault();
      navigate(link);
    }
  };

  return (
    <div style={{ color: "#1c0700", fontFamily: "Satoshi" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "1rem" : "1.5rem",
          // Changed from fit-content to 100% so text has room to wrap properly
          width: "100%",
        }}
      >
        {events.map((event, i) => {
          const hasLink = !!event.link;
          const isExternal = event.link?.startsWith("http");
          const isCourse =
            event.type === "course" || (event.link && !isExternal);

          // Gracefully handle older event titles (strings) vs newer (objects)
          const displayTitle =
            typeof event.title === "object"
              ? event.title[currentLang] || "Untitled"
              : event.title || "Untitled";

          return (
            <div
              key={event.id || i}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                borderLeft: "2px solid #caaff3",
                background: isCourse
                  ? "transparent"
                  : "linear-gradient(90deg, rgba(202, 175, 243, 0.2) 10%, rgba(202, 175, 243, 0) 90%)",
                boxSizing: "border-box",
                paddingLeft: "1rem",
                paddingRight: "1rem", // Reduced right padding to give title more breathing room
                paddingTop: isCourse ? "2px" : "10px",
                paddingBottom: isCourse ? "2px" : "10px",
                transition: "all 0.3s ease",
              }}
            >
              {/* METADATA ROW: Date, Time, Location */}
              <div
                style={{
                  fontSize: isMobile ? "0.65rem" : "0.75rem",
                  opacity: 0.8,
                  fontWeight: "bold",
                  lineHeight: "1.4",
                  display: "flex",
                  flexWrap: "wrap", // Allows metadata to wrap if location is long
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>{formatDate(event.date)}</span>
                {event.time && <span>• {event.time}</span>}
                {!isCourse && event.location && <span>• {event.location}</span>}
              </div>

              {/* TITLE AND LINK ROW */}
              <a
                href={event.link || "#"}
                onClick={(e) => handleNavigate(e, event.link)}
                target={isExternal ? "_blank" : "_self"}
                rel={isExternal ? "noopener noreferrer" : ""}
                className={hasLink ? "calendar-link" : ""}
                style={{
                  fontSize: isMobile ? "0.95rem" : "1.1rem",
                  // REMOVED textTransform: "lowercase"
                  color: "inherit",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  cursor: hasLink ? "pointer" : "default",
                  transition: "all 0.3s ease",
                  pointerEvents: hasLink ? "auto" : "none",
                }}
              >
                <span
                  style={{
                    fontWeight: isCourse ? "500" : "700",
                    lineHeight: "1.2",
                    // whiteSpace: "nowrap" is removed so this safely wraps!
                  }}
                >
                  {displayTitle}
                </span>

                {hasLink && (
                  <ArrowUpRight
                    size={isMobile ? 12 : 14}
                    style={{
                      color: isCourse ? "#caaff3" : "#1c0700",
                      opacity: 0.8,
                      flexShrink: 0,
                      marginTop: isMobile ? "2px" : "4px", // Adjust arrow position to sit nicely next to text
                    }}
                  />
                )}
              </a>

              {/* FESTIVAL BADGE (Optional, only for non-course events) */}
              {!isCourse && event.festivalName && (
                <div style={{ marginTop: "2px" }}>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: "800",
                      color: "#9960a8",
                      backgroundColor: "rgba(202, 175, 243, 0.15)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      // REMOVED textTransform: "uppercase"
                      letterSpacing: "0.02rem",
                      display: "inline-block",
                    }}
                  >
                    {event.festivalName}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .calendar-link:hover {
          color: #9960a8 !important;
          transform: translateX(3px);
        }
        .calendar-link:hover span {
          text-decoration: underline;
          text-underline-offset: 4px;
        }
      `}</style>
    </div>
  );
}
