import { useEffect, useState } from "react";

export default function useOrientation() {
  const [isPortrait, setIsPortrait] = useState(
    window.innerWidth < window.innerHeight,
  );

  useEffect(() => {
    const handleResize = () =>
      setIsPortrait(window.innerWidth < window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isPortrait;
}
