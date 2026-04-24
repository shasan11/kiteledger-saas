import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Departments
                </h2>
            }
        >
            <Head title="Departments" />

            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-700">
                Departments page
            </div>
        </AuthenticatedLayout>
    );
}
