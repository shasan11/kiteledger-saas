<?php

namespace App\Enums;

enum PlatformUserStatus: string
{
    case Active = 'active';
    case Invited = 'invited';
    case Suspended = 'suspended';
    case Disabled = 'disabled';

    public function canSignIn(): bool
    {
        return $this === self::Active;
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
