import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, ArrowDownToLine, Check, CheckCircle2, Circle, ClipboardList, Download, FileText, Globe2, Moon, Plus, Search, Settings2, ShoppingBasket, Sun, Trash2, X } from 'lucide-react';
import { db, deleteListWithItems } from '../database/db';
import { translations } from '../i18n/translations';
import type { AppSettings, Language, PurchaseStatus, ShoppingItem, ShoppingList, Theme } from '../types';
import { cycleStatus, sortItems, summarizeItems, validNonNegativePrice, weekday } from '../utils/shopping';

const SETTINGS_KEY = 'ishtira-settings-v1';
const today = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
const id = () => crypto.randomUUID();
const defaults: AppSettings = { language: 'bn', theme: 'light', currency: 'BDT', useBengaliDigits: true };

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<AppSettings> }; } catch { return defaults; }
  });
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [tab, setTab] = useState<'create' | 'home' | 'exports'>('home');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('টি');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all');
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const t = translations[settings.language];
  const activeList = lists.find(list => list.id === activeListId) ?? null;
  const activeItems = useMemo(() => sortItems(items.filter(item => item.listId === activeListId).filter(item => item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).filter(item => statusFilter === 'all' || item.status === statusFilter)), [items, activeListId, search, statusFilter]);
  const summary = summarizeItems(items.filter(item => item.listId === activeListId));
  const totalSpend = items.filter(item => item.status === 'purchased' && lists.some(l => l.id === item.listId)).reduce((sum, item) => sum + (item.actualPrice ?? 0), 0);

  async function refresh() {
    try {
      const [nextLists, nextItems] = await Promise.all([db.lists.orderBy('updatedAt').reverse().toArray(), db.items.toArray()]);
      setLists(nextLists); setItems(nextItems);
      if (activeListId && !nextLists.some(l => l.id === activeListId)) setActiveListId(null);
    } catch (e) { console.error(e); setError(t.saveError); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); document.documentElement.dataset.theme = settings.theme; document.documentElement.lang = settings.language; }, [settings]);
  useEffect(() => {
    const onOnline = () => setOnline(true), onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  async function createList(event: FormEvent) {
    event.preventDefault(); setError('');
    const now = new Date().toISOString();
    const list: ShoppingList = { id: id(), title: title.trim() || (settings.language === 'bn' ? 'বাজারের তালিকা' : 'Shopping list'), shoppingDate: date, notes: note.trim(), createdAt: now, updatedAt: now };
    try { await db.lists.add(list); await refresh(); setActiveListId(list.id); setTitle(''); setNote(''); setTab('home'); }
    catch (e) { console.error(e); setError(t.saveError); }
  }
  async function addItem(event: FormEvent) {
    event.preventDefault(); if (!activeList || !productName.trim()) return;
    const q = Number(quantity), estimate = estimatedPrice.trim() ? Number(estimatedPrice) : undefined;
    if (!Number.isFinite(q) || q <= 0 || (estimate !== undefined && (!Number.isFinite(estimate) || estimate < 0))) { setError(settings.language === 'bn' ? 'পরিমাণ ও দাম সঠিকভাবে লিখুন।' : 'Enter a valid quantity and non-negative price.'); return; }
    const now = new Date().toISOString();
    const listItems = items.filter(item => item.listId === activeList.id);
    const item: ShoppingItem = { id: id(), listId: activeList.id, name: productName.trim(), quantity: q, unit: unit.trim(), estimatedPrice: estimate, status: 'pending', sortOrder: Math.max(-1, ...listItems.map(i => i.sortOrder)) + 1, createdAt: now, updatedAt: now };
    try { await db.items.add(item); await db.lists.update(activeList.id, { updatedAt: now }); setProductName(''); setQuantity('1'); setEstimatedPrice(''); await refresh(); }
    catch (e) { console.error(e); setError(t.saveError); }
  }
  async function updateItem(item: ShoppingItem, patch: Partial<ShoppingItem>) {
    const updatedAt = new Date().toISOString();
    try { await db.items.update(item.id, { ...patch, updatedAt }); await db.lists.update(item.listId, { updatedAt }); await refresh(); }
    catch (e) { console.error(e); setError(t.saveError); }
  }
  async function removeItem(item: ShoppingItem) {
    if (!confirm(settings.language === 'bn' ? 'পণ্যটি মুছে ফেলবেন?' : 'Remove this product?')) return;
    await db.items.delete(item.id); await refresh();
  }
  async function deleteList(list: ShoppingList) {
    if (!confirm(t.confirmDelete)) return;
    await deleteListWithItems(list.id); if (activeListId === list.id) setActiveListId(null); await refresh();
  }
  async function finishList(list: ShoppingList) {
    await db.lists.update(list.id, { completedAt: list.completedAt ? undefined : new Date().toISOString(), updatedAt: new Date().toISOString() }); await refresh();
  }
  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }
  async function exportCsv() {
    const rows = [['List', 'Date', 'Product', 'Quantity', 'Unit', 'Estimated price', 'Actual price', 'Status'], ...lists.flatMap(l => items.filter(i => i.listId === l.id).map(i => [l.title, l.shoppingDate, i.name, String(i.quantity), i.unit, i.estimatedPrice == null ? '' : String(i.estimatedPrice), i.actualPrice == null ? '' : String(i.actualPrice), i.status]))];
    const csv = '\uFEFF' + rows.map(row => row.map(cell => '"' + cell.replaceAll('"', '""') + '"').join(',')).join('\r\n');
    download('ishtira-shopping.csv', csv, 'text/csv;charset=utf-8');
  }
  async function backup() {
    const data = { schemaVersion: 1, exportedAt: new Date().toISOString(), settings, lists, items, products: await db.products.toArray() };
    download('ishtira-backup.json', JSON.stringify(data, null, 2), 'application/json');
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as { schemaVersion?: number; lists?: ShoppingList[]; items?: ShoppingItem[]; products?: Awaited<ReturnType<typeof db.products.toArray>> };
      if (data.schemaVersion !== 1 || !Array.isArray(data.lists) || !Array.isArray(data.items) || !Array.isArray(data.products ?? [])) throw new Error('Invalid backup schema');
      if (!confirm(settings.language === 'bn' ? 'ব্যাকআপের তথ্য বর্তমান তথ্যের সঙ্গে যোগ করবেন?' : 'Merge this backup with current data?')) return;
      await db.transaction('rw', db.lists, db.items, db.products, async () => {
        await db.lists.bulkPut(data.lists!); await db.items.bulkPut(data.items!); await db.products.bulkPut(data.products ?? []);
      });
      await refresh(); alert(settings.language === 'bn' ? 'ব্যাকআপ পুনরুদ্ধার হয়েছে।' : 'Backup restored.');
    } catch (e) { console.error(e); setError(settings.language === 'bn' ? 'ব্যাকআপ ফাইলটি সঠিক নয়।' : 'Invalid backup file.'); }
  }
  function currency(value: number) {
    return new Intl.NumberFormat(settings.language === 'bn' ? 'bn-BD' : 'en-BD', { style: 'currency', currency: settings.currency, maximumFractionDigits: 2, numberingSystem: settings.useBengaliDigits && settings.language === 'bn' ? 'beng' : 'latn' }).format(value);
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setTab('home'); setActiveListId(null); }} aria-label={t.home}><span className="brand-mark"><ShoppingBasket size={23}/></span><span><strong>Ishtira</strong><small>ইশতিরা</small></span></button>
      <div className="top-actions"><span className={online ? 'network-pill' : 'network-pill offline'}><span/> {online ? t.online : t.offline}</span><button className="icon-button" aria-label={t.language} title={t.language} onClick={() => setSettings(s => ({ ...s, language: s.language === 'bn' ? 'en' : 'bn' }))}><Globe2 size={19}/><small>{settings.language.toUpperCase()}</small></button><button className="icon-button" aria-label={t.theme} title={t.theme} onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : s.theme === 'dark' ? 'system' : 'light' }))}>{settings.theme === 'light' ? <Sun size={19}/> : settings.theme === 'dark' ? <Moon size={19}/> : <Settings2 size={19}/>}</button></div>
    </header>
    <main className="page">
      {error && <div role="alert" className="error-banner">{error}<button onClick={() => setError('')} aria-label="Close"><X size={16}/></button></div>}
      {tab === 'create' && <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">{t.create}</p><h1>{t.newList}</h1></div><span className="heading-icon"><Plus/></span></div>
        <form onSubmit={createList} className="stack-form">
          <label>{t.title}<input value={title} onChange={e => setTitle(e.target.value)} placeholder={settings.language === 'bn' ? 'যেমন: সাপ্তাহিক বাজার' : 'e.g. Weekly groceries'} maxLength={100}/></label>
          <label>{t.date}<input type="date" required value={date} onChange={e => setDate(e.target.value)}/><small className="muted">{weekday(date, settings.language)}</small></label>
          <label>{t.note}<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000}/></label>
          <button className="primary-button" type="submit"><Plus size={18}/>{t.save}</button>
        </form>
      </section>}
      {tab === 'home' && !activeList && <><section className="hero"><div className="hero-copy"><span className="hero-kicker">{t.appName} <span>·</span> Smart shopping</span><h1>{t.greeting}</h1><p>{t.subtitle}</p><button className="primary-button" onClick={() => setTab('create')}><Plus size={18}/>{t.newList}</button></div><div className="hero-art" aria-hidden="true"><div className="art-circle"><ShoppingBasket size={58}/><span className="art-spark">✦</span></div><div className="art-chip chip-one"><Check size={15}/> {t.purchased}</div><div className="art-chip chip-two">৳ {Math.round(totalSpend).toLocaleString(settings.language === 'bn' ? 'bn-BD' : 'en-US')}</div></div></section>
        <section className="stats-grid"><div className="stat-card"><span>{t.lists}</span><strong>{lists.length}</strong><ClipboardList/></div><div className="stat-card"><span>{t.actual}</span><strong>{currency(totalSpend)}</strong><FileText/></div><div className="stat-card"><span>{t.purchased}</span><strong>{items.filter(i => i.status === 'purchased').length}</strong><CheckCircle2/></div></section>
        <section className="list-section"><div className="section-heading"><div><p className="eyebrow">{t.history}</p><h2>{t.lists}</h2></div><button className="secondary-button" onClick={() => setTab('create')}><Plus size={17}/>{t.create}</button></div>
          {lists.length === 0 ? <div className="empty-state"><div className="empty-icon"><ShoppingBasket size={28}/></div><h3>{t.empty}</h3><p>{t.emptyHint}</p><button className="primary-button" onClick={() => setTab('create')}><Plus size={18}/>{t.newList}</button></div> : <div className="list-grid">{lists.map(list => { const sum = summarizeItems(items.filter(i => i.listId === list.id)); return <article className="list-card" key={list.id}><button className="list-card-main" onClick={() => { setActiveListId(list.id); setTab('home'); setSearch(''); setStatusFilter('all'); }}><div className="list-card-icon"><ShoppingBasket size={21}/></div><div className="list-card-title"><h3>{list.title}</h3><p>{new Intl.DateTimeFormat(settings.language === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(list.shoppingDate + 'T12:00:00'))} · {weekday(list.shoppingDate, settings.language)}</p></div><span className={list.completedAt ? 'completion-badge complete' : 'completion-badge'}>{list.completedAt ? <CheckCircle2 size={14}/> : <Circle size={14}/>} {list.completedAt ? t.finish : t.pending}</span></button><div className="mini-progress"><span style={{ width: sum.progress + '%' }}/></div><div className="list-card-footer"><span>{sum.purchased}/{sum.total} {t.purchased}</span><strong>{currency(sum.actualSpend)}</strong><button className="tiny-icon" onClick={() => void deleteList(list)} aria-label={t.delete}><Trash2 size={16}/></button></div></article>; })}</div>}
        </section></>}
      {tab === 'home' && activeList && <section className="panel active-panel">
        <button className="back-link" onClick={() => setActiveListId(null)}>← {t.lists}</button>
        <div className="section-heading"><div><p className="eyebrow">{weekday(activeList.shoppingDate, settings.language)}</p><h1>{activeList.title}</h1><p className="muted">{activeList.shoppingDate}</p></div><button className="secondary-button" onClick={() => void finishList(activeList)}>{activeList.completedAt ? <Circle size={17}/> : <CheckCircle2 size={17}/>} {activeList.completedAt ? t.reopen : t.finish}</button></div>
        <div className="summary-grid"><div><span>{t.total}</span><strong>{summary.total}</strong></div><div><span>{t.purchased}</span><strong>{summary.purchased}</strong></div><div><span>{t.pending}</span><strong>{summary.pending}</strong></div><div><span>{t.skipped}</span><strong>{summary.skipped}</strong></div></div>
        <div className="progress-block"><div className="progress-label"><strong>{t.progress}</strong><strong>{Math.round(summary.progress)}%</strong></div><div className="progress-track"><span style={{ width: summary.progress + '%' }}/></div><div className="progress-caption">{summary.purchased} / {summary.total} {t.purchased}</div></div>
        <div className="expense-strip"><div><span>{t.actual}</span><strong>{currency(summary.actualSpend)}</strong>{summary.unpricedPurchased > 0 && <small>{summary.unpricedPurchased} {t.unpriced}</small>}</div><div><span>{t.estimated}</span><strong>{currency(summary.estimatedSpend)}</strong></div></div>
        <form onSubmit={addItem} className="add-item-form"><h2><Plus size={19}/>{t.addItem}</h2><label>{t.productName}<input autoComplete="off" required value={productName} onChange={e => setProductName(e.target.value)} placeholder={settings.language === 'bn' ? 'যেমন: মাছ, ডিম, চাল' : 'e.g. Fish, eggs, rice'} maxLength={150}/></label><div className="form-row"><label>{t.quantity}<input type="number" min="0.001" step="any" required value={quantity} onChange={e => setQuantity(e.target.value)}/></label><label>{t.unit}<select value={unit} onChange={e => setUnit(e.target.value)}><option>টি</option><option>কেজি</option><option>গ্রাম</option><option>লিটার</option><option>ডজন</option><option>প্যাকেট</option><option>পিস</option></select></label><label>{t.estimate}<input inputMode="decimal" type="number" min="0" step="0.01" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)}/></label></div><button className="primary-button" type="submit"><Plus size={18}/>{t.add}</button></form>
        <div className="items-heading"><h2>{t.total} <span className="count-badge">{summary.total}</span></h2><div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}/></div></div>
        <div className="filter-row">{(['all','pending','purchased','skipped'] as const).map(filter => <button key={filter} className={statusFilter === filter ? 'filter-chip selected' : 'filter-chip'} onClick={() => setStatusFilter(filter)}>{filter === 'all' ? t.all : t[filter]}</button>)}</div>
        <div className="shopping-items">{activeItems.map((item, index) => <article className={'shopping-item ' + item.status} key={item.id}><span className="item-number">{index + 1}</span><button className="status-toggle" aria-label={t.status + ': ' + t[item.status]} title={t.status} onClick={() => void updateItem(item, { status: cycleStatus(item.status) })}>{item.status === 'purchased' ? <CheckCircle2/> : item.status === 'skipped' ? <X/> : <Circle/>}</button><div className="item-details"><strong>{item.name}</strong><small>{item.quantity} {item.unit}{item.estimatedPrice != null ? ' · ' + currency(item.estimatedPrice) : ''}</small></div><label className="actual-price"><span>{settings.language === 'bn' ? 'প্রকৃত ৳' : 'Actual ৳'}</span><input aria-label={(settings.language === 'bn' ? 'প্রকৃত দাম ' : 'Actual price for ') + item.name} type="number" min="0" step="0.01" inputMode="decimal" placeholder="—" value={item.actualPrice ?? ''} onChange={e => { try { const price = validNonNegativePrice(e.target.value); void updateItem(item, { actualPrice: price }); } catch { setError(settings.language === 'bn' ? 'দাম ঋণাত্মক হতে পারবে না।' : 'Price cannot be negative.'); } }}/></label><button className="tiny-icon" onClick={() => void removeItem(item)} aria-label={t.remove + ' ' + item.name}><Trash2 size={16}/></button></article>)}</div>
        {activeItems.length === 0 && <p className="muted centered">{t.noItems}</p>}
      </section>}
      {tab === 'exports' && <section className="panel"><div className="section-heading"><div><p className="eyebrow">{t.exports}</p><h1>{t.history}</h1><p className="muted">{lists.length} {t.lists.toLowerCase()}</p></div><span className="heading-icon"><Archive/></span></div><div className="report-total"><span>{t.actual}</span><strong>{currency(totalSpend)}</strong><small>{settings.language === 'bn' ? 'সব তালিকার কেনা পণ্যের রেকর্ডকৃত দাম' : 'Recorded prices of purchased items across all lists'}</small></div><div className="export-actions"><button className="export-card" onClick={() => void exportCsv()}><Download/><strong>{t.exportCsv}</strong><span>Excel / spreadsheet</span></button><button className="export-card" onClick={() => void backup()}><ArrowDownToLine/><strong>{t.backup}</strong><span>JSON · full local data</span></button><label className="export-card upload-card"><Archive/><strong>{settings.language === 'bn' ? 'ব্যাকআপ পুনরুদ্ধার' : 'Restore backup'}</strong><span>{settings.language === 'bn' ? 'JSON ফাইল বেছে নিন' : 'Choose a JSON file'}</span><input type="file" accept="application/json,.json" onChange={e => { void restore(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label></div><h2 className="subheading">{t.lists}</h2><div className="history-list">{lists.map(list => { const sum = summarizeItems(items.filter(i => i.listId === list.id)); return <button className="history-row" key={list.id} onClick={() => { setActiveListId(list.id); setTab('home'); }}><span className="history-date">{list.shoppingDate}</span><span className="history-name">{list.title}<small>{weekday(list.shoppingDate, settings.language)} · {sum.purchased}/{sum.total}</small></span><strong>{currency(sum.actualSpend)}</strong></button>; })}</div><p className="storage-note">{settings.language === 'bn' ? 'আপনার তথ্য এই ডিভাইসের ব্রাউজারে থাকে। ব্রাউজারের সাইট ডেটা মুছে গেলে তথ্য হারাতে পারেন—নিয়মিত JSON ব্যাকআপ রাখুন।' : 'Your data stays in this browser on this device. Clearing site data may erase it; keep regular JSON backups.'}</p></section>}
    </main>
    <nav className="bottom-nav" aria-label="Primary navigation"><button className={tab === 'create' ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveListId(null); setTab('create'); }}><Plus/><span>{t.create}</span></button><button className={tab === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('home')}><ShoppingBasket/><span>{t.home}</span></button><button className={tab === 'exports' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('exports')}><FileText/><span>{t.exports}</span></button></nav>
    <footer className="app-footer"><span>© {new Date().getFullYear()} Ishtira</span><span>Local-first · Privacy-minded</span></footer>
  </div>;
}
