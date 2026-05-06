import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function UnitOfMeasurementShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Unit of Measurement"
            endpoint="/api/product-units/"
            backRoute="inventory.unit-of-measurements.index"
            backLabel="Back to Units of Measurement"
            titleField="name"
            subtitleField="symbol"
        />
    );
}
