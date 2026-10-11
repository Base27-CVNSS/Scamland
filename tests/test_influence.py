import json, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class InfluenceTest(unittest.TestCase):
    def test_feature_count_and_provenance(self):
        src=json.loads((ROOT/'data/influence.geojson').read_text(encoding='utf-8'))
        self.assertEqual(len(src['features']),4)
        self.assertFalse(src['metadata']['verified_impact'])
        self.assertFalse(src['metadata']['official_boundary'])
        for f in src['features']:
            if f['geometry']['type']=='Polygon':
                ring=f['geometry']['coordinates'][0]
                self.assertEqual(ring[0],ring[-1])
                for lon,lat in ring:
                    self.assertTrue(-180<=lon<=180 and -90<=lat<=90)
if __name__ == '__main__': unittest.main()
