// =========================================================================
// 1. INITIALIZATION & CONFIGURATION
// =========================================================================
const supabaseUrl = 'https://jjsuczcuipdojsbfutaq.supabase.co';
const supabaseKey = 'sb_publishable_C42OxgLWxLUxaOmn9l6_kg_SLLnBzPv'; 
const { createClient } = window.supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'triangle_run';

// =========================================================================
// 2. UNIVERSAL DATABASE HELPERS (CRUD)
// =========================================================================

// FETCH ALL ROWS
async function fetchAllFromTable(tableName) {
    const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error(`Error fetching from ${tableName}:`, error.message);
        return null;
    }
    return data;
}

// UPDATE A ROW
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

// Reset every single item's amount_needed to 0
async function clearAllAmounts() {
    const safetyConfirmation = confirm("Are you sure you want to reset ALL inventory amounts back to 0?");
    if (!safetyConfirmation) return; 

    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update({ amount_needed: 0 })
        .gt('id', 0); 

    if (error) {
        console.error("Error clearing all amounts:", error.message);
        alert("Something went wrong while resetting the database.");
        return;
    }

    console.log("All amounts successfully reset to 0!");
    loadDataForTriangleRun();
}

// INSERT / ADD A NEW ROW
async function addRow(tableName, newRowData) {
    const { error } = await supabaseClient
        .from(tableName)
        .insert([newRowData]);

    if (error) {
        console.error(`Error adding row to ${tableName}:`, error.message);
        return false;
    }
    
    loadDataForTriangleRun(); 
    return true;
}

// DELETE A ROW
async function deleteRow(tableName, rowId) {
    const { error } = await supabaseClient
        .from(tableName)
        .delete()
        .eq('id', rowId);

    if (error) {
        console.error(`Error deleting row ${rowId} from ${tableName}:`, error.message);
        return false;
    }
    
    loadDataForTriangleRun(); 
    return true;
}

// PARSE COLUMNS
function parseToParallelArrays(databaseRows, col1Name, col2Name) {
    const array1 = [];
    const array2 = [];
    if (databaseRows) {
        databaseRows.forEach(row => {
            array1.push(row[col1Name]);
            array2.push(row[col2Name]);
        });
    }
    return { array1, array2 };
}

// =========================================================================
// 3. APPLICATION UI LOGIC
// =========================================================================

