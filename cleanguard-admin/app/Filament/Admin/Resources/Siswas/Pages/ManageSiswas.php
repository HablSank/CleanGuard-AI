<?php

namespace App\Filament\Admin\Resources\Siswas\Pages;

use App\Filament\Admin\Resources\Siswas\SiswaResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;
use App\Exports\LaporanSiswa;
use Maatwebsite\Excel\Facades\Excel;
use Filament\Actions;

class ManageSiswas extends ManageRecords
{
    protected static string $resource = SiswaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),

            Actions\Action::make('export_excel')
                ->label('Export Laporan')
                ->icon('heroicon-o-document-arrow-down')
                ->color('success')
                ->action(function () {
                    return Excel::download(new LaporanSiswa, 'Laporan_Partisipasi_CleanGuard.xlsx');
                }),
        ];
    }
}
