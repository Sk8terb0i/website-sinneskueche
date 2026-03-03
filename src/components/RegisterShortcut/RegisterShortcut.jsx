import React, { useState, useEffect } from "react";

export default function RegisterShortcut({
  bookingRef,
  ctaText = "register now",
  planetImage,
  onClick,
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isIdle, setIsIdle] = useState(false);
  const [isBookingVisible, setIsBookingVisible] = useState(false);

  useEffect(() => {
    // define your thresholds here
    const mobileThreshold = 0.3;
    const desktopThreshold = 0.65;

    // check current width
    const currentThreshold =
      window.innerWidth <= 768 ? mobileThreshold : desktopThreshold;

    const observer = new IntersectionObserver(
      ([entry]) => setIsBookingVisible(entry.isIntersecting),
      { threshold: currentThreshold },
    );

    if (bookingRef.current) observer.observe(bookingRef.current);

    return () => observer.disconnect();
  }, [bookingRef]);

  useEffect(() => {
    let timeout;
    const handleScroll = () => {
      if (window.scrollY > 50) setIsVisible(false);
      else setIsVisible(true);
      setIsIdle(false);
    };
    const startTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsIdle(true), 7000);
    };
    const handleActivity = () => {
      setIsIdle(false);
      startTimer();
    };
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "touchstart",
      "scroll",
    ];

    window.addEventListener("scroll", handleScroll);
    events.forEach((e) => window.addEventListener(e, handleActivity));
    startTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("scroll", handleScroll);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, []);

  const handleButtonClick = () => {
    // 1. Trigger the expansion in the parent component
    if (onClick) onClick();

    // 2. Wait for the DOM to expand, then calculate and scroll
    setTimeout(() => {
      if (bookingRef.current) {
        // --- EDIT YOUR BUFFER HERE ---
        // 80px for mobile, 100px for desktop. Increase to stop further down.
        const buffer = window.innerWidth <= 768 ? 20 : 30;

        const elementPosition =
          bookingRef.current.getBoundingClientRect().top + window.scrollY;

        window.scrollTo({
          top: elementPosition - buffer,
          behavior: "smooth",
        });
      }
    }, 150);
  };

  const showShortcut = !isBookingVisible && (isVisible || isIdle);

  return (
    <button
      onClick={handleButtonClick}
      className="floating-shortcut"
      style={{
        position: "fixed",
        bottom: window.innerWidth <= 768 ? "5px" : "30px",
        right: window.innerWidth <= 768 ? "5px" : "30px",
        width: "100px",
        height: "100px",
        cursor: "pointer",
        zIndex: 9999,
        background: "none",
        border: "none",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "float-pulse 6s ease-in-out infinite",
        transition:
          "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.6s ease",
        opacity: showShortcut ? 1 : 0,
        visibility: showShortcut ? "visible" : "hidden",
        pointerEvents: showShortcut ? "auto" : "none",
      }}
    >
      <style>{`
        @keyframes float-pulse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .floating-shortcut:hover .planet-center { transform: scale(1.1); transition: transform 0.3s ease; }
      `}</style>
      <svg
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          width: window.innerWidth <= 768 ? "80%" : "95%",
          height: window.innerWidth <= 768 ? "80%" : "95%",
          animation: "rotate-slow 15s linear infinite",
        }}
      >
        <path
          id="circlePath"
          d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
          fill="none"
        />
        <text
          fill="#1c0700"
          style={{
            fontSize: "9px",
            fontWeight: window.innerWidth <= 768 ? "200" : "500",
            opacity: window.innerWidth <= 768 ? 0.75 : 0.5,
            textTransform: "lowercase",
            letterSpacing: "0.1em",
          }}
        >
          <textPath href="#circlePath">
            {ctaText} • {ctaText} • {ctaText} •
          </textPath>
        </text>
      </svg>
      <img
        src={planetImage}
        alt="icon"
        className="planet-center"
        style={{
          width: window.innerWidth <= 768 ? "40px" : "45px",
          height: window.innerWidth <= 768 ? "40px" : "45px",
          objectFit: "contain",
          position: "absolute",
          zIndex: 2,
        }}
      />
    </button>
  );
}
