# MFA Payroll

Sistem penggajian untuk HR: data karyawan, parameter perusahaan, dan sepuluh rumus payroll yang mengacu pada aturan di Indonesia.

Versi yang sedang tayang: [pay-roll-theta.vercel.app](https://pay-roll-theta.vercel.app)

## Isi aplikasi

- Master data karyawan dan profil perusahaan
- Rumus THR, uang pesangon (1/173), cuti tidak dibayar, serta BPJS Ketenagakerjaan dan pensiun
- Slip gaji yang bisa dicetak
- Ekspor dan impor Excel dengan tiga lembar: master karyawan, absensi dan lembur, serta kamus rumus
- Data contoh karyawan untuk mencoba perhitungan

## Menjalankan

Buka `index.html` di peramban. Tidak ada proses build. Perhitungan berjalan di peramban.

## Teknologi

HTML, Tailwind CSS, dan JavaScript. Ekspor Excel memakai SheetJS.
