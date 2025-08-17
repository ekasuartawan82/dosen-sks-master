import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "lecturers":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Data Dosen</h2>
            <p className="text-muted-foreground">Halaman manajemen data dosen akan tersedia setelah koneksi Supabase</p>
          </div>
        );
      case "courses":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Data Mata Kuliah</h2>
            <p className="text-muted-foreground">Halaman manajemen mata kuliah akan tersedia setelah koneksi Supabase</p>
          </div>
        );
      case "assignments":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Plotting Dosen</h2>
            <p className="text-muted-foreground">Halaman penugasan dosen akan tersedia setelah koneksi Supabase</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default Index;