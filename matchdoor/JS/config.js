// ============================================================
// js/config.js — CONFIG, SUPABASE INIT, STATE
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
// ⚠️ ใช้ anon key เท่านั้น — ห้ามใส่ service_role key
const C = {
  SUPABASE_URL: 'https://hfirlvqikxssmsvuurmm.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaXJsdnFpa3hzc21zdnV1cm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTc4MDAsImV4cCI6MjA5MjM3MzgwMH0.nHpZQRdKw5SqnFv_DCAFQDPHlco1LUwOVXOvrdIuHlY',
  NAME:      'Matchdoor',
  HERO_SUB:  'บ้าน คอนโด ที่ดิน ทุกประเภท ทุกทำเล ราคาดีที่สุด',
  SRV_TITLE: 'บริการครบจบทุกขั้นตอน',
  SRV_SUB:   'อยากซื้อ อยากขาย อสังหาฯ ปรึกษาเรา',
  ADDR:      '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  PHONE:     '061-589-xxxx',
  LINE:      '@matchdoor',
  FB:        'https://facebook.com/matchdoor.official',
  YT:        'https://www.youtube.com/embed/VUQfT3gNT3g?si=WDXL3fAOPfFaeVFb',
  COPYRIGHT: '© 2569 Matchdoor — สงวนลิขสิทธิ์',
  // Supabase Storage bucket name
  STORAGE_BUCKET: 'property-images',
};

// ── GLOBAL STATE ─────────────────────────────────────────────
let props = [], agents = [], port = [], services = [], blogs = [], filtered = [];
let tx = 'BUY', curType = '';
let favs = JSON.parse(localStorage.getItem('md_favs') || '[]').map(id => String(id));
let slide_cur = 0, slide_photos = [], slide_icon = '🏠';
let sb = null, user = null, uploads = [];
let locActiveCat = null;
let allFiltered = [];

// ── SUPABASE INIT ─────────────────────────────────────────────
function initSB() {
  const url = (C.SUPABASE_URL || '').trim();
  const key = (C.SUPABASE_KEY || '').trim();
  if (!url || !key || url === 'demo' || !url.startsWith('https://')) return false;
  try {
    sb = window.supabase.createClient(url, key);
    return true;
  } catch (e) {
    console.error('Supabase init failed:', e);
    return false;
  }
}

// ── SUPABASE STORAGE UPLOAD ───────────────────────────────────
// ใช้แทน base64 — อัปโหลด File object → คืน public URL
async function uploadImageToStorage(file, folder = 'listings') {
  if (!sb) throw new Error('Supabase not initialized');
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await sb.storage
    .from(C.STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = sb.storage
    .from(C.STORAGE_BUCKET)
    .getPublicUrl(data.path);
  return publicUrl; // คืน URL string — ไม่มี base64 เด็ดขาด
}

// ── SUPABASE HELPERS ──────────────────────────────────────────
async function sbFetch(table, opts = {}) {
  const q = sb.from(table).select(opts.select || '*');
  if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => q.eq(k, v));
  if (opts.order) q.order(opts.order, { ascending: false });
  const { data, error } = await q;
  if (error) { console.error('[sbFetch]', table, error); return null; }
  return data;
}

async function sbInsert(table, data) {
  if (user) data.user_id = user.id;
  const { error } = await sb.from(table).insert([data]);
  if (error) throw new Error(error.message);
}

// ── UTILS ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function toast(msg, err = false) {
  const t = $('toast');
  t.textContent = msg;
  t.style.background = err ? 'rgba(200,50,50,.9)' : 'rgba(0,0,0,.85)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function loading(s) { $('loading').classList.toggle('show', s); }

function fmtPrice(p, t) {
  if (t === 'RENT') return '฿' + p.toLocaleString() + ' /เดือน';
  if (p >= 1e6) return '฿' + (p / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' ล้าน';
  return '฿' + p.toLocaleString();
}

function typeIcon(t) {
  const map = { 'บ้านเดี่ยว': '🏡', 'ทาวน์โฮม': '🏘️', 'คอนโด': '🏢', 'ที่ดิน': '🗺️', 'อาคารพาณิชย์': '🏪', 'วิลล่า': '🌅', 'รีสอร์ท': '🌙', 'โรงแรม': '⭐' };
  return map[t] || '🏠';
}

function daysAgo(d) {
  if (!d) return '';
  const n = Math.floor((new Date() - new Date(d)) / 864e5);
  if (n === 0) return 'วันนี้';
  if (n === 1) return 'เมื่อวาน';
  return n < 7 ? n + ' วันที่แล้ว' : n < 30 ? Math.floor(n / 7) + ' สัปดาห์ที่แล้ว' : Math.floor(n / 30) + ' เดือนที่แล้ว';
}

function lineUrl(id) { return 'https://line.me/ti/p/' + (id || C.LINE).replace(/^~/, ''); }

function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function isValidThaiPhone(phone) {
  return /^0[689]\d{8}$/.test(phone.replace(/[-\s]/g, ''));
}

function isValidName(name) { return name.trim().length >= 2; }
function isValidPrice(price) { return !isNaN(price) && Number(price) > 0; }

const _submitCooldown = {};
function isOnCooldown(key, ms = 4000) {
  const last = _submitCooldown[key] || 0;
  if (Date.now() - last < ms) return true;
  _submitCooldown[key] = Date.now();
  return false;
}

function scrollToEl(id) { $(id)?.scrollIntoView({ behavior: 'smooth' }); }
