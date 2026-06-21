import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import AccessControlTabs from '../AccessControlTabs';
import {
  roleApi,
  roleFields,
  roleInitialValues,
  roleValidationSchema,
  transformRolePayload,
  transformRoleRecord,
} from './roleFormConfig';

export default function RoleForm(props) {
  const id = props.id;
  const isEdit = Boolean(id);
  const title = isEdit ? 'Edit Role' : 'Create Role';

  const goBack = () => router.visit(route('hrm.roles.index'));

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<AccessControlTabs activeKey="roles" />}>
      <Head title={title} />

      <div className="role-form-page">
        <div className="role-form-page__header">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={goBack}>
              Back
            </Button>
            <SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <div>
              <h1>{title}</h1>
              <p>Set the role details and assign permissions from the seeded permission list.</p>
            </div>
          </Space>
        </div>

        <div className="role-form-page__body">
          <ReusableCrud
            icon={<SafetyCertificateOutlined />}
            title="Role"
            apiUrl={roleApi('/api/hrm/roles')}
            fields={roleFields}
            validationSchema={roleValidationSchema}
            crudInitialValues={roleInitialValues}
            transformPayload={transformRolePayload}
            transformRecord={transformRoleRecord}
            ui_type={isEdit ? 'edit form' : 'add form'}
            look_up_var={id}
            submitLabelOverride={isEdit ? 'Update Role' : 'Create Role'}
            onAddSuccess={goBack}
            onEditSuccess={goBack}
          />
        </div>
      </div>

      <style>{`
        .role-form-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .role-form-page__header {
          background: #fff;
          border: 1px solid #edf0f4;
          border-radius: 8px;
          padding: 16px;
        }

        .role-form-page__header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.25;
        }

        .role-form-page__header p {
          margin: 2px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .role-form-page__body {
          background: #fff;
          border: 1px solid #edf0f4;
          border-radius: 8px;
          padding: 16px;
        }
      `}</style>
    </AuthenticatedLayout>
  );
}
