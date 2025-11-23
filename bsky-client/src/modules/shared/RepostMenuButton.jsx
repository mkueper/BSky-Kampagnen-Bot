import { useState } from "react";
import { LoopIcon, QuoteIcon } from "@radix-ui/react-icons";
import { InlineMenu, InlineMenuTrigger, InlineMenuContent, InlineMenuItem } from "@bsky-kampagnen-bot/shared-ui";

export default function RepostMenuButton({
  count,
  hasReposted,
  busy,
  style,
  onRepost,
  onQuote,
}) {
  const [open, setOpen] = useState(false);

  const handleTriggerClick = (event) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    if (hasReposted) {
      event.preventDefault();
      onRepost?.();
    }
  };

  const handleRepost = () => {
    setOpen(false);
    onRepost?.();
  };

  const handleQuote = () => {
    setOpen(false);
    if (onQuote) onQuote();
  };

  return (
    <InlineMenu open={open} onOpenChange={setOpen}>
      <InlineMenuTrigger>
        <button
          type="button"
          className={`group inline-flex items-center gap-2 transition ${busy ? "opacity-60" : ""}`}
          style={style}
          title={hasReposted ? "Reskeet rückgängig machen" : "Reskeet-Optionen"}
          aria-expanded={open}
          onClick={handleTriggerClick}
        >
          <LoopIcon className="h-5 w-5 md:h-6 md:w-6" />
          <span className="tabular-nums">{count}</span>
        </button>
      </InlineMenuTrigger>
      <InlineMenuContent side="top" align="center" sideOffset={10} style={{ width: 220 }}>
        <div className="py-1 text-sm">
          <InlineMenuItem icon={LoopIcon} onSelect={handleRepost}>
            Reposten
          </InlineMenuItem>
          <InlineMenuItem icon={QuoteIcon} onSelect={handleQuote} disabled={!onQuote}>
            Post zitieren
          </InlineMenuItem>
        </div>
      </InlineMenuContent>
    </InlineMenu>
  );
}
