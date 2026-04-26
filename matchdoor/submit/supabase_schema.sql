-- ============================================================
-- MATCHDOOR — Supabase Schema (URL-only, no base64)
-- วิธีใช้: วาง SQL นี้ใน Supabase SQL Editor แล้วกด Run
-- ============================================================

-- ── 1. PROPERTIES ──────────────────────────────────────────
create table if not exists properties (
  id            uuid default gen_random_uuid() primary key,
  title         text not null,
  type          text not null,                  -- บ้านเดี่ยว | คอนโด | ทาวน์โฮม | ...
  tx            text not null default 'BUY',    -- BUY | RENT
  price         numeric not null default 0,
  province      text,
  location      text,
  description   text,
  bed           int default 0,
  bath          int default 0,
  area          numeric default 0,
  land_area     numeric default 0,
  floors        int default 0,
  floor_no      int default 0,
  parking       int default 0,
  furniture     text default 'none',            -- none | partial | full
  pets_allowed  boolean default false,
  appliances    text[] default '{}',
  is_new        boolean default false,
  is_rec        boolean default false,
  agent_id      text,
  panorama_url  text,                           -- URL รูป 360° (ถ้ามี)
  status        text default 'active',          -- active | sold | rented
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 2. PROPERTY_IMAGES (1 property → หลายรูป) ──────────────
-- เก็บแค่ URL จาก Supabase Storage หรือ CDN อื่น ๆ
create table if not exists property_images (
  id            uuid default gen_random_uuid() primary key,
  property_id   uuid references properties(id) on delete cascade,
  url           text not null,                  -- Storage URL เท่านั้น ไม่มี base64
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_property_images_property_id
  on property_images(property_id);

-- ── 3. AGENTS ──────────────────────────────────────────────
create table if not exists agents (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  title         text,
  phone         text,
  line_id       text,
  initials      text,
  color         text default '#1B3A6B',
  avatar_url    text,                           -- URL เท่านั้น
  rating        numeric default 4.5,
  prop_ids      text[] default '{}',
  bio           text,
  is_active     boolean default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ── 4. PORTFOLIO (ทรัพย์ที่ปิดดีลแล้ว) ──────────────────────
create table if not exists portfolio (
  id            uuid default gen_random_uuid() primary key,
  title         text not null,
  type          text,
  price         numeric,
  status        text default 'SOLD',            -- SOLD | RENTED
  location      text,
  date          text,
  review        text,
  photo         text,                           -- URL เท่านั้น
  photos        text[] default '{}',            -- URL array เท่านั้น
  created_at    timestamptz default now()
);

-- ── 5. SERVICES ────────────────────────────────────────────
create table if not exists services (
  id            text primary key,
  name          text not null,
  icon          text,
  short_desc    text,
  full_desc     text,
  price         text,
  duration      text,
  is_active     boolean default true,
  sort_order    int default 0
);

-- ── 6. BLOGS ───────────────────────────────────────────────
create table if not exists blogs (
  id            uuid default gen_random_uuid() primary key,
  title         text not null,
  cat           text,
  date          text,
  icon          text,
  color         text,
  content       text,
  photos        text[] default '{}',            -- URL array เท่านั้น
  is_published  boolean default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ── 7. LISTINGS (ฝากทรัพย์ form) ──────────────────────────
-- photos เก็บ URL จาก Storage (upload แยก)
create table if not exists listings (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id),
  name                text,
  phone               text,
  property_type       text,
  price               numeric,
  province            text,
  transaction         text,
  details             text,
  photo_urls          text[] default '{}',      -- URL array (ไม่มี base64)
  status              text default 'รอตรวจสอบ',
  consent_given       boolean default false,
  consent_timestamp   timestamptz,
  created_at          timestamptz default now()
);

-- ── 8. BUY_REQUESTS (แจ้งความต้องการ) ─────────────────────
create table if not exists buy_requests (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id),
  name                text,
  phone               text,
  line_id             text,
  property_type       text,
  budget              numeric,
  province            text,
  transaction         text,
  details             text,
  status              text default 'ใหม่',
  consent_given       boolean default false,
  consent_timestamp   timestamptz,
  created_at          timestamptz default now()
);

-- ── 9. LEGAL_PAGES ─────────────────────────────────────────
create table if not exists legal_pages (
  id            text primary key,              -- privacy | terms | acceptable_use | buy_sell | cookie
  title         text,
  content       text,
  version       text,
  effective_date text,
  updated_at    timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- เปิด RLS ทุกตาราง
alter table properties     enable row level security;
alter table property_images enable row level security;
alter table agents         enable row level security;
alter table portfolio      enable row level security;
alter table services       enable row level security;
alter table blogs          enable row level security;
alter table listings       enable row level security;
alter table buy_requests   enable row level security;
alter table legal_pages    enable row level security;

-- ── Public read-only (anon) ──────────────────────────────
create policy "public_read_properties"    on properties      for select using (status = 'active');
create policy "public_read_prop_images"   on property_images for select using (true);
create policy "public_read_agents"        on agents          for select using (is_active = true);
create policy "public_read_portfolio"     on portfolio       for select using (true);
create policy "public_read_services"      on services        for select using (is_active = true);
create policy "public_read_blogs"         on blogs           for select using (is_published = true);
create policy "public_read_legal"         on legal_pages     for select using (true);

-- ── Authenticated users: insert own listings/requests ────
create policy "auth_insert_listings"      on listings        for insert with check (auth.uid() = user_id);
create policy "auth_read_own_listings"    on listings        for select using (auth.uid() = user_id);
create policy "auth_insert_buy_requests"  on buy_requests    for insert with check (auth.uid() = user_id);
create policy "auth_read_own_requests"    on buy_requests    for select using (auth.uid() = user_id);

-- ============================================================
-- SUPABASE STORAGE — สร้าง bucket "property-images"
-- ============================================================
-- วิธีสร้าง bucket: Supabase Dashboard → Storage → New Bucket
--   name: property-images
--   public: true (เพื่อให้อ่าน URL ได้โดยไม่ต้อง sign)
--
-- Storage Policy (ในหน้า Storage Policies):
--   SELECT: public (anyone)
--   INSERT: authenticated only
--   DELETE: authenticated only (owner)

-- ── Helper view: properties + images รวมกัน ──────────────
create or replace view properties_with_images as
select
  p.*,
  coalesce(
    array_agg(pi.url order by pi.sort_order) filter (where pi.url is not null),
    '{}'::text[]
  ) as image_urls
from properties p
left join property_images pi on pi.property_id = p.id
group by p.id;

-- Grant select on view to anon
grant select on properties_with_images to anon;

-- ============================================================
-- SAMPLE DATA (ใช้ URL จาก picsum แทน base64)
-- ============================================================
insert into properties (title, type, tx, price, province, location, description, bed, bath, area, land_area, floors, floor_no, parking, furniture, pets_allowed, appliances, is_new, is_rec, agent_id)
values
  ('บ้านเดี่ยว 2 ชั้น หมู่บ้านพฤกษา', 'บ้านเดี่ยว', 'BUY', 4500000, 'กรุงเทพฯ', 'ลาดกระบัง กรุงเทพฯ', 'บ้านเดี่ยว 2 ชั้น ทำเลดี ใกล้ทางด่วน เฟอร์นิเจอร์ครบ', 3, 2, 180, 52, 2, 0, 2, 'full', true, '{"แอร์","ตู้เย็น","เครื่องซักผ้า"}', true, true, null),
  ('คอนโด ลุมพินี วิลล์ รัชโยธิน', 'คอนโด', 'BUY', 2200000, 'กรุงเทพฯ', 'จตุจักร กรุงเทพฯ', 'คอนโดใกล้รถไฟฟ้า BTS พร้อมอยู่', 1, 1, 35, 0, 25, 12, 1, 'full', false, '{"แอร์","ตู้เย็น","โทรทัศน์"}', false, true, null)
on conflict do nothing;
