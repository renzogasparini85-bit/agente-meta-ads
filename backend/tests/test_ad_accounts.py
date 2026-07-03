import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from routers.ad_accounts import normalize_meta_social_id


class AdAccountsTests(unittest.TestCase):
    def test_normalizes_meta_social_ids(self):
        self.assertEqual(normalize_meta_social_id("442074545656538.-"), "442074545656538")
        self.assertEqual(normalize_meta_social_id(" 17841464202921486 "), "17841464202921486")
        self.assertIsNone(normalize_meta_social_id(""))
        self.assertIsNone(normalize_meta_social_id("abc"))


if __name__ == "__main__":
    unittest.main()
