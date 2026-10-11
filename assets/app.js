/* Scamland application. MIT, Long Ngo 2026. No server, tracker, API key or remote script. */
(function () {
  'use strict';
  const D = window.ScamlandData; const C = window.ScamlandCore;
  const V = window.Vietflex;
  // Vietflex exposes constructors. Keep the atlas helpers small and explicit.
  const L = {layerGroup:()=>new V.LayerGroup(),geoJSON:(d,o)=>new V.GeoJSON(d,o),
    tileLayer:(u,o)=>new V.TileLayer(u,o),marker:(p,o)=>new V.Marker(p,o),
    divIcon:o=>new V.DivIcon(o),circle:(p,o)=>new V.Circle(p,o),
    circleMarker:(p,o)=>new V.CircleMarker(p,o),polyline:(p,o)=>new V.Polyline(p,o),
    latLngBounds:p=>new V.LatLngBounds(p),control:{scale:o=>new V.ScaleControl(o)}};
  const $ = id => document.getElementById(id); const E = C.escapeHTML;
  const icons = {
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/>',
    network:'<circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10 8-4 7m8-7 4 7M8 18h8"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    book:'<path d="M12 6C8 3 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-1-10 2Zm0 0v15"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
    code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
    upload:'<path d="M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    filter:'<path d="M3 4h18l-7 8v7l-4 2v-9Z"/>',
    reset:'<path d="M3 11a9 9 0 1 1 2 7M3 3v8h8"/>',
    link:'<path d="m9 15 6-6m-4-3 3-3a5 5 0 0 1 7 7l-3 3m-7 5-3 3a5 5 0 0 1-7-7l3-3"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    ruler:'<path d="m3 17 14-14 4 4L7 21Zm12-12 3 3m-7 1 3 3m-7 1 3 3"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 17l10 5 10-5"/>',
    play:'<path d="m8 4 12 8-12 8Z"/>',pause:'<path d="M8 4v16M16 4v16"/>',
    external:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    table:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12M3 15h18"/>'
  };
  const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || icons.info) + '</svg>';
  const hydrateIcons = () => document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const sourceMap = C.sourceIndex(D);
  const color = {documented:'#f3c167',reported:'#b3a1f0',lead:'#f2a9cc',context:'#9caabd'};
  const typeLabel = {documented:'Có nguồn chính thức',reported:'Báo chí / nghiên cứu',lead:'Đầu mối cần đối chiếu',context:'Bối cảnh / đào tạo'};
  const categoryLabel = {official:'Cơ quan chính thức',journalism:'Báo chí / hướng dẫn',research:'Nghiên cứu',data:'Dữ liệu & bản đồ',lead:'Đầu mối độc lập'};
  const shortPublisher = source => ({'U.S. Treasury / OFAC':'OFAC','GIJN / Bertil Lintner':'GIJN','Global Initiative Against Transnational Organized Crime':'GI-TOC','Bali Process / Regional Support Office':'RSO','OHCHR South-East Asia':'OHCHR','Sovereign Integrity Institute':'SII'}[source.publisher] || source.publisher);
  const formatDate = date => date ? date.slice(8) + '/' + date.slice(5,7) + '/' + date.slice(0,4) : 'Chưa có ngày công bố';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let storageAvailable = true;
  function readLocal(key, fallback) {
    try { const value = localStorage.getItem('scamland:v1:' + key); return value ? JSON.parse(value) : fallback; }
    catch (_) { storageAvailable = false; return fallback; }
  }
  function saveLocal(key, value) {
    try { localStorage.setItem('scamland:v1:' + key, JSON.stringify(value)); return true; }
    catch (_) { storageAvailable = false; toast('Trình duyệt không cho lưu cục bộ. Ghi chú vẫn ở trong phiên này.'); return false; }
  }
  const validIds = new Set(D.places.features.map(f => f.properties.id));
  const saved = readLocal('bookmarks', []);
  const loadedNotes = readLocal('notes', {});
  const notes = loadedNotes && typeof loadedNotes === 'object' && !Array.isArray(loadedNotes) ? loadedNotes : {};
  const state = {view:'map',scope:'core',year:2026,country:'',topic:'',level:'all',query:'',includeUndated:true,bookmarksOnly:false,
    bookmarks:Array.isArray(saved) ? saved.filter(id => validIds.has(id)) : [],selectedId:'gtsez',sourceTab:'library',sourceQuery:'',sourceCategory:'all',base:window.__SCAMLAND_OFFLINE__?'atlas':'osm',showContext:true,showRadii:false,showLabels:true,showLocal:true,showOriginal:true,originalQuery:'',impactPoint:true,impactRed:true,impactOrange:true,impactYellow:true};
  let places = []; let graph = {nodes:[],edges:[]}; let activeEdge = null; let graphPositions = {};
  let map; let backgroundLayer; let markerLayer; let radiusLayer; let labelLayer; let osmLayer; let localLayer; let googleLayer; let originalLayer;
  let impactLayers=new Map();
  let imported = []; let measureActive = false; let measurePoints = []; let measureLayer; let playTimer = null;
  let dragNode = null; let dragMoved = false; let suppressNodeClick = false; let toastTimer;

  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => {$('toast').hidden = true;}, 4200); }
  function message(text) { $('mapMessage').textContent = text; $('mapMessage').hidden = !text; }
  function currentType(feature) {
    const claims = C.activeClaims(feature,state,D);
    if (claims.every(c => c.status === 'context')) return 'context';
    const categories = claims.flatMap(c => c.source_ids.map(id => sourceMap.get(id)?.category));
    if (categories.includes('official')) return 'documented';
    if (categories.some(c => ['journalism','research'].includes(c))) return 'reported';
    return 'lead';
  }
  function sourceButton(id) {
    const source = sourceMap.get(id); if (!source) return '';
    return '<button data-source="' + E(id) + '" title="' + E(source.title) + '">' + icon('book') + E(shortPublisher(source)) + ' ↗</button>';
  }
  function restoreHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/,''));
    if (['map','graph','timeline','sources'].includes(params.get('view'))) state.view = params.get('view');
    if (['core','regional'].includes(params.get('scope'))) state.scope = params.get('scope');
    if (validIds.has(params.get('id'))) state.selectedId = params.get('id');
    if (D.metadata.countries[params.get('country')]) state.country = params.get('country');
    if (D.metadata.topics[params.get('topic')]) state.topic = params.get('topic');
    if (C.LEVELS.includes(params.get('level'))) state.level = params.get('level');
    const year = Number(params.get('year')); if (year >= 2018 && year <= 2026 && Number.isInteger(year)) state.year = year;
    if (params.get('undated') === '0') state.includeUndated = false;
  }
  function shareHash() {
    const params = new URLSearchParams({view:state.view,scope:state.scope,year:String(state.year),undated:state.includeUndated ? '1' : '0'});
    if (state.selectedId) params.set('id',state.selectedId);
    ['country','topic'].forEach(key => { if (state[key]) params.set(key,state[key]); });
    if (state.level !== 'all') params.set('level',state.level);
    return '#' + params.toString();
  }
  function showView(view) {
    state.view = view;
    document.querySelectorAll('[data-view]').forEach(button => {const active = button.dataset.view === view; button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    ['map','graph','timeline','sources'].forEach(name => {$(name + 'View').hidden = name !== view;});
    document.body.classList.toggle('library-mode',view === 'sources');
    $('timeControl').hidden = view === 'sources';
    document.body.classList.remove('filters-open');
    if (view === 'map') requestAnimationFrame(() => {map.invalidateSize(); renderMarkers();});
    if (view === 'graph') renderGraph();
    if (view === 'timeline') renderTimeline();
    if (view === 'sources') renderSources();
  }
  function syncControls() {
    $('countryFilter').value = state.country; $('levelFilter').value = state.level;
    $('yearSlider').value = state.year; $('includeUndated').checked = state.includeUndated;
    $('placeSearch').value = state.query; $('bookmarksOnly').checked = state.bookmarksOnly;
    $('bookmarkCount').textContent = state.bookmarks.length;
    document.querySelectorAll('[data-scope]').forEach(button => {const active = button.dataset.scope === state.scope;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('scopeNote').textContent = state.scope === 'core' ? 'Lõi và vùng Shan lân cận' : 'Có địa danh ngoài Tam giác vàng';
    $('mapSubtitle').textContent = state.scope === 'core' ? 'Bối cảnh địa lý & hồ sơ công khai' : 'Phạm vi tham chiếu khu vực · không đồng nhất địa lý';
    $('yearLabel').textContent = state.year === 2026 ? 'Đến 11/10/2026' : 'Đến cuối năm ' + state.year;
    $('topicChips').innerHTML = [['','Tất cả'],['scams','Lừa đảo mạng'],['trafficking','Buôn người'],['finance','Tài chính'],['drugs','Ma túy'],['wildlife','Động vật'],['methods','OSINT']].map(([id,label]) => '<button class="chip ' + (state.topic===id?'active':'') + '" data-topic="' + id + '" aria-pressed="' + String(state.topic===id) + '">' + E(label) + '</button>').join('');
  }
  function refresh(options = {}) {
    places = C.filterPlaces(D,state); graph = C.filterGraph(D,state,places);
    if (!places.some(f => f.properties.id === state.selectedId)) state.selectedId = places[0]?.properties.id || null;
    $('metricPlaces').textContent = places.length; $('metricSources').textContent = D.sources.length; $('metricRelations').textContent = graph.edges.length;
    const undated = places.filter(f => C.activeClaims(f,state,D).some(c => !c.date)).length;
    $('timeCaption').textContent = 'Ngày tài liệu, không phải trạng thái hoạt động trực tiếp.' + (state.includeUndated ? ' ' + undated + ' mốc có đầu mối chưa xác định ngày.' : ' Đã ẩn các nhận định chưa có ngày.');
    syncControls(); renderList(); renderMarkers();
    if (activeEdge && !graph.edges.some(e => e.id === activeEdge.id)) activeEdge = null;
    if (state.view !== 'sources') {if (activeEdge && state.view === 'graph') renderEdge(activeEdge);else renderPlace(state.selectedId);}
    if (state.view === 'graph') renderGraph();
    if (state.view === 'timeline') renderTimeline();
    if (options.fit) fitPlaces();
    hydrateIcons();
  }
  function renderList() {
    $('placeCount').textContent = places.length;
    if (!places.length) {$('placeList').innerHTML = '<div class="empty">' + icon('search') + '<strong>Chưa có mốc phù hợp.</strong>Đổi bộ lọc hoặc bật mốc chưa có ngày.</div>';return;}
    $('placeList').innerHTML = places.map(feature => {
      const p = feature.properties; const claims = C.activeClaims(feature,state,D); const type = currentType(feature);
      const ids = new Set(claims.flatMap(c => c.source_ids)); const saved = state.bookmarks.includes(p.id);
      return '<article class="place-card ' + (state.selectedId===p.id?'selected':'') + '"><button class="place-main" data-place="' + E(p.id) + '" aria-label="Mở hồ sơ ' + E(p.name) + '"><span><i class="dot ' + type + '"></i>' + E(p.name) + '</span><small>' + E(D.metadata.countries[p.country]) + ' · ' + ids.size + ' nguồn' + (claims.every(c=>!c.date)?' · Chưa có ngày':'') + '</small></button><button class="bookmark-btn ' + (saved?'active':'') + '" data-bookmark="' + E(p.id) + '" aria-label="' + (saved?'Bỏ lưu ':'Lưu ') + E(p.name) + '" aria-pressed="' + saved + '">' + (saved?'★':'☆') + '</button></article>';
    }).join('');
  }
  function initMap() {
    map = V.vietflexMap('map',{useLegacyGoogleTiles:true,googleMapType:'roadmap',googleMaps:state.base==='google',zoomControl:false,attributionControl:false,minZoom:3,maxZoom:18,maxBounds:null,preferCanvas:false,worldCopyJump:true,scrollWheelZoom:true}).setView([20.34,100.11],12);
    new V.AttributionControl({position:'bottomright',prefix:false}).addTo(map);
    googleLayer=map.baseLayer || V.legacyGoogleTiles({mapType:'roadmap'});
    backgroundLayer = L.layerGroup().addTo(map); markerLayer = L.layerGroup().addTo(map); radiusLayer = L.layerGroup().addTo(map); labelLayer = L.layerGroup().addTo(map); localLayer = L.layerGroup().addTo(map); measureLayer = L.layerGroup().addTo(map);
    originalLayer=L.layerGroup().addTo(map);
    map.attributionControl.setPrefix(false); map.attributionControl.addAttribution('Natural Earth 1:110m · điểm chỉ báo');
    L.control.scale({position:'bottomleft',imperial:false,maxWidth:90}).addTo(map);
    osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxNativeZoom:19,maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',keepBuffer:0,updateWhenIdle:true});
    let tileErrors = 0;
    osmLayer.on('tileerror',() => {tileErrors += 1;if(tileErrors>=3 && state.base==='osm'){setBase('atlas');message('Không tải được lớp OSM. Atlas địa lý cục bộ vẫn sẵn sàng.');}});
    osmLayer.on('tileload',()=>{tileErrors=0;});
    let googleErrors=0;
    googleLayer.on('tileerror',()=>{googleErrors++;if(googleErrors>=3 && state.base==='google'){setBase('atlas');message('Không tải được nền Google. Có thể chọn OSM hoặc tiếp tục với Atlas cục bộ.');}});
    googleLayer.on('tileload',()=>{googleErrors=0;});
    map.on('zoomend moveend',renderMarkers);
    map.on('mousemove',event=>{$('mapCoords').textContent = event.latlng.lat.toFixed(3) + '°N · ' + event.latlng.lng.toFixed(3) + '°E | EPSG:4326';});
    map.on('mouseout',()=>{$('mapCoords').textContent = 'WGS84 · EPSG:4326';});
    map.on('click',event=>{
      if (!measureActive) return;
      if (measurePoints.length===2) {measurePoints=[];measureLayer.clearLayers();}
      measurePoints.push(event.latlng); L.circleMarker(event.latlng,{radius:4,color:'#72d6e5',fillOpacity:1,interactive:false}).addTo(measureLayer);
      if (measurePoints.length===2) {
        L.polyline(measurePoints,{color:'#72d6e5',weight:2,dashArray:'6 5',interactive:false}).addTo(measureLayer);
        const [a,b]=measurePoints; const km=C.haversine([a.lng,a.lat],[b.lng,b.lat])/1000;
        message(km.toLocaleString('vi-VN',{maximumFractionDigits:2}) + ' km · khoảng cách cung lớn trên mô hình cầu, không phải tuyến đi.');
      } else message('Chọn điểm thứ hai để đo khoảng cách thẳng.');
    });
    setBase(state.base);renderOriginal();initInfluence();
  }

  const influenceData={"type":"FeatureCollection","name":"GTSEZ research-area illustration","metadata":{"crs":"EPSG:4326","updated":"2026-10-11","verified_impact":false,"official_boundary":false,"note_vi":"Đây là đa giác sơ họa phạm vi khảo sát, KHÔNG đo mức độ ảnh hưởng, KHÔNG là ranh giới pháp lý, KHÔNG khẳng định nguy cơ hoặc hoạt động phạm tội tại Việt Nam."},"features":[{"type":"Feature","id":"gtsez-reference","geometry":{"type":"Point","coordinates":[100.10524,20.34025]},"properties":{"id":"gtsez-reference","name":"Điểm tham chiếu GTSEZ","level":"point","geometry_basis":"editorial_schematic","verified":false}},{"type":"Feature","id":"zone-core","geometry":{"type":"Polygon","coordinates":[[[100.015,20.43],[100.07,20.445],[100.158,20.438],[100.252,20.408],[100.302,20.355],[100.282,20.292],[100.226,20.24],[100.142,20.22],[100.06,20.226],[100.004,20.265],[99.986,20.334],[99.998,20.392],[100.015,20.43]]]},"properties":{"id":"zone-core","name":"Vùng lõi đỏ · GTSEZ","level":"red","geometry_basis":"editorial_schematic","verified":false}},{"type":"Feature","id":"zone-regional","geometry":{"type":"Polygon","coordinates":[[[99.32,21],[99.92,21.18],[100.77,21.1],[101.4,20.82],[101.66,20.28],[101.53,19.76],[101,19.32],[100.16,19.18],[99.46,19.35],[99.1,19.88],[99.12,20.52],[99.32,21]]]},"properties":{"id":"zone-regional","name":"Vùng cam · tiểu vùng Tam giác Vàng","level":"orange","geometry_basis":"editorial_schematic","verified":false}},{"type":"Feature","id":"zone-extended","geometry":{"type":"Polygon","coordinates":[[[98.9,22.25],[100.55,22.35],[102.45,22],[104.2,21.1],[105.6,20.1],[106.7,18.7],[107.35,16.8],[107.25,14.65],[107,12.8],[106.65,10.9],[105.55,9.65],[104.25,9.35],[103.25,10.1],[102.4,11.2],[101.3,12.8],[100.55,14.8],[100.05,16.95],[98.5,19],[98.6,20.55],[98.9,22.25]]]},"properties":{"id":"zone-extended","name":"Vùng vàng · hành lang nghiên cứu tới Việt Nam","level":"yellow","geometry_basis":"editorial_schematic","verified":false}}]};
  const influenceSpecs=[
    {id:'zone-extended',key:'impactYellow',color:'#ffda50',fill:.085,weight:2.2},
    {id:'zone-regional',key:'impactOrange',color:'#ff9829',fill:.13,weight:2.5},
    {id:'zone-core',key:'impactRed',color:'#ff454e',fill:.22,weight:3.1},
    {id:'gtsez-reference',key:'impactPoint',color:'#ffe0a0',fill:1,weight:2.5}
  ];
  function initInfluence(){
    for(const spec of influenceSpecs){
      const feature=influenceData.features.find(x=>x.properties.id===spec.id);
      if(!feature)continue;
      const layer=L.geoJSON(feature,{
        style:()=>({color:spec.color,fillColor:spec.color,weight:spec.weight,fillOpacity:spec.fill,interactive:false}),
        pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:9,color:'#fff5d4',fillColor:spec.color,fillOpacity:1,weight:2.5,interactive:true}),
        onEachFeature:(f,l)=>{
          if(f.geometry.type==='Point'){
            l.bindTooltip('GTSEZ · địa danh tham chiếu xấp xỉ');
            l.bindPopup('<b>GTSEZ · Ton Pheung, Bokeo</b><p>Điểm tham chiếu gần đúng, không đại diện ranh giới chính thức hoặc cơ sở bị cáo buộc.</p><a href="https://mapcarta.com/34835182" target="_blank" rel="noopener noreferrer">Nguồn Mapcarta ↗</a>');
          }
        }
      });
      impactLayers.set(spec.id,layer);
    }
    renderInfluence();
  }
  function renderInfluence(){
    if(!map)return;
    influenceSpecs.forEach(s=>{const layer=impactLayers.get(s.id);if(layer&&map.hasLayer(layer))map.removeLayer(layer);});
    // Draw yellow, then orange, then red, finally the reference point.
    influenceSpecs.forEach(s=>{const layer=impactLayers.get(s.id);if(layer&&state[s.key])layer.addTo(map);const cb=$(s.key);if(cb)cb.checked=!!state[s.key];});
  }
  function fitInfluence(){
    let bounds=null;
    influenceSpecs.forEach(s=>{const layer=impactLayers.get(s.id);if(layer&&state[s.key]){
      const b=layer.getBounds();if(b.isValid()){if(bounds)bounds.extend(b);else bounds=b;}
    }});
    if(!bounds){toast('Chọn ít nhất một lớp vùng.');return;}
    map.fitBounds(bounds,{padding:[35,35],maxZoom:11,animate:!reducedMotion});
  }

  function renderBackground() {
    backgroundLayer.clearLayers(); labelLayer.clearLayers();
    if (state.showContext) {
      if(state.base==='atlas')L.geoJSON(D.context.countries,{interactive:false,style:()=>({color:'#455e79',weight:1,fillColor:'#142335',fillOpacity:.9})}).addTo(backgroundLayer);
      if(state.base==='atlas')L.geoJSON(D.context.rivers,{interactive:false,style:()=>({color:'#4285aa',weight:2,opacity:.75})}).addTo(backgroundLayer);
    }
    if (state.showLabels && state.base==='atlas') {
      [['MYANMAR',21.6,98.55],['LÀO',20.5,101.2],['THÁI LAN',19.1,99.9],['TRUNG QUỐC',23.4,100.55],['CAMPUCHIA',12.9,104.1],['VIỆT NAM',17.0,106.6]].forEach(([name,lat,lon])=>L.marker([lat,lon],{interactive:false,icon:L.divIcon({className:'country-label',html:name,iconSize:[120,18],iconAnchor:[60,9]})}).addTo(labelLayer));
      L.marker([20.98,100.72],{interactive:false,icon:L.divIcon({className:'river-label',html:'MEKONG',iconSize:[80,14],iconAnchor:[40,7]})}).addTo(labelLayer);
    }
  }
  function setBase(base) {
    state.base=base; message('');
    if (base==='osm') osmLayer.addTo(map);else if(map.hasLayer(osmLayer))map.removeLayer(osmLayer);
    if(base==='google')googleLayer.addTo(map);else if(map.hasLayer(googleLayer))map.removeLayer(googleLayer);
    $('googleBtn').classList.toggle('active',base==='google');$('googleBtn').setAttribute('aria-pressed',String(base==='google'));
    $('osmBtn').classList.toggle('active',base==='osm');$('osmBtn').setAttribute('aria-pressed',String(base==='osm'));
    $('atlasBtn').classList.toggle('active',base==='atlas');$('atlasBtn').setAttribute('aria-pressed',String(base==='atlas'));
    renderBackground();
  }
  function fitPlaces() {
    if (!places.length) return;
    const bounds=L.latLngBounds(places.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]]));
    map.fitBounds(bounds,{padding:[65,65],maxZoom:11,animate:!reducedMotion});
  }
  function renderMarkers() {
    if (!map || !markerLayer) return; markerLayer.clearLayers();radiusLayer.clearLayers();
    const groups=[];
    places.forEach(feature=>{
      const [lon,lat]=feature.geometry.coordinates; const point=map.latLngToContainerPoint([lat,lon]);
      const group=groups.find(g=>g.point.distanceTo(point)<30);
      if(group)group.features.push(feature);else groups.push({point,features:[feature]});
    });
    groups.forEach(group=>{
      const features=group.features; const feature=features[0];const [lon,lat]=feature.geometry.coordinates;
      if(features.length>1){
        const average=features.reduce((sum,f)=>[sum[0]+f.geometry.coordinates[1]/features.length,sum[1]+f.geometry.coordinates[0]/features.length],[0,0]);
        const marker=L.marker(average,{icon:L.divIcon({className:'place-pin',html:'<div class="cluster-pin">'+features.length+'</div>',iconSize:[38,38],iconAnchor:[19,19]}),title:features.map(f=>f.properties.name).join(' · ')}).addTo(markerLayer);
        marker.bindTooltip(features.length+' mốc gần nhau · bấm để mở rộng',{direction:'top'});
        marker.on('click',()=>map.fitBounds(L.latLngBounds(features.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]])),{padding:[70,70],maxZoom:13,animate:!reducedMotion}));
      }else{
        const type=currentType(feature);const selected=feature.properties.id===state.selectedId;
        const marker=L.marker([lat,lon],{icon:L.divIcon({className:'place-pin',html:'<div class="pin-inner '+(selected?'selected':'')+'" style="--pin-color:'+color[type]+'"></div>',iconSize:[21,21],iconAnchor:[10,10]}),title:feature.properties.name,keyboard:true}).addTo(markerLayer);
        marker.bindTooltip(E(feature.properties.name),{direction:'top',offset:[0,-7],permanent:state.showLabels && map.getZoom()>=8});
        marker.on('click',()=>selectPlace(feature.properties.id,false));
      }
      if(state.showRadii)features.forEach(f=>L.circle([f.geometry.coordinates[1],f.geometry.coordinates[0]],{radius:f.properties.display_radius_m,color:color[currentType(f)],fillOpacity:.035,weight:1,dashArray:'3 5',interactive:false}).addTo(radiusLayer));
    });
  }
  function selectPlace(id, zoom=true) {
    const feature=places.find(f=>f.properties.id===id);if(!feature)return;
    state.selectedId=id;activeEdge=null;$('detail').classList.remove('source-open');document.body.classList.remove('detail-closed');document.body.classList.add('detail-open');document.body.classList.remove('filters-open');
    renderList();renderPlace(id);renderMarkers();
    if(state.view==='map' && zoom){const [lon,lat]=feature.geometry.coordinates;map.setView([lat,lon],11,{animate:!reducedMotion});}
    if(state.view==='graph')renderGraph();
  }
  function renderPlace(id) {
    const feature=places.find(f=>f.properties.id===id);
    if(!feature){$('detailContent').innerHTML='<div class="empty">'+icon('book')+'<strong>Chưa có hồ sơ phù hợp</strong>Chọn mốc trong danh sách để đọc nguồn.</div>';return;}
    const p=feature.properties;const type=currentType(feature);const claims=C.activeClaims(feature,state,D);
    const tags=[...new Set(claims.flatMap(c=>c.topics))];const sourceIds=[...new Set(claims.flatMap(c=>c.source_ids))];
    const dates=claims.map(c=>c.date).filter(Boolean).sort();const [lon,lat]=feature.geometry.coordinates;
    const publicCode='SL-'+String(D.places.features.indexOf(feature)+1).padStart(2,'0');
    const saved=state.bookmarks.includes(id);
    $('detailContent').innerHTML='<div class="profile-top"><span class="badge '+(type==='documented'?'gold':type==='lead'?'pink':'cyan')+'"><i class="dot '+type+'"></i>'+E(typeLabel[type])+'</span><span class="profile-code">'+publicCode+'</span></div>'
      +'<h2 class="profile-title">'+E(p.name)+'</h2><p class="profile-subtitle">'+E(D.metadata.countries[p.country])+' · '+(p.scope==='core'?'Tam giác vàng & Shan lân cận':'Phạm vi tham chiếu mở rộng')+'</p><p class="profile-description">'+E(p.summary)+'</p>'
      +'<div class="profile-tags">'+tags.map(tag=>'<span class="tag">'+E(D.metadata.topics[tag])+'</span>').join('')+'</div><div class="profile-actions"><button class="btn subtle" data-bookmark="'+E(id)+'">'+(saved?'★ Đã lưu':'☆ Lưu mốc')+'</button><button class="btn subtle" data-focus="'+E(id)+'">'+icon('map')+'Xem trên bản đồ</button></div>'
      +'<dl class="profile-meta"><div><dt>Mốc WGS84 gần đúng</dt><dd>'+lat.toFixed(2)+'°N · '+lon.toFixed(2)+'°E</dd></div><div><dt>Nguồn trong cửa sổ</dt><dd>'+sourceIds.length+' tài liệu / đầu mối</dd></div><div><dt>Mốc tài liệu sớm nhất</dt><dd>'+ (dates.length?formatDate(dates[0]):'Chưa xác định')+'</dd></div><div><dt>Vòng ký hiệu nếu bật</dt><dd>'+ (p.display_radius_m/1000).toLocaleString('vi-VN')+' km · minh họa</dd></div></dl>'
      +'<p class="coordinate-warning">'+E(p.coordinate_note)+' '+E(p.radius_note)+'</p><h3 class="section-label">Nhận định và căn cứ <span>'+String(claims.length).padStart(2,'0')+'</span></h3>'
      +claims.map(claim=>'<article class="evidence-card"><header><span>'+E(formatDate(claim.date))+'</span><span>'+E(claim.status==='context'?'BỐI CẢNH':claim.status==='secondary'?'ĐẦU MỐI':'THEO NGUỒN')+'</span></header><p>'+E(claim.text)+'</p><div class="evidence-links">'+claim.source_ids.map(sourceButton).join('')+'</div></article>').join('')
      +'<h3 class="section-label">Ghi chú của bạn <span>CỤC BỘ</span></h3><label class="sr-only" for="noteInput">Ghi chú riêng cho '+E(p.name)+'</label><textarea id="noteInput" class="note-input" maxlength="5000" placeholder="Câu hỏi cần kiểm chứng, tài liệu cần đọc thêm…">'+E(typeof notes[id]==='string'?notes[id]:'')+'</textarea><div class="note-foot"><span>'+(storageAvailable?'Chỉ lưu trong trình duyệt này.':'Lưu cục bộ đang bị hạn chế.')+'</span><button id="saveNote" data-note="'+E(id)+'">Lưu ghi chú</button></div>';
    hydrateIcons();
  }
  function renderSource(id) {
    const source=sourceMap.get(id);if(!source)return;
    $('detail').classList.add('source-open');document.body.classList.remove('detail-closed');document.body.classList.add('detail-open');
    $('detailContent').innerHTML='<div class="profile-top"><span class="badge cyan">'+E(categoryLabel[source.category])+'</span><span class="profile-code">'+E(id.toUpperCase())+'</span></div><h2 class="profile-title">'+E(source.title)+'</h2><p class="profile-subtitle">'+E(source.publisher)+'</p><p class="profile-description">'+E(source.summary)+'</p><dl class="profile-meta"><div><dt>Ngày công bố</dt><dd>'+E(formatDate(source.published))+'</dd></div><div><dt>Ngày truy cập / đối chiếu</dt><dd>'+formatDate(source.accessed)+'</dd></div><div><dt>Tình trạng nguồn</dt><dd>'+(source.verification==='linked_from_publisher'?'Liên kết từ nhà xuất bản':'Đã tìm và đọc trang')+'</dd></div><div><dt>Cấp thông tin</dt><dd>'+E(categoryLabel[source.category])+'</dd></div></dl><h3 class="section-label">Giới hạn sử dụng</h3><div class="evidence-card"><p>'+E(source.limitations)+'</p></div><h3 class="section-label">Quyền sử dụng</h3><p class="profile-description">'+E(source.license)+'</p><a class="btn primary source-detail-link" href="'+E(C.safeURL(source.url))+'" target="_blank" rel="noopener noreferrer">'+icon('external')+'Mở tài liệu gốc</a><p class="coordinate-warning">Nguồn có thể thay đổi sau ngày đối chiếu. Xác minh lại bản gốc và thời điểm khi sử dụng trong một hồ sơ cụ thể.</p><button class="text-btn" data-return-profile="true" style="margin-top:18px">← Trở về địa danh đang chọn</button>';
    hydrateIcons();
  }
  function renderEdge(edge) {
    const a=D.relations.nodes.find(n=>n.id===edge.source);const b=D.relations.nodes.find(n=>n.id===edge.target);if(!a||!b)return;
    $('detail').classList.remove('source-open');document.body.classList.remove('detail-closed');document.body.classList.add('detail-open');
    $('detailContent').innerHTML='<div class="profile-top"><span class="badge gold">QUAN HỆ CÓ DẪN NGUỒN</span></div><h2 class="profile-title">'+E(a.label)+'</h2><div class="profile-description" style="color:var(--gold)">↓ '+E(edge.label)+'</div><h2 class="profile-title" style="margin-top:17px">'+E(b.label)+'</h2><dl class="profile-meta"><div><dt>Ngày nguồn</dt><dd>'+formatDate(edge.date)+'</dd></div><div><dt>Loại đường nối</dt><dd>'+(edge.type==='citation'?'Tài liệu mô tả':'Quan hệ theo tài liệu')+'</dd></div></dl><h3 class="section-label">Căn cứ</h3><div class="evidence-card"><p>Quan hệ được ghi lại theo tài liệu dưới đây. Đồ thị không bổ sung số tiền, giao dịch hoặc trạng thái hiện hành.</p><div class="evidence-links">'+edge.source_ids.map(sourceButton).join('')+'</div></div><div class="callout">Thông báo trừng phạt là tài liệu của cơ quan phát hành, không phải phán quyết tư pháp trong hồ sơ này.</div>';
    hydrateIcons();
  }
  function graphPath(edge) {
    const a=graphPositions[edge.source];const b=graphPositions[edge.target];return 'M '+a.x+' '+a.y+' L '+b.x+' '+b.y;
  }
  function renderGraph() {
    const svg=$('graphSvg');const regional=graph.nodes.some(n=>n.scope==='regional');svg.setAttribute('viewBox','0 0 880 '+(regional?'900':'570'));
    if(!graph.nodes.length){svg.innerHTML='<text x="440" y="270" text-anchor="middle" fill="#a0afc2" font-size="16">Chưa có quan hệ có nguồn phù hợp bộ lọc.</text>';return;}
    graph.nodes.forEach(node=>{if(!graphPositions[node.id])graphPositions[node.id]={x:node.x,y:node.y};});
    let html=graph.edges.map(edge=>{
      const a=graphPositions[edge.source],b=graphPositions[edge.target];
      return '<g class="graph-edge-group" data-edge="'+E(edge.id)+'" tabindex="0" role="button" aria-label="'+E(edge.label)+' · '+formatDate(edge.date)+'"><title>'+E(edge.label)+'</title><path class="graph-edge '+(edge.type==='citation'?'citation':'')+' '+(activeEdge?.id===edge.id?'active':'')+'" d="'+graphPath(edge)+'"/><path class="edge-hit" d="'+graphPath(edge)+'"/><text class="edge-label" x="'+(a.x+b.x)/2+'" y="'+((a.y+b.y)/2-8)+'">'+E(edge.label)+'</text></g>';
    }).join('');
    html+=graph.nodes.map(node=>{
      const pos=graphPositions[node.id];const stroke={person:'#f3c167',organization:'#b3a1f0',place:'#9caabd',document:'#72d6e5'}[node.type];
      let shape;let y=0;
      if(node.type==='person'){shape='<circle class="node-outline" cx="0" cy="0" r="24" stroke="'+stroke+'"/><path d="M-10 13v-3a10 10 0 0 1 20 0v3M0-14a6 6 0 1 0 0 12 6 6 0 1 0 0-12" fill="none" stroke="'+stroke+'"/>';y=45;}
      else if(node.type==='organization'){shape='<path class="node-outline" d="M0-31 38 0 0 31-38 0Z" stroke="'+stroke+'"/>';y=49;}
      else{const width=Math.max(124,node.label.length*6.2+22);shape='<rect class="node-outline" x="'+(-width/2)+'" y="-21" width="'+width+'" height="42" rx="'+(node.type==='document'?3:12)+'" stroke="'+stroke+'"/>';y=4;}
      return '<g class="graph-node '+(node.place_id===state.selectedId?'active':'')+'" data-node="'+E(node.id)+'" transform="translate('+pos.x+' '+pos.y+')" role="button" tabindex="0" aria-label="Mở '+E(node.label)+'"><title>'+E(node.label)+'</title>'+shape+'<text class="node-label" y="'+y+'">'+E(node.label)+'</text></g>';
    }).join('');svg.innerHTML=html;
  }
  function updateGraphPositions() {
    const svg=$('graphSvg');svg.querySelectorAll('[data-node]').forEach(el=>{const p=graphPositions[el.dataset.node];el.setAttribute('transform','translate('+p.x+' '+p.y+')');});
    svg.querySelectorAll('[data-edge]').forEach(el=>{const edge=graph.edges.find(e=>e.id===el.dataset.edge);const a=graphPositions[edge.source],b=graphPositions[edge.target];el.querySelectorAll('path').forEach(path=>path.setAttribute('d',graphPath(edge)));const text=el.querySelector('text');text.setAttribute('x',(a.x+b.x)/2);text.setAttribute('y',(a.y+b.y)/2-8);});
  }
  function timelineSources() {
    return D.sources.filter(source=>source.published && C.eligibleDate(source.published,state,D) && (!state.topic||source.tags.includes(state.topic)) && (state.scope==='regional'||source.id!=='treasury-2025'));
  }
  function renderTimeline() {
    const dated=timelineSources();const counts={};dated.forEach(source=>{const year=Number(source.published.slice(0,4));counts[year]=(counts[year]||0)+1;});
    const max=Math.max(1,...Object.values(counts));
    $('timelineChart').innerHTML=Array.from({length:9},(_,i)=>2018+i).map(year=>'<button class="year-bar '+(year===state.year?'active':'')+'" data-year="'+year+'" aria-label="'+year+': '+(counts[year]||0)+' tài liệu trong cửa sổ"><span class="bar" style="height:'+Math.max(2,(counts[year]||0)/max*85)+'%"><span class="bar-count">'+(counts[year]||0)+'</span></span><span class="bar-year">'+year+'</span></button>').join('');
    $('timelineFeed').innerHTML=dated.sort((a,b)=>b.published.localeCompare(a.published)).map(source=>'<article class="timeline-item"><span class="timeline-date">'+formatDate(source.published)+' · NGÀY CÔNG BỐ</span><h3>'+E(source.title)+'</h3><p>'+E(source.summary)+'</p><button data-source="'+E(source.id)+'">'+E(shortPublisher(source))+' · Xem căn cứ ↗</button></article>').join('') || '<div class="empty">Không có tài liệu có ngày phù hợp chủ đề.</div>';
    const unknown=D.sources.filter(s=>!s.published&&(!state.topic||s.tags.includes(state.topic))).length;
    $('timelineFeed').insertAdjacentHTML('beforeend','<div class="timeline-undated">Biểu đồ đếm tài liệu của danh mục theo chủ đề và thời điểm, không đếm cơ sở hay vụ án. Bộ lọc quốc gia áp dụng cho địa danh. '+unknown+' nguồn chưa có ngày công bố được giữ ngoài trục thời gian.</div>');
  }
  function renderSources() {
    document.querySelectorAll('[data-source-tab]').forEach(button=>{const active=button.dataset.sourceTab===state.sourceTab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('sourceFilters').hidden=state.sourceTab!=='library';const content=$('sourceContent');
    if(state.sourceTab==='library'){
      const words=C.normalize(state.sourceQuery).split(/\s+/).filter(Boolean);
      const sources=D.sources.filter(s=>(state.sourceCategory==='all'||s.category===state.sourceCategory)&&words.every(word=>C.normalize([s.title,s.publisher,s.summary,...s.tags.map(t=>D.metadata.topics[t])].join(' ')).includes(word)));
      content.innerHTML='<div class="source-grid">'+sources.map(source=>'<article class="source-card"><div class="source-top"><span class="badge '+(source.category==='lead'?'pink':source.category==='official'?'gold':'cyan')+'">'+E(categoryLabel[source.category])+'</span><small>'+E(source.published?source.published.slice(0,4):'Không rõ ngày')+'</small></div><h3>'+E(source.title)+'</h3><span class="publisher">'+E(source.publisher)+'</span><p>'+E(source.summary)+'</p><footer><span>Đối chiếu '+formatDate(source.accessed)+'</span><button data-source="'+E(source.id)+'">Đọc hồ sơ ↗</button></footer></article>').join('')+'</div>'+(sources.length?'':'<div class="empty">Không có nguồn phù hợp. Thử tên nhà xuất bản hoặc chủ đề khác.</div>');
    }else if(state.sourceTab==='toolbox'){
      content.innerHTML='<div class="callout">Công cụ hỗ trợ thu thập, làm sạch, đối chiếu và trình bày. Không công cụ nào tự xác nhận hành vi phạm tội. Giấy phép mã nguồn và dữ liệu có thể khác nhau.</div><div class="source-grid">'+D.toolbox.map(tool=>'<article class="source-card"><div class="source-top"><span class="badge cyan">MÃ NGUỒN MỞ</span><small>'+E(tool.category.toUpperCase())+'</small></div><h3>'+E(tool.name)+'</h3><p>'+E(tool.summary)+'</p><div class="tool-use">'+E(tool.use)+'</div><footer><span>'+E(tool.license)+'</span><a href="'+E(C.safeURL(tool.url))+'" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer></article>').join('')+'</div>';
    }else{
      content.innerHTML='<div class="callout">Rà soát các tuyên bố đầu vào. “Có nguồn” xác nhận tài liệu tồn tại và nội dung được nguồn nêu; không thay thế thẩm định độc lập.</div>'+D.factchecks.map((fact,i)=>'<article class="factcheck"><header class="factcheck-header"><span class="num">'+String(i+1).padStart(2,'0')+'</span><span class="badge '+(fact.status==='verified'?'cyan':fact.status==='pending'?'pink':'gold')+'">'+(fact.status==='verified'?'ĐÃ ĐỐI CHIẾU':fact.status==='pending'?'CẦN KIỂM CHỨNG':'CÓ ĐIỀU KIỆN')+'</span></header><h3>'+E(fact.title)+'</h3><p class="verdict">'+E(fact.verdict)+'</p><p class="fact-detail">'+E(fact.detail)+'</p><footer>'+fact.source_ids.map(sourceButton).join('')+(fact.source_ids.length?'':'<span class="muted">Chưa có liên kết nguồn gốc đủ căn cứ.</span>')+'</footer></article>').join('');
    }hydrateIcons();
  }
  function toggleBookmark(id) {
    if(!validIds.has(id))return;const index=state.bookmarks.indexOf(id);
    if(index<0)state.bookmarks.push(id);else state.bookmarks.splice(index,1);saveLocal('bookmarks',state.bookmarks);refresh();
    toast(index<0?'Đã lưu địa danh trong trình duyệt này.':'Đã bỏ lưu địa danh.');
  }
  function download(name,content,mime) {
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function reportText() {
    const lines=['# Scamland · Hồ sơ nguồn mở Tam giác vàng','','Bản dữ liệu: '+D.metadata.version+' · Đối chiếu: '+D.metadata.updated,'Tác giả: Long Ngo · Vietflexmap 2026','',
      'Phạm vi: '+state.scope+' · Đến: '+C.cutoff(state,D)+' · Chủ đề: '+(D.metadata.topics[state.topic]||'Tất cả')+' · Quốc gia: '+(D.metadata.countries[state.country]||'Tất cả'),
      'Nhận định chưa có ngày: '+(state.includeUndated?'có trong bản xuất':'đã ẩn'),'',
      'Tọa độ chỉ là mốc địa danh biên tập gần đúng, không phải tọa độ cơ sở hoặc ranh giới đã kiểm định. Vòng ký hiệu không phải khoảng tin cậy. Không quy kết từ vị trí. Đồ thị không thể hiện giao dịch hay luồng tiền.',
      'Thông báo OFAC là tài liệu lịch sử; tình trạng trừng phạt hiện hành cần kiểm tra tại nguồn gốc. Ghi chú riêng và lớp nhập cục bộ không có trong bản xuất.',''];
    places.forEach(feature=>{const p=feature.properties;lines.push('## '+p.name,'',D.metadata.countries[p.country]+' · Mốc WGS84 gần đúng: '+feature.geometry.coordinates.join(', '),'',p.summary,'');
      C.activeClaims(feature,state,D).forEach(claim=>{lines.push('- '+formatDate(claim.date)+' · '+claim.text);claim.source_ids.forEach(id=>{const s=sourceMap.get(id);lines.push('  - '+s.publisher+': '+s.url+' (truy cập '+s.accessed+')');});});lines.push('');});return lines.join('\n');
  }
  function exportData(type) {
    const suffix=state.scope+'-'+state.year;
    if(type==='geojson')download('Scamland-'+suffix+'.geojson',JSON.stringify(C.toGeoJSON(D,places,state),null,2),'application/geo+json;charset=utf-8');
    if(type==='csv'){
      const rows=[['id','name','country','scope','longitude','latitude','coordinate_note','sources','claims_in_window']];
      places.forEach(feature=>{const p=feature.properties;const claims=C.activeClaims(feature,state,D);rows.push([p.id,p.name,D.metadata.countries[p.country],p.scope,...feature.geometry.coordinates,p.coordinate_note,[...new Set(claims.flatMap(c=>c.source_ids))].map(id=>sourceMap.get(id).url).join(' | '),claims.map(c=>c.text).join(' | ')]);});
      download('Scamland-'+suffix+'.csv','\uFEFF'+rows.map(row=>row.map(C.csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    }
    if(type==='report')download('Scamland-'+suffix+'.md',reportText(),'text/markdown;charset=utf-8');
    $('exportDialog').close();toast('Đã xuất '+places.length+' mốc cùng nguồn gốc trong cửa sổ tài liệu.');
  }
  function exportOfflineFromFile() {
    const clone=document.documentElement.cloneNode(true);
    ['map','graphSvg','detailContent','placeList','sourceContent','timelineFeed','timelineChart'].forEach(id=>clone.querySelector('#'+id)?.replaceChildren());
    clone.querySelectorAll('dialog[open]').forEach(dialog=>dialog.removeAttribute('open'));
    clone.querySelector('body').className='';clone.querySelector('#toast').setAttribute('hidden','');
    download('Scamland_Offline.html','<!doctype html>\n'+clone.outerHTML,'text/html;charset=utf-8');toast('Đã xuất HTML công khai; không kèm ghi chú hoặc điểm nhập.');
  }
  function renderImported() {
    localLayer.clearLayers();if(!state.showLocal)return;
    imported.forEach(feature=>{const p=feature.properties;const [lon,lat]=feature.geometry.coordinates;
      L.circleMarker([lat,lon],{radius:6,color:'#72d6e5',weight:2,fillColor:'#10333c',fillOpacity:1}).addTo(localLayer).bindPopup('<span class="local-name">'+E(p.name)+'</span><p>Điểm nhập cục bộ · chưa được Scamland xác minh.</p><p>'+E(p.summary)+'</p><a href="'+E(p.source_url)+'" target="_blank" rel="noopener noreferrer">Mở nguồn đã nhập ↗</a>',{className:'map-popup'});
    });
  }
  function originalPoints() {
    const words=C.normalize(state.originalQuery).split(/\s+/).filter(Boolean);
    return D.userMap.features.filter(f=>words.every(w=>C.normalize(f.properties.name+' '+f.properties.description_text).includes(w)));
  }
  function originalPopup(feature) {
    const p=feature.properties;
    return '<span class="local-name">'+E(p.name)+'</span><p>Địa danh trong bản đồ gốc · chưa thẩm định.</p><p>'+E(p.description_text).replace(/\n/g,'<br>')+'</p>'+p.links.map(url=>'<a href="'+E(C.safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+E(new URL(url).hostname)+' ↗</a>').join('<br>');
  }
  function renderOriginal() {
    if(!originalLayer)return;originalLayer.clearLayers();
    const features=originalPoints();
    $('originalCount').textContent=D.userMap.features.length;
    $('originalList').innerHTML=features.map(f=>'<button class="original-item" data-original="'+E(f.properties.id)+'">'+E(f.properties.name)+'</button>').join('') || '<p>Chưa có mốc phù hợp.</p>';
    if(!state.showOriginal)return;
    features.forEach(feature=>{const [lon,lat]=feature.geometry.coordinates;
      const marker=L.circleMarker([lat,lon],{radius:5,color:'#72d6e5',fillColor:'#0f3039',fillOpacity:.85,weight:1.5}).addTo(originalLayer);
      marker.bindTooltip(E(feature.properties.name));marker.bindPopup(originalPopup(feature),{className:'map-popup',maxWidth:320});
      marker.on('click',()=>openOriginal(feature.properties.id,false));
    });
  }
  function fitOriginal() {
    const features=originalPoints();if(!features.length)return;
    state.showOriginal=true;$('showOriginal').checked=true;renderOriginal();showView('map');
    map.fitBounds(L.latLngBounds(features.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]])),{padding:[60,60],maxZoom:15,animate:!reducedMotion});
  }
  function openOriginal(id,zoom=true) {
    const feature=D.userMap.features.find(f=>f.properties.id===id);if(!feature)return;
    const p=feature.properties;const [lon,lat]=feature.geometry.coordinates;
    $('detail').classList.remove('source-open');document.body.classList.remove('detail-closed','filters-open');document.body.classList.add('detail-open');
    $('detailContent').innerHTML='<div class="profile-top"><span class="badge cyan">BẢN ĐỒ GỐC · ĐỊA DANH</span></div><h2 class="profile-title">'+E(p.name)+'</h2><p class="coordinate-warning">Tên và tọa độ giữ nguyên từ snapshot My Maps. Không tự xác nhận hoạt động lừa đảo tại địa danh này.</p><dl class="profile-meta"><div><dt>WGS84 · tọa độ gốc</dt><dd>'+lat.toFixed(7)+'°N · '+lon.toFixed(7)+'°E</dd></div><div><dt>Ngày chụp dữ liệu</dt><dd>'+formatDate(D.userMap.metadata.retrieved)+'</dd></div></dl><h3 class="section-label">Mô tả gốc</h3><p class="profile-description original-description">'+E(p.description_text || 'Mốc này chưa có mô tả trong bản đồ gốc.')+'</p><h3 class="section-label">Liên kết trong mô tả</h3>'+p.links.map(url=>'<p><a class="original-link" href="'+E(C.safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+E(url)+' ↗</a></p>').join('')+'<p class="coordinate-warning">Các liên kết mô tả được giữ làm đầu mối; nội dung chưa được thẩm định riêng.</p><a class="btn primary" href="'+E(p.source_url)+'" target="_blank" rel="noopener noreferrer">Mở bản đồ gốc ↗</a>';
    if(zoom){showView('map');map.setView([lat,lon],16,{animate:!reducedMotion});}
  }
  async function importFile(file) {
    $('importError').hidden=true;if(!file)return;
    try{
      if(file.size>1024*1024)throw new Error('File vượt giới hạn 1 MB.');
      const input=JSON.parse(await file.text());const features=C.validateImport(input);
      imported=features;renderImported();$('importDialog').close();showView('map');
      map.fitBounds(L.latLngBounds(imported.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]])),{padding:[70,70],maxZoom:12});
      toast('Đã nhập '+features.length+' điểm riêng trong phiên. Dữ liệu công khai không thay đổi.');
    }catch(error){$('importError').textContent=error instanceof SyntaxError?'Không đọc được JSON hợp lệ.':error.message;$('importError').hidden=false;}
    finally{$('importFile').value='';}
  }
  function stopPlaying() {clearInterval(playTimer);playTimer=null;$('playTimeline').setAttribute('aria-pressed','false');$('playTimeline').setAttribute('aria-label','Chạy qua các năm');$('playTimeline').innerHTML=icon('play');}
  function playTimeline() {
    if(playTimer){stopPlaying();return;}if(state.year>=2026)state.year=2018;refresh();
    $('playTimeline').setAttribute('aria-pressed','true');$('playTimeline').setAttribute('aria-label','Dừng chuyển năm');$('playTimeline').innerHTML=icon('pause');
    playTimer=setInterval(()=>{state.year++;refresh();if(state.year>=2026)stopPlaying();},1400);
  }
  function openDialog(id) {$(id).showModal();}
  function handleNode(id) {
    const node=graph.nodes.find(n=>n.id===id);if(!node)return;
    if(node.source_id)renderSource(node.source_id);else if(node.place_id)selectPlace(node.place_id,false);
    else{
      const edges=graph.edges.filter(e=>e.source===id||e.target===id);const ids=[...new Set(edges.flatMap(e=>e.source_ids))];
      document.body.classList.remove('detail-closed');document.body.classList.add('detail-open');
      $('detailContent').innerHTML='<div class="profile-top"><span class="badge cyan">'+(node.type==='person'?'CÁ NHÂN TRONG TÀI LIỆU':'TỔ CHỨC TRONG TÀI LIỆU')+'</span></div><h2 class="profile-title">'+E(node.label)+'</h2><p class="coordinate-warning">Quan hệ dưới đây được nguồn công khai nêu tại ngày tài liệu; không xác nhận tình trạng hiện hành.</p>'+edges.map(e=>'<article class="evidence-card"><header>'+formatDate(e.date)+'</header><p>'+E(e.label)+'</p><div class="evidence-links">'+e.source_ids.map(sourceButton).join('')+'</div></article>').join('')+'<h3 class="section-label">Nguồn liên quan</h3><div class="evidence-links">'+ids.map(sourceButton).join('')+'</div>';
    }
  }
  async function shareView() {
    const hash=shareHash();const url=location.href.split('#')[0]+hash;
    try{history.replaceState(null,'',hash);}catch(_){/* Sharing remains available even if file:// history is restricted. */}
    try{await navigator.clipboard.writeText(url);toast('Đã sao chép góc nhìn. Không chứa ghi chú hay dữ liệu nhập cục bộ.');}
    catch(_){const input=document.createElement('textarea');input.value=url;input.style.position='fixed';input.style.left='-9999px';document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();toast(copied?'Đã sao chép góc nhìn.':'Góc nhìn đã cập nhật trên thanh địa chỉ; sao chép URL để chia sẻ.');}
  }
  function bindEvents() {
    document.addEventListener('click',event=>{
      const button=event.target.closest('button,a,[data-node],[data-edge]');if(!button)return;
      if(button.dataset.view){showView(button.dataset.view);return;}
      if(button.dataset.scope){state.scope=button.dataset.scope;refresh({fit:true});return;}
      if(button.dataset.topic!==undefined){state.topic=button.dataset.topic;refresh();return;}
      if(button.dataset.place){selectPlace(button.dataset.place);return;}
      if(button.dataset.original){openOriginal(button.dataset.original);return;}
      if(button.dataset.focus){showView('map');selectPlace(button.dataset.focus);return;}
      if(button.dataset.bookmark){toggleBookmark(button.dataset.bookmark);return;}
      if(button.dataset.source){renderSource(button.dataset.source);return;}
      if(button.dataset.sourceTab){state.sourceTab=button.dataset.sourceTab;renderSources();return;}
      if(button.dataset.close){$(button.dataset.close).close();return;}
      if(button.dataset.export){exportData(button.dataset.export);return;}
      if(button.dataset.year){stopPlaying();state.year=Number(button.dataset.year);refresh();return;}
      if(button.dataset.edge){activeEdge=graph.edges.find(edge=>edge.id===button.dataset.edge);if(activeEdge){renderEdge(activeEdge);renderGraph();}return;}
      if(button.dataset.node){if(suppressNodeClick){suppressNodeClick=false;return;}handleNode(button.dataset.node);return;}
      if(button.dataset.returnProfile){$('detail').classList.remove('source-open');renderPlace(state.selectedId);return;}
      if(button.dataset.note){notes[button.dataset.note]=$('noteInput').value.slice(0,5000);if(saveLocal('notes',notes))toast('Ghi chú đã lưu trong trình duyệt này.');return;}
      if(button.matches('[data-offline]') && window.__SCAMLAND_OFFLINE__){event.preventDefault();exportOfflineFromFile();return;}
      switch(button.id){
        case 'methodBtn':openDialog('methodDialog');break;
        case 'exportBtn':$('exportSummary').textContent='Xuất '+places.length+' mốc đang lọc và nhận định đến '+formatDate(C.cutoff(state,D))+'.';openDialog('exportDialog');break;
        case 'importBtn':openDialog('importDialog');break;
        case 'chooseImport':$('importFile').click();break;
        case 'filterBtn':document.body.classList.toggle('filters-open');break;
        case 'closeFilters':document.body.classList.remove('filters-open');break;
        case 'closeDetail':document.body.classList.remove('detail-open');if(window.innerWidth>720){document.body.classList.add('detail-closed');requestAnimationFrame(()=>map.invalidateSize());}break;
        case 'shareBtn':shareView();break;
        case 'resetBtn':stopPlaying();Object.assign(state,{scope:'core',year:2026,country:'',topic:'',level:'all',query:'',includeUndated:true,bookmarksOnly:false,selectedId:'gtsez'});graphPositions={};activeEdge=null;refresh({fit:true});toast('Đã đặt lại bộ lọc.');break;
        case 'zoomIn':map.zoomIn();break;
        case 'zoomOut':map.zoomOut();break;
        case 'fitBtn':fitPlaces();break;
        case 'atlasBtn':setBase('atlas');break;
        case 'osmBtn':setBase('osm');break;
        case 'googleBtn':setBase('google');break;
        case 'fitOriginal':fitOriginal();break;
        case 'impactFit':fitInfluence();break;
        case 'layerBtn':$('layerOptions').hidden=!$('layerOptions').hidden;button.setAttribute('aria-expanded',String(!$('layerOptions').hidden));if(!$('layerOptions').hidden)$('influencePanel').open=false;break;
        case 'clearImport':imported=[];renderImported();toast('Đã xóa lớp nhập cục bộ khỏi phiên.');break;
        case 'measureBtn':measureActive=!measureActive;measurePoints=[];measureLayer.clearLayers();$('map').classList.toggle('measure-cursor',measureActive);button.classList.toggle('active',measureActive);button.setAttribute('aria-pressed',String(measureActive));message(measureActive?'Chọn hai điểm trên bản đồ để đo khoảng cách.':'');break;
        case 'playTimeline':playTimeline();break;
        case 'timelineOpen':showView('timeline');break;
        case 'resetGraph':graphPositions={};renderGraph();break;
      }
    });
    $('countryFilter').addEventListener('change',event=>{state.country=event.target.value;refresh({fit:true});});
    $('levelFilter').addEventListener('change',event=>{state.level=event.target.value;refresh();});
    $('includeUndated').addEventListener('change',event=>{state.includeUndated=event.target.checked;refresh();});
    $('bookmarksOnly').addEventListener('change',event=>{state.bookmarksOnly=event.target.checked;refresh();});
    $('placeSearch').addEventListener('input',event=>{state.query=event.target.value;refresh();});
    $('yearSlider').addEventListener('input',event=>{stopPlaying();state.year=Number(event.target.value);refresh();});
    $('sourceSearch').addEventListener('input',event=>{state.sourceQuery=event.target.value;renderSources();});
    $('sourceCategory').addEventListener('change',event=>{state.sourceCategory=event.target.value;renderSources();});
    $('importFile').addEventListener('change',event=>importFile(event.target.files[0]));
    $('originalSearch').addEventListener('input',event=>{state.originalQuery=event.target.value;renderOriginal();});
    $('showOriginal').addEventListener('change',event=>{state.showOriginal=event.target.checked;renderOriginal();});
    [['impactPoint','impactPoint'],['impactRed','impactRed'],['impactOrange','impactOrange'],['impactYellow','impactYellow']].forEach(([id,key])=>{
      $(id).addEventListener('change',event=>{state[key]=event.target.checked;renderInfluence();});
    });
    $('influencePanel').addEventListener('toggle',()=>{if($('influencePanel').open){$('layerOptions').hidden=true;$('layerBtn').setAttribute('aria-expanded','false');}});
    [['showContext','showContext'],['showRadii','showRadii'],['showLabels','showLabels'],['showLocal','showLocal']].forEach(([id,key])=>$(id).addEventListener('change',event=>{state[key]=event.target.checked;renderBackground();renderMarkers();renderImported();}));
    document.addEventListener('keydown',event=>{
      if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();if(state.view==='sources')$('sourceSearch').focus();else{document.body.classList.add('filters-open');$('placeSearch').focus();}}
      if(event.key==='Escape'){document.body.classList.remove('filters-open','detail-open');$('layerOptions').hidden=true;$('layerBtn').setAttribute('aria-expanded','false');if(measureActive){measureActive=false;measurePoints=[];measureLayer.clearLayers();$('measureBtn').classList.remove('active');$('measureBtn').setAttribute('aria-pressed','false');$('map').classList.remove('measure-cursor');message('');}}
      const el=event.target.closest('[data-edge],[data-node]');if(el&&['Enter',' '].includes(event.key)){event.preventDefault();if(el.dataset.edge){activeEdge=graph.edges.find(e=>e.id===el.dataset.edge);if(activeEdge){renderEdge(activeEdge);renderGraph();}}else handleNode(el.dataset.node);}
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlaying();});
    const svg=$('graphSvg');
    svg.addEventListener('pointerdown',event=>{const el=event.target.closest('[data-node]');if(!el||event.button!==0)return;dragNode=el.dataset.node;dragMoved=false;svg.setPointerCapture(event.pointerId);});
    svg.addEventListener('pointermove',event=>{if(!dragNode)return;const matrix=svg.getScreenCTM();if(!matrix)return;const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const transformed=point.matrixTransform(matrix.inverse());const p=graphPositions[dragNode];if(Math.hypot(p.x-transformed.x,p.y-transformed.y)>3)dragMoved=true;if(dragMoved){const h=Number(svg.getAttribute('viewBox').split(' ')[3]);graphPositions[dragNode]={x:Math.max(90,Math.min(790,transformed.x)),y:Math.max(55,Math.min(h-55,transformed.y))};updateGraphPositions();}});
    svg.addEventListener('pointerup',event=>{if(dragNode){suppressNodeClick=dragMoved;dragNode=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);}});
    svg.addEventListener('pointercancel',()=>{dragNode=null;});
    window.addEventListener('hashchange',()=>{restoreHash();refresh();showView(state.view);});
    window.addEventListener('resize',()=>{if(state.view==='map')map.invalidateSize();});
  }
  function start() {
    const errors=C.validateCatalog(D);
    if(errors.length)throw new Error('Catalog contract failed: '+errors.join('; '));
    restoreHash();const initialView=state.view;initMap();bindEvents();refresh();fitInfluence();showView(initialView);hydrateIcons();
    $('metricSources').textContent=D.sources.length;
    $('resourceSummary').textContent=D.sources.length+' nguồn biên tập · '+D.toolbox.length+' kho công cụ · '+D.factchecks.length+' tuyên bố được rà soát';
    if(window.__SCAMLAND_OFFLINE__)$('exportDialog').querySelector('[data-offline]')?.setAttribute('href','#');
  }
  try{start();}
  catch(error){console.error('Scamland startup failed:',error);$('detailContent').innerHTML='<div class="error">Không khởi tạo được atlas. Mở Console để xem chi tiết; các file dữ liệu và tài liệu phương pháp vẫn có trong mã nguồn.</div>';toast('Không khởi tạo được atlas. Kiểm tra các file tài nguyên cục bộ.');}
})();
