#!/usr/bin/env python3
"""Reproducible KML/KMZ update from a retained public My Maps snapshot.

No network requests, zip extraction, geometry guessing or source HTML execution.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from html.parser import HTMLParser
from urllib.parse import urlsplit
import copy
import hashlib
import html
import json
import math
import re

ROOT = Path(__file__).resolve().parents[1]
NS = 'http://www.opengis.net/kml/2.2'
ET.register_namespace('', NS)
N = {'k': NS}
MAP_ID = '1mrbCu6ITwNhJQi6FenDrKBWftMOEeiA'
VIEW_URL = 'https://www.google.com/maps/d/viewer?mid=' + MAP_ID
KML_URL = 'https://www.google.com/maps/d/u/0/kml?mid=' + MAP_ID
REPO = 'https://github.com/Base27-CVNSS/Scamland'
WEB = 'https://base27-cvnss.github.io/Scamland/'


def parse_xml(raw):
    if len(raw) > 10_000_000 or re.search(br'<!\s*(?:DOCTYPE|ENTITY)', raw, re.I):
        raise ValueError('KML oversized or contains a DTD/entity declaration')
    root = ET.fromstring(raw)
    if root.tag != '{' + NS + '}kml':
        raise ValueError('Expected KML 2.2 namespace')
    return root


def read_link_kmz(path):
    with ZipFile(path) as z:
        if len(z.infolist()) > 100:
            raise ValueError('Too many archive members')
        info = z.getinfo('doc.kml')
        if info.file_size > 1_000_000:
            raise ValueError('Link KML oversized')
        return z.read('doc.kml')


def valid_url(value):
    u = urlsplit(value)
    return u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password and len(value) <= 2048


class Description(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.links = []
        self.suppressed = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.suppressed += 1
        if tag in ('br', 'p', 'div'):
            self.parts.append('\n')
        if tag == 'a':
            for key, value in attrs:
                if key == 'href' and value and valid_url(value):
                    self.links.append(value)

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.suppressed = max(0, self.suppressed - 1)
        if tag in ('p', 'div'):
            self.parts.append('\n')

    def handle_data(self, value):
        if not self.suppressed:
            self.parts.append(value)
            for match in re.findall(r'https://[^\s<>"\x27]+', value):
                match = match.rstrip('.,)')
                if valid_url(match):
                    self.links.append(match)


def snapshot_features(root):
    out = []
    folder_names = {}
    for folder in root.findall('.//k:Folder', N):
        for pm in folder.findall('k:Placemark', N):
            folder_names[id(pm)] = folder.findtext('k:name', '', N)
    for i, pm in enumerate(root.findall('.//k:Placemark', N)):
        if len(pm.findall('k:Point', N)) != 1 or any(pm.find('k:' + t, N) is not None for t in ('LineString', 'Polygon', 'MultiGeometry')):
            raise ValueError('Snapshot contains unsupported geometry; do not silently drop it')
        raw = pm.findtext('k:Point/k:coordinates', '', N).strip()
        if len(raw.split()) != 1:
            raise ValueError('Point must contain one coordinate tuple')
        coords = [float(x) for x in raw.split(',')]
        if len(coords) not in (2, 3) or not all(math.isfinite(x) for x in coords) or not -180 <= coords[0] <= 180 or not -90 <= coords[1] <= 90:
            raise ValueError('Invalid WGS84 coordinate')
        desc = Description()
        desc.feed(pm.findtext('k:description', '', N))
        out.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': coords[:2]}, 'properties': {
            'id': 'mymaps-' + str(i + 1).zfill(3), 'name': pm.findtext('k:name', '', N),
            'folder': folder_names.get(id(pm), ''), 'description_text': ''.join(desc.parts).strip(),
            'links': list(dict.fromkeys(desc.links)), 'source_url': VIEW_URL, 'date': None,
            'altitude_m_original': coords[2] if len(coords) == 3 else None,
            'status': 'unreviewed_geographic_context', 'position_basis': 'user_map_snapshot',
            'coordinate_note': 'Tọa độ giữ nguyên từ snapshot My Maps; chưa kiểm định độc lập.'
        }})
    if not out or len(out) > 10_000:
        raise ValueError('Unexpected snapshot size')
    return out


def add(parent, tag, value=None, **attrs):
    el = ET.SubElement(parent, '{' + NS + '}' + tag, attrs)
    if value is not None:
        el.text = str(value)
    return el


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def build():
    original = ROOT / 'data/original'
    raw_snapshot = (original / 'MyMaps.kml').read_bytes()
    raw_kmz = (original / 'source.kmz').read_bytes()
    link_raw = read_link_kmz(original / 'source.kmz')
    root = parse_xml(raw_snapshot)
    link_root = parse_xml(link_raw)
    links = link_root.findall('.//k:NetworkLink', N)
    if len(links) != 1 or links[0].findtext('k:Link/k:href', '', N) != KML_URL:
        raise ValueError('Unexpected original NetworkLink')
    meta = json.loads((ROOT / 'data/metadata.json').read_text())
    integration = json.loads((ROOT / 'data/integration.json').read_text())
    features = snapshot_features(root)
    provenance = {'retrieved': meta['updated'], 'source_url': VIEW_URL, 'kml_url': KML_URL + '&forcekml=1',
                  'original_networklink_url': KML_URL, 'original_placemarks': len(features),
                  'snapshot_sha256': sha(raw_snapshot), 'uploaded_kmz_sha256': sha(raw_kmz),
                  'coordinate_policy': 'Original coordinates retained. Precision is not verified accuracy.',
                  'limitations': 'Public map snapshot; names, coordinates and linked news are not independent findings of wrongdoing.',
                  'crs': 'EPSG:4326', 'repository': REPO}
    write_json(ROOT / 'data/user-map.geojson', {'type': 'FeatureCollection', 'metadata': provenance, 'features': features})
    write_json(original / 'provenance.json', provenance)
    # Preserve snapshot styles, Folder, names, geometry and original descriptions.
    doc = root.find('k:Document', N)
    if doc is None:
        raise ValueError('Missing Document')
    doc.find('k:name', N).text = 'Scamland · Golden Triangle · bản đồ gốc + OSINT'
    old_description = doc.find('k:description', N)
    old_description.text = (old_description.text or '') + '<br><br>' + (
        '<b>Bổ sung Scamland, ' + meta['updated'] + '</b><br>87 mốc gốc giữ nguyên; 8 mốc OSINT riêng, tọa độ chỉ báo.'
        '<br>Các địa danh gốc không tự xác nhận hành vi phạm tội.'
        '<br><a href="' + REPO + '">Mã nguồn Scamland</a> · <a href="' + WEB + '">WebGIS</a>'
        '<br><a href="' + integration['html_example'] + '">Mẫu HTML Vietflex · ZoomControl và AttributionControl</a>'
    )
    document_data = add(doc, 'ExtendedData')
    for key in ('library', 'commit', 'repository', 'webgis', 'html_example', 'kmz_html_path', 'css_cdn', 'js_cdn'):
        add(add(document_data, 'Data', name='integration_' + key), 'value', integration[key])
    link_folder = add(doc, 'Folder')
    add(link_folder, 'name', 'NetworkLink gốc · tắt mặc định để tránh trùng snapshot')
    add(link_folder, 'visibility', 0)
    link_copy = copy.deepcopy(links[0])
    add(link_copy, 'visibility', 0)
    link_folder.append(link_copy)
    folders = {}
    for scope, label in [('core', 'Scamland · OSINT Tam giác vàng & Shan lân cận'), ('regional', 'Scamland · tham chiếu ngoài Tam giác vàng')]:
        folder = add(doc, 'Folder')
        add(folder, 'name', label)
        add(folder, 'visibility', 1 if scope == 'core' else 0)
        add(folder, 'description', 'Mốc địa danh gần đúng; đọc tài liệu và ngày nguồn. Không phải ranh giới cơ sở hay kết luận pháp lý.')
        folders[scope] = folder
    places = json.loads((ROOT / 'data/places.geojson').read_text())['features']
    sources = json.loads((ROOT / 'data/sources.json').read_text())
    source_map = {s['id']: s for s in sources}
    style = add(doc, 'Style', id='scamland-osint')
    icon = add(style, 'IconStyle')
    add(icon, 'color', 'ff67c1f3')
    add(icon, 'scale', 1.1)
    for f in places:
        p = f['properties']
        pm = add(folders[p['scope']], 'Placemark', id='scamland-' + p['id'])
        add(pm, 'name', p['name'])
        add(pm, 'styleUrl', '#scamland-osint')
        text = '<p>' + html.escape(p['summary']) + '</p><p>' + html.escape(p['coordinate_note']) + '</p>'
        for c in p['claims']:
            text += '<p><b>' + (c['date'] or 'Chưa có ngày') + '</b> · ' + html.escape(c['text']) + '</p>'
            for sid in c['source_ids']:
                s = source_map[sid]
                text += '<p><a href="' + html.escape(s['url'], quote=True) + '">' + html.escape(s['publisher']) + '</a></p>'
        text += '<p><a href="' + REPO + '">Scamland · mã nguồn và nguồn gốc</a></p>'
        add(pm, 'description', text)
        extended = add(pm, 'ExtendedData')
        for key, value in [('id', p['id']), ('scope', p['scope']), ('position_basis', p['position_basis']),
                           ('coordinate_note', p['coordinate_note']), ('source_urls', ' | '.join(source_map[i]['url'] for i in dict.fromkeys(i for c in p['claims'] for i in c['source_ids']))),
                           ('checked', meta['updated']), ('repository', REPO)]:
            add(add(extended, 'Data', name=key), 'value', value)
        point = add(pm, 'Point')
        add(point, 'coordinates', ','.join(str(v) for v in f['geometry']['coordinates']) + ',0')
    resources = add(doc, 'Folder')
    add(resources, 'name', 'Thư viện nguồn công khai · Scamland')
    add(resources, 'visibility', 0)
    add(resources, 'description', '<p><a href="' + REPO + '">Scamland</a> · ' + str(len(sources)) + ' nguồn</p>' + ''.join(
        '<p><a href="' + html.escape(s['url'], quote=True) + '">' + html.escape(s['title']) + '</a><br>' + html.escape(s['limitations']) + '</p>' for s in sources))
    ET.indent(root, space='  ')
    kml = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    output = ROOT / 'downloads'
    output.mkdir(exist_ok=True)
    (output / 'Scamland_Updated.kml').write_bytes(kml)
    # Fixed timestamps make repeated builds byte-for-byte identical.
    with ZipFile(output / 'Scamland_Updated.kmz', 'w') as z:
        for path, content in [('doc.kml', kml), ('original/network-link.kml', link_raw), ('metadata/provenance.json', (original / 'provenance.json').read_bytes()),
                              ('metadata/integration.json', (ROOT / 'data/integration.json').read_bytes()),
                              (integration['kmz_html_path'], (ROOT / 'examples/vietflex-map.html').read_bytes())]:
            info = ZipInfo(path, (2026, 10, 11, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, content)
    print(json.dumps({'original_points': len(features), 'added_osint_points': len(places), 'total_points': len(features) + len(places), 'sources': len(sources)}))


if __name__ == '__main__':
    build()
