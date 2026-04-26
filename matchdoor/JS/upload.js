// ============================================================
// js/upload.js — อัปโหลดรูปไป Supabase Storage (ไม่มี base64)
// ============================================================

// uploads เก็บ File objects ชั่วคราว (ก่อน submit)
// หลัง submit → อัปโหลดจริง → ได้ URL → เก็บใน DB

function setupUpload() {
  const dz = $('dropzone');
  const fi = $('d-photo');
  if (!dz) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e =>
    dz.addEventListener(e, e => { e.preventDefault(); e.stopPropagation(); })
  );
  dz.addEventListener('dragenter', () => dz.classList.add('dragover'));
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    dz.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fi.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files) {
  const nf = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (uploads.length + nf.length > 5) {
    toast('อัปโหลดได้สูงสุด 5 รูป', true);
    return;
  }
  for (const f of nf) {
    if (f.size > 5 * 1024 * 1024) {
      toast(`รูป ${sanitize(f.name)} ใหญ่เกิน 5MB`, true);
      return;
    }
  }
  uploads.push(...nf);
  renderPrev();
}

// ── Preview ด้วย ObjectURL (ไม่ใช้ base64 FileReader) ────────
function renderPrev() {
  $('prev-grid').innerHTML = uploads.map((f, i) =>
    `<div class="prev-item">
      <img src="${URL.createObjectURL(f)}" loading="lazy">
      <div class="prev-rm" onclick="rmPhoto(${i})"><i class="fas fa-times"></i></div>
    </div>`
  ).join('');
}

window.rmPhoto = i => { uploads.splice(i, 1); renderPrev(); };

// ── อัปโหลดรูปทั้งหมดไป Storage → คืน URL array ────────────
// เรียกตอน submitDep แทนการ readAsDataURL
async function uploadAllPhotos(folder = 'listings') {
  if (!uploads.length) return [];
  if (!sb) throw new Error('Supabase not connected');

  const urls = [];
  for (const file of uploads) {
    const url = await uploadImageToStorage(file, folder);
    urls.push(url);
  }
  return urls;
}

// ============================================================
// js/forms.js — Form Submit (ใช้ URL แทน base64)
// ============================================================

