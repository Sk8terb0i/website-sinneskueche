export default function Orbit({
  radius,
  label,
  textRadiusOffset = 2,
  textStartOffset = "65%", // default value
  style = {}, // <-- accept style prop
}) {
  const textRadius = radius + textRadiusOffset;

  return (
    <svg
      className="orbit-svg"
      width={(radius + textRadiusOffset) * 2}
      height={(radius + textRadiusOffset) * 2}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%)`,
        overflow: "visible",
        ...style, // <-- apply the passed-in style
      }}
    >
      {/* Circle stroke */}
      <circle
        cx={radius + textRadiusOffset}
        cy={radius + textRadiusOffset}
        r={radius}
        stroke="#1c0700"
        strokeWidth={0.25}
        fill="none"
      />

      {/* Bottom path for text */}
      <defs>
        <path
          id={`orbitPath-${radius}`}
          d={`M ${textRadius * 2},${textRadius} A ${textRadius},${textRadius} 0 1,0 0,${textRadius}`}
          transform={`rotate(180, ${textRadius}, ${textRadius})`}
        />
      </defs>

      {/* Outline text (behind) */}
      <text
        fontSize="10"
        fontFamily="Satoshi, sans-serif"
        fill="#fffce3"
        stroke="#fffce3"
        strokeWidth="10"
        strokeLinejoin="round"
      >
        <textPath
          href={`#orbitPath-${radius}`}
          startOffset={textStartOffset}
          textAnchor="middle"
        >
          {label}
        </textPath>
      </text>

      {/* Fill text (on top) */}
      <text
        fontSize="10"
        fontFamily="Satoshi, sans-serif"
        fill="#1c0700"
        stroke="none"
      >
        <textPath
          href={`#orbitPath-${radius}`}
          startOffset={textStartOffset}
          textAnchor="middle"
        >
          {label}
        </textPath>
      </text>
    </svg>
  );
}
