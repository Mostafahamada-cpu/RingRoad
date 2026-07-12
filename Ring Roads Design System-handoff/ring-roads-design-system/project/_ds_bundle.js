/* @ds-bundle: {"format":4,"namespace":"RingRoadsDesignSystem_ef90d6","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"CommissionRow","sourcePath":"components/finance/CommissionRow.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Panel","sourcePath":"components/layout/Panel.jsx"},{"name":"StatCard","sourcePath":"components/layout/StatCard.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"PropertyCard","sourcePath":"components/property/PropertyCard.jsx"},{"name":"StatusBadge","sourcePath":"components/property/StatusBadge.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"ddd8df0e45d3","components/finance/CommissionRow.jsx":"ac0d52c36396","components/forms/Input.jsx":"b15ef3bc46f3","components/layout/Panel.jsx":"328d44e9fc4d","components/layout/StatCard.jsx":"14a8cd342b29","components/navigation/TabBar.jsx":"92e3b683e237","components/property/PropertyCard.jsx":"29b77855c721","components/property/StatusBadge.jsx":"d1947878f016","ui_kits/mobile-app/Commission.jsx":"31bd4a5d904c","ui_kits/mobile-app/Dashboard.jsx":"0bdcf6d12643","ui_kits/mobile-app/data.js":"3d89cc8fd415"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RingRoadsDesignSystem_ef90d6 = window.RingRoadsDesignSystem_ef90d6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Ring Roads Button — the app's primary action & tab-style control.
 * Variants: primary (filled blue), secondary (blue tint), ghost (text only).
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  fullWidth = false,
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '8px 14px',
      fontSize: 'var(--text-sm)'
    },
    md: {
      padding: '12px 18px',
      fontSize: 'var(--text-body)'
    },
    lg: {
      padding: '14px 22px',
      fontSize: 'var(--text-h3)'
    }
  };
  const variants = {
    primary: {
      background: 'var(--brand)',
      color: 'var(--text-on-brand)',
      border: '1px solid var(--brand)'
    },
    secondary: {
      background: 'var(--surface-tint)',
      color: 'var(--brand)',
      border: '1px solid var(--blue-100)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--brand-accent)',
      border: '1px solid transparent'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      transition: 'filter 0.15s ease, transform 0.05s ease',
      ...sizes[size],
      ...variants[variant],
      ...style
    },
    onMouseDown: e => !disabled && (e.currentTarget.style.transform = 'scale(0.98)'),
    onMouseUp: e => e.currentTarget.style.transform = 'scale(1)',
    onMouseLeave: e => e.currentTarget.style.transform = 'scale(1)'
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: '1.1em',
      lineHeight: 1
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/finance/CommissionRow.jsx
try { (() => {
/**
 * Ring Roads CommissionRow — one line in the commission breakdown.
 * label · optional percentage · computed amount. Use `variant="total"`
 * for the grand-total emphasis row (filled brand block).
 */
function CommissionRow({
  label,
  percentage,
  amount,
  variant = 'default',
  dir = 'ltr'
}) {
  if (variant === 'total') {
    return /*#__PURE__*/React.createElement("div", {
      dir: dir,
      style: {
        background: 'var(--brand)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-4)',
        fontFamily: 'var(--font-sans)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-xs)',
        color: 'var(--blue-200)',
        marginBottom: 'var(--space-2)'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-display)',
        fontWeight: 'var(--weight-bold)',
        color: 'var(--text-on-brand)'
      }
    }, amount));
  }
  if (variant === 'subtotal') {
    return /*#__PURE__*/React.createElement("div", {
      dir: dir,
      style: {
        background: 'var(--surface-app)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3)',
        borderInlineStart: '4px solid var(--border-accent)',
        fontFamily: 'var(--font-sans)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-1)'
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-h2)',
        fontWeight: 'var(--weight-bold)',
        color: 'var(--brand)'
      }
    }, amount));
  }
  return /*#__PURE__*/React.createElement("div", {
    dir: dir,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-2)',
      padding: 'var(--space-3) 0',
      borderBottom: '1px solid var(--border-default)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)'
    }
  }, label), percentage != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-accent)',
      minWidth: 40,
      textAlign: 'end'
    }
  }, percentage, "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--brand)',
      minWidth: 110,
      textAlign: 'end'
    }
  }, amount));
}
Object.assign(__ds_scope, { CommissionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/finance/CommissionRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Ring Roads Input — labeled text field used across the commission calculator.
 * Bilingual-ready: pass any label; set dir="rtl" for Arabic contexts.
 */
function Input({
  label,
  value,
  onChange,
  placeholder = '',
  suffix = null,
  type = 'text',
  dir = 'ltr',
  disabled = false,
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    dir: dir,
    disabled: disabled,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-body)',
      color: 'var(--text-body)',
      background: 'var(--surface-app)',
      border: `1px solid ${focused ? 'var(--border-accent)' : 'var(--border-default)'}`,
      boxShadow: focused ? '0 0 0 3px var(--blue-100)' : 'none',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      paddingInlineEnd: suffix ? '40px' : '12px',
      outline: 'none',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      insetInlineEnd: '12px',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-muted)',
      pointerEvents: 'none'
    }
  }, suffix)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/layout/Panel.jsx
