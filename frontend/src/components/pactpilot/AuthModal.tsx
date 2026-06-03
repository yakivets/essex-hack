import { useEffect, useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

type Mode = "login" | "register";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful login/register (e.g. to auto-save the result). */
  onAuthed?: (user: User) => void;
  /** Optional context line shown under the title (e.g. "to unlock the full report"). */
  reason?: string;
}

const DEMO_EMAIL = "demo@pactpilot.ai";
const DEMO_PASSWORD = "demo1234";

export function AuthModal({ open, onOpenChange, onAuthed, reason }: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset transient state whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user =
        mode === "login" ? await login(email.trim(), password) : await register(email.trim(), password);
      onAuthed?.(user);
      onOpenChange(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function useDemo() {
    setMode("login");
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-lg bg-accent items-center justify-center">
              <Lock size={14} className="text-primary" />
            </span>
            {mode === "login" ? "Sign in to PactPilot" : "Create your account"}
          </DialogTitle>
          <DialogDescription>
            {reason ?? "Save your analyses and revisit them anytime from your dashboard."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className="rounded-md py-1.5 text-sm font-medium transition-colors"
              style={{
                background: mode === m ? "var(--card)" : "transparent",
                color: mode === m ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: mode === m ? "var(--shadow-card, 0 1px 2px rgba(0,0,0,0.06))" : undefined,
              }}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
            />
          </div>

          {error && (
            <p className="text-sm text-risk-high" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-card"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Demo credentials hint */}
        <button
          type="button"
          onClick={useDemo}
          className="w-full inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed border-border py-2"
        >
          <Sparkles size={13} className="text-primary" />
          Try the demo account — {DEMO_EMAIL} / {DEMO_PASSWORD}
        </button>
      </DialogContent>
    </Dialog>
  );
}
