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
2. Upload `chatai-cpanel.tar.gz` ke folder itu → klik kanan → **Extract**
3. Setelah diekstrak, hapus file `chatai-cpanel.tar.gz` dari server

## 3. Isi konfigurasi `.env`

Lewati langkah ini jika arsip dibuat dengan `--with-env`.

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
| Application startup file | `app.mjs` (default cPanel) atau `app.cjs`, keduanya bisa |

Klik **Create**. Setelah itu:

1. klik **Run NPM Install** dan tunggu sampai selesai;
2. klik **Restart**.

## 5. Cek instalasi

Buka **`https://domainkamu.com/setup`**. Semua baris harus hijau ✅. Jika ada yang merah, ikuti petunjuk di baris itu, lalu klik **Periksa ulang**.

Setelah semuanya hijau:

1. **Daftar akun** di `/register`;
2. upload dokumen di **Knowledge Base**;
3. buka **Widget Config** → buat widget → salin kode embed ke situs kamu.

## 6. Jangan jadikan folder domain sebagai Application root

Jika *Application root* sama dengan folder publik domain (mis. `/home/user/chatbot.domain.com`), LiteSpeed menyajikan file aplikasi (`stderr.log`, `server.mjs`, `package.json`, dll) langsung ke publik. Aturan `FilesMatch` di `.htaccess` **tidak bisa dipakai** untuk menutupnya, karena di LiteSpeed aturan itu ikut memblokir aplikasi sehingga seluruh situs menjadi 403.

Cara yang benar: letakkan aplikasi di folder **di luar** folder domain.

1. Buat folder `~/chatbot` (sejajar dengan `public_html`), lalu pindahkan semua file aplikasi ke sana, termasuk `.env`
2. Setup Node.js App → edit aplikasi → *Application root* = `chatbot` → **Save** → **Run NPM Install** → **Restart**
3. Biarkan folder domain hanya berisi `.htaccess` buatan cPanel

Jika belum sempat memindahkan, aturan aman sementara (hanya menutup folder) adalah:

```apache
# BEGIN ChatAI
RewriteEngine On
RewriteRule ^(build|tmp|node_modules|public)(/|$) - [F,L]
# END ChatAI
```

---

## Update versi baru

1. Di komputer: jalankan `npm run package:cpanel`
2. Upload `chatai-cpanel.tar.gz` baru dan extract ke folder `chatai`, timpa semua file. File `.env` di server tidak ikut tertimpa jika arsip dibuat tanpa `--with-env`.
3. Di Setup Node.js App, klik **Run NPM Install** lalu **Restart**.

## Masalah umum

| Gejala | Solusi |
|---|---|
| "application should not contain folder node_modules" | Hapus folder `node_modules` di `chatai`, lalu klik Run NPM Install |
| 503 dan `stderr.log` berisi `require is not defined in ES module scope` di `app.mjs` | cPanel menimpa `app.mjs` dengan template "Hello World". Extract ulang arsip (timpa `app.mjs`), lalu Restart |
| Halaman error 503 / tidak tampil | Pastikan startup file `app.cjs` dan Node ≥ 20. Lihat log `stderr.log` di folder aplikasi |
| `/setup` merah di "Tabel database" | Jalankan ulang `supabase-schema.sql` |
| `/setup` merah di "Embedding" atau "Model chat" | Cek key, saldo, dan izin model di dashboard SuperVibeCode |
| Widget tidak muncul di situs lain | Pastikan kode embed diambil dari dashboard situs yang sudah online (bukan localhost) |
| Login berhasil tapi kembali ke halaman login | Situs belum HTTPS. Aktifkan AutoSSL lalu buka lewat `https://` |
| Browser bilang "Not secure" / sertifikat tidak valid | Sertifikat masih self-signed. cPanel → SSL/TLS Status → centang domain → **Run AutoSSL** (DNS harus sudah mengarah ke server) |
| Muncul halaman "One moment, please…" dan widget tidak bisa chat | Perlindungan anti-bot hosting (WAF) memblokir panggilan API dari widget. Minta hosting/admin mengecualikan subdomain ini, minimal path `/api/*` dan `/chatbot.js` |
| `/setup` merah di Embedding/Model chat dengan `HTTP 404`, padahal key benar | Server me-resolve `app.supervibecode.ai.id` ke IP yang salah (zona DNS lokal di cPanel). cPanel → **Zone Editor** → domain `supervibecode.ai.id` → tambah/ubah **A record** `app` ke IP yang benar (cek dengan `dig app.supervibecode.ai.id` dari komputer lain) |
| Upload ditolak: "contains a virus … JS_Zip" | False positive antivirus untuk file .zip berisi JavaScript. Upload versi `.tar.gz` (hasil `npm run package:cpanel`), jangan .zip |
| Upload dokumen gagal di file besar | Naikkan batas upload/memori di cPanel. Maksimal file 10 MB |
