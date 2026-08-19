// Property details — the page every shared link opens.
import {
  esc, money, areaText, ptypeLabel, dealTypeLabel, finishingLabel, amenityLabel,
  locationText, priceSuffix, pricePerSqmText, listOf, isNum,
} from '../lib/format.js';
import { getOne, all, loadAll } from '../lib/catalog.js';
import { imageUrl, submitRequest } from '../lib/api.js';
import { emptyState, openModal, toast } from '../lib/ui.js';
import { gallery } from '../components/gallery.js';
import { favButton, compareButton, cardGrid, refreshCardStates } from '../components/card.js';
import { hrefFor, goProperties } from '../lib/router.js';
import { whatsappLink, shareProperty, propertyUrl } from '../lib/contact.js';

const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function specRow(label, value) {
  if (value == null || value === '' || value === '—') return '';
  return `<div class="c-specrow"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
}

export async function pageProperty(view, code) {
  view.innerHTML = `<div class="skel skel-line" style="width:40%"></div>
    <div class="skel skel-block" style="height:280px;margin:16px 0"></div>
    <div class="skel skel-line" style="width:70%"></div>`;

  let l = null;
  try {
    l = await getOne(code);
  } catch (err) {
    view.innerHTML = emptyState({ icon: '⚠️', title: 'Could not load this property', text: err.message });
    return;
  }

  if (!l) {
    view.innerHTML = emptyState({
      icon: '🔍',
      title: 'Property not found',
      text: `We could not find ${code}. It may have been sold or taken off the market.`,
      actionHtml: `<a class="btn btn--primary" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties">Browse all properties</a>`,
    });
    return;
  }

  document.title = `${l.title || 'Property'} · ${l.code || ''} — Ring Roads`;
  document.querySelector('meta[name="description"]')
    ?.setAttribute('content', `${l.title || 'Property'} — ${locationText(l)}. ${money(l.price)}${priceSuffix(l) ? ' ' + priceSuffix(l) : ''}.`);

  const wa = whatsappLink(l);
  const ppsqm = pricePerSqmText(l);
  const amenities = listOf(l.amenities);
  const hasMap = isNum(l.lat) && isNum(l.lng);

  const facts = [
    ['📐', 'Area', areaText(l.area)],
    ['🛏', 'Bedrooms', isNum(l.bedrooms) ? String(l.bedrooms) : '—'],
    ['🛁', 'Bathrooms', isNum(l.bathrooms) ? String(l.bathrooms) : '—'],
    ['🏷️', 'Type', ptypeLabel(l.ptype)],
  ];

  view.innerHTML = `
    <div class="c-backrow">
      <button class="btn btn--ghost" id="back">← All properties</button>
      <div class="c-backrow__tools">
        ${favButton(l, { big: true })}
        ${compareButton(l, { big: true })}
        <button class="c-iconbtn" id="share" style="width:46px;height:46px;font-size:19px" title="Share this property" aria-label="Share this property">📤</button>
      </div>
    </div>

    <div class="c-detail">
      <div class="c-section">
        <div id="gal"></div>

        <div class="card">
          <div class="c-titlerow">
            <div style="min-width:0">
              <div class="row row--wrap" style="gap:8px;margin-bottom:8px">
                <span class="badge ${l.type === 'rent' ? 'badge--reserved' : 'badge--available'}">${esc(dealTypeLabel(l.type))}</span>
                ${l.status === 'reserved' ? '<span class="badge badge--sold">Reserved</span>' : ''}
                ${l.featured ? '<span class="badge badge--featured">★ Featured</span>' : ''}
                <span class="badge badge--role">ID ${esc(l.code || l.id)}</span>
              </div>
              <h1>${esc(l.title || 'Property')}</h1>
              <div class="muted small" style="margin-top:6px">📍 ${esc(locationText(l))}</div>
            </div>
            <div>
              <div class="c-price money">${esc(money(l.price))}</div>
              <div class="c-price__sub">${esc([priceSuffix(l), ppsqm].filter(Boolean).join(' · ') || '')}</div>
            </div>
          </div>
          <div class="c-facts" style="margin-top:18px">
            ${facts.map(([ic, k, v]) => `
              <div class="c-fact">
                <div class="c-fact__ic" aria-hidden="true">${ic}</div>
                <div class="c-fact__v">${esc(v)}</div>
                <div class="c-fact__k">${esc(k)}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <h2 style="margin-bottom:8px">Property details</h2>
          <div class="c-speclist">
            ${specRow('Property ID', l.code || l.id)}
            ${specRow('Property type', ptypeLabel(l.ptype))}
            ${specRow('Sale / Rent', dealTypeLabel(l.type))}
            ${specRow('Price', money(l.price) + (priceSuffix(l) ? ' ' + priceSuffix(l) : ''))}
            ${ppsqm ? specRow('Price per m²', ppsqm) : ''}
            ${specRow('Area', areaText(l.area))}
            ${specRow('Bedrooms', isNum(l.bedrooms) ? String(l.bedrooms) : '')}
            ${specRow('Bathrooms', isNum(l.bathrooms) ? String(l.bathrooms) : '')}
            ${specRow('Finishing', finishingLabel(l.finishing))}
            ${specRow('Project / Compound', l.project)}
            ${specRow('Developer', l.developer)}
            ${specRow('Floor', isNum(l.floor) ? String(l.floor) : '')}
            ${specRow('Parking', isNum(l.parking) && Number(l.parking) > 0 ? String(l.parking) : '')}
            ${specRow('Furnished', l.furnished ? 'Yes' : '')}
            ${specRow('Year built', isNum(l.year_built) ? String(l.year_built) : '')}
            ${specRow('Delivery', l.delivery ? String(l.delivery).slice(0, 10) : '')}
            ${specRow('Payment plan', l.payment_plan)}
            ${specRow('Location', locationText(l))}
          </div>
        </div>

        ${l.description ? `
        <div class="card">
          <h2 style="margin-bottom:10px">Description</h2>
          <p class="small" style="color:var(--ink-soft);line-height:1.75;white-space:pre-wrap">${esc(l.description)}</p>
        </div>` : ''}

        ${amenities.length ? `
        <div class="card">
          <h2 style="margin-bottom:12px">Amenities</h2>
          <div class="c-amenities">${amenities.map(a => `<span>✓ ${esc(amenityLabel(a))}</span>`).join('')}</div>
        </div>` : ''}

        ${hasMap ? `
        <div class="card card--flush">
          <iframe title="Map" loading="lazy" style="width:100%;height:280px;border:0;display:block"
            src="https://maps.google.com/maps?q=${encodeURIComponent(l.lat + ',' + l.lng)}&z=14&output=embed"></iframe>
          <div style="padding:12px 16px">
            <a class="btn btn--ghost btn--sm" target="_blank" rel="noopener"
               href="https://maps.google.com/?q=${encodeURIComponent(l.lat + ',' + l.lng)}">📍 Open in Maps</a>
          </div>
        </div>` : ''}
      </div>

      <aside class="c-detail__rail">
        <div class="card">
          <h2 style="margin-bottom:14px">Your agent</h2>
          <div class="c-agent">
            <span class="avatar avatar--lg">${l.agent_photo
              ? `<img src="${esc(imageUrl(l.agent_photo))}" alt="">`
              : esc(initials(l.agent_name || 'Ring Roads'))}</span>
            <div style="min-width:0">
              <div class="c-agent__name">${esc(l.agent_name || 'Ring Roads Sales')}</div>
              <div class="c-agent__role">${esc(l.team_name || 'Ring Roads Real Estate')}</div>
              ${l.agent_phone ? `<div class="xs muted" dir="ltr" style="margin-top:2px">${esc(l.agent_phone)}</div>` : ''}
            </div>
          </div>
          <div class="c-cta" style="margin-top:16px">
            ${wa
              ? `<a class="btn btn--wa" id="wa" href="${esc(wa)}" target="_blank" rel="noopener">💬 Contact on WhatsApp</a>`
              : `<button class="btn btn--wa" disabled aria-disabled="true"
                   title="WhatsApp contact is not available.">💬 Contact on WhatsApp</button>`}
            <button class="btn btn--primary" id="req">📩 Request Details</button>
            ${l.agent_phone ? `<a class="btn btn--outline" href="tel:${esc(String(l.agent_phone).replace(/\s/g, ''))}">📞 Call agent</a>` : ''}
          </div>
          <p class="xs muted" style="margin-top:12px">${wa
            ? "Your message is filled in automatically with this property's details — just press send."
            : 'WhatsApp contact is not available. Use Request Details and an agent will call you back.'}</p>
        </div>

        <div class="card">
          <h3 style="margin-bottom:12px">Share this property</h3>
          <div class="row" style="gap:8px">
            <button class="btn btn--outline grow" id="share2">📤 Share link</button>
          </div>
          <div class="xs muted" style="margin-top:10px;word-break:break-all" dir="ltr">${esc(propertyUrl(l))}</div>
        </div>
      </aside>
    </div>

    <div class="c-section" style="margin-top:28px">
      <h2>Similar properties</h2>
      <div id="related"></div>
    </div>

    <div class="c-stickybar">
      ${wa ? `<a class="btn btn--wa" href="${esc(wa)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
      <button class="btn btn--primary" id="req2">📩 Request Details</button>
    </div>`;

  view.querySelector('#gal').appendChild(gallery(l.images, l.title || 'Property'));
  view.querySelector('#back').onclick = () => goProperties();
  view.querySelector('#share').onclick = () => shareProperty(l);
  view.querySelector('#share2').onclick = () => shareProperty(l);
  view.querySelector('#req').onclick = () => openRequestForm(l);
  view.querySelector('#req2').onclick = () => openRequestForm(l);

  // related stock — same project, city or type; loaded after the main content
  loadAll().then(() => {
    const rel = all()
      .filter(x => (x.code || x.id) !== (l.code || l.id))
      .filter(x => (l.project && x.project === l.project) || x.city === l.city || x.ptype === l.ptype)
      .slice(0, 3);
    const target = view.querySelector('#related');
    if (!target) return;
    target.innerHTML = rel.length ? cardGrid(rel) : '<p class="muted small">No similar properties right now.</p>';
    refreshCardStates(view);
  }).catch(() => {});
}

