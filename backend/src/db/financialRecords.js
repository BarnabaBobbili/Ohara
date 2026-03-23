const financialColumnsCache = new WeakMap();

const getFinancialRecordColumns = async (pool) => {
    const cached = financialColumnsCache.get(pool);
    if (cached) return cached;

    const [rows] = await pool.query('SHOW COLUMNS FROM financial_records');
    const columns = new Set((rows || []).map((row) => row.Field));
    financialColumnsCache.set(pool, columns);
    return columns;
};

const addColumnValue = (columns, values, knownColumns, column, value) => {
    if (!knownColumns.has(column)) return;
    if (value === undefined) return;
    columns.push(column);
    values.push(value);
};

export const insertFinancialRecord = async (pool, payload) => {
    const knownColumns = await getFinancialRecordColumns(pool);
    const columns = [];
    const values = [];

    const transactionType = payload.transaction_type || payload.type;

    addColumnValue(columns, values, knownColumns, 'member_id', payload.member_id);
    addColumnValue(columns, values, knownColumns, 'transaction_type', transactionType);
    addColumnValue(columns, values, knownColumns, 'amount', payload.amount);
    addColumnValue(columns, values, knownColumns, 'description', payload.description ?? null);
    addColumnValue(columns, values, knownColumns, 'processed_by', payload.processed_by || 'system');
    addColumnValue(columns, values, knownColumns, 'member_name', payload.member_name);
    addColumnValue(columns, values, knownColumns, 'member_card_id', payload.member_card_id);
    addColumnValue(columns, values, knownColumns, 'currency', payload.currency || 'INR');
    addColumnValue(columns, values, knownColumns, 'related_book_id', payload.related_book_id);
    addColumnValue(columns, values, knownColumns, 'related_book_title', payload.related_book_title);
    addColumnValue(columns, values, knownColumns, 'processed_by_id', payload.processed_by_id);
    addColumnValue(columns, values, knownColumns, 'payment_method', payload.payment_method);
    addColumnValue(columns, values, knownColumns, 'receipt_number', payload.receipt_number);

    if (payload.pg_transaction_id !== undefined && payload.pg_transaction_id !== null) {
        if (knownColumns.has('pg_transaction_id')) {
            addColumnValue(columns, values, knownColumns, 'pg_transaction_id', payload.pg_transaction_id);
        } else {
            addColumnValue(columns, values, knownColumns, 'related_transaction_id', payload.pg_transaction_id);
        }
    }

    const missingRequired = ['member_id', 'transaction_type', 'amount'].filter((column) => !columns.includes(column));
    if (missingRequired.length > 0) {
        throw new Error(`financial_records missing required columns: ${missingRequired.join(', ')}`);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO financial_records (${columns.join(', ')}) VALUES (${placeholders})`;
    await pool.execute(sql, values);
};

export const clearFinancialRecordSchemaCache = () => {
    financialColumnsCache.clear?.();
};
