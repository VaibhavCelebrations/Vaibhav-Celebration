import sanitizeHtmlLib from "sanitize-html";

// These sanitizers only ever run in server components (see call sites), so a
// Node-only sanitizer is fine here — no jsdom/browser dependency needed.
// (isomorphic-dompurify pulls in jsdom -> html-encoding-sniffer -> @exodus/bytes,
// which ships an ESM-only file that Vercel's Node runtime cannot require() at
// runtime, crashing every page that sanitizes CMS HTML.)

const LEGAL_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "ul", "ol", "li",
  "strong", "em", "b", "i", "u", "a", "blockquote", "hr", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
];

const LEGAL_ALLOWED: sanitizeHtmlLib.IOptions = {
  allowedTags: LEGAL_TAGS,
  allowedAttributes: { "*": ["href", "target", "rel", "class", "id"] },
};

const BLOG_ALLOWED: sanitizeHtmlLib.IOptions = {
  allowedTags: [...LEGAL_TAGS, "img", "figure", "figcaption"],
  allowedAttributes: { "*": ["href", "target", "rel", "class", "id", "src", "alt", "width", "height"] },
};

export function sanitizeLegalHtml(html: string): string {
  return sanitizeHtmlLib(html, LEGAL_ALLOWED);
}

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtmlLib(html, BLOG_ALLOWED);
}

const INLINE_ALLOWED: sanitizeHtmlLib.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "span", "a", "ul", "ol", "li"],
  allowedAttributes: { "*": ["href", "target", "rel"] },
};

/** For short CMS blurbs (event summaries) rendered inline — text formatting and links only. */
export function sanitizeInlineHtml(html: string): string {
  return sanitizeHtmlLib(html, INLINE_ALLOWED);
}
