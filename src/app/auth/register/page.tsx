"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, GitBranch, Globe, Sparkles, ArrowRight, Lock, Mail, User, Check } from "lucide-react";
import Link from "next/link";
import { Button, Input, Progress } from "@/components/ui";
import { AuthShell } from "../login/page";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Calculate password strength
  const getPasswordStrength = () => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthText = strength <= 25 ? "Weak" : strength <= 75 ? "Medium" : "Strong";
  const strengthColor = strength <= 25 ? "bg-red-500" : strength <= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <AuthShell title="Create an account" subtitle="Begin your 14-day free trial. No credit card required.">
      <form onSubmit={(e) => { e.preventDefault(); window.location.href = "/dashboard"; }} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {password && (
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Password strength: <span className="font-semibold text-white">{strengthText}</span></span>
                <span className="font-mono text-muted-foreground">{strength}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-300", strengthColor)} style={{ width: `${strength}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 py-1">
          <button type="button" onClick={() => setAcceptedTerms(!acceptedTerms)} className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all mt-0.5",
            acceptedTerms ? "border-brand-500 bg-brand-500 text-white" : "border-white/12 bg-white/5 hover:border-white/20"
          )}>
            {acceptedTerms && <Check className="w-2.5 h-2.5" />}
          </button>
          <p className="text-[10px] text-muted-foreground leading-normal">
            I agree to the <Link href="/terms" className="text-white hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-white hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        <Button type="submit" disabled={!acceptedTerms} className="w-full h-11 text-sm mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
          Create Account
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button type="button" id="register-github-btn" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/7 border border-white/12 text-white text-sm font-medium hover:bg-white/10 transition-all">
          <GitBranch className="w-4 h-4" /> GitHub
        </button>
        <button type="button" id="register-google-btn" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/7 border border-white/12 text-white text-sm font-medium hover:bg-white/10 transition-all">
          <Globe className="w-4 h-4" /> Google
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account? <Link href="/auth/login" className="text-brand-400 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
