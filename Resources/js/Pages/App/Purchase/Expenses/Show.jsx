import AccountingRecordShow from '@/Pages/App/Accounting/Shared/AccountingRecordShow';

export default function ExpenseShow({ id }) {
    return (
        <AccountingRecordShow
            id={id}
            title="Expense"
            endpoint="/api/expenses/"
            backRoute="payment-out.expenses.index"
            backLabel="Back to Expenses"
            titleField="expense_no"
            subtitleField="description"
        />
    );
}
