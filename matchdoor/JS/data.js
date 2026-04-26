// ============================================================
// js/data.js — Data Loading, Mapping, Filters
// ============================================================

// ── MOCK DATA (URL เท่านั้น — ไม่มี base64) ──────────────────
const MOCK = {
  props: [
    { id: 'p1',  title: 'บ้านเดี่ยว 2 ชั้น หมู่บ้านพฤกษา',     type: 'บ้านเดี่ยว',   province: 'กรุงเทพฯ',   location: 'ลาดกระบัง กรุงเทพฯ',  price: 4500000, tx: 'BUY',  bed: 3, bath: 2, area: 180, land_area: 52,  floors: 2, floor_no: 0,  parking: 2, furniture: 'full',    pets_allowed: true,  appliances: ['แอร์','ตู้เย็น','เครื่องซักผ้า'], isNew: true,  isRec: true,  desc: 'บ้านเดี่ยว 2 ชั้น ทำเลดี',   agentId: 'a1', createdAt: '2025-04-20', photos: ['https://picsum.photos/id/101/800/600','https://picsum.photos/id/111/800/600','https://picsum.photos/id/121/800/600'] },
    { id: 'p2',  title: 'คอนโด ลุมพินี วิลล์ รัชโยธิน',         type: 'คอนโด',         province: 'กรุงเทพฯ',   location: 'จตุจักร กรุงเทพฯ',     price: 2200000, tx: 'BUY',  bed: 1, bath: 1, area: 35,  land_area: 0,   floors: 25, floor_no: 12, parking: 1, furniture: 'full',    pets_allowed: false, appliances: ['แอร์','ตู้เย็น','โทรทัศน์'],      isNew: false, isRec: true,  desc: 'คอนโดใกล้ BTS พร้อมอยู่',     agentId: 'a2', createdAt: '2025-03-15', photos: ['https://picsum.photos/id/102/800/600','https://picsum.photos/id/112/800/600'] },
    { id: 'p3',  title: 'ทาวน์โฮม 3 ชั้น ใกล้รถไฟฟ้าสายสีม่วง', type: 'ทาวน์โฮม',    province: 'นนทบุรี',    location: 'ปากเกร็ด นนทบุรี',    price: 3200000, tx: 'BUY',  bed: 3, bath: 2, area: 140, land_area: 21,  floors: 3, floor_no: 0,  parking: 2, furniture: 'partial', pets_allowed: true,  appliances: ['แอร์','เครื่องทำน้ำอุ่น'],         isNew: true,  isRec: false, desc: 'โครงการใหม่ ใกล้ MRT',          agentId: 'a3', createdAt: '2025-05-01', photos: ['https://picsum.photos/id/103/800/600'] },
    { id: 'p4',  title: 'ที่ดินเปล่า ติดถนนใหญ่ ทำเลทอง',       type: 'ที่ดิน',        province: 'ชลบุรี',     location: 'บางละมุง ชลบุรี',     price: 8900000, tx: 'BUY',  bed: 0, bath: 0, area: 400, land_area: 100, floors: 0, floor_no: 0,  parking: 0, furniture: 'none',    pets_allowed: false, appliances: [],                                  isNew: false, isRec: true,  desc: 'ที่ดินเปล่า ติดถนน 4 เลน',     agentId: 'a4', createdAt: '2025-02-10', photos: ['https://picsum.photos/id/104/800/600'] },
    { id: 'p5',  title: 'คอนโดให้เช่า แอชตัน อโศก',              type: 'คอนโด',         province: 'กรุงเทพฯ',   location: 'อโศก กรุงเทพฯ',       price: 35000,   tx: 'RENT', bed: 2, bath: 2, area: 65,  land_area: 0,   floors: 50, floor_no: 28, parking: 1, furniture: 'full',    pets_allowed: false, appliances: ['แอร์','ตู้เย็น','เครื่องซักผ้า'], isNew: false, isRec: true,  desc: 'คอนโดหรู ใจกลางเมือง',         agentId: 'a5', createdAt: '2025-04-01', photos: ['https://picsum.photos/id/105/800/600','https://picsum.photos/id/115/800/600'] },
    { id: 'p6',  title: 'บ้านเดี่ยว รามอินทรา กม.8',             type: 'บ้านเดี่ยว',   province: 'กรุงเทพฯ',   location: 'รามอินทรา กรุงเทพฯ',  price: 5200000, tx: 'BUY',  bed: 4, bath: 3, area: 210, land_area: 60,  floors: 2, floor_no: 0,  parking: 3, furniture: 'partial', pets_allowed: true,  appliances: ['แอร์','ตู้เย็น'],                  isNew: true,  isRec: false, desc: 'บ้านเดี่ยวสไตล์โมเดิร์น',      agentId: 'a6', createdAt: '2025-04-25', photos: ['https://picsum.photos/id/106/800/600'] },
    { id: 'p7',  title: 'คอนโด ไอดีโอ สาทร',                      type: 'คอนโด',         province: 'กรุงเทพฯ',   location: 'สาทร กรุงเทพฯ',       price: 3800000, tx: 'BUY',  bed: 2, bath: 1, area: 45,  land_area: 0,   floors: 35, floor_no: 15, parking: 1, furniture: 'full',    pets_allowed: false, appliances: ['แอร์','ตู้เย็น','เครื่องซักผ้า'], isNew: false, isRec: true,  desc: 'คอนโดติด BTS สาทร',             agentId: 'a7', createdAt: '2025-03-20', photos: ['https://picsum.photos/id/107/800/600','https://picsum.photos/id/117/800/600'] },
    { id: 'p8',  title: 'ทาวน์โฮม ลาดพร้าว 71',                  type: 'ทาวน์โฮม',    province: 'กรุงเทพฯ',   location: 'ลาดพร้าว กรุงเทพฯ',   price: 3900000, tx: 'BUY',  bed: 3, bath: 2, area: 150, land_area: 24,  floors: 3, floor_no: 0,  parking: 2, furniture: 'none',    pets_allowed: false, appliances: ['แอร์'],                            isNew: true,  isRec: true,  desc: 'ทาวน์โฮม ใกล้ MRT ลาดพร้าว',   agentId: 'a1', createdAt: '2025-05-05', photos: ['https://picsum.photos/id/108/800/600'] },
    { id: 'p9',  title: 'วิลล่า 3 ห้องนอน หาดบางเทา',            type: 'วิลล่า',        province: 'ภูเก็ต',     location: 'เชิงทะเล ภูเก็ต',    price: 12500000,tx: 'BUY',  bed: 3, bath: 3, area: 250, land_area: 80,  floors: 2, floor_no: 0,  parking: 2, furniture: 'full',    pets_allowed: true,  appliances: ['แอร์','ตู้เย็น','เครื่องซักผ้า'], isNew: true,  isRec: true,  desc: 'วิลล่าส่วนตัว ห่างชายหาด 500 ม.', agentId: 'a9', createdAt: '2025-06-01', photos: ['https://picsum.photos/id/109/800/600','https://picsum.photos/id/119/800/600'] },
    { id: 'p10', title: 'รีสอร์ท ขนาด 10 ห้อง พัทยา',           type: 'รีสอร์ท',       province: 'ชลบุรี',     location: 'พัทยาใต้ ชลบุรี',    price: 28000000,tx: 'BUY',  bed: 10,bath: 10,area: 800, land_area: 250, floors: 3, floor_no: 0,  parking: 15,furniture: 'full',    pets_allowed: false, appliances: ['แอร์','ตู้เย็น','โทรทัศน์'],      isNew: false, isRec: true,  desc: 'รีสอร์ทพร้อมสระว่ายน้ำ',       agentId: 'a10',createdAt: '2025-03-01', photos: ['https://picsum.photos/id/110/800/600'] },
    { id: 'p11', title: 'บ้านเดี่ยวหรู บางพลี',                   type: 'บ้านเดี่ยว',   province: 'สมุทรปราการ', location: 'บางพลี',              price: 12900000,tx: 'BUY',  bed: 4, bath: 4, area: 320, land_area: 92,  floors: 2, floor_no: 0,  parking: 4, furniture: 'full',    pets_allowed: true,  appliances: ['แอร์','ตู้เย็น','เครื่องซักผ้า','โทรทัศน์'], isNew: true,  isRec: true, desc: 'บ้านเดี่ยวสไตล์อังกฤษ', agentId: 'a14',createdAt: '2025-06-20', photos: ['https://picsum.photos/id/118/800/600','https://picsum.photos/id/128/800/600'] },
    { id: 'p12', title: 'คอนโดให้เช่า ใกล้ ม.เกษตรศาสตร์',       type: 'คอนโด',         province: 'กรุงเทพฯ',   location: 'ลาดยาว กรุงเทพฯ',     price: 12000,   tx: 'RENT', bed: 1, bath: 1, area: 30,  land_area: 0,   floors: 8, floor_no: 5,  parking: 1, furniture: 'full',    pets_allowed: false, appliances: ['แอร์','ตู้เย็น'],                  isNew: false, isRec: false, desc: 'คอนโดสตูดิโอ เฟอร์นิเจอร์ครบ', agentId: 'a2', createdAt: '2025-04-18', photos: ['https://picsum.photos/id/113/800/600'] }
  ],
  agents: [
    { id: 'a1',  name: 'สมชาย มั่นคง',     title: 'ผู้จัดการฝ่ายขาย',          phone: '081-234-5678', lineId: '@somchai',  initials: 'สม', color: '#0f3460', avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg',   propIds: ['p1','p8'] },
    { id: 'a2',  name: 'วารี สุขสันต์',    title: 'ที่ปรึกษาอสังหาริมทรัพย์',  phone: '082-345-6789', lineId: '@waree',    initials: 'วร', color: '#00b894', avatar_url: 'https://randomuser.me/api/portraits/women/2.jpg',  propIds: ['p2','p12'] },
    { id: 'a3',  name: 'ประภัส รุ่งเรือง', title: 'ผู้เชี่ยวชาญที่ดิน',         phone: '083-456-7890', lineId: '@praphat',  initials: 'ปภ', color: '#6c5ce7', avatar_url: 'https://randomuser.me/api/portraits/men/3.jpg',   propIds: ['p3'] },
    { id: 'a4',  name: 'ณัฐธิดา ใจดี',     title: 'ที่ปรึกษา Luxury',            phone: '084-567-8901', lineId: '@nuttida',  initials: 'ณธ', color: '#e17055', avatar_url: 'https://randomuser.me/api/portraits/women/4.jpg',  propIds: ['p4'] },
    { id: 'a5',  name: 'ธนากร วัฒนา',      title: 'นายหน้าอสังหาฯ',             phone: '085-678-9012', lineId: '@thanakorn', initials: 'ธน', color: '#0984e3', avatar_url: 'https://randomuser.me/api/portraits/men/5.jpg',   propIds: ['p5'] },
    { id: 'a9',  name: 'อภิชาติ ศรีเมือง', title: 'ผู้เชี่ยวชาญอสังหาฯ ภูเก็ต', phone: '089-012-3456', lineId: '@apichat',  initials: 'อภ', color: '#2d3436', avatar_url: 'https://randomuser.me/api/portraits/men/9.jpg',   propIds: ['p9'] },
    { id: 'a10', name: 'นริศรา อินทร์สุข', title: 'ที่ปรึกษาการลงทุน',           phone: '080-123-4567', lineId: '@narisara', initials: 'นร', color: '#00cec9', avatar_url: 'https://randomuser.me/api/portraits/women/10.jpg', propIds: ['p10'] },
    { id: 'a14', name: 'ปิยธิดา สุขเกษม',  title: 'ผู้ช่วยตัวแทน',               phone: '084-567-8902', lineId: '@piyathida',initials: 'ปิ', color: '#e17055', avatar_url: 'https://randomuser.me/api/portraits/women/14.jpg', propIds: ['p11'] }
  ],
  port: [
    { id: 'pt1', title: 'บ้านเดี่ยว ร่มเกล้า', type: 'บ้านเดี่ยว', price: 3800000, status: 'SOLD',   location: 'ร่มเกล้า', date: 'ม.ค. 2568', review: 'บริการดีมาก โอนได้เร็ว', photo: 'https://picsum.photos/id/101/400/300', photos: ['https://picsum.photos/id/101/400/300','https://picsum.photos/id/101/800/600'] },
    { id: 'pt2', title: 'คอนโด อ่อนนุช',        type: 'คอนโด',      price: 1900000, status: 'SOLD',   location: 'อ่อนนุช',  date: 'ก.พ. 2568', review: 'ขายได้เร็ว ราคาดีกว่าที่คิด', photo: 'https://picsum.photos/id/102/400/300', photos: ['https://picsum.photos/id/102/400/300','https://picsum.photos/id/102/800/600'] },
    { id: 'pt3', title: 'คอนโดให้เช่า สาทร',    type: 'คอนโด',      price: 22000,   status: 'RENTED', location: 'สาทร',     date: 'มี.ค. 2568', review: 'หาผู้เช่าได้ภายใน 2 สัปดาห์', photo: 'https://picsum.photos/id/104/400/300', photos: ['https://picsum.photos/id/104/400/300'] }
  ],
  services: [
    { id: 'ac',   name: 'ล้างแอร์',           icon: 'fa-wind',        short_desc: 'ล้างแอร์ทุกประเภท',      full_desc: 'บริการล้างแอร์ทุกประเภท รับประกัน 30 วัน', price: '450 บาท/ตัว', duration: '1-2 ชม.' },
    { id: 'maid', name: 'แม่บ้าน',             icon: 'fa-broom',       short_desc: 'บริการแม่บ้านคุณภาพ',    full_desc: 'แม่บ้านผ่านการอบรมและตรวจสอบประวัติ',    price: '500 บาท/วัน', duration: 'ตามตกลง' },
    { id: 'plumb',name: 'แก้ไขระบบประปา',     icon: 'fa-wrench',      short_desc: 'แก้ไขปัญหาท่อรั่ว',       full_desc: 'แก้ท่อรั่ว อุดตัน เปลี่ยนวาล์ว',         price: '500 บาท',     duration: '1-2 ชม.' },
    { id: 'elec', name: 'ซ่อมอุปกรณ์ไฟฟ้า',  icon: 'fa-bolt',        short_desc: 'ซ่อมไฟฟ้าภายในบ้าน',      full_desc: 'เดินสายใหม่ เปลี่ยนสวิตช์ ปลั๊ก',        price: '400 บาท',     duration: '1-3 ชม.' },
    { id: 'door', name: 'เปลี่ยนลูกบิดประตู', icon: 'fa-door-closed', short_desc: 'เปลี่ยนลูกบิดทุกแบบ',     full_desc: 'ลูกบิดธรรมดาและดิจิตอล พร้อมติดตั้ง',   price: '250 บาท',     duration: '30-60 นาที' }
  ],
  blogs: [
    { title: '5 ทำเลทองที่น่าลงทุนปี 2568', cat: 'การลงทุน', date: '15 พ.ค. 2568', icon: '🏆', color: 'linear-gradient(135deg,#667eea,#764ba2)', content: '<p>ในปี 2568 ตลาดอสังหาริมทรัพย์ไทยมีแนวโน้มเติบโต...</p>', photos: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'] },
    { title: 'วิธีเลือกคอนโดใกล้รถไฟฟ้าให้คุ้มค่า', cat: 'คำแนะนำ', date: '10 พ.ค. 2568', icon: '🚇', color: 'linear-gradient(135deg,#f093fb,#f5576c)', content: '<p>คอนโดใกล้รถไฟฟ้าเป็นตัวเลือกยอดนิยม...</p>', photos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'] }
  ]
};

// ── MAP ROWS จาก Supabase → internal format ──────────────────
function mapProp(r) {
  // รองรับ 2 schema:
  //   photos: text[]  (เก่า — URL array บน properties table)
  //   image_urls: text[] (ใหม่ — จาก properties_with_images view)
  const ph = Array.isArray(r.image_urls) && r.image_urls.length
    ? r.image_urls.filter(Boolean)
    : Array.isArray(r.photos)
      ? r.photos.filter(Boolean)
      : r.photos
        ? [r.photos]
        : [];
  const apps = Array.isArray(r.appliances) ? r.appliances : (r.appliances ? [r.appliances] : []);
  return {
    id: String(r.id), title: r.title, type: r.type,
    province: r.province, location: r.location,
    price: Number(r.price), tx: r.tx,
    bed: r.bed || 0, bath: r.bath || 0,
    area: Number(r.area) || 0, land_area: Number(r.land_area) || 0,
    floors: r.floors || 0, floor_no: r.floor_no || 0,
    parking: r.parking || 0, furniture: r.furniture || '',
    pets_allowed: r.pets_allowed || false, appliances: apps,
    desc: r.description || r.desc,
    isNew: r.is_new || false, isRec: r.is_rec || false,
    agentId: r.agent_id, createdAt: r.created_at,
    panorama_url: r.panorama_url || null,
    photos: ph   // ✅ URL เท่านั้น — ไม่มี base64
  };
}

function mapAgent(r) {
  return {
    id: r.id, name: r.name, title: r.title,
    phone: r.phone, lineId: r.line_id,
    initials: r.initials || r.name.substring(0, 2),
    color: r.color || '#7c6fcd',
    avatar_url: r.avatar_url,  // URL เท่านั้น
    photos: Array.isArray(r.photos) ? r.photos : [],
    rating: Number(r.rating) || 4.5,
    propIds: r.prop_ids || [], bio: r.bio
  };
}

function mapPort(r) {
  const ph = Array.isArray(r.photos) ? r.photos : (r.photos ? [r.photos] : []);
  const p0 = r.photo || ph[0] || '';
  return {
    id: r.id, title: r.title, type: r.type,
    price: Number(r.price), status: r.status,
    location: r.location, date: r.date, review: r.review,
    photo: p0,  // URL เท่านั้น
    photos: ph.length ? ph : (p0 ? [p0] : [])  // URL เท่านั้น
  };
}

// ── LOAD DATA ─────────────────────────────────────────────────
async function loadData() {
  loading(true);
  ['all-grid', 'rec-grid', 'new-grid'].forEach(gid => renderGrid(gid, [], true));

  const hasSB = initSB();
  let useMock = false;

  if (hasSB) {
    try {
      // ── ใช้ properties_with_images view เพื่อดึงรูปพร้อมกัน ──
      // ถ้า view ไม่มี fallback ไปใช้ properties table ปกติ
      const [p, a, po, s, b] = await Promise.all([
        sb.from('properties_with_images').select('*').order('created_at', { ascending: false })
          .catch(() => sb.from('properties').select('*').order('created_at', { ascending: false })),
        sb.from('agents').select('*').eq('is_active', true),
        sb.from('portfolio').select('*').order('created_at', { ascending: false }),
        sb.from('services').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        sb.from('blogs').select('*').eq('is_published', true).order('sort_order', { ascending: true })
      ]);

      if (p.data)  { props    = p.data.map(mapProp);  console.log(`✅ Properties: ${props.length}`); }
      if (a.data)  { agents   = a.data.map(mapAgent); console.log(`✅ Agents: ${agents.length}`); }
      if (po.data) { port     = po.data.map(mapPort); }
      if (s.data)  { services = s.data; }
      if (b.data)  { blogs    = b.data; }

      await loadLegalPages();
      if (!props.length) { useMock = true; }
    } catch (e) {
      console.error('[loadData]', e);
      useMock = true;
    }
  } else {
    useMock = true;
  }

  if (useMock) {
    console.warn('⚠️ Using mock data');
    props = MOCK.props; agents = MOCK.agents; port = MOCK.port;
    services = MOCK.services; blogs = MOCK.blogs;
    agents.forEach(a => {
      a.propIds = props.filter(p => p.agentId === a.id).map(p => p.id);
    });
  }

  afterLoad();
}

// ── AFTER LOAD ────────────────────────────────────────────────
function afterLoad() {
  filtered = [...props];
  renderFavDropdown(); renderServices(); renderBlogs();
  renderGalleryCarousel();
  setTimeout(() => {
    initHGallerySwipe('new-track-wrap');
    initHGallerySwipe('osrv-track-wrap');
  }, 200);
  if (sb) { checkAuth(); initAuthListener(); }
  resetSearch();
  loading(false);
  populateProvinceSelect();
  initLocSearch();
  initAutocomplete();
}

// ── FETCH HELPERS ─────────────────────────────────────────────
async function fetchProperties() {
  if (!sb) return null;
  const { data, error } = await sb
    .from('properties_with_images')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // fallback
    const r2 = await sb.from('properties').select('*').order('created_at', { ascending: false });
    if (r2.error) { console.error('[fetchProperties]', r2.error); return null; }
    return r2.data;
  }
  return data;
}

async function filterProperties(filters = {}) {
  if (!sb) return null;
  let q = sb.from('properties_with_images').select('*');
  if (filters.tx)        q = q.eq('tx', filters.tx);
  if (filters.type)      q = q.eq('type', filters.type);
  if (filters.province)  q = q.eq('province', filters.province);
  if (filters.minPrice)  q = q.gte('price', filters.minPrice);
  if (filters.maxPrice && filters.maxPrice < 999000000) q = q.lte('price', filters.maxPrice);
  if (filters.keyword)   q = q.or(`title.ilike.%${filters.keyword}%,location.ilike.%${filters.keyword}%`);
  q = q.order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) { console.error('[filterProperties]', error); return null; }
  return data;
}
