<?php
namespace App\Http\Controllers\Central;
use App\Http\Controllers\Controller;
use App\Models\Central\CentralAuditLog;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
class ProfileController extends Controller
{
    public function edit(Request $request){$admin=$request->user('central')->load('roles:id,label');return Inertia::render('Central/Profile/Edit',['admin'=>$admin,'activity'=>CentralAuditLog::where('admin_id',$admin->id)->latest('created_at')->limit(12)->get(['id','action','model_type','model_id','created_at'])]);}
    public function update(Request $request, CentralAuditService $audit){$admin=$request->user('central');$before=$admin->only(['name','email','locale','timezone','avatar_path']);$data=$request->validate(['name'=>['required','string','max:255'],'email'=>['required','email',Rule::unique('central_admin_users')->ignore($admin)],'locale'=>['required','string','max:12'],'timezone'=>['required','timezone'],'avatar'=>['nullable','image','mimes:jpg,jpeg,png,webp','max:2048']]);if($request->hasFile('avatar')){if($admin->avatar_path)Storage::disk('public')->delete($admin->avatar_path);$data['avatar_path']=$request->file('avatar')->store('central/avatars','public');}unset($data['avatar']);$admin->update($data);$audit->log($request,'profile.updated',$admin,$before,$admin->fresh()->only(array_keys($before)));return back()->with('success','Profile updated.');}
    public function password(Request $request, CentralAuditService $audit){$data=$request->validate(['current_password'=>['required','current_password:central'],'password'=>['required','string','min:12','confirmed']]);$request->user('central')->update(['password'=>Hash::make($data['password'])]);$audit->log($request,'profile.password_changed',$request->user('central'));return back()->with('success','Password changed.');}
}
