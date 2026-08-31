<?php

namespace App\Services\SaaS;

use App\Models\Central\CentralUser;
use Illuminate\Support\Facades\DB;

class PlatformProfileService
{
    public function __construct(private readonly CentralAuditService $audit) {}

    /**
     * @param  array<string, mixed>  $data  Validated payload only.
     */
    public function update(CentralUser $user, array $data): CentralUser
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($user, $data): CentralUser {
            $old = ['user' => $user->only(['first_name', 'last_name', 'phone', 'timezone', 'avatar']), 'profile' => $user->profile?->only(self::PROFILE_FIELDS)];
            $user->fill(collect($data)->only(['first_name', 'last_name', 'phone', 'timezone', 'country', 'locale', 'avatar'])->all());
            $user->name = trim($user->first_name.' '.$user->last_name) ?: $user->name;
            $user->save();

            $profile = $user->profile()->firstOrCreate([]);
            $profile->fill(collect($data)->only(self::PROFILE_FIELDS)->all());
            $profile->save();
            $user->setRelation('profile', $profile);

            $this->audit->log(request(), 'platform-user.profile_updated', $user, $old, ['user' => $user->only(['first_name', 'last_name', 'phone', 'timezone', 'avatar']), 'profile' => $profile->only(self::PROFILE_FIELDS)]);

            return $user;
        });
    }

    public const PROFILE_FIELDS = [
        'job_title', 'company', 'phone_secondary', 'date_of_birth',
        'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country',
        'preferred_currency', 'preferred_language', 'timezone', 'avatar', 'bio', 'notification_preferences',
    ];
}
