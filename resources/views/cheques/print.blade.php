<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Cheque {{ $cheque->cheque_no }}</title>
    <style>
        @page { size: {{ $width }}mm {{ $height }}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: Arial, "DejaVu Sans", sans-serif; color: #111; }
        .cheque {
            position: relative;
            width: {{ $width }}mm;
            height: {{ $height }}mm;
            overflow: hidden;
        }
        .field {
            position: absolute;
            white-space: nowrap;
            line-height: 1.1;
        }
        .sig img { display: block; }
        @media screen {
            body { background: #e9e9e9; padding: 16px; }
            .cheque { background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25); }
            .toolbar { margin-bottom: 12px; text-align: center; }
            .toolbar button {
                padding: 8px 18px; font-size: 14px; cursor: pointer;
                border: 1px solid #1677ff; background: #1677ff; color: #fff; border-radius: 6px;
            }
        }
        @media print { .toolbar { display: none; } body { background: #fff; padding: 0; } }
    </style>
</head>
<body>
    @if (!empty($autoPrint))
        <div class="toolbar"><button onclick="window.print()">Print Cheque</button></div>
    @endif

    <div class="cheque">
        @foreach ($fields as $key => $f)
            @if ($key === 'signature')
                <div class="field sig" style="left: {{ $f['x'] }}mm; top: {{ $f['y'] }}mm; text-align: {{ $f['align'] }};">
                    @if (!empty($signature_image))
                        <img src="{{ $signature_image }}" style="width: {{ $signature_width }}mm; height: {{ $signature_height }}mm; object-fit: contain;" alt="Signature">
                    @endif
                    <div style="border-top: 1px solid #111; width: {{ $signature_width }}mm; font-size: {{ $f['font_size'] }}px; text-align: center; padding-top: 1mm;">Authorized Signature</div>
                </div>
            @else
                <div class="field" style="left: {{ $f['x'] }}mm; top: {{ $f['y'] }}mm; font-size: {{ $f['font_size'] }}px; font-weight: {{ $f['font_weight'] }}; text-align: {{ $f['align'] }};">{{ $f['text'] }}</div>
            @endif
        @endforeach
    </div>

    @if (!empty($autoPrint))
        <script>
            window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });
        </script>
    @endif
    @include('partials.localization-script')
</body>
</html>
