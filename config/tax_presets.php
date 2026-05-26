<?php

/**
 * Country-aware tax preset definitions.
 *
 * Each entry maps a country_code to the settings needed to bootstrap
 * its tax system: the tax_system record, default rates, components,
 * and which tax reports apply.
 */
return [

    'NP' => [
        'name'         => 'Nepal VAT',
        'currency'     => 'NPR',
        'tax_system'   => [
            'code' => 'nepal_vat',
            'name' => 'Nepal VAT',
            'type' => 'vat',
        ],
        'default_rate'     => 13,
        'tax_type'         => 'vat',
        'tax_name'         => 'VAT',
        'registration_types' => ['vat', 'pan'],
        'reports'          => [
            'sales-register'             => 'Sales VAT Register',
            'sales-return-register'      => 'Sales Return Register',
            'purchase-register'          => 'Purchase VAT Register',
            'purchase-return-register'   => 'Purchase Return Register',
            'vat-summary'                => 'VAT Summary',
            'tds'                        => 'TDS Report',
            'annex-13'                   => 'Annex 13',
            'annex-5-materialised-view'  => 'Annex 5 (Materialised View)',
        ],
        'withholding_system' => [
            'code' => 'nepal_withholding',
            'name' => 'Nepal Withholding',
            'type' => 'withholding',
        ],
    ],

    'IN' => [
        'name'         => 'India GST',
        'currency'     => 'INR',
        'tax_system'   => [
            'code' => 'india_gst',
            'name' => 'India GST',
            'type' => 'gst',
        ],
        'default_rate'     => 18,
        'tax_type'         => 'gst',
        'tax_name'         => 'GST',
        'registration_types' => ['gstin'],
        'components'       => ['CGST', 'SGST', 'IGST'],
        'reports'          => [
            'sales-register'           => 'Sales Register',
            'purchase-register'        => 'Purchase Register',
            'gstr-1'                   => 'GSTR-1',
            'gstr-3b'                  => 'GSTR-3B',
            'hsn-summary'              => 'HSN Summary',
        ],
        'tds_system' => [
            'code' => 'india_tds',
            'name' => 'India TDS',
            'type' => 'withholding',
        ],
    ],

    'US' => [
        'name'         => 'USA Sales Tax',
        'currency'     => 'USD',
        'tax_system'   => [
            'code' => 'usa_sales_tax',
            'name' => 'USA Sales Tax',
            'type' => 'sales_tax',
        ],
        'default_rate'     => 0,
        'tax_type'         => 'sales_tax',
        'tax_name'         => 'Sales Tax',
        'registration_types' => ['sales_tax_permit', 'ein'],
        'reports'          => [
            'sales-register'              => 'Sales Register',
            'purchase-register'           => 'Purchase Register',
            'state-sales-tax-summary'     => 'State Sales Tax Summary',
            'city-sales-tax-summary'      => 'City Sales Tax Summary',
        ],
    ],

    'GB' => [
        'name'         => 'UK VAT',
        'currency'     => 'GBP',
        'tax_system'   => [
            'code' => 'gb_vat',
            'name' => 'UK VAT',
            'type' => 'vat',
        ],
        'default_rate'     => 20,
        'tax_type'         => 'vat',
        'tax_name'         => 'VAT',
        'registration_types' => ['vat'],
        'reports'          => [
            'sales-register'        => 'Sales VAT Register',
            'purchase-register'     => 'Purchase VAT Register',
            'vat-summary'           => 'VAT Summary',
            'vat-100'               => 'VAT 100 Return',
        ],
    ],

    'FR' => [
        'name'         => 'France TVA',
        'currency'     => 'EUR',
        'tax_system'   => [
            'code' => 'france_tva',
            'name' => 'France TVA',
            'type' => 'vat',
        ],
        'default_rate'     => 20,
        'tax_type'         => 'vat',
        'tax_name'         => 'TVA',
        'registration_types' => ['vat'],
        'reports'          => [
            'sales-register'    => 'Sales Register',
            'purchase-register' => 'Purchase Register',
            'tva-collected'     => 'TVA Collected',
            'tva-deductible'    => 'TVA Deductible',
            'tva-summary'       => 'TVA Summary',
        ],
    ],

    'AE' => [
        'name'         => 'UAE VAT',
        'currency'     => 'AED',
        'tax_system'   => [
            'code' => 'uae_vat',
            'name' => 'UAE VAT',
            'type' => 'vat',
        ],
        'default_rate'     => 5,
        'tax_type'         => 'vat',
        'tax_name'         => 'VAT',
        'registration_types' => ['vat'],
        'reports'          => [
            'sales-register'    => 'Tax Invoice Register',
            'purchase-register' => 'Purchase Register',
            'vat-summary'       => 'VAT Summary',
            'vat-201'           => 'VAT 201 Return',
        ],
    ],

    'AU' => [
        'name'         => 'Australia GST',
        'currency'     => 'AUD',
        'tax_system'   => [
            'code' => 'australia_gst',
            'name' => 'Australia GST',
            'type' => 'gst',
        ],
        'default_rate'     => 10,
        'tax_type'         => 'gst',
        'tax_name'         => 'GST',
        'registration_types' => ['vat'],
        'reports'          => [
            'sales-register'    => 'Sales Register',
            'purchase-register' => 'Purchase Register',
            'gst-summary'       => 'GST Summary',
            'bas-report'        => 'BAS Report',
        ],
    ],

    'CA' => [
        'name'         => 'Canada GST/HST',
        'currency'     => 'CAD',
        'tax_system'   => [
            'code' => 'canada_gst',
            'name' => 'Canada GST/HST',
            'type' => 'gst',
        ],
        'default_rate'     => 5,
        'tax_type'         => 'gst',
        'tax_name'         => 'GST',
        'registration_types' => ['vat'],
        'reports'          => [
            'sales-register'    => 'Sales Register',
            'purchase-register' => 'Purchase Register',
            'gst-hst-summary'   => 'GST/HST Summary',
        ],
    ],

    'SG' => [
        'name'         => 'Singapore GST',
        'currency'     => 'SGD',
        'tax_system'   => [
            'code' => 'singapore_gst',
            'name' => 'Singapore GST',
            'type' => 'gst',
        ],
        'default_rate'     => 9,
        'tax_type'         => 'gst',
        'tax_name'         => 'GST',
        'registration_types' => ['vat'],
        'reports'          => [
            'sales-register'    => 'Sales Register',
            'purchase-register' => 'Purchase Register',
            'gst-f5'            => 'GST F5 Return',
        ],
    ],

];
