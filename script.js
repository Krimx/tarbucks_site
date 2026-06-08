// --- INITIALIZATION ---
const supabaseUrl = 'https://jjsuczcuipdojsbfutaq.supabase.co';
const supabaseKey = 'sb_publishable_C42OxgLWxLUxaOmn9l6_kg_SLLnBzPv'; // Your publishable key
const { createClient } = window.supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey); // Using supabaseClient to avoid naming collisions!

// --- HELPER FUNCTIONS ---

// Function 1: Fetch all rows from ANY table
async function fetchAllFromTable(tableName) {
    const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .order('id', { ascending: true }); // Keeps arrays ordered cleanly

    if (error) {
        console.error(`Error fetching from ${tableName}:`, error.message);
        return null;
    }
    return data;
}

// Function 2: Update ANY column in ANY table
// 'updateObject' looks like: { amount_needed: 5 } OR { is_ordered: true }
async function updateRow(tableName, rowId, updateObject) {
    const { error } = await supabaseClient
        .from(tableName)
        .update(updateObject)
        .eq('id', rowId);

    if (error) {
        console.error(`Error updating row ${rowId} in ${tableName}:`, error.message);
        return false;
    }
    return true;
}

// Function 3: Parse ANY two columns into parallel arrays
function parseToParallelArrays(databaseRows, col1Name, col2Name) {
    const array1 = [];
    const array2 = [];

    if (databaseRows) {
        databaseRows.forEach(row => {
            // Using bracket notation row[colName] allows us to use dynamic column names
            array1.push(row[col1Name]);
            array2.push(row[col2Name]);
        });
    }

    return { array1, array2 };
}