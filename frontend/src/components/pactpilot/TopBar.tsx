import { ShieldCheck, RotateCcw, PanelRightOpen, Handshake, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <title>PactPilot</title>
        <path
          d="M5 20 L5 6 L14 6 C18 6 20 8 20 11 C20 14 18 16 14 16 L9 16 M16 16 L21 21"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="80"
          strokeDashoffset="80"
          style={{ animation: "draw-stroke 900ms ease-out forwards" }}
        />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        PactPilot
      </span>
    </div>
  );
}

interface Props {
  onHome?: () => void;
  onNewAnalysis?: () => void;
  onOpenDetails?: () => void;
  onNegotiate?: () => void;
  onSignIn?: () => void;
  onDashboard?: () => void;
}

function AuthArea({
  onSignIn,
  onNewAnalysis,
  onDashboard,
}: Pick<Props, "onSignIn" | "onNewAnalysis" | "onDashboard">) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="w-16 h-7 rounded-full bg-muted animate-pulse" aria-hidden="true" />;
  }

  if (!user) {
    if (!onSignIn) return null;
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover transition-colors shadow-card"
      >
        <UserIcon size={14} /> Sign in
      </button>
    );
  }

  const initial = user.email.charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-border bg-card hover:bg-muted transition-colors"
        >
          <span className="inline-flex w-6 h-6 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs font-semibold">
            {initial}
          </span>
          <span className="hidden sm:inline text-xs font-medium text-foreground max-w-[160px] truncate">
            {user.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onDashboard && (
          <DropdownMenuItem onClick={onDashboard} className="cursor-pointer">
            <LayoutDashboard size={15} /> Dashboard
          </DropdownMenuItem>
        )}
        {onNewAnalysis && (
          <DropdownMenuItem onClick={onNewAnalysis} className="cursor-pointer">
            <RotateCcw size={15} /> New analysis
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-risk-high focus:text-risk-high">
          <LogOut size={15} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar({
  onHome,
  onNewAnalysis,
  onOpenDetails,
  onNegotiate,
  onSignIn,
  onDashboard,
}: Props) {
  const { user } = useAuth();
  return (
    <header className="shrink-0 z-40 backdrop-blur-md bg-card/70 border-b border-border">
      <div className="max-w-[1600px] mx-auto px-5 h-14 flex items-center justify-between">
        {onHome ? (
          <button
            type="button"
            onClick={onHome}
            aria-label="Back to start"
            className="rounded-lg -ml-1 px-1 py-1 hover:opacity-80 transition-opacity"
          >
            <Wordmark />
          </button>
        ) : (
          <Wordmark />
        )}

        <div className="flex items-center gap-2">
          {onNegotiate && (
            <button
              type="button"
              onClick={onNegotiate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover transition-colors shadow-card"
            >
              <Handshake size={14} /> Negotiate
            </button>
          )}
          {onOpenDetails && (
            <button
              type="button"
              onClick={onOpenDetails}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
            >
              <PanelRightOpen size={14} /> Details
            </button>
          )}
          {onNewAnalysis && (
            <button
              type="button"
              onClick={onNewAnalysis}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
            >
              <RotateCcw size={13} /> New
            </button>
          )}
          {onDashboard && user && (
            <button
              type="button"
              onClick={onDashboard}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
            >
              <LayoutDashboard size={13} /> Dashboard
            </button>
          )}
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 bg-card">
            <ShieldCheck size={14} className="text-tertiary" />
            Not legal advice
          </div>
          <AuthArea onSignIn={onSignIn} onNewAnalysis={onNewAnalysis} onDashboard={onDashboard} />
        </div>
      </div>
    </header>
  );
}
