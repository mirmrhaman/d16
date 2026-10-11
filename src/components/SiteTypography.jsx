import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TYPOGRAPHY_ID } from '../../server/src/typographySchema.js';
import { typographyCss, typographyRulesForPage, applyTypographyTextMatches } from '@/data/typography';

export default function SiteTypography({ pathname, rootRef }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['websiteTypography'], queryFn: () => base44.entities.WebsiteTypography.list(), staleTime: 30000 });
  const record = data?.find((entry) => entry.id === TYPOGRAPHY_ID) || data?.[0];
  const rules = useMemo(() => typographyRulesForPage(record, pathname), [record, pathname]);
  const css = useMemo(() => typographyCss(record, pathname), [record, pathname]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.toggleAttribute('data-d16-typography-active', rules.some((rule) => Object.keys(rule.style).length > 0));
    root.toggleAttribute('data-d16-typography-metrics', rules.some((rule) => rule.style.fontSize || rule.style.lineHeight || rule.style.letterSpacing));
    const update = () => applyTypographyTextMatches(root, rules);
    update();
    if (!rules.some((rule) => rule.text)) return undefined;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; if (root.isConnected) update(); });
    });
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [rules, rootRef]);
  useEffect(() => {
    const refresh = (event) => {
      if (event.type !== 'storage' || event.key === 'd16_website_typography_demo_v2' || event.key === null) queryClient.invalidateQueries({ queryKey: ['websiteTypography'] });
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('d16-typography-refresh', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('d16-typography-refresh', refresh); };
  }, [queryClient]);
  return css ? <style data-d16-typography-styles>{css}</style> : null;
}
