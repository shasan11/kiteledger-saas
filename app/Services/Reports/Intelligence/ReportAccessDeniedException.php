<?php

declare(strict_types=1);

namespace App\Services\Reports\Intelligence;

use RuntimeException;

/**
 * The user may not read the report they asked to have summarized.
 *
 * A dedicated type rather than a bare RuntimeException: AiProviderException
 * also extends RuntimeException, so a generic catch would report a missing API
 * key as a permission failure and send the administrator looking in the wrong
 * place.
 */
final class ReportAccessDeniedException extends RuntimeException {}
