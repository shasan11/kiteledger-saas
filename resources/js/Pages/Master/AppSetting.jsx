import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';

const hasPermission = (permissions = [], key) => Array.isArray(permissions) && permissions.includes(key);

export default function AppSetting(props) {
  const permissions = props?.auth?.permissions || [];
  const canView = hasPermission(permissions, 'app_setting.view');
  const canEdit = hasPermission(permissions, 'app_setting.update');

  const fields = [
    { name: 'app_name', label: 'App Name', type: 'text', required: true },
    { name: 'company_email', label: 'Company Email', type: 'email' },
    { name: 'timezone', label: 'Timezone', type: 'text' },
    { name: 'active', label: 'Active', type: 'switch' },
  ];

  const validationSchema = Yup.object().shape({
    app_name: Yup.string().required('App name is required'),
    company_email: Yup.string().nullable().email('Company email must be a valid email'),
    timezone: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="App Setting" />
      <ReusableCrud
        mode="singleton"
        title="App Setting"
        apiUrl="/api/master/app-setting"
        ui_type="edit form"
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={{ app_name: '', company_email: '', timezone: '', active: true }}
        canView={canView}
        canEdit={canEdit}
        canAdd={false}
        canDelete={false}
        hasActions={false}
        hasActionColumns={false}
        showRowActionMenu={false}
        bulkactions={[]}
        singleactions={[]}
        showSearch={false}
      />
    </AuthenticatedLayout>
  );
}
