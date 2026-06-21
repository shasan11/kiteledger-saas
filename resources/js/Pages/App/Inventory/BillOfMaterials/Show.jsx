import ManufacturingShow from '@/Pages/App/Inventory/Shared/ManufacturingShow';

export default function BillOfMaterialsShow({ id, ...props }) {
    return <ManufacturingShow id={id} documentType="bom" {...props} />;
}
