<?php

namespace App\Filament\Admin\Resources\LogSampahs\Pages;

use App\Filament\Admin\Resources\LogSampahs\LogSampahResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;

class ManageLogSampahs extends ManageRecords
{
    protected static string $resource = LogSampahResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
