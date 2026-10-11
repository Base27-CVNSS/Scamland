import unittest
import re
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

if __name__ == '__main__':
    unittest.main()
