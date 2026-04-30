import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePrograms } from "@/hooks/usePrograms";
import { useCreateCourse } from "@/hooks/useCourses";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CourseEntry {
    id: string;
    name: string;
    sks: string;
}

interface BulkCourseFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const BulkCourseForm = ({ open, onOpenChange }: BulkCourseFormProps) => {
    const [programId, setProgramId] = useState("");
    const [level, setLevel] = useState("");
    const [semester, setSemester] = useState("");
    const [courses, setCourses] = useState<CourseEntry[]>([
        { id: crypto.randomUUID(), name: "", sks: "" }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { toast } = useToast();
    const { data: programs = [] } = usePrograms();
    const createCourse = useCreateCourse();

    const addCourseEntry = () => {
        setCourses([...courses, { id: crypto.randomUUID(), name: "", sks: "" }]);
    };

    const removeCourseEntry = (id: string) => {
        if (courses.length > 1) {
            setCourses(courses.filter(c => c.id !== id));
        }
    };

    const updateCourseEntry = (id: string, field: 'name' | 'sks', value: string) => {
        setCourses(courses.map(c => 
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const resetForm = () => {
        setProgramId("");
        setLevel("");
        setSemester("");
        setCourses([{ id: crypto.randomUUID(), name: "", sks: "" }]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!programId || !level || !semester) {
            toast({
                title: "Data tidak lengkap",
                description: "Pilih Program Studi, Tingkat, dan Semester terlebih dahulu",
                variant: "destructive"
            });
            return;
        }

        const validCourses = courses.filter(c => c.name.trim() && c.sks);
        
        if (validCourses.length === 0) {
            toast({
                title: "Tidak ada mata kuliah",
                description: "Masukkan minimal satu mata kuliah dengan nama dan SKS",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;
        let errorCount = 0;

        for (const course of validCourses) {
            try {
                await createCourse.mutateAsync({
                    name: course.name.trim(),
                    sks: parseInt(course.sks),
                    level: parseInt(level),
                    semester: parseInt(semester),
                    program_id: programId
                });
                successCount++;
            } catch {
                errorCount++;
            }
        }

        setIsSubmitting(false);

        if (successCount > 0) {
            toast({
                title: "Mata kuliah berhasil ditambahkan",
                description: `${successCount} mata kuliah berhasil ditambahkan${errorCount > 0 ? `, ${errorCount} gagal` : ''}`,
            });
            resetForm();
            onOpenChange(false);
        } else {
            toast({
                title: "Gagal menambahkan mata kuliah",
                description: "Tidak ada mata kuliah yang berhasil ditambahkan",
                variant: "destructive"
            });
        }
    };

    const totalSKS = courses.reduce((sum, c) => sum + (parseInt(c.sks) || 0), 0);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) resetForm();
            onOpenChange(isOpen);
        }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Input Batch Mata Kuliah
                    </DialogTitle>
                    <DialogDescription>
                        Input beberapa mata kuliah sekaligus dalam satu semester
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-2">
                            <Label>Program Studi</Label>
                            <Select value={programId} onValueChange={setProgramId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Prodi" />
                                </SelectTrigger>
                                <SelectContent>
                                    {programs.map((program) => (
                                        <SelectItem key={program.id} value={program.id}>
                                            {program.code} - {program.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tingkat</Label>
                            <Select value={level} onValueChange={setLevel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Tingkat" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Tingkat 1</SelectItem>
                                    <SelectItem value="2">Tingkat 2</SelectItem>
                                    <SelectItem value="3">Tingkat 3</SelectItem>
                                    <SelectItem value="4">Tingkat 4</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Select value={semester} onValueChange={setSemester}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Semester" />
                                </SelectTrigger>
                                <SelectContent>
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
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Daftar Mata Kuliah</Label>
                            <span className="text-sm text-muted-foreground">
                                Total: {courses.filter(c => c.name.trim()).length} MK, {totalSKS} SKS
                            </span>
                        </div>
                        
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                                {courses.map((course, index) => (
                                    <div key={course.id} className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground w-6">
                                            {index + 1}.
                                        </span>
                                        <Input
                                            value={course.name}
                                            onChange={(e) => updateCourseEntry(course.id, 'name', e.target.value)}
                                            placeholder="Nama Mata Kuliah"
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            value={course.sks}
                                            onChange={(e) => updateCourseEntry(course.id, 'sks', e.target.value)}
                                            placeholder="SKS"
                                            className="w-20"
                                            min="1"
                                            max="6"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeCourseEntry(course.id)}
                                            disabled={courses.length === 1}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={addCourseEntry}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Baris
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || !programId || !level || !semester || courses.every(c => !c.name.trim())}
                        >
                            {isSubmitting ? "Menyimpan..." : `Simpan ${courses.filter(c => c.name.trim()).length} Mata Kuliah`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default BulkCourseForm;
