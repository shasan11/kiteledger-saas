<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogPost;
use App\Models\Central\Media;
use App\Models\Central\WebsitePage;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $query = Media::query()->withCount(['blogPosts', 'websitePages']);
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('original_filename', 'like', $term)->orWhere('title', 'like', $term)->orWhere('alt_text', 'like', $term));
        }
        if ($request->filled('type')) {
            $query->where('mime_type', 'like', $request->string('type').'%');
        }

        return Inertia::render('Central/Media/Index', ['media' => $query->latest()->paginate(30)->withQueryString(), 'filters' => $request->only('search', 'type')]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate(['file' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,svg,pdf,doc,docx', 'max:20480'], 'title' => ['nullable', 'string', 'max:255'], 'alt_text' => ['nullable', 'string', 'max:255'], 'caption' => ['nullable', 'string', 'max:1000']]);
        $file = $request->file('file');
        $path = $file->store('central/media/'.now()->format('Y/m'), 'public');
        $dimensions = str_starts_with((string) $file->getMimeType(), 'image/') && $file->getMimeType() !== 'image/svg+xml' ? @getimagesize($file->getRealPath()) : null;
        $media = Media::create(['disk' => 'public', 'path' => $path, 'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'width' => $dimensions[0] ?? null, 'height' => $dimensions[1] ?? null, 'title' => $data['title'] ?? null, 'alt_text' => $data['alt_text'] ?? null, 'caption' => $data['caption'] ?? null, 'uploaded_by' => $request->user('central')->id]);
        $audit->log($request, 'media.uploaded', $media, [], $media->only(['original_filename', 'mime_type', 'size', 'title', 'alt_text']));

        return back()->with('success', 'Media uploaded.');
    }

    public function update(Request $request, Media $media, CentralAuditService $audit)
    {
        $data = $request->validate(['file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,gif,webp,svg,pdf,doc,docx', 'max:20480'], 'title' => ['nullable', 'string', 'max:255'], 'alt_text' => ['nullable', 'string', 'max:255'], 'caption' => ['nullable', 'string', 'max:1000']]);
        $before = $media->only(['original_filename', 'mime_type', 'size', 'title', 'alt_text', 'caption']);
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            unset($data['file']);
            $path = $file->store('central/media/'.now()->format('Y/m'), $media->disk);
            $dimensions = str_starts_with((string) $file->getMimeType(), 'image/') && $file->getMimeType() !== 'image/svg+xml' ? @getimagesize($file->getRealPath()) : null;
            $oldPath = $media->getRawOriginal('path');
            $data += ['path' => $path, 'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'width' => $dimensions[0] ?? null, 'height' => $dimensions[1] ?? null];
            $media->update($data);
            Storage::disk($media->disk)->delete($oldPath);
        } else {
            unset($data['file']);
            $media->update($data);
        }
        $audit->log($request, 'media.updated', $media, $before, $media->only(['original_filename', 'mime_type', 'size', 'title', 'alt_text', 'caption']));

        return back()->with('success', 'Media details saved.');
    }

    public function destroy(Request $request, Media $media, CentralAuditService $audit)
    {
        $uses = BlogPost::where('featured_media_id', $media->id)->count() + WebsitePage::where('featured_media_id', $media->id)->count();
        abort_if($uses > 0, 409, 'This file is still used by published content.');
        $audit->log($request, 'media.deleted', $media, $media->only(['original_filename', 'mime_type', 'size', 'title']));
        Storage::disk($media->disk)->delete($media->getRawOriginal('path'));
        $media->delete();

        return back()->with('success', 'Media deleted.');
    }
}
