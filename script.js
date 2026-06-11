// =========================================================================
// 1. INITIALIZATION & CONFIGURATION
// =========================================================================
const supabaseUrl = 'https://jjsuczcuipdojsbfutaq.supabase.co';
const supabaseKey = 'sb_publishable_C42OxgLWxLUxaOmn9l6_kg_SLLnBzPv'; 
const { createClient } = window.supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const TABLE_NAME = 'triangle_run';

// Global State Variables for Application Modes
let isFetchingMode = false;
let gottenItems = new Set(); // Acts as temporary fetching memory

let isEditingMode = false;
let stagedItems = [];        // Local copy of items used to queue changes before committing
let nextTempId = -1;         // Tracker for giving unique temporary IDs to new client items

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
// 3. APPLICATION UI LOGIC & MODES
// =========================================================================

function isDarkMode() {
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

// Toggle fetching mode on and off
function toggleFetchingMode() {
    if (isEditingMode) {
        alert("Please exit Editing Mode before entering Fetching Mode.");
        return;
    }
    isFetchingMode = !isFetchingMode;
    if (!isFetchingMode) {
        gottenItems.clear();
    }
    loadDataForTriangleRun(); 
}

// Function to temporarily mark an item as gotten on the screen
function toggleGottenState(rowId) {
    const card = document.getElementById(`item-${rowId}`);
    const btn = document.getElementById(`gotten-btn-${rowId}`);

    if (gottenItems.has(rowId)) {
        gottenItems.delete(rowId);
        card.style.opacity = "1"; 
        btn.innerText = "✅ Mark as Gotten";
    } else {
        gottenItems.add(rowId);
        card.style.opacity = "0.5"; 
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

    const idsToUpdate = Array.from(gottenItems);

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
    gottenItems.clear();
    isFetchingMode = false; 
    loadDataForTriangleRun(); 
}

// =========================================================================
// CLIENT-SIDE EDITING MODE MANAGEMENT
// =========================================================================

function toggleEditingMode() {
    if (isFetchingMode) {
        alert("Please exit Fetching Mode before entering Editing Mode.");
        return;
    }
    isEditingMode = !isEditingMode;
    if (!isEditingMode) {
        // Clear out any uncommitted client-side alterations
        stagedItems = [];
        nextTempId = -1;
    }
    loadDataForTriangleRun();
}

// Displays a clean, blurred modal overlay menu for naming/categories
function showAddItemModal() {
    let modal = document.getElementById('edit-mode-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-mode-modal';
        modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(5px);";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background: light-dark(#ffffff, #1e1e22); padding: 2rem; border-radius: 12px; width: 90%; max-width: 400px; border: 1px solid #ccc; display: flex; flex-direction: column; gap: 15px; color: light-dark(#111111, #f5f5f5);">
            <h3 style="margin-bottom: 5px;">✨ Add New Item</h3>
            <label style="font-size: 0.9rem; font-weight: bold;">Item Name:</label>
            <input type="text" id="modal-item-name" placeholder="e.g., White Mocha" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 1rem; width: 100%; background: inherit; color: inherit;">
            
            <label style="font-size: 0.9rem; font-weight: bold;">Category (Type):</label>
            <input type="text" id="modal-item-type" placeholder="e.g., sauce" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 1rem; width: 100%; background: inherit; color: inherit;">
            
            <div style="display: flex; gap: 10px; margin-top: 10px; height: 45px;">
                <button onclick="closeEditModal()" style="flex: 1; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; background: #951d1d; color: white;">Cancel</button>
                <button onclick="saveStagedItem(null)" style="flex: 1; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; background: #2e901a; color: white;">Stage Add</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function showEditItemModal(rowId) {
    const item = stagedItems.find(i => i.id === rowId);
    if (!item) return;

    let modal = document.getElementById('edit-mode-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-mode-modal';
        modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(5px);";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background: light-dark(#ffffff, #1e1e22); padding: 2rem; border-radius: 12px; width: 90%; max-width: 400px; border: 1px solid #ccc; display: flex; flex-direction: column; gap: 15px; color: light-dark(#111111, #f5f5f5);">
            <h3 style="margin-bottom: 5px;">✏️ Edit Item</h3>
            <label style="font-size: 0.9rem; font-weight: bold;">Item Name:</label>
            <input type="text" id="modal-item-name" value="${item.item_name}" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 1rem; width: 100%; background: inherit; color: inherit;">
            
            <label style="font-size: 0.9rem; font-weight: bold;">Category (Type):</label>
            <input type="text" id="modal-item-type" value="${item.type || ''}" style="padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 1rem; width: 100%; background: inherit; color: inherit;">
            
            <div style="display: flex; gap: 10px; margin-top: 10px; height: 45px;">
                <button onclick="closeEditModal()" style="flex: 1; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; background: #951d1d; color: white;">Cancel</button>
                <button onclick="saveStagedItem(${rowId})" style="flex: 1; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; background: #2e901a; color: white;">Stage Changes</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('edit-mode-modal');
    if (modal) modal.style.display = 'none';
}

function saveStagedItem(rowId = null) {
    const nameInput = document.getElementById('modal-item-name');
    const typeInput = document.getElementById('modal-item-type');
    if (!nameInput || !typeInput) return;

    let name = nameInput.value.trim();
    let type = typeInput.value.toLowerCase().trim();

    if (!name || !type) {
        alert("Both Item Name and Category fields are required.");
        return;
    }

    // Force strict title case for names
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    if (rowId === null) {
        // Build an uncommitted additions object
        const newItem = {
            id: nextTempId--,
            item_name: name,
            type: type,
            amount_needed: 0,
            is_new: true
        };
        stagedItems.push(newItem);
    } else {
        // Mark existing row for modifications locally
        const item = stagedItems.find(i => i.id === rowId);
        if (item) {
            item.item_name = name;
            item.type = type;
            item.is_edited = true;
        }
    }

    closeEditModal();
    loadDataForTriangleRun();
}

function stageDeleteItem(rowId) {
    const item = stagedItems.find(i => i.id === rowId);
    if (!item) return;

    const confirmStaging = confirm(`Staging delete: Are you sure you want to delete "${item.item_name}"? This won't hit the DB until you press Commit.`);
    if (!confirmStaging) return;

    if (item.is_new) {
        stagedItems = stagedItems.filter(i => i.id !== rowId);
    } else {
        item.is_deleted = true;
    }
    loadDataForTriangleRun();
}

// Performs a secure linear batch transaction to Supabase
async function commitEditingChanges() {
    const toDelete = stagedItems.filter(item => item.is_deleted && !item.is_new);
    const toAdd = stagedItems.filter(item => item.is_new && !item.is_deleted);
    const toUpdate = stagedItems.filter(item => item.is_edited && !item.is_deleted && !item.is_new);

    const netChangesCount = toDelete.length + toAdd.length + toUpdate.length;
    if (netChangesCount === 0) {
        alert("No staged adjustments found to commit.");
        return;
    }

    const verify = confirm(`Commit changes to live database?\n\n- Additions: ${toAdd.length}\n- Edits: ${toUpdate.length}\n- Deletions: ${toDelete.length}\n\nThis will permanently execute changes on your Supabase table.`);
    if (!verify) return;

    console.log("⏳ Flushing operations into Supabase transaction layer...");

    // 1. Process Deletions
    for (const item of toDelete) {
        await supabaseClient.from(TABLE_NAME).delete().eq('id', item.id);
    }

    // 2. Process Additions
    for (const item of toAdd) {
        await supabaseClient.from(TABLE_NAME).insert([{ item_name: item.item_name, type: item.type, amount_needed: 0 }]);
    }

    // 3. Process Edits/Updates
    for (const item of toUpdate) {
        await supabaseClient.from(TABLE_NAME).update({ item_name: item.item_name, type: item.type }).eq('id', item.id);
    }

    alert("🎉 Live database sync complete!");
    isEditingMode = false;
    stagedItems = [];
    nextTempId = -1;
    loadDataForTriangleRun();
}

// =========================================================================
// 4. SEARCH BAR LOGIC
// =========================================================================

function setupSearchBar() {
    const searchInput = document.getElementById('item_search_input');
    const suggestionsList = document.getElementById('search_suggestions');

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.innerHTML = '';
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        suggestionsList.innerHTML = ''; 

        if (query === '') return;

        const itemCards = document.querySelectorAll('.item_card');
        let matchCount = 0;

        itemCards.forEach(card => {
            const itemNameElement = card.querySelector('.item_name');
            if (!itemNameElement) return;

            const itemName = itemNameElement.innerText;
            if (itemName.toLowerCase().includes(query)) {
                const li = document.createElement('li');
                li.className = 'suggestion_item';
                li.innerText = itemName;
                
                li.addEventListener('click', () => {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('is_highlighted');
                    setTimeout(() => card.classList.remove('is_highlighted'), 2500);
                    searchInput.value = '';
                    suggestionsList.innerHTML = '';
                });
                
                suggestionsList.appendChild(li);
                matchCount++;
            }
        });

        if (matchCount === 0) {
            const li = document.createElement('li');
            li.className = 'suggestion_item no_results';
            li.innerText = 'No items found';
            suggestionsList.appendChild(li);
        }
    });
}

document.addEventListener('DOMContentLoaded', setupSearchBar);

// =========================================================================
// 5. DEVELOPER CONSOLE TOOLS
// =========================================================================

window.addItem = async function(input, optionalType) {
    if (Array.isArray(input)) {
        console.log(`🚀 Bulk Mode: Processing ${input.length} items sequentially...`);
        for (const item of input) {
            if (!item.name || !item.type) continue;
            await executeSingleAdd(item.name, item.type);
        }
        return;
    }
    await executeSingleAdd(input, optionalType);
};

async function executeSingleAdd(name, type) {
    if (!name || !type) return false;
    const success = await addRow(TABLE_NAME, { item_name: name, type: type });
    return success;
}