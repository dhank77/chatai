# Instalasi ChatAI di cPanel

Kebutuhan:
- cPanel dengan menu **Setup Node.js App** dan **Node.js versi 20 atau lebih baru**
- Project [Supabase](https://supabase.com)
- API key [SuperVibeCode](https://app.supervibecode.ai.id/keys)
- **HTTPS aktif** di domain/subdomain (cPanel → SSL/TLS Status → Run AutoSSL). Tanpa HTTPS, login tidak akan tersimpan.

---

## 1. Siapkan database (sekali saja)

1. Buka Supabase → project kamu → **SQL Editor** → **New query**
2. Tempel **seluruh** isi `supabase-schema.sql`, lalu klik **Run**

File ini aman dijalankan ulang dan tidak menghapus data.

## 2. Upload ke cPanel

1. cPanel → **File Manager** → buat folder `chatai` di home (sejajar dengan `public_html`, **bukan di dalamnya**)
2. Upload `chatai-cpanel.zip` ke folder itu → klik kanan → **Extract**

## 3. Isi konfigurasi `.env`

Lewati langkah ini jika zip dibuat dengan `--with-env`.

Di File Manager, salin `.env.example` menjadi `.env`, lalu edit isinya:

| Variabel | Isi dengan |
|---|---|
| `SUPERVIBECODE_API_KEY` | key dari app.supervibecode.ai.id/keys |
| `AI_CHAT_MODEL` | model chat, mis. `gpt-4o-mini` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | sama dengan dua baris di atasnya |
| `JWT_SECRET` | teks acak minimal 32 karakter |
| `APP_URL` | alamat situs, mis. `https://chat.domainkamu.com` |

> Kamu juga bisa mengisi variabel ini lewat tombol **Add Variable** di halaman Setup Node.js App. Nilai di sana mengalahkan isi `.env`.

## 4. Jalankan aplikasi

cPanel → **Setup Node.js App** → **Create Application**:

| Kolom | Nilai |
|---|---|
| Node.js version | **20** atau lebih baru |
| Application mode | Production |
| Application root | `chatai` |
| Application URL | domain/subdomain yang dipakai |
| Application startup file | `app.cjs` |

Klik **Create**. Setelah itu:

1. klik **Run NPM Install** dan tunggu sampai selesai;
2. klik **Restart**.

## 5. Cek instalasi

Buka **`https://domainkamu.com/setup`**. Semua baris harus hijau ✅. Jika ada yang merah, ikuti petunjuk di baris itu, lalu klik **Periksa ulang**.

Setelah semuanya hijau:

1. **Daftar akun** di `/register`;
2. upload dokumen di **Knowledge Base**;
3. buka **Widget Config** → buat widget → salin kode embed ke situs kamu.

---

## Update versi baru

1. Di komputer: jalankan `npm run package:cpanel`
2. Upload zip baru dan extract ke folder `chatai`, timpa semua file. File `.env` di server tidak ikut tertimpa jika zip dibuat tanpa `--with-env`.
3. Di Setup Node.js App, klik **Run NPM Install** lalu **Restart**.

## Masalah umum

| Gejala | Solusi |
|---|---|
| "application should not contain folder node_modules" | Hapus folder `node_modules` di `chatai`, lalu klik Run NPM Install |
| Halaman error 503 / tidak tampil | Pastikan startup file `app.cjs` dan Node ≥ 20. Lihat log `stderr.log` di folder aplikasi |
| `/setup` merah di "Tabel database" | Jalankan ulang `supabase-schema.sql` |
| `/setup` merah di "Embedding" atau "Model chat" | Cek key, saldo, dan izin model di dashboard SuperVibeCode |
| Widget tidak muncul di situs lain | Pastikan kode embed diambil dari dashboard situs yang sudah online (bukan localhost) |
| Login berhasil tapi kembali ke halaman login | Situs belum HTTPS. Aktifkan AutoSSL lalu buka lewat `https://` |
| Upload dokumen gagal di file besar | Naikkan batas upload/memori di cPanel. Maksimal file 10 MB |
