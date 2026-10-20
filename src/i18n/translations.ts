import type { Language } from '../types';
export const translations = {
  bn: {
    create: 'তালিকা তৈরি', home: 'ইশতিরা', exports: 'হিসাব ও রিপোর্ট', greeting: 'আজকের বাজার, সহজ হিসাব',
    subtitle: 'আপনার বাজারের তালিকা ও খরচ—এক জায়গায়।', newList: 'নতুন বাজারের তালিকা', title: 'তালিকার নাম',
    date: 'বাজারের তারিখ', addItem: 'পণ্য যোগ করুন', productName: 'পণ্যের নাম', quantity: 'পরিমাণ',
    unit: 'একক', estimate: 'আনুমানিক দাম (৳)', add: 'যোগ করুন', save: 'তালিকা সংরক্ষণ', lists: 'আপনার তালিকা',
    empty: 'এখনো কোনো তালিকা নেই', emptyHint: 'প্রথম বাজারের তালিকাটি তৈরি করুন।', total: 'মোট পণ্য',
    purchased: 'কেনা হয়েছে', pending: 'বাকি', skipped: 'বাদ', progress: 'অগ্রগতি', actual: 'প্রকৃত খরচ',
    estimated: 'আনুমানিক খরচ', unpriced: 'দাম লেখা হয়নি', delete: 'মুছুন', confirmDelete: 'এই তালিকাটি মুছবেন?',
    search: 'পণ্য খুঁজুন', all: 'সব', settings: 'সেটিংস', language: 'ভাষা', theme: 'থিম',
    light: 'লাইট', dark: 'ডার্ক', system: 'সিস্টেম', exportCsv: 'CSV ডাউনলোড', backup: 'JSON ব্যাকআপ',
    history: 'বাজারের ইতিহাস', finish: 'বাজার শেষ', reopen: 'আবার খুলুন', note: 'নোট (ঐচ্ছিক)',
    noItems: 'এই তালিকায় এখনো পণ্য যোগ হয়নি', currency: 'টাকা', status: 'অবস্থা', remove: 'সরান',
    appName: 'ইশতিরা', saveError: 'তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।', online: 'অনলাইন', offline: 'অফলাইন'
  },
  en: {
    create: 'Create list', home: 'Ishtira', exports: 'Reports', greeting: 'Shopping, made simpler',
    subtitle: 'Your shopping list and expenses in one place.', newList: 'Create a shopping list', title: 'List title',
    date: 'Shopping date', addItem: 'Add a product', productName: 'Product name', quantity: 'Quantity',
    unit: 'Unit', estimate: 'Estimated price (৳)', add: 'Add item', save: 'Save list', lists: 'Your lists',
    empty: 'No shopping lists yet', emptyHint: 'Create your first shopping list.', total: 'Total items',
    purchased: 'Purchased', pending: 'Pending', skipped: 'Skipped', progress: 'Progress', actual: 'Actual spend',
    estimated: 'Estimated spend', unpriced: 'Purchased without price', delete: 'Delete', confirmDelete: 'Delete this list?',
    search: 'Search products', all: 'All', settings: 'Settings', language: 'Language', theme: 'Theme',
    light: 'Light', dark: 'Dark', system: 'System', exportCsv: 'Download CSV', backup: 'JSON backup',
    history: 'Shopping history', finish: 'Finish shopping', reopen: 'Reopen', note: 'Notes (optional)',
    noItems: 'No products in this list yet', currency: 'BDT', status: 'Status', remove: 'Remove',
    appName: 'Ishtira', saveError: 'Could not save data. Please try again.', online: 'Online', offline: 'Offline'
  }
} satisfies Record<Language, Record<string, string>>;
