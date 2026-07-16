"use client";

import React, { useState } from "react";
import { Eye, EyeOff, GitBranch, Globe, ArrowRight, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/layout/AuthShell";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const [loginError, setLoginError] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      // OAuth2PasswordRequestForm expects form-encoded body
      const form = new URLSearchParams();
      form.append("username", data.email);
      form.append("password", data.password);

      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.detail ?? "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      const { access_token } = await res.json();
      // Store under both keys so all existing pages work
      localStorage.setItem("token", access_token);
      localStorage.setItem("access_token", access_token);
      window.location.href = "/onboarding/repositories";
    } catch {
      setLoginError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  } as any;

  return (
    <AuthShell title="Sign in to Workspace" subtitle="Enter your credentials to access your autonomous sandbox">
      <motion.form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="email" 
              placeholder="you@example.com" 
              className={cn("pl-10", errors.email && "border-red-500 focus-visible:ring-red-500")}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Password</label>
            <Link href="/auth/forgot" className="text-[10px] font-medium text-brand-400 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className={cn("pl-10 pr-10", errors.password && "border-red-500 focus-visible:ring-red-500")}
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button type="submit" disabled={!isValid || isLoading} className="w-full h-11 text-sm mt-2" rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}>
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </motion.div>

        {loginError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          >
            {loginError}
          </motion.p>
        )}
      </motion.form>

      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="grid grid-cols-2 gap-3 mt-4">
          <a href={`${API}/auth/github/login`} className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/7 border border-white/12 text-white text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all">
            <GitBranch className="w-4 h-4" /> Continue with GitHub
          </a>
          <button type="button" disabled className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/7 border border-white/12 text-white/50 text-sm font-medium cursor-not-allowed">
            <Globe className="w-4 h-4" /> Google
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Don&apos;t have an account? <Link href="/auth/register" className="text-brand-400 font-medium hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
