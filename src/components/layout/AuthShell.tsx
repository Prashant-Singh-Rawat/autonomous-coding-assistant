import React from "react";
import { Sparkles } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
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
            <span className="font-bold text-sm text-white tracking-wide uppercase">
              Tony <span className="text-gradient">AI</span>
            </span>
          </div>

          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
              The Autonomous Software Engineering Workspace.
            </h2>
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
