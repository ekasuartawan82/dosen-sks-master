import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import { useLecturers } from "@/hooks/useLecturers";
import { useCourses } from "@/hooks/useCourses";

const AssignmentsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: lecturers, isLoading: lecturersLoading } = useLecturers();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  const isLoading = lecturersLoading || coursesLoading;

  // Create assignment data by combining courses with their assigned lecturers
  const assignments = courses?.map(course => ({
    course,
    lecturers: course.assignedLecturers || []
  })) || [];

  const filteredAssignments = assignments.filter(assignment =>
    assignment.course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.lecturers.some(lecturer => 
      lecturer.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Plotting Dosen</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Plotting Dosen</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Penugasan
        </Button>
      </div>

      <div className="flex items-center space-x-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari mata kuliah atau dosen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredAssignments.map((assignment) => (
          <Card key={assignment.course.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{assignment.course.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Level {assignment.course.level} • {assignment.course.sks} SKS
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {assignment.lecturers.length} Dosen
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {assignment.lecturers.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Dosen yang Ditugaskan:</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {assignment.lecturers.map((lecturer) => {
                      const lecturerData = lecturers?.find(l => l.id === lecturer.id);
                      return (
                        <div key={lecturer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{lecturer.name}</p>
                            {lecturerData && (
                              <p className="text-xs text-muted-foreground">
                                Total beban: {lecturerData.totalWorkload.toFixed(1)} SKS
                              </p>
                            )}
                          </div>
                          {assignment.lecturers.length > 1 && (
                            <div className="text-xs text-muted-foreground">
                              {(assignment.course.sks / assignment.lecturers.length).toFixed(1)} SKS
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {assignment.lecturers.length > 1 && (
                    <p className="text-xs text-muted-foreground italic">
                      Team teaching: SKS dibagi {assignment.lecturers.length} dosen
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada dosen yang ditugaskan</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Tidak ada penugasan ditemukan</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Coba kata kunci lain" : "Belum ada data penugasan"}
          </p>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;