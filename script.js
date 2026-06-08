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

// Function specifically for your + and - HTML buttons
async function changeAmount(tableName, rowId, changeValue) {
    // 1. Find the text on the screen and give instant visual feedback
    const displaySpan = document.getElementById(`display-${tableName}-${rowId}`);
    displaySpan.innerText = "..."; 

    // 2. Ask Supabase for the current amount for this specific row
    const { data, error } = await supabaseClient
        .from(tableName)
        .select('amount_needed')
        .eq('id', rowId)
        .single(); // .single() tells Supabase we only want one row back, not an array

    if (error) {
        console.error("Could not get current amount:", error);
        displaySpan.innerText = "Error";
        return;
    }

    // 3. Do the math
    let newAmount = data.amount_needed + changeValue;
    
    // Prevent the amount from dropping below zero
    if (newAmount < 0) {
        newAmount = 0;
    }

    // 4. Send the new total to the database using your universal helper function!
    await updateRow(tableName, rowId, { amount_needed: newAmount });

    // 5. Update the text on the screen to show the new saved number
    displaySpan.innerText = newAmount;
}