<?php

namespace App\Enums;

enum DeletionStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Running = 'running';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Failed = 'failed';
}
