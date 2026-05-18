<?php

namespace App\Filament\Admin\Resources\Siswas\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class SiswaForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('uid')
                    ->label('UID RFID')
                    ->required()
                    ->unique(ignoreRecord: true),
                TextInput::make('nama')
                    ->required(),
                TextInput::make('kelas')
                    ->required(),
                TextInput::make('nis')
                    ->required()
                    ->numeric(),
                TextInput::make('total_buang')
                    ->required()
                    ->numeric()
                    ->default(0),
            ]);
    }
}
