import { useState } from "react";
import { Trash2, Search, Plus, BookOpen, Users, GraduationCap, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useLecturers } from "@/hooks/useLecturers";
import { useCourses } from "@/hooks/useCourses";
import { useClasses } from "@/hooks/useClasses";
import { useDeleteAssignment } from "@/hooks/useAssignments";
import { useActiveAcademicYear } from "@/hooks/useAcademicYear";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import AssignmentForm from "./forms/AssignmentForm";
import { ClassForm } from "./forms/ClassForm";
import ProgramFilter from "./ProgramFilter";
import LevelFilter from "./LevelFilter";
import ClassFilter from "./ClassFilter";

const AssignmentsPage = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProgram, setSelectedProgram] = useState<string>("all");
    const [selectedLevel, setSelectedLevel] = useState<string>("all");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [showForm, setShowForm] = useState(false);
    const [showClassForm, setShowClassForm] = useState(false);
    const { data: activeAcademicYear } = useActiveAcademicYear();
    const { data: lecturers, isLoading: loadingLecturers } = useLecturers(undefined, false, activeAcademicYear?.name);
    const { data: courses, isLoading: loadingCourses } = useCourses(selectedProgram, selectedLevel, selectedClass, activeAcademicYear?.name);
    const { data: allClasses, isLoading: loadingClasses } = useClasses();
    const deleteAssignment = useDeleteAssignment();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Get classes for selected level
    const availableClasses = allClasses?.filter(cls =>
        !selectedLevel || selectedLevel === "all" || cls.level.toString() === selectedLevel
    ) || [];

    // Courses are already filtered by the hook
    const availableCourses = courses || [];

    // Combine courses and lecturers to create assignments
    const assignments = availableCourses?.map(course => {
        const assignedLecturers = course.assignedLecturers || [];

        // Filter lecturers by selected class if a class is selected
        const filteredLecturers = selectedClass && selectedClass !== "all"
            ? assignedLecturers.filter(lecturer => lecturer.classId === selectedClass)
            : assignedLecturers;

        return {
            courseId: course.id,
            courseName: course.name,
            courseSKS: course.sks,
            courseLevel: course.level,
            lecturers: filteredLecturers,
            hasAssignments: filteredLecturers.length > 0
        };
    }) || [];

    // Filter assignments based on search query
    const filteredAssignments = assignments.filter(assignment =>
        assignment.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.lecturers.some(lecturer =>
            lecturer.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const handleRemoveAssignment = async (courseId: string, lecturerId: string, lecturerName: string, classId?: string) => {
        try {
            await deleteAssignment.mutateAsync({ courseId, lecturerId, classId, academicYear: activeAcademicYear?.name });

            const className = classId
                ? allClasses?.find(cls => cls.id === classId)?.name
                : "tanpa kelas";

            // Custom toast since we want to show the class name
            toast({
                title: "Penugasan dihapus",
                description: `${lecturerName} telah dihapus dari mata kuliah ini (${className}) - Mode Offline.`,
            });
        } catch (error: any) {
            // Error toast is handled by the hook
            console.error('Error removing assignment:', error);
        }
    };

    if (loadingLecturers || loadingCourses || loadingClasses) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ploting Dosen</h1>
                    <p className="text-muted-foreground">
                        Kelola penugasan dosen untuk setiap mata kuliah berdasarkan kelas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowClassForm(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Kelola Kelas
                    </Button>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Penugasan
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProgramFilter
                    selectedProgram={selectedProgram}
                    onProgramChange={setSelectedProgram}
                    className="w-full"
                />

                <LevelFilter
                    selectedLevel={selectedLevel}
                    onLevelChange={setSelectedLevel}
                    className="w-full"
                />

                <div className="flex gap-2 items-center">
                    <ClassFilter
                        selectedClass={selectedClass}
                        onClassChange={setSelectedClass}
                        selectedLevel={selectedLevel}
                        className="flex-1"
                    />
                    {selectedLevel !== "all" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowClassForm(true)}
                            title="Tambah kelas untuk tingkat ini"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Cari mata kuliah atau dosen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                    <Card key={assignment.courseId} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-lg">{assignment.courseName}</CardTitle>
                                    <CardDescription>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1">
                                                <GraduationCap className="h-4 w-4" />
                                                Tingkat {assignment.courseLevel}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="h-4 w-4" />
                                                {assignment.courseSKS} SKS
                                            </span>
                                        </div>
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary">
                                    {assignment.lecturers.length} dosen
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {assignment.lecturers.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm">Dosen yang Ditugaskan:</h4>
                                    <div className="space-y-2">
                                        {assignment.lecturers.map((lecturer) => (
                                            <div key={`${lecturer.id}-${lecturer.classId}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-primary">
                                                            {lecturer.name ? lecturer.name.charAt(0) : '?'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{lecturer.name || 'Unknown Lecturer'}</span>
                                                        {lecturer.className && (
                                                            <span className="text-sm text-muted-foreground">
                                                                {lecturer.className}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Hapus Penugasan</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Apakah Anda yakin ingin menghapus {lecturer.name || 'dosen ini'} dari mata kuliah {assignment.courseName}
                                                                {lecturer.className ? ` di ${lecturer.className}` : ''}?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleRemoveAssignment(assignment.courseId, lecturer.id, lecturer.name || 'Unknown Lecturer', lecturer.classId)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Hapus
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Belum ada dosen yang ditugaskan untuk filter ini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredAssignments.length === 0 && (
                <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Tidak ada mata kuliah ditemukan</h3>
                    <p className="text-muted-foreground">
                        {searchQuery ? "Coba kata kunci pencarian yang berbeda" :
                            selectedLevel ? "Pilih kelas atau ubah filter tingkat" :
                                "Pilih tingkat untuk melihat mata kuliah"}
                    </p>
                </div>
            )}

            <AssignmentForm
                open={showForm}
                onOpenChange={setShowForm}
                selectedProgram={selectedProgram}
                selectedLevel={selectedLevel}
                selectedClass={selectedClass}
            />

            <ClassForm
                open={showClassForm}
                onOpenChange={(open) => {
                    setShowClassForm(open);
                    if (!open) {
                        // Refresh classes data when form is closed
                        queryClient.invalidateQueries({ queryKey: ['classes'] });
                    }
                }}
            />
        </div>
    );
};

export default AssignmentsPage;
