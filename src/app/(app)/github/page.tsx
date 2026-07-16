"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function GithubRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const activeRepoId = localStorage.getItem("active_repo_id");
    if (activeRepoId) {
      router.replace(`/github/${activeRepoId}`);
    } else {
      router.replace("/onboarding/repositories");
    }
  }, [router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
      <p className="text-sm text-muted-foreground">Redirecting to GitHub Management Center...</p>
    </div>
  );
}
