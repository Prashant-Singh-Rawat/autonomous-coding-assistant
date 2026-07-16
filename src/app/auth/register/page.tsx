"use client";

import React, { useState } from "react";
import { Eye, EyeOff, GitBranch, Globe, ArrowRight, Lock, Mail, User, Check } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/layout/AuthShell";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      acceptedTerms: false,
    },
  });

  const passwordValue = watch("password", "");
  const acceptedTermsValue = watch("acceptedTerms");

  // Calculate password strength
  const getPasswordStrength = () => {
    let score = 0;
    if (!passwordValue) return 0;
    if (passwordValue.length >= 8) score += 25;
    if (/[A-Z]/.test(passwordValue)) score += 25;
    if (/[0-9]/.test(passwordValue)) score += 25;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthText = strength <= 25 ? "Weak" : strength <= 75 ? "Medium" : "Strong";
  const strengthColor = strength <= 25 ? "bg-red-500" : strength <= 75 ? "bg-amber-500" : "bg-emerald-500";

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = "/onboarding/github"; // Direct to GitHub connect
    }, 1000);
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
    <AuthShell title="Create an account" subtitle="Begin your 14-day free trial. No credit card required.">
      <motion.form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="John Doe" 
              className={cn("pl-10", errors.name && "border-red-500 focus-visible:ring-red-500")}
              {...register("name")}
            />
          </div>
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </motion.div>

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
          <label className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="Minimum 8 characters" 
              className={cn("pl-10 pr-10", errors.password && "border-red-500 focus-visible:ring-red-500")}
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}

          {passwordValue && (
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
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-start gap-2.5 py-1">
          <button 
            type="button" 
            onClick={() => setValue("acceptedTerms", !acceptedTermsValue, { shouldValidate: true })} 
            className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all mt-0.5",
              acceptedTermsValue ? "border-brand-500 bg-brand-500 text-white" : "border-white/12 bg-white/5 hover:border-white/20",
              errors.acceptedTerms && "border-red-500"
            )}>
            {acceptedTermsValue && <Check className="w-2.5 h-2.5" />}
          </button>
          <div className="flex flex-col">
            <p className="text-[10px] text-muted-foreground leading-normal">
              I agree to the <Link href="/terms" className="text-white hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-white hover:underline">Privacy Policy</Link>.
            </p>
            {errors.acceptedTerms && <span className="text-[10px] text-red-500 mt-0.5">{errors.acceptedTerms.message}</span>}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button type="submit" disabled={!isValid || isLoading} className="w-full h-11 text-sm mt-2" rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </motion.div>
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
          Already have an account? <Link href="/auth/login" className="text-brand-400 font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
