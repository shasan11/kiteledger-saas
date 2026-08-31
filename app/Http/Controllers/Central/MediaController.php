<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\BlogPost;
use App\Models\Central\Media;
use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsiteSection;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $query = Media::query()->withCount(['blogPosts', 'websitePages', 'websiteSections', 'websiteContentItems']);
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('original_filename', 'like', $term)->orWhere('title', 'like', $term)->orWhere('alt_text', 'like', $term));
        }
        if ($request->filled('type')) {
            $query->where('mime_type', 'like', $request->string('type').'%');
        }

        $media = $query->latest()->paginate(30)->withQueryString();
        if ($request->expectsJson()) {
            return response()->json($media);
        }

        return Inertia::render('Central/Media/Index', ['media' => $media, 'filters' => $request->only('search', 'type')]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $screenshot = $request->string('purpose')->toString() === 'website_screenshot';
        $data = $request->validate(['file' => ['required', 'file', $screenshot ? 'mimes:jpg,jpeg,png,webp,svg' : 'mimes:jpg,jpeg,png,gif,webp,svg,pdf,doc,docx', $screenshot ? 'max:10240' : 'max:20480'], 'purpose' => ['nullable', 'in:website_screenshot'], 'title' => ['nullable', 'string', 'max:255'], 'alt_text' => ['nullable', 'string', 'max:255'], 'caption' => ['nullable', 'string', 'max:1000']]);
        $file = $request->file('file');
        $this->assertSafeSvg($file);
        $path = $file->store('central/media/'.now()->format('Y/m'), 'public');
        $dimensions = str_starts_with((string) $file->getMimeType(), 'image/') && $file->getMimeType() !== 'image/svg+xml' ? @getimagesize($file->getRealPath()) : null;
        $media = Media::create(['disk' => 'public', 'path' => $path, 'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'width' => $dimensions[0] ?? null, 'height' => $dimensions[1] ?? null, 'title' => $data['title'] ?? null, 'alt_text' => $data['alt_text'] ?? null, 'caption' => $data['caption'] ?? null, 'uploaded_by' => $request->user('central')->id]);
        $audit->log($request, 'media.uploaded', $media, [], $media->only(['original_filename', 'mime_type', 'size', 'title', 'alt_text']));

        if ($request->expectsJson()) {
            return response()->json(['media' => $media], 201);
        }

        return back()->with('success', 'Media uploaded.');
    }

    public function update(Request $request, Media $media, CentralAuditService $audit)
    {
        $data = $request->validate(['file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,gif,webp,svg,pdf,doc,docx', 'max:20480'], 'title' => ['nullable', 'string', 'max:255'], 'alt_text' => ['nullable', 'string', 'max:255'], 'caption' => ['nullable', 'string', 'max:1000']]);
        $before = $media->only(['original_filename', 'mime_type', 'size', 'title', 'alt_text', 'caption']);
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $this->assertSafeSvg($file);
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
        $uses = BlogPost::where('featured_media_id', $media->id)->count()
            + WebsitePage::where('featured_media_id', $media->id)->count()
            + WebsiteSection::where('media_id', $media->id)->count()
            + WebsiteContentItem::where('media_id', $media->id)->count()
            + WebsiteSection::where(fn ($query) => $query->where('image', $media->url)->orWhere('image', $media->getRawOriginal('path')))->count()
            + WebsiteSection::where(fn ($query) => $query->where('settings', 'like', '%'.$media->url.'%')->orWhere('settings', 'like', '%\"media_id\":'.$media->id.'%')->orWhere('settings', 'like', '%\"media_id\": '.$media->id.'%')->orWhere('items', 'like', '%\"media_id\":'.$media->id.'%')->orWhere('items', 'like', '%\"media_id\": '.$media->id.'%'))->count()
            + WebsiteContentItem::where(fn ($query) => $query->where('data', 'like', '%'.$media->url.'%')->orWhere('data', 'like', '%\"media_id\":'.$media->id.'%')->orWhere('data', 'like', '%\"media_id\": '.$media->id.'%'))->count();
        abort_if($uses > 0, 409, 'This file is still used by published content.');
        $audit->log($request, 'media.deleted', $media, $media->only(['original_filename', 'mime_type', 'size', 'title']));
        Storage::disk($media->disk)->delete($media->getRawOriginal('path'));
        $media->delete();

        return back()->with('success', 'Media deleted.');
    }

    private function assertSafeSvg(UploadedFile $file): void
    {
        if (strtolower($file->getClientOriginalExtension()) !== 'svg') {
            return;
        }

        $svg = file_get_contents($file->getRealPath());
        $unsafe = $svg === false
            || preg_match('/<(script|foreignObject|iframe|object|embed)\b/i', $svg)
            || preg_match('/\son[a-z]+\s*=/i', $svg)
            || preg_match('/(?:href|src)\s*=\s*["\']\s*(?:javascript:|https?:|\/\/)/i', $svg);
        if ($unsafe) {
            throw ValidationException::withMessages(['file' => 'The SVG contains executable or externally loaded content and cannot be uploaded.']);
        }
    }
}
