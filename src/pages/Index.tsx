import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import LecturersPage from "@/components/LecturersPage";
import CoursesPage from "@/components/CoursesPage";
import ClassesPage from "@/components/ClassesPage";
import AssignmentsPage from "@/components/AssignmentsPage";
import SchedulePage from "@/components/SchedulePage";
import PostsSection from "@/components/PostsSection";
import ProgramsPage from "@/components/ProgramsPage";
import TeachingStaffPage from "@/components/TeachingStaffPage";
import RekapPage from "@/components/RekapPage";
import HistoriMengajarPage from "@/components/HistoriMengajarPage";
import ProfilePage from "@/components/ProfilePage";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "programs":
        return <ProgramsPage />;
      case "lecturers":
        return <LecturersPage />;
      case "teaching-staff":
        return <TeachingStaffPage />;
      case "courses":
        return <CoursesPage />;
      case "classes":
        return <ClassesPage />;
      case "assignments":
        return <AssignmentsPage />;
      case "rekap":
        return <RekapPage />;
      case "rekap-histori":
        return <HistoriMengajarPage />;
      case "schedules":
        return <SchedulePage />;
      case "posts":
        return <PostsSection />;
      case "profile":
        return <ProfilePage />;
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