import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, ArrowDownToLine, BarChart3, Check, CheckCircle2, Circle, ClipboardList, Copy, Download, FileText, Globe2, Moon, Package, Pencil, Plus, Printer, Search, Settings2, ShoppingBasket, Sun, Trash2, X } from 'lucide-react';
import { db, deleteListWithItems } from '../database/db';
import { translations } from '../i18n/translations';
import type { AppSettings, Language, PurchaseStatus, SavedProduct, ShoppingItem, ShoppingList, Theme } from '../types';
import { cycleStatus, sortItems, summarizeItems, validNonNegativePrice, weekday } from '../utils/shopping';

type Tab = 'home' | 'create' | 'products' | 'reports' | 'settings';
const SETTINGS_KEY = 'ishtira-settings-v1';
const today = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
const id = () => crypto.randomUUID();
const defaults: AppSettings = { language: 'bn', theme: 'light', currency: 'BDT', useBengaliDigits: true };
const statusLabels: Record<Language, Record<PurchaseStatus, string>> = {
  bn: { pending: 'বাকি', purchased: 'কেনা হয়েছে', skipped: 'বাদ' },
  en: { pending: 'Pending', purchased: 'Purchased', skipped: 'Skipped' }
};
function validBackup(value: unknown): value is { schemaVersion: number; lists: ShoppingList[]; items: ShoppingItem[]; products: SavedProduct[] } {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.lists) || !Array.isArray(data.items) || !Array.isArray(data.products)) return false;
  const lists = data.lists as unknown[], items = data.items as unknown[], products = data.products as unknown[];
  if (lists.length > 10000 || items.length > 100000 || products.length > 50000) return false;
  const listIds = new Set<string>();
  for (const raw of lists) {
    if (!raw || typeof raw !== 'object') return false;
    const x = raw as Record<string, unknown>;
    if (typeof x.id !== 'string' || !x.id || typeof x.title !== 'string' || typeof x.shoppingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.shoppingDate)) return false;
    if (listIds.has(x.id)) return false;
    listIds.add(x.id);
  }
  const itemIds = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') return false;
    const x = raw as Record<string, unknown>;
    if (typeof x.id !== 'string' || !x.id || itemIds.has(x.id) || typeof x.listId !== 'string' || !listIds.has(x.listId) || typeof x.name !== 'string' || !x.name.trim()) return false;
    if (typeof x.quantity !== 'number' || !Number.isFinite(x.quantity) || x.quantity <= 0 || typeof x.sortOrder !== 'number' || !['pending','purchased','skipped'].includes(String(x.status))) return false;
    for (const key of ['estimatedPrice','actualPrice']) if (x[key] !== undefined && (typeof x[key] !== 'number' || !Number.isFinite(x[key]) || (x[key] as number) < 0)) return false;
    itemIds.add(x.id);
  }
  const productIds = new Set<string>();
  for (const raw of products) {
    if (!raw || typeof raw !== 'object') return false;
    const x = raw as Record<string, unknown>;
    if (typeof x.id !== 'string' || !x.id || productIds.has(x.id) || typeof x.name !== 'string' || !x.name.trim()) return false;
    for (const key of ['defaultEstimatedPrice']) if (x[key] !== undefined && (typeof x[key] !== 'number' || !Number.isFinite(x[key]) || (x[key] as number) < 0)) return false;
    productIds.add(x.id);
  }
  return true;
}
function csvCell(value: unknown) {
  const text = String(value ?? '');
  return '"' + (/^[=+\-@]/.test(text) ? "'" : '').concat(text).replaceAll('"', '""') + '"';
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<AppSettings>;
      return { ...defaults, ...saved, language: saved.language === 'en' ? 'en' : 'bn', theme: ['light','dark','system'].includes(String(saved.theme)) ? saved.theme! : 'light', currency: typeof saved.currency === 'string' ? saved.currency : 'BDT', useBengaliDigits: typeof saved.useBengaliDigits === 'boolean' ? saved.useBengaliDigits : true };
    } catch { return defaults; }
  });
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('টি');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productUnit, setProductUnit] = useState('টি');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all');
  const [reportStart, setReportStart] = useState(() => today().slice(0, 7) + '-01');
  const [reportEnd, setReportEnd] = useState(today());
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const t = translations[settings.language];
  const activeList = lists.find(list => list.id === activeListId) ?? null;
  const activeItems = useMemo(() => sortItems(items.filter(item => item.listId === activeListId).filter(item => item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).filter(item => statusFilter === 'all' || item.status === statusFilter)), [items, activeListId, search, statusFilter]);
  const summary = summarizeItems(items.filter(item => item.listId === activeListId));
  const reportLists = useMemo(() => lists.filter(list => list.shoppingDate >= reportStart && list.shoppingDate <= reportEnd), [lists, reportStart, reportEnd]);
  const reportListIds = useMemo(() => new Set(reportLists.map(list => list.id)), [reportLists]);
  const reportItems = useMemo(() => items.filter(item => reportListIds.has(item.listId)), [items, reportListIds]);
  const reportSummary = summarizeItems(reportItems);
  const totalSpend = items.filter(item => item.status === 'purchased' && item.actualPrice !== undefined).reduce((sum, item) => sum + (item.actualPrice ?? 0), 0);
  const filteredProducts = products.filter(p => (p.name + ' ' + (p.category ?? '')).toLocaleLowerCase().includes(productSearch.toLocaleLowerCase())).sort((a,b) => a.name.localeCompare(b.name, settings.language === 'bn' ? 'bn' : 'en'));

  async function refresh() {
    try {
      const [nextLists, nextItems, nextProducts] = await Promise.all([db.lists.orderBy('updatedAt').reverse().toArray(), db.items.toArray(), db.products.toArray()]);
      setLists(nextLists); setItems(nextItems); setProducts(nextProducts);
      if (activeListId && !nextLists.some(l => l.id === activeListId)) setActiveListId(null);
    } catch (e) { console.error(e); setError(t.saveError); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    const resolved = settings.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.lang = settings.language;
  }, [settings]);
  useEffect(() => {
    const onOnline = () => setOnline(true), onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  function showError(message?: string) { setError(message || t.saveError); }
  async function createList(event: FormEvent) {
    event.preventDefault(); setError('');
    const now = new Date().toISOString();
    const list: ShoppingList = { id: id(), title: title.trim() || (settings.language === 'bn' ? 'বাজারের তালিকা' : 'Shopping list'), shoppingDate: date, notes: note.trim(), createdAt: now, updatedAt: now };
    try { await db.lists.add(list); await refresh(); setActiveListId(list.id); setTitle(''); setNote(''); setTab('home'); }
    catch (e) { console.error(e); showError(); }
  }
  function openEditList(list: ShoppingList) {
    setEditingListId(list.id); setTitle(list.title); setDate(list.shoppingDate); setNote(list.notes ?? ''); setTab('create');
  }
  async function saveListEdit(event: FormEvent) {
    event.preventDefault(); if (!editingListId) return;
    try {
      await db.lists.update(editingListId, { title: title.trim() || (settings.language === 'bn' ? 'বাজারের তালিকা' : 'Shopping list'), shoppingDate: date, notes: note.trim(), updatedAt: new Date().toISOString() });
      setEditingListId(null); setTitle(''); setNote(''); await refresh(); setTab('home');
    } catch (e) { console.error(e); showError(); }
  }
  function cancelListEdit() { setEditingListId(null); setTitle(''); setNote(''); setDate(today()); setTab('home'); }
  async function duplicateList(list: ShoppingList) {
    const now = new Date().toISOString(), newListId = id();
    try {
      await db.transaction('rw', db.lists, db.items, async () => {
        await db.lists.add({ ...list, id: newListId, title: (settings.language === 'bn' ? 'কপি - ' : 'Copy - ') + list.title, shoppingDate: today(), completedAt: undefined, createdAt: now, updatedAt: now });
        const source = await db.items.where('listId').equals(list.id).toArray();
        if (source.length) await db.items.bulkAdd(source.map(item => ({ ...item, id: id(), listId: newListId, status: 'pending' as const, actualPrice: undefined, createdAt: now, updatedAt: now })));
      });
      await refresh(); setActiveListId(newListId); setTab('home');
    } catch (e) { console.error(e); showError(); }
  }
  async function addItem(event: FormEvent) {
    event.preventDefault(); if (!activeList || !productName.trim()) return;
    const q = Number(quantity), estimate = estimatedPrice.trim() ? Number(estimatedPrice) : undefined;
    if (!Number.isFinite(q) || q <= 0 || (estimate !== undefined && (!Number.isFinite(estimate) || estimate < 0))) { showError(settings.language === 'bn' ? 'পরিমাণ ও দাম সঠিকভাবে লিখুন।' : 'Enter a valid quantity and non-negative price.'); return; }
    const now = new Date().toISOString(), listItems = items.filter(item => item.listId === activeList.id);
    const item: ShoppingItem = { id: id(), listId: activeList.id, name: productName.trim(), quantity: q, unit: unit.trim(), estimatedPrice: estimate, status: 'pending', sortOrder: Math.max(-1, ...listItems.map(i => i.sortOrder)) + 1, createdAt: now, updatedAt: now };
    try {
      await db.items.add(item); await db.lists.update(activeList.id, { updatedAt: now });
      const known = products.find(p => p.name.toLocaleLowerCase() === item.name.toLocaleLowerCase());
      if (!known) await db.products.add({ id: id(), name: item.name, defaultUnit: item.unit, defaultEstimatedPrice: estimate, createdAt: now, updatedAt: now });
      await refresh(); setProductName(''); setQuantity('1'); setEstimatedPrice('');
    } catch (e) { console.error(e); showError(); }
  }
  async function updateItem(item: ShoppingItem, patch: Partial<ShoppingItem>) {
    const updatedAt = new Date().toISOString();
    try { await db.items.update(item.id, { ...patch, updatedAt }); await db.lists.update(item.listId, { updatedAt }); await refresh(); }
    catch (e) { console.error(e); showError(); }
  }
  async function removeItem(item: ShoppingItem) {
    if (!confirm(settings.language === 'bn' ? 'পণ্যটি মুছে ফেলবেন?' : 'Remove this product?')) return;
    try { await db.items.delete(item.id); await refresh(); } catch (e) { console.error(e); showError(); }
  }
  async function deleteList(list: ShoppingList) {
    if (!confirm(t.confirmDelete)) return;
    try { await deleteListWithItems(list.id); if (activeListId === list.id) setActiveListId(null); await refresh(); } catch (e) { console.error(e); showError(); }
  }
  async function finishList(list: ShoppingList) {
    try { await db.lists.update(list.id, { completedAt: list.completedAt ? undefined : new Date().toISOString(), updatedAt: new Date().toISOString() }); await refresh(); } catch (e) { console.error(e); showError(); }
  }
  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv() {
    const rows = [['List','Date','Product','Quantity','Unit','Estimated unit price','Actual total price','Status','Notes'], ...lists.flatMap(l => items.filter(i => i.listId === l.id).map(i => [l.title,l.shoppingDate,i.name,String(i.quantity),i.unit,i.estimatedPrice == null ? '' : String(i.estimatedPrice),i.actualPrice == null ? '' : String(i.actualPrice),statusLabels.en[i.status],i.notes ?? '']))];
    download('ishtira-shopping.csv', '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  async function backup() {
    try {
      const data = { schemaVersion: 1, exportedAt: new Date().toISOString(), settings, lists: await db.lists.toArray(), items: await db.items.toArray(), products: await db.products.toArray() };
      download('ishtira-backup.json', JSON.stringify(data, null, 2), 'application/json');
    } catch (e) { console.error(e); showError(); }
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Backup is too large');
      const parsed: unknown = JSON.parse(await file.text());
      if (!validBackup(parsed)) throw new Error('Invalid backup schema');
      if (!confirm(settings.language === 'bn' ? 'একই ID-এর তথ্য থাকলে ব্যাকআপের তথ্য দিয়ে প্রতিস্থাপন হবে। চালিয়ে যাবেন?' : 'Matching IDs will be replaced by backup data. Continue?')) return;
      await db.transaction('rw', db.lists, db.items, db.products, async () => {
        await db.lists.bulkPut(parsed.lists); await db.items.bulkPut(parsed.items); await db.products.bulkPut(parsed.products);
      });
      await refresh(); alert(settings.language === 'bn' ? 'ব্যাকআপ পুনরুদ্ধার হয়েছে।' : 'Backup restored.');
    } catch (e) { console.error(e); showError(settings.language === 'bn' ? 'ব্যাকআপ ফাইলটি সঠিক নয় বা এতে ভুল তথ্য আছে।' : 'Backup is invalid or contains inconsistent data.'); }
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    const name = productName.trim(), price = productPrice.trim() ? Number(productPrice) : undefined;
    if (!name || (price !== undefined && (!Number.isFinite(price) || price < 0))) { showError(settings.language === 'bn' ? 'পণ্যের নাম ও দাম যাচাই করুন।' : 'Check product name and price.'); return; }
    const now = new Date().toISOString();
    try {
      if (editingProductId) await db.products.update(editingProductId, { name, defaultUnit: productUnit, defaultEstimatedPrice: price, category: productCategory.trim() || undefined, updatedAt: now });
      else await db.products.add({ id: id(), name, defaultUnit: productUnit, defaultEstimatedPrice: price, category: productCategory.trim() || undefined, createdAt: now, updatedAt: now });
      setEditingProductId(null); setProductName(''); setProductUnit('টি'); setProductPrice(''); setProductCategory(''); await refresh();
    } catch (e) { console.error(e); showError(settings.language === 'bn' ? 'একই ID বা অন্য ডেটাবেস সমস্যার কারণে সংরক্ষণ হয়নি।' : 'Could not save product.'); }
  }
  function editProduct(product: SavedProduct) {
    setEditingProductId(product.id); setProductName(product.name); setProductUnit(product.defaultUnit ?? 'টি'); setProductPrice(product.defaultEstimatedPrice == null ? '' : String(product.defaultEstimatedPrice)); setProductCategory(product.category ?? '');
  }
  async function deleteProduct(product: SavedProduct) {
    if (!confirm(settings.language === 'bn' ? 'সংরক্ষিত পণ্যটি মুছবেন? পুরোনো তালিকার পণ্য মুছবে না।' : 'Delete this saved product? Existing list items will remain.')) return;
    try { await db.products.delete(product.id); await refresh(); } catch (e) { console.error(e); showError(); }
  }
  function useProduct(product: SavedProduct) {
    setProductName(product.name); setUnit(product.defaultUnit ?? 'টি'); setEstimatedPrice(product.defaultEstimatedPrice == null ? '' : String(product.defaultEstimatedPrice));
    if (!activeListId) {
      const firstOpen = lists.find(list => !list.completedAt) ?? lists[0];
      if (firstOpen) setActiveListId(firstOpen.id);
      else { setTab('create'); setError(settings.language === 'bn' ? 'আগে একটি বাজারের তালিকা তৈরি করুন, তারপর পণ্য যোগ করুন।' : 'Create a shopping list first, then add this product.'); return; }
    }
    setTab('home');
  }
  function currency(value: number) {
    return new Intl.NumberFormat(settings.language === 'bn' ? 'bn-BD' : 'en-BD', { style: 'currency', currency: settings.currency, maximumFractionDigits: 2, numberingSystem: settings.useBengaliDigits && settings.language === 'bn' ? 'beng' : 'latn' }).format(value);
  }
  function printReport() { window.print(); }
  const reportByList = reportLists.map(list => ({ list, summary: summarizeItems(items.filter(item => item.listId === list.id)) }));
  const tNav = settings.language === 'bn'
    ? { home: 'বাজার', create: 'তালিকা', products: 'পণ্য', reports: 'রিপোর্ট', settings: 'সেটিংস' }
    : { home: 'Home', create: 'New list', products: 'Products', reports: 'Reports', settings: 'Settings' };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setTab('home'); setActiveListId(null); }} aria-label={t.home}><span className="brand-mark"><ShoppingBasket size={23}/></span><span><strong>Ishtira</strong><small>ইশতিরা</small></span></button>
      <div className="top-actions"><span className={online ? 'network-pill' : 'network-pill offline'}><span/> {online ? t.online : t.offline}</span><button className="icon-button" aria-label={t.language} title={t.language} onClick={() => setSettings(s => ({ ...s, language: s.language === 'bn' ? 'en' : 'bn' }))}><Globe2 size={19}/><small>{settings.language.toUpperCase()}</small></button><button className="icon-button" aria-label={t.theme} title={t.theme} onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : s.theme === 'dark' ? 'system' : 'light' }))}>{settings.theme === 'light' ? <Sun size={19}/> : settings.theme === 'dark' ? <Moon size={19}/> : <Settings2 size={19}/>}</button></div>
    </header>
    <main className="page">
      {error && <div role="alert" className="error-banner">{error}<button onClick={() => setError('')} aria-label="Close"><X size={16}/></button></div>}
      {tab === 'create' && <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">{editingListId ? (settings.language === 'bn' ? 'তালিকা সম্পাদনা' : 'Edit list') : t.create}</p><h1>{editingListId ? (settings.language === 'bn' ? 'বাজারের তথ্য বদলান' : 'Edit shopping list') : t.newList}</h1></div><span className="heading-icon"><Plus/></span></div>
        <form onSubmit={editingListId ? saveListEdit : createList} className="stack-form">
          <label>{t.title}<input value={title} onChange={e => setTitle(e.target.value)} placeholder={settings.language === 'bn' ? 'যেমন: সাপ্তাহিক বাজার' : 'e.g. Weekly groceries'} maxLength={100}/></label>
          <label>{t.date}<input type="date" required value={date} onChange={e => setDate(e.target.value)}/><small className="muted">{weekday(date, settings.language)}</small></label>
          <label>{t.note}<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000}/></label>
          <div className="inline-actions"><button className="primary-button" type="submit"><Check size={18}/>{editingListId ? (settings.language === 'bn' ? 'পরিবর্তন সংরক্ষণ' : 'Save changes') : t.save}</button>{editingListId && <button className="secondary-button" type="button" onClick={cancelListEdit}>{settings.language === 'bn' ? 'বাতিল' : 'Cancel'}</button>}</div>
        </form>
      </section>}
      {tab === 'home' && !activeList && <><section className="hero"><div className="hero-copy"><span className="hero-kicker">{t.appName} <span>·</span> Smart shopping</span><h1>{t.greeting}</h1><p>{t.subtitle}</p><button className="primary-button" onClick={() => { setEditingListId(null); setTitle(''); setDate(today()); setNote(''); setTab('create'); }}><Plus size={18}/>{t.newList}</button></div><div className="hero-art" aria-hidden="true"><div className="art-circle"><ShoppingBasket size={58}/><span className="art-spark">✦</span></div><div className="art-chip chip-one"><Check size={15}/> {t.purchased}</div><div className="art-chip chip-two">৳ {Math.round(totalSpend).toLocaleString(settings.language === 'bn' ? 'bn-BD' : 'en-US')}</div></div></section>
        <section className="stats-grid"><div className="stat-card"><span>{t.lists}</span><strong>{lists.length}</strong><ClipboardList/></div><div className="stat-card"><span>{t.actual}</span><strong>{currency(totalSpend)}</strong><FileText/></div><div className="stat-card"><span>{t.purchased}</span><strong>{items.filter(i => i.status === 'purchased').length}</strong><CheckCircle2/></div></section>
        <section className="list-section"><div className="section-heading"><div><p className="eyebrow">{t.history}</p><h2>{t.lists}</h2></div><button className="secondary-button" onClick={() => { setEditingListId(null); setTitle(''); setDate(today()); setNote(''); setTab('create'); }}><Plus size={17}/>{t.create}</button></div>
          {lists.length === 0 ? <div className="empty-state"><div className="empty-icon"><ShoppingBasket size={28}/></div><h3>{t.empty}</h3><p>{t.emptyHint}</p><button className="primary-button" onClick={() => setTab('create')}><Plus size={18}/>{t.newList}</button></div> : <div className="list-grid">{lists.map(list => { const sum = summarizeItems(items.filter(i => i.listId === list.id)); return <article className="list-card" key={list.id}><button className="list-card-main" onClick={() => { setActiveListId(list.id); setTab('home'); setSearch(''); setStatusFilter('all'); }}><div className="list-card-icon"><ShoppingBasket size={21}/></div><div className="list-card-title"><h3>{list.title}</h3><p>{new Intl.DateTimeFormat(settings.language === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(list.shoppingDate + 'T12:00:00'))} · {weekday(list.shoppingDate, settings.language)}</p></div><span className={list.completedAt ? 'completion-badge complete' : 'completion-badge'}>{list.completedAt ? <CheckCircle2 size={14}/> : <Circle size={14}/>} {list.completedAt ? t.finish : t.pending}</span></button><div className="mini-progress"><span style={{ width: sum.progress + '%' }}/></div><div className="list-card-footer"><span>{sum.purchased}/{sum.total} {t.purchased}</span><strong>{currency(sum.actualSpend)}</strong><button className="tiny-icon" title={settings.language === 'bn' ? 'সম্পাদনা' : 'Edit'} onClick={() => openEditList(list)} aria-label={settings.language === 'bn' ? 'তালিকা সম্পাদনা' : 'Edit list'}><Pencil size={15}/></button><button className="tiny-icon" title={settings.language === 'bn' ? 'কপি করুন' : 'Duplicate'} onClick={() => void duplicateList(list)} aria-label={settings.language === 'bn' ? 'তালিকা কপি' : 'Duplicate list'}><Copy size={15}/></button><button className="tiny-icon" onClick={() => void deleteList(list)} aria-label={t.delete}><Trash2 size={16}/></button></div></article>; })}</div>}
        </section></>}
      {tab === 'home' && activeList && <section className="panel active-panel">
        <button className="back-link" onClick={() => setActiveListId(null)}>← {t.lists}</button>
        <div className="section-heading"><div><p className="eyebrow">{weekday(activeList.shoppingDate, settings.language)}</p><h1>{activeList.title}</h1><p className="muted">{activeList.shoppingDate}{activeList.notes ? ' · ' + activeList.notes : ''}</p></div><div className="inline-actions"><button className="tiny-icon" title={settings.language === 'bn' ? 'সম্পাদনা' : 'Edit'} onClick={() => openEditList(activeList)}><Pencil size={17}/></button><button className="secondary-button" onClick={() => void finishList(activeList)}>{activeList.completedAt ? <Circle size={17}/> : <CheckCircle2 size={17}/>} {activeList.completedAt ? t.reopen : t.finish}</button></div></div>
        <div className="summary-grid"><div><span>{t.total}</span><strong>{summary.total}</strong></div><div><span>{t.purchased}</span><strong>{summary.purchased}</strong></div><div><span>{t.pending}</span><strong>{summary.pending}</strong></div><div><span>{t.skipped}</span><strong>{summary.skipped}</strong></div></div>
        <div className="progress-block"><div className="progress-label"><strong>{t.progress}</strong><strong>{Math.round(summary.progress)}%</strong></div><div className="progress-track"><span style={{ width: summary.progress + '%' }}/></div><div className="progress-caption">{summary.purchased} / {summary.total} {t.purchased}</div></div>
        <div className="expense-strip"><div><span>{t.actual}</span><strong>{currency(summary.actualSpend)}</strong>{summary.unpricedPurchased > 0 && <small>{summary.unpricedPurchased} {t.unpriced}</small>}</div><div><span>{t.estimated}</span><strong>{currency(summary.estimatedSpend)}</strong></div></div>
        <form onSubmit={addItem} className="add-item-form"><h2><Plus size={19}/>{t.addItem}</h2><label>{t.productName}<input autoComplete="off" required value={productName} onChange={e => { setProductName(e.target.value); const match = products.find(p => p.name.toLocaleLowerCase() === e.target.value.trim().toLocaleLowerCase()); if (match) { setUnit(match.defaultUnit ?? 'টি'); setEstimatedPrice(match.defaultEstimatedPrice == null ? '' : String(match.defaultEstimatedPrice)); } }} placeholder={settings.language === 'bn' ? 'যেমন: মাছ, ডিম, চাল' : 'e.g. Fish, eggs, rice'} maxLength={150}/></label><div className="form-row"><label>{t.quantity}<input type="number" min="0.001" step="any" required value={quantity} onChange={e => setQuantity(e.target.value)}/></label><label>{t.unit}<select value={unit} onChange={e => setUnit(e.target.value)}><option>টি</option><option>কেজি</option><option>গ্রাম</option><option>লিটার</option><option>ডজন</option><option>প্যাকেট</option><option>পিস</option><option>হালি</option><option>বস্তা</option><option>বোতল</option></select></label><label>{t.estimate}<input inputMode="decimal" type="number" min="0" step="0.01" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)}/></label></div><button className="primary-button" type="submit"><Plus size={18}/>{t.add}</button></form>
        {products.length > 0 && <div className="quick-products"><strong>{settings.language === 'bn' ? 'সেভ করা পণ্য' : 'Saved products'}</strong><div>{products.slice(0,8).map(p => <button key={p.id} className="filter-chip" onClick={() => useProduct(p)}>{p.name}</button>)}</div></div>}
        <div className="items-heading"><h2>{t.total} <span className="count-badge">{summary.total}</span></h2><div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}/></div></div>
        <div className="filter-row">{(['all','pending','purchased','skipped'] as const).map(filter => <button key={filter} className={statusFilter === filter ? 'filter-chip selected' : 'filter-chip'} onClick={() => setStatusFilter(filter)}>{filter === 'all' ? t.all : t[filter]}</button>)}</div>
        <div className="shopping-items">{activeItems.map((item, index) => <article className={'shopping-item ' + item.status} key={item.id}><span className="item-number">{index + 1}</span><button className="status-toggle" aria-label={t.status + ': ' + t[item.status]} title={t.status} onClick={() => void updateItem(item, { status: cycleStatus(item.status) })}>{item.status === 'purchased' ? <CheckCircle2/> : item.status === 'skipped' ? <X/> : <Circle/>}</button><div className="item-details"><strong>{item.name}</strong><small>{item.quantity} {item.unit}{item.estimatedPrice != null ? ' · ' + currency(item.estimatedPrice) : ''}</small></div><label className="actual-price"><span>{settings.language === 'bn' ? 'প্রকৃত ৳' : 'Actual ৳'}</span><input aria-label={(settings.language === 'bn' ? 'প্রকৃত দাম ' : 'Actual price for ') + item.name} type="number" min="0" step="0.01" inputMode="decimal" placeholder="—" value={item.actualPrice ?? ''} onChange={e => { try { const price = validNonNegativePrice(e.target.value); void updateItem(item, { actualPrice: price }); } catch { showError(settings.language === 'bn' ? 'দাম ঋণাত্মক হতে পারবে না।' : 'Price cannot be negative.'); } }}/></label><button className="tiny-icon" onClick={() => void removeItem(item)} aria-label={t.remove + ' ' + item.name}><Trash2 size={16}/></button></article>)}</div>
        {activeItems.length === 0 && <p className="muted centered">{t.noItems}</p>}
      </section>}
      {tab === 'products' && <section className="panel"><div className="section-heading"><div><p className="eyebrow">{settings.language === 'bn' ? 'পণ্যের লাইব্রেরি' : 'Product library'}</p><h1>{settings.language === 'bn' ? 'সংরক্ষিত পণ্য' : 'Saved products'}</h1><p className="muted">{settings.language === 'bn' ? 'বারবার কেনা পণ্য একবার সংরক্ষণ করুন।' : 'Save frequently bought products for quick reuse.'}</p></div><span className="heading-icon"><Package/></span></div>
        <form className="add-item-form" onSubmit={saveProduct}><h2>{editingProductId ? (settings.language === 'bn' ? 'পণ্য সম্পাদনা' : 'Edit product') : (settings.language === 'bn' ? 'নতুন পণ্য' : 'New product')}</h2><label>{t.productName}<input required maxLength={150} value={productName} onChange={e => setProductName(e.target.value)}/></label><div className="form-row"><label>{t.unit}<select value={productUnit} onChange={e => setProductUnit(e.target.value)}><option>টি</option><option>কেজি</option><option>গ্রাম</option><option>লিটার</option><option>ডজন</option><option>প্যাকেট</option><option>পিস</option><option>হালি</option><option>বস্তা</option><option>বোতল</option></select></label><label>{settings.language === 'bn' ? 'আনুমানিক একক দাম' : 'Default unit price'}<input type="number" min="0" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)}/></label><label>{settings.language === 'bn' ? 'ক্যাটাগরি' : 'Category'}<input maxLength={80} value={productCategory} onChange={e => setProductCategory(e.target.value)} placeholder={settings.language === 'bn' ? 'যেমন: সবজি' : 'e.g. Vegetables'}/></label></div><div className="inline-actions"><button className="primary-button" type="submit"><Plus size={17}/>{settings.language === 'bn' ? 'সংরক্ষণ' : 'Save product'}</button>{editingProductId && <button type="button" className="secondary-button" onClick={() => { setEditingProductId(null); setProductName(''); setProductUnit('টি'); setProductPrice(''); setProductCategory(''); }}>{settings.language === 'bn' ? 'বাতিল' : 'Cancel'}</button>}</div></form>
        <div className="items-heading"><h2>{settings.language === 'bn' ? 'পণ্যের তালিকা' : 'All products'} <span className="count-badge">{products.length}</span></h2><div className="search-box"><Search size={16}/><input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder={t.search}/></div></div>
        <div className="product-list">{filteredProducts.map(product => <article className="product-row" key={product.id}><span className="list-card-icon"><Package size={19}/></span><div className="item-details"><strong>{product.name}</strong><small>{product.category || product.defaultUnit || ''}{product.defaultEstimatedPrice != null ? ' · ' + currency(product.defaultEstimatedPrice) : ''}</small></div><button className="tiny-icon" title={settings.language === 'bn' ? 'সম্পাদনা' : 'Edit'} onClick={() => editProduct(product)}><Pencil size={16}/></button><button className="tiny-icon" title={settings.language === 'bn' ? 'মুছুন' : 'Delete'} onClick={() => void deleteProduct(product)}><Trash2 size={16}/></button></article>)}</div>
        {filteredProducts.length === 0 && <p className="muted centered">{settings.language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি।' : 'No saved products found.'}</p>}
      </section>}
      {tab === 'reports' && <section className="panel"><div className="section-heading"><div><p className="eyebrow">{t.exports}</p><h1>{settings.language === 'bn' ? 'খরচের বিশ্লেষণ' : 'Spending analytics'}</h1><p className="muted">{settings.language === 'bn' ? 'তারিখ অনুযায়ী বাজারের হিসাব দেখুন।' : 'Analyze shopping expenses by date range.'}</p></div><span className="heading-icon"><BarChart3/></span></div>
        <div className="date-range"><label>{settings.language === 'bn' ? 'শুরুর তারিখ' : 'Start date'}<input type="date" value={reportStart} max={reportEnd} onChange={e => setReportStart(e.target.value)}/></label><label>{settings.language === 'bn' ? 'শেষ তারিখ' : 'End date'}<input type="date" value={reportEnd} min={reportStart} onChange={e => setReportEnd(e.target.value)}/></label><button className="secondary-button" onClick={() => { setReportStart('2000-01-01'); setReportEnd(today()); }}>{settings.language === 'bn' ? 'সব সময়' : 'All time'}</button></div>
        <div className="report-total"><span>{t.actual}</span><strong>{currency(reportSummary.actualSpend)}</strong><small>{reportLists.length} {t.lists} · {reportItems.length} {t.total.toLowerCase()}</small></div>
        <div className="stats-grid report-stats"><div className="stat-card"><span>{t.purchased}</span><strong>{reportSummary.purchased}</strong><CheckCircle2/></div><div className="stat-card"><span>{t.pending}</span><strong>{reportSummary.pending}</strong><Circle/></div><div className="stat-card"><span>{t.estimated}</span><strong>{currency(reportSummary.estimatedSpend)}</strong><FileText/></div></div>
        <div className="inline-actions report-actions"><button className="primary-button" onClick={printReport}><Printer size={17}/>{settings.language === 'bn' ? 'PDF / প্রিন্ট' : 'PDF / Print'}</button><button className="secondary-button" onClick={exportCsv}><Download size={17}/>{t.exportCsv}</button><button className="secondary-button" onClick={() => void backup()}><ArrowDownToLine size={17}/>{t.backup}</button></div>
        <div className="report-print"><h2>{settings.language === 'bn' ? 'বাজারভিত্তিক হিসাব' : 'Shopping report by list'}</h2><p>{reportStart} — {reportEnd}</p><div className="history-list">{reportByList.map(({list,summary:sum}) => <div className="history-row" key={list.id}><span className="history-date">{list.shoppingDate}</span><span className="history-name">{list.title}<small>{sum.purchased}/{sum.total} {t.purchased}</small></span><strong>{currency(sum.actualSpend)}</strong></div>)}</div></div>
        <h2 className="subheading">{t.lists}</h2><div className="history-list">{reportByList.map(({list,summary:sum}) => <button className="history-row" key={list.id} onClick={() => { setActiveListId(list.id); setTab('home'); }}><span className="history-date">{list.shoppingDate}</span><span className="history-name">{list.title}<small>{weekday(list.shoppingDate, settings.language)} · {sum.purchased}/{sum.total}</small></span><strong>{currency(sum.actualSpend)}</strong></button>)}</div>
        <p className="storage-note">{settings.language === 'bn' ? 'PDF / প্রিন্ট বাটনে চাপ দিয়ে ব্রাউজারের Print মেনু থেকে “Save as PDF” নির্বাচন করুন। বাংলা ফন্ট ও পৃষ্ঠা বিন্যাস ডিভাইস/ব্রাউজার অনুযায়ী যাচাই করুন।' : 'Use the browser print dialog and choose “Save as PDF”. Verify Bengali fonts and page layout in your target browser.'}</p>
      </section>}
      {tab === 'settings' && <section className="panel"><div className="section-heading"><div><p className="eyebrow">{settings.language === 'bn' ? 'পছন্দ ও তথ্য' : 'Preferences and data'}</p><h1>{t.settings}</h1></div><span className="heading-icon"><Settings2/></span></div>
        <div className="settings-list"><label>{t.language}<select value={settings.language} onChange={e => setSettings(s => ({...s,language:e.target.value as Language}))}><option value="bn">বাংলা</option><option value="en">English</option></select></label><label>{t.theme}<select value={settings.theme} onChange={e => setSettings(s => ({...s,theme:e.target.value as Theme}))}><option value="light">{t.light}</option><option value="dark">{t.dark}</option><option value="system">{t.system}</option></select></label><label>{settings.language === 'bn' ? 'মুদ্রা' : 'Currency'}<select value={settings.currency} onChange={e => setSettings(s => ({...s,currency:e.target.value}))}><option value="BDT">BDT — ৳</option><option value="USD">USD — $</option><option value="INR">INR — ₹</option><option value="GBP">GBP — £</option><option value="EUR">EUR — €</option></select></label><label className="toggle-setting"><span>{settings.language === 'bn' ? 'বাংলা সংখ্যা ব্যবহার' : 'Use Bengali numerals'}</span><input type="checkbox" checked={settings.useBengaliDigits} onChange={e => setSettings(s => ({...s,useBengaliDigits:e.target.checked}))}/></label></div>
        <h2 className="subheading">{settings.language === 'bn' ? 'ডেটা ও গোপনীয়তা' : 'Data and privacy'}</h2><p className="storage-note">{settings.language === 'bn' ? 'তথ্য এই ডিভাইসের ব্রাউজারে IndexedDB-তে সংরক্ষিত থাকে। একাধিক ডিভাইসে সিঙ্ক হয় না। ব্রাউজারের ডেটা মুছে গেলে তথ্য হারাতে পারে।' : 'Data is stored in this browser using IndexedDB. There is no cross-device sync. Clearing browser data can erase your records.'}</p>
        <div className="export-actions"><button className="export-card" onClick={() => void backup()}><ArrowDownToLine/><strong>{t.backup}</strong><span>{settings.language === 'bn' ? 'সব তালিকা, পণ্য ও সেটিংস' : 'Lists, products and settings'}</span></button><label className="export-card upload-card"><Archive/><strong>{settings.language === 'bn' ? 'ব্যাকআপ পুনরুদ্ধার' : 'Restore backup'}</strong><span>{settings.language === 'bn' ? 'JSON ফাইল নির্বাচন করুন' : 'Choose a JSON file'}</span><input type="file" accept="application/json,.json" onChange={e => { void restore(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label><button className="export-card" onClick={exportCsv}><Download/><strong>{t.exportCsv}</strong><span>Excel / spreadsheet</span></button></div>
        <p className="storage-note">{settings.language === 'bn' ? 'নিরাপত্তা: ব্যাকআপ ফাইল ব্যক্তিগতভাবে সংরক্ষণ করুন। আমদানি করার আগে ফাইলের উৎস যাচাই করুন।' : 'Security: keep backup files private and verify their source before importing.'}</p>
      </section>}
    </main>
    <nav className="bottom-nav" aria-label="Primary navigation">{(['home','create','products','reports','settings'] as const).map(key => { const Icon = key === 'home' ? ShoppingBasket : key === 'create' ? Plus : key === 'products' ? Package : key === 'reports' ? FileText : Settings2; return <button key={key} className={tab === key ? 'nav-item active' : 'nav-item'} onClick={() => { if (key === 'create' && !editingListId) { setTitle(''); setDate(today()); setNote(''); } setTab(key); }}><Icon/><span>{tNav[key]}</span></button>; })}</nav>
    <footer className="app-footer"><span>© {new Date().getFullYear()} Ishtira</span><span>Local-first · Privacy-minded</span></footer>
  </div>;
}
