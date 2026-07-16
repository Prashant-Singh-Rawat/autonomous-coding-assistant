import os
import subprocess
import shutil
from urllib.parse import urlparse

class GitService:
    @staticmethod
    def clone_repository(source_url: str, token: str, dest_path: str) -> bool:
        """
        Clones a GitHub repository to the local dest_path using the provided OAuth token.
        """
        if os.path.exists(dest_path):
            shutil.rmtree(dest_path, ignore_errors=True)
            
        # Insert the token into the URL for authenticated cloning
        parsed_url = urlparse(source_url)
        # Assuming GitHub format, we inject x-access-token:{token}
        auth_url = f"{parsed_url.scheme}://x-access-token:{token}@{parsed_url.netloc}{parsed_url.path}"
        if not auth_url.endswith(".git"):
            auth_url += ".git"
            
        try:
            # Run git clone synchronously
            # Use subprocess to run the clone
            result = subprocess.run(
                ["git", "clone", "--depth", "1", auth_url, dest_path],
                capture_output=True,
                text=True,
                check=True
            )
            return True
        except subprocess.CalledProcessError as e:
            print(f"Git clone failed: {e.stderr}")
            return False
