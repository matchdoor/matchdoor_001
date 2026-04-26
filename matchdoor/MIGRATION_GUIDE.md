# Matchdoor — Migration Guide
## base64 → URL, Slider fix, Code split

---

## 📁 โครงสร้างไฟล์ใหม่

```
matchdoor/
├── index.html          ← แก้ตามนี้ (ดู Step 1)
├── js/
│   ├── config.js       ← CONFIG, initSB, utils
│   ├── data.js         ← loadData, MOCK, mappers
│   ├── slider.js       ← Card slider (แก้ bug แล้ว)
│   └── upload.js       ← Storage upload + form submit
└── supabase_schema.sql ← Run ใน Supabase SQL Editor
```

---

## Step 1 — แก้ `<script>` tag ใน index.html

### ก่อน (ปัจจุบัน)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- ... HTML ... -->
<script>
  // โค้ดทั้งหมด 2,000+ บรรทัด
</script>
```

### หลัง (ใหม่)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- ... HTML ... -->
<script src="js/config.js"></script>
<script src="js/data.js"></script>
<script src="js/slider.js"></script>
<script src="js/upload.js"></script>
<script>
  // เหลือแค่โค้ดที่ยังไม่ได้แยก (UI, auth, modal, carousel, canvas ฯลฯ)
  // ตัด MOCK, loadData, cardSlide, submitDep, submitWish, setupUpload ออก
  // เพราะอยู่ใน js/ แล้ว
</script>
```

---

## Step 2 — แก้ CSS slider (สำคัญมาก!)

เพิ่ม CSS นี้ใน `<style>` (แทนที่หรือเพิ่มถัดจาก `.card-slides` เดิม):

```css
/* ── SLIDER FIX: บังคับทุก slide เป็น 100% width ── */
.card-slides {
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
  height: 100%;
  transition: transform .35s cubic-bezier(.25,.46,.45,.94);
  will-change: transform;
}

/* ทุก child = 1 slide เต็มความกว้าง — ห้ามหด */
.card-slides > img,
.card-slides > .slide-ph-card {
  flex: 0 0 100%;
  min-width: 100%;   /* ← บรรทัดนี้คือ bug fix หลัก */
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  display: block;
}

/* container ต้อง clip เสมอ */
.card-slider-wrap {
  overflow: hidden !important;
  position: relative !important;
}
```

---

## Step 3 — แก้ submitDep (เลิก base64)

ใน `index.html` เดิม ลบโค้ดนี้ทิ้ง:
```js
// ❌ ลบทิ้ง — อ่าน base64
const photos = [];
for (const f of uploads) {
  const b = await new Promise(r => {
    const fr = new FileReader();
    fr.onload = e => r(e.target.result);
    fr.readAsDataURL(f);  // ← base64 ตัวการ
  });
  photos.push(b);
}
await sbInsert('listings', { ..., photos });  // ← ส่ง base64 ขนาดใหญ่
```

แทนด้วย (อยู่ใน `js/upload.js` แล้ว):
```js
// ✅ อัปโหลดไป Storage → ได้ URL
const photoUrls = await uploadAllPhotos('listings');
await sbInsert('listings', { ..., photo_urls: photoUrls });
```

---

## Step 4 — แก้ DB column ให้ตรง

ใน `sbInsert('listings', {...})` เปลี่ยน key:
| เดิม     | ใหม่         | เหตุผล               |
|----------|-------------|----------------------|
| `photos` | `photo_urls`| Schema ใหม่ใช้ URL array |

---

## Step 5 — Run SQL Schema

1. ไปที่ Supabase Dashboard → **SQL Editor**
2. วาง `supabase_schema.sql` → **Run**
3. ไปที่ **Storage** → New Bucket
   - Name: `property-images`
   - Public: ✅ (checked)

---

## Step 6 — อัปโหลดรูปเดิมจาก base64 → Storage

ถ้ามีรูป base64 เก็บใน DB อยู่แล้ว ใช้สคริปต์นี้ migrate:

```js
// รันใน browser console หลัง login ด้วย admin account
async function migrateBase64ToStorage() {
  const { data: listings } = await sb.from('listings').select('id, photos');
  for (const listing of listings || []) {
    if (!listing.photos?.length) continue;
    const urls = [];
    for (const b64 of listing.photos) {
      if (!b64.startsWith('data:')) { urls.push(b64); continue; } // ข้าม URL จริง
      // แปลง base64 → Blob → อัปโหลด
      const res = await fetch(b64);
      const blob = await res.blob();
      const file = new File([blob], `${Date.now()}.jpg`, { type: blob.type });
      const url = await uploadImageToStorage(file, 'listings');
      urls.push(url);
    }
    await sb.from('listings').update({ photo_urls: urls, photos: null }).eq('id', listing.id);
    console.log(`✅ migrated listing ${listing.id}`);
  }
}
migrateBase64ToStorage();
```

---

## ✅ Checklist

| งาน | สถานะ |
|-----|-------|
| `supabase_schema.sql` run แล้ว | ☐ |
| Storage bucket `property-images` สร้างแล้ว | ☐ |
| RLS เปิดแล้ว | ☐ |
| `js/config.js` ใส่ใน index.html | ☐ |
| `js/data.js` ใส่ใน index.html | ☐ |
| `js/slider.js` ใส่ใน index.html | ☐ |
| `js/upload.js` ใส่ใน index.html | ☐ |
| CSS `.card-slides > img { min-width: 100% }` เพิ่มแล้ว | ☐ |
| `submitDep` เลิก base64 แล้ว | ☐ |
| ทดสอบ slider ทุก card | ☐ |
| ทดสอบ upload รูป → Storage | ☐ |

---

## Security สรุป

| จุด | การตั้งค่า |
|-----|-----------|
| Key ที่ใช้ | `anon key` เท่านั้น |
| RLS | เปิดทุกตาราง |
| Public read | `properties`, `property_images`, `agents`, `portfolio`, `services`, `blogs` |
| Write | ต้อง auth เท่านั้น (`listings`, `buy_requests`) |
| Storage | public read, auth write |
