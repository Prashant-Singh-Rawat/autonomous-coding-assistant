"""
Integrations Gateway — uniform interface over external providers.
Implements DeploymentProvider interface for Vercel, Render, Railway, Docker.
Implements messaging adapter for Slack.
"""
import json
import httpx
from typing import Any


# ── Deployment Provider Interface ──────────────────────────────────────────────

class DeploymentProvider:
    """Common interface every cloud provider adapter must implement."""

    def __init__(self, credentials: dict):
        self.credentials = credentials

    async def list_environments(self) -> list[dict]:
        raise NotImplementedError

    async def get_status(self, environment: str) -> dict:
        raise NotImplementedError

    async def trigger_deploy(self, environment: str, commit_sha: str | None = None) -> dict:
        raise NotImplementedError

    async def fetch_logs(self, deployment_id: str, limit: int = 100) -> list[str]:
        raise NotImplementedError


# ── Vercel ─────────────────────────────────────────────────────────────────────

class VercelProvider(DeploymentProvider):
    BASE = "https://api.vercel.com"

    def _headers(self):
        return {"Authorization": f"Bearer {self.credentials.get('token', '')}"}

    async def list_environments(self) -> list[dict]:
        project_id = self.credentials.get("project_id", "")
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.BASE}/v9/projects/{project_id}", headers=self._headers())
            r.raise_for_status()
            data = r.json()
            return [{"name": t["target"], "url": t.get("alias", [""])[0]}
                    for t in data.get("targets", {}).values()]

    async def get_status(self, environment: str) -> dict:
        project_id = self.credentials.get("project_id", "")
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.BASE}/v6/deployments",
                headers=self._headers(),
                params={"projectId": project_id, "target": environment, "limit": 1}
            )
            r.raise_for_status()
            deployments = r.json().get("deployments", [])
            if not deployments:
                return {"status": "unknown", "url": None}
            d = deployments[0]
            return {"status": d.get("state"), "url": d.get("url"), "id": d.get("uid")}

    async def trigger_deploy(self, environment: str, commit_sha: str | None = None) -> dict:
        project_id = self.credentials.get("project_id", "")
        team_id = self.credentials.get("team_id")
        payload = {"name": project_id, "target": environment}
        if commit_sha:
            payload["meta"] = {"githubCommitSha": commit_sha}
        params = {"teamId": team_id} if team_id else {}
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.BASE}/v13/deployments",
                headers=self._headers(),
                json=payload,
                params=params
            )
            r.raise_for_status()
            d = r.json()
            return {"deployment_id": d.get("id"), "status": d.get("readyState"), "url": d.get("url")}

    async def fetch_logs(self, deployment_id: str, limit: int = 100) -> list[str]:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.BASE}/v2/deployments/{deployment_id}/events",
                headers=self._headers(),
                params={"limit": limit}
            )
            r.raise_for_status()
            events = r.json()
            return [e.get("text", "") for e in events if e.get("type") == "stdout"]


# ── Render ─────────────────────────────────────────────────────────────────────

class RenderProvider(DeploymentProvider):
    BASE = "https://api.render.com/v1"

    def _headers(self):
        return {"Authorization": f"Bearer {self.credentials.get('api_key', '')}"}

    async def list_environments(self) -> list[dict]:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.BASE}/services", headers=self._headers())
            r.raise_for_status()
            return [{"name": s["service"]["name"], "id": s["service"]["id"]}
                    for s in r.json()]

    async def get_status(self, environment: str) -> dict:
        service_id = self.credentials.get("service_id", "")
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.BASE}/services/{service_id}/deploys?limit=1", headers=self._headers())
            r.raise_for_status()
            deploys = r.json()
            if not deploys:
                return {"status": "unknown"}
            d = deploys[0]["deploy"]
            return {"status": d.get("status"), "id": d.get("id"), "created_at": d.get("createdAt")}

    async def trigger_deploy(self, environment: str, commit_sha: str | None = None) -> dict:
        service_id = self.credentials.get("service_id", "")
        payload = {"clearCache": "do_not_clear"}
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.BASE}/services/{service_id}/deploys",
                headers=self._headers(),
                json=payload
            )
            r.raise_for_status()
            d = r.json()
            return {"deployment_id": d.get("id"), "status": d.get("status")}

    async def fetch_logs(self, deployment_id: str, limit: int = 100) -> list[str]:
        service_id = self.credentials.get("service_id", "")
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.BASE}/services/{service_id}/deploys/{deployment_id}/log",
                headers=self._headers()
            )
            r.raise_for_status()
            return r.json().get("logs", "").splitlines()[-limit:]


# ── Factory ────────────────────────────────────────────────────────────────────

PROVIDER_MAP = {
    "vercel": VercelProvider,
    "render": RenderProvider,
}

def get_deployment_provider(provider_type: str, credentials_json: str) -> DeploymentProvider:
    """Instantiate the correct provider adapter from the stored credentials."""
    credentials = json.loads(credentials_json) if credentials_json else {}
    cls = PROVIDER_MAP.get(provider_type)
    if cls is None:
        raise ValueError(f"Unsupported deployment provider: {provider_type}")
    return cls(credentials)


# ── Slack Integration ──────────────────────────────────────────────────────────

async def send_slack_notification(webhook_url: str, text: str, channel: str | None = None):
    """
    Deliver a plain-text notification to a Slack incoming webhook.
    Falls back gracefully if the webhook URL is invalid or unreachable.
    """
    payload: dict[str, Any] = {"text": text}
    if channel:
        payload["channel"] = channel
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(webhook_url, json=payload)
            r.raise_for_status()
    except Exception as exc:
        # Non-fatal — log and continue
        import logging
        logging.getLogger(__name__).warning("Slack notification failed: %s", exc)
