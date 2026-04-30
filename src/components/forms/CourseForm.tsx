import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePrograms } from "@/hooks/usePrograms";
import { useCreateCourse, useUpdateCourse } from "@/hooks/useCourses";

interface CourseFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    course?: {
        id: string;
        name: string;
        sks: number;
        level: number;
        semester: number;
        program_id?: string;
    };
}

const CourseForm = ({ open, onOpenChange, course }: CourseFormProps) => {
    const [name, setName] = useState("");
    const [sks, setSks] = useState("");
    const [level, setLevel] = useState("");
    const [semester, setSemester] = useState("");
    const [programId, setProgramId] = useState("");

    const { toast } = useToast();
    const { data: programs = [] } = usePrograms();
    const createCourse = useCreateCourse();
    const updateCourse = useUpdateCourse();

    const isSubmitting = createCourse.isPending || updateCourse.isPending;

    // Update form data when course prop changes
    useEffect(() => {
        if (course) {
            setName(course.name || "");
            setSks(course.sks?.toString() || "");
            setLevel(course.level?.toString() || "");
            setSemester(course.semester?.toString() || "");
            setProgramId(course.program_id || "");
        } else {
            // Reset form for new course
            setName("");
            setSks("");
            setLevel("");
            setSemester("");
            setProgramId("");
        }
    }, [course]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !sks || !level || !semester || !programId) return;

        const sksNum = parseInt(sks);
        const levelNum = parseInt(level);
        const semesterNum = parseInt(semester);

        if (sksNum <= 0 || levelNum <= 0 || semesterNum <= 0) {
            toast({
                title: "Input tidak valid",
                description: "SKS, Level, dan Semester harus berupa angka positif",
                variant: "destructive"
            });
            return;
        }

        try {
            if (course) {
                // Update existing course
                await updateCourse.mutateAsync({
                    id: course.id,
                    name: name.trim(),
                    sks: sksNum,
                    level: levelNum,
                    semester: semesterNum,
                    program_id: programId,
                });
            } else {
                // Create new course
                await createCourse.mutateAsync({
                    name: name.trim(),
                    sks: sksNum,
                    level: levelNum,
                    semester: semesterNum,
                    program_id: programId
                });
            }

            onOpenChange(false);

            // Reset form
            setName("");
            setSks("");
            setLevel("");
            setSemester("");
            setProgramId("");
        } catch (error) {
            console.error('Error saving course:', error);
            // Toast is handled by the hooks
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {course ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Mata Kuliah</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Masukkan nama mata kuliah"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sks">SKS</Label>
                        <Input
                            id="sks"
                            type="number"
                            value={sks}
                            onChange={(e) => setSks(e.target.value)}
                            placeholder="Masukkan jumlah SKS"
                            min="1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="level">Tingkat</Label>
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
                            <Label htmlFor="semester">Semester</Label>
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
                        <Label>Program Studi</Label>
                        <Select value={programId} onValueChange={setProgramId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Program Studi" />
                            </SelectTrigger>
                            <SelectContent>
                                {programs.map((program) => (
                                    <SelectItem key={program.id} value={program.id}>
                                        {program.name} ({program.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim() || !sks || !level || !semester || !programId}>
                            {isSubmitting ? "Menyimpan..." : course ? "Perbarui" : "Simpan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CourseForm;