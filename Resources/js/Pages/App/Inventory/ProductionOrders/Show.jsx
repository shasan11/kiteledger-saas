import ManufacturingShow from '@/Pages/App/Inventory/Shared/ManufacturingShow';

export default function ProductionOrderShow({ id, ...props }) {
    return <ManufacturingShow id={id} documentType="production_order" {...props} />;
}
