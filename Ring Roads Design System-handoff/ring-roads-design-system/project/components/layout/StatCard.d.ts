import React from 'react';

export interface StatCardProps {
  value: React.ReactNode;
  label: string;
  /** Show the blue accent bar on the leading edge */
  accent?: boolean;
  dir?: 'ltr' | 'rtl';
  style?: React.CSSProperties;
}

export function StatCard(props: StatCardProps): JSX.Element;
