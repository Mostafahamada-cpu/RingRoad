// Favorites — everything saved on this device. No account, no sync, no login.
import { esc } from '../lib/format.js';
import { loadAll, resolveMany } from '../lib/catalog.js';
import { favorites, clearFavorites } from '../lib/store.js';
import { emptyState, skeletonGrid, toast } from '../lib/ui.js';
import { cardGrid } from '../components/card.js';
import { hrefFor } from '../lib/router.js';

export async function pageFavorites(view) {
  view.innerHTML = `
    <div class="c-head">
      <h1>Favorites</h1>
      <p>Saved on this device — they will still be here next time you visit.</p>
    </div>
    <div id="fav-body">${skeletonGrid(3)}</div>`;

  const body = view.querySelector('#fav-body');

  function paint() {
    const keys = favorites();
    const rows = resolveMany(keys);

    if (!rows.length) {
      body.innerHTML = emptyState({
        icon: '🤍',
        title: 'No saved properties yet.',
        text: 'Tap the heart on any property to keep it here.',
        actionHtml: `<a class="btn btn--primary" href="${esc(hrefFor({ name: 'properties' }))}" data-route="properties">Browse properties</a>`,
      });
      return;
    }

    // A saved property that is no longer published simply drops out of the list.
    const missing = keys.length - rows.length;
    body.innerHTML = `
      <div class="c-resultbar">
        <span><b>${rows.length}</b> saved ${rows.length === 1 ? 'property' : 'properties'}${missing ? ` · ${missing} no longer available` : ''}</span>
        <button class="btn btn--ghost btn--sm" id="clear-favs">Clear all</button>
      </div>
      ${cardGrid(rows)}`;

    body.querySelector('#clear-favs').onclick = () => {
      clearFavorites();
      toast('Favorites cleared.', 'info', 1800);
    };
  }

  try {
    await loadAll();
    paint();
  } catch (err) {
    body.innerHTML = emptyState({ icon: '⚠️', title: 'Could not load your favorites', text: err.message });
    return;
  }

  // repaint whenever a heart is toggled from a card on this page
  view.addEventListener('rr:staterefresh', paint);
}