try { (() => {
/**
 * Ring Roads Panel — the app's white content card with a colored left accent bar.
 * Used to group form sections and results. Accent maps to a semantic role.
 */
function Panel({
  title,
  accent = 'accent',
  children,
  dir = 'ltr',
  style = {}
}) {
  const accents = {
    accent: 'var(--border-accent)',
    brand: 'var(--brand)',
    success: 'var(--success)',
    warning: 'var(--warning)'
  };
  const borderSide = dir === 'rtl' ? 'borderRight' : 'borderLeft';
  return /*#__PURE__*/React.createElement("section", {
    dir: dir,
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-4)',
      [borderSide]: `4px solid ${accents[accent]}`,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: `0 0 var(--space-4)`,
      fontSize: 'var(--text-h3)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-heading)'
    }
  }, title), children);
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Panel.jsx", error: String((e && e.message) || e) }); }

// components/layout/StatCard.jsx
try { (() => {
/**
 * Ring Roads StatCard — compact metric tile from the dashboard stats row.
 * White card, accent left bar, big blue value over a muted label.
 */
function StatCard({
  value,
  label,
  accent = true,
  dir = 'ltr',
  style = {}
}) {
  const borderSide = dir === 'rtl' ? 'borderRight' : 'borderLeft';
  return /*#__PURE__*/React.createElement("div", {
    dir: dir,
    style: {
      flex: 1,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-stat)',
      padding: 'var(--space-3)',
      textAlign: 'center',
      [borderSide]: accent ? '4px solid var(--border-accent)' : 'none',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-h1)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--brand)',
      marginBottom: 'var(--space-1)',
      lineHeight: 'var(--leading-tight)'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--leading-snug)'
    }
  }, label));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
/**
 * Ring Roads bottom tab bar — the app's primary navigation.
 * Active tab fills with brand blue; inactive tabs sit on a tint pill.
 */
