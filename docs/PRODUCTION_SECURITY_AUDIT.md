# Production Security Audit

Tanggal audit: 2026-05-01

## Status Saat Ini

Project saat ini berada pada level **role-gated MVP untuk single institution**.

Ini belum multi-tenant aman. Role sudah dikenali, default user sudah dibatasi, dan write access sudah admin-only, tetapi data akademik belum dipisah berdasarkan institusi, program, atau kepemilikan dosen.

## Secret Dan Env

Temuan:

- `.env` pernah tracked di Git.
- Jejak commit yang menyertakan `.env`: `2ebe2972bc8531e7e4b4975ed6393ab6f0481a29`.
- `.env` sudah dihapus dari index dengan `git rm --cached .env`, sehingga file lokal tetap ada tetapi tidak ikut commit berikutnya.
- `.gitignore` sudah memblokir `.env` dan `.env.*` kecuali `.env.example`.

Wajib sebelum deploy production:

- Rotasi Supabase anon/publishable key jika nilai asli pernah ada di `.env` yang ter-commit.
- Rotasi secret lain yang pernah disimpan di `.env`.
- Bersihkan history Git secara terkontrol dengan tool seperti `git filter-repo` atau BFG, lalu force-push hanya setelah koordinasi.
- Jangan tampilkan isi secret di issue, PR, log, atau chat.

## Cleanup PR Plan

PR yang hanya menghapus `.env` dari branch biasa tetap dapat menampilkan nilai lama sebagai removed lines jika base branch masih punya `.env`. Kondisi itu tidak boleh di-merge.

Rencana aman:

1. Freeze merge/deploy dari PR yang masih menampilkan `.env` di diff.
2. Rotasi semua secret lama lebih dulu.
3. Lakukan history cleanup terkoordinasi pada branch/base repository, atau buat branch baru dari history yang sudah dibersihkan.
4. Pastikan `.env` tidak muncul sama sekali pada PR diff hasil cleanup.
5. Baru lanjut review/merge hardening setelah diff bersih dan secret lama tidak berlaku.

## RLS Coverage

Tabel yang sudah tercakup oleh hardening terbaru:

| Tabel | Read | Write |
| --- | --- | --- |
| `profiles` | own profile, admin all | self update tanpa role escalation, admin all |
| `programs` | admin/operator/viewer | admin only |
| `lecturers` | admin/operator/viewer | admin only |
| `courses` | admin/operator/viewer | admin only |
| `classes` | admin/operator/viewer | admin only |
| `assignments` | admin/operator/viewer | admin only |
| `schedules` | admin/operator/viewer | admin only |
| `settings` | admin/operator/viewer | admin only |
| `posts` | admin/operator/viewer | admin only |

Role yang dikenali:

- `admin`
- `operator`
- `viewer`
- `lecturer`
- `user`

Catatan penting:

- `user` adalah role pending dan tidak punya akses baca data akademik.
- `operator` dan `viewer` saat ini punya read-only global untuk data akademik single-institution.
- `lecturer` adalah staging role dan tidak termasuk global read data akademik.
- Lecturer-scoped access belum diaktifkan karena membutuhkan mapping aman `user_id -> lecturer_id`.
- Role per-prodi/kaprodi scoped access belum diaktifkan. Admin/operator/viewer masih membaca data lintas prodi.
- Semua read policy akademik masih single-institution, bukan tenant isolation.

## Multi-Prodi Data Integrity

Baseline multi-prodi memakai constraint database, bukan hanya filter UI:

- `classes.program_id` adalah sumber program untuk kelas.
- `courses.program_id` harus sama dengan `classes.program_id` pada setiap assignment baru.
- `lecturers.home_program_id` hanya prodi asal/pelaporan.
- Dosen yang boleh mengajar suatu prodi harus punya mapping eksplisit di `lecturer_programs`.
- `NULL` pada mapping dosen atau kelas bukan berarti lintas prodi; itu adalah data belum lengkap dan harus diremediasi.

Migration audit/remediation `20260501002000_program_integrity_constraints.sql` menambahkan:

- `lecturers.home_program_id`
- `lecturer_programs`
- view audit `audit_classes_missing_program`
- view audit `audit_assignment_program_mismatches`
- view audit `audit_assignment_lecturer_program_gaps`

Migration enforcement `20260502003000_enforce_assignment_program_integrity.sql` baru memasang trigger `validate_assignment_program()`. Migration ini memiliki guard dan harus gagal bila salah satu audit view masih berisi row.

Data lama yang masuk view audit belum boleh diperbaiki dengan backfill massal tanpa validasi akademik. Remediation wajib dilakukan terkontrol:

