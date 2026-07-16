"use client";

import React, { useEffect, useState, Suspense } from "react";
import { GitBranch, Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


function GithubConnectHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSuccess = searchParams.get("success") === "true";
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      setShowCheckmark(true);
      const timer = setTimeout(() => {
        router.push("/onboarding/repositories");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  const [connectUrl, setConnectUrl] = useState(`${API}/auth/github/connect`);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token) {
      setConnectUrl(`${API}/auth/github/connect?token=${encodeURIComponent(token)}`);
    }
  }, []);

  return (
    <div className="max-w-md w-full bg-[#0A0A0F]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-purple-500" />
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      {showCheckmark ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center space-y-6 py-8"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Successfully Connected!</h2>
            <p className="text-muted-foreground text-sm">We&apos;re loading your repositories...</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-glow-sm">
              <GitBranch className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Connect your GitHub account</h2>
            <p className="text-muted-foreground text-sm">
              To enable autonomous coding, Tony AI needs access to your repositories.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Requested permissions:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-white/90">Read user profile & email</strong> to identify you.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-white/90">Read repository code & metadata</strong> to analyze and build context.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-white/90">Read organization membership</strong> to list org repositories you have access to.
                </span>
              </li>
            </ul>
          </div>

          <a href={connectUrl} className="block">
            <Button className="w-full h-12 text-sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Connect GitHub
            </Button>
          </a>
        </motion.div>
      )}
    </div>
  );
}

export default function GithubConnectPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="max-w-md w-full bg-[#0A0A0F]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/50">Loading GitHub connection state...</p>
        </div>
      }>
        <GithubConnectHandler />
      </Suspense>
    </div>
  );
}
