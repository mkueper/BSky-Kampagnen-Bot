import { useEffect, useState } from "react";
import { ChevronUpIcon } from "@radix-ui/react-icons";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-5 z-[90] rounded-full border border-border bg-background-subtle p-3 text-foreground shadow-soft transition hover:-translate-y-1 hover:bg-background hover:shadow-card md:bottom-8 md:right-10"
      aria-label="Zurück nach oben"
    >
      <ChevronUpIcon className="h-5 w-5" />
    </button>
  );
}