async function submitDep() {
  if (isOnCooldown('dep')) { toast('กรุณารอสักครู่ก่อนส่งอีกครั้ง', true); return; }
  if (!user) { toast('กรุณาเข้าสู่ระบบก่อนฝากทรัพย์', true); $('login-modal').classList.add('open'); return; }

  ['d-name', 'd-phone', 'd-price'].forEach(id => {
    const el = $(id); if (el) el.classList.remove('invalid', 'valid');
  });

  const nameRaw  = $('d-name').value.trim();
  const phoneRaw = $('d-phone').value.trim();
  const priceRaw = $('d-price').value;
  const consent  = $('d-consent')?.checked;
  let valid = true;

  if (!isValidName(nameRaw)) {
    toast('กรุณากรอกชื่อ (อย่างน้อย 2 ตัวอักษร)', true);
    $('d-name').classList.add('invalid'); valid = false;
  } else { $('d-name').classList.add('valid'); }

  if (!isValidThaiPhone(phoneRaw)) {
    toast('รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 081-234-5678)', true);
    $('d-phone').classList.add('invalid'); valid = false;
  } else { $('d-phone').classList.add('valid'); }

  const price = parseFloat(priceRaw) || 0;
  if (priceRaw && !isValidPrice(price)) {
    toast('ราคาต้องมากกว่า 0', true);
    $('d-price').classList.add('invalid'); valid = false;
  }

  if (!consent) {
    const ce = $('d-consent-err'); if (ce) ce.classList.add('show');
    toast('กรุณายินยอมการเก็บข้อมูลส่วนบุคคลก่อน', true); valid = false;
  } else {
    const ce = $('d-consent-err'); if (ce) ce.classList.remove('show');
  }

  if (!valid) return;

  const btn = $('dep-btn');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    // ── อัปโหลดรูปไป Storage → ได้ URL array (ไม่มี base64) ──
    const photoUrls = await uploadAllPhotos('listings');

    await sbInsert('listings', {
      name:           sanitize(nameRaw),
      phone:          sanitize(phoneRaw),
      property_type:  sanitize($('d-type').value),
      price,
      province:       sanitize($('d-prov').value.trim()),
      transaction:    sanitize($('d-tx').value),
      details:        sanitize($('d-detail').value.trim()),
      photo_urls:     photoUrls,   // ✅ URL array — ไม่มี base64
      status:         'รอตรวจสอบ',
      consent_given:  true,
      consent_timestamp: new Date().toISOString()
    });

    $('dep-form').style.display = 'none';
    $('dep-ok').style.display = 'block';
    toast('ส่งข้อมูลสำเร็จ ทีมงานจะติดต่อกลับ ✅');

    setTimeout(() => {
      closeAllDD();
      setTimeout(() => {
        $('dep-form').style.display = '';
        $('dep-ok').style.display = 'none';
        ['d-name', 'd-phone', 'd-price', 'd-prov', 'd-detail'].forEach(id => {
          const el = $(id); if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); }
        });
        if ($('d-consent')) $('d-consent').checked = false;
        uploads = []; renderPrev(); $('d-photo').value = '';
      }, 400);
    }, 3000);

  } catch (e) {
    toast('ส่งข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง', true);
    _submitCooldown['dep'] = 0;
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

async function submitWish() {
  if (isOnCooldown('wish')) { toast('กรุณารอสักครู่ก่อนส่งอีกครั้ง', true); return; }
  if (!user) { toast('กรุณาเข้าสู่ระบบก่อน', true); $('login-modal').classList.add('open'); return; }

  const nameRaw  = $('w-name').value.trim();
  const phoneRaw = $('w-phone').value.trim();
  const consent  = $('w-consent')?.checked;
  let valid = true;

  if (!isValidName(nameRaw)) {
    toast('กรุณากรอกชื่อ (อย่างน้อย 2 ตัวอักษร)', true);
    $('w-name').classList.add('invalid'); valid = false;
  } else { $('w-name').classList.add('valid'); }

  if (!isValidThaiPhone(phoneRaw)) {
    toast('รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 081-234-5678)', true);
    $('w-phone').classList.add('invalid'); valid = false;
  } else { $('w-phone').classList.add('valid'); }

  if (!consent) {
    const ce = $('w-consent-err'); if (ce) ce.classList.add('show');
    toast('กรุณายินยอมการเก็บข้อมูลส่วนบุคคลก่อน', true); valid = false;
  } else {
    const ce = $('w-consent-err'); if (ce) ce.classList.remove('show');
  }

  if (!valid) return;

  const btn = $('wish-btn');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    await sbInsert('buy_requests', {
      name:          sanitize(nameRaw),
      phone:         sanitize(phoneRaw),
      line_id:       sanitize($('w-line').value),
      property_type: sanitize($('w-type').value),
      budget:        parseFloat($('w-budget').value) || 0,
      province:      sanitize($('w-prov').value),
      transaction:   sanitize($('w-tx').value),
      details:       sanitize($('w-detail').value),
      status:        'ใหม่',
      consent_given: true,
      consent_timestamp: new Date().toISOString()
    });

    $('wish-form').style.display = 'none';
    $('wish-ok').style.display = 'block';
    toast('ส่งความต้องการสำเร็จ ✅');

    setTimeout(() => {
      closeAllDD();
      setTimeout(() => {
        $('wish-form').style.display = '';
        $('wish-ok').style.display = 'none';
        ['w-name', 'w-phone', 'w-line', 'w-budget', 'w-prov', 'w-detail'].forEach(id => {
          const el = $(id); if (el) { el.value = ''; el.classList.remove('valid', 'invalid'); }
        });
        if ($('w-consent')) $('w-consent').checked = false;
      }, 400);
    }, 3000);

  } catch (e) {
    toast('ส่งข้อมูลล้มเหลว: ' + sanitize(e.message), true);
    _submitCooldown['wish'] = 0;
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}
