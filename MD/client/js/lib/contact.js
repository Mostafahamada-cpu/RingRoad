// Sharing a property and reaching its agent.
//
// Two rules drive this file:
//   • a shared link must open the EXACT property, never the homepage;
//   • the visitor must never have to type (or even remember) the property id —
//     the WhatsApp message is generated from the property's own data.
import { DEFAULT_DIAL_CODE, OFFICE_WHATSAPP } from '../config.js';
import { urlFor } from './router.js';
import { toast } from './ui.js';
import { money, areaText, ptypeLabel, dealTypeLabel, shortLocation, isNum } from './format.js';

/** Public, shareable URL of one property — /property/RR-1024. */
export const propertyUrl = (l) => urlFor({ name: 'property', code: l.code || l.id });

/**
 * Normalises an Egyptian-style number into the digits wa.me expects.
 *   "0100 123 4567" → 201001234567     "+20 100…" → 20100…     "0020…" → 20…
 * Returns null when there is nothing usable to dial.
 */
export function waNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = DEFAULT_DIAL_CODE + d.slice(1);
  else if (d.length <= 10) d = DEFAULT_DIAL_CODE + d;      // bare local number
  return d.length >= 8 ? d : null;
}

/**
 * The number that should receive this property's chats.
 * agent_whatsapp is resolved server-side to the ASSIGNED TELESALES employee's
 * saved WhatsApp number (see public_listings in platform-telesales.sql). A phone
 * number is never assumed to be a WhatsApp number, so when nothing is saved this
 * returns null and the caller disables the button instead of linking nowhere.
 */
export const agentWaNumber = (l) => waNumber(l?.agent_whatsapp) || waNumber(OFFICE_WHATSAPP);

/**
 * The pre-filled WhatsApp text. Every line is built from the property row, so
 * the client only has to press Send.
 */
export function whatsappMessage(l) {
  // Opens with the apartment number and project so the telesales employee knows
  // the unit from the first line; the details below save the client typing.
  const unit = l.code || l.id;
  const opener = l.project
    ? `Hello, I am interested in Apartment ${unit} in ${l.project}.`
    : `Hello, I am interested in Apartment ${unit}.`;
  const lines = [
    opener,
    '',
    `Property: ${l.title || '—'}`,
    `Property ID: ${unit}`,
  ];
  if (isNum(l.price) && Number(l.price) > 0) {
    lines.push(`Price: ${money(l.price)}${l.type === 'rent' ? ' / month' : ''}`);
  }
  if (isNum(l.area) && Number(l.area) > 0) lines.push(`Area: ${areaText(l.area)}`);
  if (isNum(l.bedrooms)) lines.push(`Bedrooms: ${l.bedrooms}`);
  if (isNum(l.bathrooms)) lines.push(`Bathrooms: ${l.bathrooms}`);
  lines.push(`Location: ${shortLocation(l)}`);
  if (l.project) lines.push(`Project: ${l.project}`);
  lines.push(`Type: ${ptypeLabel(l.ptype)} · ${dealTypeLabel(l.type)}`);
  lines.push('', 'Property Link:', propertyUrl(l));
  return lines.join('\n');
}

/** wa.me deep link for this property's assigned agent, or null if unreachable. */
export function whatsappLink(l) {
  const n = agentWaNumber(l);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(whatsappMessage(l))}`;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (_) { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) { return false; }
}

/**
 * Native share sheet on mobile, clipboard everywhere else.
 * Always shares the direct property URL.
 */
export async function shareProperty(l) {
  const url = propertyUrl(l);
  const title = `${l.title || 'Property'} · ${l.code || ''}`.trim();
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `${title} — Ring Roads`, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';   // user closed the sheet
      /* unsupported / blocked → fall back to copying */
    }
  }
  const ok = await copyToClipboard(url);
  toast(ok ? 'Link copied.' : url, ok ? 'success' : 'info', ok ? 2400 : 6000);
  return ok ? 'copied' : 'failed';
}
