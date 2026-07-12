import React from 'react';

export interface StatusBadgeProps {
  /** available = green, sold = red, rented/other = amber */
  status?: 'available' | 'sold' | 'rented';
  /** Bilingual label text, e.g. "متاح · Available" */
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function StatusBadge(props: StatusBadgeProps): JSX.Element;
