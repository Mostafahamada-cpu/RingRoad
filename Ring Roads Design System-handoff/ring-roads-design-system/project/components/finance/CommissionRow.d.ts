import React from 'react';

export interface CommissionRowProps {
  label: string;
  /** Optional percent shown between label and amount (default variant only) */
  percentage?: number | string;
  /** Pre-formatted amount, e.g. "8,800 EGP" */
  amount: React.ReactNode;
  /** default = line item, subtotal = tinted box, total = filled brand block */
  variant?: 'default' | 'subtotal' | 'total';
  dir?: 'ltr' | 'rtl';
}

export function CommissionRow(props: CommissionRowProps): JSX.Element;
