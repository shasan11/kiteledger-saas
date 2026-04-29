import React, { useMemo } from "react";
import * as Yup from "yup";
import ReusableCrud from "@/Components/ResuableCrud";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function ContactGroupCrud() {
  const apiUrl = "/api/contact-groups";

  const initialValues = useMemo(
    () => ({
      name: "",
      parent_id: null,
      description: "",
      active: true,
    }),
    []
  );

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .required("Name is required")
      .max(255, "Name cannot be more than 255 characters"),

    parent_id: Yup.mixed().nullable(),

    description: Yup.string()
      .nullable()
      .max(1000, "Description cannot be more than 1000 characters"),

    active: Yup.boolean(),
  });

  const fields = useMemo(
    () => [
      {
        name: "name",
        label: "Group Name",
        type: "text",
        placeholder: "Enter contact group name",
        required: true,
        col: 24,
      },
      {
        name: "parent_id",
        label: "Parent Group",
        type: "fkSelect",
        placeholder: "Select parent group",
        fkUrl: "/api/contact-groups",
        fkValueKey: "id",
        fkLabelKey: "name",
        allowClear: true,
        col: 24,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Enter description",
        rows: 3,
        col: 24,
      },
     
    ],
    []
  );

  const columns = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        backendSort: true,
        width: "100",
        backendFilter: {
          type: "text",
          param: "name",
          placeholder: "Search name",
        },
        render: (value) => value || "-",
      },
      {
        title: "Parent Group",
        dataIndex: "parent_detail",
        width: "100",
        key: "parent",
        render: (_, record) => {
          return (
            record?.parent_detail?.name ||
            record?.parent_name ||
            record?.parent?.name ||
            "-"
          );
        },
      },
       
       
    ],
    []
  );

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Contact Groups</h2>}>
    <Head title="Contact Groups" />
    <ReusableCrud
      title="Contact Groups"
      apiUrl={apiUrl}
      fields={fields}
      columns={columns}
      validationSchema={validationSchema}
      crudInitialValues={initialValues}
      form_ui="modal"
      drawerWidth={720}
      modalWidth={720}
      showSearch={true}
      canAdd={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      hasActions={true}
      hasActionColumns={true}
      showRowActionMenu={true}
      enableServerPagination={true}
      enableInactiveDrawer={true}
      searchParam="search"
      pageParam="page"
      pageSizeParam="page_size"
      activeParam="active"
      sortMode="ordering"
      orderingParam="ordering"
      defaultSortField="name"
      defaultSortOrder="ascend"
    />
    </AuthenticatedLayout>
  );
}
