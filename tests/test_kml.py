import sys
import unittest
import hashlib
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import kmz

class KMLTests(unittest.TestCase):
    def test_round_trip_preserves_all_original_placemarks(self):
        before = kmz.parse_xml((kmz.ROOT / 'data/original/MyMaps.kml').read_bytes())
        after = kmz.parse_xml((kmz.ROOT / 'downloads/Scamland_Updated.kml').read_bytes())
        original = before.findall('.//k:Placemark', kmz.N)
        updated = after.findall('.//k:Placemark', kmz.N)
        self.assertEqual(len(original), 87)
        self.assertEqual(len(updated), 95)
        # Attributes and every original text, geometry, name, description and style reference.
        def canonical(node):
            return (node.tag, node.attrib, (node.text or '').strip(), [canonical(x) for x in node])
        self.assertEqual([canonical(x) for x in original], [canonical(x) for x in updated[:87]])

    def test_kmz_doc_and_original_link_retained(self):
        with ZipFile(kmz.ROOT / 'downloads/Scamland_Updated.kmz') as z:
            self.assertIsNone(z.testzip())
            self.assertEqual(z.read('doc.kml'), (kmz.ROOT / 'downloads/Scamland_Updated.kml').read_bytes())
            self.assertEqual(z.read('original/network-link.kml'), kmz.read_link_kmz(kmz.ROOT / 'data/original/source.kmz'))
            r = kmz.parse_xml(z.read('doc.kml'))
            links = r.findall('.//k:NetworkLink', kmz.N)
            self.assertEqual(len(links), 1)
            self.assertEqual(links[0].findtext('k:Link/k:href', '', kmz.N), kmz.KML_URL)
            self.assertEqual(links[0].findtext('k:visibility', '', kmz.N), '0')

    def test_reproducible_archive(self):
        p = kmz.ROOT / 'downloads/Scamland_Updated.kmz'
        digest = hashlib.sha256(p.read_bytes()).digest()
        kmz.build()
        self.assertEqual(hashlib.sha256(p.read_bytes()).digest(), digest)

    def test_vietflex_example_and_integration_are_in_updated_kmz(self):
        import json
        integration = json.loads((kmz.ROOT / 'data/integration.json').read_text())
        with ZipFile(kmz.ROOT / 'downloads/Scamland_Updated.kmz') as z:
            self.assertEqual(z.read(integration['kmz_html_path']), (kmz.ROOT / 'examples/vietflex-map.html').read_bytes())
            self.assertEqual(json.loads(z.read('metadata/integration.json')), integration)
            root = kmz.parse_xml(z.read('doc.kml'))
            values = {d.get('name'): d.findtext('k:value', '', kmz.N) for d in root.findall('k:Document/k:ExtendedData/k:Data', kmz.N)}
            self.assertEqual(values['integration_repository'], kmz.REPO)
            self.assertEqual(values['integration_commit'], integration['commit'])
            self.assertEqual(values['integration_html_example'], integration['html_example'])

    def test_xml_entities_and_invalid_geometry_rejected(self):
        with self.assertRaises(ValueError):
            kmz.parse_xml(b'<!DOCTYPE kml [<!ENTITY x "test">]><kml/>')
        raw = '<kml xmlns="' + kmz.NS + '"><Document><Placemark><Point><coordinates>100,95,0</coordinates></Point></Placemark></Document></kml>'
        with self.assertRaises(ValueError):
            kmz.snapshot_features(kmz.parse_xml(raw.encode()))

    def test_description_is_plain_text_and_urls_filtered(self):
        d = kmz.Description()
        d.feed('<script>alert(1)</script><p>Name &amp; text<br><a href="javascript:alert(1)">Link</a><a href="https://example.org">Source</a></p>')
        self.assertNotIn('alert', ''.join(d.parts))
        self.assertEqual(d.links, ['https://example.org'])

if __name__ == '__main__':
    unittest.main()