function TabBar({
  tabs = [],
  activeId,
  onChange,
  dir = 'ltr'
}) {
  return /*#__PURE__*/React.createElement("nav", {
    dir: dir,
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      padding: 'var(--space-2)',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-default)',
      fontFamily: 'var(--font-sans)'
    }
  }, tabs.map(tab => {
    const active = tab.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      type: "button",
      onClick: () => onChange && onChange(tab.id),
      style: {
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-semibold)',
        background: active ? 'var(--brand)' : 'var(--surface-app)',
        color: active ? 'var(--text-on-brand)' : 'var(--text-muted)',
        transition: 'background 0.15s ease, color 0.15s ease'
      }
    }, tab.icon && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, tab.icon), tab.label);
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/property/StatusBadge.jsx
try { (() => {
/**
 * Ring Roads StatusBadge — property state pill.
 * available = green, sold = red, rented (or other) = amber.
 */
function StatusBadge({
  status = 'available',
  children,
  style = {}
}) {
  const map = {
    available: {
      color: 'var(--success)',
      bg: 'var(--success-bg)'
    },
    sold: {
      color: 'var(--error)',
      bg: 'var(--error-bg)'
    },
    rented: {
      color: 'var(--warning)',
      bg: 'var(--warning-bg)'
    }
  };
  const tone = map[status] || map.available;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-semibold)',
      color: tone.color,
      background: tone.bg,
      padding: '4px 8px',
      borderRadius: 'var(--radius-xs)',
      lineHeight: 1,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/property/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/property/PropertyCard.jsx
try { (() => {
/**
 * Ring Roads PropertyCard — expandable listing card from the dashboard.
 * Header (icon + code + address, price + status), a quick-info row of stats,
 * and expandable detail rows. Fully bilingual via the `property` fields and `t` labels.
 */
function PropertyCard({
  property,
  expanded = false,
  onToggle,
  dir = 'ltr',
  t = {}
}) {
  const labels = {
    beds: t.beds ?? 'Beds',
    baths: t.baths ?? 'Baths',
    type: t.type ?? 'Type',
    finish: t.finish ?? 'Finish',
    unit: t.unit ?? 'Unit',
    agent: t.agent ?? 'Agent',
    registered: t.registered ?? 'Registered',
    ...t
  };
  const statusOrder = {
    available: 'available',
    sold: 'sold',
    rented: 'rented'
  };
  const detailRows = [[labels.unit, property.unit], [labels.agent, property.agent], [labels.registered, property.registered]];
  return /*#__PURE__*/React.createElement("article", {
    dir: dir,
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      border: `${expanded ? 2 : 1}px solid ${expanded ? 'var(--border-accent)' : 'var(--border-default)'}`,
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)',
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--border-default)',
      cursor: 'pointer',
      textAlign: dir === 'rtl' ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: '28px',
      lineHeight: 1
    }
  }, property.icon || '🏠'), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-body)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-heading)'
    }
  }, property.code), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, property.address))), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: dir === 'rtl' ? 'left' : 'right',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--brand)',
      marginBottom: 'var(--space-1)'
    }
  }, property.price), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: statusOrder[property.status] || 'available'
  }, property.statusLabel))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--surface-app)',
      borderBottom: '1px solid var(--border-default)'
    }
  }, [[labels.beds, property.beds], [labels.baths, property.baths], [labels.type, property.typeLabel], [labels.finish, property.finish]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-muted)',
      marginBottom: '2px'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--brand)'
    }
  }, v)))), expanded && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-2) var(--space-4)',
      background: 'var(--surface-app)'
    }
  }, detailRows.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: 'var(--space-2) 0',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-muted)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-heading)'
    }
  }, v)))));
}
Object.assign(__ds_scope, { PropertyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/property/PropertyCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/Commission.jsx
try { (() => {
// Ring Roads — Commission calculator screen. Composes Panel, Input, CommissionRow.
function Commission({
  lang
}) {
  const {
    Panel,
    Input,
    CommissionRow
  } = window.RingRoadsDesignSystem_ef90d6;
  const {
    t,
    fmt
  } = window.RR_DATA;
  const L = t[lang];
  const [buyer, setBuyer] = React.useState('30000');
  const [seller, setSeller] = React.useState('50000');
  const [pBuyer, setPBuyer] = React.useState('11');
  const [pSeller, setPSeller] = React.useState('11');
  const [pInsp, setPInsp] = React.useState('5');
  const [pMgr, setPMgr] = React.useState('2');
  const num = v => parseFloat(v) || 0;
  const totalMoney = num(buyer) + num(seller);
  const calc = p => num(p) / 100 * totalMoney;
  const money = n => `${fmt(Math.round(n))} ${L.currency}`;
  const rows = [{
    l: L.buyerAgent,
    p: pBuyer
  }, {
    l: L.sellerAgent,
    p: pSeller
  }, {
    l: L.inspection,
    p: pInsp
  }, {
    l: L.manager,
    p: pMgr
  }];
  const totalComm = rows.reduce((s, r) => s + calc(r.p), 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: L.amounts,
    accent: "accent",
    dir: L.dir
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: L.buyerAmount,
    value: buyer,
    onChange: setBuyer,
    suffix: L.currency,
    dir: L.dir
  }), /*#__PURE__*/React.createElement(Input, {
    label: L.sellerAmount,
    value: seller,
    onChange: setSeller,
    suffix: L.currency,
    dir: L.dir
  }))), /*#__PURE__*/React.createElement(Panel, {
    title: L.percents,
    accent: "accent",
    dir: L.dir
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: L.buyerAgent,
    value: pBuyer,
    onChange: setPBuyer,
    suffix: "%",
    dir: L.dir
  }), /*#__PURE__*/React.createElement(Input, {
    label: L.sellerAgent,
    value: pSeller,
    onChange: setPSeller,
    suffix: "%",
    dir: L.dir
  }), /*#__PURE__*/React.createElement(Input, {
    label: L.inspection,
    value: pInsp,
    onChange: setPInsp,
    suffix: "%",
    dir: L.dir
  }), /*#__PURE__*/React.createElement(Input, {
    label: L.manager,
    value: pMgr,
    onChange: setPMgr,
    suffix: "%",
    dir: L.dir
  }))), /*#__PURE__*/React.createElement(Panel, {
    title: L.results,
    accent: "success",
    dir: L.dir
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(CommissionRow, {
    variant: "subtotal",
    label: L.txnTotal,
    amount: money(totalMoney),
    dir: L.dir
  }), /*#__PURE__*/React.createElement("div", null, rows.map((r, i) => /*#__PURE__*/React.createElement(CommissionRow, {
    key: i,
    label: r.l,
    percentage: r.p,
    amount: money(calc(r.p)),
    dir: L.dir
  }))), /*#__PURE__*/React.createElement(CommissionRow, {
    variant: "total",
    label: L.totalComm,
    amount: money(totalComm),
    dir: L.dir
  }))));
}
window.Commission = Commission;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/Commission.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/Dashboard.jsx
try { (() => {
// Ring Roads — Dashboard screen. Composes PropertyCard, StatCard, StatusBadge.
function Dashboard({
  lang
}) {
  const {
    PropertyCard,
    StatCard
  } = window.RingRoadsDesignSystem_ef90d6;
  const {
    properties,
    t,
    fmt
  } = window.RR_DATA;
  const L = t[lang];
  const [openId, setOpenId] = React.useState(1);
  const price = p => p.type === 'rent' ? `${fmt(p.price)} ${L.currency}${L.month}` : `${fmt(p.price)} ${L.currency}`;
  const statusLabel = {
    available: L.statusAvailable,
    sold: L.statusSold,
    rented: L.statusRented
  };
  const stats = [{
    v: properties.length,
    l: L.total
  }, {
    v: properties.filter(p => p.status === 'available').length,
    l: L.available
  }, {
    v: properties.filter(p => p.type === 'sale').length,
    l: L.forSale
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)'
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement(StatCard, {
    key: i,
    value: s.v,
    label: s.l,
    dir: L.dir
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: '0 var(--space-4) var(--space-4)'
    }
  }, properties.map(p => /*#__PURE__*/React.createElement(PropertyCard, {
    key: p.id,
    dir: L.dir,
    expanded: openId === p.id,
    onToggle: () => setOpenId(openId === p.id ? null : p.id),
    t: {
      beds: L.beds,
      baths: L.baths,
      type: L.type,
      finish: L.finish,
      unit: L.unit,
      agent: L.agent,
      registered: L.registered
    },
    property: {
      code: p.code,
      icon: p.icon,
      status: p.status,
      statusLabel: statusLabel[p.status],
      address: p.address[lang],
      price: price(p),
      beds: p.beds,
      baths: p.baths,
      typeLabel: p.type === 'rent' ? L.rent : L.sale,
      finish: p.finish[lang],
      unit: p.unit[lang],
      agent: p.agent[lang],
      registered: p.registered
    }
  }))));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/data.js
try { (() => {
// Ring Roads UI-kit sample data + bilingual strings. Registers on window.
window.RR_DATA = {
  properties: [{
    id: 1,
    code: 'A-101',
    icon: '🏠',
    status: 'available',
    address: {
      en: 'Sheikh Zayed, Giza',
      ar: 'الشيخ زايد، الجيزة'
    },
    price: 2500000,
    type: 'sale',
    beds: 3,
    baths: 2,
    finish: {
      en: 'Luxury',
      ar: 'فاخر'
    },
    unit: {
      en: 'Apt 1',
      ar: 'شقة 1'
    },
    agent: {
      en: 'M. Ahmed',
      ar: 'محمد أحمد'
    },
    registered: '2024-01-15'
  }, {
    id: 2,
    code: 'B-202',
    icon: '🏢',
    status: 'available',
    address: {
      en: 'Maadi, Cairo',
      ar: 'المعادي، القاهرة'
    },
    price: 3200000,
    type: 'sale',
    beds: 4,
    baths: 3,
    finish: {
      en: 'Core & shell',
      ar: 'خام'
    },
    unit: {
      en: 'Apt 2',
      ar: 'شقة 2'
    },
    agent: {
      en: 'F. Mahmoud',
      ar: 'فاطمة محمود'
    },
    registered: '2024-02-10'
  }, {
    id: 3,
    code: 'C-303',
    icon: '🏘️',
    status: 'sold',
    address: {
      en: 'Nile Corniche, Cairo',
      ar: 'النيل، القاهرة'
    },
    price: 1800000,
    type: 'sale',
    beds: 2,
    baths: 1,
    finish: {
      en: 'Classic',
      ar: 'كلاسيكي'
    },
    unit: {
      en: 'Apt 3',
      ar: 'شقة 3'
    },
    agent: {
      en: 'A. Khalil',
      ar: 'علي خليل'
    },
    registered: '2023-11-20'
  }, {
    id: 4,
    code: 'D-404',
    icon: '🏙️',
    status: 'rented',
    address: {
      en: 'Rehab City, Cairo',
      ar: 'الرحاب، القاهرة'
    },
    price: 45000,
    type: 'rent',
    beds: 3,
    baths: 2,
    finish: {
      en: 'Modern',
      ar: 'حديث'
    },
    unit: {
      en: 'Apt 4',
      ar: 'شقة 4'
    },
    agent: {
      en: 'S. Ali',
      ar: 'سارة علي'
    },
    registered: '2024-03-01'
  }],
  t: {
    en: {
      dir: 'ltr',
      brand: 'Ring Roads',
      dashboard: 'Dashboard',
      commission: 'Commission',
      subtitleDash: 'Property portfolio',
      subtitleComm: 'Calculate commissions with ease',
      total: 'Total',
      available: 'Available',
      forSale: 'For sale',
      beds: 'Beds',
      baths: 'Baths',
      type: 'Type',
      finish: 'Finish',
      unit: 'Unit',
      agent: 'Agent',
      registered: 'Registered',
      sale: 'Sale',
      rent: 'Rent',
      month: '/mo',
      currency: 'EGP',
      statusAvailable: 'Available',
      statusSold: 'Sold',
      statusRented: 'Rented',
      amounts: 'Transaction amounts',
      percents: 'Commission rates',
      results: 'Results',
      buyerAmount: 'Buyer amount',
      sellerAmount: 'Seller amount',
      buyerAgent: 'Buyer agent',
      sellerAgent: 'Seller agent',
      inspection: 'Inspection',
      manager: 'Deal manager',
      txnTotal: 'Transaction total',
      totalComm: 'Total commission'
    },
    ar: {
      dir: 'rtl',
      brand: 'رينج رودز',
      dashboard: 'العقارات',
      commission: 'العمولات',
      subtitleDash: 'لوحة العقارات',
      subtitleComm: 'احسب العمولات بسهولة',
      total: 'إجمالي',
      available: 'متاح',
      forSale: 'للبيع',
      beds: 'غرف',
      baths: 'حمام',
      type: 'نوع',
      finish: 'تشطيب',
      unit: 'الوحدة',
      agent: 'الوكيل',
      registered: 'التسجيل',
      sale: 'بيع',
      rent: 'إيجار',
      month: '/شهر',
      currency: 'جنيه',
      statusAvailable: 'متاح',
      statusSold: 'مباع',
      statusRented: 'مؤجر',
      amounts: 'مبالغ المعاملة',
      percents: 'النسب المئوية',
      results: 'النتائج',
      buyerAmount: 'مبلغ المشتري',
      sellerAmount: 'مبلغ البائع',
      buyerAgent: 'وكيل المشتري',
      sellerAgent: 'وكيل البائع',
      inspection: 'الفحص',
      manager: 'مدير الصفقة',
      txnTotal: 'إجمالي المعاملة',
      totalComm: 'إجمالي العمولات'
    }
  },
  fmt(n) {
    return n.toLocaleString('en-US');
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CommissionRow = __ds_scope.CommissionRow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.PropertyCard = __ds_scope.PropertyCard;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

})();