- kelas tanpa prodi dimapping manual ke prodi yang benar;
- assignment course/class mismatch diperbaiki sebelum enforcement;
- dosen harus punya mapping eksplisit di `lecturer_programs` untuk prodi kelas yang diajar.

### Historical Class Ambiguity

Audit remediation awal menemukan kelas historis yang tidak bisa langsung dipaksa ke satu prodi:

- 1 kelas tervalidasi dan sudah dapat dimapping ke prodi tunggal.
- 6 kelas berstatus `INVALID_HISTORICAL` karena berisi assignment dari beberapa prodi.
- 2 kelas berstatus `NO_DATA` karena tidak memiliki assignment evidence.

Final remediation bergantung pada konfirmasi domain akademik:

- Jika shared-class historis memang valid, kelas tersebut harus ditandai legacy/read-only dan tidak dipakai untuk assignment baru.
- Jika shared-class hanya artefak model lama, kelas harus dipecah per prodi dan assignment historis diremap secara terkontrol.

Tidak boleh menjalankan enforcement migration sampai keputusan domain tercatat dan audit bersih.

## Risiko Yang Masih Terbuka

### Tenant Isolation

Belum ada `institution_id` atau `tenant_id`. Jika aplikasi dipakai banyak kampus, semua app role non-`user` berpotensi membaca data seluruh kampus.

Rekomendasi:

- Tambah tabel `institutions`.
- Tambah `institution_id` ke `profiles`, `programs`, `lecturers`, `courses`, `classes`, `assignments`, `schedules`, `settings`, dan `posts`.
- RLS wajib membandingkan `institution_id` user dengan `institution_id` baris data.

### Lecturer Scoping

Role `lecturer` tidak boleh membaca semua data akademik.

Target ideal:

- Bisa melihat profil dosen dirinya.
- Bisa melihat assignment yang berisi `lecturer_id` miliknya.
- Bisa melihat jadwal dari assignment miliknya.
- Bisa melihat course/class yang terkait assignment miliknya.

Butuh mapping aman antara `auth.users.id`, `profiles.id`, dan `lecturers.id`.

### Bootstrap Admin

Admin pertama masih diset dengan SQL manual. Ini cukup untuk staging internal, tetapi rawan salah operasi.

Rekomendasi:

- Buat prosedur bootstrap eksplisit.
- Jalankan hanya sekali atau batasi pada daftar email yang diizinkan.
- Catat audit log siapa yang diangkat admin, kapan, dan oleh mekanisme apa.
- Setelah bootstrap, matikan self-signup jika aplikasi tidak untuk publik.

### Generate Jadwal

Generate jadwal saat ini melakukan delete lalu insert dari client. Jika proses putus di tengah, hasil bisa parsial.

Rekomendasi:

- Pindahkan generate jadwal ke RPC transactional.
- RPC menerima `class_id`, `academic_year`, dan daftar assignment.
- RPC menjalankan delete-insert dalam satu transaction.
- RPC memvalidasi role admin/operator sebelum mutasi.

### Migration Hygiene

Folder migration memiliki riwayat policy lama yang permisif dan beberapa migration bootstrap profil yang tampak duplikatif. Migration terbaru menutup policy lama, tetapi fresh database reset perlu diuji khusus sebelum production.

Rekomendasi:

- Jalankan Supabase migration reset di environment disposable.
- Verifikasi semua migration bisa replay dari nol.
- Tambahkan CI job database migration saat CLI/token sudah tersedia.

## CI

Workflow CI sudah ada di `.github/workflows/ci.yml`, tetapi folder `.github/` masih untracked.

Sebelum merge:

- Pastikan scope token GitHub mengizinkan workflow.
- Commit `.github/workflows/ci.yml`.
- Pastikan CI menjalankan `npm ci`, `npm run lint`, `npx tsc --noEmit`, dan `npm run build`.

## Gate Sebelum Production Publik

Minimal gate:

- Secret sudah dirotasi.
- `.env` sudah tidak tracked.
- History secret sudah dibersihkan atau repository private tetap dibatasi dan secret sudah tidak berlaku.
- Admin bootstrap terdokumentasi.
- RLS sudah diverifikasi di Supabase dengan akun `admin`, `operator`, `viewer`, `lecturer`, dan `user`.
- Generate jadwal sudah transactional.

Gate multi-tenant:

- Ada `institution_id`.
- RLS tenant isolation aktif di semua tabel akademik.
- Role lecturer sudah row-scoped.
- Test RLS negatif tersedia untuk cross-tenant access.
