import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Save, Trash2, Database, Download, Upload, FileJson, Plus, Check, UserPlus, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStorageManager, getCurrentUserId, LocalStorageManager, getAllProfiles, createProfile, setCurrentUserId, deleteProfile } from "@/lib/storage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ProfilePage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [profiles, setProfiles] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [newProfileName, setNewProfileName] = useState("");
    const [newProfileEmail, setNewProfileEmail] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [hasRestorePoint, setHasRestorePoint] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const loadProfiles = () => {
        const allProfiles = getAllProfiles();
        setProfiles(allProfiles);
    };

    const loadCurrentProfile = () => {
        const currentUserId = getCurrentUserId();
        setUserId(currentUserId);

        const storage = getStorageManager(currentUserId);
        const profile = storage.getUserProfile();
        setHasRestorePoint(storage.hasRestorePoint());

        if (profile) {
            setName(profile.name);
            setEmail(profile.email);
        } else {
            setName("Default User");
            setEmail("");
        }
    };

    useEffect(() => {
        loadProfiles();
        loadCurrentProfile();
    }, []);

    const handleSave = () => {
        const storage = getStorageManager(userId);
        storage.saveUserProfile({
            id: userId,
            name,
            email
        });

        toast({
            title: "Profile tersimpan",
            description: "Data profile Anda telah diperbarui.",
        });
        setIsEditing(false);
        loadProfiles();
    };

    const handleCreateProfile = () => {
        if (!newProfileName.trim()) {
            toast({
                title: "Nama diperlukan",
                description: "Masukkan nama untuk profile baru.",
                variant: "destructive",
            });
            return;
        }

        const newId = createProfile(newProfileName.trim(), newProfileEmail.trim());
        setCurrentUserId(newId);
        
        toast({
            title: "Profile dibuat",
            description: `Profile "${newProfileName}" berhasil dibuat dan aktif.`,
        });

        setNewProfileName("");
        setNewProfileEmail("");
        setIsCreateDialogOpen(false);
        
        // Reload page to switch to new profile
        window.location.reload();
    };

    const handleSwitchProfile = (profileId: string) => {
        if (profileId === userId) return;
        
        setCurrentUserId(profileId);
        toast({
            title: "Profile diganti",
            description: "Halaman akan dimuat ulang.",
        });

        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    const handleDeleteProfile = (profileId: string) => {
        if (profiles.length <= 1) {
            toast({
                title: "Tidak dapat menghapus",
                description: "Minimal harus ada satu profile.",
                variant: "destructive",
            });
            return;
        }

        deleteProfile(profileId);
        
        toast({
            title: "Profile dihapus",
            description: "Profile telah dihapus.",
        });

        if (profileId === userId) {
            window.location.reload();
        } else {
            loadProfiles();
        }
    };

    const handleClearData = () => {
        const storage = getStorageManager(userId);
        storage.clearUserData();

        toast({
            title: "Data dihapus",
            description: "Semua data lokal telah dihapus. Refresh halaman untuk memuat ulang data mock.",
        });

        // Reload page after 2 seconds
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    };

    const handleExportData = () => {
        const storage = getStorageManager(userId);
        storage.downloadAsFile();

        toast({
            title: "Data berhasil diekspor",
            description: "File backup telah diunduh ke komputer Anda.",
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleRestorePoint = () => {
        const storage = getStorageManager(userId);
        const result = storage.restoreLastRestorePoint();

        if (result.success) {
            toast({
                title: "Restore point dipulihkan",
                description: result.message + ". Halaman akan dimuat ulang.",
            });
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            toast({
                title: "Restore point gagal",
                description: result.message,
                variant: "destructive",
            });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const exportData = await LocalStorageManager.importFromFile(file);
            const storage = getStorageManager(userId);
            const result = storage.importUserData(exportData);

            if (result.success) {
                toast({
                    title: "Import berhasil",
                    description: result.message + ". Halaman akan dimuat ulang.",
                });

                // Reload after import to refresh data
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                toast({
                    title: "Import gagal",
                    description: result.message,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Import gagal",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStorageSize = () => {
        let total = 0;
        for (const key in localStorage) {
            if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return (total / 1024).toFixed(2); // Convert to KB
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    Profile Akun
                </h1>
                <p className="text-muted-foreground mt-2">
                    Kelola informasi profile dan data lokal Anda
                </p>
            </div>

            {/* Profile Selector Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Pilih Profile
                        </span>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Buat Profile Baru
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Buat Profile Baru</DialogTitle>
                                    <DialogDescription>
                                        Buat profile baru untuk menyimpan data terpisah
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-name">Nama Profile</Label>
                                        <Input
                                            id="new-name"
                                            value={newProfileName}
                                            onChange={(e) => setNewProfileName(e.target.value)}
                                            placeholder="Contoh: Admin Prodi TI"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-email">Email (opsional)</Label>
                                        <Input
                                            id="new-email"
                                            type="email"
                                            value={newProfileEmail}
                                            onChange={(e) => setNewProfileEmail(e.target.value)}
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button onClick={handleCreateProfile}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Buat Profile
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardTitle>
                    <CardDescription>
                        Setiap profile memiliki data tersendiri yang terpisah
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profiles.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Belum ada profile. Buat profile baru untuk memulai.</p>
                            </div>
                        ) : (
                            profiles.map((profile) => (
                                <div
                                    key={profile.id}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        profile.id === userId
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                    onClick={() => handleSwitchProfile(profile.id)}
                                >
                                    {profile.id === userId && (
                                        <Badge className="absolute -top-2 -right-2 bg-primary">
                                            <Check className="h-3 w-3 mr-1" />
                                            Aktif
                                        </Badge>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white text-sm">
                                                {getInitials(profile.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{profile.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {profile.email || 'Tidak ada email'}
                                            </p>
                                        </div>
                                    </div>
                                    {profile.id !== userId && profiles.length > 1 && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Hapus Profile?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Semua data untuk profile "{profile.name}" akan dihapus permanen.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteProfile(profile.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Hapus
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Profile</CardTitle>
                    <CardDescription>
                        Data profile Anda tersimpan secara lokal di browser
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src="" alt={name} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary-glow text-white">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold">{name}</h3>
                            <p className="text-muted-foreground">{email}</p>
                            <Badge variant="outline" className="mt-2">
                                <Database className="h-3 w-3 mr-1" />
                                Mode Offline
                            </Badge>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? "Batal" : "Edit Profile"}
                        </Button>
                    </div>

                    {isEditing && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    <User className="h-4 w-4 inline mr-2" />
                                    Nama Lengkap
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Masukkan nama lengkap"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    <Mail className="h-4 w-4 inline mr-2" />
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Masukkan email"
                                />
                            </div>

                            <Button onClick={handleSave} className="w-full">
                                <Save className="h-4 w-4 mr-2" />
                                Simpan Perubahan
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Account Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Akun</CardTitle>
                    <CardDescription>
                        Detail teknis tentang penyimpanan data Anda
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">User ID</p>
                            <p className="font-mono text-sm bg-muted px-3 py-2 rounded">
                                {userId}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Storage Used</p>
                            <p className="font-mono text-sm bg-muted px-3 py-2 rounded">
                                {getStorageSize()} KB
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Mode Penyimpanan</p>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                <Database className="h-3 w-3 mr-1" />
                                LocalStorage (Browser)
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Data tersimpan di browser Anda
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Export/Import Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileJson className="h-5 w-5" />
                        Backup & Restore Data
                    </CardTitle>
                    <CardDescription>
                        Ekspor data Anda ke file JSON atau impor dari backup sebelumnya
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Ekspor Data
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Unduh semua data Anda dalam format JSON untuk backup atau pindah ke perangkat lain.
                            </p>
                            <Button onClick={handleExportData} className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Ekspor ke File JSON
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Impor Data
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Muat data dari file backup JSON. Data saat ini akan ditimpa.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                            <Button 
                                onClick={handleImportClick} 
                                variant="outline" 
                                className="w-full"
                                disabled={isImporting}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {isImporting ? "Mengimpor..." : "Impor dari File JSON"}
                            </Button>
                            <Button
                                onClick={handleRestorePoint}
                                variant="secondary"
                                className="w-full"
                                disabled={!hasRestorePoint || isImporting}
                            >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Pulihkan Restore Point Terakhir
                            </Button>
                        </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Data yang termasuk dalam backup:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                            <span>• Program Studi</span>
                            <span>• Kelas</span>
                            <span>• Dosen</span>
                            <span>• Mata Kuliah</span>
                            <span>• Penugasan</span>
                            <span>• Jadwal</span>
                            <span>• Pengaturan</span>
                            <span>• Profile</span>
                        </div>
                    </div>

                    <div className="border border-primary/20 bg-primary/5 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Perlindungan Restore
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <span>• Validasi format dan versi backup</span>
                            <span>• Batas ukuran file maksimal 5 MB</span>
                            <span>• Checksum untuk deteksi file berubah/rusak</span>
                            <span>• Blok key berbahaya pada JSON</span>
                            <span>• Sanitasi isi data sebelum disimpan</span>
                            <span>• Restore point otomatis sebelum impor</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Management Card */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Zona Berbahaya</CardTitle>
                    <CardDescription>
                        Tindakan yang tidak dapat dibatalkan
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus Semua Data Lokal
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini akan menghapus SEMUA data lokal Anda termasuk:
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Program Studi</li>
                                        <li>Kelas</li>
                                        <li>Dosen</li>
                                        <li>Mata Kuliah</li>
                                        <li>Penugasan</li>
                                        <li>Jadwal</li>
                                    </ul>
                                    <p className="mt-2 font-semibold">
                                        Data akan kembali ke data mock awal setelah refresh.
                                    </p>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleClearData}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Ya, Hapus Semua Data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <p className="text-sm text-muted-foreground text-center">
                        Data yang dihapus tidak dapat dikembalikan
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfilePage;
