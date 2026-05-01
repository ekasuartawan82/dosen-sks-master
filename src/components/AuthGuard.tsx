import { Navigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const AuthGuard = ({ children, requireAdmin = true }: AuthGuardProps) => {
  const { user, profile, profileError, access, loading, signOut } = useAuth();
  const roleLabel = ROLE_LABELS[access.role];
  const setupSql = `update public.profiles\nset role = 'admin'\nwhere email = '${profile?.email || user?.email || "admin@example.com"}';`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Profil Tidak Terbaca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Akun berhasil masuk, tetapi profil otorisasi tidak dapat dimuat. Hubungi admin sistem.
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireAdmin && !access.capabilities.canAccessApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Akses Belum Aktif
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Akun sudah terautentikasi, tetapi belum diberi hak untuk membuka konsol production.
                </p>
              </div>
              <Badge variant="outline" className="w-fit gap-1">
                <UserCheck className="h-3 w-3" />
                {roleLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium break-all">{profile?.email || user.email}</span>
                <span className="text-muted-foreground">Role saat ini</span>
                <span className="font-medium">{roleLabel}</span>
                <span className="text-muted-foreground">Status</span>
                <span>{ROLE_DESCRIPTIONS[access.role]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Setup admin pertama</p>
              <p className="text-sm text-muted-foreground">
                Jalankan SQL berikut di Supabase SQL Editor, lalu muat ulang halaman ini.
              </p>
              <pre className="overflow-x-auto rounded-md border bg-slate-950 p-4 text-xs text-slate-50">
                <code>{setupSql}</code>
              </pre>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Ulang Akses
              </Button>
              <Button variant="outline" onClick={() => signOut()}>
                Keluar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
