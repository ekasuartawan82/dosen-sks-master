import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePrograms } from "@/hooks/usePrograms";
import { useCreateLecturer, useUpdateLecturer } from "@/hooks/useLecturers";
import type { Database } from "@/integrations/supabase/types";

type LecturerStatus = Database["public"]["Enums"]["lecturer_status"];
type StructuralPosition = Database["public"]["Enums"]["structural_position"];

interface LecturerFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lecturer?: {
        id: string;
        name: string;
        status: LecturerStatus;
        structural_position: StructuralPosition;
        program_id?: string;
    };
}

const LecturerForm = ({ open, onOpenChange, lecturer }: LecturerFormProps) => {
    const [name, setName] = useState("");
    const [status, setStatus] = useState<LecturerStatus | "">("");
    const [structuralPosition, setStructuralPosition] = useState<StructuralPosition>("Tidak Ada");
    const [programId, setProgramId] = useState("");
    const [lecturerType, setLecturerType] = useState("program_studi"); // "program_studi" or "tenaga_pengajar"

    const { data: programs = [] } = usePrograms();
    const createLecturer = useCreateLecturer();
    const updateLecturer = useUpdateLecturer();

    const isSubmitting = createLecturer.isPending || updateLecturer.isPending;

    // Update form data when lecturer prop changes
    useEffect(() => {
        if (lecturer) {
            setName(lecturer.name || "");
            setStatus(lecturer.status || "");
            setStructuralPosition(lecturer.structural_position || "Tidak Ada");
            setProgramId(lecturer.program_id || "");
            setLecturerType(lecturer.program_id ? "program_studi" : "tenaga_pengajar");
        } else {
            // Reset form for new lecturer
            setName("");
            setStatus("");
            setStructuralPosition("Tidak Ada");
            setProgramId("");
            setLecturerType("program_studi");
        }
    }, [lecturer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !status || (lecturerType === "program_studi" && !programId)) return;

        try {
            if (lecturer) {
                // Update existing lecturer
                await updateLecturer.mutateAsync({
                    id: lecturer.id,
                    name: name.trim(),
                    status: status as LecturerStatus,
                    structural_position: structuralPosition,
                    program_id: lecturerType === "program_studi" ? programId : null,
                });
            } else {
                // Create new lecturer
                await createLecturer.mutateAsync({
                    name: name.trim(),
                    status: status as LecturerStatus,
                    structural_position: structuralPosition,
                    program_id: lecturerType === "program_studi" ? programId : null
                });
            }

            onOpenChange(false);

            // Reset form
            setName("");
            setStatus("");
            setStructuralPosition("Tidak Ada");
            setProgramId("");
            setLecturerType("program_studi");
        } catch (error) {
            console.error('Error saving lecturer:', error);
            // Toast is handled by the hooks
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {lecturer ? "Edit Dosen" : "Tambah Dosen Baru"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Dosen</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Masukkan nama dosen"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as LecturerStatus)} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Fungsional">Fungsional</SelectItem>
                                <SelectItem value="Non-Fungsional">Non-Fungsional</SelectItem>
                                <SelectItem value="Praktisi">Praktisi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="structural_position">Jabatan Struktural</Label>
                        <Select value={structuralPosition} onValueChange={(value) => setStructuralPosition(value as StructuralPosition)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jabatan struktural" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Tidak Ada">Tidak Ada</SelectItem>
                                <SelectItem value="Direktur">Direktur</SelectItem>
                                <SelectItem value="Wadir">Wadir</SelectItem>
                                <SelectItem value="Kapus">Kapus</SelectItem>
                                <SelectItem value="Kanit">Kanit</SelectItem>
                                <SelectItem value="Kaprodi">Kaprodi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipe Pengajar</Label>
                        <Select value={lecturerType} onValueChange={setLecturerType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Tipe Pengajar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="program_studi">Dosen Program Studi</SelectItem>
                                <SelectItem value="tenaga_pengajar">Tenaga Pengajar PT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {lecturerType === "program_studi" && (
                        <div className="space-y-2">
                            <Label>Program Studi</Label>
                            <Select value={programId} onValueChange={setProgramId} required>
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
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim() || !status || (lecturerType === "program_studi" && !programId)}>
                            {isSubmitting ? "Menyimpan..." : lecturer ? "Perbarui" : "Simpan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default LecturerForm;