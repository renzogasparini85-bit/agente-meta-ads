import unittest

from backend.services.action_impact import metrics_for_meta_entity


def extract_conversions(actions):
    return sum(float(action.get("value") or 0) for action in actions)


class ActionImpactTests(unittest.TestCase):
    def test_returns_none_when_meta_entity_is_not_present(self):
        ads = [
            {
                "ad_id": "ad-1",
                "campaign_id": "campaign-1",
                "spend": "100",
                "impressions": "1000",
                "clicks": "20",
                "frequency": "1.5",
                "actions": [{"value": "2"}],
            }
        ]

        result = metrics_for_meta_entity(ads, "campaign-missing", extract_conversions)

        self.assertIsNone(result)

    def test_aggregates_only_rows_matching_the_meta_entity(self):
        ads = [
            {
                "ad_id": "ad-1",
                "campaign_id": "campaign-target",
                "spend": "100",
                "impressions": "1000",
                "clicks": "20",
                "frequency": "1.5",
                "actions": [{"value": "2"}],
            },
            {
                "ad_id": "ad-2",
                "campaign_id": "campaign-other",
                "spend": "900",
                "impressions": "9000",
                "clicks": "90",
                "frequency": "4",
                "actions": [{"value": "9"}],
            },
        ]

        result = metrics_for_meta_entity(ads, "campaign-target", extract_conversions)

        self.assertEqual(
            result,
            {
                "spend": 100.0,
                "conv": 2.0,
                "cpa": 50.0,
                "ctr": 2.0,
                "freq": 1.5,
            },
        )


if __name__ == "__main__":
    unittest.main()
