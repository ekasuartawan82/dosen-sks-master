import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, User, BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAcademicYears, useActiveAcademicYear } from "@/hooks/useAcademicYear";
import { useLecturers, LecturerWithWorkload } from "@/hooks/useLecturers";
import { usePrograms } from "@/hooks/usePrograms";
import ProgramFilter from "./ProgramFilter";

const isPKLCourse = (courseName: string): boolean => {
    const name = courseName.toLowerCase();
    return name.includes('pkl') || 
           name.includes('praktek kerja lapangan') || 
           name.includes('praktik kerja lapangan') ||
           name.includes('magang');
};

const HistoriMengajarPage = () => {
    const [selectedProgram, setSelectedProgram] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"dosen" | "summary">("dosen");

    const { data: academicYears = [] } = useAcademicYears();
    const { data: activeYear } = useActiveAcademicYear();
    const selectedAcademicYearName = selectedYear === "all"
        ? activeYear?.name
        : academicYears.find(year => year.id === selectedYear)?.name;
    const { data: lecturers = [], isLoading } = useLecturers(selectedProgram, false, selectedAcademicYearName);
    const { data: programs = [] } = usePrograms();

    // Calculate non-PKL workload for a lecturer
    const getNonPKLWorkload = (lecturer: LecturerWithWorkload): number => {
        const nonPKLTeachingSKS = lecturer.courses
            .filter(c => !isPKLCourse(c.name))
            .reduce((sum, c) => sum + (c.sks / c.sharedWith), 0);
        return Math.round((nonPKLTeachingSKS + lecturer.structuralSKS) * 100) / 100;
    };

    // Calculate statistics (using non-PKL workload for status)
    const totalLecturers = lecturers.length;
    const avgWorkload = lecturers.length > 0 
        ? (lecturers.reduce((sum, l) => sum + l.totalWorkload, 0) / lecturers.length).toFixed(1)
        : 0;
    const sufficientCount = lecturers.filter(l => {
        const w = getNonPKLWorkload(l);
        return w >= 12 && w <= 16;
    }).length;
    const insufficientCount = lecturers.filter(l => getNonPKLWorkload(l) < 12).length;
    const excessCount = lecturers.filter(l => getNonPKLWorkload(l) > 16).length;

    const getWorkloadStatus = (lecturer: LecturerWithWorkload) => {
        const workload = getNonPKLWorkload(lecturer);
        if (workload < 12) return { label: "Kurang", color: "bg-red-100 text-red-800", icon: TrendingDown };
        if (workload > 16) return { label: "Lebih", color: "bg-amber-100 text-amber-800", icon: TrendingUp };
        return { label: "Cukup", color: "bg-green-100 text-green-800", icon: Minus };
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Memuat data histori...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center gap-3">
                    <History className="h-8 w-8 text-primary" />
                    Histori Mengajar
                </h1>
                <p className="text-muted-foreground mt-2">
                    Rekap beban mengajar dosen per tahun ajaran untuk benchmarking
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tahun Ajaran:</span>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Tahun</SelectItem>
                            {academicYears.map((year) => (
                                <SelectItem key={year.id} value={year.id}>
                                    {year.name} {year.is_active && "(Aktif)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Program:</span>
                    <ProgramFilter
                        selectedProgram={selectedProgram}
                        onProgramChange={setSelectedProgram}
                        className="w-[200px]"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <User className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                            <div className="text-2xl font-bold">{totalLecturers}</div>
                            <div className="text-sm text-muted-foreground">Total Dosen</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <BookOpen className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                            <div className="text-2xl font-bold">{avgWorkload}</div>
                            <div className="text-sm text-muted-foreground">Rata-rata SKS</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-700">{sufficientCount}</div>
                            <div className="text-sm text-green-600">Beban Cukup (12-16)</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-700">{insufficientCount + excessCount}</div>
                            <div className="text-sm text-red-600">Perlu Perhatian</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "dosen" | "summary")}>
                <TabsList>
                    <TabsTrigger value="dosen">Per Dosen</TabsTrigger>
                    <TabsTrigger value="summary">Ringkasan</TabsTrigger>
                </TabsList>

                <TabsContent value="dosen" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detail Beban Mengajar Per Dosen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">No</TableHead>
                                        <TableHead>Nama Dosen</TableHead>
                                        <TableHead>Jabatan Struktural</TableHead>
                                        <TableHead className="text-center">SKS Mengajar</TableHead>
                                        <TableHead className="text-center">SKS Struktural</TableHead>
                                        <TableHead className="text-center">Total SKS</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead>Mata Kuliah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lecturers.map((lecturer, index) => {
                                        const status = getWorkloadStatus(lecturer);
                                        const StatusIcon = status.icon;
                                        return (
                                            <TableRow key={lecturer.id}>
                                                <TableCell className="text-center">{index + 1}</TableCell>
                                                <TableCell className="font-medium">{lecturer.name}</TableCell>
                                                <TableCell>{lecturer.structuralPosition}</TableCell>
                                                <TableCell className="text-center">{lecturer.teachingSKS}</TableCell>
                                                <TableCell className="text-center">{lecturer.structuralSKS}</TableCell>
                                                <TableCell className="text-center font-bold">{lecturer.totalWorkload}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={status.color}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="text-sm text-muted-foreground truncate">
                                                        {lecturer.courses.map(c => c.name).join(", ") || "-"}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="summary" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* By Program */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribusi Per Program Studi</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Program Studi</TableHead>
                                            <TableHead className="text-center">Dosen</TableHead>
                                            <TableHead className="text-center">Rata-rata SKS</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {programs.map(program => {
                                            const programLecturers = lecturers.filter(l => l.programId === program.id);
                                            const avg = programLecturers.length > 0
                                                ? (programLecturers.reduce((s, l) => s + l.totalWorkload, 0) / programLecturers.length).toFixed(1)
                                                : 0;
                                            return (
                                                <TableRow key={program.id}>
                                                    <TableCell>{program.name}</TableCell>
                                                    <TableCell className="text-center">{programLecturers.length}</TableCell>
                                                    <TableCell className="text-center">{avg}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Workload Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribusi Beban Kerja</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <span className="font-medium text-green-800">Beban Cukup (12-16 SKS)</span>
                                    <Badge className="bg-green-600">{sufficientCount} dosen</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <span className="font-medium text-red-800">Beban Kurang (&lt;12 SKS)</span>
                                    <Badge className="bg-red-600">{insufficientCount} dosen</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                                    <span className="font-medium text-amber-800">Beban Lebih (&gt;16 SKS)</span>
                                    <Badge className="bg-amber-600">{excessCount} dosen</Badge>
                                </div>

                                <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-2">Tahun Ajaran: {selectedAcademicYearName || '-'}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Data ini dapat digunakan sebagai benchmark untuk perencanaan
                                        beban mengajar tahun ajaran berikutnya.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default HistoriMengajarPage;
