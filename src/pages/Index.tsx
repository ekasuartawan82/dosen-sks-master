import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import LecturersPage from "@/components/LecturersPage";
import CoursesPage from "@/components/CoursesPage";
import ClassesPage from "@/components/ClassesPage";
import AssignmentsPage from "@/components/AssignmentsPage";
import SchedulePage from "@/components/SchedulePage";
import PostsSection from "@/components/PostsSection";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "lecturers":
        return <LecturersPage />;
      case "courses":
        return <CoursesPage />;
      case "classes":
        return <ClassesPage />;
      case "assignments":
        return <AssignmentsPage />;
      case "schedules":
        return <SchedulePage />;
      case "posts":
        return <PostsSection />;
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