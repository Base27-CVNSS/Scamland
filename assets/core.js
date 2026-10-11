/* Scamland core: deterministic, dependency-free data contracts. MIT, Long Ngo 2026. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ScamlandCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EARTH_RADIUS_M = 6371008.8;
  const IMPORT_LIMIT = 200;
  const LEVELS = ['all', 'official', 'research', 'lead', 'context'];
  const SCOPES = ['core', 'regional'];
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  /** Normalize Vietnamese text for accent-insensitive search. */
  function normalize(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
  }
  /** Escape text before putting curated or imported values into markup. */
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
  }
  /** Accept HTTPS evidence links only, without embedded credentials. */
  function safeURL(value) {
    try {
      const url = new URL(String(value));
      if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) return null;
      return url.href;
    } catch (_) { return null; }
  }
  function validDate(value) {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  function validPoint(coordinates) {
    return Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite)
      && coordinates[0] >= -180 && coordinates[0] <= 180 && coordinates[1] >= -90 && coordinates[1] <= 90;
  }
  /** Cutoffs cannot extend beyond this curated release's checked date. */
  function cutoff(filters, data) {
    const year = Math.min(2026, Math.max(2018, Number(filters.year) || 2026));
    return [year + '-12-31', data.metadata.updated].sort()[0];
  }
  function eligibleDate(date, filters, data) {
    return date ? validDate(date) && date <= cutoff(filters, data) : Boolean(filters.includeUndated);
  }
  function sourceIndex(data) { return new Map(data.sources.map(source => [source.id, source])); }
  function activeClaims(feature, filters, data) {
    const sources = sourceIndex(data);
    return feature.properties.claims.filter(claim => {
      if (!eligibleDate(claim.date, filters, data)) return false;
      if (filters.topic && !claim.topics.includes(filters.topic)) return false;
      const categories = claim.source_ids.map(id => sources.get(id)?.category);
      switch (filters.level) {
        case 'official': return categories.includes('official') && claim.status !== 'context';
        case 'research': return categories.some(category => ['journalism', 'research'].includes(category));
        case 'lead': return claim.status === 'secondary';
        case 'context': return claim.status === 'context';
        default: return true;
      }
    });
  }
  /** A topic matches eligible claims, preventing future topic leakage. O(n). */
  function filterPlaces(data, filters) {
    const words = normalize(filters.query).split(/\s+/).filter(Boolean);
    return data.places.features.filter(feature => {
      const p = feature.properties;
      if (filters.scope === 'core' && p.scope !== 'core') return false;
      if (filters.country && p.country !== filters.country) return false;
      if (filters.bookmarksOnly && !filters.bookmarks?.includes(p.id)) return false;
      const claims = activeClaims(feature, filters, data);
      if (!claims.length) return false;
      const haystack = normalize([p.name, ...p.alt_names, p.summary, data.metadata.countries[p.country], ...claims.map(c => c.text)].join(' '));
      return words.every(word => haystack.includes(word));
    });
  }
  /** Keep only dated, sourced relationships relevant to the current selection. */
  function filterGraph(data, filters, places) {
    const visibleIds = new Set(places.map(feature => feature.properties.id));
    const allowedSources = new Set(places.flatMap(feature => activeClaims(feature, filters, data).flatMap(c => c.source_ids)));
    const nodes = new Map(data.relations.nodes.map(node => [node.id, node]));
    const edges = data.relations.edges.filter(edge => {
      if (!eligibleDate(edge.date, filters, data)) return false;
      if (filters.scope === 'core' && edge.scope !== 'core') return false;
      const a = nodes.get(edge.source); const b = nodes.get(edge.target);
      return a && b && (!a.place_id || visibleIds.has(a.place_id)) && (!b.place_id || visibleIds.has(b.place_id))
        && edge.source_ids.some(id => allowedSources.has(id));
    });
    const ids = new Set(edges.flatMap(edge => [edge.source, edge.target]));
    return {nodes: data.relations.nodes.filter(node => ids.has(node.id)), edges};
  }
  function haversine(a, b) {
    if (!validPoint(a) || !validPoint(b)) throw new TypeError('Expected [longitude, latitude] coordinates.');
    const rad = degrees => degrees * Math.PI / 180;
    const dLat = rad(b[1] - a[1]); const dLon = rad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  }
  /** Reject bad imports atomically; imported records stay separate and unreviewed. */
  function validateImport(input) {
    if (!input || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) throw new Error('Cần một GeoJSON FeatureCollection.');
    if (input.features.length === 0 || input.features.length > IMPORT_LIMIT) throw new Error('Nhập từ 1 đến 200 điểm mỗi lần.');
    if (input.crs && !/CRS84|4326/.test(JSON.stringify(input.crs))) throw new Error('Chỉ nhận WGS84 / EPSG:4326 với thứ tự [kinh độ, vĩ độ].');
    return input.features.map((feature, index) => {
      if (feature?.type !== 'Feature' || feature.geometry?.type !== 'Point' || !validPoint(feature.geometry.coordinates)) {
        throw new Error('Điểm ' + (index + 1) + ': tọa độ Point phải là [kinh độ, vĩ độ] hữu hạn và trong WGS84.');
      }
      const p = feature.properties || {};
      if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 160) throw new Error('Điểm ' + (index + 1) + ': cần name dài tối đa 160 ký tự.');
      const sourceURL = safeURL(p.source_url);
      if (!sourceURL) throw new Error('Điểm ' + (index + 1) + ': cần source_url HTTPS hợp lệ.');
      if (p.date != null && !validDate(p.date)) throw new Error('Điểm ' + (index + 1) + ': date phải là YYYY-MM-DD hợp lệ hoặc null.');
      return {type: 'Feature', geometry: {type: 'Point', coordinates: [...feature.geometry.coordinates]}, properties: {
        id: 'local-' + index, name: p.name.trim(), source_url: sourceURL, date: p.date || null,
        summary: String(p.summary || '').slice(0, 1200), status: 'local_unreviewed', coordinate_note: 'Điểm do người dùng nhập; chưa được Scamland xác minh.'
      }};
    });
  }
  /** Safe RFC 4180 cells, including spreadsheet-formula neutralization. */
  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function toGeoJSON(data, places, filters) {
    return {type: 'FeatureCollection', metadata: {...data.metadata, filters: {scope: filters.scope, year: filters.year, country: filters.country, topic: filters.topic, include_undated: filters.includeUndated}, export_note: 'Tọa độ chỉ báo. Vòng tròn không phải ranh giới hay khoảng tin cậy.'},
      features: places.map(feature => ({type: 'Feature', geometry: feature.geometry, properties: {...feature.properties, claims: activeClaims(feature, filters, data), source_records: [...new Set(activeClaims(feature, filters, data).flatMap(c => c.source_ids))].map(id => data.sources.find(s => s.id === id))}}))};
  }
  function validateCatalog(data) {
    const errors = []; const sources = sourceIndex(data); const ids = new Set(); const claimIds = new Set();
    if (!validDate(data.metadata.updated) || data.metadata.crs !== 'EPSG:4326') errors.push('Release date or CRS invalid.');
    if (sources.size !== data.sources.length) errors.push('Duplicate source IDs.');
    for (const s of data.sources) {
      if (!safeURL(s.url) || !validDate(s.accessed) || (s.published && (!validDate(s.published) || s.published > data.metadata.updated))) errors.push('Source invalid: ' + s.id);
    }
    for (const feature of data.places.features) {
      const p = feature.properties;
      if (ids.has(p.id)) errors.push('Duplicate place: ' + p.id); ids.add(p.id);
      if (feature.geometry.type !== 'Point' || !validPoint(feature.geometry.coordinates)) errors.push('Geometry invalid: ' + p.id);
      if (!SCOPES.includes(p.scope) || !p.coordinate_note || p.position_basis !== 'analyst_approximation' || !(p.display_radius_m > 0)) errors.push('Provenance invalid: ' + p.id);
      if (!p.claims.length) errors.push('Claims missing: ' + p.id);
      for (const c of p.claims) {
        if (claimIds.has(c.id)) errors.push('Duplicate claim: ' + c.id); claimIds.add(c.id);
        if (!c.source_ids.length || c.source_ids.some(id => !sources.has(id))) errors.push('Claim source missing: ' + c.id);
        if (c.date && (!validDate(c.date) || c.date > data.metadata.updated)) errors.push('Claim date invalid: ' + c.id);
        if (c.topics.some(topic => !data.metadata.topics[topic])) errors.push('Claim topic invalid: ' + c.id);
      }
    }
    const nodeIds = new Set(data.relations.nodes.map(n => n.id));
    if (nodeIds.size !== data.relations.nodes.length) errors.push('Duplicate graph node IDs.');
    const edgeIds = new Set();
    for (const n of data.relations.nodes) {
      if ((n.place_id && !ids.has(n.place_id)) || (n.source_id && !sources.has(n.source_id))) errors.push('Node reference invalid: ' + n.id);
    }
    for (const e of data.relations.edges) {
      if (edgeIds.has(e.id)) errors.push('Duplicate edge: ' + e.id); edgeIds.add(e.id);
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target) || !e.source_ids.length || e.source_ids.some(id => !sources.has(id)) || !validDate(e.date)) errors.push('Edge reference invalid: ' + e.id);
    }
    for (const f of data.factchecks) if (f.source_ids.some(id => !sources.has(id))) errors.push('Fact-check reference invalid: ' + f.id);
    if(data.userMap){
      const originalIds=new Set();
      for(const f of data.userMap.features){
        const p=f.properties;
        if(originalIds.has(p.id)||f.geometry.type!=='Point'||!validPoint(f.geometry.coordinates)||typeof p.name!=='string'||!safeURL(p.source_url)||p.position_basis!=='user_map_snapshot'||p.status!=='unreviewed_geographic_context'||p.links.some(u=>!safeURL(u)))errors.push('Original map invalid: '+p.id);
        originalIds.add(p.id);
      }
      if(data.userMap.metadata.original_placemarks!==data.userMap.features.length)errors.push('Original map count mismatch.');
    }
    for(const tool of data.toolbox)if(!safeURL(tool.url))errors.push('Tool link invalid: '+tool.id);
    return errors;
  }
  return Object.freeze({normalize, escapeHTML, safeURL, validDate, validPoint, cutoff, eligibleDate, sourceIndex, activeClaims, filterPlaces, filterGraph, haversine, validateImport, csvCell, toGeoJSON, validateCatalog, LEVELS, IMPORT_LIMIT});
});
