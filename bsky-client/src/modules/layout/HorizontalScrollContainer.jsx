import { useEffect, useRef, useState, forwardRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import './HorizontalScrollContainer.css';

const SCROLL_STEP = 180;

function useScrollIndicators(ref) {
  const [state, setState] = useState({ left: false, right: false });

  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;

    const update = () => {
      const el = ref.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = Math.max(0, scrollWidth - clientWidth - 1);
      setState({
        left: scrollLeft > 0,
        right: scrollLeft < maxScroll,
      });
    };

    update();
    container.addEventListener('scroll', update, { passive: true });

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(container);
    } else {
      const handle = requestAnimationFrame(function check() {
        update();
        requestAnimationFrame(check);
      });
      return () => cancelAnimationFrame(handle);
    }

    return () => {
      container.removeEventListener('scroll', update);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [ref]);

  return state;
}

const HorizontalScrollContainer = forwardRef(function HorizontalScrollContainer(
  { children, className = '', ...rest },
  forwardedRef,
) {
  const innerRef = useRef(null);
  const scrollRef = forwardedRef ?? innerRef;
  const { left, right } = useScrollIndicators(scrollRef);

  const scrollByStep = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    try {
      el.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });
    } catch {
      el.scrollLeft += direction * SCROLL_STEP;
    }
  };

  return (
    <div
      className={`relative ${className}`}
      data-component="HorizontalScrollContainer"
      {...rest}
    >
      {left ? (
        <button
          type="button"
          aria-label="Vorherige Inhalte anzeigen"
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md ring-1 ring-border hover:bg-background"
          onClick={() => scrollByStep(-1)}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      ) : null}
      {right ? (
        <button
          type="button"
          aria-label="Weitere Inhalte anzeigen"
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md ring-1 ring-border hover:bg-background"
          onClick={() => scrollByStep(1)}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className="no-scrollbar flex items-center gap-3 overflow-x-auto px-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        {children}
      </div>
    </div>
  );
});

export default HorizontalScrollContainer;
