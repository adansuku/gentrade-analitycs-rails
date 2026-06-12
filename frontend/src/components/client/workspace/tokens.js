export const tokens = {
  // Colors — mapped to premium system (index.css CSS variables)
  canvas: 'var(--bg-secondary)',
  surface: 'var(--bg-primary)',
  surfaceAlt: 'var(--bg-tertiary)',
  surfaceHover: 'var(--bg-tertiary)',
  border: 'var(--border-light)',
  borderSoft: 'var(--border-subtle)',
  borderStrong: 'var(--border-medium)',
  ink: 'var(--text-primary)',
  inkSoft: 'var(--text-secondary)',
  inkMuted: 'var(--text-muted)',
  accent: 'var(--accent-primary)',
  accentSoft: 'var(--accent-primary-ghost)',
  accentInk: 'var(--accent-primary-dark)',
  danger: 'var(--accent-error)',

  // Radius and space kept as JS numbers — template literals like
  // `${tokens.space[2]}px` require numeric values, not CSS strings.
  // Values match the CSS variables in index.css.
  radius: { sm: 6, md: 10, lg: 14 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 48 },

  // Layout constants — JS numbers (used in layout logic, not CSS)
  sidebarWidth: 288,
  topbarHeight: 56,
  mainMaxWidth: 960,
  breakpoint: 1024,

  sidebarShadow: 'var(--shadow-sm)',
  focusRing: `0 0 0 2px #ffffff, 0 0 0 4px var(--accent-primary)`,
};

export default tokens;
