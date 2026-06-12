import { useState, useCallback } from 'react';

const SECTIONS = ['summary', 'materials', 'proposals', 'inventory', 'marketing', 'integrations', 'purchases', 'preferences'];

export default function useClientSections(initialSection = 'summary') {
  const [activeSection, setActiveSectionState] = useState(initialSection);
  const [loadedSections, setLoadedSections] = useState(() => new Set([initialSection]));

  const setActiveSection = useCallback((key) => {
    setActiveSectionState(key);
    setLoadedSections((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const isSectionLoaded = useCallback(
    (key) => loadedSections.has(key),
    [loadedSections],
  );

  const getSectionCounts = useCallback(
    ({ materials, proposals, inventory, integrations, purchases, preferences } = {}) => ({
      summary: null,
      materials: Array.isArray(materials) ? materials.length : 0,
      proposals: Array.isArray(proposals) ? proposals.length : 0,
      inventory: typeof inventory === 'number' ? inventory : 0,
      integrations: Array.isArray(integrations) ? integrations.length : 0,
      purchases: Array.isArray(purchases) ? purchases.length : 0,
      preferences: Array.isArray(preferences) ? preferences.length : 0,
    }),
    [],
  );

  return { activeSection, setActiveSection, isSectionLoaded, getSectionCounts };
}

export { SECTIONS };
