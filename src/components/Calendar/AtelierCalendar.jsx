import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

// Accept 'events' as a prop from the parent
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
          gap: isMobile ? "0.8rem" : "1.5rem",
          width: "fit-content",
        }}
      >
        {events.map((event, i) => {
          const hasLink = !!event.link;
          const isExternal = event.link?.startsWith("http");
          const isCourse =
            event.type === "course" || (event.link && !isExternal);

          return (
            <div
              key={event.id || i}
              style={{
                width: "100%",
                display: "block",
                borderLeft: "2px solid #caaff3",
                background: isCourse
                  ? "transparent"
                  : "linear-gradient(90deg, rgba(202, 175, 243, 0.2) 10%, rgba(202, 175, 243, 0) 90%)",
                boxSizing: "border-box",
                paddingLeft: "1rem",
                paddingRight: "3rem",
                paddingTop: isCourse ? "2px" : "10px",
                paddingBottom: isCourse ? "2px" : "10px",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "0.65rem" : "0.75rem",
                  opacity: 0.8,
                  fontWeight: "bold",
                  marginBottom: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(event.date)} {event.time && ` • ${event.time}`}
              </div>

              <a
                href={event.link || "#"}
                onClick={(e) => handleNavigate(e, event.link)}
                target={isExternal ? "_blank" : "_self"}
                rel={isExternal ? "noopener noreferrer" : ""}
                className={hasLink ? "calendar-link" : ""}
                style={{
                  fontSize: isMobile ? "0.95rem" : "1.1rem",
                  textTransform: "lowercase",
                  color: "inherit",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: hasLink ? "pointer" : "default",
                  transition: "all 0.3s ease",
                  pointerEvents: hasLink ? "auto" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontWeight: isCourse ? "500" : "700" }}>
                  {event.title?.[currentLang] || "Untitled"}
                </span>

                {hasLink && (
                  <ArrowUpRight
                    size={isMobile ? 12 : 14}
                    style={{
                      color: isCourse ? "#caaff3" : "#1c0700",
                      opacity: 0.8,
                      flexShrink: 0,
                    }}
                  />
                )}
              </a>
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