function isDarkMode() {
    // Returns true if the device is in Dark Mode, false if in Light Mode
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Handle the + and - buttons
async function changeAmount(tableName, rowId, changeValue) {
    const displaySpan = document.getElementById(`display-${tableName}-${rowId}`);
    if (displaySpan) displaySpan.innerText = "..."; 

    const { data, error } = await supabaseClient
        .from(tableName)
        .select('amount_needed')
        .eq('id', rowId)
        .single();

    if (error) {
        console.error("Could not get current amount:", error);
        if (displaySpan) displaySpan.innerText = "Error";
        return;
    }

    let newAmount = data.amount_needed + changeValue;
    if (newAmount < 0) newAmount = 0;

    await updateRow(tableName, rowId, { amount_needed: newAmount });
    if (displaySpan) displaySpan.innerText = newAmount;
}

let isFetchingMode = false;
let gottenItems = new Set(); // This acts as our temporary "shopping cart" memory!

// Toggle fetching mode on and off
function toggleFetchingMode() {
    isFetchingMode = !isFetchingMode;
    // If they exit fetching mode early, clear the memory so it doesn't accidentally save later
    if (!isFetchingMode) {
        gottenItems.clear();
    }
    loadDataForTriangleRun(); 
}

// Function to temporarily mark an item as gotten on the screen (no database update yet)
function toggleGottenState(rowId) {
    const card = document.getElementById(`item-${rowId}`);
    const btn = document.getElementById(`gotten-btn-${rowId}`);

    if (gottenItems.has(rowId)) {
        // Undo the gotten state
        gottenItems.delete(rowId);
        card.style.opacity = "1"; // Return to normal visibility
        btn.innerText = "✅ Mark as Gotten";
    } else {
        // Mark as gotten
        gottenItems.add(rowId);
        card.style.opacity = "0.5"; // Dim the card to show it's done!
        btn.innerText = "↩️ Undo";
    }
}

// Finalize the run and push all "Gotten" items to the database
async function completeTriangleRun() {
    if (gottenItems.size === 0) {
        alert("You haven't marked any items as gotten yet!");
        return;
    }

    const confirmRun = confirm(`Ready to complete the run? This will set ${gottenItems.size} fetched item(s) back to 0.`);
    if (!confirmRun) return;

    // Convert our Set memory into a standard Array so Supabase can read it
    const idsToUpdate = Array.from(gottenItems);

    // Tell Supabase: Set amount_needed to 0 for ANY row whose ID is IN our idsToUpdate array
    const { error } = await supabaseClient
        .from(TABLE_NAME)
        .update({ amount_needed: 0 })
        .in('id', idsToUpdate);

    if (error) {
        console.error("Error completing run:", error.message);
        alert("Something went wrong while updating the database.");
        return;
    }

    console.log("Triangle run completed successfully!");
    
    // Clean up and reset everything
    gottenItems.clear();
    isFetchingMode = false; 
    loadDataForTriangleRun(); 
}

// =========================================================================
// 4. SEARCH BAR LOGIC
// =========================================================================

function setupSearchBar() {
    const searchInput = document.getElementById('item_search_input');
    const suggestionsList = document.getElementById('search_suggestions');

    // Close suggestions if the user clicks anywhere outside the search box
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.innerHTML = '';
        }
    });

    // Listen to every keystroke
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        suggestionsList.innerHTML = ''; // Wipe previous suggestions

        if (query === '') return;

        // Find all item cards CURRENTLY visible on the screen
        const itemCards = document.querySelectorAll('.item_card');
        let matchCount = 0;

        itemCards.forEach(card => {
            const itemNameElement = card.querySelector('.item_name');
            if (!itemNameElement) return;

            const itemName = itemNameElement.innerText;
            
            // If the item name contains the letters typed (e.g. "van" -> "Vanilla")
            if (itemName.toLowerCase().includes(query)) {
                
                // Create a dropdown option
                const li = document.createElement('li');
                li.className = 'suggestion_item';
                li.innerText = itemName;
                
                // When clicked, jump to the item!
                li.addEventListener('click', () => {
                    // Smoothly scroll the screen so the item is in the center
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Add a temporary highlight flash so the user knows which one to look at
                    card.classList.add('is_highlighted');
                    setTimeout(() => card.classList.remove('is_highlighted'), 2500);

                    // Clear the search bar out
                    searchInput.value = '';
                    suggestionsList.innerHTML = '';
                });
                
                suggestionsList.appendChild(li);
                matchCount++;
            }
        });

        // Show a "No items found" message if nothing matches
        if (matchCount === 0) {
            const li = document.createElement('li');
            li.className = 'suggestion_item no_results';
            li.innerText = 'No items found';
            suggestionsList.appendChild(li);
        }
    });

    // if (isDarkMode()) {
    //     const bgImage = document.getElementById("bgImage");
    //     bgImage.src = "./recs/logo-dark.png"
    // }
}

// Start up the search bar once the page loads
document.addEventListener('DOMContentLoaded', setupSearchBar);

// =========================================================================
// 5. DEVELOPER CONSOLE TOOLS
// =========================================================================

// Can handle single items: addItem("Oat Milk", "Dairy")
// OR bulk lists: addItem([{name: "Oat Milk", type: "Dairy"}, {name: "Splenda", type: "Sweeteners"}])
window.addItem = async function(input, optionalType) {
    // Case 1: User passed a bulk array of items
    if (Array.isArray(input)) {
        console.log(`🚀 Bulk Mode: Processing ${input.length} items sequentially...`);
        
        for (const item of input) {
            if (!item.name || !item.type) {
                console.warn("⚠️ Skipping invalid bulk item object. Must have {name, type}");
                continue;
            }
            // Wait for each item to finish completely before moving to the next
            await executeSingleAdd(item.name, item.type);
        }
        
        console.log("🏁 All bulk items processed!");
        return;
    }

    // Case 2: User passed a single item string
    await executeSingleAdd(input, optionalType);
};

// Internal isolated logic to handle database pushes cleanly
async function executeSingleAdd(name, type) {
    if (!name || !type) {
        console.error("❌ Missing info! Usage: addItem('Name', 'Category')");
        return false;
    }

    console.log(`⏳ Sending '${name}' to database...`);
    const success = await addRow(TABLE_NAME, { item_name: name, type: type });

    if (success) {
        console.log(`✅ Success! '${name}' added.`);
        return true;
    } else {
        console.error(`❌ Failed to add '${name}'`);
        return false;
    }
}