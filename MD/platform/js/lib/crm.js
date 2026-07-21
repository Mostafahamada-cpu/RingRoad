// CRM domain: clients, deals, follow-ups. RLS enforces visibility server-side
// (agent = own, leader = team, mgmt = all); the client simply loads what it gets.
import { db } from './supabase.js';
import { t } from './i18n.js';
import { WON_STAGES } from '../config.js';

export const loadClients   = () => db.list('clients', 'select=*&order=created_at.desc');
export const loadDeals     = () => db.list('deals', 'select=*&order=created_at.desc');
export const loadFollowups = () => db.list('followups', 'select=*&order=due_at.asc');

export const clientStageLabel = (s) => t(s) || s;
export const dealStageLabel = (s) => (s === 'closed' ? t('won') : t(s)) || s;
export const isWon = (d) => WON_STAGES.includes(d.stage);
export const isLost = (d) => d.stage === 'lost';
export const isOpen = (d) => !isWon(d) && !isLost(d);
export const dealCommission = (d) => (Number(d.value) || 0) * (Number(d.commission_pct) || 0) / 100;

// "active" client = not yet signed / not dead
export const isActiveClient = (c) => c.stage !== 'contract_signed';

export function dueBucket(f) {
  const now = new Date();
  const due = new Date(f.due_at);
  const sameDay = due.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  if (f.done) return 'completed';
  if (sameDay) return 'dueToday';
  return due < now ? 'overdue' : 'upcoming';
}
export const isDueToday = (f) => !f.done && dueBucket(f) === 'dueToday';
