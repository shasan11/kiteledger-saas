import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Fixed Asset
                </h2>
            }
        >
            <Head title="Fixed Asset" />

            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-700">
                Fixed Asset page
            </div>
        </AuthenticatedLayout>
    );
}
