import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  /** primary = filled brand blue, secondary = blue tint, ghost = text only */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon/emoji node */
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * @startingPoint section="Actions" subtitle="Filled, tint & ghost buttons" viewport="700x160"
 */
export function Button(props: ButtonProps): JSX.Element;
