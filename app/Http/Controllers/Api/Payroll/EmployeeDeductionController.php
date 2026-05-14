<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\Payroll\EmployeeAdditionController;
use App\Models\EmployeeDeduction;

class EmployeeDeductionController extends EmployeeAdditionController
{
    protected string $modelClass = EmployeeDeduction::class;
}
