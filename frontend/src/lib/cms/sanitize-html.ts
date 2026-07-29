import DOMPurify from "isomorphic-dompurify";

const LEGAL_ALLOWED = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "ul", "ol", "li",
    "strong", "em", "b", "i", "u", "a", "blockquote", "hr", "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "id"],
};

const BLOG_ALLOWED = {
  ...LEGAL_ALLOWED,
  ALLOWED_TAGS: [...LEGAL_ALLOWED.ALLOWED_TAGS, "img", "figure", "figcaption"],
  ALLOWED_ATTR: [...LEGAL_ALLOWED.ALLOWED_ATTR, "src", "alt", "width", "height"],
};

export function sanitizeLegalHtml(html: string): string {
  return DOMPurify.sanitize(html, LEGAL_ALLOWED);
}

export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, BLOG_ALLOWED);
}
