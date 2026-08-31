<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection(config('tenancy.database.central_connection'))->create('invoice_number_sequences', function (Blueprint $table): void {
            $table->id();
            $table->string('period', 20)->unique();
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection(config('tenancy.database.central_connection'))->dropIfExists('invoice_number_sequences');
    }
};
