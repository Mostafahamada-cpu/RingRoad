import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeId: string;
  onChange?: (id: string) => void;
  dir?: 'ltr' | 'rtl';
}

/**
 * @startingPoint section="Navigation" subtitle="Bottom tab bar with active pill" viewport="700x120"
 */
export function TabBar(props: TabBarProps): JSX.Element;
