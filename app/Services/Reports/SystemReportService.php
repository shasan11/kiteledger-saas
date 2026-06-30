<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'activity-log' => $this->activityLog($reportKey, $filters, $meta),
            'user-log' => $this->userLog($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported system report.'),
        };
    }

    protected function activityLog(string $reportKey, array $filters, array $meta): array
    {
        if (! Schema::hasTable('activity_logs')) {
            return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
                ['title' => 'Date/Time', 'key' => 'date_time'],
                ['title' => 'User', 'key' => 'user'],
                ['title' => 'Module', 'key' => 'module'],
                ['title' => 'Action', 'key' => 'action'],
                ['title' => 'Description', 'key' => 'description'],
                ['title' => 'IP', 'key' => 'ip'],
                ['title' => 'User Agent', 'key' => 'user_agent'],
            ], [], [], ['note' => 'Activity log table is not yet populated in this installation.']);
        }

        $rows = DB::table('activity_logs')
            ->leftJoin('users', 'users.id', '=', 'activity_logs.user_id')
            ->select('activity_logs.*', 'users.name as user_name')
            ->when(! empty($filters['module']), fn ($query) => $query->where('activity_logs.module', $filters['module']))
            ->when(! empty($filters['action']), fn ($query) => $query->where('activity_logs.action', $filters['action']))
            ->when(! empty($filters['user_id']), fn ($query) => $query->where('activity_logs.user_id', $filters['user_id']))
            ->whereBetween('activity_logs.created_at', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->get()
            ->map(fn ($row) => [
                'date_time' => $row->created_at,
                'user' => $row->user_name,
                'module' => $row->module,
                'action' => $row->action,
                'description' => $row->description,
                'ip' => $row->ip_address,
                'user_agent' => $row->user_agent,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date/Time', 'key' => 'date_time'],
            ['title' => 'User', 'key' => 'user'],
            ['title' => 'Module', 'key' => 'module'],
            ['title' => 'Action', 'key' => 'action'],
            ['title' => 'Description', 'key' => 'description'],
            ['title' => 'IP', 'key' => 'ip'],
            ['title' => 'User Agent', 'key' => 'user_agent'],
        ], $rows);
    }

    protected function userLog(string $reportKey, array $filters, array $meta): array
    {
        if (! Schema::hasTable('user_logs')) {
            return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
                ['title' => 'Date/Time', 'key' => 'date_time'],
                ['title' => 'User', 'key' => 'user'],
                ['title' => 'Event', 'key' => 'event'],
                ['title' => 'IP', 'key' => 'ip'],
                ['title' => 'Device/User Agent', 'key' => 'user_agent'],
                ['title' => 'Branch', 'key' => 'branch'],
                ['title' => 'Status', 'key' => 'status'],
            ], [], [], ['note' => 'User log table is not yet populated in this installation.']);
        }

        $rows = DB::table('user_logs')
            ->leftJoin('users', 'users.id', '=', 'user_logs.user_id')
            ->leftJoin('branches', 'branches.id', '=', 'user_logs.branch_id')
            ->select('user_logs.*', 'users.name as user_name', 'branches.name as branch_name')
            ->when(! empty($filters['user_id']), fn ($query) => $query->where('user_logs.user_id', $filters['user_id']))
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('user_logs.branch_id', $filters['branch_id']))
            ->whereBetween('user_logs.created_at', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->get()
            ->map(fn ($row) => [
                'date_time' => $row->created_at,
                'user' => $row->user_name,
                'event' => $row->event,
                'ip' => $row->ip_address,
                'user_agent' => $row->user_agent,
                'branch' => $row->branch_name,
                'status' => $row->status,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date/Time', 'key' => 'date_time'],
            ['title' => 'User', 'key' => 'user'],
            ['title' => 'Event', 'key' => 'event'],
            ['title' => 'IP', 'key' => 'ip'],
            ['title' => 'Device/User Agent', 'key' => 'user_agent'],
            ['title' => 'Branch', 'key' => 'branch'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }
}
