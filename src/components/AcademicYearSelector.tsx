import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { useAcademicYears, useActiveAcademicYear, useCreateAcademicYear, useSetActiveAcademicYear, useDeleteAcademicYear } from "@/hooks/useAcademicYear";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface AcademicYearSelectorProps {
    className?: string;
    showManage?: boolean;
}

const AcademicYearSelector = ({ className, showManage = false }: AcademicYearSelectorProps) => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [yearStart, setYearStart] = useState(new Date().getFullYear().toString());
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

    const { data: academicYears = [] } = useAcademicYears();
    const { data: activeYear } = useActiveAcademicYear();
    const createAcademicYear = useCreateAcademicYear();
    const setActiveYear = useSetActiveAcademicYear();
    const deleteAcademicYear = useDeleteAcademicYear();

    const handleYearChange = (yearId: string) => {
        if (yearId === 'manage') {
            setShowCreateDialog(true);
            return;
        }
        setActiveYear.mutate(yearId);
    };

    const handleCreate = () => {
        const startYear = parseInt(yearStart);
        createAcademicYear.mutate({
            year_start: startYear,
            year_end: startYear + 1,
            semester
        });
        setShowCreateDialog(false);
        setYearStart(new Date().getFullYear().toString());
        setSemester('Ganjil');
    };

    return (
        <>
            <div className={`flex items-center gap-2 ${className}`}>
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={activeYear?.id || ''} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Pilih Tahun Ajaran" />
                    </SelectTrigger>
                    <SelectContent>
                        {academicYears.map((year) => (
                            <SelectItem key={year.id} value={year.id}>
                                {year.name}
                            </SelectItem>
                        ))}
                        {showManage && (
                            <SelectItem value="manage" className="text-primary">
                                <span className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Kelola Tahun Ajaran
                                </span>
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Kelola Tahun Ajaran</DialogTitle>
                        <DialogDescription>
                            Tambah atau hapus tahun ajaran
                        </DialogDescription>
                    </DialogHeader>

                    {/* Existing Years */}
                    <div className="space-y-2">
                        <Label>Tahun Ajaran yang Ada</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {academicYears.map((year) => (
                                <div key={year.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                    <span className={year.is_active ? 'font-semibold text-primary' : ''}>
                                        {year.name} {year.is_active && '(Aktif)'}
                                    </span>
                                    {!year.is_active && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Hapus Tahun Ajaran?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Data plotting dan jadwal untuk tahun ajaran "{year.name}" akan tetap tersimpan.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteAcademicYear.mutate(year.id)}
                                                        className="bg-destructive text-destructive-foreground"
                                                    >
                                                        Hapus
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add New */}
                    <div className="border-t pt-4 space-y-4">
                        <Label>Tambah Tahun Ajaran Baru</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="year">Tahun Mulai</Label>
                                <Input
                                    id="year"
                                    type="number"
                                    value={yearStart}
                                    onChange={(e) => setYearStart(e.target.value)}
                                    min="2020"
                                    max="2100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="semester">Semester</Label>
                                <Select value={semester} onValueChange={(v) => setSemester(v as 'Ganjil' | 'Genap')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                                        <SelectItem value="Genap">Genap</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Akan membuat: {yearStart}/{parseInt(yearStart) + 1} {semester}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Tutup
                        </Button>
                        <Button onClick={handleCreate} disabled={createAcademicYear.isPending}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AcademicYearSelector;
