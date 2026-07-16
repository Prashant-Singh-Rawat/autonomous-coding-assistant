import os
import httpx
import logging
import asyncio
import time
from typing import Dict, Any, List
from fastapi import HTTPException

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
# The callback URL should exactly match what is registered in the GitHub OAuth App
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:3000/api/auth/github/callback")

logger = logging.getLogger("github_api")
logger.setLevel(logging.INFO)

# Ensure handler is configured if needed
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class GitHubOAuthService:
    @staticmethod
    def get_authorize_url(state: str, purpose: str = "login") -> str:
        if purpose == "login":
            scopes = "read:user user:email"
        else:
            scopes = "read:user user:email repo read:org"
            
        base_url = "https://github.com/login/oauth/authorize"
        return f"{base_url}?client_id={GITHUB_CLIENT_ID}&redirect_uri={GITHUB_REDIRECT_URI}&scope={scopes}&state={state}"

    @staticmethod
    async def _request_with_retry(
        method: str,
        url: str,
        max_retries: int = 3,
        backoff_factor: float = 1.5,
        **kwargs
    ) -> httpx.Response:
        """
        Sends an HTTP request with automatic retry logic and detailed logging on failure.
        Retries on:
          - Network/connection exceptions
          - TimeoutException
          - HTTP status codes: 429, 403 (when rate limited), and 5xx
        """
        delay = 1.0
        last_exception = None
        
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.request(method, url, **kwargs)
                    
                    if response.status_code in [200, 201, 204]:
                        return response
                    
                    # Check for rate limits (either 429 or 403 with remaining limit = 0)
                    is_rate_limit = False
                    if response.status_code == 403:
                        rate_remaining = response.headers.get("X-RateLimit-Remaining")
                        if rate_remaining == "0":
                            is_rate_limit = True
                            
                    if response.status_code == 429 or is_rate_limit or response.status_code >= 500:
                        logger.warning(
                            f"GitHub API request failed. Status: {response.status_code}, Method: {method}, URL: {url}, Attempt: {attempt}/{max_retries}"
                        )
                        
                        # Handle wait duration
                        if response.status_code == 429:
                            retry_after = response.headers.get("Retry-After")
                            sleep_time = float(retry_after) if retry_after else delay
                        elif is_rate_limit:
                            rate_reset = response.headers.get("X-RateLimit-Reset")
                            if rate_reset:
                                try:
                                    reset_time = float(rate_reset)
                                    sleep_time = max(1.0, reset_time - time.time())
                                    if sleep_time > 10.0:
                                        logger.warning(f"Rate limit reset time is too far in the future ({sleep_time}s). Capping wait at 10 seconds.")
                                        sleep_time = 10.0
                                except ValueError:
                                    sleep_time = delay
                            else:
                                sleep_time = delay
                        else:
                            sleep_time = delay
                            
                        if attempt < max_retries:
                            logger.info(f"Retrying in {sleep_time:.2f} seconds...")
                            await asyncio.sleep(sleep_time)
                            delay *= backoff_factor
                            continue
                            
                    # If we got here and it is not a retryable code, raise immediately
                    logger.error(
                        f"GitHub API error. Status: {response.status_code}, Method: {method}, URL: {url}, Response: {response.text}"
                    )
                    detail_msg = f"GitHub API error ({response.status_code}): {response.text}"
                    raise HTTPException(status_code=response.status_code, detail=detail_msg)
                    
            except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
                last_exception = e
                logger.warning(
                    f"GitHub API network/timeout failure: {type(e).__name__} {str(e)}. Method: {method}, URL: {url}, Attempt: {attempt}/{max_retries}"
                )
                if attempt < max_retries:
                    logger.info(f"Retrying in {delay:.2f} seconds...")
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
                else:
                    logger.error(
                        f"All retry attempts failed for GitHub API request. Method: {method}, URL: {url}. Last error: {str(e)}"
                    )
                    raise HTTPException(
                        status_code=503,
                        detail=f"GitHub API is currently unreachable. Error: {type(e).__name__} - {str(e)}"
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(
                    f"Unexpected error during GitHub API request. Method: {method}, URL: {url}. Error: {str(e)}"
                )
                raise HTTPException(
                    status_code=500,
                    detail=f"Unexpected GitHub integration error: {str(e)}"
                )
                
        # If all loops finished without returning or raising
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API call failed after {max_retries} attempts."
        )

    @staticmethod
    async def exchange_code_for_token(code: str) -> Dict[str, Any]:
        url = "https://github.com/login/oauth/access_token"
        headers = {"Accept": "application/json"}
        data = {
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": GITHUB_REDIRECT_URI
        }
        
        response = await GitHubOAuthService._request_with_retry("POST", url, headers=headers, data=data)
        json_response = response.json()
        if "error" in json_response:
            logger.error(f"GitHub OAuth token exchange error: {json_response}")
            raise HTTPException(status_code=400, detail=json_response.get("error_description", "OAuth error"))
            
        return json_response

    @staticmethod
    async def get_user_profile(access_token: str) -> Dict[str, Any]:
        url = "https://api.github.com/user"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
        return response.json()

    @staticmethod
    async def get_user_emails(access_token: str) -> List[Dict[str, Any]]:
        url = "https://api.github.com/user/emails"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        try:
            response = await GitHubOAuthService._request_with_retry("GET", url, headers=headers)
            return response.json()
        except Exception as e:
            logger.warning(f"Non-fatal failure retrieving user emails: {str(e)}")
            return []

    @staticmethod
    async def revoke_token(access_token: str) -> bool:
        url = f"https://api.github.com/applications/{GITHUB_CLIENT_ID}/grant"
        headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        auth = (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
        data = {"access_token": access_token}
        
        try:
            response = await GitHubOAuthService._request_with_retry("DELETE", url, auth=auth, headers=headers, json=data)
            return response.status_code == 204
        except Exception as e:
            logger.warning(f"Failed to revoke token from GitHub side: {str(e)}")
            return False

