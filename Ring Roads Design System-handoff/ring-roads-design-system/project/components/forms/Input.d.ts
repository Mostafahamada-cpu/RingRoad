import React from 'react';

export interface InputProps {
  /** Field label (bilingual copy allowed, e.g. "المبلغ · Amount") */
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Trailing unit/adornment, e.g. "%" or "جنيه" */
  suffix?: React.ReactNode;
  type?: string;
  /** Text direction — set "rtl" for Arabic-only content */
  dir?: 'ltr' | 'rtl';
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * @startingPoint section="Forms" subtitle="Labeled input with focus ring & suffix" viewport="700x140"
 */
export function Input(props: InputProps): JSX.Element;
