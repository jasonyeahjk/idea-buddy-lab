import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "登录 · 创享智伴" },
      { name: "description", content: "登录创享智伴，开始你的多元创作伴学之旅。" },
      { property: "og:title", content: "登录 · 创享智伴" },
      { property: "og:description", content: "登录创享智伴，开始你的多元创作伴学之旅。" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/chat" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/chat" } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "up" && !data.session) toast.success("注册成功，请到邮箱点击确认链接");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google 登录失败");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <img src={logo} alt="创享智伴" className="mx-auto h-16 w-16" />
        <h1 className="mt-3 text-center text-2xl font-semibold">创享智伴</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">从灵感到分享的创作伴学平台</p>
        <Button variant="outline" className="mt-6 w-full" onClick={google}>使用 Google 继续</Button>
        <div className="my-4 text-center text-xs text-muted-foreground">或使用邮箱</div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="密码（至少 6 位）" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "登录" : "注册"}</Button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "还没有账号？注册" : "已有账号？登录"}
        </button>
      </div>
    </div>
  );
}
