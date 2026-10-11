const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../assets/core.js');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/../data/bundle.js','utf8'),sandbox);
const D=JSON.parse(JSON.stringify(sandbox.window.ScamlandData));
const filters={scope:'core',year:2026,country:'',topic:'',level:'all',query:'',includeUndated:true,bookmarksOnly:false,bookmarks:[]};
test('catalog has consistent provenance and source references',()=>assert.deepEqual(C.validateCatalog(D),[]));
test('core / regional scope contains expected places',()=>{
 assert.equal(C.filterPlaces(D,filters).length,5);
 assert.equal(C.filterPlaces(D,{...filters,scope:'regional'}).length,8);
 assert.ok(!C.filterPlaces(D,filters).some(f=>f.properties.id==='shwe-kokko'));
});
test('official, lead and context filters keep their meaning',()=>{
 const official=C.filterPlaces(D,{...filters,level:'official'});
 assert.equal(official.length,1);assert.equal(official[0].properties.id,'gtsez');
 assert.equal(C.filterPlaces(D,{...filters,level:'context'})[0].properties.id,'chiang-saen');
 assert.ok(C.filterPlaces(D,{...filters,level:'lead'}).every(f=>C.activeClaims(f,{...filters,level:'lead'},D).every(c=>c.status==='secondary')));
});
test('search is Vietnamese accent insensitive and conjunctive',()=>{
 assert.equal(C.normalize('Địa ĐIỂM'),'dia diem');
 assert.equal(C.filterPlaces(D,{...filters,query:'chiang saen'}).length,1);
 assert.equal(C.filterPlaces(D,{...filters,query:'chiang saen nonexistent'}).length,0);
});
test('date windows exclude future claims, topics and unknown dates',()=>{
 const s={...filters,year:2018,includeUndated:false};
 assert.ok(C.filterPlaces(D,s).every(f=>C.activeClaims(f,s,D).every(c=>c.date&&c.date<='2018-12-31')));
 assert.equal(C.filterPlaces(D,{...s,topic:'methods'}).length,0);
 assert.equal(C.cutoff({...filters,year:2030},D),'2026-10-11');
 assert.equal(C.validDate('2024-02-29'),true);assert.equal(C.validDate('2025-02-29'),false);
});
test('graph retains sourced organization relations, hides regional and future relations',()=>{
 const p=C.filterPlaces(D,filters),g=C.filterGraph(D,filters,p);
 assert.ok(g.edges.some(e=>e.source==='zhao-wei'||e.target==='zhao-wei'));
 assert.ok(g.edges.every(e=>e.scope==='core'));
 const early={...filters,year:2018,includeUndated:false};
 assert.ok(C.filterGraph(D,early,C.filterPlaces(D,early)).edges.every(e=>e.date<='2018-12-31'));
 const thailand={...filters,country:'THA'};
 assert.equal(C.filterGraph(D,thailand,C.filterPlaces(D,thailand)).edges.length,0);
});
test('spherical distance and WGS84 range reject bad coordinates',()=>{
 assert.equal(C.haversine([100,20],[100,20]),0);
 assert.ok(Math.abs(C.haversine([0,0],[1,0])-111195.08)<1);
 for(const xy of [[181,0],[0,91],[NaN,0],[0,Infinity],[1,2,3]])assert.equal(C.validPoint(xy),false);
 assert.throws(()=>C.haversine([181,0],[0,0]),TypeError);
});
const feature={type:'Feature',geometry:{type:'Point',coordinates:[100,20]},properties:{name:'Mốc',source_url:'https://example.org/report',date:null}};
const imported=f=>({type:'FeatureCollection',features:f});
test('import is atomic, never elevates source claims, rejects malformed coordinates',()=>{
 const input=structuredClone(feature);input.properties.status='verified';
 assert.equal(C.validateImport(imported([input]))[0].properties.status,'local_unreviewed');
 const invalid=structuredClone(feature);invalid.geometry.coordinates=[100,95];
 assert.throws(()=>C.validateImport(imported([feature,invalid])));
 assert.throws(()=>C.validateImport(imported(Array(201).fill(feature))));
});
test('links, HTML and CSV prevent active content and spreadsheet formulas',()=>{
 for(const u of ['javascript:alert(1)','http://example.org','https://name:pass@example.org','data:text/html,a'])assert.equal(C.safeURL(u),null);
 assert.equal(C.escapeHTML('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
 assert.equal(C.csvCell(' =SUM(A1)'),'"\' =SUM(A1)"');assert.equal(C.csvCell('a"b'),'"a""b"');
 const invalid=structuredClone(feature);invalid.properties.source_url='javascript:alert(1)';assert.throws(()=>C.validateImport(imported([invalid])));
});
test('export embeds sources and only eligible claims, excludes local notes',()=>{
 const s={...filters,year:2018,includeUndated:false};const exported=C.toGeoJSON(D,C.filterPlaces(D,s),s);
 for(const f of exported.features){assert.ok(f.properties.source_records.length);assert.ok(f.properties.claims.every(c=>c.date<='2018-12-31'));assert.equal(f.properties.notes,undefined);}
});
test('original layer is an unchanged-coordinate, neutral snapshot with 87 points',()=>{
 assert.equal(D.userMap.features.length,87);
 const casino=D.userMap.features.find(f=>f.properties.name.includes('Kings Romans Casino'));
 assert.deepEqual(casino.geometry.coordinates,[100.0968168,20.3401443]);
 assert.ok(D.userMap.features.every(f=>f.properties.position_basis==='user_map_snapshot'&&f.properties.status==='unreviewed_geographic_context'));
});
