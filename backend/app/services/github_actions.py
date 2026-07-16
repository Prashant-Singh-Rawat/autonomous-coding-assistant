import httpx
from typing import Optional, List, Dict, Any

class GitHubActionsService:
    @staticmethod
    def _headers(token: str) -> Dict[str, str]:
        return {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Tony-AI-Workspace"
        }

    @classmethod
    async def post_pr_comment(cls, token: str, repo_fullname: str, pr_number: int, body: str) -> Dict[str, Any]:
        """Posts a general comment on a pull request."""
        url = f"https://api.github.com/repos/{repo_fullname}/issues/{pr_number}/comments"
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json={"body": body}, headers=cls._headers(token))
            res.raise_for_status()
            return res.json()

    @classmethod
    async def submit_pr_review(
        cls, 
        token: str, 
        repo_fullname: str, 
        pr_number: int, 
        event: str, # APPROVE, REQUEST_CHANGES, COMMENT
        body: str, 
        comments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Submits a pull request review with optionally inline file/line comments."""
        url = f"https://api.github.com/repos/{repo_fullname}/pulls/{pr_number}/reviews"
        payload = {
            "event": event,
            "body": body
        }
        if comments:
            payload["comments"] = comments # e.g. [{"path": "file.py", "position": 5, "body": "fix this"}]

        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=cls._headers(token))
            res.raise_for_status()
            return res.json()

    @classmethod
    async def merge_pull_request(cls, token: str, repo_fullname: str, pr_number: int, merge_method: str = "merge") -> Dict[str, Any]:
        """Merges a pull request on GitHub."""
        url = f"https://api.github.com/repos/{repo_fullname}/pulls/{pr_number}/merge"
        async with httpx.AsyncClient() as client:
            res = await client.put(url, json={"merge_method": merge_method}, headers=cls._headers(token))
            res.raise_for_status()
            return res.json()

    @classmethod
    async def apply_issue_labels(cls, token: str, repo_fullname: str, issue_number: int, labels: List[str]) -> List[Dict[str, Any]]:
        """Applies labels to an issue or pull request."""
        url = f"https://api.github.com/repos/{repo_fullname}/issues/{issue_number}/labels"
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json={"labels": labels}, headers=cls._headers(token))
            res.raise_for_status()
            return res.json()

    @classmethod
    async def create_branch(cls, token: str, repo_fullname: str, branch_name: str, base_sha: str) -> Dict[str, Any]:
        """Creates a new branch pointer from a base SHA."""
        url = f"https://api.github.com/repos/{repo_fullname}/git/refs"
        payload = {
            "ref": f"refs/heads/{branch_name}",
            "sha": base_sha
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=cls._headers(token))
            res.raise_for_status()
            return res.json()

    @classmethod
    async def get_pull_requests(cls, token: str, repo_fullname: str, state: str = "all", per_page: int = 20) -> List[Dict[str, Any]]:
        """Fetches pull requests from GitHub."""
        url = f"https://api.github.com/repos/{repo_fullname}/pulls"
        params = {"state": state, "per_page": per_page, "sort": "updated", "direction": "desc"}
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, headers=cls._headers(token))
            if res.status_code == 404:
                return []
            res.raise_for_status()
            return res.json()

    @classmethod
    async def get_issues(cls, token: str, repo_fullname: str, state: str = "all", per_page: int = 20) -> List[Dict[str, Any]]:
        """Fetches issues (excluding pull requests) from GitHub."""
        url = f"https://api.github.com/repos/{repo_fullname}/issues"
        params = {"state": state, "per_page": per_page, "sort": "updated", "direction": "desc"}
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, headers=cls._headers(token))
            if res.status_code == 404:
                return []
            res.raise_for_status()
            issues = res.json()
            # GitHub API returns PRs as issues, so filter them out
            return [issue for issue in issues if "pull_request" not in issue]

    @classmethod
    async def get_commits(cls, token: str, repo_fullname: str, per_page: int = 20) -> List[Dict[str, Any]]:
        """Fetches the most recent commits from the repository."""
        url = f"https://api.github.com/repos/{repo_fullname}/commits"
        params = {"per_page": per_page}
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, headers=cls._headers(token))
            if res.status_code == 404 or res.status_code == 409: # 409 for empty repos
                return []
            res.raise_for_status()
            return res.json()

    @classmethod
    async def get_pr_diff(cls, token: str, repo_fullname: str, pr_number: int) -> str:
        """Fetches the raw diff of a pull request."""
        url = f"https://api.github.com/repos/{repo_fullname}/pulls/{pr_number}"
        headers = cls._headers(token)
        headers["Accept"] = "application/vnd.github.v3.diff" # Request raw diff format
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            res.raise_for_status()
            return res.text
