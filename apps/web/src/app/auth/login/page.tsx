"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, GitBranch, Globe, Sparkles, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen flex bg-[#0A0A0F]">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-[#0A0A0F] to-purple-600/10 z-0" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-white tracking-wide uppercase">Tony <span className="text-gradient">AI</span></span>
          </div>

          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4 leading-tight">The Autonomous Software Engineering Workspace.</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your repositories, describe what you want built, and let specialized agents write, test, and deploy code for you.
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground/50">© 2026 Tony AI. All rights reserved.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-center px-6 md:px-16 lg:px-20 border-l border-white/8 relative bg-[#07070a]">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthShell title="Sign in to Workspace" subtitle="Enter your credentials to access your autonomous sandbox">
      <form onSubmit={(e) => { e.preventDefault(); window.location.href = "/dashboard"; }} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Password</label>
            <Link href="/auth/forgot" className="text-[10px] font-medium text-brand-400 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-11 text-sm mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
          Sign In
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button type="button" id="auth-github-btn" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/7 border border-white/12 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all">
          <GitBranch className="w-4 h-4" /> GitHub
        </button>
        <button type="button" id="auth-google-btn" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/7 border border-white/12 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all">
          <Globe className="w-4 h-4" /> Google
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Don't have an account? <Link href="/auth/register" className="text-brand-400 font-medium hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
