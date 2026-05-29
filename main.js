var _gmapPanelOpen = false;
var _popupLeafletMap = null;
var _popupLeafletMarkers = [];
var _popupLeafletInitDone = false;
var _popupMapTxFilter = 'ALL';

function openGmapPopup(){
  const panel = document.getElementById('gmap-inline-panel');
  if(!panel) return;
  if(!_gmapPanelOpen){
    panel.classList.add('map-open');
    _gmapPanelOpen = true;
    const isDesktop = window.matchMedia('(min-width:769px)').matches;
    if(isDesktop){
      const allModal = document.getElementById('all-modal');
      const allBody  = document.getElementById('all-body');
      if(allModal) allModal.classList.add('map-layout');
      if(allBody) allBody.removeAttribute('style');
    }
    setTimeout(function(){
      _initPopupLeafletMap();
      setTimeout(function(){
        if(_popupLeafletMap) _popupLeafletMap.invalidateSize();
      }, 320);
    }, 80);
  } else {
    closeGmapPopup();
  }
}
function closeGmapPopup(){
  const panel = document.getElementById('gmap-inline-panel');
  if(panel){ panel.classList.remove('map-open'); }
  _gmapPanelOpen = false;
  const allModal = document.getElementById('all-modal');
  const allBody  = document.getElementById('all-body');
  if(allModal) allModal.classList.remove('map-layout');
  if(allBody) allBody.setAttribute('style','max-height:75vh;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain');
}
function _initPopupLeafletMap(){
  if(typeof L === 'undefined'){ setTimeout(_initPopupLeafletMap, 300); return; }
  var mapEl = document.getElementById('popup-leaflet-map');
  if(!mapEl) return;
  if(_popupLeafletInitDone && _popupLeafletMap){
    _popupLeafletMap.invalidateSize();
    _popupRefreshMarkers();
    return;
  }
  _popupLeafletInitDone = true;
  _popupLeafletMap = L.map('popup-leaflet-map', {
    center: [13.7563, 100.5018],
    zoom: 11,
    zoomControl: true,
    attributionControl: false
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(_popupLeafletMap);
  _popupRefreshMarkers();
  setTimeout(function(){
    var hint = document.getElementById('popup-map-hint');
    if(hint) hint.style.opacity = '0';
  }, 4000);
}
function _popupRefreshMarkers(){
  if(!_popupLeafletMap) return;
  _popupLeafletMarkers.forEach(function(m){ _popupLeafletMap.removeLayer(m.layer); });
  _popupLeafletMarkers = [];
  // ── Prefer modal's current dataset over global props ──
  var data;
  if(window._modalTypeData){
    if(!window._modalTypeData._allData) window._modalTypeData._allData = [...window._modalTypeData.data];
    data = window._modalTypeData._allData;
  } else {
    data = (typeof _listingsBaseData !== 'undefined' && _listingsBaseData.length)
      ? _listingsBaseData
      : (typeof props !== 'undefined' ? props : (typeof MOCK !== 'undefined' ? MOCK.props : []));
  }
  if(!data || !data.length) return;
  var filtered = _popupMapTxFilter === 'ALL' ? data : data.filter(function(p){ return p.tx === _popupMapTxFilter; });
  var countEl = document.getElementById('popup-map-showing-count');
  if(countEl) countEl.textContent = filtered.length + ' ประกาศ';
  var pinEl = document.getElementById('popup-map-pin-count');
  if(pinEl) pinEl.textContent = '— ' + filtered.length + ' รายการ';
  var bounds = [];
  filtered.forEach(function(p){
    var coords = (typeof _mdGetCoords === 'function') ? _mdGetCoords(p) : [13.7563, 100.5018];
    bounds.push(coords);
    var isRent = p.tx === 'RENT';
    var priceLabel = isRent
      ? '฿' + (p.price >= 1000 ? Math.round(p.price/1000) + 'K' : p.price.toLocaleString()) + '/ด.'
      : (p.price >= 1e6 ? '฿' + (p.price/1e6).toFixed(1).replace(/\.?0+$/,'') + 'M' : '฿' + Math.round(p.price/1000) + 'K');
    var pinClass = 'md-map-price-pin' + (isRent ? ' rent-pin' : '');
    var icon = L.divIcon({ className: '', html: '<div class="' + pinClass + '">' + priceLabel + '</div>', iconSize: null, iconAnchor: [0,0] });
    var marker = L.marker(coords, { icon: icon, zIndexOffset: 0 });
    var imgHtml = (p.photos && p.photos[0])
      ? '<img class="md-popup-img" src="' + p.photos[0] + '" loading="lazy" alt="' + (p.title||'') + '">'
      : '<div class="md-popup-img-ph">' + (({'บ้านเดี่ยว':'🏡','คอนโด':'🏢','ทาวน์โฮม':'🏘️','ที่ดิน':'🗺️','อาคารพาณิชย์':'🏪','วิลล่า':'🌅'})[p.type] || '🏠') + '</div>';
    var txBadge = isRent ? '<span style="background:#3D7A55;color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">เช่า</span>' : '<span style="background:var(--p);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">ขาย</span>';
    var specsHtml = '';
    if(p.bed) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bed"></i>' + p.bed + '</span>';
    if(p.bath) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bath"></i>' + p.bath + '</span>';
    if(p.area) specsHtml += '<span class="md-popup-spec"><i class="fas fa-ruler-combined"></i>' + p.area + 'ตร.ม.</span>';
    var popupHtml = '<div>' + imgHtml +
      '<div class="md-popup-body">' +
        '<div class="md-popup-type">' + (p.type||'อสังหาฯ') + txBadge + '</div>' +
        '<div class="md-popup-title">' + (p.title||'') + '</div>' +
        '<div class="md-popup-loc"><i class="fas fa-map-marker-alt" style="color:var(--a);font-size:10px"></i> ' + (p.location||p.province||'กรุงเทพฯ') + '</div>' +
        '<div class="md-popup-price">' + (isRent ? '฿' + p.price.toLocaleString() + '/เดือน' : (p.price>=1e6 ? '฿'+(p.price/1e6).toFixed(2).replace(/\.?0+$/,'')+'M' : '฿'+p.price.toLocaleString())) + '</div>' +
        (specsHtml ? '<div class="md-popup-specs">' + specsHtml + '</div>' : '') +
        '<button class="md-popup-btn" onclick="if(typeof openModal===\'function\') openModal(\'' + p.id + '\')"><i class="fas fa-eye"></i> ดูรายละเอียด</button>' +
      '</div>' +
    '</div>';
    marker.bindPopup(popupHtml, { maxWidth: 260, minWidth: 260, offset: [130, 40] });
    marker.on('click', function(){
      _popupLeafletMarkers.forEach(function(m){ if(m.el) m.el.classList.remove('active'); });
      var pinEl2 = marker.getElement();
      if(pinEl2){ var d = pinEl2.querySelector('.md-map-price-pin'); if(d) d.classList.add('active'); }
    });
    marker.addTo(_popupLeafletMap);
    _popupLeafletMarkers.push({ layer: marker, prop: p });
  });
  if(bounds.length){
    try {
      if(bounds.length === 1) _popupLeafletMap.setView(bounds[0], 14);
      else _popupLeafletMap.fitBounds(bounds, { padding: [40,40] });
    } catch(e) {}
  }
}
function popupMapFilterTx(tx, btn){
  _popupMapTxFilter = tx;
  document.querySelectorAll('.popup-map-fchip').forEach(function(c){ c.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  _popupRefreshMarkers();
  // ── Sync cards grid on the right to match the map filter ──
  if(window._modalTypeData){
    // snapshot full unfiltered data on first filter action
    if(!window._modalTypeData._allData){
      window._modalTypeData._allData = [...window._modalTypeData.data];
    }
    var base = window._modalTypeData._allData;
    var filtered = tx === 'ALL' ? [...base] : base.filter(function(p){ return p.tx === tx; });
    window._modalTypeData.data = filtered;
    window._modalTypeData.currentPage = 1;
    if(window._modalRenderPage) window._modalRenderPage(filtered, 1);
    // scroll cards column back to top
    var cardsCol = document.getElementById('all-body-cards-col');
    if(cardsCol) cardsCol.scrollTop = 0;
    var allBody = document.getElementById('all-body');
    if(allBody) allBody.scrollTop = 0;
  }
}
function popupMapFitAll(){
  if(!_popupLeafletMap || !_popupLeafletMarkers.length) return;
  var bounds = _popupLeafletMarkers.map(function(m){ return m.layer.getLatLng(); });
  try { _popupLeafletMap.fitBounds(bounds, {padding:[40,40]}); } catch(e) {}
}

/* ══ popup map combined filter (tx + type + province + price) ══ */
function popupMapFilterAll(){
  var txSel = document.getElementById('popup-map-tx-sel');
  var typSel = document.getElementById('popup-map-type-sel');
  var provSel = document.getElementById('popup-map-prov-sel');
  var priceSel = document.getElementById('popup-map-price-sel');
  var priceMinSel = document.getElementById('popup-map-price-min-sel');
  var kwEl = document.getElementById('popup-map-kw');
  var tx = txSel ? txSel.value : 'ALL';
  var typ = typSel ? typSel.value : '';
  var prov = provSel ? provSel.value : '';
  var maxPrice = priceSel ? Number(priceSel.value||0) : 0;
  var minPrice = priceMinSel ? Number(priceMinSel.value||0) : 0;
  var kw = kwEl ? kwEl.value.toLowerCase() : '';
  _popupMapTxFilter = tx;

  // ── Use modal's base data if available, otherwise fall back to global ──
  var baseData;
  if(window._modalTypeData){
    if(!window._modalTypeData._allData) window._modalTypeData._allData = [...window._modalTypeData.data];
    baseData = window._modalTypeData._allData;
  } else {
    baseData = (typeof _listingsBaseData !== 'undefined' && _listingsBaseData.length)
      ? _listingsBaseData
      : (typeof props !== 'undefined' ? props : (typeof MOCK !== 'undefined' ? MOCK.props : []));
  }

  var filtered = baseData.filter(function(p){
    if(kw){ var hay=((p.title||'')+' '+(p.location||'')+' '+(p.province||'')).toLowerCase(); if(hay.indexOf(kw)===-1) return false; }
    if(tx && tx !== 'ALL' && p.tx !== tx) return false;
    if(typ && p.type && p.type.indexOf(typ) === -1) return false;
    if(prov){ var _pvL=prov.toLowerCase(); var _pPL=(p.province||'').toLowerCase(); var _pLL=(p.location||'').toLowerCase(); var _norm=function(s){return s.replace('มหานคร','').replace('ฯ','').trim();}; var _matchP=_pPL.includes(_pvL)||_pvL.includes(_pPL)||_norm(_pPL).includes(_norm(_pvL))||_norm(_pvL).includes(_norm(_pPL))||_pLL.includes(_pvL)||_pLL.includes(_norm(_pvL)); if(!_matchP) return false; }
    if(minPrice && p.price && p.price < minPrice) return false;
    if(maxPrice && p.price && p.price > maxPrice) return false;
    return true;
  });

  // ── Update map markers with filtered data ──
  _popupRefreshMarkersFromData(filtered);

  // ── Sync cards panel ──
  if(window._modalTypeData){
    var sortVal = (document.getElementById('modal-adv-sort')||{}).value||'default';
    var sorted = (typeof sortListings === 'function') ? sortListings(filtered, sortVal) : filtered;
    window._modalTypeData.data = sorted;
    window._modalTypeData.currentPage = 1;
    if(window._modalRenderPage) window._modalRenderPage(sorted, 1);
    var cardsCol = document.getElementById('all-body-cards-col');
    if(cardsCol) cardsCol.scrollTop = 0;
    var countEl = document.getElementById('modal-adv-count');
    if(countEl) countEl.textContent = 'พบ ' + sorted.length + ' รายการ';
  }

  // ── Sync cards panel filter selects to match map filter ──
  var kwCard = document.getElementById('modal-adv-kw');
  if(kwCard) kwCard.value = kw||'';
  var txCard = document.getElementById('modal-adv-tx');
  if(txCard) txCard.value = (tx==='BUY'||tx==='RENT') ? tx : '';
  var typCard = document.getElementById('modal-adv-proptype');
  if(typCard) typCard.value = typ||'';
  var provCard = document.getElementById('modal-adv-province');
  if(provCard) provCard.value = prov||'';
  var popLocCard = document.getElementById('modal-adv-popular-loc');
  if(popLocCard) popLocCard.value = '';
  var priceCard = document.getElementById('modal-adv-maxprice');
  if(priceCard) priceCard.value = maxPrice ? String(maxPrice) : '';
  var priceMinCard = document.getElementById('modal-adv-minprice');
  if(priceMinCard) priceMinCard.value = minPrice ? String(minPrice) : '';
}
function popupMapResetFilters(){
  var ids = ['popup-map-tx-sel','popup-map-type-sel','popup-map-prov-sel','popup-map-price-sel','popup-map-price-min-sel'];
  ids.forEach(function(id){ var el = document.getElementById(id); if(el) el.value = el.options[0].value; });
  var kwEl = document.getElementById('popup-map-kw');
  if(kwEl) kwEl.value = '';
  _popupMapTxFilter = 'ALL';
  if(window._modalTypeData && window._modalTypeData._allData){
    var allData = window._modalTypeData._allData;
    _popupRefreshMarkersFromData(allData);
    window._modalTypeData.data = [...allData];
    window._modalTypeData.currentPage = 1;
    if(window._modalRenderPage) window._modalRenderPage(window._modalTypeData.data, 1);
    var countEl = document.getElementById('modal-adv-count');
    if(countEl) countEl.textContent = '';
  } else {
    _popupRefreshMarkers();
  }
  // Reset cards panel selects too
  ['modal-adv-kw','modal-adv-tx','modal-adv-proptype','modal-adv-popular-loc','modal-adv-province','modal-adv-district','modal-adv-minprice','modal-adv-maxprice'].forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    if(el.tagName === 'SELECT') el.value = el.options[0].value;
    else el.value = '';
  });
}
function _popupRefreshMarkersFiltered(tx, typ, prov, maxPrice, kw){
  if(!_popupLeafletMap) return;
  _popupLeafletMarkers.forEach(function(m){ _popupLeafletMap.removeLayer(m.layer); });
  _popupLeafletMarkers = [];
  var data = (typeof _listingsBaseData !== 'undefined' && _listingsBaseData.length)
    ? _listingsBaseData
    : (typeof props !== 'undefined' ? props : (typeof MOCK !== 'undefined' ? MOCK.props : []));
  if(!data || !data.length) return;
  var filtered = data.filter(function(p){
    if(kw){ var hay=((p.title||'')+' '+(p.location||'')+' '+(p.province||'')).toLowerCase(); if(hay.indexOf(kw)===-1) return false; }
    if(tx && tx !== 'ALL' && p.tx !== tx) return false;
    if(typ && p.type && p.type.indexOf(typ) === -1) return false;
    if(prov){ var _pvL=prov.toLowerCase(); var _pPL=(p.province||'').toLowerCase(); var _pLL=(p.location||'').toLowerCase(); var _norm=function(s){return s.replace('มหานคร','').replace('ฯ','').trim();}; var _matchP=_pPL.includes(_pvL)||_pvL.includes(_pPL)||_norm(_pPL).includes(_norm(_pvL))||_norm(_pvL).includes(_norm(_pPL))||_pLL.includes(_pvL)||_pLL.includes(_norm(_pvL)); if(!_matchP) return false; }
    if(maxPrice && p.price && p.price > maxPrice) return false;
    return true;
  });
  var countEl = document.getElementById('popup-map-showing-count');
  if(countEl) countEl.textContent = filtered.length + ' ประกาศ';
  var pinEl = document.getElementById('popup-map-pin-count');
  if(pinEl) pinEl.textContent = '— ' + filtered.length + ' รายการ';
  var bounds = [];
  filtered.forEach(function(p){
    var coords = (typeof _mdGetCoords === 'function') ? _mdGetCoords(p) : [13.7563, 100.5018];
    bounds.push(coords);
    var isRent = p.tx === 'RENT';
    var priceLabel = isRent
      ? '฿' + (p.price >= 1000 ? Math.round(p.price/1000) + 'K' : p.price.toLocaleString()) + '/ด.'
      : (p.price >= 1e6 ? '฿' + (p.price/1e6).toFixed(1).replace(/\.?0+$/,'') + 'M' : '฿' + Math.round(p.price/1000) + 'K');
    var pinClass = 'md-map-price-pin' + (isRent ? ' rent-pin' : '');
    var icon = L.divIcon({ className: '', html: '<div class="' + pinClass + '">' + priceLabel + '</div>', iconSize: null, iconAnchor: [0,0] });
    var marker = L.marker(coords, { icon: icon, zIndexOffset: 0 });
    var imgHtml = (p.photos && p.photos[0])
      ? '<img class="md-popup-img" src="' + p.photos[0] + '" loading="lazy" alt="' + (p.title||'') + '">'
      : '<div class="md-popup-img-ph">' + (({'บ้านเดี่ยว':'🏡','คอนโด':'🏢','ทาวน์โฮม':'🏘️','ที่ดิน':'🗺️','อาคารพาณิชย์':'🏪','วิลล่า':'🌅'})[p.type] || '🏠') + '</div>';
    var txBadge = isRent ? '<span style="background:#3D7A55;color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">เช่า</span>' : '<span style="background:var(--p);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">ขาย</span>';
    var specsHtml = '';
    if(p.bed) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bed"></i>' + p.bed + '</span>';
    if(p.bath) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bath"></i>' + p.bath + '</span>';
    if(p.area) specsHtml += '<span class="md-popup-spec"><i class="fas fa-ruler-combined"></i>' + p.area + 'ตร.ม.</span>';
    var popupHtml = '<div>' + imgHtml +
      '<div class="md-popup-body">' +
        '<div class="md-popup-type">' + (p.type||'อสังหาฯ') + txBadge + '</div>' +
        '<div class="md-popup-title">' + (p.title||'') + '</div>' +
        '<div class="md-popup-loc"><i class="fas fa-map-marker-alt" style="color:var(--a);font-size:10px"></i> ' + (p.location||p.province||'กรุงเทพฯ') + '</div>' +
        '<div class="md-popup-price">' + (isRent ? '฿' + p.price.toLocaleString() + '/เดือน' : (p.price>=1e6 ? '฿'+(p.price/1e6).toFixed(2).replace(/\.?0+$/,'')+'M' : '฿'+p.price.toLocaleString())) + '</div>' +
        (specsHtml ? '<div class="md-popup-specs">' + specsHtml + '</div>' : '') +
        '<button class="md-popup-btn" onclick="if(typeof openModal===\'function\') openModal(\'' + p.id + '\')"><i class="fas fa-eye"></i> ดูรายละเอียด</button>' +
      '</div>' +
    '</div>';
    marker.bindPopup(popupHtml, { maxWidth: 260, minWidth: 260, offset: [130, 40] });
    marker.on('click', function(){
      _popupLeafletMarkers.forEach(function(m){ if(m.el) m.el.classList.remove('active'); });
      var pinEl2 = marker.getElement();
      if(pinEl2){ var d = pinEl2.querySelector('.md-map-price-pin'); if(d) d.classList.add('active'); }
    });
    marker.addTo(_popupLeafletMap);
    _popupLeafletMarkers.push({ layer: marker, prop: p });
  });
  if(bounds.length){
    try {
      if(bounds.length === 1) _popupLeafletMap.setView(bounds[0], 14);
      else _popupLeafletMap.fitBounds(bounds, { padding: [40,40] });
    } catch(e) {}
  }
}

/* ══ Modal advanced filter (cards panel) ══ */
function modalAdvFilter(type){
  if(!window._modalTypeData) return;
  var kw = (document.getElementById('modal-adv-kw')||{}).value||'';
  var tx = (document.getElementById('modal-adv-tx')||{}).value||'';
  var typ = (document.getElementById('modal-adv-proptype')||{}).value||'';
  var popLoc = (document.getElementById('modal-adv-popular-loc')||{}).value||'';
  var provVal = (document.getElementById('modal-adv-province')||{}).value||'';
  var distVal = (document.getElementById('modal-adv-district')||{}).value||'';
  // ถ้าเลือก popular-loc ให้ clear drill-down display + state
  if(popLoc) {
    _madvProv = ''; _madvDist = ''; _madvLevel = 'top';
    var disp = document.getElementById('madv-loc-display');
    if(disp) disp.textContent = 'จังหวัด';
    var sprov = document.getElementById('modal-adv-province');
    if(sprov) sprov.value = '';
    var sdist = document.getElementById('modal-adv-district');
    if(sdist) sdist.value = '';
    distVal = '';
  }
  var minPrice = Number((document.getElementById('modal-adv-minprice')||{}).value||0);
  var maxPrice = Number((document.getElementById('modal-adv-maxprice')||{}).value||0);
  var sort = (document.getElementById('modal-adv-sort')||{}).value||'default';
  // extra filter
  var ef = window._modalExtraFilter || {};
  if(!window._modalTypeData._allData) window._modalTypeData._allData = [...window._modalTypeData.data];
  var base = window._modalTypeData._allData;
  var filtered = base.filter(function(p){
    if(kw){
      var k = kw.toLowerCase();
      var hay = ((p.title||'') + ' ' + (p.location||'') + ' ' + (p.province||'') + ' ' + (p.district||p.amphoe||'')).toLowerCase();
      if(hay.indexOf(k) === -1) return false;
    }
    if(tx && p.tx !== tx) return false;
    if(typ && p.type && p.type.indexOf(typ) === -1) return false;
    // ── Province filter (flexible match: รองรับ กรุงเทพฯ variants) ──
    if(provVal) {
      var pProv = (p.province||'').toLowerCase();
      var pLoc  = (p.location||'').toLowerCase();
      var fProv = provVal.toLowerCase();
      var _normP = function(s){ return s.replace('มหานคร','').replace('ฯ','').trim(); };
      var _matchAdv = pProv === fProv || pProv.includes(fProv) || fProv.includes(pProv)
        || _normP(pProv) === _normP(fProv) || _normP(pProv).includes(_normP(fProv)) || _normP(fProv).includes(_normP(pProv))
        || pLoc.includes(fProv) || pLoc.includes(_normP(fProv));
      if(!_matchAdv) return false;
    }
    // ── District/amphoe filter (only when province also selected) ──
    if(distVal) {
      var fDist = distVal.toLowerCase();
      var distHay = ((p.district||'') + ' ' + (p.amphoe||'') + ' ' + (p.location||'')).toLowerCase();
      if(distHay.indexOf(fDist) === -1) return false;
    }
    // ── Popular location filter (keyword match across all location fields) ──
    if(popLoc) {
      var fPop = popLoc.toLowerCase();
      var popHay = ((p.location||'') + ' ' + (p.province||'') + ' ' + (p.district||p.amphoe||'') + ' ' + (p.title||'')).toLowerCase();
      if(popHay.indexOf(fPop) === -1) return false;
    }
    if(minPrice && p.price && p.price < minPrice) return false;
    if(maxPrice && p.price && p.price > maxPrice) return false;
    // extra filters
    if(ef.minBed && Number(p.bedrooms||p.beds||p.bed||0) < Number(ef.minBed)) return false;
    if(ef.minBath && Number(p.bathrooms||p.baths||p.bath||0) < Number(ef.minBath)) return false;
    if(ef.minArea && Number(p.area||p.usable_area||0) < Number(ef.minArea)) return false;
    if(ef.minPark && Number(p.parking||p.carpark||p.park||0) < Number(ef.minPark)) return false;
    if(ef.minPrice && p.price && p.price < Number(ef.minPrice)) return false;
    if(ef.maxPrice && p.price && p.price > Number(ef.maxPrice)) return false;
    if(ef.loc){var locH=((p.location||'')+(p.province||'')+(p.title||'')+(p.desc||'')).toLowerCase();if(locH.indexOf(ef.loc.toLowerCase())===-1) return false;}
    if(ef.bts){var btsH=((p.bts||'')+(p.location||'')+(p.transit||'')+(p.desc||'')).toLowerCase();if(btsH.indexOf(ef.bts.toLowerCase())===-1) return false;}
    if(ef.mrt){var mrtH=((p.mrt||'')+(p.location||'')+(p.transit||'')+(p.desc||'')).toLowerCase();if(mrtH.indexOf(ef.mrt.toLowerCase())===-1) return false;}
    if(ef.uni){var uniH=((p.location||'')+(p.desc||'')).toLowerCase();if(uniH.indexOf(ef.uni.toLowerCase())===-1) return false;}
    if(ef.furniture){ if((p.furniture||'') !== ef.furniture) return false; }
    if(ef.pets){ if(!p.pets_allowed) return false; }
    if(ef.minLand && ef.minLand > 0 && Number(p.land_area||p.land||0) < ef.minLand) return false;
    if(ef.maxLand && ef.maxLand < 1000 && Number(p.land_area||p.land||0) > ef.maxLand) return false;
    if(ef.minUsable && ef.minUsable > 0 && Number(p.area||p.usable_area||p.usable||0) < ef.minUsable) return false;
    if(ef.maxUsable && ef.maxUsable < 500 && Number(p.area||p.usable_area||p.usable||0) > ef.maxUsable) return false;
    if(ef.features && ef.features.length){
      var feat = (p.features||p.amenities||[]);
      var featStr = (typeof feat === 'string') ? feat : feat.join(' ');
      if(!ef.features.every(function(f){ return featStr.indexOf(f)!==-1; })) return false;
    }
    return true;
  });
  var sorted = (typeof sortListings === 'function') ? sortListings(filtered, sort) : filtered;
  window._modalTypeData.data = sorted;
  window._modalTypeData.currentPage = 1;
  var countEl = document.getElementById('modal-adv-count');
  if(countEl) countEl.textContent = 'พบ ' + sorted.length + ' รายการ';
  if(window._modalRenderPage) window._modalRenderPage(sorted, 1);
  var bd = document.getElementById('all-body'); if(bd) bd.scrollTop = 0;
  // ── Sync filter values to map panel selects & refresh map markers (always if map exists) ──
  if(_popupLeafletMap){
    _syncMapSelectsFromCards(kw, tx, typ, prov, maxPrice, minPrice);
    _popupRefreshMarkersFromData(sorted);
  }
}
function modalAdvReset(type){
  // ── 1. Reset all filter bar fields ──
  var ids = ['modal-adv-kw','modal-adv-tx','modal-adv-proptype','modal-adv-popular-loc','modal-adv-province','modal-adv-district','modal-adv-minprice','modal-adv-maxprice'];
  ids.forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    if(el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  // ── 2. Reset custom drill-down location widget ──
  _madvProv = ''; _madvDist = ''; _madvLevel = 'top';
  var disp = document.getElementById('madv-loc-display');
  if(disp) disp.textContent = 'จังหวัด';
  if(typeof madvLocClose === 'function') madvLocClose();
  // ── 3. Reset sort ──
  var sortEl = document.getElementById('modal-adv-sort');
  if(sortEl) sortEl.value = 'default';
  var countEl = document.getElementById('modal-adv-count');
  if(countEl) countEl.textContent = '';
  // ── 4. Clear extra filter state ──
  window._modalExtraFilter = {};
  document.getElementById('modal-extra-filter-sheet')?.remove();
  // ── 5. Reset map panel selects ──
  if(typeof _syncMapSelectsFromCards === 'function' && typeof _popupLeafletMap !== 'undefined' && _popupLeafletMap){
    _syncMapSelectsFromCards('','','','',0,0);
  }
  // ── 6. คืน _allData กลับเป็น props ทั้งหมด (ล้างผล filter จาก banner search ด้วย) ──
  // เมื่อ openAllModal('all') ถูกเรียกหลัง banner filter → _allData = allFiltered (subset)
  // Reset ต้องคืนกลับเป็น full dataset เสมอ
  if(window._modalTypeData){
    var fullData = (typeof props !== 'undefined' && props.length)
      ? [...props]
      : (typeof MOCK !== 'undefined' ? [...MOCK.props] : []);
    if(fullData.length){
      window._modalTypeData._allData = fullData;
      window._modalTypeData.data     = fullData;
    }
  }
  // ── 7. Reset banner search bar (home page filter) ด้วย (silent — ไม่ scroll) ──
  // reset fields ทั้งหมดโดยไม่ trigger scroll เพราะ popup ยังเปิดอยู่
  try {
    var _skw = document.getElementById('s-kw');
    if(_skw){ _skw.value=''; var _al=document.getElementById('ac-list'); if(_al)_al.style.display='none'; }
    var _stype = document.getElementById('s-type'); if(_stype) _stype.value='';
    if(typeof locDrillClear==='function') locDrillClear();
    if(typeof locDrillClose==='function') locDrillClose();
    var _smn = document.getElementById('s-min'); if(_smn) _smn.selectedIndex=0;
    var _smx = document.getElementById('s-max'); if(_smx) _smx.selectedIndex=0;
    // reset tx tabs
    if(typeof tx !== 'undefined') tx = 'ALL';
    var _bt = document.querySelectorAll('.tx-tab');
    if(_bt[0]){ _bt[0].classList.add('active'); if(_bt[1])_bt[1].classList.remove('active'); if(_bt[2])_bt[2].classList.remove('active'); }
    if(typeof curType !== 'undefined') curType = '';
    var _cc = document.querySelectorAll('.cat-card'); _cc.forEach(function(c,i){ c.classList.toggle('active', i===0); });
    // reset adv filter panel ถ้ามี
    if(typeof resetAdvFilter==='function') resetAdvFilter();
    // reset home grid ให้แสดงทั้งหมด (ไม่ scroll)
    if(typeof _renderHomeGrids==='function') _renderHomeGrids();
  } catch(e){ console.warn('[modalAdvReset] banner reset error:', e); }
  // ── 8. Re-apply filter with cleared values (restores full dataset + refreshes cards + map markers) ──
  if(typeof modalAdvFilter === 'function') modalAdvFilter(type);
  var bd = document.getElementById('all-body'); if(bd) bd.scrollTop = 0;
}

/* ── Helper: sync map panel select values to match cards filter ── */
function _syncMapSelectsFromCards(kw, tx, typ, prov, maxPrice, minPrice){
  var kwEl = document.getElementById('popup-map-kw');
  if(kwEl) kwEl.value = kw||'';
  var txEl = document.getElementById('popup-map-tx-sel');
  if(txEl) txEl.value = (tx==='BUY'||tx==='RENT') ? tx : 'ALL';
  var typEl = document.getElementById('popup-map-type-sel');
  if(typEl) typEl.value = typ||'';
  var provEl = document.getElementById('popup-map-prov-sel');
  if(provEl) provEl.value = prov||'';
  var priceEl = document.getElementById('popup-map-price-sel');
  if(priceEl) priceEl.value = maxPrice ? String(maxPrice) : '';
  var priceMinEl = document.getElementById('popup-map-price-min-sel');
  if(priceMinEl) priceMinEl.value = minPrice ? String(minPrice) : '';
  _popupMapTxFilter = (tx==='BUY'||tx==='RENT') ? tx : 'ALL';
}

/* ── Helper: render map markers from an explicit data array (already filtered) ── */
function _popupRefreshMarkersFromData(data){
  if(!_popupLeafletMap) return;
  _popupLeafletMarkers.forEach(function(m){ _popupLeafletMap.removeLayer(m.layer); });
  _popupLeafletMarkers = [];
  if(!data || !data.length){
    var countEl2 = document.getElementById('popup-map-showing-count');
    if(countEl2) countEl2.textContent = '0 ประกาศ';
    var pinEl2b = document.getElementById('popup-map-pin-count');
    if(pinEl2b) pinEl2b.textContent = '— 0 รายการ';
    return;
  }
  var countEl = document.getElementById('popup-map-showing-count');
  if(countEl) countEl.textContent = data.length + ' ประกาศ';
  var pinEl = document.getElementById('popup-map-pin-count');
  if(pinEl) pinEl.textContent = '— ' + data.length + ' รายการ';
  var bounds = [];
  data.forEach(function(p){
    var coords = (typeof _mdGetCoords === 'function') ? _mdGetCoords(p) : [13.7563, 100.5018];
    bounds.push(coords);
    var isRent = p.tx === 'RENT';
    var priceLabel = isRent
      ? '฿' + (p.price >= 1000 ? Math.round(p.price/1000) + 'K' : p.price.toLocaleString()) + '/ด.'
      : (p.price >= 1e6 ? '฿' + (p.price/1e6).toFixed(1).replace(/\.?0+$/,'') + 'M' : '฿' + Math.round(p.price/1000) + 'K');
    var pinClass = 'md-map-price-pin' + (isRent ? ' rent-pin' : '');
    var icon = L.divIcon({ className: '', html: '<div class="' + pinClass + '">' + priceLabel + '</div>', iconSize: null, iconAnchor: [0,0] });
    var marker = L.marker(coords, { icon: icon, zIndexOffset: 0 });
    var imgHtml = (p.photos && p.photos[0])
      ? '<img class="md-popup-img" src="' + p.photos[0] + '" loading="lazy" alt="' + (p.title||'') + '">'
      : '<div class="md-popup-img-ph">' + (({'บ้านเดี่ยว':'🏡','คอนโด':'🏢','ทาวน์โฮม':'🏘️','ที่ดิน':'🗺️','อาคารพาณิชย์':'🏪','วิลล่า':'🌅'})[p.type] || '🏠') + '</div>';
    var txBadge = isRent ? '<span style="background:#3D7A55;color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">เช่า</span>' : '<span style="background:var(--p);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">ขาย</span>';
    var specsHtml = '';
    if(p.bed) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bed"></i>' + p.bed + '</span>';
    if(p.bath) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bath"></i>' + p.bath + '</span>';
    if(p.area) specsHtml += '<span class="md-popup-spec"><i class="fas fa-ruler-combined"></i>' + p.area + 'ตร.ม.</span>';
    var popupHtml = '<div>' + imgHtml +
      '<div class="md-popup-body">' +
        '<div class="md-popup-type">' + (p.type||'อสังหาฯ') + txBadge + '</div>' +
        '<div class="md-popup-title">' + (p.title||'') + '</div>' +
        '<div class="md-popup-loc"><i class="fas fa-map-marker-alt" style="color:var(--a);font-size:10px"></i> ' + (p.location||p.province||'กรุงเทพฯ') + '</div>' +
        '<div class="md-popup-price">' + (isRent ? '฿' + p.price.toLocaleString() + '/เดือน' : (p.price>=1e6 ? '฿'+(p.price/1e6).toFixed(2).replace(/\.?0+$/,'')+'M' : '฿'+p.price.toLocaleString())) + '</div>' +
        (specsHtml ? '<div class="md-popup-specs">' + specsHtml + '</div>' : '') +
        '<button class="md-popup-btn" onclick="if(typeof openModal===\'function\') openModal(\'' + p.id + '\')"><i class="fas fa-eye"></i> ดูรายละเอียด</button>' +
      '</div>' +
    '</div>';
    marker.bindPopup(popupHtml, { maxWidth: 260, minWidth: 260, offset: [130, 40] });
    marker.on('click', function(){
      _popupLeafletMarkers.forEach(function(m){ if(m.el) m.el.classList.remove('active'); });
      var pinEl2 = marker.getElement();
      if(pinEl2){ var d = pinEl2.querySelector('.md-map-price-pin'); if(d) d.classList.add('active'); }
    });
    marker.addTo(_popupLeafletMap);
    _popupLeafletMarkers.push({ layer: marker, prop: p });
  });
  if(bounds.length){
    try {
      if(bounds.length === 1) _popupLeafletMap.setView(bounds[0], 14);
      else _popupLeafletMap.fitBounds(bounds, { padding: [40,40] });
    } catch(e) {}
  }
}

// ⚠️ SECURITY: ต้องเปิด Row Level Security (RLS) ใน Supabase ก่อน deploy จริง
// ⚠️ ห้ามใส่ SERVICE ROLE KEY ที่นี่เด็ดขาด — ใช้เฉพาะ anon key เท่านั้น
// 🔧 จุด CONFIG ทั้งหมด — แก้ไขตรงนี้ที่เดียว
const C = {
  // --- [1] Supabase Project ---
  SUPABASE_URL:'https://cjfuysyzslpllyukpigi.supabase.co', // 🔧 [CONFIG-1] Supabase Project URL
  SUPABASE_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZnV5c3l6c2xwbGx5dWtwaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjEyNDcsImV4cCI6MjA5NTUzNzI0N30.7tu4jpM4SqYgx6XeOF3tisZqrO96ro4cKkP3pGeXLqA', // 🔧 [CONFIG-2] Supabase Anon/Public Key เท่านั้น!

  // --- [2] Supabase Storage ---
  STORAGE_BUCKET: 'matchdoor-assets', // 🔧 [CONFIG-3] ชื่อ Storage Bucket หลัก

  // --- [3] System Images (อัปโหลดไฟล์ไว้ใน bucket ตาม path นี้) ---
  IMG_LOGO:   'system/Logoweb.webp',       // 🔧 [CONFIG-4] โลโก้ navbar & footer  → อัปโหลด: matchdoor-assets/system/logoweb.webp
  IMG_BANNER: 'system/bannerWeb.webp',     // 🔧 [CONFIG-5] ภาพ hero background    → อัปโหลด: matchdoor-assets/system/bannerWeb.webp
  IMG_BANNER_OPACITY: 0.72,            // 🔧 [CONFIG-6] ความเข้มภาพ hero (0.0–1.0)
  IMG_OG:     'system/og-image.jpg',   // 🔧 [CONFIG-7] Open Graph image (og:image) → อัปโหลด: matchdoor-assets/system/og-image.jpg

  // --- [4] ข้อมูลบริษัท ---
  NAME:'Matchdoor',                    // 🔧 [CONFIG-8]  ชื่อแบรนด์
  HERO_SUB:'บ้าน คอนโด ที่ดิน ทุกประเภท ทุกทำเล ราคาดีที่สุด', // 🔧 [CONFIG-9]  คำโปรยใต้ hero
  SRV_TITLE:'บริการอสังหาฯครบวงจร', // 🔧 [CONFIG-10] หัวข้อหมวดบริการ
  SRV_SUB:'ซื้อ-ขาย อสังหาฯ ให้พวกเราช่วยดูแล', // 🔧 [CONFIG-11] คำโปรยหมวดบริการ
  ADDR:'บริษัท แมทซ์ดอร์ จำกัด, 126 ถนนนราธิวาสราชนครินทร์ แขวงทุ่งวัดดอน เขตสาทร กรุงเทพฯ 10120', // 🔧 [CONFIG-12] ที่อยู่บริษัท
  PHONE:'061-589-7459',               // 🔧 [CONFIG-13] เบอร์โทรติดต่อ
  LINE:'@matchdoor',                  // 🔧 [CONFIG-14] LINE ID
  FB:'https://facebook.com/matchdoor.official', // 🔧 [CONFIG-15] Facebook URL
  YT:'https://www.youtube.com/embed/VUQfT3gNT3g?si=WDXL3fAOPfFaeVFb', // 🔧 [CONFIG-16] YouTube embed URL
  COPYRIGHT:'© ' + new Date().getFullYear() + ' Matchdoor — สงวนลิขสิทธิ์', // 🔧 [CONFIG-17] ข้อความ copyright (dynamic year ค.ศ.)

  // --- [5] Security / Edge Function ---
  // 🔧 [CONFIG-18] ตั้งเป็น true หลังจาก deploy Supabase Edge Function "verify-and-insert" แล้ว
  //   Edge Function จะ: 1) verify Turnstile token จริงๆ ที่ server
  //                     2) log IP ของผู้ส่ง
  //                     3) insert ด้วย service role (ผ่าน RLS)
  //   ดูโค้ด Edge Function ได้ในไฟล์ supabase/functions/verify-and-insert/index.ts
  //   (ตัวอย่างโค้ดอยู่ใน comment บรรทัด 240–280 ในไฟล์นี้)
  USE_EDGE_FUNCTION: false, // 🔧 เปลี่ยนเป็น true เมื่อ deploy Edge Function แล้ว

  // --- [6] Analytics & Monitoring ---
  GA4_ID: 'G-XXXXXXXXXX',   // 🔧 [CONFIG-19] แทนด้วย Measurement ID จาก Google Analytics 4
                              //   ได้จาก: analytics.google.com → Admin → Data Streams → Measurement ID
  SENTRY_DSN: '',             // 🔧 [CONFIG-20] แทนด้วย DSN จาก Sentry Dashboard
                              //   ได้จาก: sentry.io → Project → Settings → Client Keys (DSN)
                              //   ใช้ Free Tier (5,000 errors/month ฟรี)
};

// 🖼️ SUPABASE STORAGE HELPER
// สร้าง Public URL จาก path ที่เก็บใน DB
// ตัวอย่าง: sbImg('properties/p1/photo_0.webp')
//   → https://xxx.supabase.co/storage/v1/object/public/matchdoor-assets/properties/p1/photo_0.webp
function sbImg(path) {
  if (!path) return '';
  // ถ้าเป็น URL เต็มอยู่แล้ว (http/https) ใช้ได้เลย
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // ถ้าเป็น data: URL (base64) ใช้ได้เลย
  if (path.startsWith('data:')) return path;
  // แปลง path → Supabase Storage Public URL
  const base = (C.SUPABASE_URL || '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${C.STORAGE_BUCKET}/${path}`;
}

// โหลด System Images (logo, banner) จาก Supabase Storage
// โหลด System Images (logo, banner) จากไฟล์ local ในโฟลเดอร์เดียวกับ index.html
async function loadSystemImages() {
  try {
    // โลโก้ — ใช้ไฟล์ local (absolute path จาก root)
    document.querySelectorAll('.logo-img-base').forEach(el => {
      el.src = '/LogoWeb.webp';
    });
    // Banner hero background — ใช้ไฟล์ local
    document.querySelectorAll('.hero-banner-img').forEach(el => {
      el.src = '/bannerWeb.webp';
      // บนมือถือ/tablet: canvas ปิดอยู่ → ใช้ img tag แสดงภาพแทน
      // บน desktop: canvas วาดภาพเองแล้ว → ซ่อน img tag ไว้ปกติ
      // แต่ถ้า canvas width = 0 (โหลดครั้งแรก full-screen) → แสดง img เป็น fallback
      const isMobile = window.innerWidth <= 768 || navigator.maxTouchPoints > 0;
      const isTablet = !isMobile && window.innerWidth <= 1024;
      const canvas = document.getElementById('hero-canvas');
      const canvasReady = canvas && (canvas.offsetWidth > 0 || canvas.width > 0);
      if(isMobile || isTablet || !canvasReady) {
        el.style.opacity = '0.72';
        el.style.display = 'block';
      } else {
        el.style.opacity = '0';
        el.style.display = 'none';
      }
      // Desktop: ตรวจสอบอีกครั้งหลัง layout เสร็จ — ถ้า canvas ทำงานแล้วให้ซ่อน img
      if(!isMobile && !isTablet) {
        setTimeout(() => {
          const c = document.getElementById('hero-canvas');
          if(c && c.width > 0 && c.height > 0) {
            // Canvas ทำงานได้แล้ว — ซ่อน img
            el.style.display = 'none';
            el.style.opacity = '0';
          } else {
            // Canvas ยังไม่ทำงาน — แสดง img เป็น fallback
            el.style.display = 'block';
            el.style.opacity = '0.72';
          }
        }, 500);
      }
    });
  } catch(e) {
    console.warn('[loadSystemImages]', e);
  }
}

let props=[], agents=[], port=[], services=[], blogs=[], filtered=[];

// Reset all filters on page load (handles refresh case)
(function resetOnLoad() {
  // Clear URL params that might cause empty state
  if(window.location.search || (window.location.hash && window.location.hash.length > 1)) {
    // Keep SPA redirect but clear any stale filter state
  }
  // Ensure filters start clean - will be applied after data loads
  window._initialLoad = true;
})();
let tx='ALL', curType='';
let favs = JSON.parse(localStorage.getItem('md_favs')||'[]').map(id=>String(id));
let slide_cur=0, slide_photos=[], slide_icon='🏠';
let sb=null, user=null, uploads=[];
let locActiveCat=null;
let allFiltered = []; // เก็บ filtered ทั้งหมดเพื่อใช้ใน modal

const $=id=>document.getElementById(id);
const $$=sel=>document.querySelectorAll(sel);
function toast(msg,err=false){ const t=$('toast'); t.textContent=msg; t.style.background=err?'rgba(200,50,50,.9)':'rgba(0,0,0,.85)'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); }
function loading(s){$('loading').classList.toggle('show',s)}
function scrollToEl(id){$(id)?.scrollIntoView({behavior:'smooth'})}
function fmtPrice(p,t){
  const lang=(typeof _lang!=='undefined'&&_lang)||'th';
  const perMonth = lang==='en'?'/mo':lang==='cn'?'/月':lang==='ja'?'/月':'/เดือน';
  const million = lang==='en'?'M':lang==='cn'?'百万':lang==='ja'?'M':' ล้าน';
  if(t==='RENT') return '฿'+p.toLocaleString()+perMonth;
  if(p>=1e6) return '฿'+(p/1e6).toFixed(2).replace(/\.?0+$/,'')+million;
  return '฿'+p.toLocaleString();
}
function typeIcon(t){ const map={'บ้านเดี่ยว':'🏡','ทาวน์โฮม':'🏘️','คอนโด':'🏢','ที่ดิน':'🗺️','อาคารพาณิชย์':'🏪','วิลล่า':'🌅','รีสอร์ท':'🌙','โรงแรม':'⭐'}; return map[t]||'🏠'; }
function daysAgo(d){
  if(!d)return'';
  const n=Math.floor((new Date()-new Date(d))/864e5);
  const lang=(typeof _lang!=='undefined'&&_lang)||'th';
  if(lang==='en'){
    if(n===0)return'Today';
    if(n===1)return'Yesterday';
    if(n<7)return n+' days ago';
    if(n<30)return Math.floor(n/7)+' weeks ago';
    return Math.floor(n/30)+' months ago';
  } else if(lang==='cn'){
    if(n===0)return'今天';
    if(n===1)return'昨天';
    if(n<7)return n+' 天前';
    if(n<30)return Math.floor(n/7)+' 周前';
    return Math.floor(n/30)+' 个月前';
  } else if(lang==='ja'){
    if(n===0)return '今日';
    if(n===1)return '昨日';
    if(n<7)return n+' 日前';
    if(n<30)return Math.floor(n/7)+' 週間前';
    return Math.floor(n/30)+' ヶ月前';
  }
  if(n===0)return'วันนี้'; if(n===1)return'เมื่อวาน';
  return n<7?n+' วันที่แล้ว':n<30?Math.floor(n/7)+' สัปดาห์ที่แล้ว':Math.floor(n/30)+' เดือนที่แล้ว';
}
function lineUrl(id){ return 'https://line.me/ti/p/' + (id || C.LINE).replace(/^~/, ''); }
function _initApplyFilters(){
  // เรียก _renderHomeGrids แทน — แสดง ALL props โดยตรง
  _renderHomeGrids();
}
function resetSearch(){
  // ── reset search bar fields ──
  const kw=$('s-kw'); if(kw){kw.value='';const al=$('ac-list');if(al)al.style.display='none';}
  const st=$('s-type');if(st)st.value='';
  locDrillClear(); locDrillClose();
  const smn=$('s-min');if(smn)smn.selectedIndex=0;
  const smx=$('s-max');if(smx)smx.selectedIndex=0;
  const pr=$('s-price-range');if(pr)pr.value='0|0';
  // ── reset tx tabs ──
  tx='ALL';
  const bt=document.querySelectorAll('.tx-tab');
  if(bt[0]){ bt[0].classList.add('active'); if(bt[1])bt[1].classList.remove('active'); if(bt[2])bt[2].classList.remove('active'); }
  const pb=$('price-buy-section'),prs=$('price-rent-section');
  if(pb)pb.style.display='block'; if(prs)prs.style.display='none';
  curType='';
  const cc=$$('.cat-card'); cc.forEach((c,i)=>c.classList.toggle('active',i===0));
  const ll=$('loc-search-layer');if(ll)ll.style.display='none';
  locActiveCat=null;
  // ── reset adv filter panel + sheet (Filter เพิ่มเติม) ──
  if(typeof resetAdvFilter==='function') resetAdvFilter();
  // ── reset modal extra filter state ──
  window._modalExtraFilter={};
  applyFilters().catch(console.error);
  requestAnimationFrame(()=>{
    const hero=document.querySelector('#page-home .hero');
    if(hero){ window.scrollTo({top:hero.getBoundingClientRect().top+(window.scrollY||window.pageYOffset)-64,behavior:'smooth'}); }
    else { window.scrollTo({top:0,behavior:'smooth'}); }
  });
}
function handleLogoClick(){ resetSearch(); showPage('home'); }

async function loadLegalPages(){
  if(!sb) return;
  try{
    const {data,error} = await sb.from('legal_pages').select('id,title,content,version,effective_date,updated_at');
    if(error||!data) return;
    data.forEach(page => {
      const modalBodyMap = {
        'privacy':'privacy-modal',
        'terms':'terms-modal',
        'acceptable_use':'acceptable-use-modal',
        'buy_sell':'buysell-modal',
        'cookie':'cookie-modal'
      };
      const modalId = modalBodyMap[page.id];
      if(!modalId) return;
      const modal = document.getElementById(modalId);
      if(!modal) return;
      const body = modal.querySelector('.mbody, .privacy-modal-body, .mbody');
      if(body) body.innerHTML = page.content;
      // Update modal heading title if exists
      const h2 = modal.querySelector('.mhd h2');
      if(h2 && page.title){
        // Keep icon, update text after icon
        const icon = h2.querySelector('i');
        if(icon) h2.innerHTML = icon.outerHTML + ' ' + page.title;
        else h2.textContent = page.title;
      }
    });
    console.log(`✅ Legal pages loaded: ${data.length}`);
  } catch(e){ console.warn('[loadLegalPages] skipped:', e.message); }
}

function initCookieConsent(){
  const consent = localStorage.getItem('md_cookie_consent');
  if(consent === null) {
    setTimeout(()=>{ const b=document.getElementById('cookie-banner'); if(b) b.classList.add('show'); }, 800);
  }
  const acceptBtn = document.getElementById('cb-accept-btn');
  const declineBtn = document.getElementById('cb-decline-btn');
  if(acceptBtn) acceptBtn.addEventListener('click', ()=>{
    localStorage.setItem('md_cookie_consent', JSON.stringify({necessary:true, analytics:true, ts: Date.now()}));
    hideCookieBanner();
    toast('ขอบคุณที่ยอมรับนโยบายคุกกี้ ✨');
    // โหลด GA4 ทันทีเมื่อ consent
    if(typeof window._onAnalyticsConsentGranted === 'function') window._onAnalyticsConsentGranted();
  });
  if(declineBtn) declineBtn.addEventListener('click', ()=>{
    localStorage.setItem('md_cookie_consent', JSON.stringify({necessary:true, analytics:false, ts: Date.now()}));
    hideCookieBanner();
    toast('บันทึกการตั้งค่าคุกกี้แล้ว');
  });
  // Legacy cookie-modal buttons
  const oldAccept = document.getElementById('cookie-accept');
  const oldDecline = document.getElementById('cookie-decline');
  if(oldAccept) oldAccept.addEventListener('click', ()=>{
    localStorage.setItem('md_cookie_consent', JSON.stringify({necessary:true, analytics:true, ts: Date.now()}));
    closeCookieModal();
    toast('ขอบคุณที่ยอมรับนโยบายคุกกี้');
    if(typeof window._onAnalyticsConsentGranted === 'function') window._onAnalyticsConsentGranted();
  });
  if(oldDecline) oldDecline.addEventListener('click', ()=>{
    localStorage.setItem('md_cookie_consent', JSON.stringify({necessary:true, analytics:false, ts: Date.now()}));
    closeCookieModal();
    toast('คุณปฏิเสธคุกกี้ที่ไม่จำเป็น');
  });
}
function hideCookieBanner(){
  const b=document.getElementById('cookie-banner');
  if(b){ b.classList.remove('show'); setTimeout(()=>b.style.display='none',500); }
}
/* ══════════════════════════════════════════════════════════════
   MODAL HELPER — ทุก modal ต้องผ่าน 2 ฟังก์ชันนี้เท่านั้น
   _openModal(id)  → add 'open' + lock scroll
   _closeModal(id) → remove 'open' + unlock scroll
   ไม่มีข้อยกเว้น — ห้าม classList.add/remove('open') ตรงๆ
   กับ modal ใดก็ตาม นอกจากผ่าน helper นี้
══════════════════════════════════════════════════════════════ */
function _openModal(id){
  const m = document.getElementById(id);
  if(!m) return;
  m.classList.add('open');
  document.body.classList.add('modal-open'); // overflow:hidden via CSS .modal-open
}
function _closeModal(id){
  const m = document.getElementById(id);
  if(!m) return;
  // ถ้าปิด all-modal ให้ปิดแผนที่ที่ค้างอยู่ด้วย
  if(id === 'all-modal' && _gmapPanelOpen) {
    closeGmapPopup();
  }
  m.classList.remove('open');
  /* unlock scroll เฉพาะเมื่อไม่มี modal อื่นเปิดอยู่ */
  const stillOpen = document.querySelector('.ov.open, [id$="-modal"].open, [id$="-overlay"].open');
  if(!stillOpen){
    document.body.style.removeProperty('overflow');
    document.body.classList.remove('modal-open');
  }
}
function _closeModalEl(el){
  /* ปิด modal จาก element reference แทน id */
  if(!el) return;
  el.classList.remove('open');
  const stillOpen = document.querySelector('.ov.open, [id$="-modal"].open, [id$="-overlay"].open');
  if(!stillOpen){
    document.body.style.removeProperty('overflow');
    document.body.classList.remove('modal-open');
  }
}

function closeCookieModal(){
  _closeModal('cookie-modal');
}
function openCookieModal(){
  _openModal('cookie-modal');
}
function openPrivacyModal(){
  _openModal('privacy-modal');
}
function openTermsModal(){
  _openModal('terms-modal');
}
function openAcceptableUseModal(){
  _openModal('acceptable-use-modal');
}
function openBuySellModal(){
  _openModal('buysell-modal');
}
function getAnalyticsConsent(){
  try{ const c=JSON.parse(localStorage.getItem('md_cookie_consent')||'{}'); return c.analytics===true; }
  catch(e){ return false; }
}

/* ═══════════════════════════════════════════════════════════════
   GA4 Custom Event Tracking — เชื่อม consent + consent-aware
   ใช้: trackEvent('property_view', { property_id:'p1', price:3500000 })
   ═══════════════════════════════════════════════════════════════ */
function trackEvent(eventName, params){
  try{
    if(!getAnalyticsConsent()) return;       // ไม่ track ถ้ายังไม่ได้ consent
    if(typeof window.gtag !== 'function') return; // GA4 ยังไม่โหลด
    const base = {
      send_to: (typeof C !== 'undefined' && C.GA4_ID) ? C.GA4_ID : undefined,
      app_name: 'matchdoor',
      lang: typeof _lang !== 'undefined' ? _lang : 'th'
    };
    window.gtag('event', eventName, Object.assign(base, params||{}));
  } catch(e){ /* silent fail — ไม่ให้ tracking error มา break app */ }
}

/* ── GA4: SPA Page View tracker — เรียกทุกครั้งที่ showPage() ── */
function trackPageView(pageName, pageTitle){
  try{
    if(!getAnalyticsConsent() || typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: '/' + pageName,
      page_title: pageTitle || pageName,
      app_name: 'matchdoor'
    });
  } catch(e){}
}

/* ── ถ้าผู้ใช้ให้ consent ทีหลัง (จาก cookie banner) ── */
window._onAnalyticsConsentGranted = function(){
  if(typeof window._initGA4 === 'function') window._initGA4();
};

function initSB(){
  const url = (C.SUPABASE_URL||'').trim();
  const key = (C.SUPABASE_KEY||'').trim();
  if(!url || !key || url==='demo' || !url.startsWith('https://')) return false;
  try{ sb=window.supabase.createClient(url,key); return true; }
  catch(e){ console.error('Supabase init failed:',e); return false; }
}
async function sbFetch(table,opts={}){ const q=sb.from(table).select(opts.select||'*'); if(opts.eq) Object.entries(opts.eq).forEach(([k,v])=>q.eq(k,v)); if(opts.order) q.order(opts.order,{ascending:false}); const {data,error}=await q; if(error){ console.error('[sbFetch]',table,error); return null; } return data; }
async function sbInsert(table,data){
  // user_id: ใส่เมื่อ login เท่านั้น — anonymous ให้เป็น null (RLS รองรับแล้ว)
  if(typeof user !== 'undefined' && user && user.id) data.user_id = user.id;
  const {error}=await sb.from(table).insert([data]);
  if(error) throw new Error(error.message);
}

async function fetchProperties(){
  if(!sb) return null;
  const {data,error}=await sb.from('properties').select('*')
    .eq('status','approved')
    .order('created_at',{ascending:false});
  if(error){ console.error('[fetchProperties]',error); return null; }
  return data;
}
async function searchProperties(keyword){
  if(!sb||!keyword) return null;
  const {data,error}=await sb.from('properties').select('*')
    .eq('status','approved')
    .or(`title.ilike.%${keyword}%,location.ilike.%${keyword}%,province.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    .order('created_at',{ascending:false});
  if(error){ console.error('[searchProperties]',error); return null; }
  return data;
}
async function filterProperties(filters={}){
  if(!sb) return null;
  let q=sb.from('properties').select('*').eq('status','approved');
  if(filters.tx && filters.tx!=='ALL') q=q.eq('tx',filters.tx);
  if(filters.type) q=q.eq('type',filters.type);
  if(filters.province) q=q.eq('province',filters.province);
  // district filter: ลอง ilike บน district column ก่อน (ถ้า DB มี column นั้น)
  if(filters.district) q=q.or(`district.ilike.%${filters.district}%,amphoe.ilike.%${filters.district}%,location.ilike.%${filters.district}%`);
  if(filters.minPrice) q=q.gte('price',filters.minPrice);
  if(filters.maxPrice && filters.maxPrice<999000000) q=q.lte('price',filters.maxPrice);
  if(filters.keyword) q=q.or(`title.ilike.%${filters.keyword}%,location.ilike.%${filters.keyword}%,province.ilike.%${filters.keyword}%`);
  q=q.order('created_at',{ascending:false});
  const {data,error}=await q;
  if(error){ console.error('[filterProperties]',error); return null; }
  return data||[];
}
async function checkAuth(){
  if(!sb) return;
  const {data:{user:u}} = await sb.auth.getUser();
  user = u||null;
  // [v13] โหลดโปรไฟล์จาก user_profiles table ทุกครั้งที่ auth state เปลี่ยน
  _cachedUserProfile = null;
  if(user) await _loadUserProfile(true);
  renderAuthUI();
  updateFormBtns();
}

// Listen for auth state changes (handles OAuth redirect callbacks too)
function initAuthListener(){
  if(!sb) return;
  sb.auth.onAuthStateChange((_event, session) => {
    user = session?.user || null;
    renderAuthUI();
    updateFormBtns();
    if(_event === 'SIGNED_IN'){
      _closeModal('login-modal');
      _closeModal('signup-modal');
      toast('เข้าสู่ระบบสำเร็จ ✅');
      // ── ถ้ายัง URL มี OAuth hash เหลืออยู่ (กรณี Supabase process hash ช้า) ให้ clean ──
      if (location.hash && location.hash.includes('access_token=')) {
        history.replaceState(null, '', window.location.origin + '/');
        if (typeof _silentShowPage === 'function') _silentShowPage('home');
      }
      // ── Welcome Bonus: ตรวจและเติม Token ฟรีสำหรับ User ใหม่ ──
      if(session?.user?.id) grantWelcomeBonus(session.user.id);
      // If user came from my-account FAB, navigate to my-account page
      if(document.getElementById('page-my-account')?.classList.contains('active')){
        renderMyAccount();
      }
    }
    if(_event === 'SIGNED_OUT'){
      toast('ออกจากระบบเรียบร้อย');
      if(document.getElementById('page-my-account')?.classList.contains('active')){
        renderMyAccount();
      }
    }
    if(_event === 'PASSWORD_RECOVERY'){
      // เปิด modal ตั้งรหัสผ่านใหม่ทันที
      _openModal('reset-pw-modal');
    }
  });
}
function _buildUserMenuHtml(suffix, user){
  const init=(user.email||'U')[0].toUpperCase();
  const dispName = user.user_metadata?.display_name || user.email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" alt="${sanitize(dispName)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--bd)">`
    : `<div style="width:40px;height:40px;border-radius:50%;background:var(--p);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff">${init}</div>`;
  return `<div class="user-nav" id="user-nav-wrap-${suffix}">
    <div class="user-av" onclick="toggleUserMenu(event,'${suffix}')" title="เมนูผู้ใช้">${init}</div>
    <div class="user-email" onclick="toggleUserMenu(event,'${suffix}')" style="cursor:pointer">${sanitize(dispName)}</div>
    <div class="user-menu" id="user-menu-${suffix}">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px 10px;border-bottom:1px solid var(--bd);margin-bottom:4px">
        ${avatarHtml}
        <div style="overflow:hidden">
          <div style="font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">${sanitize(dispName)}</div>
          <div style="font-size:11px;color:var(--gr);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">${sanitize(user.email||'')}</div>
        </div>
      </div>
      <button class="user-menu-item" onclick="toggleUserMenu(event,'${suffix}');showPage('my-account')"><i class="fas fa-user-circle"></i> บัญชีของฉัน</button>
      <hr class="user-menu-sep">
      <button class="user-menu-item" style="color:#e05" onclick="logout()"><i class="fas fa-sign-out-alt"></i> ออกจากระบบ</button>
    </div>
  </div>`;
}
function renderAuthUI(){
  const el=$('auth-ui'); const elD=$('auth-ui-desktop');
  const loginBtn=`<button class="btn-login" onclick="_openModal('login-modal')"><i class="fas fa-sign-in-alt"></i> LogIn</button>`;
  if(el)  el.innerHTML  = user ? _buildUserMenuHtml('mob', user) : loginBtn;
  if(elD) elD.innerHTML = user ? _buildUserMenuHtml('desk', user) : loginBtn;
  /* re-bind close-on-outside-click after innerHTML swap */
  _bindUserMenuDismiss();
  /* sync profile FAB icon */
  _updateProfileFab();
}
function toggleUserMenu(e, suffix){
  e.stopPropagation();
  // ปิด menu อีกฝั่งก่อน (ป้องกันทั้ง 2 เปิดพร้อมกัน)
  ['mob','desk'].forEach(s=>{
    if(s !== suffix){
      const other = document.getElementById('user-menu-'+s);
      if(other) other.classList.remove('open');
    }
  });
  const m = document.getElementById('user-menu-'+(suffix||'desk'));
  if(m) m.classList.toggle('open');
}
function _bindUserMenuDismiss(){
  document.removeEventListener('click',_userMenuDismissHandler);
  document.addEventListener('click',_userMenuDismissHandler);
}
function _userMenuDismissHandler(e){
  ['mob','desk'].forEach(s=>{
    const wrap = document.getElementById('user-nav-wrap-'+s);
    if(wrap && !wrap.contains(e.target)){
      const m = document.getElementById('user-menu-'+s);
      if(m) m.classList.remove('open');
    }
  });
}
function openProfileModal(){
  ['mob','desk'].forEach(s=>{ const m=document.getElementById('user-menu-'+s); if(m) m.classList.remove('open'); });
  if(!user) return;
  const init=(user.email||'U')[0].toUpperCase();
  const circle=document.getElementById('profile-av-circle');
  const emailEl=document.getElementById('profile-email-display');
  const nameEl=document.getElementById('profile-display-name');
  if(circle) circle.textContent=init;
  if(emailEl) emailEl.textContent=user.email||'';
  if(nameEl) nameEl.value=user.user_metadata?.display_name||'';
  _openModal('profile-modal');
}

/* ── Profile FAB button handler ── */
function onProfileFabClick(){
  if(user){
    showPage('my-account');
  } else {
    // show login modal with a note that they can also browse without login
    _openModal('login-modal-from-fab');
    if(document.getElementById('login-modal-from-fab')) return;
    // Fallback: just open login modal and show skip option
    _openMyAccountGuestPrompt();
  }
}
function _openMyAccountGuestPrompt(){
  // Show guest-friendly login prompt via my-account page
  showPage('my-account');
}
/* ── Update profile FAB icon based on auth state ── */
function _updateProfileFab(){
  const btn = document.getElementById('profile-fab-btn');
  if(!btn) return;
  if(user){
    const init = (user.email||'U')[0].toUpperCase();
    btn.innerHTML = `<div class="pfab-av">${sanitize(init)}</div>`;
    btn.title = ui('fab.profile.title')||'บัญชีของฉัน';
  } else {
    btn.innerHTML = '<i class="fas fa-user-circle"></i>';
    btn.title = ui('fab.profile.title')||'เข้าสู่ระบบ / บัญชีของฉัน';
  }
}
/* ── My Account page renderer ── */
/* ── Dev Bypass: toggle preview mode without login (TEMP — remove before production) ── */
window._maDevBypass = false;
function _toggleMaDevBypass(){
  window._maDevBypass = !window._maDevBypass;
  // ── Dev mode: จำลอง Token 20 เหรียญให้ทดลองลงประกาศได้ ──
  if(window._maDevBypass && !user){
    _tokenBalance = 20;
    _myUserListings = [];
    _myTokenOrders  = [];
    console.info('[DEV] Token balance set to 20 (mock)');
  } else if(!window._maDevBypass && !user){
    _tokenBalance = 0;
  }
  renderMyAccount();
}

// ── [v13] ดึงข้อมูล user_profiles จาก DB — merge กับ auth.user_metadata ──
// เรียกครั้งแรกหลัง login และหลังบันทึกโปรไฟล์
let _cachedUserProfile = null;
async function _loadUserProfile(forceRefresh){
  if(!user||!sb) return null;
  if(_cachedUserProfile && !forceRefresh) return _cachedUserProfile;
  try {
    const { data } = await sb
      .from('user_profiles')
      .select('display_name,phone,line_id,avatar_url')
      .eq('user_id', user.id)
      .single();
    if(data){
      // merge ลง user_metadata เพื่อให้ renderAuthUI / renderMyAccount ใช้ได้เลย
      user.user_metadata = user.user_metadata || {};
      if(data.display_name) user.user_metadata.display_name = data.display_name;
      if(data.phone)        user.user_metadata.phone        = data.phone;
      if(data.line_id)      user.user_metadata.line_id      = data.line_id;
      _cachedUserProfile = data;
    }
  } catch(e){ /* silent — ใช้ auth.user_metadata เดิมแทน */ }
  return _cachedUserProfile;
}

function renderMyAccount(){
  const wrap = document.getElementById('my-account-content');
  if(!wrap) return;
  const t = (key) => {
    const e = I18N_DICT[key]; if(e) return e[_lang]||e['th']||key;
    return ui(key)||key;
  };
  // ── Dev bypass state: update button appearance ──
  const bypassBtn = document.getElementById('ma-dev-bypass-btn');
  const bypassLbl = document.getElementById('ma-dev-bypass-lbl');
  const isDevMode = !!window._maDevBypass;
  if(bypassBtn) bypassBtn.classList.toggle('active', isDevMode);
  if(bypassLbl) bypassLbl.textContent = isDevMode ? 'DEV: ON' : 'DEV Preview';

  if(!user && !isDevMode){
    // Show login prompt
    wrap.innerHTML = `
    <div class="ma-login-prompt">
      <i class="fas fa-door-open ma-lp-icon"></i>
      <h2>${sanitize(t('ma.login.prompt.h'))}</h2>
      <p>${sanitize(t('ma.login.prompt.p'))}</p>
      <div class="ma-lp-btns">
        <button class="ma-lp-btn ma-lp-btn-primary" onclick="_openModal('login-modal')">
          <i class="fas fa-sign-in-alt"></i> ${sanitize(t('ma.login.btn'))}
        </button>
        <button class="ma-lp-btn ma-lp-btn-ghost" onclick="showPage('home')">
          <i class="fas fa-home"></i> ${sanitize(t('ma.guest.btn'))}
        </button>
        <button class="ma-lp-skip" onclick="showPage('home');setTimeout(()=>{const sb=document.querySelector('.search-box');if(sb)sb.scrollIntoView({behavior:'smooth',block:'center'});},200)">
          <i class="fas fa-search"></i> ${_lang==='en'?'Search listings without signing in':_lang==='cn'?'不登录直接搜索':_lang==='ja'?'ログインせず検索':'ค้นหาประกาศโดยไม่ต้อง Login'}
        </button>
      </div>
    </div>`;
    return;
  }
  // ── Resolve user data (real or mock for dev mode) ──
  // [v13] ถ้ามี _cachedUserProfile ให้ใช้ข้อมูลจาก DB แทน auth.user_metadata ล้วนๆ
  const _profile = _cachedUserProfile;
  const _u = user || {
    email: 'dev@matchdoor.co',
    created_at: new Date(Date.now() - 30*24*3600*1000).toISOString(),
    user_metadata: { display_name: 'Dev Preview', phone: '081-234-5678', line_id: '@devpreview' }
  };
  // merge profile DB → user_metadata (กัน race condition)
  const _meta = { ...(_u.user_metadata||{}), ...(_profile||{}) };
  // Logged in (or dev bypass) — render full dashboard
  const init = (_u.email||'U')[0].toUpperCase();
  const dispName = sanitize(_meta.display_name || _u.email?.split('@')[0] || 'User');
  const email = sanitize(_u.email||'');
  const joinDate = _u.created_at ? new Date(_u.created_at).toLocaleDateString(_lang==='th'?'th-TH':_lang==='ja'?'ja-JP':_lang==='cn'?'zh-CN':'en-US',{year:'numeric',month:'long'}) : '';
  const favCount = (typeof favs!=='undefined' ? favs : []).length;
  const devBanner = isDevMode ? `<div class="ma-dev-banner"><i class="fas fa-flask"></i> DEV MODE — จำลอง <strong>${_tokenBalance} Token</strong> · ลงประกาศได้โดยไม่บันทึก DB จริง · กด "DEV: ON" เพื่อปิด</div>` : '';
  wrap.innerHTML = `
  ${devBanner}
  <div class="ma-hero">
    <div class="ma-av-ring">${init}</div>
    <div class="ma-hero-info">
      <div class="ma-hero-name">${dispName}</div>
      <div class="ma-hero-email">${email}</div>
      <div class="ma-hero-badge"><i class="fas fa-check-circle"></i> ${isDevMode?'⚗️ Dev Preview':(_lang==='en'?'Verified Member':_lang==='cn'?'已验证会员':_lang==='ja'?'認証済み':'สมาชิกที่ยืนยันแล้ว')}</div>
      ${joinDate?`<div style="font-size:11px;opacity:.65;margin-top:6px">${sanitize(t('ma.member.since'))} ${joinDate}</div>`:''}
    </div>
  </div>
  <div class="ma-tab-bar" id="ma-tab-bar">
    <button class="ma-tab active" data-tab="profile" onclick="_maTab('profile',this)"><i class="fas fa-user"></i> ${sanitize(t('ma.tab.profile'))}</button>
    <button class="ma-tab" data-tab="favs" onclick="_maTab('favs',this)"><i class="fas fa-heart"></i> ${sanitize(t('ma.tab.favs'))} ${favCount?`<span style="background:var(--a);color:#fff;border-radius:20px;padding:1px 6px;font-size:10px">${favCount}</span>`:''}</button>
    <button class="ma-tab" data-tab="listings" onclick="_maTab('listings',this);renderMaListingsPanel()"><i class="fas fa-building"></i> ประกาศของฉัน<span id="ma-token-badge" style="background:#f1c40f;color:#333;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:800;margin-left:2px">${_tokenBalance} T</span></button>
    <button class="ma-tab" data-tab="requests" onclick="_maTab('requests',this)"><i class="fas fa-file-alt"></i> ${sanitize(t('ma.tab.requests'))}</button>
    <button class="ma-tab" data-tab="history" onclick="_maTab('history',this)"><i class="fas fa-history"></i> ${sanitize(t('ma.tab.history'))}</button>
  </div>
  <!-- Profile panel -->
  <div class="ma-panel active" id="ma-panel-profile">
    <div class="ma-section">
      <div class="ma-section-title"><i class="fas fa-user-edit"></i> ${sanitize(t('ma.profile.title'))}</div>
      <div class="ma-field">
        <label>${sanitize(t('ma.profile.name'))}</label>
        <input type="text" id="ma-display-name" value="${dispName}" placeholder="${sanitize(t('ma.profile.name'))}">
      </div>
      <div class="ma-field">
        <label>${sanitize(t('ma.profile.email'))}</label>
        <input type="email" value="${email}" disabled style="background:var(--lt);color:var(--gr);cursor:default">
      </div>
      <div class="ma-field">
        <label>${sanitize(t('ma.profile.phone'))}</label>
        <input type="tel" id="ma-phone" value="${sanitize(_meta.phone||'')}" placeholder="0812345678">
      </div>
      <div class="ma-field">
        <label>${sanitize(t('ma.profile.line'))}</label>
        <input type="text" id="ma-line-id" value="${sanitize(_meta.line_id||'')}" placeholder="@yourlineid">
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
        <button class="ma-save-btn" onclick="${isDevMode?'alert(\"Dev mode: บันทึกจริงไม่ได้ ต้อง Login ก่อนครับ 🙏\")':'_maSaveProfile()'}">
          <i class="fas fa-save"></i> ${sanitize(t('ma.profile.save'))}${isDevMode?' (Dev)':''}
        </button>
        ${!isDevMode?`<button class="ma-logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> ${sanitize(t('ma.profile.logout'))}</button>`:''}
      </div>

    </div>
  </div>
  <!-- Favorites panel -->
  <div class="ma-panel" id="ma-panel-favs">
    <div class="ma-section">
      <div class="ma-section-title"><i class="fas fa-heart"></i> ${sanitize(t('ma.tab.favs'))}</div>
      ${_maFavHtml(t)}
    </div>
  </div>
  <!-- Listings panel (v15 Token System) -->
  <div class="ma-panel" id="ma-panel-listings">
    <div style="text-align:center;padding:30px;color:var(--tx2)">
      <i class="fas fa-spinner fa-spin" style="font-size:24px;opacity:.4"></i>
      <p style="margin-top:10px;font-size:13px">กำลังโหลด...</p>
    </div>
  </div>
  <!-- Requests panel -->
  <div class="ma-panel" id="ma-panel-requests">
    <div class="ma-section">
      <div class="ma-section-title"><i class="fas fa-file-alt"></i> ${sanitize(t('ma.tab.requests'))}</div>
      ${_maEmptyPanel('fa-file-alt',t('ma.requests.empty'),'fa-search',_lang==='en'?'Browse listings':_lang==='cn'?'浏览房源':_lang==='ja'?'物件を探す':'ค้นหาประกาศ',"showPage('home');setTimeout(()=>{const sb=document.querySelector('.search-box');if(sb)sb.scrollIntoView({behavior:'smooth',block:'center'});},200)")}
    </div>
  </div>
  <!-- History panel -->
  <div class="ma-panel" id="ma-panel-history">
    <div class="ma-section">
      <div class="ma-section-title"><i class="fas fa-history"></i> ${sanitize(t('ma.tab.history'))}</div>
      ${_maHistoryHtml(t)}
    </div>
  </div>`;
}
// ── State ──────────────────────────────────────────────────
let _tokenBalance     = 0;
let _tokenPackages    = [];
let _myUserListings   = [];
let _myTokenOrders    = [];

// ── โหลดข้อมูล Token ของ User ──────────────────────────────
async function loadUserTokenData() {
  if (!user || !sb) return;
  try {
    // ยอด Token คงเหลือ
    const { data: tokData } = await sb
      .from('user_tokens')
      .select('balance,total_purchased,total_used')
      .eq('user_id', user.id)
      .single();
    _tokenBalance = tokData?.balance ?? 0;

    // ประกาศของ User
    const { data: ulData } = await sb
      .from('user_listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    _myUserListings = ulData || [];

    // ออเดอร์ซื้อ Token
    const { data: ordData } = await sb
      .from('token_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    _myTokenOrders = ordData || [];

  } catch(e) {
    console.warn('[Token] loadUserTokenData error:', e.message);
  }
}

// ── Welcome Bonus: เติม 20 Token ให้ User ที่ Login ครั้งแรก ──
const WELCOME_BONUS_TOKENS = 20;
const WELCOME_BONUS_KEY    = 'md_welcome_bonus_claimed'; // localStorage key (กัน double-trigger)

async function grantWelcomeBonus(uid) {
  if (!sb || !uid) return;

  // ── ตรวจ localStorage ก่อน (ป้องกัน re-trigger ใน session เดิม) ──
  const localKey = WELCOME_BONUS_KEY + '_' + uid;
  if (localStorage.getItem(localKey)) return;

  try {
    // ── ตรวจว่ามี row ใน user_tokens แล้วหรือยัง ──
    const { data: existing, error: fetchErr } = await sb
      .from('user_tokens')
      .select('balance, total_purchased, welcome_bonus_given')
      .eq('user_id', uid)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    // ── ถ้ามี row แล้ว และ welcome_bonus_given = true → ข้ามทันที ──
    if (existing && existing.welcome_bonus_given) {
      localStorage.setItem(localKey, '1');
      return;
    }

    if (!existing) {
      // ── User ใหม่: INSERT row พร้อม bonus ──
      const { error: insErr } = await sb.from('user_tokens').insert({
        user_id:             uid,
        balance:             WELCOME_BONUS_TOKENS,
        total_purchased:     WELCOME_BONUS_TOKENS,
        total_used:          0,
        welcome_bonus_given: true,
        created_at:          new Date().toISOString()
      });
      if (insErr) throw insErr;
    } else {
      // ── User เก่า (มี row แต่ยังไม่ได้รับ bonus): UPDATE ──
      const { error: updErr } = await sb.from('user_tokens').update({
        balance:             (existing.balance || 0) + WELCOME_BONUS_TOKENS,
        total_purchased:     (existing.total_purchased || 0) + WELCOME_BONUS_TOKENS,
        welcome_bonus_given: true
      }).eq('user_id', uid);
      if (updErr) throw updErr;
    }

    // ── บันทึก token_orders เพื่อ audit log ──
    await sb.from('token_orders').insert({
      user_id:          uid,
      package_id:       'welcome_bonus',
      tokens_requested: WELCOME_BONUS_TOKENS,
      price_paid:       0,
      status:           'ยืนยันแล้ว',
      admin_note:       '🎁 Welcome Bonus — Login ครั้งแรก',
      processed_at:     new Date().toISOString(),
      created_at:       new Date().toISOString()
    }).then(() => {}); // fire-and-forget; ไม่ block UX

    // ── อัปเดต in-memory balance ──
    _tokenBalance = (existing?.balance || 0) + WELCOME_BONUS_TOKENS;

    // ── Mark ใน localStorage ──
    localStorage.setItem(localKey, '1');

    // ── แสดง toast แจ้ง User ──
    setTimeout(() => {
      toast(`🎁 ยินดีต้อนรับ! คุณได้รับ ${WELCOME_BONUS_TOKENS} Token ฟรีสำหรับการลงประกาศครั้งแรก`, 'success');
    }, 800);

  } catch(e) {
    console.warn('[WelcomeBonus] error:', e.message);
  }
}

// ── โหลด Token Packages (สำหรับหน้าซื้อ Token) ─────────────
async function loadTokenPackages() {
  if (!sb) return;
  try {
    const { data } = await sb
      .from('token_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    _tokenPackages = data || [];
  } catch(e) {
    // fallback packages
    _tokenPackages = [
      { id:'pkg1', name:'แพ็ก Starter',  tokens:3,  price:199, bonus:0, description:'ลงประกาศได้ 3 รายการ' },
      { id:'pkg2', name:'แพ็ก Standard', tokens:5,  price:299, bonus:0, description:'ยอดนิยม! ลงประกาศได้ 5 รายการ' },
      { id:'pkg3', name:'แพ็ก Pro',      tokens:10, price:499, bonus:1, description:'10+1 Token โบนัส ประหยัดสูงสุด' },
    ];
  }
}

// ── เปิด Modal ลงประกาศ (User Listing) ─────────────────────
async function openUserListingModal() {
  if (!user && !window._maDevBypass) { _openModal('login-modal'); return; }
  if (!window._maDevBypass) await loadUserTokenData();
  if (_tokenBalance < 1) {
    openBuyTokenModal();
    return;
  }
  // ── reset form state ──
  window._ulNearbyList = [];
  // inject modal if not already
  _injectUserListingModal();
  _openModal('user-listing-modal');
}

// ── เปิด Modal ซื้อ Token ──────────────────────────────────
async function openBuyTokenModal() {
  if (!user) { _openModal('login-modal'); return; }
  await loadTokenPackages();
  const pkgHtml = _tokenPackages.map(pkg => `
    <div class="tok-pkg" onclick="_selectTokenPkg(this,'${pkg.id}','${pkg.tokens+(pkg.bonus||0)}','${pkg.price}')"
         data-id="${pkg.id}" data-tokens="${pkg.tokens+(pkg.bonus||0)}" data-price="${pkg.price}"
         style="border:2px solid var(--bd);border-radius:14px;padding:18px;cursor:pointer;transition:.2s;position:relative">
      ${pkg.tokens>=10?'<div style="position:absolute;top:-10px;right:14px;background:#e67e22;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">⭐ คุ้มสุด</div>':''}
      <div style="font-size:15px;font-weight:800;color:var(--p);margin-bottom:4px">${pkg.name}</div>
      <div style="font-size:28px;font-weight:900;color:var(--p);margin:8px 0">
        <i class="fas fa-coins" style="color:#f1c40f;font-size:20px"></i> ${pkg.tokens+(pkg.bonus||0)} Token
        ${pkg.bonus?`<span style="font-size:13px;color:#2ecc71;font-weight:700"> +${pkg.bonus} โบนัส</span>`:''}
      </div>
      <div style="font-size:22px;font-weight:800;color:#c8922a">฿${Number(pkg.price).toLocaleString()}</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:6px">${pkg.description||''}</div>
      <div style="font-size:11px;color:rgba(0,0,0,.35);margin-top:8px">${(pkg.price/(pkg.tokens+(pkg.bonus||0))).toFixed(0)} บาท/Token</div>
    </div>
  `).join('');

  // สร้าง Modal ถ้ายังไม่มี
  let m = document.getElementById('buy-token-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'buy-token-modal';
    m.className = 'ov';
    m.onclick = function(e){ if(e.target===this) _closeModal('buy-token-modal'); };
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div class="modal" style="max-width:580px">
      <div class="mhd">
        <h2><i class="fas fa-coins" style="color:#f1c40f"></i> ซื้อ Token ลงประกาศ</h2>
        <span class="mclose" onclick="_closeModal('buy-token-modal')">×</span>
      </div>
      <div class="mbody">
        <div style="background:rgba(27,58,107,.07);border-radius:12px;padding:14px;margin-bottom:20px;text-align:center">
          <div style="font-size:13px;color:var(--tx2);margin-bottom:4px">Token คงเหลือของคุณ</div>
          <div style="font-size:32px;font-weight:900;color:var(--p)">
            <i class="fas fa-coins" style="color:#f1c40f"></i> ${_tokenBalance} Token
          </div>
          <div style="font-size:12px;color:var(--tx2);margin-top:4px">1 Token = ลงประกาศได้ 1 รายการ (มีอายุ 90 วัน)</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px">
          ${pkgHtml}
        </div>
        <div id="tok-selected-info" style="display:none;background:var(--lt);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="font-weight:700;color:var(--p);margin-bottom:12px"><i class="fas fa-check-circle" style="color:#2ecc71"></i> แพ็กที่เลือก: <span id="tok-sel-name">—</span></div>
          <div style="font-size:13px;margin-bottom:10px">ราคา: <strong style="color:#c8922a" id="tok-sel-price">—</strong></div>
          <div style="font-size:12px;color:var(--tx2);margin-bottom:14px">
            <strong>วิธีชำระเงิน:</strong> โอนเงินผ่าน PromptPay / บัญชีธนาคาร แล้วแนบสลิปด้านล่าง<br>
            PromptPay: <strong style="color:var(--p)">081-234-5678 (บริษัท แมทช์ดอร์ จำกัด)</strong>
          </div>
          <label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">แนบสลิปการโอนเงิน *</label>
          <input type="file" id="tok-slip-file" accept="image/*" style="font-size:12px;width:100%">
          <div style="margin-top:4px;font-size:11px;color:var(--tx2)">รองรับ JPG, PNG ขนาดไม่เกิน 5MB</div>
        </div>
        <button id="tok-submit-btn" onclick="submitTokenOrder()" disabled
          style="width:100%;padding:14px;background:linear-gradient(135deg,var(--p),#2a5298);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;opacity:.5;transition:.2s">
          <i class="fas fa-paper-plane"></i> ส่งคำสั่งซื้อ (รอ Admin ยืนยัน)
        </button>
        <p style="text-align:center;font-size:11px;color:var(--tx2);margin-top:10px">
          Admin จะยืนยันและเติม Token ภายใน 1-24 ชั่วโมง
        </p>
      </div>
    </div>`;
  _openModal('buy-token-modal');
}

let _selPkgId = null, _selPkgTokens = 0, _selPkgPrice = 0;
function _selectTokenPkg(el, pkgId, tokens, price) {
  document.querySelectorAll('.tok-pkg').forEach(p => {
    p.style.borderColor = 'var(--bd)';
    p.style.background  = '';
  });
  el.style.borderColor = 'var(--p)';
  el.style.background  = 'rgba(27,58,107,.07)';
  _selPkgId     = pkgId;
  _selPkgTokens = parseInt(tokens);
  _selPkgPrice  = parseFloat(price);
  const pkg = _tokenPackages.find(p => p.id === pkgId);
  const info = document.getElementById('tok-selected-info');
  const btn  = document.getElementById('tok-submit-btn');
  if (info) {
    info.style.display = 'block';
    document.getElementById('tok-sel-name').textContent  = pkg?.name || '';
    document.getElementById('tok-sel-price').textContent = '฿' + Number(_selPkgPrice).toLocaleString();
  }
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
}

async function submitTokenOrder() {
  if (!user || !sb) return;
  if (!_selPkgId) { toast('กรุณาเลือกแพ็กเกจก่อน', 'warn'); return; }
  const slipFile = document.getElementById('tok-slip-file')?.files?.[0];
  if (!slipFile) { toast('กรุณาแนบสลิปการโอนเงิน', 'warn'); return; }
  const btn = document.getElementById('tok-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...'; }
  try {
    // อัปโหลดสลิปไป Storage
    const ext  = slipFile.name.split('.').pop();
    const path = `token-slips/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('matchdoor-assets').upload(path, slipFile, { upsert: true });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = sb.storage.from('matchdoor-assets').getPublicUrl(path);

    // บันทึก order
    const { error: ordErr } = await sb.from('token_orders').insert({
      user_id:           user.id,
      package_id:        _selPkgId,
      tokens_requested:  _selPkgTokens,
      price_paid:        _selPkgPrice,
      payment_method:    'PromptPay',
      slip_url:          publicUrl,
      status:            'รอยืนยัน'
    });
    if (ordErr) throw ordErr;

    _closeModal('buy-token-modal');
    toast('✅ ส่งคำสั่งซื้อสำเร็จ! Admin จะยืนยันและเติม Token ภายใน 24 ชั่วโมง', 'success');
    await loadUserTokenData();
    // รีเฟรช tab listings ถ้ากำลังดูอยู่
    const listingPanel = document.getElementById('ma-panel-listings');
    if (listingPanel?.classList.contains('active')) renderMaListingsPanel();

  } catch(e) {
    toast('เกิดข้อผิดพลาด: ' + (e.message || 'ไม่ทราบสาเหตุ'), 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ส่งคำสั่งซื้อ (รอ Admin ยืนยัน)'; }
  }
}

// ── Submit User Listing Form ────────────────────────────────
async function submitUserListing() {
  const isDev = window._maDevBypass && !user;
  if (!isDev && (!user || !sb)) return;

  const get = id => document.getElementById(id);
  const val = id => (get(id)?.value||'').trim();
  const num = id => parseFloat(val(id).replace(/,/g,''))||0;
  const int = id => parseInt(val(id))||0;

  // ── Validate ──
  const title = val('ul-title');
  const type  = val('ul-type');
  const phone = val('ul-phone');
  const errEl = get('ul-error');
  const showErr = msg => { if(errEl){ errEl.textContent=msg; errEl.style.display='block'; errEl.scrollIntoView({behavior:'smooth',block:'nearest'}); } };
  if(errEl) errEl.style.display='none';
  if (!title) { showErr('กรุณากรอกชื่อทรัพย์'); return; }
  if (!type)  { showErr('กรุณาเลือกประเภทอสังหาฯ'); return; }
  if (!phone) { showErr('กรุณากรอกเบอร์ติดต่อ'); return; }

  const btn = get('ul-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...'; }

  try {
    // ── Collect checkboxes ──
    const appliances  = Array.from(document.querySelectorAll('input[name="ul-appliance"]:checked')).map(c=>c.value);
    const amenities   = Array.from(document.querySelectorAll('input[name="ul-amenity"]:checked')).map(c=>c.value);
    const nearby      = window._ulNearbyList ? [...window._ulNearbyList] : [];
    const tx          = val('ul-transaction') || 'BUY';
    const isRent      = tx === 'RENT';

    // ── อัปโหลดรูปภาพ (ถ้ามี) ──
    let photoUrls = [];
    if (!isDev) {
      const photoInput = get('ul-photos');
      if (photoInput?.files?.length) {
        for (const file of Array.from(photoInput.files).slice(0, 10)) {
          const ext  = file.name.split('.').pop().toLowerCase();
          const path = `listings/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await sb.storage.from('matchdoor-assets').upload(path, file, { upsert: true });
          if (!upErr) {
            const { data: { publicUrl } } = sb.storage.from('matchdoor-assets').getPublicUrl(path);
            photoUrls.push(publicUrl);
          }
        }
      }
    }

    const listingData = {
      // ── Core ──
      user_id:           isDev ? 'dev-user' : user.id,
      title,
      property_type:     type,
      transaction:       tx,
      price:             num('ul-price'),
      // ── Size ──
      area:              num('ul-area'),
      land_area:         num('ul-land-area'),
      bed:               int('ul-bed'),
      bath:              int('ul-bath'),
      floors:            int('ul-floors'),
      floor_no:          int('ul-floor'),
      parking:           int('ul-parking'),
      // ── Features ──
      furniture:         val('ul-furniture'),
      pets_allowed:      get('ul-pets')?.checked || false,
      appliances:        appliances,
      amenities:         amenities,
      description:       val('ul-description'),
      // ── Location ──
      province:          val('ul-province'),
      district:          val('ul-district'),
      location:          val('ul-location'),
      near_bts:          val('ul-near-bts'),
      nearby_places:     nearby.length ? nearby : null,
      // ── Rent extras ──
      deposit:           isRent ? (num('ul-deposit') || null) : null,
      advance_payment:   isRent ? (num('ul-advance') || null) : null,
      service_fee:       isRent ? (num('ul-svc-fee') || null) : null,
      electric_rate:     isRent ? (num('ul-elec') || null) : null,
      water_rate:        isRent ? (num('ul-water') || null) : null,
      min_lease_months:  isRent ? (int('ul-min-lease') || null) : null,
      // ── Contact ──
      contact_name:      val('ul-contact-name') || (isDev ? 'Dev User' : (user.user_metadata?.display_name || '')),
      contact_phone:     phone,
      contact_line:      val('ul-contact-line'),
      photos:            photoUrls,
      status:            'รอตรวจสอบ'
    };

    // ── DEV MODE: จำลองการส่งโดยไม่เขียน DB ──
    if (isDev) {
      await new Promise(r => setTimeout(r, 700));
      _tokenBalance = Math.max(0, _tokenBalance - 1);
      const mockListing = { id: 'dev-' + Date.now(), ...listingData, created_at: new Date().toISOString(), admin_note: '' };
      _myUserListings.unshift(mockListing);
      _closeModal('user-listing-modal');
      window._ulNearbyList = [];
      toast('✅ [DEV] จำลองลงประกาศสำเร็จ! (ไม่ได้บันทึกจริง)', 'success');
      renderMaListingsPanel();
      return;
    }

    // ── Real Supabase insert ──
    const { error } = await sb.from('user_listings').insert(listingData);
    if (error) {
      if (error.message.includes('insufficient_tokens')) {
        showErr('Token ไม่เพียงพอ กรุณาซื้อ Token เพิ่ม');
        setTimeout(() => { _closeModal('user-listing-modal'); openBuyTokenModal(); }, 1200);
        return;
      }
      throw error;
    }

    window._ulNearbyList = [];
    _closeModal('user-listing-modal');
    toast('✅ ลงประกาศสำเร็จ! รอ Admin ตรวจสอบและอนุมัติ (ภายใน 24 ชั่วโมง)', 'success');
    await loadUserTokenData();
    renderMaListingsPanel();

  } catch(e) {
    const errEl2 = document.getElementById('ul-error');
    if(errEl2){ errEl2.textContent = 'เกิดข้อผิดพลาด: ' + (e.message||'ไม่ทราบสาเหตุ'); errEl2.style.display='block'; }
    else toast('เกิดข้อผิดพลาด: ' + (e.message || 'ไม่ทราบสาเหตุ'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ลงประกาศ (หัก 1 Token)'; }
  }
}

// ── Render Tab "ประกาศของฉัน" ───────────────────────────────
async function renderMaListingsPanel() {
  const panel = document.getElementById('ma-panel-listings');
  if (!panel) return;
  // ── Dev mode: ใช้ mock Token ที่ set ไว้แล้ว ไม่ต้อง query DB ──
  if (!window._maDevBypass) await loadUserTokenData();

  const statusBadge = s => {
    const map = {
      'รอตรวจสอบ': ['#f39c12','fa-clock','รอตรวจสอบ'],
      'อนุมัติ':    ['#2ecc71','fa-check-circle','อนุมัติแล้ว'],
      'ปฏิเสธ':    ['#e74c3c','fa-times-circle','ปฏิเสธ'],
      'ปิด':        ['#95a5a6','fa-ban','ปิดแล้ว'],
      'หมดอายุ':   ['#7f8c8d','fa-hourglass-end','หมดอายุ'],
    };
    const [c,ic,lb] = map[s] || ['#bbb','fa-circle',s];
    return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px"><i class="fas ${ic}" style="font-size:9px"></i>${lb}</span>`;
  };

  const listingsHtml = _myUserListings.length
    ? _myUserListings.map(ul => {
        const photo = (ul.photos||[])[0]||'';
        const priceStr = ul.price >= 1e6 ? (ul.price/1e6).toFixed(1)+'M' : (ul.price||0).toLocaleString();
        const txLabel = ul.transaction === 'RENT' ? 'ให้เช่า' : 'ขาย';
        const exp = ul.expires_at ? new Date(ul.expires_at).toLocaleDateString('th-TH') : '';
        return `<div style="border:1.5px solid var(--bd);border-radius:14px;overflow:hidden;display:grid;grid-template-columns:110px 1fr;gap:0;margin-bottom:12px">
          <div style="background:var(--lt);display:flex;align-items:center;justify-content:center;min-height:100px">
            ${photo ? `<img src="${photo}" style="width:110px;height:100%;min-height:100px;object-fit:cover;display:block">` : '<i class="fas fa-home" style="font-size:28px;color:var(--tx2)"></i>'}
          </div>
          <div style="padding:14px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
              <div style="font-weight:700;color:var(--p);font-size:14px;line-height:1.3">${sanitize(ul.title)}</div>
              ${statusBadge(ul.status)}
            </div>
            <div style="font-size:12px;color:var(--tx2);margin-bottom:4px">
              <i class="fas fa-tag" style="color:#c8922a"></i> ${sanitize(ul.property_type)} · ${txLabel} · ฿${priceStr}
            </div>
            <div style="font-size:12px;color:var(--tx2);margin-bottom:4px">
              <i class="fas fa-map-marker-alt"></i> ${sanitize(ul.province||'')} ${sanitize(ul.location||'')}
            </div>
            ${ul.admin_note ? `<div style="font-size:11px;color:#e74c3c;margin-top:4px;padding:6px 10px;background:#e74c3c11;border-radius:6px"><i class="fas fa-comment"></i> ${sanitize(ul.admin_note)}</div>` : ''}
            <div style="font-size:11px;color:rgba(0,0,0,.4);margin-top:8px">
              ลงวันที่: ${new Date(ul.created_at).toLocaleDateString('th-TH')}
              ${exp ? ` · หมดอายุ: ${exp}` : ''}
            </div>
            ${ul.status === 'อนุมัติ' && ul.property_id ? `<button onclick="openModal('${ul.property_id}')" style="margin-top:8px;font-size:11px;padding:5px 12px;background:var(--p);color:#fff;border:none;border-radius:8px;cursor:pointer"><i class="fas fa-eye"></i> ดูประกาศ</button>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<div style="text-align:center;padding:40px 20px;color:var(--tx2)">
        <i class="fas fa-building" style="font-size:36px;opacity:.3;margin-bottom:12px"></i>
        <p style="margin-bottom:16px">ยังไม่มีประกาศ กด "ลงประกาศ" เพื่อเริ่มต้น</p>
      </div>`;

  // ประวัติออเดอร์ซื้อ Token
  const ordersHtml = _myTokenOrders.length
    ? `<div style="margin-top:20px">
        <div style="font-weight:700;color:var(--p);font-size:13px;margin-bottom:10px"><i class="fas fa-receipt"></i> ประวัติการซื้อ Token</div>
        ${_myTokenOrders.slice(0,5).map(o => {
          const stMap = {'รอยืนยัน':['#f39c12','fa-clock'],'ยืนยันแล้ว':['#2ecc71','fa-check'],'ปฏิเสธ':['#e74c3c','fa-times']};
          const [sc,sic] = stMap[o.status]||['#bbb','fa-circle'];
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;font-size:12px">
            <div>
              <strong>${o.tokens_requested} Token</strong> · ฿${Number(o.price_paid).toLocaleString()}
              <span style="font-size:11px;color:var(--tx2);margin-left:8px">${new Date(o.created_at).toLocaleDateString('th-TH')}</span>
            </div>
            <span style="color:${sc};font-size:11px;font-weight:700"><i class="fas ${sic}"></i> ${o.status}</span>
          </div>`;
        }).join('')}
      </div>` : '';

  panel.innerHTML = `
    <div class="ma-section">
      <!-- Token Balance Bar -->
      <div style="background:linear-gradient(135deg,var(--p),#2a5298);border-radius:14px;padding:18px;margin-bottom:16px;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:12px;opacity:.7;margin-bottom:4px">Token คงเหลือ</div>
          <div style="font-size:32px;font-weight:900"><i class="fas fa-coins" style="color:#f1c40f"></i> ${_tokenBalance} Token</div>
          <div style="font-size:11px;opacity:.6;margin-top:4px">1 Token = ลงประกาศได้ 1 รายการ (90 วัน)</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="openBuyTokenModal()" style="background:#fff;color:var(--p);border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
            <i class="fas fa-plus-circle" style="color:#f39c12"></i> เติม Token
          </button>
          <button onclick="openUserListingModal()" ${_tokenBalance<1?'disabled style="opacity:.5;cursor:not-allowed"':''} 
            style="background:rgba(255,255,255,.15);color:#fff;border:2px solid rgba(255,255,255,.35);border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
            <i class="fas fa-plus"></i> ลงประกาศ ${_tokenBalance<1?'(Token ไม่พอ)':''}
          </button>
        </div>
      </div>
      <!-- ประกาศของฉัน -->
      <div style="font-weight:700;color:var(--p);font-size:14px;margin-bottom:12px">
        <i class="fas fa-building"></i> ประกาศของฉัน (${_myUserListings.length})
      </div>
      ${listingsHtml}
      ${ordersHtml}
    </div>`;
}

// ══════════════════════════════════════════════════════════════
//  MODAL HTML: User Listing Form — Full Version (เชื่อมโยงกับ propCard + openModal)
// ══════════════════════════════════════════════════════════════
function _injectUserListingModal() {
  if (document.getElementById('user-listing-modal')) return;
  const m = document.createElement('div');
  m.id = 'user-listing-modal';
  m.className = 'ov';
  m.onclick = function(e){ if(e.target===this) _closeModal('user-listing-modal'); };
  m.innerHTML = `
    <div class="modal" style="max-width:680px;max-height:92vh;overflow-y:auto;border-radius:18px">
      <div class="mhd" style="position:sticky;top:0;z-index:10;background:#fff;border-bottom:1.5px solid var(--lt)">
        <h2 style="display:flex;align-items:center;gap:8px"><i class="fas fa-home" style="color:var(--p)"></i> ลงประกาศขาย/เช่า</h2>
        <span class="mclose" onclick="_closeModal('user-listing-modal')">×</span>
      </div>
      <div class="mbody" style="padding:20px">

        <!-- Token notice -->
        <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #f1c40f88;border-radius:12px;padding:12px 16px;margin-bottom:22px;font-size:12px;color:#856404;display:flex;align-items:center;gap:10px">
          <i class="fas fa-coins" style="color:#f39c12;font-size:20px;flex-shrink:0"></i>
          <div>การลงประกาศจะหัก <strong>1 Token</strong> อัตโนมัติ · หลัง Admin อนุมัติ ประกาศจะแสดงบนเว็บ <strong>90 วัน</strong> · Token คงเหลือ: <strong id="ul-token-display" style="color:var(--p)">${_tokenBalance} Token</strong></div>
        </div>

        <!-- ── Section 1: ข้อมูลทรัพย์ ── -->
        <div class="ul-sec-hd"><i class="fas fa-building"></i> ข้อมูลทรัพย์</div>

        <div class="ma-field">
          <label>ชื่อประกาศ / ชื่อทรัพย์ <span style="color:#e05">*</span></label>
          <input type="text" id="ul-title" placeholder="เช่น คอนโด Ashton Asoke 2 Bed ใกล้ BTS อโศก" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="ma-field" style="margin:0">
            <label>ประเภทอสังหาฯ <span style="color:#e05">*</span></label>
            <select id="ul-type" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
              <option value="">-- เลือก --</option>
              <option value="คอนโด">🏙️ คอนโด</option>
              <option value="บ้านเดี่ยว">🏠 บ้านเดี่ยว</option>
              <option value="ทาวน์โฮม">🏘️ ทาวน์โฮม</option>
              <option value="ที่ดิน">🗺️ ที่ดิน</option>
              <option value="อาคารพาณิชย์">🏪 อาคารพาณิชย์</option>
              <option value="วิลล่า">🏖️ วิลล่า</option>
              <option value="รีสอร์ท">🏨 รีสอร์ท</option>
            </select>
          </div>
          <div class="ma-field" style="margin:0">
            <label>ประเภทธุรกรรม</label>
            <select id="ul-transaction" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px" onchange="_ulToggleRentFields()">
              <option value="BUY">🏷️ ขาย</option>
              <option value="RENT">🔑 ให้เช่า</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="ma-field" style="margin:0">
            <label>ราคา (บาท) <span style="color:#e05">*</span></label>
            <input type="number" id="ul-price" placeholder="3500000" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>พื้นที่ใช้สอย (ตร.ม.)</label>
            <input type="number" id="ul-area" placeholder="65" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>ที่ดิน (ตร.วา)</label>
            <input type="number" id="ul-land-area" placeholder="50" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="ma-field" style="margin:0">
            <label>ห้องนอน</label>
            <input type="number" id="ul-bed" placeholder="2" min="0" max="20" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>ห้องน้ำ</label>
            <input type="number" id="ul-bath" placeholder="1" min="0" max="20" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>จำนวนชั้น</label>
            <input type="number" id="ul-floors" placeholder="20" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>ชั้นที่ตั้ง</label>
            <input type="number" id="ul-floor" placeholder="5" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>ที่จอดรถ</label>
            <input type="number" id="ul-parking" placeholder="1" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="ma-field" style="margin:0">
            <label>เฟอร์นิเจอร์</label>
            <select id="ul-furniture" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
              <option value="">ไม่ระบุ</option>
              <option value="full">🛋️ ครบ (Full Furnished)</option>
              <option value="partial">🪑 บางส่วน (Partial)</option>
              <option value="none">📦 ไม่มีเฟอร์นิเจอร์</option>
            </select>
          </div>
          <div class="ma-field" style="margin:0;display:flex;align-items:center;gap:10px;padding-top:20px">
            <input type="checkbox" id="ul-pets" style="width:16px;height:16px;cursor:pointer">
            <label for="ul-pets" style="cursor:pointer;font-size:13px">🐾 อนุญาตให้เลี้ยงสัตว์</label>
          </div>
        </div>

        <!-- Appliances checkboxes -->
        <div class="ma-field">
          <label>เครื่องใช้ไฟฟ้า / สิ่งอำนวยความสะดวกในห้อง</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px" id="ul-appliances-wrap">
            ${['แอร์','ตู้เย็น','เครื่องซักผ้า','ไมโครเวฟ','เตาไฟฟ้า','โทรทัศน์','เครื่องทำน้ำอุ่น','ระบบรักษาความปลอดภัย'].map(a=>`
              <label style="display:flex;align-items:center;gap:5px;background:var(--lt);padding:6px 12px;border-radius:20px;cursor:pointer;font-size:12px;border:1.5px solid transparent;transition:.15s" class="ul-chip-label">
                <input type="checkbox" name="ul-appliance" value="${a}" style="width:13px;height:13px"> ${a}
              </label>`).join('')}
          </div>
        </div>

        <!-- Amenities -->
        <div class="ma-field">
          <label>สิ่งอำนวยความสะดวกส่วนกลาง</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px" id="ul-amenities-wrap">
            ${['สระว่ายน้ำ','ฟิตเนส','ลิฟต์','ห้องซาวน่า','ห้องประชุม','Co-Working Space','ร้านสะดวกซื้อ','รักษาความปลอดภัย 24 ชม.','ที่จอดรถใต้ดิน','สวนหย่อม'].map(a=>`
              <label style="display:flex;align-items:center;gap:5px;background:var(--lt);padding:6px 12px;border-radius:20px;cursor:pointer;font-size:12px;border:1.5px solid transparent;transition:.15s" class="ul-chip-label">
                <input type="checkbox" name="ul-amenity" value="${a}" style="width:13px;height:13px"> ${a}
              </label>`).join('')}
          </div>
        </div>

        <div class="ma-field">
          <label>รายละเอียดเพิ่มเติม</label>
          <textarea id="ul-description" rows="3" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box" placeholder="รายละเอียดทรัพย์, สิ่งอำนวยความสะดวก, เงื่อนไขพิเศษ, จุดเด่น..."></textarea>
        </div>

        <!-- ── Section 2: ค่าใช้จ่าย (เช่า) ── -->
        <div id="ul-rent-section" style="display:none">
          <div class="ul-sec-hd"><i class="fas fa-receipt"></i> รายละเอียดค่าใช้จ่าย (สำหรับให้เช่า)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="ma-field" style="margin:0">
              <label>เงินประกัน (บาท)</label>
              <input type="number" id="ul-deposit" placeholder="2 เดือน = 70000" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
            <div class="ma-field" style="margin:0">
              <label>ล่วงหน้า (บาท)</label>
              <input type="number" id="ul-advance" placeholder="35000" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
            <div class="ma-field" style="margin:0">
              <label>ค่าส่วนกลาง/เดือน (บาท)</label>
              <input type="number" id="ul-svc-fee" placeholder="1500" min="0" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="ma-field" style="margin:0">
              <label>ค่าไฟ (บาท/หน่วย)</label>
              <input type="number" id="ul-elec" placeholder="6" min="0" step="0.01" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
            <div class="ma-field" style="margin:0">
              <label>ค่าน้ำ (บาท/หน่วย)</label>
              <input type="number" id="ul-water" placeholder="18" min="0" step="0.01" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
            <div class="ma-field" style="margin:0">
              <label>ระยะเช่าขั้นต่ำ (เดือน)</label>
              <input type="number" id="ul-min-lease" placeholder="12" min="1" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
            </div>
          </div>
        </div>

        <!-- ── Section 3: ที่ตั้ง ── -->
        <div class="ul-sec-hd"><i class="fas fa-map-marker-alt"></i> ที่ตั้ง</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="ma-field" style="margin:0">
            <label>จังหวัด</label>
            <input type="text" id="ul-province" placeholder="กรุงเทพมหานคร" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>ย่าน / แขวง / อำเภอ</label>
            <input type="text" id="ul-district" placeholder="สุขุมวิท" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="ma-field" style="margin:0">
            <label>ที่อยู่ / ซอย / โครงการ</label>
            <input type="text" id="ul-location" placeholder="เช่น ซอยสุขุมวิท 24" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>BTS/MRT ที่ใกล้ที่สุด</label>
            <input type="text" id="ul-near-bts" placeholder="BTS อโศก (500ม.)" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
        </div>

        <!-- Nearby places -->
        <div class="ma-field">
          <label>สถานที่ใกล้เคียง (เพิ่มทีละแห่ง กด Enter)</label>
          <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" id="ul-nearby-input" placeholder="เช่น Central World (1.2 กม.)" style="flex:1;padding:9px 12px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px" onkeydown="if(event.key==='Enter'){event.preventDefault();_ulAddNearby()}">
            <button type="button" onclick="_ulAddNearby()" style="padding:9px 14px;background:var(--p);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;white-space:nowrap"><i class="fas fa-plus"></i></button>
          </div>
          <div id="ul-nearby-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
          <div id="ul-nearby-hidden"></div>
        </div>

        <!-- ── Section: รับตัวแทน ── -->
        <div class="ul-sec-hd"><i class="fas fa-user-tie"></i> รับตัวแทน <span style="font-size:11px;font-weight:400;color:var(--tx2);margin-left:4px">(เพิ่มโอกาสปิดการขายได้ไวขึ้น)</span></div>

        <div id="ul-agent-toggle-wrap" style="margin-bottom:14px">
          <!-- Toggle switch -->
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:10px">
            <div style="position:relative;width:42px;height:24px;flex-shrink:0">
              <input type="checkbox" id="ul-want-agent" onchange="_ulToggleAgentSection(this)" style="opacity:0;width:0;height:0;position:absolute">
              <span id="ul-agent-track" style="position:absolute;inset:0;background:#ccc;border-radius:12px;transition:.25s;cursor:pointer"></span>
              <span id="ul-agent-thumb" style="position:absolute;top:3px;left:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.25)"></span>
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--tx)">ต้องการให้ตัวแทนช่วยขาย/เช่า</span>
          </label>

          <!-- Agent cards slider (hidden by default) -->
          <div id="ul-agent-slider-wrap" style="display:none">
            <p style="font-size:12px;color:var(--tx2);margin:0 0 10px">เลือกตัวแทนที่ต้องการ (เลือกได้มากกว่า 1)</p>
            <div id="ul-agent-cards" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch">
              <!-- Cards injected by _ulRenderAgentCards() -->
            </div>
          </div>
        </div>

        <!-- ── Section 4: รูปภาพ ── -->
        <div class="ul-sec-hd"><i class="fas fa-images"></i> รูปภาพ (สูงสุด 10 รูป)</div>

        <label id="ul-photo-dropzone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed var(--bd);border-radius:12px;padding:24px;cursor:pointer;background:var(--lt);transition:.2s;min-height:100px;margin-bottom:10px" for="ul-photos" onmouseover="this.style.borderColor='var(--a)'" onmouseout="this.style.borderColor='var(--bd)'">
          <i class="fas fa-cloud-upload-alt" style="font-size:28px;color:var(--p);margin-bottom:8px"></i>
          <div style="font-size:13px;font-weight:600;color:var(--p)">คลิกหรือลากรูปมาวางที่นี่</div>
          <div style="font-size:11px;color:var(--tx2);margin-top:4px">JPG, PNG, WEBP · แนะนำรูปแรกเป็นรูปหน้าปก · สูงสุด 10 รูป</div>
        </label>
        <input type="file" id="ul-photos" accept="image/*" multiple style="display:none" onchange="_ulPreviewPhotos(this)">
        <div id="ul-photo-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>

        <!-- ── Section 5: ช่องทางติดต่อ ── -->
        <div class="ul-sec-hd"><i class="fas fa-phone"></i> ช่องทางติดต่อ</div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:8px">
          <div class="ma-field" style="margin:0">
            <label>ชื่อผู้ติดต่อ</label>
            <input type="text" id="ul-contact-name" placeholder="คุณสมชาย" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>เบอร์โทร <span style="color:#e05">*</span></label>
            <input type="tel" id="ul-phone" placeholder="081-234-5678" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div class="ma-field" style="margin:0">
            <label>LINE ID</label>
            <input type="text" id="ul-contact-line" placeholder="@yourline" style="width:100%;padding:10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
        </div>

        <!-- Error message -->
        <div id="ul-error" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:10px"></div>

        <!-- Submit -->
        <button id="ul-submit-btn" onclick="submitUserListing()"
          style="width:100%;padding:16px;background:linear-gradient(135deg,var(--p),#2a5298);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 14px rgba(27,58,107,.3)">
          <i class="fas fa-paper-plane"></i> ลงประกาศ (หัก 1 Token)
        </button>
        <p style="text-align:center;font-size:11px;color:var(--tx2);margin-top:8px">
          Token คงเหลือ: <strong id="ul-token-foot" style="color:var(--p)">${_tokenBalance} Token</strong> · ระบบจะหัก Token หลัง Admin อนุมัติประกาศ
        </p>
      </div>
    </div>`;
  document.body.appendChild(m);

  // ── Chip styling on hover/check ──
  m.querySelectorAll('.ul-chip-label').forEach(lbl => {
    const cb = lbl.querySelector('input[type=checkbox]');
    cb.addEventListener('change', () => {
      lbl.style.borderColor  = cb.checked ? 'var(--p)' : 'transparent';
      lbl.style.background   = cb.checked ? 'rgba(27,58,107,.08)' : 'var(--lt)';
      lbl.style.fontWeight   = cb.checked ? '700' : '';
      lbl.style.color        = cb.checked ? 'var(--p)' : '';
    });
  });
}

// ── CSS for section headers ──
(function(){
  const st = document.createElement('style');
  st.textContent = `.ul-sec-hd{font-size:12px;font-weight:700;color:var(--p);margin:18px 0 10px;padding-bottom:6px;border-bottom:1.5px solid var(--lt);display:flex;align-items:center;gap:6px}`;
  document.head.appendChild(st);
})();

// ── Toggle เช่า/ขาย fields ──
function _ulToggleRentFields(){
  const tx = document.getElementById('ul-transaction')?.value;
  const sec = document.getElementById('ul-rent-section');
  if(sec) sec.style.display = tx === 'RENT' ? 'block' : 'none';
}

// ── Photo preview ──
function _ulPreviewPhotos(input){
  const wrap = document.getElementById('ul-photo-preview');
  const zone = document.getElementById('ul-photo-dropzone');
  if(!wrap) return;
  const files = Array.from(input.files).slice(0,10);
  wrap.innerHTML = '';
  files.forEach((f,i) => {
    const url = URL.createObjectURL(f);
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;width:90px;height:70px;border-radius:8px;overflow:hidden;border:1.5px solid var(--bd)';
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">
      ${i===0?'<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:9px;text-align:center;padding:2px">หน้าปก</div>':''}
      <button type="button" onclick="this.parentNode.remove()" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>`;
    wrap.appendChild(div);
  });
  if(zone && files.length) zone.style.borderColor = 'var(--p)';
}

// ── Agent toggle ──
function _ulToggleAgentSection(cb){
  const track = document.getElementById('ul-agent-track');
  const thumb = document.getElementById('ul-agent-thumb');
  const wrap  = document.getElementById('ul-agent-slider-wrap');
  if(cb.checked){
    if(track){ track.style.background='var(--p)'; }
    if(thumb){ thumb.style.transform='translateX(18px)'; }
    if(wrap){ wrap.style.display='block'; }
    _ulRenderAgentCards();
  } else {
    if(track){ track.style.background='#ccc'; }
    if(thumb){ thumb.style.transform='translateX(0)'; }
    if(wrap){ wrap.style.display='none'; }
  }
}

// ── Render agent cards slider ──
window._ulSelectedAgents = new Set();
function _ulRenderAgentCards(){
  const container = document.getElementById('ul-agent-cards');
  if(!container) return;
  // Use live agents array if available, else fallback placeholders
  const list = (typeof agents !== 'undefined' && agents && agents.length)
    ? agents.filter(a => a.is_active !== false).slice(0, 10)
    : [
        { id:'a1', name:'ทีม Matchdoor', title:'Senior Agent', rating:4.9, deals:120, photo_url:'' },
        { id:'a2', name:'พิมพ์ชนก', title:'Condo Specialist', rating:4.8, deals:87, photo_url:'' },
        { id:'a3', name:'ธนกร', title:'Property Consultant', rating:4.7, deals:64, photo_url:'' },
      ];
  container.innerHTML = list.map(a => {
    const initials = (a.name||'?').slice(0,2);
    const stars = '★'.repeat(Math.round(a.rating||5));
    const sel = window._ulSelectedAgents.has(String(a.id));
    return `<div id="ul-agcard-${a.id}" onclick="_ulToggleAgentCard('${a.id}')" style="flex:0 0 130px;border:2px solid ${sel?'var(--p)':'var(--bd)'};border-radius:12px;padding:12px 10px;text-align:center;cursor:pointer;background:${sel?'rgba(27,58,107,.07)':'var(--lt)'};transition:.18s;position:relative">
      ${sel?`<span style="position:absolute;top:6px;right:6px;background:var(--p);color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center"><i class="fas fa-check"></i></span>`:''}
      <div style="width:48px;height:48px;border-radius:50%;margin:0 auto 8px;overflow:hidden;background:linear-gradient(135deg,var(--p),#2a5298);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px">
        ${a.photo_url?`<img src="${a.photo_url}" style="width:100%;height:100%;object-fit:cover">`:`<span>${initials}</span>`}
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--tx);line-height:1.3;margin-bottom:2px">${a.name||''}</div>
      <div style="font-size:10px;color:var(--tx2);margin-bottom:4px">${a.title||'Agent'}</div>
      <div style="font-size:10px;color:#f5a623">${stars}</div>
      <div style="font-size:10px;color:var(--tx2);margin-top:2px">${a.deals||0} ดีล</div>
    </div>`;
  }).join('');
}
function _ulToggleAgentCard(id){
  const sid = String(id);
  if(window._ulSelectedAgents.has(sid)) window._ulSelectedAgents.delete(sid);
  else window._ulSelectedAgents.add(sid);
  _ulRenderAgentCards();
}

// ── Add nearby place chip ──
window._ulNearbyList = [];
function _ulAddNearby(){
  const inp = document.getElementById('ul-nearby-input');
  const val = inp?.value?.trim();
  if(!val) return;
  window._ulNearbyList.push(val);
  inp.value = '';
  _ulRenderNearbyChips();
}
function _ulRemoveNearby(idx){
  window._ulNearbyList.splice(idx,1);
  _ulRenderNearbyChips();
}
function _ulRenderNearbyChips(){
  const wrap = document.getElementById('ul-nearby-chips');
  if(!wrap) return;
  wrap.innerHTML = window._ulNearbyList.map((v,i)=>`
    <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(27,58,107,.08);border:1px solid rgba(27,58,107,.2);color:var(--p);padding:5px 10px;border-radius:20px;font-size:12px">
      <i class="fas fa-map-marker-alt" style="font-size:10px"></i> ${v}
      <button type="button" onclick="_ulRemoveNearby(${i})" style="background:none;border:none;cursor:pointer;color:#999;font-size:11px;padding:0;line-height:1"><i class="fas fa-times"></i></button>
    </span>`).join('');
}

// inject modal ทันทีที่โหลด script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _injectUserListingModal);
} else {
  _injectUserListingModal();
}


// ══════════════════════════════════════════════════════════════
//  ADMIN PANEL — ระบบ Token Orders + User Listings
//  ฟังก์ชันสำหรับ _renderAdminPanel()
// ══════════════════════════════════════════════════════════════

// ── Render Admin: Token Orders ─────────────────────────────
async function _renderAdminTokenOrders(el, devBanner) {
  let orders = [];
  if (!_adminDevMode && sb) {
    try {
      const { data } = await sb
        .from('token_orders')
        .select('*, user_profiles(display_name,phone), auth_users:user_id(email)')
        .order('created_at', { ascending: false })
        .range(0, 199);
      orders = data || [];
    } catch(e) {
      // ดึงแบบ simple ถ้า join ไม่ work
      try {
        const { data } = await sb.from('token_orders').select('*').order('created_at', { ascending: false }).range(0, 199);
        orders = data || [];
      } catch(e2) {}
    }
  }

  const badge = s => {
    const map = {'รอยืนยัน':['#f39c12','รอยืนยัน'],'ยืนยันแล้ว':['#2ecc71','ยืนยันแล้ว'],'ปฏิเสธ':['#e74c3c','ปฏิเสธ']};
    const [c,l] = map[s]||['#bbb',s];
    return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700">${l}</span>`;
  };

  el.innerHTML = devBanner + `
    <div class="admin-section">
      <div class="admin-section-head">
        <div class="admin-section-title"><i class="fas fa-coins" style="color:#f1c40f"></i> Token Orders — รออนุมัติ (${orders.filter(o=>o.status==='รอยืนยัน').length})</div>
        <button class="admin-btn admin-btn-ghost" style="font-size:11px;padding:5px 10px" onclick="adminNav('token-orders',null)"><i class="fas fa-sync"></i> Refresh</button>
      </div>
      <div class="admin-search-bar">
        <select class="admin-filter-select" id="tok-ord-filter" onchange="_adminFilterTokenOrders()" style="padding:8px;border-radius:8px">
          <option value="">ทุกสถานะ</option>
          <option value="รอยืนยัน">รอยืนยัน</option>
          <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
          <option value="ปฏิเสธ">ปฏิเสธ</option>
        </select>
      </div>
      <div id="admin-tok-orders-table">
        <table class="admin-table">
          <thead><tr>
            <th>#</th><th>User</th><th>Token</th><th>ราคา</th><th>สลิป</th><th>วันที่</th><th>สถานะ</th><th>Action</th>
          </tr></thead>
          <tbody id="admin-tok-orders-tbody">
            ${orders.map((o,i) => `<tr>
              <td style="color:rgba(255,255,255,.3);font-size:11px">${i+1}</td>
              <td style="font-size:12px">
                <div style="font-weight:600;color:#fff">${sanitize(o.user_profiles?.display_name || o.user_id?.slice(0,8)+'...' || '-')}</div>
                <div style="font-size:10px;color:rgba(255,255,255,.4)">${o.user_id?.slice(0,16)}...</div>
              </td>
              <td style="font-size:16px;font-weight:800;color:#f1c40f">${o.tokens_requested}</td>
              <td style="color:#c8922a;font-weight:700">฿${Number(o.price_paid).toLocaleString()}</td>
              <td>${o.slip_url ? `<a href="${o.slip_url}" target="_blank" style="color:var(--a);font-size:12px"><i class="fas fa-image"></i> ดูสลิป</a>` : '<span style="color:rgba(255,255,255,.3);font-size:11px">ไม่มี</span>'}</td>
              <td style="font-size:11px;color:rgba(255,255,255,.4)">${o.created_at ? new Date(o.created_at).toLocaleDateString('th-TH') : '-'}</td>
              <td>${badge(o.status)}</td>
              <td>
                ${o.status === 'รอยืนยัน' ? `
                  <div class="admin-action-btns">
                    <button class="admin-action-btn approve" onclick="adminApproveTokenOrder('${o.id}')"><i class="fas fa-check"></i> อนุมัติ</button>
                    <button class="admin-action-btn reject"  onclick="adminRejectTokenOrder('${o.id}')"><i class="fas fa-times"></i> ปฏิเสธ</button>
                  </div>` : '<span style="font-size:11px;color:rgba(255,255,255,.3)">—</span>'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${!orders.length ? '<div class="admin-empty"><i class="fas fa-inbox"></i><p>ไม่มี Token Orders</p></div>' : ''}
      </div>
    </div>`;
  window._adminAllTokenOrders = orders;
}

// ── Render Admin: User Listings ────────────────────────────
async function _renderAdminUserListings(el, devBanner) {
  let userListings = [];
  if (!_adminDevMode && sb) {
    try {
      const { data } = await sb
        .from('v_admin_user_listings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 299);
      userListings = data || [];
    } catch(e) {
      try {
        const { data } = await sb.from('user_listings').select('*').order('created_at', { ascending: false }).range(0, 299);
        userListings = data || [];
      } catch(e2) {}
    }
  }

  const badge = s => {
    const map = {
      'รอตรวจสอบ': ['#f39c12','fa-clock'],
      'อนุมัติ':   ['#2ecc71','fa-check'],
      'ปฏิเสธ':   ['#e74c3c','fa-times'],
      'ปิด':       ['#95a5a6','fa-ban'],
    };
    const [c,ic] = map[s]||['#bbb','fa-circle'];
    return `<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="fas ${ic}" style="font-size:8px"></i> ${s}</span>`;
  };

  el.innerHTML = devBanner + `
    <div class="admin-section">
      <div class="admin-section-head">
        <div class="admin-section-title"><i class="fas fa-home"></i> User Listings — รออนุมัติ (${userListings.filter(u=>u.status==='รอตรวจสอบ').length})</div>
        <button class="admin-btn admin-btn-ghost" style="font-size:11px;padding:5px 10px" onclick="adminNav('user-listings',null)"><i class="fas fa-sync"></i> Refresh</button>
      </div>
      <div class="admin-search-bar">
        <input class="admin-search-input" id="ul-search" placeholder="🔍 ค้นหาชื่อทรัพย์..." oninput="_adminFilterUserListings()">
        <select class="admin-filter-select" id="ul-filter" onchange="_adminFilterUserListings()">
          <option value="">ทุกสถานะ</option>
          <option value="รอตรวจสอบ">รอตรวจสอบ</option>
          <option value="อนุมัติ">อนุมัติแล้ว</option>
          <option value="ปฏิเสธ">ปฏิเสธ</option>
        </select>
      </div>
      <div id="admin-ul-table">
        <table class="admin-table">
          <thead><tr>
            <th>#</th><th>ทรัพย์</th><th>User</th><th>ราคา</th><th>จังหวัด</th><th>วันที่</th><th>สถานะ</th><th>Action</th>
          </tr></thead>
          <tbody id="admin-ul-tbody">
            ${_adminULRows(userListings)}
          </tbody>
        </table>
        ${!userListings.length ? '<div class="admin-empty"><i class="fas fa-inbox"></i><p>ไม่มี User Listings</p></div>' : ''}
      </div>
    </div>`;
  window._adminAllUserListings = userListings;
}

function _adminULRows(data) {
  return data.map((ul,i) => `<tr>
    <td style="color:rgba(255,255,255,.3);font-size:11px">${i+1}</td>
    <td style="max-width:180px">
      <strong style="color:#fff;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sanitize(ul.title||'-')}</strong>
      <span style="font-size:11px;color:rgba(255,255,255,.3)">${sanitize(ul.property_type||'')} · ${ul.transaction==='RENT'?'เช่า':'ขาย'}</span>
    </td>
    <td style="font-size:12px">
      <div style="color:#fff">${sanitize(ul.user_display_name||ul.contact_name||'-')}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.4)">${sanitize(ul.contact_phone||ul.user_phone||'-')}</div>
    </td>
    <td style="color:#c8922a;font-weight:700;white-space:nowrap">${ul.price?'฿'+(ul.price>=1e6?(ul.price/1e6).toFixed(1)+'M':Number(ul.price).toLocaleString()):'-'}</td>
    <td style="font-size:12px;color:rgba(255,255,255,.5)">${sanitize(ul.province||'-')}</td>
    <td style="font-size:11px;color:rgba(255,255,255,.4)">${ul.created_at?new Date(ul.created_at).toLocaleDateString('th-TH'):'-'}</td>
    <td>${(()=>{const map={'รอตรวจสอบ':['#f39c12','fa-clock'],'อนุมัติ':['#2ecc71','fa-check'],'ปฏิเสธ':['#e74c3c','fa-times'],'ปิด':['#95a5a6','fa-ban']};const [c,ic]=map[ul.status]||['#bbb','fa-circle'];return`<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="fas ${ic}" style="font-size:8px"></i> ${ul.status}</span>`;})()}</td>
    <td>
      <div class="admin-action-btns">
        <button class="admin-action-btn edit" onclick="adminPreviewUserListing('${ul.id}')"><i class="fas fa-eye"></i></button>
        ${ul.status==='รอตรวจสอบ'?`
        <button class="admin-action-btn approve" onclick="adminApproveUserListing('${ul.id}')"><i class="fas fa-check"></i> อนุมัติ</button>
        <button class="admin-action-btn reject"  onclick="adminRejectUserListing('${ul.id}')"><i class="fas fa-times"></i> ปฏิเสธ</button>
        `:'<span style="font-size:11px;color:rgba(255,255,255,.3)">—</span>'}
      </div>
    </td>
  </tr>`).join('');
}

function _adminFilterUserListings() {
  const kw  = (document.getElementById('ul-search')?.value||'').toLowerCase();
  const st  = document.getElementById('ul-filter')?.value||'';
  const data = (window._adminAllUserListings||[]).filter(ul =>
    (!kw || (ul.title||'').toLowerCase().includes(kw) || (ul.province||'').toLowerCase().includes(kw)) &&
    (!st || ul.status === st)
  );
  const tbody = document.getElementById('admin-ul-tbody');
  if (tbody) tbody.innerHTML = _adminULRows(data);
}

function _adminFilterTokenOrders() {
  const st = document.getElementById('tok-ord-filter')?.value||'';
  const data = (window._adminAllTokenOrders||[]).filter(o => !st || o.status === st);
  const tbody = document.getElementById('admin-tok-orders-tbody');
  if (tbody) {
    // Re-render rows
    adminNav('token-orders', null); // simple: reload whole panel
  }
}

// ── Admin Actions: Token Orders ────────────────────────────
async function adminApproveTokenOrder(orderId) {
  if (!confirm('ยืนยันการอนุมัติ Token Order นี้?\nระบบจะเติม Token ให้ User อัตโนมัติ')) return;
  try {
    const { error } = await sb.from('token_orders').update({
      status:       'ยืนยันแล้ว',
      processed_by: user.id,
      processed_at: new Date().toISOString()
    }).eq('id', orderId);
    if (error) throw error;
    toast('✅ อนุมัติและเติม Token ให้ User แล้ว', 'success');
    adminNav('token-orders', null);
  } catch(e) { toast('เกิดข้อผิดพลาด: ' + e.message, 'error'); }
}

async function adminRejectTokenOrder(orderId) {
  const note = prompt('เหตุผลที่ปฏิเสธ (ส่งให้ User เห็น):');
  if (note === null) return;
  try {
    const { error } = await sb.from('token_orders').update({
      status:       'ปฏิเสธ',
      admin_note:   note || 'ปฏิเสธโดย Admin',
      processed_by: user.id,
      processed_at: new Date().toISOString()
    }).eq('id', orderId);
    if (error) throw error;
    toast('ปฏิเสธ Order แล้ว', 'warn');
    adminNav('token-orders', null);
  } catch(e) { toast('เกิดข้อผิดพลาด: ' + e.message, 'error'); }
}

// ── Admin Actions: User Listings ───────────────────────────
function adminPreviewUserListing(ulId) {
  const ul = (window._adminAllUserListings||[]).find(u => u.id === ulId);
  if (!ul) { toast('ไม่พบข้อมูล', 'warn'); return; }
  const photos = (ul.photos||[]).map(p => `<img src="${p}" style="width:120px;height:90px;object-fit:cover;border-radius:8px">`).join('');
  alert(`📋 รายละเอียดประกาศ\n\n` +
    `ชื่อ: ${ul.title}\n` +
    `ประเภท: ${ul.property_type} (${ul.transaction==='RENT'?'เช่า':'ขาย'})\n` +
    `ราคา: ฿${Number(ul.price||0).toLocaleString()}\n` +
    `พื้นที่: ${ul.area||0} ตร.ม.\n` +
    `ห้องนอน: ${ul.bed||0} · ห้องน้ำ: ${ul.bath||0}\n` +
    `จังหวัด: ${ul.province||'-'} · ย่าน: ${ul.district||'-'}\n` +
    `BTS/MRT: ${ul.near_bts||'-'}\n` +
    `รายละเอียด: ${ul.description||'-'}\n\n` +
    `ผู้ติดต่อ: ${ul.contact_name||ul.user_display_name||'-'}\n` +
    `โทร: ${ul.contact_phone||ul.user_phone||'-'}\n` +
    `LINE: ${ul.contact_line||'-'}`
  );
}

async function adminApproveUserListing(ulId) {
  const ul = (window._adminAllUserListings||[]).find(u => u.id === ulId);
  if (!ul) return;
  if (!confirm(`อนุมัติประกาศ "${ul.title}"?\nระบบจะสร้าง property ใหม่ในตาราง properties อัตโนมัติ`)) return;
  try {
    // 1. สร้าง property record — map ทุก field จาก user_listings → properties
    const newPropId = 'ul-' + ulId.slice(0,8);
    const { error: propErr } = await sb.from('properties').insert({
      id:                newPropId,
      title:             ul.title,
      type:              ul.property_type,
      province:          ul.province,
      location:          ul.location,
      district:          ul.district,
      price:             ul.price,
      tx:                ul.transaction,
      bed:               ul.bed     || 0,
      bath:              ul.bath    || 0,
      area:              ul.area    || 0,
      land_area:         ul.land_area || 0,
      floors:            ul.floors  || 0,
      floor_no:          ul.floor_no || 0,
      parking:           ul.parking || 0,
      furniture:         ul.furniture || '',
      pets_allowed:      ul.pets_allowed || false,
      appliances:        ul.appliances   || [],
      amenities:         ul.amenities    || [],
      description:       ul.description  || '',
      near_bts:          ul.near_bts     || '',
      nearby_places:     ul.nearby_places || null,
      deposit:           ul.deposit           || null,
      advance_payment:   ul.advance_payment   || null,
      service_fee:       ul.service_fee       || null,
      electric_rate:     ul.electric_rate     || null,
      water_rate:        ul.water_rate        || null,
      min_lease_months:  ul.min_lease_months  || null,
      contact_name:      ul.contact_name      || '',
      contact_phone:     ul.contact_phone     || '',
      contact_line:      ul.contact_line      || '',
      photos:            ul.photos            || [],
      status:            'approved',
      is_new:            true,
      admin_note:        'อนุมัติจาก User Listing #' + ulId.slice(0,8)
    });
    if (propErr && !propErr.message.includes('duplicate')) throw propErr;

    // 2. อัปเดต user_listing status + หัก 1 Token
    const { error: ulErr } = await sb.from('user_listings').update({
      status:      'อนุมัติ',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      property_id: newPropId
    }).eq('id', ulId);
    if (ulErr) throw ulErr;

    // 3. หัก 1 Token จาก user_tokens
    const ownerId = ul.user_id;
    if (ownerId) {
      const { data: tokRow } = await sb.from('user_tokens').select('balance,total_used').eq('user_id', ownerId).maybeSingle();
      if (tokRow) {
        await sb.from('user_tokens').update({
          balance:    Math.max(0, (tokRow.balance||0) - 1),
          total_used: (tokRow.total_used||0) + 1
        }).eq('user_id', ownerId);
      }
    }

    toast('✅ อนุมัติ + หัก 1 Token + สร้างประกาศบนเว็บแล้ว!', 'success');
    adminNav('user-listings', null);
  } catch(e) {
    toast('เกิดข้อผิดพลาด: ' + (e.message||'ไม่ทราบสาเหตุ'), 'error');
  }
}

async function adminRejectUserListing(ulId) {
  const note = prompt('เหตุผลที่ปฏิเสธ (User จะเห็น และได้รับ Token คืน):');
  if (note === null) return;
  try {
    const { error } = await sb.from('user_listings').update({
      status:      'ปฏิเสธ',
      admin_note:  note || 'ไม่ผ่านเกณฑ์ของ Matchdoor'
    }).eq('id', ulId);
    if (error) throw error;
    toast('ปฏิเสธแล้ว ระบบคืน Token ให้ User อัตโนมัติ', 'warn');
    adminNav('user-listings', null);
  } catch(e) { toast('เกิดข้อผิดพลาด: ' + e.message, 'error'); }
}

// ── Admin: เติม Token ให้ User โดยตรง (ไม่ผ่านออเดอร์) ──────
async function adminGrantTokens() {
  const uid   = prompt('กรอก User ID ที่ต้องการเติม Token:');
  if (!uid) return;
  const amount = parseInt(prompt('จำนวน Token ที่ต้องการเติม:'));
  if (!amount || amount <= 0) return;
  const note = prompt('หมายเหตุ (Admin เติมให้):') || 'Admin เติม Token พิเศษ';
  try {
    // เติม user_tokens
    const { data: cur } = await sb.from('user_tokens').select('balance').eq('user_id', uid).single();
    const newBal = (cur?.balance||0) + amount;
    await sb.from('user_tokens').upsert({ user_id: uid, balance: newBal, total_purchased: (cur?.total_purchased||0)+amount, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    // บันทึก transaction
    await sb.from('token_transactions').insert({ user_id: uid, type: 'ADMIN_GRANT', amount, balance_after: newBal, note });
    toast(`✅ เติม ${amount} Token ให้ User แล้ว (ยอดใหม่: ${newBal})`, 'success');
  } catch(e) { toast('เกิดข้อผิดพลาด: ' + e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  Hook เข้า renderMyAccount / _maTab
// ══════════════════════════════════════════════════════════════

// โหลดข้อมูล Token เมื่อ User login
const _origOnAuthChange = window.onAuthChange;
window._onAuthChangeTokenHook = async function(u) {
  if (u) {
    await loadUserTokenData();
  }
};

function _maTab(name, el){
  document.querySelectorAll('#ma-tab-bar .ma-tab').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('#my-account-content .ma-panel').forEach(p=>p.classList.remove('active'));
  const panel = document.getElementById('ma-panel-'+name);
  if(panel) panel.classList.add('active');
}
function _maEmptyPanel(icon, msg, btnIcon, btnLabel, btnAction){
  return `<div class="ma-empty">
    <i class="fas ${icon}"></i>
    <p>${sanitize(msg)}</p>
    <button class="ma-empty-btn" onclick="${btnAction}"><i class="fas ${btnIcon}"></i> ${sanitize(btnLabel)}</button>
  </div>`;
}
function _maFavHtml(t){
  const myFavs = (typeof favs!=='undefined' ? favs : []);
  if(!myFavs.length) return `<div class="ma-empty"><i class="fas fa-heart-broken"></i><p>${sanitize(t('ma.favs.empty'))}</p><button class="ma-empty-btn" onclick="showPage('home');setTimeout(()=>{const sb=document.querySelector('.search-box');if(sb)sb.scrollIntoView({behavior:'smooth',block:'center'});},200)"><i class="fas fa-search"></i> ${sanitize(t('ma.favs.browse'))}</button></div>`;
  const allProps = (typeof props!=='undefined' ? props : []);
  const favProps = myFavs.map(id=>allProps.find(p=>String(p.id)===String(id))).filter(Boolean);
  if(!favProps.length) return `<div class="ma-empty"><i class="fas fa-heart-broken"></i><p>${sanitize(t('ma.favs.empty'))}</p><button class="ma-empty-btn" onclick="showPage('home');setTimeout(()=>{const sb=document.querySelector('.search-box');if(sb)sb.scrollIntoView({behavior:'smooth',block:'center'});},200)"><i class="fas fa-search"></i> ${sanitize(t('ma.favs.browse'))}</button></div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">${
    favProps.slice(0,12).map(p=>{
      const photo = (p.photos||[])[0]||'';
      const priceStr = p.price>=1e6?(p.price/1e6).toFixed(1)+'M':p.price?.toLocaleString()||'—';
      return `<div style="border:1.5px solid var(--bd);border-radius:12px;overflow:hidden;cursor:pointer;transition:.15s" onclick="openModal('${p.id}')">
        ${photo?`<img src="${photo}" style="width:100%;height:140px;object-fit:cover;display:block" loading="lazy">`:`<div style="height:140px;background:var(--lt);display:flex;align-items:center;justify-content:center;font-size:32px">🏠</div>`}
        <div style="padding:10px 12px">
          <div style="font-size:13px;font-weight:600;color:var(--tx);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(p.title||'')}</div>
          <div style="font-size:12px;color:var(--gr)">${sanitize(p.location||'')}</div>
          <div style="font-size:14px;font-weight:700;color:var(--p);margin-top:4px">${priceStr} ฿</div>
        </div>
      </div>`;
    }).join('')
  }</div>`;
}
function _maHistoryHtml(t){
  // Use view history stored in localStorage
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('md_view_history')||'[]'); } catch(e){}
  if(!hist.length) return `<div class="ma-empty"><i class="fas fa-history"></i><p>${sanitize(t('ma.history.empty'))}</p></div>`;
  const allProps = (typeof props!=='undefined' ? props : []);
  const histProps = hist.slice(0,20).map(id=>allProps.find(p=>String(p.id)===String(id))).filter(Boolean);
  if(!histProps.length) return `<div class="ma-empty"><i class="fas fa-history"></i><p>${sanitize(t('ma.history.empty'))}</p></div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">${
    histProps.map(p=>{
      const photo = (p.photos||[])[0]||'';
      const priceStr = p.price>=1e6?(p.price/1e6).toFixed(1)+'M':p.price?.toLocaleString()||'—';
      return `<div style="border:1.5px solid var(--bd);border-radius:12px;overflow:hidden;cursor:pointer" onclick="openModal('${p.id}')">
        ${photo?`<img src="${photo}" style="width:100%;height:120px;object-fit:cover;display:block" loading="lazy">`:`<div style="height:120px;background:var(--lt);display:flex;align-items:center;justify-content:center;font-size:28px">🏠</div>`}
        <div style="padding:10px 12px">
          <div style="font-size:12px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitize(p.title||'')}</div>
          <div style="font-size:13px;font-weight:700;color:var(--p);margin-top:3px">${priceStr} ฿</div>
        </div>
      </div>`;
    }).join('')
  }</div>`;
}
async function _maSaveProfile(){
  if(!user||!sb) return;
  const name   = document.getElementById('ma-display-name')?.value.trim()||'';
  const phone  = document.getElementById('ma-phone')?.value.trim()||'';
  const lineId = document.getElementById('ma-line-id')?.value.trim()||'';
  const btn = document.querySelector('#ma-panel-profile .ma-save-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';}

  // 1) อัปเดต auth.users metadata (เดิม) — trigger DB จะ sync user_profiles อัตโนมัติ
  const {error} = await sb.auth.updateUser({data:{display_name:name,phone,line_id:lineId}});
  if(error){
    if(btn){btn.disabled=false;btn.innerHTML=`<i class="fas fa-save"></i> ${ui('ma.profile.save')||'บันทึก'}`;}
    toast('เกิดข้อผิดพลาด: '+error.message,true); return;
  }

  // 2) upsert ลง user_profiles โดยตรง (รองรับกรณี trigger ยังไม่ทำงาน)
  try {
    await sb.from('user_profiles').upsert(
      { user_id: user.id, display_name: name, phone, line_id: lineId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch(e){ /* silent — trigger จะ sync ให้เองอยู่แล้ว */ }

  if(btn){btn.disabled=false;btn.innerHTML=`<i class="fas fa-save"></i> ${ui('ma.profile.save')||'บันทึก'}`;}
  toast('บันทึกข้อมูลสำเร็จ ✅');
  await checkAuth();
  renderMyAccount();
}
function updateFormBtns(){ const logged=!!user; const deps=[['dep-btn','submitDep','form.dep.submit'],['wish-btn','submitWish','form.wish.submit']]; deps.forEach(([id,fn,labelKey])=>{ const b=$(id); if(!b)return; if(logged){ b.innerHTML=`<i class="fas fa-paper-plane btn-icon"></i><span class="btn-spinner"></span> ${sanitize(ui(labelKey))}`; b.onclick=window[fn]; } else{ b.innerHTML='<i class="fas fa-lock btn-icon"></i><span class="btn-spinner"></span> '+sanitize(ui('form.login')); b.onclick=()=>_openModal('login-modal'); } }); }
async function loginWith(p){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const btn = document.querySelector('#login-modal .login-provider[onclick*="'+p+'"]') || document.querySelector('#signup-modal .login-provider[onclick*="'+p+'"]');
  if(btn){ btn.disabled=true; btn.textContent='กำลังเชื่อมต่อ...'; }
  const {error}=await sb.auth.signInWithOAuth({
    provider:p,
    options:{ redirectTo: window.location.origin + '/' }
  });
  if(error){ toast(error.message,true); if(btn){btn.disabled=false; btn.innerHTML=p==='google'?'<i class="fab fa-google" style="color:#DB4437"></i> เข้าสู่ระบบด้วย Google':'<i class="fab fa-facebook" style="color:var(--fb)"></i> เข้าสู่ระบบด้วย Facebook';} }
}
// ── Phone OTP Login ──────────────────────────────────────────
function loginPhone(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  _closeModal('login-modal');
  _closeModal('signup-modal');
  _openModal('phone-otp-modal');
  setTimeout(()=>{ document.getElementById('phone-otp-number')?.focus(); }, 300);
}

async function sendPhoneOTP(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const phoneRaw = document.getElementById('phone-otp-number').value.trim();
  const errEl = document.getElementById('phone-otp-err');
  const btn = document.getElementById('phone-otp-send-btn');
  errEl.style.display='none';
  // แปลงเบอร์ไทย 0XX → +66XX
  let phone = phoneRaw.replace(/[^0-9+]/g,'');
  if(phone.startsWith('0')) phone = '+66' + phone.slice(1);
  if(!/^\+\d{10,15}$/.test(phone)){
    errEl.textContent = 'กรุณากรอกเบอร์โทรให้ถูกต้อง เช่น 081-234-5678';
    errEl.style.display='block'; return;
  }
  btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังส่ง OTP...';
  const {error} = await sb.auth.signInWithOtp({ phone });
  btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane"></i> ส่งรหัส OTP';
  if(error){
    errEl.textContent = error.message.includes('rate') ? 'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่' : error.message;
    errEl.style.display='block'; return;
  }
  // เก็บเบอร์ไว้ใช้ตอน verify
  window._phoneOtpTarget = phone;
  document.getElementById('phone-otp-step1').style.display='none';
  document.getElementById('phone-otp-step2').style.display='block';
  document.getElementById('phone-otp-display').textContent = phone;
  setTimeout(()=>{ document.getElementById('phone-otp-code')?.focus(); }, 200);
}

async function verifyPhoneOTP(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const token = document.getElementById('phone-otp-code').value.trim();
  const errEl = document.getElementById('phone-otp-err2');
  const btn = document.getElementById('phone-otp-verify-btn');
  errEl.style.display='none';
  if(!token || token.length < 4){ errEl.textContent='กรุณากรอกรหัส OTP'; errEl.style.display='block'; return; }
  btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังตรวจสอบ...';
  const {error} = await sb.auth.verifyOtp({
    phone: window._phoneOtpTarget,
    token,
    type: 'sms'
  });
  btn.disabled=false; btn.innerHTML='<i class="fas fa-check-circle"></i> ยืนยัน OTP';
  if(error){
    errEl.textContent = error.message.includes('expired') ? 'รหัส OTP หมดอายุ กรุณาส่งใหม่' :
                        error.message.includes('invalid') ? 'รหัส OTP ไม่ถูกต้อง' : error.message;
    errEl.style.display='block'; return;
  }
  _closeModal('phone-otp-modal');
  toast('เข้าสู่ระบบสำเร็จ ✅');
}

function phoneOtpBack(){
  document.getElementById('phone-otp-step1').style.display='block';
  document.getElementById('phone-otp-step2').style.display='none';
  document.getElementById('phone-otp-code').value='';
}

async function loginEmail(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const e=document.getElementById('login-email').value.trim();
  const p=document.getElementById('login-pw').value;
  if(!e||!p){ toast('กรุณากรอกอีเมลและรหัสผ่าน',true); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ toast('รูปแบบอีเมลไม่ถูกต้อง',true); return; }
  const btn=document.querySelector('#login-modal .btn-sub');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...'; }
  const {error}=await sb.auth.signInWithPassword({email:e,password:p});
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ'; }
  if(error){
    const msg = error.message.includes('Invalid login')?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':error.message;
    toast(msg,true);
  } else {
    _closeModal('login-modal');
    await checkAuth();
    toast('เข้าสู่ระบบสำเร็จ ✅');
  }
}
async function signupEmail(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const e=document.getElementById('su-email').value.trim();
  const p=document.getElementById('su-pw').value;
  if(!e||!p){ toast('กรุณากรอกอีเมลและรหัสผ่าน',true); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ toast('รูปแบบอีเมลไม่ถูกต้อง',true); return; }
  if(p.length<6){ toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',true); return; }
  const btn=document.querySelector('#signup-modal .btn-sub');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังสมัคร...'; }
  const {error}=await sb.auth.signUp({email:e,password:p});
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-user-plus"></i> สมัครสมาชิก'; }
  if(error){ toast(error.message,true); }
  else{ _closeModal('signup-modal'); toast('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน ✅'); }
}
async function logout(){
  if(!sb) return;
  await sb.auth.signOut();
  user=null; renderAuthUI(); updateFormBtns();
}
function showSignup(){ _closeModal('login-modal'); _openModal('signup-modal'); }
function showLogin(){ _closeModal('signup-modal'); _openModal('login-modal'); }

/* ── Login tab toggle (Password / Magic Link) ─────────────── */
function setLoginTab(tab){
  const pwSection  = document.getElementById('lt-pw-section');
  const magicSection = document.getElementById('lt-magic-section');
  const pwBtn   = document.getElementById('lt-pw-btn');
  const magicBtn= document.getElementById('lt-magic-btn');
  if(!pwSection||!magicSection) return;
  if(tab==='pw'){
    pwSection.style.display=''; magicSection.style.display='none';
    if(pwBtn) pwBtn.classList.add('active');
    if(magicBtn) magicBtn.classList.remove('active');
  } else {
    pwSection.style.display='none'; magicSection.style.display='';
    if(pwBtn) pwBtn.classList.remove('active');
    if(magicBtn) magicBtn.classList.add('active');
  }
}

/* ── Forgot Password ──────────────────────────────────────── */
async function resetPassword(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const email = document.getElementById('login-email').value.trim();
  if(!email){ toast('กรุณากรอกอีเมลก่อน',true); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ toast('รูปแบบอีเมลไม่ถูกต้อง',true); return; }
  const {error} = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/?/reset-password'
  });
  if(error) toast('เกิดข้อผิดพลาด: ' + error.message, true);
  else { toast('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว ✅'); _closeModal('login-modal'); }
}

/* ── Confirm new password (after redirect back) ───────────── */
async function confirmResetPassword(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const p1 = document.getElementById('newpw-1').value;
  const p2 = document.getElementById('newpw-2').value;
  if(!p1||!p2){ toast('กรุณากรอกรหัสผ่านให้ครบ',true); return; }
  if(p1.length<6){ toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',true); return; }
  if(p1!==p2){ toast('รหัสผ่านไม่ตรงกัน',true); return; }
  const btn = document.querySelector('#reset-pw-modal .btn-sub');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...'; }
  const {error} = await sb.auth.updateUser({password: p1});
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-check"></i> บันทึกรหัสผ่านใหม่'; }
  if(error) toast('เกิดข้อผิดพลาด: ' + error.message, true);
  else { toast('เปลี่ยนรหัสผ่านสำเร็จ ✅'); _closeModal('reset-pw-modal'); }
}

/* ── Magic Link Login ─────────────────────────────────────── */
async function loginMagicLink(){
  if(!sb){ toast('ระบบยังไม่ได้เชื่อมต่อ Supabase',true); return; }
  const email = document.getElementById('login-email').value.trim();
  if(!email){ toast('กรุณากรอกอีเมล',true); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ toast('รูปแบบอีเมลไม่ถูกต้อง',true); return; }
  const btn = document.querySelector('#lt-magic-section .btn-sub');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...'; }
  const {error} = await sb.auth.signInWithOtp({
    email,
    options:{ emailRedirectTo: window.location.origin + window.location.pathname }
  });
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-magic"></i> ส่ง Magic Link'; }
  if(error) toast('เกิดข้อผิดพลาด: ' + error.message, true);
  else { toast('ส่งลิงก์เข้าสู่ระบบไปที่อีเมลแล้ว ✅ กรุณาตรวจสอบกล่องจดหมาย'); _closeModal('login-modal'); }
}

/* ── Save Profile (display name) ─────────────────────────── */
async function saveProfile(){
  if(!sb||!user){ toast('กรุณาเข้าสู่ระบบก่อน',true); return; }
  const displayName = document.getElementById('profile-display-name').value.trim();
  if(!displayName){ toast('กรุณากรอกชื่อที่แสดง',true); return; }
  const btn = document.querySelector('#profile-modal .btn-sub');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...'; }

  // 1) อัปเดต auth.users metadata
  const {error} = await sb.auth.updateUser({ data: { display_name: displayName } });
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> บันทึก'; }
  if(error){ toast('เกิดข้อผิดพลาด: ' + error.message, true); return; }

  // 2) sync user_profiles โดยตรง
  try {
    await sb.from('user_profiles').upsert(
      { user_id: user.id, display_name: displayName, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch(e){ /* silent */ }

  // 3) อัปเดต local user object และ re-render
  user.user_metadata = user.user_metadata || {};
  user.user_metadata.display_name = displayName;
  renderAuthUI();
  toast('บันทึกชื่อสำเร็จ ✅');
  _closeModal('profile-modal');
}

const MOCK = {
  props: [
    {id:'p1',title:'บ้านเดี่ยว 2 ชั้น หมู่บ้านพฤกษา',type:'บ้านเดี่ยว',province:'กรุงเทพฯ',location:'ลาดกระบัง กรุงเทพฯ',price:4500000,tx:'BUY',bed:3,bath:2,area:180,land_area:52,floors:2,floor_no:0,parking:2,furniture:'full',pets_allowed:true,appliances:['แอร์','ตู้เย็น','เครื่องซักผ้า'],isNew:true,isRec:true,desc:'บ้านเดี่ยว 2 ชั้น ทำเลดี ใกล้ทางด่วน เฟอร์นิเจอร์ครบ เลี้ยงสัตว์ได้',agentId:'a1',createdAt:'2025-04-20',photos:['https://picsum.photos/id/101/800/600','https://picsum.photos/id/111/800/600']},
    {id:'p2',title:'คอนโด ลุมพินี วิลล์ รัชโยธิน',type:'คอนโด',province:'กรุงเทพฯ',location:'จตุจักร กรุงเทพฯ',price:2200000,tx:'BUY',bed:1,bath:1,area:35,land_area:0,floors:25,floor_no:12,parking:1,furniture:'full',pets_allowed:false,appliances:['แอร์','ตู้เย็น','โทรทัศน์'],isNew:false,isRec:true,desc:'คอนโดใกล้รถไฟฟ้า BTS พร้อมอยู่',agentId:'a2',createdAt:'2025-03-15',photos:['https://picsum.photos/id/102/800/600']},
    {id:'p3',title:'ทาวน์โฮม 3 ชั้น ใกล้รถไฟฟ้าสายสีม่วง',type:'ทาวน์โฮม',province:'นนทบุรี',location:'ปากเกร็ด นนทบุรี',price:3200000,tx:'BUY',bed:3,bath:2,area:140,land_area:21,floors:3,floor_no:0,parking:2,furniture:'partial',pets_allowed:true,appliances:['แอร์','เครื่องทำน้ำอุ่น'],isNew:true,isRec:false,desc:'โครงการใหม่ ใกล้ MRT สายสีม่วง',agentId:'a3',createdAt:'2025-05-01',photos:['https://picsum.photos/id/103/800/600']},
    {id:'p4',title:'ที่ดินเปล่า ติดถนนใหญ่ ทำเลทอง',type:'ที่ดิน',province:'ชลบุรี',location:'บางละมุง ชลบุรี',price:8900000,tx:'BUY',bed:0,bath:0,area:400,land_area:100,floors:0,floor_no:0,parking:0,furniture:'none',pets_allowed:false,appliances:[],isNew:false,isRec:true,desc:'ที่ดินเปล่า ติดถนน 4 เลน เหมาะลงทุน',agentId:'a4',createdAt:'2025-02-10',photos:['https://picsum.photos/id/104/800/600']},
    {id:'p5',title:'คอนโดให้เช่า แอชตัน อโศก',type:'คอนโด',province:'กรุงเทพฯ',location:'อโศก กรุงเทพฯ',price:35000,tx:'RENT',bed:2,bath:2,area:65,land_area:0,floors:50,floor_no:28,parking:1,furniture:'full',pets_allowed:false,appliances:['แอร์','ตู้เย็น','เครื่องซักผ้า','โทรทัศน์'],isNew:false,isRec:true,desc:'คอนโดหรู ใจกลางเมือง ใกล้ BTS อโศก',agentId:'a5',createdAt:'2025-04-01',photos:['https://picsum.photos/id/105/800/600']},
    {id:'p8',title:'ทาวน์โฮม ลาดพร้าว 71',type:'ทาวน์โฮม',province:'กรุงเทพฯ',location:'ลาดพร้าว กรุงเทพฯ',price:3900000,tx:'BUY',bed:3,bath:2,area:150,land_area:24,floors:3,floor_no:0,parking:2,furniture:'none',pets_allowed:false,appliances:['แอร์'],isNew:true,isRec:true,desc:'ทาวน์โฮม ใกล้ MRT ลาดพร้าว',agentId:'a1',createdAt:'2025-05-05',photos:['https://picsum.photos/id/108/800/600']},
    {id:'p13',title:'คอนโดให้เช่า ใกล้ ม.เกษตรศาสตร์',type:'คอนโด',province:'กรุงเทพฯ',location:'ลาดยาว กรุงเทพฯ',price:12000,tx:'RENT',bed:1,bath:1,area:30,land_area:0,floors:8,floor_no:5,parking:1,furniture:'full',pets_allowed:false,appliances:['แอร์','ตู้เย็น'],isNew:false,isRec:false,desc:'คอนโดสตูดิโอ เฟอร์นิเจอร์ครบ',agentId:'a2',createdAt:'2025-04-18',photos:['https://picsum.photos/id/114/800/600']},
    {id:'p15',title:'ที่ดินเปล่า 100 ตร.วา พระราม 2',type:'ที่ดิน',province:'กรุงเทพฯ',location:'พระราม 2 ซอย 40',price:5500000,tx:'BUY',bed:0,bath:0,area:400,land_area:100,floors:0,floor_no:0,parking:0,furniture:'none',pets_allowed:false,appliances:[],isNew:false,isRec:true,desc:'ที่ดินเปล่า หน้ากว้าง 20 เมตร',agentId:'a4',createdAt:'2025-02-28',photos:['https://picsum.photos/id/116/800/600']}
  ],
  agents: [
    {id:'a1',name:'สมชาย มั่นคง',title:'ผู้จัดการฝ่ายขาย',phone:'081-234-5678',lineId:'@somchai',initials:'สม',color:'#0f3460',avatar_url:'https://randomuser.me/api/portraits/men/1.jpg',propIds:['p1','p8']},
    {id:'a2',name:'วารี สุขสันต์',title:'ที่ปรึกษาอสังหาริมทรัพย์',phone:'082-345-6789',lineId:'@waree',initials:'วร',color:'#00b894',avatar_url:'https://randomuser.me/api/portraits/women/2.jpg',propIds:['p2','p13']},
    {id:'a3',name:'ประภัส รุ่งเรือง',title:'ผู้เชี่ยวชาญที่ดิน',phone:'083-456-7890',lineId:'@praphat',initials:'ปภ',color:'#6c5ce7',avatar_url:'https://randomuser.me/api/portraits/men/3.jpg',propIds:['p3']},
    {id:'a4',name:'ณัฐธิดา ใจดี',title:'ที่ปรึกษา Luxury',phone:'084-567-8901',lineId:'@nuttida',initials:'ณธ',color:'#e17055',avatar_url:'https://randomuser.me/api/portraits/women/4.jpg',propIds:['p4','p15']},
    {id:'a5',name:'ธนากร วัฒนา',title:'นายหน้าอสังหาฯ',phone:'085-678-9012',lineId:'@thanakorn',initials:'ธน',color:'#0984e3',avatar_url:'https://randomuser.me/api/portraits/men/5.jpg',propIds:['p5']}
  ],
  port: [
    {id:'pt1',title:'บ้านเดี่ยว ร่มเกล้า กรุงเทพฯ',type:'บ้านเดี่ยว',price:3800000,status:'SOLD',location:'ร่มเกล้า',date:'ม.ค. 2568',review:'บริการดีมาก โอนได้เร็ว',photo:'https://picsum.photos/id/101/400/300',photos:['https://picsum.photos/id/101/400/300','https://picsum.photos/id/101/600/400','https://picsum.photos/id/101/800/600']},
    {id:'pt2',title:'คอนโด เดอะ ลาม คาราฟ',type:'คอนโด',price:1900000,status:'SOLD',location:'อ่อนนุช',date:'ก.พ. 2568',review:'ขายได้เร็ว ราคาดีกว่าที่คิด',photo:'https://picsum.photos/id/102/400/300',photos:['https://picsum.photos/id/102/400/300','https://picsum.photos/id/102/600/400']},
    {id:'pt3',title:'ทาวน์โฮม ศุภาลัย บางพลี',type:'ทาวน์โฮม',price:2600000,status:'SOLD',location:'บางพลี',date:'ก.พ. 2568',review:'ช่วยจัดการเรื่องกู้ได้เลย ประทับใจ',photo:'https://picsum.photos/id/103/400/300',photos:['https://picsum.photos/id/103/400/300','https://picsum.photos/id/103/600/400']},
    {id:'pt4',title:'คอนโดให้เช่า สาทร',type:'คอนโด',price:22000,status:'RENTED',location:'สาทร',date:'มี.ค. 2568',review:'หาผู้เช่าได้ภายใน 2 สัปดาห์',photo:'https://picsum.photos/id/104/400/300',photos:['https://picsum.photos/id/104/400/300','https://picsum.photos/id/104/600/400']},
    {id:'pt5',title:'บ้านเดี่ยว พระราม 2',type:'บ้านเดี่ยว',price:5200000,status:'SOLD',location:'พระราม 2',date:'มี.ค. 2568',review:'ขายได้ราคาดีมาก เกินความคาดหมาย',photo:'https://picsum.photos/id/105/400/300',photos:['https://picsum.photos/id/105/400/300','https://picsum.photos/id/105/600/400']}
  ],
  services: [
    {id:'ac',name:'ล้างแอร์',icon:'fa-wind',short_desc:'ล้างแอร์ทุกประเภท',full_desc:'บริการล้างแอร์ทุกประเภท ทั้งแอร์บ้านและแอร์สำนักงาน รับประกันงาน 30 วัน',price:'450 บาท/ตัว',duration:'1-2 ชั่วโมง'},
    {id:'maid',name:'แม่บ้าน',icon:'fa-broom',short_desc:'บริการแม่บ้านคุณภาพ',full_desc:'บริการแม่บ้านคุณภาพ ผ่านการอบรมและตรวจสอบประวัติ มีทั้งรายวัน รายสัปดาห์ รายเดือน',price:'500 บาท/วัน',duration:'ตามตกลง'},
    {id:'elec',name:'ซ่อมอุปกรณ์ไฟฟ้า',icon:'fa-bolt',short_desc:'ซ่อมไฟฟ้าภายในบ้าน',full_desc:'ซ่อมไฟฟ้าภายในบ้าน เดินสายใหม่ เปลี่ยนสวิตช์ ปลั๊ก ระบบไฟส่องสว่าง',price:'400 บาท',duration:'1-3 ชั่วโมง'},
    {id:'paint',name:'ทาสีบ้าน',icon:'fa-paint-roller',short_desc:'ทาสีภายในและภายนอก',full_desc:'บริการทาสีบ้านทั้งภายในและภายนอก ใช้สีคุณภาพ รับประกันงาน 1 ปี',price:'ประเมินตามพื้นที่',duration:'1-3 วัน'},
    {id:'pest',name:'กำจัดปลวกและแมลง',icon:'fa-bug',short_desc:'กำจัดปลวก มด แมลงสาบ',full_desc:'บริการกำจัดปลวก มด แมลงสาบ หนู และสัตว์รบกวนทุกชนิด ด้วยสารเคมีปลอดภัย',price:'1,500 บาท',duration:'2-3 ชั่วโมง'},
    {id:'move',name:'ขนย้ายสิ่งของ',icon:'fa-truck',short_desc:'บริการรถขนของ',full_desc:'บริการขนย้ายสิ่งของ เฟอร์นิเจอร์ ทั้งในกรุงเทพฯ และต่างจังหวัด พร้อมทีมงานมืออาชีพ',price:'1,200 บาท',duration:'ครึ่งวัน'}
  ],
  blogs: [
    {title:'5 ทำเลทองที่น่าลงทุนปี 2568',cat:'การลงทุน',date:'15 พ.ค. 2568',icon:'🏆',color:'linear-gradient(135deg,#667eea,#764ba2)',content:'<p>ในปี 2568 ตลาดอสังหาริมทรัพย์ไทยมีแนวโน้มเติบโต...</p>',photos:['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800','https://images.unsplash.com/photo-1448630360428-65456885c650?w=800']},
    {title:'วิธีเลือกคอนโดใกล้รถไฟฟ้าให้คุ้มค่า',cat:'คำแนะนำ',date:'10 พ.ค. 2568',icon:'🚇',color:'linear-gradient(135deg,#f093fb,#f5576c)',content:'<p>คอนโดใกล้รถไฟฟ้าเป็นตัวเลือกยอดนิยม...</p>',photos:['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800']},
    {title:'ขั้นตอนกู้สินเชื่อบ้านสำหรับมือใหม่',cat:'สาระน่ารู้',date:'5 พ.ค. 2568',icon:'🏦',color:'linear-gradient(135deg,#4facfe,#00f2fe)',content:'<p>การกู้ซื้อบ้านครั้งแรกอาจดูซับซ้อน...</p>',photos:['https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800','https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800']}
  ]
};

function mapProp(r){
  // 🖼️ [IMG-PROP] แปลง photos array → Supabase Storage URL
  // DB เก็บเป็น path เช่น "properties/p1/photo_0.webp" หรือ URL เต็มก็ได้
  const rawPhotos=Array.isArray(r.photos)?r.photos:(r.photos?[r.photos]:[]);
  const ph=rawPhotos.filter(Boolean).map(p=>sbImg(p));
  const apps=Array.isArray(r.appliances)?r.appliances:(r.appliances?[r.appliances]:[]);
  return {
    id:String(r.id),title:r.title,type:r.type,province:r.province,
    location:r.location,
    district:r.district||r.amphoe||'',
    amphoe:r.amphoe||r.district||'',
    price:Number(r.price),
    tx:(()=>{
      const v=(r.tx||'').toString().toUpperCase().trim();
      if(v==='RENT'||v==='เช่า'||v==='ให้เช่า') return 'RENT';
      return 'BUY'; // default BUY
    })(),
    bed:r.bed||0,bath:r.bath||0,area:Number(r.area)||0,
    land_area:Number(r.land_area)||0,
    floors:r.floors||0,floor_no:r.floor_no||0,
    parking:r.parking||0,
    furniture:r.furniture||'',
    pets_allowed:r.pets_allowed||false,
    appliances:apps,
    desc:r.description||r.desc,
    isNew:r.is_new||false,isRec:r.is_rec||false,
    agentId:r.agent_id,createdAt:r.created_at,
    status:r.status||'approved',
    adminNote:r.admin_note||'',
    photos:ph,
    // 🖼️ [IMG-360] panorama/virtual tour image path
    panorama_url: r.panorama_url ? sbImg(r.panorama_url) : (r.virtual_tour_url ? sbImg(r.virtual_tour_url) : null),
    nearby_places:r.nearby_places,
    deposit:r.deposit,advance_payment:r.advance_payment,
    electric_rate:r.electric_rate,water_rate:r.water_rate,
    service_fee:r.service_fee,
    furniture_items:r.furniture_items,amenities:r.amenities,
    invest_tag:r.invest_tag||'',
    yield_pct:Number(r.yield_pct)||0,
    below_market_pct:Number(r.below_market_pct)||0,
    discount_flag:r.discount_flag||false,
    lease_terms:r.lease_terms||null,
    min_lease_months:r.min_lease_months||r.min_lease||null,
    rent_duration:r.rent_duration||r.rentDuration||null
  };
}
function mapAgent(r){
  // 🖼️ [IMG-AGENT] แปลง avatar_url และ photos → Supabase Storage URL
  // DB เก็บเป็น path เช่น "agents/a1/avatar.webp" หรือ URL เต็มก็ได้
  return {
    id:r.id,name:r.name,title:r.title,phone:r.phone,
    lineId:r.line_id,
    initials:r.initials||r.name.substring(0,2),
    color:r.color||'#7c6fcd',
    avatar_url: r.avatar_url ? sbImg(r.avatar_url) : '',
    photos: Array.isArray(r.photos) ? r.photos.filter(Boolean).map(p=>sbImg(p)) : [],
    rating:Number(r.rating)||4.5,
    propIds:r.prop_ids||[],
    deals:Number(r.deals)||0,
    bio:r.bio
  };
}
function mapPort(r){
  // 🖼️ [IMG-PORTFOLIO] แปลง photos → Supabase Storage URL
  // DB เก็บเป็น path เช่น "portfolio/pt1/photo_0.webp" หรือ URL เต็มก็ได้
  const rawPhotos=Array.isArray(r.photos)?r.photos:(r.photos?[r.photos]:[]);
  const ph=rawPhotos.filter(Boolean).map(p=>sbImg(p));
  const p0=r.photo ? sbImg(r.photo) : (ph[0]||'');
  return {id:r.id,title:r.title,type:r.type,price:Number(r.price),status:r.status,location:r.location,date:r.date,review:r.review,photo:p0,photos:ph.length?ph:(p0?[p0]:[])};
}

async function loadData(){
  loading(true);
  // Show skeleton placeholders — only on grids that are visible first
  ['all-grid','rec-grid'].forEach(gid=>renderGrid(gid,[],true));

  // ── รอให้ Supabase JS โหลดเสร็จก่อน (async script) ──────────────
  if(typeof window.supabase === 'undefined'){
    await new Promise(resolve=>{
      const t = setInterval(()=>{ if(typeof window.supabase!=='undefined'){ clearInterval(t); resolve(); } }, 50);
      setTimeout(()=>{ clearInterval(t); resolve(); }, 3000); // timeout 3s
    });
  }

  const hasSB = initSB();
  let useMock = false;

  if(hasSB){
    try{
      // ── PHASE 1: โหลด properties ทั้งหมดก่อน — SELECT * เพื่อไม่ให้ข้อมูลหาย ──────────
      // ใช้ .range() เพื่อดึงครบทุก row แม้ Supabase project มี custom row limit ต่ำ
      const p = await sb.from('properties')
        .select('*')
        .eq('status','approved')      // public: เห็นเฉพาะ approved
        .order('created_at',{ascending:false})
        .range(0, 999); // ดึงสูงสุด 1,000 rows — ป้องกัน PostgREST default limit ตัด
      if(p.data){ props = p.data.map(mapProp); console.log(`✅ Properties loaded: ${props.length}`); }
      else { if(p.error) console.error('[properties]',p.error); }

      if(!props.length){
        console.warn('No properties from Supabase, using mock');
        useMock = true;
      }

      if(!useMock){
        // แสดงหน้าทันทีด้วย properties ที่ได้มา
        agents = MOCK.agents; port = MOCK.port; services = MOCK.services; blogs = MOCK.blogs;
        agents.forEach(a=>{a.propIds=props.filter(p=>p.agentId===a.id).map(p=>p.id);});
        afterLoad();
        loading(false);

        // ── PHASE 2: โหลด agents/portfolio/services/blogs แบบ background (ไม่บล็อก UI) ──
        setTimeout(async ()=>{
          try{
            const [a, po, s, b] = await Promise.all([
              sb.from('agents').select('*').eq('is_active',true),
              sb.from('portfolio').select('*').order('created_at',{ascending:false}),
              sb.from('services').select('*').eq('is_active',true).order('sort_order',{ascending:true}),
              sb.from('blogs').select('*').eq('is_published',true).order('sort_order',{ascending:true})
            ]);
            let updated = false;
            if(a.data && a.data.length){ agents = a.data.map(mapAgent); agents.forEach(ag=>{ag.propIds=props.filter(p=>p.agentId===ag.id).map(p=>p.id);}); updated=true; console.log(`✅ Agents loaded: ${agents.length}`); }
            if(po.data && po.data.length){ port = po.data.map(mapPort); updated=true; }
            if(s.data && s.data.length){ services = s.data; updated=true; }
            if(b.data && b.data.length){
              blogs = b.data.map(blog => {
                const rawPhotos = Array.isArray(blog.photos) ? blog.photos : (blog.photos ? [blog.photos] : []);
                const coverPath = blog.cover_image || blog.cover || '';
                const allPhotos = coverPath ? [coverPath, ...rawPhotos] : rawPhotos;
                return { ...blog, photos: [...new Set(allPhotos)].filter(Boolean).map(p => sbImg(p)) };
              });
              updated=true;
            }
            // re-render sections ที่เกี่ยวข้องในหน้าหลัก
            if(updated){
              if(typeof renderServices==='function') renderServices();
              if(typeof renderBlogs==='function') renderBlogs();
              if(typeof renderHomePortfolio==='function') renderHomePortfolio();
              if(typeof renderFavDropdown==='function') renderFavDropdown();
              renderRecCarousel && renderRecCarousel();
              // sync ตัวเลข stats ทั้งหมดด้วยข้อมูลจริงจาก Supabase
              if(typeof syncAllStats==='function') syncAllStats();
              // ── re-render หน้าผลงาน ถ้า active อยู่ — ให้แน่ใจว่าใช้ข้อมูลจริง ไม่ใช่ mock ──
              if(document.getElementById('page-portfolio')?.classList.contains('active') && typeof renderPortfolio==='function'){
                renderPortfolio('all');
              }
              // ── re-render หน้าตัวแทน ถ้า active อยู่ — ให้แน่ใจว่าใช้ข้อมูลจริง ไม่ใช่ mock ──
              if(document.getElementById('page-agents')?.classList.contains('active') && typeof renderAgents==='function'){
                renderAgents();
                // อัปเดต stat counters ด้วยข้อมูลจริง
                const _totalClosed = port.filter(p=>p.status==='SOLD'||p.status==='RENTED').length;
                if(typeof animateCounter==='function'){
                  animateCounter(document.getElementById('ag-listing-cnt'), props.length);
                  animateCounter(document.getElementById('ag-sale-cnt'),    _totalClosed);
                  animateCounter(document.getElementById('ag-agent-cnt'),   agents.length);
                }
              }
            }
            // โหลด legal pages แบบ background
            loadLegalPages().catch(e=>console.warn('[loadLegalPages]',e));
            console.log('✅ Background data loaded');
          } catch(e){ console.warn('[background load]',e); }
        }, 400); // เริ่ม background load หลัง 400ms (ให้ first render เสร็จก่อน)
        return; // ออกจาก loadData — afterLoad ถูกเรียกแล้ว
      }
    } catch(e){ console.error('[loadData error]',e); useMock=true; }
  } else { useMock=true; }

  if(useMock){
    console.warn('⚠️ Using mock data — ตั้งค่า SUPABASE_URL และ SUPABASE_KEY ใน CONFIG');
    props = MOCK.props; agents = MOCK.agents; port = MOCK.port; services = MOCK.services; blogs = MOCK.blogs;
    agents.forEach(a => { a.propIds = props.filter(p => p.agentId === a.id).map(p => p.id); });
  }
  afterLoad();
}
// ── syncAllStats: อัปเดตตัวเลข stats ทั้งหมดจากข้อมูลจริง ──────────────
function syncAllStats(){
  // คำนวณจากข้อมูลจริงใน memory (props, agents, port)
  const soldCount   = port.filter(p=>p.status==='SOLD').length;
  const rentCount   = port.filter(p=>p.status==='RENTED').length;
  const happyCount  = soldCount + rentCount;   // ลูกค้าพึงพอใจ = SOLD + RENTED รวมกัน
  const propCount   = props.length;
  const agentCount  = agents.length;
  const totalClosed = happyCount;              // ปิดดีลแล้ว = SOLD + RENTED

  // ── หน้าหลัก: Hero stat counters (อัปเดต data-target AND animate .suf-num) ──
  const heroCounters = document.querySelectorAll('#hero-stat-counters .stat-counter-num[data-target]');
  const heroVals = [propCount, agentCount, totalClosed];
  heroCounters.forEach((wrapper, i) => {
    const val = heroVals[i];
    if(val === undefined) return;
    wrapper.dataset.target = String(val);
    const numEl = wrapper.querySelector('.suf-num');
    if(numEl) animateCounter(numEl, val, 900);
  });

  // ── หน้าผลงาน: Portfolio stat counters ──
  // fallback ใช้ 0 — ไม่แสดงตัวเลข mock เมื่อข้อมูลจริงยังไม่พร้อม
  const soldEl  = document.getElementById('sold-cnt');
  const rentEl  = document.getElementById('rent-cnt');
  const happyEl = document.getElementById('happy-cnt');
  if(soldEl)  { soldEl.dataset.target  = String(soldCount);  animateCounter(soldEl,  soldCount,  900); }
  if(rentEl)  { rentEl.dataset.target  = String(rentCount);  animateCounter(rentEl,  rentCount,  900); }
  if(happyEl) { happyEl.dataset.target = String(happyCount); animateCounter(happyEl, happyCount, 900); }

  // ── หน้าตัวแทน: Agent stat counters (สอดคล้องกับ showPage('agents')) ──
  // ag-listing-cnt = จำนวนประกาศทั้งหมด (props.length)
  // ag-sale-cnt    = ปิดดีลแล้ว (totalClosed = SOLD+RENTED) ← สอดคล้องกับหน้าหลักและผลงาน
  // ag-agent-cnt   = จำนวนตัวแทน (agents.length)
  const agListEl  = document.getElementById('ag-listing-cnt');
  const agSaleEl  = document.getElementById('ag-sale-cnt');
  const agAgentEl = document.getElementById('ag-agent-cnt');
  if(agListEl)  animateCounter(agListEl,  propCount,   900);
  if(agSaleEl)  animateCounter(agSaleEl,  totalClosed, 900);
  if(agAgentEl) animateCounter(agAgentEl, agentCount,  900);

  console.log(`[syncAllStats] props=${propCount} agents=${agentCount} sold=${soldCount} rented=${rentCount} happy=${happyCount} totalClosed=${totalClosed}`);
}
function afterLoad(){
  // ── Safety: ถ้า props ว่างให้ใช้ MOCK ทันที ──────────────────────
  if(!props.length){
    console.warn('⚠️ afterLoad: props ว่าง — ใช้ MOCK data');
    props = MOCK.props; agents = MOCK.agents; port = MOCK.port;
    services = MOCK.services; blogs = MOCK.blogs;
    agents.forEach(a=>{ a.propIds=props.filter(p=>p.agentId===a.id).map(p=>p.id); });
  }
  // ── Flag: ข้อมูลพร้อมแล้ว — ให้ IntersectionObserver ใช้ syncAllStats() แทน mock ──
  window._dataReady = true;
  filtered = [...props];
  allFiltered = [...props];

  // ── sync hero stat counters ─────────────────────────────────────
  syncAllStats();

  loadSystemImages();
  renderFavDropdown();
  populateProvinceSelect();
  initLocSearch();
  initAutocomplete();
  initListingsAutocomplete();

  // ── render home grids ก่อนเป็นอันดับแรก ────────────────────────────
  _renderHomeGrids();

  loading(false);

  // ── Auth: register listener และ check session ทันที — ต้องทำก่อน idle ──
  // initAuthListener() ต้อง register ก่อนที่ Supabase จะ process OAuth hash
  // ถ้าวางใน idle callback อาจช้าเกินไปและ SIGNED_IN event หายไป
  if(sb){ initAuthListener(); checkAuth(); }

  // ── defer secondary sections — ไม่บล็อก first paint ──────────────
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 100));
  idle(()=>{
    renderServices();
    renderBlogs();
    renderGalleryCarousel();
    renderHomePortfolio();
    setTimeout(()=>{ initHGallerySwipe('new-track-wrap'); initHGallerySwipe('osrv-track-wrap'); }, 200);
  });

  // ── listings page init ───────────────────────────────────────────
  // ── init listings base data จาก props ทันที ─────────────────────
  const _lpAll = props.length ? [...props] :
                 (typeof MOCK!=='undefined' ? [...MOCK.props] : []);
  _listingsBaseData = _lpAll;
  _listingsData = sortListings([..._lpAll], 'default');
  _listingsTxFilter = 'ALL';
  _listingsCurPage = 1;
  if(typeof _populateListingsProvince === 'function') _populateListingsProvince();
  if(typeof _updateListingsTxTabs === 'function') _updateListingsTxTabs('ALL');
  // SEO sidebar: defer ไว้ทีหลัง ไม่บล็อก listings grid
  const _idleQ = window.requestIdleCallback || (cb=>setTimeout(cb,300));
  _idleQ(()=>{ if(typeof renderListingsSeoSidebar === 'function') renderListingsSeoSidebar(); window._lsSeoSidebarRendered = true; });
  // Refresh interactive map if open
  if(typeof mdMapRefreshMarkers === 'function' && _mdMapInitDone) {
    setTimeout(mdMapRefreshMarkers, 100);
  }
  // ── render listings ถ้าหน้านั้น active อยู่ ──────────────────────
  window._pendingListingsInit = false;
  window._listingsDataReady = true;

  // render page ที่ถูกต้องหลังข้อมูลโหลดเสร็จ
  setTimeout(function() {
    var sectionMap = {
      '/listings': 'listings', '/agents': 'agents',
      '/portfolio': 'portfolio', '/favorites': 'favorites',
    };
    var targetPage = sectionMap[location.pathname];
    var ap = document.querySelector('.page.active');

    if(ap && ap.id === 'page-listings') {
      // หน้า listings active อยู่แล้ว → render ทันที
      if(typeof renderListingsPage === 'function') renderListingsPage();
    } else if(window._pendingListingsRender) {
      // showPage('listings') ถูกเรียกก่อนข้อมูลพร้อม → render ตอนนี้
      window._pendingListingsRender = false;
      if(typeof renderListingsPage === 'function') renderListingsPage();
    } else if(window._pendingPortfolioRender) {
      // showPage('portfolio') ถูกเรียกก่อนข้อมูลพร้อม → render ตอนนี้
      window._pendingPortfolioRender = false;
      if(typeof renderPortfolio === 'function') {
        renderPortfolio('all');
        setTimeout(()=>{ if(typeof applyLang==='function') applyLang(); }, 30);
      }
    } else if(targetPage) {
      if(typeof _silentShowPage === 'function') {
        _silentShowPage(targetPage);
      }
    }
    window._pendingListingsRender = false;
  }, 50);
}

// ── แสดงการ์ดหน้าแรก โดยตรงจาก props ไม่ผ่าน filter ─────────────
function _renderHomeGrids(){
  const all = props.length ? [...props] : (typeof MOCK!=='undefined' ? [...MOCK.props] : []);
  if(!all.length){ console.warn('_renderHomeGrids: ไม่มีข้อมูล'); return; }

  // all-grid: แสดง 16 รายการต่อหน้า พร้อม pagination
  _renderHomeAllGrid(all);

  // rec-grid: ยอดนิยม (ถ้าไม่มี flag isRec ให้แสดง 8 แรก)
  const recList = all.filter(p=>p.isRec);
  renderGrid('rec-grid', recList.length ? recList.slice(0,8) : all.slice(0,8));

  // new-track: มาใหม่ (ถ้าไม่มี flag isNew ให้แสดง 10 แรก)
  const newList = all.filter(p=>p.isNew);
  renderNewGallery(newList.length ? newList : all.slice(0,10));

  // update counters
  const rc = document.getElementById('res-count');
  if(rc) rc.textContent = `พบ ${all.length} รายการ`;

  // sync filtered/allFiltered ด้วย ป้องกัน stale state
  filtered = [...all];
  allFiltered = [...all];

  // sync listings base data ถ้ายังไม่มี
  if(typeof _listingsBaseData !== 'undefined' && !_listingsBaseData.length){
    _listingsBaseData = [...all];
    _listingsData = typeof sortListings === 'function' ? sortListings([...all],'default') : [...all];
  }
}

// ── ราคา preset กระชับ (ซื้อ-ขาย และ เช่า) ──
// ── ชุดราคาแบบรวม (ใช้กับทุก dropdown — ไม่แบ่งซื้อ/เช่า) ──
const PRICE_UNIFIED_OPTS = [
  {v:5000,      label:'5,000'},
  {v:10000,     label:'10,000'},
  {v:15000,     label:'15,000'},
  {v:20000,     label:'20,000'},
  {v:25000,     label:'25,000'},
  {v:30000,     label:'30,000'},
  {v:35000,     label:'35,000'},
  {v:40000,     label:'40,000'},
  {v:45000,     label:'45,000'},
  {v:50000,     label:'50,000'},
  {v:60000,     label:'60,000'},
  {v:70000,     label:'70,000'},
  {v:80000,     label:'80,000'},
  {v:90000,     label:'90,000'},
  {v:100000,    label:'100K'},
  {v:150000,    label:'150K'},
  {v:200000,    label:'200K'},
  {v:300000,    label:'300K'},
  {v:400000,    label:'400K'},
  {v:500000,    label:'500K'},
  {v:600000,    label:'600K'},
  {v:700000,    label:'700K'},
  {v:800000,    label:'800K'},
  {v:900000,    label:'900K'},
  {v:1000000,   label:'1M'},
  {v:2000000,   label:'2M'},
  {v:3000000,   label:'3M'},
  {v:4000000,   label:'4M'},
  {v:5000000,   label:'5M'},
  {v:6000000,   label:'6M'},
  {v:7000000,   label:'7M'},
  {v:8000000,   label:'8M'},
  {v:9000000,   label:'9M'},
  {v:10000000,  label:'10M'},
  {v:15000000,  label:'15M'},
  {v:20000000,  label:'20M'},
  {v:25000000,  label:'25M'},
  {v:30000000,  label:'30M'},
  {v:40000000,  label:'40M'},
  {v:50000000,  label:'50M'},
  {v:60000000,  label:'60M'},
  {v:70000000,  label:'70M'},
  {v:80000000,  label:'80M'},
  {v:90000000,  label:'90M'},
  {v:100000000, label:'100M'},
];
// compat aliases
const PRICE_BUY_OPTS = PRICE_UNIFIED_OPTS;
const PRICE_RENT_OPTS = PRICE_UNIFIED_OPTS;
// compat: PRICE_OPTS ยังใช้สำหรับ logic อื่นที่อ้างถึง
const PRICE_OPTS=(()=>{const a=[0];for(let v=5000;v<=100000;v+=5000)a.push(v);for(let v=150000;v<=1000000;v+=50000)a.push(v);for(let v=2000000;v<=10000000;v+=1000000)a.push(v);for(let v=20000000;v<=100000000;v+=10000000)a.push(v);for(let v=200000000;v<=1000000000;v+=100000000)a.push(v);return a;})();
function fmtOpt(v){return v===0?ui('dd.price.unlim'):v>=1e6?(v/1e6).toFixed(v%1e6===0?0:1)+' M฿':v>=1000?v/1000+'K':v.toLocaleString()+(_lang==='en'?' Baht':_lang==='cn'?' 泰铢':_lang==='ja'?' バーツ':' บาท');}
function _buildPriceOpts(list, addUnlim) {
  // min dropdown: เริ่มด้วย "ราคาต่ำสุด" (v=0), max dropdown: ลงท้ายด้วย "ราคาสูงสุด" (v=999000000)
  if(addUnlim) {
    // max dropdown
    return `<option value="999000000">${(typeof ui==='function'?ui('sf.max.label'):'ราคาสูงสุด')}</option>`
      + list.map(o=>`<option value="${o.v}">${o.label}</option>`).join('');
  } else {
    // min dropdown
    return `<option value="0">${(typeof ui==='function'?ui('sf.min.label'):'ราคาต่ำสุด')}</option>`
      + list.map(o=>`<option value="${o.v}">${o.label}</option>`).join('');
  }
}
function renderPriceOpts(){
  $('s-min').innerHTML = _buildPriceOpts(PRICE_UNIFIED_OPTS, false);
  $('s-max').innerHTML = _buildPriceOpts(PRICE_UNIFIED_OPTS, true);
  $('s-max').value = '999000000';
}
function _refreshPriceOpts(){
  // เรียกเมื่อ tx เปลี่ยน เพื่อ swap ชุดราคา
  const minEl = $('s-min'), maxEl = $('s-max');
  if(!minEl||!maxEl) return;
  const prevMin = minEl.value, prevMax = maxEl.value;
  renderPriceOpts();
  // คืนค่าเดิมถ้ายังมีใน list
  if([...minEl.options].some(o=>o.value===prevMin)) minEl.value = prevMin;
  if([...maxEl.options].some(o=>o.value===prevMax)) maxEl.value = prevMax;
}
function setPriceRange(val){ const parts=(val||'0|0').split('|'); const mn=parseInt(parts[0])||0; const mx=parseInt(parts[1])||999000000; $('s-min').value=String(mn); $('s-max').value=String(mx||999000000); }
function updatePriceMax(){const min=+$('s-min').value;$$('#s-max option').forEach(o=>{o.disabled=+o.value>0&&+o.value<min;});}

function setTx(t,el){ tx=t; $$('.tx-tab').forEach(b=>b.classList.remove('active')); el.classList.add('active'); const pb=$('price-buy-section'),pr=$('price-rent-section'); if(pb&&pr){ pb.style.display=t==='RENT'?'none':'block'; pr.style.display=t==='RENT'?'block':'none'; } if(typeof _refreshPriceOpts==='function') _refreshPriceOpts(); applyFilters().catch(console.error); const _heroStats=document.getElementById('hero-stat-counters'); if(_heroStats){ if(window._dataReady && typeof syncAllStats==='function'){ syncAllStats(); } else if(typeof animateStatCounters==='function'){ animateStatCounters(_heroStats.closest('.page')||document); } } }
function setCat(type,el){ curType=type; $$('.cat-card').forEach(c=>c.classList.remove('active')); if(el)el.classList.add('active'); applyFilters().catch(console.error); scrollToEl('all-sec'); }
function setCatNav(t){ showPage('home'); setTimeout(()=>{curType=t;applyFilters().catch(console.error);scrollToEl('all-sec');},100); }
function _syncTxTabs(newTx){
  tx=newTx;
  var tabs=$$('.tx-tab');
  tabs.forEach(function(b){ b.classList.remove('active'); });
  // tab[0] = ALL, tab[1] = BUY, tab[2] = RENT
  if(newTx==='ALL'&&tabs[0]) tabs[0].classList.add('active');
  if(newTx==='BUY'&&tabs[1]) tabs[1].classList.add('active');
  if(newTx==='RENT'&&tabs[2]) tabs[2].classList.add('active');
  var pb=$('price-buy-section'),pr=$('price-rent-section');
  if(pb&&pr){ pb.style.display=newTx==='RENT'?'none':'block'; pr.style.display=newTx==='RENT'?'block':'none'; }
}
function _resetFilterState(){
  // reset keyword
  var kw=$('s-kw'); if(kw){kw.value=''; var al=$('ac-list');if(al)al.style.display='none';}
  // reset price to full range
  $('s-min').value=0; $('s-max').value=999000000;
  // reset province
  var sp=$('s-prov'); if(sp) sp.value='';
  // reset type select
  var st=$('s-type'); if(st) st.value='';
  // reset curType
  curType='';
  // reset cat-card highlight
  $$('.cat-card').forEach(function(c,i){c.classList.toggle('active',i===0);});
}
function filterTypeDD(t){
  _closeHamburger(); closeAllDD();
  if(!$('page-home').classList.contains('active')) showPage('home');
  _syncTxTabs('BUY');
  // reset price + keyword ก่อน แล้วค่อย set ประเภทที่เลือก
  _resetFilterState();
  curType=t;
  var st=$('s-type'); if(st) st.value=t;
  applyFilters().catch(console.error);
  scrollToEl('all-sec');
}
function filterPriceDD(min,max,forceTx){
  _closeHamburger(); closeAllDD();
  if(!$('page-home').classList.contains('active')) showPage('home');
  if(forceTx) _syncTxTabs(forceTx);
  // reset type + keyword ก่อน แล้วค่อย set ราคาที่เลือก
  _resetFilterState();
  $('s-min').value=min; $('s-max').value=max;
  applyFilters().catch(console.error);
  scrollToEl('all-sec');
}
function filterRentDD(type,minRent,maxRent){
  _closeHamburger(); closeAllDD();
  if(!$('page-home').classList.contains('active')) showPage('home');
  _syncTxTabs('RENT');
  var sTx=$('s-tx'); if(sTx){ for(var i=0;i<sTx.options.length;i++){ if(sTx.options[i].value==='เช่า'||sTx.options[i].text==='เช่า'){ sTx.selectedIndex=i; break; } } }
  // reset state ก่อนทุกครั้ง
  _resetFilterState();
  if(type){ curType=type; var sType=$('s-type'); if(sType) sType.value=type; }
  if(typeof minRent==='number' && typeof maxRent==='number'){ $('s-min').value=minRent; $('s-max').value=maxRent; }
  applyFilters().catch(console.error);
  scrollToEl('all-sec');
}
const KW_TRANSLATE = {
  // English → Thai
  'house':'บ้านเดี่ยว','detached house':'บ้านเดี่ยว','single house':'บ้านเดี่ยว',
  'townhouse':'ทาวน์โฮม','town house':'ทาวน์โฮม','townhome':'ทาวน์โฮม',
  'condo':'คอนโด','condominium':'คอนโด','apartment':'คอนโด',
  'land':'ที่ดิน','plot':'ที่ดิน','land plot':'ที่ดิน',
  'villa':'วิลล่า','resort':'รีสอร์ท','hotel':'โรงแรม',
  'commercial':'อาคารพาณิชย์','shophouse':'อาคารพาณิชย์',
  'bangkok':'กรุงเทพ','bkk':'กรุงเทพ',
  'nonthaburi':'นนทบุรี','samut prakan':'สมุทรปราการ','pathum thani':'ปทุมธานี',
  'chonburi':'ชลบุรี','pattaya':'พัทยา','rayong':'ระยอง',
  'phuket':'ภูเก็ต','surat thani':'สุราษฎร์ธานี',
  'chiang mai':'เชียงใหม่','chiang rai':'เชียงราย',
  'khon kaen':'ขอนแก่น','korat':'นครราชสีมา','nakhon ratchasima':'นครราชสีมา',
  'buy':'ซื้อ','rent':'เช่า','sale':'ขาย',
  'new':'มาใหม่','recommended':'แนะนำ',
  // Chinese → Thai
  '公寓':'คอนโด','别墅':'วิลล่า','独立屋':'บ้านเดี่ยว','联排别墅':'ทาวน์โฮม','土地':'ที่ดิน',
  '曼谷':'กรุงเทพ','普吉':'ภูเก็ต','清迈':'เชียงใหม่','芭提雅':'พัทยา',
  // Japanese → Thai
  'コンドミニアム':'คอนโด','一戸建て':'บ้านเดี่ยว','タウンハウス':'ทาวน์โฮม','土地':'ที่ดิน',
  'バンコク':'กรุงเทพ','プーケット':'ภูเก็ต','チェンマイ':'เชียงใหม่','パタヤ':'พัทยา',
};
function translateKeyword(kw) {
  if (!kw) return kw;
  const lower = kw.toLowerCase().trim();
  // Check exact match first
  if (KW_TRANSLATE[lower]) return KW_TRANSLATE[lower];
  // Check partial match
  for (const [en, th] of Object.entries(KW_TRANSLATE)) {
    if (lower.includes(en) || en.includes(lower)) return th;
  }
  return kw; // return original if no translation
}

function doSearch(){ curType=($('s-type')?.value||'').trim(); $$('.cat-card').forEach((c,i)=>c.classList.toggle('active',i===0)); applyFilters().catch(console.error); scrollToEl('all-sec');
  // GA4: search event
  try{ if(typeof trackEvent==='function'){ const _kw=($('s-kw')?.value||'').trim(); const _tx=($('s-tx')?.value||$('tx-tab.active')?.dataset?.tx||''); const _type=($('s-type')?.value||''); const _prov=($('s-prov')?.value||''); if(_kw||_type||_prov) trackEvent('search',{search_term:_kw,tx:_tx,property_type:_type,province:_prov,source:'home'}); } }catch(e){}
}
async function applyFilters(){
  const kw=($('s-kw')?.value||'').trim();
  const tp=curType||$('s-type')?.value||'';
  // อ่านจาก _locProv/_locDist (global state) โดยตรง เพื่อหลีกเลี่ยง
  // hidden select dropping value เมื่อไม่มี matching option (เช่น กรุงเทพฯ)
  const pv=(typeof _locProv!=='undefined'&&_locProv!==null)?_locProv:($('s-prov')?.value||'');
  const dv=(typeof _locDist!=='undefined'&&_locDist!==null)?_locDist.trim():($('s-dist')?.value||'').trim();
  const min=+$('s-min')?.value||0;
  const max=+$('s-max')?.value||999e6;

  // ── Translate keyword if searching in non-Thai language ─────────
  const kwTranslated = translateKeyword(kw);
  const kwlOrig = kw.toLowerCase();
  const kwlTrans = kwTranslated.toLowerCase();

  // ── ถ้าไม่มีเงื่อนไขใดเลย → แสดงทั้งหมด (ไม่ต้องกรอง) ───────────
  // ถ้าไม่มี filter ใดเลย (รวมถึง tx='ALL') → แสดงทั้งหมดทันที
  const hasAnyFilter = kw || tp || pv || dv || min>0 || max<999e5 || (tx && tx!=='ALL');
  if(!hasAnyFilter){
    _renderHomeGrids();
    return;
  }

  // ── Type alias map: select value → accepted p.type values ──────
  const _TYPE_ALIAS_MAP = {
    // ที่อยู่อาศัย
    'คอนโด':        ['คอนโด','คอนโดมิเนียม','Condominium','condominium','Condo','condo'],
    'ทาวน์โฮม':     ['ทาวน์โฮม','ทาวน์โฮ','ทาวน์เฮาส์','ทาวน์เฮ้าส์','townhome','townhouse'],
    'บ้านเดี่ยว':   ['บ้านเดี่ยว','บ้านแฝด','บ้านมือสอง','บ้านหรู','บ้านตากอากาศ','โฮมออฟฟิศ','บ้าน'],
    // ที่ดิน — รวม sub-type ทั้งหมดเข้าด้วยกัน
    'ที่ดิน':        ['ที่ดิน','ที่ดินเปล่า','ที่ดินจัดสรร','ที่ดินเกษตร','ที่ดินพาณิชย์','ที่ดินอุตสาหกรรม','ที่ดินติดถนนใหญ่','ที่ดินติดรถไฟฟ้า','ที่ดินติดทะเล','ที่ดิน EEC','ที่ดินลงทุน','ที่ดินโฉนด','ที่ดิน นส.3ก','ที่ดิน นส.3','ที่ดิน สปก'],
    // เชิงพาณิชย์
    'อาคารพาณิชย์': ['อาคารพาณิชย์','ตึกแถว','สำนักงาน','Office Building','Retail Space','Community Mall','โชว์รูม','ร้านค้า','คลินิก'],
    'วิลล่า':       ['วิลล่า','Villa','villa'],
    'รีสอร์ท':      ['รีสอร์ท','Resort','resort'],
    'โรงแรม':       ['โรงแรม','Hotel','hotel','โฮสเทล','Service Apartment'],
    // เชิงพาณิชย์เบ็ดเตล็ด
    'โกดัง':        ['โกดัง','โกดัง/โรงงาน','โรงงาน'],
  };
  const _acceptedTypes = tp ? (_TYPE_ALIAS_MAP[tp] || [tp]) : null;

  // ── Client-side filter (เร็ว ทำก่อน) ─────────────────────────────
  filtered=props.filter(p=>{
    if(tx!=='ALL' && p.tx!==tx) return false;
    if(_acceptedTypes && !_acceptedTypes.includes(p.type)) return false;
    // ── Province + District filter (ฟิลเตอร์จังหวัดก่อน อำเภอหลัง) ──────
    const _normStr = (s) => s.replace('มหานคร','').replace('ฯ','').trim();
    const _matchProv = () => {
      const pvL    = pv.toLowerCase();
      const pProv  = (p.province||'').toLowerCase();
      const pLoc   = (p.location||'').toLowerCase();
      const normPv   = _normStr(pvL);
      const normProv = _normStr(pProv);
      return pProv === pvL
        || pProv.includes(pvL) || pvL.includes(pProv)
        || normProv === normPv || normProv.includes(normPv) || normPv.includes(normProv)
        || pLoc.includes(pvL) || pLoc.includes(normPv);
    };
    // 1. ฟิลเตอร์จังหวัดก่อนเสมอ
    if(pv && !_matchProv()) return false;
    // 2. ฟิลเตอร์อำเภอ/เขต — ใช้ logic เดียวกับ popup modalAdvFilter (distHay)
    if(dv){
      const dvL = dv.toLowerCase();
      // ── รวม district + amphoe + location เป็น haystack เดียว (เหมือน popup) ──
      // popup ใช้: distHay = (district||'') + ' ' + (amphoe||'') + ' ' + (location||'')
      // ซึ่งครอบคลุมทั้ง: Supabase column, parsed district จาก location
      const distHay = ((p.district||'') + ' ' + (p.amphoe||'') + ' ' + (p.location||'')).toLowerCase();
      if(distHay.indexOf(dvL) === -1) return false;
    }
    if(kwlOrig){
      const titleL = p.title.toLowerCase();
      const locL = (p.location||'').toLowerCase();
      const provL = (p.province||'').toLowerCase();
      const descL = (p.desc||'').toLowerCase();
      const matchOrig = titleL.includes(kwlOrig)||locL.includes(kwlOrig)||provL.includes(kwlOrig)||descL.includes(kwlOrig);
      const matchTrans = kwlTrans!==kwlOrig && (titleL.includes(kwlTrans)||locL.includes(kwlTrans)||provL.includes(kwlTrans)||descL.includes(kwlTrans));
      if(!matchOrig && !matchTrans) return false;
    }
    if(p.price<min||p.price>max) return false;
    return true;
  });
  allFiltered = filtered;
  const rc=$('res-count');
  const resText=_lang==='en'?`Found ${filtered.length} listings`:_lang==='cn'?`找到 ${filtered.length} 个房源`:_lang==='ja'?`${filtered.length} 件見つかりました`:`พบ ${filtered.length} รายการ`;
  if(rc) rc.textContent=resText;

  // ── all-grid: แสดงผลตาม filter ────────────────────────────────
  _renderHomeAllGrid(filtered);

  // ── rec-grid: กรองตาม filter ──────────────────────────────────
  renderGrid('rec-grid',filtered.filter(p=>p.isRec).slice(0,8));

  // ── new-track: "มาใหม่ล่าสุด" — แสดงทั้งหมดเสมอ ไม่กรองตาม filter ──
  // (section นี้เป็น editorial/showcase ไม่ใช่ search result)
  const _allNew = props.filter(p=>p.isNew);
  renderNewGallery(_allNew.length ? _allNew : props.slice(0,10));

  // ── Server-side filter (sync หลัง client) ──────────────────────
  if(sb && props.length && props[0]?.id !== 'p1'){
    try{
      const data = await filterProperties({tx,type:tp,province:pv,district:dv,minPrice:min,maxPrice:max,keyword:kwTranslated});
      // อัปเดตเฉพาะเมื่อ server คืนผลมาจริง (ไม่ใช่ null/error)
      if(data!==null && Array.isArray(data)){
        let serverFiltered = data.map(mapProp);
        // ── ถ้ามี district filter → ต้อง re-apply client-side district filter บน server result ──
        // เพราะ Supabase อาจไม่มี district column หรือ filter ไม่ครบ
        if(dv && serverFiltered.length > 0){
          const dvLSrv = dv.toLowerCase();
          serverFiltered = serverFiltered.filter(function(p){
            const dHay = ((p.district||'') + ' ' + (p.amphoe||'') + ' ' + (p.location||'')).toLowerCase();
            return dHay.indexOf(dvLSrv) !== -1;
          });
        }
        // ใช้ผล server ถ้าได้ผลมา หรือถ้าไม่มีผล ให้คงค่า client-side ไว้
        if(serverFiltered.length > 0){
          filtered = serverFiltered;
          allFiltered = filtered;
          if(rc) rc.textContent=_lang==='en'?`Found ${filtered.length} listings`:_lang==='cn'?`找到 ${filtered.length} 个房源`:_lang==='ja'?`${filtered.length} 件見つかりました`:`พบ ${filtered.length} รายการ`;
          _renderHomeAllGrid(filtered);
          renderGrid('rec-grid',filtered.filter(p=>p.isRec).slice(0,8));
          // new-track ไม่อัปเดต — คงค่าเดิม (แสดงทั้งหมด)
        }
        // ถ้า server คืน [] → เก็บ client-side ที่แสดงอยู่แล้ว (ไม่ต้อง override)
      }
    } catch(e){ console.error('[applyFilters server]',e); }
  }
}

// ── Home all-grid pagination state ──────────────────────────────
window._homeAllData = [];
window._homeAllPage = 1;
const _HOME_ALL_PER = 16;

function _renderHomeAllPagination() {
  const total = window._homeAllData.length;
  const cur   = window._homeAllPage;
  const totalPages = Math.ceil(total / _HOME_ALL_PER);
  const pgWrap  = $('all-grid-pagination');
  const pgInfo  = $('all-pg-info');
  const pgCtrl  = $('all-pg-controls');
  if (!pgWrap) return;
  if (totalPages <= 1) { pgWrap.style.display = 'none'; return; }
  pgWrap.style.display = '';

  const startItem = (cur - 1) * _HOME_ALL_PER + 1;
  const endItem   = Math.min(cur * _HOME_ALL_PER, total);
  const langTh = (typeof _lang === 'undefined' || !_lang || _lang === 'th');
  const pgFirst = langTh ? 'หน้าแรก'    : _lang==='en'?'First':_lang==='cn'?'首页':'最初';
  const pgPrev  = langTh ? 'ก่อนหน้า'  : _lang==='en'?'Prev' :_lang==='cn'?'上一页':'前へ';
  const pgNext  = langTh ? 'ถัดไป'      : _lang==='en'?'Next' :_lang==='cn'?'下一页':'次へ';
  const pgLast  = langTh ? 'หน้าสุดท้าย': _lang==='en'?'Last' :_lang==='cn'?'末页':'最後';
  const ofTxt   = langTh ? 'จาก'       : _lang==='en'?'of'   :_lang==='cn'?'，共':'/';
  const itemTxt = langTh ? 'รายการ'    : _lang==='en'?'listings':_lang==='cn'?'个房源':'件';

  if (pgInfo) pgInfo.textContent = `${startItem.toLocaleString()}–${endItem.toLocaleString()} ${ofTxt} ${total.toLocaleString()} ${itemTxt}`;

  const pages = buildPageRange(cur, totalPages);
  let html = '';
  html += `<button class="pg-btn pg-first${cur===1?' disabled':''}" onclick="_homeAllGoPage(1)" ${cur===1?'disabled':''} title="${pgFirst}"><i class="fas fa-angle-double-left"></i> <span class="pg-label">${pgFirst}</span></button>`;
  html += `<button class="pg-btn pg-prev${cur===1?' disabled':''}" onclick="_homeAllGoPage(${cur-1})" ${cur===1?'disabled':''} title="${pgPrev}"><i class="fas fa-angle-left"></i></button>`;
  for (const p of pages) {
    if (p === '...') { html += '<span class="pg-ellipsis">…</span>'; }
    else { html += `<button class="pg-btn${p===cur?' active':''}" onclick="_homeAllGoPage(${p})">${p}</button>`; }
  }
  html += `<button class="pg-btn pg-next${cur===totalPages?' disabled':''}" onclick="_homeAllGoPage(${cur+1})" ${cur===totalPages?'disabled':''} title="${pgNext}"><i class="fas fa-angle-right"></i></button>`;
  html += `<button class="pg-btn pg-last${cur===totalPages?' disabled':''}" onclick="_homeAllGoPage(${totalPages})" ${cur===totalPages?'disabled':''} title="${pgLast}"><span class="pg-label">${pgLast}</span> <i class="fas fa-angle-double-right"></i></button>`;
  if (pgCtrl) pgCtrl.innerHTML = html;
}

function _homeAllGoPage(page) {
  const totalPages = Math.ceil(window._homeAllData.length / _HOME_ALL_PER);
  if (page < 1 || page > totalPages) return;
  window._homeAllPage = page;
  const start = (page - 1) * _HOME_ALL_PER;
  const slice = window._homeAllData.slice(start, start + _HOME_ALL_PER);
  const el = $('all-grid');
  if (el) { el.innerHTML = slice.map(propCard).join(''); setTimeout(initAllCardSwipes, 50); }
  _renderHomeAllPagination();
  scrollToEl('all-sec');
}

// ── Sort handler for home all-grid ──────────────────────────────
function homeAllGridSortChange(sel) {
  if (!window._homeAllData || !window._homeAllData.length) return;
  const sorted = (typeof sortListings === 'function') ? sortListings([...window._homeAllData], sel.value) : window._homeAllData;
  window._homeAllData = sorted;
  window._homeAllPage = 1;
  const slice = sorted.slice(0, _HOME_ALL_PER);
  const el = $('all-grid');
  if (el) { el.innerHTML = slice.map(propCard).join(''); setTimeout(initAllCardSwipes, 50); }
  _renderHomeAllPagination();
}

// ── helper: render all-grid พร้อม empty state แบบ professional ──
function _renderHomeAllGrid(list) {
  const el = $('all-grid');
  if (!el) return;
  if (list && list.length) {
    window._homeAllData = list;
    window._homeAllPage = 1;
    const slice = list.slice(0, _HOME_ALL_PER);
    el.innerHTML = slice.map(propCard).join('');
    setTimeout(initAllCardSwipes, 50);
    _renderHomeAllPagination();
    return;
  }
  // Empty state — สวยงาม มีปุ่ม LINE และ Reset
  const pgWrapE = $('all-grid-pagination'); if(pgWrapE) pgWrapE.style.display='none';
  const lang = (typeof _lang !== 'undefined' && _lang) ? _lang : 'th';
  const lineHref = (typeof C !== 'undefined' && C && C.LINE)
    ? 'https://line.me/R/ti/p/' + C.LINE
    : 'https://line.me/ti/p/@matchdoor';
  const t = {
    th:{ ico:'🔍', h:'ไม่พบทรัพย์ที่ตรงกับเงื่อนไข',
         sub:'ลองปรับเงื่อนไขการค้นหา หรือให้ทีมงานของเราช่วยหาทรัพย์ที่ใช่ให้คุณโดยตรง',
         cta:'📩 ฝากความต้องการซื้อ-เช่า ให้ทีมงานหาให้',
         reset:'🔄 ล้างการค้นหา' },
    en:{ ico:'🔍', h:'No listings match your criteria',
         sub:"Try adjusting your filters, or let our team find the perfect property for you.",
         cta:"📩 Leave your requirements — we'll find it for you",
         reset:'🔄 Reset search' },
    cn:{ ico:'🔍', h:'没有找到符合条件的房源',
         sub:'请尝试调整筛选条件，或让我们的团队为您寻找合适的房产。',
         cta:'📩 留下需求，让我们为您寻找',
         reset:'🔄 重置搜索' },
    ja:{ ico:'🔍', h:'条件に合う物件が見つかりません',
         sub:'検索条件を調整するか、担当チームに理想の物件を探してもらいましょう。',
         cta:'📩 ご要望を送る — スタッフが探します',
         reset:'🔄 検索をリセット' },
  };
  const m = t[lang] || t.th;
  el.innerHTML = `<div style="grid-column:1/-1;display:flex;justify-content:center;padding:20px 12px 40px">
    <div style="text-align:center;max-width:420px;width:100%">
      <div style="font-size:56px;margin-bottom:16px;line-height:1">${m.ico}</div>
      <p style="font-size:17px;font-weight:700;color:var(--tx);margin-bottom:10px">${m.h}</p>
      <p style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:28px">${m.sub}</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <a href="${lineHref}" target="_blank" rel="noopener"
           style="display:flex;align-items:center;justify-content:center;gap:10px;
                  background:#06C755;color:#fff;text-decoration:none;
                  border-radius:12px;padding:14px 20px;font-size:14px;font-weight:700;
                  box-shadow:0 4px 18px rgba(6,199,85,.38);transition:.2s"
           onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter=''">
          <i class="fab fa-line" style="font-size:20px"></i> ${m.cta}
        </a>
        <button onclick="resetSearch()"
           style="display:flex;align-items:center;justify-content:center;gap:8px;
                  background:var(--lt);color:var(--tx);
                  border:1.5px solid var(--bd);border-radius:12px;
                  padding:13px 20px;font-size:13px;font-weight:600;cursor:pointer;
                  transition:.2s"
           onmouseover="this.style.borderColor='var(--a)'" onmouseout="this.style.borderColor='var(--bd)'">
          ${m.reset}
        </button>
      </div>
    </div>
  </div>`;
}
function gotoNew(){ _closeHamburger(); closeAllDD(); _silentShowPage('home', true); setTimeout(()=>scrollToEl('new-sec'),50); }
function gotoRec(){ _closeHamburger(); closeAllDD(); _silentShowPage('home', true); setTimeout(()=>scrollToEl('rec-sec'),50); }
function gotoBlog(){ _closeHamburger(); closeAllDD(); _silentShowPage('home', true); setTimeout(()=>scrollToEl('blog-sec'),50); }
function gotoOtherSrv(){ _closeHamburger(); closeAllDD(); _silentShowPage('home', true); setTimeout(()=>scrollToEl('osrv-sec'),50); }
function quickSearch(kw){ _silentShowPage('home',true); const inp=document.getElementById('s-kw'); if(inp){inp.value=kw;} closeQsDDs(); closeQsSheet(); setTimeout(()=>{ doSearch(); setTimeout(()=>scrollToEl('all-sec'),80); },80); }
function quickProvSearch(prov){ showPage('home'); setTimeout(()=>{ _locProv=prov; _locDist=''; _locLevel='province'; locDrillCommit(); scrollToEl('all-sec'); },100); }
// Map section names to URL paths and SEO metadata
const PAGE_ROUTES = {
  'listings':   { path: '/listings',   title: 'ประกาศอสังหาฯทั้งหมด — บ้าน คอนโด ที่ดิน ใกล้ BTS MRT กรุงเทพ | Matchdoor', desc: 'ค้นหาบ้าน คอนโด ทาวน์โฮม ที่ดิน ใกล้ BTS MRT ทุกสาย กรุงเทพ ทุกระดับราคา ปรึกษาฟรี' },
  'home':       { path: '/',           title: 'Matchdoor — ขายบ้าน คอนโด ที่ดิน ใกล้ BTS MRT กรุงเทพ ราคาดี',            desc: 'Matchdoor ซื้อขายเช่าบ้าน คอนโด ที่ดิน ทุกประเภท กรุงเทพ ใกล้ BTS สุขุมวิท MRT รัชดา พระราม9 ปรึกษาฟรี ไม่มีค่านายหน้า' },
  'agents':     { path: '/agents',     title: 'ทีมตัวแทนอสังหาฯมืออาชีพ กรุงเทพ — Matchdoor',           desc: 'ทีมตัวแทนอสังหาริมทรัพย์มืออาชีพ กรุงเทพ ใกล้ BTS MRT พร้อมให้คำปรึกษาด้านการซื้อขายเช่าทุกประเภท ฟรี' },
  'portfolio':  { path: '/portfolio',  title: 'ผลงานปิดดีลอสังหาฯ กรุงเทพ — Matchdoor',                     desc: 'ผลงานอสังหาริมทรัพย์กรุงเทพที่ Matchdoor ปิดดีลสำเร็จ บ้าน คอนโด ใกล้ BTS MRT พร้อมรีวิวจากลูกค้าจริง' },
  'favorites':  { path: '/favorites',  title: 'รายการโปรดอสังหาฯ — Matchdoor',                                       desc: 'อสังหาริมทรัพย์กรุงเทพที่คุณบันทึกไว้ใน Matchdoor บ้าน คอนโด ที่ดิน ใกล้ BTS MRT' },
  'careers':    { path: '/careers',    title: 'สมัครงานตัวแทนอสังหาฯ กรุงเทพ — Matchdoor',                desc: 'เปิดรับสมัครตัวแทนอสังหาริมทรัพย์กรุงเทพ รายได้ดี ทำงานอิสระ ร่วมทีม Matchdoor' },
  'my-account': { path: '/my-account', title: 'บัญชีของฉัน — Matchdoor',                                 desc: 'จัดการโปรไฟล์ รายการโปรด และประกาศของคุณบน Matchdoor' },
};

// Section → filter context for "buy" / "rent" sub-pages
const SECTION_TX_MAP = { 'buy': 'BUY', 'rent': 'RENT' };

let _routerReady = false; // prevent pushState before data loads
window._listingsDataReady = false; // false จนกว่า afterLoad() จะโหลดข้อมูลเสร็จ

function _updateMeta(title, desc, url) {
  document.title = title;
  const mDesc = document.querySelector('meta[name="description"]');
  if (mDesc) mDesc.content = desc;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = title;
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = desc;
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = url || location.href;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = url || location.href;
}

function _injectBreadcrumbSchema(items) {
  let script = document.getElementById('breadcrumb-jsonld');
  if(!script){ script = document.createElement('script'); script.type='application/ld+json'; script.id='breadcrumb-jsonld'; document.head.appendChild(script); }
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i+1,
      "name": item.name,
      "item": 'https://matchdoor.co' + item.path
    }))
  });
}
function _pushRoute(path, state = {}) {
  if (!_routerReady) return;
  const fullUrl = location.origin + path;
  if (location.pathname + location.search + location.hash !== path) {
    history.pushState(state, '', fullUrl);
  }
}

// Called when modal opens — update URL to /property/:id
function _openPropertyUrl(propId) {
  const p = props.find(x => String(x.id) === String(propId));
  if (!p || !_routerReady) return;
  const slug = p.title
    .toLowerCase()
    .replace(/[^ก-๙a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const path = '/property/' + propId + (slug ? '-' + slug : '');
  const siteBase = 'https://matchdoor.co';
  const transitKw = (p.bts ? ' BTS '+p.bts : '') + (p.mrt ? ' MRT '+p.mrt : '');
  const title = p.title + ' ' + (p.tx==='RENT'?'ให้เช่า':'ขาย') + ' ' + p.type + ' ' + (p.location||'') + (p.province?' '+p.province:'') + transitKw + ' — Matchdoor';
  const desc = (p.desc||'').slice(0,140) || `${p.type}${p.tx==='RENT'?' ให้เช่า':' ขาย'} ${p.location||''} ${p.province||'กรุงเทพ'}${transitKw} ราคา ${(p.price/1e6).toFixed(1)}ล้านบาท — Matchdoor`;
  _updateMeta(title, desc, siteBase + path);
  _pushRoute(path, { type: 'property', id: String(propId) });
  // Inject Property JSON-LD for this listing
  let ldScript = document.getElementById('prop-jsonld');
  if (!ldScript) { ldScript = document.createElement('script'); ldScript.type = 'application/ld+json'; ldScript.id = 'prop-jsonld'; document.head.appendChild(ldScript); }
  const typeToSchema = {
    'คอนโด': 'Apartment', 'บ้านเดี่ยว': 'SingleFamilyResidence',
    'ทาวน์โฮม': 'Townhouse', 'ทาวน์เฮาส์': 'Townhouse',
    'วิลล่า': 'SingleFamilyResidence', 'บ้านแฝด': 'SingleFamilyResidence',
    'ที่ดิน': 'LandForm', 'อาคารพาณิชย์': 'LocalBusiness',
    'รีสอร์ท': 'LodgingBusiness', 'โรงแรม': 'Hotel', 'อพาร์ตเมนต์': 'ApartmentComplex'
  };
  const ldData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": siteBase + path,
    "name": p.title,
    "description": desc,
    "url": siteBase + path,
    "image": p.photos?.[0] ? {
      "@type": "ImageObject",
      "url": p.photos[0],
      "contentUrl": p.photos[0]
    } : undefined,
    "offers": {
      "@type": "Offer",
      "price": p.price,
      "priceCurrency": "THB",
      "availability": "https://schema.org/InStock",
      "businessFunction": p.tx === 'RENT' ? "https://schema.org/LeaseOut" : "https://schema.org/Sell",
      "seller": {
        "@type": "RealEstateAgent",
        "name": "Matchdoor",
        "url": "https://matchdoor.co"
      }
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": p.location || '',
      "addressLocality": p.location || '',
      "addressRegion": p.province || 'กรุงเทพฯ',
      "addressCountry": "TH"
    },
    "floorSize": p.area > 0 ? {"@type": "QuantitativeValue", "value": p.area, "unitCode": "MTK"} : undefined,
    "numberOfRooms": p.bed > 0 ? p.bed : undefined,
    "numberOfBathroomsTotal": p.bath > 0 ? p.bath : undefined,
    "amenityFeature": p.amenities ? p.amenities.map(a => ({"@type": "LocationFeatureSpecification", "name": a, "value": true})) : undefined,
    "containedInPlace": {
      "@type": "City",
      "name": p.province || 'กรุงเทพฯ',
      "containedInPlace": {"@type": "Country", "name": "ประเทศไทย"}
    }
  };
  // Clean undefined fields
  Object.keys(ldData).forEach(k => ldData[k] === undefined && delete ldData[k]);
  if(ldData.offers) Object.keys(ldData.offers).forEach(k => ldData.offers[k] === undefined && delete ldData.offers[k]);
  ldScript.textContent = JSON.stringify(ldData);
}

// Called when modal closes — restore previous section URL
function _closePropertyUrl() {
  if (!_routerReady) return;
  const cur = history.state;
  if (cur && cur.type === 'property') {
    // ── FIX: ใช้ replaceState แทน history.back() ──
    // history.back() ทำให้ popstate fire → _silentShowPage('home') เสมอ
    // ทำให้ refresh แล้วกลับหน้า home แทนที่จะอยู่หน้าเดิม
    const prevPage = window._pageBeforeModal || 'home';
    const route = PAGE_ROUTES[prevPage] || PAGE_ROUTES['home'];
    const path = route ? route.path : '/';
    history.replaceState({ type: 'page', name: prevPage }, '', location.origin + path);
    // อัพเดต meta กลับเป็น page เดิม
    if (route) _updateMeta(route.title, route.desc, 'https://matchdoor.co' + path);
  }
}

// Handle browser Back/Forward
window.addEventListener('popstate', function(e) {
  const state = e.state;
  if (!state) { _silentShowPage('home'); return; }
  if (state.type === 'property') {
    if (state.id) { openModal(state.id); }
  } else if (state.type === 'page') {
    // ── FIX: ถ้า modal เปิดอยู่ ให้ปิด modal ก่อน แทนที่จะ showPage ใหม่ ──
    const propModal = document.getElementById('prop-modal');
    if (propModal && propModal.classList.contains('open')) {
      // bump generation ทันที + abort pending renders
      if(typeof window._listingsRenderGen !== 'undefined') {
        window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
      }
      window._listingsRenderAbort = true;
      window._listingsBatchInFlight = false;
      if (typeof close360 === 'function') close360();
      // อ่าน savedY ก่อน clear
      const savedY = document.body._savedScrollY || 0;
      document.body._savedScrollY = 0;
      // restore scroll lock ก่อน remove modal
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('left');
      document.body.classList.remove('modal-open');
      propModal.classList.remove('open');
      window._currentModalId = null;
      // scroll restore + show page ใน rAF — reset flags ก่อน _silentShowPage ทุกครั้ง
      requestAnimationFrame(function() {
        if(savedY > 0) window.scrollTo(0, savedY);
        // ── FIX: bump generation อีกครั้งก่อน reset — ป้องกัน idle batch เก่ารัน append หลัง reset
        if(typeof window._listingsRenderGen !== 'undefined') {
          window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
        }
        // ── FIX: reset abort flags ก่อน _silentShowPage เสมอ
        // เพราะ _silentShowPage จะเรียก renderListingsPage ทันที
        // ถ้า _listingsRenderAbort ยังเป็น true อยู่ render จะถูก abort ทันที
        window._listingsRenderAbort = false;
        _listingsRenderPending = false;
        window._listingsRenderQueued = false;
        window._listingsBatchInFlight = false;
        _silentShowPage(state.name, true);
      });
    } else {
      _silentShowPage(state.name);
    }
  }
});

// Show page WITHOUT pushing another history entry (used by popstate)
function _closeHamburger(){ const nav=$('nav-links'),hb=$('hamburger'); if(nav)nav.classList.remove('mob-open'); if(hb)hb.classList.remove('active'); }
function _silentShowPage(name, skipScrollTop) {
  // คืน body scroll เสมอ — ปลอดภัยสำหรับทุก device
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('width');
  document.body.style.removeProperty('left');
  document.body.classList.remove('modal-open');
  document.body._savedScrollY = 0;
  // bump generation ก่อนเสมอ — ป้องกัน idle batch เก่า (home, listings, หรือ modal)
  // ที่กำลังรออยู่ abort ตัวเองทันที ก่อนที่ render ใหม่จะเริ่ม
  if(typeof window._listingsRenderGen !== 'undefined') {
    window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
  }
  window._listingsRenderAbort = false;
  _listingsRenderPending = false;
  window._listingsRenderQueued = false;
  window._listingsBatchInFlight = false;
  // ถ้ามี modal/overlay เปิดอยู่ให้ปิดก่อน
  if(typeof close360 === 'function') close360();
  // ── FIX: ปิด overlay/sheet ทุกตัวที่อาจค้างเปิดอยู่ (z-index สูงทำให้กดอะไรไม่ได้) ──
  ['apply-agent-overlay','apply-other-overlay','adv-desktop-overlay',
   'adv-sheet-overlay','adv-sheet','adv-filter-panel','seo-drawer','seo-drawer-overlay'].forEach(function(id){
    const ov = document.getElementById(id);
    if(ov) ov.classList.remove('open');
  });
  // ── FIX: ปิด all-modal / ov อื่นๆ ที่อาจค้างเปิดอยู่เมื่อ navigate ──
  document.querySelectorAll('.ov.open').forEach(function(el){
    if(el.id !== 'prop-modal') el.classList.remove('open');
  });
  // ถ้าไป listings ให้เตรียม data ไว้ก่อน
  if(name === 'listings'){
    const _allProps = (props && props.length) ? props :
                     (typeof MOCK!=='undefined' ? MOCK.props : []);
    if(_allProps.length && !_listingsBaseData.length){
      _listingsBaseData = [..._allProps];
      _listingsData = typeof sortListings==='function' ? sortListings([..._listingsBaseData],'default') : [..._listingsBaseData];
      _listingsCurPage = 1;
    }
  }
  $$('.page').forEach(p => p.classList.remove('active'));
  const pg = $('page-' + name);
  if (!pg) return;
  pg.classList.add('active');
  triggerPageCounters(name);
  if(!skipScrollTop) scrollTo(0, 0);
  closeAllDD();
  _closeHamburger();
  if (name === 'listings') {
    window._lsSeoSidebarRendered = false;
    // NOTE: ไม่ clear _pageBeforeModal ที่นี่ — closeModal ต้องการค่านี้เพื่อ restore page หลังปิดการ์ด
    // _pageBeforeModal จะถูก set ใหม่ใน openModal ทุกครั้งที่เปิดการ์ด
    // ถ้า _listingsDataReady → render ทันที
    // ถ้ายังไม่พร้อม → ตั้ง flag ให้ afterLoad() render แทน (ไม่ต้อง poll)
    if(window._listingsDataReady && typeof renderListingsPage === 'function') {
      renderListingsPage();
    } else {
      window._pendingListingsRender = true;
    }
    if(typeof renderListingsSeoSidebar === 'function'){
      const idle = window.requestIdleCallback || (cb=>setTimeout(cb,200));
      idle(()=>{ renderListingsSeoSidebar(); window._lsSeoSidebarRendered = true; });
    }
  } else if (name === 'favorites') renderFavPage();
  else if (name === 'portfolio') {
    if(window._dataReady) {
      renderPortfolio('all');
      setTimeout(()=>{ if(typeof applyLang==='function') applyLang(); }, 30);
    } else {
      window._pendingPortfolioRender = true;
    }
  }
  else if (name === 'agents') {
    renderAgents();
    setTimeout(() => {
      // ใช้ข้อมูลเดียวกับ syncAllStats เพื่อให้ตัวเลขสอดคล้องกันทุกหน้า
      const _totalClosed = port.filter(p=>p.status==='SOLD'||p.status==='RENTED').length;
      animateCounter($('ag-listing-cnt'), props.length);
      animateCounter($('ag-sale-cnt'),    _totalClosed);  // SOLD+RENTED เท่านั้น (สอดคล้องกับหน้าหลัก/ผลงาน)
      animateCounter($('ag-agent-cnt'),   agents.length);
    }, 200);
  }
  else if (name === 'my-account') {
    renderMyAccount();
  }
  // seo-toggle-btn: แสดงบนหน้า home และ listings เท่านั้น
  const _seoBtn = document.getElementById('seo-toggle-btn');
  if(_seoBtn) _seoBtn.setAttribute('data-page', (name === 'listings' || name === 'home') ? name : 'other');
  // Update meta
  const route = PAGE_ROUTES[name];
  if (route) {
    _updateMeta(route.title, route.desc, 'https://matchdoor.co' + route.path);
    // Inject Breadcrumb schema
    const bcMap = {
      'listings': [{name:'หน้าแรก',path:'/'},{name:'ประกาศทั้งหมด',path:'/listings'}],
      'agents':   [{name:'หน้าแรก',path:'/'},{name:'ทีมตัวแทน',path:'/agents'}],
      'portfolio':[{name:'หน้าแรก',path:'/'},{name:'ผลงาน',path:'/portfolio'}],
      'home':     [{name:'หน้าแรก',path:'/'}],
    };
    if(bcMap[name]) _injectBreadcrumbSchema(bcMap[name]);
  }
  // GA4: SPA page_view
  if(typeof trackPageView === 'function') trackPageView(name, route ? route.title : name);
}

// Read URL on page load and navigate to correct section
function _initRouteFromUrl() {
  // ── ถ้ามี OAuth hash (#access_token=...) ให้ Supabase จัดการ session เอง
  // ❌ ห้าม replaceState ที่นี่ — Supabase ยังไม่ได้อ่าน hash เลย (defer script โหลดทีหลัง)
  // Supabase จะ clean hash เองอัตโนมัติหลัง process session เสร็จ
  if (location.hash && location.hash.includes('access_token=')) {
    _silentShowPage('home');
    return;
  }
  // 404.html = index.html ดังนั้น GitHub Pages serve ไฟล์เดียวกัน
  // browser ยัง URL ถูกต้องอยู่ เช่น /listings — อ่านตรงๆ ได้เลย
  const path = location.pathname;
  const match = path.match(/^\/property\/([^\/\-]+)/);
  if (match) {
    const propId = match[1];
    // ── เปิด property modal ที่หน้าหลัก (layout ประกาศทั้งหมด) ──
    window._pageBeforeModal = 'home';
    _silentShowPage('home');
    // Try to open modal — data may not be loaded yet, handled by _pendingOpenId
    window._pendingOpenId = propId;
    return;
  }
  const sectionMap = {
    '/agents': 'agents', '/portfolio': 'portfolio',
    '/favorites': 'favorites', '/careers': 'careers',
    '/buy': 'home', '/rent': 'home',
    '/listings': 'listings',
    '/my-account': 'my-account',
  };
  const targetPage = sectionMap[path];
  if (targetPage) {
    _silentShowPage(targetPage);
    if (path === '/buy') { _syncTxTabs && _syncTxTabs('BUY'); }
    if (path === '/rent') { _syncTxTabs && _syncTxTabs('RENT'); }
    // listings page: mark for init after data loads
    if (path === '/listings') {
      window._pendingListingsInit = true;
      // ถ้ามี query string (เช่น /listings?q=สุขุมวิท) ให้เก็บไว้ apply หลังข้อมูลโหลด
      var qs = location.search;
      if (qs) { window._pendingListingsSearch = qs; }
    }
  } else {
    _silentShowPage('home');
  }
  // Replace initial state
  const name = Object.entries(sectionMap).find(([p]) => p === path)?.[1] || 'home';
  const route = PAGE_ROUTES[name] || PAGE_ROUTES['home'];
  history.replaceState({ type: 'page', name }, '', location.href);
}

// ── Patch openModal to also update URL ──
const _origOpenModal = openModal;
window.openModal = function(id) {
  // ── FIX: บันทึก page ปัจจุบันก่อนเปิด modal เพื่อ restore หลังปิด ──
  const curState = history.state;
  if (curState && curState.type === 'page') {
    window._pageBeforeModal = curState.name;
  } else {
    // อ่านจาก active page element ถ้า state ไม่มี
    const activePage = document.querySelector('.page.active');
    if (activePage) {
      const pid = activePage.id.replace('page-', '');
      window._pageBeforeModal = pid || 'home';
    } else {
      window._pageBeforeModal = 'home';
    }
  }
  _origOpenModal(id);
  _openPropertyUrl(id);
  // GA4: property_view
  (function(){
    try{
      const _p = (typeof props !== 'undefined') ? props.find(function(x){ return String(x.id)===String(id); }) : null;
      if(typeof trackEvent === 'function'){
        trackEvent('property_view', {
          property_id: String(id),
          property_title: _p ? (_p.title||'') : '',
          property_type:  _p ? (_p.type||'') : '',
          property_price: _p ? (_p.price||0) : 0,
          property_tx:    _p ? (_p.tx||'') : '',
          province:       _p ? (_p.province||'') : ''
        });
      }
    } catch(e){}
  })();
};

// ── Patch closeModal to restore URL ──
const _origCloseModal = closeModal;
window.closeModal = function(e) {
  _origCloseModal(e);
  if (!e || e.target.id === 'prop-modal') _closePropertyUrl();
};

// Add "ดูหน้าเต็ม" share button inside property modal after it's opened
function _addShareButtonToModal() { /* disabled */ }

// Original showPage — now also pushes history
function showPage(name){ 
  _silentShowPage(name); // _silentShowPage renders listings already
  // seo-toggle-btn: show only on listings page
  const seoBtn = document.getElementById('seo-toggle-btn');
  if(seoBtn) seoBtn.setAttribute('data-page', name === 'listings' ? 'listings' : name === 'home' ? 'home' : 'other');
  const route = PAGE_ROUTES[name];
  const path = route ? route.path : '/';
  _pushRoute(path, { type: 'page', name });
}

// ── Init router after DOM ready ──
// ── initRouter รันหลัง DOM พร้อมทั้งหมด เพราะ page-listings div อยู่หลัง script tag ──
document.addEventListener('DOMContentLoaded', function initRouter() {
  _initRouteFromUrl();
  // Mark ready after loadData resolves (so URL pushes don't fire prematurely)
  const _readyCheck = setInterval(() => {
    if (typeof props !== 'undefined' && props.length >= 0) {
      if(window._forceReset) { window._forceReset = false; }
      _routerReady = true;
      clearInterval(_readyCheck);
      // If arriving at a property URL, open the modal now
      if (window._pendingOpenId) {
        const pid = window._pendingOpenId;
        delete window._pendingOpenId;
        setTimeout(() => {
          if (props.find(x => String(x.id) === String(pid))) {
            const _origFlag = _routerReady;
            _routerReady = false;
            if(typeof scrollToEl === 'function') scrollToEl('all-sec');
            openModal(pid);
            _routerReady = _origFlag;
          }
        }, 300);
      }
    }
  }, 200);
  // Add share button whenever modal opens
  const propModalEl = document.getElementById('prop-modal');
  if (propModalEl) {
    new MutationObserver(() => {
      if (propModalEl.classList.contains('open')) _addShareButtonToModal();
    }).observe(propModalEl, { attributes: true, attributeFilter: ['class'] });
  }
});
function openLine(){ 
  if(typeof trackEvent==='function') trackEvent('line_click',{source:'nav_button',line_id:C.LINE});
  window.open(lineUrl(C.LINE),'_blank'); 
}

/* ── GA4 tracked wrappers — ใช้ใน modal/card CTAs ── */
function trackPhoneClick(source, propId){
  if(typeof trackEvent==='function'){
    const _p = (typeof props!=='undefined'&&propId) ? props.find(function(x){return String(x.id)===String(propId);}) : null;
    trackEvent('phone_click',{
      source: source||'modal',
      property_id: propId||'',
      property_title: _p?(_p.title||''):'',
      phone: C.PHONE||''
    });
  }
}
function trackLineClick(source, propId){
  if(typeof trackEvent==='function'){
    const _p = (typeof props!=='undefined'&&propId) ? props.find(function(x){return String(x.id)===String(propId);}) : null;
    trackEvent('line_click',{
      source: source||'modal',
      property_id: propId||'',
      property_title: _p?(_p.title||''):'',
      line_id: C.LINE||''
    });
  }
}

const CAT_LABELS={
  'dd.all':'ทั้งหมด','dd.house':'บ้านเดี่ยว','dd.town':'ทาวน์โฮม','dd.condo':'คอนโด',
  'dd.comm':'อาคารพาณิชย์','dd.land':'ที่ดิน','dd.villa':'วิลล่า','dd.resort':'รีสอร์ท','dd.hotel':'โรงแรม'
};
const CAT_DEF=[{v:'',icon:'fa-home',key:'dd.all'},{v:'บ้านเดี่ยว',icon:'fa-house-user',key:'dd.house'},{v:'ทาวน์โฮม',icon:'fa-building',key:'dd.town'},{v:'คอนโด',icon:'fa-city',key:'dd.condo'},{v:'อาคารพาณิชย์',icon:'fa-store',key:'dd.comm'},{v:'ที่ดิน',icon:'fa-map',key:'dd.land'},{v:'วิลล่า',icon:'fa-umbrella-beach',key:'dd.villa'},{v:'รีสอร์ท',icon:'fa-hotel',key:'dd.resort'},{v:'โรงแรม',icon:'fa-bed',key:'dd.hotel'}];
function renderCats(){ $('cat-scroll').innerHTML=CAT_DEF.map((c,i)=>`<div class="cat-card ${i===0?'active':''}" onclick="setCat('${c.v}',this)"><div class="cat-icon"><i class="fas ${c.icon}"></i></div><div class="cat-name">${(typeof ui==='function'?ui(c.key):null)||CAT_LABELS[c.key]||c.key}</div></div>`).join(''); }

function propCard(p){
  const ag=agents.find(a=>a.id===p.agentId);
  // sanitize fields ที่มาจาก Supabase ก่อน render ใน innerHTML
  const _sTitle    = sanitize(p.title    || '');
  const _sLocation = sanitize(p.location || '');
  const _sAgName   = ag ? sanitize(ag.name || '') : '';
  const agTag=ag?`<span class="ptag pt-ag" onclick="event.stopPropagation()" style="cursor:default"><i class="fas fa-user-circle"></i> ${_sAgName}</span>`:'';
  const photos=p.photos?.filter(Boolean)||[];
  const da=daysAgo(p.createdAt);
  const faved=favs.includes(String(p.id));
  // uid ต้องไม่ซ้ำกันแม้ property เดียวกันจะถูก render หลาย grid พร้อมกัน
  const uid='pc'+Math.random().toString(36).slice(2,8);

  // ---- thumb inner HTML ----
  // รูปทุกใบใช้ loading="lazy" — browser โหลดเฉพาะรูปที่ใกล้ viewport เท่านั้น
  // (เดิมรูปแรกของ multi-photo ใช้ eager ทำให้ทุก card โหลดรูปพร้อมกัน)
  let thumbInner='';
  if(photos.length>1){
    thumbInner=`<div class="card-slides" id="${uid}-slides">${
      photos.map((u)=>`<img src="${u}" loading="lazy" decoding="async">`).join('')
    }</div><button class="card-sarr prev" onclick="event.stopPropagation();cardSlide('${uid}',-1)"><i class="fas fa-chevron-left"></i></button><button class="card-sarr next" onclick="event.stopPropagation();cardSlide('${uid}',1)"><i class="fas fa-chevron-right"></i></button><div class="card-sdots" id="${uid}-dots">${
      photos.map((_,i)=>`<div class="card-dot${i===0?' active':''}"></div>`).join('')
    }</div>`;
  } else if(photos.length===1){
    thumbInner=`<img src="${photos[0]}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
  } else {
    thumbInner=`<div style="font-size:50px;display:flex;align-items:center;justify-content:center;height:100%">${p.icon||typeIcon(p.type)}</div>`;
  }

  // ---- price row ----
  let priceHtml='';
  if(p.tx==='RENT'){
    priceHtml=`<div class="prop-price-row">
      <div class="prop-price">${fmtPrice(p.price,p.tx)}</div>
    </div>`;
  } else {
    priceHtml=`<div class="prop-price-row" style="align-items:center">
      <div class="prop-price">${fmtPrice(p.price,p.tx)}</div>
    </div>`;
  }

  // ---- detail icons row ----
  const icons=[];

  // appliances FIRST: show แอร์, เครื่องซักผ้า, ตู้เย็น specifically + others
  const apps=Array.isArray(p.appliances)?p.appliances.filter(Boolean):[];
  const appIconMap={'แอร์':'fa-snowflake','ตู้เย็น':'fa-temperature-low','เครื่องซักผ้า':'fa-tshirt','ไมโครเวฟ':'fa-microwave','เตาไฟฟ้า':'fa-fire-burner','โทรทัศน์':'fa-tv','เครื่องทำน้ำอุ่น':'fa-hot-tub','ระบบรักษาความปลอดภัย':'fa-shield-alt'};
  const appColorMap={'แอร์':'#0ea5e9','ตู้เย็น':'#06b6d4','เครื่องซักผ้า':'#8b5cf6'};
  const priorityApps=['แอร์','เครื่องซักผ้า','ตู้เย็น'];
  const shownApps=new Set();
  priorityApps.forEach(name=>{
    if(apps.includes(name)){
      const ic=appIconMap[name];
      const col=appColorMap[name]||'#0369a1';
      icons.push(`<span class="pdi-app pdi-app-named" title="${name}" style="--app-col:${col}"><i class="fas ${ic}"></i></span>`);
      shownApps.add(name);
    }
  });
  const remaining=apps.filter(a=>!shownApps.has(a));
  remaining.slice(0,2).forEach(a=>{ const ic=appIconMap[a]||'fa-plug'; icons.push(`<span class="pdi-app" title="${a}"><i class="fas ${ic}"></i></span>`); });
  if(remaining.length>2) icons.push(`<span class="pdi-app pdi-more">+${remaining.length-2}</span>`);

  if(p.bed>0)    icons.push(`<span class="pdi"><i class="fas fa-bed"></i><b>${p.bed}</b><em>${ui('pdi.bed')}</em></span>`);
  if(p.bath>0)   icons.push(`<span class="pdi"><i class="fas fa-shower"></i><b>${p.bath}</b><em>${ui('pdi.bath')}</em></span>`);
  if(p.area>0)   icons.push(`<span class="pdi"><i class="fas fa-ruler-combined"></i><b>${p.area}</b><em>${ui('pdi.area')}</em></span>`);
  if(p.land_area>0) icons.push(`<span class="pdi"><i class="fas fa-map"></i><b>${p.land_area}</b><em>${ui('pdi.land')}</em></span>`);

  // floors
  if(p.floors>0){
    const floorLabel=p.floor_no>0?`${p.floor_no}/${p.floors}`:`${p.floors}`;
    icons.push(`<span class="pdi pdi-floor"><i class="fas fa-building"></i><b>${floorLabel}</b><em>${ui('pdi.floor')}</em></span>`);
  }

  // parking
  if(p.parking>0) icons.push(`<span class="pdi pdi-park"><i class="fas fa-car"></i><b>${p.parking}</b><em>${ui('pdi.park')}</em></span>`);

  // furniture: only show if full
  if(p.furniture==='full') icons.push(`<span class="pdi-badge pdi-full"><i class="fas fa-couch"></i> ${ui('pdi.furn.full')}</span>`);

  // pets: only show if allowed
  if(p.pets_allowed) icons.push(`<span class="pdi-badge pdi-pets-ok"><i class="fas fa-paw"></i> ${ui('pdi.pets')}</span>`);

  const detailRow=icons.length?`<div class="prop-detail-row">${icons.join('')}</div>`:'';

  // ---- investment tag ----
  const investTag = (()=>{
    if(p.invest_tag) return p.invest_tag;
    if(p.yield_pct && p.yield_pct >= 6) return `Yield ${p.yield_pct}%`;
    if(p.below_market_pct && p.below_market_pct >= 3) return `ต่ำกว่าตลาด ${p.below_market_pct}%`;
    if(p.discount_flag) return 'ลดราคาพิเศษ';
    return '';
  })();
  const investHtml = investTag ? `<div style="position:absolute;bottom:44px;left:10px;background:linear-gradient(135deg,#c8922a,#e8b84b);color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;z-index:5;white-space:nowrap;box-shadow:0 2px 8px rgba(200,146,42,.5);letter-spacing:.3px"><i class="fas fa-chart-line"></i> ${investTag}</div>` : '';

  return `<div class="prop-card" onclick="openModal('${p.id}')" style="cursor:pointer">
    <a href="/property/${p.id}" class="prop-card-seo-link" onclick="event.preventDefault()" aria-label="${_sTitle}" tabindex="-1" style="position:absolute;inset:0;z-index:0;pointer-events:none"></a>
    <div class="prop-thumb">
      ${thumbInner}
      <div class="prop-badges">
        ${p.isNew?`<span class="pb pb-new"><i class="fas fa-star"></i> ${ui('card.new')}</span>`:''}
        ${p.isRec?'<span class="pb pb-hot"><i class="fas fa-fire"></i> Hot</span>':''}
        <span class="pb ${p.tx==='RENT'?'pb-rent':'pb-buy'}">${p.tx==='RENT'?`<i class="fas fa-key"></i> ${ui('card.rent')}`:`<i class="fas fa-tag"></i> ${ui('card.buy')}`}</span>
      </div>
      <div style="position:absolute;top:10px;right:10px;display:flex;gap:5px;z-index:10">
        <button class="prop-fav ${faved?'favorited':''}" data-id="${p.id}" onclick="toggleFav('${p.id}',event)" style="position:static;width:30px;height:30px">${faved?'<i class="fas fa-heart"></i>':'<i class="far fa-heart"></i>'}</button>
      </div>
      ${da?`<div class="prop-days"><i class="far fa-clock"></i> ${da}</div>`:''}
      ${investHtml}
    </div>
    <div class="prop-body">
      <div class="prop-tags"><span class="ptag pt-type">${ui('type.'+p.type)||p.type}</span><span class="ptag ${p.tx==='RENT'?'pt-rent':'pt-buy'}">${p.tx==='RENT'?ui('card.rent'):ui('card.buy')}</span></div>
      <div class="prop-title">${_sTitle}</div>
      <div class="prop-loc"><i class="fas fa-map-marker-alt"></i> ${_sLocation}</div>
      ${priceHtml}
      ${detailRow}
    </div>
  </div>`;
}

// ===== LISTINGS PAGE =====
let _listingsData = [];
let _listingsCurPage = 1;
// แสดง 32 ทรัพย์ต่อหน้าทุกอุปกรณ์ — logic เหมือนกับ desktop ทุกหน้าจอ
function _listingsPerPage() {
  return 32;
}
let _listingsMapInitialized = false;
let _listingsMapInstance = null;
let _listingsMarkers = [];
let _listingsRenderPending = false; // throttle ป้องกัน render ซ้อน

function sortListings(data, method) {
  const arr = [...data];
  switch(method) {
    case 'price_asc': return arr.sort((a,b) => (a.price||0) - (b.price||0));
    case 'price_desc': return arr.sort((a,b) => (b.price||0) - (a.price||0));
    case 'newest': return arr.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
    case 'oldest': return arr.sort((a,b) => new Date(a.createdAt||0) - new Date(b.createdAt||0));
    case 'alpha': return arr.sort((a,b) => (a.title||'').localeCompare(b.title||'','th'));
    default:
      return arr.sort((a,b) => {
        if(a.isRec && !b.isRec) return -1;
        if(!a.isRec && b.isRec) return 1;
        if(a.isNew && !b.isNew) return -1;
        if(!a.isNew && b.isNew) return 1;
        return 0;
      });
  }
}

function listingsSortChange() {
  const method = document.getElementById('listings-sort').value;
  _listingsData = sortListings(_listingsData, method);
  _listingsCurPage = 1;
  renderListingsPage();
}

// render generation counter — เพิ่มทุกครั้งที่ render ใหม่เริ่ม
// batch idle ที่ค้างจาก render เก่าจะตรวจ generation ก่อน append
if(typeof window._listingsRenderGen === 'undefined') window._listingsRenderGen = 0;

function renderListingsPage() {
  // ── guard: ถ้าหน้า listings ไม่ได้ active อยู่ ไม่ต้อง render ──
  // ป้องกัน idle batch จากหน้า home มา append เข้า listings-grid เมื่อ navigate
  const _listingsPageEl = document.getElementById('page-listings');
  if(_listingsPageEl && !_listingsPageEl.classList.contains('active')) {
    _listingsRenderPending = false;
    return;
  }
  // ── debounce: ถ้ากำลัง render อยู่แล้ว (pending) ให้ queue ครั้งเดียวเท่านั้น ──
  if(_listingsRenderPending) {
    if(!window._listingsRenderQueued) {
      window._listingsRenderQueued = true;
      setTimeout(function(){
        window._listingsRenderQueued = false;
        _listingsRenderPending = false;
        renderListingsPage();
      }, 80);
    }
    return;
  }
  _listingsRenderPending = true;
  // เพิ่ม generation ทุกครั้ง — batch idle เก่าจะ abort ตัวเองทันที
  window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
  const _myGen = window._listingsRenderGen;
  const _doRender = () => {
  // ── ตรวจ generation + abort ก่อนทำอะไรเลย — ป้องกัน stale rAF รัน render ผิด ──
  if(window._listingsRenderAbort || window._listingsRenderGen !== _myGen) {
    _listingsRenderPending = false;
    window._listingsBatchInFlight = false;
    return;
  }
  // ── ตรวจ page-listings active ก่อนด้วย ──
  const _lsActivePre = document.getElementById('page-listings');
  if(_lsActivePre && !_lsActivePre.classList.contains('active')) {
    _listingsRenderPending = false;
    window._listingsBatchInFlight = false;
    return;
  }
  _listingsRenderPending = false;
  window._listingsBatchInFlight = false; // reset ก่อนทุก render — ป้องกันค่าค้างจาก render ก่อน

  // ── ถ้า props ยังโหลดไม่เสร็จ ให้ retry ──────────────────────────
  const _allProps = (typeof props !== 'undefined' && props && props.length) ? [...props] :
                   (typeof MOCK !== 'undefined' && MOCK.props && MOCK.props.length ? [...MOCK.props] : []);

  if(!_allProps.length) {
    // Props ยังไม่พร้อม — แสดง skeleton แล้ว retry หลัง 300ms
    const grid = document.getElementById('listings-grid');
    if(grid && !grid.innerHTML.includes('prop-card') && !grid.innerHTML.includes('loading-sk')) {
      grid.innerHTML = Array(8).fill(0).map(()=>`<div class="prop-card loading-sk"><div class="prop-thumb"><div class="sk-img skeleton"></div></div><div class="prop-body"><div class="sk-title skeleton"></div><div class="sk-loc skeleton"></div><div class="sk-price skeleton"></div></div></div>`).join('');
    }
    // reset pending ก่อน retry — ป้องกัน throttle block
    _listingsRenderPending = false;
    setTimeout(renderListingsPage, 300);
    return;
  }

  // ── ใช้ทรัพย์ทั้งหมดเป็น base เฉพาะตอนที่ base ยังว่างอยู่ครั้งแรก ─
  if(!_listingsBaseData.length) {
    _listingsBaseData = _allProps;
    _listingsData = sortListings([..._allProps], 'default');
    _listingsCurPage = 1;
  }

  // ── apply query string filter จาก URL เมื่อ refresh หน้า /listings ──
  // หมายเหตุ: ทำหลัง _listingsBaseData พร้อมแล้วเท่านั้น
  if(window._pendingListingsSearch && _listingsBaseData.length) {
    var qs = window._pendingListingsSearch;
    delete window._pendingListingsSearch;
    var params = new URLSearchParams(qs);
    var qVal = params.get('q');
    var typeVal = params.get('type');
    var txVal = params.get('tx');
    if(qVal) {
      var qInput = document.getElementById('ls-q');
      if(qInput) qInput.value = qVal;
      _listingsData = _listingsBaseData.filter(function(p){
        return JSON.stringify(p).toLowerCase().indexOf(qVal.toLowerCase()) !== -1;
      });
    }
    if(typeVal) {
      _listingsData = (_listingsData.length ? _listingsData : _listingsBaseData).filter(function(p){
        return p.type === typeVal;
      });
    }
    if(txVal) {
      _listingsTxFilter = txVal;
      _listingsData = (_listingsData.length ? _listingsData : _listingsBaseData).filter(function(p){
        return txVal === 'ALL' || p.tx === txVal;
      });
    }
    _listingsCurPage = 1;
  }

  const total = _listingsData.length;
  const totalPages = Math.max(1, Math.ceil(total / _listingsPerPage()));
  _listingsCurPage = Math.max(1, Math.min(_listingsCurPage, totalPages));

  const start = (_listingsCurPage - 1) * _listingsPerPage();
  const end   = Math.min(start + _listingsPerPage(), total);
  const pageData = _listingsData.slice(start, end);

  // Update count
  const countEl = document.getElementById('listings-total-count');
  if(countEl) countEl.textContent = total.toLocaleString();
  const lsCountWrap = document.querySelector('#page-listings .listings-count');
  if(lsCountWrap){
    const countTpl = (typeof ui==='function') ? ui('ls.count') : 'พบ {n} รายการ';
    lsCountWrap.innerHTML = countTpl.replace('{n}','<strong id="listings-total-count">'+total.toLocaleString()+'</strong>');
  }

  // Render cards or empty state
  const grid = document.getElementById('listings-grid');
  if(grid) {
    if(pageData.length) {
      // ── Batch sizes: แสดง 32 ทรัพย์ทุก device — render แบ่ง batch เพื่อ performance ──
      const FIRST_BATCH = 8;   // render ทันที (sync)
      const SECOND_BATCH = 16; // render batch 2
      // restBatch: ส่วนที่เหลือ (ถึง 32)
      const firstBatch  = pageData.slice(0, FIRST_BATCH);
      const secondBatch = pageData.slice(FIRST_BATCH, FIRST_BATCH + SECOND_BATCH);
      const restBatch   = pageData.slice(FIRST_BATCH + SECOND_BATCH);

      // render batch แรกทันที (sync) — ให้ first paint เร็ว
      grid.innerHTML = firstBatch.map(propCard).join('');

      // batch ถัดไป: ใช้ idle callback ป้องกัน main thread block
      const idle = window.requestIdleCallback
        ? function(cb){ window.requestIdleCallback(cb, {timeout: 300}); }
        : function(cb){ setTimeout(cb, 80); };

      if(secondBatch.length){
        window._listingsBatchInFlight = true;
        idle(function(){
          if(window._listingsRenderAbort || window._listingsRenderGen !== _myGen){ window._listingsBatchInFlight = false; return; }
          // ตรวจว่า listings page ยัง active ก่อน append — ป้องกัน stale batch append หลัง navigate
          const _lsPageCheck = document.getElementById('page-listings');
          if(!_lsPageCheck || !_lsPageCheck.classList.contains('active')){ window._listingsBatchInFlight = false; return; }
          const frag = document.createDocumentFragment();
          const tmp = document.createElement('div');
          tmp.innerHTML = secondBatch.map(propCard).join('');
          while(tmp.firstChild) frag.appendChild(tmp.firstChild);
          if(window._listingsRenderAbort || window._listingsRenderGen !== _myGen){ window._listingsBatchInFlight = false; return; }
          grid.appendChild(frag);
          // ไม่เรียก initAllCardSwipes ตรงนี้ — MutationObserver จัดการแทน

          if(restBatch.length){
            idle(function(){
              if(window._listingsRenderAbort || window._listingsRenderGen !== _myGen){ window._listingsBatchInFlight = false; return; }
              // ตรวจอีกครั้งก่อน batch สุดท้าย
              const _lsPageCheck2 = document.getElementById('page-listings');
              if(!_lsPageCheck2 || !_lsPageCheck2.classList.contains('active')){ window._listingsBatchInFlight = false; return; }
              const frag2 = document.createDocumentFragment();
              const tmp2 = document.createElement('div');
              tmp2.innerHTML = restBatch.map(propCard).join('');
              while(tmp2.firstChild) frag2.appendChild(tmp2.firstChild);
              if(window._listingsRenderAbort || window._listingsRenderGen !== _myGen){ window._listingsBatchInFlight = false; return; }
              grid.appendChild(frag2);
              // เรียก initAllCardSwipes ครั้งเดียวหลัง batch สุดท้ายเสร็จ
              if(typeof initAllCardSwipes==='function') requestAnimationFrame(function(){ if(window._listingsRenderGen===_myGen) initAllCardSwipes(grid); });
              window._listingsBatchInFlight = false;
            });
          } else {
            // ไม่มี restBatch → เรียก initAllCardSwipes หลัง secondBatch แทน
            if(typeof initAllCardSwipes==='function') requestAnimationFrame(function(){ if(window._listingsRenderGen===_myGen) initAllCardSwipes(grid); });
            window._listingsBatchInFlight = false;
          }
        });
      }
    } else {
      // ── Empty state: แสดง CTA ให้ฝากความต้องการแทนการ reset ─────
      const lang = (typeof _lang!=='undefined' && _lang) ? _lang : 'th';
      const lineHref = (typeof C!=='undefined' && C && C.LINE) ? 'https://line.me/R/ti/p/'+C.LINE : 'https://line.me/ti/p/matchdoor';
      const t = {
        th:{ ico:'🔍', h:'ไม่พบทรัพย์ที่ตรงกับเงื่อนไข',
             sub:'ลองปรับเงื่อนไขการค้นหา หรือ<br>ให้ทีมงานของเราช่วยหาทรัพย์ที่ใช่ให้คุณโดยตรง',
             cta:'📩 ฝากความต้องการซื้อ-เช่า ให้ทีมงานหาให้',
             reset:'🔄 ล้างการค้นหา' },
        en:{ ico:'🔍', h:'No listings match your criteria',
             sub:"Try adjusting your filters, or let our team find<br>the perfect property for you.",
             cta:'📩 Leave your requirements — we\'ll find it for you',
             reset:'🔄 Reset search' },
        cn:{ ico:'🔍', h:'没有找到符合条件的房源',
             sub:'请尝试调整筛选条件，<br>或让我们的团队为您寻找合适的房产。',
             cta:'📩 留下需求，让我们为您寻找',
             reset:'🔄 重置搜索' },
        ja:{ ico:'🔍', h:'条件に合う物件が見つかりません',
             sub:'検索条件を調整するか、<br>担当チームに理想の物件を探してもらいましょう。',
             cta:'📩 ご要望を送る — スタッフが探します',
             reset:'🔄 検索をリセット' },
      };
      const m = t[lang] || t.th;
      grid.innerHTML = `
        <div style="grid-column:1/-1;display:flex;justify-content:center;padding:20px 12px 40px">
          <div style="text-align:center;max-width:420px;width:100%">
            <div style="font-size:56px;margin-bottom:16px;line-height:1">${m.ico}</div>
            <p style="font-size:17px;font-weight:700;color:var(--tx);margin-bottom:10px">${m.h}</p>
            <p style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:28px">${m.sub}</p>
            <div style="display:flex;flex-direction:column;gap:10px">
              <a href="${lineHref}" target="_blank" rel="noopener"
                 style="display:flex;align-items:center;justify-content:center;gap:10px;
                        background:#06C755;color:#fff;text-decoration:none;
                        border-radius:12px;padding:14px 20px;font-size:14px;font-weight:700;
                        box-shadow:0 4px 18px rgba(6,199,85,.38);transition:.2s"
                 onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter=''">
                <i class="fab fa-line" style="font-size:20px"></i> ${m.cta}
              </a>
              <button onclick="listingsResetSearch()"
                 style="display:flex;align-items:center;justify-content:center;gap:8px;
                        background:var(--lt);color:var(--tx);
                        border:1.5px solid var(--bd);border-radius:12px;
                        padding:13px 20px;font-size:13px;font-weight:600;cursor:pointer;
                        transition:.2s"
                 onmouseover="this.style.borderColor='var(--a)'" onmouseout="this.style.borderColor='var(--bd)'">
                ${m.reset}
              </button>
            </div>
          </div>
        </div>`;
    }
    // init swipe สำหรับ batch แรก (ถ้าไม่มี secondBatch/restBatch)
    if(pageData.length <= 4) setTimeout(function(){ if(typeof initAllCardSwipes==='function') initAllCardSwipes(grid); }, 80);
  }
  // scroll ขึ้นเฉพาะกรณีเปลี่ยนหน้า (ไม่ใช่ filter ใหม่บนหน้าเดิม)
  if(window._listingsScrollOnRender){
    window._listingsScrollOnRender = false;
    requestAnimationFrame(function(){ window.scrollTo({top: 0, behavior: 'smooth'}); });
  }
  // render pagination
  const _totalPg = Math.max(1, Math.ceil(_listingsData.length / _listingsPerPage()));
  if(typeof renderListingsPagination==='function') renderListingsPagination(_totalPg);
  }; // end _doRender

  // ใช้ requestAnimationFrame เพื่อไม่บล็อก paint ก่อน render
  requestAnimationFrame(_doRender);
}

function renderListingsPagination(totalPages) {
  const pg = document.getElementById('listings-pagination');
  if(!pg) return;
  if(totalPages <= 1) { pg.innerHTML = ''; return; }
  
  const cur = _listingsCurPage;
  const total = _listingsData.length;
  const startItem = (cur-1)*_listingsPerPage() + 1;
  const endItem = Math.min(cur*_listingsPerPage(), total);
  
  let html = `<div class="pg-info">${_lang==='en'?'Showing':_lang==='cn'?'显示':_lang==='ja'?'表示中':''} ${startItem.toLocaleString()}–${endItem.toLocaleString()} ${_lang==='en'?'of':_lang==='cn'?'，共':_lang==='ja'?'/':' จาก '} ${total.toLocaleString()} ${_lang==='en'?'listings':_lang==='cn'?'个房源':_lang==='ja'?'件':'รายการ'}</div><div class="pg-controls">`;
  
  // First / Prev
  const pgFirst=_lang==='en'?'First':_lang==='cn'?'首页':_lang==='ja'?'最初':'หน้าแรก';
  const pgPrev=_lang==='en'?'Prev':_lang==='cn'?'上一页':_lang==='ja'?'前へ':'หน้าก่อน';
  const pgNext=_lang==='en'?'Next':_lang==='cn'?'下一页':_lang==='ja'?'次へ':'หน้าถัดไป';
  const pgLast=_lang==='en'?'Last':_lang==='cn'?'末页':_lang==='ja'?'最後':'หน้าสุดท้าย';
  html += `<button class="pg-btn pg-first${cur===1?' disabled':''}" onclick="goListingsPage(1)" ${cur===1?'disabled':''} title="${pgFirst}"><i class="fas fa-angle-double-left"></i> <span class="pg-label">${pgFirst}</span></button>`;
  html += `<button class="pg-btn pg-prev${cur===1?' disabled':''}" onclick="goListingsPage(${cur-1})" ${cur===1?'disabled':''} title="${pgPrev}"><i class="fas fa-angle-left"></i></button>`;
  
  // Page numbers with smart ellipsis
  const pages = buildPageRange(cur, totalPages);
  for(const p of pages) {
    if(p === '...') {
      html += '<span class="pg-ellipsis">…</span>';
    } else {
      html += `<button class="pg-btn${p===cur?' active':''}" onclick="goListingsPage(${p})">${p}</button>`;
    }
  }
  
  // Next / Last
  html += `<button class="pg-btn pg-next${cur===totalPages?' disabled':''}" onclick="goListingsPage(${cur+1})" ${cur===totalPages?'disabled':''} title="${pgNext}"><i class="fas fa-angle-right"></i></button>`;
  html += `<button class="pg-btn pg-last${cur===totalPages?' disabled':''}" onclick="goListingsPage(${totalPages})" ${cur===totalPages?'disabled':''} title="${pgLast}"><span class="pg-label">${pgLast}</span> <i class="fas fa-angle-double-right"></i></button>`;
  
  html += '</div>';
  pg.innerHTML = html;
}

function buildPageRange(cur, total) {
  if(total <= 1) return [];
  // ── Mobile: show max 5 page numbers ──────────────────────────────
  const isMobile = window.innerWidth <= 600;
  if(isMobile) {
    if(total <= 5) return Array.from({length:total}, (_,i)=>i+1);
    // Sliding window of 5 centred on current page
    let start = Math.max(1, cur - 2);
    let end   = start + 4;
    if(end > total) { end = total; start = Math.max(1, end - 4); }
    const pages = [];
    if(start > 1) pages.push(1, '...');
    for(let i=start; i<=end; i++) pages.push(i);
    if(end < total) pages.push('...', total);
    return pages;
  }
  // ── Desktop: professional with decade anchors ─────────────────────
  if(total <= 7) return Array.from({length:total}, (_,i)=>i+1);
  const set = new Set();
  set.add(1); set.add(total);
  for(let i=Math.max(2,cur-2); i<=Math.min(total-1,cur+2); i++) set.add(i);
  if(total > 15) {
    for(let d=10; d<total; d+=10) set.add(d);
  }
  const sorted = [...set].sort((a,b)=>a-b);
  const result = [];
  for(let i=0; i<sorted.length; i++){
    if(i>0 && sorted[i]-sorted[i-1]>1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

function goListingsPage(page) {
  const totalPages = Math.ceil(_listingsData.length / _listingsPerPage());
  if(page < 1 || page > totalPages) return;
  _listingsCurPage = page;
  window._listingsScrollOnRender = true; // scroll to top on page change
  renderListingsPage();
}

function initListingsMap() { /* Google My Maps iframe used instead */ }
function updateListingsMap(data) { /* Google My Maps iframe used instead */ }

function toggleRentDur(id){
  const panel=document.getElementById(id);
  if(!panel)return;
  panel.style.display=panel.style.display==='none'?'block':'none';
}

// ===== ENHANCED LISTINGS PAGE FUNCTIONS =====
let _listingsTxFilter = 'ALL';
let _listingsBaseData = []; // original unfiltered set for this listings page

function showListingsPage(title, data) {
  // ── FIX: ปิด prop-modal ถ้าค้างเปิดอยู่ก่อนเปลี่ยนหน้า ──
  const _pm = document.getElementById('prop-modal');
  if(_pm && _pm.classList.contains('open')) {
    _pm.classList.remove('open');
    window._currentModalId = null;
  }
  // ── FIX ข้อ 5: ปิด overlay/modal/sheet ทุกตัวที่อาจค้างอยู่ก่อน navigate ──
  // ครอบคลุม apply-overlay, adv-desktop-overlay, all-modal, ทุก .ov.open
  document.querySelectorAll('.ov.open').forEach(function(el){ el.classList.remove('open'); });
  ['apply-agent-overlay','apply-other-overlay','adv-desktop-overlay',
   'adv-sheet-overlay','adv-sheet','adv-filter-panel','seo-drawer','seo-drawer-overlay'].forEach(function(id){
    const ov = document.getElementById(id);
    if(ov) ov.classList.remove('open');
  });
  // unlock scroll lock ทุกรูปแบบที่อาจค้างไว้
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('width');
  document.body.style.removeProperty('left');
  document.body.classList.remove('modal-open');
  document.body._savedScrollY = 0;
  // ── bump generation + ตั้ง abort=true เพื่อหยุด idle batch (all-grid, listings เก่า) ──
  // abort จะถูก reset ใน _silentShowPage → renderListingsPage → _doRender
  // ไม่ reset ที่นี่เพื่อให้ batch ที่รออยู่ใน requestIdleCallback มีโอกาสเห็น abort=true ก่อน
  if(typeof window._listingsRenderGen !== 'undefined') {
    window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
  }
  window._listingsRenderAbort = true;
  window._listingsBatchInFlight = false;
  _listingsRenderPending = false;
  window._listingsRenderQueued = false;
  // abort จะถูก reset โดย _silentShowPage ซึ่งจะ bump gen + set abort=false ก่อน renderListingsPage

  // ── รวบรวม source data: data ที่ส่งมา → props จาก Supabase → MOCK ──
  const sourceData = (data && data.length) ? [...data] :
                     (props && props.length ? [...props] :
                     (typeof MOCK!=='undefined' ? [...MOCK.props] : []));
  // ── Set data BEFORE showPage so renderListingsPage has it ready ──
  _listingsBaseData = sourceData;
  _listingsData = sortListings([..._listingsBaseData], 'default');
  _listingsTxFilter = 'ALL';
  _listingsCurPage = 1;

  // UI resets
  const seoBtn = document.getElementById('seo-toggle-btn');
  if(seoBtn) seoBtn.setAttribute('data-page', 'listings');
  const titleEl = document.getElementById('listings-page-title');
  if(titleEl) titleEl.textContent = (typeof ui==='function') ? ui('ls.title') : (title || 'ประกาศทั้งหมด');
  const sortEl = document.getElementById('listings-sort');
  if(sortEl) sortEl.value = 'default';
  const lsKw = document.getElementById('ls-kw'); if(lsKw) lsKw.value = '';
  const lsType = document.getElementById('ls-type'); if(lsType) lsType.value = '';
  const lsMinEl = document.getElementById('ls-min'); if(lsMinEl) lsMinEl.value = '0';
  const lsMaxEl = document.getElementById('ls-max'); if(lsMaxEl) lsMaxEl.value = '999000000';
  const lsTxEl = document.getElementById('ls-tx'); if(lsTxEl) lsTxEl.value = '';
  _populateListingsProvince();
  _updateListingsTxTabs('ALL');

  // showPage → _silentShowPage จะเรียก renderListingsPage อยู่แล้ว ไม่ต้องเรียกซ้ำ
  showPage('listings');
  window.scrollTo(0,0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // render sidebar + applyLang หลัง paint — ไม่บล็อก grid render
  const _idleLS = window.requestIdleCallback || (cb=>setTimeout(cb,200));
  _idleLS(function(){
    if(!window._lsSeoSidebarRendered){
      renderListingsSeoSidebar();
      window._lsSeoSidebarRendered = true;
    }
    const telEl = document.getElementById('seo-tel-link');
    if(telEl && C && C.PHONE) telEl.href = 'tel:' + C.PHONE;
    if(typeof applyLang==='function' && (typeof _lang==='undefined'||_lang!=='th')) applyLang();
  });
}

function _populateListingsProvince() {
  const sel = document.getElementById('ls-prov');
  if(!sel) return;
  const allLabel = (typeof ui==='function') ? ui('sf.prov.all') : 'ทุกจังหวัด';
  const provs = [...new Set(_listingsBaseData.map(p=>p.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
  sel.innerHTML = `<option value="">${allLabel}</option>` + provs.map(p=>`<option value="${p}">${p}</option>`).join('');
}

function _updateListingsTxTabs(tx) {
  _listingsTxFilter = tx;
  ['all','buy','rent','hot','new'].forEach(t => {
    const btn = document.getElementById('ls-tab-'+t);
    if(!btn) return;
    const isActive = t === tx.toLowerCase() || (tx==='ALL' && t==='all') || (tx==='HOT' && t==='hot') || (tx==='NEW_ONLY' && t==='new');
    btn.style.background = isActive ? 'rgba(255,255,255,.22)' : 'transparent';
    btn.style.borderColor = isActive ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.2)';
    btn.style.color = isActive ? '#fff' : 'rgba(255,255,255,.65)';
  });
}

// ── scroll ไปที่ส่วนแสดงผลลัพธ์การ์ดอสังหา ──────────────────────────────
// เรียกหลัง filter/search ทุกครั้ง — ทุก device ทุกขนาดหน้าจอ
function _scrollToListingsResults() {
  // รอ 1 frame ให้ render เสร็จก่อนค่อย scroll
  requestAnimationFrame(() => {
    const target = document.getElementById('listings-results-top');
    if (!target) return;
    // offset = ความสูง navbar sticky (64px) + เผื่อ padding เล็กน้อย
    const navH = 72;
    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const targetY = rect.top + scrollY - navH;
    // scroll ทุกครั้งที่ target ไม่ได้อยู่ใน viewport บนสุด
    // (ป้องกัน scroll กระโดดเมื่อ toolbar อยู่ในตำแหน่งที่ถูกต้องอยู่แล้ว)
    if (rect.top > navH + 20 || rect.top < 0) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  });
}

function listingsFilterTx(tx) {
  // ── ถ้าไม่ได้อยู่หน้า listings ให้ navigate ก่อน ──
  const lp = document.getElementById('page-listings');
  if(!lp || !lp.classList.contains('active')) {
    showListingsPage(ui('sec.all'));
    setTimeout(function(){ listingsFilterTx(tx); }, 120);
    return;
  }
  _updateListingsTxTabs(tx);
  // Sync the ls-tx select dropdown
  const lsTxSel = document.getElementById('ls-tx');
  if(lsTxSel) {
    if(tx === 'BUY') lsTxSel.value = 'BUY';
    else if(tx === 'RENT') lsTxSel.value = 'RENT';
    else lsTxSel.value = '';
  }
  let base = [..._listingsBaseData];
  if(tx === 'BUY') base = base.filter(p=>p.tx==='BUY');
  else if(tx === 'RENT') base = base.filter(p=>p.tx==='RENT');
  _listingsData = sortListings(base, document.getElementById('listings-sort')?.value||'default');
  _listingsCurPage = 1;
  renderListingsPage();
  // ── FIX: scroll ไปที่ผลลัพธ์หลัง filter บนมือถือ ──
  _scrollToListingsResults();
}

function listingsFilterHot() {
  _updateListingsTxTabs('HOT');
  const base = _listingsBaseData.filter(p=>p.isRec);
  _listingsData = sortListings(base, 'default');
  _listingsCurPage = 1;
  renderListingsPage();
  _scrollToListingsResults();
}

function listingsFilterNew() {
  _updateListingsTxTabs('NEW_ONLY');
  const base = _listingsBaseData.filter(p=>p.isNew);
  _listingsData = sortListings(base, 'newest');
  _listingsCurPage = 1;
  renderListingsPage();
  _scrollToListingsResults();
}

function listingsTransitFilter(val) {
  if(!val) { listingsInlineSearch(); return; }
  const kw = document.getElementById('ls-kw');
  if(kw) { kw.value = val; }
  listingsInlineSearch();
}
function listingsResetSearch() {
  const lsKw = document.getElementById('ls-kw'); if(lsKw) lsKw.value = '';
  const lsTx = document.getElementById('ls-tx'); if(lsTx) lsTx.selectedIndex = 0;
  const lsType = document.getElementById('ls-type'); if(lsType) lsType.selectedIndex = 0;
  const lsProv = document.getElementById('ls-prov'); if(lsProv) lsProv.selectedIndex = 0;
  const lsMin = document.getElementById('ls-min'); if(lsMin) lsMin.selectedIndex = 0;
  const lsMax = document.getElementById('ls-max'); if(lsMax) lsMax.selectedIndex = 0;
  const lsTransit = document.getElementById('ls-transit'); if(lsTransit) lsTransit.selectedIndex = 0;
  _listingsTxFilter = 'ALL';
  _updateListingsTxTabs('ALL');
  _listingsData = sortListings([..._listingsBaseData], 'default');
  _listingsCurPage = 1;
  // Reset sort dropdown
  const sortEl = document.getElementById('listings-sort'); if(sortEl) sortEl.value = 'default';
  renderListingsPage();
  // Scroll กลับขึ้นไปที่ส่วนค้นหา
  requestAnimationFrame(() => {
    const searchHero = document.querySelector('#page-listings > div[style*="background:linear-gradient"]');
    if (searchHero) {
      const navH = 64;
      const rect = searchHero.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      window.scrollTo({ top: rect.top + scrollY - navH, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function listingsInlineSearch() {
  const kwRaw = (document.getElementById('ls-kw')?.value||'').trim();
  const kw = kwRaw.toLowerCase();
  const kwTrans = (typeof translateKeyword==='function' && kw) ? translateKeyword(kw).toLowerCase() : kw;
  const txVal = document.getElementById('ls-tx')?.value||'';
  const type = document.getElementById('ls-type')?.value||'';
  const prov = document.getElementById('ls-prov')?.value||'';
  const pMin = parseInt(document.getElementById('ls-min')?.value||'0')||0;
  const pMax = parseInt(document.getElementById('ls-max')?.value||'999000000')||999000000;
  const transit = document.getElementById('ls-transit')?.value||'';
  // Sync tab buttons with tx dropdown selection
  if(txVal === 'BUY') _updateListingsTxTabs('BUY');
  else if(txVal === 'RENT') _updateListingsTxTabs('RENT');
  else _updateListingsTxTabs('ALL');
  let base = [..._listingsBaseData];
  if(kw) {
    base = base.filter(p=>{
      const hay = ((p.title||'')+(p.location||'')+(p.province||'')+(p.desc||'')+(p.bts||'')+(p.mrt||'')+(p.transit||'')).toLowerCase();
      return hay.includes(kw) || (kwTrans !== kw && hay.includes(kwTrans));
    });
  }
  if(txVal) base = base.filter(p=>p.tx===txVal);
  if(type) {
    const _typeAliases = {
      'ทาวน์เฮ้าส์': ['ทาวน์เฮ้าส์','ทาวน์เฮาส์'],
      'ทาวน์เฮาส์':  ['ทาวน์เฮาส์','ทาวน์เฮ้าส์'],
      'ทาวน์โฮม':    ['ทาวน์โฮม','ทาวน์โฮ','townhome','townhouse'],
    };
    const acceptedTypes = _typeAliases[type] || [type];
    base = base.filter(p => acceptedTypes.includes(p.type));
  }
  if(prov) {
    const provL = prov.toLowerCase();
    const _normL = (s) => s.replace('มหานคร','').replace('ฯ','').trim();
    base = base.filter(p=>{
      const pProv = (p.province||'').toLowerCase();
      const pLoc  = (p.location||'').toLowerCase();
      return pProv === provL || pProv.includes(provL) || provL.includes(pProv)
        || _normL(pProv) === _normL(provL) || _normL(pProv).includes(_normL(provL)) || _normL(provL).includes(_normL(pProv))
        || pLoc.includes(provL) || pLoc.includes(_normL(provL));
    });
  }
  if(transit) { const tk=transit.toLowerCase(); base = base.filter(p=>((p.bts||'')+(p.mrt||'')+(p.transit||'')+(p.location||'')+(p.desc||'')).toLowerCase().includes(tk)); }
  if(pMin>0) base = base.filter(p=>p.price>=pMin);
  if(pMax>0 && pMax<999000000) base = base.filter(p=>p.price<=pMax);
  _listingsTxFilter = txVal || 'ALL';
  _listingsData = sortListings(base, document.getElementById('listings-sort')?.value||'default');
  _listingsCurPage = 1;
  renderListingsPage();
  // GA4: search on listings page (debounced — only track if has keyword or filter)
  try{ if(typeof trackEvent==='function'&&(kwRaw||type||prov||transit)) trackEvent('search',{search_term:kwRaw,tx:txVal,property_type:type,province:prov,transit:transit,result_count:_listingsData.length,source:'listings'}); }catch(e){}
  // SEO sidebar: render ครั้งแรกเท่านั้น (ไม่ต้อง re-render ทุก search)
  if(!window._lsSeoSidebarRendered && typeof renderListingsSeoSidebar==='function'){
    window._lsSeoSidebarRendered = true;
    const idle = window.requestIdleCallback || (cb=>setTimeout(cb,200));
    idle(renderListingsSeoSidebar);
  }
}

function listingsQuickSearch(kw) {
  closeSeoDrawer();
  // ── ถ้าอยู่หน้าหลัก → filter all-grid ที่หน้าหลักแทน ──
  const homePg = document.getElementById('page-home');
  if(homePg && homePg.classList.contains('active')) {
    const inp = document.getElementById('s-kw');
    if(inp) inp.value = kw;
    const kwLow = kw.toLowerCase();
    const base = props.length ? [...props] : (typeof MOCK!=='undefined' ? [...MOCK.props] : []);
    const result = base.filter(p =>
      (p.title||'').toLowerCase().includes(kwLow) ||
      (p.location||'').toLowerCase().includes(kwLow) ||
      (p.province||'').toLowerCase().includes(kwLow) ||
      (p.type||'').toLowerCase().includes(kwLow) ||
      (p.tags||[]).some(t=>(t||'').toLowerCase().includes(kwLow))
    );
    _renderHomeAllGrid(result);
    const rc = document.getElementById('res-count');
    if(rc) rc.textContent = `พบ ${result.length} รายการ`;
    const titleEl = document.getElementById('all-title');
    if(titleEl) titleEl.textContent = `ผลการค้นหา: "${kw}"`;
    setTimeout(()=>scrollToEl('all-sec'), 60);
    return;
  }
  // ── ถ้าอยู่หน้า listings อยู่แล้ว → ค้นหาในหน้า listings ──
  const lp = document.getElementById('page-listings');
  if(lp && lp.classList.contains('active')) {
    const inp = document.getElementById('ls-kw');
    if(inp) inp.value = kw;
    listingsInlineSearch();
    _scrollToListingsResults();
    return;
  }
  // ── อยู่หน้าอื่น → navigate ไปหน้าหลักแล้ว filter ──
  _silentShowPage('home', true);
  setTimeout(function(){
    listingsQuickSearch(kw);
  }, 80);
}

// เรียกจากปุ่ม "ค้นหา" เท่านั้น — ค้นหา + scroll ไปผลลัพธ์
function listingsDoSearchAndScroll() {
  listingsInlineSearch();
  _scrollToListingsResults();
}
// debounced version สำหรับ keyboard input (oninput) — ลด render ซ้ำ
const listingsInlineSearchDebounced = (function(){
  let _t;
  return function(){ clearTimeout(_t); _t = setTimeout(listingsInlineSearch, 350); };
})();

// ฟิลเตอร์ประเภทอสังหาโดยตรงจาก SEO sidebar
// (ไม่ผ่าน ls-type select เพราะ select มี option จำกัด)
function listingsFilterByType(typeVal) {
  closeSeoDrawer();
  const typeAliases = {
    'ทาวน์เฮ้าส์': ['ทาวน์เฮ้าส์','ทาวน์เฮาส์'],
    'ทาวน์เฮาส์':  ['ทาวน์เฮาส์','ทาวน์เฮ้าส์'],
    'ทาวน์โฮม':    ['ทาวน์โฮม','ทาวน์โฮ'],
  };
  const accepted = typeAliases[typeVal] || [typeVal];

  // ── ถ้าอยู่หน้าหลัก → filter all-grid ที่หน้าหลักแทน ──
  const homePg = document.getElementById('page-home');
  if(homePg && homePg.classList.contains('active')) {
    const base = props.length ? [...props] : (typeof MOCK!=='undefined' ? [...MOCK.props] : []);
    const result = base.filter(p => accepted.includes(p.type));
    _renderHomeAllGrid(result);
    const rc = document.getElementById('res-count');
    if(rc) rc.textContent = `พบ ${result.length} รายการ`;
    const titleEl = document.getElementById('all-title');
    if(titleEl) titleEl.textContent = `ประเภท: ${typeVal}`;
    setTimeout(()=>scrollToEl('all-sec'), 60);
    return;
  }

  // ── ถ้าอยู่หน้า listings อยู่แล้ว → filter ที่หน้า listings ──
  const lp = document.getElementById('page-listings');
  if(lp && lp.classList.contains('active')) {
    const sel = document.getElementById('ls-type');
    if(sel) {
      let matched = false;
      for(const opt of sel.options) { if(opt.value === typeVal) { sel.value = typeVal; matched = true; break; } }
      if(!matched) sel.value = '';
    }
    const base = _listingsBaseData.filter(p => accepted.includes(p.type));
    _listingsData = sortListings(base, document.getElementById('listings-sort')?.value||'default');
    _listingsTxFilter = 'ALL';
    _updateListingsTxTabs('ALL');
    _listingsCurPage = 1;
    renderListingsPage();
    _scrollToListingsResults();
    return;
  }

  // ── อยู่หน้าอื่น → navigate ไปหน้าหลักแล้ว filter ──
  _silentShowPage('home', true);
  setTimeout(function(){ listingsFilterByType(typeVal); }, 80);
}

function openListingsAdvFilter() {
  // Reuse the main adv filter popup
  const btn = document.getElementById('adv-filter-btn');
  toggleAdvFilter(btn || document.body);
}

function toggleListingsMapPanel() {
  const panel = document.getElementById('listings-map-panel');
  if(!panel) return;
  const mdPanel = document.getElementById('md-map-panel');
  const isShown = mdPanel ? mdPanel.style.display !== 'none' && mdPanel.style.display !== '' : panel.style.display !== 'none';
  
  if(mdPanel) {
    mdPanel.style.display = isShown ? 'none' : 'block';
  } else {
    panel.style.display = isShown ? 'none' : 'block';
  }
  
  const btn = document.getElementById('listings-map-toggle-btn');
  if(btn) {
    btn.innerHTML = isShown
      ? '<i class="fas fa-map-marked-alt"></i> <span class="ls-map-btn-label">ค้นหาด้วยแผนที่</span>'
      : '<i class="fas fa-times"></i> <span class="ls-map-btn-label">ปิดแผนที่</span>';
  }
  
  // Init Leaflet map first time it opens
  if(!isShown) {
    setTimeout(function(){ mdMapInit(); }, 80);
  }
}

/* ════════════════════════════════════════════════════════════════
   MATCHDOOR INTERACTIVE MAP — Leaflet + OpenStreetMap
   Airbnb/FazWaz style: price pins, popups, filter chips
   ════════════════════════════════════════════════════════════════ */
var _mdMap = null;
var _mdMapMarkers = [];
var _mdMapTxFilter = 'ALL';
var _mdMapInitDone = false;

// Location → LatLng lookup (Bangkok areas)
var _mdLocationCoords = {
  'อโศก':           [13.7360, 100.5601],
  'อโศก กรุงเทพฯ': [13.7360, 100.5601],
  'สุขุมวิท':       [13.7310, 100.5585],
  'สุขุมวิท กรุงเทพฯ':[13.7310,100.5585],
  'ทองหล่อ':        [13.7281, 100.5792],
  'เอกมัย':         [13.7239, 100.5862],
  'พร้อมพงษ์':      [13.7278, 100.5695],
  'สาทร':           [13.7226, 100.5268],
  'สาทร กรุงเทพฯ':  [13.7226, 100.5268],
  'สีลม':           [13.7272, 100.5299],
  'สีลม กรุงเทพฯ':  [13.7272, 100.5299],
  'รัชดา':          [13.7640, 100.5698],
  'รัชดา กรุงเทพฯ': [13.7640, 100.5698],
  'พระราม 9':       [13.7566, 100.5679],
  'พระราม 9 กรุงเทพฯ':[13.7566,100.5679],
  'ลาดพร้าว':       [13.8008, 100.5741],
  'ลาดพร้าว กรุงเทพฯ':[13.8008,100.5741],
  'จตุจักร':        [13.8197, 100.5604],
  'จตุจักร กรุงเทพฯ':[13.8197,100.5604],
  'พระโขนง':        [13.7019, 100.5997],
  'พระโขนง กรุงเทพฯ':[13.7019,100.5997],
  'บางนา':          [13.6717, 100.6087],
  'บางนา กรุงเทพฯ': [13.6717, 100.6087],
  'อ่อนนุช':        [13.7163, 100.5983],
  'ลาดกระบัง':      [13.7274, 100.7488],
  'ลาดกระบัง กรุงเทพฯ':[13.7274,100.7488],
  'ปากเกร็ด':       [13.9214, 100.4964],
  'ปากเกร็ด นนทบุรี':[13.9214,100.4964],
  'นนทบุรี':        [13.8594, 100.5115],
  'บางละมุง':       [12.9298, 100.8795],
  'บางละมุง ชลบุรี':[12.9298,100.8795],
  'ชลบุรี':         [13.3611, 100.9847],
  'ลาดยาว':         [13.8441, 100.5601],
  'ลาดยาว กรุงเทพฯ':[13.8441,100.5601],
  'พระราม 2':       [13.6719, 100.4754],
  'พระราม 2 ซอย 40':[13.6719,100.4754],
  'ร่มเกล้า':       [13.7680, 100.7090],
  'ร่มเกล้า กรุงเทพฯ':[13.7680,100.7090],
  'กรุงเทพฯ':       [13.7563, 100.5018],
  'กรุงเทพฯ':  [13.7563, 100.5018],
  'สยาม':           [13.7455, 100.5336],
  'ชิดลม':          [13.7445, 100.5490],
  'ราชเทวี':        [13.7540, 100.5355],
  'พญาไท':          [13.7620, 100.5362],
  'หมอชิต':         [13.8022, 100.5533],
  'อารีย์':         [13.7741, 100.5418],
  'บางซื่อ':        [13.8022, 100.5366],
  'ห้วยขวาง':       [13.7751, 100.5774],
  'ดินแดง':         [13.7649, 100.5693],
  'ห้วยขวาง กรุงเทพฯ':[13.7751,100.5774],
  'เตาปูน':         [13.8049, 100.5233],
  'สะพานควาย':      [13.7822, 100.5487],
  'วังหิน':         [13.8419, 100.6160],
  'ลาดพร้าว 71':    [13.7997, 100.5830],
};

function _mdGetCoords(p) {
  var loc = (p.location || '').trim();
  var prov = (p.province || '').trim();
  
  // Try full location first
  if(_mdLocationCoords[loc]) return _mdLocationCoords[loc];
  
  // Try location without trailing words
  var locParts = loc.split(' ');
  for(var i = locParts.length; i > 0; i--) {
    var key = locParts.slice(0,i).join(' ');
    if(_mdLocationCoords[key]) return _mdLocationCoords[key];
  }
  
  // Try province
  if(_mdLocationCoords[prov]) return _mdLocationCoords[prov];
  
  // Default: Bangkok center + small jitter
  return [13.7563 + (Math.random()-0.5)*0.08, 100.5018 + (Math.random()-0.5)*0.12];
}

function mdMapInit() {
  if(typeof L === 'undefined') {
    // Leaflet not loaded yet — wait and retry
    setTimeout(mdMapInit, 300);
    return;
  }
  
  var mapEl = document.getElementById('md-leaflet-map');
  if(!mapEl) return;
  
  // Already init — just refresh markers
  if(_mdMapInitDone && _mdMap) {
    mdMapRefreshMarkers();
    return;
  }
  
  _mdMapInitDone = true;
  
  _mdMap = L.map('md-leaflet-map', {
    center: [13.7563, 100.5018],
    zoom: 11,
    zoomControl: true,
    attributionControl: false
  });
  
  // Dark-themed tile layer matching Matchdoor's navy brand
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(_mdMap);
  
  mdMapRefreshMarkers();
  
  // Hide hint after 4 seconds
  setTimeout(function(){
    var hint = document.getElementById('md-map-hint');
    if(hint) hint.style.opacity = '0';
  }, 4000);
}

function mdMapRefreshMarkers() {
  if(!_mdMap) return;
  
  // Clear old markers
  _mdMapMarkers.forEach(function(m){ _mdMap.removeLayer(m.layer); });
  _mdMapMarkers = [];
  
  // Get data
  var data = (typeof _listingsBaseData !== 'undefined' && _listingsBaseData.length) 
    ? _listingsBaseData 
    : (typeof props !== 'undefined' ? props : (typeof MOCK !== 'undefined' ? MOCK.props : []));
  
  if(!data || !data.length) return;
  
  // Filter by TX
  var filtered = _mdMapTxFilter === 'ALL' ? data : data.filter(function(p){ return p.tx === _mdMapTxFilter; });
  
  // Update count
  var countEl = document.getElementById('md-map-showing-count');
  if(countEl) countEl.textContent = filtered.length + ' ประกาศ';
  
  var pinEl = document.getElementById('md-map-pin-count');
  if(pinEl) pinEl.textContent = '— ' + filtered.length + ' รายการ';
  
  var bounds = [];
  
  filtered.forEach(function(p) {
    var coords = _mdGetCoords(p);
    bounds.push(coords);
    
    var isRent = p.tx === 'RENT';
    var priceLabel = isRent
      ? '฿' + (p.price >= 1000 ? Math.round(p.price/1000) + 'K' : p.price.toLocaleString()) + '/ด.'
      : (p.price >= 1e6 ? '฿' + (p.price/1e6).toFixed(1).replace(/\.?0+$/,'') + 'M' : '฿' + Math.round(p.price/1000) + 'K');
    
    var pinClass = 'md-map-price-pin' + (isRent ? ' rent-pin' : '');
    
    var icon = L.divIcon({
      className: '',
      html: '<div class="' + pinClass + '">' + priceLabel + '</div>',
      iconSize: null,
      iconAnchor: [0, 0]
    });
    
    var marker = L.marker(coords, { icon: icon, zIndexOffset: 0 });
    
    // Build popup HTML
    var imgHtml = (p.photos && p.photos[0])
      ? '<img class="md-popup-img" src="' + p.photos[0] + '" loading="lazy" alt="' + (p.title||'') + '">'
      : '<div class="md-popup-img-ph">' + (({'บ้านเดี่ยว':'🏡','คอนโด':'🏢','ทาวน์โฮม':'🏘️','ที่ดิน':'🗺️','อาคารพาณิชย์':'🏪','วิลล่า':'🌅'})[p.type] || '🏠') + '</div>';
    
    var txBadge = isRent ? '<span style="background:#3D7A55;color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">เช่า</span>' : '<span style="background:var(--p);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px">ขาย</span>';
    
    var specsHtml = '';
    if(p.bed) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bed"></i>' + p.bed + '</span>';
    if(p.bath) specsHtml += '<span class="md-popup-spec"><i class="fas fa-bath"></i>' + p.bath + '</span>';
    if(p.area) specsHtml += '<span class="md-popup-spec"><i class="fas fa-ruler-combined"></i>' + p.area + 'ตร.ม.</span>';
    
    var popupHtml = '<div>' + imgHtml + 
      '<div class="md-popup-body">' +
        '<div class="md-popup-type">' + (p.type||'อสังหาฯ') + txBadge + '</div>' +
        '<div class="md-popup-title">' + (p.title||'') + '</div>' +
        '<div class="md-popup-loc"><i class="fas fa-map-marker-alt" style="color:var(--a);font-size:10px"></i> ' + (p.location||p.province||'กรุงเทพฯ') + '</div>' +
        '<div class="md-popup-price">' + (isRent ? '฿' + p.price.toLocaleString() + '/เดือน' : (p.price>=1e6 ? '฿'+(p.price/1e6).toFixed(2).replace(/\.?0+$/,'')+'M' : '฿'+p.price.toLocaleString())) + '</div>' +
        (specsHtml ? '<div class="md-popup-specs">' + specsHtml + '</div>' : '') +
        '<button class="md-popup-btn" onclick="if(typeof openModal===\'function\') openModal(\'' + p.id + '\')"><i class="fas fa-eye"></i> ดูรายละเอียด</button>' +
      '</div>' +
    '</div>';
    
    marker.bindPopup(popupHtml, {
      maxWidth: 260,
      minWidth: 260,
      offset: [130, 40]
    });
    
    marker.on('click', function() {
      // Highlight pin
      _mdMapMarkers.forEach(function(m){ 
        if(m.el) m.el.classList.remove('active'); 
      });
      var pinEl2 = marker.getElement();
      if(pinEl2) {
        var d = pinEl2.querySelector('.md-map-price-pin');
        if(d) d.classList.add('active');
      }
    });
    
    marker.addTo(_mdMap);
    _mdMapMarkers.push({ layer: marker, prop: p });
  });
  
  // Fit map to markers
  if(bounds.length) {
    try {
      if(bounds.length === 1) {
        _mdMap.setView(bounds[0], 14);
      } else {
        _mdMap.fitBounds(bounds, { padding: [40,40] });
      }
    } catch(e) {}
  }
}

function mdMapFilterTx(tx, btn) {
  _mdMapTxFilter = tx;
  document.querySelectorAll('.md-map-fchip').forEach(function(c){ c.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  mdMapRefreshMarkers();
}

function mdMapFitAll() {
  if(!_mdMap || !_mdMapMarkers.length) return;
  var bounds = _mdMapMarkers.map(function(m){ return m.layer.getLatLng(); });
  try { _mdMap.fitBounds(bounds, {padding:[40,40]}); } catch(e) {}
}

function renderListingsSeoSidebar() {
  const btnBase = 'text-align:left;padding:6px 10px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);font-size:12px;color:var(--tx);cursor:pointer;transition:.15s;display:flex;align-items:center;gap:6px;width:100%';
  // Popular areas — dynamic from data or static fallback
  const areaEl = document.getElementById('seo-popular-areas');
  if(areaEl) {
    let areas;
    if(_listingsBaseData && _listingsBaseData.length) {
      const areaCount = {};
      _listingsBaseData.forEach(p=>{ const loc = p.location||p.province||''; if(loc){ const key=loc.split(' ')[0]; areaCount[key]=(areaCount[key]||0)+1; } });
      areas = Object.entries(areaCount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([a])=>a);
      if(!areas.length) areas = ['สุขุมวิท','สาทร','รัชดา','ลาดพร้าว','อโศก','พระราม 9','บางนา','จตุจักร','พระโขนง','ทองหล่อ'];
    } else {
      areas = ['สุขุมวิท','สาทร','รัชดา','ลาดพร้าว','อโศก','พระราม 9','บางนา','จตุจักร','พระโขนง','ทองหล่อ'];
    }
    areaEl.innerHTML = areas.map(a=>`<button onclick="listingsQuickSearch('${a}')" style="${btnBase}" onmouseover="this.style.borderColor='var(--a)';this.style.color='var(--p)'" onmouseout="this.style.borderColor='var(--bd)';this.style.color='var(--tx)'"><i class="fas fa-map-marker-alt" style="color:var(--a);font-size:10px;width:12px"></i> ${a}</button>`).join('');
  }
  // Prop types
  const typeEl = document.getElementById('seo-prop-types');
  if(typeEl) {
    const types = [
      {v:'บ้านเดี่ยว',i:'fa-house-user',c:'#C8922A'},{v:'ทาวน์โฮม',i:'fa-building',c:'#1B3A6B'},
      {v:'คอนโด',i:'fa-city',c:'#3D7A55'},{v:'ทาวน์เฮาส์',i:'fa-home',c:'#7B4FBF'},
      {v:'อาคารพาณิชย์',i:'fa-store',c:'#C0392B'},{v:'ที่ดิน',i:'fa-map',c:'#E67E22'},
      {v:'วิลล่า',i:'fa-umbrella-beach',c:'#16A085'},{v:'บ้านแฝด',i:'fa-house-damage',c:'#8E44AD'}
    ];
    const typeLabels = {
      'บ้านเดี่ยว':{en:'House',cn:'独栋别墅',ja:'一戸建て'},
      'ทาวน์โฮม':{en:'Townhome',cn:'联排别墅',ja:'タウンハウス'},
      'คอนโด':{en:'Condo',cn:'公寓',ja:'コンドミニアム'},
      'ทาวน์เฮาส์':{en:'Townhouse',cn:'市政住宅',ja:'タウンハウス'},
      'อาคารพาณิชย์':{en:'Commercial',cn:'商业地产',ja:'商業施設'},
      'ที่ดิน':{en:'Land',cn:'土地',ja:'土地'},
      'วิลล่า':{en:'Villa',cn:'豪华别墅',ja:'ヴィラ'},
      'บ้านแฝด':{en:'Semi-Detached',cn:'半独栋',ja:'二世帯住宅'}
    };
    typeEl.innerHTML = types.map(t=>{
      const lbl = (typeof _lang!=='undefined' && typeLabels[t.v] && typeLabels[t.v][_lang]) ? typeLabels[t.v][_lang] : t.v;
      // ใช้ listingsFilterByType() โดยตรง ไม่ผ่าน ls-type select
      // (ls-type select มี option จำกัด ทำให้ .value ไม่ถูก set และ filter ไม่ทำงาน)
      return `<button onclick="listingsFilterByType('${t.v}')" style="${btnBase}" onmouseover="this.style.borderColor='var(--a)';this.style.color='var(--p)'" onmouseout="this.style.borderColor='var(--bd)';this.style.color='var(--tx)'"><i class="fas ${t.i}" style="color:${t.c};font-size:11px;width:14px"></i> ${lbl}</button>`;
    }).join('');
  }
  // BTS/MRT transit — comprehensive list
  const transitEl = document.getElementById('seo-transit-btns');
  if(transitEl) {
    const btsS = ['อโศก','สยาม','ชิดลม','พร้อมพงษ์','ทองหล่อ','เอกมัย','อ่อนนุช','บางจาก','บางนา','พระโขนง','อุดมสุข','แบริ่ง'];
    const btsN = ['ราชเทวี','พญาไท','อนุสาวรีย์ชัย','สนามเป้า','อารีย์','สะพานควาย','หมอชิต','ห้าแยกลาดพร้าว','รัชโยธิน','คูคต'];
    const btsW = ['วงเวียนใหญ่','โพธิ์นิมิตร','ตลาดพลู','วุฒากาศ','บางหว้า','กรุงธนบุรี'];
    const btsG = ['กรุงธนบุรี สีทอง','เจริญนคร สีทอง','คลองสาน สีทอง'];
    const mrtBl = ['หัวลำโพง','สามย่าน','สีลม','ลุมพินี','คลองเตย','ศูนย์การประชุมฯ','พระราม 9','เพชรบุรี','สุขุมวิท MRT','อโศก MRT','จตุจักร MRT','พหลโยธิน','ลาดพร้าว MRT','รัชดา','สุทธิสาร','ห้วยขวาง'];
    const mrtPu = ['เตาปูน','บางซื่อ','กรุงธนบุรี MRT สายสีม่วง','บางพลู','บางอ้อ','บางเขน MRT'];
    const srtRed = ['กลางกรุงเทพอภิวัฒน์ SRT','จตุจักร SRT','หลักสี่ SRT','ดอนเมือง SRT','รังสิต SRT'];
    const arl = ['สุวรรณภูมิ ARL','หัวหมาก ARL','รามคำแหง ARL','มักกะสัน ARL','พญาไท ARL'];
    const s = 'text-align:left;padding:5px 9px;border-radius:7px;border:1px solid var(--bd);background:var(--bg);font-size:11px;color:var(--tx);cursor:pointer;transition:.15s;width:100%';
    const sec = (label, color) => `<div style="font-size:10px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px;padding:4px 0;border-bottom:1.5px solid ${color}22">${label}</div>`;
    let h = '';
    h += sec('🟢 BTS สายสุขุมวิท (ตะวันออก)', '#0a8a3a');
    h += btsS.map(x=>`<button onclick="listingsQuickSearch('${x} BTS')" style="${s}" onmouseover="this.style.borderColor='#0a8a3a'" onmouseout="this.style.borderColor='var(--bd)'">🚈 ${x}</button>`).join('');
    h += sec('🟢 BTS สายสุขุมวิท (เหนือ)', '#0a8a3a');
    h += btsN.map(x=>`<button onclick="listingsQuickSearch('${x} BTS')" style="${s}" onmouseover="this.style.borderColor='#0a8a3a'" onmouseout="this.style.borderColor='var(--bd)'">🚈 ${x}</button>`).join('');
    h += sec('🟢 BTS สายสีลม', '#009900');
    h += btsW.map(x=>`<button onclick="listingsQuickSearch('${x} BTS')" style="${s}" onmouseover="this.style.borderColor='#009900'" onmouseout="this.style.borderColor='var(--bd)'">🚈 ${x}</button>`).join('');
    h += sec('🟤 BTS สายสีทอง', '#c8922a');
    h += btsG.map(x=>`<button onclick="listingsQuickSearch('${x}')" style="${s}" onmouseover="this.style.borderColor='#c8922a'" onmouseout="this.style.borderColor='var(--bd)'">🚉 ${x}</button>`).join('');
    h += sec('🔵 MRT สายสีน้ำเงิน', '#1a5fb4');
    h += mrtBl.map(x=>`<button onclick="listingsQuickSearch('${x}')" style="${s}" onmouseover="this.style.borderColor='#1a5fb4'" onmouseout="this.style.borderColor='var(--bd)'">🚇 ${x}</button>`).join('');
    h += sec('🟣 MRT สายสีม่วง', '#7B4FBF');
    h += mrtPu.map(x=>`<button onclick="listingsQuickSearch('${x}')" style="${s}" onmouseover="this.style.borderColor='#7B4FBF'" onmouseout="this.style.borderColor='var(--bd)'">🚇 ${x}</button>`).join('');
    h += sec('🔴 SRT สายสีแดง', '#cc2200');
    h += srtRed.map(x=>`<button onclick="listingsQuickSearch('${x}')" style="${s}" onmouseover="this.style.borderColor='#cc2200'" onmouseout="this.style.borderColor='var(--bd)'">🚇 ${x}</button>`).join('');
    h += sec('✈️ Airport Rail Link', '#555');
    h += arl.map(x=>`<button onclick="listingsQuickSearch('${x}')" style="${s}" onmouseover="this.style.borderColor='#555'" onmouseout="this.style.borderColor='var(--bd)'">🚈 ${x}</button>`).join('');
    transitEl.innerHTML = h;
  }
  // Tel link
  const telEl = document.getElementById('seo-tel-link');
  if(telEl && window.CFG && CFG.phone) { telEl.href='tel:'+CFG.phone.replace(/[^0-9]/g,''); }
}
// ===== END ENHANCED LISTINGS PAGE FUNCTIONS =====
function renderGrid(id,list,loading_sk=false){
  // Alias new-grid → new-track (new-grid was replaced by horizontal gallery)
  if(id==='new-grid'){ const nt=$('new-track'); if(nt){ renderNewGallery(list); return; } }
  // all-grid on home page uses professional empty state with LINE button
  if(id==='all-grid' && !loading_sk){ _renderHomeAllGrid(list); return; }
  const el=$(id); if(!el)return;
  if(loading_sk){
    el.innerHTML=Array(4).fill(0).map(()=>`<div class="prop-card loading-sk">
      <div class="prop-thumb"><div class="sk-img skeleton"></div></div>
      <div class="prop-body">
        <div class="sk-title skeleton"></div>
        <div class="sk-loc skeleton"></div>
        <div class="sk-price skeleton"></div>
      </div>
    </div>`).join('');
    return;
  }
  el.innerHTML=list.length?list.map(propCard).join(''):'<div class="empty" style="grid-column:1/-1"><i class="fas fa-search"></i><p>ไม่พบรายการ</p><button class="retry-btn" onclick="applyFilters()"><i class="fas fa-redo"></i> ลองใหม่</button></div>';
  // Init card image swipes after render
  setTimeout(initAllCardSwipes, 50);
}

function toggleFav(id,e){ if(e)e.stopPropagation(); const sid=String(id); const i=favs.indexOf(sid); const isAdding=(i===-1); if(isAdding)favs.push(sid); else favs.splice(i,1); localStorage.setItem('md_favs',JSON.stringify(favs)); updateFavUI(); renderFavDropdown(); if($('page-favorites').classList.contains('active'))renderFavPage(); $$(`[data-id="${sid}"]`).forEach(b=>{ const on=favs.includes(sid); b.innerHTML=on?'<i class="fas fa-heart"></i>':'<i class="far fa-heart"></i>'; b.classList.toggle('favorited',on); });
  // GA4: favorite event
  try{ if(typeof trackEvent==='function'&&isAdding){ const _p=(typeof props!=='undefined')?props.find(function(x){return String(x.id)===sid;}):null; trackEvent('favorite_add',{property_id:sid,property_title:_p?(_p.title||''):'',property_type:_p?(_p.type||''):'',price:_p?(_p.price||0):0}); } }catch(e){}
}
function clearFavs(){
  if(!favs.length)return;
  if(!confirm('ล้างรายการโปรดทั้งหมด?'))return;
  favs=[];
  localStorage.setItem('md_favs','[]');
  updateFavUI();
  renderFavDropdown();
  ['all-grid','rec-grid','new-grid','fav-page-grid'].forEach(gid=>{
    const el=document.getElementById(gid);
    if(!el)return;
    const cards=el.querySelectorAll('.prop-fav');
    cards.forEach(btn=>{
      btn.classList.remove('favorited');
      btn.innerHTML='<i class="far fa-heart"></i>';
    });
  });
  if($('page-favorites').classList.contains('active'))renderFavPage();
  toast('ล้างรายการโปรดแล้ว ❤️');
}
function updateFavUI(){ const c=favs.length;$('fav-badge').textContent=c;$('fav-count-pill').textContent=c; }
function renderFavDropdown(){ const el=$('fav-list'); const fp=props.filter(p=>favs.includes(String(p.id))); if(!fp.length){el.innerHTML='<div class="fav-empty"><i class="far fa-heart"></i><p>ยังไม่มีรายการโปรด</p></div>';return;} el.innerHTML=fp.slice(0,5).map(p=>{ const _st=sanitize(p.title||''); const _sl=sanitize(p.location||''); return `<div class="fav-item" onclick="openModal('${p.id}');closeAllDD()"><div class="fav-img">${p.photos?.[0]?`<img src="${p.photos[0]}" loading="lazy">`:(p.icon||typeIcon(p.type))}</div><div class="fav-info"><div class="fav-title">${_st}</div><div class="fav-loc"><i class="fas fa-map-marker-alt"></i> ${_sl}</div><div class="fav-price">${fmtPrice(p.price,p.tx)}</div></div><div class="fav-rm" onclick="event.stopPropagation();toggleFav('${p.id}')"><i class="fas fa-times"></i></div></div>`; }).join(''); if(fp.length>5)el.innerHTML+=`<div style="text-align:center;padding:10px;color:var(--gr);font-size:12px">และอีก ${fp.length-5} รายการ</div>`; }
function animFavCounters(total, buy, rent) {
  animateCounter($('fav-total'), total, 1200);
  animateCounter($('fav-buy'),   buy,   1200);
  animateCounter($('fav-rent'),  rent,  1200);
}
function renderFavPage(){
  const fp=props.filter(p=>favs.includes(String(p.id)));
  animateCounter($('fav-total'), fp.length, 1200);
  animateCounter($('fav-buy'), fp.filter(p=>p.tx==='BUY').length, 1200);
  animateCounter($('fav-rent'), fp.filter(p=>p.tx==='RENT').length, 1200);
  renderGrid('fav-page-grid',fp);
}
function shareFavs(){ const fp=props.filter(p=>favs.includes(String(p.id))); if(!fp.length)return toast('ไม่มีรายการโปรด'); const url = location.origin + '/favorites'; if(navigator.share){ navigator.share({title:'รายการโปรด Matchdoor',text:`อสังหาฯ ที่น่าสนใจ ${fp.length} รายการ`,url}); } else { navigator.clipboard?.writeText(url).then(()=>toast('คัดลอก URL แล้ว ✅')); } }

function openModal(id){
  // ── ถ้าเปิดจาก all-modal ให้จำไว้ (ไม่ปิด all-modal ทิ้ง — จะ restore หลัง closeModal) ──
  const allModalOpen = $('all-modal').classList.contains('open');
  window._openedFromAllModal = allModalOpen;
  if(allModalOpen) {
    // ไม่ซ่อน all-modal — ให้ prop-modal ลอยอยู่เหนือด้วย z-index ที่สูงกว่า
    // all-modal จะยังมองเห็นอยู่เบื้องหลัง prop-modal
  }
  const p=props.find(x=>String(x.id)==String(id));
  if(!p)return;
  const a=agents.find(x=>x.id===p.agentId);
  // ── Track view history ──
  try{
    let h=JSON.parse(localStorage.getItem('md_view_history')||'[]');
    h=h.filter(x=>String(x)!==String(id));
    h.unshift(String(id));
    if(h.length>50) h=h.slice(0,50);
    localStorage.setItem('md_view_history',JSON.stringify(h));
  }catch(e){}

  // ── bump generation + abort ทันที — หยุด batch idle ที่กำลัง render listings อยู่ ──
  if(typeof window._listingsRenderGen !== 'undefined') {
    window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
  }
  window._listingsRenderAbort = true;
  window._listingsBatchInFlight = false;
  _listingsRenderPending = false;
  window._listingsRenderQueued = false;

  // ══════════════════════════════════════════════════════════════
  // INSTANT OPEN: fill ALL visible content SYNCHRONOUSLY ก่อน .open
  // ไม่ใช้ rAF wrapper สำหรับ critical content — ทำให้ modal ปรากฏพร้อม content ทันที
  // ══════════════════════════════════════════════════════════════

  // 1) Title (ต้องมาก่อน .open เสมอ)
  $('m-title').textContent = p.title;

  // 2) Price — inline synchronous
  const priceEl = $('m-price');
  priceEl.innerHTML = `${fmtPrice(p.price,p.tx)}
    ${p.tx==='BUY'?`<button onclick="toggleLoanCalc(${p.price})" style="vertical-align:middle;margin-left:10px;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;border:none;cursor:pointer" title="คำนวณสินเชื่อ"><i class="fas fa-calculator"></i> คำนวณสินเชื่อ</button>`:''}`;
  let lc = document.getElementById('modal-loan-calc');
  if(!lc){
    lc = document.createElement('div');
    lc.id = 'modal-loan-calc';
    lc.style.cssText = 'max-height:0;overflow:hidden;transition:max-height .4s ease;margin-bottom:0';
    priceEl.parentNode.insertBefore(lc, priceEl.nextSibling);
  } else { lc.style.maxHeight='0'; lc.innerHTML=''; }

  // 3) Location + Tags + Desc — synchronous
  $('m-loc').innerHTML='<i class="fas fa-map-marker-alt"></i> '+sanitize(p.location||'')+(p.province?` · ${sanitize(p.province)}`:'');
  $('m-desc').textContent=p.desc||p.description||'ติดต่อสอบถามรายละเอียดเพิ่มเติมกับทีมงาน Matchdoor';
  $('m-tags').innerHTML=`<span class="ptag pt-type">${ui('type.'+p.type)||p.type}</span><span class="ptag ${p.tx==='RENT'?'pt-rent':'pt-buy'}">${p.tx==='RENT'?`<i class="fas fa-key"></i> ${ui('card.rent')}`:`<i class="fas fa-tag"></i> ${ui('card.buy')}`}</span>${p.province?`<span class="ptag">${p.province}</span>`:''}${p.isNew?`<span class="ptag" style="background:#e8fdf5;border-color:#a7f3d0;color:#065f46"><i class="fas fa-star"></i> ${ui('card.new')}</span>`:''}${p.isRec?'<span class="ptag pb-hot" style="color:#fff;border-color:transparent">🔥 Hot</span>':''}`;

  // 4) Specs — synchronous
  const specs=[];
  if(p.area>0) specs.push({val:p.area,lab:ui('spec.area'),icon:'fa-ruler-combined',col:'#7c6fcd'});
  specs.push({val:p.land_area>0?p.land_area:'—',lab:ui('spec.land'),icon:'fa-map',col:'#059669'});
  if(p.bed>0) specs.push({val:p.bed,lab:ui('spec.bed'),icon:'fa-bed',col:'#0369a1'});
  if(p.bath>0) specs.push({val:p.bath,lab:ui('spec.bath'),icon:'fa-shower',col:'#0891b2'});
  if(p.parking>0) specs.push({val:p.parking,lab:ui('spec.park'),icon:'fa-car',col:'#059669'});
  {const fl=p.floor_no>0&&p.floors>0?`${p.floor_no}/${p.floors}`:(p.floors>0?String(p.floors):'—'); specs.push({val:fl,lab:ui('spec.floor'),icon:'fa-building',col:'#4f46e5'});}
  const furnLabelS={'full':ui('spec.furn.full'),'partial':ui('spec.furn.partial'),'none':ui('spec.furn.none')};
  if(p.furniture) specs.push({val:furnLabelS[p.furniture]||p.furniture,lab:ui('spec.furn'),icon:'fa-couch',col:p.furniture==='full'?'#00895e':p.furniture==='partial'?'#c97b00':'#999'});
  specs.push({val:p.pets_allowed?'✔':'✖',lab:ui('spec.pets'),icon:'fa-paw',col:p.pets_allowed?'#be185d':'#aaa'});
  if(!specs.length) specs.push({val:(p.price/1e6).toFixed(1),lab:'ล้านบาท',icon:'fa-tag',col:'var(--a)'});
  $('m-specs').className='specs-grid-8';
  $('m-specs').innerHTML=specs.map(s=>`<div class="spec-8"><div class="spec-8-val" style="color:${s.col}"><i class="fas ${s.icon}" style="font-size:11px;margin-right:3px"></i>${s.val}</div><div class="spec-8-lab">${s.lab}</div></div>`).join('');

  // 5) Slider — synchronous (รูปแรก eager load)
  slide_photos=(p.photos?.length)?p.photos:[`https://picsum.photos/id/${(p.id+'').charCodeAt(1)||101}/800/600`];
  slide_icon=p.icon||typeIcon(p.type);
  slide_cur=0;
  renderSlider();

  // 6) Agent — synchronous
  const ab=$('m-agent');
  if(a){ab.style.display='flex';ab.style.cursor='pointer';ab.onclick=()=>showAgentDetail(a);ab.title='ดูข้อมูลตัวแทน';$('m-ag-av').textContent=a.initials||a.name[0];$('m-ag-av').style.background=a.color||'#0f3460';$('m-ag-name').textContent=a.name;$('m-ag-name').style.textDecoration='underline dotted';$('m-ag-name').style.color='var(--a)';$('m-ag-role').textContent=a.title;}
  else ab.style.display='none';

  // 7) CTA + Fav — synchronous
  const lid=a?.lineId||C.LINE, ph=a?.phone||C.PHONE;
  $('m-ln').href=lineUrl(lid);
  $('m-ln').onclick=function(){ trackLineClick('modal', p.id); };
  $('m-tel').href='tel:'+ph;
  $('m-tel').onclick=function(){ trackPhoneClick('modal', p.id); };
  const _isFaved = favs.includes(String(p.id));
  const _favBtn = $('m-fav-btn');
  const _favLabel = $('m-fav-label');
  if(_favBtn){ _favBtn.className='modal-fav-btn'+(_isFaved?' favorited':''); _favBtn.innerHTML=_isFaved?'<i class="fas fa-heart"></i>':'<i class="far fa-heart"></i>'; }
  if(_favLabel){ _favLabel.textContent=_isFaved?ui('modal.fav.added'):ui('modal.fav.add'); }

  // 8) Clear heavy sections ที่จะ fill ใน idle (ให้ไม่มี stale content)
  $('m-extras').innerHTML='';
  $('m-chips').innerHTML='';
  $('m-nearby').innerHTML='';
  const mapC=$('m-map'); if(mapC) mapC.innerHTML='';

  window._currentModalId = String(p.id);

  // ── เปิด modal ทันทีหลัง fill content ครบ — ไม่มี rAF wrapper ──
  // iOS scroll-lock: ใช้ overflow:hidden บน body เท่านั้น
  const _scrollY = window.scrollY || window.pageYOffset;
  document.body._savedScrollY = _scrollY;
  document.body.classList.add('modal-open');
  $('prop-modal').classList.add('open');

  // scroll modal กลับบนสุด
  const modalEl = $('prop-modal').querySelector('.modal');
  if(modalEl) modalEl.scrollTop=0;

  // init swipe หลัง modal เปิด
  initModalSwipe();

  // ── Defer heavy NON-VISIBLE content ไปยัง idle ──
  // extras/nearby/map ไม่ต้องการสำหรับ first paint — defer หลัง modal render แล้ว
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 50));
  idle(() => {
      // Extras (appliances, deposit, electric etc.)
      const appIconMap={'แอร์':'fa-snowflake','ตู้เย็น':'fa-temperature-low','เครื่องซักผ้า':'fa-tshirt','ไมโครเวฟ':'fa-microwave','เตาไฟฟ้า':'fa-fire-burner','โทรทัศน์':'fa-tv','เครื่องทำน้ำอุ่น':'fa-hot-tub','ระบบรักษาความปลอดภัย':'fa-shield-alt'};
      const appColorMap={'แอร์':'#0ea5e9','ตู้เย็น':'#06b6d4','เครื่องซักผ้า':'#8b5cf6','ไมโครเวฟ':'#f59e0b','เตาไฟฟ้า':'#ef4444','โทรทัศน์':'#3b82f6','เครื่องทำน้ำอุ่น':'#f97316','ระบบรักษาความปลอดภัย':'#10b981'};
      const appList=Array.isArray(p.appliances)?p.appliances.filter(Boolean):[];
      const nearbyPlaces = Array.isArray(p.nearby_places)?p.nearby_places.filter(Boolean):(p.nearby_places?[p.nearby_places]:[]);
      const _bahtLabel=(typeof _lang!=='undefined'&&_lang==='en')?'THB':(_lang==='cn'?'铢':_lang==='ja'?'バーツ':'บาท');
      const _noneLabel=(typeof _lang!=='undefined'&&_lang==='en')?'None':(_lang==='cn'?'无':_lang==='ja'?'なし':'ไม่มี');
      const _perUnitLabel=(typeof _lang!=='undefined'&&_lang==='en')?'THB/unit':(_lang==='cn'?'铢/度':_lang==='ja'?'バーツ/単位':'บาท/หน่วย');
      const _meterLabel=(typeof _lang!=='undefined'&&_lang==='en')?'By meter':(_lang==='cn'?'按表计':_lang==='ja'?'メーター通り':'ตามมิเตอร์');
      const _perMonthLabel=(typeof _lang!=='undefined'&&_lang==='en')?'THB/mo':(_lang==='cn'?'铢/月':_lang==='ja'?'バーツ/月':'บาท/เดือน');

      let extraHtml='<div class="modal-extras">';
      if(appList.length){
        const appChips=appList.map(app=>`<span class="app-chip" style="--ac:${appColorMap[app]||'#555'}"><i class="fas ${appIconMap[app]||'fa-plug'}"></i> ${app}</span>`).join('');
        extraHtml+=`<div class="modal-extra-row modal-extra-apps"><div class="modal-extra-icon" style="background:#f0f7ff;color:#0369a1"><i class="fas fa-plug"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.appliances')} (${appList.length})</div><div class="modal-extra-val">${appChips}</div></div></div>`;
      }
      if(nearbyPlaces.length){
        extraHtml+=`<div class="modal-extra-row modal-extra-apps"><div class="modal-extra-icon" style="background:#e0eaf7;color:#0369a1"><i class="fas fa-map-marker-alt"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.nearby.places')}</div><div class="modal-extra-val">${nearbyPlaces.map(pl=>`<span class="app-chip" style="--ac:#0369a1"><i class="fas fa-map-marker-alt"></i> ${pl}</span>`).join('')}</div></div></div>`;
      } else {
        extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#e0eaf7;color:#0369a1"><i class="fas fa-map-marker-alt"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.nearby.places')}</div><div class="modal-extra-val" style="color:#aaa">—</div></div></div>`;
      }
      const depositVal=p.deposit!=null?(p.deposit>0?`<b>${p.deposit.toLocaleString()}</b> ${_bahtLabel}`:_noneLabel):'—';
      extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#fef3c7;color:#b45309"><i class="fas fa-shield-alt"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.deposit2')}</div><div class="modal-extra-val">${depositVal}</div></div></div>`;
      if(p.tx==='RENT'){
        const leaseTerms=Array.isArray(p.lease_terms)?p.lease_terms:(p.lease_terms?[p.lease_terms]:[]);
        const minLease=p.min_lease_months||p.min_lease||null;
        let rentDurVal='—';
        if(leaseTerms.length) rentDurVal=leaseTerms.map(t=>`<span class="app-chip" style="--ac:#0369a1">${t}</span>`).join('');
        else if(minLease){ const _minL=(typeof _lang!=='undefined'&&_lang==='en')?'Min':(_lang==='cn'?'最少':_lang==='ja'?'最低':'ขั้นต่ำ'); const _monL=(typeof _lang!=='undefined'&&_lang==='en')?'months':(_lang==='cn'?'个月':_lang==='ja'?'ヶ月':'เดือน'); rentDurVal=`${_minL} <b>${minLease}</b> ${_monL}`; }
        else if(p.rent_duration||p.rentDuration) rentDurVal=`<b>${p.rent_duration||p.rentDuration}</b>`;
        const _rdL=(typeof _lang!=='undefined'&&_lang==='en')?'Lease Duration':(_lang==='cn'?'租期':_lang==='ja'?'賃貸期間':'ระยะเวลาเช่า');
        extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#e0f2fe;color:#0369a1"><i class="fas fa-calendar-alt"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${_rdL}</div><div class="modal-extra-val">${rentDurVal}</div></div></div>`;
      }
      const advanceVal=p.advance_payment!=null?(p.advance_payment>0?`<b>${p.advance_payment.toLocaleString()}</b> ${_bahtLabel}`:_noneLabel):'—';
      extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#ecfdf5;color:#059669"><i class="fas fa-calendar-check"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.advance')}</div><div class="modal-extra-val">${advanceVal}</div></div></div>`;
      const elecVal=p.electric_rate!=null?(p.electric_rate>0?`<b>${p.electric_rate}</b> ${_perUnitLabel}`:_meterLabel):'—';
      extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#fff7ed;color:#ea580c"><i class="fas fa-bolt"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.elec')}</div><div class="modal-extra-val">${elecVal}</div></div></div>`;
      const waterVal=p.water_rate!=null?(p.water_rate>0?`<b>${p.water_rate}</b> ${_perUnitLabel}`:_meterLabel):'—';
      extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#eff6ff;color:#2563eb"><i class="fas fa-tint"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.water')}</div><div class="modal-extra-val">${waterVal}</div></div></div>`;
      const svcVal=p.service_fee!=null?(p.service_fee>0?`<b>${p.service_fee.toLocaleString()}</b> ${_perMonthLabel}`:_noneLabel):'—';
      extraHtml+=`<div class="modal-extra-row"><div class="modal-extra-icon" style="background:#f5f3ff;color:#7c3aed"><i class="fas fa-receipt"></i></div><div class="modal-extra-info"><div class="modal-extra-label">${ui('modal.svcfee')}</div><div class="modal-extra-val">${svcVal}</div></div></div>`;
      extraHtml+='</div>';
      $('m-extras').innerHTML=extraHtml;

      // Chips
      const chipContainer=document.getElementById('m-chips');
      if(chipContainer){
        const appList2=Array.isArray(p.appliances)?p.appliances.filter(Boolean):[];
        const furnList=Array.isArray(p.furniture_items)?p.furniture_items.filter(Boolean):[];
        const amenList=Array.isArray(p.amenities)?p.amenities.filter(Boolean):[];
        const appIconMap2={'แอร์':'❄️','ตู้เย็น':'🧊','เครื่องซักผ้า':'👕','ไมโครเวฟ':'📦','เตาไฟฟ้า':'🍳','โทรทัศน์':'📺','เครื่องทำน้ำอุ่น':'🚿','ระบบรักษาความปลอดภัย':'🔒'};
        let chipHtml='';
        if(appList2.length) chipHtml+=`<div class="chip-list-wrap"><div class="chip-list-label"><i class="fas fa-plug"></i> ${ui('chip.appliances')}</div><div class="chip-scroll">${appList2.map(a=>`<span class="chip-item chip-app">${appIconMap2[a]||'⚡'} ${a}</span>`).join('')}</div></div>`;
        if(furnList.length) chipHtml+=`<div class="chip-list-wrap"><div class="chip-list-label"><i class="fas fa-couch"></i> ${ui('chip.furniture')}</div><div class="chip-scroll">${furnList.map(f=>`<span class="chip-item chip-furn">🪑 ${f}</span>`).join('')}</div></div>`;
        if(amenList.length) chipHtml+=`<div class="chip-list-wrap"><div class="chip-list-label"><i class="fas fa-swimming-pool"></i> ${ui('chip.amenities')}</div><div class="chip-scroll">${amenList.map(am=>`<span class="chip-item chip-amen">✨ ${am}</span>`).join('')}</div></div>`;
        chipContainer.innerHTML=chipHtml;
      }

      // ══ Map section — Leaflet mini-map in modal (Airbnb-style) ══
      const mapContainer=$('m-map');
      if(mapContainer){
        const _coords = _mdGetCoords ? _mdGetCoords(p) : [13.7563 + (Math.random()-0.5)*0.05, 100.5018 + (Math.random()-0.5)*0.08];
        mapContainer.innerHTML = '<div id="m-mini-map-btn-wrap" style="border:1.5px solid var(--bd);border-radius:12px;overflow:hidden;cursor:pointer;transition:.2s" onmouseover="this.style.borderColor=\'var(--a)\'" onmouseout="this.style.borderColor=\'var(--bd)\'"><div style="display:flex;align-items:center;gap:10px;padding:13px 18px;background:var(--lt)"><i class="fas fa-map-marked-alt" style="font-size:18px;color:var(--a)"></i><div><div style="font-size:14px;font-weight:700;color:var(--p)">ดูตำแหน่งบนแผนที่</div><div style="font-size:12px;color:var(--gr)">' + (p.location||p.province||'กรุงเทพฯ') + '</div></div><i class="fas fa-chevron-down" style="margin-left:auto;font-size:12px;color:var(--gr)"></i></div></div>';
        const _btn = mapContainer.querySelector('#m-mini-map-btn-wrap');
        if(_btn) _btn.addEventListener('click', function(){
          this.style.display='none';
          const _miniMapDiv = document.createElement('div');
          _miniMapDiv.id = 'm-modal-mini-map';
          _miniMapDiv.style.cssText = 'height:240px;border-radius:12px;overflow:hidden;border:1.5px solid var(--bd)';
          mapContainer.appendChild(_miniMapDiv);
          // init leaflet mini map
          if(typeof L !== 'undefined'){
            const _mm = L.map('m-modal-mini-map', {center:_coords, zoom:14, zoomControl:false, attributionControl:false});
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(_mm);
            const _priceStr = (p.tx==='RENT') ? ('฿'+p.price.toLocaleString()+'/เดือน') : (p.price>=1e6?'฿'+(p.price/1e6).toFixed(1).replace(/\.?0+$/,'')+'M':'฿'+Math.round(p.price/1000)+'K');
            const _pinIcon = L.divIcon({className:'',html:'<div class="md-map-price-pin active' + (p.tx==='RENT'?' rent-pin':'') + '">' + _priceStr + '</div>',iconSize:null,iconAnchor:[0,0]});
            L.marker(_coords,{icon:_pinIcon}).addTo(_mm);
            setTimeout(function(){ _mm.invalidateSize(); }, 100);
          }
        });
      }

      // 360
      const panoramaUrl=p.panorama_url||(slide_photos.length?slide_photos[0]:null);
      window._current360Url=panoramaUrl;
      const vw=document.getElementById('m-360-viewer-wrap');
      const chevron=document.getElementById('m-360-chevron');
      if(vw) vw.style.display='none';
      if(chevron) chevron.style.transform='';
      if(typeof close360==='function') close360();

      // Nearby (most expensive — last)
      const nearbyContainer=document.getElementById('m-nearby');
      if(nearbyContainer) renderNearbyProps(p, nearbyContainer);
    });
}
function renderSlider(){ const c=$('slides'),d=$('sdots'); if(!slide_photos.length){c.innerHTML=`<div class="slide-ph">${slide_icon}</div>`;d.innerHTML='';return;} c.innerHTML=slide_photos.map((u,i)=>`<img src="${u}" loading="${i===0?'eager':'lazy'}" decoding="async">`).join(''); d.innerHTML=slide_photos.map((_,i)=>`<span class="dot ${i===slide_cur?'active':''}" onclick="goSlide(${i})"></span>`).join(''); c.style.transition='none'; c.style.transform=`translateX(-${slide_cur*100}%)`; }
function slide(dir){ if(!slide_photos.length)return; slide_cur=(slide_cur+dir+slide_photos.length)%slide_photos.length; const c=$('slides'),d=$('sdots'); if(!c)return; c.style.transition='transform .38s cubic-bezier(.25,.46,.45,.94)'; c.style.transform=`translateX(-${slide_cur*100}%)`; if(d) d.querySelectorAll('.dot').forEach((el,i)=>el.classList.toggle('active',i===slide_cur)); }
function goSlide(i){ slide_cur=i; const c=$('slides'),d=$('sdots'); if(!c)return; c.style.transition='transform .38s cubic-bezier(.25,.46,.45,.94)'; c.style.transform=`translateX(-${slide_cur*100}%)`; if(d) d.querySelectorAll('.dot').forEach((el,j)=>el.classList.toggle('active',j===slide_cur)); }
function closeModal(e){
  // กรณีกด overlay: ต้องกดที่ตัว .ov เท่านั้น ไม่ใช่ content ด้านใน
  if(e && e.target && e.target.id !== 'prop-modal') return;

  const modal = $('prop-modal');
  if(!modal) return;

  // Safety net: ถ้า modal ไม่ได้ open อยู่ ให้ reset lock ทุกอย่างแล้วออก
  if(!modal.classList.contains('open')) {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('left');
    document.body.classList.remove('modal-open');
    // bump generation ก่อน reset — ป้องกัน stale batch ที่อาจค้างอยู่
    if(typeof window._listingsRenderGen !== 'undefined') {
      window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
    }
    window._listingsRenderAbort = false;
    _listingsRenderPending = false;
    window._listingsRenderQueued = false;
    window._listingsBatchInFlight = false;
    return;
  }

  // ── abort pending idle batch renders ทันที — ก่อนทุกอย่าง ──
  // เพิ่ม generation ทันที เพื่อให้ batch ที่ค้างอยู่ abort ตัวเองโดยไม่ต้องรอ flag
  if(typeof window._listingsRenderGen !== 'undefined') {
    window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
  }
  window._listingsRenderAbort = true;
  window._listingsBatchInFlight = false; // idle batch จะ return ทันทีเมื่อเจอ abort/generation

  // ปิด 360 viewer ก่อน
  if(typeof close360==='function') close360();

  // อ่าน savedY ก่อน clear
  const savedY = document.body._savedScrollY || 0;
  document.body._savedScrollY = 0;

  // ── ถ้าเปิดการ์ดมาจาก all-modal → ปิดแค่ prop-modal, all-modal ยังคงเปิดอยู่ ──
  if(window._openedFromAllModal) {
    window._openedFromAllModal = false;
    modal.classList.remove('open');
    window._currentModalId = null;
    // ไม่ unlock scroll เพราะ all-modal ยังเปิดอยู่ต้องการ modal-open
    // (document.body.classList ยังคง modal-open ไว้)
    requestAnimationFrame(function() {
      if(typeof window._listingsRenderGen !== 'undefined') {
        window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
      }
      window._listingsRenderAbort = false;
      _listingsRenderPending = false;
      window._listingsRenderQueued = false;
      window._listingsBatchInFlight = false;
    });
    return;
  }

  // unlock scroll และปิด modal ใน 1 ชุดคำสั่ง (กรณีไม่ได้มาจาก all-modal)
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('width');
  document.body.style.removeProperty('left');
  document.body.classList.remove('modal-open');
  modal.classList.remove('open');
  window._currentModalId = null;

  // ── FIX ข้อ 6: restore listings page หลัง modal ปิด — ใช้ logic เดียวกับ ข้อ 1-4 ──
  // ใช้ requestAnimationFrame เดียว ไม่มี nested setTimeout ป้องกัน race condition
  const _prevPage = window._pageBeforeModal || 'home';
  requestAnimationFrame(function() {
    // bump generation + reset flags ทั้งหมดก่อน render เสมอ
    if(typeof window._listingsRenderGen !== 'undefined') {
      window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
    }
    window._listingsRenderAbort = false;
    _listingsRenderPending = false;
    window._listingsRenderQueued = false;
    window._listingsBatchInFlight = false;
    // restore scroll position
    if(savedY > 0) window.scrollTo(0, savedY);
    // render listings ถ้าเปิดการ์ดมาจากหน้า listings
    const listingsPage = document.getElementById('page-listings');
    if(_prevPage === 'listings' && listingsPage && listingsPage.classList.contains('active')) {
      if(typeof renderListingsPage === 'function') renderListingsPage();
    }
  });
}
// Helper: build SEO-friendly property URL from prop object
function propUrl(p) {
  if (!p) return '#';
  const slug = (p.title||'')
    .toLowerCase()
    .replace(/[^ก-๙a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return '/property/' + p.id + (slug ? '-' + slug : '');
}
function openAllModal(type){
  // ── Clean up any portal-orphaned madv panel from previous modal session ──
  const _stalePanel = document.getElementById('madv-loc-panel');
  if(_stalePanel && _stalePanel.parentNode === document.body) {
    _stalePanel.remove();
  }
  // Reset madv state so province dropdown starts fresh each time modal opens
  _madvLevel = 'top'; _madvProv = ''; _madvDist = '';
  const m=$('all-modal'),t=$('all-title2'),b=$('all-body');
  let title='',data=[];
  window._modalCurrentType = type;
  // ถ้าเปิด rec หรือ new ตรงๆ (ไม่ใช่ restore จาก viewall) ให้ clear parent type
  if(type==='rec'||type==='new') window._allModalParentType = null;
  if(type==='rec'){
    title=ui('modal.rec.title');
    data = props.filter(p=>p.isRec);
    if(!data.length) data = sortListings([...props],'default').slice(0,20);
  }
  else if(type==='new'){
    title=ui('modal.new.title');
    data = props.filter(p=>p.isNew);
    if(!data.length) data = sortListings([...props],'newest').slice(0,20);
  }
  else if(type==='all'){
    title=ui('sec.all');
    // ใช้ allFiltered ถ้ามี filter ใช้งานอยู่ (เพื่อให้ modal แสดงผลตรงกับ filter ปัจจุบัน)
    const hasActiveFilter = allFiltered && allFiltered.length > 0 && allFiltered.length < props.length;
    data = hasActiveFilter ? [...allFiltered] : (props.length ? [...props] : (typeof MOCK!=='undefined' ? [...MOCK.props] : []));
  }
  else if(type==='services'){
    title=ui('modal.srv.title');
    const html=`<div class="osrv-grid">${services.map(s=>srvCard(s)).join('')}</div>`;
    t.textContent=title; b.innerHTML=html; var _fs=document.getElementById('all-modal-filter-sticky');if(_fs)_fs.innerHTML=''; _openModal('all-modal'); b.scrollTop=0; return;
  }
  else if(type==='blog'){
    title=ui('modal.blog.title');
    const html=`<div class="blog-grid">${blogs.map(bg=>blogCardFull(bg)).join('')}</div>`;
    t.textContent=title; b.innerHTML=html; var _fs=document.getElementById('all-modal-filter-sticky');if(_fs)_fs.innerHTML=''; _openModal('all-modal'); b.scrollTop=0; return;
  }
  else return;

  // rec / new / all: show with sort toolbar + paginated prop-grid
  const _PER = 32;
  window._modalTypeData = { type, data: [...data], currentPage: 1, perPage: _PER };

  function _modalRenderPage(pageData, curPage) {
    const total = pageData.length;
    const totalPages = Math.ceil(total / _PER);
    const start = (curPage-1)*_PER;
    const slice = pageData.slice(start, start+_PER);
    const grid = document.getElementById('modal-prop-grid');
    if(grid){
      if(slice.length === 0 && total === 0){
        const lang = (typeof _lang!=='undefined' && _lang) ? _lang : 'th';
        const lineHref = (typeof C!=='undefined' && C && C.LINE) ? 'https://line.me/R/ti/p/'+C.LINE : 'https://line.me/ti/p/matchdoor';
        const t2 = {
          th:{ ico:'🔍', h:'ไม่พบทรัพย์ที่ตรงกับเงื่อนไข',
               sub:'ลองปรับเงื่อนไขการค้นหา หรือ<br>ให้ทีมงานของเราช่วยหาทรัพย์ที่ใช่ให้คุณโดยตรง',
               cta:'📩 ฝากความต้องการซื้อ-เช่า ให้ทีมงานหาให้',
               reset:'🔄 รีเซ็ตการค้นหา' },
          en:{ ico:'🔍', h:'No listings match your criteria',
               sub:"Try adjusting your filters, or let our team find<br>the perfect property for you.",
               cta:"📩 Leave your requirements — we'll find it for you",
               reset:'🔄 Reset search' },
          cn:{ ico:'🔍', h:'没有找到符合条件的房源',
               sub:'请尝试调整筛选条件，<br>或让我们的团队为您寻找合适的房产。',
               cta:'📩 留下需求，让我们为您寻找',
               reset:'🔄 重置搜索' },
          ja:{ ico:'🔍', h:'条件に合う物件が見つかりません',
               sub:'検索条件を調整するか、<br>担当チームに理想の物件を探してもらいましょう。',
               cta:'📩 ご要望を送る — スタッフが探します',
               reset:'🔄 検索をリセット' },
        };
        const msg = t2[lang] || t2.th;
        grid.innerHTML = `<div style="grid-column:1/-1;display:flex;justify-content:center;padding:20px 12px 40px">
          <div style="text-align:center;max-width:420px;width:100%">
            <div style="font-size:48px;margin-bottom:14px;line-height:1">${msg.ico}</div>
            <p style="font-size:16px;font-weight:700;color:var(--tx);margin-bottom:10px">${msg.h}</p>
            <p style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:24px">${msg.sub}</p>
            <div style="display:flex;flex-direction:column;gap:10px">
              <a href="${lineHref}" target="_blank" rel="noopener"
                 style="display:flex;align-items:center;justify-content:center;gap:10px;
                        background:#06C755;color:#fff;text-decoration:none;
                        border-radius:12px;padding:13px 20px;font-size:14px;font-weight:700;
                        box-shadow:0 4px 18px rgba(6,199,85,.38);transition:.2s"
                 onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter=''">
                <i class="fab fa-line" style="font-size:20px"></i> ${msg.cta}
              </a>
              <button onclick="modalAdvReset(window._modalCurrentType)"
                 style="display:flex;align-items:center;justify-content:center;gap:8px;
                        background:var(--lt);color:var(--tx);
                        border:1.5px solid var(--bd);border-radius:12px;
                        padding:12px 20px;font-size:13px;font-weight:600;cursor:pointer;
                        transition:.2s"
                 onmouseover="this.style.borderColor='var(--a)'" onmouseout="this.style.borderColor='var(--bd)'">
                ${msg.reset}
              </button>
            </div>
          </div>
        </div>`;
      } else {
        grid.innerHTML = slice.map(propCard).join('');
      }
      setTimeout(initAllCardSwipes,50);
    }
    // pagination bar
    const pgInfo = document.getElementById('modal-pg-info');
    const pgCtrl = document.getElementById('modal-pg-controls');
    const pgWrap = document.getElementById('modal-pg-wrap');
    if(!pgWrap) return;
    if(totalPages<=1){ pgWrap.style.display='none'; return; }
    pgWrap.style.display='';
    const startI=(curPage-1)*_PER+1, endI=Math.min(curPage*_PER,total);
    const langTh=(typeof _lang==='undefined'||!_lang||_lang==='th');
    const pgFirst=langTh?'หน้าแรก':_lang==='en'?'First':_lang==='cn'?'首页':'最初';
    const pgPrev =langTh?'ก่อนหน้า':_lang==='en'?'Prev':_lang==='cn'?'上一页':'前へ';
    const pgNext =langTh?'ถัดไป':_lang==='en'?'Next':_lang==='cn'?'下一页':'次へ';
    const pgLast =langTh?'หน้าสุดท้าย':_lang==='en'?'Last':_lang==='cn'?'末页':'最後';
    const ofTxt  =langTh?'จาก':_lang==='en'?'of':_lang==='cn'?'，共':'/';
    const itTxt  =langTh?'รายการ':_lang==='en'?'listings':_lang==='cn'?'个房源':'件';
    if(pgInfo) pgInfo.textContent=`${startI}–${endI} ${ofTxt} ${total} ${itTxt}`;
    const pages=buildPageRange(curPage,totalPages);
    let html='';
    html+=`<button class="pg-btn pg-first${curPage===1?' disabled':''}" onclick="window._modalGoPage(1)" ${curPage===1?'disabled':''} title="${pgFirst}"><i class="fas fa-angle-double-left"></i> <span class="pg-label">${pgFirst}</span></button>`;
    html+=`<button class="pg-btn pg-prev${curPage===1?' disabled':''}" onclick="window._modalGoPage(${curPage-1})" ${curPage===1?'disabled':''} title="${pgPrev}"><i class="fas fa-angle-left"></i></button>`;
    for(const p of pages){
      if(p==='...'){ html+='<span class="pg-ellipsis">…</span>'; }
      else{ html+=`<button class="pg-btn${p===curPage?' active':''}" onclick="window._modalGoPage(${p})">${p}</button>`; }
    }
    html+=`<button class="pg-btn pg-next${curPage===totalPages?' disabled':''}" onclick="window._modalGoPage(${curPage+1})" ${curPage===totalPages?'disabled':''} title="${pgNext}"><i class="fas fa-angle-right"></i></button>`;
    html+=`<button class="pg-btn pg-last${curPage===totalPages?' disabled':''}" onclick="window._modalGoPage(${totalPages})" ${curPage===totalPages?'disabled':''} title="${pgLast}"><span class="pg-label">${pgLast}</span> <i class="fas fa-angle-double-right"></i></button>`;
    if(pgCtrl) pgCtrl.innerHTML=html;
  }

  window._modalGoPage = function(page) {
    if(!window._modalTypeData) return;
    const d=window._modalTypeData;
    const totalPages=Math.ceil(d.data.length/d.perPage);
    if(page<1||page>totalPages) return;
    d.currentPage=page;
    _modalRenderPage(d.data,page);
    const bd=$('all-body'); if(bd) bd.scrollTop=0;
  };
  // store render fn for sort changes
  window._modalRenderPage = _modalRenderPage;

  // ── header action buttons: map + viewall (injected into modal header beside ×) ──
  const _viewAllBtn = type!=='all'
    ? `<button onclick="window._allModalParentType='${type}';openAllModal('all')" style="padding:6px 13px;background:var(--p);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0"><i class="fas fa-list"></i> ${ui('modal.viewall')}</button>`
    : (window._allModalParentType ? `<button onclick="var _pt=window._allModalParentType;window._allModalParentType=null;openAllModal(_pt)" style="padding:6px 13px;background:var(--lt);color:var(--p);border:1.5px solid var(--bd);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0"><i class="fas fa-arrow-left"></i><span class="btn-txt"> ${ui('ls.back')}</span></button>` : '');
  // inject map + viewall buttons into header actions slot
  const _hdrActions = document.getElementById('all-modal-hdr-actions');
  if(_hdrActions){
    const _sortSelect = `<select id="modal-adv-sort" class="modal-hdr-sort-select" onchange="modalAdvFilter('${type}')" title="${ui('modal.sort.rec')}">
        <option value="default">${ui('modal.sort.rec')}</option>
        <option value="price_asc">${ui('modal.sort.asc')}</option>
        <option value="price_desc">${ui('modal.sort.desc')}</option>
        <option value="newest">${ui('modal.sort.new')}</option>
        <option value="oldest">${ui('modal.sort.old')}</option>
        <option value="alpha">${ui('modal.sort.alpha')}</option>
      </select>`;
    _hdrActions.innerHTML =
      `<button class="modal-adv-map-btn" onclick="openGmapPopup()" style="padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:5px"><i class="fas fa-map-marked-alt"></i><span class="btn-txt"> ${ui('modal.map.btn')}</span></button>`
      + (_viewAllBtn
          ? _viewAllBtn
              .replace(/(<i [^>]+><\/i>)\s*/,'$1<span class="btn-txt"> ')
              .replace(/(<\/button>)/,'</span>$1')
          : '')
      + _sortSelect;
  }
  const sortHtml=`<div class="modal-adv-filter-bar">
    <div class="modal-adv-filter-row1">
      <div class="modal-adv-search-wrap" style="flex:1 1 140px;min-width:100px;max-width:220px">
        <i class="fas fa-search"></i>
        <input class="modal-adv-search-input" id="modal-adv-kw" placeholder="${ui('sf.kw.ph')}" oninput="modalAdvFilter('${type}')">
      </div>
      <select class="modal-adv-select" id="modal-adv-tx" onchange="modalAdvFilter('${type}')" style="flex:0 0 auto;min-width:0;width:72px;text-align:center;text-align-last:center;padding-left:5px;padding-right:18px">
        <option value="">${ui('hero.all.label')}</option>
        <option value="BUY">${ui('hero.buy.label')}</option>
        <option value="RENT">${ui('hero.rent.label')}</option>
      </select>
      <select class="modal-adv-select" id="modal-adv-proptype" onchange="modalAdvFilter('${type}')">
        <option value="">${ui('sf.type.all')}</option>
        <option value="คอนโด">${ui('dd.condo')}</option>
        <option value="บ้านเดี่ยว">${ui('dd.house')}</option>
        <option value="ทาวน์โฮม">${ui('dd.town')}</option>
        <option value="ที่ดิน">${ui('dd.land')}</option>
        <option value="อาคารพาณิชย์">${ui('dd.comm')}</option>
        <option value="โรงแรม">${ui('dd.hotel')}</option>
        <option value="รีสอร์ท">${ui('dd.resort')}</option>
      </select>
    </div><!-- end row1 -->
    <div class="modal-adv-filter-row2" style="display:flex;flex-wrap:nowrap;gap:6px;align-items:center">
      <!-- hidden inputs for drill-down filter — input[hidden] so .value works for any province string -->
      <input id="modal-adv-province" type="hidden" value="">
      <input  id="modal-adv-district" type="hidden" value="">
      <!-- 🔥 ทำเลยอดนิยม select -->
      <select class="modal-adv-select" id="modal-adv-popular-loc" onchange="modalAdvFilter('${type}')" style="flex:1 1 0;min-width:130px" title="ทำเลยอดนิยม">
        <option value="">🔥 ทำเลยอดนิยม</option>
        <optgroup label="📍 โซนกลางเมือง — CBD">
        <option value="สุขุมวิท">📍 สุขุมวิท</option>
        <option value="สาทร">📍 สาทร</option>
        <option value="สีลม">📍 สีลม</option>
        <option value="อโศก">📍 อโศก</option>
        <option value="ทองหล่อ">📍 ทองหล่อ</option>
        <option value="เพลินจิต">📍 เพลินจิต</option>
        <option value="ชิดลม">📍 ชิดลม</option>
        <option value="ราชประสงค์">📍 ราชประสงค์</option>
        <option value="ลุมพินี">📍 ลุมพินี</option>
        <option value="วิทยุ">📍 ถ.วิทยุ</option>
        </optgroup>
        <optgroup label="📍 โซนตะวันออก">
        <option value="พระโขนง">📍 พระโขนง</option>
        <option value="เอกมัย">📍 เอกมัย</option>
        <option value="อ่อนนุช">📍 อ่อนนุช</option>
        <option value="บางนา">📍 บางนา</option>
        <option value="ลาดกระบัง">📍 ลาดกระบัง</option>
        <option value="มีนบุรี">📍 มีนบุรี</option>
        <option value="รามคำแหง">📍 รามคำแหง</option>
        <option value="หัวหมาก">📍 หัวหมาก</option>
        <option value="สุวรรณภูมิ">📍 สุวรรณภูมิ</option>
        </optgroup>
        <optgroup label="📍 โซนเหนือ">
        <option value="รัชดา">📍 รัชดาภิเษก</option>
        <option value="ลาดพร้าว">📍 ลาดพร้าว</option>
        <option value="จตุจักร">📍 จตุจักร</option>
        <option value="หมอชิต">📍 หมอชิต</option>
        <option value="พหลโยธิน">📍 พหลโยธิน</option>
        <option value="อารีย์">📍 อารีย์</option>
        <option value="สะพานควาย">📍 สะพานควาย</option>
        <option value="ดอนเมือง">📍 ดอนเมือง</option>
        <option value="พระราม 9">📍 พระราม 9</option>
        <option value="ห้วยขวาง">📍 ห้วยขวาง</option>
        </optgroup>
        <optgroup label="📍 โซนตะวันตก &amp; ใต้">
        <option value="ปิ่นเกล้า">📍 ปิ่นเกล้า</option>
        <option value="บางแค">📍 บางแค</option>
        <option value="วงเวียนใหญ่">📍 วงเวียนใหญ่</option>
        <option value="พระราม 3">📍 พระราม 3</option>
        <option value="สาธุประดิษฐ์">📍 สาธุประดิษฐ์</option>
        <option value="ราษฎร์บูรณะ">📍 ราษฎร์บูรณะ</option>
        <option value="ตลิ่งชัน">📍 ตลิ่งชัน</option>
        <option value="บางกอกน้อย">📍 บางกอกน้อย</option>
        <option value="ธนบุรี">📍 ธนบุรี</option>
        <option value="บางบอน">📍 บางบอน</option>
        </optgroup>
      </select>
      <!-- custom drill-down จังหวัด -->
      <div id="madv-loc-wrap">
        <div id="madv-loc-btn" onclick="madvLocToggle()" title="เลือกทำเล / จังหวัด">
          <span id="madv-loc-display">จังหวัด</span>
          <i class="fas fa-chevron-down" id="madv-loc-chevron"></i>
          <div id="madv-loc-panel" style="display:none" onclick="event.stopPropagation()">
            <div id="madv-loc-list"></div>
          </div>
        </div>
      </div>
    </div><!-- end row2 -->
    <div class="modal-adv-filter-row3" style="display:flex;flex-wrap:nowrap;gap:6px;align-items:center">
      <select class="modal-adv-select" id="modal-adv-minprice" onchange="modalAdvFilter('${type}')" style="flex:1 1 80px;min-width:0">
        <option value="">${ui('sf.min.label')}</option>
        <option value="5000">5,000</option>
        <option value="10000">10,000</option>
        <option value="15000">15,000</option>
        <option value="20000">20,000</option>
        <option value="25000">25,000</option>
        <option value="30000">30,000</option>
        <option value="40000">40,000</option>
        <option value="50000">50,000</option>
        <option value="60000">60,000</option>
        <option value="70000">70,000</option>
        <option value="80000">80,000</option>
        <option value="100000">100K</option>
        <option value="150000">150K</option>
        <option value="200000">200K</option>
        <option value="300000">300K</option>
        <option value="500000">500K</option>
        <option value="1000000">1M</option>
        <option value="2000000">2M</option>
        <option value="3000000">3M</option>
        <option value="5000000">5M</option>
        <option value="7000000">7M</option>
        <option value="10000000">10M</option>
        <option value="15000000">15M</option>
        <option value="20000000">20M</option>
        <option value="30000000">30M</option>
        <option value="50000000">50M</option>
        <option value="100000000">100M</option>
      </select>
      <select class="modal-adv-select" id="modal-adv-maxprice" onchange="modalAdvFilter('${type}')" style="flex:1 1 80px;min-width:0">
        <option value="">${ui('sf.max.label')}</option>
        <option value="5000">5,000</option>
        <option value="10000">10,000</option>
        <option value="15000">15,000</option>
        <option value="20000">20,000</option>
        <option value="25000">25,000</option>
        <option value="30000">30,000</option>
        <option value="40000">40,000</option>
        <option value="50000">50,000</option>
        <option value="60000">60,000</option>
        <option value="70000">70,000</option>
        <option value="80000">80,000</option>
        <option value="100000">100K</option>
        <option value="150000">150K</option>
        <option value="200000">200K</option>
        <option value="300000">300K</option>
        <option value="500000">500K</option>
        <option value="1000000">1M</option>
        <option value="2000000">2M</option>
        <option value="3000000">3M</option>
        <option value="5000000">5M</option>
        <option value="7000000">7M</option>
        <option value="10000000">10M</option>
        <option value="15000000">15M</option>
        <option value="20000000">20M</option>
        <option value="30000000">30M</option>
        <option value="50000000">50M</option>
        <option value="100000000">100M</option>
      </select>
      <button class="modal-adv-filter-btn" onclick="openModalAdvExtraFilter('${type}')" title="${ui('af.btn.label')}" style="background:#fff;color:var(--p);border:1.5px solid var(--bd);padding:7px 10px;min-width:36px"><i class="fas fa-sliders-h"></i></button>
      <button class="modal-adv-reset-btn" onclick="modalAdvReset('${type}')" title="${ui('af.btn.reset')}" style="padding:7px 10px;min-width:36px"><i class="fas fa-undo"></i></button>
    </div>
  </div>`;
  t.textContent=title;
  // reset map state on each open
  _gmapPanelOpen = false;
  _popupLeafletInitDone = false;
  _popupMapTxFilter = 'ALL';
  if(_popupLeafletMap){ try{ _popupLeafletMap.remove(); }catch(e){} _popupLeafletMap = null; _popupLeafletMarkers = []; }
  // ล้าง map-layout class ที่อาจค้างจากครั้งก่อน
  const _allModalEl = document.getElementById('all-modal');
  if(_allModalEl) _allModalEl.classList.remove('map-layout');
  // clear cached snapshot so filter starts fresh with new modal data
  if(window._modalTypeData) window._modalTypeData._allData = null;
  const _inlineMapHtml = `<div id="gmap-inline-panel">
    <div class="popup-map-inner">
      <div class="popup-map-header">
        <div class="popup-map-title-row">
          <div class="popup-map-title">
            <i class="fas fa-map-marked-alt"></i>
            แผนที่ประกาศอสังหาริมทรัพย์
            <span class="popup-map-pin-count" id="popup-map-pin-count"></span>
          </div>
          <div class="popup-map-actions">
            <button class="popup-map-action-btn" onclick="popupMapFitAll()">
              <i class="fas fa-compress-arrows-alt"></i> รวมทั้งหมด
            </button>
            <button class="popup-map-action-btn close-btn" onclick="closeGmapPopup()">
              <i class="fas fa-times"></i> ปิด
            </button>
          </div>
        </div>

      </div>
      <div class="popup-map-leaflet-wrap" style="position:relative;flex:1;min-height:0;margin:0 14px 14px;border-radius:10px;overflow:hidden;border:1.5px solid rgba(200,146,42,.2)">
        <div id="popup-leaflet-map" style="width:100%;height:100%;min-height:380px"></div>
        <div id="popup-map-hint" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(10,22,40,.88);color:#fff;font-size:11px;padding:6px 14px;border-radius:20px;pointer-events:none;white-space:nowrap;z-index:500;transition:opacity .4s">
          <i class="fas fa-hand-pointer" style="color:#C8922A"></i> แตะปักหมุดเพื่อดูรายละเอียด
        </div>
      </div>
    </div>
  </div>`;
  // ── inject filter bar into sticky container (ไม่เลื่อนตาม scroll) ──
  var _filterSticky = document.getElementById('all-modal-filter-sticky');
  if(_filterSticky) _filterSticky.innerHTML = sortHtml;

  // ── Scroll hide/show filterbar: ซ่อนเมื่อเลื่อนลง, แสดงเมื่อเลื่อนขึ้น (smooth) ──
  (function(){
    var _allBody = document.getElementById('all-body');
    var _sticky = document.getElementById('all-modal-filter-sticky');
    if(!_allBody || !_sticky) return;
    // ถอด listener เก่าออก (ถ้ามี)
    if(_allBody._scrollHandler) _allBody.removeEventListener('scroll', _allBody._scrollHandler);
    var _lastTop = 0;
    _allBody._scrollHandler = function(){
      var top = _allBody.scrollTop;
      if(top < 60){
        // ยังอยู่บนสุด — แสดงเสมอ
        _sticky.style.maxHeight = '';
        _sticky.style.opacity = '1';
        _sticky.style.pointerEvents = '';
        _sticky.style.paddingTop = '';
        _sticky.style.paddingBottom = '';
        _sticky.style.overflow = '';
      } else if(top > _lastTop){
        // เลื่อนลง → ซ่อน
        _sticky.style.maxHeight = '0';
        _sticky.style.opacity = '0';
        _sticky.style.pointerEvents = 'none';
        _sticky.style.overflow = 'hidden';
      } else {
        // เลื่อนขึ้น → แสดง
        _sticky.style.maxHeight = '';
        _sticky.style.opacity = '1';
        _sticky.style.pointerEvents = '';
        _sticky.style.overflow = '';
      }
      _lastTop = top;
    };
    _allBody.addEventListener('scroll', _allBody._scrollHandler, {passive:true});
  })();

  b.innerHTML=`<div id="all-body-map-col">`
    +_inlineMapHtml
    +`</div>`
    +`<div id="all-body-cards-col">`
    +`<div class="prop-grid" id="modal-prop-grid"></div>`
    +`<div class="pagination" id="modal-pg-wrap" style="display:none"><div class="pg-info" id="modal-pg-info"></div><div class="pg-controls" id="modal-pg-controls"></div></div>`
    +`</div>`;
  _modalRenderPage(window._modalTypeData.data, 1);
  _openModal('all-modal'); b.scrollTop=0;
}

function modalSortChange(sel, type) {
  if(!window._modalTypeData) return;
  // sort applies to the current view (filtered or full)
  const sorted = sortListings([...window._modalTypeData.data], sel.value);
  window._modalTypeData.data = sorted;
  // also sort the _allData snapshot so tx-filter re-apply keeps new sort order
  if(window._modalTypeData._allData){
    window._modalTypeData._allData = sortListings([...window._modalTypeData._allData], sel.value);
  }
  window._modalTypeData.currentPage = 1;
  if(window._modalRenderPage) window._modalRenderPage(sorted, 1);
}

/* ── Filter เพิ่มเติม popup (from home quick-search-bar advanced filter logic) ── */
function openModalAdvExtraFilter(type) {
  const existing = document.getElementById('modal-extra-filter-sheet');
  if(existing){ existing.remove(); return; }
  // Read current extra filter values if available
  const _ef = window._modalExtraFilter || {};
  const _minBed   = _ef.minBed   || '';
  const _minBath  = _ef.minBath  || '';
  const _minArea  = _ef.minArea  || '';
  const _minPrice = _ef.minPrice || '';
  const _maxPrice = _ef.maxPrice || '';
  const _priceMode= _ef.priceMode|| 'buy';
  const _loc      = _ef.loc      || '';
  const _bts      = _ef.bts      || '';
  const _mrt      = _ef.mrt      || '';
  const _uni      = _ef.uni      || '';
  const _features  = _ef.features  || [];
  const _furniture = _ef.furniture || '';
  const _pets      = _ef.pets      || false;
  const _minLand   = _ef.minLand   || 0;
  const _maxLand   = _ef.maxLand   || 1000;
  const _minUsable = _ef.minUsable || 0;
  const _maxUsable = _ef.maxUsable || 500;
  const featureList = ['แอร์','ตู้เย็น','ที่จอดรถ','เครื่องซักผ้า','สระว่ายน้ำ','ฟิตเนส','ลิฟต์','รักษาความปลอดภัย','ส่วนกลาง'];

  const mo = document.createElement('div');
  mo.id = 'modal-extra-filter-sheet';
  // ── Center on screen (same style as adv-filter-panel) ──
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(10,22,40,.55);z-index:11000;display:flex;align-items:center;justify-content:center;padding:16px';
  mo.innerHTML = `
  <div style="background:#fff;border-radius:20px;width:100%;max-width:560px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 28px 70px rgba(0,0,0,.38),0 2px 12px rgba(0,0,0,.15);border:1.5px solid rgba(200,146,42,.25);animation:advPopupIn .22s cubic-bezier(.34,1.4,.64,1)">
    <!-- Header -->
    <div style="padding:16px 20px 12px;background:linear-gradient(135deg,#0A1628,#1B3A6B);color:#fff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <h3 style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;margin:0"><i class="fas fa-sliders-h" style="color:var(--a)"></i> ${ui('af.title')}</h3>
      <button onclick="document.getElementById('modal-extra-filter-sheet').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:rgba(255,255,255,.7);line-height:1">×</button>
    </div>
    <!-- Body -->
    <div style="flex:1;overflow-y:auto;padding:16px 18px">

      <!-- ช่วงราคา -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-tag" style="color:var(--a)"></i> ${ui('af.sec.price')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <select id="mef-price-min" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
            <option value="">${ui('af.price.min')}</option>
            <option value="5000" ${_minPrice=='5000'?'selected':''}>5,000</option>
            <option value="10000" ${_minPrice=='10000'?'selected':''}>10,000</option>
            <option value="15000" ${_minPrice=='15000'?'selected':''}>15,000</option>
            <option value="20000" ${_minPrice=='20000'?'selected':''}>20,000</option>
            <option value="25000" ${_minPrice=='25000'?'selected':''}>25,000</option>
            <option value="30000" ${_minPrice=='30000'?'selected':''}>30,000</option>
            <option value="40000" ${_minPrice=='40000'?'selected':''}>40,000</option>
            <option value="50000" ${_minPrice=='50000'?'selected':''}>50,000</option>
            <option value="60000" ${_minPrice=='60000'?'selected':''}>60,000</option>
            <option value="70000" ${_minPrice=='70000'?'selected':''}>70,000</option>
            <option value="80000" ${_minPrice=='80000'?'selected':''}>80,000</option>
            <option value="100000" ${_minPrice=='100000'?'selected':''}>100K</option>
            <option value="150000" ${_minPrice=='150000'?'selected':''}>150K</option>
            <option value="200000" ${_minPrice=='200000'?'selected':''}>200K</option>
            <option value="300000" ${_minPrice=='300000'?'selected':''}>300K</option>
            <option value="500000" ${_minPrice=='500000'?'selected':''}>500K</option>
            <option value="1000000" ${_minPrice=='1000000'?'selected':''}>1M</option>
            <option value="2000000" ${_minPrice=='2000000'?'selected':''}>2M</option>
            <option value="3000000" ${_minPrice=='3000000'?'selected':''}>3M</option>
            <option value="5000000" ${_minPrice=='5000000'?'selected':''}>5M</option>
            <option value="7000000" ${_minPrice=='7000000'?'selected':''}>7M</option>
            <option value="10000000" ${_minPrice=='10000000'?'selected':''}>10M</option>
            <option value="15000000" ${_minPrice=='15000000'?'selected':''}>15M</option>
            <option value="20000000" ${_minPrice=='20000000'?'selected':''}>20M</option>
            <option value="30000000" ${_minPrice=='30000000'?'selected':''}>30M</option>
            <option value="50000000" ${_minPrice=='50000000'?'selected':''}>50M</option>
            <option value="100000000" ${_minPrice=='100000000'?'selected':''}>100M</option>
          </select>
          <select id="mef-price-max" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
            <option value="">${ui('sf.max.label')}</option>
            <option value="5000" ${_maxPrice=='5000'?'selected':''}>5,000</option>
            <option value="10000" ${_maxPrice=='10000'?'selected':''}>10,000</option>
            <option value="15000" ${_maxPrice=='15000'?'selected':''}>15,000</option>
            <option value="20000" ${_maxPrice=='20000'?'selected':''}>20,000</option>
            <option value="25000" ${_maxPrice=='25000'?'selected':''}>25,000</option>
            <option value="30000" ${_maxPrice=='30000'?'selected':''}>30,000</option>
            <option value="40000" ${_maxPrice=='40000'?'selected':''}>40,000</option>
            <option value="50000" ${_maxPrice=='50000'?'selected':''}>50,000</option>
            <option value="60000" ${_maxPrice=='60000'?'selected':''}>60,000</option>
            <option value="70000" ${_maxPrice=='70000'?'selected':''}>70,000</option>
            <option value="80000" ${_maxPrice=='80000'?'selected':''}>80,000</option>
            <option value="100000" ${_maxPrice=='100000'?'selected':''}>100K</option>
            <option value="150000" ${_maxPrice=='150000'?'selected':''}>150K</option>
            <option value="200000" ${_maxPrice=='200000'?'selected':''}>200K</option>
            <option value="300000" ${_maxPrice=='300000'?'selected':''}>300K</option>
            <option value="500000" ${_maxPrice=='500000'?'selected':''}>500K</option>
            <option value="1000000" ${_maxPrice=='1000000'?'selected':''}>1M</option>
            <option value="2000000" ${_maxPrice=='2000000'?'selected':''}>2M</option>
            <option value="3000000" ${_maxPrice=='3000000'?'selected':''}>3M</option>
            <option value="5000000" ${_maxPrice=='5000000'?'selected':''}>5M</option>
            <option value="7000000" ${_maxPrice=='7000000'?'selected':''}>7M</option>
            <option value="10000000" ${_maxPrice=='10000000'?'selected':''}>10M</option>
            <option value="15000000" ${_maxPrice=='15000000'?'selected':''}>15M</option>
            <option value="20000000" ${_maxPrice=='20000000'?'selected':''}>20M</option>
            <option value="30000000" ${_maxPrice=='30000000'?'selected':''}>30M</option>
            <option value="50000000" ${_maxPrice=='50000000'?'selected':''}>50M</option>
            <option value="100000000" ${_maxPrice=='100000000'?'selected':''}>100M</option>
          </select>
        </div>
      </div>

      <!-- ทำเล/จังหวัด (2 col) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-fire" style="color:#ff4d6d"></i> ${ui('af.sec.popular')}</div>
          <select id="mef-loc" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
          <option value="">-- ${ui('af.sec.popular')} --</option>
          <optgroup label="📍 โซนกลางเมือง — CBD">
          <option value="สุขุมวิท" ${_loc=='สุขุมวิท'?'selected':''}>สุขุมวิท</option>
          <option value="สาทร" ${_loc=='สาทร'?'selected':''}>สาทร</option>
          <option value="สีลม" ${_loc=='สีลม'?'selected':''}>สีลม</option>
          <option value="อโศก" ${_loc=='อโศก'?'selected':''}>อโศก</option>
          <option value="ทองหล่อ" ${_loc=='ทองหล่อ'?'selected':''}>ทองหล่อ</option>
          <option value="เพลินจิต" ${_loc=='เพลินจิต'?'selected':''}>เพลินจิต</option>
          <option value="ชิดลม" ${_loc=='ชิดลม'?'selected':''}>ชิดลม</option>
          <option value="ราชประสงค์" ${_loc=='ราชประสงค์'?'selected':''}>ราชประสงค์</option>
          <option value="ลุมพินี" ${_loc=='ลุมพินี'?'selected':''}>ลุมพินี</option>
          </optgroup>
          <optgroup label="📍 โซนตะวันออก">
          <option value="พระโขนง" ${_loc=='พระโขนง'?'selected':''}>พระโขนง</option>
          <option value="เอกมัย" ${_loc=='เอกมัย'?'selected':''}>เอกมัย</option>
          <option value="อ่อนนุช" ${_loc=='อ่อนนุช'?'selected':''}>อ่อนนุช</option>
          <option value="บางนา" ${_loc=='บางนา'?'selected':''}>บางนา</option>
          <option value="มีนบุรี" ${_loc=='มีนบุรี'?'selected':''}>มีนบุรี</option>
          <option value="รามคำแหง" ${_loc=='รามคำแหง'?'selected':''}>รามคำแหง</option>
          <option value="หัวหมาก" ${_loc=='หัวหมาก'?'selected':''}>หัวหมาก</option>
          <option value="สุวรรณภูมิ" ${_loc=='สุวรรณภูมิ'?'selected':''}>สุวรรณภูมิ</option>
          </optgroup>
          <optgroup label="📍 โซนเหนือ">
          <option value="รัชดา" ${_loc=='รัชดา'?'selected':''}>รัชดาภิเษก</option>
          <option value="ลาดพร้าว" ${_loc=='ลาดพร้าว'?'selected':''}>ลาดพร้าว</option>
          <option value="จตุจักร" ${_loc=='จตุจักร'?'selected':''}>จตุจักร</option>
          <option value="หมอชิต" ${_loc=='หมอชิต'?'selected':''}>หมอชิต</option>
          <option value="พหลโยธิน" ${_loc=='พหลโยธิน'?'selected':''}>พหลโยธิน</option>
          <option value="อารีย์" ${_loc=='อารีย์'?'selected':''}>อารีย์</option>
          <option value="พระราม 9" ${_loc=='พระราม 9'?'selected':''}>พระราม 9</option>
          <option value="ห้วยขวาง" ${_loc=='ห้วยขวาง'?'selected':''}>ห้วยขวาง</option>
          <option value="ดอนเมือง" ${_loc=='ดอนเมือง'?'selected':''}>ดอนเมือง</option>
          </optgroup>
          <optgroup label="📍 โซนตะวันตก &amp; ใต้">
          <option value="ปิ่นเกล้า" ${_loc=='ปิ่นเกล้า'?'selected':''}>ปิ่นเกล้า</option>
          <option value="บางแค" ${_loc=='บางแค'?'selected':''}>บางแค</option>
          <option value="พระราม 3" ${_loc=='พระราม 3'?'selected':''}>พระราม 3</option>
          <option value="ธนบุรี" ${_loc=='ธนบุรี'?'selected':''}>ธนบุรี</option>
          <option value="ตลิ่งชัน" ${_loc=='ตลิ่งชัน'?'selected':''}>ตลิ่งชัน</option>
          <option value="สาธุประดิษฐ์" ${_loc=='สาธุประดิษฐ์'?'selected':''}>สาธุประดิษฐ์</option>
          </optgroup>
          <optgroup label="🏖️ ต่างจังหวัดยอดนิยม">
          <option value="เชียงใหม่" ${_loc=='เชียงใหม่'?'selected':''}>เชียงใหม่</option>
          <option value="ภูเก็ต" ${_loc=='ภูเก็ต'?'selected':''}>ภูเก็ต</option>
          <option value="พัทยา" ${_loc=='พัทยา'?'selected':''}>พัทยา / ชลบุรี</option>
          <option value="เขาใหญ่" ${_loc=='เขาใหญ่'?'selected':''}>เขาใหญ่</option>
          <option value="หัวหิน" ${_loc=='หัวหิน'?'selected':''}>หัวหิน</option>
          <option value="กาญจนบุรี" ${_loc=='กาญจนบุรี'?'selected':''}>กาญจนบุรี</option>
          <option value="เกาะสมุย" ${_loc=='เกาะสมุย'?'selected':''}>เกาะสมุย</option>
          </optgroup>
        </select>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-map-marker-alt" style="color:var(--p)"></i> ${ui('af.sec.prov')}</div>
          <select id="mef-province" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
          <option value="">${ui('af.prov.all')}</option>
          <option value="กรุงเทพฯ" ${_loc=='กรุงเทพฯ'?'selected':''}>กรุงเทพฯ</option>
          <option value="กระบี่" ${_loc=='กระบี่'?'selected':''}>กระบี่</option>
          <option value="กาญจนบุรี" ${_loc=='กาญจนบุรี'?'selected':''}>กาญจนบุรี</option>
          <option value="กาฬสินธุ์" ${_loc=='กาฬสินธุ์'?'selected':''}>กาฬสินธุ์</option>
          <option value="กำแพงเพชร" ${_loc=='กำแพงเพชร'?'selected':''}>กำแพงเพชร</option>
          <option value="ขอนแก่น" ${_loc=='ขอนแก่น'?'selected':''}>ขอนแก่น</option>
          <option value="จันทบุรี" ${_loc=='จันทบุรี'?'selected':''}>จันทบุรี</option>
          <option value="ฉะเชิงเทรา" ${_loc=='ฉะเชิงเทรา'?'selected':''}>ฉะเชิงเทรา</option>
          <option value="ชลบุรี" ${_loc=='ชลบุรี'?'selected':''}>ชลบุรี</option>
          <option value="ชัยนาท" ${_loc=='ชัยนาท'?'selected':''}>ชัยนาท</option>
          <option value="ชัยภูมิ" ${_loc=='ชัยภูมิ'?'selected':''}>ชัยภูมิ</option>
          <option value="ชุมพร" ${_loc=='ชุมพร'?'selected':''}>ชุมพร</option>
          <option value="เชียงราย" ${_loc=='เชียงราย'?'selected':''}>เชียงราย</option>
          <option value="เชียงใหม่" ${_loc=='เชียงใหม่'?'selected':''}>เชียงใหม่</option>
          <option value="ตรัง" ${_loc=='ตรัง'?'selected':''}>ตรัง</option>
          <option value="ตราด" ${_loc=='ตราด'?'selected':''}>ตราด</option>
          <option value="ตาก" ${_loc=='ตาก'?'selected':''}>ตาก</option>
          <option value="นครนายก" ${_loc=='นครนายก'?'selected':''}>นครนายก</option>
          <option value="นครปฐม" ${_loc=='นครปฐม'?'selected':''}>นครปฐม</option>
          <option value="นครพนม" ${_loc=='นครพนม'?'selected':''}>นครพนม</option>
          <option value="นครราชสีมา" ${_loc=='นครราชสีมา'?'selected':''}>นครราชสีมา</option>
          <option value="นครศรีธรรมราช" ${_loc=='นครศรีธรรมราช'?'selected':''}>นครศรีธรรมราช</option>
          <option value="นครสวรรค์" ${_loc=='นครสวรรค์'?'selected':''}>นครสวรรค์</option>
          <option value="นนทบุรี" ${_loc=='นนทบุรี'?'selected':''}>นนทบุรี</option>
          <option value="นราธิวาส" ${_loc=='นราธิวาส'?'selected':''}>นราธิวาส</option>
          <option value="น่าน" ${_loc=='น่าน'?'selected':''}>น่าน</option>
          <option value="บึงกาฬ" ${_loc=='บึงกาฬ'?'selected':''}>บึงกาฬ</option>
          <option value="บุรีรัมย์" ${_loc=='บุรีรัมย์'?'selected':''}>บุรีรัมย์</option>
          <option value="ปทุมธานี" ${_loc=='ปทุมธานี'?'selected':''}>ปทุมธานี</option>
          <option value="ประจวบคีรีขันธ์" ${_loc=='ประจวบคีรีขันธ์'?'selected':''}>ประจวบคีรีขันธ์</option>
          <option value="ปราจีนบุรี" ${_loc=='ปราจีนบุรี'?'selected':''}>ปราจีนบุรี</option>
          <option value="ปัตตานี" ${_loc=='ปัตตานี'?'selected':''}>ปัตตานี</option>
          <option value="พระนครศรีอยุธยา" ${_loc=='พระนครศรีอยุธยา'?'selected':''}>พระนครศรีอยุธยา</option>
          <option value="พะเยา" ${_loc=='พะเยา'?'selected':''}>พะเยา</option>
          <option value="พังงา" ${_loc=='พังงา'?'selected':''}>พังงา</option>
          <option value="พัทลุง" ${_loc=='พัทลุง'?'selected':''}>พัทลุง</option>
          <option value="พิจิตร" ${_loc=='พิจิตร'?'selected':''}>พิจิตร</option>
          <option value="พิษณุโลก" ${_loc=='พิษณุโลก'?'selected':''}>พิษณุโลก</option>
          <option value="เพชรบุรี" ${_loc=='เพชรบุรี'?'selected':''}>เพชรบุรี</option>
          <option value="เพชรบูรณ์" ${_loc=='เพชรบูรณ์'?'selected':''}>เพชรบูรณ์</option>
          <option value="แพร่" ${_loc=='แพร่'?'selected':''}>แพร่</option>
          <option value="ภูเก็ต" ${_loc=='ภูเก็ต'?'selected':''}>ภูเก็ต</option>
          <option value="มหาสารคาม" ${_loc=='มหาสารคาม'?'selected':''}>มหาสารคาม</option>
          <option value="มุกดาหาร" ${_loc=='มุกดาหาร'?'selected':''}>มุกดาหาร</option>
          <option value="แม่ฮ่องสอน" ${_loc=='แม่ฮ่องสอน'?'selected':''}>แม่ฮ่องสอน</option>
          <option value="ยโสธร" ${_loc=='ยโสธร'?'selected':''}>ยโสธร</option>
          <option value="ยะลา" ${_loc=='ยะลา'?'selected':''}>ยะลา</option>
          <option value="ร้อยเอ็ด" ${_loc=='ร้อยเอ็ด'?'selected':''}>ร้อยเอ็ด</option>
          <option value="ระนอง" ${_loc=='ระนอง'?'selected':''}>ระนอง</option>
          <option value="ระยอง" ${_loc=='ระยอง'?'selected':''}>ระยอง</option>
          <option value="ราชบุรี" ${_loc=='ราชบุรี'?'selected':''}>ราชบุรี</option>
          <option value="ลพบุรี" ${_loc=='ลพบุรี'?'selected':''}>ลพบุรี</option>
          <option value="ลำปาง" ${_loc=='ลำปาง'?'selected':''}>ลำปาง</option>
          <option value="ลำพูน" ${_loc=='ลำพูน'?'selected':''}>ลำพูน</option>
          <option value="เลย" ${_loc=='เลย'?'selected':''}>เลย</option>
          <option value="ศรีสะเกษ" ${_loc=='ศรีสะเกษ'?'selected':''}>ศรีสะเกษ</option>
          <option value="สกลนคร" ${_loc=='สกลนคร'?'selected':''}>สกลนคร</option>
          <option value="สงขลา" ${_loc=='สงขลา'?'selected':''}>สงขลา</option>
          <option value="สตูล" ${_loc=='สตูล'?'selected':''}>สตูล</option>
          <option value="สมุทรปราการ" ${_loc=='สมุทรปราการ'?'selected':''}>สมุทรปราการ</option>
          <option value="สมุทรสงคราม" ${_loc=='สมุทรสงคราม'?'selected':''}>สมุทรสงคราม</option>
          <option value="สมุทรสาคร" ${_loc=='สมุทรสาคร'?'selected':''}>สมุทรสาคร</option>
          <option value="สระแก้ว" ${_loc=='สระแก้ว'?'selected':''}>สระแก้ว</option>
          <option value="สระบุรี" ${_loc=='สระบุรี'?'selected':''}>สระบุรี</option>
          <option value="สิงห์บุรี" ${_loc=='สิงห์บุรี'?'selected':''}>สิงห์บุรี</option>
          <option value="สุโขทัย" ${_loc=='สุโขทัย'?'selected':''}>สุโขทัย</option>
          <option value="สุพรรณบุรี" ${_loc=='สุพรรณบุรี'?'selected':''}>สุพรรณบุรี</option>
          <option value="สุราษฎร์ธานี" ${_loc=='สุราษฎร์ธานี'?'selected':''}>สุราษฎร์ธานี</option>
          <option value="สุรินทร์" ${_loc=='สุรินทร์'?'selected':''}>สุรินทร์</option>
          <option value="หนองคาย" ${_loc=='หนองคาย'?'selected':''}>หนองคาย</option>
          <option value="หนองบัวลำภู" ${_loc=='หนองบัวลำภู'?'selected':''}>หนองบัวลำภู</option>
          <option value="อ่างทอง" ${_loc=='อ่างทอง'?'selected':''}>อ่างทอง</option>
          <option value="อำนาจเจริญ" ${_loc=='อำนาจเจริญ'?'selected':''}>อำนาจเจริญ</option>
          <option value="อุดรธานี" ${_loc=='อุดรธานี'?'selected':''}>อุดรธานี</option>
          <option value="อุตรดิตถ์" ${_loc=='อุตรดิตถ์'?'selected':''}>อุตรดิตถ์</option>
          <option value="อุทัยธานี" ${_loc=='อุทัยธานี'?'selected':''}>อุทัยธานี</option>
          <option value="อุบลราชธานี" ${_loc=='อุบลราชธานี'?'selected':''}>อุบลราชธานี</option>
        </select>
        </div>
      </div><!-- end 2-col: ทำเล + จังหวัด -->

      <!-- BTS + MRT (2 col) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-train" style="color:#009900"></i> ${ui('af.sec.bts')}</div>
          <select id="mef-bts" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
          <option value="">${ui('af.bts.all')}</option>
          <optgroup label="🟢 BTS สายสุขุมวิท — เหนือ (N1–N24)">
          <option value="ราชเทวี" ${_bts=='ราชเทวี'?'selected':''}>ราชเทวี (N1)</option>
          <option value="พญาไท" ${_bts=='พญาไท'?'selected':''}>พญาไท (N2)</option>
          <option value="อนุสาวรีย์ชัยสมรภูมิ" ${_bts=='อนุสาวรีย์ชัยสมรภูมิ'?'selected':''}>อนุสาวรีย์ฯ (N3)</option>
          <option value="สนามเป้า" ${_bts=='สนามเป้า'?'selected':''}>สนามเป้า (N4)</option>
          <option value="อารีย์" ${_bts=='อารีย์'?'selected':''}>อารีย์ (N5)</option>
          <option value="สะพานควาย" ${_bts=='สะพานควาย'?'selected':''}>สะพานควาย (N7)</option>
          <option value="หมอชิต" ${_bts=='หมอชิต'?'selected':''}>หมอชิต (N8)</option>
          <option value="ห้าแยกลาดพร้าว" ${_bts=='ห้าแยกลาดพร้าว'?'selected':''}>ห้าแยกลาดพร้าว (N9)</option>
          <option value="พหลโยธิน 24" ${_bts=='พหลโยธิน 24'?'selected':''}>พหลโยธิน 24 (N10)</option>
          <option value="รัชโยธิน" ${_bts=='รัชโยธิน'?'selected':''}>รัชโยธิน (N11)</option>
          <option value="เสนานิคม" ${_bts=='เสนานิคม'?'selected':''}>เสนานิคม (N12)</option>
          <option value="ม.เกษตรศาสตร์" ${_bts=='ม.เกษตรศาสตร์'?'selected':''}>ม.เกษตรศาสตร์ (N13)</option>
          <option value="กรมป่าไม้" ${_bts=='กรมป่าไม้'?'selected':''}>กรมป่าไม้ (N14)</option>
          <option value="บางบัว" ${_bts=='บางบัว'?'selected':''}>บางบัว (N15)</option>
          <option value="กรมทหารราบที่ 11" ${_bts=='กรมทหารราบที่ 11'?'selected':''}>กรมทหารราบที่ 11 (N16)</option>
          <option value="วัดพระศรีมหาธาตุ" ${_bts=='วัดพระศรีมหาธาตุ'?'selected':''}>วัดพระศรีมหาธาตุ (N17)</option>
          <option value="พหลโยธิน 59" ${_bts=='พหลโยธิน 59'?'selected':''}>พหลโยธิน 59 (N18)</option>
          <option value="สายหยุด" ${_bts=='สายหยุด'?'selected':''}>สายหยุด (N19)</option>
          <option value="สะพานใหม่" ${_bts=='สะพานใหม่'?'selected':''}>สะพานใหม่ (N20)</option>
          <option value="โรงพยาบาลภูมิพลอดุลยเดช" ${_bts=='โรงพยาบาลภูมิพลอดุลยเดช'?'selected':''}>รพ.ภูมิพลอดุลยเดช (N21)</option>
          <option value="พิพิธภัณฑ์กองทัพอากาศ" ${_bts=='พิพิธภัณฑ์กองทัพอากาศ'?'selected':''}>พิพิธภัณฑ์กองทัพอากาศ (N22)</option>
          <option value="แยก คปอ." ${_bts=='แยก คปอ.'?'selected':''}>แยก คปอ. (N23)</option>
          <option value="คูคต" ${_bts=='คูคต'?'selected':''}>คูคต (N24)</option>
          </optgroup>
          <optgroup label="🟢 BTS สายสุขุมวิท — กลาง/ตะวันออก (E1–E23)">
          <option value="สยาม" ${_bts=='สยาม'?'selected':''}>สยาม (CEN)</option>
          <option value="ชิดลม" ${_bts=='ชิดลม'?'selected':''}>ชิดลม (E1)</option>
          <option value="เพลินจิต" ${_bts=='เพลินจิต'?'selected':''}>เพลินจิต (E2)</option>
          <option value="นานา" ${_bts=='นานา'?'selected':''}>นานา (E3)</option>
          <option value="อโศก" ${_bts=='อโศก'?'selected':''}>อโศก (E4)</option>
          <option value="พร้อมพงษ์" ${_bts=='พร้อมพงษ์'?'selected':''}>พร้อมพงษ์ (E5)</option>
          <option value="ทองหล่อ" ${_bts=='ทองหล่อ'?'selected':''}>ทองหล่อ (E6)</option>
          <option value="เอกมัย" ${_bts=='เอกมัย'?'selected':''}>เอกมัย (E7)</option>
          <option value="พระโขนง" ${_bts=='พระโขนง'?'selected':''}>พระโขนง (E8)</option>
          <option value="อ่อนนุช" ${_bts=='อ่อนนุช'?'selected':''}>อ่อนนุช (E9)</option>
          <option value="บางจาก" ${_bts=='บางจาก'?'selected':''}>บางจาก (E10)</option>
          <option value="ปุณณวิถี" ${_bts=='ปุณณวิถี'?'selected':''}>ปุณณวิถี (E11)</option>
          <option value="อุดมสุข" ${_bts=='อุดมสุข'?'selected':''}>อุดมสุข (E12)</option>
          <option value="บางนา" ${_bts=='บางนา'?'selected':''}>บางนา (E13)</option>
          <option value="แบริ่ง" ${_bts=='แบริ่ง'?'selected':''}>แบริ่ง (E14)</option>
          <option value="สำโรง BTS" ${_bts=='สำโรง BTS'?'selected':''}>สำโรง (E15)</option>
          <option value="ปู่เจ้า" ${_bts=='ปู่เจ้า'?'selected':''}>ปู่เจ้า (E16)</option>
          <option value="ช้างเอราวัณ" ${_bts=='ช้างเอราวัณ'?'selected':''}>ช้างเอราวัณ (E17)</option>
          <option value="โรงเรียนนายเรือ" ${_bts=='โรงเรียนนายเรือ'?'selected':''}>โรงเรียนนายเรือ (E18)</option>
          <option value="ปากน้ำ BTS" ${_bts=='ปากน้ำ BTS'?'selected':''}>ปากน้ำ (E19)</option>
          <option value="ศรีนครินทร์ BTS" ${_bts=='ศรีนครินทร์ BTS'?'selected':''}>ศรีนครินทร์ (E20)</option>
          <option value="แพรกษา" ${_bts=='แพรกษา'?'selected':''}>แพรกษา (E21)</option>
          <option value="สายลวด" ${_bts=='สายลวด'?'selected':''}>สายลวด (E22)</option>
          <option value="เคหะฯ" ${_bts=='เคหะฯ'?'selected':''}>เคหะฯ (E23)</option>
          </optgroup>
          <optgroup label="🟢 BTS สายสีลม (W1, S1–S12)">
          <option value="สนามกีฬาแห่งชาติ" ${_bts=='สนามกีฬาแห่งชาติ'?'selected':''}>สนามกีฬาแห่งชาติ (W1)</option>
          <option value="ราชดำริ" ${_bts=='ราชดำริ'?'selected':''}>ราชดำริ (S1)</option>
          <option value="ศาลาแดง" ${_bts=='ศาลาแดง'?'selected':''}>ศาลาแดง (S2)</option>
          <option value="ช่องนนทรี" ${_bts=='ช่องนนทรี'?'selected':''}>ช่องนนทรี (S3)</option>
          <option value="เซนต์หลุยส์" ${_bts=='เซนต์หลุยส์'?'selected':''}>เซนต์หลุยส์ (S4)</option>
          <option value="สุรศักดิ์" ${_bts=='สุรศักดิ์'?'selected':''}>สุรศักดิ์ (S5)</option>
          <option value="สะพานตากสิน" ${_bts=='สะพานตากสิน'?'selected':''}>สะพานตากสิน (S6)</option>
          <option value="กรุงธนบุรี BTS" ${_bts=='กรุงธนบุรี BTS'?'selected':''}>กรุงธนบุรี (S7)</option>
          <option value="วงเวียนใหญ่" ${_bts=='วงเวียนใหญ่'?'selected':''}>วงเวียนใหญ่ (S8)</option>
          <option value="โพธิ์นิมิตร" ${_bts=='โพธิ์นิมิตร'?'selected':''}>โพธิ์นิมิตร (S9)</option>
          <option value="ตลาดพลู" ${_bts=='ตลาดพลู'?'selected':''}>ตลาดพลู (S10)</option>
          <option value="วุฒากาศ" ${_bts=='วุฒากาศ'?'selected':''}>วุฒากาศ (S11)</option>
          <option value="บางหว้า BTS" ${_bts=='บางหว้า BTS'?'selected':''}>บางหว้า (S12)</option>
          </optgroup>
          <optgroup label="🟤 BTS สายสีทอง (G1–G3)">
          <option value="กรุงธนบุรี สีทอง" ${_bts=='กรุงธนบุรี สีทอง'?'selected':''}>กรุงธนบุรี (G1)</option>
          <option value="เจริญนคร" ${_bts=='เจริญนคร'?'selected':''}>เจริญนคร (G2)</option>
          <option value="คลองสาน" ${_bts=='คลองสาน'?'selected':''}>คลองสาน (G3)</option>
          </optgroup>
          <optgroup label="🔴 SRT สายสีแดงเข้ม — รังสิต (RN01–RN10)">
          <option value="กลางกรุงเทพอภิวัฒน์ SRT" ${_bts=='กลางกรุงเทพอภิวัฒน์ SRT'?'selected':''}>กลางกรุงเทพอภิวัฒน์ (RN01)</option>
          <option value="จตุจักร SRT" ${_bts=='จตุจักร SRT'?'selected':''}>จตุจักร (RN02)</option>
          <option value="วัดเสมียนนารี SRT" ${_bts=='วัดเสมียนนารี SRT'?'selected':''}>วัดเสมียนนารี (RN03)</option>
          <option value="บางเขน SRT" ${_bts=='บางเขน SRT'?'selected':''}>บางเขน (RN04)</option>
          <option value="ทุ่งสองห้อง SRT" ${_bts=='ทุ่งสองห้อง SRT'?'selected':''}>ทุ่งสองห้อง (RN05)</option>
          <option value="หลักสี่ SRT" ${_bts=='หลักสี่ SRT'?'selected':''}>หลักสี่ (RN06)</option>
          <option value="การเคหะ SRT" ${_bts=='การเคหะ SRT'?'selected':''}>การเคหะ (RN07)</option>
          <option value="ดอนเมือง SRT" ${_bts=='ดอนเมือง SRT'?'selected':''}>ดอนเมือง (RN08)</option>
          <option value="หลักหก SRT" ${_bts=='หลักหก SRT'?'selected':''}>หลักหก (RN09)</option>
          <option value="รังสิต SRT" ${_bts=='รังสิต SRT'?'selected':''}>รังสิต (RN10)</option>
          </optgroup>
          <optgroup label="🔴 SRT สายสีแดงอ่อน — ตลิ่งชัน (RW01–RW06)">
          <option value="กลางกรุงเทพอภิวัฒน์ SRT ตลิ่งชัน" ${_bts=='กลางกรุงเทพอภิวัฒน์ SRT ตลิ่งชัน'?'selected':''}>กลางกรุงเทพอภิวัฒน์ (RW01)</option>
          <option value="บางซ่อน SRT" ${_bts=='บางซ่อน SRT'?'selected':''}>บางซ่อน (RW02)</option>
          <option value="บางบำหรุ SRT" ${_bts=='บางบำหรุ SRT'?'selected':''}>บางบำหรุ (RW05)</option>
          <option value="ตลิ่งชัน SRT" ${_bts=='ตลิ่งชัน SRT'?'selected':''}>ตลิ่งชัน (RW06)</option>
          </optgroup>
          <optgroup label="✈️ Airport Rail Link (A1–A8)">
          <option value="สุวรรณภูมิ ARL" ${_bts=='สุวรรณภูมิ ARL'?'selected':''}>สุวรรณภูมิ (A1)</option>
          <option value="ลาดกระบัง ARL" ${_bts=='ลาดกระบัง ARL'?'selected':''}>ลาดกระบัง (A2)</option>
          <option value="บ้านทับช้าง ARL" ${_bts=='บ้านทับช้าง ARL'?'selected':''}>บ้านทับช้าง (A3)</option>
          <option value="หัวหมาก ARL" ${_bts=='หัวหมาก ARL'?'selected':''}>หัวหมาก (A4)</option>
          <option value="รามคำแหง ARL" ${_bts=='รามคำแหง ARL'?'selected':''}>รามคำแหง (A5)</option>
          <option value="มักกะสัน ARL" ${_bts=='มักกะสัน ARL'?'selected':''}>มักกะสัน (A6)</option>
          <option value="ราชปรารภ ARL" ${_bts=='ราชปรารภ ARL'?'selected':''}>ราชปรารภ (A7)</option>
          <option value="พญาไท ARL" ${_bts=='พญาไท ARL'?'selected':''}>พญาไท (A8)</option>
          </optgroup>
        </select>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-subway" style="color:#003399"></i> ${ui('af.sec.mrt')}</div>
          <select id="mef-mrt" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
          <option value="">${ui('af.mrt.all')}</option>
          <optgroup label="🔵 สายน้ำเงิน (วงแหวน)">
          <option value="ท่าพระ" ${_mrt=='ท่าพระ'?'selected':''}>ท่าพระ (BL01)</option>
          <option value="บางไผ่" ${_mrt=='บางไผ่'?'selected':''}>บางไผ่ (BL02)</option>
          <option value="บางหว้า MRT" ${_mrt=='บางหว้า MRT'?'selected':''}>บางหว้า (BL34)</option>
          <option value="ภาษีเจริญ" ${_mrt=='ภาษีเจริญ'?'selected':''}>ภาษีเจริญ (BL36)</option>
          <option value="บางแค" ${_mrt=='บางแค'?'selected':''}>บางแค (BL37)</option>
          <option value="หลักสอง" ${_mrt=='หลักสอง'?'selected':''}>หลักสอง (BL38)</option>
          <option value="อิสรภาพ" ${_mrt=='อิสรภาพ'?'selected':''}>อิสรภาพ (BL03)</option>
          <option value="ท่าพระ-สนามไชย" ${_mrt=='ท่าพระ-สนามไชย'?'selected':''}>สนามไชย (BL04)</option>
          <option value="อ้อมน้อย" ${_mrt=='อ้อมน้อย'?'selected':''}>อ้อมน้อย</option>
          <option value="สามย่าน" ${_mrt=='สามย่าน'?'selected':''}>สามย่าน (BL26)</option>
          <option value="สีลม MRT" ${_mrt=='สีลม MRT'?'selected':''}>สีลม (BL25)</option>
          <option value="ลุมพินี" ${_mrt=='ลุมพินี'?'selected':''}>ลุมพินี (BL24)</option>
          <option value="คลองเตย" ${_mrt=='คลองเตย'?'selected':''}>คลองเตย (BL23)</option>
          <option value="สุขุมวิท MRT" ${_mrt=='สุขุมวิท MRT'?'selected':''}>สุขุมวิท (BL22)</option>
          <option value="เพชรบุรี" ${_mrt=='เพชรบุรี'?'selected':''}>เพชรบุรี (BL21)</option>
          <option value="พระราม 9" ${_mrt=='พระราม 9'?'selected':''}>พระราม 9 (BL20)</option>
          <option value="ศูนย์วัฒนธรรมฯ" ${_mrt=='ศูนย์วัฒนธรรมฯ'?'selected':''}>ศูนย์วัฒนธรรมฯ (BL19)</option>
          <option value="ห้วยขวาง" ${_mrt=='ห้วยขวาง'?'selected':''}>ห้วยขวาง (BL18)</option>
          <option value="สุทธิสาร" ${_mrt=='สุทธิสาร'?'selected':''}>สุทธิสาร (BL17)</option>
          <option value="รัชดา" ${_mrt=='รัชดา'?'selected':''}>รัชดา (BL16)</option>
          <option value="ลาดพร้าว MRT" ${_mrt=='ลาดพร้าว MRT'?'selected':''}>ลาดพร้าว (BL15)</option>
          <option value="พหลโยธิน MRT" ${_mrt=='พหลโยธิน MRT'?'selected':''}>พหลโยธิน (BL14)</option>
          <option value="จตุจักร MRT" ${_mrt=='จตุจักร MRT'?'selected':''}>จตุจักร (BL13)</option>
          <option value="กำแพงเพชร" ${_mrt=='กำแพงเพชร'?'selected':''}>กำแพงเพชร (BL12)</option>
          <option value="บางซื่อ" ${_mrt=='บางซื่อ'?'selected':''}>บางซื่อ (BL11)</option>
          <option value="เตาปูน" ${_mrt=='เตาปูน'?'selected':''}>เตาปูน (BL10)</option>
          <option value="บางโพ" ${_mrt=='บางโพ'?'selected':''}>บางโพ (BL09)</option>
          <option value="บางอ้อ" ${_mrt=='บางอ้อ'?'selected':''}>บางอ้อ (BL08)</option>
          <option value="บางพลัด" ${_mrt=='บางพลัด'?'selected':''}>บางพลัด (BL07)</option>
          <option value="สิรินธร" ${_mrt=='สิรินธร'?'selected':''}>สิรินธร (BL06)</option>
          <option value="บางยี่ขัน" ${_mrt=='บางยี่ขัน'?'selected':''}>บางยี่ขัน (BL05)</option>
          </optgroup>
          <optgroup label="🟣 MRT สายสีม่วง (PP01–PP16)">
          <option value="คลองบางไผ่ MRT" ${_mrt=='คลองบางไผ่ MRT'?'selected':''}>คลองบางไผ่ (PP01)</option>
          <option value="ตลาดบางใหญ่ MRT" ${_mrt=='ตลาดบางใหญ่ MRT'?'selected':''}>ตลาดบางใหญ่ (PP02)</option>
          <option value="สามแยกบางใหญ่ MRT" ${_mrt=='สามแยกบางใหญ่ MRT'?'selected':''}>สามแยกบางใหญ่ (PP03)</option>
          <option value="บางพลู MRT" ${_mrt=='บางพลู MRT'?'selected':''}>บางพลู (PP04)</option>
          <option value="บางรักใหญ่ MRT" ${_mrt=='บางรักใหญ่ MRT'?'selected':''}>บางรักใหญ่ (PP05)</option>
          <option value="บางรักน้อยท่าอิฐ MRT" ${_mrt=='บางรักน้อยท่าอิฐ MRT'?'selected':''}>บางรักน้อยท่าอิฐ (PP06)</option>
          <option value="ไทรม้า MRT" ${_mrt=='ไทรม้า MRT'?'selected':''}>ไทรม้า (PP07)</option>
          <option value="สะพานพระนั่งเกล้า MRT" ${_mrt=='สะพานพระนั่งเกล้า MRT'?'selected':''}>สะพานพระนั่งเกล้า (PP08)</option>
          <option value="แยกนนทบุรี 1 MRT" ${_mrt=='แยกนนทบุรี 1 MRT'?'selected':''}>แยกนนทบุรี 1 (PP09)</option>
          <option value="บางกระสอ MRT" ${_mrt=='บางกระสอ MRT'?'selected':''}>บางกระสอ (PP10)</option>
          <option value="ศูนย์ราชการนนทบุรี MRT" ${_mrt=='ศูนย์ราชการนนทบุรี MRT'?'selected':''}>ศูนย์ราชการนนทบุรี (PP11)</option>
          <option value="กระทรวงสาธารณสุข MRT" ${_mrt=='กระทรวงสาธารณสุข MRT'?'selected':''}>กระทรวงสาธารณสุข (PP12)</option>
          <option value="แยกติวานนท์ MRT" ${_mrt=='แยกติวานนท์ MRT'?'selected':''}>แยกติวานนท์ (PP13)</option>
          <option value="วงศ์สว่าง MRT" ${_mrt=='วงศ์สว่าง MRT'?'selected':''}>วงศ์สว่าง (PP14)</option>
          <option value="บางซ่อน MRT สีม่วง" ${_mrt=='บางซ่อน MRT สีม่วง'?'selected':''}>บางซ่อน (PP15)</option>
          <option value="เตาปูน MRT สีม่วง" ${_mrt=='เตาปูน MRT สีม่วง'?'selected':''}>เตาปูน (PP16)</option>
          </optgroup>
          <optgroup label="🟡 MRT สายสีเหลือง (YL01–YL23)">
          <option value="ลาดพร้าว MRT สีเหลือง" ${_mrt=='ลาดพร้าว MRT สีเหลือง'?'selected':''}>ลาดพร้าว (YL01)</option>
          <option value="ภาวนา MRT" ${_mrt=='ภาวนา MRT'?'selected':''}>ภาวนา (YL02)</option>
          <option value="โชคชัย 4 MRT" ${_mrt=='โชคชัย 4 MRT'?'selected':''}>โชคชัย 4 (YL03)</option>
          <option value="ลาดพร้าว 71 MRT" ${_mrt=='ลาดพร้าว 71 MRT'?'selected':''}>ลาดพร้าว 71 (YL04)</option>
          <option value="ลาดพร้าว 83 MRT" ${_mrt=='ลาดพร้าว 83 MRT'?'selected':''}>ลาดพร้าว 83 (YL05)</option>
          <option value="มหาดไทย MRT" ${_mrt=='มหาดไทย MRT'?'selected':''}>มหาดไทย (YL06)</option>
          <option value="ลาดพร้าว 101 MRT" ${_mrt=='ลาดพร้าว 101 MRT'?'selected':''}>ลาดพร้าว 101 (YL07)</option>
          <option value="บางกะปิ MRT" ${_mrt=='บางกะปิ MRT'?'selected':''}>บางกะปิ (YL08)</option>
          <option value="แยกลำสาลี MRT" ${_mrt=='แยกลำสาลี MRT'?'selected':''}>แยกลำสาลี (YL09)</option>
          <option value="ศรีกรีฑา MRT" ${_mrt=='ศรีกรีฑา MRT'?'selected':''}>ศรีกรีฑา (YL10)</option>
          <option value="หัวหมาก MRT สีเหลือง" ${_mrt=='หัวหมาก MRT สีเหลือง'?'selected':''}>หัวหมาก (YL11)</option>
          <option value="กลันตัน MRT" ${_mrt=='กลันตัน MRT'?'selected':''}>กลันตัน (YL12)</option>
          <option value="ศรีนุช MRT" ${_mrt=='ศรีนุช MRT'?'selected':''}>ศรีนุช (YL13)</option>
          <option value="ศรีนครินทร์ 38 MRT" ${_mrt=='ศรีนครินทร์ 38 MRT'?'selected':''}>ศรีนครินทร์ 38 (YL14)</option>
          <option value="สวนหลวง ร.9 MRT" ${_mrt=='สวนหลวง ร.9 MRT'?'selected':''}>สวนหลวง ร.9 (YL15)</option>
          <option value="ศรีอุดม MRT" ${_mrt=='ศรีอุดม MRT'?'selected':''}>ศรีอุดม (YL16)</option>
          <option value="ศรีเอี่ยม MRT" ${_mrt=='ศรีเอี่ยม MRT'?'selected':''}>ศรีเอี่ยม (YL17)</option>
          <option value="ศรีลาซาล MRT" ${_mrt=='ศรีลาซาล MRT'?'selected':''}>ศรีลาซาล (YL18)</option>
          <option value="ศรีแบริ่ง MRT" ${_mrt=='ศรีแบริ่ง MRT'?'selected':''}>ศรีแบริ่ง (YL19)</option>
          <option value="ศรีด่าน MRT" ${_mrt=='ศรีด่าน MRT'?'selected':''}>ศรีด่าน (YL20)</option>
          <option value="ศรีเทพา MRT" ${_mrt=='ศรีเทพา MRT'?'selected':''}>ศรีเทพา (YL21)</option>
          <option value="ทิพวัล MRT" ${_mrt=='ทิพวัล MRT'?'selected':''}>ทิพวัล (YL22)</option>
          <option value="สำโรง MRT สีเหลือง" ${_mrt=='สำโรง MRT สีเหลือง'?'selected':''}>สำโรง (YL23)</option>
          </optgroup>
          <optgroup label="🩷 MRT สายสีชมพู (PK01–PK30)">
          <option value="ศูนย์ราชการนนทบุรี MRT สีชมพู" ${_mrt=='ศูนย์ราชการนนทบุรี MRT สีชมพู'?'selected':''}>ศูนย์ราชการนนทบุรี (PK01)</option>
          <option value="แคราย MRT" ${_mrt=='แคราย MRT'?'selected':''}>แคราย (PK02)</option>
          <option value="สนามบินน้ำ MRT" ${_mrt=='สนามบินน้ำ MRT'?'selected':''}>สนามบินน้ำ (PK03)</option>
          <option value="สามัคคี MRT" ${_mrt=='สามัคคี MRT'?'selected':''}>สามัคคี (PK04)</option>
          <option value="กรมชลประทาน MRT" ${_mrt=='กรมชลประทาน MRT'?'selected':''}>กรมชลประทาน (PK05)</option>
          <option value="แยกปากเกร็ด MRT" ${_mrt=='แยกปากเกร็ด MRT'?'selected':''}>แยกปากเกร็ด (PK06)</option>
          <option value="เลี่ยงเมืองปากเกร็ด MRT" ${_mrt=='เลี่ยงเมืองปากเกร็ด MRT'?'selected':''}>เลี่ยงเมืองปากเกร็ด (PK07)</option>
          <option value="แจ้งวัฒนะ-ปากเกร็ด 28 MRT" ${_mrt=='แจ้งวัฒนะ-ปากเกร็ด 28 MRT'?'selected':''}>แจ้งวัฒนะ-ปากเกร็ด 28 (PK08)</option>
          <option value="ศรีรัช MRT" ${_mrt=='ศรีรัช MRT'?'selected':''}>ศรีรัช (PK09)</option>
          <option value="เมืองทองธานี MRT" ${_mrt=='เมืองทองธานี MRT'?'selected':''}>เมืองทองธานี (PK10)</option>
          <option value="แจ้งวัฒนะ 14 MRT" ${_mrt=='แจ้งวัฒนะ 14 MRT'?'selected':''}>แจ้งวัฒนะ 14 (PK11)</option>
          <option value="ศูนย์ราชการเฉลิมพระเกียรติ MRT" ${_mrt=='ศูนย์ราชการเฉลิมพระเกียรติ MRT'?'selected':''}>ศูนย์ราชการเฉลิมพระเกียรติ (PK12)</option>
          <option value="โทรคมนาคมแห่งชาติ MRT" ${_mrt=='โทรคมนาคมแห่งชาติ MRT'?'selected':''}>โทรคมนาคมแห่งชาติ (PK13)</option>
          <option value="หลักสี่ MRT สีชมพู" ${_mrt=='หลักสี่ MRT สีชมพู'?'selected':''}>หลักสี่ (PK14)</option>
          <option value="ราชภัฏพระนคร MRT" ${_mrt=='ราชภัฏพระนคร MRT'?'selected':''}>ราชภัฏพระนคร (PK15)</option>
          <option value="วัดพระศรีมหาธาตุ MRT สีชมพู" ${_mrt=='วัดพระศรีมหาธาตุ MRT สีชมพู'?'selected':''}>วัดพระศรีมหาธาตุ (PK16)</option>
          <option value="รามอินทรา 3 MRT" ${_mrt=='รามอินทรา 3 MRT'?'selected':''}>รามอินทรา 3 (PK17)</option>
          <option value="ลาดปลาเค้า MRT" ${_mrt=='ลาดปลาเค้า MRT'?'selected':''}>ลาดปลาเค้า (PK18)</option>
          <option value="รามอินทรา กม.4 MRT" ${_mrt=='รามอินทรา กม.4 MRT'?'selected':''}>รามอินทรา กม.4 (PK19)</option>
          <option value="มัยลาภ MRT" ${_mrt=='มัยลาภ MRT'?'selected':''}>มัยลาภ (PK20)</option>
          <option value="วัชรพล MRT" ${_mrt=='วัชรพล MRT'?'selected':''}>วัชรพล (PK21)</option>
          <option value="รามอินทรา กม.6 MRT" ${_mrt=='รามอินทรา กม.6 MRT'?'selected':''}>รามอินทรา กม.6 (PK22)</option>
          <option value="คู้บอน MRT" ${_mrt=='คู้บอน MRT'?'selected':''}>คู้บอน (PK23)</option>
          <option value="รามอินทรา กม.9 MRT" ${_mrt=='รามอินทรา กม.9 MRT'?'selected':''}>รามอินทรา กม.9 (PK24)</option>
          <option value="วงแหวนรามอินทรา MRT" ${_mrt=='วงแหวนรามอินทรา MRT'?'selected':''}>วงแหวนรามอินทรา (PK25)</option>
          <option value="นพรัตน์ MRT" ${_mrt=='นพรัตน์ MRT'?'selected':''}>นพรัตน์ (PK26)</option>
          <option value="บางชัน MRT" ${_mrt=='บางชัน MRT'?'selected':''}>บางชัน (PK27)</option>
          <option value="เศรษฐบุตรบำเพ็ญ MRT" ${_mrt=='เศรษฐบุตรบำเพ็ญ MRT'?'selected':''}>เศรษฐบุตรบำเพ็ญ (PK28)</option>
          <option value="ตลาดมีนบุรี MRT" ${_mrt=='ตลาดมีนบุรี MRT'?'selected':''}>ตลาดมีนบุรี (PK29)</option>
          <option value="มีนบุรี MRT สีชมพู" ${_mrt=='มีนบุรี MRT สีชมพู'?'selected':''}>มีนบุรี (PK30)</option>
          </optgroup>
        </select>
        </div>
      </div><!-- end 2-col: BTS + MRT -->

      <!-- ใกล้มหาวิทยาลัย (full width) -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-university" style="color:#7c3aed"></i> ${ui('af.sec.uni')}</div>
        <select id="mef-uni" style="width:100%;padding:8px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:12px;background:#fff">
          <option value="">${ui('af.uni.all')}</option>
          <optgroup label="กรุงเทพฯ และปริมณฑล">
          <option value="จุฬาลงกรณ์" ${_uni=='จุฬาลงกรณ์'?'selected':''}>จุฬาลงกรณ์มหาวิทยาลัย</option>
          <option value="ธรรมศาสตร์" ${_uni=='ธรรมศาสตร์'?'selected':''}>มหาวิทยาลัยธรรมศาสตร์</option>
          <option value="เกษตรศาสตร์" ${_uni=='เกษตรศาสตร์'?'selected':''}>มหาวิทยาลัยเกษตรศาสตร์</option>
          <option value="มหิดล" ${_uni=='มหิดล'?'selected':''}>มหาวิทยาลัยมหิดล</option>
          <option value="ศิลปากร" ${_uni=='ศิลปากร'?'selected':''}>มหาวิทยาลัยศิลปากร</option>
          <option value="สวนดุสิต" ${_uni=='สวนดุสิต'?'selected':''}>มหาวิทยาลัยสวนดุสิต</option>
          <option value="กรุงเทพ" ${_uni=='กรุงเทพ'?'selected':''}>มหาวิทยาลัยกรุงเทพ</option>
          <option value="รังสิต" ${_uni=='รังสิต'?'selected':''}>มหาวิทยาลัยรังสิต</option>
          <option value="ABAC" ${_uni=='ABAC'?'selected':''}>มหาวิทยาลัยอัสสัมชัญ (ABAC)</option>
          <option value="ศรีนครินทรวิโรฒ" ${_uni=='ศรีนครินทรวิโรฒ'?'selected':''}>มหาวิทยาลัยศรีนครินทรวิโรฒ (มศว)</option>
          <option value="รามคำแหง" ${_uni=='รามคำแหง'?'selected':''}>มหาวิทยาลัยรามคำแหง</option>
          <option value="ราชภัฏจันทรเกษม" ${_uni=='ราชภัฏจันทรเกษม'?'selected':''}>มรภ.จันทรเกษม</option>
          <option value="ราชภัฏพระนคร" ${_uni=='ราชภัฏพระนคร'?'selected':''}>มรภ.พระนคร</option>
          <option value="ราชภัฏธนบุรี" ${_uni=='ราชภัฏธนบุรี'?'selected':''}>มรภ.ธนบุรี</option>
          <option value="เทคโนโลยีพระจอมเกล้าพระนครเหนือ" ${_uni=='เทคโนโลยีพระจอมเกล้าพระนครเหนือ'?'selected':''}>มจพ. (พระจอมเกล้าพระนครเหนือ)</option>
          <option value="เทคโนโลยีพระจอมเกล้าธนบุรี" ${_uni=='เทคโนโลยีพระจอมเกล้าธนบุรี'?'selected':''}>มจธ. (พระจอมเกล้าธนบุรี)</option>
          <option value="เทคโนโลยีพระจอมเกล้าลาดกระบัง" ${_uni=='เทคโนโลยีพระจอมเกล้าลาดกระบัง'?'selected':''}>สจล. (ลาดกระบัง)</option>
          <option value="นิด้า" ${_uni=='นิด้า'?'selected':''}>สถาบันบัณฑิตพัฒนบริหารศาสตร์ (NIDA)</option>
          <option value="หอการค้าไทย" ${_uni=='หอการค้าไทย'?'selected':''}>มหาวิทยาลัยหอการค้าไทย</option>
          <option value="เอแบค" ${_uni=='เอแบค'?'selected':''}>มหาวิทยาลัยเอแบค</option>
          </optgroup>
          <optgroup label="ต่างจังหวัด">
          <option value="เชียงใหม่" ${_uni=='เชียงใหม่'?'selected':''}>มหาวิทยาลัยเชียงใหม่</option>
          <option value="เชียงราย" ${_uni=='เชียงราย'?'selected':''}>มหาวิทยาลัยเชียงราย</option>
          <option value="นเรศวร" ${_uni=='นเรศวร'?'selected':''}>มหาวิทยาลัยนเรศวร</option>
          <option value="พะเยา" ${_uni=='พะเยา'?'selected':''}>มหาวิทยาลัยพะเยา</option>
          <option value="ขอนแก่น" ${_uni=='ขอนแก่น'?'selected':''}>มหาวิทยาลัยขอนแก่น</option>
          <option value="อุบลราชธานี" ${_uni=='อุบลราชธานี'?'selected':''}>มหาวิทยาลัยอุบลราชธานี</option>
          <option value="มหาสารคาม" ${_uni=='มหาสารคาม'?'selected':''}>มหาวิทยาลัยมหาสารคาม</option>
          <option value="สงขลานครินทร์" ${_uni=='สงขลานครินทร์'?'selected':''}>มหาวิทยาลัยสงขลานครินทร์</option>
          <option value="วลัยลักษณ์" ${_uni=='วลัยลักษณ์'?'selected':''}>มหาวิทยาลัยวลัยลักษณ์</option>
          <option value="ภูเก็ต" ${_uni=='ภูเก็ต'?'selected':''}>มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตภูเก็ต</option>
          <option value="บูรพา" ${_uni=='บูรพา'?'selected':''}>มหาวิทยาลัยบูรพา (ชลบุรี)</option>
          </optgroup>
        </select>
      </div>

      <!-- ขนาดที่ดิน + ขนาดพื้นที่ใช้สอย (2 col) — range slider เหมือน adv-filter-panel -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <!-- ขนาดที่ดิน -->
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.land')}</div>
          <div id="mef-land-summary" style="font-size:11px;font-weight:700;color:var(--p);background:rgba(27,58,107,.07);border-radius:6px;padding:3px 8px;margin-bottom:6px;text-align:center">${_minLand===0&&_maxLand>=1000?ui('af.all.size'):(_minLand+' – '+(_maxLand>=1000?ui('af.unlimited'):_maxLand)+' ตร.ว.')}</div>
          <div style="font-size:10px;color:#aaa;display:flex;justify-content:space-between;margin-bottom:2px"><span>0</span><span>250</span><span>500</span><span>750</span><span>1,000+</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <div>
              <label style="font-size:10px;color:#888;display:block;margin-bottom:2px">${ui('af.min')}</label>
              <div style="position:relative">
                <input type="range" id="mef-land-min" min="0" max="1000" step="10" value="${_minLand}"
                  style="width:100%;accent-color:var(--p);cursor:pointer"
                  oninput="mefRangeUpdate('land')">
                <span id="mef-land-min-v" style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:var(--p);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">${_minLand} ตร.ว.</span>
              </div>
            </div>
            <div>
              <label style="font-size:10px;color:#888;display:block;margin-bottom:2px">${ui('af.max')}</label>
              <div style="position:relative">
                <input type="range" id="mef-land-max" min="0" max="1000" step="10" value="${_maxLand}"
                  style="width:100%;accent-color:var(--a);cursor:pointer"
                  oninput="mefRangeUpdate('land')">
                <span id="mef-land-max-v" style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">${_maxLand>=1000?ui('af.unlimited'):_maxLand+' ตร.ว.'}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- ขนาดพื้นที่ใช้สอย -->
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.area')}</div>
          <div id="mef-area-summary" style="font-size:11px;font-weight:700;color:var(--p);background:rgba(27,58,107,.07);border-radius:6px;padding:3px 8px;margin-bottom:6px;text-align:center">${_minUsable===0&&_maxUsable>=500?ui('af.all.size'):(_minUsable+' – '+(_maxUsable>=500?ui('af.unlimited'):_maxUsable)+' ตร.ม.')}</div>
          <div style="font-size:10px;color:#aaa;display:flex;justify-content:space-between;margin-bottom:2px"><span>0</span><span>125</span><span>250</span><span>375</span><span>500+</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <div>
              <label style="font-size:10px;color:#888;display:block;margin-bottom:2px">${ui('af.min')}</label>
              <div style="position:relative">
                <input type="range" id="mef-area-min" min="0" max="500" step="5" value="${_minUsable}"
                  style="width:100%;accent-color:var(--p);cursor:pointer"
                  oninput="mefRangeUpdate('area')">
                <span id="mef-area-min-v" style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:var(--p);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">${_minUsable} ตร.ม.</span>
              </div>
            </div>
            <div>
              <label style="font-size:10px;color:#888;display:block;margin-bottom:2px">${ui('af.max')}</label>
              <div style="position:relative">
                <input type="range" id="mef-area-max" min="0" max="500" step="5" value="${_maxUsable}"
                  style="width:100%;accent-color:var(--a);cursor:pointer"
                  oninput="mefRangeUpdate('area')">
                <span id="mef-area-max-v" style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">${_maxUsable>=500?ui('af.unlimited'):_maxUsable+' ตร.ม.'}</span>
              </div>
            </div>
          </div>
        </div>
      </div><!-- end 2-col: ขนาดที่ดิน + พื้นที่ใช้สอย -->

      <!-- ห้องนอน / ห้องน้ำ (2 col) — checkbox เหมือน adv-filter-panel -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.bed')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="1" class="mef-bed" ${(_minBed=='1')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room1')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="2" class="mef-bed" ${(_minBed=='2')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room2')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="3" class="mef-bed" ${(_minBed=='3')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room3')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="4" class="mef-bed" ${(_minBed=='4')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room4')}</label>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.bath')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="1" class="mef-bath" ${(_minBath=='1')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room1')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="2" class="mef-bath" ${(_minBath=='2')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room2')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="3" class="mef-bath" ${(_minBath=='3')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room3')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="4" class="mef-bath" ${(_minBath=='4')?'checked':''} style="accent-color:var(--p)"> ${ui('af.room4')}</label>
          </div>
        </div>
      </div>

      <!-- ที่จอดรถ / เฟอร์นิเจอร์ (2 col) — checkbox เหมือน adv-filter-panel -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.park')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="1" class="mef-park" ${((_ef.minPark||'')=='1')?'checked':''} style="accent-color:var(--p)"> ${ui('af.car1')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="2" class="mef-park" ${((_ef.minPark||'')=='2')?'checked':''} style="accent-color:var(--p)"> ${ui('af.car2')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="3" class="mef-park" ${((_ef.minPark||'')=='3')?'checked':''} style="accent-color:var(--p)"> ${ui('af.car3')}</label>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.furn')}</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="full" id="mef-furn-full" ${_furniture==='full'?'checked':''} style="accent-color:var(--p)"> ${ui('af.furn.full')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="partial" id="mef-furn-part" ${_furniture==='partial'?'checked':''} style="accent-color:var(--p)"> ${ui('af.furn.part')}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="none" id="mef-furn-none" ${_furniture==='none'?'checked':''} style="accent-color:var(--p)"> ${ui('af.furn.none')}</label>
          </div>
        </div>
      </div>

      <!-- การเลี้ยงสัตว์ (full width) -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4"><i class="fas fa-paw" style="color:#be185d"></i> ${ui('af.sec.pets')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="mef-pets" ${_pets?'checked':''} style="accent-color:var(--p)"> ${ui('af.pets.ok')}</label>
        </div>
      </div>

      <!-- เครื่องใช้ไฟฟ้า & สิ่งอำนวยความสะดวก (full width) — เหมือน adv-filter-panel -->
      <div style="margin-bottom:8px">
        <div style="font-size:11px;font-weight:800;color:#8A8070;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0ece4">${ui('af.sec.app')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          ${[['แอร์','af.app.ac'],['ตู้เย็น','af.app.fridge'],['เครื่องซักผ้า','af.app.washer'],['เครื่องทำน้ำอุ่น','af.app.heater'],['โทรทัศน์','af.app.tv'],['ไมโครเวฟ','af.app.micro'],['เตาไฟฟ้า','af.app.stove'],['ระบบรักษาความปลอดภัย','af.app.security']].map(([val,k])=>`<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="${val}" class="mef-app" ${_features.includes(val)?'checked':''} style="accent-color:var(--p)"> ${ui(k)}</label>`).join('')}
        </div>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:12px 18px;background:#f9f5ef;border-top:1px solid var(--bd);display:flex;gap:10px;flex-shrink:0">
      <button onclick="modalExtraFilterClear('${type}')" style="padding:12px 18px;background:#fff;color:var(--tx2);border:1.5px solid var(--bd);border-radius:10px;font-size:14px;font-weight:700;cursor:pointer"><i class="fas fa-undo"></i> ${ui('af.btn.reset')}</button>
      <button onclick="modalExtraFilterApply('${type}')" style="flex:1;padding:12px;background:linear-gradient(135deg,var(--a),var(--a2));color:#1A1A2E;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer"><i class="fas fa-search"></i> ${ui('af.btn.apply')}</button>
    </div>
  </div>`;
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
  // Apply initial price mode
  mefSwitchPriceMode(_priceMode);
}

function mefSwitchPriceMode(mode){
  const buyBtn = document.getElementById('mef-mode-buy');
  const rentBtn = document.getElementById('mef-mode-rent');
  const mo = document.getElementById('modal-extra-filter-sheet');
  if(!mo) return;
  const buyOpts = mo.querySelectorAll('.mef-buy-opts');
  const rentOpts = mo.querySelectorAll('.mef-rent-opts');
  if(mode==='buy'){
    if(buyBtn){ buyBtn.style.background='var(--p)'; buyBtn.style.color='#fff'; buyBtn.style.borderColor='var(--p)'; }
    if(rentBtn){ rentBtn.style.background='#f5f5f0'; rentBtn.style.color='var(--tx2)'; rentBtn.style.borderColor='var(--bd)'; }
    buyOpts.forEach(el=>el.style.display='');
    rentOpts.forEach(el=>el.style.display='none');
  } else {
    if(rentBtn){ rentBtn.style.background='var(--p)'; rentBtn.style.color='#fff'; rentBtn.style.borderColor='var(--p)'; }
    if(buyBtn){ buyBtn.style.background='#f5f5f0'; buyBtn.style.color='var(--tx2)'; buyBtn.style.borderColor='var(--bd)'; }
    rentOpts.forEach(el=>el.style.display='');
    buyOpts.forEach(el=>el.style.display='none');
  }
}

function modalExtraFilterClear(type) {
  const sheet = document.getElementById('modal-extra-filter-sheet');
  if(sheet){
    // Reset all checkboxes inside the sheet
    sheet.querySelectorAll('input[type="checkbox"]').forEach(function(cb){ cb.checked = false; });
    // Reset all selects inside the sheet
    sheet.querySelectorAll('select').forEach(function(sel){ sel.selectedIndex = 0; });
    // Reset all text/number inputs
    sheet.querySelectorAll('input[type="text"],input[type="number"]').forEach(function(inp){ inp.value = ''; });
    // Reset range sliders to default positions
    var areaMin = sheet.querySelector('#mef-area-min');
    var areaMax = sheet.querySelector('#mef-area-max');
    var landMin = sheet.querySelector('#mef-land-min');
    var landMax = sheet.querySelector('#mef-land-max');
    if(areaMin){ areaMin.value = areaMin.min || 0; }
    if(areaMax){ areaMax.value = areaMax.max || 500; }
    if(landMin){ landMin.value = landMin.min || 0; }
    if(landMax){ landMax.value = landMax.max || 1000; }
    // Update slider display labels
    if(typeof mefRangeUpdate === 'function'){ mefRangeUpdate('area'); mefRangeUpdate('land'); }
    // Reset price mode to buy
    if(typeof mefSwitchPriceMode === 'function') mefSwitchPriceMode('buy');
  }
  // Clear internal filter state
  window._modalExtraFilter = {};
  // Re-run filter without extra conditions (keeps popup open)
  modalAdvFilter(type);
  // Also refresh map if open
  if(typeof _popupRefreshMarkersFromData==='function' && _popupLeafletMap && window._modalTypeData){
    _popupRefreshMarkersFromData(window._modalTypeData.data || []);
  }
}

/* ── mefRangeUpdate: real-time slider label update for modal extra filter ── */
function mefRangeUpdate(kind) {
  if (kind === 'land') {
    const minEl = document.getElementById('mef-land-min');
    const maxEl = document.getElementById('mef-land-max');
    const minV  = document.getElementById('mef-land-min-v');
    const maxV  = document.getElementById('mef-land-max-v');
    const sumEl = document.getElementById('mef-land-summary');
    if (!minEl || !maxEl) return;
    const mn = +minEl.value, mx = +maxEl.value;
    if (minV) minV.textContent = mn + ' ตร.ว.';
    if (maxV) maxV.textContent = mx >= 1000 ? ui('af.unlimited') : mx + ' ตร.ว.';
    if (sumEl) sumEl.textContent = (mn === 0 && mx >= 1000) ? ui('af.all.size') : (mn + ' – ' + (mx >= 1000 ? ui('af.unlimited') : mx) + ' ตร.ว.');
  } else {
    const minEl = document.getElementById('mef-area-min');
    const maxEl = document.getElementById('mef-area-max');
    const minV  = document.getElementById('mef-area-min-v');
    const maxV  = document.getElementById('mef-area-max-v');
    const sumEl = document.getElementById('mef-area-summary');
    if (!minEl || !maxEl) return;
    const mn = +minEl.value, mx = +maxEl.value;
    if (minV) minV.textContent = mn + ' ตร.ม.';
    if (maxV) maxV.textContent = mx >= 500 ? ui('af.unlimited') : mx + ' ตร.ม.';
    if (sumEl) sumEl.textContent = (mn === 0 && mx >= 500) ? ui('af.all.size') : (mn + ' – ' + (mx >= 500 ? ui('af.unlimited') : mx) + ' ตร.ม.');
  }
}

function modalExtraFilterApply(type) {
  const sheet = document.getElementById('modal-extra-filter-sheet');
  if(!sheet) return;
  // อ่านค่า checkbox bed (ค่าสูงสุดที่ติ๊ก)
  const _bedChecked = [...sheet.querySelectorAll('.mef-bed:checked')].map(c=>Number(c.value));
  const _minBedVal = _bedChecked.length ? String(Math.min(..._bedChecked)) : '';
  // อ่านค่า checkbox bath
  const _bathChecked = [...sheet.querySelectorAll('.mef-bath:checked')].map(c=>Number(c.value));
  const _minBathVal = _bathChecked.length ? String(Math.min(..._bathChecked)) : '';
  // อ่านค่า checkbox park
  const _parkChecked = [...sheet.querySelectorAll('.mef-park:checked')].map(c=>Number(c.value));
  const _minParkVal = _parkChecked.length ? String(Math.min(..._parkChecked)) : '';
  // อ่านค่า checkbox furniture (เฟอร์นิเจอร์ — single check wins first)
  const _furnChecked = [...sheet.querySelectorAll('#mef-furn-full:checked,#mef-furn-part:checked,#mef-furn-none:checked')];
  const _furnVal = _furnChecked.length ? _furnChecked[0].value : '';
  // อ่าน features จาก mef-app checkboxes
  const features = [...sheet.querySelectorAll('.mef-app:checked')].map(c=>c.value);
  const isBuy = sheet.querySelector('#mef-mode-buy')?.style.background.includes('var(--p)') ||
                sheet.querySelector('#mef-mode-buy')?.style.background === 'var(--p)';
  window._modalExtraFilter = {
    minBed:    _minBedVal,
    minBath:   _minBathVal,
    minArea:   '',
    minPark:   _minParkVal,
    minPrice:  sheet.querySelector('#mef-price-min')?.value || '',
    maxPrice:  sheet.querySelector('#mef-price-max')?.value || '',
    priceMode: isBuy ? 'buy' : 'rent',
    loc:       sheet.querySelector('#mef-loc')?.value       || sheet.querySelector('#mef-province')?.value || '',
    bts:       sheet.querySelector('#mef-bts')?.value       || '',
    mrt:       sheet.querySelector('#mef-mrt')?.value       || '',
    uni:       sheet.querySelector('#mef-uni')?.value       || '',
    furniture: _furnVal,
    pets:      sheet.querySelector('#mef-pets')?.checked    || false,
    features,
    minLand:   +(sheet.querySelector('#mef-land-min')?.value   || 0),
    maxLand:   +(sheet.querySelector('#mef-land-max')?.value   || 1000),
    minUsable: +(sheet.querySelector('#mef-area-min')?.value   || 0),
    maxUsable: +(sheet.querySelector('#mef-area-max')?.value   || 500),
  };
  sheet.remove();
  modalAdvFilter(type);
}

function srvName(s){ return s.name||''; }
function srvDesc(s){ return s.short_desc||s.description||''; }
function srvPrice(s){ return s.price||''; }
function srvDur(s){ return s.duration||s.dur||''; }
function srvCard(s, extraStyle){
  const style = extraStyle ? ` style="${extraStyle}"` : '';
  return `<div class="osrv-card"${style} onclick="showSrvDetail('${s.id}')"><div class="osrv-icon"><i class="fas ${s.icon||'fa-tools'}"></i></div><div class="osrv-name">${srvName(s)}</div><div class="osrv-desc">${srvDesc(s)}</div><div class="osrv-btns" onclick="event.stopPropagation()"><a class="obtn obtn-ln" href="${lineUrl(C.LINE)}" target="_blank"><i class="fab fa-line"></i> Line</a><a class="obtn obtn-tel" href="tel:${C.PHONE}"><i class="fas fa-mobile-alt"></i> โทร</a></div></div>`;
}
function renderSrvDropdown(){
  // render nav dropdown จาก services array โดยตรง — ไม่ต้อง hardcode HTML อีกต่อไป
  const grid = $('dd-srv-grid');
  if(!grid || !services.length) return;
  // แสดงสูงสุด 8 items ใน dropdown เพื่อไม่ให้ล้น
  const preview = services.slice(0, 8);
  grid.innerHTML = preview.map(s =>
    `<div class="dd-item" data-srvdd-item="${s.id}" onclick="openSrvFromDD('${s.id}')"><i class="fas ${s.icon||'fa-tools'}" style="width:16px;text-align:center"></i>&nbsp;&nbsp;<span data-srvdd-label="${s.id}">${srvName(s)}</span></div>`
  ).join('');
}
function renderServices(){
  const showSrvs = services;
  const trackEl = $('osrv-track');
  if(trackEl){
    trackEl.innerHTML = showSrvs.map(s=>srvCard(s,'flex-shrink:0;width:175px;scroll-snap-align:start')).join('');
    setTimeout(() => initHGallerySwipe('osrv-track-wrap'), 100);
  }
  if($('osrv-grid')) $('osrv-grid').innerHTML = services.map(s=>srvCard(s)).join('');
  // อัพเดต nav dropdown ทุกครั้งที่ services เปลี่ยน
  renderSrvDropdown();
}
function showSrvDetail(id){ const s=services.find(x=>String(x.id)===String(id)); if(!s)return; $('srv-title2').textContent=srvName(s); $('srv-body').innerHTML=`<div style="text-align:center;margin-bottom:16px"><i class="fas ${s.icon||'fa-tools'}" style="font-size:52px;color:var(--p)"></i></div><p style="margin-bottom:12px;color:var(--tx2)">${s.full_desc||srvDesc(s)}</p><div style="background:var(--bg);padding:12px 16px;border-radius:10px;margin-bottom:16px"><div style="margin-bottom:6px"><strong>${ui('srv.detail.price')}:</strong> ${srvPrice(s)}</div><div><strong>${ui('srv.detail.dur')}:</strong> ${srvDur(s)}</div></div><div class="cta-row"><a class="btn-cta cta-ln" href="${lineUrl(C.LINE)}" target="_blank"><i class="fab fa-line"></i> ${ui('srv.detail.chat')}</a><a class="btn-cta cta-tel" href="tel:${C.PHONE}"><i class="fas fa-mobile-alt"></i> ${ui('cta.call')}</a></div>`; _openModal('srv-modal'); }
function showSrvDetailNav(id){ _silentShowPage('home',true); setTimeout(()=>{ showSrvDetail(id); scrollToEl('osrv-sec'); },60); }
function openSrvFromDD(id){
  closeAllDD();
  _silentShowPage('home',true);
  setTimeout(()=>{
    scrollToEl('osrv-sec');
    setTimeout(()=>{ showSrvDetail(id); },200);
  },60);
}

function blogCardFull(b){
  const photos = (b.photos && b.photos.length) ? b.photos.filter(Boolean) : [];
  const uid = 'bc'+Math.random().toString(36).slice(2,7);
  let thumbHtml;
  if(photos.length > 1){
    thumbHtml = `<div class="card-slides" id="${uid}-slides">${photos.map((u,i)=>`<img src="${u}" loading="${i===0?'eager':'lazy'}">`).join('')}</div>
    <button class="card-sarr prev" onclick="event.stopPropagation();cardSlide('${uid}',-1)"><i class="fas fa-chevron-left"></i></button>
    <button class="card-sarr next" onclick="event.stopPropagation();cardSlide('${uid}',1)"><i class="fas fa-chevron-right"></i></button>
    <div class="card-sdots" id="${uid}-dots">${photos.map((_,i)=>`<div class="card-dot${i===0?' active':''}"></div>`).join('')}</div>`;
  } else if(photos.length === 1){
    thumbHtml = `<img src="${photos[0]}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    thumbHtml = `<div style="font-size:44px;display:flex;align-items:center;justify-content:center;height:100%">${b.icon||'📄'}</div>`;
  }
  return `<div class="blog-card" onclick='showBlogDetail(${JSON.stringify(b)})'>
    <div class="blog-thumb" style="background:${b.color||'#f5f0e8'}">${thumbHtml}</div>
    <div class="blog-body">
      <span class="blog-cat">${b.cat}</span>
      <div class="blog-title">${b.title}</div>
      <div class="blog-meta"><i class="far fa-calendar-alt"></i> ${b.date}</div>
    </div>
  </div>`;
}
function renderBlogs(){
  const showBlogs = blogs;
  const trackEl = $('blog-track') || $('blog-grid');
  if(!trackEl) return;
  trackEl.innerHTML = showBlogs.map(b => blogCardFull(b)).join('');
  setTimeout(() => {
    if($('blog-track')) initHGallerySwipe('blog-track-wrap');
    initAllCardSwipes();
  }, 100);
}
function showBlogDetail(blog){
  $('blog-title').textContent = blog.title;
  const rawPhotos = blog.photos || blog.images || [];
  const photos = Array.isArray(rawPhotos) ? rawPhotos.filter(Boolean) : [];
  let sliderHtml = '';
  if(photos.length){
    sliderHtml = `<div class="mslider-wrap" style="margin-bottom:14px">
      <div class="mslider"><div class="slides" id="blog-slides"></div></div>
      <button class="sarr prev" onclick="blogSlide(-1)"><i class="fas fa-chevron-left"></i></button>
      <button class="sarr next" onclick="blogSlide(1)"><i class="fas fa-chevron-right"></i></button>
      <div class="sdots" id="blog-sdots"></div>
    </div>`;
  }
  $('blog-body').innerHTML = sliderHtml +
    `<span class="blog-cat">${blog.cat}</span>
    <div style="font-size:12px;color:var(--gr);margin:8px 0 14px"><i class="far fa-calendar-alt"></i> ${blog.date}</div>
    <div style="color:var(--tx2);line-height:1.7;margin-bottom:20px">${blog.content||''}</div>
    <div class="cta-row">
      <a class="btn-cta cta-ln" href="${lineUrl(C.LINE)}" target="_blank"><i class="fab fa-line"></i> ${ui('cta.contact')}</a>
      <a class="btn-cta cta-tel" href="tel:${C.PHONE}"><i class="fas fa-mobile-alt"></i> ${ui('cta.tel')}</a>
    </div>`;
  if(photos.length){
    let blogSlideCur = 0;
    const renderBlogSlider = () => {
      const sc = $('blog-slides');
      const sd = $('blog-sdots');
      if(!sc) return;
      sc.innerHTML = photos.map((url,i)=>`<img src="${url}" loading="${i===0?'eager':'lazy'}" style="width:100%;height:220px;object-fit:cover;flex-shrink:0">`).join('');
      sd.innerHTML = photos.map((_,i)=>`<span class="dot ${i===blogSlideCur?'active':''}" onclick="blogGoSlide(${i})"></span>`).join('');
      sc.style.transform = `translateX(-${blogSlideCur*100}%)`;
    };
    window.blogSlide = dir => { blogSlideCur=(blogSlideCur+dir+photos.length)%photos.length; renderBlogSlider(); };
    window.blogGoSlide = i => { blogSlideCur=i; renderBlogSlider(); };
    renderBlogSlider();
  }
  _openModal('blog-modal');
}

function renderPortfolio(filter){ let list=port; if(filter!=='all'){if(filter==='SOLD'||filter==='RENTED')list=list.filter(p=>p.status===filter);else list=list.filter(p=>p.type===filter);} if(typeof syncAllStats==='function') syncAllStats(); $('port-grid').innerHTML=list.length?list.map(p=>{
  const photos=[p.photo,...(p.photos||[])].filter(Boolean);
  let imgHtml;
  if(photos.length>1){
    const uid='pt'+Math.random().toString(36).slice(2,7);
    imgHtml=`<div class="card-slides" id="${uid}-slides">${photos.map((u,i)=>`<img src="${u}" loading="${i===0?'eager':'lazy'}">`).join('')}</div><button class="card-sarr prev" onclick="event.stopPropagation();cardSlide('${uid}',-1)"><i class="fas fa-chevron-left"></i></button><button class="card-sarr next" onclick="event.stopPropagation();cardSlide('${uid}',1)"><i class="fas fa-chevron-right"></i></button><div class="card-sdots" id="${uid}-dots">${photos.map((_,i)=>`<div class="card-dot${i===0?' active':''}"></div>`).join('')}</div>`;
  } else if(photos.length===1){
    imgHtml=`<img src="${photos[0]}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    imgHtml=p.icon||typeIcon(p.type);
  }
  const ribbonLabel = p.status==='SOLD' ? ui('ph.port.sold') : ui('ph.port.rented');
  return `<div class="gal-card" onclick='showPortDetail(${JSON.stringify(p)})'><div class="gal-img">${imgHtml}<div class="ribbon ${p.status==='SOLD'?'r-sold':'r-rent'}">${ribbonLabel}</div></div><div class="gal-body"><div class="gal-price">${fmtPrice(p.price,p.status==='RENTED'?'RENT':'BUY')}</div><div style="font-size:13px;font-weight:600">${sanitize(p.title||'')}</div><div style="font-size:11px;color:var(--gr)">${sanitize(p.location||'')}</div></div></div>`;
}).join(''):'<div class="empty" style="grid-column:1/-1"><i class="fas fa-search"></i><p>ไม่พบรายการ</p></div>';
setTimeout(initAllCardSwipes, 100); }
function filterPort(f,el){ $$('.gf').forEach(b=>b.classList.remove('active')); if(el)el.classList.add('active'); renderPortfolio(f); }
function showPortDetail(p){
  $('port-title').textContent = p.title;
  const rawPhotos = p.photos || [];
  let photos = Array.isArray(rawPhotos) ? rawPhotos.filter(Boolean) : [];
  if(!photos.length && p.photo) photos = [p.photo];
  let sliderHtml = '';
  if(photos.length){
    sliderHtml = `<div class="mslider-wrap" style="margin-bottom:14px">
      <div class="mslider"><div class="slides" id="port-slides"></div></div>
      <button class="sarr prev" onclick="portSlide(-1)"><i class="fas fa-chevron-left"></i></button>
      <button class="sarr next" onclick="portSlide(1)"><i class="fas fa-chevron-right"></i></button>
      <div class="sdots" id="port-sdots"></div>
    </div>`;
  }
  const st = p.status==='SOLD' ? ui('ph.port.status.sold') : ui('ph.port.status.rented');
  const sc = p.status==='SOLD' ? '#e74c3c' : '#8e44ad';
  $('port-body').innerHTML = sliderHtml +
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="ptag pt-type">${p.type}</span>
      <span class="ptag" style="background:${sc}22;border-color:${sc}55;color:${sc}">${st}</span>
    </div>
    <div style="background:var(--bg);padding:12px 16px;border-radius:10px;margin-bottom:14px">
      <div style="margin-bottom:6px"><strong>${ui('ph.port.label.loc')}:</strong> ${sanitize(p.location||'')}</div>
      <div style="margin-bottom:6px"><strong>${ui('ph.port.label.price')}:</strong> ${fmtPrice(p.price,p.status==='RENTED'?'RENT':'BUY')}</div>
      <div><strong>${ui('ph.port.label.date')}:</strong> ${p.date}</div>
    </div>
    ${p.review?`<div style="padding:12px;background:#fefce8;border-radius:10px;margin-bottom:16px;font-size:13px"><i class="fas fa-quote-left" style="color:var(--a2)"></i> ${p.review}</div>`:''}
    <div class="cta-row">
      <a class="btn-cta cta-ln" href="${lineUrl(C.LINE)}" target="_blank"><i class="fab fa-line"></i> ${ui('cta.consult')}</a>
      <a class="btn-cta cta-tel" href="tel:${C.PHONE}"><i class="fas fa-mobile-alt"></i> ${ui('cta.call')}</a>
    </div>`;
  if(photos.length){
    let portSlideCur = 0;
    const renderPortSlider = () => {
      const sc2 = $('port-slides');
      const sd2 = $('port-sdots');
      if(!sc2) return;
      sc2.innerHTML = photos.map((url,i)=>`<img src="${url}" loading="${i===0?'eager':'lazy'}" style="width:100%;height:220px;object-fit:cover;flex-shrink:0">`).join('');
      sd2.innerHTML = photos.map((_,i)=>`<span class="dot ${i===portSlideCur?'active':''}" onclick="portGoSlide(${i})"></span>`).join('');
      sc2.style.transform = `translateX(-${portSlideCur*100}%)`;
    };
    window.portSlide = dir => { portSlideCur=(portSlideCur+dir+photos.length)%photos.length; renderPortSlider(); };
    window.portGoSlide = i => { portSlideCur=i; renderPortSlider(); };
    renderPortSlider();
  }
  _openModal('port-modal');
}

function renderAgents(){
  $('agent-grid').innerHTML=agents.length?agents.map(a=>{
    const myProps=props.filter(p=>p.agentId===a.id);
    const allPhotos=[a.avatar_url,...(a.photos||[])].filter(Boolean);
    let photoHtml;
    if(allPhotos.length>1){
      const uid='ag'+Math.random().toString(36).slice(2,7);
      photoHtml=`<div class="card-slides" id="${uid}-slides">${allPhotos.map((u,i)=>`<img class="agent-photo-full" src="${u}" loading="${i===0?'eager':'lazy'}" style="object-position:top">`).join('')}</div><button class="card-sarr prev" onclick="event.stopPropagation();cardSlide('${uid}',-1)"><i class="fas fa-chevron-left"></i></button><button class="card-sarr next" onclick="event.stopPropagation();cardSlide('${uid}',1)"><i class="fas fa-chevron-right"></i></button>`;
    } else if(allPhotos.length===1){
      photoHtml=`<img class="agent-photo-full" src="${allPhotos[0]}" loading="eager" style="width:100%;height:100%;object-fit:cover;object-position:top">`;
    } else {
      photoHtml=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:700;color:#fff;background:${a.color||'#7c6fcd'}">${a.initials||a.name[0]}</div>`;
    }
    return `<div class="agent-card" onclick='showAgentDetail(${JSON.stringify(a)})'>
      <div class="agent-photo-wrap" style="position:relative;overflow:hidden">${photoHtml}</div>
      <div class="agent-info-area">
        <div class="agent-name">${a.name}</div>
        <div class="agent-role">${a.title}</div>
        <div class="agent-rating"><span class="stars">${'★'.repeat(Math.min(5,Math.round(a.rating||4.5)))}</span><span class="rating-num">${(a.rating||4.5).toFixed(1)}</span></div>
        <div class="agent-stats"><div class="agst"><div class="n">${myProps.length}</div><div class="l">${ui('ag.props')}</div></div><div class="agst"><div class="n">${port.length}</div><div class="l">${ui('ag.deals')}</div></div></div>
        <div class="agent-btns" onclick="event.stopPropagation()"><a class="ab ab-ln" href="${lineUrl(a.lineId)}" target="_blank"><i class="fab fa-line"></i> Line</a><a class="ab ab-tel" href="tel:${a.phone}"><i class="fas fa-mobile-alt"></i> โทร</a></div>
      </div>
    </div>`;
  }).join(''):'<div class="empty">ไม่พบข้อมูลตัวแทน</div>';
  setTimeout(initAllCardSwipes, 100);
}
function agScrollProps(dir) {
  const el = document.getElementById('ag-props-scroll');
  if (!el) return;
  const cardW = el.querySelector('.nearby-mini-card')?.offsetWidth || 160;
  el.scrollBy({ left: dir * (cardW + 10) * 2, behavior: 'smooth' });
  setTimeout(_agUpdateScrollBtns, 320);
}
function _agUpdateScrollBtns() {
  const el = document.getElementById('ag-props-scroll');
  const prev = document.getElementById('ag-scroll-prev');
  const next = document.getElementById('ag-scroll-next');
  if (!el) return;
  const atStart = el.scrollLeft <= 4;
  const atEnd   = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
  if (prev) prev.style.opacity = atStart ? '0.3' : '1';
  if (next) next.style.opacity = atEnd   ? '0.3' : '1';
}

function showAgentDetail(a){ 
  const myProps=props.filter(p=>a.propIds?.includes(p.id)||p.agentId===a.id); 
  $('ag-title').textContent=a.name; 
  const propsHtml = myProps.length ? `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:800;color:var(--p);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-home" style="color:var(--a)"></i> ทรัพย์ที่ดูแล (${myProps.length} รายการ)
      </div>
      <div style="position:relative">
        <button onclick="agScrollProps(-1)" id="ag-scroll-prev" style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);z-index:2;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.95);border:1.5px solid var(--bd);box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--p);font-size:11px;transition:.15s" onmouseover="this.style.background='var(--p)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,.95)';this.style.color='var(--p)'"><i class="fas fa-chevron-left"></i></button>
        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;padding-left:2px;padding-right:2px;-ms-overflow-style:none;scrollbar-width:none;scroll-behavior:smooth" class="agent-props-scroll" id="ag-props-scroll">
          ${myProps.map(p=>`<div class="nearby-mini-card" onclick="_closeModal('ag-modal');setTimeout(()=>openModal('${p.id}'),200)" style="flex-shrink:0;cursor:pointer">
            <div class="nearby-mini-img">${p.photos?.[0]?`<img src="${p.photos[0]}" loading="lazy">`:`<span style="font-size:22px">${p.icon||typeIcon(p.type)}</span>`}</div>
            <div class="nearby-mini-body">
              <div class="nearby-mini-price">${fmtPrice(p.price,p.tx)}</div>
              <div class="nearby-mini-title">${sanitize(p.title||'')}</div>
              <div class="nearby-mini-loc"><i class="fas fa-map-marker-alt"></i> ${sanitize(p.location||'')}</div>
            </div>
          </div>`).join('')}
        </div>
        <button onclick="agScrollProps(1)" id="ag-scroll-next" style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);z-index:2;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.95);border:1.5px solid var(--bd);box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--p);font-size:11px;transition:.15s" onmouseover="this.style.background='var(--p)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,.95)';this.style.color='var(--p)'"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>` : '';
  $('ag-body').innerHTML=`<div style="text-align:center;margin-bottom:16px">${a.avatar_url?`<img src="${a.avatar_url}" loading="lazy" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--pastel5);box-shadow:0 4px 16px rgba(124,111,205,.2)">`:`<div style="width:100px;height:100px;border-radius:50%;background:${a.color||'#7c6fcd'};display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;color:#fff;margin:0 auto">${a.initials||a.name[0]}</div>`}</div><div style="text-align:center;margin-bottom:14px"><div style="font-size:18px;font-weight:700">${a.name}</div><div style="color:var(--gr)">${a.title}</div></div><div style="background:var(--bg);padding:12px 16px;border-radius:10px;margin-bottom:16px"><div style="margin-bottom:6px"><strong>${ui('ag.detail.phone')}:</strong> ${a.phone}</div><div style="margin-bottom:6px"><strong>${ui('ag.detail.line')}:</strong> ${a.lineId}</div><div style="margin-bottom:6px"><strong>${ui('ag.detail.props')}:</strong> ${myProps.length}</div><div><strong>${ui('ag.detail.deals')}:</strong> ${port.length}</div></div>${a.bio?`<p style="font-size:13px;color:var(--tx2);margin-bottom:16px">${a.bio}</p>`:''}${propsHtml}<div class="cta-row"><a class="btn-cta cta-ln" href="${lineUrl(a.lineId)}" target="_blank"><i class="fab fa-line"></i> ${ui('cta.line')}</a><a class="btn-cta cta-tel" href="tel:${a.phone}"><i class="fas fa-mobile-alt"></i> ${ui('cta.call')}</a></div>`; 
  _openModal('ag-modal');
  // init scroll buttons state หลัง render
  setTimeout(() => {
    _agUpdateScrollBtns();
    const sc = document.getElementById('ag-props-scroll');
    if (sc) sc.addEventListener('scroll', _agUpdateScrollBtns, { passive: true });
  }, 80);
}

// Sanitize: strip HTML tags to prevent XSS injection
function sanitize(str) {
  if(!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;')
    .replace(/\//g,'&#x2F;');
}
// Validate Thai phone number format: 0X-XXXX-XXXX or 0XXXXXXXXX
function isValidThaiPhone(phone) {
  const cleaned = phone.replace(/[-\s()]/g,'');
  // รับเบอร์มือถือ (06x/08x/09x, 10 หลัก) และโทรบ้าน/สำนักงาน (02-07, 9-10 หลัก)
  return /^(0[2-57]\d{7,8}|0[689]\d{8})$/.test(cleaned);
}
function isValidName(name) { return name.trim().length >= 2; }
function isValidPrice(price) { return !isNaN(price) && Number(price) > 0; }

// Show/clear field error
function fieldErr(inputId, errId, msg) {
  const inp = $(inputId), err = $(errId)||document.querySelector('[id="'+errId+'"]');
  if(inp) inp.classList.add('invalid');
  if(err){ err.textContent=msg; err.classList.add('show'); }
}
function clearFieldErr(inputId) {
  const inp = $(inputId);
  if(inp){ inp.classList.remove('invalid'); inp.classList.add('valid'); }
}

// ══════════════════════════════════════════════════════════════════
// SPAM PROTECTION SYSTEM — 3-Layer Defense
// Layer 1: Client-side cooldown (4s) with countdown UI
// Layer 2: Cloudflare Turnstile invisible CAPTCHA token
// Layer 3: Server-side rate limit via Supabase RPC / headers
// ══════════════════════════════════════════════════════════════════

// ── Layer 1: Cooldown tracker ─────────────────────────────────────
const COOLDOWN_MS = 4000; // 4 วินาที
const _submitCooldown = {};
const _cooldownTimers = {};

function isOnCooldown(key, ms = COOLDOWN_MS) {
  const last = _submitCooldown[key] || 0;
  if (Date.now() - last < ms) return true;
  _submitCooldown[key] = Date.now();
  return false;
}

// แสดง countdown บนปุ่มระหว่าง cooldown
function startCooldownUI(btnId, ms = COOLDOWN_MS) {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled = true;
  const origHTML = btn.innerHTML;
  let remaining = Math.ceil(ms / 1000);
  btn.innerHTML = `<i class="fas fa-clock btn-icon"></i> รอ ${remaining} วิ...`;
  if (_cooldownTimers[btnId]) clearInterval(_cooldownTimers[btnId]);
  _cooldownTimers[btnId] = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(_cooldownTimers[btnId]);
      btn.disabled = false;
      // อัปเดต label ตามสถานะ login
      updateFormBtns();
    } else {
      btn.innerHTML = `<i class="fas fa-clock btn-icon"></i> รอ ${remaining} วิ...`;
    }
  }, 1000);
}

// ── Layer 2: Cloudflare Turnstile ────────────────────────────────
// ⚠️ แทนค่า TURNSTILE_SITE_KEY ด้วย Site Key จริงจาก Cloudflare Dashboard
// ไปที่: https://dash.cloudflare.com → Turnstile → Add site → Invisible
const TURNSTILE_SITE_KEY = '0x4AAAAAADQ7zD-eh7X1mJjC';

const _turnstileWidgets = {};
const _turnstileTokens = {};

function initTurnstile() {
  if (typeof turnstile === 'undefined' || TURNSTILE_SITE_KEY === '0x4AAAAAADQ7zD-eh7X1mJjC') {
    // ยังไม่ได้ตั้งค่า site key → ข้ามการใช้งาน Turnstile (dev mode)
    console.warn('[Turnstile] Site key not configured — CAPTCHA disabled. Set TURNSTILE_SITE_KEY before going live.');
    return;
  }
  ['dep', 'wish'].forEach(key => {
    const container = $(`turnstile-${key}`);
    if (!container || _turnstileWidgets[key]) return;
    _turnstileWidgets[key] = turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      size: 'invisible',
      callback: token => { _turnstileTokens[key] = token; },
      'error-callback': () => { _turnstileTokens[key] = null; },
      'expired-callback': () => { _turnstileTokens[key] = null; }
    });
  });
}

// เรียก Turnstile token แบบ async (execute → รอ callback)
async function getTurnstileToken(key, timeoutMs = 6000) {
  if (typeof turnstile === 'undefined' || TURNSTILE_SITE_KEY === '0x4AAAAAADQ7zD-eh7X1mJjC') {
    return null; // dev mode: ไม่มี token แต่ไม่ block
  }
  _turnstileTokens[key] = null;
  try {
    if (_turnstileWidgets[key] != null) turnstile.execute(_turnstileWidgets[key]);
  } catch (e) { /* ignore */ }
  // รอ token สูงสุด timeoutMs
  const start = Date.now();
  while (!_turnstileTokens[key] && Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 150));
  }
  const tok = _turnstileTokens[key];
  _turnstileTokens[key] = null; // reset หลังใช้งาน 1 ครั้ง
  return tok || null;
}

// reset Turnstile widget หลังส่งฟอร์มสำเร็จ
function resetTurnstile(key) {
  if (typeof turnstile !== 'undefined' && _turnstileWidgets[key] != null) {
    try { turnstile.reset(_turnstileWidgets[key]); } catch (e) { /* ignore */ }
  }
  _turnstileTokens[key] = null;
}

// ── Layer 3: Server-side rate limit helper ────────────────────────
// Supabase รองรับ rate limit ผ่าน Postgres RPC + Row Level Security
// ฟังก์ชันนี้ตรวจสอบ response error จาก Supabase ว่า hit rate limit หรือไม่
function isRateLimitError(err) {
  if (!err) return false;
  const msg = (err.message || err.code || '').toLowerCase();
  return msg.includes('rate') || msg.includes('too many') ||
         err.code === '429' || err.status === 429 ||
         msg.includes('limit') || msg.includes('throttl');
}

// sbInsert พร้อม honeypot guard + Turnstile + Edge Function routing
//
// 🔧 [BUG-10] การ verify Turnstile จริงๆ ต้องทำที่ server
//   ขั้นตอน: สร้าง Supabase Edge Function "verify-and-insert" แล้วตั้งค่าด้านล่าง
//   เมื่อพร้อม: เปลี่ยน USE_EDGE_FUNCTION → true ในบล็อก CONFIG ด้านบน
//   (หรือเพิ่ม USE_EDGE_FUNCTION: true ใน object C)
const _USE_EDGE_FN = !!(typeof C !== 'undefined' && C.USE_EDGE_FUNCTION);

async function sbInsertRateLimited(table, data, turnstileToken, honeypotValue) {
  if (!sb) throw new Error('Supabase ไม่พร้อมใช้งาน');

  // ── Honeypot check ──────────────────────────────────────────────
  if (honeypotValue && honeypotValue.trim() !== '') {
    console.warn('[Security] Honeypot triggered — submission blocked silently.');
    return null;
  }

  // ── Turnstile client-side guard ─────────────────────────────────
  // block เฉพาะเมื่อ Turnstile configure จริงๆ (ไม่ใช่ placeholder)
  const _turnstileActive = (typeof turnstile !== 'undefined')
    && (typeof TURNSTILE_SITE_KEY !== 'undefined')
    && (TURNSTILE_SITE_KEY !== '0x4AAAAAADQ7zD-eh7X1mJjC');
  if (_turnstileActive && !turnstileToken) {
    console.warn('[Security] No Turnstile token — submission blocked.');
    throw new Error('กรุณายืนยันตัวตนก่อนส่งข้อมูล (CAPTCHA)');
  }

  // ── Route: Edge Function (server verify) หรือ direct insert ────
  if (_USE_EDGE_FN && turnstileToken) {
    // [BUG-10 FIX] ส่งผ่าน Edge Function → verify Turnstile + log IP + insert
    const fnUrl = `${(C.SUPABASE_URL||'').replace(/\/$/,'')}/functions/v1/verify-and-insert`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${C.SUPABASE_KEY}`
      },
      body: JSON.stringify({ table, data, turnstileToken })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Edge Function error ${res.status}`);
    }
    return res.json();
  }

  // ── Fallback: direct insert (ใช้จนกว่าจะ deploy Edge Function) ──
  const { data: result, error } = await sb.from(table).insert([data]);
  if (error) throw error;
  return result;
}

function setupUpload(){ const dz=$('dropzone'), fi=$('d-photo'); if(!dz)return; ['dragenter','dragover','dragleave','drop'].forEach(e=>dz.addEventListener(e,e=>{e.preventDefault();e.stopPropagation();})); dz.addEventListener('dragenter',()=>dz.classList.add('dragover')); dz.addEventListener('dragleave',()=>dz.classList.remove('dragover')); dz.addEventListener('drop',e=>{dz.classList.remove('dragover');handleFiles(e.dataTransfer.files);}); fi.addEventListener('change',e=>handleFiles(e.target.files)); }
function handleFiles(files){ const nf=Array.from(files).filter(f=>f.type.startsWith('image/')); if(uploads.length+nf.length>5){toast('อัปโหลดได้สูงสุด 5 รูป',true);return;} for(const f of nf)if(f.size>5*1024*1024){toast(`รูป ${sanitize(f.name)} ใหญ่เกิน 5MB`,true);return;} uploads.push(...nf); renderPrev(); }
function renderPrev(){ $('prev-grid').innerHTML=uploads.map((f,i)=>`<div class="prev-item"><img src="${URL.createObjectURL(f)}"><div class="prev-rm" onclick="rmPhoto(${i})"><i class="fas fa-times"></i></div></div>`).join(''); }
window.rmPhoto=i=>{uploads.splice(i,1);renderPrev();};

/* ── openDepositModal — เปิด modal ฝากทรัพย์ (เหมือนกับ header dropdown) ── */
function openDepositModal(){
  // close my-account page modal if open (optional: keep it or close)
  const existingMod = document.getElementById('deposit-modal');
  if(existingMod) existingMod.remove();
  const mo = document.createElement('div');
  mo.className='ov'; mo.id='deposit-modal';
  mo.style.cssText='display:flex;z-index:3700';
  mo.innerHTML=`<div class="modal" style="max-width:520px">
    <div class="mhd">
      <h2><i class="fas fa-home" style="color:var(--a)"></i> ฝากทรัพย์กับเรา</h2>
      <span class="mclose" onclick="document.getElementById('deposit-modal').remove()">×</span>
    </div>
    <div class="mbody">
      <p style="font-size:13px;color:var(--tx2);margin-bottom:16px">กรอกข้อมูลเบื้องต้น ทีมงานติดต่อกลับโดยเร็ว</p>
      <div id="dep-modal-form">
        <div class="frow"><div class="fg"><label>ชื่อ-นามสกุล *</label><input id="dm-name" placeholder="ชื่อของคุณ"></div><div class="fg"><label>เบอร์โทร *</label><input type="tel" id="dm-phone" placeholder="08X-XXX-XXXX"></div></div>
        <div class="frow"><div class="fg"><label>Your Line ID</label><input id="dm-line" placeholder="@yourline"></div><div class="fg"><label>Your email</label><input type="email" id="dm-email" placeholder="email@example.com"></div></div>
        <div class="frow"><div class="fg"><label>จังหวัด</label><input id="dm-prov" placeholder="กรุงเทพฯ"></div><div class="fg"><label>ต้องการ</label><select id="dm-tx"><option value="ขาย">ขาย</option><option value="เช่า">ให้เช่า</option></select></div></div>
        <div class="frow full"><div class="fg"><label>รายละเอียด</label><textarea id="dm-detail" rows="2" placeholder="ขนาด ทำเล จำนวนห้อง..." style="resize:none"></textarea></div></div>
        <div class="fg"><label>อัปโหลดรูป (สูงสุด 5 รูป)</label>
          <div class="dropzone" id="dm-dropzone" onclick="document.getElementById('dm-photo').click()">
            <div class="dz-icon"><i class="fas fa-cloud-upload-alt"></i></div>
            <div style="font-size:13px">ลากวาง หรือคลิกเพื่อเลือกรูป</div>
            <div style="font-size:11px;color:var(--gr)">JPG/PNG ขนาดสูงสุด 5MB</div>
          </div>
          <input type="file" id="dm-photo" multiple accept="image/*" style="display:none" onchange="handleDepModalFiles(this.files)">
          <div class="preview-grid" id="dm-prev-grid"></div>
        </div>
        <div class="consent-row">
          <input type="checkbox" id="dm-consent">
          <label for="dm-consent">ฉันยินยอมให้ Matchdoor เก็บและใช้ข้อมูลส่วนบุคคลรวมถึงรูปภาพทรัพย์ เพื่อบริการฝากทรัพย์ ตาม<a href="javascript:void(0)" onclick="openPrivacyModal();event.stopPropagation()">นโยบายความเป็นส่วนตัว</a></label>
        </div>
        <div class="consent-err" id="dm-consent-err" style="display:none">⚠️ กรุณายินยอมก่อนส่งข้อมูล</div>
        <button class="btn-sub" id="dep-modal-btn" onclick="submitDepModal()" style="margin-top:10px"><i class="fas fa-lock btn-icon"></i><span class="btn-spinner"></span> <span id="dep-modal-btn-text">ส่งข้อมูลฝากทรัพย์</span></button>
      </div>
      <div class="form-ok" id="dep-modal-ok" style="display:none"><i class="fas fa-check-circle"></i><div>ส่งข้อมูลสำเร็จ!</div></div>
    </div>
  </div>`;
  mo.onclick = function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
  // setup drag-drop for modal upload
  const dz = document.getElementById('dm-dropzone');
  if(dz){
    ['dragenter','dragover','dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();}));
    dz.addEventListener('dragenter',()=>dz.classList.add('dragover'));
    dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
    dz.addEventListener('drop',e=>{dz.classList.remove('dragover');handleDepModalFiles(e.dataTransfer.files);});
  }
  // pre-fill name/phone from user profile if logged in
  if(typeof user !== 'undefined' && user){
    const nm = document.getElementById('dm-name');
    if(nm && !nm.value && user.user_metadata?.full_name) nm.value = user.user_metadata.full_name;
    const ph = document.getElementById('dm-phone');
    if(ph && !ph.value){
      const _meta = typeof _userMeta !== 'undefined' ? _userMeta : {};
      if(_meta.phone) ph.value = _meta.phone;
    }
  }
}
window._dmUploads = [];
function handleDepModalFiles(files){
  const nf = Array.from(files).filter(f=>f.type.startsWith('image/'));
  if(window._dmUploads.length+nf.length>5){toast('อัปโหลดได้สูงสุด 5 รูป',true);return;}
  for(const f of nf)if(f.size>5*1024*1024){toast(`รูป ${sanitize(f.name)} ใหญ่เกิน 5MB`,true);return;}
  window._dmUploads.push(...nf);
  const grid = document.getElementById('dm-prev-grid');
  if(grid) grid.innerHTML = window._dmUploads.map((f,i)=>`<div class="prev-item"><img src="${URL.createObjectURL(f)}"><div class="prev-rm" onclick="window._dmUploads.splice(${i},1);handleDepModalFiles([])"><i class="fas fa-times"></i></div></div>`).join('');
}
async function submitDepModal(){
  const name = document.getElementById('dm-name')?.value.trim();
  const phone = document.getElementById('dm-phone')?.value.trim();
  const type = document.getElementById('dm-type')?.value;
  const price = document.getElementById('dm-price')?.value;
  const prov = document.getElementById('dm-prov')?.value.trim();
  const tx = document.getElementById('dm-tx')?.value;
  const detail = document.getElementById('dm-detail')?.value.trim();
  const consent = document.getElementById('dm-consent')?.checked;
  const consentErr = document.getElementById('dm-consent-err');
  if(!name||!phone){toast('กรุณากรอกชื่อและเบอร์โทร',true);return;}
  if(!consent){if(consentErr)consentErr.style.display='block';return;}
  if(consentErr)consentErr.style.display='none';
  // reuse existing submitDep logic: pre-fill main form fields then call submitDep
  const _setVal=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  _setVal('d-name',name);_setVal('d-phone',phone);_setVal('d-type',type);
  _setVal('d-price',price);_setVal('d-prov',prov);_setVal('d-tx',tx);_setVal('d-detail',detail);
  const dc=document.getElementById('d-consent');if(dc)dc.checked=true;
  // copy uploads
  if(window._dmUploads.length){uploads=[...window._dmUploads];renderPrev();}
  // close modal and trigger main submit
  document.getElementById('deposit-modal')?.remove();
  window._dmUploads=[];
  await submitDep();
}

// ── Deposit dropdown: photo preview ──
function _depPreviewPhotos(input){
  const grid = document.getElementById('prev-grid');
  if(!grid) return;
  const files = Array.from(input.files).slice(0,10);
  // store for upload
  if(typeof uploads !== 'undefined') uploads = files;
  grid.innerHTML = '';
  files.forEach((f,i) => {
    const url = URL.createObjectURL(f);
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;width:72px;height:56px;border-radius:6px;overflow:hidden;border:1.5px solid var(--bd)';
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">
      ${i===0?'<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:9px;text-align:center;padding:1px">หน้าปก</div>':''}
      <button type="button" onclick="this.parentNode.remove()" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:50%;width:15px;height:15px;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>`;
    grid.appendChild(div);
  });
}

// ── Deposit dropdown: agent toggle ──
function _depToggleAgent(cb){
  const track = document.getElementById('d-agent-track');
  const thumb = document.getElementById('d-agent-thumb');
  const note  = document.getElementById('d-agent-note');
  if(cb && cb.checked){
    if(track) track.style.background='var(--p)';
    if(thumb) thumb.style.transform='translateX(16px)';
    if(note)  note.style.display='block';
  } else {
    if(track) track.style.background='#ccc';
    if(thumb) thumb.style.transform='translateX(0)';
    if(note)  note.style.display='none';
  }
}

async function submitDep(){
  // ── Layer 1: Client-side cooldown ─────────────────────────────
  if(isOnCooldown('dep')) {
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - (_submitCooldown['dep']||0))) / 1000);
    toast(`กรุณารอ ${remaining} วินาทีก่อนส่งอีกครั้ง ⏱️`, true);
    return;
  }
  // Auth check
  if(!user){ toast('กรุณาเข้าสู่ระบบก่อนฝากทรัพย์', true); _openModal('login-modal'); return; }

  // Clear previous errors
  ['d-name','d-phone','d-price'].forEach(id=>{ const el=$(id); if(el){el.classList.remove('invalid','valid');} });

  const nameRaw = $('d-name').value.trim();
  const phoneRaw = $('d-phone').value.trim();
  const priceRaw = $('d-price').value;
  const consent = $('d-consent')?.checked;
  let valid = true;

  if(!isValidName(nameRaw)) {
    toast('กรุณากรอกชื่อ (อย่างน้อย 2 ตัวอักษร)', true);
    $('d-name').classList.add('invalid'); valid=false;
  } else { $('d-name').classList.add('valid'); }

  if(!isValidThaiPhone(phoneRaw)) {
    toast('รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 081-234-5678)', true);
    $('d-phone').classList.add('invalid'); valid=false;
  } else { $('d-phone').classList.add('valid'); }

  const price = parseFloat(priceRaw)||0;
  if(priceRaw && !isValidPrice(price)) {
    toast('ราคาต้องมากกว่า 0', true);
    $('d-price').classList.add('invalid'); valid=false;
  }

  if(!consent) {
    const ce=$('d-consent-err'); if(ce) ce.classList.add('show');
    toast('กรุณายินยอมการเก็บข้อมูลส่วนบุคคลก่อน', true); valid=false;
  } else { const ce=$('d-consent-err'); if(ce) ce.classList.remove('show'); }

  if(!valid) return;

  // Sanitize inputs
  const name = sanitize(nameRaw);
  const phone = sanitize(phoneRaw);
  const prov = sanitize($('d-prov').value.trim());
  const detail = sanitize($('d-detail').value.trim());

  // Disable button, show loading
  const btn=$('dep-btn');
  if(btn){ btn.disabled=true; btn.classList.add('loading'); }

  // ── Layer 2: Turnstile CAPTCHA ────────────────────────────────
  let turnstileToken = null;
  try {
    turnstileToken = await getTurnstileToken('dep');
  } catch(e) { /* non-blocking: ไม่หยุดถ้า Turnstile timeout */ }

  const photoUrls=[];
  if(uploads.length && sb){
    // 🖼️ [IMG-UPLOAD] อัปโหลดรูปภาพการฝากทรัพย์ → Supabase Storage
    // path: listings/{timestamp}_{filename}
    for(const f of uploads){
      try{
        const ext = f.name.split('.').pop().toLowerCase();
        const safeName = `listings/${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;
        const { data: upData, error: upErr } = await sb.storage
          .from(C.STORAGE_BUCKET)
          .upload(safeName, f, { cacheControl:'3600', upsert:false });
        if(upErr){ console.warn('[upload photo]', upErr); }
        else { photoUrls.push(safeName); }
      } catch(ue){ console.warn('[upload photo]', ue); }
    }
  }
  // Fallback: ถ้า storage ไม่พร้อม ให้ encode base64 แทน
  if(!photoUrls.length && uploads.length){
    for(const f of uploads){
      const b=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(f)});
      photoUrls.push(b);
    }
  }
  try{
    // ── Layer 3: ส่งผ่าน sbInsertRateLimited พร้อม token + honeypot ──
    await sbInsertRateLimited('listings', {
      name, phone,
      line_id: sanitize($('d-line')?.value?.trim()||''),
      email: sanitize($('d-email')?.value?.trim()||''),
      listing_title: sanitize($('d-title')?.value?.trim()||''),
      property_type: sanitize($('d-type').value),
      price: price,
      area: parseFloat($('d-area')?.value)||null,
      bedrooms: parseInt($('d-bed')?.value)||null,
      bathrooms: parseInt($('d-bath')?.value)||null,
      floor: parseInt($('d-floor')?.value)||null,
      parking: parseInt($('d-parking')?.value)||null,
      furniture: sanitize($('d-furniture')?.value||''),
      pets_allowed: !!$('d-pets')?.checked,
      province: prov,
      district: sanitize($('d-district')?.value?.trim()||''),
      location: sanitize($('d-location')?.value?.trim()||''),
      bts_mrt: sanitize($('d-bts')?.value?.trim()||''),
      transaction: sanitize($('d-tx').value),
      details: detail,
      want_agent: !!$('d-want-agent')?.checked,
      photos: photoUrls,
      status:'รอตรวจสอบ',
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      ...(typeof user !== 'undefined' && user ? { user_id: user.id } : {})
    }, turnstileToken, $('d-honeypot')?.value);
    resetTurnstile('dep');
    $('dep-form').style.display='none'; $('dep-ok').style.display='block';
    toast('ส่งข้อมูลสำเร็จ ทีมงานจะติดต่อกลับ ✅');
    // GA4: form_submit
    try{ if(typeof trackEvent==='function') trackEvent('form_submit',{form_type:'deposit',province:prov,tx:sanitize($('d-tx').value),prop_type:sanitize($('d-type').value)}); }catch(e){}
    // เริ่ม countdown UI หลังส่งสำเร็จ
    startCooldownUI('dep-btn', COOLDOWN_MS);
    setTimeout(()=>{
      closeAllDD();
      setTimeout(()=>{
        $('dep-form').style.display=''; $('dep-ok').style.display='none';
        ['d-name','d-phone','d-price','d-prov','d-detail','d-line','d-email','d-title','d-area','d-bed','d-bath','d-floor','d-parking','d-district','d-location','d-bts'].forEach(id=>{const el=$(id);if(el){el.value='';el.classList.remove('valid','invalid');}});
        if($('d-pets')) $('d-pets').checked=false;
        if($('d-want-agent')) { $('d-want-agent').checked=false; _depToggleAgent($('d-want-agent')); }
        if($('d-consent')) $('d-consent').checked=false;
        uploads=[]; renderPrev(); $('d-photo').value='';
      },400);
    },3000);
  } catch(e){
    // ── Layer 3: ตรวจจับ rate limit error ────────────────────
    if(isRateLimitError(e)){
      toast('ส่งข้อมูลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่ 🚦', true);
      startCooldownUI('dep-btn', 30000); // ล็อก 30 วิถ้า rate limited
    } else {
      toast('ส่งข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง', true);
      _submitCooldown['dep'] = 0; // reset on error
    }
    resetTurnstile('dep');
  } finally {
    if(btn){ btn.classList.remove('loading'); }
    // btn.disabled จัดการโดย startCooldownUI → updateFormBtns
    if(!_cooldownTimers['dep-btn']) { if(btn) btn.disabled=false; }
  }
}

async function submitWish(){
  // ── Layer 1: Client-side cooldown ─────────────────────────────
  if(isOnCooldown('wish')) {
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - (_submitCooldown['wish']||0))) / 1000);
    toast(`กรุณารอ ${remaining} วินาทีก่อนส่งอีกครั้ง ⏱️`, true);
    return;
  }
  // Auth check
  if(!user){ toast('กรุณาเข้าสู่ระบบก่อน', true); _openModal('login-modal'); return; }

  const nameRaw = $('w-name').value.trim();
  const phoneRaw = $('w-phone').value.trim();
  const consent = $('w-consent')?.checked;
  let valid = true;

  if(!isValidName(nameRaw)) {
    toast('กรุณากรอกชื่อ (อย่างน้อย 2 ตัวอักษร)', true);
    $('w-name').classList.add('invalid'); valid=false;
  } else { $('w-name').classList.add('valid'); }

  if(!isValidThaiPhone(phoneRaw)) {
    toast('รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 081-234-5678)', true);
    $('w-phone').classList.add('invalid'); valid=false;
  } else { $('w-phone').classList.add('valid'); }

  if(!consent) {
    const ce=$('w-consent-err'); if(ce) ce.classList.add('show');
    toast('กรุณายินยอมการเก็บข้อมูลส่วนบุคคลก่อน', true); valid=false;
  } else { const ce=$('w-consent-err'); if(ce) ce.classList.remove('show'); }

  if(!valid) return;

  const name = sanitize(nameRaw);
  const phone = sanitize(phoneRaw);

  const btn=$('wish-btn');
  if(btn){ btn.disabled=true; btn.classList.add('loading'); }

  // ── Layer 2: Turnstile CAPTCHA ────────────────────────────────
  let turnstileToken = null;
  try {
    turnstileToken = await getTurnstileToken('wish');
  } catch(e) { /* non-blocking */ }

  try{
    // ── Layer 3: ส่งผ่าน sbInsertRateLimited พร้อม token + honeypot ──
    await sbInsertRateLimited('buy_requests', {
      name, phone,
      line_id: sanitize($('w-line').value),
      property_type: sanitize($('w-type').value),
      budget: parseFloat($('w-budget').value)||0,
      province: sanitize($('w-prov').value),
      transaction: sanitize($('w-tx').value),
      details: sanitize($('w-detail').value),
      status:'ใหม่',
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      ...(typeof user !== 'undefined' && user ? { user_id: user.id } : {})
    }, turnstileToken, $('w-honeypot')?.value);
    resetTurnstile('wish');
    $('wish-form').style.display='none'; $('wish-ok').style.display='block';
    toast('ส่งความต้องการสำเร็จ ✅');
    // GA4: form_submit
    try{ if(typeof trackEvent==='function') trackEvent('form_submit',{form_type:'wish',province:sanitize($('w-prov').value),tx:sanitize($('w-tx').value),prop_type:sanitize($('w-type').value),budget:parseFloat($('w-budget').value)||0}); }catch(e){}
    // เริ่ม countdown UI หลังส่งสำเร็จ
    startCooldownUI('wish-btn', COOLDOWN_MS);
    setTimeout(()=>{
      closeAllDD();
      setTimeout(()=>{
        $('wish-form').style.display=''; $('wish-ok').style.display='none';
        ['w-name','w-phone','w-line','w-budget','w-prov','w-detail'].forEach(id=>{const el=$(id);if(el){el.value='';el.classList.remove('valid','invalid');}});
        if($('w-consent')) $('w-consent').checked=false;
      },400);
    },3000);
  } catch(e){
    // ── Layer 3: ตรวจจับ rate limit error ────────────────────
    if(isRateLimitError(e)){
      toast('ส่งข้อมูลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่ 🚦', true);
      startCooldownUI('wish-btn', 30000); // ล็อก 30 วิถ้า rate limited
    } else {
      toast('ส่งข้อมูลล้มเหลว: '+sanitize(e.message), true);
      _submitCooldown['wish'] = 0;
    }
    resetTurnstile('wish');
  } finally {
    if(btn){ btn.classList.remove('loading'); }
    if(!_cooldownTimers['wish-btn']) { if(btn) btn.disabled=false; }
  }
}

// ── init Turnstile เมื่อ script โหลดเสร็จ ─────────────────────────
(function waitTurnstile(attempts){
  if(typeof turnstile !== 'undefined'){ initTurnstile(); return; }
  if(attempts > 0) setTimeout(()=>waitTurnstile(attempts-1), 800);
})(15);

function toggleDD(id){ const el=$(id); if(!el)return; const o=el.classList.contains('open'); closeAllDD(); if(!o){ el.classList.add('open'); if(id==='dd-fav')renderFavDropdown(); if(window.innerWidth<=950) _showDDOverlay(); } }
function closeAllDD(){ $$('.dd-panel').forEach(p=>p.classList.remove('open')); _hideDDOverlay(); }
function _showDDOverlay(){
  // ไม่ใช้ overlay dim — ปิดผ่าน document click แทน
  const fw=document.querySelector('.float-wrap');
  if(fw) fw.classList.add('dd-open');
}
function _hideDDOverlay(){
  const fw=document.querySelector('.float-wrap');
  if(fw) fw.classList.remove('dd-open');
}
document.addEventListener('click',e=>{
  // กดนอก nav-dd, nav-right, lang-dd และ dd-panel → ปิด panel
  if(!e.target.closest('.nav-dd')&&!e.target.closest('.nav-right')&&!e.target.closest('#lang-dd')&&!e.target.closest('.dd-panel')) closeAllDD();
});
function toggleFloat(){ const i=$('float-items'); i.classList.toggle('hide'); $('float-main').innerHTML=i.classList.contains('hide')?'<i class="fas fa-comment-dots"></i>':'<i class="fas fa-times"></i>'; }
window.addEventListener('scroll',()=>$('scroll-top').classList.toggle('show',scrollY>400),{passive:true});
window.addEventListener('resize', () => {
  // Re-apply carousel translate on resize
  if(typeof recCarouselIdx !== 'undefined') _applyRecTranslate(false);
});

function applyConfig(){ $('hero-sub').textContent=C.HERO_SUB; $('srv-title').textContent=C.SRV_TITLE; $('srv-sub').textContent=C.SRV_SUB; $('footer-addr').textContent=C.ADDR; $('footer-phone').textContent=C.PHONE; $('footer-copy').textContent=C.COPYRIGHT; if($('footer-copy-bottom')) $('footer-copy-bottom').textContent=C.COPYRIGHT; if($('footer-copy-inline')) $('footer-copy-inline').textContent=C.COPYRIGHT; [['fb-link',C.FB],['ftr-fb',C.FB]].forEach(([id,href])=>{$(id)&&($(id).href=href)}); const lnUrl=lineUrl(C.LINE); [['ln-link',lnUrl],['ftr-ln',lnUrl],['f-ln',lnUrl]].forEach(([id,href])=>{$(id)&&($(id).href=href)}); const telHref='tel:'+C.PHONE; [['tel-link',telHref],['ftr-tel',telHref],['f-tel',telHref]].forEach(([id,href])=>{$(id)&&($(id).href=href)});  // YouTube embed — lazy load เมื่อ scroll เข้า viewport
  const ytWrap = $('yt-embed');
  if(ytWrap) {
    ytWrap.setAttribute('data-yt-src', C.YT);
    if('IntersectionObserver' in window) {
      const ytObs = new IntersectionObserver((entries) => {
        if(entries[0].isIntersecting) {
          ytObs.disconnect();
          ytWrap.innerHTML = `<iframe src="${C.YT}" allowfullscreen loading="lazy" title="Matchdoor YouTube"></iframe>`;
        }
      }, { rootMargin: '200px' });
      ytObs.observe(ytWrap);
    } else {
      ytWrap.innerHTML = `<iframe src="${C.YT}" allowfullscreen loading="lazy" title="Matchdoor YouTube"></iframe>`;
    }
  }
}

const LOC_CATS = [
  { key:'popular', label:'🔥 ยอดนิยม', opts:['สุขุมวิท','สีลม','ลาดพร้าว','รัชดา','อโศก','พระราม 9','จตุจักร','ปิ่นเกล้า','บางนา','มีนบุรี'] },
  { key:'province', label:'🗺️ จังหวัด', opts:['กรุงเทพฯ','นนทบุรี','สมุทรปราการ','ปทุมธานี','ชลบุรี','เชียงใหม่','ภูเก็ต','ขอนแก่น','ฉะเชิงเทรา','ระยอง','นครราชสีมา'] },
  { key:'bts', label:'🚈 BTS', opts:['อโศก','สยาม','ชิดลม','พร้อมพงษ์','อ่อนนุช','บางจาก','บางนา','สะพานควาย','อารีย์','หมอชิต','วงเวียนใหญ่','กรุงธนบุรี','สนามกีฬา','ราชเทวี'] },
  { key:'mrt', label:'🚇 MRT', opts:['สีลม','ลุมพินี','สุทธิสาร','รัชดา','ลาดพร้าว','จตุจักร','พระราม 9','เพชรบุรี','สุขุมวิท','หัวหมาก','บางซื่อ','ท่าพระ'] },
  { key:'uni', label:'🎓 มหาวิทยาลัย', opts:['ใกล้ ม.เกษตรศาสตร์','ใกล้ ม.รังสิต','ใกล้ ม.ธรรมศาสตร์','ใกล้ จุฬาฯ','ใกล้ ม.กรุงเทพ','ใกล้ ม.ศิลปากร','ใกล้ ม.นเรศวร','ใกล้ ม.เชียงใหม่'] }
];

function initLocSearch() { /* disabled — ใช้ native select ปกติ */ }
function showLocLayer() { /* disabled */ }
function selectLocCat(key) { /* disabled */ }
function applyLocOpt(val) { /* disabled */ }

// ── ข้อมูลอำเภอครบ 77 จังหวัด ─────────────────────────────────────
const PROVINCE_DISTRICTS = {
  'กรุงเทพฯ':['พระนคร','ดุสิต','หนองจอก','บางรัก','บางเขน','บางกะปิ','ปทุมวัน','ป้อมปราบศัตรูพ่าย','พระโขนง','มีนบุรี','ลาดกระบัง','ยานนาวา','สัมพันธวงศ์','พญาไท','ธนบุรี','บางกอกใหญ่','ห้วยขวาง','คลองสาน','ตลิ่งชัน','บางกอกน้อย','บางขุนเทียน','ภาษีเจริญ','หนองแขม','ราษฎร์บูรณะ','บางพลัด','ดินแดง','บึงกุ่ม','สาทร','บางซื่อ','จตุจักร','บางคอแหลม','ประเวศ','คลองเตย','สวนหลวง','จอมทอง','ดอนเมือง','ราชเทวี','ลาดพร้าว','วัฒนา','บางแค','หลักสี่','สายไหม','คันนายาว','สะพานสูง','วังทองหลาง','คลองสามวา','บางนา','ทวีวัฒนา','ทุ่งครุ','บางบอน'],
  'กระบี่':['เมืองกระบี่','เขาพนม','เกาะลันตา','คลองท่อม','อ่าวลึก','ปลายพระยา','ลำทับ','เหนือคลอง'],
  'กาญจนบุรี':['เมืองกาญจนบุรี','ไทรโยค','บ่อพลอย','ศรีสวัสดิ์','ท่ามะกา','ท่าม่วง','ทองผาภูมิ','สังขละบุรี','พนมทวน','เลาขวัญ','ด่านมะขามเตี้ย','หนองปรือ','ห้วยกระเจา'],
  'กาฬสินธุ์':['เมืองกาฬสินธุ์','นามน','กมลาไสย','ร่องคำ','กุฉินารายณ์','เขาวง','ยางตลาด','ห้วยเม็ก','สหัสขันธ์','คำม่วง','ท่าคันโท','หนองกุงศรี','สมเด็จ','ห้วยผึ้ง','สามชัย','นาคู','ดอนจาน','ฆ้องชัย'],
  'กำแพงเพชร':['เมืองกำแพงเพชร','ไทรงาม','คลองลาน','ขาณุวรลักษบุรี','คลองขลุง','พรานกระต่าย','ลานกระบือ','ทรายทองวัฒนา','ปางศิลาทอง','บึงสามัคคี','โกสัมพีนคร'],
  'ขอนแก่น':['เมืองขอนแก่น','บ้านฝาง','พระยืน','หนองเรือ','ชุมแพ','สีชมพู','น้ำพอง','อุบลรัตน์','กระนวน','บ้านไผ่','เปือยน้อย','พล','แวงใหญ่','แวงน้อย','หนองสองห้อง','ภูเวียง','มัญจาคีรี','ชนบท','เขาสวนกวาง','ภูผาม่าน','ซำสูง','โคกโพธิ์ไชย','หนองนาคำ','บ้านแฮด','โนนศิลา','เวียงเก่า'],
  'จันทบุรี':['เมืองจันทบุรี','ขลุง','ท่าใหม่','โป่งน้ำร้อน','มะขาม','แหลมสิงห์','สอยดาว','แก่งหางแมว','นายายอาม','เขาคิชฌกูฏ'],
  'ฉะเชิงเทรา':['เมืองฉะเชิงเทรา','บางคล้า','บางน้ำเปรี้ยว','บางปะกง','บ้านโพธิ์','พนมสารคาม','ราชสาส์น','สนามชัยเขต','แปลงยาว','ท่าตะเกียบ','คลองเขื่อน'],
  'ชลบุรี':['เมืองชลบุรี','บ้านบึง','หนองใหญ่','บางละมุง','พานทอง','พนัสนิคม','ศรีราชา','เกาะสีชัง','สัตหีบ','บ่อทอง','เกาะจันทร์'],
  'ชัยนาท':['เมืองชัยนาท','มโนรมย์','วัดสิงห์','สรรพยา','สรรคบุรี','หันคา','หนองมะโมง','เนินขาม'],
  'ชัยภูมิ':['เมืองชัยภูมิ','บ้านเขว้า','คอนสวรรค์','เกษตรสมบูรณ์','หนองบัวแดง','จัตุรัส','บำเหน็จณรงค์','หนองบัวระเหว','เทพสถิต','ภูเขียว','บ้านแท่น','แก้งคร้อ','คอนสาร','ภักดีชุมพล','เนินสง่า','ซับใหญ่'],
  'ชุมพร':['เมืองชุมพร','ท่าแซะ','ปะทิว','หลังสวน','ละแม','พะโต๊ะ','สวี','ทุ่งตะโก'],
  'เชียงราย':['เมืองเชียงราย','เวียงชัย','เชียงของ','เทิง','พาน','ป่าแดด','แม่จัน','เชียงแสน','แม่สาย','แม่สรวย','เวียงป่าเป้า','พญาเม็งราย','เวียงแก่น','ขุนตาล','แม่ฟ้าหลวง','แม่ลาว','เวียงเชียงรุ้ง','ดอยหลวง'],
  'เชียงใหม่':['เมืองเชียงใหม่','จอมทอง','แม่แจ่ม','เชียงดาว','ดอยสะเก็ด','แม่แตง','แม่ริม','สะเมิง','ฝาง','แม่อาย','พร้าว','สันป่าตอง','สันกำแพง','สันทราย','หางดง','ฮอด','ดอยเต่า','อมก๋อย','สารภี','เวียงแหง','ไชยปราการ','แม่วาง','แม่ออน','ดอยหล่อ'],
  'ตรัง':['เมืองตรัง','กันตัง','ย่านตาขาว','ปะเหลียน','สิเกา','ห้วยยอด','วังวิเศษ','นาโยง','รัษฎา','หาดสำราญ'],
  'ตราด':['เมืองตราด','คลองใหญ่','เขาสมิง','บ่อไร่','แหลมงอบ','เกาะกูด','เกาะช้าง'],
  'ตาก':['เมืองตาก','บ้านตาก','สามเงา','แม่ระมาด','ท่าสองยาง','แม่สอด','พบพระ','อุ้มผาง','วังเจ้า'],
  'นครนายก':['เมืองนครนายก','ปากพลี','บ้านนา','องครักษ์'],
  'นครปฐม':['เมืองนครปฐม','กำแพงแสน','นครชัยศรี','ดอนตูม','บางเลน','สามพราน','พุทธมณฑล'],
  'นครพนม':['เมืองนครพนม','ปลาปาก','ท่าอุเทน','บ้านแพง','ธาตุพนม','เรณูนคร','นาแก','ศรีสงคราม','นาหว้า','โพนสวรรค์','นาทม','วังยาง'],
  'นครราชสีมา':['เมืองนครราชสีมา','ครบุรี','เสิงสาง','คง','บ้านเหลื่อม','จักราช','โชคชัย','ด่านขุนทด','โนนไทย','โนนสูง','ขามสะแกแสง','บัวใหญ่','ประทาย','ปักธงชัย','พิมาย','ห้วยแถลง','ชุมพวง','สูงเนิน','ขามทะเลสอ','สีคิ้ว','ปากช่อง','หนองบุนนาก','แก้งสนามนาง','โนนแดง','วังน้ำเขียว','เทพารักษ์','เมืองยาง','พระทองคำ','ลำทะเมนชัย','บัวลาย','สีดา','เฉลิมพระเกียรติ'],
  'นครศรีธรรมราช':['เมืองนครศรีธรรมราช','พรหมคีรี','ลานสกา','ฉวาง','พิปูน','เชียรใหญ่','ชะอวด','ท่าศาลา','ทุ่งสง','นาบอน','ทุ่งใหญ่','ปากพนัง','ร่อนพิบูลย์','สิชล','ขนอม','หัวไทร','บางขัน','ถ้ำพรรณรา','ฉวาง','จุฬาภรณ์','พระพรหม','นบพิตำ','ช้างกลาง','เฉลิมพระเกียรติ'],
  'นครสวรรค์':['เมืองนครสวรรค์','โกรกพระ','ชุมแสง','หนองบัว','บึงเสนาท','บรรพตพิสัย','เก้าเลี้ยว','ตาคลี','ท่าตะโก','ไพศาลี','พยุหะคีรี','ลาดยาว','ตากฟ้า','แม่วงก์','แม่เปิน','ชุมตาบง'],
  'นนทบุรี':['เมืองนนทบุรี','บางกรวย','บางใหญ่','บางบัวทอง','ไทรน้อย','ปากเกร็ด'],
  'นราธิวาส':['เมืองนราธิวาส','ตากใบ','บาเจาะ','ยี่งอ','ระแงะ','รือเสาะ','ศรีสาคร','แว้ง','สุคิริน','สุไหงโก-ลก','สุไหงปาดี','จะแนะ','เจาะไอร้อง'],
  'น่าน':['เมืองน่าน','แม่จริม','บ้านหลวง','นาน้อย','ปัว','ท่าวังผา','เวียงสา','ทุ่งช้าง','เชียงกลาง','นาหมื่น','สันติสุข','บ่อเกลือ','สองแคว','ภูเพียง','เฉลิมพระเกียรติ'],
  'บึงกาฬ':['เมืองบึงกาฬ','พรเจริญ','โซ่พิสัย','เซกา','ปากคาด','บึงโขงหลง','ศรีวิไล','บุ่งคล้า'],
  'บุรีรัมย์':['เมืองบุรีรัมย์','คูเมือง','กระสัง','นางรอง','หนองกี่','ละหานทราย','ประโคนชัย','บ้านกรวด','พุทไธสง','ลำปลายมาศ','สตึก','ปะคำ','นาโพธิ์','หนองหงส์','พลับพลาชัย','ห้วยราช','โนนสุวรรณ','ชำนิ','บ้านใหม่ไชยพจน์','โนนดินแดง','บ้านด่าน','แคนดง','เฉลิมพระเกียรติ'],
  'ปทุมธานี':['เมืองปทุมธานี','คลองหลวง','ธัญบุรี','หนองเสือ','ลาดหลุมแก้ว','ลำลูกกา','สามโคก'],
  'ประจวบคีรีขันธ์':['เมืองประจวบคีรีขันธ์','กุยบุรี','ทับสะแก','บางสะพาน','บางสะพานน้อย','ปราณบุรี','หัวหิน','สามร้อยยอด'],
  'ปราจีนบุรี':['เมืองปราจีนบุรี','กบินทร์บุรี','นาดี','บ้านสร้าง','ประจันตคาม','ศรีมหาโพธิ','ศรีมโหสถ'],
  'ปัตตานี':['เมืองปัตตานี','โคกโพธิ์','หนองจิก','ปะนาเระ','มายอ','ทุ่งยางแดง','สายบุรี','ไม้แก่น','ยะรัง','ยะหริ่ง','จะนะ','บาเจาะ','กะพ้อ','แม่ลาน'],
  'พระนครศรีอยุธยา':['พระนครศรีอยุธยา','ท่าเรือ','นครหลวง','บางไทร','บางบาล','บางปะอิน','บางปะหัน','ผักไห่','ภาชี','ลาดบัวหลวง','วังน้อย','เสนา','บางซ้าย','อุทัย','มหาราช','บ้านแพรก'],
  'พะเยา':['เมืองพะเยา','จุน','เชียงคำ','เชียงม่วน','ดอกคำใต้','ปง','แม่ใจ','ภูซาง','ภูกามยาว'],
  'พังงา':['เมืองพังงา','เกาะยาว','กะปง','ตะกั่วทุ่ง','ตะกั่วป่า','คุระบุรี','ทับปุด','ท้ายเหมือง'],
  'พัทลุง':['เมืองพัทลุง','กงหรา','เขาชัยสน','ตะโหมด','ควนขนุน','ปากพะยูน','ศรีบรรพต','ป่าพะยอม','บางแก้ว','ป่าบอน','ควนโดน'],
  'พิจิตร':['เมืองพิจิตร','วังทรายพูน','โพธิ์ประทับช้าง','ตะพานหิน','บางมูลนาก','โพทะเล','สามง่าม','ทับคล้อ','สากเหล็ก','บึงนาราง','ดงเจริญ','วชิรบารมี'],
  'พิษณุโลก':['เมืองพิษณุโลก','นครไทย','ชาติตระการ','บางระกำ','บางกระทุ่ม','พรหมพิราม','วัดโบสถ์','วังทอง','เนินมะปราง'],
  'เพชรบุรี':['เมืองเพชรบุรี','เขาย้อย','หนองหญ้าปล้อง','ชะอำ','ท่ายาง','บ้านลาด','บ้านแหลม','แก่งกระจาน'],
  'เพชรบูรณ์':['เมืองเพชรบูรณ์','ชนแดน','หล่มสัก','หล่มเก่า','วิเชียรบุรี','ศรีเทพ','หนองไผ่','บึงสามพัน','น้ำหนาว','วังโป่ง','เขาค้อ'],
  'แพร่':['เมืองแพร่','ร้องกวาง','ลอง','สูงเม่น','เด่นชัย','สอง','วังชิ้น','หนองม่วงไข่'],
  'ภูเก็ต':['เมืองภูเก็ต','กะทู้','ถลาง'],
  'มหาสารคาม':['เมืองมหาสารคาม','แกดำ','โกสุมพิสัย','กันทรวิชัย','เชียงยืน','บรบือ','นาเชือก','พยัคฆภูมิพิสัย','วาปีปทุม','นาดูน','ยางสีสุราช','กุดรัง','ชื่นชม'],
  'มุกดาหาร':['เมืองมุกดาหาร','นิคมคำสร้อย','ดอนตาล','ดงหลวง','คำชะอี','หว้านใหญ่','หนองสูง'],
  'แม่ฮ่องสอน':['เมืองแม่ฮ่องสอน','ขุนยวม','ปาย','แม่สะเรียง','แม่ลาน้อย','สบเมย','ปางมะผ้า'],
  'ยโสธร':['เมืองยโสธร','ทรายมูล','กุดชุม','คำเขื่อนแก้ว','ป่าติ้ว','มหาชนะชัย','ค้อวัง','เลิงนกทา','ไทยเจริญ'],
  'ยะลา':['เมืองยะลา','เบตง','บันนังสตา','ธารโต','ยะหา','รามัน','กาบัง','กรงปินัง'],
  'ร้อยเอ็ด':['เมืองร้อยเอ็ด','เกษตรวิสัย','ปทุมรัตต์','จตุรพักตรพิมาน','ธวัชบุรี','พนมไพร','โพนทอง','โพธิ์ชัย','หนองพอก','เสลภูมิ','สุวรรณภูมิ','เมืองสรวง','โพนทราย','อาจสามารถ','เมยวดี','ศรีสมเด็จ','จังหาร','เชียงขวัญ','หนองฮี','ทุ่งเขาหลวง'],
  'ระนอง':['เมืองระนอง','ละอุ่น','กะเปอร์','กระบุรี','สุขสำราญ'],
  'ระยอง':['เมืองระยอง','บ้านฉาง','แกลง','วังจันทร์','บ้านค่าย','ปลวกแดง','เขาชะเมา','นิคมพัฒนา'],
  'ราชบุรี':['เมืองราชบุรี','จอมบึง','สวนผึ้ง','ดำเนินสะดวก','บ้านโป่ง','บางแพ','โพธาราม','ปากท่อ','วัดเพลง','บ้านคา'],
  'ลพบุรี':['เมืองลพบุรี','พัฒนานิคม','โคกสำโรง','ชัยบาดาล','ท่าวุ้ง','บ้านหมี่','ท่าหลวง','สระโบสถ์','โคกเจริญ','ลำสนธิ','หนองม้า'],
  'ลำปาง':['เมืองลำปาง','แม่เมาะ','เกาะคา','เสริมงาม','งาว','แจ้ห่ม','วังเหนือ','เถิน','แม่พริก','แม่ทะ','สบปราบ','ห้างฉัตร','เมืองปาน'],
  'ลำพูน':['เมืองลำพูน','แม่ทา','บ้านโฮ่ง','ลี้','ทุ่งหัวช้าง','ป่าซาง','บ้านธิ','เวียงหนองล่อง'],
  'เลย':['เมืองเลย','นาด้วง','เชียงคาน','ปากชม','ด่านซ้าย','นาแห้ว','ภูเรือ','ท่าลี่','วังสะพุง','ภูกระดึง','ภูหลวง','ผาขาว','เอราวัณ','หนองหิน'],
  'ศรีสะเกษ':['เมืองศรีสะเกษ','ยางชุมน้อย','กันทรารมย์','กันทรลักษ์','ขุขันธ์','ไพรบึง','ปรางค์กู่','ขุนหาญ','ราษีไศล','อุทุมพรพิสัย','บึงบูรพ์','ห้วยทับทัน','โนนคูณ','ศรีรัตนะ','น้ำเกลี้ยง','วังหิน','ภูสิงห์','เมืองจันทร์','เบญจลักษ์','พยุห์','โพธิ์ศรีสุวรรณ','ศิลาลาด'],
  'สกลนคร':['เมืองสกลนคร','กุสุมาลย์','กุดบาก','พรรณานิคม','พังโคน','วาริชภูมิ','นิคมน้ำอูน','เต่างอย','โคกศรีสุพรรณ','เจิรญศิลป์','โพนนาแก้ว','ภูพาน','โนนนาคำ','บ้านม่วง','อากาศอำนวย','สว่างแดนดิน','ส่องดาว','คำตากล้า','บึงโขงหลง','วานรนิวาส','คูเมือง'],
  'สงขลา':['เมืองสงขลา','สทิงพระ','จะนะ','นาทวี','เทพา','สะบ้าย้อย','ระโนด','กระแสสินธุ์','รัตภูมิ','สะเดา','หาดใหญ่','นาหม่อม','ควนเนียง','บางกล่ำ','สิงหนคร','คลองหอยโข่ง'],
  'สตูล':['เมืองสตูล','ควนโดน','ควนกาหลง','ท่าแพ','กระแสสินธุ์','ละงู','ทุ่งหว้า','มะนัง'],
  'สมุทรปราการ':['เมืองสมุทรปราการ','บางบ่อ','บางพลี','พระประแดง','พระสมุทรเจดีย์','บางเสาธง'],
  'สมุทรสงคราม':['เมืองสมุทรสงคราม','บางคนที','อัมพวา'],
  'สมุทรสาคร':['เมืองสมุทรสาคร','กระทุ่มแบน','บ้านแพ้ว'],
  'สระแก้ว':['เมืองสระแก้ว','คลองหาด','ตาพระยา','วังน้ำเย็น','วังสมบูรณ์','วัฒนานคร','อรัญประเทศ','เขาฉกรรจ์','โคกสูง','บ้านใหม่ไทยเจริญ'],
  'สระบุรี':['เมืองสระบุรี','แก่งคอย','หนองแค','วิหารแดง','หนองแซง','บ้านหมอ','ดอนพุด','หนองโดน','พระพุทธบาท','เสาไห้','มวกเหล็ก','วังม่วง','เฉลิมพระเกียรติ'],
  'สิงห์บุรี':['เมืองสิงห์บุรี','บางระจัน','ค่ายบางระจัน','พรหมบุรี','ท่าช้าง','อินทร์บุรี'],
  'สุโขทัย':['เมืองสุโขทัย','บ้านด้าน','คีรีมาศ','กงไกรลาศ','ศรีสัชนาลัย','ศรีสำโรง','สวรรคโลก','ศรีนคร','ทุ่งเสลี่ยม'],
  'สุพรรณบุรี':['เมืองสุพรรณบุรี','เดิมบางนางบวช','ด่านช้าง','บางปลาม้า','ศรีประจันต์','ดอนเจดีย์','สองพี่น้อง','สามชุก','อู่ทอง','หนองหญ้าไซ'],
  'สุราษฎร์ธานี':['เมืองสุราษฎร์ธานี','กาญจนดิษฐ์','ดอนสัก','เกาะสมุย','เกาะพะงัน','ไชยา','ท่าชนะ','คีรีรัฐนิคม','บ้านตาขุน','พนม','ท่าฉาง','บ้านนาสาร','บ้านนาเดิม','เคียนซา','เวียงสระ','พระแสง','พุนพิน','ชัยบุรี','วิภาวดี'],
  'สุรินทร์':['เมืองสุรินทร์','ชุมพลบุรี','ท่าตูม','จอมพระ','ปราสาท','กาบเชิง','รัตนบุรี','สนม','ศีขรภูมิ','สังขะ','ลำดวน','สำโรงทาบ','บัวเชด','พนมดงรัก','ศรีณรงค์','เขวาสินรินทร์','โนนนารายณ์'],
  'หนองคาย':['เมืองหนองคาย','ท่าบ่อ','โพนพิสัย','ศรีเชียงใหม่','สังคม','สระใคร','เฝ้าไร่','รัตนวาปี','โพธิ์ตาก'],
  'หนองบัวลำภู':['เมืองหนองบัวลำภู','นากลาง','โนนสัง','ศรีบุญเรือง','สุวรรณคูหา','นาวัง'],
  'อ่างทอง':['เมืองอ่างทอง','ไชโย','ป่าโมก','โพธิ์ทอง','แสวงหา','วิเศษชัยชาญ','สามโก้'],
  'อำนาจเจริญ':['เมืองอำนาจเจริญ','ชานุมาน','ปทุมราชวงศา','พนา','เสนางคนิคม','หัวตะพาน','ลืออำนาจ'],
  'อุดรธานี':['เมืองอุดรธานี','กุดจับ','หนองวัวซอ','กุมภวาปี','โนนสะอาด','หนองหาน','ทุ่งฝน','ไชยวาน','ศรีธาตุ','วังสามหมอ','บ้านดุง','บ้านผือ','น้ำโสม','เพ็ญ','สร้างคอม','หนองแสง','นายูง','พิบูลย์รักษ์','กู่แก้ว','ประจักษ์ศิลปาคม'],
  'อุตรดิตถ์':['เมืองอุตรดิตถ์','ตรอน','ท่าปลา','น้ำปาด','ฟากท่า','บ้านโคก','พิชัย','ลับแล','ทองแสนขัน'],
  'อุทัยธานี':['เมืองอุทัยธานี','ทัพทัน','สว่างอารมณ์','หนองฉาง','หนองขาหย่าง','บ้านไร่','ลานสัก','ห้วยคต'],
  'อุบลราชธานี':['เมืองอุบลราชธานี','ศรีเมืองใหม่','โขงเจียม','เขื่องใน','เขมราฐ','เดชอุดม','นาจะหลวย','น้ำยืน','บุณฑริก','ตระการพืชผล','กุดข้าวปุ้น','ม่วงสามสิบ','วารินชำราบ','พิบูลมังสาหาร','ตาลสุม','โพธิ์ไทร','สำโรง','ดอนมดแดง','สิรินธร','ทุ่งศรีอุดม','นาเยีย','นาตาล','เหล่าเสือโก้ก','สว่างวีระวงศ์','น้ำขุ่น'],
};

// ── Drill-down location picker state ─────────────────────────────
let _locLevel = 'province'; // 'province' | 'district'
let _locProv  = '';         // selected province
let _locDist  = '';         // selected district

// ── Cache for province list HTML (built once, reused) ────────────
let _cachedAllProvs = null;   // sorted array of province names
let _cachedProvListHTML = ''; // base HTML string without active class

function _buildProvListCache() {
  const allProvinces77 = Object.keys(PROVINCE_DISTRICTS);
  const dbProvs = [...new Set(props.map(p=>p.province).filter(Boolean))];
  const bkkVariants = ['กรุงเทพฯ','กรุงเทพ','Bangkok','bangkok','BKK'];
  const normalizeProvince = (pv) => bkkVariants.includes(pv) ? 'กรุงเทพฯ' : pv;
  const normalizedDb = dbProvs.map(normalizeProvince);
  _cachedAllProvs = [...new Set([...allProvinces77, ...normalizedDb])]
    .filter(Boolean).sort((a,b)=>a.localeCompare(b,'th'));
  // Build static HTML once (active class added dynamically in render)
  _cachedProvListHTML = _cachedAllProvs.map(p => {
    const hasDistricts = (PROVINCE_DISTRICTS[p]||[]).length > 0;
    const esc = p.replace(/'/g,"\\'");
    return `<div class="loc-item" data-prov="${p}" onclick="locDrillSelectProv('${esc}')">` +
      `<span style="flex:1">${p}</span>` +
      (hasDistricts ? '<i class="fas fa-chevron-right" style="font-size:10px;color:#bbb"></i>' : '') +
      `</div>`;
  }).join('');
}

function populateProvinceSelect() {
  // seed hidden select with all 77 provinces (for compatibility)
  const sp = $('s-prov');
  if(!sp) return;
  if(!_cachedAllProvs) _buildProvListCache();
  sp.innerHTML = '<option value=""></option>' + _cachedAllProvs.map(p=>`<option value="${p}"></option>`).join('');
  locDrillRender();
}

function locDrillToggle() {
  const panel = $('loc-drill-panel');
  const btn   = $('loc-drill-btn');
  if(!panel) return;
  const isOpen = panel.style.display !== 'none';
  if(isOpen){ locDrillClose(); }
  else {
    panel.style.display='block';
    // render ใหม่เฉพาะเมื่อจำเป็น: ถ้าอยู่ระดับ district หรือ list ว่างเปล่า
    const list = $('loc-drill-list');
    const needsRender = _locLevel === 'district' || !list || !list.children.length;
    if(needsRender) locDrillRender();
    else {
      // อยู่ระดับ province — แค่ patch active class โดยไม่ rebuild innerHTML
      if(list) {
        list.querySelectorAll('.loc-item.active').forEach(el => el.classList.remove('active'));
        if(_locProv) {
          const activeEl = list.querySelector(`[data-prov="${_locProv}"]`);
          if(activeEl) activeEl.classList.add('active');
        }
      }
    }
    // ตรวจสอบว่าพื้นที่ด้านล่างพอหรือไม่
    const btnRect = btn.getBoundingClientRect();
    const panelH  = panel.offsetHeight || 260;
    const spaceBelow = window.innerHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;
    const shouldDropUp = spaceBelow < panelH && spaceAbove > spaceBelow;
    if(shouldDropUp) {
      panel.classList.add('drop-up');
      btn.classList.add('open','drop-up');
    } else {
      panel.classList.remove('drop-up');
      btn.classList.add('open');
      btn.classList.remove('drop-up');
    }
  }
}

function locDrillClose() {
  const panel = $('loc-drill-panel');
  const btn   = $('loc-drill-btn');
  if(panel) { panel.style.display='none'; panel.classList.remove('drop-up'); }
  if(btn)   { btn.classList.remove('open','drop-up'); }
}

function locDrillRender() {
  const list = $('loc-drill-list');
  if(!list) return;
  let html = '';

  if(_locLevel === 'province') {
    // Level 1: จังหวัด — ใช้ cached HTML แทนการสร้างใหม่ทุกครั้ง
    html += `<div class="loc-drill-section-head">🗺️ ${(typeof ui==='function')?ui('sf.prov.head'):'จังหวัด'}</div>`;
    if(_locProv) {
      html += `<div class="loc-item loc-clear" onclick="locDrillClear()"><i class="fas fa-times-circle"></i> ${(typeof ui==='function')?ui('sf.prov.clear'):'ล้างการเลือกทั้งหมด'}</div>`;
    }
    // Build cache if needed
    if(!_cachedAllProvs) _buildProvListCache();
    // Inject cached HTML then patch active class via DOM (no full rebuild)
    list.innerHTML = html + _cachedProvListHTML;
    // Patch active item efficiently — no need to re-render entire list
    if(_locProv) {
      const activeEl = list.querySelector(`[data-prov="${_locProv}"]`);
      if(activeEl) activeEl.classList.add('active');
    }
    return; // early return — innerHTML already set above
  } else {
    // Level 2: อำเภอ
    const backLabel = (typeof ui==='function')?ui('sf.dist.back'):'กลับ';
    html += `<div class="loc-item loc-back" onclick="locDrillGoBack()">
      <i class="fas fa-chevron-left"></i> ${backLabel} &nbsp;·&nbsp; <span style="color:#555">${_locProv}</span>
    </div>`;
    const distHead = (typeof ui==='function')?ui('sf.dist.head'):'อำเภอ / เขต';
    html += `<div class="loc-drill-section-head">📍 ${distHead}</div>`;
    // "ทุกอำเภอ" option
    const allActive = !_locDist ? ' active' : '';
    const allDistLabel = (typeof ui==='function')?ui('sf.dist.all'):'ทุกอำเภอใน';
    html += `<div class="loc-item${allActive}" onclick="locDrillSelectDist('')">
      <span>${allDistLabel} ${_locProv}</span>
    </div>`;
    const districts = PROVINCE_DISTRICTS[_locProv] || [];
    districts.forEach(d => {
      const active = d === _locDist ? ' active' : '';
      html += `<div class="loc-item${active}" onclick="locDrillSelectDist('${d.replace(/'/g,"\'")}')">
        <span>${d}</span>
      </div>`;
    });
    list.innerHTML = html;
  }
}

function locDrillSelectProv(prov) {
  _locProv  = prov;
  _locDist  = '';
  const hasDist = (PROVINCE_DISTRICTS[prov]||[]).length > 0;
  if(hasDist) {
    // มีอำเภอ → แสดงหน้าอำเภอ แต่ยังไม่ปิด dropdown จนกว่าจะเลือกอำเภอ
    _locLevel = 'district';
    locDrillCommit();
    locDrillRender();
  } else {
    // ไม่มีอำเภอ → select & close ได้เลย
    _locLevel = 'province';
    locDrillCommit();
    locDrillClose();
  }
}

function locDrillGoBack() {
  _locLevel = 'province';
  _locDist  = '';
  locDrillRender();
}

function locDrillSelectDist(dist) {
  _locDist = dist;
  locDrillCommit();
  locDrillClose();
}

function locDrillClear() {
  _locProv  = '';
  _locDist  = '';
  _locLevel = 'province';
  locDrillCommit();
  locDrillClose(); // ปิด panel ทันทีแทนการ render ใหม่แบบเปิดค้าง
}

// debounced filter trigger สำหรับ locDrillCommit — ป้องกัน call ซ้ำขณะ UI update
const _locDrillFilterDebounced = (typeof debounce === 'function')
  ? debounce(() => { _filterOnly(); }, 80)
  : () => { _filterOnly(); };

function locDrillCommit() {
  // sync hidden selects
  const sp = $('s-prov');
  const sd = $('s-dist');
  if(sp) sp.value = _locProv;
  if(sd) sd.value = _locDist;
  // update button display — อัปเดต disp ก่อนเสมอ ไม่ขึ้นกับ lbl
  const disp = $('loc-drill-display');
  if(disp) {
    if(_locDist) {
      disp.textContent = _locDist;
    } else if(_locProv) {
      disp.textContent = _locProv;
    } else {
      disp.textContent = (typeof ui==='function') ? ui('sf.prov.all') : 'ทุกจังหวัด';
    }
  }
  // update label text (อาจถูกลบโดย applyLang — ถ้าไม่เจอให้ rebuild)
  let lbl = $('loc-drill-label-text');
  if(!lbl) {
    const labelEl = document.getElementById('loc-drill-label');
    if(labelEl) {
      labelEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> <span id="loc-drill-label-text"></span>';
      lbl = $('loc-drill-label-text');
    }
  }
  if(lbl) {
    if(_locDist) {
      lbl.innerHTML = '<i class="fas fa-map-pin"></i> ' + _locProv + ' ›';
    } else {
      lbl.textContent = (typeof ui==='function') ? ui('sf.prov.label') : 'จังหวัด';
    }
  }
  _locDrillFilterDebounced();
}

// close panel on outside click — use composedPath so re-rendered innerHTML nodes are handled correctly
document.addEventListener('click', function(e){
  const wrap = $('loc-drill-wrap');
  if(!wrap) return;
  const path = e.composedPath ? e.composedPath() : [];
  const insideWrap = path.includes(wrap) || wrap.contains(e.target);
  if(!insideWrap) locDrillClose();
});

function populateDistrictSelect() { /* no-op: handled by drill-down */ }

/* ═══ Modal Province/Location Drill-down ═══════════════════════════════════ */
let _madvLevel = 'top';   // 'top' | 'province'
let _madvProv  = '';
let _madvDist  = '';

// Popular locations removed — province+district only

function madvLocToggle() {
  const panel = document.getElementById('madv-loc-panel');
  const btn   = document.getElementById('madv-loc-btn');
  if(!panel || !btn) return;
  const isOpen = panel.style.display !== 'none';
  if(isOpen){ madvLocClose(); return; }
  // ── Portal: always move panel to body to escape overflow:hidden containers ──
  // Re-append every time to ensure it's at top of stacking context
  document.body.appendChild(panel);
  // Reset any stale position styles before measuring
  panel.style.position = 'fixed';
  panel.style.top      = '-9999px';
  panel.style.left     = '0px';
  panel.style.width    = '';
  panel.style.display  = 'block';
  madvLocRender();
  // Triple-rAF: รอให้ modal transition + layout เสร็จก่อนวัดตำแหน่ง
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        _madvPositionPanel(panel, btn);
      });
    });
  });
}

function _madvPositionPanel(panel, btn) {
  if(!panel || !btn) return;
  const btnRect = btn.getBoundingClientRect();
  // Guard: ถ้า btn ยังไม่ถูก render หรือถูกซ่อนอยู่ (size = 0) ให้รอแล้วลองใหม่
  if(btnRect.width === 0 && btnRect.height === 0) {
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        _madvPositionPanel(panel, btn);
      });
    });
    return;
  }
  const panelH     = panel.offsetHeight || 260;
  const panelW     = Math.max(panel.offsetWidth || 200, btnRect.width);
  const spaceBelow = window.innerHeight - btnRect.bottom;
  const spaceAbove = btnRect.top;
  const dropUp     = spaceBelow < panelH + 20 && spaceAbove > spaceBelow;
  // panel ถูก portal ไป body → ใช้ position:fixed (ไม่ต้องบวก scrollY)
  panel.style.position = 'fixed';
  panel.style.zIndex   = '99999';
  panel.style.width    = panelW + 'px';
  if(dropUp){
    panel.style.top    = (btnRect.top - panelH) + 'px';
    panel.style.bottom = 'auto';
    panel.style.left   = btnRect.left + 'px';
    panel.classList.add('drop-up');
    btn.classList.add('open','drop-up');
  } else {
    panel.style.top    = btnRect.bottom + 'px';
    panel.style.bottom = 'auto';
    panel.style.left   = btnRect.left + 'px';
    panel.classList.remove('drop-up');
    btn.classList.add('open');
    btn.classList.remove('drop-up');
  }
}

function madvLocClose() {
  const panel = document.getElementById('madv-loc-panel');
  const btn   = document.getElementById('madv-loc-btn');
  if(panel){
    panel.style.display = 'none';
    panel.style.top = '-9999px';
    panel.style.left = '0px';
    panel.style.width = '';
    panel.classList.remove('drop-up');
  }
  if(btn)  { btn.classList.remove('open','drop-up'); }
}

function madvLocRender() {
  const list = document.getElementById('madv-loc-list');
  if(!list) return;
  let html = '';

  if(_madvLevel === 'top') {
    // ── Clear button
    if(_madvProv || _madvDist) {
      html += `<div class="madv-loc-item loc-clear" onclick="madvLocClear()"><i class="fas fa-times-circle"></i> ล้างการเลือก</div>`;
    }
    html += '<div class="madv-loc-head">🗺️ จังหวัด</div>';
    // กรุงเทพฯ อยู่บนสุดเสมอ ตามด้วยจังหวัดอื่นเรียงตัวอักษร
    const _otherProvs = Object.keys(PROVINCE_DISTRICTS)
      .filter(p => p !== 'กรุงเทพฯ')
      .sort((a,b)=>a.localeCompare(b,'th'));
    const allProvs = ['กรุงเทพฯ', ..._otherProvs];
    allProvs.forEach(function(p){
      const active = (p === _madvProv && _madvLevel !== 'top') ? ' active' : '';
      const hasDist = (PROVINCE_DISTRICTS[p]||[]).length > 0;
      html += `<div class="madv-loc-item${active}" onclick="madvSelectProv('${p.replace(/'/g,"\'")}')">
        <span style="flex:1">${p}</span>
        ${hasDist ? '<i class="fas fa-chevron-right" style="font-size:10px;color:#bbb"></i>' : ''}
      </div>`;
    });
  } else {
    // ── District level
    html += `<div class="madv-loc-item loc-back" onclick="madvGoBack()"><i class="fas fa-chevron-left"></i> กลับ · <span style="color:#555">${_madvProv}</span></div>`;
    html += '<div class="madv-loc-head">📍 อำเภอ / เขต</div>';
    const allActive = !_madvDist ? ' active' : '';
    html += `<div class="madv-loc-item${allActive}" onclick="madvSelectDist('')"><span>ทุกอำเภอใน ${_madvProv}</span></div>`;
    (PROVINCE_DISTRICTS[_madvProv]||[]).forEach(function(d){
      const active = d === _madvDist ? ' active' : '';
      html += `<div class="madv-loc-item${active}" onclick="madvSelectDist('${d.replace(/'/g,"\'")}')"><span>${d}</span></div>`;
    });
  }
  list.innerHTML = html;
}

function madvSelectProv(prov) {
  _madvProv = prov; _madvDist = ''; 
  const hasDist = (PROVINCE_DISTRICTS[prov]||[]).length > 0;
  if(hasDist) {
    _madvLevel = 'province';
    madvCommit(); madvLocRender();
  } else {
    _madvLevel = 'top';
    madvCommit(); madvLocClose();
  }
}

function madvSelectDist(dist) {
  _madvDist = dist; madvCommit(); madvLocClose();
}

function madvGoBack() {
  _madvLevel = 'top'; _madvDist = ''; madvLocRender();
}

function madvLocClear() {
  _madvProv = ''; _madvDist = ''; _madvLevel = 'top';
  var sdist = document.getElementById('modal-adv-district');
  if(sdist) sdist.value = '';
  var sprov = document.getElementById('modal-adv-province');
  if(sprov) sprov.value = '';
  var spop  = document.getElementById('modal-adv-popular-loc');
  if(spop)  spop.value = '';
  madvCommit(); madvLocRender();
}

function madvCommit() {
  // ── Sync province & district to hidden selects ──
  // Use separate selects: modal-adv-province for province, modal-adv-district (hidden) for district
  const spop  = document.getElementById('modal-adv-popular-loc');
  const sprov = document.getElementById('modal-adv-province');
  const sdist = document.getElementById('modal-adv-district');
  const isProvKey = _madvProv && PROVINCE_DISTRICTS.hasOwnProperty(_madvProv);

  if(!isProvKey && _madvDist) {
    // Popular area selection (e.g. สุขุมวิท, ลาดพร้าว) — treat as keyword location
    if(spop)  spop.value  = _madvDist;
    if(sprov) sprov.value = '';
    if(sdist) sdist.value = '';
  } else {
    // Province + optional district drill-down
    if(spop)  spop.value  = '';               // clear popular-loc (avoid double filter)
    if(sprov) sprov.value = _madvProv || '';  // province
    if(sdist) sdist.value = _madvDist || '';  // district/amphoe (may be empty = all districts)
  }

  // Update display text
  const disp = document.getElementById('madv-loc-display');
  if(disp) {
    if(_madvDist && _madvProv) disp.textContent = _madvProv + ' › ' + _madvDist;
    else if(_madvDist)         disp.textContent = _madvDist;
    else if(_madvProv)         disp.textContent = _madvProv;
    else                       disp.textContent = 'จังหวัด';
  }

  // Trigger filter
  const typeCtx = window._modalTypeData ? (window._modalTypeData.type||'') : '';
  if(typeof modalAdvFilter === 'function') modalAdvFilter(typeCtx);
}

// Close on outside click — panel is portalled to body so check both wrap and panel
document.addEventListener('click', function(e){
  const wrap  = document.getElementById('madv-loc-wrap');
  const panel = document.getElementById('madv-loc-panel');
  const btn   = document.getElementById('madv-loc-btn');
  if(!wrap) return;
  // If the panel is currently hidden, nothing to close
  if(!panel || panel.style.display === 'none') return;
  const path = e.composedPath ? e.composedPath() : [];
  const inWrap  = path.includes(wrap)  || wrap.contains(e.target);
  const inPanel = panel && (path.includes(panel) || panel.contains(e.target));
  const inBtn   = btn   && (path.includes(btn)   || btn.contains(e.target));
  if(!inWrap && !inPanel && !inBtn) madvLocClose();
});
// Reposition panel on scroll/resize while open
window.addEventListener('scroll', function(){
  var panel = document.getElementById('madv-loc-panel');
  var btn   = document.getElementById('madv-loc-btn');
  if(panel && btn && panel.style.display !== 'none') _madvPositionPanel(panel, btn);
}, true);
window.addEventListener('resize', function(){
  var panel = document.getElementById('madv-loc-panel');
  var btn   = document.getElementById('madv-loc-btn');
  if(panel && btn && panel.style.display !== 'none') _madvPositionPanel(panel, btn);
});


function debounce(fn, ms) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function _filterOnly(){ applyFilters().catch(console.error); }
const debouncedSearch = debounce(() => { _filterOnly(); }, 400);

function highlight(text, kw) {
  if(!kw) return text;
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return text.replace(new RegExp(`(${esc})`,'gi'),'<mark>$1</mark>');
}

function initAutocomplete() {
  const inp = $('s-kw');
  const list = $('ac-list');
  if(!inp||!list) return;

  /* ── Portal: ย้าย ac-list ไปที่ body เพื่อหลีก stacking context ของ .hero ── */
  document.body.appendChild(list);
  Object.assign(list.style, {
    position:'fixed', background:'#fff',
    border:'1.5px solid var(--bd)', borderRadius:'10px',
    zIndex:'9000', maxHeight:'280px', overflowY:'auto',
    boxShadow:'0 12px 32px rgba(27,58,107,.22)', display:'none'
  });

  function positionList() {
    const r = inp.getBoundingClientRect();
    list.style.top   = (r.bottom + 2) + 'px';
    list.style.left  = r.left + 'px';
    list.style.width = r.width + 'px';
  }

  const doAC = debounce(kw => {
    if(!kw || kw.length < 1) { list.style.display='none'; return; }
    const kwl = kw.toLowerCase();
    const matches = props
      .filter(p=> p.title.toLowerCase().includes(kwl) || (p.location||'').toLowerCase().includes(kwl))
      .slice(0, 8);
    if(!matches.length) { list.style.display='none'; return; }
    list.innerHTML = matches.map(p=>`
      <div class="ac-item" onclick="selectAC('${p.id}','${p.title.replace(/'/g,"\\'")}','${(p.location||'').replace(/'/g,"\\'")}')">
        <span class="ac-icon">${typeIcon(p.type)}</span>
        <span class="ac-title">${highlight(sanitize(p.title||''),kw)}</span>
        <span class="ac-sub">${sanitize(p.location||'')}</span>
      </div>`).join('');
    positionList();
    list.style.display='block';
  }, 300);

  inp.addEventListener('input', e => doAC(e.target.value.trim()));
  inp.addEventListener('keydown', e => { if(e.key==='Escape'||e.key==='Enter') { list.style.display='none'; if(e.key==='Enter') { doSearch(); } } });
  window.addEventListener('scroll', () => { if(list.style.display!=='none') positionList(); }, {passive:true});
  window.addEventListener('resize', () => { if(list.style.display!=='none') positionList(); }, {passive:true});
  document.addEventListener('click', e => { if(!inp.contains(e.target) && !list.contains(e.target)) list.style.display='none'; });
}

function selectAC(id, title, loc) {
  const inp = $('s-kw');
  if(inp) inp.value = title;
  $('ac-list').style.display='none';
  const p = props.find(x=>String(x.id)===String(id));
  if(p && p.tx && p.tx !== tx) _syncTxTabs(p.tx);
  openModal(id);
  setTimeout(()=>scrollToEl('all-sec'), 80);
}

function initListingsAutocomplete() {
  const inp = document.getElementById('ls-kw');
  const list = document.getElementById('ls-ac-list');
  if(!inp || !list) return;

  const doAC = (function(){
    let _t;
    return function(kw){
      clearTimeout(_t);
      _t = setTimeout(function(){
        if(!kw || kw.length < 1) { list.style.display='none'; return; }
        const kwl = kw.toLowerCase();
        const matches = props
          .filter(p => p.title.toLowerCase().includes(kwl) || (p.location||'').toLowerCase().includes(kwl))
          .slice(0, 8);
        if(!matches.length) { list.style.display='none'; return; }
        list.innerHTML = matches.map(p=>`
          <div class="ac-item" onclick="selectLsAC('${p.id}','${p.title.replace(/'/g,"\\'")}','${(p.location||'').replace(/'/g,"\\'")}')">
            <span class="ac-icon">${typeIcon(p.type)}</span>
            <span class="ac-title">${highlight(sanitize(p.title||''),kw)}</span>
            <span class="ac-sub">${sanitize(p.location||'')}</span>
          </div>`).join('');
        list.style.display='block';
      }, 280);
    };
  })();

  inp.addEventListener('input', function(e){ doAC(e.target.value.trim()); });
  inp.addEventListener('keydown', function(e){
    if(e.key==='Escape') { list.style.display='none'; }
    if(e.key==='Enter') { list.style.display='none'; listingsDoSearchAndScroll(); }
  });
  document.addEventListener('click', function(e){
    if(!e.target.closest('.ls-ac-wrap')) list.style.display='none';
  });
}

function selectLsAC(id, title, loc) {
  const inp = document.getElementById('ls-kw');
  if(inp) inp.value = title;
  const list = document.getElementById('ls-ac-list');
  if(list) list.style.display='none';
  listingsInlineSearch();
  setTimeout(function(){ openModal(id); }, 120);
}

function initSwipe(sliderEl, prevFn, nextFn) {
  if(!sliderEl) return;
  let startX=0, startY=0, isDragging=false, isVert=false, moved=0;
  const slidesEl = sliderEl.querySelector('.slides');

  function _liveOffset(dx) {
    if(!slidesEl) return;
    const cur = typeof slide_cur !== 'undefined' ? slide_cur : 0;
    const baseX = cur * 100;
    // Apply live drag offset as percentage of slider width
    const pct = (dx / sliderEl.offsetWidth) * 100;
    slidesEl.style.transition = 'none';
    slidesEl.style.transform = `translateX(calc(-${baseX}% + ${dx}px))`;
  }
  function _resetToSlide(withAnim) {
    if(!slidesEl) return;
    const cur = typeof slide_cur !== 'undefined' ? slide_cur : 0;
    if(withAnim) slidesEl.style.transition = 'transform .38s cubic-bezier(.25,.46,.45,.94)';
    else slidesEl.style.transition = 'none';
    slidesEl.style.transform = `translateX(-${cur * 100}%)`;
  }

  // Touch — show live drag feedback
  sliderEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true; isVert = false; moved = 0;
  }, {passive:true});
  sliderEl.addEventListener('touchmove', e => {
    if(!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if(!isVert && Math.abs(dy) > Math.abs(dx) + 4) { isVert = true; }
    if(isVert) return;
    moved = dx;
    _liveOffset(moved);
  }, {passive:true});
  sliderEl.addEventListener('touchend', () => {
    if(!isDragging) return; isDragging = false;
    if(isVert) { isVert = false; moved = 0; _resetToSlide(true); return; }
    if(moved < -50) { nextFn(); setTimeout(()=>_resetToSlide(false),0); }
    else if(moved > 50) { prevFn(); setTimeout(()=>_resetToSlide(false),0); }
    else { _resetToSlide(true); }
    moved = 0; isVert = false;
  });

  // Mouse drag (desktop — keep original smooth behaviour)
  sliderEl.addEventListener('mousedown', e => {
    startX = e.clientX; isDragging = true; moved = 0;
    sliderEl.classList.add('dragging'); e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if(!isDragging) return;
    moved = e.clientX - startX;
    _liveOffset(moved);
  });
  window.addEventListener('mouseup', () => {
    if(!isDragging) return; isDragging = false; sliderEl.classList.remove('dragging');
    if(moved < -50) { nextFn(); setTimeout(()=>_resetToSlide(false),0); }
    else if(moved > 50) { prevFn(); setTimeout(()=>_resetToSlide(false),0); }
    else { _resetToSlide(true); }
    moved = 0;
  });
}

function initModalSwipe() {
  const ms = document.querySelector('#prop-modal .mslider');
  if(ms && !ms._swipeInit) {
    ms._swipeInit = true;
    initSwipe(ms, ()=>slide(-1), ()=>slide(1));
  }
}

function lazyLoadImages() {
  if(!('IntersectionObserver' in window)) {
    // Fallback: load all data-src immediately
    $$('img[data-src]').forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if(en.isIntersecting) {
        const img = en.target;
        if(img.dataset.src) { img.src=img.dataset.src; img.removeAttribute('data-src'); }
        obs.unobserve(img);
      }
    });
  }, {rootMargin:'200px'});
  // Observe existing data-src images
  $$('img[data-src]').forEach(img=>obs.observe(img));
  // MutationObserver — observe newly injected img[data-src] (e.g. from batch card render)
  const mutObs = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if(node.nodeType !== 1) return;
        if(node.tagName === 'IMG' && node.dataset.src) { obs.observe(node); }
        node.querySelectorAll && node.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
      });
    });
  });
  const grid = document.getElementById('listings-grid');
  if(grid) mutObs.observe(grid, { childList: true, subtree: true });
}

function animateStatCounters(scope) {
  const root = scope || document;
  // New unified system: .stat-counter-num[data-target] > .suf-num
  root.querySelectorAll('.stat-counter-num[data-target]').forEach(wrapper => {
    const target = parseInt(wrapper.dataset.target) || 0;
    const numEl = wrapper.querySelector('.suf-num');
    if(numEl) animateCounter(numEl, target);
  });
  // Legacy hero counters (hc-num)
  root.querySelectorAll('.hc-num[data-target]').forEach(el => {
    animateCounter(el, parseInt(el.dataset.target)||0);
  });
}

// Trigger hero counters when visible
// หมายเหตุ: ถ้าข้อมูลจริงโหลดแล้ว (window._dataReady) ให้ใช้ syncAllStats() แทน animateStatCounters()
// เพื่อให้ตัวเลขมาจาก Supabase จริง ไม่ใช่ data-target mock ที่ตั้งใน HTML
(function() {
  let triggered = false;
  const hero = document.querySelector('.hero');
  if(!hero) return;
  const obs = new IntersectionObserver(entries => {
    if(entries[0].isIntersecting && !triggered) {
      triggered = true;
      if(window._dataReady && typeof syncAllStats === 'function') {
        // ข้อมูลจริงพร้อมแล้ว — sync จาก Supabase data
        syncAllStats();
      } else {
        // ข้อมูลยังโหลดไม่เสร็จ — animate จาก data-target ปัจจุบัน (อาจเป็น mock)
        animateStatCounters(hero.closest('.page'));
        // เมื่อข้อมูลโหลดเสร็จ syncAllStats() จะถูกเรียกอีกครั้งโดยอัตโนมัติ
      }
      obs.disconnect();
    }
  }, { threshold: 0.2 });
  obs.observe(hero);
})();

function toggleQsDD(id, btn) {
  const panel = document.getElementById(id);
  if(!panel) return;
  const isMob = window.innerWidth <= 900;
  if(isMob){
    const isOpen = panel.classList.contains('open');
    closeQsDDs();
    if(!isOpen){ openQsSheet(id, btn); }
    return;
  }
  const isOpen = panel.classList.contains('open');
  closeQsDDs();
  if(!isOpen) {
    const rect = btn.getBoundingClientRect();
    const panelW = Math.max(260, Math.min(320, window.innerWidth - 20));
    let left = rect.left + rect.width/2 - panelW/2;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    panel.style.left = left + 'px';
    panel.style.top = (rect.bottom + 6) + 'px';
    panel.style.width = panelW + 'px';
    panel.classList.add('open');
    btn.classList.add('qs-open');
  }
}
function openQsSheet(panelId, btn){
  const panel = document.getElementById(panelId);
  if(!panel) return;
  const title = btn ? btn.textContent.trim() : '';
  let sheet = document.getElementById('qs-mob-sheet');
  if(!sheet){
    const overlay = document.createElement('div');
    overlay.id = 'qs-mob-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:410;display:none';
    overlay.onclick = closeQsSheet;
    document.body.appendChild(overlay);
    sheet = document.createElement('div');
    sheet.id = 'qs-mob-sheet';
    sheet.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:22px 22px 0 0;z-index:420;transform:translateY(100%);transition:transform .35s cubic-bezier(.32,1,.56,1);max-height:88vh;display:flex;flex-direction:column;overflow:hidden';
    sheet.innerHTML='<div style="width:40px;height:4px;background:#ddd;border-radius:4px;margin:10px auto 0"></div><div id="qs-mob-sheet-hd" style="padding:12px 20px 8px;border-bottom:1px solid #e8e0d4;display:flex;align-items:center;justify-content:space-between;flex-shrink:0"><h3 style="font-size:15px;font-weight:700;font-family:Kanit,sans-serif"></h3><button onclick="closeQsSheet()" style="background:none;border:none;font-size:18px;color:#888;cursor:pointer">×</button></div><div id="qs-mob-sheet-body" style="flex:1;overflow-y:auto;padding:10px 12px"></div>';
    document.body.appendChild(sheet);
  }
  const overlay2 = document.getElementById('qs-mob-overlay');
  const hd = sheet.querySelector('#qs-mob-sheet-hd h3');
  const body = document.getElementById('qs-mob-sheet-body');
  if(hd) hd.textContent = title;
  if(body) body.innerHTML = panel.innerHTML;
  if(overlay2) overlay2.style.display='block';
  requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; });
  document.body.classList.add('modal-open'); // overflow via CSS
  panel.classList.add('open');
  if(btn) btn.classList.add('qs-open');
}
function closeQsSheet(){
  const sheet = document.getElementById('qs-mob-sheet');
  const overlay2 = document.getElementById('qs-mob-overlay');
  if(sheet) sheet.style.transform='translateY(100%)';
  if(overlay2) overlay2.style.display='none';
  // ลบ .open จาก panel ที่ openQsSheet เพิ่มไว้ เพื่อให้ stillOpen query ถูกต้อง
  document.querySelectorAll('.qs-dd-panel.open').forEach(p => p.classList.remove('open'));
  closeQsDDs();
  const stillOpen = document.querySelector('.ov.open, [id$="-modal"].open, [id$="-overlay"].open, .seo-drawer.open, .adv-sheet.open');
  if(!stillOpen){
    document.body.style.removeProperty('overflow');
    document.body.classList.remove('modal-open');
  }
}
function closeQsDDs() {
  document.querySelectorAll('.qs-dd-panel.open').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.qs-dd-btn.qs-open').forEach(b => b.classList.remove('qs-open'));
}
document.addEventListener('click', e => { if(!e.target.closest('.qs-group')) closeQsDDs(); });
window.addEventListener('scroll', closeQsDDs, {passive:true});
// stub leftovers

(function initPageHeroCanvases() {
  // Colour palettes per page — softer, lower opacity than main hero
  const palettes = {
    fav: ['#ff2d78','#a855f7','#ff80ab','#ea80fc','#ff6b9d'],
    port: ['#40c4ff','#7c4dff','#80d8ff','#667eea','#b388ff'],
    ag:  ['#00e676','#40c4ff','#69f0ae','#18ffff','#43d9ad'],
  };

  function makeCanvas(canvasId, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    // บนมือถือ: ข้ามการสร้าง canvas animation ทั้งหมด — ประหยัด CPU
    if(window.innerWidth <= 768 || navigator.maxTouchPoints > 0){
      canvas.style.display = 'none';
      return;
    }
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = canvas.offsetWidth || canvas.parentElement.offsetWidth || 800;
      canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight || 220;
    }
    resize();
    window.addEventListener('resize', resize);

    class Orb {
      constructor() { this.reset(true); }
      reset(init) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + 80;
        this.r = 50 + Math.random() * 110;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = -(0.1 + Math.random() * 0.25);
        this.alpha = 0.07 + Math.random() * 0.12;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 0;
        this.maxLife = 280 + Math.random() * 380;
        this.pulse = Math.random() * Math.PI * 2;
      }
      draw() {
        this.pulse += 0.018;
        const r = this.r * (1 + Math.sin(this.pulse) * 0.1);
        const fade = Math.min(this.life / 45, 1) * Math.min((this.maxLife - this.life) / 45, 1);
        const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        const a = Math.round(this.alpha * fade * 255).toString(16).padStart(2,'0');
        const a2 = Math.round(this.alpha * fade * 0.4 * 255).toString(16).padStart(2,'0');
        grd.addColorStop(0, this.color + a);
        grd.addColorStop(0.6, this.color + a2);
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.life++;
        if (this.life > this.maxLife || this.y < -this.r * 2) this.reset(false);
      }
    }

    class Dot {
      constructor() { this.reset(true); }
      reset(init) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + 5;
        this.r = 1 + Math.random() * 1.8;
        this.vy = -(0.25 + Math.random() * 0.4);
        this.vx = (Math.random() - 0.5) * 0.2;
        this.alpha = 0.12 + Math.random() * 0.22;
        this.life = 0;
        this.maxLife = 180 + Math.random() * 240;
      }
      draw() {
        const fade = Math.min(this.life / 30, 1) * Math.min((this.maxLife - this.life) / 30, 1);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${this.alpha * fade})`;
        ctx.fill();
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.life++;
        if (this.life > this.maxLife || this.y < -5) this.reset(false);
      }
    }

    const orbs = Array.from({length: 7}, () => new Orb());
    const dots = Array.from({length: 18}, () => new Dot());
    let running = true;

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      orbs.forEach(o => { o.update(); o.draw(); });
      dots.forEach(d => { d.update(); d.draw(); });
      requestAnimationFrame(draw);
    }
    draw();

    // Pause animation when page is hidden to save resources
    const page = canvas.closest('.page');
    if (page) {
      const obs = new MutationObserver(() => {
        running = page.classList.contains('active');
        if (running) draw();
      });
      obs.observe(page, { attributes: true, attributeFilter: ['class'] });
    }
  }

  makeCanvas('ph-canvas-fav', palettes.fav);
  makeCanvas('ph-canvas-port', palettes.port);
  makeCanvas('ph-canvas-ag', palettes.ag);
})();

(function injectSubPageFooters() {
  // Wait for DOM — run after init
  function doInject() {
    const mainFooterEl = document.querySelector('#page-home footer');
    if (!mainFooterEl) return;
    const flinkEl = document.querySelector('#page-home .flink-sec');
    document.querySelectorAll('.sub-page-footer').forEach(placeholder => {
      if (placeholder.children.length > 0) return; // already injected
      const flink = flinkEl ? flinkEl.cloneNode(true) : null;
      const footer = mainFooterEl.cloneNode(true);
      // Remove id duplication from clones to avoid conflicts
      footer.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      if (flink) {
        flink.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        placeholder.appendChild(flink);
      }
      placeholder.appendChild(footer);
    });
  }
  // Run after loadData populates footer fields
  const origInit = window.init;
  if (origInit) {
    window.init = async function() {
      await origInit();
      setTimeout(()=>{ doInject(); setTimeout(()=>{ if(typeof applyLang==='function') applyLang(); }, 50); }, 300);
    };
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(()=>{ doInject(); setTimeout(()=>{ if(typeof applyLang==='function') applyLang(); }, 50); }, 800));
  }
})();

// ─────────────────────────────────────────────────────────────
//  cardSlide — unified, supports 2 signatures:
//    cardSlide(event, pid, dir)   ← prop-card buttons
//    cardSlide(uid,   dir)        ← blog / port / agent buttons
// ─────────────────────────────────────────────────────────────
function _doCardSlide(pid, dir) {
  const slides = document.getElementById(pid + '-slides');
  if (!slides) return;
  const items = slides.children;
  if (!items.length) return;
  const total = items.length;
  const wrap  = document.querySelector('[data-card="' + pid + '"]');
  let cur = parseInt((wrap && wrap.dataset.cur) || slides.dataset.cur || '0');
  cur = (cur + dir + total) % total;
  if (wrap) wrap.dataset.cur = cur;
  slides.dataset.cur = cur;
  // prop-card and others both use 100% per slide now (flexbox)
  slides.style.transform = 'translateX(-' + (cur * 100) + '%)';
  // dots — data-card style (prop-card)
  document.querySelectorAll('.card-dot[data-card="' + pid + '"]')
    .forEach(function(d, i){ d.classList.toggle('active', i === cur); });
  // dots — #uid-dots style (blog/port/agent)
  var dotsEl = document.getElementById(pid + '-dots');
  if (dotsEl) dotsEl.querySelectorAll('.card-dot')
    .forEach(function(d, i){ d.classList.toggle('active', i === cur); });
}

function cardSlide(a, b, c) {
  if (typeof a === 'object' && a !== null) {
    // (event, pid, dir)
    if (a.stopPropagation) a.stopPropagation();
    _doCardSlide(b, c);
  } else {
    // (uid, dir)
    _doCardSlide(a, b);
  }
}

function cardGoSlide(e, pid, idx) {
  if (e && e.stopPropagation) e.stopPropagation();
  var slides = document.getElementById(pid + '-slides');
  if (!slides) return;
  var total = slides.children.length;
  var wrap  = document.querySelector('[data-card="' + pid + '"]');
  if (wrap) wrap.dataset.cur = idx;
  slides.dataset.cur = idx;
  if (wrap && wrap.dataset.card) {
    slides.style.transform = 'translateX(-' + (idx * 100) + '%)';
  } else {
    slides.style.transform = 'translateX(-' + (idx * 100) + '%)';
  }
  document.querySelectorAll('.card-dot[data-card="' + pid + '"]')
    .forEach(function(d, i){ d.classList.toggle('active', i === idx); });
  var dotsEl = document.getElementById(pid + '-dots');
  if (dotsEl) dotsEl.querySelectorAll('.card-dot')
    .forEach(function(d, i){ d.classList.toggle('active', i === idx); });
}

// ─────────────────────────────────────────────────────────────
//  initCardSwipeOn — touch + mouse drag, ทุก card type
//  surface = card-slider-wrap (prop) | blog-thumb | gal-img | agent-photo-wrap
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  initCardSwipeOn — touch + mouse drag, ทุก card type
//  ทำงานโดย bind event บน surface element โดยตรง (prop-thumb / blog-thumb / gal-img / agent-photo-wrap)
//  pid หาจาก slides element id ที่อยู่ใน surface นั้นๆ — ไม่ขึ้นกับ data-card
// ─────────────────────────────────────────────────────────────
function initCardSwipeOn(containerEl) {
  if (!containerEl) return;

  var surface =
    containerEl.querySelector('.prop-thumb') ||
    containerEl.querySelector('.blog-thumb') ||
    containerEl.querySelector('.gal-img') ||
    containerEl.querySelector('.agent-photo-wrap') ||
    containerEl.querySelector('.card-slider-wrap');
  if (!surface) return;

  if (surface._swipeInit) return;

  var slidesEl = surface.querySelector('.card-slides');
  if (!slidesEl) return;

  surface._swipeInit = true;

  var pid = slidesEl.id ? slidesEl.id.replace(/-slides$/, '') : null;
  if (!pid) return;

  var startX = 0, startY = 0, moved = 0, active = false, didDrag = false;
  var THRESHOLD = 40;

  function _getCurIdx() {
    return parseInt(slidesEl.dataset.cur || '0');
  }
  function _liveOffset(dx) {
    var cur = _getCurIdx();
    slidesEl.style.transition = 'none';
    slidesEl.style.transform = 'translateX(calc(-' + (cur * 100) + '% + ' + dx + 'px))';
  }
  function _snap(withAnim) {
    var cur = _getCurIdx();
    if(withAnim) slidesEl.style.transition = 'transform .35s cubic-bezier(.25,.46,.45,.94)';
    else slidesEl.style.transition = 'none';
    slidesEl.style.transform = 'translateX(-' + (cur * 100) + '%)';
  }

  // ── Touch (with live drag) ──
  surface.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = 0; active = true; didDrag = false;
  }, { passive: true });

  surface.addEventListener('touchmove', function(e) {
    if (!active) return;
    var dx = e.touches[0].clientX - startX;
    var dy = e.touches[0].clientY - startY;
    if (!didDrag && Math.abs(dx) > Math.abs(dy) + 4 && Math.abs(dx) > 8) didDrag = true;
    if (didDrag) { moved = dx; _liveOffset(dx); }
  }, { passive: true });

  surface.addEventListener('touchend', function() {
    if (!active) return;
    active = false;
    if (didDrag && Math.abs(moved) > THRESHOLD) {
      _doCardSlide(pid, moved < 0 ? 1 : -1);
      setTimeout(function(){ _snap(false); }, 0);
    } else {
      _snap(true);
    }
    moved = 0; didDrag = false;
  });

  // ── Mouse drag (with live drag) ──
  surface.addEventListener('mousedown', function(e) {
    if (e.target.closest('.card-sarr, button, a')) return;
    startX = e.clientX; moved = 0; active = true; didDrag = false;
    surface.classList.add('dragging');

    var ac = new AbortController();
    var sig = { signal: ac.signal };

    document.addEventListener('mousemove', function(e) {
      if (!active) return;
      var dx = e.clientX - startX;
      if (!didDrag && Math.abs(dx) > 8) didDrag = true;
      if (didDrag) { moved = dx; _liveOffset(dx); }
    }, sig);

    document.addEventListener('mouseup', function() {
      if (!active) { ac.abort(); return; }
      active = false;
      surface.classList.remove('dragging');
      if (didDrag && Math.abs(moved) > THRESHOLD) {
        _doCardSlide(pid, moved < 0 ? 1 : -1);
        setTimeout(function(){ _snap(false); }, 0);
        var kill = function(ev) { ev.stopPropagation(); containerEl.removeEventListener('click', kill, true); };
        containerEl.addEventListener('click', kill, true);
      } else {
        _snap(true);
      }
      moved = 0; didDrag = false;
      ac.abort();
    }, sig);
  });
}

// ── initAllCardSwipes: scoped version ────────────────────────
// ถ้าส่ง scopeEl มา → query เฉพาะใน element นั้น (เร็วกว่า 10x บน mobile)
// ถ้าไม่ส่ง → fallback query ทั้ง document (เฉพาะหน้าที่ active เท่านั้น)
function initAllCardSwipes(scopeEl) {
  var root = scopeEl || document.querySelector('.page.active') || document;
  root.querySelectorAll('.prop-card, .blog-card, .gal-card, .agent-card')
    .forEach(initCardSwipeOn);
}

// Observer — ดู grid/track ทั้งหมด เมื่อ render card ใหม่
// listings-grid ใช้ scoped init เพื่อไม่บล็อก main thread
var _cardObserver = new MutationObserver(function(mutations){
  var idle = window.requestIdleCallback || function(cb){ setTimeout(cb,50); };
  mutations.forEach(function(m){
    if(m.target && m.target.id === 'listings-grid'){
      // listings: init เฉพาะ card ใหม่ใน grid นี้ — ไม่ touch card อื่น
      idle(function(){ initAllCardSwipes(m.target); });
    } else {
      idle(function(){ initAllCardSwipes(m.target); });
    }
  });
});
['all-grid','rec-grid','new-grid','new-track','fav-page-grid',
 'blog-track','blog-grid','port-grid','agent-grid','osrv-track','gc-track',
 'listings-grid'
].forEach(function(gid) {
  var el = document.getElementById(gid);
  if (el) _cardObserver.observe(el, { childList: true, subtree: false });
});

function initCardSwipe(cardEl) { initCardSwipeOn(cardEl); }

let recCarouselIdx = 0;
let recCarouselItems = [];
let recAutoTimer = null;
let recDragStart = 0, recDragDelta = 0, recIsDragging = false;

function renderRecCarousel() {
  const track = $('rec-carousel-track');
  if(!track) return;
  // Pick recommended, hot, and new properties
  const recProps = [...props].sort((a,b) => {
    if(a.isRec && !b.isRec) return -1;
    if(!a.isRec && b.isRec) return 1;
    if(a.isNew && !b.isNew) return -1;
    return 0;
  }).slice(0, 20);
  recCarouselItems = recProps;
  // Duplicate for infinite loop
  const doubled = [...recProps, ...recProps];
  track.innerHTML = doubled.map(p => {
    const img = p.photos?.[0];
    const badge = p.isRec ? '<span class="rec-badge rec-badge-rec">🔥 Hot</span>' : (p.isNew ? '<span class="rec-badge rec-badge-new">✨ ใหม่</span>' : '');
    const txBadge = p.tx==='RENT' ? '<span class="rec-badge rec-badge-rent">เช่า</span>' : '<span class="rec-badge rec-badge-buy">ขาย</span>';
    return `<div class="rec-card" onclick="openModal('${p.id}')">
      <div class="rec-card-img">
        ${img ? `<img src="${img}" loading="lazy" alt="${p.title}">` : typeIcon(p.type)}
        <div class="rec-card-badges">${badge}${txBadge}</div>
      </div>
      <div class="rec-card-body">
        <div class="rec-card-price">${fmtPrice(p.price,p.tx)}</div>
        <div class="rec-card-title">${sanitize(p.title||'')}</div>
        <div class="rec-card-loc"><i class="fas fa-map-marker-alt"></i> ${sanitize(p.location||p.province||'')}</div>
      </div>
    </div>`;
  }).join('');
  recCarouselIdx = 0;
  _applyRecTranslate(false);
  initRecCarouselSwipe();
  startRecAutoSlide();
}

function _cardWidth() {
  const wrap = $('rec-track-wrap');
  return wrap ? Math.min(280 + 16, wrap.offsetWidth * 0.85) : 296;
}

function _applyRecTranslate(animate=true) {
  const track = $('rec-carousel-track');
  if(!track) return;
  const cw = _cardWidth();
  track.style.transition = animate ? 'transform 0.55s cubic-bezier(.25,.46,.45,.94)' : 'none';
  track.style.transform = `translateX(-${recCarouselIdx * cw}px)`;
  // Infinite loop reset
  if(recCarouselItems.length > 0) {
    const total = recCarouselItems.length;
    if(recCarouselIdx >= total) {
      setTimeout(() => {
        recCarouselIdx = 0;
        _applyRecTranslate(false);
      }, 560);
    } else if(recCarouselIdx < 0) {
      setTimeout(() => {
        recCarouselIdx = total - 1;
        _applyRecTranslate(false);
      }, 560);
    }
  }
}

function recCarouselMove(dir) {
  stopRecAutoSlide();
  recCarouselIdx += dir;
  _applyRecTranslate();
  startRecAutoSlide();
}

function startRecAutoSlide() {
  stopRecAutoSlide();
  recAutoTimer = setInterval(() => {
    recCarouselIdx++;
    _applyRecTranslate();
  }, 3800);
}

function stopRecAutoSlide() {
  if(recAutoTimer) { clearInterval(recAutoTimer); recAutoTimer = null; }
}

function initRecCarouselSwipe() {
  const wrap = $('rec-track-wrap');
  if(!wrap || wrap._swipeInit) return;
  wrap._swipeInit = true;
  let _startX = 0, _startY = 0, _isVert = false, _liveDragging = false;
  const track = $('rec-carousel-track');

  function _applyLive(dx) {
    if(!track) return;
    const cw = _cardWidth();
    track.style.transition = 'none';
    track.style.transform = `translateX(calc(-${recCarouselIdx * cw}px + ${dx}px))`;
  }
  function _snapBack(withAnim) {
    if(!track) return;
    track.style.transition = withAnim ? 'transform 0.55s cubic-bezier(.25,.46,.45,.94)' : 'none';
    track.style.transform = `translateX(-${recCarouselIdx * _cardWidth()}px)`;
  }

  wrap.addEventListener('touchstart', e => {
    _startX = e.touches[0].clientX; _startY = e.touches[0].clientY;
    recDragStart = _startX; recIsDragging = false; recDragDelta = 0;
    _isVert = false; _liveDragging = false; stopRecAutoSlide();
  }, {passive:true});

  wrap.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - _startX;
    const dy = e.touches[0].clientY - _startY;
    if(!_liveDragging) {
      if(Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        _isVert = Math.abs(dy) > Math.abs(dx);
        if(!_isVert) { _liveDragging = true; recIsDragging = true; }
      }
    }
    if(_liveDragging && !_isVert) {
      recDragDelta = dx;
      _applyLive(dx);
    }
  }, {passive:true});

  wrap.addEventListener('touchend', () => {
    if(!_isVert) {
      if(recDragDelta < -50) { recCarouselIdx++; _snapBack(true); _checkInfiniteReset(); }
      else if(recDragDelta > 50) { recCarouselIdx--; _snapBack(true); _checkInfiniteReset(); }
      else { _snapBack(true); }
    } else { startRecAutoSlide(); }
    recIsDragging = false; recDragDelta = 0; _isVert = false; _liveDragging = false;
    setTimeout(startRecAutoSlide, 600);
  });

  wrap.addEventListener('mouseenter', stopRecAutoSlide);
  wrap.addEventListener('mouseleave', startRecAutoSlide);

  // Mouse drag — also show live offset
  wrap.addEventListener('mousedown', e => {
    recDragStart = e.clientX; recIsDragging = true; recDragDelta = 0;
    wrap.classList.add('dragging'); stopRecAutoSlide();
  });
  window.addEventListener('mousemove', e => {
    if(!recIsDragging) return;
    recDragDelta = e.clientX - recDragStart;
    _applyLive(recDragDelta);
  });
  window.addEventListener('mouseup', () => {
    if(!recIsDragging) return; recIsDragging = false; wrap.classList.remove('dragging');
    if(recDragDelta < -50) { recCarouselIdx++; _snapBack(true); _checkInfiniteReset(); }
    else if(recDragDelta > 50) { recCarouselIdx--; _snapBack(true); _checkInfiniteReset(); }
    else { _snapBack(true); }
    recDragDelta = 0;
    setTimeout(startRecAutoSlide, 600);
  });

  function _checkInfiniteReset() {
    if(recCarouselItems.length <= 0) return;
    const total = recCarouselItems.length;
    if(recCarouselIdx >= total) {
      setTimeout(() => { recCarouselIdx = 0; _applyRecTranslate(false); }, 580);
    } else if(recCarouselIdx < 0) {
      setTimeout(() => { recCarouselIdx = total - 1; _applyRecTranslate(false); }, 580);
    }
  }
}

async function renderNearbyProps(prop, container) {
  container.innerHTML = '';
  // Get nearby by same province, excluding current
  let nearby = props.filter(p => p.id !== prop.id && p.province === prop.province && p.tx === prop.tx);
  // Fallback to same type
  if(nearby.length < 3) {
    nearby = props.filter(p => p.id !== prop.id && p.type === prop.type).slice(0, 8);
  }
  nearby = nearby.slice(0, 8);
  if(!nearby.length) return;
  const _nearbyId = 'nearby-scroll-' + prop.id;
  container.innerHTML = `<div class="nearby-sec">
    <div class="nearby-header">
      <div class="nearby-title"><i class="fas fa-map-marker-alt"></i> ${ui('modal.nearby')}</div>
      <div style="display:flex;gap:4px">
        <button class="nearby-nav-btn nb-prev" onclick="nearbyScroll('${_nearbyId}',-1)"><i class="fas fa-chevron-left"></i></button>
        <button class="nearby-nav-btn nb-next" onclick="nearbyScroll('${_nearbyId}',1)"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="nearby-scroll-wrap">
      <div class="nearby-scroll" id="${_nearbyId}">
        ${nearby.map(np => {
          const img = np.photos?.[0];
          return `<div class="nearby-mini-card" onclick="openModal('${np.id}')">
            <div class="nearby-mini-img">${img ? `<img src="${img}" loading="lazy">` : typeIcon(np.type)}</div>
            <div class="nearby-mini-body">
              <div class="nearby-mini-price">${fmtPrice(np.price,np.tx)}</div>
              <div class="nearby-mini-title">${sanitize(np.title||'')}</div>
              <div class="nearby-mini-loc"><i class="fas fa-map-marker-alt"></i> ${sanitize(np.location||'')}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

(function initBangkokHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Preload Bangkok skyline photo
  const bgImg = new Image();
  bgImg.src = '/bannerWeb.webp';

  function resize() {
    // offsetWidth อาจเป็น 0 บน desktop full-screen ตอนโหลดครั้งแรก
    // (canvas เป็น position:absolute ยังไม่ paint) → fallback ด้วย parentElement หรือ window
    const parent = canvas.parentElement;
    const w = canvas.offsetWidth || (parent && parent.offsetWidth) || window.innerWidth || 1280;
    const h = canvas.offsetHeight || (parent && parent.offsetHeight) || 500;
    // อัพเดตเฉพาะถ้าขนาดเปลี่ยน เพื่อไม่ล้าง canvas โดยไม่จำเป็น
    if(canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }
  }
  // Resize ทันที (อาจได้ 0 ถ้า layout ยังไม่เสร็จ)
  resize();
  // Resize อีกครั้งหลัง first paint — ได้ขนาดจริงเสมอ
  requestAnimationFrame(() => { resize(); });
  // Resize อีกครั้งหลัง load เสร็จ — รองรับกรณี CSS ยังโหลดช้า
  window.addEventListener('load', () => { resize(); }, {once: true});
  window.addEventListener('resize', () => { resize(); });

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Stars (night only) ──
  const stars_pos = Array.from({length:80}, () => ({
    x: Math.random(), y: Math.random() * 0.55,
    r: 0.5 + Math.random() * 1.5,
    twinkle: Math.random() * Math.PI * 2
  }));
  function drawStars(alpha) {
    if(alpha <= 0) return;
    stars_pos.forEach(s => {
      s.twinkle += 0.04;
      const a = alpha * (0.5 + Math.sin(s.twinkle) * 0.4);
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    });
  }

  // ── Sun/Moon ──
  function drawSunMoon(cyclePos) {
    const isMoon = cyclePos > 0.5;
    const progress = isMoon ? (cyclePos - 0.5) * 2 : cyclePos * 2;
    const x = canvas.width * (0.12 + progress * 0.76);
    const y = canvas.height * (0.18 - Math.sin(progress * Math.PI) * 0.12);
    if(isMoon) {
      ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(200,220,255,0.5)';
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI*2);
      ctx.fillStyle = '#e8f0ff'; ctx.fill();
      ctx.beginPath(); ctx.arc(x+8, y-4, 14, 0, Math.PI*2);
      const nd = (cyclePos - 0.5) * 2;
      ctx.fillStyle = nd > 0.5 ? '#050e22' : '#0a1830'; ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.shadowBlur = 50; ctx.shadowColor = 'rgba(255,200,50,.8)';
      ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI*2);
      const sg = ctx.createRadialGradient(x,y,0,x,y,24);
      sg.addColorStop(0,'#fff7a0'); sg.addColorStop(0.5,'#ffdd00'); sg.addColorStop(1,'#ffaa00');
      ctx.fillStyle = sg; ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  // ── Day/Night overlay on the photo ──
  function drawDayNightOverlay(cyclePos, nightAlpha) {
    const W = canvas.width, H = canvas.height;
    const dayAlpha = 1 - nightAlpha;

    if(dayAlpha > 0) {
      // Day: sky-blue gradient — strong at top, fades before buildings
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      skyGrad.addColorStop(0,   `rgba(130,195,240,${dayAlpha * 0.62})`);
      skyGrad.addColorStop(0.5, `rgba(150,210,245,${dayAlpha * 0.38})`);
      skyGrad.addColorStop(1,   `rgba(170,225,250,0)`);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.55);
    }

    if(nightAlpha > 0) {
      // Night: dark blue overlay
      ctx.fillStyle = `rgba(5,10,35,${nightAlpha * 0.72})`;
      ctx.fillRect(0, 0, W, H);
      // Moon glow
      const moonProgress = (cyclePos > 0.5) ? (cyclePos - 0.5) * 2 : 0;
      if(moonProgress > 0) {
        const mx = W * (0.12 + moonProgress * 0.76);
        const my = H * (0.18 - Math.sin(moonProgress * Math.PI) * 0.12);
        const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, H * 0.45);
        moonGlow.addColorStop(0, `rgba(100,140,255,${nightAlpha * 0.12})`);
        moonGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(0, 0, W, H);
      }
      // City lights shimmer on buildings (bottom portion)
      ctx.fillStyle = `rgba(255,200,80,${nightAlpha * 0.08})`;
      ctx.fillRect(0, H * 0.6, W, H * 0.4);
    }

    // Dusk/dawn: warm orange tint
    const duskProgress = (cyclePos > 0.4 && cyclePos < 0.6)
      ? 1 - Math.abs((cyclePos - 0.5) * 10) : 0;
    if(duskProgress > 0) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgba(255,120,20,${duskProgress * 0.35})`);
      grad.addColorStop(0.5, `rgba(255,80,20,${duskProgress * 0.2})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── Birds ──
  const birds = Array.from({length: 6}, (_, i) => ({
    x: Math.random() * 1.5 - 0.3,   // 0..1 relative to canvas width (can be off-screen)
    y: 0.05 + Math.random() * 0.3,   // top 35% of canvas
    speed: 0.0006 + Math.random() * 0.0008,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.12 + Math.random() * 0.08,
    size: 4 + Math.random() * 5,
    waveAmp: 0.008 + Math.random() * 0.01,   // vertical wave amplitude (relative)
    waveFreq: 0.8 + Math.random() * 0.6,
    frameOffset: Math.floor(Math.random() * 400),
  }));

  function drawBirds(frame, nightAlpha) {
    // Birds are visible during day and dusk, fade in night
    const birdAlpha = Math.max(0, 1 - nightAlpha * 1.5);
    if(birdAlpha <= 0) return;

    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.strokeStyle = `rgba(20,20,50,${birdAlpha * 0.75})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    birds.forEach(bird => {
      const f = (frame + bird.frameOffset) * bird.speed;
      // Horizontal position wraps around
      const bx = ((bird.x + f) % 1.3) - 0.15;
      // Gentle vertical wave
      const by = bird.y + Math.sin(f * bird.waveFreq * Math.PI * 2) * bird.waveAmp;

      const x = bx * W;
      const y = by * H;
      const s = bird.size;

      // Wing flap
      bird.wingPhase += bird.wingSpeed;
      const wingLift = Math.sin(bird.wingPhase) * 0.5; // -0.5 .. 0.5

      // Simple bird: two curved wings as arcs
      ctx.beginPath();
      // Left wing
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - s * 0.7, y - s * wingLift, x - s * 1.4, y + s * 0.1);
      // Right wing
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s * 0.7, y - s * wingLift, x + s * 1.4, y + s * 0.1);
      ctx.stroke();
    });
    ctx.restore();
  }

  let frame = 0;
  let cycleDuration = 4800;
  let nightAlpha = 0;
  let canvasVisible = true; // tracked by IntersectionObserver

  // Pause animation when canvas is scrolled out of viewport
  if(window.IntersectionObserver) {
    new IntersectionObserver(entries => {
      canvasVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  function drawFrame() {
    // Pause when tab is hidden or canvas is off-screen — saves CPU/GPU
    if(document.hidden || !canvasVisible) {
      requestAnimationFrame(drawFrame);
      return;
    }
    frame++;
    const cyclePos = (frame % cycleDuration) / cycleDuration;
    // Smooth ease function (sine)
    const ease = t => (1 - Math.cos(t * Math.PI)) / 2;
    // day: 0.0–0.35 | dawn transition: 0.35–0.55 | night: 0.55–0.85 | dusk transition: 0.85–1.0+0.0–0.0(wrap)
    if(cyclePos < 0.35) nightAlpha = 0;
    else if(cyclePos < 0.55) nightAlpha = ease((cyclePos - 0.35) / 0.20);
    else if(cyclePos < 0.85) nightAlpha = 1;
    else nightAlpha = 1 - ease((cyclePos - 0.85) / 0.15);
    nightAlpha = Math.max(0, Math.min(1, nightAlpha));

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 1. Draw Bangkok skyline photo as background (cover, focus on buildings at 60% vertical)
    if(bgImg.complete && bgImg.naturalWidth > 0) {
      const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
      const canvasAspect = W / H;
      let dw, dh, dx, dy;
      if(canvasAspect > imgAspect) {
        // Canvas wider than image → scale by width, center vertically (clamp so no negative offset)
        dw = W; dh = W / imgAspect; dx = 0;
        dy = Math.min(0, (H - dh) / 2);
      } else {
        // Canvas taller than image → scale by height, center horizontally
        dh = H; dw = H * imgAspect;
        dx = (W - dw) / 2; dy = 0;
      }
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } else {
      // Fallback sky gradient while image loads
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, nightAlpha > 0.5 ? '#040d20' : '#1e6db0');
      grd.addColorStop(1, nightAlpha > 0.5 ? '#0a1828' : '#7ab8dc');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Day/Night overlay
    drawDayNightOverlay(cyclePos, nightAlpha);

    // 3. Stars (appear at night, above image)
    drawStars(nightAlpha);

    // 4. Sun/Moon
    drawSunMoon(cyclePos);

    // 5. Birds (daytime)
    drawBirds(frame, nightAlpha);

    requestAnimationFrame(drawFrame);
  }

  // บนมือถือ: ไม่รัน animation — ใช้ CSS background แทน ประหยัด CPU มาก
  if(window.innerWidth <= 768 || navigator.maxTouchPoints > 0){
    canvas.style.display = 'none';
    return;
  }

  // Start when image is ready (or immediately if already loaded)
  // ใช้ RAF เพื่อให้แน่ใจว่า resize() ได้รับขนาดจริงก่อน drawFrame ครั้งแรก
  function startDrawing() {
    resize(); // ensure canvas has correct size before first draw
    drawFrame();
  }
  if(bgImg.complete) {
    requestAnimationFrame(startDrawing);
  } else {
    bgImg.onload = () => requestAnimationFrame(startDrawing);
    // Also start drawing immediately so night/day still works if img is slow
    setTimeout(startDrawing, 100);
  }
})();

// Weather badge removed — was showing fake/random weather data (misleading UX)

// Counter animation for portfolio and other stat pages
function animateCounter(el, target, duration=1600) {
  if(!el) return;
  el.textContent = '0';
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target);
    if(progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  }
  requestAnimationFrame(update);
}

function triggerPageCounters(pageId) {
  // ถ้าข้อมูลจริงพร้อมแล้ว ให้ syncAllStats() จัดการตัวเลขแทน
  // เพื่อป้องกัน data-target mock ใน HTML ทับตัวเลขจริงจาก Supabase
  if(window._dataReady && typeof syncAllStats === 'function') {
    syncAllStats();
    return;
  }
  setTimeout(() => {
    // double-check อีกครั้งหลัง timeout — อาจ loadData เสร็จระหว่างรอ
    if(window._dataReady && typeof syncAllStats === 'function') {
      syncAllStats();
      return;
    }
    const page = document.getElementById('page-' + pageId);
    if(!page) return;
    page.querySelectorAll('.suf-num[data-target]').forEach(el => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      if(!isNaN(target)) animateCounter(el, target, 1600);
    });
  }, 120);
}

// IntersectionObserver — trigger counter when card scrolls into view
function initCounterObserver() {
  if(!window.IntersectionObserver) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      // ถ้าข้อมูลจริงพร้อมแล้ว ให้ syncAllStats() จัดการแทน
      // ป้องกัน Observer ยิง data-target mock ทับตัวเลขจริงจาก Supabase
      if(window._dataReady && typeof syncAllStats === 'function') {
        obs.disconnect();
        syncAllStats();
        return;
      }
      const card = entry.target;
      card.querySelectorAll('.suf-num[data-target]').forEach(el => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        if(!isNaN(target)) animateCounter(el, target, 1600);
      });
      obs.unobserve(card);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.stat-counter-card, .hcounter').forEach(c => obs.observe(c));
}

let gcItems = [];
let gcIdx = 0;
let gcDragging = false;
let gcStartX = 0;
let gcDragDelta = 0;
let gcAutoTimer = null;

function renderGalleryCarousel() {
  const track = document.getElementById('gc-track');
  const recGrid = document.getElementById('rec-grid');
  if(!track) return;

  const recProps = [...props].sort((a,b) => {
    if(a.isRec && !b.isRec) return -1;
    if(!a.isRec && b.isRec) return 1;
    if(a.isNew && !b.isNew) return -1;
    return 0;
  }).slice(0, 12);

  gcItems = recProps;
  if(recGrid) recGrid.innerHTML = '<div class="prop-grid">' + recProps.map(propCard).join('') + '</div>';

  track.innerHTML = recProps.map((p, i) => {
    const img = p.photos?.[0];
    const badge = p.isRec ? '<span class="rec-badge rec-badge-rec">🔥 Hot</span>' :
                  (p.isNew ? '<span class="rec-badge rec-badge-new">✨ ใหม่</span>' : '');
    const txBadge = p.tx==='RENT'
      ? '<span class="rec-badge rec-badge-rent">เช่า</span>'
      : '<span class="rec-badge rec-badge-buy">ขาย</span>';
    return `<div class="gc-card${i===0?' gc-active':''}" data-idx="${i}" onclick="if(Math.abs(gcDragDelta)<8)openModal('${p.id}')">
      <div class="gc-card-img">
        ${img ? `<img src="${img}" loading="lazy" alt="${p.title}">` : typeIcon(p.type)}
        <div class="gc-card-badges">${badge}${txBadge}</div>
      </div>
      <div class="gc-card-body">
        <div class="gc-card-price">${fmtPrice(p.price, p.tx)}</div>
        <div class="gc-card-title">${sanitize(p.title||'')}</div>
        <div class="gc-card-loc"><i class="fas fa-map-marker-alt"></i> ${sanitize(p.location||p.province||'')}</div>
      </div>
    </div>`;
  }).join('');

  gcRenderDots();
  gcApply(false);
  gcInitDrag();
  gcStartAuto();
}

function gcCardW() {
  const wrap = document.getElementById('gc-wrap');
  if(!wrap) return 280;
  const ww = wrap.offsetWidth;
  return Math.min(260 + 20, ww * 0.75);
}

function gcApply(animate=true) {
  const track = document.getElementById('gc-track');
  if(!track) return;
  const cw = gcCardW();
  const wrap = document.getElementById('gc-wrap');
  const ww = wrap ? wrap.offsetWidth : 800;
  const offset = ww / 2 - cw / 2 - gcIdx * (cw);
  track.style.transition = animate ? 'transform .5s cubic-bezier(.25,.46,.45,.94)' : 'none';
  track.style.transform = `translateX(${offset}px)`;
  // Update card classes
  track.querySelectorAll('.gc-card').forEach((c, i) => {
    c.classList.remove('gc-active','gc-adjacent');
    if(i === gcIdx) c.classList.add('gc-active');
    else if(Math.abs(i - gcIdx) === 1) c.classList.add('gc-adjacent');
  });
  gcRenderDots();
}

function gcMove(dir) {
  gcStopAuto();
  gcIdx = Math.max(0, Math.min(gcItems.length - 1, gcIdx + dir));
  gcApply(true);
  gcStartAuto();
}

function gcGoTo(i) {
  gcStopAuto();
  gcIdx = i;
  gcApply(true);
  gcStartAuto();
}

function gcRenderDots() {
  const dots = document.getElementById('gc-dots');
  if(!dots || gcItems.length === 0) return;
  dots.innerHTML = gcItems.map((_, i) =>
    `<div class="gc-dot${i===gcIdx?' active':''}" onclick="gcGoTo(${i})"></div>`
  ).join('');
}

function gcInitDrag() {
  const wrap = document.getElementById('gc-wrap');
  if(!wrap) return;
  let _startY = 0, _isVert = false;
  const onDown = e => {
    gcStopAuto();
    gcDragging = false;
    gcStartX = e.touches ? e.touches[0].clientX : e.clientX;
    _startY = e.touches ? e.touches[0].clientY : 0;
    _isVert = false;
    gcDragDelta = 0;
    wrap.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:true});
    document.addEventListener('touchend', onUp);
  };
  const onMove = e => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : 0;
    const dx = x - gcStartX;
    const dy = y - _startY;
    if(!gcDragging && e.touches) {
      if(Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        _isVert = Math.abs(dy) > Math.abs(dx);
        if(!_isVert) gcDragging = true;
      }
    } else if(!e.touches) {
      gcDragDelta = dx;
      if(Math.abs(gcDragDelta) > 8) gcDragging = true;
    }
    if(!_isVert) gcDragDelta = dx;
  };
  const onUp = () => {
    wrap.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    if(!_isVert && Math.abs(gcDragDelta) > 50) gcMove(gcDragDelta < 0 ? 1 : -1);
    setTimeout(() => { gcDragging = false; }, 50);
    _isVert = false;
    gcStartAuto();
  };
  wrap.addEventListener('mousedown', onDown);
  wrap.addEventListener('touchstart', onDown, {passive:true});
}

function gcStartAuto() {
  gcStopAuto();
  gcAutoTimer = setInterval(() => {
    gcIdx = gcIdx >= gcItems.length - 1 ? 0 : gcIdx + 1;
    gcApply(true);
  }, 4000);
}
function gcStopAuto() {
  if(gcAutoTimer) { clearInterval(gcAutoTimer); gcAutoTimer = null; }
}

// cardSlide is defined above at line ~4412 — duplicate removed

function nearbyScroll(id, dir) {
  const inner = document.getElementById(id);
  if(!inner) return;
  // scroll on the overflow wrapper (parent of nearby-scroll)
  const wrap = inner.parentElement;
  if(!wrap) return;
  const scrollAmount = 160 * 1.5; // approx 1.5 cards
  wrap.scrollBy({left: dir * scrollAmount, behavior: 'smooth'});
}

function toggleModalFav() {
  if(!window._currentModalId) return;
  toggleFav(window._currentModalId);
  const _isFaved = favs.includes(window._currentModalId);
  const _favBtn = $('m-fav-btn');
  const _favLabel = $('m-fav-label');
  if(_favBtn){ _favBtn.className='modal-fav-btn'+(_isFaved?' favorited':''); _favBtn.innerHTML=_isFaved?'<i class="fas fa-heart"></i>':'<i class="far fa-heart"></i>'; }
  if(_favLabel){ _favLabel.textContent=_isFaved?ui('modal.fav.added'):ui('modal.fav.add'); }
}

function renderNewGallery(list) {
  const track = $('new-track');
  if(!track) return;
  if(!list || !list.length) {
    track.innerHTML = '<div style="padding:20px;color:var(--gr)">ไม่พบรายการ</div>';
    return;
  }
  track.innerHTML = list.map(p => propCard(p)).join('');
  // Init swipe after render: horizontal gallery wrap + individual card image sliders
  setTimeout(() => { initHGallerySwipe('new-track-wrap'); initAllCardSwipes(); }, 100);
}

function hGalleryMove(trackId, dir) {
  const track = document.getElementById(trackId);
  if(!track) return;
  const wrap = track.parentElement;
  if(!wrap) return;
  const scrollAmt = wrap.offsetWidth * 0.8;
  wrap.scrollBy({left: dir * scrollAmt, behavior: 'smooth'});
}

function initHGallerySwipe(wrapId) {
  const wrap = document.getElementById(wrapId);
  if(!wrap) return;
  let startX = 0, startY = 0, startScroll = 0, isDragging = false, moved = 0, isVertical = false;
  // Touch: only hijack horizontal swipes, let vertical pass to page scroll
  wrap.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startScroll = wrap.scrollLeft;
    isDragging = false; moved = 0; isVertical = false;
  }, {passive:true});
  wrap.addEventListener('touchmove', e => {
    const dx = startX - e.touches[0].clientX;
    const dy = startY - e.touches[0].clientY;
    if(!isDragging) {
      // Determine direction on first significant move
      if(Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isVertical = Math.abs(dy) > Math.abs(dx);
        isDragging = true;
      }
    }
    if(isDragging && !isVertical) {
      moved = Math.abs(dx);
      wrap.scrollLeft = startScroll + dx;
    }
    // If vertical, do nothing — browser handles page scroll
  }, {passive:true});
  wrap.addEventListener('touchend', () => { isDragging = false; moved = 0; isVertical = false; });
  // Mouse drag (desktop)
  wrap.addEventListener('mousedown', e => {
    startX = e.clientX;
    startScroll = wrap.scrollLeft;
    isDragging = true;
    moved = 0;
    wrap.classList.add('dragging');
  });
  window.addEventListener('mousemove', e => {
    if(!isDragging) return;
    const dx = startX - e.clientX;
    moved = Math.abs(dx);
    wrap.scrollLeft = startScroll + dx;
  });
  window.addEventListener('mouseup', () => {
    if(!isDragging) return;
    isDragging = false;
    wrap.classList.remove('dragging');
  });
  // Block click only if dragged
  wrap.addEventListener('click', e => {
    if(moved > 5) { e.stopPropagation(); e.preventDefault(); }
    moved = 0;
  }, true);
}


(function() {
  let gl, prog, posBuf, texBuf, tex;
  let yaw = 0, pitch = 0, fov = 75;
  let dragging360 = false, lastX360 = 0, lastY360 = 0;
  let animId360 = null;
  let hintTimer = null;
  const canvas360 = document.getElementById('tour360-canvas');

  function initGL() {
    if (!canvas360) return false;
    gl = canvas360.getContext('webgl') || canvas360.getContext('experimental-webgl');
    if (!gl) return false;

    const vsrc = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main(){v_uv=a_pos;gl_Position=vec4(a_pos,0.,1.);}`;
    const fsrc = `
      precision mediump float;
      uniform sampler2D u_tex;
      uniform float u_yaw;
      uniform float u_pitch;
      uniform float u_fov;
      varying vec2 v_uv;
      const float PI=3.14159265;
      void main(){
        float fovR=u_fov*PI/180.;
        float aspect=float(${canvas360.width})/float(${canvas360.height});
        vec2 ndc=v_uv*vec2(aspect,1.)*tan(fovR*.5);
        vec3 ray=normalize(vec3(ndc.x,ndc.y,-1.));
        // rotate by yaw
        float cy=cos(u_yaw),sy=sin(u_yaw);
        vec3 r1=vec3(cy*ray.x+sy*ray.z,ray.y,-sy*ray.x+cy*ray.z);
        // rotate by pitch
        float cp=cos(u_pitch),sp=sin(u_pitch);
        vec3 r2=vec3(r1.x,cp*r1.y-sp*r1.z,sp*r1.y+cp*r1.z);
        float lon=atan(r2.x,-r2.z);
        float lat=asin(clamp(r2.y,-1.,1.));
        vec2 uv=vec2((lon+PI)/(2.*PI),(.5-lat/PI));
        gl_FragColor=texture2D(u_tex,uv);
      }`;

    function makeShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    prog = gl.createProgram();
    gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    return true;
  }

  function loadTex(url, cb) {
    tex = gl.createTexture();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (cb) cb();
    };
    img.onerror = () => {
      // fallback: generate a colorful gradient panorama texture on canvas
      const fc = document.createElement('canvas');
      fc.width = 1024; fc.height = 512;
      const fctx = fc.getContext('2d');
      const grd = fctx.createLinearGradient(0,0,fc.width,fc.height);
      grd.addColorStop(0,'#0a1628'); grd.addColorStop(0.3,'#1b3a6b');
      grd.addColorStop(0.5,'#2d6a4f'); grd.addColorStop(0.7,'#1b3a6b');
      grd.addColorStop(1,'#0a1628');
      fctx.fillStyle=grd; fctx.fillRect(0,0,fc.width,fc.height);
      // Draw some "windows"
      for(let i=0;i<30;i++){
        fctx.fillStyle=`rgba(255,220,100,${0.3+Math.random()*0.5})`;
        fctx.fillRect(50+i*32+Math.random()*10,200+Math.random()*80,8+Math.random()*8,12+Math.random()*12);
      }
      fctx.fillStyle='rgba(255,255,255,0.08)'; fctx.fillRect(0,fc.height*0.5,fc.width,fc.height*0.5);
      fctx.font='bold 28px sans-serif'; fctx.fillStyle='rgba(255,255,255,0.15)'; fctx.textAlign='center';
      fctx.fillText('Virtual Tour (Demo)',fc.width/2,fc.height/2);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fc);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      if (cb) cb();
    };
    img.src = url;
  }

  function draw360() {
    if (!gl || !prog || !tex) return;
    canvas360.width = canvas360.parentElement.clientWidth || 600;
    canvas360.height = 220;
    gl.viewport(0, 0, canvas360.width, canvas360.height);
    gl.useProgram(prog);
    gl.uniform1f(gl.getUniformLocation(prog,'u_yaw'), yaw);
    gl.uniform1f(gl.getUniformLocation(prog,'u_pitch'), pitch);
    gl.uniform1f(gl.getUniformLocation(prog,'u_fov'), fov);
    gl.uniform1i(gl.getUniformLocation(prog,'u_tex'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // slow auto-rotate when not dragging
    if (!dragging360) yaw += 0.003;
    animId360 = requestAnimationFrame(draw360);
  }

  function stop360() {
    if (animId360) { cancelAnimationFrame(animId360); animId360 = null; }
  }

  window.toggle360 = function() {
    const vw = document.getElementById('m-360-viewer-wrap');
    const chevron = document.getElementById('m-360-chevron');
    if (!vw) return;
    const isOpen = vw.style.display !== 'none';
    if (isOpen) {
      // Close
      vw.style.display = 'none';
      if (chevron) chevron.style.transform = '';
      stop360();
    } else {
      // Open — load if not yet loaded
      vw.style.display = 'block';
      if (chevron) chevron.style.transform = 'rotate(180deg)';
      open360(window._current360Url);
    }
  };

  window.open360 = function(panoramaUrl) {
    const wrap = document.getElementById('m-360-wrap');
    if (!wrap) return;
    stop360();
    yaw = 0; pitch = 0; fov = 75;
    if (!canvas360) return;
    if (!gl) { if (!initGL()) { const vw = document.getElementById('m-360-viewer-wrap'); if(vw) vw.innerHTML = '<div style="padding:16px;color:var(--gr);text-align:center"><i class="fas fa-street-view" style="font-size:32px;display:block;margin-bottom:8px;opacity:.4"></i>เบราว์เซอร์ไม่รองรับ WebGL</div>'; return; } }
    const hint = wrap.querySelector('.tour360-hint');
    loadTex(panoramaUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Equirectangular_projection_SW.jpg/1280px-Equirectangular_projection_SW.jpg', () => { draw360(); });
    // Drag events
    const viewer = document.getElementById('m-360-viewer');
    if (viewer && !viewer._360init) {
      viewer._360init = true;
      viewer.addEventListener('mousedown', e => { dragging360=true; lastX360=e.clientX; lastY360=e.clientY; viewer.classList.add('dragging'); if(hint){hint.classList.add('hidden');} });
      window.addEventListener('mousemove', e => { if(!dragging360) return; yaw -= (e.clientX-lastX360)*0.005; pitch += (e.clientY-lastY360)*0.005; pitch=Math.max(-1.4,Math.min(1.4,pitch)); lastX360=e.clientX; lastY360=e.clientY; });
      window.addEventListener('mouseup', () => { dragging360=false; viewer.classList.remove('dragging'); });
      viewer.addEventListener('touchstart', e => { dragging360=true; lastX360=e.touches[0].clientX; lastY360=e.touches[0].clientY; if(hint)hint.classList.add('hidden'); }, {passive:true});
      viewer.addEventListener('touchmove', e => { if(!dragging360)return; yaw-=(e.touches[0].clientX-lastX360)*0.006; pitch+=(e.touches[0].clientY-lastY360)*0.006; pitch=Math.max(-1.4,Math.min(1.4,pitch)); lastX360=e.touches[0].clientX; lastY360=e.touches[0].clientY; }, {passive:true});
      viewer.addEventListener('touchend', () => { dragging360=false; });
      viewer.addEventListener('wheel', e => { fov=Math.max(30,Math.min(120,fov+e.deltaY*0.05)); e.preventDefault(); }, {passive:false});
    }
    if(hint){clearTimeout(hintTimer); hint.classList.remove('hidden'); hintTimer=setTimeout(()=>hint.classList.add('hidden'),3000);}
  };

  window.close360 = function() {
    stop360();
    const vw = document.getElementById('m-360-viewer-wrap');
    const chevron = document.getElementById('m-360-chevron');
    if (vw) vw.style.display = 'none';
    if (chevron) chevron.style.transform = '';
  };
})();

async function init(){
  applyConfig();
  renderPriceOpts();
  renderCats();
  setupUpload();
  await loadData();
  initCookieConsent();
  triggerPageCounters('home');
  // ── defer non-critical init to idle time ──────────────────────
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 200));
  idle(() => {
    initCounterObserver();
    lazyLoadImages();
    applyLang();
    // Float bubble — show after 2s, hide after 8s
    setTimeout(()=>{
      const b=$('float-bubble');
      if(b){b.style.display='block'; setTimeout(()=>{if(b)b.style.display='none';},6000);}
    },2000);
  });
}
function toggleHamburger(){
  const nav=document.getElementById('nav-links');
  const hb=document.getElementById('hamburger');
  if(!nav||!hb)return;
  nav.classList.toggle('mob-open');
  hb.classList.toggle('active');
}
// Close hamburger when clicking outside (dd-panel clicks must not trigger close)
document.addEventListener('click',e=>{
  const nav=document.getElementById('nav-links');
  const hb=document.getElementById('hamburger');
  if(nav&&hb&&!e.target.closest('#nav-links')&&!e.target.closest('#hamburger')&&!e.target.closest('.dd-panel')){
    nav.classList.remove('mob-open');
    hb.classList.remove('active');
  }
});

const LANG_META = {
  th: { flag:'🇹🇭', code:'TH' },
  en: { flag:'🇬🇧', code:'EN' },
  cn: { flag:'🇨🇳', code:'中文' },
  ja: { flag:'🇯🇵', code:'日本語' },
};
const I18N_DICT = {
  /* ── MY ACCOUNT ── */
  'ph.ma.back':        {th:'กลับหน้าหลัก',      en:'Back to Home',      cn:'返回首页',   ja:'ホームへ'},
  'ph.ma.h1':          {th:'บัญชีของฉัน',        en:'My Account',        cn:'我的账户',   ja:'マイアカウント'},
  'ma.tab.profile':    {th:'โปรไฟล์',            en:'Profile',           cn:'个人资料',   ja:'プロフィール'},
  'ma.tab.favs':       {th:'รายการโปรด',         en:'Saved',             cn:'收藏',       ja:'お気に入り'},
  'ma.tab.listings':   {th:'ประกาศของฉัน',       en:'My Listings',       cn:'我的房源',   ja:'掲載中'},
  'ma.tab.requests':   {th:'คำขอซื้อ/เช่า',      en:'Requests',          cn:'购买/租赁',  ja:'リクエスト'},
  'ma.tab.history':    {th:'ประวัติดู',           en:'History',           cn:'浏览记录',   ja:'閲覧履歴'},
  'ma.tab.alerts':     {th:'แจ้งเตือน',           en:'Alerts',            cn:'提醒',       ja:'通知'},
  'ma.profile.title':  {th:'ข้อมูลส่วนตัว',      en:'Personal Info',     cn:'个人信息',   ja:'個人情報'},
  'ma.profile.name':   {th:'ชื่อที่แสดง',         en:'Display Name',      cn:'显示名称',   ja:'表示名'},
  'ma.profile.phone':  {th:'เบอร์โทรศัพท์',      en:'Phone Number',      cn:'电话号码',   ja:'電話番号'},
  'ma.profile.line':   {th:'LINE ID',             en:'LINE ID',           cn:'LINE ID',    ja:'LINE ID'},
  'ma.profile.email':  {th:'อีเมล',               en:'Email',             cn:'邮箱',       ja:'メール'},
  'ma.profile.save':   {th:'บันทึกข้อมูล',        en:'Save Changes',      cn:'保存更改',   ja:'保存する'},
  'ma.profile.logout': {th:'ออกจากระบบ',          en:'Sign Out',          cn:'退出登录',   ja:'ログアウト'},
  'ma.favs.empty':     {th:'ยังไม่มีรายการโปรด', en:'No saved listings', cn:'暂无收藏',   ja:'保存なし'},
  'ma.favs.browse':    {th:'เรียกดูประกาศ',       en:'Browse Listings',   cn:'浏览房源',   ja:'物件を探す'},
  'ma.listings.empty': {th:'ยังไม่มีประกาศ',      en:'No listings yet',   cn:'暂无房源',   ja:'掲載なし'},
  'ma.listings.add':   {th:'ฝากทรัพย์กับเรา',    en:'List a Property',   cn:'发布房源',   ja:'物件を登録'},
  'ma.requests.empty': {th:'ยังไม่มีคำขอ',        en:'No requests yet',   cn:'暂无请求',   ja:'リクエストなし'},
  'ma.history.empty':  {th:'ยังไม่มีประวัติ',     en:'No history yet',    cn:'暂无记录',   ja:'履歴なし'},
  'ma.alerts.empty':   {th:'ยังไม่มีการแจ้งเตือน',en:'No alerts set',     cn:'暂无提醒',   ja:'通知なし'},
  'ma.coming.soon':    {th:'เร็วๆ นี้',           en:'Coming soon',       cn:'即将推出',   ja:'近日公開'},
  'ma.member.since':   {th:'สมาชิกตั้งแต่',       en:'Member since',      cn:'加入时间',   ja:'登録日'},
  'ma.login.prompt.h': {th:'เข้าสู่ระบบเพื่อดูบัญชีของคุณ', en:'Sign in to view your account', cn:'登录查看您的账户', ja:'アカウントを表示するにはログイン'},
  'ma.login.prompt.p': {th:'จัดการโปรไฟล์ รายการโปรด และประกาศของคุณ ได้ในที่เดียว', en:'Manage your profile, saved listings, and property postings in one place.', cn:'在一处管理您的个人资料、收藏和房源。', ja:'プロフィール、保存済み物件、掲載物件を一か所で管理できます。'},
  'ma.login.btn':      {th:'เข้าสู่ระบบ',         en:'Sign In',           cn:'登录',       ja:'ログイン'},
  'ma.guest.btn':      {th:'เข้าชมเว็บก่อน',      en:'Continue browsing', cn:'先浏览网站',  ja:'そのまま閲覧'},
  'fab.profile.title': {th:'บัญชีของฉัน',         en:'My Account',        cn:'我的账户',   ja:'マイアカウント'},
  /* ── NAV ── */
  'nav.new':        {th:'มาใหม่',     en:'New',           cn:'最新',      ja:'新着'},
  'nav.hot':        {th:'Hot',         en:'Hot',           cn:'热门',      ja:'人気'},
  'nav.portfolio':  {th:'ผลงาน',       en:'Portfolio',     cn:'案例',      ja:'実績'},
  'nav.blog':       {th:'บทความ',      en:'Blog',          cn:'博客',      ja:'ブログ'},
  'nav.agents':     {th:'ตัวแทน',      en:'Agents',        cn:'经纪人',    ja:'エージェント'},
  'nav.deposit':    {th:'ฝากทรัพย์',   en:'List Property', cn:'委托房产',  ja:'物件登録'},
  'nav.prop':       {th:'ซื้อขายอสังหาฯ', en:'Properties',    cn:'房产',      ja:'不動産'},
  'nav.rent':       {th:'อสังหาฯเช่า',   en:'Rentals',       cn:'租赁房产',  ja:'賃貸物件'},
  'nav.service':    {th:'บริการอื่นๆ', en:'Services',      cn:'其他服务',  ja:'サービス'},
  /* ── HERO ── */
  'hero.badge':     {th:'แพลตฟอร์มอสังหาฯ ที่คุณไว้วางใจ ✨', en:"Thailand's Trusted Real Estate Platform ✨", cn:'泰国最值得信赖的房产平台 ✨', ja:'タイ信頼No.1不動産プラットフォーム ✨'},
  'hero.h1':        {th:'<span>อสังหาริมทรัพย์</span>ที่ใช่<br><span class="hero-white">ใน</span><span>สไตล์</span>ที่เป็นคุณ', en:'Find Your Perfect<br><span>Property</span>', cn:'寻找您的<br><span>理想房产</span>', ja:'あなたの<br><span>理想の物件</span>を探す'},
  'hero.sub':       {th:'บ้าน คอนโด ที่ดิน ทุกประเภท ทุกทำเล ราคาดีที่สุด', en:'Houses, Condos, Land — All Types, Best Prices in Thailand', cn:'住宅、公寓、土地 — 各种类型，全泰最优价格', ja:'一戸建て・コンド・土地 — あらゆる種類、タイ最良価格'},
  'hero.buy.label': {th:'ซื้อ',         en:'Buy',           cn:'购买',      ja:'購入'},
  'hero.rent.label':{th:'เช่า',         en:'Rent',          cn:'租赁',      ja:'賃貸'},
  'hero.all.label': {th:'ทั้งหมด',      en:'All',           cn:'全部',      ja:'すべて'},
  'hero.search.btn':{th:'ค้นหา',        en:'Search',        cn:'搜索',      ja:'検索'},
  'nav.addline':    {th:'Add LINE — ติดต่อเรา', en:'Add LINE — Contact Us', cn:'加 LINE — 联系我们', ja:'LINE追加 — お問い合わせ'},
  /* ── STATS ── */
  'stat.prop':      {th:'อสังหาริมทรัพย์', en:'Properties',  cn:'房产项目',  ja:'物件数'},
  'stat.agents':    {th:'ตัวแทนมืออาชีพ', en:'Pro Agents',  cn:'专业经纪人', ja:'プロエージェント'},
  'stat.closed':    {th:'ปิดการขายแล้ว',  en:'Deals Closed', cn:'成交案例',  ja:'成約件数'},
  /* ── SECTIONS ── */
  'sec.proptype':   {th:'ประเภทอสังหาริมทรัพย์', en:'Property Types', cn:'房产类型', ja:'物件タイプ'},
  'sec.pricerange': {th:'ช่วงราคา',      en:'Price Range',   cn:'价格区间',  ja:'価格帯'},
  'sec.blog':       {th:'บทความน่ารู้',  en:'Blog & News',   cn:'博客与资讯', ja:'ブログ・ニュース'},
  'sec.port':       {th:'ผลงาน',          en:'Portfolio',     cn:'案例展示',   ja:'実績'},
  /* ── MODAL POPUP ── */
  'modal.rec.title':  {th:'🔥 ยอดนิยม',       en:'🔥 Hot Properties', cn:'🔥 热门房源',  ja:'🔥 人気物件'},
  'modal.new.title':  {th:'✨ มาใหม่ล่าสุด',   en:'✨ Latest Listings', cn:'✨ 最新房源',   ja:'✨ 最新物件'},
  'modal.srv.title':  {th:'บริการทั้งหมด',    en:'All Services',      cn:'全部服务',    ja:'全サービス'},
  'modal.blog.title': {th:'บทความทั้งหมด',    en:'All Articles',      cn:'全部文章',    ja:'全記事'},
  'modal.found':      {th:'พบ',               en:'Found',             cn:'找到',       ja:''},
  'modal.items':      {th:'รายการ',            en:'listings',          cn:'个房源',     ja:'件'},
  'modal.viewall':    {th:'ดูประกาศทั้งหมด',  en:'View All Listings', cn:'查看全部',   ja:'全件表示'},
  'modal.map.btn':    {th:'ดูแผนที่',          en:'View Map',          cn:'查看地图',   ja:'地図を見る'},
  'ft.col.listings':  {th:'ประกาศทั้งหมด',    en:'All Listings',      cn:'全部房源',   ja:'全物件一覧'},
  'modal.sort.rec':   {th:'แนะนำ',            en:'Recommended',       cn:'推荐',       ja:'おすすめ'},
  'modal.sort.asc':   {th:'ราคาต่ำ → สูง',   en:'Price: Low → High', cn:'价格从低到高', ja:'価格: 低→高'},
  'modal.sort.desc':  {th:'ราคาสูง → ต่ำ',   en:'Price: High → Low', cn:'价格从高到低', ja:'価格: 高→低'},
  'modal.sort.new':   {th:'ใหม่สุด',          en:'Newest',            cn:'最新',       ja:'新しい順'},
  'modal.sort.old':   {th:'เก่าสุด',          en:'Oldest',            cn:'最旧',       ja:'古い順'},
  'modal.sort.alpha': {th:'เรียงตัวอักษร',    en:'Alphabetical',      cn:'按字母排序',  ja:'五十音順'},
  'srv.detail.price': {th:'💰 ราคา',          en:'💰 Price',          cn:'💰 价格',     ja:'💰 料金'},
  'srv.detail.dur':   {th:'⏱️ ระยะเวลา',       en:'⏱️ Duration',       cn:'⏱️ 时长',     ja:'⏱️ 所要時間'},
  'srv.detail.chat':  {th:'แชทสอบถาม',        en:'Chat with Us',      cn:'在线咨询',   ja:'チャット相談'},
  'ag.detail.phone':  {th:'📱 โทร',           en:'📱 Phone',          cn:'📱 电话',     ja:'📱 電話'},
  'ag.detail.line':   {th:'💬 Line',           en:'💬 Line',           cn:'💬 Line',    ja:'💬 Line'},
  'ag.detail.props':  {th:'🏠 ทรัพย์ดูแล',    en:'🏠 Listings',       cn:'🏠 房源',     ja:'🏠 物件数'},
  'ag.detail.deals':  {th:'🏆 ปิดดีล',        en:'🏆 Deals Closed',   cn:'🏆 成交',     ja:'🏆 成約件数'},
  /* ── FOOTER ── */
  'footer.slogan':  {th:'Match you to the right home', en:'Match you to the right home', cn:'为您匹配理想家园', ja:'あなたに理想の家を'},
};
let _lang = localStorage.getItem('md_lang') || 'th';
function t(key){const e=I18N_DICT[key];if(!e)return key;return e[_lang]||e['th']||key;}
// ─── Full translation map for all hardcoded UI text ───────────────────────────
const UI_TEXT = {
  th: {
    /* nav dropdowns */
    'dd.prop.sec':'ประเภทอสังหาริมทรัพย์',
    'dd.all':'ทั้งหมด','dd.house':'บ้านเดี่ยว','dd.town':'ทาวน์โฮม','dd.condo':'คอนโด',
    'dd.comm':'อาคารพาณิชย์','dd.land':'ที่ดิน','dd.villa':'วิลล่า','dd.resort':'รีสอร์ท','dd.hotel':'โรงแรม','dd.apt':'อพาร์ตเมนต์',
    'dd.price.sec':'ช่วงราคา',
    'dd.price.all':'ทุกราคา','dd.price.unlim':'ไม่จำกัด',
    'dd.price.1_3':'1 – 3 ล้านบาท','dd.price.start':'เริ่มต้น',
    'dd.price.3_5':'3 – 5 ล้านบาท','dd.price.pop':'ยอดนิยม',
    'dd.price.5_10':'5 – 10 ล้านบาท','dd.price.prem':'Premium',
    'dd.price.10p':'10 ล้านบาท+',
    'dd.rent.sec':'ประเภทอสังหาแบบเช่า',
    'dd.rent.price.sec':'ช่วงราคาเช่า (บาท/เดือน)',
    'dd.rent.all':'ทุกราคาเช่า',
    'dd.rent.5k':'ไม่เกิน 5,000 บาท','dd.rent.save':'ประหยัด',
    'dd.rent.10k':'ไม่เกิน 10,000 บาท',
    'dd.rent.20k':'ไม่เกิน 20,000 บาท',
    'dd.rent.50k':'ไม่เกิน 50,000 บาท',
    'dd.rent.50kp':'50,000 บาท+',
    'dd.rent.lux':'Luxury','dd.rent.superlux':'Super Luxury',
    'dd.srv.sec':'บริการซ่อมแซม & ดูแลบ้าน',
    'dd.srv.ac':'ล้างแอร์','dd.srv.maid':'แม่บ้าน','dd.srv.furn':'ซ่อมเฟอร์นิเจอร์',
    'dd.srv.plumb':'ระบบประปา','dd.srv.elec':'อุปกรณ์ไฟฟ้า','dd.srv.door':'ลูกบิดประตู','dd.srv.paint':'ทาสีบ้าน',
    'dd.srv.viewall':'ดูบริการทั้งหมด',
    'dd.fav.title':'รายการโปรด','dd.fav.clear':'ล้างทั้งหมด','dd.fav.view':'ดูทั้งหมด',
    /* lang panel */
    'lang.header':'🌐 เลือกภาษา / Language',
    /* mob line */
    'mob.line':'Add LINE — ติดต่อเรา',
    /* float bubble */
    'float.bubble':'ฝากทรัพย์ หาที่อยู่<br>ติดต่อพวกเราได้เลย<br>ทีมงานรอ Stand By อยู่ครับ 🙏',
    'float.tel':'โทร',
    /* search form */
    'sf.kw.label':'คำค้นหา','sf.kw.ph':'ชื่อโครงการ ทำเล...',
    'sf.type.label':'ประเภท','sf.type.all':'ทุกประเภท',
    'sf.prov.label':'จังหวัด','sf.prov.all':'ทุกจังหวัด',
    'sf.dist.head':'อำเภอ / เขต','sf.dist.all':'ทุกอำเภอใน','sf.dist.back':'กลับ',
    'sf.prov.head':'จังหวัด','sf.prov.clear':'ล้างการเลือกทั้งหมด',
    'sf.min.label':'ราคาต่ำสุด','sf.max.label':'ราคาสูงสุด',
    'sf.btn':'ค้นหา','sf.btn.reset':'รีเซ็ต',
    /* quick search bar */
    'qs.popular':'ทำเลยอดนิยม','qs.bkk':'📍 กรุงเทพฯ — ทำเลยอดนิยม','qs.other':'🏙️ โซนอื่น',
    'qs.prov':'จังหวัด','qs.central':'🌆 ภาคกลาง & ปริมณฑล','qs.east':'🌊 ภาคตะวันออก & ใต้','qs.north':'🏔️ ภาคเหนือ & อีสาน',
    'qs.bts':'BTS','qs.bts.suk':'🟢 สายสุขุมวิท (N–CEN–E)','qs.bts.sil':'🟢 สายสีลม (S–W)',
    'qs.mrt':'MRT','qs.mrt.blue':'🔵 สายน้ำเงิน','qs.mrt.purple':'🟣 สายสีม่วง',
    'qs.uni':'มหาวิทยาลัย','qs.uni.sec':'🎓 มหาวิทยาลัยชั้นนำ',
    /* price cards – buy */
    'pc.all.tag':'ทั้งหมด','pc.all.title':'ทุกช่วงราคา','pc.all.desc':'ดูทรัพย์ทุกราคา',
    'pc.1_3.tag':'เริ่มต้น','pc.1_3.title':'1 – 3 ล้านบาท','pc.1_3.desc':'สำหรับผู้เริ่มต้น',
    'pc.3_5.tag':'ยอดนิยม','pc.3_5.title':'3 – 5 ล้านบาท','pc.3_5.desc':'คุณภาพดี ทำเลเยี่ยม',
    'pc.5p.tag':'Luxury','pc.5p.title':'5 ล้านบาท+','pc.5p.desc':'ระดับพรีเมียม',
    /* price cards – rent */
    'pr.10k.tag':'ประหยัด','pr.10k.title':'ต่ำกว่า 10,000 บาท','pr.10k.desc':'เช่าราคาคุ้มค่า',
    'pr.10_50.tag':'ยอดนิยม','pr.10_50.title':'10,000 – 50,000 บาท','pr.10_50.desc':'ทำเลดี คุ้มราคา',
    'pr.50_100.tag':'พรีเมียม','pr.50_100.title':'50,000 – 100,000 บาท','pr.50_100.desc':'ระดับพรีเมียม',
    'pr.100kp.tag':'Luxury','pr.100kp.title':'มากกว่า 100,000 บาท','pr.100kp.desc':'ระดับ Super Luxury',
    /* section titles (non-i18n) */
    'sec.hot':'ยอดนิยม','sec.viewall':'ดูทั้งหมด →',
    'sec.new':'มาใหม่ล่าสุด','sec.all':'ประกาศทั้งหมด','sec.osrv':'บริการอื่นๆ',
    /* card badges */
    'card.new':'มาใหม่','card.rent':'เช่า','card.buy':'ขาย',
    /* property types map */
    'type.บ้านเดี่ยว':'บ้านเดี่ยว','type.ทาวน์โฮม':'ทาวน์โฮม','type.คอนโด':'คอนโด',
    'type.อาคารพาณิชย์':'อาคารพาณิชย์','type.ที่ดิน':'ที่ดิน','type.วิลล่า':'วิลล่า',
    'type.รีสอร์ท':'รีสอร์ท','type.โรงแรม':'โรงแรม','type.อพาร์ตเมนต์':'อพาร์ตเมนต์',
    /* page heroes — favorites */
    'ph.fav.back':'กลับหน้าหลัก','ph.fav.h1':'รายการโปรดของฉัน','ph.fav.sub':'ทรัพย์ที่คุณบันทึกไว้ทั้งหมด',
    'ph.fav.total':'รายการทั้งหมด','ph.fav.buy':'สำหรับขาย','ph.fav.rent':'สำหรับเช่า',
    'ph.fav.clear':'ล้างทั้งหมด','ph.fav.share':'แชร์รายการ',
    /* page heroes — agents */
    'ph.ag.back':'กลับหน้าหลัก','ph.ag.h1':'ทีมตัวแทนของเรา','ph.ag.sub':'มืออาชีพพร้อมดูแลทุกขั้นตอน',
    'ph.ag.listings':'รายการทั้งหมด','ph.ag.deals':'ปิดดีลแล้ว',
    /* portfolio page hero */
    'ph.port.back':'กลับหน้าหลัก','ph.port.h1':'ผลงานของเรา','ph.port.sub':'ทรัพย์ที่ปิดการขาย / เช่าสำเร็จ พร้อมรีวิวจากลูกค้า',
    'ph.port.sold':'ปิดขายแล้ว','ph.port.rented':'ปิดเช่าแล้ว','ph.port.happy':'ลูกค้าพึงพอใจ',
    'ph.port.status.sold':'ปิดการขายสำเร็จ','ph.port.status.rented':'ปิดการเช่าสำเร็จ',
    'ph.port.label.loc':'📍 ที่ตั้ง','ph.port.label.price':'💰 ราคา','ph.port.label.date':'📅 ปิดดีล',
    'gf.all':'ทั้งหมด',
    'ag.apply.agent':'สมัครตัวแทน','ag.apply.other':'สมัครงานตำแหน่งอื่นๆ',
    /* agent card */
    'ag.props':'ทรัพย์ดูแล','ag.deals':'ปิดดีล',
    /* footer nav columns */
    'ft.col.main':'เมนูหลัก','ft.col.home':'หน้าหลัก','ft.col.new':'มาใหม่',
    'ft.col.portfolio':'ผลงาน','ft.col.blog':'บทความ','ft.col.agents':'ตัวแทน','ft.col.srv':'บริการอื่นๆ',
    'ft.col.type':'ประเภท','ft.col.area':'ทำเล','ft.col.province':'จังหวัด',
    'ft.type.house':'บ้านเดี่ยว','ft.type.town':'ทาวน์โฮม','ft.type.condo':'คอนโด',
    'ft.type.comm':'อาคารพาณิชย์','ft.type.land':'ที่ดิน','ft.type.buy':'ซื้อ / ขาย','ft.type.rent':'เช่า',
    /* footer nearby modal */
    'modal.nearby':'อสังหาฯ ใกล้เคียง',
    /* modal extras labels */
    'modal.elec':'ค่าไฟ','modal.water':'ค่าน้ำ','modal.deposit2':'เงินประกัน',
    'modal.advance':'จ่ายล่วงหน้า','modal.svcfee':'ค่าบริการอื่นๆ',
    'modal.appliances':'เครื่องใช้ไฟฟ้า','modal.nearby.places':'สถานที่ใกล้เคียง',
    'modal.furn.full':'เฟอร์นิเจอร์ครบชุด','modal.furn.partial':'เฟอร์นิเจอร์บางส่วน','modal.furn.none':'ไม่มีเฟอร์นิเจอร์',
    /* chip labels */
    'chip.appliances':'เครื่องใช้ไฟฟ้า','chip.furniture':'เฟอร์นิเจอร์','chip.amenities':'สิ่งอำนวยความสะดวก',
    /* detail row labels */
    'pdi.bed':'นอน','pdi.bath':'น้ำ','pdi.area':'ตร.ม.','pdi.land':'ตร.ว.','pdi.floor':'ชั้น','pdi.park':'คัน',
    'pdi.furn.full':'เฟอร์ครบ','pdi.pets':'เลี้ยงสัตว์ได้',
    /* specs labels */
    'spec.area':'ตร.ม.','spec.land':'ขนาดที่ดิน (ตร.ว.)','spec.bed':'ห้องนอน','spec.bath':'ห้องน้ำ',
    'spec.park':'ที่จอดรถ','spec.floor':'ชั้น/จำนวนชั้น','spec.furn':'ตกแต่ง','spec.pets':'เลี้ยงสัตว์',
    'spec.furn.full':'เฟอร์ครบ','spec.furn.partial':'บางส่วน','spec.furn.none':'ไม่มี',
    /* modal CTA */
    'modal.line':'แชท Line','modal.tel':'โทรสอบถาม','modal.360':'มุมมอง 360°','modal.drag':'ลากเพื่อหมุน',
    'modal.fav.add':'เพิ่มรายการโปรด','modal.fav.added':'ในรายการโปรดแล้ว',
    'cta.line':'แชท Line','cta.tel':'โทรสอบถาม','cta.consult':'ปรึกษาฟรี','cta.call':'โทรเลย','cta.contact':'ติดต่อทีมงาน','cta.chat':'แชทสอบถาม',
    /* service section */
    'srv.title':'บริการอสังหาฯครบวงจร','srv.sub':'ซื้อ-ขาย อสังหาฯ ให้พวกเราช่วยดูแล',
    'srv.i1':'ตั้งราคา และช่วยวิเคราะห์ตลาดอย่างมืออาชีพ',
    'srv.i2':'การตลาดครบทุกช่องทาง ออนไลน์และออฟไลน์',
    'srv.i3':'ฐานข้อมูลของผู้ซื้อ และผู้เช่าจำนวนมาก',
    'srv.i4':'ช่วยกระสานงานกับธนาคารชั้นนำเรื่องสินเชื่อ และกู้ยืม',
    'srv.i5':'บริการอื่นๆ ที่เกี่ยวข้องกับอสังหาฯ แบบครบวงจร',
    /* footer links */
    'fl.bkk.buy':'ซื้อ-ขาย กรุงเทพฯ','fl.nnb.buy':'ซื้อ-ขาย นนทบุรี','fl.cbl.buy':'ซื้อ-ขาย ชลบุรี',
    'fl.bkk.rent':'เช่า กรุงเทพฯ','fl.loc':'ทำเลยอดนิยม','fl.uni':'ใกล้มหาวิทยาลัย',
    'fl.sell.house.bkk':'ขายบ้านเดี่ยว กรุงเทพฯ','fl.sell.town.bkk':'ขายทาวน์โฮม กรุงเทพฯ',
    'fl.sell.condo.bkk':'ขายคอนโด กรุงเทพฯ','fl.sell.land.bkk':'ขายที่ดิน กรุงเทพฯ','fl.sell.comm.bkk':'ขายอาคารพาณิชย์ กทม.',
    'fl.sell.house.nnb':'ขายบ้านเดี่ยว นนทบุรี','fl.sell.town.nnb':'ขายทาวน์โฮม นนทบุรี',
    'fl.sell.condo.nnb':'ขายคอนโด นนทบุรี','fl.sell.land.nnb':'ขายที่ดิน นนทบุรี',
    'fl.sell.house.cbl':'ขายบ้านเดี่ยว ชลบุรี','fl.sell.town.cbl':'ขายทาวน์โฮม ชลบุรี','fl.sell.condo.cbl':'ขายคอนโด ชลบุรี','fl.pattaya':'อสังหาฯ พัทยา',
    'fl.rent.house.bkk':'เช่าบ้านเดี่ยว กรุงเทพฯ','fl.rent.town.bkk':'เช่าทาวน์โฮม กรุงเทพฯ','fl.rent.condo.bkk':'เช่าคอนโด กรุงเทพฯ',
    'fl.rent.condo.sukhumvit':'เช่าคอนโดสุขุมวิท','fl.rent.condo.asok':'เช่าคอนโดอโศก',
    'fl.loc.sukhumvit':'คอนโดใกล้สุขุมวิท','fl.loc.sathorn':'อสังหาฯ ย่านสาทร',
    'fl.loc.rachada':'บ้าน-คอนโด รัชดา','fl.loc.ladprao':'ทรัพย์ย่านลาดพร้าว',
    'fl.loc.asok':'คอนโดใกล้อโศก','fl.loc.rama9':'อสังหาฯ พระราม 9',
    'fl.loc.thonglor':'คอนโดทองหล่อ','fl.loc.phrakhanong':'คอนโดพระโขนง-BTS',
    'fl.uni.chula':'คอนโดใกล้จุฬาฯ','fl.uni.thammasat':'ห้องเช่าใกล้ธรรมศาสตร์',
    'fl.uni.kaset':'ทรัพย์ใกล้เกษตรฯ','fl.uni.mahidol':'คอนโดใกล้มหิดล',
    'fl.uni.rangsit':'ห้องเช่าใกล้ ม.รังสิต','fl.uni.abac':'อสังหาฯ ใกล้ ABAC',
    'fl.uni.silpakorn':'คอนโดใกล้ศิลปากร','fl.uni.siam':'คอนโดใกล้สยาม',
    /* footer columns */
    'ft.col.prop':'อสังหาริมทรัพย์','ft.col.svc':'บริการ','ft.col.info':'ข้อมูล','ft.col.legal':'กฎหมาย','ft.col.contact':'ติดต่อ',
    /* footer legal bar */
    'ft.legal.privacy':'นโยบายความเป็นส่วนตัว','ft.legal.terms':'ข้อกำหนดการใช้งาน',
    'ft.legal.buysell':'เงื่อนไขการซื้อ-ขาย','ft.legal.aup':'นโยบายการใช้งานที่ยอมรับได้',
    'ft.legal.cookie':'นโยบายคุกกี้','ft.legal.terms2':'ข้อตกลงและเงื่อนไข','ft.legal.contact':'ติดต่อเรา',
    /* footer area links */
    'ft.area.sukhumvit':'สุขุมวิท','ft.area.sathorn':'สาทร','ft.area.rachada':'รัชดาภิเษก',
    'ft.area.ladprao':'ลาดพร้าว','ft.area.rama9':'พระราม 9','ft.area.bangna':'บางนา',
    /* footer province links */
    'ft.prov.bkk':'กรุงเทพฯ','ft.prov.nnt':'นนทบุรี','ft.prov.ptm':'ปทุมธานี',
    'ft.prov.smk':'สมุทรปราการ','ft.prov.cbl':'ชลบุรี','ft.prov.pkt':'ภูเก็ต',
    'ft.copy':'© ' + new Date().getFullYear() + ' Matchdoor. สงวนลิขสิทธิ์ทุกประการ',
    /* deposit / wish forms */
    'form.dep.title':'ฝากทรัพย์กับเรา','form.dep.sub':'กรอกข้อมูลเบื้องต้น ทีมงานติดต่อกลับโดยเร็ว',
    'form.wish.title':'ฝากความต้องการซื้ออสังหา','form.wish.sub':'บอกรายละเอียดที่ต้องการ เราจะหาให้',
    'form.name':'ชื่อ-นามสกุล *','form.phone':'เบอร์โทร *','form.lineid':'Line ID','form.lineid2':'Your Line ID','form.email2':'Your email',
    'form.type':'ประเภทอสังหา','form.type2':'ประเภท','form.budget':'งบประมาณสูงสุด (บาท)',
    'form.prov':'จังหวัด','form.tx':'ต้องการ','form.tx2':'ซื้อ / เช่า',
    'form.detail':'รายละเอียด','form.detail2':'รายละเอียดเพิ่มเติม',
    'form.price':'ราคา (บาท)',
    'form.upload':'อัปโหลดรูป (สูงสุด 5 รูป)','form.dropzone':'ลากวาง หรือคลิกเพื่อเลือกรูป',
    'form.dropzone.sub':'JPG/PNG ขนาดสูงสุด 5MB',
    'form.consent.dep':'ฉันยินยอมให้ Matchdoor เก็บและใช้ข้อมูลส่วนบุคคลรวมถึงรูปภาพทรัพย์ เพื่อบริการฝากทรัพย์ ตาม',
    'form.consent.wish':'ฉันยินยอมให้ Matchdoor เก็บและใช้ข้อมูลส่วนบุคคลเพื่อบริการด้านอสังหาริมทรัพย์ ตาม',
    'form.consent.link':'นโยบายความเป็นส่วนตัว',
    'form.consent.err':'⚠️ กรุณายินยอมก่อนส่งข้อมูล',
    'form.login':'เข้าสู่ระบบเพื่อส่งข้อมูล','form.ok':'ส่งข้อมูลสำเร็จ!','form.dep.submit':'ส่งข้อมูลฝากทรัพย์','form.wish.submit':'ส่งความต้องการ',
    'form.select':'-- เลือก --',
    /* advanced filter panel */
    'af.title':'Filter เพิ่มเติม','af.btn.label':'Filter เพิ่มเติม',
    'af.sec.price':'ช่วงราคา (บาท)','af.price.min':'ราคาต่ำสุด','af.price.max':'ราคาสูงสุด (ไม่จำกัด)',
    'af.sec.popular':'ทำเลยอดนิยม',
    'af.sec.prov':'จังหวัด (ทั้ง 77 จังหวัด)','af.prov.all':'ทุกจังหวัด',
    'af.sec.bts':'ใกล้สถานี BTS','af.bts.all':'ทุกสถานี BTS/SRT/ARL',
    'af.sec.mrt':'ใกล้สถานี MRT','af.mrt.all':'ทุกสถานี MRT/BEM',
    'af.sec.uni':'ใกล้มหาวิทยาลัย','af.uni.all':'ทุกมหาวิทยาลัย',
    'af.sec.land':'ขนาดที่ดิน (ตร.ว.)','af.sec.area':'ขนาดพื้นที่ใช้สอย (ตร.ม.)',
    'af.all.size':'ทุกขนาด','af.min':'ต่ำสุด','af.max':'สูงสุด','af.unlimited':'ไม่จำกัด',
    'af.sec.bed':'ห้องนอน','af.sec.bath':'ห้องน้ำ','af.sec.park':'ที่จอดรถ',
    'af.sec.furn':'เฟอร์นิเจอร์','af.sec.pets':'การเลี้ยงสัตว์','af.sec.app':'เครื่องใช้ไฟฟ้า',
    'af.room1':'1 ห้อง','af.room2':'2 ห้อง','af.room3':'3 ห้อง','af.room4':'4+ ห้อง',
    'af.car1':'1 คัน','af.car2':'2 คัน','af.car3':'3+ คัน',
    'af.furn.full':'เฟอร์นิเจอร์ครบ','af.furn.part':'เฟอร์นิเจอร์บางส่วน','af.furn.none':'ไม่มีเฟอร์นิเจอร์',
    'af.pets.ok':'อนุญาตเลี้ยงสัตว์',
    'af.app.ac':'แอร์','af.app.fridge':'ตู้เย็น','af.app.washer':'เครื่องซักผ้า',
    'af.app.heater':'เครื่องทำน้ำอุ่น','af.app.tv':'โทรทัศน์','af.app.micro':'ไมโครเวฟ',
    'af.app.stove':'เตาไฟฟ้า','af.app.security':'ระบบรักษาความปลอดภัย',
    'af.btn.reset':'รีเซ็ต','af.btn.apply':'ค้นหาผลลัพธ์',
    'form.sell':'ขาย','form.rent':'ให้เช่า','form.buy':'ซื้อ','form.dorrent':'เช่า',
    'form.name.ph':'ชื่อของคุณ','form.prov.ph':'กรุงเทพฯ...','form.prov.ph2':'กรุงเทพฯ',
    'form.detail.ph':'ขนาด ทำเล จำนวนห้อง...','form.detail2.ph':'ขนาด จำนวนห้อง ทำเล...',
    /* service cards */
    'srv.ac.name':'ล้างแอร์','srv.ac.desc':'ล้างแอร์ทุกประเภท',
    'srv.maid.name':'แม่บ้าน','srv.maid.desc':'บริการแม่บ้านคุณภาพ',
    'srv.furn.name':'ซ่อมเฟอร์นิเจอร์','srv.furn.desc':'ซ่อมเฟอร์นิเจอร์ทุกชนิด',
    'srv.plumb.name':'แก้ไขระบบประปา','srv.plumb.desc':'แก้ไขปัญหาท่อรั่ว',
    'srv.elec.name':'ซ่อมอุปกรณ์ไฟฟ้า','srv.elec.desc':'ซ่อมไฟฟ้าภายในบ้าน',
    'srv.door.name':'เปลี่ยนลูกบิดประตู','srv.door.desc':'เปลี่ยนลูกบิดทุกแบบ',
    'srv.paint.name':'ทาสีบ้าน','srv.paint.desc':'ทาสีภายในและภายนอก',
    'srv.pest.name':'กำจัดปลวกและแมลง','srv.pest.desc':'กำจัดปลวก มด แมลงสาบ',
    'srv.garden.name':'ตัดหญ้า-จัดสวน','srv.garden.desc':'ดูแลสวนและภูมิทัศน์',
    'srv.roof.name':'ซ่อมหลังคา','srv.roof.desc':'ซ่อมหลังคารั่ว ทุกประเภท',
    'srv.cctv.name':'ติดตั้ง CCTV','srv.cctv.desc':'ระบบกล้องวงจรปิด',
    'srv.solar.name':'โซลาร์เซลล์','srv.solar.desc':'ติดตั้งแผงโซลาร์เซลล์',
    'srv.move.name':'ขนย้ายสิ่งของ','srv.move.desc':'บริการรถขนของ',
    'srv.internet.name':'ติดตั้ง Wi-Fi','srv.internet.desc':'วางระบบเน็ตทั้งบ้าน',
    'srv.pool.name':'ดูแลสระว่ายน้ำ','srv.pool.desc':'ทำความสะอาดสระว่ายน้ำ',
    'srv.photo.name':'ถ่ายภาพอสังหาฯ','srv.photo.desc':'ถ่ายภาพมืออาชีพเพื่อลงประกาศ',
    'srv.legal.name':'บริการด้านกฎหมาย','srv.legal.desc':'ที่ปรึกษากฎหมายอสังหาริมทรัพย์',
    /* srv detail price/dur per service id */
    'srv.ac.price':'เริ่มต้น 800 บาท/เครื่อง','srv.ac.dur':'1–2 ชั่วโมง',
    'srv.maid.price':'เริ่มต้น 1,500 บาท/ครั้ง','srv.maid.dur':'4–8 ชั่วโมง',
    'srv.furn.price':'เริ่มต้น 500 บาท','srv.furn.dur':'แล้วแต่งาน',
    'srv.plumb.price':'เริ่มต้น 600 บาท','srv.plumb.dur':'1–3 ชั่วโมง',
    'srv.elec.price':'เริ่มต้น 500 บาท','srv.elec.dur':'1–2 ชั่วโมง',
    'srv.door.price':'เริ่มต้น 400 บาท','srv.door.dur':'30–60 นาที',
    'srv.paint.price':'เริ่มต้น 2,500 บาท','srv.paint.dur':'1–3 วัน',
    'srv.pest.price':'เริ่มต้น 1,200 บาท','srv.pest.dur':'2–4 ชั่วโมง',
    'srv.garden.price':'เริ่มต้น 1,000 บาท','srv.garden.dur':'2–4 ชั่วโมง',
    'srv.roof.price':'เริ่มต้น 2,000 บาท','srv.roof.dur':'แล้วแต่งาน',
    'srv.cctv.price':'เริ่มต้น 3,500 บาท','srv.cctv.dur':'2–4 ชั่วโมง',
    'srv.solar.price':'เริ่มต้น 50,000 บาท','srv.solar.dur':'1–2 วัน',
    'srv.move.price':'เริ่มต้น 2,000 บาท','srv.move.dur':'แล้วแต่งาน',
    'srv.internet.price':'เริ่มต้น 1,500 บาท','srv.internet.dur':'2–4 ชั่วโมง',
    'srv.pool.price':'เริ่มต้น 2,500 บาท','srv.pool.dur':'2–4 ชั่วโมง',
    'srv.photo.price':'เริ่มต้น 2,000 บาท','srv.photo.dur':'ครึ่งวัน–1 วัน',
    'srv.legal.price':'เริ่มต้น 1,500 บาท/ชั่วโมง','srv.legal.dur':'แล้วแต่งาน',
    /* listings page */
    'ls.back':'กลับ','ls.title':'ประกาศทั้งหมด','ls.map.btn':'ค้นหาด้วยแผนที่',
    'ls.map.close':'ปิด','ls.map.title':'แผนที่อสังหาริมทรัพย์','ls.map.hint':'กดที่ปักหมุดในแผนที่เพื่อกรองข้อมูล',
    'ls.label.kw':'คำค้นหา','ls.label.tx':'ซื้อ/เช่า','ls.label.type':'ประเภท','ls.label.prov':'จังหวัด','ls.label.min':'ราคาต่ำสุด','ls.label.max':'ราคาสูงสุด',
    'ls.btn.search':'ค้นหา','ls.btn.reset':'Reset',
    'ls.tab.all':'ทั้งหมด','ls.tab.buy':'🏠 ซื้อ','ls.tab.rent':'🔑 เช่า','ls.tab.hot':'🔥 Hot','ls.tab.new':'✨ มาใหม่',
    'ls.count':'พบ {n} รายการ','ls.sort.label':'เรียงโดย:',
    'ls.sort.default':'แนะนำ','ls.sort.price_asc':'ราคาต่ำ → สูง','ls.sort.price_desc':'ราคาสูง → ต่ำ',
    'ls.sort.newest':'ใหม่สุด','ls.sort.oldest':'เก่าสุด','ls.sort.alpha':'เรียงตัวอักษร',
    'ls.sidebar.types':'ประเภทอสังหาฯ','ls.sidebar.consult':'ปรึกษาฟรี ไม่มีค่าใช้จ่าย',
    'ls.sidebar.consult.sub':'ทีมตัวแทน Matchdoor พร้อมช่วยคุณหาบ้านที่ใช่',
    'ls.sidebar.line':'Line','ls.sidebar.tel':'โทรเลย','ls.sidebar.transit':'ใกล้รถไฟฟ้า',
  },
  en: {
    'dd.prop.sec':'Property Types',
    'dd.all':'All','dd.house':'House','dd.town':'Townhome','dd.condo':'Condo',
    'dd.comm':'Commercial','dd.land':'Land','dd.villa':'Villa','dd.resort':'Resort','dd.hotel':'Hotel','dd.apt':'Apartment',
    'dd.price.sec':'Price Range',
    'dd.price.all':'All Prices','dd.price.unlim':'No Limit',
    'dd.price.1_3':'1 – 3M Baht','dd.price.start':'Starter',
    'dd.price.3_5':'3 – 5M Baht','dd.price.pop':'Popular',
    'dd.price.5_10':'5 – 10M Baht','dd.price.prem':'Premium',
    'dd.price.10p':'10M Baht+',
    'dd.rent.sec':'Rental Property Types',
    'dd.rent.price.sec':'Rental Price Range (THB/month)',
    'dd.rent.all':'All Rental Prices',
    'dd.rent.5k':'Under 5,000 Baht','dd.rent.save':'Budget',
    'dd.rent.10k':'Under 10,000 Baht',
    'dd.rent.20k':'Under 20,000 Baht',
    'dd.rent.50k':'Under 50,000 Baht',
    'dd.rent.50kp':'50,000 Baht+',
    'dd.rent.lux':'Luxury','dd.rent.superlux':'Super Luxury',
    'dd.srv.sec':'Repair & Home Care Services',
    'dd.srv.ac':'AC Cleaning','dd.srv.maid':'Maid Service','dd.srv.furn':'Furniture Repair',
    'dd.srv.plumb':'Plumbing','dd.srv.elec':'Electrical','dd.srv.door':'Door Handles','dd.srv.paint':'House Painting',
    'dd.srv.viewall':'View All Services',
    'dd.fav.title':'Favorites','dd.fav.clear':'Clear All','dd.fav.view':'View All',
    'lang.header':'🌐 Select Language',
    'mob.line':'Add LINE — Contact Us',
    'float.bubble':'List or find property<br>Contact us anytime<br>Our team is ready 🙏',
    'float.tel':'Call',
    'sf.kw.label':'Keyword','sf.kw.ph':'Project name, location...',
    'sf.type.label':'Type','sf.type.all':'All Types',
    'sf.prov.label':'Province / Area','sf.prov.all':'All Areas',
    'sf.dist.head':'District / Sub-area','sf.dist.all':'All Districts in','sf.dist.back':'Back',
    'sf.prov.head':'Province','sf.prov.clear':'Clear selection',
    'sf.min.label':'Min Price','sf.max.label':'Max Price',
    'sf.btn':'Search','sf.btn.reset':'Reset',
    'qs.popular':'Popular Areas','qs.bkk':'📍 Bangkok — Popular Areas','qs.other':'🏙️ Other Zones',
    'qs.prov':'Province','qs.central':'🌆 Central & Greater Bangkok','qs.east':'🌊 Eastern & Southern','qs.north':'🏔️ Northern & Northeastern',
    'qs.bts':'BTS','qs.bts.suk':'🟢 Sukhumvit Line (N–CEN–E)','qs.bts.sil':'🟢 Silom Line (S–W)',
    'qs.mrt':'MRT','qs.mrt.blue':'🔵 Blue Line','qs.mrt.purple':'🟣 Purple Line',
    'qs.uni':'University','qs.uni.sec':'🎓 Top Universities',
    'pc.all.tag':'All','pc.all.title':'All Price Ranges','pc.all.desc':'View all properties',
    'pc.1_3.tag':'Starter','pc.1_3.title':'1 – 3M Baht','pc.1_3.desc':'For first-time buyers',
    'pc.3_5.tag':'Popular','pc.3_5.title':'3 – 5M Baht','pc.3_5.desc':'Great quality, great location',
    'pc.5p.tag':'Luxury','pc.5p.title':'5M Baht+','pc.5p.desc':'Premium level',
    'pr.10k.tag':'Budget','pr.10k.title':'Under 10,000 Baht','pr.10k.desc':'Affordable rent',
    'pr.10_50.tag':'Popular','pr.10_50.title':'10,000 – 50,000 Baht','pr.10_50.desc':'Great location, great value',
    'pr.50_100.tag':'Premium','pr.50_100.title':'50,000 – 100,000 Baht','pr.50_100.desc':'Premium tier',
    'pr.100kp.tag':'Luxury','pr.100kp.title':'Over 100,000 Baht','pr.100kp.desc':'Super Luxury',
    'sec.hot':'🔥 Hot Properties','sec.viewall':'View All →',
    'sec.new':'Latest Listings','sec.all':'All Listings','sec.osrv':'Other Services',
    /* card badges */
    'card.new':'New','card.rent':'Rent','card.buy':'For Sale',
    /* property types */
    'type.บ้านเดี่ยว':'House','type.ทาวน์โฮม':'Townhome','type.คอนโด':'Condo',
    'type.อาคารพาณิชย์':'Commercial','type.ที่ดิน':'Land','type.วิลล่า':'Villa',
    'type.รีสอร์ท':'Resort','type.โรงแรม':'Hotel','type.อพาร์ตเมนต์':'Apartment',
    /* page heroes */
    'ph.fav.back':'Back to Home','ph.fav.h1':'My Favorites','ph.fav.sub':'All saved properties',
    'ph.fav.total':'Total','ph.fav.buy':'For Sale','ph.fav.rent':'For Rent',
    'ph.fav.clear':'Clear All','ph.fav.share':'Share List',
    'ph.ag.back':'Back to Home','ph.ag.h1':'Our Agent Team','ph.ag.sub':'Professionals ready to guide you',
    'ph.ag.listings':'Total Listings','ph.ag.deals':'Deals Closed',
    'ph.port.back':'Back to Home','ph.port.h1':'Our Portfolio','ph.port.sub':'Successfully sold & rented properties with client reviews',
    'ph.port.sold':'Sold','ph.port.rented':'Rented','ph.port.happy':'Happy Clients',
    'ph.port.status.sold':'Successfully Sold','ph.port.status.rented':'Successfully Rented',
    'ph.port.label.loc':'📍 Location','ph.port.label.price':'💰 Price','ph.port.label.date':'📅 Deal Closed',
    'gf.all':'All',
    'ag.apply.agent':'Apply as Agent','ag.apply.other':'Apply for Other Positions',
    /* agent card */
    'ag.props':'Listings','ag.deals':'Deals',
    /* footer nav columns */
    'ft.col.main':'Main Menu','ft.col.home':'Home','ft.col.new':'New',
    'ft.col.portfolio':'Portfolio','ft.col.blog':'Blog','ft.col.agents':'Agents','ft.col.srv':'Other Services',
    'ft.col.type':'Property Types','ft.col.area':'Areas','ft.col.province':'Province',
    'ft.type.house':'House','ft.type.town':'Townhome','ft.type.condo':'Condo',
    'ft.type.comm':'Commercial','ft.type.land':'Land','ft.type.buy':'Buy / Sell','ft.type.rent':'Rent',
    /* modal extras */
    'modal.nearby':'Nearby Properties','modal.elec':'Electricity Rate','modal.water':'Water Rate',
    'modal.deposit2':'Security Deposit','modal.advance':'Advance Payment','modal.svcfee':'Other Charges',
    'modal.appliances':'Appliances','modal.nearby.places':'Nearby Places',
    'modal.furn.full':'Fully Furnished','modal.furn.partial':'Partially Furnished','modal.furn.none':'Unfurnished',
    'chip.appliances':'Appliances','chip.furniture':'Furniture','chip.amenities':'Amenities',
    'pdi.bed':'bed','pdi.bath':'bath','pdi.area':'sqm','pdi.land':'sq.w.','pdi.floor':'fl.','pdi.park':'car',
    'pdi.furn.full':'Fully Furnished','pdi.pets':'Pets OK',
    'spec.area':'sqm','spec.land':'Land (sq.w.)','spec.bed':'Bedrooms','spec.bath':'Bathrooms',
    'spec.park':'Parking','spec.floor':'Floor/Floors','spec.furn':'Furnishing','spec.pets':'Pets',
    'spec.furn.full':'Fully Furnished','spec.furn.partial':'Partial','spec.furn.none':'None',
    'modal.line':'Chat Line','modal.tel':'Call Us','modal.360':'360° View','modal.drag':'Drag to rotate',
    'modal.fav.add':'Add to Favorites','modal.fav.added':'Saved ✓',
    'cta.line':'Chat Line','cta.tel':'Call Us','cta.consult':'Free Consultation','cta.call':'Call Now','cta.contact':'Contact Team','cta.chat':'Chat Now',
    'srv.title':'Full-Service Real Estate Solutions','srv.sub':'Buying or Selling? Consult Our Experts',
    'srv.i1':'Professional pricing with market analysis',
    'srv.i2':'Full marketing — online & offline',
    'srv.i3':'Large pool of buyers and renters',
    'srv.i4':'Loan and mortgage management support',
    'srv.i5':'End-to-end transfer & closing service',
    'fl.bkk.buy':'Buy/Sell in Bangkok','fl.nnb.buy':'Buy/Sell in Nonthaburi','fl.cbl.buy':'Buy/Sell in Chonburi',
    'fl.bkk.rent':'Rent in Bangkok','fl.loc':'Popular Areas','fl.uni':'Near Universities',
    'fl.sell.house.bkk':'Houses for Sale Bangkok','fl.sell.town.bkk':'Townhomes for Sale Bangkok',
    'fl.sell.condo.bkk':'Condos for Sale Bangkok','fl.sell.land.bkk':'Land for Sale Bangkok','fl.sell.comm.bkk':'Commercial for Sale Bangkok',
    'fl.sell.house.nnb':'Houses for Sale Nonthaburi','fl.sell.town.nnb':'Townhomes for Sale Nonthaburi',
    'fl.sell.condo.nnb':'Condos for Sale Nonthaburi','fl.sell.land.nnb':'Land for Sale Nonthaburi',
    'fl.sell.house.cbl':'Houses for Sale Chonburi','fl.sell.town.cbl':'Townhomes for Sale Chonburi','fl.sell.condo.cbl':'Condos for Sale Chonburi','fl.pattaya':'Property in Pattaya',
    'fl.rent.house.bkk':'Houses for Rent Bangkok','fl.rent.town.bkk':'Townhomes for Rent Bangkok','fl.rent.condo.bkk':'Condos for Rent Bangkok',
    'fl.rent.condo.sukhumvit':'Rent Condo Sukhumvit','fl.rent.condo.asok':'Rent Condo Asok',
    'fl.loc.sukhumvit':'Condos near Sukhumvit','fl.loc.sathorn':'Properties in Sathorn',
    'fl.loc.rachada':'Homes near Rachada','fl.loc.ladprao':'Properties in Lat Phrao',
    'fl.loc.asok':'Condos near Asok','fl.loc.rama9':'Properties near Rama 9',
    'fl.loc.thonglor':'Condos in Thonglor','fl.loc.phrakhanong':'Condos Phrakhanong-BTS',
    'fl.uni.chula':'Condos near Chulalongkorn','fl.uni.thammasat':'Rentals near Thammasat',
    'fl.uni.kaset':'Properties near Kasetsart','fl.uni.mahidol':'Condos near Mahidol',
    'fl.uni.rangsit':'Rentals near Rangsit Uni','fl.uni.abac':'Properties near ABAC',
    'fl.uni.silpakorn':'Condos near Silpakorn','fl.uni.siam':'Condos near Siam',
    'ft.col.prop':'Properties','ft.col.svc':'Services','ft.col.info':'Info','ft.col.legal':'Legal','ft.col.contact':'Contact',
    'ft.legal.privacy':'Privacy Policy','ft.legal.terms':'Terms of Use',
    'ft.legal.buysell':'Buy-Sell Terms','ft.legal.aup':'Acceptable Use Policy',
    'ft.legal.cookie':'Cookie Policy','ft.legal.terms2':'Terms & Conditions','ft.legal.contact':'Contact Us',
    'ft.area.sukhumvit':'Sukhumvit','ft.area.sathorn':'Sathorn','ft.area.rachada':'Ratchadaphisek',
    'ft.area.ladprao':'Lat Phrao','ft.area.rama9':'Rama 9','ft.area.bangna':'Bang Na',
    'ft.prov.bkk':'Bangkok','ft.prov.nnt':'Nonthaburi','ft.prov.ptm':'Pathum Thani',
    'ft.prov.smk':'Samut Prakan','ft.prov.cbl':'Chon Buri','ft.prov.pkt':'Phuket',
    'ft.copy':'© ' + new Date().getFullYear() + ' Matchdoor. All Rights Reserved.',
    'form.dep.title':'List Your Property','form.dep.sub':'Fill in basic info — our team will contact you shortly',
    'form.wish.title':'Property Wishlist','form.wish.sub':'Tell us what you need and we\'ll find it',
    'form.name':'Full Name *','form.phone':'Phone *','form.lineid':'Line ID','form.lineid2':'Your Line ID','form.email2':'Your email',
    'form.type':'Property Type','form.type2':'Type','form.budget':'Max Budget (THB)',
    'form.prov':'Province','form.tx':'Purpose','form.tx2':'Buy / Rent',
    'form.detail':'Details','form.detail2':'Additional Details',
    'form.price':'Price (THB)',
    'form.upload':'Upload Photos (max 5)','form.dropzone':'Drag & drop or click to upload',
    'form.dropzone.sub':'JPG/PNG max 5MB',
    'form.consent.dep':'I consent to Matchdoor collecting and using my personal data including property photos for listing services, per the ',
    'form.consent.wish':'I consent to Matchdoor collecting and using my personal data for real estate services, per the ',
    'form.consent.link':'Privacy Policy',
    'form.consent.err':'⚠️ Please accept before submitting',
    'form.login':'Login to Submit','form.ok':'Submitted Successfully!','form.dep.submit':'Submit Property Listing','form.wish.submit':'Submit Request',
    'form.select':'-- Select --',
    /* advanced filter panel */
    'af.title':'Advanced Filter','af.btn.label':'Advanced Filter',
    'af.sec.price':'Price Range (THB)','af.price.min':'Min Price','af.price.max':'Max Price (No Limit)',
    'af.sec.popular':'Popular Areas',
    'af.sec.prov':'Province (All 77)','af.prov.all':'All Provinces',
    'af.sec.bts':'Near BTS Station','af.bts.all':'All BTS/SRT/ARL Stations',
    'af.sec.mrt':'Near MRT Station','af.mrt.all':'All MRT/BEM Stations',
    'af.sec.uni':'Near University','af.uni.all':'All Universities',
    'af.sec.land':'Land Size (sq.w.)','af.sec.area':'Usable Area (sqm)',
    'af.all.size':'All Sizes','af.min':'Min','af.max':'Max','af.unlimited':'No Limit',
    'af.sec.bed':'Bedrooms','af.sec.bath':'Bathrooms','af.sec.park':'Parking',
    'af.sec.furn':'Furniture','af.sec.pets':'Pets','af.sec.app':'Appliances',
    'af.room1':'1 room','af.room2':'2 rooms','af.room3':'3 rooms','af.room4':'4+ rooms',
    'af.car1':'1 car','af.car2':'2 cars','af.car3':'3+ cars',
    'af.furn.full':'Fully Furnished','af.furn.part':'Partially Furnished','af.furn.none':'Unfurnished',
    'af.pets.ok':'Pets Allowed',
    'af.app.ac':'Air Con','af.app.fridge':'Refrigerator','af.app.washer':'Washing Machine',
    'af.app.heater':'Water Heater','af.app.tv':'Television','af.app.micro':'Microwave',
    'af.app.stove':'Electric Stove','af.app.security':'Security System',
    'af.btn.reset':'Reset','af.btn.apply':'Search Results',
    'form.sell':'For Sale','form.rent':'For Rent','form.buy':'Buy','form.dorrent':'Rent',
    'form.name.ph':'Your name','form.prov.ph':'Bangkok...','form.prov.ph2':'Bangkok',
    'form.detail.ph':'Size, location, rooms...','form.detail2.ph':'Size, rooms, area...',
    /* service cards */
    'srv.ac.name':'AC Cleaning','srv.ac.desc':'Clean all AC types',
    'srv.maid.name':'Maid Service','srv.maid.desc':'Quality home cleaning',
    'srv.furn.name':'Furniture Repair','srv.furn.desc':'Fix all furniture types',
    'srv.plumb.name':'Plumbing','srv.plumb.desc':'Fix leaks and pipes',
    'srv.elec.name':'Electrical Repair','srv.elec.desc':'Home electrical services',
    'srv.door.name':'Door Handle','srv.door.desc':'Replace all door handles',
    'srv.paint.name':'House Painting','srv.paint.desc':'Interior & exterior painting',
    'srv.pest.name':'Pest Control','srv.pest.desc':'Termites, ants, cockroaches',
    'srv.garden.name':'Garden Care','srv.garden.desc':'Lawn & landscape service',
    'srv.roof.name':'Roof Repair','srv.roof.desc':'Fix leaks, all roof types',
    'srv.cctv.name':'CCTV Install','srv.cctv.desc':'Security camera systems',
    'srv.solar.name':'Solar Panels','srv.solar.desc':'Solar panel installation',
    'srv.move.name':'Moving Service','srv.move.desc':'Furniture & goods moving',
    'srv.internet.name':'Wi-Fi Install','srv.internet.desc':'Home network setup',
    'srv.pool.name':'Pool Maintenance','srv.pool.desc':'Pool cleaning service',
    'srv.photo.name':'Property Photography','srv.photo.desc':'Pro photos for listings',
    'srv.legal.name':'Legal Services','srv.legal.desc':'Real estate legal advice',
    /* listings page */
    'ls.back':'Back','ls.title':'All Listings','ls.map.btn':'Search by Map',
    'ls.map.close':'Close','ls.map.title':'Property Map','ls.map.hint':'Click a pin on the map to filter results',
    'ls.label.kw':'Keyword','ls.label.tx':'Buy/Rent','ls.label.type':'Type','ls.label.prov':'Province','ls.label.min':'Min Price','ls.label.max':'Max Price',
    'ls.btn.search':'Search','ls.btn.reset':'Reset',
    'ls.tab.all':'All','ls.tab.buy':'🏠 Buy','ls.tab.rent':'🔑 Rent','ls.tab.hot':'🔥 Hot','ls.tab.new':'✨ New',
    'ls.count':'Found {n} listings','ls.sort.label':'Sort by:',
    'ls.sort.default':'Recommended','ls.sort.price_asc':'Price: Low → High','ls.sort.price_desc':'Price: High → Low',
    'ls.sort.newest':'Newest','ls.sort.oldest':'Oldest','ls.sort.alpha':'Alphabetical',
    'ls.sidebar.types':'Property Types','ls.sidebar.consult':'Free Consultation',
    'ls.sidebar.consult.sub':'Our Matchdoor team is ready to help you find your perfect home',
    'ls.sidebar.line':'Line','ls.sidebar.tel':'Call Now','ls.sidebar.transit':'Near BTS/MRT',
  },
  cn: {
    'dd.prop.sec':'房产类型',
    'dd.all':'全部','dd.house':'独栋别墅','dd.town':'联排别墅','dd.condo':'公寓',
    'dd.comm':'商业地产','dd.land':'土地','dd.villa':'豪华别墅','dd.resort':'度假村','dd.hotel':'酒店','dd.apt':'公寓楼',
    'dd.price.sec':'价格区间',
    'dd.price.all':'所有价格','dd.price.unlim':'不限',
    'dd.price.1_3':'100–300万铢','dd.price.start':'入门级',
    'dd.price.3_5':'300–500万铢','dd.price.pop':'热门',
    'dd.price.5_10':'500–1000万铢','dd.price.prem':'高端',
    'dd.price.10p':'1000万铢以上',
    'dd.rent.sec':'租赁房产类型',
    'dd.rent.price.sec':'租金区间（铢/月）',
    'dd.rent.all':'所有租金',
    'dd.rent.5k':'5,000铢以下','dd.rent.save':'经济',
    'dd.rent.10k':'10,000铢以下',
    'dd.rent.20k':'20,000铢以下',
    'dd.rent.50k':'50,000铢以下',
    'dd.rent.50kp':'50,000铢以上',
    'dd.rent.lux':'豪华','dd.rent.superlux':'顶级豪华',
    'dd.srv.sec':'维修与家居服务',
    'dd.srv.ac':'空调清洗','dd.srv.maid':'家政服务','dd.srv.furn':'家具维修',
    'dd.srv.plumb':'水管维修','dd.srv.elec':'电气设备','dd.srv.door':'门锁维修','dd.srv.paint':'房屋粉刷',
    'dd.srv.viewall':'查看全部服务',
    'dd.fav.title':'收藏夹','dd.fav.clear':'清除全部','dd.fav.view':'查看全部',
    'lang.header':'🌐 选择语言',
    'mob.line':'添加LINE — 联系我们',
    'float.bubble':'委托房产，寻找住所<br>随时联系我们<br>团队随时为您服务 🙏',
    'float.tel':'致电',
    'sf.kw.label':'关键词','sf.kw.ph':'项目名称、地点...',
    'sf.type.label':'类型','sf.type.all':'所有类型',
    'sf.prov.label':'省份 / 地区','sf.prov.all':'所有地区',
    'sf.dist.head':'区 / 县','sf.dist.all':'全部区县于','sf.dist.back':'返回',
    'sf.prov.head':'省份','sf.prov.clear':'清除选择',
    'sf.min.label':'最低价格','sf.max.label':'最高价格',
    'sf.btn':'搜索','sf.btn.reset':'重置',
    'qs.popular':'热门地区','qs.bkk':'📍 曼谷 — 热门地区','qs.other':'🏙️ 其他区域',
    'qs.prov':'省份','qs.central':'🌆 中部及大曼谷地区','qs.east':'🌊 东部及南部','qs.north':'🏔️ 北部及东北部',
    'qs.bts':'BTS','qs.bts.suk':'🟢 素坤逸线 (N–CEN–E)','qs.bts.sil':'🟢 是隆线 (S–W)',
    'qs.mrt':'MRT','qs.mrt.blue':'🔵 蓝线','qs.mrt.purple':'🟣 紫线',
    'qs.uni':'大学','qs.uni.sec':'🎓 顶尖大学',
    'pc.all.tag':'全部','pc.all.title':'所有价位','pc.all.desc':'查看所有房产',
    'pc.1_3.tag':'入门','pc.1_3.title':'100–300万铢','pc.1_3.desc':'首次置业首选',
    'pc.3_5.tag':'热门','pc.3_5.title':'300–500万铢','pc.3_5.desc':'品质好，地段佳',
    'pc.5p.tag':'豪华','pc.5p.title':'500万铢以上','pc.5p.desc':'精品级别',
    'pr.10k.tag':'经济','pr.10k.title':'10,000铢以下','pr.10k.desc':'实惠租价',
    'pr.10_50.tag':'热门','pr.10_50.title':'10,000–50,000铢','pr.10_50.desc':'地段好，性价比高',
    'pr.50_100.tag':'高端','pr.50_100.title':'50,000–100,000铢','pr.50_100.desc':'高端品质',
    'pr.100kp.tag':'豪华','pr.100kp.title':'10万铢以上','pr.100kp.desc':'超级豪华',
    'sec.hot':'🔥 热门房产','sec.viewall':'查看全部 →',
    'sec.new':'最新上架','sec.all':'全部房产','sec.osrv':'其他服务',
    /* card badges */
    'card.new':'最新','card.rent':'租赁','card.buy':'出售',
    /* property types */
    'type.บ้านเดี่ยว':'独栋别墅','type.ทาวน์โฮม':'联排别墅','type.คอนโด':'公寓',
    'type.อาคารพาณิชย์':'商业地产','type.ที่ดิน':'土地','type.วิลล่า':'豪华别墅',
    'type.รีสอร์ท':'度假村','type.โรงแรม':'酒店','type.อพาร์ตเมนต์':'公寓楼',
    /* page heroes */
    'ph.fav.back':'返回首页','ph.fav.h1':'我的收藏','ph.fav.sub':'您收藏的所有房产',
    'ph.fav.total':'全部','ph.fav.buy':'出售','ph.fav.rent':'租赁',
    'ph.fav.clear':'清除全部','ph.fav.share':'分享列表',
    'ph.ag.back':'返回首页','ph.ag.h1':'我们的经纪人团队','ph.ag.sub':'专业人士，全程为您服务',
    'ph.ag.listings':'全部房产','ph.ag.deals':'已成交',
    'ph.port.back':'返回首页','ph.port.h1':'我们的案例','ph.port.sub':'已成功出售/租赁的房产及客户评价',
    'ph.port.sold':'已售出','ph.port.rented':'已租出','ph.port.happy':'满意客户',
    'ph.port.status.sold':'已成功出售','ph.port.status.rented':'已成功出租',
    'ph.port.label.loc':'📍 位置','ph.port.label.price':'💰 价格','ph.port.label.date':'📅 成交日期',
    'gf.all':'全部',
    'ag.apply.agent':'申请成为经纪人','ag.apply.other':'申请其他职位',
    /* agent card */
    'ag.props':'在售房产','ag.deals':'成交',
    /* footer nav columns */
    'ft.col.main':'主菜单','ft.col.home':'首页','ft.col.new':'最新',
    'ft.col.portfolio':'案例','ft.col.blog':'博客','ft.col.agents':'经纪人','ft.col.srv':'其他服务',
    'ft.col.type':'房产类型','ft.col.area':'地区','ft.col.province':'省份',
    'ft.type.house':'独栋别墅','ft.type.town':'联排别墅','ft.type.condo':'公寓',
    'ft.type.comm':'商业地产','ft.type.land':'土地','ft.type.buy':'买/卖','ft.type.rent':'租赁',
    /* modal extras */
    'modal.nearby':'附近房产','modal.elec':'电费','modal.water':'水费',
    'modal.deposit2':'押金','modal.advance':'预付款','modal.svcfee':'其他费用',
    'modal.appliances':'家电','modal.nearby.places':'周边地点',
    'modal.furn.full':'全装修','modal.furn.partial':'部分装修','modal.furn.none':'无装修',
    'chip.appliances':'家电','chip.furniture':'家具','chip.amenities':'配套设施',
    'pdi.bed':'卧室','pdi.bath':'浴室','pdi.area':'平方米','pdi.land':'平方哇','pdi.floor':'层','pdi.park':'车',
    'pdi.furn.full':'全装修','pdi.pets':'可养宠物',
    'spec.area':'平方米','spec.land':'土地（平方哇）','spec.bed':'卧室','spec.bath':'浴室',
    'spec.park':'停车位','spec.floor':'楼层/总层数','spec.furn':'装修','spec.pets':'宠物',
    'spec.furn.full':'全装修','spec.furn.partial':'部分','spec.furn.none':'无',
    'modal.line':'LINE聊天','modal.tel':'电话咨询','modal.360':'360°全景','modal.drag':'拖动旋转',
    'modal.fav.add':'加入收藏','modal.fav.added':'已收藏 ✓',
    'cta.line':'LINE聊天','cta.tel':'电话咨询','cta.consult':'免费咨询','cta.call':'立即拨打','cta.contact':'联系团队','cta.chat':'在线咨询',
    'srv.title':'全程房产服务','srv.sub':'买房或卖房？咨询我们的专家',
    'srv.i1':'专业定价，附市场分析',
    'srv.i2':'线上线下全方位营销',
    'srv.i3':'庞大买家和租客数据库',
    'srv.i4':'贷款及融资协助',
    'srv.i5':'全程过户及交割服务',
    'fl.bkk.buy':'曼谷买卖','fl.nnb.buy':'暖武里买卖','fl.cbl.buy':'春武里买卖',
    'fl.bkk.rent':'曼谷出租','fl.loc':'热门地段','fl.uni':'大学周边',
    'fl.sell.house.bkk':'曼谷独栋别墅出售','fl.sell.town.bkk':'曼谷联排别墅出售',
    'fl.sell.condo.bkk':'曼谷公寓出售','fl.sell.land.bkk':'曼谷土地出售','fl.sell.comm.bkk':'曼谷商业地产出售',
    'fl.sell.house.nnb':'暖武里独栋别墅出售','fl.sell.town.nnb':'暖武里联排别墅出售',
    'fl.sell.condo.nnb':'暖武里公寓出售','fl.sell.land.nnb':'暖武里土地出售',
    'fl.sell.house.cbl':'春武里独栋别墅出售','fl.sell.town.cbl':'春武里联排别墅出售','fl.sell.condo.cbl':'春武里公寓出售','fl.pattaya':'芭提雅房产',
    'fl.rent.house.bkk':'曼谷独栋别墅出租','fl.rent.town.bkk':'曼谷联排别墅出租','fl.rent.condo.bkk':'曼谷公寓出租',
    'fl.rent.condo.sukhumvit':'素坤逸公寓出租','fl.rent.condo.asok':'阿索克公寓出租',
    'fl.loc.sukhumvit':'素坤逸周边公寓','fl.loc.sathorn':'是隆区房产',
    'fl.loc.rachada':'叻差达房产','fl.loc.ladprao':'拉披劳房产',
    'fl.loc.asok':'阿索克周边公寓','fl.loc.rama9':'拉玛9房产',
    'fl.loc.thonglor':'通罗公寓','fl.loc.phrakhanong':'帕卡农-BTS公寓',
    'fl.uni.chula':'朱拉隆功大学周边公寓','fl.uni.thammasat':'法政大学周边出租',
    'fl.uni.kaset':'卡塞特大学周边房产','fl.uni.mahidol':'玛希隆大学周边公寓',
    'fl.uni.rangsit':'兰实大学周边出租','fl.uni.abac':'ABAC大学周边房产',
    'fl.uni.silpakorn':'西巴顿大学周边公寓','fl.uni.siam':'暹罗周边公寓',
    'ft.col.prop':'房产','ft.col.svc':'服务','ft.col.info':'信息','ft.col.legal':'法律','ft.col.contact':'联系我们',
    'ft.legal.privacy':'隐私政策','ft.legal.terms':'使用条款',
    'ft.legal.buysell':'买卖条款','ft.legal.aup':'可接受使用政策',
    'ft.legal.cookie':'Cookie政策','ft.legal.terms2':'条款与条件','ft.legal.contact':'联系我们',
    'ft.area.sukhumvit':'素坤逸','ft.area.sathorn':'是隆','ft.area.rachada':'叻差达',
    'ft.area.ladprao':'拉披劳','ft.area.rama9':'拉玛9','ft.area.bangna':'邦纳',
    'ft.prov.bkk':'曼谷','ft.prov.nnt':'暖武里','ft.prov.ptm':'巴吞他尼',
    'ft.prov.smk':'北榄坡','ft.prov.cbl':'春武里','ft.prov.pkt':'普吉',
    'ft.copy':'© ' + new Date().getFullYear() + ' Matchdoor. 版权所有。',
    'form.dep.title':'委托房产','form.dep.sub':'填写基本信息，我们将尽快联系您',
    'form.wish.title':'购房意向登记','form.wish.sub':'告诉我们您的需求，我们来为您寻找',
    'form.name':'姓名 *','form.phone':'电话 *','form.lineid':'Line ID','form.lineid2':'Your Line ID','form.email2':'Your email',
    'form.type':'房产类型','form.type2':'类型','form.budget':'最高预算（铢）',
    'form.prov':'省份','form.tx':'目的','form.tx2':'购买 / 租赁',
    'form.detail':'详情','form.detail2':'更多详情',
    'form.price':'价格（铢）',
    'form.upload':'上传照片（最多5张）','form.dropzone':'拖放或点击上传',
    'form.dropzone.sub':'JPG/PNG 最大5MB',
    'form.consent.dep':'我同意Matchdoor收集和使用我的个人信息包括房产照片用于委托服务，依据',
    'form.consent.wish':'我同意Matchdoor收集和使用我的个人信息用于房产服务，依据',
    'form.consent.link':'隐私政策',
    'form.consent.err':'⚠️ 请先同意后再提交',
    'form.login':'登录后提交','form.ok':'提交成功！','form.dep.submit':'提交房产信息','form.wish.submit':'提交需求',
    'form.select':'-- 请选择 --',
    /* advanced filter panel */
    'af.title':'高级筛选','af.btn.label':'高级筛选',
    'af.sec.price':'价格区间（铢）','af.price.min':'最低价格','af.price.max':'最高价格（不限）',
    'af.sec.popular':'热门地区',
    'af.sec.prov':'省份（全77省）','af.prov.all':'所有省份',
    'af.sec.bts':'邻近BTS站','af.bts.all':'所有BTS/SRT/ARL站',
    'af.sec.mrt':'邻近MRT站','af.mrt.all':'所有MRT/BEM站',
    'af.sec.uni':'邻近大学','af.uni.all':'所有大学',
    'af.sec.land':'土地面积（平方哇）','af.sec.area':'使用面积（平方米）',
    'af.all.size':'所有面积','af.min':'最低','af.max':'最高','af.unlimited':'不限',
    'af.sec.bed':'卧室','af.sec.bath':'浴室','af.sec.park':'停车位',
    'af.sec.furn':'家具','af.sec.pets':'宠物','af.sec.app':'家电',
    'af.room1':'1间','af.room2':'2间','af.room3':'3间','af.room4':'4间以上',
    'af.car1':'1辆','af.car2':'2辆','af.car3':'3辆以上',
    'af.furn.full':'全套家具','af.furn.part':'部分家具','af.furn.none':'无家具',
    'af.pets.ok':'允许养宠物',
    'af.app.ac':'空调','af.app.fridge':'冰箱','af.app.washer':'洗衣机',
    'af.app.heater':'热水器','af.app.tv':'电视','af.app.micro':'微波炉',
    'af.app.stove':'电磁炉','af.app.security':'安防系统',
    'af.btn.reset':'重置','af.btn.apply':'搜索结果',
    'form.sell':'出售','form.rent':'出租','form.buy':'购买','form.dorrent':'租赁',
    'form.name.ph':'您的姓名','form.prov.ph':'曼谷...','form.prov.ph2':'曼谷',
    'form.detail.ph':'面积、地点、房间数...','form.detail2.ph':'面积、房间数、地点...',
    /* service cards */
    'srv.ac.name':'空调清洗','srv.ac.desc':'各类空调清洗',
    'srv.maid.name':'家政服务','srv.maid.desc':'优质家政清洁',
    'srv.furn.name':'家具维修','srv.furn.desc':'各类家具维修',
    'srv.plumb.name':'水管维修','srv.plumb.desc':'修复漏水管道',
    'srv.elec.name':'电气维修','srv.elec.desc':'家用电气服务',
    'srv.door.name':'门锁更换','srv.door.desc':'更换各类门锁',
    'srv.paint.name':'房屋粉刷','srv.paint.desc':'室内外粉刷',
    'srv.pest.name':'害虫防治','srv.pest.desc':'白蚁、蚂蚁、蟑螂',
    'srv.garden.name':'花园护理','srv.garden.desc':'草坪园艺服务',
    'srv.roof.name':'屋顶维修','srv.roof.desc':'修复漏水屋顶',
    'srv.cctv.name':'监控安装','srv.cctv.desc':'监控摄像系统',
    'srv.solar.name':'太阳能板','srv.solar.desc':'太阳能板安装',
    'srv.move.name':'搬家服务','srv.move.desc':'家具物品搬运',
    'srv.internet.name':'Wi-Fi安装','srv.internet.desc':'家庭网络布置',
    'srv.pool.name':'泳池维护','srv.pool.desc':'泳池清洁服务',
    'srv.photo.name':'房产摄影','srv.photo.desc':'专业拍摄房产照片',
    'srv.legal.name':'法律服务','srv.legal.desc':'房产法律顾问',
    /* listings page */
    'ls.back':'返回','ls.title':'所有房源','ls.map.btn':'地图搜索',
    'ls.map.close':'关闭','ls.map.title':'房产地图','ls.map.hint':'点击地图上的图钉以筛选结果',
    'ls.label.kw':'关键词','ls.label.tx':'购买/租赁','ls.label.type':'类型','ls.label.prov':'府/地区','ls.label.min':'最低价格','ls.label.max':'最高价格',
    'ls.btn.search':'搜索','ls.btn.reset':'重置',
    'ls.tab.all':'全部','ls.tab.buy':'🏠 购买','ls.tab.rent':'🔑 租赁','ls.tab.hot':'🔥 热门','ls.tab.new':'✨ 最新',
    'ls.count':'找到 {n} 个房源','ls.sort.label':'排序:',
    'ls.sort.default':'推荐','ls.sort.price_asc':'价格从低到高','ls.sort.price_desc':'价格从高到低',
    'ls.sort.newest':'最新','ls.sort.oldest':'最旧','ls.sort.alpha':'按字母排序',
    'ls.sidebar.types':'房产类型','ls.sidebar.consult':'免费咨询',
    'ls.sidebar.consult.sub':'Matchdoor团队随时为您找到理想的房产',
    'ls.sidebar.line':'Line','ls.sidebar.tel':'立即致电','ls.sidebar.transit':'近地铁/BTS',
  },
  ja: {
    'dd.prop.sec':'物件タイプ',
    'dd.all':'すべて','dd.house':'一戸建て','dd.town':'タウンハウス','dd.condo':'コンドミニアム',
    'dd.comm':'商業施設','dd.land':'土地','dd.villa':'ヴィラ','dd.resort':'リゾート','dd.hotel':'ホテル','dd.apt':'アパート',
    'dd.price.sec':'価格帯',
    'dd.price.all':'すべての価格','dd.price.unlim':'上限なし',
    'dd.price.1_3':'100〜300万バーツ','dd.price.start':'入門',
    'dd.price.3_5':'300〜500万バーツ','dd.price.pop':'人気',
    'dd.price.5_10':'500〜1000万バーツ','dd.price.prem':'プレミアム',
    'dd.price.10p':'1000万バーツ以上',
    'dd.rent.sec':'賃貸物件タイプ',
    'dd.rent.price.sec':'賃料帯（バーツ/月）',
    'dd.rent.all':'すべての賃料',
    'dd.rent.5k':'5,000バーツ以下','dd.rent.save':'格安',
    'dd.rent.10k':'10,000バーツ以下',
    'dd.rent.20k':'20,000バーツ以下',
    'dd.rent.50k':'50,000バーツ以下',
    'dd.rent.50kp':'50,000バーツ以上',
    'dd.rent.lux':'ラグジュアリー','dd.rent.superlux':'スーパーラグジュアリー',
    'dd.srv.sec':'修繕・ハウスケアサービス',
    'dd.srv.ac':'エアコン洗浄','dd.srv.maid':'家政婦サービス','dd.srv.furn':'家具修理',
    'dd.srv.plumb':'配管','dd.srv.elec':'電気設備','dd.srv.door':'ドアハンドル','dd.srv.paint':'外壁塗装',
    'dd.srv.viewall':'全サービスを見る',
    'dd.fav.title':'お気に入り','dd.fav.clear':'すべて削除','dd.fav.view':'すべて見る',
    'lang.header':'🌐 言語を選択',
    'mob.line':'LINE追加 — お問い合わせ',
    'float.bubble':'物件登録・物件探し<br>いつでもお気軽にご連絡を<br>スタッフが対応いたします 🙏',
    'float.tel':'電話',
    'sf.kw.label':'キーワード','sf.kw.ph':'物件名・エリアを入力...',
    'sf.type.label':'タイプ','sf.type.all':'すべてのタイプ',
    'sf.prov.label':'県 / エリア','sf.prov.all':'すべてのエリア',
    'sf.dist.head':'郡 / 区','sf.dist.all':'全区域・','sf.dist.back':'戻る',
    'sf.prov.head':'県','sf.prov.clear':'選択を解除',
    'sf.min.label':'最低価格','sf.max.label':'最高価格',
    'sf.btn':'検索','sf.btn.reset':'リセット',
    'qs.popular':'人気エリア','qs.bkk':'📍 バンコク — 人気エリア','qs.other':'🏙️ その他のゾーン',
    'qs.prov':'県','qs.central':'🌆 中部・大バンコク','qs.east':'🌊 東部・南部','qs.north':'🏔️ 北部・東北部',
    'qs.bts':'BTS','qs.bts.suk':'🟢 スクンビット線 (N–CEN–E)','qs.bts.sil':'🟢 シーロム線 (S–W)',
    'qs.mrt':'MRT','qs.mrt.blue':'🔵 ブルーライン','qs.mrt.purple':'🟣 パープルライン',
    'qs.uni':'大学','qs.uni.sec':'🎓 主要大学',
    'pc.all.tag':'全物件','pc.all.title':'すべての価格帯','pc.all.desc':'すべての物件を見る',
    'pc.1_3.tag':'入門','pc.1_3.title':'100〜300万バーツ','pc.1_3.desc':'初めての方向け',
    'pc.3_5.tag':'人気','pc.3_5.title':'300〜500万バーツ','pc.3_5.desc':'品質良好・好立地',
    'pc.5p.tag':'Luxury','pc.5p.title':'500万バーツ以上','pc.5p.desc':'プレミアムクラス',
    'pr.10k.tag':'格安','pr.10k.title':'10,000バーツ以下','pr.10k.desc':'リーズナブルな賃料',
    'pr.10_50.tag':'人気','pr.10_50.title':'10,000〜50,000バーツ','pr.10_50.desc':'好立地・コスパ良好',
    'pr.50_100.tag':'プレミアム','pr.50_100.title':'50,000〜100,000バーツ','pr.50_100.desc':'プレミアムクラス',
    'pr.100kp.tag':'Luxury','pr.100kp.title':'10万バーツ以上','pr.100kp.desc':'スーパーラグジュアリー',
    'sec.hot':'🔥 人気物件','sec.viewall':'すべて見る →',
    'sec.new':'最新物件','sec.all':'すべての物件','sec.osrv':'その他のサービス',
    /* card badges */
    'card.new':'新着','card.rent':'賃貸','card.buy':'売却',
    /* property types */
    'type.บ้านเดี่ยว':'一戸建て','type.ทาวน์โฮม':'タウンハウス','type.คอนโด':'コンドミニアム',
    'type.อาคารพาณิชย์':'商業施設','type.ที่ดิน':'土地','type.วิลล่า':'ヴィラ',
    'type.รีสอร์ท':'リゾート','type.โรงแรม':'ホテル','type.อพาร์ตเมนต์':'アパート',
    /* page heroes */
    'ph.fav.back':'ホームに戻る','ph.fav.h1':'マイお気に入り','ph.fav.sub':'保存した物件一覧',
    'ph.fav.total':'合計','ph.fav.buy':'売却','ph.fav.rent':'賃貸',
    'ph.fav.clear':'すべて削除','ph.fav.share':'リストを共有',
    'ph.ag.back':'ホームに戻る','ph.ag.h1':'エージェントチーム','ph.ag.sub':'プロが全プロセスをサポート',
    'ph.ag.listings':'総物件数','ph.ag.deals':'成約件数',
    'ph.port.back':'ホームに戻る','ph.port.h1':'実績一覧','ph.port.sub':'売却・賃貸に成功した物件とお客様の声',
    'ph.port.sold':'売却済み','ph.port.rented':'賃貸済み','ph.port.happy':'満足したお客様',
    'ph.port.status.sold':'売却完了','ph.port.status.rented':'賃貸完了',
    'ph.port.label.loc':'📍 所在地','ph.port.label.price':'💰 価格','ph.port.label.date':'📅 成約日',
    'gf.all':'すべて',
    'ag.apply.agent':'エージェント応募','ag.apply.other':'その他ポジション応募',
    /* agent card */
    'ag.props':'担当物件','ag.deals':'成約',
    /* footer nav columns */
    'ft.col.main':'メインメニュー','ft.col.home':'ホーム','ft.col.new':'新着',
    'ft.col.portfolio':'実績','ft.col.blog':'ブログ','ft.col.agents':'エージェント','ft.col.srv':'その他サービス',
    'ft.col.type':'物件タイプ','ft.col.area':'エリア','ft.col.province':'県',
    'ft.type.house':'一戸建て','ft.type.town':'タウンハウス','ft.type.condo':'コンドミニアム',
    'ft.type.comm':'商業施設','ft.type.land':'土地','ft.type.buy':'売買','ft.type.rent':'賃貸',
    /* modal extras */
    'modal.nearby':'近隣物件','modal.elec':'電気料金','modal.water':'水道料金',
    'modal.deposit2':'敷金','modal.advance':'前払い金','modal.svcfee':'その他費用',
    'modal.appliances':'家電','modal.nearby.places':'近隣スポット',
    'modal.furn.full':'家具付き','modal.furn.partial':'一部家具付き','modal.furn.none':'家具なし',
    'chip.appliances':'家電','chip.furniture':'家具','chip.amenities':'設備',
    'pdi.bed':'寝室','pdi.bath':'浴室','pdi.area':'㎡','pdi.land':'タラン・ワー','pdi.floor':'階','pdi.park':'台',
    'pdi.furn.full':'家具付き','pdi.pets':'ペット可',
    'spec.area':'㎡','spec.land':'土地（タラン・ワー）','spec.bed':'寝室','spec.bath':'浴室',
    'spec.park':'駐車場','spec.floor':'階/総階数','spec.furn':'家具','spec.pets':'ペット',
    'spec.furn.full':'家具付き','spec.furn.partial':'一部','spec.furn.none':'なし',
    'modal.line':'LINEチャット','modal.tel':'お電話','modal.360':'360°ビュー','modal.drag':'ドラッグして回転',
    'modal.fav.add':'お気に入りに追加','modal.fav.added':'保存済み ✓',
    'cta.line':'LINEチャット','cta.tel':'お電話','cta.consult':'無料相談','cta.call':'今すぐ電話','cta.contact':'チームに連絡','cta.chat':'チャット相談',
    'srv.title':'不動産フルサポートサービス','srv.sub':'売買・賃貸のご相談はお気軽に',
    'srv.i1':'市場分析に基づくプロの価格設定',
    'srv.i2':'オンライン・オフライン全方位マーケティング',
    'srv.i3':'豊富な購入者・借り主のデータベース',
    'srv.i4':'ローン・住宅融資のサポート',
    'srv.i5':'登記・引き渡しまで一貫サポート',
    'fl.bkk.buy':'バンコク売買','fl.nnb.buy':'ノンタブリー売買','fl.cbl.buy':'チョンブリー売買',
    'fl.bkk.rent':'バンコク賃貸','fl.loc':'人気エリア','fl.uni':'大学周辺',
    'fl.sell.house.bkk':'バンコク一戸建て売却','fl.sell.town.bkk':'バンコクタウンハウス売却',
    'fl.sell.condo.bkk':'バンコクコンド売却','fl.sell.land.bkk':'バンコク土地売却','fl.sell.comm.bkk':'バンコク商業物件売却',
    'fl.sell.house.nnb':'ノンタブリー一戸建て売却','fl.sell.town.nnb':'ノンタブリータウンハウス売却',
    'fl.sell.condo.nnb':'ノンタブリーコンド売却','fl.sell.land.nnb':'ノンタブリー土地売却',
    'fl.sell.house.cbl':'チョンブリー一戸建て売却','fl.sell.town.cbl':'チョンブリータウンハウス売却','fl.sell.condo.cbl':'チョンブリーコンド売却','fl.pattaya':'パタヤの物件',
    'fl.rent.house.bkk':'バンコク一戸建て賃貸','fl.rent.town.bkk':'バンコクタウンハウス賃貸','fl.rent.condo.bkk':'バンコクコンド賃貸',
    'fl.rent.condo.sukhumvit':'スクンビットコンド賃貸','fl.rent.condo.asok':'アソークコンド賃貸',
    'fl.loc.sukhumvit':'スクンビット周辺コンド','fl.loc.sathorn':'サートーンの物件',
    'fl.loc.rachada':'ラチャダー周辺物件','fl.loc.ladprao':'ラープラーオの物件',
    'fl.loc.asok':'アソーク周辺コンド','fl.loc.rama9':'ラマ9周辺物件',
    'fl.loc.thonglor':'トンロー周辺コンド','fl.loc.phrakhanong':'プラカノン-BTS周辺コンド',
    'fl.uni.chula':'チュラロンコン大学周辺コンド','fl.uni.thammasat':'タマサート大学周辺賃貸',
    'fl.uni.kaset':'カセサート大学周辺物件','fl.uni.mahidol':'マヒドン大学周辺コンド',
    'fl.uni.rangsit':'ランシット大学周辺賃貸','fl.uni.abac':'ABAC大学周辺物件',
    'fl.uni.silpakorn':'シラパコン大学周辺コンド','fl.uni.siam':'サイアム周辺コンド',
    'ft.col.prop':'物件','ft.col.svc':'サービス','ft.col.info':'情報','ft.col.legal':'法律','ft.col.contact':'お問い合わせ',
    'ft.legal.privacy':'プライバシーポリシー','ft.legal.terms':'利用規約',
    'ft.legal.buysell':'売買条件','ft.legal.aup':'利用規則',
    'ft.legal.cookie':'Cookieポリシー','ft.legal.terms2':'利用規約・条件','ft.legal.contact':'お問い合わせ',
    'ft.area.sukhumvit':'スクンビット','ft.area.sathorn':'サートーン','ft.area.rachada':'ラチャダー',
    'ft.area.ladprao':'ラープラーオ','ft.area.rama9':'ラマ9','ft.area.bangna':'バンナー',
    'ft.prov.bkk':'バンコク','ft.prov.nnt':'ノンタブリー','ft.prov.ptm':'パトゥムターニー',
    'ft.prov.smk':'サムットプラーカーン','ft.prov.cbl':'チョンブリー','ft.prov.pkt':'プーケット',
    'ft.copy':'© ' + new Date().getFullYear() + ' Matchdoor. All Rights Reserved.',
    'form.dep.title':'物件登録','form.dep.sub':'基本情報をご入力ください。担当者よりご連絡いたします',
    'form.wish.title':'購入希望登録','form.wish.sub':'ご希望の条件をお知らせください。物件を探します',
    'form.name':'氏名 *','form.phone':'電話番号 *','form.lineid':'Line ID','form.lineid2':'Your Line ID','form.email2':'Your email',
    'form.type':'物件タイプ','form.type2':'タイプ','form.budget':'上限予算（バーツ）',
    'form.prov':'県','form.tx':'目的','form.tx2':'購入 / 賃貸',
    'form.detail':'詳細','form.detail2':'追加詳細',
    'form.price':'価格（バーツ）',
    'form.upload':'写真アップロード（最大5枚）','form.dropzone':'ドラッグ＆ドロップまたはクリックして選択',
    'form.dropzone.sub':'JPG/PNG 最大5MB',
    'form.consent.dep':'物件登録サービスのため、個人情報および物件写真の収集・利用に同意します。詳細は',
    'form.consent.wish':'不動産サービスのため、個人情報の収集・利用に同意します。詳細は',
    'form.consent.link':'プライバシーポリシー',
    'form.consent.err':'⚠️ 送信前にご同意ください',
    'form.login':'ログインして送信','form.ok':'送信完了！','form.dep.submit':'物件情報を送信','form.wish.submit':'希望を送信',
    'form.select':'-- 選択してください --',
    /* advanced filter panel */
    'af.title':'詳細フィルター','af.btn.label':'詳細フィルター',
    'af.sec.price':'価格帯（バーツ）','af.price.min':'最低価格','af.price.max':'最高価格（上限なし）',
    'af.sec.popular':'人気エリア',
    'af.sec.prov':'県（全77県）','af.prov.all':'全県',
    'af.sec.bts':'BTS駅近く','af.bts.all':'全BTS/SRT/ARL駅',
    'af.sec.mrt':'MRT駅近く','af.mrt.all':'全MRT/BEM駅',
    'af.sec.uni':'大学近く','af.uni.all':'全大学',
    'af.sec.land':'土地面積（タラン・ワー）','af.sec.area':'使用面積（㎡）',
    'af.all.size':'全サイズ','af.min':'最低','af.max':'最高','af.unlimited':'上限なし',
    'af.sec.bed':'寝室','af.sec.bath':'浴室','af.sec.park':'駐車場',
    'af.sec.furn':'家具','af.sec.pets':'ペット','af.sec.app':'家電',
    'af.room1':'1部屋','af.room2':'2部屋','af.room3':'3部屋','af.room4':'4部屋以上',
    'af.car1':'1台','af.car2':'2台','af.car3':'3台以上',
    'af.furn.full':'家具完備','af.furn.part':'家具一部','af.furn.none':'家具なし',
    'af.pets.ok':'ペット可',
    'af.app.ac':'エアコン','af.app.fridge':'冷蔵庫','af.app.washer':'洗濯機',
    'af.app.heater':'給湯器','af.app.tv':'テレビ','af.app.micro':'電子レンジ',
    'af.app.stove':'IHコンロ','af.app.security':'セキュリティシステム',
    'af.btn.reset':'リセット','af.btn.apply':'検索結果',
    'form.sell':'売却','form.rent':'賃貸','form.buy':'購入','form.dorrent':'賃借',
    'form.name.ph':'お名前','form.prov.ph':'バンコク...','form.prov.ph2':'バンコク',
    'form.detail.ph':'面積、立地、部屋数...','form.detail2.ph':'面積、部屋数、エリア...',
    /* service cards */
    'srv.ac.name':'エアコン洗浄','srv.ac.desc':'全タイプのエアコン洗浄',
    'srv.maid.name':'家政婦サービス','srv.maid.desc':'高品質ハウスクリーニング',
    'srv.furn.name':'家具修理','srv.furn.desc':'全種類の家具修理',
    'srv.plumb.name':'配管修理','srv.plumb.desc':'水漏れ・配管修理',
    'srv.elec.name':'電気修理','srv.elec.desc':'住宅電気設備',
    'srv.door.name':'ドアハンドル','srv.door.desc':'全タイプ交換',
    'srv.paint.name':'ペンキ塗装','srv.paint.desc':'内外装ペンキ',
    'srv.pest.name':'害虫駆除','srv.pest.desc':'シロアリ・ゴキブリ',
    'srv.garden.name':'庭園管理','srv.garden.desc':'芝刈り・造園',
    'srv.roof.name':'屋根修理','srv.roof.desc':'雨漏り修理',
    'srv.cctv.name':'防犯カメラ','srv.cctv.desc':'セキュリティカメラ',
    'srv.solar.name':'太陽光パネル','srv.solar.desc':'ソーラー設置',
    'srv.move.name':'引っ越し','srv.move.desc':'家具・荷物搬送',
    'srv.internet.name':'Wi-Fi設置','srv.internet.desc':'ホームネット構築',
    'srv.pool.name':'プール管理','srv.pool.desc':'プール清掃サービス',
    'srv.photo.name':'不動産写真撮影','srv.photo.desc':'物件プロ撮影サービス',
    'srv.legal.name':'法務サービス','srv.legal.desc':'不動産法律アドバイス',
    /* listings page */
    'ls.back':'戻る','ls.title':'物件一覧','ls.map.btn':'地図で検索',
    'ls.map.close':'閉じる','ls.map.title':'不動産マップ','ls.map.hint':'地図のピンをクリックして絞り込む',
    'ls.label.kw':'キーワード','ls.label.tx':'売買/賃貸','ls.label.type':'タイプ','ls.label.prov':'県/エリア','ls.label.min':'最低価格','ls.label.max':'最高価格',
    'ls.btn.search':'検索','ls.btn.reset':'リセット',
    'ls.tab.all':'すべて','ls.tab.buy':'🏠 購入','ls.tab.rent':'🔑 賃貸','ls.tab.hot':'🔥 人気','ls.tab.new':'✨ 新着',
    'ls.count':'{n} 件見つかりました','ls.sort.label':'並び順:',
    'ls.sort.default':'おすすめ','ls.sort.price_asc':'価格: 低→高','ls.sort.price_desc':'価格: 高→低',
    'ls.sort.newest':'新しい順','ls.sort.oldest':'古い順','ls.sort.alpha':'五十音順',
    'ls.sidebar.types':'物件タイプ','ls.sidebar.consult':'無料相談',
    'ls.sidebar.consult.sub':'Matchdoorのチームがあなたに最適な物件を探します',
    'ls.sidebar.line':'Line','ls.sidebar.tel':'今すぐ電話','ls.sidebar.transit':'BTS/MRT沿線',
  }
};

function ui(key){
  const d=UI_TEXT[_lang]||UI_TEXT.th;
  if(d[key]!==undefined) return d[key];
  if(UI_TEXT.th[key]!==undefined) return UI_TEXT.th[key];
  // fallback: check I18N_DICT
  const e=I18N_DICT[key];
  if(e) return e[_lang]||e['th']||key;
  return key;
}

function toggleLangDD(){
  const panel=document.getElementById('lang-panel');
  const trigger=document.getElementById('lang-trigger');
  if(!panel||!trigger)return;
  const isOpen=panel.classList.contains('open');
  if(!isOpen) closeAllDD();
  panel.classList.toggle('open',!isOpen);
  trigger.classList.toggle('open',!isOpen);
}
function closeLangDD(){
  const panel=document.getElementById('lang-panel');
  const trigger=document.getElementById('lang-trigger');
  if(panel)panel.classList.remove('open');
  if(trigger)trigger.classList.remove('open');
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#lang-dd')) closeLangDD();
});
function setLang(lang){
  _lang=lang;
  localStorage.setItem('md_lang',lang);
  const meta=LANG_META[lang]||LANG_META.th;
  const flagEl=document.getElementById('trigger-flag');
  const codeEl=document.getElementById('trigger-code');
  if(flagEl)flagEl.textContent=meta.flag;
  if(codeEl)codeEl.textContent=meta.code;
  Object.keys(LANG_META).forEach(k=>{
    const opt=document.getElementById('lopt-'+k);
    if(opt)opt.classList.toggle('selected',k===lang);
  });
  closeLangDD();
  applyLang();
  // Re-render popup if currently open
  const allModal=document.getElementById('all-modal');
  if(allModal && allModal.classList.contains('open') && window._modalCurrentType){
    openAllModal(window._modalCurrentType);
  }
}

function _setText(id,txt){const e=document.getElementById(id);if(e)e.textContent=txt;}
function _setHTML(id,html){const e=document.getElementById(id);if(e)e.innerHTML=html;}
function _setAttr(id,attr,val){const e=document.getElementById(id);if(e)e.setAttribute(attr,val);}
function _setQSel(sel,txt){const e=document.querySelector(sel);if(e)e.textContent=txt;}
function _setQSelHTML(sel,html){const e=document.querySelector(sel);if(e)e.innerHTML=html;}

function applyLang(){
  // Text i18n — I18N_DICT keys
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.getAttribute('data-i18n');
    const e=I18N_DICT[key];
    if(e){ el.textContent=e[_lang]||e['th']||key; return; }
    // fallback: try UI_TEXT
    const uiVal=ui(key); if(uiVal!==key) el.textContent=uiVal;
  });
  // HTML i18n (for elements with <span>, <br> inside)
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{
    const key=el.getAttribute('data-i18n-html');
    const e=I18N_DICT[key]; if(e) el.innerHTML=e[_lang]||e['th']||key;
  });
  // html lang attribute
  document.documentElement.lang=_lang==='en'?'en':_lang==='cn'?'zh':_lang==='ja'?'ja':'th';
  // Font family for CJK
  if(_lang==='ja') document.body.style.fontFamily="'Noto Sans JP','Noto Sans Thai',sans-serif";
  else if(_lang==='cn') document.body.style.fontFamily="'Noto Sans SC','Noto Sans Thai',sans-serif";
  else document.body.style.fontFamily="";

  // Page title
  if(_lang==='en') document.title='Matchdoor — Buy, Rent & Sell Properties in Thailand';
  else if(_lang==='cn') document.title='Matchdoor — 泰国房产买卖与租赁';
  else if(_lang==='ja') document.title='Matchdoor — タイの不動産売買・賃貸';
  else document.title='Matchdoor — ขายบ้าน คอนโด ที่ดิน อสังหาฯทุกประเภท';

  // ── Nav dropdowns ──
  // Property dropdown
  _setQSel('#dd-prop .dd-sec:first-child .dd-sec-title', ui('dd.prop.sec'));
  const propItems = document.querySelectorAll('#dd-prop .dd-sec:first-child .dd-item');
  const propKeys = ['dd.all','dd.house','dd.town','dd.condo','dd.comm','dd.land','dd.villa','dd.resort'];
  propItems.forEach((el,i)=>{ if(propKeys[i]){const ico=el.querySelector('i');const t=ui(propKeys[i]);el.textContent=t;if(ico)el.insertBefore(ico,el.firstChild);} });
  const priceSecs = document.querySelectorAll('#dd-prop .dd-sec');
  if(priceSecs[1]){ priceSecs[1].querySelector('.dd-sec-title').textContent=ui('dd.price.sec'); }
  const priceRows = document.querySelectorAll('#dd-prop .dd-row');
  if(priceRows.length>=3){
    const prl=[['dd.price.all','dd.price.unlim'],['dd.price.1_3','dd.price.start'],['dd.price.3_5','dd.price.pop'],['dd.price.5_10','dd.rent.lux']];
    priceRows.forEach((row,i)=>{ if(!prl[i])return; const spans=row.querySelectorAll('span'); if(spans[0]){const ico=spans[0].querySelector('i');spans[0].textContent=ui(prl[i][0]);if(ico)spans[0].insertBefore(ico,spans[0].firstChild);} if(spans[1]&&prl[i][1])spans[1].textContent=ui(prl[i][1]); });
  }
  // Rent dropdown
  _setQSel('#dd-rent .dd-sec:first-child .dd-sec-title', ui('dd.rent.sec'));
  const rentItems = document.querySelectorAll('#dd-rent .dd-sec:first-child .dd-item');
  const rentKeys = ['dd.all','dd.house','dd.town','dd.condo','dd.comm','dd.land','dd.villa','dd.apt'];
  rentItems.forEach((el,i)=>{ if(rentKeys[i]){const ico=el.querySelector('i');const t=ui(rentKeys[i]);el.textContent=t;if(ico)el.insertBefore(ico,el.firstChild);} });
  const rentSec2 = document.querySelector('#dd-rent .dd-sec:nth-child(2) .dd-sec-title');
  if(rentSec2) rentSec2.textContent=ui('dd.rent.price.sec');
  const rentRows = document.querySelectorAll('#dd-rent .dd-row');
  if(rentRows.length>=4){
    const rrl=[['dd.rent.all','dd.price.unlim'],['dd.rent.10k','dd.rent.save'],['dd.rent.50k','dd.price.pop'],['dd.rent.50k','dd.price.prem'],['dd.rent.50kp','dd.rent.lux']];
    rentRows.forEach((row,i)=>{ if(!rrl[i])return; const spans=row.querySelectorAll('span'); if(spans[0]){const ico=spans[0].querySelector('i');spans[0].textContent=ui(rrl[i][0]);if(ico)spans[0].insertBefore(ico,spans[0].firstChild);} if(spans[1]&&rrl[i][1])spans[1].textContent=ui(rrl[i][1]); });
  }
  // Service dropdown — render จาก services array (ไม่ใช้ hardcode map อีกต่อไป)
  renderSrvDropdown();
  const srvViewAllSpan=document.querySelector('[data-srvdd-viewall]');
  if(srvViewAllSpan)srvViewAllSpan.textContent=ui('dd.srv.viewall');
  const srvViewAllBtn=document.querySelector('#dd-srv .btn-view-fav');
  if(srvViewAllBtn){const ico=srvViewAllBtn.querySelector('i');}
  // Favorites panel
  const favH3=document.querySelector('#dd-fav .fav-header h3');
  if(favH3){const ico=favH3.querySelector('i');const pill=favH3.querySelector('.fav-count-pill');favH3.textContent=ui('dd.fav.title')+' ';if(ico)favH3.insertBefore(ico,favH3.firstChild);if(pill)favH3.appendChild(pill);}
  _setQSel('#dd-fav .fav-clear', ui('dd.fav.clear'));
  const favViewAll=document.querySelector('#dd-fav .btn-view-fav');
  if(favViewAll){const ico=favViewAll.querySelector('i');favViewAll.textContent=ui('dd.fav.view');if(ico)favViewAll.insertBefore(ico,favViewAll.firstChild);}
  // Deposit form
  const depH3=document.querySelector('#dd-dep .dp h3');
  if(depH3){const ico=depH3.querySelector('i');depH3.textContent=ui('form.dep.title');if(ico)depH3.insertBefore(ico,depH3.firstChild);}
  _setQSel('#dd-dep .dp p', ui('form.dep.sub'));
  // Wish form
  const wishH3=document.querySelector('#dd-wish .dp h3');
  if(wishH3){const ico=wishH3.querySelector('i');wishH3.textContent=ui('form.wish.title');if(ico)wishH3.insertBefore(ico,wishH3.firstChild);}
  _setQSel('#dd-wish .dp p', ui('form.wish.sub'));
  // lang panel header
  _setQSel('#lang-panel .lang-panel-header', ui('lang.header'));
  // mob line
  _setQSel('.mob-line-btn', ui('mob.line'));
  // float bubble
  _setHTML('float-bubble', '<button class="float-bubble-close" onclick="document.getElementById(\'float-bubble\').style.display=\'none\'">×</button><p>'+ui('float.bubble')+'</p><div class="float-bubble-tail"></div>');
  // float tel label
  const fTel=document.querySelector('#f-tel .fb-lbl');if(fTel)fTel.textContent=ui('float.tel');

  // ── Search form ──
  const kw=document.getElementById('s-kw');
  if(kw){kw.placeholder=ui('sf.kw.ph');}
  const sfLabels=document.querySelectorAll('.sf label');
  if(sfLabels.length>=5){
    sfLabels[0].innerHTML='<i class="fas fa-search"></i> '+ui('sf.kw.label');
    sfLabels[1].innerHTML='<i class="fas fa-building"></i> '+ui('sf.type.label');
    // ── loc-drill-label: อย่า overwrite innerHTML ทั้งหมด เพราะจะลบ span#loc-drill-label-text ทิ้ง ──
    const _locLblSpan = document.getElementById('loc-drill-label-text');
    if(_locLblSpan) { _locLblSpan.textContent = ui('sf.prov.label'); }
    else { sfLabels[2].innerHTML='<i class="fas fa-map-marker-alt"></i> <span id="loc-drill-label-text">'+ui('sf.prov.label')+'</span>'; }
    sfLabels[3].innerHTML='<i class="fas fa-tag"></i> '+ui('sf.min.label');
    sfLabels[4].innerHTML='<i class="fas fa-tag"></i> '+ui('sf.max.label');
  }
  const sType=document.getElementById('s-type');
  if(sType){
    const typeKeyMap={'':'sf.type.all','บ้านเดี่ยว':'dd.house','ทาวน์โฮม':'dd.town','คอนโด':'dd.condo','อาคารพาณิชย์':'dd.comm','ที่ดิน':'dd.land','วิลล่า':'dd.villa','รีสอร์ท':'dd.resort','โรงแรม':'dd.hotel'};
    Array.from(sType.options).forEach((opt)=>{ const k=typeKeyMap[opt.value]; if(k) opt.textContent=ui(k); });
  }
  const sProv=document.getElementById('s-prov');
  if(sProv&&sProv.options[0])sProv.options[0].textContent=ui('sf.prov.all');
  // ── Update loc-drill-display button text when language changes ──
  (function(){
    const disp=document.getElementById('loc-drill-display');
    if(disp&&!_locProv&&!_locDist){ disp.textContent=ui('sf.prov.all'); }
  })();
  const btnSearch=document.querySelector('.btn-search');
  if(btnSearch){const ico=btnSearch.querySelector('i');btnSearch.textContent=ui('sf.btn');if(ico)btnSearch.insertBefore(ico,btnSearch.firstChild);}
  const btnReset=document.querySelector('.btn-reset-search');
  if(btnReset){const ico=btnReset.querySelector('i');btnReset.textContent=' '+ui('sf.btn.reset');if(ico)btnReset.insertBefore(ico,btnReset.firstChild);}

  // ── Quick search bar labels ──
  const qsBtns=document.querySelectorAll('.qs-dd-btn');
  const qsLabels=[['qs.popular',0],['qs.bts',1],['qs.mrt',2],['qs.uni',3]];
  qsBtns.forEach((btn,i)=>{
    if(!qsLabels[i])return;
    const icon=btn.querySelector('.qs-icon');const chev=btn.querySelector('.chevdown');
    const txt=ui(qsLabels[i][0]);
    btn.textContent=txt;
    if(icon)btn.insertBefore(icon,btn.firstChild);
    if(chev)btn.appendChild(chev);
  });
  // QS section headers
  const qsSecHeaders=document.querySelectorAll('.qs-dd-sec');
  const qsSecMap={
    0:['qs.bkk','qs.other'],
    1:['qs.bts.suk','qs.bts.sil'],
    2:['qs.mrt.blue','qs.mrt.purple'],
    3:['qs.uni.sec']
  };
  let panelIdx=0,secInPanel=0;
  const qsPanels=['qs-popular-dd','qs-bts-dd','qs-mrt-dd','qs-uni-dd'];
  qsPanels.forEach((pid,pi)=>{
    const panel=document.getElementById(pid);if(!panel)return;
    const secs=panel.querySelectorAll('.qs-dd-sec');
    secs.forEach((sec,si)=>{if(qsSecMap[pi]&&qsSecMap[pi][si])sec.textContent=ui(qsSecMap[pi][si]);});
  });
  // ── qs-popular-select: update first option label ──
  const qsPopSel=document.getElementById('qs-popular-select');
  if(qsPopSel&&qsPopSel.options[0]) qsPopSel.options[0].textContent='🔥 '+ui('qs.popular');

  // ── Price cards – Buy ──
  const buyCards=document.querySelectorAll('#price-buy-section .price-card');
  const buyData=[
    ['pc.all.tag','pc.all.title','pc.all.desc'],
    ['pc.1_3.tag','pc.1_3.title','pc.1_3.desc'],
    ['pc.3_5.tag','pc.3_5.title','pc.3_5.desc'],
    ['pc.5p.tag','pc.5p.title','pc.5p.desc'],
  ];
  buyCards.forEach((card,i)=>{
    if(!buyData[i])return;
    const tag=card.querySelector('.pc-tag');const h3=card.querySelector('h3');const p=card.querySelector('p');
    if(tag)tag.textContent=ui(buyData[i][0]);if(h3)h3.textContent=ui(buyData[i][1]);if(p)p.textContent=ui(buyData[i][2]);
  });
  // ── Price cards – Rent ──
  const rentCards=document.querySelectorAll('#price-rent-section .price-card');
  const rentData=[
    ['pr.10k.tag','pr.10k.title','pr.10k.desc'],
    ['pr.10_50.tag','pr.10_50.title','pr.10_50.desc'],
    ['pr.50_100.tag','pr.50_100.title','pr.50_100.desc'],
    ['pr.100kp.tag','pr.100kp.title','pr.100kp.desc'],
  ];
  rentCards.forEach((card,i)=>{
    if(!rentData[i])return;
    const tag=card.querySelector('.pc-tag');const h3=card.querySelector('h3');const p=card.querySelector('p');
    if(tag)tag.textContent=ui(rentData[i][0]);if(h3)h3.textContent=ui(rentData[i][1]);if(p)p.textContent=ui(rentData[i][2]);
  });

  // ── Section titles (non-data-i18n) ──
  const hotTitle=document.querySelector('#rec-sec .sec-title');
  if(hotTitle){const ico=hotTitle.querySelector('i');hotTitle.textContent=ui('sec.hot');if(ico)hotTitle.insertBefore(ico,hotTitle.firstChild);}
  _setQSel('#new-sec .sec-title', ui('sec.new'));
  _setText('all-title', ui('sec.all'));
  // ── Result count (res-count) — update label text to match current language ──
  (function(){
    const rc=document.getElementById('res-count');
    if(rc){
      const m=rc.textContent.match(/\d+/);
      if(m){
        const n=m[0];
        rc.textContent=_lang==='en'?`Found ${n} listings`:_lang==='cn'?`找到 ${n} 个房源`:_lang==='ja'?`${n} 件見つかりました`:`พบ ${n} รายการ`;
      }
    }
  })();
  _setQSel('#osrv-sec .sec-title', ui('sec.osrv'));
  // "View all" buttons
  document.querySelectorAll('.view-all').forEach(el=>{if(!el.getAttribute('data-keep-text'))el.textContent=ui('sec.viewall');});

  // ── Service section ──
  _setText('srv-title', ui('srv.title'));
  _setText('srv-sub', ui('srv.sub'));
  const srvItems=document.querySelectorAll('.srv-item span');
  const srvItemKeys=['srv.i1','srv.i2','srv.i3','srv.i4','srv.i5'];
  srvItems.forEach((el,i)=>{if(srvItemKeys[i])el.textContent=ui(srvItemKeys[i]);});

  // ── Footer link columns ──
  const flInner=document.querySelector('.flink-inner');
  if(flInner){
    const cols=flInner.querySelectorAll('div');
    if(cols[0]){
      const h4=cols[0].querySelector('h4');if(h4)h4.textContent=ui('fl.bkk.buy');
      const links=cols[0].querySelectorAll('a');
      const lk=['fl.sell.house.bkk','fl.sell.town.bkk','fl.sell.condo.bkk','fl.sell.land.bkk','fl.sell.comm.bkk'];
      links.forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});
    }
    if(cols[1]){
      const h4=cols[1].querySelector('h4');if(h4)h4.textContent=ui('fl.nnb.buy');
      const links=cols[1].querySelectorAll('a');
      const lk=['fl.sell.house.nnb','fl.sell.town.nnb','fl.sell.condo.nnb','fl.sell.land.nnb'];
      links.forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});
    }
    if(cols[2]){
      const h4=cols[2].querySelector('h4');if(h4)h4.textContent=ui('fl.cbl.buy');
      const links=cols[2].querySelectorAll('a');
      const lk=['fl.sell.house.cbl','fl.sell.town.cbl','fl.sell.condo.cbl','fl.pattaya'];
      links.forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});
    }
    if(cols[3]){
      const h4=cols[3].querySelector('h4');if(h4)h4.textContent=ui('fl.bkk.rent');
      const links=cols[3].querySelectorAll('a');
      const lk=['fl.rent.house.bkk','fl.rent.town.bkk','fl.rent.condo.bkk','fl.rent.condo.sukhumvit','fl.rent.condo.asok'];
      links.forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});
    }
    if(cols[4]){
      const h4=cols[4].querySelector('h4');if(h4)h4.textContent=ui('fl.loc');
      const links=cols[4].querySelectorAll('a');
      const lk=['fl.loc.sukhumvit','fl.loc.sathorn','fl.loc.rachada','fl.loc.ladprao','fl.loc.asok','fl.loc.rama9','fl.loc.thonglor','fl.loc.phrakhanong'];
      links.forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});
    }
    if(cols[5]){
      const h4=cols[5].querySelector('h4');if(h4)h4.textContent=ui('fl.uni');
      const links=cols[5].querySelectorAll('a');
      const lk=['fl.uni.chula','fl.uni.thammasat','fl.uni.kaset','fl.uni.mahidol','fl.uni.rangsit','fl.uni.abac','fl.uni.silpakorn','fl.uni.siam'];
      links.forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});
    }
  }

  // ── Footer legal bar ── (text handled by data-i18n spans in generic sweep above)
  // Ensure all footer-legal-bar spans with data-i18n get updated (including cloned ones)
  document.querySelectorAll('.footer-legal-bar [data-i18n]').forEach(el=>{
    const v=ui(el.getAttribute('data-i18n')); if(v) el.textContent=v;
  });
  const flb=document.querySelector('.footer-legal-bar');
  if(flb){ /* flb-copy now updated via querySelectorAll('.flb-copy') below */ }

  // ── Deposit form fields ──
  (function(){
    function setLabel(sel,txt){const e=document.querySelector(sel);if(e)e.textContent=txt;}
    // deposit form labels
    const depLabels=document.querySelectorAll('#dep-form label');
    const depLabelKeys=['form.name','form.phone','form.lineid2','form.email2','form.prov','form.tx','form.detail'];
    depLabels.forEach((lbl,i)=>{if(depLabelKeys[i])lbl.textContent=ui(depLabelKeys[i]);});
    const dName=document.getElementById('d-name');if(dName)dName.placeholder=ui('form.name.ph');
    const dPhone=document.getElementById('d-phone');if(dPhone)dPhone.placeholder='08X-XXX-XXXX';
    const dProv=document.getElementById('d-prov');if(dProv)dProv.placeholder=ui('form.prov.ph2');
    const dDetail=document.getElementById('d-detail');if(dDetail)dDetail.placeholder=ui('form.detail.ph');
    const dType=document.getElementById('d-type');
    if(dType){const opts=Array.from(dType.options);const k=['form.select','dd.house','dd.town','dd.condo','dd.comm','dd.land'];opts.forEach((o,i)=>{if(k[i])o.textContent=ui(k[i]);});}
    const dTx=document.getElementById('d-tx');
    if(dTx){const opts=Array.from(dTx.options);if(opts[0])opts[0].textContent=ui('form.sell');if(opts[1])opts[1].textContent=ui('form.rent');}
    // upload section
    const uploadLabel=document.querySelector('#dep-form .fg label[for="d-photo"],.fg label:has(+ .dropzone)');
    const allDepLabels=document.querySelectorAll('#dep-form label');
    allDepLabels.forEach(lbl=>{
      if(lbl.getAttribute('for')==='d-photo'||lbl.textContent.includes('อัปโหลด')||lbl.textContent.includes('Upload')||lbl.textContent.includes('上传')||lbl.textContent.includes('アップロード')){
        lbl.textContent=ui('form.upload');
      }
    });
    const dz=document.getElementById('dropzone');
    if(dz){const divs=dz.querySelectorAll('div');if(divs[1])divs[1].textContent=ui('form.dropzone');if(divs[2])divs[2].textContent=ui('form.dropzone.sub');}
    // consent
    const depConsentLabel=document.querySelector('label[for="d-consent"]');
    if(depConsentLabel){
      const privLink=depConsentLabel.querySelector('a');
      depConsentLabel.textContent=ui('form.consent.dep');
      if(privLink){privLink.textContent=ui('form.consent.link');depConsentLabel.appendChild(privLink);}
    }
    const depConsentErr=document.getElementById('d-consent-err');if(depConsentErr)depConsentErr.textContent=ui('form.consent.err');
    // Re-render form submit buttons so text matches current language
    if(typeof updateFormBtns==='function') updateFormBtns();
    const depOk=document.getElementById('dep-ok');if(depOk){const ico=depOk.querySelector('i');const div=depOk.querySelector('div');if(div)div.textContent=ui('form.ok');}

    // wish form labels
    const wishLabels=document.querySelectorAll('#wish-form label');
    const wishLabelKeys=['form.name','form.phone','form.lineid','form.type','form.budget','form.prov','form.tx2','form.detail2'];
    wishLabels.forEach((lbl,i)=>{if(wishLabelKeys[i]&&lbl.getAttribute('for')!=='w-consent')lbl.textContent=ui(wishLabelKeys[i]);});
    const wName=document.getElementById('w-name');if(wName)wName.placeholder=ui('form.name.ph');
    const wPhone=document.getElementById('w-phone');if(wPhone)wPhone.placeholder='08X-XXX-XXXX';
    const wLine=document.getElementById('w-line');if(wLine)wLine.placeholder='@yourid';
    const wProv=document.getElementById('w-prov');if(wProv)wProv.placeholder=ui('form.prov.ph');
    const wDetail=document.getElementById('w-detail');if(wDetail)wDetail.placeholder=ui('form.detail2.ph');
    const wType=document.getElementById('w-type');
    if(wType){const opts=Array.from(wType.options);const k=['form.select','dd.house','dd.town','dd.condo','dd.comm','dd.land'];opts.forEach((o,i)=>{if(k[i])o.textContent=ui(k[i]);});}
    const wTx=document.getElementById('w-tx');
    if(wTx){const opts=Array.from(wTx.options);if(opts[0])opts[0].textContent=ui('form.buy');if(opts[1])opts[1].textContent=ui('form.dorrent');}
    const wishConsentLabel=document.querySelector('label[for="w-consent"]');
    if(wishConsentLabel){
      const privLink=wishConsentLabel.querySelector('a');
      wishConsentLabel.textContent=ui('form.consent.wish');
      if(privLink){privLink.textContent=ui('form.consent.link');wishConsentLabel.appendChild(privLink);}
    }
    const wishConsentErr=document.getElementById('w-consent-err');if(wishConsentErr)wishConsentErr.textContent=ui('form.consent.err');
    const wishOk=document.getElementById('wish-ok');if(wishOk){const div=wishOk.querySelector('div');if(div)div.textContent=ui('form.ok');}
  })();

  // ── Footer nav columns (data-i18n handled by generic sweep above, but ensure h4/a tags work) ──
  // Update ALL footers including cloned sub-page footers
  document.querySelectorAll('footer .footer-inner, .sub-page-footer footer .footer-inner').forEach(footerNav=>{
    footerNav.querySelectorAll('[data-i18n]').forEach(el=>{
      const v=ui(el.getAttribute('data-i18n')); if(v)el.textContent=v;
    });
  });
  // Also update the sub-page footer flink link columns
  document.querySelectorAll('.sub-page-footer .flink-inner').forEach(flInnerClone=>{
    flInnerClone.querySelectorAll('[data-i18n]').forEach(el=>{
      const v=ui(el.getAttribute('data-i18n')); if(v)el.textContent=v;
    });
    // Also update hardcoded h4/a text (same structure as main flink-inner)
    const cols=flInnerClone.querySelectorAll('div');
    if(cols[0]){const h4=cols[0].querySelector('h4');if(h4)h4.textContent=ui('fl.bkk.buy');const lk=['fl.sell.house.bkk','fl.sell.town.bkk','fl.sell.condo.bkk','fl.sell.land.bkk','fl.sell.comm.bkk'];cols[0].querySelectorAll('a').forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});}
    if(cols[1]){const h4=cols[1].querySelector('h4');if(h4)h4.textContent=ui('fl.nnb.buy');const lk=['fl.sell.house.nnb','fl.sell.town.nnb','fl.sell.condo.nnb','fl.sell.land.nnb'];cols[1].querySelectorAll('a').forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});}
    if(cols[2]){const h4=cols[2].querySelector('h4');if(h4)h4.textContent=ui('fl.cbl.buy');const lk=['fl.sell.house.cbl','fl.sell.town.cbl','fl.sell.condo.cbl','fl.pattaya'];cols[2].querySelectorAll('a').forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});}
    if(cols[3]){const h4=cols[3].querySelector('h4');if(h4)h4.textContent=ui('fl.bkk.rent');const lk=['fl.rent.house.bkk','fl.rent.town.bkk','fl.rent.condo.bkk','fl.rent.condo.sukhumvit','fl.rent.condo.asok'];cols[3].querySelectorAll('a').forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});}
    if(cols[4]){const h4=cols[4].querySelector('h4');if(h4)h4.textContent=ui('fl.loc');const lk=['fl.loc.sukhumvit','fl.loc.sathorn','fl.loc.rachada','fl.loc.ladprao','fl.loc.asok','fl.loc.rama9','fl.loc.thonglor','fl.loc.phrakhanong'];cols[4].querySelectorAll('a').forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});}
    if(cols[5]){const h4=cols[5].querySelector('h4');if(h4)h4.textContent=ui('fl.uni');const lk=['fl.uni.chula','fl.uni.thammasat','fl.uni.kaset','fl.uni.mahidol','fl.uni.rangsit','fl.uni.abac','fl.uni.silpakorn','fl.uni.siam'];cols[5].querySelectorAll('a').forEach((a,i)=>{if(lk[i])a.textContent=ui(lk[i]);});}
  });

  // ── Modal static span labels ──
  const mlnL=document.getElementById('m-ln-label'); if(mlnL)mlnL.textContent=ui('cta.line');
  const mtelL=document.getElementById('m-tel-label'); if(mtelL)mtelL.textContent=ui('cta.tel');
  const m360L=document.getElementById('m-360-label'); if(m360L)m360L.textContent=ui('modal.360');
  const mDragH=document.getElementById('m-drag-hint'); if(mDragH)mDragH.textContent=ui('modal.drag');

  // ── Re-render category cards (type filter bar) ──
  if(typeof renderCats==='function') renderCats();
  // ── Re-render service cards ──
  if(typeof renderServices==='function') renderServices();

  // ── Re-render property grids so card badges/types update ──
  // ใช้ _renderHomeGrids (แสดงทั้งหมด ไม่กรอง tx) ป้องกัน empty grid
  if(typeof _renderHomeGrids==='function' && typeof props!=='undefined' && props.length){
    _renderHomeGrids();
  }
  // Re-render portfolio carousel & page grid
  if(typeof renderHomePortfolio==='function' && typeof port!=='undefined' && port.length) renderHomePortfolio();
  if(document.getElementById('page-portfolio')?.classList.contains('active') && typeof renderPortfolio==='function') renderPortfolio('all');
  // Re-render fav page if active
  if(document.getElementById('page-favorites')?.classList.contains('active') && typeof renderFavPage==='function') renderFavPage();
  // Re-render agents if active
  if(document.getElementById('page-agents')?.classList.contains('active') && typeof renderAgents==='function') renderAgents();

  // ── Advanced Filter — buttons & panel ──
  (function(){
    // 1. Trigger buttons (all "Filter เพิ่มเติม" buttons)
    function updateAdvBtn(el){
      if(!el) return;
      const ico = el.querySelector('i');
      const badge = el.querySelector('.adv-badge');
      el.textContent = ' ' + ui('af.btn.label');
      if(ico) el.insertBefore(ico, el.firstChild);
      if(badge) el.appendChild(badge);
    }
    updateAdvBtn(document.getElementById('adv-filter-btn'));
    updateAdvBtn(document.getElementById('ls-adv-filter-btn'));

    // 2. Panel header title
    const fpHd = document.querySelector('#adv-filter-panel .adv-fp-hd h3');
    if(fpHd){ const ico=fpHd.querySelector('i'); fpHd.textContent=' '+ui('af.title'); if(ico)fpHd.insertBefore(ico,fpHd.firstChild); }

    // 3. Mobile sheet header title
    const shHd = document.querySelector('#adv-sheet .adv-sheet-hd h3');
    if(shHd){ const ico=shHd.querySelector('i'); shHd.textContent=' '+ui('af.title'); if(ico)shHd.insertBefore(ico,shHd.firstChild); }

    // 4. Section titles inside panel body (order matches HTML)
    const sectionCfg = [
      { key:'af.sec.price',    icon:'fas fa-tag',           color:'var(--a)' },
      { key:'af.sec.popular',  icon:'fas fa-fire',          color:'#ff4d6d' },
      { key:'af.sec.prov',     icon:'fas fa-map-marker-alt',color:'var(--p)' },
      { key:'af.sec.bts',      icon:'fas fa-train',         color:'#009900' },
      { key:'af.sec.mrt',      icon:'fas fa-subway',        color:'#003399' },
      { key:'af.sec.uni',      icon:'fas fa-university',    color:'#6b21a8' },
      { key:'af.sec.land',     icon:null },
      { key:'af.sec.area',     icon:null },
      { key:'af.sec.bed',      icon:null },
      { key:'af.sec.bath',     icon:null },
      { key:'af.sec.park',     icon:null },
      { key:'af.sec.furn',     icon:null },
      { key:'af.sec.pets',     icon:null },
      { key:'af.sec.app',      icon:null },
    ];
    ['.adv-fp-body','.adv-sheet-body'].forEach(sel=>{
      const body = document.querySelector(sel);
      if(!body) return;
      body.querySelectorAll('.adv-fp-section').forEach((sec,i)=>{
        const cfg = sectionCfg[i]; if(!cfg) return;
        const titleEl = sec.querySelector('.adv-fp-sec-title'); if(!titleEl) return;
        const icoHTML = cfg.icon ? `<i class="${cfg.icon}" style="color:${cfg.color}"></i> ` : '';
        titleEl.innerHTML = icoHTML + ui(cfg.key);
      });
    });

    // 5. Select first options
    const firstOptMap = {
      'af-price-min': 'af.price.min',
      'af-price-max': 'af.price.max',
      'af-province':  'af.prov.all',
      'af-bts-select':'af.bts.all',
      'af-mrt-select':'af.mrt.all',
      'af-uni-select':'af.uni.all',
    };
    Object.entries(firstOptMap).forEach(([id,key])=>{
      document.querySelectorAll('#'+id).forEach(sel=>{ if(sel.options[0]) sel.options[0].textContent=ui(key); });
    });

    // 6. Range slider labels & unlimited bubble
    ['.adv-fp-body','.adv-sheet-body'].forEach(sel=>{
      const body=document.querySelector(sel); if(!body) return;
      body.querySelectorAll('.adv-range-item').forEach((item,i)=>{
        const lbl=item.querySelector('label'); if(lbl) lbl.textContent=(i%2===0)?ui('af.min'):ui('af.max');
      });
      body.querySelectorAll('.adv-range-bubble').forEach(bubble=>{
        const inp=bubble.closest('.adv-range-bubble-wrap')?.querySelector('input[type=range]');
        if(inp && inp.value===inp.max) bubble.textContent=ui('af.unlimited');
      });
      ['af-land-summary','af-area-summary'].forEach(sid=>{
        const el=body.querySelector('#'+sid); if(el) el.textContent=ui('af.all.size');
      });
    });

    // 7. Bedroom / bathroom checkboxes
    const roomLabels=[ui('af.room1'),ui('af.room2'),ui('af.room3'),ui('af.room4')];
    document.querySelectorAll('.af-bed, .af-bath').forEach((cb,i)=>{
      const lbl=cb.closest('label'); const idx=i%4;
      if(lbl&&roomLabels[idx]){ const last=lbl.childNodes[lbl.childNodes.length-1]; if(last.nodeType===3) last.textContent=' '+roomLabels[idx]; }
    });
    // Parking
    const carLabels=[ui('af.car1'),ui('af.car2'),ui('af.car3')];
    document.querySelectorAll('.af-park').forEach((cb,i)=>{
      const lbl=cb.closest('label');
      if(lbl&&carLabels[i]){ const last=lbl.childNodes[lbl.childNodes.length-1]; if(last.nodeType===3) last.textContent=' '+carLabels[i]; }
    });
    // Furniture
    [['af-furn-full','af.furn.full'],['af-furn-part','af.furn.part'],['af-furn-none','af.furn.none']].forEach(([id,key])=>{
      document.querySelectorAll('#'+id).forEach(cb=>{
        const lbl=cb.closest('label');
        if(lbl){ const last=lbl.childNodes[lbl.childNodes.length-1]; if(last.nodeType===3) last.textContent=' '+ui(key); }
      });
    });
    // Pets
    document.querySelectorAll('#af-pets').forEach(cb=>{
      const lbl=cb.closest('label');
      if(lbl){ const last=lbl.childNodes[lbl.childNodes.length-1]; if(last.nodeType===3) last.textContent=' '+ui('af.pets.ok'); }
    });
    // Appliances
    const appMap={'แอร์':'af.app.ac','ตู้เย็น':'af.app.fridge','เครื่องซักผ้า':'af.app.washer','เครื่องทำน้ำอุ่น':'af.app.heater','โทรทัศน์':'af.app.tv','ไมโครเวฟ':'af.app.micro','เตาไฟฟ้า':'af.app.stove','ระบบรักษาความปลอดภัย':'af.app.security'};
    document.querySelectorAll('.af-app').forEach(cb=>{
      const key=appMap[cb.value]; if(!key) return;
      const lbl=cb.closest('label');
      if(lbl){ const last=lbl.childNodes[lbl.childNodes.length-1]; if(last.nodeType===3) last.textContent=' '+ui(key); }
    });

    // 8. Footer buttons
    document.querySelectorAll('.adv-reset-btn').forEach(btn=>{
      const ico=btn.querySelector('i'); btn.textContent=' '+ui('af.btn.reset'); if(ico)btn.insertBefore(ico,btn.firstChild);
    });
    document.querySelectorAll('.adv-apply-btn').forEach(btn=>{
      const ico=btn.querySelector('i'); btn.textContent=' '+ui('af.btn.apply'); if(ico)btn.insertBefore(ico,btn.firstChild);
    });
  })();

  // ── Listings page: price dropdowns (ls-min / ls-max) ──
  (function(){
    const unlimText = ui('dd.price.unlim');
    const lsMin = document.getElementById('ls-min');
    if(lsMin && lsMin.options[0]) lsMin.options[0].textContent = unlimText;
    const lsMax = document.getElementById('ls-max');
    if(lsMax && lsMax.options[0]) lsMax.options[0].textContent = unlimText;
    // Also update listings toolbar labels
    const lsLabels = document.querySelectorAll('#page-listings .listings-filter-bar label');
    // Listings filter bar type/prov/price labels are inline HTML — update via data-i18n if present
    const lsTypeOpts = document.querySelectorAll('#ls-type option');
    const lsTypeKeys = ['sf.type.all','dd.house','dd.town','dd.condo','dd.comm','dd.land','dd.villa'];
    lsTypeOpts.forEach((opt,i)=>{ if(lsTypeKeys[i]) opt.textContent=ui(lsTypeKeys[i]); });
  })();

  // ── Re-render home search price selects (s-min / s-max) with correct language ──
  (function(){
    const curMin = $('s-min') ? $('s-min').value : '0';
    const curMax = $('s-max') ? $('s-max').value : '999000000';
    renderPriceOpts();
    if($('s-min')) $('s-min').value = curMin;
    if($('s-max')) $('s-max').value = curMax;
  })();

  // ── All .flb-copy (including sub-page cloned footers) ──
  document.querySelectorAll('.flb-copy').forEach(el=>{ el.textContent=ui('ft.copy'); });
  // ── footer-copy / footer-copy-bottom (main + cloned, these use C.COPYRIGHT by default) ──
  const copyText = ui('ft.copy');
  // Main footer (by id)
  const fcMain = document.getElementById('footer-copy'); if(fcMain) fcMain.textContent = copyText;
  const fcBot  = document.getElementById('footer-copy-bottom'); if(fcBot) fcBot.textContent = copyText;
  // Sub-page cloned footers (id was removed by clone, so select by class/structure)
  document.querySelectorAll('.sub-page-footer .foot-copy, .sub-page-footer .foot-copy-bottom').forEach(el=>{ el.textContent = copyText; });

  // ── Re-render open popup (all-modal) if visible ──
  const allModal = document.getElementById('all-modal');
  if(allModal && allModal.classList.contains('open') && window._modalCurrentType){
    setTimeout(()=>openAllModal(window._modalCurrentType), 0);
  }

  // ── Listings page UI ──
  (function(){
    // Back button (now has id="ls-back-btn")
    const backBtn = document.getElementById('ls-back-btn');
    if(backBtn){ const ico=backBtn.querySelector('i'); backBtn.textContent=' '+ui('ls.back'); if(ico)backBtn.insertBefore(ico,backBtn.firstChild); }
    // Page title
    const lsTitle = document.getElementById('listings-page-title');
    if(lsTitle) lsTitle.textContent = ui('ls.title');
    // Map toggle button
    const mapBtn = document.getElementById('listings-map-toggle-btn');
    if(mapBtn){ const ico=mapBtn.querySelector('i'); mapBtn.textContent=' '+ui('ls.map.btn'); if(ico)mapBtn.insertBefore(ico,mapBtn.firstChild); }
    // Map panel close & title
    const mapCloseBtn = document.querySelector('#listings-map-panel button[onclick*="toggleListingsMapPanel"]');
    if(mapCloseBtn){ const ico=mapCloseBtn.querySelector('i'); mapCloseBtn.textContent=' '+ui('ls.map.close'); if(ico)mapCloseBtn.insertBefore(ico,mapCloseBtn.firstChild); }
    // Filter bar labels — using unique ids added to each label
    function _setLsLabel(id, key){
      const lbl = document.getElementById(id);
      if(!lbl) return;
      const ico = lbl.querySelector('i');
      lbl.textContent = '';
      if(ico) lbl.appendChild(ico);
      lbl.appendChild(document.createTextNode(' ' + ui(key)));
    }
    _setLsLabel('ls-label-kw',   'ls.label.kw');
    _setLsLabel('ls-label-tx',   'ls.label.tx');
    _setLsLabel('ls-label-type', 'ls.label.type');
    _setLsLabel('ls-label-prov', 'ls.label.prov');
    _setLsLabel('ls-label-min',  'ls.label.min');
    _setLsLabel('ls-label-max',  'ls.label.max');
    // Keyword placeholder
    const lsKwInput = document.getElementById('ls-kw');
    if(lsKwInput) lsKwInput.placeholder = ui('sf.kw.ph');
    // Update ls-prov first option text
    const lsProvSel = document.getElementById('ls-prov');
    if(lsProvSel && lsProvSel.options[0] && lsProvSel.options[0].value === '') {
      lsProvSel.options[0].textContent = ui('sf.prov.all');
    }
    // ls-tx options
    const lsTx = document.getElementById('ls-tx');
    if(lsTx){
      const txOpts = Array.from(lsTx.options);
      if(txOpts[0]) txOpts[0].textContent = ui('hero.all.label');
      if(txOpts[1]) txOpts[1].textContent = ui('hero.buy.label');
      if(txOpts[2]) txOpts[2].textContent = ui('hero.rent.label');
    }
    // ls-type options
    const lsTypeEl = document.getElementById('ls-type');
    if(lsTypeEl) {
      const typeKeys = ['sf.type.all','dd.house','dd.town','dd.condo','dd.comm','dd.land','dd.villa'];
      Array.from(lsTypeEl.options).forEach((opt,i)=>{ if(typeKeys[i]) opt.textContent=ui(typeKeys[i]); });
    }
    // Search & Reset buttons in filter bar
    const lsSearchBtn = document.querySelector('#page-listings button[onclick*="listingsInlineSearch"]');
    if(lsSearchBtn){ const ico=lsSearchBtn.querySelector('i'); lsSearchBtn.textContent=' '+ui('ls.btn.search'); if(ico)lsSearchBtn.insertBefore(ico,lsSearchBtn.firstChild); }
    const lsResetBtn = document.querySelector('#page-listings button[onclick*="listingsResetSearch"]');
    if(lsResetBtn){ const ico=lsResetBtn.querySelector('i'); lsResetBtn.textContent=' '+ui('ls.btn.reset'); if(ico)lsResetBtn.insertBefore(ico,lsResetBtn.firstChild); }
    // Tab buttons
    const lsTabAll=document.getElementById('ls-tab-all'); if(lsTabAll)lsTabAll.textContent=ui('ls.tab.all');
    const lsTabBuy=document.getElementById('ls-tab-buy'); if(lsTabBuy)lsTabBuy.textContent=ui('ls.tab.buy');
    const lsTabRent=document.getElementById('ls-tab-rent'); if(lsTabRent)lsTabRent.textContent=ui('ls.tab.rent');
    const lsTabHot=document.getElementById('ls-tab-hot'); if(lsTabHot)lsTabHot.textContent=ui('ls.tab.hot');
    const lsTabNew=document.getElementById('ls-tab-new'); if(lsTabNew)lsTabNew.textContent=ui('ls.tab.new');
    // Count text
    const lsCountEl = document.querySelector('#page-listings .listings-count');
    if(lsCountEl){
      const numEl=document.getElementById('listings-total-count');
      const n=numEl?numEl.textContent:'0';
      lsCountEl.innerHTML=ui('ls.count').replace('{n}','<strong id="listings-total-count">'+n+'</strong>');
    }
    // Sort label
    const lsSortLabel=document.querySelector('#page-listings .listings-toolbar label');
    if(lsSortLabel)lsSortLabel.textContent=ui('ls.sort.label');
    // Sort options
    const lsSort=document.getElementById('listings-sort');
    if(lsSort){
      const sortKeys=[['default','ls.sort.default'],['price_asc','ls.sort.price_asc'],['price_desc','ls.sort.price_desc'],['newest','ls.sort.newest'],['oldest','ls.sort.oldest'],['alpha','ls.sort.alpha']];
      sortKeys.forEach(([val,key])=>{ const opt=lsSort.querySelector('option[value="'+val+'"]'); if(opt)opt.textContent=ui(key); });
    }
    // Home "all" grid sort options
    const allGridSort=document.getElementById('all-grid-sort');
    if(allGridSort){
      const homeSortKeys=[['default','modal.sort.rec'],['price_asc','modal.sort.asc'],['price_desc','modal.sort.desc'],['newest','modal.sort.new'],['oldest','modal.sort.old'],['alpha','modal.sort.alpha']];
      homeSortKeys.forEach(([val,key])=>{ const opt=allGridSort.querySelector('option[value="'+val+'"]'); if(opt)opt.textContent=ui(key); });
    }
    // Sidebar: property types header
    const seoTypesHd=document.querySelector('#page-listings aside > div:first-child > div:first-child');
    if(seoTypesHd){const ico=seoTypesHd.querySelector('i'); seoTypesHd.innerHTML=(ico?ico.outerHTML+' ':'')+ui('ls.sidebar.types');}
    // Sidebar: consult box
    const seoConsultTitle=document.querySelector('#page-listings aside > div:nth-child(2) > div:first-child');
    if(seoConsultTitle){const ico=seoConsultTitle.querySelector('i'); seoConsultTitle.innerHTML=(ico?ico.outerHTML+' ':'')+ui('ls.sidebar.consult');}
    const seoConsultSub=document.querySelector('#page-listings aside > div:nth-child(2) > p');
    if(seoConsultSub)seoConsultSub.textContent=ui('ls.sidebar.consult.sub');
    // Sidebar: Line / Tel buttons
    const seoLineBtn=document.querySelector('#page-listings aside .fab.fa-line');
    if(seoLineBtn&&seoLineBtn.parentElement){const a=seoLineBtn.parentElement;const ico=a.querySelector('i');a.textContent=' '+ui('ls.sidebar.line');if(ico)a.insertBefore(ico,a.firstChild);}
    const seoTelBtn=document.getElementById('seo-tel-link');
    if(seoTelBtn){const ico=seoTelBtn.querySelector('i');seoTelBtn.textContent=' '+ui('ls.sidebar.tel');if(ico)seoTelBtn.insertBefore(ico,seoTelBtn.firstChild);}
    // Sidebar: transit header
    const seoTransitHd=document.querySelector('#seo-transit-box > div:first-child');
    if(seoTransitHd){const ico=seoTransitHd.querySelector('i'); seoTransitHd.innerHTML=(ico?ico.outerHTML+' ':'')+ui('ls.sidebar.transit');}

    // ── Re-render listings pagination so First/Last/Showing labels follow the selected language ──
    if(typeof _listingsData!=='undefined' && _listingsData && typeof _listingsPerPage==='function'){
      const _totalPages = Math.ceil(_listingsData.length / _listingsPerPage());
      if(typeof renderListingsPagination==='function') renderListingsPagination(_totalPages);
    }
    // ── Re-render grid if showing empty state (so empty state message language updates) ──
    const _lsGrid = document.getElementById('listings-grid');
    if(_lsGrid && _lsGrid.querySelector('a[href*="line.me"]')) {
      // Currently showing empty state — re-render to update language
      if(typeof renderListingsPage==='function') renderListingsPage();
    }
    // ── Re-render SEO sidebar type buttons so language updates (House/Townhome/Condo etc.) ──
    if(typeof renderListingsSeoSidebar==='function') renderListingsSeoSidebar();
  })();
  // ── Profile FAB title ──
  _updateProfileFab();
  // ── Login modal browse label ──
  const lmBrowseLbl = document.getElementById('login-modal-browse-lbl');
  if(lmBrowseLbl) lmBrowseLbl.textContent = _lang==='en'?'Browse listings without signing in':_lang==='cn'?'不登录直接浏览':_lang==='ja'?'ログインせず閲覧':'ดูประกาศก่อน ไม่ต้อง Login';
  // ── Re-render my-account page if active ──
  if(document.getElementById('page-my-account')?.classList.contains('active') && typeof renderMyAccount==='function') renderMyAccount();
}
function openApplyModal(type){
  closeAllDD();
  const ov = document.getElementById('apply-'+type+'-overlay');
  if(ov){ ov.classList.add('open'); document.body.classList.add('modal-open'); }
}
function closeApplyModal(type){
  const ov = document.getElementById('apply-'+type+'-overlay');
  if(ov){ ov.classList.remove('open'); }
  const stillOpen = document.querySelector('.ov.open, [id$="-modal"].open, [id$="-overlay"].open');
  if(!stillOpen){ document.body.style.removeProperty('overflow'); document.body.classList.remove('modal-open'); }
}

// Close on ESC
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){
    // ปิด apply modals
    closeApplyModal('agent'); closeApplyModal('other');
    // ปิด modal ทั่วไปผ่าน helper (scroll restore อัตโนมัติ)
    ['srv-modal','blog-modal','port-modal','ag-modal',
     'login-modal','signup-modal','reset-pw-modal','profile-modal','cookie-modal',
     'privacy-modal','terms-modal','acceptable-use-modal','buysell-modal',
     'all-modal'].forEach(function(id){
      const m = document.getElementById(id);
      if(m && m.classList.contains('open')) _closeModal(id);
    });
    // ปิด prop-modal ผ่าน closeModal (มี logic พิเศษ scroll-restore)
    const pm = document.getElementById('prop-modal');
    if(pm && pm.classList.contains('open')) closeModal();
    // ปิด sheet/drawer
    closeAdvFilter();
    closeSeoDrawer();
    closeQsSheet();
  }
});

// ── Step helpers ──
function setApplyStep(prefix, step){
  for(let i=1;i<=3;i++){
    const dot=document.getElementById(prefix+'-dot-'+i);
    const line=document.getElementById(prefix+'-line-'+i);
    const page=document.getElementById(prefix.replace('-','')?.replace('aa','aa').replace('ao','ao')+'-p'+i);
    // find page by convention: aa-p1 / ao-p1
    const pg=document.getElementById((prefix==='aa'?'aa':'ao')+'-p'+i);
    if(dot){
      dot.classList.remove('active','done');
      if(i<step) dot.classList.add('done');
      else if(i===step) dot.classList.add('active');
    }
    if(line && i<3){
      line.classList.toggle('done', i<step);
    }
    if(pg){
      pg.classList.toggle('active', i===step);
    }
  }
  // scroll modal to top
  const modal=document.getElementById((prefix==='aa'?'apply-agent':'apply-other')+'-modal');
  if(modal) modal.scrollTop=0;
}

// ── Validation helpers ──
function validateRequired(id, fgId){
  const el=document.getElementById(id);
  const fg=fgId?document.getElementById(fgId):null;
  const val=(el?el.value:'').trim();
  if(fg){ fg.classList.toggle('err', !val); }
  return !!val;
}

// ── AGENT steps ──
function aaNext(fromStep){
  let ok=true;
  if(fromStep===1){
    ok = validateRequired('aa-name','aa-fg-name') & validateRequired('aa-phone','aa-fg-phone') & validateRequired('aa-email') & validateRequired('aa-province');
    // email format
    const em=document.getElementById('aa-email');
    if(em && em.value && !/\S+@\S+\.\S+/.test(em.value)){ ok=false; }
  }
  if(ok) setApplyStep('aa', fromStep+1);
  else showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
}
function aaBack(fromStep){ setApplyStep('aa', fromStep-1); }

// ── OTHER steps ──
function aoNext(fromStep){
  let ok=true;
  if(fromStep===1){
    ok = validateRequired('ao-name','ao-fg-name') & validateRequired('ao-phone','ao-fg-phone') & validateRequired('ao-email','ao-fg-email') & validateRequired('ao-province');
  }
  if(fromStep===2){
    ok = validateRequired('ao-position','ao-fg-position') & validateRequired('ao-exp-salary','ao-fg-exp-salary')?true:true; // soft
    const pos=document.getElementById('ao-position');
    const posFg=document.getElementById('ao-fg-position');
    if(pos && !pos.value){ posFg&&posFg.classList.add('err'); ok=false; }
    else posFg&&posFg.classList.remove('err');
  }
  if(ok) setApplyStep('ao', fromStep+1);
  else showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
}
function aoBack(fromStep){ setApplyStep('ao', fromStep-1); }

// ── Tag toggle ──
function toggleTag(el){ el.classList.toggle('sel'); }
function toggleRadio(el, groupId){
  document.querySelectorAll('#'+groupId+' .apply-radio-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
}

// ── File handler ──
function handleApplyFile(input, btnId, labelId, defaultLabel){
  const btn=document.getElementById(btnId);
  const lbl=document.getElementById(labelId);
  if(input.files && input.files[0]){
    const f=input.files[0];
    const name=f.name.length>18?f.name.substring(0,16)+'…':f.name;
    if(lbl) lbl.textContent=name;
    if(btn) btn.classList.add('has-file');
  } else {
    if(lbl) lbl.textContent=defaultLabel;
    if(btn) btn.classList.remove('has-file');
  }
}

// ── Submit ──
async function submitApply(type){
  const prefix = type==='agent'?'aa':'ao';
  const consent = document.getElementById(prefix+'-consent');
  const consentErr = document.getElementById(prefix+'-consent-err');
  if(!consent || !consent.checked){
    if(consentErr) consentErr.style.display='block';
    setTimeout(()=>{ if(consentErr) consentErr.style.display='none'; }, 3500);
    return;
  }

  // ── รวบรวม field ที่ใช้ร่วมกัน ──
  const fullName  = (document.getElementById(prefix+'-name')?.value||'').trim();
  const phone     = (document.getElementById(prefix+'-phone')?.value||'').trim();
  const email     = (document.getElementById(prefix+'-email')?.value||'').trim();
  const province  = (document.getElementById(prefix+'-province')?.value||'').trim();
  const motivation= (document.getElementById(prefix+'-motivation')?.value||'').trim();

  if(!fullName||!phone||!email){
    toast('กรุณากรอกชื่อ เบอร์โทร และอีเมลให้ครบถ้วน',true); return;
  }

  // ── Disable ปุ่ม / แสดง spinner ──
  const submitBtn = document.querySelector(
    `.apply-overlay[id*="${type==='agent'?'agent':'other'}"] .btn-sub, `+
    `[onclick="submitApply('${type}')"]`
  );
  const origBtnHtml = submitBtn?.innerHTML||'';
  if(submitBtn){ submitBtn.disabled=true; submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...'; }

  let ref = '';
  try {
    if(sb){
      // ── เรียก Supabase RPC บันทึกลง DB จริง ──
      if(type==='agent'){
        const experience = (document.getElementById(prefix+'-experience')?.value||'').trim();
        const licenseNo  = (document.getElementById(prefix+'-license')?.value||'').trim();
        const { data, error } = await sb.rpc('submit_agent_application', {
          p_full_name:      fullName,
          p_phone:          phone,
          p_email:          email,
          p_province:       province,
          p_experience:     experience,
          p_license_no:     licenseNo,
          p_area_expertise: [],
          p_motivation:     motivation,
          p_consent_given:  true
        });
        if(error) throw error;
        ref = data?.ref_no || ('MD-AG-'+Date.now().toString().slice(-6));
      } else {
        const position    = (document.getElementById(prefix+'-position')?.value||'').trim();
        const education   = (document.getElementById(prefix+'-education')?.value||'').trim();
        const expYrs      = parseInt(document.getElementById(prefix+'-exp-yrs')?.value||'0',10)||0;
        const currentJob  = (document.getElementById(prefix+'-current-job')?.value||'').trim();
        const salaryExpect= parseFloat(document.getElementById(prefix+'-salary')?.value||'0')||0;
        const { data, error } = await sb.rpc('submit_job_application', {
          p_full_name:      fullName,
          p_phone:          phone,
          p_email:          email,
          p_province:       province,
          p_position:       position,
          p_education:      education,
          p_experience_yrs: expYrs,
          p_current_job:    currentJob,
          p_salary_expect:  salaryExpect,
          p_motivation:     motivation,
          p_consent_given:  true
        });
        if(error) throw error;
        ref = data?.ref_no || ('MD-JB-'+Date.now().toString().slice(-6));
      }
    } else {
      // Fallback เมื่อ Supabase ยังไม่ configured — สร้าง ref ชั่วคราว
      ref = 'MD-'+(type==='agent'?'AG':'JB')+'-'+Date.now().toString().slice(-6);
    }
  } catch(err){
    if(submitBtn){ submitBtn.disabled=false; submitBtn.innerHTML=origBtnHtml; }
    toast('เกิดข้อผิดพลาด: '+(err.message||'กรุณาลองใหม่อีกครั้ง'),true);
    return;
  }

  // ── แสดง ref_no และเปลี่ยนไป success screen ──
  const refEl = document.getElementById(prefix+'-ref-no');
  if(refEl) refEl.textContent = ref;
  const content = document.getElementById('apply-'+(type==='agent'?'agent':'other')+'-content');
  const ok      = document.getElementById('apply-'+(type==='agent'?'agent':'other')+'-ok');
  if(content) content.style.display='none';
  if(ok)      ok.style.display='block';
  document.body.style.removeProperty('overflow');
  toast('✅ ส่งใบสมัครสำเร็จ! เลข Ref: '+ref);
  if(submitBtn){ submitBtn.disabled=false; submitBtn.innerHTML=origBtnHtml; }
}

(function initLang(){
  const saved=localStorage.getItem('md_lang')||'th';
  _lang=saved;
  const meta=LANG_META[saved]||LANG_META.th;
  const f=document.getElementById('trigger-flag');
  const c=document.getElementById('trigger-code');
  if(f)f.textContent=meta.flag;
  if(c)c.textContent=meta.code;
  Object.keys(LANG_META).forEach(k=>{
    const opt=document.getElementById('lopt-'+k);
    if(opt)opt.classList.toggle('selected',k===saved);
  });
  if(saved!=='th')applyLang();
})();
// Auto-reset state on fresh page load
(function() {
  if(performance.navigation && performance.navigation.type === 1) {
    // This is a refresh — ensure we start clean
    window._forceReset = true;
  }
})();

// Defensive: ensure at least one page is visible before data loads
// ต้องรัน หลัง DOM พร้อม เพราะ page divs อยู่หลัง script tag
document.addEventListener('DOMContentLoaded', function ensureHomeVisible(){
  const sectionMap = {
    '/agents': 'agents', '/portfolio': 'portfolio',
    '/favorites': 'favorites', '/listings': 'listings',
    '/buy': 'home', '/rent': 'home',
  };
  const effectivePath = location.pathname;
  const targetName = sectionMap[effectivePath] || 'home';
  if(!document.querySelector('.page.active')) {
    const pg = document.getElementById('page-' + targetName);
    if(pg) pg.classList.add('active');
  }
});
init();

// ── Emergency unlock: ถ้า body ค้าง modal-open แต่ไม่มี modal/overlay เปิดจริงๆ
// ครอบ .ov, [id$="-overlay"].open, apply-overlay.open, adv-sheet.open, seo-drawer.open และ qs-mob-sheet
setInterval(function(){
  const anyOpen = document.querySelector(
    '.ov.open, [id$="-modal"].open, [id$="-overlay"].open, .apply-overlay.open, .adv-sheet.open, .seo-drawer.open, .adv-filter-panel.open'
  );
  const qsSheet = document.getElementById('qs-mob-sheet');
  // qs-mob-sheet ถือว่า "open" เมื่อ translateY ไม่ใช่ 100% และ display ไม่ใช่ none
  const qsVisible = qsSheet && qsSheet.style.display !== 'none' &&
                    qsSheet.style.transform !== '' && qsSheet.style.transform !== 'translateY(100%)';
  if(!anyOpen && !qsVisible && document.body.classList.contains('modal-open')) {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('left');
    document.body.classList.remove('modal-open');
    // bump generation + reset flags — kill batch ที่ค้างอยู่ทั้งหมด
    if(typeof window._listingsRenderGen !== 'undefined') {
      window._listingsRenderGen = (window._listingsRenderGen + 1) & 0xFFFF;
    }
    window._listingsRenderAbort = false;
    _listingsRenderPending = false;
    window._listingsRenderQueued = false;
    window._listingsBatchInFlight = false;
    // ถ้า listings page active อยู่ → render ใหม่ด้วย (ป้องกันหน้าว่างจาก flag ค้าง)
    const _lp = document.getElementById('page-listings');
    if(_lp && _lp.classList.contains('active') && typeof renderListingsPage === 'function') {
      requestAnimationFrame(function(){ renderListingsPage(); });
    }
  }
}, 1000);

// ===== ADVANCED FILTER LOGIC =====
function renderHomePortfolio(){
  const track = document.getElementById('home-port-track');
  if(!track) return;
  const list = port.slice(0, 10);
  if(!list.length){ track.innerHTML='<div class="empty"><i class="fas fa-trophy"></i><p>ยังไม่มีผลงาน</p></div>'; return; }
  const statusColor = {SOLD:'#1B5E38', RENTED:'#4A2480'};
  track.innerHTML = list.map(p => {
    const statusLabel = {SOLD: ui('ph.port.sold'), RENTED: ui('ph.port.rented')};
    return `
    <div class="blog-card" style="min-width:255px;max-width:280px;cursor:pointer" onclick='showPortDetail(${JSON.stringify(p)})'>
      <div class="blog-thumb" style="background:${p.photo?'#eee':'linear-gradient(135deg,#1B3A6B,#3D7A55)'};position:relative;overflow:hidden">
        ${p.photo?`<img src="${p.photo}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` :'<i class="fas fa-trophy" style="font-size:44px;color:rgba(255,255,255,.7)"></i>'}
        <span style="position:absolute;top:10px;left:10px;background:${statusColor[p.status]||'#1B3A6B'};color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">${statusLabel[p.status]||p.status}</span>
      </div>
      <div class="blog-body">
        <span class="blog-cat">${p.type||'อสังหาฯ'}</span>
        <div class="blog-title">${sanitize(p.title||'')}</div>
        <div class="blog-meta"><i class="fas fa-map-marker-alt"></i> ${sanitize(p.location||'—')} · ${sanitize(p.date||'')}</div>
        <div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--a)">฿${Number(p.price||0).toLocaleString()}</div>
        ${p.review?`<div style="margin-top:6px;font-size:11px;color:var(--tx2);font-style:italic;border-left:2px solid var(--bd);padding-left:8px">"${p.review}"</div>`:''}
      </div>
    </div>`;
  }).join('');
  setTimeout(() => initHGallerySwipe('home-port-track-wrap'), 100);
}
function scrollCatScroll(dir){
  const el = document.getElementById('cat-scroll');
  if(el) el.scrollBy({ left: dir * 220, behavior: 'smooth' });
}

function quickLoanCalc(price, propId) {
  const el = document.getElementById('qlc-'+propId);
  if(!el) return;
  if(el.style.display !== 'none') { el.style.display='none'; return; }
  const dp = Math.round(price * 0.1);
  const loan = price - dp;
  const r20 = 6.5/100/12;
  const n20 = 20*12;
  const pmt20 = loan * r20 * Math.pow(1+r20,n20) / (Math.pow(1+r20,n20)-1);
  const r30 = 6.5/100/12;
  const n30 = 30*12;
  const pmt30 = loan * r30 * Math.pow(1+r30,n30) / (Math.pow(1+r30,n30)-1);
  el.innerHTML = `<div style="font-weight:800;color:var(--p);margin-bottom:5px"><i class="fas fa-calculator" style="color:var(--a)"></i> สินเชื่อประมาณการ (ดอกเบี้ย 6.5%)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div style="background:#fff;border-radius:7px;padding:7px 9px;border:1px solid #dde4f0"><div style="font-size:10px;color:var(--gr)">20 ปี / เดือน</div><div style="font-size:14px;font-weight:800;color:var(--p)">฿${Math.round(pmt20).toLocaleString()}</div></div>
      <div style="background:#fff;border-radius:7px;padding:7px 9px;border:1px solid #dde4f0"><div style="font-size:10px;color:var(--gr)">30 ปี / เดือน</div><div style="font-size:14px;font-weight:800;color:var(--p)">฿${Math.round(pmt30).toLocaleString()}</div></div>
    </div>
    <div style="font-size:10px;color:var(--gr);margin-top:5px">เงินดาวน์ 10% = ฿${dp.toLocaleString()} · วงเงินกู้ ฿${loan.toLocaleString()} · <span style="color:var(--a);cursor:pointer;font-weight:700" onclick="event.stopPropagation();openModal('${propId}');setTimeout(()=>toggleLoanCalc(${price}),400)">คำนวณละเอียด →</span></div>`;
  el.style.display = 'block';
}
function toggleLoanCalc(price){
  const lc = document.getElementById('modal-loan-calc');
  if(!lc) return;
  if(lc.style.maxHeight !== '0px' && lc.style.maxHeight !== '') {
    lc.style.maxHeight = '0';
    lc.style.marginBottom = '0';
    return;
  }
  const dp = Math.round(price * 0.1);
  const loanAmt = price - dp;
  const rate = 6.5;
  const terms = [10, 15, 20, 25, 30];
  const calcRow = (yrs) => {
    const n = yrs * 12;
    const r = rate / 100 / 12;
    const pmt = r === 0 ? loanAmt / n : loanAmt * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
    const totalPay = pmt * n;
    const totalInt = totalPay - loanAmt;
    const ratio = (totalInt / totalPay * 100).toFixed(0);
    return `<tr style="border-bottom:1px solid #f0ece4" class="lc-row">
      <td style="padding:7px 10px;font-weight:700;color:var(--p)">${yrs} ปี</td>
      <td style="padding:7px 10px;color:var(--p);font-weight:800;font-size:13px">฿${Math.round(pmt).toLocaleString()}<span style="font-size:10px;font-weight:500;color:var(--gr)">/เดือน</span></td>
      <td style="padding:7px 10px;color:#c0392b;font-size:11px">฿${Math.round(totalInt).toLocaleString()}</td>
      <td style="padding:7px 10px;font-size:11px;color:var(--gr)">฿${Math.round(totalPay).toLocaleString()}</td>
      <td style="padding:7px 10px"><div style="width:60px;height:7px;background:#f0ece4;border-radius:4px;overflow:hidden"><div style="height:100%;width:${ratio}%;background:linear-gradient(90deg,var(--a),#c0392b);border-radius:4px"></div></div><span style="font-size:9px;color:var(--gr)">${ratio}% ดอก</span></td>
    </tr>`;
  };
  const incNeeded = (yrs) => {
    const n = yrs * 12; const r = rate / 100 / 12;
    const pmt = r === 0 ? loanAmt / n : loanAmt * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
    return Math.round(pmt / 0.4);
  };
  lc.innerHTML = `<div style="background:linear-gradient(135deg,#f9f5ef,#f0ece4);border-radius:14px;padding:16px;margin:10px 0 12px;border:1.5px solid var(--bd)">
    <div style="font-size:13px;font-weight:800;color:var(--p);margin-bottom:12px;display:flex;align-items:center;gap:8px">
      <i class="fas fa-calculator" style="background:var(--p);color:#fff;width:26px;height:26px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px"></i>
      คำนวณสินเชื่อเบื้องต้น
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div style="background:#fff;border-radius:10px;padding:10px;border:1px solid var(--bd)">
        <div style="font-size:10px;font-weight:700;color:var(--gr);margin-bottom:2px">ราคาทรัพย์</div>
        <div style="font-size:14px;font-weight:800;color:var(--p)" id="lc-price-display">฿${price.toLocaleString()}</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:10px;border:1px solid var(--bd)">
        <div style="font-size:10px;font-weight:700;color:var(--gr);margin-bottom:2px">วงเงินกู้</div>
        <div style="font-size:14px;font-weight:800;color:var(--a)" id="lc-loan-display">฿${loanAmt.toLocaleString()}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--tx2);display:flex;align-items:center;gap:4px;margin-bottom:4px"><i class="fas fa-percent" style="color:var(--a);font-size:9px"></i> เงินดาวน์</label>
        <input type="range" id="lc-dp" min="5" max="50" value="10" step="5" style="width:100%;accent-color:var(--a)" oninput="updateLoanCalc(${price})">
        <div style="font-size:11px;color:var(--p);font-weight:700;margin-top:2px" id="lc-dp-v">10% = ฿${dp.toLocaleString()}</div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--tx2);display:flex;align-items:center;gap:4px;margin-bottom:4px"><i class="fas fa-university" style="color:var(--p);font-size:9px"></i> ดอกเบี้ย (%/ปี)</label>
        <input type="range" id="lc-rate" min="3" max="12" value="6.5" step="0.5" style="width:100%;accent-color:var(--a)" oninput="updateLoanCalc(${price})">
        <div style="font-size:11px;color:var(--p);font-weight:700;margin-top:2px" id="lc-rate-v">6.5% ต่อปี</div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--tx2);display:flex;align-items:center;gap:4px;margin-bottom:4px"><i class="fas fa-shield-alt" style="color:#059669;font-size:9px"></i> ค่าโอน (เบื้องต้น)</label>
        <div style="background:#fff;border-radius:8px;padding:6px 8px;border:1px solid var(--bd);font-size:11px;font-weight:700;color:#059669" id="lc-transfer-v">฿${Math.round(price*0.02).toLocaleString()}</div>
        <div style="font-size:9px;color:var(--gr);margin-top:2px">~2% ของราคา</div>
      </div>
    </div>
    <div id="lc-table-wrap" style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:380px">
      <thead><tr style="background:var(--p);color:#fff;border-radius:8px">
        <th style="padding:8px 10px;text-align:left;border-radius:8px 0 0 0">ระยะเวลา</th>
        <th style="padding:8px 10px;text-align:left">ผ่อน/เดือน</th>
        <th style="padding:8px 10px;text-align:left">ดอกเบี้ยรวม</th>
        <th style="padding:8px 10px;text-align:left">ยอดชำระรวม</th>
        <th style="padding:8px 10px;text-align:left;border-radius:0 8px 0 0">สัดส่วน</th>
      </tr></thead>
      <tbody id="lc-rows">${terms.map(calcRow).join('')}</tbody>
    </table>
    </div>
    <div style="margin-top:12px;background:#fff;border-radius:10px;padding:10px 12px;border:1px solid var(--bd)">
      <div style="font-size:11px;font-weight:800;color:var(--p);margin-bottom:6px"><i class="fas fa-wallet"></i> รายได้ขั้นต่ำที่แนะนำ (ผ่อนไม่เกิน 40% ของรายได้)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="lc-income">
        ${terms.map(y=>`<span style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--p)">${y}ปี: ฿${incNeeded(y).toLocaleString()}/เดือน</span>`).join('')}
      </div>
    </div>
    <div style="font-size:10px;color:var(--gr);margin-top:10px;line-height:1.6"><i class="fas fa-info-circle" style="color:var(--a)"></i> การคำนวณเป็นเพียงประมาณการเบื้องต้น อัตราดอกเบี้ยจริงขึ้นอยู่กับเงื่อนไขของแต่ละธนาคาร ค่าโอนประมาณ 2% สำหรับบุคคลธรรมดา</div>
  </div>`;
  lc.style.maxHeight = '700px';
  lc.style.marginBottom = '4px';
}

function updateLoanCalc(price){
  const dpEl = document.getElementById('lc-dp');
  const rateEl = document.getElementById('lc-rate');
  const dpPct = dpEl ? +dpEl.value : 10;
  const rate = rateEl ? +rateEl.value : 6.5;
  const dp = Math.round(price * dpPct / 100);
  const loanAmt = price - dp;
  const dpV = document.getElementById('lc-dp-v');
  const rateV = document.getElementById('lc-rate-v');
  const loanD = document.getElementById('lc-loan-display');
  const transferV = document.getElementById('lc-transfer-v');
  if(dpV) dpV.textContent = `${dpPct}% = ฿${dp.toLocaleString()}`;
  if(rateV) rateV.textContent = `${rate}% ต่อปี`;
  if(loanD) loanD.textContent = `฿${loanAmt.toLocaleString()}`;
  if(transferV) transferV.textContent = `฿${Math.round(price*0.02).toLocaleString()}`;
  const terms = [10, 15, 20, 25, 30];
  const rows = document.getElementById('lc-rows');
  if(rows) rows.innerHTML = terms.map(yrs => {
    const n = yrs * 12;
    const r = rate / 100 / 12;
    const pmt = r === 0 ? loanAmt / n : loanAmt * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
    const totalPay = pmt * n;
    const totalInt = totalPay - loanAmt;
    const ratio = (totalInt / totalPay * 100).toFixed(0);
    return `<tr style="border-bottom:1px solid #f0ece4">
      <td style="padding:7px 10px;font-weight:700;color:var(--p)">${yrs} ปี</td>
      <td style="padding:7px 10px;color:var(--p);font-weight:800;font-size:13px">฿${Math.round(pmt).toLocaleString()}<span style="font-size:10px;font-weight:500;color:var(--gr)">/เดือน</span></td>
      <td style="padding:7px 10px;color:#c0392b;font-size:11px">฿${Math.round(totalInt).toLocaleString()}</td>
      <td style="padding:7px 10px;font-size:11px;color:var(--gr)">฿${Math.round(totalPay).toLocaleString()}</td>
      <td style="padding:7px 10px"><div style="width:60px;height:7px;background:#f0ece4;border-radius:4px;overflow:hidden"><div style="height:100%;width:${ratio}%;background:linear-gradient(90deg,var(--a),#c0392b);border-radius:4px"></div></div><span style="font-size:9px;color:var(--gr)">${ratio}% ดอก</span></td>
    </tr>`;
  }).join('');
  const incomeEl = document.getElementById('lc-income');
  if(incomeEl) incomeEl.innerHTML = terms.map(y=>{
    const n = y*12; const r = rate/100/12;
    const pmt = r===0 ? loanAmt/n : loanAmt*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
    const inc = Math.round(pmt/0.4);
    return `<span style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--p)">${y}ปี: ฿${inc.toLocaleString()}/เดือน</span>`;
  }).join('');
}
let _advActive = false;
function switchAdvPriceMode(mode){
  var buyOpts = document.querySelectorAll('.af-buy-opt');
  var rentOpts = document.querySelectorAll('.af-rent-opt');
  var buyOptgroups = document.querySelectorAll('.af-buy-opts');
  var rentOptgroups = document.querySelectorAll('.af-rent-opts');
  var btnBuy = document.getElementById('af-mode-buy');
  var btnRent = document.getElementById('af-mode-rent');
  document.getElementById('af-price-min').value = '';
  document.getElementById('af-price-max').value = '';
  if(mode==='rent'){
    buyOpts.forEach(function(o){o.style.display='none';});
    rentOpts.forEach(function(o){o.style.display='';});
    buyOptgroups.forEach(function(g){g.style.display='none';});
    rentOptgroups.forEach(function(g){g.style.display='';});
    if(btnBuy){ btnBuy.style.background='#f5f5f0'; btnBuy.style.color='var(--tx2)'; btnBuy.style.borderColor='var(--bd)'; }
    if(btnRent){ btnRent.style.background='var(--p)'; btnRent.style.color='#fff'; btnRent.style.borderColor='var(--p)'; }
  } else {
    buyOpts.forEach(function(o){o.style.display='';});
    rentOpts.forEach(function(o){o.style.display='none';});
    buyOptgroups.forEach(function(g){g.style.display='';});
    rentOptgroups.forEach(function(g){g.style.display='none';});
    if(btnBuy){ btnBuy.style.background='var(--p)'; btnBuy.style.color='#fff'; btnBuy.style.borderColor='var(--p)'; }
    if(btnRent){ btnRent.style.background='#f5f5f0'; btnRent.style.color='var(--tx2)'; btnRent.style.borderColor='var(--bd)'; }
  }
}

function toggleAdvFilter(btn){
  const isMob = window.innerWidth <= 900;
  if(isMob){ openAdvSheet(); }
  else { openAdvPanel(btn); }
}

function syncAdvFilterOptions() {
  // Sync จังหวัด from s-prov select
  const sProv = document.getElementById('s-prov');
  const afProv = document.querySelector('.adv-fp-body .adv-check-grid[data-type="province"]');
  if(sProv && afProv) {
    const opts = Array.from(sProv.options).filter(o => o.value).slice(0, 20);
    afProv.innerHTML = opts.map(o => 
      `<label class="adv-check-item"><input type="checkbox" value="${o.value}" class="af-prov"> ${o.text}</label>`
    ).join('');
  }
  
  // Sync BTS from qs-bts-dd panel
  const btsDd = document.getElementById('qs-bts-dd');
  const afBts = document.querySelector('.adv-fp-body .adv-check-grid[data-type="bts"]');
  if(btsDd && afBts) {
    const btsBtns = Array.from(btsDd.querySelectorAll('.qs-opt')).slice(0, 20);
    afBts.innerHTML = btsBtns.map(btn => {
      const val = btn.textContent.replace(/^[🚈🚇]\s*/, '').split('(')[0].trim();
      return `<label class="adv-check-item"><input type="checkbox" value="${val}" class="af-bts"> ${val}</label>`;
    }).join('');
  }
  
  // Sync MRT from qs-mrt-dd
  const mrtDd = document.getElementById('qs-mrt-dd');
  const afMrt = document.querySelector('.adv-fp-body .adv-check-grid[data-type="mrt"]');
  if(mrtDd && afMrt) {
    const mrtBtns = Array.from(mrtDd.querySelectorAll('.qs-opt')).slice(0, 20);
    afMrt.innerHTML = mrtBtns.map(btn => {
      const val = btn.textContent.replace(/^[🚈🚇]\s*/, '').split('(')[0].trim();
      return `<label class="adv-check-item"><input type="checkbox" value="${val}" class="af-mrt"> ${val}</label>`;
    }).join('');
  }
  
  // Sync มหาวิทยาลัย from qs-uni-dd
  const uniDd = document.getElementById('qs-uni-dd');
  const afUni = document.querySelector('.adv-fp-body .adv-check-grid[data-type="uni"]');
  if(uniDd && afUni) {
    const uniBtns = Array.from(uniDd.querySelectorAll('.qs-opt')).slice(0, 12);
    afUni.innerHTML = uniBtns.map(btn => {
      const val = btn.textContent.replace(/^[🎓📍]\s*(ใกล้\s*)?/, '').trim();
      return `<label class="adv-check-item"><input type="checkbox" value="${val}" class="af-uni"> ${val}</label>`;
    }).join('');
  }
}

function openAdvPanel(btn){
  const panel = document.getElementById('adv-filter-panel');
  const desktopOverlay = document.getElementById('adv-desktop-overlay');
  if(!panel) return;
  if(panel.classList.contains('open')){ closeAdvFilter(); return; }
  syncAdvFilterOptions(); // sync options from search dropdowns
  // Center popup — no positioning needed (CSS handles it)
  panel.classList.add('open');
  if(desktopOverlay) desktopOverlay.classList.add('open');
  document.body.classList.add('modal-open'); // overflow:hidden via CSS .modal-open
  // Init bubble positions after panel is visible
  requestAnimationFrame(function(){
    ['af-land-min','af-land-max','af-area-min','af-area-max'].forEach(function(id){
      var inp = document.getElementById(id);
      if(!inp) return;
      var isLand = id.includes('land');
      advRangeUpdate(inp, id+'-v', isLand?'af-land-summary':'af-area-summary', isLand?'land':'area');
      // update fill track
      var pct = (+inp.value - +inp.min)/(+inp.max - +inp.min)*100;
      inp.style.setProperty('--pct', pct+'%');
    });
  });
}
function openAdvSheet(){
  const sheet = document.getElementById('adv-sheet');
  const overlay = document.getElementById('adv-sheet-overlay');
  const sheetBody = document.getElementById('adv-sheet-body');
  // clone content from panel body
  const panelBody = document.querySelector('.adv-fp-body');
  if(panelBody && sheetBody) sheetBody.innerHTML = panelBody.innerHTML;
  if(sheet) sheet.classList.add('open');
  if(overlay) overlay.classList.add('open');
  document.body.classList.add('modal-open'); // overflow:hidden via CSS .modal-open
  // Re-init range bubbles in the cloned sheet
  setTimeout(function(){
    sheetBody.querySelectorAll('input[type=range]').forEach(function(inp){
      var bubbleId = inp.id+'-v';
      var isLand = inp.id.includes('land');
      var summaryId = isLand ? 'af-land-summary' : 'af-area-summary';
      var type = isLand ? 'land' : 'area';
      // bind oninput on cloned element
      inp.oninput = function(){ advRangeUpdate(this, bubbleId, summaryId, type); };
      advRangeUpdate(inp, bubbleId, summaryId, type);
    });
  }, 50);
}
function _advOutsideClick(e){
  const panel = document.getElementById('adv-filter-panel');
  const btn = document.getElementById('adv-filter-btn');
  if(panel && !panel.contains(e.target) && btn && !btn.contains(e.target)){
    closeAdvFilter();
  }
}
function closeAdvFilter(){
  const panel = document.getElementById('adv-filter-panel');
  const sheet = document.getElementById('adv-sheet');
  const overlay = document.getElementById('adv-sheet-overlay');
  const desktopOverlay = document.getElementById('adv-desktop-overlay');
  if(panel) panel.classList.remove('open');
  if(sheet) sheet.classList.remove('open');
  if(overlay) overlay.classList.remove('open');
  if(desktopOverlay) desktopOverlay.classList.remove('open');
  const stillOpen = document.querySelector('.ov.open, [id$="-modal"].open, [id$="-overlay"].open, .seo-drawer.open, .adv-sheet.open');
  if(!stillOpen){
    document.body.style.removeProperty('overflow');
    document.body.classList.remove('modal-open');
  }
  document.removeEventListener('click', _advOutsideClick, true);
}
function advRangeUpdate(el, bubbleId, summaryId, type){
  // Support both old (no-arg) and new (with-arg) call signatures
  if(!el){
    // Legacy no-arg call — update all four sliders
    ['af-land-min','af-land-max','af-area-min','af-area-max'].forEach(function(id){
      var inp=document.getElementById(id);
      if(inp){ advRangeUpdate(inp,id+'-v',id==='af-land-min'||id==='af-land-max'?'af-land-summary':'af-area-summary',id.includes('land')?'land':'area'); }
    });
    return;
  }

  const val = +el.value;
  const min = +el.min;
  const max = +el.max;

  // Update track fill colour via CSS custom property
  const pct = max===min ? 0 : (val-min)/(max-min)*100;
  el.style.setProperty('--pct', pct+'%');

  // Format display value
  let display;
  if(type==='land')  display = val>=max ? ui('af.unlimited') : val.toLocaleString()+' ตร.ว.';
  else               display = val>=max ? ui('af.unlimited') : val.toLocaleString()+' ตร.ม.';

  // --- Update EVERY element with this id (handles panel + mobile-sheet duplicates) ---
  document.querySelectorAll('#'+bubbleId).forEach(function(span){
    span.textContent = display;
  });

  // Move bubble to follow thumb position
  _positionRangeBubble(el, document.querySelectorAll('#'+bubbleId));

  // Update summary line
  _updateRangeSummary(summaryId, type);
}

function _positionRangeBubble(input, spans){
  if(!spans || !spans.length) return;
  const min  = +input.min;
  const max  = +input.max;
  const val  = +input.value;
  const pct  = max===min ? 0 : (val-min)/(max-min)*100;
  // Offset to keep bubble centred over thumb (thumb ~16px wide)
  const thumbW = 16;
  spans.forEach(function(span){
    const trackW = input.offsetWidth || 200;
    const pos = pct/100*(trackW-thumbW) + thumbW/2;
    span.style.left = pos+'px';
    span.style.transform = 'translateX(-50%)';
  });
}

function _updateRangeSummary(summaryId, type){
  if(!summaryId) return;
  const isLand = type==='land';
  const minEl  = document.getElementById(isLand?'af-land-min':'af-area-min');
  const maxEl  = document.getElementById(isLand?'af-land-max':'af-area-max');
  if(!minEl||!maxEl) return;

  const minV = +minEl.value;
  const maxV = +maxEl.value;
  const maxMax = +maxEl.max;
  const unit = ui(isLand ? 'pdi.land' : 'pdi.area');

  let text;
  if(minV===0 && maxV>=maxMax){
    text = ui('af.all.size');
  } else if(maxV>=maxMax){
    text = minV.toLocaleString()+' '+unit+'+';
  } else if(minV===0){
    text = '0 – '+maxV.toLocaleString()+' '+unit;
  } else {
    text = minV.toLocaleString()+' – '+maxV.toLocaleString()+' '+unit;
  }

  document.querySelectorAll('#'+summaryId).forEach(function(el){ el.textContent=text; });
}
function getAdvFilters(){
  const f = {};
  const lmin=document.getElementById('af-land-min'); if(lmin&&+lmin.value>0) f.land_min=+lmin.value;
  const lmax=document.getElementById('af-land-max'); if(lmax&&+lmax.value<1000) f.land_max=+lmax.value;
  const amin=document.getElementById('af-area-min'); if(amin&&+amin.value>0) f.area_min=+amin.value;
  const amax=document.getElementById('af-area-max'); if(amax&&+amax.value<500) f.area_max=+amax.value;
  const beds=[...document.querySelectorAll('.af-bed:checked')].map(el=>+el.value); if(beds.length) f.beds=beds;
  const baths=[...document.querySelectorAll('.af-bath:checked')].map(el=>+el.value); if(baths.length) f.baths=baths;
  const parks=[...document.querySelectorAll('.af-park:checked')].map(el=>+el.value); if(parks.length) f.parks=parks;
  const furns=[]; 
  if(document.getElementById('af-furn-full')?.checked) furns.push('full');
  if(document.getElementById('af-furn-part')?.checked) furns.push('partial');
  if(document.getElementById('af-furn-none')?.checked) furns.push('none');
  if(furns.length) f.furniture=furns;
  if(document.getElementById('af-pets')?.checked) f.pets=true;
  const apps=[...document.querySelectorAll('.af-app:checked')].map(el=>el.value); if(apps.length) f.appliances=apps;
  // Price filters
  const pMin=document.getElementById('af-price-min'); if(pMin&&pMin.value) f.price_min=+pMin.value;
  const pMax=document.getElementById('af-price-max'); if(pMax&&pMax.value&&+pMax.value<999000000) f.price_max=+pMax.value;
  // Province or popular location (mutual exclusion handled in UI, but check both)
  const popLoc=document.getElementById('af-popular-loc'); 
  const prov=document.getElementById('af-province');
  if(popLoc&&popLoc.value) f.location_kw=popLoc.value;
  else if(prov&&prov.value) f.province=prov.value;
  const btsVal=document.getElementById('af-bts-select')?.value; if(btsVal) f.bts=[btsVal];
  const mrtVal=document.getElementById('af-mrt-select')?.value; if(mrtVal) f.mrt=[mrtVal];
  const uniVal=document.getElementById('af-uni-select')?.value; if(uniVal) f.uni=[uniVal];
  return f;
}
function countAdvFilters(f){
  let n=0;
  if(f.land_min||f.land_max) n++;
  if(f.area_min||f.area_max) n++;
  if(f.beds?.length) n++;
  if(f.baths?.length) n++;
  if(f.parks?.length) n++;
  if(f.furniture?.length) n++;
  if(f.pets) n++;
  if(f.appliances?.length) n++;
  if(f.price_min||f.price_max) n++;
  if(f.province||f.location_kw) n++;
  if(f.bts?.length) n++;
  if(f.mrt?.length) n++;
  if(f.uni?.length) n++;
  return n;
}
function applyAdvFilter(){
  const f = getAdvFilters();
  const cnt = countAdvFilters(f);
  const badge = document.getElementById('adv-badge');
  if(badge){ badge.textContent=cnt; badge.classList.toggle('show', cnt>0); }

  // ── ตรวจสอบว่าอยู่หน้า listings หรือ home ──
  const isListingsPage = document.getElementById('page-listings')?.classList.contains('active');

  if(isListingsPage){
    // ── Listings page: filter จาก _listingsBaseData ──
    let res = [..._listingsBaseData];
    // apply basic filters จาก search bar ก่อน
    const kwRaw = (document.getElementById('ls-kw')?.value||'').trim().toLowerCase();
    const txVal = document.getElementById('ls-tx')?.value||'';
    const typeVal = document.getElementById('ls-type')?.value||'';
    const provVal = document.getElementById('ls-prov')?.value||'';
    const pMin = parseInt(document.getElementById('ls-min')?.value||'0')||0;
    const pMax = parseInt(document.getElementById('ls-max')?.value||'999000000')||999000000;
    if(kwRaw) res=res.filter(p=>{
      const hay=((p.title||'')+(p.location||'')+(p.province||'')+(p.desc||'')+(p.bts||'')+(p.mrt||'')).toLowerCase();
      return hay.includes(kwRaw);
    });
    if(txVal) res=res.filter(p=>p.tx===txVal);
    if(typeVal) res=res.filter(p=>p.type===typeVal);
    if(provVal) res=res.filter(p=>p.province===provVal||p.location===provVal);
    if(pMin>0) res=res.filter(p=>p.price>=pMin);
    if(pMax<999000000) res=res.filter(p=>p.price<=pMax);
    // apply advanced filters
    if(f.land_min) res=res.filter(p=>p.land_area>=f.land_min);
    if(f.land_max) res=res.filter(p=>p.land_area<=f.land_max);
    if(f.area_min) res=res.filter(p=>p.area>=f.area_min);
    if(f.area_max) res=res.filter(p=>p.area<=f.area_max);
    if(f.beds?.length) res=res.filter(p=>f.beds.some(b=>b===4?p.bed>=4:p.bed===b));
    if(f.baths?.length) res=res.filter(p=>f.baths.some(b=>b===4?p.bath>=4:p.bath===b));
    if(f.parks?.length) res=res.filter(p=>f.parks.some(b=>b===3?p.parking>=3:p.parking===b));
    if(f.furniture?.length) res=res.filter(p=>f.furniture.includes(p.furniture));
    if(f.pets) res=res.filter(p=>p.pets_allowed);
    if(f.appliances?.length) res=res.filter(p=>f.appliances.every(a=>p.appliances?.includes(a)));
    if(f.price_min) res=res.filter(p=>p.price>=f.price_min);
    if(f.price_max) res=res.filter(p=>p.price<=f.price_max);
    if(f.province) res=res.filter(p=>(p.province||p.location||'').includes(f.province));
    if(f.location_kw) res=res.filter(p=>((p.location||'')+(p.province||'')+(p.title||'')+(p.desc||'')).toLowerCase().includes(f.location_kw.toLowerCase()));
    if(f.bts?.length) res=res.filter(p=>f.bts.some(s=>(p.bts||p.location||p.transit||p.desc||'').toLowerCase().includes(s.toLowerCase())));
    if(f.mrt?.length) res=res.filter(p=>f.mrt.some(s=>(p.mrt||p.location||p.transit||p.desc||'').toLowerCase().includes(s.toLowerCase())));
    if(f.uni?.length) res=res.filter(p=>f.uni.some(s=>(p.location||p.desc||'').toLowerCase().includes(s.toLowerCase())));
    _listingsData = sortListings(res, document.getElementById('listings-sort')?.value||'default');
    _listingsCurPage = 1;
    closeAdvFilter();
    renderListingsPage();
    // ── Update map markers immediately if map is open ──
    if(typeof _popupRefreshMarkersFromData==='function' && _popupLeafletMap){
      _popupRefreshMarkersFromData(res);
    }
    _scrollToListingsResults();
  } else {
    // ── Home page: original logic ──
    applyFilters().catch(()=>{});
    setTimeout(()=>{
      let res = [...filtered];
      if(f.land_min) res=res.filter(p=>p.land_area>=f.land_min);
      if(f.land_max) res=res.filter(p=>p.land_area<=f.land_max);
      if(f.area_min) res=res.filter(p=>p.area>=f.area_min);
      if(f.area_max) res=res.filter(p=>p.area<=f.area_max);
      if(f.beds?.length) res=res.filter(p=>f.beds.some(b=>b===4?p.bed>=4:p.bed===b));
      if(f.baths?.length) res=res.filter(p=>f.baths.some(b=>b===4?p.bath>=4:p.bath===b));
      if(f.parks?.length) res=res.filter(p=>f.parks.some(b=>b===3?p.parking>=3:p.parking===b));
      if(f.furniture?.length) res=res.filter(p=>f.furniture.includes(p.furniture));
      if(f.pets) res=res.filter(p=>p.pets_allowed);
      if(f.appliances?.length) res=res.filter(p=>f.appliances.every(a=>p.appliances?.includes(a)));
      if(f.price_min) res=res.filter(p=>p.price>=f.price_min);
      if(f.price_max) res=res.filter(p=>p.price<=f.price_max);
      if(f.province) res=res.filter(p=>(p.province||p.location||'').includes(f.province));
      if(f.location_kw) res=res.filter(p=>((p.location||'')+(p.province||'')+(p.title||'')+(p.desc||'')).toLowerCase().includes(f.location_kw.toLowerCase()));
      if(f.bts?.length) res=res.filter(p=>f.bts.some(s=>(p.location||p.desc||p.description||'').toLowerCase().includes(s.toLowerCase())));
      if(f.mrt?.length) res=res.filter(p=>f.mrt.some(s=>(p.location||p.desc||p.description||'').toLowerCase().includes(s.toLowerCase())));
      if(f.uni?.length) res=res.filter(p=>f.uni.some(s=>(p.location||p.desc||p.description||'').toLowerCase().includes(s.toLowerCase())));
      filtered=res; allFiltered=res;
      const rc=document.getElementById('res-count');
      if(rc) rc.textContent=`พบ ${res.length} รายการ`;
      if(typeof renderGrid==='function'){ renderGrid('all-grid',res.slice(0,8)); }
      // ── Update map markers immediately if map is open ──
      if(typeof _popupRefreshMarkersFromData==='function' && _popupLeafletMap){
        _popupRefreshMarkersFromData(res);
      }
      closeAdvFilter();
      scrollToEl('all-sec');
    }, 120);
  }
}
// ===== SEO DRAWER (mobile) =====
function openSeoDrawer(){
  const overlay = document.getElementById('seo-drawer-overlay');
  const drawer = document.getElementById('seo-drawer');
  const body = document.getElementById('seo-drawer-body');
  // Re-render sidebar content into drawer
  if(body) {
    const sidebar = document.querySelector('.listings-seo-sidebar');
    if(sidebar) {
      body.innerHTML = sidebar.innerHTML;
    } else {
      // Fallback: render SEO content directly
      if(typeof renderListingsSeoSidebar === 'function') renderListingsSeoSidebar();
      const s2 = document.querySelector('.listings-seo-sidebar');
      if(s2) body.innerHTML = s2.innerHTML;
    }
  }
  if(overlay) overlay.classList.add('open');
  if(drawer) drawer.classList.add('open');
  document.body.classList.add('modal-open'); // overflow:hidden via CSS .modal-open
}
function closeSeoDrawer(){
  const overlay = document.getElementById('seo-drawer-overlay');
  const drawer = document.getElementById('seo-drawer');
  if(overlay) overlay.classList.remove('open');
  if(drawer) drawer.classList.remove('open');
  const stillOpen = document.querySelector('.ov.open, [id$="-modal"].open, [id$="-overlay"].open');
  if(!stillOpen){
    document.body.style.removeProperty('overflow');
    document.body.classList.remove('modal-open');
  }
}

function resetAdvFilter(){
  // ── reset adv-filter-panel (desktop) ──
  document.querySelectorAll('.adv-fp-body input[type=range]').forEach(el=>{ el.value=el.getAttribute('value')||el.min; });
  document.querySelectorAll('.adv-fp-body input[type=checkbox]').forEach(el=>{ el.checked=false; });
  document.querySelectorAll('.adv-fp-body select').forEach(el=>{ el.value=''; });
  // ── reset adv-sheet (mobile) ──
  document.querySelectorAll('.adv-sheet-body input[type=range]').forEach(el=>{ el.value=el.getAttribute('value')||el.min; });
  document.querySelectorAll('.adv-sheet-body input[type=checkbox]').forEach(el=>{ el.checked=false; });
  document.querySelectorAll('.adv-sheet-body select').forEach(el=>{ el.value=''; });
  // ── reset popular-loc select ──
  var pl = document.getElementById('af-popular-loc'); if(pl) pl.value='';
  // ── reset price mode to buy ──
  switchAdvPriceMode('buy');
  advRangeUpdate();
  // ── reset badges ──
  const badge=document.getElementById('adv-badge');
  if(badge){ badge.textContent='0'; badge.classList.remove('show'); }
  const lsBadge=document.getElementById('ls-adv-badge');
  if(lsBadge){ lsBadge.textContent='0'; lsBadge.classList.remove('show'); }
  // ── reset _modalExtraFilter state ──
  window._modalExtraFilter={};
  // ── reset main search bar fields to keep all filters in sync ──
  const kw=document.getElementById('s-kw'); if(kw){kw.value='';const al=document.getElementById('ac-list');if(al)al.style.display='none';}
  const st=document.getElementById('s-type'); if(st) st.value='';
  const sp=document.getElementById('s-prov'); if(sp) sp.value='';
  const smn=document.getElementById('s-min'); if(smn) smn.selectedIndex=0;
  const smx=document.getElementById('s-max'); if(smx) smx.selectedIndex=0;
  // ── apply reset to current page context ──
  const isListingsPage = document.getElementById('page-listings')?.classList.contains('active');
  if(isListingsPage){
    // reset listings search bar too
    const lkw=document.getElementById('ls-kw'); if(lkw) lkw.value='';
    const ltx=document.getElementById('ls-tx'); if(ltx) ltx.value='';
    const ltyp=document.getElementById('ls-type'); if(ltyp) ltyp.value='';
    const lpv=document.getElementById('ls-prov'); if(lpv) lpv.value='';
    const lmn=document.getElementById('ls-min'); if(lmn) lmn.value='0';
    const lmx=document.getElementById('ls-max'); if(lmx) lmx.value='999000000';
    if(typeof _listingsBaseData!=='undefined'){
      _listingsData = [..._listingsBaseData];
      _listingsCurPage = 1;
      if(typeof renderListingsPage==='function') renderListingsPage();
    }
  } else {
    applyFilters().catch(console.error);
  }
}

/* ══ SEO RICH CONTENT DATA ═══════════════════════════════════════════════
   Single source of truth — แก้ไขที่นี่ที่เดียว ทั้ง SEO section จะ sync
   อัตโนมัติ เพิ่มสถานีหรือทำเลใหม่เพียงแค่เพิ่ม entry ใน array นี้
   ════════════════════════════════════════════════════════════════════════ */
var SEO_RICH_CONTENT_DATA = [
  {
    heading: '🟢 BTS สายสุขุมวิท ยอดนิยม',
    color: '#0a8a3a',
    items: [
      { label: 'คอนโดใกล้ BTS อโศก',          q: 'อโศก BTS',       icon: 'fa-train',        ic: '#0a8a3a', type: 'q' },
      { label: 'คอนโดใกล้ BTS ทองหล่อ',       q: 'ทองหล่อ BTS',    icon: 'fa-train',        ic: '#0a8a3a', type: 'q' },
      { label: 'คอนโดสุขุมวิท BTS พร้อมพงษ์', q: 'พร้อมพงษ์ BTS',  icon: 'fa-train',        ic: '#0a8a3a', type: 'q' },
      { label: 'คอนโดใกล้ BTS เอกมัย',        q: 'เอกมัย BTS',     icon: 'fa-train',        ic: '#0a8a3a', type: 'q' },
      { label: 'คอนโดใกล้ BTS อ่อนนุช',       q: 'อ่อนนุช BTS',    icon: 'fa-train',        ic: '#0a8a3a', type: 'q' },
      { label: 'คอนโดใกล้ BTS สยาม',          q: 'สยาม BTS',       icon: 'fa-train',        ic: '#0a8a3a', type: 'q' }
    ]
  },
  {
    heading: '🔵 MRT สายสีน้ำเงิน',
    color: '#1a5fb4',
    items: [
      { label: 'คอนโดพระราม 9 MRT',  q: 'พระราม 9',     icon: 'fa-subway', ic: '#1a5fb4', type: 'q' },
      { label: 'คอนโดรัชดา MRT',     q: 'รัชดา MRT',    icon: 'fa-subway', ic: '#1a5fb4', type: 'q' },
      { label: 'บ้านลาดพร้าว MRT',   q: 'ลาดพร้าว MRT', icon: 'fa-subway', ic: '#1a5fb4', type: 'q' },
      { label: 'คอนโดสุขุมวิท MRT',  q: 'สุขุมวิท MRT', icon: 'fa-subway', ic: '#1a5fb4', type: 'q' },
      { label: 'บ้านจตุจักร MRT',    q: 'จตุจักร MRT',  icon: 'fa-subway', ic: '#1a5fb4', type: 'q' },
      { label: 'คอนโดสีลม MRT',      q: 'สีลม MRT',     icon: 'fa-subway', ic: '#1a5fb4', type: 'q' }
    ]
  },
  {
    heading: '🏘️ ทำเลยอดนิยม กรุงเทพ',
    color: '#C8922A',
    items: [
      { label: 'คอนโดสุขุมวิท', q: 'สุขุมวิท', icon: 'fa-map-marker-alt', ic: 'var(--a)', type: 'q' },
      { label: 'คอนโดสาทร',     q: 'สาทร',     icon: 'fa-map-marker-alt', ic: 'var(--a)', type: 'q' },
      { label: 'คอนโดพระโขนง', q: 'พระโขนง',  icon: 'fa-map-marker-alt', ic: 'var(--a)', type: 'q' },
      { label: 'บ้านบางนา',     q: 'บางนา',    icon: 'fa-map-marker-alt', ic: 'var(--a)', type: 'q' },
      { label: 'บ้านลาดพร้าว', q: 'ลาดพร้าว', icon: 'fa-map-marker-alt', ic: 'var(--a)', type: 'q' },
      { label: 'คอนโดรัชดา',   q: 'รัชดา',    icon: 'fa-map-marker-alt', ic: 'var(--a)', type: 'q' }
    ]
  },
  {
    heading: '🏠 ประเภทที่อยู่อาศัย',
    color: '#C0392B',
    items: [
      { label: 'ขายคอนโดกรุงเทพ',     q: 'คอนโด',    icon: 'fa-city',       ic: '#3D7A55', type: 'propType' },
      { label: 'ขายบ้านเดี่ยวกรุงเทพ', q: 'บ้านเดี่ยว',icon: 'fa-house-user', ic: '#C8922A', type: 'propType' },
      { label: 'ขายทาวน์โฮมกรุงเทพ',  q: 'ทาวน์โฮม', icon: 'fa-building',   ic: '#1B3A6B', type: 'propType' },
      { label: 'ขายที่ดินกรุงเทพ',     q: 'ที่ดิน',   icon: 'fa-map',        ic: '#E67E22', type: 'propType' },
      { label: 'เช่าคอนโดกรุงเทพ',    q: 'RENT',     icon: 'fa-key',        ic: '#7B4FBF', type: 'tx' },
      { label: 'ซื้อบ้านกรุงเทพ',      q: 'BUY',      icon: 'fa-tag',        ic: '#1B3A6B', type: 'tx' }
    ]
  }
];

(function renderSeoRichContent() {
  var grid = document.getElementById('seo-rich-grid');
  if (!grid) return;
  var ls = 'font-size:12px;color:var(--p);text-decoration:none;display:flex;align-items:center;gap:4px';
  grid.innerHTML = SEO_RICH_CONTENT_DATA.map(function(group) {
    var links = group.items.map(function(item) {
      var href, fn;
      if (item.type === 'q') {
        href = '/listings?q=' + encodeURIComponent(item.q);
        fn   = "listingsQuickSearch('" + item.q.replace(/'/g,"\\'") + "')";
      } else if (item.type === 'propType') {
        href = '/listings?type=' + encodeURIComponent(item.q);
        fn   = "listingsFilterByType('" + item.q.replace(/'/g,"\\'") + "')";
      } else {
        href = '/listings?tx=' + item.q;
        fn   = "listingsFilterTx('" + item.q + "')";
      }
      return '<li><a href="' + href + '" onclick="event.preventDefault();' + fn + '" style="' + ls + '" title="' + item.label + '">'
        + '<i class="fas ' + item.icon + '" style="color:' + item.ic + ';font-size:10px;width:12px"></i> ' + item.label + '</a></li>';
    }).join('');
    return '<div>'
      + '<h3 style="font-size:12px;font-weight:800;color:' + group.color + ';margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">' + group.heading + '</h3>'
      + '<ul style="list-style:none;display:flex;flex-direction:column;gap:4px">' + links + '</ul>'
      + '</div>';
  }).join('');
})();

(function(){
  /* ────────────────────────────────────────────────────
   * initSheetDrag(sheetEl, closeFn, overlayEl?)
   * Adds touch + pointer drag-to-dismiss on any bottom-sheet element.
   * Drag down > 80px OR velocity > 0.4px/ms → close.
   * ──────────────────────────────────────────────────── */
  function initSheetDrag(sheet, closeFn, overlayEl) {
    if (!sheet || sheet._dragInited) return;
    sheet._dragInited = true;

    var startY = 0, startTime = 0, curY = 0, dragging = false;
    var DISMISS_DIST = 90;   // px down
    var DISMISS_VEL  = 0.45; // px/ms

    function getSheetHeight(){ return sheet.offsetHeight || 400; }

    /* drag handle = first child with drag class, or the header area */
    var handle = sheet.querySelector('.adv-sheet-drag, .qs-mob-sheet-drag, [data-drag-handle]') || sheet;

    function onStart(e) {
      if (e.touches && e.touches.length > 1) return;
      var touch = e.touches ? e.touches[0] : e;
      startY = touch.clientY;
      startTime = Date.now();
      curY = 0;
      dragging = true;
      sheet.style.transition = 'none';
      if (overlayEl) overlayEl.style.transition = 'none';
    }
    function onMove(e) {
      if (!dragging) return;
      var touch = e.touches ? e.touches[0] : e;
      curY = touch.clientY - startY;
      if (curY < 0) curY = 0; // only allow drag down
      sheet.style.transform = 'translateY(' + curY + 'px)';
      if (overlayEl) {
        var opacity = Math.max(0, 0.5 * (1 - curY / getSheetHeight()));
        overlayEl.style.opacity = opacity;
      }
      /* prevent page scroll only if swiping down on sheet */
      if (curY > 4 && e.cancelable) e.preventDefault();
    }
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      var elapsed = Date.now() - startTime;
      var velocity = elapsed > 0 ? curY / elapsed : 0;
      sheet.style.transition = '';
      if (overlayEl) { overlayEl.style.transition = ''; overlayEl.style.opacity = ''; }
      if (curY > DISMISS_DIST || velocity > DISMISS_VEL) {
        /* animate out then close */
        sheet.style.transition = 'transform .28s cubic-bezier(.32,.6,.56,1)';
        sheet.style.transform = 'translateY(110%)';
        setTimeout(function(){
          sheet.style.transform = '';
          sheet.style.transition = '';
          closeFn();
        }, 280);
      } else {
        /* snap back */
        sheet.style.transform = '';
      }
      curY = 0;
    }

    handle.addEventListener('touchstart', onStart, {passive: true});
    document.addEventListener('touchmove', function(e){ if(dragging) onMove(e); }, {passive: false});
    document.addEventListener('touchend', onEnd, {passive: true});
  }

  /* ── Wire up adv-sheet ── */
  function initAdvSheetDrag(){
    var sheet = document.getElementById('adv-sheet');
    var overlay = document.getElementById('adv-sheet-overlay');
    if (sheet && !sheet._dragInited) initSheetDrag(sheet, function(){ closeAdvFilter(); }, overlay);
  }

  /* ── Wire up apply-overlay modals (mobile bottom-sheet) ── */
  function initApplyDrag(){
    ['apply-agent-modal','apply-other-modal'].forEach(function(id){
      var modal = document.getElementById(id);
      if (!modal || modal._dragInited) return;
      modal._dragInited = true; // prevent re-init
      var overlay = modal.closest('.apply-overlay');
      var startY=0,startTime=0,curY=0,dragging=false;
      var DISMISS_DIST=80, DISMISS_VEL=0.4;
      var header = modal.querySelector('.apply-modal-hd') || modal;
      function onStart(e){
        if(window.innerWidth>600) return;
        if(e.touches&&e.touches.length>1) return;
        var t=e.touches?e.touches[0]:e;
        startY=t.clientY; startTime=Date.now(); curY=0; dragging=true;
        modal.style.transition='none';
      }
      function onMove(e){
        if(!dragging||window.innerWidth>600) return;
        var t=e.touches?e.touches[0]:e;
        curY=t.clientY-startY; if(curY<0)curY=0;
        modal.style.transform='translateY('+curY+'px)';
        if(overlay){ var op=Math.max(0,0.55*(1-curY/modal.offsetHeight)); overlay.style.background='rgba(10,22,40,'+op+')'; }
        if(curY>4&&e.cancelable) e.preventDefault();
      }
      function onEnd(){
        if(!dragging) return; dragging=false;
        var vel=(Date.now()-startTime)>0?curY/(Date.now()-startTime):0;
        modal.style.transition='';
        if(overlay) overlay.style.background='';
        var type=id.replace('apply-','').replace('-modal','');
        if(curY>DISMISS_DIST||vel>DISMISS_VEL){
          modal.style.transition='transform .28s cubic-bezier(.32,.6,.56,1)';
          modal.style.transform='translateY(110%)';
          setTimeout(function(){ modal.style.transform=''; modal.style.transition=''; closeApplyModal(type); },280);
        } else { modal.style.transform=''; }
        curY=0;
      }
      header.addEventListener('touchstart',onStart,{passive:true});
      document.addEventListener('touchmove',function(e){if(dragging)onMove(e);},{passive:false});
      document.addEventListener('touchend',onEnd,{passive:true});
    });
  }

  /* ── Wire up qs-mob-sheet (dynamically created) ── */
  var _origOpenQsSheet = window.openQsSheet;
  window.openQsSheet = function(panelId, btn){
    if(_origOpenQsSheet) _origOpenQsSheet(panelId, btn);
    requestAnimationFrame(function(){
      var sheet = document.getElementById('qs-mob-sheet');
      var overlay = document.getElementById('qs-mob-overlay');
      if (sheet && !sheet._dragInited) initSheetDrag(sheet, function(){ if(window.closeQsSheet) closeQsSheet(); }, overlay);
    });
  };

  /* ── Init on DOM ready ── */
  function tryInit(){
    initAdvSheetDrag();
    initApplyDrag();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', tryInit);
  else tryInit();
  /* Also re-init when adv-sheet is opened (in case it wasn't in DOM at startup) */
  var _origOpenAdvSheet = window.openAdvSheet;
  window.openAdvSheet = function(){
    if(_origOpenAdvSheet) _origOpenAdvSheet();
    requestAnimationFrame(initAdvSheetDrag);
  };
  var _origOpenApply = window.openApplyModal;
  window.openApplyModal = function(type){
    if(_origOpenApply) _origOpenApply(type);
    requestAnimationFrame(initApplyDrag);
  };
})();

/* ─── Transit Station Data ────────────────────────────────────────────────
   ข้อมูลสถานี BTS / SRT / ARL / MRT แบบ array
   โครงสร้าง: { sec, color }  = หัวข้อส่วน
              { q, label, icon } = ปุ่มสถานี  (icon ไม่ระบุ = 🚉)
   ──────────────────────────────────────────────────────────────────────── */
const TRANSIT_BTS = [
  {sec:'🟢 BTS สายสุขุมวิท — เหนือ (N1–N24) · 24 สถานี', color:'#0a8a3a'},
  {q:'ราชเทวี BTS',label:'ราชเทวี (N1)'},
  {q:'พญาไท BTS',label:'พญาไท (N2)'},
  {q:'อนุสาวรีย์ชัยสมรภูมิ BTS',label:'อนุสาวรีย์ฯ (N3)'},
  {q:'สนามเป้า BTS',label:'สนามเป้า (N4)'},
  {q:'อารีย์ BTS',label:'อารีย์ (N5)'},
  {q:'สะพานควาย BTS',label:'สะพานควาย (N7)'},
  {q:'หมอชิต BTS',label:'หมอชิต (N8)'},
  {q:'ห้าแยกลาดพร้าว BTS',label:'ห้าแยกลาดพร้าว (N9)'},
  {q:'พหลโยธิน 24 BTS',label:'พหลโยธิน 24 (N10)'},
  {q:'รัชโยธิน BTS',label:'รัชโยธิน (N11)'},
  {q:'เสนานิคม BTS',label:'เสนานิคม (N12)'},
  {q:'มหาวิทยาลัยเกษตรศาสตร์ BTS',label:'ม.เกษตรศาสตร์ (N13)'},
  {q:'กรมป่าไม้ BTS',label:'กรมป่าไม้ (N14)'},
  {q:'บางบัว BTS',label:'บางบัว (N15)'},
  {q:'กรมทหารราบที่ 11 BTS',label:'กรมทหารราบที่ 11 (N16)'},
  {q:'วัดพระศรีมหาธาตุ BTS',label:'วัดพระศรีมหาธาตุ (N17)'},
  {q:'พหลโยธิน 59 BTS',label:'พหลโยธิน 59 (N18)'},
  {q:'สายหยุด BTS',label:'สายหยุด (N19)'},
  {q:'สะพานใหม่ BTS',label:'สะพานใหม่ (N20)'},
  {q:'โรงพยาบาลภูมิพลอดุลยเดช BTS',label:'รพ.ภูมิพลอดุลยเดช (N21)'},
  {q:'พิพิธภัณฑ์กองทัพอากาศ BTS',label:'พิพิธภัณฑ์กองทัพอากาศ (N22)'},
  {q:'แยก คปอ. BTS',label:'แยก คปอ. (N23)'},
  {q:'คูคต BTS',label:'คูคต (N24)'},
  {sec:'🟢 BTS สายสุขุมวิท — กลาง & ตะวันออก (CEN–E23) · 24 สถานี', color:'#0a8a3a'},
  {q:'สยาม BTS',label:'สยาม (CEN)'},
  {q:'ชิดลม BTS',label:'ชิดลม (E1)'},
  {q:'เพลินจิต BTS',label:'เพลินจิต (E2)'},
  {q:'นานา BTS',label:'นานา (E3)'},
  {q:'อโศก BTS',label:'อโศก (E4)'},
  {q:'พร้อมพงษ์ BTS',label:'พร้อมพงษ์ (E5)'},
  {q:'ทองหล่อ BTS',label:'ทองหล่อ (E6)'},
  {q:'เอกมัย BTS',label:'เอกมัย (E7)'},
  {q:'พระโขนง BTS',label:'พระโขนง (E8)'},
  {q:'อ่อนนุช BTS',label:'อ่อนนุช (E9)'},
  {q:'บางจาก BTS',label:'บางจาก (E10)'},
  {q:'ปุณณวิถี BTS',label:'ปุณณวิถี (E11)'},
  {q:'อุดมสุข BTS',label:'อุดมสุข (E12)'},
  {q:'บางนา BTS',label:'บางนา (E13)'},
  {q:'แบริ่ง BTS',label:'แบริ่ง (E14)'},
  {q:'สำโรง BTS',label:'สำโรง (E15)'},
  {q:'ปู่เจ้า BTS',label:'ปู่เจ้า (E16)'},
  {q:'ช้างเอราวัณ BTS',label:'ช้างเอราวัณ (E17)'},
  {q:'โรงเรียนนายเรือ BTS',label:'โรงเรียนนายเรือ (E18)'},
  {q:'ปากน้ำ BTS',label:'ปากน้ำ (E19)'},
  {q:'ศรีนครินทร์ BTS',label:'ศรีนครินทร์ (E20)'},
  {q:'แพรกษา BTS',label:'แพรกษา (E21)'},
  {q:'สายลวด BTS',label:'สายลวด (E22)'},
  {q:'เคหะฯ BTS',label:'เคหะฯ (E23)'},
  {sec:'🟢 BTS สายสีลม (W1, S1–S12) · 13 สถานี', color:'#0a8a3a'},
  {q:'สนามกีฬาแห่งชาติ BTS',label:'สนามกีฬาแห่งชาติ (W1)'},
  {q:'ราชดำริ BTS',label:'ราชดำริ (S1)'},
  {q:'ศาลาแดง BTS',label:'ศาลาแดง (S2)'},
  {q:'ช่องนนทรี BTS',label:'ช่องนนทรี (S3)'},
  {q:'เซนต์หลุยส์ BTS',label:'เซนต์หลุยส์ (S4)'},
  {q:'สุรศักดิ์ BTS',label:'สุรศักดิ์ (S5)'},
  {q:'สะพานตากสิน BTS',label:'สะพานตากสิน (S6)'},
  {q:'กรุงธนบุรี BTS',label:'กรุงธนบุรี (S7)'},
  {q:'วงเวียนใหญ่ BTS',label:'วงเวียนใหญ่ (S8)'},
  {q:'โพธิ์นิมิตร BTS',label:'โพธิ์นิมิตร (S9)'},
  {q:'ตลาดพลู BTS',label:'ตลาดพลู (S10)'},
  {q:'วุฒากาศ BTS',label:'วุฒากาศ (S11)'},
  {q:'บางหว้า BTS',label:'บางหว้า (S12)'},
  {sec:'🟤 BTS สายสีทอง · 3 สถานี (กรุงธนบุรี–คลองสาน)', color:'#c8922a'},
  {q:'กรุงธนบุรี สีทอง BTS',label:'กรุงธนบุรี (G1)'},
  {q:'เจริญนคร BTS สีทอง',label:'เจริญนคร (G2)'},
  {q:'คลองสาน BTS สีทอง',label:'คลองสาน (G3)'},
  {sec:'🔴 SRT สายสีแดงเข้ม · 10 สถานี (กลางกรุงเทพอภิวัฒน์–รังสิต)', color:'#cc2200', icon:'🚇'},
  {q:'กลางกรุงเทพอภิวัฒน์ SRT',label:'กลางกรุงเทพอภิวัฒน์ (RN01)', icon:'🚇'},
  {q:'จตุจักร SRT สีแดง',label:'จตุจักร (RN02)', icon:'🚇'},
  {q:'วัดเสมียนนารี SRT',label:'วัดเสมียนนารี (RN03)', icon:'🚇'},
  {q:'บางเขน SRT',label:'บางเขน (RN04)', icon:'🚇'},
  {q:'ทุ่งสองห้อง SRT',label:'ทุ่งสองห้อง (RN05)', icon:'🚇'},
  {q:'หลักสี่ SRT',label:'หลักสี่ (RN06)', icon:'🚇'},
  {q:'การเคหะ SRT',label:'การเคหะ (RN07)', icon:'🚇'},
  {q:'ดอนเมือง SRT',label:'ดอนเมือง (RN08)', icon:'🚇'},
  {q:'หลักหก SRT',label:'หลักหก (RN09)', icon:'🚇'},
  {q:'รังสิต SRT',label:'รังสิต (RN10)', icon:'🚇'},
  {sec:'🔴 SRT สายสีแดงอ่อน · 4 สถานี (กลางกรุงเทพอภิวัฒน์–ตลิ่งชัน)', color:'#cc6644', icon:'🚇'},
  {q:'กลางกรุงเทพอภิวัฒน์ SRT ตลิ่งชัน',label:'กลางกรุงเทพอภิวัฒน์ (RW01)', icon:'🚇'},
  {q:'บางซ่อน SRT',label:'บางซ่อน (RW02)', icon:'🚇'},
  {q:'บางบำหรุ SRT',label:'บางบำหรุ (RW05)', icon:'🚇'},
  {q:'ตลิ่งชัน SRT',label:'ตลิ่งชัน (RW06)', icon:'🚇'},
  {sec:'✈️ Airport Rail Link (ARL) · 8 สถานี (สุวรรณภูมิ–พญาไท)', color:'#555', icon:'🚈'},
  {q:'สุวรรณภูมิ ARL',label:'สุวรรณภูมิ (A1)', icon:'🚈'},
  {q:'ลาดกระบัง ARL',label:'ลาดกระบัง (A2)', icon:'🚈'},
  {q:'บ้านทับช้าง ARL',label:'บ้านทับช้าง (A3)', icon:'🚈'},
  {q:'หัวหมาก ARL',label:'หัวหมาก (A4)', icon:'🚈'},
  {q:'รามคำแหง ARL',label:'รามคำแหง (A5)', icon:'🚈'},
  {q:'มักกะสัน ARL',label:'มักกะสัน (A6)', icon:'🚈'},
  {q:'ราชปรารภ ARL',label:'ราชปรารภ (A7)', icon:'🚈'},
  {q:'พญาไท ARL',label:'พญาไท (A8)', icon:'🚈'},
];

const TRANSIT_MRT = [
  {sec:'🔵 MRT สายน้ำเงิน · 38 สถานี (ท่าพระ–หลักสอง วงแหวน)', color:'#1a5fb4'},
  {q:'หลักสอง MRT',label:'หลักสอง (BL38)'},
  {q:'บางแค MRT',label:'บางแค (BL37)'},
  {q:'ภาษีเจริญ MRT',label:'ภาษีเจริญ (BL36)'},
  {q:'เพชรเกษม 48 MRT',label:'เพชรเกษม 48 (BL35)'},
  {q:'บางหว้า MRT',label:'บางหว้า (BL34)'},
  {q:'บางไผ่ MRT',label:'บางไผ่ (BL33)'},
  {q:'ท่าพระ MRT',label:'ท่าพระ (BL01)'},
  {q:'อิสรภาพ MRT',label:'อิสรภาพ (BL32)'},
  {q:'สนามไชย MRT',label:'สนามไชย (BL31)'},
  {q:'สามยอด MRT',label:'สามยอด (BL30)'},
  {q:'วัดมังกร MRT',label:'วัดมังกร (BL29)'},
  {q:'หัวลำโพง MRT',label:'หัวลำโพง (BL28)'},
  {q:'สามย่าน MRT',label:'สามย่าน (BL27)'},
  {q:'สีลม MRT',label:'สีลม (BL26)'},
  {q:'ลุมพินี MRT',label:'ลุมพินี (BL25)'},
  {q:'คลองเตย MRT',label:'คลองเตย (BL24)'},
  {q:'ศูนย์การประชุมแห่งชาติสิริกิติ์ MRT',label:'ศูนย์ฯ สิริกิติ์ (BL23)'},
  {q:'สุขุมวิท MRT',label:'สุขุมวิท (BL22)'},
  {q:'เพชรบุรี MRT',label:'เพชรบุรี (BL21)'},
  {q:'พระราม 9 MRT',label:'พระราม 9 (BL20)'},
  {q:'ศูนย์วัฒนธรรม MRT',label:'ศูนย์วัฒนธรรมฯ (BL19)'},
  {q:'ห้วยขวาง MRT',label:'ห้วยขวาง (BL18)'},
  {q:'สุทธิสาร MRT',label:'สุทธิสาร (BL17)'},
  {q:'รัชดาภิเษก MRT',label:'รัชดาภิเษก (BL16)'},
  {q:'ลาดพร้าว MRT',label:'ลาดพร้าว (BL15)'},
  {q:'พหลโยธิน MRT',label:'พหลโยธิน (BL14)'},
  {q:'สวนจตุจักร MRT',label:'สวนจตุจักร (BL13)'},
  {q:'กำแพงเพชร MRT',label:'กำแพงเพชร (BL12)'},
  {q:'บางซื่อ MRT',label:'บางซื่อ (BL11)'},
  {q:'เตาปูน MRT',label:'เตาปูน (BL10)'},
  {q:'บางโพ MRT',label:'บางโพ (BL09)'},
  {q:'บางอ้อ MRT',label:'บางอ้อ (BL08)'},
  {q:'บางพลัด MRT',label:'บางพลัด (BL07)'},
  {q:'สิรินธร MRT',label:'สิรินธร (BL06)'},
  {q:'บางยี่ขัน MRT',label:'บางยี่ขัน (BL05)'},
  {q:'บางขุนนนท์ MRT',label:'บางขุนนนท์ (BL04)'},
  {q:'ไฟฉาย MRT',label:'ไฟฉาย (BL03)'},
  {q:'จรัญฯ 13 MRT',label:'จรัญฯ 13 (BL02)'},
  {sec:'🟣 MRT สายสีม่วง · 16 สถานี (เตาปูน–คลองบางไผ่)', color:'#7b3fa3'},
  {q:'คลองบางไผ่ MRT สีม่วง',label:'คลองบางไผ่ (PP01)'},
  {q:'ตลาดบางใหญ่ MRT',label:'ตลาดบางใหญ่ (PP02)'},
  {q:'สามแยกบางใหญ่ MRT',label:'สามแยกบางใหญ่ (PP03)'},
  {q:'บางพลู MRT',label:'บางพลู (PP04)'},
  {q:'บางรักใหญ่ MRT',label:'บางรักใหญ่ (PP05)'},
  {q:'บางรักน้อยท่าอิฐ MRT',label:'บางรักน้อยท่าอิฐ (PP06)'},
  {q:'ไทรม้า MRT',label:'ไทรม้า (PP07)'},
  {q:'สะพานพระนั่งเกล้า MRT',label:'สะพานพระนั่งเกล้า (PP08)'},
  {q:'แยกนนทบุรี 1 MRT',label:'แยกนนทบุรี 1 (PP09)'},
  {q:'บางกระสอ MRT',label:'บางกระสอ (PP10)'},
  {q:'ศูนย์ราชการนนทบุรี MRT',label:'ศูนย์ราชการนนทบุรี (PP11)'},
  {q:'กระทรวงสาธารณสุข MRT',label:'กระทรวงสาธารณสุข (PP12)'},
  {q:'แยกติวานนท์ MRT',label:'แยกติวานนท์ (PP13)'},
  {q:'วงศ์สว่าง MRT',label:'วงศ์สว่าง (PP14)'},
  {q:'บางซ่อน MRT',label:'บางซ่อน (PP15)'},
  {q:'เตาปูน MRT สีม่วง',label:'เตาปูน (PP16)'},
  {sec:'🩷 MRT สายสีชมพู · 30 สถานี (ศูนย์ราชการนนทบุรี–มีนบุรี)', color:'#d63384'},
  {q:'ศูนย์ราชการนนทบุรี MRT สีชมพู',label:'ศูนย์ราชการนนทบุรี (PK01)'},
  {q:'แคราย MRT สีชมพู',label:'แคราย (PK02)'},
  {q:'สนามบินน้ำ MRT',label:'สนามบินน้ำ (PK03)'},
  {q:'สามัคคี MRT',label:'สามัคคี (PK04)'},
  {q:'กรมชลประทาน MRT',label:'กรมชลประทาน (PK05)'},
  {q:'แยกปากเกร็ด MRT',label:'แยกปากเกร็ด (PK06)'},
  {q:'เลี่ยงเมืองปากเกร็ด MRT',label:'เลี่ยงเมืองปากเกร็ด (PK07)'},
  {q:'แจ้งวัฒนะ-ปากเกร็ด 28 MRT',label:'แจ้งวัฒนะ-ปากเกร็ด 28 (PK08)'},
  {q:'ศรีรัช MRT',label:'ศรีรัช (PK09)'},
  {q:'เมืองทองธานี MRT',label:'เมืองทองธานี (PK10)'},
  {q:'แจ้งวัฒนะ 14 MRT',label:'แจ้งวัฒนะ 14 (PK11)'},
  {q:'ศูนย์ราชการเฉลิมพระเกียรติ MRT',label:'ศูนย์ราชการเฉลิมพระเกียรติ (PK12)'},
  {q:'โทรคมนาคมแห่งชาติ MRT',label:'โทรคมนาคมแห่งชาติ (PK13)'},
  {q:'หลักสี่ MRT สีชมพู',label:'หลักสี่ (PK14)'},
  {q:'ราชภัฏพระนคร MRT',label:'ราชภัฏพระนคร (PK15)'},
  {q:'วัดพระศรีมหาธาตุ MRT สีชมพู',label:'วัดพระศรีมหาธาตุ (PK16)'},
  {q:'รามอินทรา 3 MRT',label:'รามอินทรา 3 (PK17)'},
  {q:'ลาดปลาเค้า MRT',label:'ลาดปลาเค้า (PK18)'},
  {q:'รามอินทรา กม. 4 MRT',label:'รามอินทรา กม. 4 (PK19)'},
  {q:'มัยลาภ MRT',label:'มัยลาภ (PK20)'},
  {q:'วัชรพล MRT',label:'วัชรพล (PK21)'},
  {q:'รามอินทรา กม. 6 MRT',label:'รามอินทรา กม. 6 (PK22)'},
  {q:'คู้บอน MRT',label:'คู้บอน (PK23)'},
  {q:'รามอินทรา กม. 9 MRT',label:'รามอินทรา กม. 9 (PK24)'},
  {q:'วงแหวนรามอินทรา MRT',label:'วงแหวนรามอินทรา (PK25)'},
  {q:'นพรัตน์ MRT',label:'นพรัตน์ (PK26)'},
  {q:'บางชัน MRT',label:'บางชัน (PK27)'},
  {q:'เศรษฐบุตรบำเพ็ญ MRT',label:'เศรษฐบุตรบำเพ็ญ (PK28)'},
  {q:'ตลาดมีนบุรี MRT',label:'ตลาดมีนบุรี (PK29)'},
  {q:'มีนบุรี MRT สีชมพู',label:'มีนบุรี (PK30)'},
  {sec:'🟡 MRT สายสีเหลือง · 23 สถานี (ลาดพร้าว–สำโรง)', color:'#c8960a'},
  {q:'ลาดพร้าว MRT สีเหลือง',label:'ลาดพร้าว (YL01)'},
  {q:'ภาวนา MRT สีเหลือง',label:'ภาวนา (YL02)'},
  {q:'โชคชัย 4 MRT',label:'โชคชัย 4 (YL03)'},
  {q:'ลาดพร้าว 71 MRT',label:'ลาดพร้าว 71 (YL04)'},
  {q:'ลาดพร้าว 83 MRT',label:'ลาดพร้าว 83 (YL05)'},
  {q:'มหาดไทย MRT สีเหลือง',label:'มหาดไทย (YL06)'},
  {q:'ลาดพร้าว 101 MRT',label:'ลาดพร้าว 101 (YL07)'},
  {q:'บางกะปิ MRT สีเหลือง',label:'บางกะปิ (YL08)'},
  {q:'แยกลำสาลี MRT',label:'แยกลำสาลี (YL09)'},
  {q:'ศรีกรีฑา MRT',label:'ศรีกรีฑา (YL10)'},
  {q:'หัวหมาก MRT สีเหลือง',label:'หัวหมาก (YL11)'},
  {q:'กลันตัน MRT',label:'กลันตัน (YL12)'},
  {q:'ศรีนุช MRT',label:'ศรีนุช (YL13)'},
  {q:'ศรีนครินทร์ 38 MRT',label:'ศรีนครินทร์ 38 (YL14)'},
  {q:'สวนหลวง ร.9 MRT',label:'สวนหลวง ร.9 (YL15)'},
  {q:'ศรีอุดม MRT',label:'ศรีอุดม (YL16)'},
  {q:'ศรีเอี่ยม MRT',label:'ศรีเอี่ยม (YL17)'},
  {q:'ศรีลาซาล MRT',label:'ศรีลาซาล (YL18)'},
  {q:'ศรีแบริ่ง MRT',label:'ศรีแบริ่ง (YL19)'},
  {q:'ศรีด่าน MRT',label:'ศรีด่าน (YL20)'},
  {q:'ศรีเทพา MRT',label:'ศรีเทพา (YL21)'},
  {q:'ทิพวัล MRT',label:'ทิพวัล (YL22)'},
  {q:'สำโรง MRT สีเหลือง',label:'สำโรง (YL23)'},
];

function _renderTransitItems(items, defaultIcon) {
  return items.map(function(item) {
    if (item.sec) {
      return '<div class="qs-dd-sec" style="color:' + item.color + '">' + item.sec + '</div>';
    }
    var icon = item.icon || defaultIcon;
    var q = item.q.replace(/'/g, "\\'");
    return '<button class="qs-opt" onclick="quickSearch(\'' + q + '\');closeQsDDs()">' + icon + ' ' + item.label + '</button>';
  }).join('\n');
}

function _renderTransitOptions(items, defaultIcon) {
  var html = '';
  var currentGroup = null;
  items.forEach(function(item) {
    if (item.sec) {
      if (currentGroup) html += '</optgroup>';
      html += '<optgroup label="' + item.sec.replace(/"/g,'&quot;') + '">';
      currentGroup = item.sec;
    } else {
      var icon = item.icon || defaultIcon;
      html += '<option value="' + item.q.replace(/"/g,'&quot;') + '">' + icon + ' ' + item.label + '</option>';
    }
  });
  if (currentGroup) html += '</optgroup>';
  return html;
}

function renderTransitButtons() {
  // Hidden panels (for adv-filter sync backward compatibility)
  var btsPan = document.getElementById('qs-bts-dd');
  if (btsPan) btsPan.innerHTML = _renderTransitItems(TRANSIT_BTS, '🚉');
  var mrtPan = document.getElementById('qs-mrt-dd');
  if (mrtPan) mrtPan.innerHTML = _renderTransitItems(TRANSIT_MRT, '🚇');

  // Native select elements
  var btsSel = document.getElementById('qs-bts-select');
  if (btsSel) btsSel.innerHTML = '<option value="">🚈 BTS</option>' + _renderTransitOptions(TRANSIT_BTS, '🚉');
  var mrtSel = document.getElementById('qs-mrt-select');
  if (mrtSel) mrtSel.innerHTML = '<option value="">🚇 MRT</option>' + _renderTransitOptions(TRANSIT_MRT, '🚇');
}

document.addEventListener('DOMContentLoaded', renderTransitButtons);

// ════════════════════════════════════════
// ADMIN SYSTEM
// ════════════════════════════════════════

// Admin config — อีเมลที่มีสิทธิ์ admin (เปลี่ยนได้)
const ADMIN_EMAILS = [
  'contact.matchdoor@gmail.com'
  // เพิ่มอีเมล admin ที่นี่
];

let _adminUser = null;
let _adminDevMode = false;
let _adminCurrentPanel = 'dashboard';

function openAdminLogin(){
  // ถ้า login อยู่แล้วและเป็น admin ให้เข้าได้เลย
  if(user && ADMIN_EMAILS.includes(user.email)){
    _adminUser = user;
    _openAdminPanel();
    return;
  }
  // ถ้า user login แต่ไม่ใช่ admin ให้แสดง modal (ไม่ pre-fill)
  if(user){ document.getElementById('admin-email').value = user.email || ''; }
  _openModal('admin-login-modal');
  setTimeout(()=>{ document.getElementById('admin-email').focus(); }, 300);
}

async function adminLogin(){
  const emailEl = document.getElementById('admin-email');
  const pwEl = document.getElementById('admin-pw');
  const errEl = document.getElementById('admin-login-err');
  const btn = document.querySelector('.admin-login-submit');
  const email = emailEl.value.trim();
  const pw = pwEl.value;
  errEl.style.display='none';
  if(!email || !pw){ _adminShowErr('กรุณากรอกอีเมลและรหัสผ่าน'); return; }
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>&nbsp; กำลังตรวจสอบ...';
  btn.disabled=true;
  try{
    // ใช้ Supabase auth — เชื่อมกับระบบ login เดียวกัน
    if(!sb && !initSB()){ _adminShowErr('Supabase ยังไม่พร้อม — ตรวจสอบ config'); return; }
    const {data, error} = await sb.auth.signInWithPassword({email, password:pw});
    if(error){ _adminShowErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); return; }
    const u = data.user;
    if(!ADMIN_EMAILS.includes(u.email)){
      await sb.auth.signOut();
      _adminShowErr('บัญชีนี้ไม่มีสิทธิ์ Admin');
      return;
    }
    _adminUser = u; _adminDevMode = false;
    _closeModal('admin-login-modal');
    _openAdminPanel();
    toast('เข้าสู่ระบบ Admin สำเร็จ ✅');
  } catch(e){
    _adminShowErr('เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    btn.innerHTML='<i class="fas fa-sign-in-alt"></i>&nbsp; เข้าสู่ระบบ Admin';
    btn.disabled=false;
  }
}

function adminDevBypass(){
  _adminDevMode = true;
  _adminUser = { email:'dev@matchdoor.co', user_metadata:{ display_name:'DEV Preview' } };
  _closeModal('admin-login-modal');
  _openAdminPanel();
}

function _adminShowErr(msg){
  const el = document.getElementById('admin-login-err');
  el.textContent = msg;
  el.style.display='block';
}

function _openAdminPanel(){
  // อัปเดต sidebar user info
  const u = _adminUser;
  const init = (u.email||'A')[0].toUpperCase();
  const name = u.user_metadata?.display_name || u.email?.split('@')[0] || 'Admin';
  document.getElementById('admin-user-av').textContent = init;
  document.getElementById('admin-user-name').textContent = name;
  showPage('admin');
  adminNav('dashboard', document.querySelector('.admin-nav-item'));
}

async function adminLogout(){
  _adminUser = null; _adminDevMode = false;
  if(sb && !_adminDevMode){
    try{ await sb.auth.signOut(); } catch(e){}
  }
  showPage('home');
  toast('ออกจากระบบ Admin แล้ว');
}

function adminNav(panel, el){
  _adminCurrentPanel = panel;
  document.querySelectorAll('.admin-nav-item').forEach(i=>i.classList.remove('active'));
  if(el) el.classList.add('active');
  const icons = {dashboard:'fas fa-tachometer-alt',properties:'fas fa-building',requests:'fas fa-file-alt',agents:'fas fa-users',portfolio:'fas fa-trophy',analytics:'fas fa-chart-bar',notifications:'fas fa-bell','token-orders':'fas fa-coins','user-listings':'fas fa-home'};
  const titles = {dashboard:'Dashboard',properties:'ประกาศทรัพย์ — จัดการ & อนุมัติ',requests:'Buy Requests — ติดตามลูกค้า',agents:'Agents & Portfolio',portfolio:'ผลงานปิดดีล',analytics:'Analytics Dashboard',notifications:'Broadcast Notifications','token-orders':'Token Orders — ยืนยันการซื้อ','user-listings':'User Listings — อนุมัติประกาศ'};
  document.getElementById('admin-topbar-icon').className = (icons[panel]||'fas fa-circle') + ' ';
  document.getElementById('admin-topbar-title').textContent = titles[panel]||panel;
  document.getElementById('admin-topbar-meta').textContent = _adminDevMode ? '⚗️ DEV MODE' : '';
  _renderAdminPanel(panel);
}

async function _renderAdminPanel(panel){
  const el = document.getElementById('admin-content');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,.3)"><i class="fas fa-spinner fa-spin" style="font-size:24px"></i></div>';
  const devBanner = _adminDevMode ? `<div class="admin-dev-banner"><i class="fas fa-flask"></i> <strong>DEV MODE</strong> — ข้อมูลที่แสดงเป็น mock / ดึงจาก local state ไม่ได้เขียนลง Supabase จริง</div>` : '';

  // ดึงข้อมูลจาก Supabase (ถ้าไม่ใช่ dev mode และ sb พร้อม)
  let allProps = (typeof props !== 'undefined' && props.length) ? props : (typeof MOCK!=='undefined'?MOCK.props:[]);
  let allAgents = (typeof agents!=='undefined'&&agents.length)?agents:(typeof MOCK!=='undefined'?MOCK.agents:[]);
  let allPort = (typeof port!=='undefined'&&port.length)?port:(typeof MOCK!=='undefined'?MOCK.port:[]);

  if(!_adminDevMode && sb){
    try{
      // Admin ดึงทุก properties รวม pending/rejected (ไม่กรอง status)
      // ใช้ range(0,999) ป้องกัน PostgREST default limit ตัด
      const [{data:pData},{data:aData},{data:ptData}] = await Promise.all([
        sb.from('properties').select('*').order('created_at',{ascending:false}).range(0,999),
        sb.from('agents').select('*').order('created_at',{ascending:false}).range(0,99),
        sb.from('portfolio').select('*').order('created_at',{ascending:false}).range(0,99)
      ]);
      if(pData && pData.length)  allProps   = pData.map(mapProp);
      if(aData && aData.length)  allAgents  = aData.map(mapAgent);
      if(ptData && ptData.length) allPort   = ptData.map(mapPort);
    }catch(e){ console.warn('Admin data load error:',e.message); }
  }

  // ดึง buy_requests จาก Supabase
  let buyRequests = [];
  if(!_adminDevMode && sb){
    try{
      const {data} = await sb.from('buy_requests').select('*').order('created_at',{ascending:false}).range(0,499);
      if(data) buyRequests = data;
    }catch(e){}
  }
  if(!buyRequests.length) buyRequests = [
    {id:1,name:'คุณสมชาย',email:'somchai@example.com',phone:'081-xxx-xxxx',property_title:'คอนโด Ashton Asoke',status:'new',created_at:new Date().toISOString()},
    {id:2,name:'คุณสุดา',email:'suda@example.com',phone:'089-xxx-xxxx',property_title:'บ้านเดี่ยว ลาดพร้าว',status:'contacted',created_at:new Date(Date.now()-86400000).toISOString()},
  ];

  if(panel==='dashboard'){
    // [v13] ดึง v_dashboard_summary จาก Supabase สำหรับตัวเลขที่แม่นยำ
    let dashSummary = null;
    if(!_adminDevMode && sb){
      try {
        const { data } = await sb.from('v_dashboard_summary').select('*').single();
        if(data) dashSummary = data;
      } catch(e){ /* fallback to local count */ }
    }

    const pending   = dashSummary?.pending_properties ?? allProps.filter(p=>p.status==='pending'||!p.status).length;
    const newReqs   = dashSummary?.new_requests       ?? buyRequests.filter(r=>r.status==='new'||r.status==='ใหม่').length;
    const agentApps = dashSummary?.new_agent_apps     ?? 0;
    const jobApps   = dashSummary?.new_job_apps       ?? 0;
    const activeNotifs = dashSummary?.active_notifications ?? 0;
    const totalUsers   = dashSummary?.total_users     ?? 0;

    document.getElementById('admin-pending-badge').textContent = pending||0;
    const totalVal = dashSummary
      ? (dashSummary.for_sale||0) * 5000000   // ประมาณ — ใช้ allProps ถ้าได้
      : allProps.reduce((s,p)=>s+(p.price||0),0);
    const realTotalVal = allProps.length ? allProps.reduce((s,p)=>s+(p.price||0),0) : totalVal;
    const fmtVal = realTotalVal>=1e9?(realTotalVal/1e9).toFixed(1)+'B':(realTotalVal/1e6).toFixed(0)+'M';
    el.innerHTML = devBanner + `
    <div class="admin-stats-grid">
      <div class="admin-stat-card"><div class="admin-stat-icon" style="background:rgba(200,146,42,.15);color:#c8922a"><i class="fas fa-building"></i></div><div class="admin-stat-num">${dashSummary?.total_properties??allProps.length}</div><div class="admin-stat-label">ประกาศทั้งหมด</div><div class="admin-stat-change ${pending>0?'dn':'up'}"><i class="fas fa-${pending>0?'clock':'check'}"></i> ${pending} รอการอนุมัติ</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon" style="background:rgba(74,144,226,.15);color:#4a90e2"><i class="fas fa-file-alt"></i></div><div class="admin-stat-num">${buyRequests.length}</div><div class="admin-stat-label">Buy Requests</div><div class="admin-stat-change ${newReqs>0?'dn':'up'}"><i class="fas fa-circle" style="font-size:7px"></i> ${newReqs} ใหม่</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon" style="background:rgba(46,204,113,.15);color:#2ecc71"><i class="fas fa-users"></i></div><div class="admin-stat-num">${dashSummary?.total_agents??allAgents.length}</div><div class="admin-stat-label">Agents</div><div class="admin-stat-change up"><i class="fas fa-check"></i> Active ทั้งหมด</div></div>
      <div class="admin-stat-card"><div class="admin-stat-icon" style="background:rgba(231,76,60,.15);color:#e74c3c"><i class="fas fa-baht-sign"></i></div><div class="admin-stat-num">฿${fmtVal}</div><div class="admin-stat-label">มูลค่ารวม</div><div class="admin-stat-change up"><i class="fas fa-trophy"></i> ${dashSummary?.total_deals??allPort.length} ปิดดีล</div></div>
    </div>
    <!-- [v13] แถว badges เพิ่มเติม — Users, Applications, Notifications -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
      <div class="admin-stat-card" style="padding:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="admin-stat-icon" style="background:rgba(155,89,182,.15);color:#9b59b6;margin-bottom:0;width:34px;height:34px;font-size:14px"><i class="fas fa-user-circle"></i></div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#fff">${totalUsers}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4)">Users ทั้งหมด</div>
          </div>
        </div>
      </div>
      <div class="admin-stat-card" style="padding:14px;cursor:pointer" onclick="adminNav('applications',null)" title="ดูใบสมัคร">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="admin-stat-icon" style="background:rgba(52,152,219,.15);color:#3498db;margin-bottom:0;width:34px;height:34px;font-size:14px"><i class="fas fa-user-tie"></i></div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#fff">${agentApps + jobApps}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4)">ใบสมัครใหม่ <span style="color:#c8922a">(${agentApps} ตัวแทน / ${jobApps} งาน)</span></div>
          </div>
        </div>
      </div>
      <div class="admin-stat-card" style="padding:14px;cursor:pointer" onclick="adminNav('notifications',null)" title="จัดการ Notifications">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="admin-stat-icon" style="background:rgba(241,196,15,.15);color:#f1c40f;margin-bottom:0;width:34px;height:34px;font-size:14px"><i class="fas fa-bell"></i></div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#fff">${activeNotifs}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4)">Notifications active</div>
          </div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="admin-section">
        <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-clock"></i> ประกาศล่าสุด</div><button class="admin-btn admin-btn-ghost" style="font-size:11px;padding:5px 10px" onclick="adminNav('properties',null)">ดูทั้งหมด</button></div>
        <table class="admin-table"><thead><tr><th>ชื่อทรัพย์</th><th>ราคา</th><th>สถานะ</th></tr></thead><tbody>
        ${allProps.slice(0,5).map(p=>`<tr><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.title||''}">${p.title||'-'}</td><td style="white-space:nowrap">${p.price?'฿'+(p.price/1e6).toFixed(1)+'M':'-'}</td><td>${_adminStatusBadge(p.status)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="admin-section">
        <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-file-alt"></i> Buy Requests ล่าสุด</div><button class="admin-btn admin-btn-ghost" style="font-size:11px;padding:5px 10px" onclick="adminNav('requests',null)">ดูทั้งหมด</button></div>
        <table class="admin-table"><thead><tr><th>ชื่อ</th><th>ทรัพย์ที่สนใจ</th><th>สถานะ</th></tr></thead><tbody>
        ${buyRequests.slice(0,5).map(r=>`<tr><td>${r.name||r.full_name||'-'}</td><td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.property_title||r.message||'-'}</td><td>${_adminReqBadge(r.status)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
  }

  else if(panel==='properties'){
    document.getElementById('admin-pending-badge').textContent = allProps.filter(p=>p.status==='pending'||!p.status).length||0;
    el.innerHTML = devBanner + `
    <div class="admin-section">
      <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-building"></i> ประกาศทรัพย์ทั้งหมด (${allProps.length})</div><div class="admin-topbar-actions"><button class="admin-btn admin-btn-primary" onclick="adminAddProp()"><i class="fas fa-plus"></i> เพิ่มทรัพย์</button></div></div>
      <div class="admin-search-bar">
        <input class="admin-search-input" id="admin-prop-search" placeholder="🔍 ค้นหาชื่อทรัพย์..." oninput="_adminFilterProps()">
        <select class="admin-filter-select" id="admin-prop-filter" onchange="_adminFilterProps()">
          <option value="">ทุกสถานะ</option><option value="pending">รออนุมัติ</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ปฏิเสธแล้ว</option>
        </select>
        <select class="admin-filter-select" id="admin-prop-type" onchange="_adminFilterProps()">
          <option value="">ทุกประเภท</option><option value="คอนโด">คอนโด</option><option value="บ้านเดี่ยว">บ้านเดี่ยว</option><option value="ทาวน์โฮม">ทาวน์โฮม</option><option value="ที่ดิน">ที่ดิน</option>
        </select>
      </div>
      <div id="admin-props-table">
        ${_adminPropsTable(allProps)}
      </div>
    </div>`;
    window._adminAllProps = allProps;
  }

  else if(panel==='requests'){
    el.innerHTML = devBanner + `
    <div class="admin-section">
      <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-file-alt"></i> Buy Requests ทั้งหมด (${buyRequests.length})</div></div>
      <div class="admin-search-bar">
        <input class="admin-search-input" placeholder="🔍 ค้นหาชื่อ / อีเมล...">
        <select class="admin-filter-select"><option value="">ทุกสถานะ</option><option>new</option><option>contacted</option><option>closed</option></select>
      </div>
      <table class="admin-table"><thead><tr><th>#</th><th>ชื่อ</th><th>อีเมล</th><th>เบอร์</th><th>ทรัพย์ที่สนใจ</th><th>วันที่</th><th>สถานะ</th><th>Action</th></tr></thead>
      <tbody>${buyRequests.map((r,i)=>`<tr>
        <td style="color:rgba(255,255,255,.3);font-size:11px">${i+1}</td>
        <td><strong style="color:#fff">${r.name||r.full_name||'-'}</strong></td>
        <td style="font-size:12px;color:rgba(255,255,255,.5)">${r.email||'-'}</td>
        <td style="font-size:12px">${r.phone||'-'}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.property_title||r.message||'-'}</td>
        <td style="font-size:11px;color:rgba(255,255,255,.4)">${r.created_at?new Date(r.created_at).toLocaleDateString('th-TH'):'-'}</td>
        <td>${_adminReqBadge(r.status)}</td>
        <td><div class="admin-action-btns">
          <button class="admin-action-btn edit" onclick="adminContactRequest(${r.id},'${r.phone||''}','${r.email||r.name||''}')"><i class="fas fa-phone"></i> ติดต่อ</button>
          <button class="admin-action-btn approve" onclick="adminUpdateRequest(${r.id},'contacted')">ติดต่อแล้ว</button>
          <button class="admin-action-btn" style="background:rgba(100,100,100,.1);color:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer" onclick="adminUpdateRequest(${r.id},'closed')">ปิด</button>
        </div></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
  }

  else if(panel==='agents'){
    el.innerHTML = devBanner + `
    <div class="admin-section">
      <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-users"></i> Agents (${allAgents.length})</div><button class="admin-btn admin-btn-primary" onclick="adminAddAgent()"><i class="fas fa-plus"></i> เพิ่ม Agent</button></div>
      <table class="admin-table"><thead><tr><th>ชื่อ</th><th>ตำแหน่ง</th><th>ทรัพย์ที่ดูแล</th><th>ยอดปิดดีล</th><th>Action</th></tr></thead>
      <tbody>${allAgents.map(a=>`<tr>
        <td><div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#c8922a,#e8b84b);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#0d1b2e;flex-shrink:0">${(a.name||'A')[0]}</div><strong style="color:#fff">${a.name||'-'}</strong></div></td>
        <td style="color:rgba(255,255,255,.5);font-size:12px">${a.role||a.title||'Agent'}</td>
        <td><span class="admin-badge admin-badge-active">${(a.propIds||[]).length} ทรัพย์</span></td>
        <td style="color:#2ecc71;font-weight:700">${a.deals||a.closed||0} ดีล</td>
        <td><div class="admin-action-btns"><button class="admin-action-btn edit" onclick="adminEditAgent(${a.id})"><i class="fas fa-edit"></i> แก้ไข</button><button class="admin-action-btn reject" onclick="adminDeleteAgent(${a.id},'${(a.name||'').replace(/'/g,'')}')" style="background:rgba(231,76,60,.15);color:#e74c3c;border-color:rgba(231,76,60,.3)"><i class="fas fa-trash"></i> ลบ</button></div></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
  }

  else if(panel==='portfolio'){
    el.innerHTML = devBanner + `
    <div class="admin-section">
      <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-trophy"></i> Portfolio ปิดดีล (${allPort.length})</div><button class="admin-btn admin-btn-primary" onclick="adminAddPortfolio()"><i class="fas fa-plus"></i> เพิ่มผลงาน</button></div>
      <table class="admin-table"><thead><tr><th>ชื่อทรัพย์</th><th>ราคาปิดดีล</th><th>Agent</th><th>วันที่ปิด</th><th>Action</th></tr></thead>
      <tbody>${(allPort.length?allPort:[{title:'ตัวอย่าง: Ashton Asoke',price:8500000,agent:'คุณ A',date:'2025-01'}]).map(p=>`<tr>
        <td><strong style="color:#fff">${sanitize(p.title||'-')}</strong></td>
        <td style="color:#c8922a;font-weight:700">${p.price?'฿'+(p.price/1e6).toFixed(1)+'M':'-'}</td>
        <td style="color:rgba(255,255,255,.6)">${p.agent||'-'}</td>
        <td style="font-size:12px;color:rgba(255,255,255,.4)">${p.date||p.closed_at||'-'}</td>
        <td><div class="admin-action-btns"><button class="admin-action-btn edit" onclick="adminEditPortfolio(${JSON.stringify(p).replace(/"/g,'&quot;')})"><i class="fas fa-edit"></i> แก้ไข</button><button class="admin-action-btn reject" onclick="adminDeletePortfolio(${p.id||0},'${(p.title||'').replace(/'/g,'')}')" style="background:rgba(231,76,60,.15);color:#e74c3c;border-color:rgba(231,76,60,.3)"><i class="fas fa-trash"></i> ลบ</button></div></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
  }

  else if(panel==='analytics'){
    const byType = {};
    allProps.forEach(p=>{ byType[p.type||'อื่นๆ']=(byType[p.type||'อื่นๆ']||0)+1; });
    const maxV = Math.max(...Object.values(byType),1);
    el.innerHTML = devBanner + `
    <div class="admin-analytics-grid">
      <div class="admin-section">
        <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-chart-bar"></i> ประกาศตามประเภท</div></div>
        <div style="padding:20px">
          ${Object.entries(byType).map(([k,v])=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;color:rgba(255,255,255,.7)">${k}</span><span style="font-size:13px;font-weight:700;color:#c8922a">${v}</span></div><div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px"><div style="height:100%;width:${(v/maxV*100).toFixed(0)}%;background:linear-gradient(90deg,#c8922a,#e8b84b);border-radius:3px;transition:width .5s"></div></div></div>`).join('')}
        </div>
      </div>
      <div class="admin-section">
        <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-chart-line"></i> สรุปภาพรวม</div></div>
        <div style="padding:20px">
          ${[['ประกาศทั้งหมด',allProps.length,'#c8922a'],['Agents ที่ active',allAgents.length,'#4a90e2'],['ดีลที่ปิดแล้ว',allPort.length,'#2ecc71'],['Buy Requests ใหม่',buyRequests.filter(r=>r.status==='new').length,'#e74c3c']].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:13px;color:rgba(255,255,255,.6)">${l}</span><span style="font-size:20px;font-weight:800;color:${c}">${v}</span></div>`).join('')}
        </div>
      </div>
      <div class="admin-section" style="grid-column:1/-1">
        <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-map-marker-alt"></i> ประกาศตามจังหวัด</div></div>
        <div style="padding:20px;display:flex;flex-wrap:wrap;gap:10px">
          ${Object.entries(allProps.reduce((a,p)=>{a[p.province||p.location||'อื่นๆ']=(a[p.province||p.location||'อื่นๆ']||0)+1;return a},{})
            .sort((a,b)=>b[1]-a[1])).slice(0,12).map(([k,v])=>`<div style="padding:8px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:12px"><span style="color:rgba(255,255,255,.5)">${k}</span><strong style="color:#c8922a;margin-left:8px">${v}</strong></div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  else if(panel==='token-orders'){
    await _renderAdminTokenOrders(el, devBanner);
  }
  else if(panel==='user-listings'){
    await _renderAdminUserListings(el, devBanner);
  }
    else if(panel==='notifications'){
    el.innerHTML = devBanner + `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
      <!-- ฟอร์มส่ง Notification -->
      <div class="admin-section" style="max-width:100%">
        <div class="admin-section-head"><div class="admin-section-title"><i class="fas fa-paper-plane"></i> ส่ง Broadcast Notification</div></div>
        <div class="admin-notification-form">
          <label style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px;display:block">หัวข้อ *</label>
          <input class="admin-notif-input" id="notif-title" placeholder="เช่น: อสังหาฯ ใหม่! คอนโดใกล้ BTS อโศก">
          <label style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px;display:block">ข้อความ *</label>
          <textarea class="admin-notif-textarea" id="notif-body" placeholder="รายละเอียด notification ที่ต้องการส่งให้ users ทั้งหมด..."></textarea>
          <label style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px;display:block">ประเภท</label>
          <select class="admin-filter-select" id="notif-type" style="width:100%;padding:10px;margin-bottom:10px;border-radius:8px">
            <option value="info">📢 ทั่วไป (info)</option>
            <option value="promo">🎉 โปรโมชัน (promo)</option>
            <option value="success">✅ ข่าวดี (success)</option>
            <option value="warning">⚠️ แจ้งเตือน (warning)</option>
            <option value="urgent">🚨 เร่งด่วน (urgent)</option>
          </select>
          <label style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px;display:block">ส่งถึง</label>
          <select class="admin-filter-select" id="notif-target" style="width:100%;padding:10px;margin-bottom:10px;border-radius:8px">
            <option value="all">ผู้ใช้ทั้งหมด (รวม guest)</option>
            <option value="logged_in">เฉพาะผู้ที่ Login แล้ว</option>
          </select>
          <label style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:6px;display:block">Link เมื่อกด (ไม่บังคับ)</label>
          <input class="admin-notif-input" id="notif-action-url" placeholder="เช่น /listings หรือ /careers">
          <button class="admin-btn admin-btn-primary" style="width:100%;padding:12px;font-size:14px;margin-top:6px" onclick="adminSendNotification()">
            <i class="fas fa-paper-plane"></i> ส่ง Notification
          </button>
          <p style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.25);text-align:center">
            <i class="fas fa-database"></i> บันทึกลง <code style="color:rgba(200,146,42,.7)">site_notifications</code> + Supabase Realtime
          </p>
        </div>
      </div>
      <!-- ประวัติ Notifications ล่าสุด -->
      <div class="admin-section" style="max-width:100%">
        <div class="admin-section-head">
          <div class="admin-section-title"><i class="fas fa-history"></i> ประวัติ Notifications</div>
          <button class="admin-btn admin-btn-ghost" style="font-size:11px;padding:5px 10px" onclick="_renderNotifHistory()"><i class="fas fa-sync"></i> Refresh</button>
        </div>
        <div id="admin-notif-history">
          <div style="text-align:center;padding:30px;color:rgba(255,255,255,.3)"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด...</div>
        </div>
      </div>
    </div>`;
    // โหลดประวัติทันทีหลัง render
    _renderNotifHistory();
  }
}

function _adminPropsTable(data){
  if(!data||!data.length) return '<div class="admin-empty"><i class="fas fa-inbox"></i><p>ไม่มีข้อมูล</p></div>';
  return `<table class="admin-table"><thead><tr><th>ชื่อทรัพย์</th><th>ประเภท</th><th>ราคา</th><th>จังหวัด</th><th>สถานะ</th><th>Action</th></tr></thead>
  <tbody>${data.map(p=>`<tr>
    <td style="max-width:180px"><strong style="color:#fff;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sanitize(p.title||'-')}</strong><span style="font-size:11px;color:rgba(255,255,255,.3)">#${p.id||'-'}</span></td>
    <td><span class="admin-badge admin-badge-active" style="font-size:10px">${p.type||'-'}</span></td>
    <td style="color:#c8922a;font-weight:700;white-space:nowrap">${p.price?'฿'+(p.price>=1e6?(p.price/1e6).toFixed(1)+'M':p.price.toLocaleString()):'-'}</td>
    <td style="font-size:12px;color:rgba(255,255,255,.5)">${p.province||'-'}</td>
    <td>${_adminStatusBadge(p.status)}</td>
    <td><div class="admin-action-btns">
      <button class="admin-action-btn approve" onclick="adminApprove(${p.id})"><i class="fas fa-check"></i> อนุมัติ</button>
      <button class="admin-action-btn reject" onclick="adminReject(${p.id})"><i class="fas fa-times"></i> ปฏิเสธ</button>
      <button class="admin-action-btn edit" onclick="adminEditProp(${p.id})"><i class="fas fa-edit"></i></button>
      <button class="admin-action-btn" onclick="adminDeleteProp(${p.id},'${p.title?p.title.replace(/'/g,'').substring(0,20):''}')" style="background:rgba(231,76,60,.15);color:#e74c3c;border:1px solid rgba(231,76,60,.3);border-radius:6px;padding:5px 8px;font-size:11px;cursor:pointer"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('')}</tbody></table>`;
}

function _adminStatusBadge(status){
  if(!status||status==='pending') return '<span class="admin-badge admin-badge-pending"><i class="fas fa-clock"></i> รอ</span>';
  if(status==='approved'||status==='active') return '<span class="admin-badge admin-badge-approved"><i class="fas fa-check"></i> อนุมัติ</span>';
  if(status==='rejected') return '<span class="admin-badge admin-badge-rejected"><i class="fas fa-times"></i> ปฏิเสธ</span>';
  return `<span class="admin-badge admin-badge-active">${status}</span>`;
}
function _adminReqBadge(status){
  if(!status||status==='new') return '<span class="admin-badge admin-badge-pending">ใหม่</span>';
  if(status==='contacted') return '<span class="admin-badge admin-badge-active">ติดต่อแล้ว</span>';
  if(status==='closed') return '<span class="admin-badge admin-badge-approved">ปิด</span>';
  return `<span class="admin-badge admin-badge-active">${status}</span>`;
}

function _adminFilterProps(){
  const kw=(document.getElementById('admin-prop-search').value||'').toLowerCase();
  const statusF=document.getElementById('admin-prop-filter').value;
  const typeF=document.getElementById('admin-prop-type').value;
  const data=(window._adminAllProps||[]).filter(p=>{
    if(kw && !(p.title||'').toLowerCase().includes(kw) && !(p.location||'').toLowerCase().includes(kw)) return false;
    if(statusF && (p.status||'pending')!==statusF) return false;
    if(typeF && p.type!==typeF) return false;
    return true;
  });
  document.getElementById('admin-props-table').innerHTML=_adminPropsTable(data);
}

async function adminApprove(id){
  if(!confirm('อนุมัติทรัพย์ #'+id+'?')) return;
  if(!_adminDevMode && sb){
    try{
      await sb.from('properties').update({status:'approved'}).eq('id',id);
      if(typeof props!=='undefined'){ const p=props.find(x=>String(x.id)===String(id)); if(p) p.status='approved'; }
      toast('อนุมัติแล้ว ✅');
    }
    catch(e){ toast('Error: '+e.message); return; }
  } else { toast('DEV: อนุมัติ #'+id+' (ไม่ได้เขียนจริง)'); }
  // อัปเดต local cache
  if(typeof props !== 'undefined'){ const p=props.find(x=>String(x.id)===String(id)); if(p) p.status='approved'; }
  _renderAdminPanel('properties');
}
async function adminReject(id){
  if(!confirm('ปฏิเสธทรัพย์ #'+id+'?')) return;
  if(!_adminDevMode && sb){
    try{ await sb.from('properties').update({status:'rejected'}).eq('id',id); toast('ปฏิเสธแล้ว'); }
    catch(e){ toast('Error: '+e.message); return; }
  } else { toast('DEV: ปฏิเสธ #'+id+' (ไม่ได้เขียนจริง)'); }
  // อัปเดต local cache
  if(typeof props !== 'undefined'){ const p=props.find(x=>String(x.id)===String(id)); if(p) p.status='rejected'; }
  _renderAdminPanel('properties');
}
function adminEditProp(id){
  // ค้นหา property จาก allProps หรือ MOCK
  const allProps2 = (typeof props!=='undefined'&&props.length)?props:(typeof MOCK!=='undefined'?MOCK.props:[]);
  const p = allProps2.find(x=>String(x.id)===String(id));
  if(!p){ toast('ไม่พบข้อมูลทรัพย์ #'+id); return; }
  // สร้าง Modal สำหรับแก้ไขทรัพย์
  const existing = document.getElementById('admin-edit-prop-modal');
  if(existing) existing.remove();
  const mo = document.createElement('div');
  mo.className='ov'; mo.id='admin-edit-prop-modal';
  mo.style.cssText='display:flex;z-index:10000';
  mo.innerHTML=`<div class="modal" style="max-width:560px;background:#0d1b2e;border:1px solid rgba(255,200,100,.2);color:#fff">
    <div class="mhd" style="background:rgba(27,58,107,.8);border-bottom:1px solid rgba(255,200,100,.1)">
      <h2 style="color:#fff"><i class="fas fa-edit" style="color:#c8922a"></i> แก้ไขทรัพย์ #${id}</h2>
      <span class="mclose" onclick="document.getElementById('admin-edit-prop-modal').remove()">×</span>
    </div>
    <div class="mbody" style="display:grid;gap:10px">
      <label style="font-size:12px;color:rgba(255,255,255,.5)">ชื่อทรัพย์</label>
      <input id="aep-title" class="admin-login-field" value="${(p.title||'').replace(/"/g,'&quot;')}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ราคา (บาท)</label>
        <input id="aep-price" type="number" class="admin-login-field" value="${p.price||0}"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ประเภท</label>
        <select id="aep-tx" class="admin-login-field" style="appearance:auto">
          <option value="BUY" ${p.tx==='BUY'?'selected':''}>ขาย</option>
          <option value="RENT" ${p.tx==='RENT'?'selected':''}>ให้เช่า</option>
        </select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">จังหวัด</label>
        <input id="aep-province" class="admin-login-field" value="${(p.province||'').replace(/"/g,'&quot;')}"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">สถานะ</label>
        <select id="aep-status" class="admin-login-field" style="appearance:auto">
          <option value="pending" ${p.status==='pending'?'selected':''}>รออนุมัติ</option>
          <option value="approved" ${(!p.status||p.status==='approved'||p.status==='active')?'selected':''}>อนุมัติ</option>
          <option value="rejected" ${p.status==='rejected'?'selected':''}>ปฏิเสธ</option>
        </select></div>
      </div>
      <label style="font-size:12px;color:rgba(255,255,255,.5)">ทำเล / ที่อยู่</label>
      <input id="aep-location" class="admin-login-field" value="${(p.location||'').replace(/"/g,'&quot;')}">
      <label style="font-size:12px;color:rgba(255,255,255,.5)">รายละเอียด</label>
      <textarea id="aep-desc" class="admin-login-field" style="min-height:80px;resize:vertical">${p.desc||''}</textarea>
      <label style="font-size:12px;color:rgba(255,255,255,.5)">หมายเหตุ Admin</label>
      <input id="aep-note" class="admin-login-field" value="${(p.adminNote||'').replace(/"/g,'&quot;')}" placeholder="หมายเหตุภายใน (ไม่แสดงต่อผู้ใช้)">
      <div id="aep-err" style="color:#ff6b6b;font-size:12px;display:none"></div>
      <button class="admin-login-submit" onclick="adminSaveProp('${id}')"><i class="fas fa-save"></i> บันทึก</button>
    </div>
  </div>`;
  mo.onclick=function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
}

async function adminSaveProp(id){
  const title    = document.getElementById('aep-title')?.value.trim();
  const price    = Number(document.getElementById('aep-price')?.value||0);
  const tx       = document.getElementById('aep-tx')?.value;
  const province = document.getElementById('aep-province')?.value.trim();
  const location = document.getElementById('aep-location')?.value.trim();
  const desc     = document.getElementById('aep-desc')?.value.trim();
  const status   = document.getElementById('aep-status')?.value;
  const note     = document.getElementById('aep-note')?.value.trim();
  const errEl    = document.getElementById('aep-err');
  if(!title){ if(errEl){errEl.textContent='กรุณากรอกชื่อทรัพย์';errEl.style.display='block';} return; }
  const updates = {title, price, tx, province, location, description:desc, status, admin_note:note};
  if(!_adminDevMode && sb){
    try{
      const {error} = await sb.from('properties').update(updates).eq('id',id);
      if(error){ if(errEl){errEl.textContent='Error: '+error.message;errEl.style.display='block';} return; }
      toast('บันทึกทรัพย์ #'+id+' สำเร็จ ✅');
    }catch(e){ if(errEl){errEl.textContent='Error: '+e.message;errEl.style.display='block';} return; }
  } else { toast('DEV: บันทึกทรัพย์ #'+id+' (ไม่ได้เขียนจริง)'); }
  document.getElementById('admin-edit-prop-modal')?.remove();
  _renderAdminPanel('properties');
}

function adminEditAgent(id){
  const allAgents2 = (typeof agents!=='undefined'&&agents.length)?agents:(typeof MOCK!=='undefined'?MOCK.agents:[]);
  const a = allAgents2.find(x=>String(x.id)===String(id));
  if(!a){ toast('ไม่พบข้อมูล Agent #'+id); return; }
  const existing = document.getElementById('admin-edit-agent-modal');
  if(existing) existing.remove();
  const mo = document.createElement('div');
  mo.className='ov'; mo.id='admin-edit-agent-modal';
  mo.style.cssText='display:flex;z-index:10000';
  mo.innerHTML=`<div class="modal" style="max-width:480px;background:#0d1b2e;border:1px solid rgba(255,200,100,.2);color:#fff">
    <div class="mhd" style="background:rgba(27,58,107,.8);border-bottom:1px solid rgba(255,200,100,.1)">
      <h2 style="color:#fff"><i class="fas fa-user-edit" style="color:#c8922a"></i> แก้ไข Agent</h2>
      <span class="mclose" onclick="document.getElementById('admin-edit-agent-modal').remove()">×</span>
    </div>
    <div class="mbody" style="display:grid;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ชื่อ</label>
        <input id="aea-name" class="admin-login-field" value="${(a.name||'').replace(/"/g,'&quot;')}"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ตำแหน่ง</label>
        <input id="aea-title" class="admin-login-field" value="${(a.title||'').replace(/"/g,'&quot;')}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">เบอร์โทร</label>
        <input id="aea-phone" class="admin-login-field" value="${(a.phone||'').replace(/"/g,'&quot;')}"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">Line ID</label>
        <input id="aea-line" class="admin-login-field" value="${(a.lineId||'').replace(/"/g,'&quot;')}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">Rating (0–5)</label>
        <input id="aea-rating" type="number" step="0.1" min="0" max="5" class="admin-login-field" value="${a.rating||4.5}"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ดีลที่ปิดแล้ว</label>
        <input id="aea-deals" type="number" min="0" class="admin-login-field" value="${a.deals||0}"></div>
      </div>
      <label style="font-size:12px;color:rgba(255,255,255,.5)">Bio / คำอธิบาย</label>
      <textarea id="aea-bio" class="admin-login-field" style="min-height:80px;resize:vertical">${a.bio||''}</textarea>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="aea-active" ${a.is_active!==false?'checked':''} style="width:16px;height:16px">
        <label for="aea-active" style="font-size:13px;cursor:pointer">Active (แสดงในหน้าเว็บ)</label>
      </div>
      <div id="aea-err" style="color:#ff6b6b;font-size:12px;display:none"></div>
      <button class="admin-login-submit" onclick="adminSaveAgent('${id}')"><i class="fas fa-save"></i> บันทึก Agent</button>
    </div>
  </div>`;
  mo.onclick=function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
}

async function adminSaveAgent(id){
  const name    = document.getElementById('aea-name')?.value.trim();
  const title   = document.getElementById('aea-title')?.value.trim();
  const phone   = document.getElementById('aea-phone')?.value.trim();
  const lineId  = document.getElementById('aea-line')?.value.trim();
  const rating  = Number(document.getElementById('aea-rating')?.value||4.5);
  const deals   = Number(document.getElementById('aea-deals')?.value||0);
  const bio     = document.getElementById('aea-bio')?.value.trim();
  const active  = document.getElementById('aea-active')?.checked;
  const errEl   = document.getElementById('aea-err');
  if(!name){ if(errEl){errEl.textContent='กรุณากรอกชื่อ';errEl.style.display='block';} return; }
  const updates = {name, title, phone, line_id:lineId, rating, deals, bio, is_active:active};
  if(!_adminDevMode && sb){
    try{
      const {error} = await sb.from('agents').update(updates).eq('id',id);
      if(error){ if(errEl){errEl.textContent='Error: '+error.message;errEl.style.display='block';} return; }
      toast('บันทึก Agent สำเร็จ ✅');
    }catch(e){ if(errEl){errEl.textContent='Error: '+e.message;errEl.style.display='block';} return; }
  } else { toast('DEV: บันทึก Agent #'+id+' (ไม่ได้เขียนจริง)'); }
  document.getElementById('admin-edit-agent-modal')?.remove();
  _renderAdminPanel('agents');
}
async function adminUpdateRequest(id, status){
  if(!_adminDevMode && sb){
    try{ await sb.from('buy_requests').update({status}).eq('id',id); toast('อัปเดตสถานะ: '+status); }
    catch(e){ toast('Error: '+e.message); return; }
  } else { toast('DEV: อัปเดต request #'+id+' → '+status); }
  _renderAdminPanel('requests');
}
function adminContactRequest(id, phone, contact){ window.open('tel:'+phone,'_self'); }
async function adminSendNotification(){
  const title  = document.getElementById('notif-title').value.trim();
  const body   = document.getElementById('notif-body').value.trim();
  const target = document.getElementById('notif-target')?.value || 'all';
  const type   = document.getElementById('notif-type')?.value   || 'info';
  const actionUrl = document.getElementById('notif-action-url')?.value.trim() || '';

  if(!title||!body){ toast('กรุณากรอกหัวข้อและข้อความ',true); return; }

  // ── ปุ่ม loading state ──
  const btn = document.querySelector('[onclick="adminSendNotification()"]');
  const origHtml = btn?.innerHTML||'';
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...'; }

  if(!_adminDevMode && sb){
    try{
      // [v13] บันทึกลง site_notifications table จริง
      // Supabase Realtime จะ broadcast ให้ clients ที่ subscribe อยู่อัตโนมัติ
      const payload = {
        title,
        body,
        type,
        target: target === 'active' ? 'logged_in' : (target === 'buyers' ? 'logged_in' : target),
        action_url:   actionUrl || null,
        is_published: true,
        created_by:   _adminUser?.id || null
      };
      const { error } = await sb.from('site_notifications').insert(payload);
      if(error) throw error;

      toast('📢 Notification ส่งและบันทึกแล้ว ✅');
    }catch(e){
      toast('เกิดข้อผิดพลาด: '+(e.message||'กรุณาลองใหม่'),true);
      if(btn){ btn.disabled=false; btn.innerHTML=origHtml; }
      return;
    }
  } else {
    toast('DEV: Notification "'+title+'" (ไม่ได้ส่งจริงใน dev mode)');
  }

  // ── reset form ──
  document.getElementById('notif-title').value='';
  document.getElementById('notif-body').value='';
  if(document.getElementById('notif-action-url')) document.getElementById('notif-action-url').value='';
  if(btn){ btn.disabled=false; btn.innerHTML=origHtml; }

  // ── refresh รายการ notifications ──
  if(!_adminDevMode) _renderNotifHistory();
}
function adminRefreshData(){ adminNav(_adminCurrentPanel, document.querySelector('.admin-nav-item.active')); toast('🔄 Refresh แล้ว'); }

// [v13] โหลดและแสดงประวัติ site_notifications ใน Admin panel
async function _renderNotifHistory(){
  const container = document.getElementById('admin-notif-history');
  if(!container) return;
  if(_adminDevMode || !sb){
    container.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,.3);font-size:12px;text-align:center">DEV MODE — ไม่แสดงข้อมูลจริง</div>';
    return;
  }
  container.innerHTML = '<div style="text-align:center;padding:30px;color:rgba(255,255,255,.3)"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const { data, error } = await sb
      .from('site_notifications')
      .select('id,title,body,type,target,is_published,created_at,action_url')
      .order('created_at', { ascending: false })
      .limit(20);
    if(error) throw error;
    if(!data||!data.length){
      container.innerHTML = '<div class="admin-empty"><i class="fas fa-bell-slash"></i><p>ยังไม่มี Notification</p></div>';
      return;
    }
    const typeIcon = {info:'📢',promo:'🎉',success:'✅',warning:'⚠️',urgent:'🚨'};
    const targetLabel = {all:'ทุกคน',logged_in:'Login แล้ว',specific_user:'เฉพาะ user'};
    container.innerHTML = data.map(n=>`
      <div style="border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,.02)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
          <div style="font-size:13px;font-weight:600;color:#fff">${typeIcon[n.type]||'📢'} ${sanitize(n.title)}</div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(200,146,42,.15);color:#c8922a">${targetLabel[n.target]||n.target}</span>
            ${n.is_published
              ?'<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(46,204,113,.15);color:#2ecc71">เผยแพร่</span>'
              :'<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(231,76,60,.15);color:#e74c3c">ซ่อน</span>'}
          </div>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,.45);margin-bottom:6px">${sanitize(n.body)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px;color:rgba(255,255,255,.25)">${n.created_at?new Date(n.created_at).toLocaleString('th-TH'):'-'}</div>
          <button onclick="_adminDeleteNotif('${n.id}')" style="background:rgba(231,76,60,.1);color:#e74c3c;border:1px solid rgba(231,76,60,.2);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer"><i class="fas fa-trash"></i> ลบ</button>
        </div>
      </div>`).join('');
  } catch(e){
    container.innerHTML = `<div style="padding:20px;color:#e74c3c;font-size:12px">โหลดไม่สำเร็จ: ${sanitize(e.message)}</div>`;
  }
}

// [v13] ลบ notification จาก admin panel
async function _adminDeleteNotif(notifId){
  if(!sb||!notifId) return;
  if(!confirm('ลบ Notification นี้?')) return;
  const { error } = await sb.from('site_notifications').delete().eq('id', notifId);
  if(error){ toast('ลบไม่สำเร็จ: '+error.message,true); return; }
  toast('ลบ Notification แล้ว ✅');
  _renderNotifHistory();
}

// ── Route สำหรับ admin page ──
(function(){
  const origRoutes = typeof PAGE_ROUTES !== 'undefined' ? PAGE_ROUTES : null;
  if(origRoutes) origRoutes['admin'] = { path:'/admin', title:'Admin Panel — Matchdoor', desc:'Admin Dashboard' };
})();

// ═══════════════════════════════════════════════════════════════
//  ADMIN CRUD FUNCTIONS — เพิ่ม / ลบ (เพิ่มใหม่ v2)
// ═══════════════════════════════════════════════════════════════

/* ─── เพิ่มทรัพย์ใหม่ ─── */
function adminAddProp(){
  const existing = document.getElementById('admin-add-prop-modal');
  if(existing) existing.remove();
  const mo = document.createElement('div');
  mo.className='ov'; mo.id='admin-add-prop-modal';
  mo.style.cssText='display:flex;z-index:10000';
  mo.innerHTML=`<div class="modal" style="max-width:520px;background:#0d1b2e;border:1px solid rgba(255,200,100,.2);color:#fff;max-height:90vh;overflow-y:auto">
    <div class="mhd" style="background:rgba(27,58,107,.8);border-bottom:1px solid rgba(255,200,100,.1);position:sticky;top:0;z-index:1">
      <h2 style="color:#fff"><i class="fas fa-plus-circle" style="color:#c8922a"></i> เพิ่มทรัพย์ใหม่</h2>
      <span class="mclose" onclick="document.getElementById('admin-add-prop-modal').remove()">×</span>
    </div>
    <div class="mbody" style="display:grid;gap:10px">
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ชื่อทรัพย์ *</label>
      <input id="aap-title" class="admin-login-field" placeholder="เช่น คอนโด Ashton Asoke 2 ห้องนอน"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ประเภท</label>
        <select id="aap-tx" class="admin-login-field" style="appearance:auto">
          <option value="ขาย">ขาย</option><option value="เช่า">ให้เช่า</option>
        </select></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">หมวดหมู่</label>
        <select id="aap-type" class="admin-login-field" style="appearance:auto">
          <option>คอนโด</option><option>บ้านเดี่ยว</option><option>ทาวน์โฮม</option><option>อาคารพาณิชย์</option><option>ที่ดิน</option>
        </select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ราคา (บาท)</label>
        <input id="aap-price" type="number" class="admin-login-field" placeholder="3500000"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">จังหวัด</label>
        <input id="aap-province" class="admin-login-field" placeholder="กรุงเทพฯ"></div>
      </div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ทำเล / ที่อยู่</label>
      <input id="aap-location" class="admin-login-field" placeholder="เช่น ใกล้ BTS อโศก สุขุมวิท 21"></div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">คำอธิบาย</label>
      <textarea id="aap-desc" class="admin-login-field" style="min-height:80px;resize:vertical" placeholder="รายละเอียดทรัพย์..."></textarea></div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">URL รูปหลัก (ถ้ามี)</label>
      <input id="aap-img" class="admin-login-field" placeholder="https://..."></div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">สถานะ</label>
      <select id="aap-status" class="admin-login-field" style="appearance:auto">
        <option value="pending">รออนุมัติ</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ปฏิเสธ</option>
      </select></div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">หมายเหตุ Admin</label>
      <input id="aap-note" class="admin-login-field" placeholder="(ไม่บังคับ)"></div>
      <div id="aap-err" style="color:#ff6b6b;font-size:12px;display:none"></div>
      <button class="admin-login-submit" onclick="adminSaveNewProp()"><i class="fas fa-plus"></i> บันทึกทรัพย์ใหม่</button>
    </div>
  </div>`;
  mo.onclick=function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
}

async function adminSaveNewProp(){
  const title    = document.getElementById('aap-title')?.value.trim();
  const price    = Number(document.getElementById('aap-price')?.value||0);
  const tx       = document.getElementById('aap-tx')?.value;
  const type     = document.getElementById('aap-type')?.value;
  const province = document.getElementById('aap-province')?.value.trim();
  const location = document.getElementById('aap-location')?.value.trim();
  const desc     = document.getElementById('aap-desc')?.value.trim();
  const img      = document.getElementById('aap-img')?.value.trim();
  const status   = document.getElementById('aap-status')?.value;
  const note     = document.getElementById('aap-note')?.value.trim();
  const errEl    = document.getElementById('aap-err');
  if(!title){ if(errEl){errEl.textContent='กรุณากรอกชื่อทรัพย์';errEl.style.display='block';} return; }
  const payload = {title, price, tx, type, province, location, description:desc, status: status||'pending', admin_note:note, created_at:new Date().toISOString()};
  if(img) payload.image_url = img;
  if(!_adminDevMode && sb){
    try{
      const {data, error} = await sb.from('properties').insert([payload]).select();
      if(error){ if(errEl){errEl.textContent='Error: '+error.message;errEl.style.display='block';} return; }
      toast('เพิ่มทรัพย์ใหม่สำเร็จ ✅');
      // อัปเดต local cache
      if(typeof props !== 'undefined' && data && data[0]) props.unshift(data[0]);
    }catch(e){ if(errEl){errEl.textContent='Error: '+e.message;errEl.style.display='block';} return; }
  } else { toast('DEV: เพิ่มทรัพย์ใหม่ "'+title+'" (ไม่ได้เขียนจริงใน dev mode)'); }
  document.getElementById('admin-add-prop-modal')?.remove();
  _renderAdminPanel('properties');
}

/* ─── ลบทรัพย์ ─── */
async function adminDeleteProp(id, title){
  if(!confirm('ลบทรัพย์ "' + (title||'#'+id) + '" ?\n\nการกระทำนี้ไม่สามารถยกเลิกได้')) return;
  if(!_adminDevMode && sb){
    try{
      const {error} = await sb.from('properties').delete().eq('id',id);
      if(error){ toast('Error: '+error.message); return; }
      toast('ลบทรัพย์ #'+id+' แล้ว 🗑️');
      // ลบออกจาก local cache
      if(typeof props !== 'undefined'){
        const idx = props.findIndex(x=>String(x.id)===String(id));
        if(idx>-1) props.splice(idx,1);
      }
    }catch(e){ toast('Error: '+e.message); return; }
  } else { toast('DEV: ลบทรัพย์ #'+id+' (ไม่ได้ลบจริงใน dev mode)'); }
  _renderAdminPanel('properties');
}

/* ─── เพิ่ม Agent ใหม่ ─── */
function adminAddAgent(){
  const existing = document.getElementById('admin-add-agent-modal');
  if(existing) existing.remove();
  const mo = document.createElement('div');
  mo.className='ov'; mo.id='admin-add-agent-modal';
  mo.style.cssText='display:flex;z-index:10000';
  mo.innerHTML=`<div class="modal" style="max-width:480px;background:#0d1b2e;border:1px solid rgba(255,200,100,.2);color:#fff">
    <div class="mhd" style="background:rgba(27,58,107,.8);border-bottom:1px solid rgba(255,200,100,.1)">
      <h2 style="color:#fff"><i class="fas fa-user-plus" style="color:#c8922a"></i> เพิ่ม Agent ใหม่</h2>
      <span class="mclose" onclick="document.getElementById('admin-add-agent-modal').remove()">×</span>
    </div>
    <div class="mbody" style="display:grid;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ชื่อ *</label>
        <input id="aaa-name" class="admin-login-field" placeholder="ชื่อ นามสกุล"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ตำแหน่ง</label>
        <input id="aaa-title" class="admin-login-field" placeholder="Senior Agent"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">เบอร์โทร</label>
        <input id="aaa-phone" class="admin-login-field" placeholder="08X-XXX-XXXX"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">Line ID</label>
        <input id="aaa-line" class="admin-login-field" placeholder="@yourid"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">Rating (0–5)</label>
        <input id="aaa-rating" type="number" step="0.1" min="0" max="5" class="admin-login-field" value="4.5"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ดีลที่ปิดแล้ว</label>
        <input id="aaa-deals" type="number" min="0" class="admin-login-field" value="0"></div>
      </div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">URL รูปโปรไฟล์</label>
      <input id="aaa-photo" class="admin-login-field" placeholder="https://..."></div>
      <label style="font-size:12px;color:rgba(255,255,255,.5)">Bio / คำอธิบาย</label>
      <textarea id="aaa-bio" class="admin-login-field" style="min-height:80px;resize:vertical" placeholder="ประสบการณ์ ความเชี่ยวชาญ..."></textarea>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="aaa-active" checked style="width:16px;height:16px">
        <label for="aaa-active" style="font-size:13px;cursor:pointer">Active (แสดงในหน้าเว็บ)</label>
      </div>
      <div id="aaa-err" style="color:#ff6b6b;font-size:12px;display:none"></div>
      <button class="admin-login-submit" onclick="adminSaveNewAgent()"><i class="fas fa-user-plus"></i> บันทึก Agent ใหม่</button>
    </div>
  </div>`;
  mo.onclick=function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
}

async function adminSaveNewAgent(){
  const name   = document.getElementById('aaa-name')?.value.trim();
  const title  = document.getElementById('aaa-title')?.value.trim();
  const phone  = document.getElementById('aaa-phone')?.value.trim();
  const lineId = document.getElementById('aaa-line')?.value.trim();
  const rating = Number(document.getElementById('aaa-rating')?.value||4.5);
  const deals  = Number(document.getElementById('aaa-deals')?.value||0);
  const photo  = document.getElementById('aaa-photo')?.value.trim();
  const bio    = document.getElementById('aaa-bio')?.value.trim();
  const active = document.getElementById('aaa-active')?.checked;
  const errEl  = document.getElementById('aaa-err');
  if(!name){ if(errEl){errEl.textContent='กรุณากรอกชื่อ';errEl.style.display='block';} return; }
  const payload = {name, title, phone, line_id:lineId, rating, deals, bio, is_active:active, created_at:new Date().toISOString()};
  if(photo) payload.photo_url = photo;
  if(!_adminDevMode && sb){
    try{
      const {data, error} = await sb.from('agents').insert([payload]).select();
      if(error){ if(errEl){errEl.textContent='Error: '+error.message;errEl.style.display='block';} return; }
      toast('เพิ่ม Agent "'+name+'" สำเร็จ ✅');
      if(typeof agents !== 'undefined' && data && data[0]) agents.unshift(data[0]);
    }catch(e){ if(errEl){errEl.textContent='Error: '+e.message;errEl.style.display='block';} return; }
  } else { toast('DEV: เพิ่ม Agent "'+name+'" (ไม่ได้เขียนจริงใน dev mode)'); }
  document.getElementById('admin-add-agent-modal')?.remove();
  _renderAdminPanel('agents');
}

/* ─── ลบ Agent ─── */
async function adminDeleteAgent(id, name){
  if(!confirm('ลบ Agent "' + (name||'#'+id) + '" ?\n\nการกระทำนี้ไม่สามารถยกเลิกได้')) return;
  if(!_adminDevMode && sb){
    try{
      const {error} = await sb.from('agents').delete().eq('id',id);
      if(error){ toast('Error: '+error.message); return; }
      toast('ลบ Agent "'+name+'" แล้ว 🗑️');
      if(typeof agents !== 'undefined'){
        const idx = agents.findIndex(x=>String(x.id)===String(id));
        if(idx>-1) agents.splice(idx,1);
      }
    }catch(e){ toast('Error: '+e.message); return; }
  } else { toast('DEV: ลบ Agent #'+id+' (ไม่ได้ลบจริงใน dev mode)'); }
  _renderAdminPanel('agents');
}

/* ─── เพิ่ม Portfolio ใหม่ ─── */
function adminAddPortfolio(){
  _adminOpenPortfolioModal(null);
}

/* ─── แก้ไข Portfolio ─── */
function adminEditPortfolio(pRaw){
  let p = pRaw;
  if(typeof pRaw === 'string'){
    try{ p = JSON.parse(pRaw); }catch(e){ p = {}; }
  }
  _adminOpenPortfolioModal(p);
}

function _adminOpenPortfolioModal(p){
  const isEdit = !!p;
  const mid = 'admin-port-modal';
  const existing = document.getElementById(mid);
  if(existing) existing.remove();
  const mo = document.createElement('div');
  mo.className='ov'; mo.id=mid;
  mo.style.cssText='display:flex;z-index:10000';
  mo.innerHTML=`<div class="modal" style="max-width:460px;background:#0d1b2e;border:1px solid rgba(255,200,100,.2);color:#fff">
    <div class="mhd" style="background:rgba(27,58,107,.8);border-bottom:1px solid rgba(255,200,100,.1)">
      <h2 style="color:#fff"><i class="fas fa-trophy" style="color:#c8922a"></i> ${isEdit?'แก้ไข':'เพิ่ม'} Portfolio</h2>
      <span class="mclose" onclick="document.getElementById('${mid}').remove()">×</span>
    </div>
    <div class="mbody" style="display:grid;gap:10px">
      <input type="hidden" id="ap-id" value="${p?.id||''}">
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ชื่อทรัพย์ *</label>
      <input id="ap-title" class="admin-login-field" value="${(p?.title||'').replace(/"/g,'&quot;')}" placeholder="เช่น Ashton Asoke ชั้น 25"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ราคาปิดดีล (บาท)</label>
        <input id="ap-price" type="number" class="admin-login-field" value="${p?.price||''}" placeholder="8500000"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">Agent ที่ดูแล</label>
        <input id="ap-agent" class="admin-login-field" value="${(p?.agent||'').replace(/"/g,'&quot;')}" placeholder="ชื่อ Agent"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">วันที่ปิดดีล</label>
        <input id="ap-date" class="admin-login-field" type="month" value="${p?.date||p?.closed_at||''}"></div>
        <div><label style="font-size:12px;color:rgba(255,255,255,.5)">ประเภท</label>
        <select id="ap-type" class="admin-login-field" style="appearance:auto">
          ${['คอนโด','บ้านเดี่ยว','ทาวน์โฮม','ที่ดิน','อาคารพาณิชย์'].map(t=>`<option${(p?.type||''===t)?' selected':''}>${t}</option>`).join('')}
        </select></div>
      </div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">URL รูป</label>
      <input id="ap-img" class="admin-login-field" value="${(p?.image_url||p?.img||'').replace(/"/g,'&quot;')}" placeholder="https://..."></div>
      <div><label style="font-size:12px;color:rgba(255,255,255,.5)">หมายเหตุ</label>
      <textarea id="ap-note" class="admin-login-field" style="min-height:60px;resize:vertical">${p?.note||''}</textarea></div>
      <div id="ap-err" style="color:#ff6b6b;font-size:12px;display:none"></div>
      <button class="admin-login-submit" onclick="adminSavePortfolio(${isEdit})"><i class="fas fa-save"></i> ${isEdit?'บันทึกการแก้ไข':'เพิ่ม Portfolio'}</button>
    </div>
  </div>`;
  mo.onclick=function(e){ if(e.target===mo) mo.remove(); };
  document.body.appendChild(mo);
}

async function adminSavePortfolio(isEdit){
  const id    = document.getElementById('ap-id')?.value;
  const title = document.getElementById('ap-title')?.value.trim();
  const price = Number(document.getElementById('ap-price')?.value||0);
  const agent = document.getElementById('ap-agent')?.value.trim();
  const date  = document.getElementById('ap-date')?.value;
  const type  = document.getElementById('ap-type')?.value;
  const img   = document.getElementById('ap-img')?.value.trim();
  const note  = document.getElementById('ap-note')?.value.trim();
  const errEl = document.getElementById('ap-err');
  if(!title){ if(errEl){errEl.textContent='กรุณากรอกชื่อทรัพย์';errEl.style.display='block';} return; }
  const payload = {title, price, agent, date:date||null, type, note};
  if(img) payload.image_url = img;
  if(!_adminDevMode && sb){
    try{
      if(isEdit && id){
        const {error} = await sb.from('portfolio').update(payload).eq('id',id);
        if(error){ if(errEl){errEl.textContent='Error: '+error.message;errEl.style.display='block';} return; }
        toast('แก้ไข Portfolio สำเร็จ ✅');
      } else {
        payload.created_at = new Date().toISOString();
        const {error} = await sb.from('portfolio').insert([payload]);
        if(error){ if(errEl){errEl.textContent='Error: '+error.message;errEl.style.display='block';} return; }
        toast('เพิ่ม Portfolio สำเร็จ ✅');
      }
    }catch(e){ if(errEl){errEl.textContent='Error: '+e.message;errEl.style.display='block';} return; }
  } else { toast('DEV: '+(isEdit?'แก้ไข':'เพิ่ม')+' Portfolio "'+title+'" (ไม่ได้เขียนจริงใน dev mode)'); }
  document.getElementById('admin-port-modal')?.remove();
  _renderAdminPanel('portfolio');
}

/* ─── ลบ Portfolio ─── */
async function adminDeletePortfolio(id, title){
  if(!confirm('ลบ Portfolio "' + (title||'#'+id) + '" ?\n\nการกระทำนี้ไม่สามารถยกเลิกได้')) return;
  if(!_adminDevMode && sb){
    try{
      const {error} = await sb.from('portfolio').delete().eq('id',id);
      if(error){ toast('Error: '+error.message); return; }
      toast('ลบ Portfolio "'+title+'" แล้ว 🗑️');
    }catch(e){ toast('Error: '+e.message); return; }
  } else { toast('DEV: ลบ Portfolio #'+id+' (ไม่ได้ลบจริงใน dev mode)'); }
  _renderAdminPanel('portfolio');
}

