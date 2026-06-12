import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function mdToHtml(md) {
  if (!md) return '';
  let cleaned = md.trim();
  cleaned = cleaned.replace(/^```(?:markdown)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
  const raw = marked.parse(cleaned, { breaks: true });
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
}

export default mdToHtml;
