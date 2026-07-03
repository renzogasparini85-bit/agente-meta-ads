import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from database import AdAccount, Client
from routers.clients import MetaCredentialsRequest, normalize_meta_account_id, update_my_meta


class EmptyQuery:
    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def count(self):
        return 0

    def first(self):
        return None


class FakeDb:
    def __init__(self):
        self.added = []
        self.committed = False

    def query(self, *args, **kwargs):
        return EmptyQuery()

    def add(self, row):
        self.added.append(row)

    def commit(self):
        self.committed = True


class ClientMetaCredentialsTests(unittest.TestCase):
    def test_normalizes_meta_account_id(self):
        self.assertEqual(normalize_meta_account_id("123"), "act_123")
        self.assertEqual(normalize_meta_account_id("act_123"), "act_123")
        self.assertIsNone(normalize_meta_account_id(""))

    def test_update_my_meta_stores_credentials_and_creates_initial_account(self):
        client = Client(
            id=7,
            nombre="Acme",
            email="acme@example.com",
            password_hash="hash",
            meta_access_token="",
            meta_ad_account_id="",
            moneda="ARS",
        )
        db = FakeDb()
        body = MetaCredentialsRequest(
            meta_access_token="EAATOKEN",
            meta_ad_account_id="123456",
        )

        result = update_my_meta(body=body, client=client, db=db)

        self.assertTrue(result["ok"])
        self.assertEqual(client.meta_access_token, "EAATOKEN")
        self.assertEqual(client.meta_ad_account_id, "act_123456")
        self.assertTrue(db.committed)
        self.assertEqual(len(db.added), 1)
        self.assertIsInstance(db.added[0], AdAccount)
        self.assertEqual(db.added[0].meta_ad_account_id, "act_123456")


if __name__ == "__main__":
    unittest.main()
