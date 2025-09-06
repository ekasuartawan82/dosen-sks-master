import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, BookOpen, BarChart3, Menu, X, MessageSquare, LogOut, User, Calendar, School, UserCheck, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout = ({ children, currentPage, onPageChange }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Gagal keluar");
    } else {
      toast.success("Berhasil keluar");
    }
  };

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "programs", label: "Program Studi", icon: School },
    { id: "lecturers", label: "Data Dosen", icon: Users },
    { id: "teaching-staff", label: "Tenaga Pengajar PT", icon: UserCheck },
    { id: "courses", label: "Data Mata Kuliah", icon: BookOpen },
    { id: "assignments", label: "Plotting Dosen", icon: GraduationCap },
    { id: "rekap", label: "Rekap", icon: FileText },
    { id: "schedules", label: "Ploting Jadwal", icon: Calendar },
    { id: "posts", label: "Pengumuman", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-elegant transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-bold text-lg">Sistem Plotting</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-12 transition-all duration-200",
                  currentPage === item.id 
                    ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  onPageChange(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="h-16 bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="flex h-full items-center justify-between px-6">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">Sistem Plotting Beban Mengajar</p>
                <p className="text-xs text-muted-foreground">Multi Program Studi</p>
              </div>
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
                  <User className="h-4 w-4 mr-2" />
                  Masuk
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;