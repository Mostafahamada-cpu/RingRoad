import React from 'react';

export interface PanelProps {
  title?: string;
  /** Left (or right, in RTL) accent bar color role */
  accent?: 'accent' | 'brand' | 'success' | 'warning';
  children: React.ReactNode;
  dir?: 'ltr' | 'rtl';
  style?: React.CSSProperties;
}

/**
 * @startingPoint section="Layout" subtitle="White card with accent bar & title" viewport="700x220"
 */
export function Panel(props: PanelProps): JSX.Element;
