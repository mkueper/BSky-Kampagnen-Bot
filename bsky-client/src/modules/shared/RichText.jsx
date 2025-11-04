import React from "react";

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function classifyLink(urlString) {
  try {
    const url = new URL(urlString);
    const isBskyProfile = url.hostname === 'bsky.app' && url.pathname.startsWith('/profile/');
    if (isBskyProfile) {
      return { target: '_self', rel: undefined };
    }
    return { target: '_blank', rel: 'noopener noreferrer' };
  } catch {
    return { target: '_blank', rel: 'noopener noreferrer' };
  }
}

export default function RichText({ text = '', className = '' }) {
  if (!text) {
    return <span className={className}>{text}</span>;
  }

  const nodes = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const [url] = match;
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(
        <React.Fragment key={`text-${key++}`}>
          {text.slice(lastIndex, start)}
        </React.Fragment>,
      );
    }

    const { target, rel } = classifyLink(url);
    nodes.push(
      <a
        key={`link-${key++}`}
        href={url}
        target={target}
        rel={rel}
        className="text-primary underline decoration-primary/40 hover:decoration-primary"
      >
        {url}
      </a>,
    );

    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <React.Fragment key={`text-${key++}`}>
        {text.slice(lastIndex)}
      </React.Fragment>,
    );
  }

  return <span className={className}>{nodes}</span>;
}
