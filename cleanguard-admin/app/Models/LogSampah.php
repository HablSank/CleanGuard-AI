<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogSampah extends Model
{
    protected $table = 'log_sampah';
    public $timestamps = false;
    protected $guarded = [];

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'uid', 'uid');
    }
}
