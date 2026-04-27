import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Journal Voucher Lines
                </h2>
            }
        >
            <Head title="Journal Voucher Lines" />

            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-700">
                Journal Voucher Lines page
            </div>
        </AuthenticatedLayout>
    );
}
