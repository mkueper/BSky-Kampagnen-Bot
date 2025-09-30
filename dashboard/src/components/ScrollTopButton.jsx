import { useEffect, useState } from "react";
import { ChevronUpIcon } from "@radix-ui/react-icons";

const SCROLL_CONTAINER_ID = "app-scroll-container";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const container = document.getElementById(SCROLL_CONTAINER_ID);
    const scrollTarget = container || window;

    const handleScroll = () => {
      const position = container ? container.scrollTop : window.scrollY;
      setVisible(position > 400);
    };

    handleScroll();
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => scrollTarget.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const container = document.getElementById(SCROLL_CONTAINER_ID);
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-6 right-5 z-[90] rounded-full border border-border bg-background-subtle p-3 text-foreground shadow-soft transition hover:-translate-y-1 hover:bg-background hover:shadow-card md:bottom-8 md:right-10"
      aria-label="Zurück nach oben"
    >
      <ChevronUpIcon className="h-5 w-5" />
    </button>
  );
}
