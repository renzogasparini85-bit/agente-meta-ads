import unittest
from types import SimpleNamespace

from backend.services.notification_schedule import should_notify_client


class NotificationScheduleTests(unittest.TestCase):
    def test_notifies_when_client_hour_matches_local_hour(self):
        client = SimpleNamespace(notif_hora=9)

        self.assertTrue(should_notify_client(client, 9))

    def test_skips_when_client_hour_does_not_match(self):
        client = SimpleNamespace(notif_hora=18)

        self.assertFalse(should_notify_client(client, 9))

    def test_defaults_missing_hour_to_nine(self):
        client = SimpleNamespace()

        self.assertTrue(should_notify_client(client, 9))


if __name__ == "__main__":
    unittest.main()
