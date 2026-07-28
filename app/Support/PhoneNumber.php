<?php
namespace App\Support;
class PhoneNumber
{
    public const CALLING_CODES=['US'=>'+1','CA'=>'+1','GB'=>'+44','NP'=>'+977','IN'=>'+91','AE'=>'+971','AU'=>'+61','DE'=>'+49','FR'=>'+33','ES'=>'+34','IT'=>'+39','NL'=>'+31','PT'=>'+351','BR'=>'+55','ZA'=>'+27','SG'=>'+65','MY'=>'+60','JP'=>'+81'];
    public static function join(?string $code, ?string $number): ?string { $number=trim((string)$number);if($number==='')return null;if(str_starts_with($number,'+'))return '+'.preg_replace('/\D/','',substr($number,1));$digits=preg_replace('/\D/','',$number);$prefix='+'.preg_replace('/\D/','',(string)$code);return $prefix.$digits; }
    public static function callingCode(?string $country): string { return self::CALLING_CODES[strtoupper((string)$country)]??'+1'; }
}
