<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use NeuronAI\StructuredOutput\SchemaProperty;

/**
 * Layer C output: what the model is allowed to decide about a request.
 *
 * This is the ONLY structure the language model fills in during routing. It
 * carries no tenant id, branch id, fiscal-year id, permission, SQL, table name
 * or record id — the model classifies intent and extracts filters, and the
 * server resolves everything else from trusted context.
 *
 * Properties are public and non-readonly because Neuron's deserializer
 * hydrates them by reflection. Values are validated by CopilotRouter before
 * they influence execution.
 */
class CopilotClassification
{
    #[SchemaProperty(
        description: 'The single best intent for the user request.',
        required: true,
    )]
    public CopilotIntent $intent = CopilotIntent::Unsupported;

    #[SchemaProperty(
        description: 'Business module: sales, purchases, inventory, accounting, contacts, reports, hr, or general.',
        required: false,
        maxLength: 40,
    )]
    public string $module = 'general';

    #[SchemaProperty(
        description: 'Canonical metric key when the user asks for a number, e.g. accounts_receivable, net_sales, inventory_value. Empty when not a metric request.',
        required: false,
        maxLength: 60,
    )]
    public string $metric = '';

    #[SchemaProperty(
        description: 'Human-readable entity names mentioned by the user, such as a customer or supplier name. Never invent identifiers.',
        required: false,
        max: 10,
    )]
    public array $entities = [];

    #[SchemaProperty(
        description: 'Document or record statuses the user constrained the request to, e.g. outstanding, overdue, draft, paid.',
        required: false,
        max: 10,
    )]
    public array $statuses = [];

    #[SchemaProperty(
        description: 'Start of the requested period as YYYY-MM-DD. Empty when the user did not specify one.',
        required: false,
        maxLength: 10,
    )]
    public string $date_from = '';

    #[SchemaProperty(
        description: 'End of the requested period as YYYY-MM-DD. Empty when the user did not specify one.',
        required: false,
        maxLength: 10,
    )]
    public string $date_to = '';

    #[SchemaProperty(
        description: 'Named period when the user used a relative phrase: this_month, last_month, this_quarter, this_year, last_year, today. Empty otherwise.',
        required: false,
        maxLength: 30,
    )]
    public string $period_preset = '';

    #[SchemaProperty(
        description: 'Comparison period when the user asked to compare, using the same preset vocabulary. Empty when no comparison was requested.',
        required: false,
        maxLength: 30,
    )]
    public string $comparison_preset = '';

    #[SchemaProperty(
        description: 'Dimension to group results by, such as customer, supplier, product, branch or month. Empty when not requested.',
        required: false,
        maxLength: 40,
    )]
    public string $group_by = '';

    #[SchemaProperty(
        description: 'Sort direction, either asc or desc.',
        required: false,
        maxLength: 4,
    )]
    public string $sort_direction = 'desc';

    #[SchemaProperty(
        description: 'Maximum number of rows the user asked for. Use 0 when unspecified.',
        required: false,
        min: 0,
        max: 200,
    )]
    public int $limit = 0;

    #[SchemaProperty(
        description: 'True when answering correctly requires current data from the accounting database.',
        required: true,
    )]
    public bool $requires_live_data = false;

    #[SchemaProperty(
        description: 'True when answering requires KiteLedger documentation or a company document rather than live figures.',
        required: true,
    )]
    public bool $requires_knowledge = false;

    #[SchemaProperty(
        description: 'Fields that are essential to answer but were not supplied by the user. Leave empty when the request is complete.',
        required: false,
        max: 5,
    )]
    public array $missing_fields = [];

    #[SchemaProperty(
        description: 'Confidence in this classification between 0 and 1.',
        required: true,
    )]
    public float $confidence = 0.0;

    #[SchemaProperty(
        description: 'One short sentence explaining why this intent was chosen. No internal identifiers.',
        required: false,
        maxLength: 300,
    )]
    public string $reason = '';
}
