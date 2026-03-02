import React from "react";

export default function CourseDescription({ text }) {
  const style = {
    maxWidth: "700px",
    margin: "60px auto 40px",
    fontSize: "1.05rem",
    lineHeight: "1.7",
    color: "#1c0700",
    whiteSpace: "pre-line",
    textAlign: "center",
    opacity: 0.9,
    fontFamily: "Satoshi, sans-serif",
  };

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .description-text {
              margin: 40px auto 20px !important;
              font-size: 0.95rem !important;
              padding: 0 15px;
            }
          }
        `}
      </style>
      <div className="description-text" style={style}>
        {text}
      </div>
    </>
  );
}
