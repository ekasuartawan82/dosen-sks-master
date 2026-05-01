# Data Safety and Release Rules

Dokumen ini menjadi pagar kerja saat aplikasi di-update, baik untuk fitur baru, bug fix, maupun deployment hosting.

## Prinsip Utama

- Deploy frontend tidak boleh menghapus atau menimpa data client.
- Update kode tidak boleh otomatis menjalankan reset data.
- Migration database production harus bersifat aman dan terkontrol.
- Backup wajib tersedia sebelum restore lokal atau migration server yang mengubah data.
- File rahasia, backup lokal, dan file temporary tidak boleh masuk GitHub.

## Data Client

Data lokal disimpan di `localStorage` dengan prefix `dosen_sks_`.

Aturan:

- Jangan mengubah `STORAGE_PREFIX` tanpa migration client yang jelas.
- Jangan panggil `localStorage.clear()` di aplikasi.
- Jangan hapus key `dosen_sks_*` saat startup aplikasi.
- Perubahan schema localStorage harus backward compatible.
- Restore JSON harus lewat `LocalStorageManager.importFromFile()` agar validasi dan sanitasi berjalan.
- Sebelum restore, sistem membuat restore point otomatis.

Backup lokal sudah dilindungi oleh:

- validasi `.json`
- batas ukuran 5 MB
- validasi versi backup
- checksum
- penolakan key berbahaya seperti `__proto__`, `constructor`, `prototype`
- sanitasi string dan struktur data
- restore point otomatis sebelum impor

## Data Server Supabase

Aturan migration:

- Hindari `DROP TABLE`, `TRUNCATE`, atau `DELETE` pada migration production.
- Hindari `UPDATE` massal tanpa kondisi yang sangat jelas.
- Migration schema sebaiknya additive: `ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`, `CREATE POLICY`.
- Jika perlu rename/drop, lakukan dalam dua release: tambah field baru dulu, migrasi data, baru hapus setelah tervalidasi.
- Jalankan backup Supabase sebelum migration yang mengubah data.
- Jangan commit SQL seed yang menimpa data production.
- Jangan gunakan service role key di frontend.

Migration hardening saat ini:

- `20260430000000_add_academic_year_to_assignments.sql`
- `20260430001000_harden_core_table_policies.sql`
- `20260501000000_production_admin_rls.sql`
- `20260501001000_multiuser_role_baseline.sql`
- `20260501002000_program_integrity_constraints.sql` audit/remediation multi-prodi
- `20260501003000_enforce_assignment_program_integrity.sql` enforcement multi-prodi setelah audit bersih

Multi-prodi integrity rules:

- Kelas wajib dipetakan ke satu program studi sebelum dipakai untuk penugasan baru.
- Penugasan dosen harus memakai mata kuliah dan kelas dari program studi yang sama.
- Dosen lintas prodi tidak boleh dimaknai dari `NULL`; kelayakan mengajar lintas prodi wajib eksplisit di `lecturer_programs`.
- `lecturers.home_program_id` hanya untuk prodi asal/pelaporan. Hak mengajar program ditentukan oleh `lecturer_programs`.
- Data lama yang belum punya mapping prodi harus masuk audit/remediation dulu, bukan di-backfill massal tanpa validasi akademik.

Remediation sebelum enforcement:

- `audit_classes_missing_program` harus `0`: setiap kelas lama dimapping manual ke prodi yang benar.
- `audit_assignment_program_mismatches` harus `0`: assignment dengan course/class beda prodi harus diperbaiki atau dibuat ulang.
- `audit_assignment_lecturer_program_gaps` harus `0`: setiap dosen pada assignment harus punya baris eksplisit di `lecturer_programs` untuk prodi kelas tersebut.
- Jangan jalankan migration enforcement `20260501003000_enforce_assignment_program_integrity.sql` sampai tiga audit view tersebut bersih.

## Production Access

Mode production harus memakai Supabase sebagai sumber data utama.

- Route aplikasi utama diproteksi login dan role `admin`.
- Akun operasional harus memiliki `profiles.role = 'admin'`.
- Role yang dikenali: `admin`, `operator`, `viewer`, `lecturer`, `user`.
- Role `user` adalah status default/pending dan tidak boleh membaca data akademik.
- Role non-admin belum boleh mengelola data akademik sampai permission per halaman selesai.
- Role per-prodi/kaprodi scoped access belum aktif. Saat ini admin/operator/viewer masih global lintas prodi sesuai RLS baseline.
- Local fallback hanya untuk development/demo. Jangan aktifkan `VITE_ENABLE_LOCAL_FALLBACK=true` di production.
- Jika Supabase gagal di production, aplikasi harus menampilkan error, bukan menyimpan data bayangan di browser.

## GitHub Hygiene

Tidak boleh masuk repo:

- `.env`
- `.env.*` kecuali `.env.example`
- `dist/`
- `node_modules/`
- `supabase/.temp/`
- file backup atau restore JSON

Jika `.env` pernah masuk Git, jangan lanjut deploy sebelum secret dirotasi dan rencana cleanup history disetujui. Detail audit production dicatat di [PRODUCTION_SECURITY_AUDIT.md](PRODUCTION_SECURITY_AUDIT.md).

Sebelum push:

```sh
npm run lint
npx tsc --noEmit
npm run build
git status --short
```

## Deployment

Untuk hosting static seperti InfinityFree:

1. Jalankan `npm run build`.
2. Upload isi folder `dist/` ke `htdocs`.
3. Pastikan `.htaccess` ikut terupload.
4. Pastikan migration Supabase sudah diterapkan.
5. Pastikan Supabase Auth redirect URL memuat domain hosting.

Deploy frontend tidak mengubah data server. Data server hanya berubah jika:

- admin memakai aplikasi untuk CRUD data
- migration Supabase dijalankan
- SQL manual dijalankan di database
- restore/import data dilakukan

## Rollback

Jika update frontend bermasalah:

- upload ulang build versi sebelumnya
- data client tidak berubah selama tidak ada restore/clear localStorage
- data Supabase tidak berubah selama tidak ada migration atau SQL manual

Jika restore lokal salah:

- gunakan tombol `Pulihkan Restore Point Terakhir` di halaman Profile

Jika migration server bermasalah:

- restore dari backup Supabase
- jangan mencoba memperbaiki dengan `DROP` atau `TRUNCATE` tanpa backup
