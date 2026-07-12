import React from 'react';

export interface PropertyRecord {
  code: string;            // e.g. "A-101"
  address: string;
  price: string;           // pre-formatted, e.g. "2,500,000 EGP"
  icon?: string;           // emoji glyph
  status: 'available' | 'sold' | 'rented';
  statusLabel: string;     // bilingual, e.g. "متاح · Available"
  beds: React.ReactNode;
  baths: React.ReactNode;
  typeLabel: string;       // "بيع · Sale" / "إيجار · Rent"
  finish: string;          // "فاخر · Luxury"
  unit?: string;
  agent?: string;
  registered?: string;
}

export interface PropertyCardProps {
  property: PropertyRecord;
  expanded?: boolean;
  onToggle?: () => void;
  dir?: 'ltr' | 'rtl';
  /** Label overrides for the quick-info + detail rows (beds, baths, type, finish, unit, agent, registered) */
  t?: Record<string, string>;
}

/**
 * @startingPoint section="Property" subtitle="Expandable real-estate listing card" viewport="700x260"
 */
export function PropertyCard(props: PropertyCardProps): JSX.Element;
