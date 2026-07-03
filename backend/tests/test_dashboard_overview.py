import asyncio
import pathlib
import sys
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from database import Client
from routers.dashboard import overview


class EmptyQuery:
    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def first(self):
        return None


class EmptyDb:
    def query(self, *args, **kwargs):
        return EmptyQuery()


class DashboardOverviewTests(unittest.TestCase):
    def test_returns_empty_overview_when_meta_credentials_are_missing(self):
        client = Client(
            id=1,
            nombre="Test",
            email="test@example.com",
            password_hash="hash",
            meta_access_token="",
            meta_ad_account_id="",
        )

        result = asyncio.run(overview(days=30, account_id=None, client=client, db=EmptyDb()))

        self.assertFalse(result["meta_configured"])
        self.assertEqual(result["kpis"]["gasto"]["value"], 0)
        self.assertEqual(result["campaigns"], [])

    def test_meta_http_error_returns_bad_gateway(self):
        client = Client(
            id=1,
            nombre="Test",
            email="test@example.com",
            password_hash="hash",
            meta_access_token="token",
            meta_ad_account_id="act_123",
        )
        request = httpx.Request("GET", "https://graph.facebook.com/v19.0/act_123/insights")
        response = httpx.Response(
            400,
            request=request,
            json={"error": {"message": "Invalid OAuth access token."}},
        )
        error = httpx.HTTPStatusError("Bad request", request=request, response=response)

        with patch("routers.dashboard.get_account_insights", side_effect=error):
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(overview(days=30, account_id=None, client=client, db=EmptyDb()))

        self.assertEqual(raised.exception.status_code, 502)
        self.assertIn("Invalid OAuth access token.", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
