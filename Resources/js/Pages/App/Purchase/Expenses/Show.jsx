import PaymentInRecordShow from '@/Pages/App/PaymentIn/Shared/PaymentInRecordShow';

export default function ExpenseShow({ id }) {
    return (
        <PaymentInRecordShow
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
