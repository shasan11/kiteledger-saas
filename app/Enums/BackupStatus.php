<?php

namespace App\Enums;

enum BackupStatus: string
{
    case Pending = 'pending';
    case Running = 'running';
    case Completed = 'completed';
    case Failed = 'failed';
    case Verified = 'verified';
}
