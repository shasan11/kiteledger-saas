import { Head, router } from '@inertiajs/react';
import { Button, Result } from 'antd';
import GuestLayout from '@/Layouts/GuestLayout';

export default function InvitationInvalid() {
    return (
        <GuestLayout>
            <Head title="Invitation unavailable" />
            <Result
                status="warning"
                title="This invitation is no longer valid"
                subTitle="It may have expired, been revoked, or already been accepted. Ask the company owner to send a new one."
                extra={<Button type="primary" onClick={() => router.visit(route('central.account.login'))}>Go to sign in</Button>}
            />
        </GuestLayout>
    );
}
