import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User } from "lucide-react";
import { useLecturers } from "@/hooks/useLecturers";
import StatusBadge from "./StatusBadge";

const LecturersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: lecturers, isLoading } = useLecturers();

  const filteredLecturers = lecturers?.filter(lecturer =>
    lecturer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecturer.status.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getWorkloadStatus = (total: number) => {
    const targetSKS = 12;
    if (total < targetSKS) return "insufficient";
    if (total === targetSKS) return "sufficient";
    return "excess";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Data Dosen</h1>
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
        <h1 className="text-3xl font-bold">Data Dosen</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Dosen
        </Button>
      </div>

      <div className="flex items-center space-x-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari dosen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredLecturers.map((lecturer) => (
          <Card key={lecturer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{lecturer.name}</h3>
                    <p className="text-muted-foreground">{lecturer.status}</p>
                    {lecturer.structuralPosition !== "Tidak Ada" && (
                      <Badge variant="outline" className="mt-1">
                        {lecturer.structuralPosition}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <StatusBadge status={getWorkloadStatus(lecturer.totalWorkload)} />
                  <div className="text-sm text-muted-foreground">
                    <div>Total: <span className="font-medium">{lecturer.totalWorkload.toFixed(1)} SKS</span></div>
                    <div>Mengajar: {lecturer.teachingSKS.toFixed(1)} | Jabatan: {lecturer.structuralSKS}</div>
                  </div>
                </div>
              </div>

              {lecturer.courses && lecturer.courses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium mb-2">Mata Kuliah yang Diampu:</h4>
                  <div className="flex flex-wrap gap-2">
                    {lecturer.courses.map((course) => (
                      <Badge key={course.id} variant="secondary" className="text-xs">
                        {course.name} ({course.sks} SKS)
                        {course.sharedWith > 1 && (
                          <span className="ml-1 text-muted-foreground">
                            ÷{course.sharedWith}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLecturers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Tidak ada dosen ditemukan</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Coba kata kunci lain" : "Belum ada data dosen"}
          </p>
        </div>
      )}
    </div>
  );
};

export default LecturersPage;