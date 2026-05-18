<?php

namespace App\Exports;

use App\Models\Siswa;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class LaporanSiswa implements FromCollection, WithHeadings, WithStyles
{
    protected $barisMerah = [];
    protected $barisHijau = [];
    protected $totalBaris = 1;

    public function collection()
    {
        $data = Siswa::select('uid', 'nama', 'kelas', 'nis')
            ->withCount(['logSampah' => function ($query) {
                $query->whereMonth('waktu', now()->month)
                      ->whereYear('waktu', now()->year);
            }])
            ->get();

        $this->totalBaris = $data->count() + 1; 
        
        $currentRow = 2; 
        $formattedData = collect();

        foreach ($data as $siswa) {
            $jumlahMilahBulanIni = $siswa->log_sampah_count;

            if ($jumlahMilahBulanIni == 0) {
                $this->barisMerah[] = $currentRow;
            } else {
                $this->barisHijau[] = $currentRow;
            }

            $formattedData->push([
                'uid' => $siswa->uid,
                'nama' => $siswa->nama,
                'kelas' => $siswa->kelas,
                'nis' => $siswa->nis,
                'total_memilah' => $jumlahMilahBulanIni
            ]);

            $currentRow++;
        }
        
        return $formattedData;
    }

    public function headings(): array
    {
        return ['UID RFID', 'Nama Lengkap', 'Kelas', 'NIS', 'Total Memilah (Bulan Ini)'];
    }

    public function styles(Worksheet $sheet)
    {
        // Border Tabel
        $sheet->getStyle('A1:E' . $this->totalBaris)
              ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // Header
        $sheet->getStyle('A1:E1')->getFont()->setBold(true);
        $sheet->getStyle('A1:E1')->getFill()
              ->setFillType(Fill::FILL_SOLID)
              ->getStartColor()->setARGB('FFCCCCCC');

        // Siswa Belum Memilah
        foreach ($this->barisMerah as $row) {
            $sheet->getStyle("A{$row}:E{$row}")->getFill()
                  ->setFillType(Fill::FILL_SOLID)
                  ->getStartColor()->setARGB('FFFFC7CE'); 
        }

        // Siswa Sudah Memilah
        foreach ($this->barisHijau as $row) {
            $sheet->getStyle("A{$row}:E{$row}")->getFill()
                  ->setFillType(Fill::FILL_SOLID)
                  ->getStartColor()->setARGB('FFC6EFCE'); 
        }
    }
}