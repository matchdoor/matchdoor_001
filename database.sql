-- ============================================================
-- MATCHDOOR — Supabase SQL Schema + Seed Data (สมบูรณ์ รองรับ rerun)
-- รองรับ: Supabase Auth, RLS, User Input Forms, Slider Images, Avatar Agents
-- วิธีใช้: รันใน Supabase SQL Editor (รันซ้ำได้ ไม่ error)
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUM TYPES (ใช้ DO Block ป้องกันซ้ำ)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE property_type_enum AS ENUM (
    'บ้านเดี่ยว','ทาวน์โฮม','คอนโด','ที่ดิน',
    'อาคารพาณิชย์','วิลล่า','รีสอร์ท','โรงแรม'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_enum AS ENUM ('BUY','RENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status_enum AS ENUM ('รอตรวจสอบ','อนุมัติ','ปฏิเสธ','ปิด');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status_enum AS ENUM ('ใหม่','กำลังดำเนินการ','จับคู่แล้ว','ปิด');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portfolio_status_enum AS ENUM ('SOLD','RENTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. TABLE: agents
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  title       TEXT,
  phone       TEXT,
  line_id     TEXT,
  initials    TEXT,
  color       TEXT DEFAULT '#0f3460',
  bio         TEXT,
  prop_ids    TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE agents IS 'ตัวแทน/นายหน้าอสังหาริมทรัพย์';

-- ============================================================
-- 3. TABLE: properties
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        property_type_enum,
  province    TEXT,
  location    TEXT,
  price       NUMERIC(18,2) NOT NULL DEFAULT 0,
  tx          transaction_enum NOT NULL DEFAULT 'BUY',
  bed         INT DEFAULT 0,
  bath        INT DEFAULT 0,
  area        NUMERIC(12,2) DEFAULT 0,
  is_new      BOOLEAN DEFAULT FALSE,
  is_rec      BOOLEAN DEFAULT FALSE,
  description TEXT,
  agent_id    TEXT REFERENCES agents(id) ON DELETE SET NULL,
  photos      TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE properties IS 'รายการอสังหาริมทรัพย์สำหรับขาย/เช่า';

-- ============================================================
-- 4. TABLE: portfolio
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        property_type_enum,
  price       NUMERIC(18,2),
  status      portfolio_status_enum,
  location    TEXT,
  date        TEXT,
  review      TEXT,
  photo       TEXT,
  photos      TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE portfolio IS 'ผลงานปิดดีล (SOLD/RENTED)';

-- ============================================================
-- 5. TABLE: services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  short_desc  TEXT,
  full_desc   TEXT,
  price       TEXT,
  duration    TEXT,
  line_id     TEXT,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE services IS 'บริการเสริม เช่น ล้างแอร์ แม่บ้าน ซ่อมบ้าน';

-- ============================================================
-- 6. TABLE: blogs (เพิ่ม photos)
-- ============================================================
CREATE TABLE IF NOT EXISTS blogs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  cat         TEXT,
  date        TEXT,
  icon        TEXT,
  color       TEXT,
  content     TEXT,
  photos      TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE blogs IS 'บทความ/สาระน่ารู้ด้านอสังหาฯ';

-- ============================================================
-- 7. TABLE: listings
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  property_type   TEXT,
  price           NUMERIC(18,2) DEFAULT 0,
  province        TEXT,
  transaction     TEXT,
  details         TEXT,
  photos          TEXT[] DEFAULT '{}',
  status          listing_status_enum DEFAULT 'รอตรวจสอบ',
  admin_note      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE listings IS 'แบบฟอร์มฝากทรัพย์จาก user';

-- ============================================================
-- 8. TABLE: buy_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS buy_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  line_id         TEXT,
  property_type   TEXT,
  budget          NUMERIC(18,2) DEFAULT 0,
  province        TEXT,
  transaction     TEXT,
  details         TEXT,
  status          request_status_enum DEFAULT 'ใหม่',
  matched_prop_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  admin_note      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. TABLE: favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- ============================================================
-- 10. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['agents','properties','blogs','listings','buy_requests'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I; CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS) พร้อม DROP IF EXISTS
-- ============================================================
ALTER TABLE properties   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio    ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_properties" ON properties;
CREATE POLICY "public_read_properties" ON properties FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "public_read_agents" ON agents;
CREATE POLICY "public_read_agents" ON agents FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "public_read_portfolio" ON portfolio;
CREATE POLICY "public_read_portfolio" ON portfolio FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "public_read_services" ON services;
CREATE POLICY "public_read_services" ON services FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "public_read_blogs" ON blogs;
CREATE POLICY "public_read_blogs" ON blogs FOR SELECT USING (is_published = TRUE);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listings_insert_auth" ON listings;
CREATE POLICY "listings_insert_auth" ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "listings_select_own" ON listings;
CREATE POLICY "listings_select_own" ON listings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own" ON listings FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE buy_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyrq_insert_auth" ON buy_requests;
CREATE POLICY "buyrq_insert_auth" ON buy_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "buyrq_select_own" ON buy_requests;
CREATE POLICY "buyrq_select_own" ON buy_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "buyrq_update_own" ON buy_requests;
CREATE POLICY "buyrq_update_own" ON buy_requests FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fav_all_own" ON favorites;
CREATE POLICY "fav_all_own" ON favorites USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 12. INDEXES (DROP IF EXISTS ก่อนสร้าง)
-- ============================================================
DROP INDEX IF EXISTS idx_properties_tx;
CREATE INDEX idx_properties_tx ON properties(tx);

DROP INDEX IF EXISTS idx_properties_type;
CREATE INDEX idx_properties_type ON properties(type);

DROP INDEX IF EXISTS idx_properties_province;
CREATE INDEX idx_properties_province ON properties(province);

DROP INDEX IF EXISTS idx_properties_price;
CREATE INDEX idx_properties_price ON properties(price);

DROP INDEX IF EXISTS idx_properties_agent;
CREATE INDEX idx_properties_agent ON properties(agent_id);

DROP INDEX IF EXISTS idx_listings_status;
CREATE INDEX idx_listings_status ON listings(status);

DROP INDEX IF EXISTS idx_listings_user;
CREATE INDEX idx_listings_user ON listings(user_id);

DROP INDEX IF EXISTS idx_buyrq_status;
CREATE INDEX idx_buyrq_status ON buy_requests(status);

DROP INDEX IF EXISTS idx_buyrq_user;
CREATE INDEX idx_buyrq_user ON buy_requests(user_id);

DROP INDEX IF EXISTS idx_fav_user;
CREATE INDEX idx_fav_user ON favorites(user_id);

-- ============================================================
-- 13. SEED DATA — agents (20 คน) + avatar_url
-- ============================================================
INSERT INTO agents (id,name,title,phone,line_id,initials,color,avatar_url) VALUES
 ('a1' ,'สมชาย มั่นคง'          ,'ผู้จัดการฝ่ายขาย'                   ,'081-234-5678','@somchai'  ,'สม','#0f3460','https://randomuser.me/api/portraits/men/1.jpg'),
 ('a2' ,'วารี สุขสันต์'          ,'ที่ปรึกษาอสังหาริมทรัพย์'           ,'082-345-6789','@waree'    ,'วร','#00b894','https://randomuser.me/api/portraits/women/2.jpg'),
 ('a3' ,'ประภัส รุ่งเรือง'       ,'ผู้เชี่ยวชาญที่ดิน'                 ,'083-456-7890','@praphat'  ,'ปภ','#6c5ce7','https://randomuser.me/api/portraits/men/3.jpg'),
 ('a4' ,'ณัฐธิดา ใจดี'           ,'ที่ปรึกษา Luxury'                   ,'084-567-8901','@nuttida'  ,'ณธ','#e17055','https://randomuser.me/api/portraits/women/4.jpg'),
 ('a5' ,'ธนากร วัฒนา'            ,'นายหน้าอสังหาฯ'                     ,'085-678-9012','@thanakorn' ,'ธน','#0984e3','https://randomuser.me/api/portraits/men/5.jpg'),
 ('a6' ,'กมลชนก ปรีชา'           ,'ผู้ช่วยผู้จัดการขาย'                ,'086-789-0123','@kamon'    ,'กม','#d63031','https://randomuser.me/api/portraits/women/6.jpg'),
 ('a7' ,'วิศรุต สมบูรณ์'         ,'ที่ปรึกษาบ้านจัดสรร'                ,'087-890-1234','@wisarut'  ,'วิ','#fdcb6e','https://randomuser.me/api/portraits/men/7.jpg'),
 ('a8' ,'สุทธิดา มงคล'           ,'ตัวแทนขายคอนโด'                     ,'088-901-2345','@suttida'  ,'สุ','#e84393','https://randomuser.me/api/portraits/women/8.jpg'),
 ('a9' ,'อภิชาติ ศรีเมือง'       ,'ผู้เชี่ยวชาญอสังหาฯ ภูเก็ต'        ,'089-012-3456','@apichat'  ,'อภ','#2d3436','https://randomuser.me/api/portraits/men/9.jpg'),
 ('a10','นริศรา อินทร์สุข'        ,'ที่ปรึกษาการลงทุน'                  ,'080-123-4567','@narisara' ,'นร','#00cec9','https://randomuser.me/api/portraits/women/10.jpg'),
 ('a11','เจษฎา ทรัพย์เจริญ'      ,'ผู้จัดการฝ่ายขายภาคตะวันออก'       ,'081-234-5670','@jedsada'  ,'เจ','#a29bfe','https://randomuser.me/api/portraits/men/11.jpg'),
 ('a12','พิมพ์ชนก เลิศล้ำ'       ,'ตัวแทนขายที่ดิน'                    ,'082-345-6780','@pimchanok','พิ','#fd79a8','https://randomuser.me/api/portraits/women/12.jpg'),
 ('a13','ศุภวิชญ์ ไพบูลย์'       ,'ที่ปรึกษาคอนโดมิเนียม'              ,'083-456-7891','@supawit'  ,'ศุ','#6c5ce7','https://randomuser.me/api/portraits/men/13.jpg'),
 ('a14','ปิยธิดา สุขเกษม'        ,'ผู้ช่วยตัวแทน'                      ,'084-567-8902','@piyathida','ปิ','#e17055','https://randomuser.me/api/portraits/women/14.jpg'),
 ('a15','นันทวัฒน์ จินดา'        ,'นายหน้าอสังหาฯ เชียงใหม่'           ,'085-678-9013','@nuntawat' ,'นั','#0984e3','https://randomuser.me/api/portraits/men/15.jpg'),
 ('a16','รุ่งทิวา สิริโชค'       ,'ที่ปรึกษาบ้านหรู'                   ,'086-789-0124','@rungtiwa' ,'รุ','#d63031','https://randomuser.me/api/portraits/women/16.jpg'),
 ('a17','ชญานิศ แก้วใส'          ,'ตัวแทนขายทาวน์โฮม'                  ,'087-890-1235','@chayanis' ,'ชญ','#fdcb6e','https://randomuser.me/api/portraits/women/17.jpg'),
 ('a18','ธีรภัทร วงศ์ดี'         ,'ผู้เชี่ยวชาญอสังหาฯ เพื่อการพาณิชย์','088-901-2346','@teerapat' ,'ธี','#e84393','https://randomuser.me/api/portraits/men/18.jpg'),
 ('a19','กัญญารัตน์ ภักดี'       ,'ที่ปรึกษาด้านการเช่า'               ,'089-012-3457','@kanyarat' ,'กั','#2d3436','https://randomuser.me/api/portraits/women/19.jpg'),
 ('a20','ปวรุตม์ เกียรติกุล'     ,'ผู้จัดการฝ่ายลูกค้าสัมพันธ์'       ,'080-123-4568','@pawarut'  ,'ปว','#00cec9','https://randomuser.me/api/portraits/men/20.jpg')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. SEED DATA — properties (20 รายการ) พร้อม agent_id และ photos
-- ============================================================
INSERT INTO properties (id,title,type,province,location,price,tx,bed,bath,area,is_new,is_rec,description,agent_id,photos,created_at) VALUES
 ('p1' ,'บ้านเดี่ยว 2 ชั้น หมู่บ้านพฤกษา'         ,'บ้านเดี่ยว'     ,'กรุงเทพฯ'      ,'ลาดกระบัง กรุงเทพฯ'       , 4500000,'BUY' ,3,2,180 ,TRUE ,TRUE ,'บ้านเดี่ยว 2 ชั้น ทำเลดี ใกล้ทางด่วน'                         ,'a1' ,ARRAY['https://picsum.photos/id/101/800/600','https://picsum.photos/id/111/800/600'],'2025-04-20'),
 ('p2' ,'คอนโด ลุมพินี วิลล์ รัชโยธิน'             ,'คอนโด'          ,'กรุงเทพฯ'      ,'จตุจักร กรุงเทพฯ'          , 2200000,'BUY' ,1,1,35  ,FALSE,TRUE ,'คอนโดใกล้รถไฟฟ้า BTS พร้อมอยู่'                               ,'a2' ,ARRAY['https://picsum.photos/id/102/800/600'],'2025-03-15'),
 ('p3' ,'ทาวน์โฮม 3 ชั้น ใกล้รถไฟฟ้าสายสีม่วง'    ,'ทาวน์โฮม'       ,'นนทบุรี'       ,'ปากเกร็ด นนทบุรี'          , 3200000,'BUY' ,3,2,140 ,TRUE ,FALSE,'โครงการใหม่ ใกล้ MRT สายสีม่วง'                                ,'a3' ,ARRAY['https://picsum.photos/id/103/800/600'],'2025-05-01'),
 ('p4' ,'ที่ดินเปล่า ติดถนนใหญ่ ทำเลทอง'          ,'ที่ดิน'         ,'ชลบุรี'        ,'บางละมุง ชลบุรี'           , 8900000,'BUY' ,0,0,400 ,FALSE,TRUE ,'ที่ดินเปล่า ติดถนน 4 เลน เหมาะลงทุน'                          ,'a4' ,ARRAY['https://picsum.photos/id/104/800/600'],'2025-02-10'),
 ('p5' ,'คอนโดให้เช่า แอชตัน อโศก'                ,'คอนโด'          ,'กรุงเทพฯ'      ,'อโศก กรุงเทพฯ'             ,   35000,'RENT',2,2,65  ,FALSE,TRUE ,'คอนโดหรู ใจกลางเมือง ใกล้ BTS อโศก'                           ,'a5' ,ARRAY['https://picsum.photos/id/105/800/600'],'2025-04-01'),
 ('p6' ,'บ้านเดี่ยว รามอินทรา กม.8'               ,'บ้านเดี่ยว'     ,'กรุงเทพฯ'      ,'รามอินทรา กรุงเทพฯ'        , 5200000,'BUY' ,4,3,210 ,TRUE ,FALSE,'บ้านเดี่ยวสไตล์โมเดิร์น ใกล้ห้าง'                              ,'a6' ,ARRAY['https://picsum.photos/id/106/800/600'],'2025-04-25'),
 ('p7' ,'คอนโด ไอดีโอ สาทร'                       ,'คอนโด'          ,'กรุงเทพฯ'      ,'สาทร กรุงเทพฯ'             , 3800000,'BUY' ,2,1,45  ,FALSE,TRUE ,'คอนโดติด BTS สาทร'                                             ,'a7' ,ARRAY['https://picsum.photos/id/107/800/600'],'2025-03-20'),
 ('p8' ,'ทาวน์โฮม ลาดพร้าว 71'                    ,'ทาวน์โฮม'       ,'กรุงเทพฯ'      ,'ลาดพร้าว กรุงเทพฯ'         , 3900000,'BUY' ,3,2,150 ,TRUE ,TRUE ,'ทาวน์โฮม ใกล้ MRT ลาดพร้าว'                                   ,'a1' ,ARRAY['https://picsum.photos/id/108/800/600'],'2025-05-05'),
 ('p9' ,'วิลล่า 3 ห้องนอน หาดบางเทา'              ,'วิลล่า'         ,'ภูเก็ต'        ,'เชิงทะเล ภูเก็ต'           ,12500000,'BUY' ,3,3,250 ,TRUE ,TRUE ,'วิลล่าส่วนตัว ห่างชายหาด 500 เมตร'                            ,'a9' ,ARRAY['https://picsum.photos/id/109/800/600'],'2025-06-01'),
 ('p10','รีสอร์ท ขนาด 10 ห้อง พัทยา'              ,'รีสอร์ท'        ,'ชลบุรี'        ,'พัทยาใต้ ชลบุรี'           ,28000000,'BUY' ,10,10,800,FALSE,TRUE ,'รีสอร์ทพร้อมผู้เข้าพัก มีสระว่ายน้ำ'                          ,'a10',ARRAY['https://picsum.photos/id/110/800/600'],'2025-03-01'),
 ('p11','อาคารพาณิชย์ 4 ชั้น ถนนเพชรบุรี'         ,'อาคารพาณิชย์'  ,'กรุงเทพฯ'      ,'เพชรบุรีตัดใหม่'           , 9500000,'BUY' ,0,3,160 ,FALSE,FALSE,'อาคารพาณิชย์ หน้ากว้าง 5 เมตร เหมาะทำธุรกิจ'                 ,'a11',ARRAY['https://picsum.photos/id/112/800/600'],'2025-01-15'),
 ('p12','บ้านเดี่ยวให้เช่า บางนา-ตราด'            ,'บ้านเดี่ยว'     ,'กรุงเทพฯ'      ,'บางนา กรุงเทพฯ'            ,   25000,'RENT',3,2,150 ,TRUE ,TRUE ,'บ้านเดี่ยว 2 ชั้น ตกแต่งใหม่'                                  ,'a12',ARRAY['https://picsum.photos/id/113/800/600'],'2025-06-10'),
 ('p13','คอนโดให้เช่า ใกล้ ม.เกษตรศาสตร์'         ,'คอนโด'          ,'กรุงเทพฯ'      ,'ลาดยาว กรุงเทพฯ'           ,   12000,'RENT',1,1,30  ,FALSE,FALSE,'คอนโดสตูดิโอ เฟอร์นิเจอร์ครบ'                                  ,'a2' ,ARRAY['https://picsum.photos/id/114/800/600'],'2025-04-18'),
 ('p14','ทาวน์โฮมให้เช่า รังสิต คลอง 3'           ,'ทาวน์โฮม'       ,'ปทุมธานี'      ,'รังสิต คลอง 3'             ,    9000,'RENT',2,1,90  ,TRUE ,FALSE,'ทาวน์โฮม 2 ชั้น ใกล้ตลาด'                                      ,'a13',ARRAY['https://picsum.photos/id/115/800/600'],'2025-05-20'),
 ('p15','ที่ดินเปล่า 100 ตร.วา พระราม 2'          ,'ที่ดิน'         ,'กรุงเทพฯ'      ,'พระราม 2 ซอย 40'           , 5500000,'BUY' ,0,0,400 ,FALSE,TRUE ,'ที่ดินเปล่า หน้ากว้าง 20 เมตร'                                 ,'a4' ,ARRAY['https://picsum.photos/id/116/800/600'],'2025-02-28'),
 ('p16','คอนโดหรู วิวแม่น้ำ เจริญนคร'             ,'คอนโด'          ,'กรุงเทพฯ'      ,'เจริญนคร'                  , 8500000,'BUY' ,2,2,70  ,TRUE ,TRUE ,'คอนโดระดับลักซ์ชัวรี่ วิวแม่น้ำ'                               ,'a5' ,ARRAY['https://picsum.photos/id/117/800/600'],'2025-06-15'),
 ('p17','บ้านเดี่ยว 2 ชั้น เสรีไทย'               ,'บ้านเดี่ยว'     ,'กรุงเทพฯ'      ,'เสรีไทย มีนบุรี'           , 3800000,'BUY' ,3,2,165 ,FALSE,FALSE,'บ้านเดี่ยว หมู่บ้านนิรันดร์'                                   ,'a6' ,ARRAY['https://picsum.photos/id/118/800/600'],'2025-03-10'),
 ('p18','ที่ดินอุตสาหกรรม 5 ไร่ ฉะเชิงเทรา'      ,'ที่ดิน'         ,'ฉะเชิงเทรา'   ,'บางปะกง'                   ,25000000,'BUY' ,0,0,8000,TRUE ,TRUE ,'ที่ดินติดถนนสาย 304 เหมาะสร้างโรงงาน'                         ,'a10',ARRAY['https://picsum.photos/id/119/800/600'],'2025-05-01'),
 ('p19','คอนโดให้เช่า แถว ม.รังสิต'               ,'คอนโด'          ,'ปทุมธานี'      ,'คลองหลวง'                  ,    8000,'RENT',1,1,28  ,FALSE,FALSE,'คอนโดใกล้มหาวิทยาลัย'                                          ,'a12',ARRAY['https://picsum.photos/id/120/800/600'],'2025-04-05'),
 ('p20','บ้านเดี่ยวหรู บางพลี'                    ,'บ้านเดี่ยว'     ,'สมุทรปราการ'  ,'บางพลี'                    ,12900000,'BUY' ,4,4,320 ,TRUE ,TRUE ,'บ้านเดี่ยวสไตล์อังกฤษ สนามหญ้ากว้าง'                          ,'a14',ARRAY['https://picsum.photos/id/121/800/600'],'2025-06-20')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 15. SEED DATA — portfolio (20 ผลงาน) พร้อม photos array
-- ============================================================
INSERT INTO portfolio (id,title,type,price,status,location,date,review,photo,photos) VALUES
 ('pt1' ,'บ้านเดี่ยว ร่มเกล้า กรุงเทพฯ'   ,'บ้านเดี่ยว'  , 3800000,'SOLD'  ,'ร่มเกล้า'         ,'ม.ค. 2568','บริการดีมาก โอนได้เร็ว','https://picsum.photos/id/101/400/300',ARRAY['https://picsum.photos/id/101/400/300','https://picsum.photos/id/101/600/400','https://picsum.photos/id/101/800/600']),
 ('pt2' ,'คอนโด เดอะ ลาม คาราฟ'           ,'คอนโด'       , 1900000,'SOLD'  ,'อ่อนนุช'          ,'ก.พ. 2568','ขายได้เร็ว ราคาดีกว่าที่คิด','https://picsum.photos/id/102/400/300',ARRAY['https://picsum.photos/id/102/400/300','https://picsum.photos/id/102/600/400']),
 ('pt3' ,'ทาวน์โฮม ศุภาลัย บางพลี'        ,'ทาวน์โฮม'    , 2600000,'SOLD'  ,'บางพลี'           ,'ก.พ. 2568','ช่วยจัดการเรื่องกู้ได้เลย ประทับใจ','https://picsum.photos/id/103/400/300',ARRAY['https://picsum.photos/id/103/400/300','https://picsum.photos/id/103/600/400']),
 ('pt4' ,'คอนโดให้เช่า สาทร'              ,'คอนโด'       ,   22000,'RENTED','สาทร'              ,'มี.ค. 2568','หาผู้เช่าได้ภายใน 2 สัปดาห์','https://picsum.photos/id/104/400/300',ARRAY['https://picsum.photos/id/104/400/300','https://picsum.photos/id/104/600/400']),
 ('pt5' ,'บ้านเดี่ยว พระราม 2'            ,'บ้านเดี่ยว'  , 5200000,'SOLD'  ,'พระราม 2'         ,'มี.ค. 2568','ขายได้ราคาดีมาก เกินความคาดหมาย','https://picsum.photos/id/105/400/300',ARRAY['https://picsum.photos/id/105/400/300','https://picsum.photos/id/105/600/400']),
 ('pt6' ,'ที่ดินเปล่า 200 ตร.วา บางนา'   ,'ที่ดิน'      , 6200000,'SOLD'  ,'บางนา'            ,'เม.ย. 2568','ขายได้ภายใน 1 เดือน','https://picsum.photos/id/106/400/300',ARRAY['https://picsum.photos/id/106/400/300','https://picsum.photos/id/106/600/400']),
 ('pt7' ,'วิลล่า ภูเก็ต 3 ห้องนอน'       ,'วิลล่า'      ,11200000,'SOLD'  ,'กะรน ภูเก็ต'      ,'พ.ค. 2568','ลูกค้าชาวต่างชาติพึงพอใจมาก','https://picsum.photos/id/107/400/300',ARRAY['https://picsum.photos/id/107/400/300','https://picsum.photos/id/107/600/400','https://picsum.photos/id/107/800/600']),
 ('pt8' ,'คอนโดให้เช่า พระราม 9'          ,'คอนโด'       ,   18000,'RENTED','พระราม 9'          ,'พ.ค. 2568','ได้ผู้เช่าระยะยาว 1 ปี','https://picsum.photos/id/108/400/300',ARRAY['https://picsum.photos/id/108/400/300','https://picsum.photos/id/108/600/400']),
 ('pt9' ,'อาคารพาณิชย์ เพชรบุรี'          ,'อาคารพาณิชย์', 8200000,'SOLD'  ,'เพชรบุรี'          ,'มิ.ย. 2568','โอนเรียบร้อย ถูกต้องตามกฎหมาย','https://picsum.photos/id/109/400/300',ARRAY['https://picsum.photos/id/109/400/300','https://picsum.photos/id/109/600/400']),
 ('pt10','ทาวน์โฮมให้เช่า รังสิต'         ,'ทาวน์โฮม'    ,   10000,'RENTED','รังสิต'            ,'มิ.ย. 2568','หาผู้เช่าได้เร็ว ภายใน 5 วัน','https://picsum.photos/id/110/400/300',ARRAY['https://picsum.photos/id/110/400/300','https://picsum.photos/id/110/600/400']),
 ('pt11','บ้านเดี่ยว รามคำแหง'            ,'บ้านเดี่ยว'  , 4900000,'SOLD'  ,'รามคำแหง'         ,'ก.ค. 2568','ขายได้ในราคาที่เจ้าของต้องการ','https://picsum.photos/id/111/400/300',ARRAY['https://picsum.photos/id/111/400/300','https://picsum.photos/id/111/600/400']),
 ('pt12','คอนโด เอกมัย 10'               ,'คอนโด'       , 4300000,'SOLD'  ,'เอกมัย'           ,'ก.ค. 2568','ลูกค้าประทับใจการบริการ','https://picsum.photos/id/112/400/300',ARRAY['https://picsum.photos/id/112/400/300','https://picsum.photos/id/112/600/400']),
 ('pt13','ที่ดิน 1 ไร่ ลำลูกกา'          ,'ที่ดิน'      , 4200000,'SOLD'  ,'ลำลูกกา'          ,'ส.ค. 2568','ขายได้ราคาดี','https://picsum.photos/id/113/400/300',ARRAY['https://picsum.photos/id/113/400/300','https://picsum.photos/id/113/600/400']),
 ('pt14','คอนโดให้เช่า ศรีนครินทร์'       ,'คอนโด'       ,   13000,'RENTED','ศรีนครินทร์'        ,'ส.ค. 2568','ได้ผู้เช่าที่น่าเชื่อถือ','https://picsum.photos/id/114/400/300',ARRAY['https://picsum.photos/id/114/400/300','https://picsum.photos/id/114/600/400']),
 ('pt15','บ้านเดี่ยว นนทบุรี'             ,'บ้านเดี่ยว'  , 3500000,'SOLD'  ,'บางบัวทอง'        ,'ก.ย. 2568','บริการดี ครบวงจร','https://picsum.photos/id/115/400/300',ARRAY['https://picsum.photos/id/115/400/300','https://picsum.photos/id/115/600/400']),
 ('pt16','ทาวน์โฮม แจ้งวัฒนะ'            ,'ทาวน์โฮม'    , 3100000,'SOLD'  ,'แจ้งวัฒนะ'        ,'ก.ย. 2568','ขายได้ในเวลาอันรวดเร็ว','https://picsum.photos/id/116/400/300',ARRAY['https://picsum.photos/id/116/400/300','https://picsum.photos/id/116/600/400']),
 ('pt17','ที่ดิน 2 ไร่ ชลบุรี'           ,'ที่ดิน'      , 7900000,'SOLD'  ,'พนัสนิคม'         ,'ต.ค. 2568','ลูกค้าพอใจในทำเล','https://picsum.photos/id/117/400/300',ARRAY['https://picsum.photos/id/117/400/300','https://picsum.photos/id/117/600/400']),
 ('pt18','คอนโดให้เช่า บางเขน'            ,'คอนโด'       ,    9500,'RENTED','บางเขน'            ,'ต.ค. 2568','ได้ผู้เช่าอย่างรวดเร็ว','https://picsum.photos/id/118/400/300',ARRAY['https://picsum.photos/id/118/400/300','https://picsum.photos/id/118/600/400']),
 ('pt19','รีสอร์ท หัวหิน'                ,'รีสอร์ท'     ,19500000,'SOLD'  ,'หัวหิน'           ,'พ.ย. 2568','ขายได้ทั้งรีสอร์ทในราคาดี','https://picsum.photos/id/119/400/300',ARRAY['https://picsum.photos/id/119/400/300','https://picsum.photos/id/119/600/400','https://picsum.photos/id/119/800/600']),
 ('pt20','วิลล่าให้เช่า หาดราไวย์'        ,'วิลล่า'      ,   65000,'RENTED','ราไวย์ ภูเก็ต'     ,'พ.ย. 2568','ได้ผู้เช่าระยะยาว 6 เดือน','https://picsum.photos/id/120/400/300',ARRAY['https://picsum.photos/id/120/400/300','https://picsum.photos/id/120/600/400'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 16. SEED DATA — services (6 บริการ)
-- ============================================================
INSERT INTO services (id,name,icon,short_desc,full_desc,price,duration,sort_order) VALUES
 ('ac'   ,'ล้างแอร์'            ,'fa-wind'       ,'ล้างแอร์ทุกประเภท'             ,'บริการล้างแอร์ทุกประเภท ทั้งแอร์บ้านและแอร์สำนักงาน รับประกันงาน 30 วัน' ,'450 บาท/ตัว'   ,'1-2 ชั่วโมง' ,1),
 ('maid' ,'แม่บ้าน'            ,'fa-broom'      ,'บริการแม่บ้านคุณภาพ'           ,'บริการแม่บ้านคุณภาพ ผ่านการอบรมและตรวจสอบประวัติ มีทั้งรายวัน รายสัปดาห์ รายเดือน','500 บาท/วัน'   ,'ตามตกลง'     ,2),
 ('furn' ,'ซ่อมเฟอร์นิเจอร์'  ,'fa-couch'      ,'ซ่อมเฟอร์นิเจอร์ทุกชนิด'      ,'ซ่อมเฟอร์นิเจอร์ทุกชนิด โต๊ะ เก้าอี้ ตู้ เตียง พร้อมเปลี่ยนอุปกรณ์ใหม่' ,'300 บาท'       ,'1-3 ชั่วโมง' ,3),
 ('plumb','แก้ไขระบบประปา'    ,'fa-wrench'     ,'แก้ไขปัญหาท่อรั่ว'             ,'แก้ไขปัญหาท่อรั่ว อุดตัน เปลี่ยนวาล์ว ติดตั้งระบบประปาใหม่'              ,'500 บาท'       ,'1-2 ชั่วโมง' ,4),
 ('elec' ,'ซ่อมอุปกรณ์ไฟฟ้า' ,'fa-bolt'       ,'ซ่อมไฟฟ้าภายในบ้าน'           ,'ซ่อมไฟฟ้าภายในบ้าน เดินสายใหม่ เปลี่ยนสวิตช์ ปลั๊ก ระบบไฟส่องสว่าง'    ,'400 บาท'       ,'1-3 ชั่วโมง' ,5),
 ('door' ,'เปลี่ยนลูกบิดประตู','fa-door-closed','เปลี่ยนลูกบิดทุกแบบ'           ,'เปลี่ยนลูกบิดประตูทุกแบบ ทั้งธรรมดาและดิจิตอล พร้อมติดตั้ง'              ,'250 บาท'       ,'30-60 นาที'  ,6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 17. SEED DATA — blogs (6 บทความน่าสนใจ พร้อมรูปภาพ)
-- ============================================================
INSERT INTO blogs (title,cat,date,icon,color,content,photos,sort_order,is_published) VALUES
 (
  '5 ทำเลทองที่น่าลงทุนปี 2568',
  'การลงทุน',
  '15 พ.ค. 2568',
  '🏆',
  'linear-gradient(135deg,#667eea,#764ba2)',
  '<p>ในปี 2568 ตลาดอสังหาริมทรัพย์ไทยมีแนวโน้มเติบโตอย่างต่อเนื่อง โดยเฉพาะทำเลที่เชื่อมต่อระบบขนส่งมวลชนและโครงการภาครัฐ เราคัด 5 ทำเลที่น่าจับตามอง:</p>
   <ul><li><strong>บางนา-ตราด</strong> : เชื่อมกรุงเทพฯ-ชลบุรี มีโครงการรถไฟฟ้าสายสีเหลืองและทางพิเศษ</li>
   <li><strong>บางใหญ่ (นนทบุรี)</strong> : รถไฟฟ้าสายสีม่วงขยายเส้นทาง เชื่อมต่อสีแดง ทำให้การเดินทางสะดวก</li>
   <li><strong>ศรีราชา-พัทยา</strong> : เขตเศรษฐกิจพิเศษตะวันออก (EEC) มีนักลงทุนต่างชาติและนิคมอุตสาหกรรม</li>
   <li><strong>เชียงใหม่ (เชิงดอย)</strong> : วิลล่าและบ้านพักตากอากาศกำลังมาแรง เหมาะกับ New Normal</li>
   <li><strong>ภูเก็ต (กะรน-บางเทา)</strong> : ความต้องการซื้อคอนโดและวิลล่าสำหรับชาวต่างชาติฟื้นตัวสูง</li></ul>
   <p>นอกจากนี้ควรศึกษาระยะเวลาเปิดโครงการ ภาวะเศรษฐกิจ และอัตราดอกเบี้ยก่อนตัดสินใจลงทุน</p>',
  ARRAY[
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
    'https://images.unsplash.com/photo-1448630360428-65456885c650?w=800',
    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800'
  ],
  1, TRUE
 ),
 (
  'วิธีเลือกคอนโดใกล้รถไฟฟ้าให้คุ้มค่า',
  'คำแนะนำ',
  '10 พ.ค. 2568',
  '🚇',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  '<p>คอนโดใกล้รถไฟฟ้าเป็นตัวเลือกยอดนิยม แต่จะเลือกอย่างไรให้คุ้มค่าที่สุด?</p>
   <ul><li><strong>ระยะเดินถึง BTS/MRT</strong> : ควรอยู่ในรัศมี 500 เมตร หรือมีรถ shuttle บริการ</li>
   <li><strong>ราคาต่อตารางเมตร</strong> : เทียบกับทำเลใกล้เคียง ถ้าแพงกว่าเกิน 20% ควรพิจารณา</li>
   <li><strong>ส่วนกลางและค่าส่วนกลาง</strong> : ตรวจสอบสระว่ายน้ำ ฟิตเนส ที่จอดรถ ค่าใช้จ่ายต่อเดือนไม่สูงเกินไป</li>
   <li><strong>ผู้ประกอบการ</strong> : เลือกแบรนด์ดังที่มีประกันหลังการขายดี เช่น AP, Sansiri, Land & Houses</li>
   <li><strong>การเติบโตในอนาคต</strong> : ทำเลที่กำลังมีห้างใหม่ หรือสถานีเชื่อมต่อจะมีมูลค่าเพิ่ม</li></ul>
   <p>แนะนำให้ทดลองเดินทางช่วงชั่วโมงเร่งด่วน เพื่อประเมินความแออัด</p>',
  ARRAY[
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800'
  ],
  2, TRUE
 ),
 (
  'ขั้นตอนกู้สินเชื่อบ้านสำหรับมือใหม่',
  'สาระน่ารู้',
  '5 พ.ค. 2568',
  '🏦',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  '<p>การกู้ซื้อบ้านครั้งแรกอาจดูซับซ้อน แต่ถ้าเข้าใจขั้นตอนก็ไม่ยาก</p>
   <ol><li><strong>ตรวจสอบคุณสมบัติและเครดิตบูโร</strong> : ดึงข้อมูลเครดิตเพื่อดูประวัติการชำระหนี้</li>
   <li><strong>เลือกธนาคารและยื่นใบกู้เบื้องต้น</strong> : ติดต่อหลายธนาคารเพื่อเปรียบเทียบวงเงินและดอกเบี้ย</li>
   <li><strong>เตรียมเอกสาร</strong> : สลิปเงินเดือน, หนังสือรับรองเงินเดือน, สำเนาบัตรประชาชน, ทะเบียนบ้าน, ใบแจ้งยอดบัญชี 6 เดือน</li>
   <li><strong>ธนาคารประเมินทรัพย์</strong> : ส่งเจ้าหน้าที่ไปประเมินราคาบ้าน/คอนโด ณ ตำแหน่งจริง</li>
   <li><strong>อนุมัติสินเชื่อและทำสัญญา</strong> : ระยะเวลาประมาณ 2-4 สัปดาห์</li>
   <li><strong>จดจำนองที่กรมที่ดิน</strong> : พร้อมรับโอนกรรมสิทธิ์</li></ol>
   <p>เคล็ดลับ: รักษาเครดิตให้ดี ไม่สร้างหนี้ใหม่ระหว่างรออนุมัติ</p>',
  ARRAY[
    'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
    'https://images.unsplash.com/photo-1581092335871-4d5c5c5c5c5c?w=800'
  ],
  3, TRUE
 ),
 (
  'เปรียบเทียบ บ้านเดี่ยว vs ทาวน์โฮม แบบเจาะลึก',
  'คำแนะนำ',
  '1 พ.ค. 2568',
  '🔍',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  '<p>กำลังตัดสินใจระหว่างบ้านเดี่ยวกับทาวน์โฮม? ลองดูข้อดี-ข้อเสีย</p>
   <table border="0" cellpadding="5" style="width:100%; border-collapse:collapse;">
    <tr style="background:#f0f2f8;"><th>คุณสมบัติ</th><th>บ้านเดี่ยว</th><th>ทาวน์โฮม</th></tr>
    <tr><td>พื้นที่ใช้สอย</td><td>กว้างขวาง มีที่ดินรอบบ้าน</td><td>จำกัด แนวตั้ง 2-3 ชั้น</td></tr>
    <tr><td>ความเป็นส่วนตัว</td><td>สูง (ไม่มีผนังร่วม)</td><td>ปานกลาง (มีผนังร่วมข้าง)</td></tr>
    <tr><td>ราคา</td><td>เริ่ม 3-5 ล้านขึ้นไป</td><td>เริ่ม 1.5-3 ล้าน</td></tr>
    <tr><td>ค่าส่วนกลาง</td><td>ต่ำ (หมู่บ้านจัดสรร)</td><td>ต่ำกว่า (บางโครงการ)</td></tr>
    <tr><td>ความสะดวกในการเดินทาง</td><td>มักอยู่ในซอยลึก</td><td>มักติดถนนใหญ่กว่า</td></tr>
   </table>
   <p>สรุป: เลือกบ้านเดี่ยวถ้าต้องการพื้นที่และความเป็นส่วนตัว เลือกทาวน์โฮมถ้างบจำกัดแต่ต้องการทำเลดี</p>',
  ARRAY[
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ],
  4, TRUE
 ),
 (
  'เทคนิคต่อรองราคาซื้อบ้านให้ได้ถูกกว่า',
  'เคล็ดลับ',
  '20 เม.ย. 2568',
  '💡',
  'linear-gradient(135deg,#fa709a,#fee140)',
  '<p>หลายคนซื้อบ้านครั้งแรกไม่กล้าต่อราคา แต่ถ้ารู้เทคนิคง่ายๆ จะช่วยประหยัดได้หลายแสน</p>
   <ul><li><strong>รู้ราคาตลาด</strong> : ศึกษาข้อมูลโครงการเดียวกันหรือใกล้เคียงจากหลายแหล่ง</li>
   <li><strong>เลือกเวลาที่เหมาะสม</strong> : ปลายปี เจ้าของมักต้องการปิดบัญชี หรือช่วงที่โครงการใกล้สร้างเสร็จ</li>
   <li><strong>แสดงความสนใจแต่ไม่เร่งรีบ</strong> : บอกว่ามีตัวเลือกอื่น ทำให้เจ้าของใจอ่อน</li>
   <li><strong>เสนอราคาต่ำกว่าความต้องการ 10-15%</strong> แล้วค่อยๆ เพิ่มขึ้น</li>
   <li><strong>ใช้เงินสดเป็นข้อต่อรอง</strong> ถ้าจ่ายสดสามารถขอส่วนลดพิเศษได้</li>
   <li><strong>ตรวจสอบสภาพบ้าน</strong> ชำรุดอะไรบ้าง แล้วนำมาหักราคา</li></ul>
   <p>อย่าลืมทำสัญญาเป็นลายลักษณ์อักษร และระบุวันโอนให้ชัดเจน</p>',
  ARRAY[
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
    'https://images.unsplash.com/photo-1560185008-c5f8f924cde9?w=800'
  ],
  5, TRUE
 ),
 (
  'ข้อควรรู้ก่อนปล่อยเช่าคอนโด',
  'สำหรับผู้ให้เช่า',
  '15 เม.ย. 2568',
  '📋',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  '<p>การปล่อยเช่าคอนโดสร้างรายได้ แต่ต้องระวังปัญหาที่อาจเกิดขึ้น</p>
   <ul><li><strong>ตรวจสอบผู้เช่า</strong> : ขอสำเนาบัตรประชาชน, ทะเบียนบ้าน, และสลิปเงินเดือน</li>
   <li><strong>ทำสัญญาเช่าชัดเจน</strong> : ระบุระยะเวลา ค่าเช่า ประกัน, ค่าส่วนกลาง, ค่าน้ำไฟ, ห้ามทำผิดกฎหมาย</li>
   <li><strong>ถ่ายรูปสภาพคอนโดก่อนเข้า</strong> : เพื่อใช้เป็นหลักฐานเมื่อส่งมอบคืน</li>
   <li><strong>กำหนดเงื่อนไขการแจ้งซ่อม</strong> : ค่าเสียหายจากผู้เช่าผู้เช่าต้องรับผิดชอบ</li>
   <li><strong>แจ้งการเช่าให้นิติบุคคลทราบ</strong> : บางโครงการมีข้อกำหนดเพิ่มเติม</li></ul>
   <p>การมีประกันทางกฎหมายจะช่วยป้องกันความเสี่ยง</p>',
  ARRAY[
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1560185008-c5f8f924cde9?w=800'
  ],
  6, TRUE
 )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. HELPER VIEWS
-- ============================================================
DROP VIEW IF EXISTS v_properties_with_agent;
CREATE VIEW v_properties_with_agent AS
SELECT
  p.*,
  a.name        AS agent_name,
  a.title       AS agent_title,
  a.phone       AS agent_phone,
  a.line_id     AS agent_line_id,
  a.initials    AS agent_initials,
  a.color       AS agent_color,
  a.avatar_url  AS agent_avatar
FROM properties p
LEFT JOIN agents a ON a.id = p.agent_id;

DROP VIEW IF EXISTS v_dashboard_summary;
CREATE VIEW v_dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM properties)                              AS total_properties,
  (SELECT COUNT(*) FROM properties WHERE tx = 'BUY')            AS for_sale,
  (SELECT COUNT(*) FROM properties WHERE tx = 'RENT')           AS for_rent,
  (SELECT COUNT(*) FROM agents WHERE is_active)                 AS total_agents,
  (SELECT COUNT(*) FROM portfolio)                              AS total_deals,
  (SELECT COUNT(*) FROM listings WHERE status = 'รอตรวจสอบ')   AS pending_listings,
  (SELECT COUNT(*) FROM buy_requests WHERE status = 'ใหม่')    AS new_requests;

-- ============================================================
-- ✅ DONE — ฐานข้อมูล Matchdoor พร้อมใช้งาน (รองรับการรันซ้ำ)
-- ============================================================
-- ตาราง          : properties, agents, portfolio, services,
--                  blogs, listings, buy_requests, favorites
-- Views          : v_properties_with_agent, v_dashboard_summary
-- RLS            : เปิดใช้งานแล้ว (อ่านได้สาธารณะ, เขียนต้อง login)
-- Indexes        : ครบทุก column ที่ filter/join บ่อย
-- พิเศษ          : รูปภาพหลายรูปใน portfolio, blogs, และ avatar_url สำหรับ agents
-- ============================================================