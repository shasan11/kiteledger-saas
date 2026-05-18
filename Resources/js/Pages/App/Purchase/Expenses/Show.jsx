import PaymentOutRecordShow from '@/Pages/App/PaymentOut/Shared/PaymentOutRecordShow';

export default function ExpenseShow({ id }) {
    return (
        <PaymentOutRecordShow
            id={id}
            title="Expense"
            endpoint="/api/expenses/"
            backRoute="payment-out.expenses.index"
            backLabel="Back to Expenses"
            documentType="expense"
            editRoute="payment-out.expenses.edit"
        />
    );
}
