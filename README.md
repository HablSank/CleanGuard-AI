# CleanGuard AI

Sistem kiosk untuk validasi dual-user dan pengelolaan sampah berbasis AI.

## Daftar Isi

- [Overview](#overview)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Setup](#setup)

## Overview

Sistem ini memvalidasi dua siswa menggunakan RFID, mendeteksi kehadiran mereka dan tempat sampah dengan AI, lalu mencatat partisipasi bulanan mereka.

Setiap siswa bisa berpartisipasi maksimal 1 kali per bulan. Riwayat disimpan di database dan bisa di-export sebagai laporan Excel bulanan dengan format warna (hijau = sudah ikut, merah = belum).

## Fitur

- Validasi 2 kartu RFID yang berbeda
- Rate limit 1 sesi per siswa per bulan
- Deteksi AI dual-model (siswa + tempat sampah) dengan YOLOv8
- Anti-flicker untuk stabilisasi deteksi
- Export Excel bulanan dengan color formatting (hijau/merah)
- Cetak struk thermal otomatis

## Tech Stack

Backend Kiosk: Python, Flask, OpenCV, PyTorch, YOLOv8, pywin32

Frontend Kiosk: Vue.js 3, Tailwind CSS, Axios

Admin: PHP, Laravel 11, Filament, MySQL, Maatwebsite Excel

Hardware: Logitech C270 (camera), Epson TM-T82X (thermal printer), USB RFID reader

## Setup

### Prasyarat
- Python 3.9+
- PHP 8.2+
- Node.js 18+
- MySQL 8.0+
- Windows 10/11 atau Linux

### Instalasi Python Kiosk (cleanguard-scanner)

```bash
cd cleanguard-scanner
python -m venv .venv
.venv\Scripts\activate  # Windows
# atau: source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

Jalankan:
```bash
python app.py
```
Kiosk akan berjalan di alamat: http://127.0.0.1:5000

### Instalasi Laravel Admin (cleanguard-admin)

```bash
cd cleanguard-admin
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

File `.env` - Database config:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cleanguard
DB_USERNAME=root
DB_PASSWORD=
```
Panel admin dapat diakses di alamat: http://127.0.0.1:8000/admin
