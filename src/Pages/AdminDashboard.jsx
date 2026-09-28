import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUp, GripVertical, RotateCcw, Save, Settings2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { servicesClient } from '@/api/servicesClient';
import { statsClient } from '@/api/statsClient';
import { projectsClient } from '@/api/projectsClient';
import { blogPostsClient } from '@/api/blogPostsClient';
import { DASHBOARD_LAYOUT_ID, DEFAULT_DASHBOARD_LAYOUT } from '@/data/siteAppearance';
import { normalizeDashboardOrder, moveDashboardCard, dropDashboardCard, sortDashboardOrder } from '@/data/dashboardOrder';
import SiteIcon from '@/components/SiteIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CARDS = [
  { key: 'AdminAbout', title: 'About Us & Team', description: 'Edit About Us, philosophy, approach, mission, vision and skilled team', icon: 'BookOpen', color: 'bg-[var(--primary)]' },
  { key: 'AdminHistory', title: 'Change History', description: 'Who changed what, with date, time and record identity', icon: 'ShieldCheck', color: 'bg-[var(--primary)]' },
  { key: 'AdminHeroSlides', title: 'Hero Slides', description: 'Manage homepage hero carousel images and content', icon: 'Image', countKey: 'heroSlides', color: 'bg-[var(--primary)]' },
  { key: 'AdminStats', title: 'Statistics', description: 'Update company stats shown on homepage', icon: 'BarChart3', countKey: 'stats', color: 'bg-[var(--accent)]' },
  { key: 'AdminServices', title: 'Services', description: 'Add and edit service offerings', icon: 'Briefcase', countKey: 'services', color: 'bg-[var(--primary-dark)]' },
  { key: 'AdminProjects', title: 'Projects', description: 'Manage portfolio projects and galleries', icon: 'FolderOpen', countKey: 'projects', color: 'bg-[var(--accent)]' },
  { key: 'AdminGallery', title: 'Gallery', description: 'Manage gallery videos and design concepts', icon: 'Images', countKey: 'gallery', color: 'bg-[var(--accent)]' },
  { key: 'AdminPicYourConcept', title: 'Pic Your Concept', description: 'Manage furniture concept items and detail pages', icon: 'Images', countKey: 'picYourConcept', color: 'bg-[var(--primary)]' },
  { key: 'AdminBlog', title: 'Blog Posts', description: 'Create and manage blog content', icon: 'BookOpen', countKey: 'blogPosts', color: 'bg-[var(--accent-dark)]' },
  { key: 'AdminConsultations', title: 'Consultations', description: 'View and manage consultation requests', icon: 'MessageSquare', countKey: 'consultations', color: 'bg-[var(--accent)]' },
  { key: 'AdminContactInfo', title: 'Contact Info', description: 'Update contact details and locations', icon: 'Phone', color: 'bg-[var(--primary-dark)]' },
  { key: 'AdminLogo', title: 'Logo Management', description: 'Update website logo used across header and footer', icon: 'Image', color: 'bg-[var(--accent-dark)]' },
  { key: 'AdminLocations', title: 'Locations', description: 'Update office cities shown in the footer', icon: 'MapPin', color: 'bg-[var(--accent-dark)]' },
  { key: 'AdminSocialMedia', title: 'Social Media Links', description: "Update the website's social media destinations", icon: 'Share2', color: 'bg-[var(--primary-dark)]' },
  { key: 'AdminTheme', title: 'Theme Color', description: "Change the site's base brand color", icon: 'Palette', color: 'bg-[var(--primary)]' },
  { key: 'AdminUsers', title: 'User Management', description: 'Verify emails and assign Admin/Super roles', icon: 'UserCog', color: 'bg-[var(--primary-dark)]' },
  { key: 'AdminAccessControl', title: 'Super User Access', description: 'Choose which sections Super Users can edit', icon: 'ShieldCheck', color: 'bg-[var(--primary)]' },
  { key: 'AdminIcons', title: 'Website Icons', description: 'Choose consistent icons for the website and dashboard', icon: 'Sparkles', color: 'bg-[var(--accent)]' },
  { key: 'AdminNavigation', title: 'Website Tabs', description: 'Add, rename, reorder, show or hide links to existing website pages', icon: 'FolderOpen', color: 'bg-[var(--primary)]' },
];
const CARD_BY_KEY = new Map(CARDS.map((card) => [card.key, card]));
const DRAG_TYPE = 'application/x-d16-dashboard-card';
const readRecord = (records) => records?.find((record) => record.id === DASHBOARD_LAYOUT_ID) || records?.[0] || null;
const orderFor = (record) => normalizeDashboardOrder(record?.card_order, CARDS);
const sameOrder = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function DashboardCardContent({ card, count }) {
  return <>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className={'rounded-lg p-2.5 sm:p-3 ' + card.color}><SiteIcon iconKey={'dashboard.' + card.key} fallback={card.icon} size={20} className="text-white" /></div>
        {typeof count === 'number' && <div className="text-right"><div className="text-2xl font-bold text-gray-900 sm:text-3xl">{count}</div><div className="text-xs text-gray-500 sm:text-sm">{count === 1 ? 'item' : 'items'}</div></div>}
      </div>
      <CardTitle className="mt-3 text-lg sm:mt-4 sm:text-xl">{card.title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="mb-3 line-clamp-2 text-sm text-gray-600 sm:mb-4 sm:text-base">{card.description}</p>
      <span className="flex items-center text-sm font-semibold text-[var(--primary)] sm:text-base">Manage <ArrowRight className="ml-2" size={16} aria-hidden="true" /></span>
    </CardContent>
  </>;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const layoutQuery = useQuery({ queryKey: ['dashboardLayout'], queryFn: () => base44.entities.DashboardLayout.list(), staleTime: 30000 });
  const [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState({});
  const [arranging, setArranging] = useState(false);
  const [draftOrder, setDraftOrder] = useState([]);
  const [baselineOrder, setBaselineOrder] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [reloading, setReloading] = useState(false);
  const [draggedKey, setDraggedKey] = useState('');
  const [dropTarget, setDropTarget] = useState('');
  const dragSource = useRef('');
  const record = readRecord(layoutQuery.data);
  const savedOrder = orderFor(record);
  const dirty = arranging && !sameOrder(draftOrder, baselineOrder);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const [heroSlides, statsData, services, projects, blogPosts, consultations, galleryVideos, galleryConcepts, picYourConcept] = await Promise.all([
          base44.entities.HeroSlide.list(), statsClient.list(), servicesClient.list(), projectsClient.list(), blogPostsClient.list(),
          base44.entities.Consultation.list(), base44.entities.GalleryVideo.list(), base44.entities.GalleryConcept.list(), base44.entities.PicYourConcept.list(),
        ]);
        if (!cancelled) setStats({ heroSlides: heroSlides.length, stats: statsData.length, services: services.length, projects: projects.length, blogPosts: blogPosts.length, consultations: consultations.length, gallery: galleryVideos.length + galleryConcepts.length, picYourConcept: picYourConcept.length });
      } catch (error) { if (!cancelled) setLoadError(error.message); }
    };
    loadStats();
    return () => { cancelled = true; };
  }, []);

  const save = useMutation({
    mutationFn: async ({ order, original }) => {
      const payload = { ...DEFAULT_DASHBOARD_LAYOUT, card_order: order };
      const saved = original?.id
        ? await base44.entities.DashboardLayout.update(original.id, { ...payload, ...(original.version != null ? { version: original.version } : {}) })
        : await base44.entities.DashboardLayout.create({ ...payload, id: DASHBOARD_LAYOUT_ID });
      if (!saved?.id || !Array.isArray(saved.card_order)) throw new Error('The server did not confirm the saved layout.');
      return saved;
    },
    onSuccess: (saved) => {
      const order = orderFor(saved);
      setEditRecord(saved); setDraftOrder(order); setBaselineOrder(order);
      queryClient.setQueryData(['dashboardLayout'], [saved]);
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      setSaveError(''); setStatus(IS_DEMO ? 'Card order saved in this browser preview.' : 'Card order saved for all administrators.');
    },
    onError: (error) => {
      setStatus('');
      setSaveError(error.status === 409 ? 'Another administrator saved a newer layout. Your arrangement is still here. Reload the saved version before trying again.' : 'Could not save the layout: ' + error.message + ' Your arrangement is still here.');
      if (error.status === 409) queryClient.invalidateQueries({ queryKey: ['dashboardLayout'] });
    },
  });
  const busy = save.isPending || reloading;
  const remoteChanged = arranging && (record?.id !== editRecord?.id || record?.version !== editRecord?.version || !sameOrder(savedOrder, baselineOrder));

  useEffect(() => {
    if (!dirty && !save.isPending) return;
    const warnOnClose = (event) => { event.preventDefault(); event.returnValue = ''; };
    const warnOnNavigate = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (save.isPending || !window.confirm('Leave without saving your dashboard arrangement?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warnOnClose); document.addEventListener('click', warnOnNavigate, true);
    return () => { window.removeEventListener('beforeunload', warnOnClose); document.removeEventListener('click', warnOnNavigate, true); };
  }, [dirty, save.isPending]);

  const beginArrangement = () => {
    if (arranging) {
      if (dirty && !window.confirm('Discard your unsaved card order and stop arranging?')) return;
      setArranging(false); setStatus(''); setSaveError(''); return;
    }
    setEditRecord(record); setDraftOrder(savedOrder); setBaselineOrder(savedOrder); setArranging(true); setStatus(''); setSaveError('');
  };
  const applyOrder = (next, message) => {
    if (busy) return;
    setDraftOrder(normalizeDashboardOrder(next, CARDS)); setStatus(message); setSaveError('');
  };
  const moveCard = (key, target) => {
    const next = moveDashboardCard(draftOrder, key, target);
    if (!sameOrder(next, draftOrder)) applyOrder(next, CARD_BY_KEY.get(key).title + ' moved to position ' + (next.indexOf(key) + 1) + ' of ' + next.length + '.');
  };
  const reloadSaved = async () => {
    if (busy || (dirty && !window.confirm('Discard your unsaved card order and reload the saved layout?'))) return;
    setReloading(true); setSaveError(''); setStatus('');
    try {
      const result = await layoutQuery.refetch();
      if (result.error) throw result.error;
      const latest = readRecord(result.data); const order = orderFor(latest);
      setEditRecord(latest); setDraftOrder(order); setBaselineOrder(order);
      setStatus(latest ? 'Saved layout loaded.' : 'Default card order loaded. No shared layout has been saved yet.');
    } catch (error) { setSaveError('Could not reload the saved layout: ' + error.message + ' Your arrangement is still here.'); }
    finally { setReloading(false); }
  };
  const endDrag = () => { dragSource.current = ''; setDraggedKey(''); setDropTarget(''); };
  const isLocalDrag = (event) => Boolean(dragSource.current && draftOrder.includes(dragSource.current) && Array.from(event.dataTransfer.types || []).includes(DRAG_TYPE));
  const dropOn = (event, targetKey) => {
    if (!isLocalDrag(event) || busy) return;
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData(DRAG_TYPE);
    if (sourceKey !== dragSource.current) { endDrag(); return; }
    const next = dropDashboardCard(draftOrder, sourceKey, targetKey);
    if (!sameOrder(next, draftOrder)) applyOrder(next, CARD_BY_KEY.get(sourceKey).title + ' moved to position ' + (next.indexOf(sourceKey) + 1) + ' of ' + next.length + '.');
    endDrag();
  };
  const visibleOrder = arranging ? draftOrder : savedOrder;

  return <div className="min-h-screen bg-gray-50 py-6 sm:py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
      <div><h1 className="mb-2 text-3xl font-bold text-[var(--primary)] sm:mb-4 sm:text-4xl">Admin Dashboard</h1><p className="text-base text-gray-600 sm:text-lg">Manage your website content and settings</p></div>
      <Button type="button" variant="outline" aria-pressed={arranging} aria-controls="dashboard-arrangement" disabled={busy || (!arranging && (layoutQuery.isLoading || Boolean(layoutQuery.error)))} onClick={beginArrangement}><Settings2 size={18} className="mr-2" aria-hidden="true" />{arranging ? 'Done Arranging' : 'Arrange Cards'}</Button>
    </div>

    {loadError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">Could not load dashboard counts: {loadError}</p>}
    {layoutQuery.isLoading && <p role="status" className="mb-4 text-sm text-gray-600">Loading saved card order…</p>}
    {layoutQuery.error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load the shared dashboard layout: {layoutQuery.error.message}</p><Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={reloadSaved}>{reloading ? 'Reloading…' : 'Retry Loading Layout'}</Button></div>}

    {arranging && <section id="dashboard-arrangement" aria-labelledby="dashboard-arrangement-title" className="mb-6 rounded-xl border border-[var(--accent)] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 id="dashboard-arrangement-title" className="text-lg font-semibold text-[var(--primary)]">Arrange dashboard cards</h2>
          <p id="dashboard-arrangement-help" className="mt-1 max-w-2xl text-sm text-gray-600">Drag a card by its handle, or use Up and Down on a keyboard or touchscreen. Save Layout applies the order for all administrators.</p>
          {IS_DEMO && <p className="mt-1 text-sm text-amber-800">Preview mode: this order is saved only in this browser.</p>}
        </div>
        <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (dirty ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700')}>{dirty ? 'Unsaved changes' : editRecord ? 'Saved layout' : 'Default order'}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => applyOrder(sortDashboardOrder(draftOrder, CARDS, 'asc'), 'Cards sorted A–Z. Save Layout to keep this order.')}>A–Z</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => applyOrder(sortDashboardOrder(draftOrder, CARDS, 'desc'), 'Cards sorted Z–A. Save Layout to keep this order.')}>Z–A</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => applyOrder(orderFor(null), 'Default order restored in your draft. Save Layout to keep it.')}><RotateCcw size={16} className="mr-2" aria-hidden="true" />Reset Default Order</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={reloadSaved}>{reloading ? 'Reloading…' : dirty ? 'Discard & Reload' : 'Reload Saved'}</Button>
        <Button type="button" disabled={busy || Boolean(layoutQuery.error) || (!dirty && Boolean(editRecord))} onClick={() => { setStatus(''); setSaveError(''); save.mutate({ order: [...draftOrder], original: editRecord }); }}><Save size={17} className="mr-2" aria-hidden="true" />{save.isPending ? 'Saving…' : 'Save Layout'}</Button>
      </div>
      {remoteChanged && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The saved layout changed after you started arranging. Your draft has been kept. Reload Saved to use the latest version.</p>}
    </section>}
    {status && <p role="status" aria-live="polite" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{status}</p>}
    {saveError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}

    <ol aria-label="Dashboard sections" className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {visibleOrder.map((key, index) => {
        const card = CARD_BY_KEY.get(key); const count = card.countKey ? stats[card.countKey] : undefined; const link = createPageUrl(card.key);
        if (!arranging) return <li key={key}><Link to={link} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"><Card className="h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"><DashboardCardContent card={card} count={count} /></Card></Link></li>;
        return <li key={key} className={'min-w-0 rounded-xl ' + (dropTarget === key ? 'ring-2 ring-[var(--accent)] ring-offset-2' : '')}
          onDragOver={(event) => { if (!busy && isLocalDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(key); } }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget((current) => current === key ? '' : current); }}
          onDrop={(event) => dropOn(event, key)}>
          <Card className={'flex h-full flex-col transition-opacity ' + (draggedKey === key ? 'opacity-50' : '')}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 p-3">
              <button type="button" draggable={!busy} disabled={busy} aria-label={'Drag ' + card.title + ' to reorder; use arrow keys to move'} aria-describedby="dashboard-arrangement-help" title={'Drag ' + card.title + ' or use Up and Down'}
                className="inline-flex min-h-10 cursor-grab items-center gap-2 rounded-md border bg-white px-2.5 text-sm font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
                onDragStart={(event) => { dragSource.current = key; setDraggedKey(key); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(DRAG_TYPE, key); }}
                onDragEnd={endDrag}
                onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); moveCard(key, index + (event.key === 'ArrowUp' ? -1 : 1)); } }}>
                <GripVertical size={18} aria-hidden="true" /><span>{index + 1} of {visibleOrder.length}</span>
              </button>
              <div className="flex gap-1.5">
                <Button type="button" variant="outline" size="sm" className="min-h-10" disabled={busy || index === 0} aria-label={'Move ' + card.title + ' up'} onClick={() => moveCard(key, index - 1)}><ArrowUp size={16} aria-hidden="true" /><span className="ml-1">Up</span></Button>
                <Button type="button" variant="outline" size="sm" className="min-h-10" disabled={busy || index === visibleOrder.length - 1} aria-label={'Move ' + card.title + ' down'} onClick={() => moveCard(key, index + 1)}><ArrowDown size={16} aria-hidden="true" /><span className="ml-1">Down</span></Button>
              </div>
            </div>
            <Link to={link} className="block flex-1 rounded-b-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"><DashboardCardContent card={card} count={count} /></Link>
          </Card>
        </li>;
      })}
    </ol>
  </div></div>;
}
