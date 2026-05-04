import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';

export default function Show({ id }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Lead Details
                </h2>
            }
        >
            <Head title="Lead Details" />

            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-700">
                Viewing lead: {id}
            </div>
        </AuthenticatedLayout>
    );
}
