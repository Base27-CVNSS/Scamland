import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
execFileSync(process.env.PYTHON || 'python3',[path.join(root,'scripts/kmz.py')],{stdio:'inherit'});
const data={};
for(const [key,file] of Object.entries({metadata:'metadata.json',places:'places.geojson',sources:'sources.json',relations:'relations.json',factchecks:'factchecks.json',toolbox:'toolbox.json',context:'context.geojson',userMap:'user-map.geojson'}))data[key]=JSON.parse(read('data/'+file));
const require=createRequire(import.meta.url);const core=require('../assets/core.js');
const errors=core.validateCatalog(data);if(errors.length)throw new Error(errors.join('\n'));
const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
fs.writeFileSync(path.join(root,'data/bundle.js'),'window.ScamlandData = '+json+';\n');
let html=read('index.html');
// Release queries refresh the online assets; offline files embed the same bytes.
html=html.replace(/(href|src)="(assets\/[^"?]+)\?v=[^"]*"/g,'$1="$2"');
for(const file of ['vendor/vietflex.css','assets/style.css','assets/map-focus.css']){
 let css=read(file);
 if(file==='vendor/vietflex.css')for(const name of ['layers.svg','marker-icon.svg'])css=css.replaceAll('url(images/'+name+')','url(data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'vendor/images',name)).toString('base64')+')');
 const style='<style>\n'+css+'\n</style>';
 html=file==='vendor/vietflex.css'
  ?html.replace(/<link\b[^>]*\bid="vietflexStyle"[^>]*>/,()=>style)
  :html.replace('<link rel="stylesheet" href="'+file+'">',()=>style);
}
html=html.replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">','<link rel="icon" href="data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets/favicon.svg')).toString('base64')+'" type="image/svg+xml">');
html=html.replace('<script src="assets/vietflex-loader.js"></script>','');
for(const file of ['vendor/vietflex.js','data/bundle.js','assets/core.js','assets/app.js']){
 const script='<script>\n'+(file==='vendor/vietflex.js'?'window.__SCAMLAND_OFFLINE__=true;\n':'')+read(file).replace(/<\/script/gi,'<\\/script').replace(/\/\/# sourceMappingURL=.*$/gm,'')+'\n</script>';
 html=file==='vendor/vietflex.js'
  ?html.replace(/<script\b[^>]*\bid="vietflexSdk"[^>]*><\/script>/,()=>script)
  :html.replace('<script src="'+file+'"></script>',()=>script);
}
for(const ext of ['kml','kmz'])html=html.replace('href="downloads/Scamland_Updated.'+ext+'"','href="data:application/vnd.google-earth.'+(ext==='kml'?'kml+xml':'kmz')+';base64,'+fs.readFileSync(path.join(root,'downloads/Scamland_Updated.'+ext)).toString('base64')+'"');
html=html.replace('href="docs/METHODOLOGY.md"','href="https://github.com/Base27-CVNSS/Scamland/blob/main/docs/METHODOLOGY.md"').replace('href="LICENSE"','href="https://github.com/Base27-CVNSS/Scamland/blob/main/LICENSE"');
html=html.replace('href="tools/KML_Workbench.html"','href="https://base27-cvnss.github.io/Scamland/tools/KML_Workbench.html"');
fs.writeFileSync(path.join(root,'Scamland_Offline.html'),html);
fs.writeFileSync(path.join(root,'.nojekyll'),'');
console.log('Built bundle, offline HTML, KML and KMZ. No dependencies or build-time network.');
