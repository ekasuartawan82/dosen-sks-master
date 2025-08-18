import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, BookOpen } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";

const CoursesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: courses, isLoading } = useCourses();

  const filteredCourses = courses?.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Data Mata Kuliah</h1>
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
        <h1 className="text-3xl font-bold">Data Mata Kuliah</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Mata Kuliah
        </Button>
      </div>

      <div className="flex items-center space-x-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari mata kuliah..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Level {course.level}</p>
                  </div>
                </div>
                <Badge variant="secondary">{course.sks} SKS</Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {course.assignedLecturers && course.assignedLecturers.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Dosen Pengampu:</h4>
                  <div className="space-y-1">
                    {course.assignedLecturers.map((lecturer) => (
                      <div key={lecturer.id} className="text-sm text-muted-foreground">
                        {lecturer.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Belum ada dosen yang ditugaskan
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Tidak ada mata kuliah ditemukan</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Coba kata kunci lain" : "Belum ada data mata kuliah"}
          </p>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;