<?php

namespace App\Enums\Ai;

enum AiActionStatus: string
{
    case PENDING  = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case EXECUTED = 'executed';
    case FAILED   = 'failed';
    case EXPIRED  = 'expired';
}
