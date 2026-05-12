<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Quotations
        if (Schema::hasTable('quotation_lines')) {
            Schema::table('quotation_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('quotation_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0);
                }
            });
        }

        // Sales Orders
        if (Schema::hasTable('sales_order_lines')) {
            Schema::table('sales_order_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('sales_order_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0);
                }
            });
        }

        // Invoices
        if (Schema::hasTable('invoice_lines')) {
            Schema::table('invoice_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('invoice_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0);
                }
            });
        }

        // Credit Notes / Sales Returns
        if (Schema::hasTable('sales_return_lines')) {
            Schema::table('sales_return_lines', function (Blueprint $table) {
                if (!Schema::hasColumn('sales_return_lines', 'discount_percent')) {
                    $table->decimal('discount_percent', 15, 2)->default(0);
                }

                if (!Schema::hasColumn('sales_return_lines', 'discount_amount')) {
                    $table->decimal('discount_amount', 15, 2)->default(0);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('quotation_lines')) {
            Schema::table('quotation_lines', function (Blueprint $table) {
                if (Schema::hasColumn('quotation_lines', 'discount_amount')) {
                    $table->dropColumn('discount_amount');
                }
            });
        }

        if (Schema::hasTable('sales_order_lines')) {
            Schema::table('sales_order_lines', function (Blueprint $table) {
                if (Schema::hasColumn('sales_order_lines', 'discount_amount')) {
                    $table->dropColumn('discount_amount');
                }
            });
        }

        if (Schema::hasTable('invoice_lines')) {
            Schema::table('invoice_lines', function (Blueprint $table) {
                if (Schema::hasColumn('invoice_lines', 'discount_amount')) {
                    $table->dropColumn('discount_amount');
                }
            });
        }

        if (Schema::hasTable('sales_return_lines')) {
            Schema::table('sales_return_lines', function (Blueprint $table) {
                if (Schema::hasColumn('sales_return_lines', 'discount_amount')) {
                    $table->dropColumn('discount_amount');
                }

                if (Schema::hasColumn('sales_return_lines', 'discount_percent')) {
                    $table->dropColumn('discount_percent');
                }
            });
        }
    }
};