<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user()->load([
            'branch:id,name,code',
            'department:id,name',
            'employmentStatus:id,name',
            'role:id,name',
            'employeeProfile.branch:id,name,code',
            'employeeProfile.department:id,name',
            'employeeProfile.designation:id,name',
            'employeeProfile.employmentStatus:id,name',
            'employeeProfile.user:id,name,email',
        ]);

        $employeeProfile = $user->employeeProfile;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'profileUser' => $user,
            'employeeProfile' => $employeeProfile,
            'accountInfo' => [
                'roles' => method_exists($user, 'getRoleNames') ? $user->getRoleNames()->values() : collect(),
                'permissions_count' => method_exists($user, 'getAllPermissions') ? $user->getAllPermissions()->count() : null,
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $user->fill(collect($validated)->except(['image', 'remove_image'])->all());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->boolean('remove_image')) {
            $this->deleteStoredImage($user->image);
            $user->image = null;
        }

        if ($request->hasFile('image')) {
            $this->deleteStoredImage($user->image);
            $user->image = $request->file('image')->store('profile-photos', 'public');
        }

        $user->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    protected function deleteStoredImage(?string $path): void
    {
        if (!$path) {
            return;
        }

        $normalized = str($path)->replaceStart('/storage/', '')->toString();

        if ($normalized !== $path || !str_starts_with($path, 'http')) {
            Storage::disk('public')->delete($normalized);
        }
    }
}
