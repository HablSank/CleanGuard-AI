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
        $data = Siswa::select('uid', 'nama', 'kelas', 'nis', 'total_buang')->get();
        $this->totalBaris = $data->count() + 1; 
        
        $currentRow = 2; 
        foreach ($data as $siswa) {
            if ($siswa->total_buang == 0 || is_null($siswa->total_buang)) {
                $siswa->total_buang = "0";
                $this->barisMerah[] = $currentRow;
            } else {
                $this->barisHijau[] = $currentRow;
            }
            $currentRow++;
        }
        
        return $data;
    }

    public function headings(): array
    {
        return ['UID RFID', 'Nama Lengkap', 'Kelas', 'NIS', 'Total Memilah'];
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