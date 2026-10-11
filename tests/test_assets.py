import unittest
import re
import base64
import hashlib
from html.parser import HTMLParser
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.resources = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script' and attrs.get('src'):
            self.resources.append(attrs['src'])
        if tag == 'link' and attrs.get('href'):
            self.resources.append(attrs['href'])

class AssetTests(unittest.TestCase):
    def test_app_targets_and_served_resources_exist(self):
        page = Page()
        page.feed((ROOT / 'index.html').read_text())
        self.assertEqual(len(page.ids), len(set(page.ids)))
        targets = set(re.findall(r"\$\('([^']+)'\)", (ROOT / 'assets/app.js').read_text()))
        targets.discard('noteInput')  # Profile-created textarea.
        self.assertTrue(targets.issubset(set(page.ids)), targets - set(page.ids))
        for resource in page.resources:
            if resource.startswith('https://'):
                prefix = 'https://cdn.jsdelivr.net/gh/Vietflexmap/VN@6144d565fcf236727577ab3c4471bbe49f86892f/dist/'
                self.assertTrue(resource.startswith(prefix), resource)
                self.assertIn(resource.removeprefix(prefix), ['vietflex.css', 'vietflex.js'])
            else:
                self.assertTrue((ROOT / resource).is_file(), resource)
        advanced = Page()
        advanced.feed((ROOT / 'tools/KML_Workbench.html').read_text())
        for resource in advanced.resources:
            if not resource.startswith('https:'):
                self.assertTrue((ROOT / 'tools' / resource).is_file(), resource)

    def test_offline_scripts_styles_images_and_downloads_embedded(self):
        html = (ROOT / 'Scamland_Offline.html').read_text()
        page = Page()
        page.feed(html)
        self.assertTrue(all(x.startswith('data:') for x in page.resources))
        self.assertIn('window.__SCAMLAND_OFFLINE__=true', html)
        self.assertIn('"original_placemarks":87', html)
        self.assertIn('data:application/vnd.google-earth.kmz;base64,', html)
        self.assertNotIn('url(images/', html)

    def test_cdn_integrity_matches_retained_sdk(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        for name, element in [('vietflex.css', 'link'), ('vietflex.js', 'script')]:
            digest = base64.b64encode(hashlib.sha384((ROOT / 'vendor' / name).read_bytes()).digest()).decode()
            tag = next(tag for tag in re.findall(r'<' + element + r'\b[^>]*>', html) if name in tag)
            self.assertIn('integrity="sha384-' + digest + '"', tag)
            self.assertIn('crossorigin="anonymous"', tag)

if __name__ == '__main__':
    unittest.main()