/**
 * "Request details" — name, phone and an optional message. The property, its
 * ID, the assigned agent, the timestamp and the lead source are attached
 * server-side by rr_submit_property_request(), so the client types nothing but
 * their own contact details.
 */
export function openRequestForm(l) {
  const { el, close } = openModal({
    title: 'Request details',
    size: 'sm',
    body: `
      <p class="small muted" style="margin-bottom:16px">
        ${esc(l.title || 'Property')} · <b>${esc(l.code || l.id)}</b><br>
        An agent will contact you shortly.
      </p>
      <form novalidate class="col" style="gap:14px">
        <label class="field">
          <span class="field__label">Full name <span class="req">*</span></span>
          <input class="input" name="name" autocomplete="name" required placeholder="Your name">
          <span class="field__err"></span>
        </label>
        <label class="field">
          <span class="field__label">Phone number <span class="req">*</span></span>
          <input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required placeholder="01xxxxxxxxx">
          <span class="field__err"></span>
        </label>
        <label class="field">
          <span class="field__label">Message <span class="muted">(optional)</span></span>
          <textarea class="textarea" name="message" rows="3" maxlength="1000" placeholder="I'd like to schedule a viewing…"></textarea>
        </label>
        <div class="modal__actions">
          <button type="button" class="btn btn--outline" data-x>Cancel</button>
          <button type="submit" class="btn btn--primary" data-submit>Send request</button>
        </div>
      </form>`,
  });

  const form = el.querySelector('form');
  const btn = el.querySelector('[data-submit]');
  el.querySelector('[data-x]').onclick = close;
  setTimeout(() => form.querySelector('[name="name"]')?.focus(), 60);

  const fail = (input, msg) => {
    const field = input.closest('.field');
    field.classList.add('is-invalid');
    field.querySelector('.field__err').textContent = msg;
    input.focus();
  };

  form.querySelectorAll('.input, .textarea').forEach(inp => inp.addEventListener('input', () => {
    const field = inp.closest('.field');
    field.classList.remove('is-invalid');
    const err = field.querySelector('.field__err');
    if (err) err.textContent = '';
  }));

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nameEl = form.querySelector('[name="name"]');
    const phoneEl = form.querySelector('[name="phone"]');
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();

    if (name.length < 2) return fail(nameEl, 'Please enter your full name.');
    if (phone.replace(/\D/g, '').length < 7) return fail(phoneEl, 'Please enter a valid phone number.');

    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await submitRequest({
        property: l.code || l.id,
        name,
        phone,
        message: form.querySelector('[name="message"]').value.trim(),
        url: propertyUrl(l),
      });
      close();
      toast(res?.duplicate
        ? 'We already have your request — an agent will call you shortly.'
        : 'Request sent. An agent will contact you shortly.', 'success', 4500);
    } catch (err) {
      toast(err.message, 'error', 5000);
      btn.disabled = false;
      btn.textContent = 'Send request';
    }
  };
}
