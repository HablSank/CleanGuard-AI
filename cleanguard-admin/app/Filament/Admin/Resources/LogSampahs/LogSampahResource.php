<?php

namespace App\Filament\Admin\Resources\LogSampahs;

use App\Filament\Admin\Resources\LogSampahs\Pages\ManageLogSampahs;
use App\Models\LogSampah;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class LogSampahResource extends Resource
{
    protected static ?string $model = LogSampah::class;

    protected static ?string $modelLabel = 'Log Sampah';
    protected static ?string $pluralModelLabel = 'Log Sampah';
    protected static ?string $navigationLabel = 'Log Sampah';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::Trash;

    protected static ?string $recordTitleAttribute = 'Log Sampah';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('uid')
                    ->required(),
                DateTimePicker::make('waktu')
                    ->required(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('Log Sampah')
            ->columns([
                TextColumn::make('uid')
                    ->searchable(),
                TextColumn::make('waktu')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageLogSampahs::route('/'),
        ];
    }
}
