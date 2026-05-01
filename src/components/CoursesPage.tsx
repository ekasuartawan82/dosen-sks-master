import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, BookOpen, Edit, Trash2, ListPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCourses, useDeleteCourse } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import { useActiveAcademicYear } from "@/hooks/useAcademicYear";
import CourseForm from "./forms/CourseForm";
import BulkCourseForm from "./forms/BulkCourseForm";
import ProgramFilter from "./ProgramFilter";
import LevelFilter from "./LevelFilter";
import ClassFilter from "./ClassFilter";

const CoursesPage = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProgram, setSelectedProgram] = useState<string>("all");
    const [selectedLevel, setSelectedLevel] = useState<string>("all");
    const [selectedSemester, setSelectedSemester] = useState<string>("all");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [showForm, setShowForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);
    const { data: activeAcademicYear } = useActiveAcademicYear();
    const { data: courses, isLoading } = useCourses(selectedProgram, selectedLevel, selectedClass, activeAcademicYear?.name);
    const { data: assignments } = useAssignments(undefined, activeAcademicYear?.name);
    const deleteCourse = useDeleteCourse();
    const { toast } = useToast();

    const filteredCourses = courses?.filter(course => {
        const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSemester = selectedSemester === "all" || course.semester === parseInt(selectedSemester);
        return matchesSearch && matchesSemester;
    }) || [];

    const handleDelete = async (courseId: string, courseName: string) => {
        try {
            // Check if course has assignments
            const courseAssignments = assignments?.filter(a => a.course_id === courseId) || [];

            if (courseAssignments.length > 0) {
                toast({
                    title: "Tidak dapat menghapus mata kuliah",
                    description: "Mata kuliah masih memiliki penugasan dosen. Hapus penugasan terlebih dahulu.",
                    variant: "destructive"
                });
                return;
            }

            await deleteCourse.mutateAsync(courseId);
            // Toast is handled by the hook
        } catch (error) {
            console.error('Error deleting course:', error);
            // Error toast is handled by the hook
        }
    };

    const handleEdit = (course: any) => {
        setEditingCourse(course);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingCourse(null);
    };

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
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        Data Mata Kuliah
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Kelola data mata kuliah per program studi
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowBulkForm(true)}
                        variant="outline"
                        className="gap-2"
                    >
                        <ListPlus className="h-4 w-4" />
                        Input Batch
                    </Button>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah MK
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2 max-w-md">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari mata kuliah..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium whitespace-nowrap">Prodi:</span>
                        <ProgramFilter
                            selectedProgram={selectedProgram}
                            onProgramChange={(value) => {
                                setSelectedProgram(value);
                                setSelectedClass("all");
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium whitespace-nowrap">Tingkat:</span>
                        <LevelFilter
                            selectedLevel={selectedLevel}
                            onLevelChange={(value) => {
                                setSelectedLevel(value);
                                setSelectedClass("all");
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium whitespace-nowrap">Semester:</span>
                        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Pilih Semester" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Semester</SelectItem>
                                <SelectItem value="1">Semester 1</SelectItem>
                                <SelectItem value="2">Semester 2</SelectItem>
                                <SelectItem value="3">Semester 3</SelectItem>
                                <SelectItem value="4">Semester 4</SelectItem>
                                <SelectItem value="5">Semester 5</SelectItem>
                                <SelectItem value="6">Semester 6</SelectItem>
                                <SelectItem value="7">Semester 7</SelectItem>
                                <SelectItem value="8">Semester 8</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium whitespace-nowrap">Kelas:</span>
                        <ClassFilter
                            selectedClass={selectedClass}
                            onClassChange={setSelectedClass}
                            selectedLevel={selectedLevel}
                            selectedProgram={selectedProgram}
                            className="flex-1"
                        />
                    </div>
                </div>
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
                                        <p className="text-sm text-muted-foreground">
                                            Tingkat {course.level} • Semester {course.semester || '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{course.sks} SKS</Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(course)}
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="outline">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus Mata Kuliah</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Apakah Anda yakin ingin menghapus mata kuliah {course.name}?
                                                    Aksi ini tidak dapat dibatalkan.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(course.id, course.name)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Hapus
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {course.assignedLecturers && course.assignedLecturers.length > 0 ? (
                                <div>
                                    <h4 className="font-medium mb-2 text-sm">Dosen Pengampu:</h4>
                                    <div className="space-y-1">
                                        {course.assignedLecturers.map((lecturer, index) => (
                                            <div key={`${lecturer.id}-${index}`} className="text-sm text-muted-foreground">
                                                {lecturer.name}
                                                {lecturer.className && (
                                                    <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                                                        {lecturer.className}
                                                    </span>
                                                )}
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

            <CourseForm
                open={showForm}
                onOpenChange={handleFormClose}
                course={editingCourse}
            />

            <BulkCourseForm
                open={showBulkForm}
                onOpenChange={setShowBulkForm}
            />
        </div>
    );
};

export default CoursesPage;
