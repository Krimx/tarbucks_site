// dataLoader.js

// =========================================================================
// CONFIGURATION
// =========================================================================
// Categories will appear on screen in exactly this order. 
// Any category not on this list will be pushed to the bottom and sorted alphabetically.
const CATEGORY_ORDER = [
    'syrup', 
    'sauce', 
    'base', 
    'inclusion', 
    'milk', 
    'coffee', 
    'topping', 
    'iced tea', 
    'hot tea', 
    'material', 
    'misc'
];

// =========================================================================
// HELPERS & LOGIC
// =========================================================================

function toTitleCase(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Load database rows, sort alphabetically/by category list, and dynamically build categories/cards
async function loadDataForTriangleRun() {
    let allData;
    
    // Intercept data requests: Render staging environment layout if active
    if (isEditingMode) {
        allData = stagedItems.filter(item => !item.is_deleted);
    } else {
        allData = await fetchAllFromTable(TABLE_NAME); 
        if (!allData) return;
        // Seed our staging system array whenever fresh pulls hit standard mode
        stagedItems = JSON.parse(JSON.stringify(allData));
    }
    
    const mainContentArea = document.getElementById('main-content-area');
    if (!mainContentArea) return;

    // 1. Build the Top Controls conditionally based on active application mode
    let topControlsHTML = `<div class="top_controls" style="margin-bottom: 2rem; display: flex; flex-direction: column; gap: 10px; align-items: center; width: 100%;">`;

    if (isEditingMode) {
        // Layout buttons specifically mapped to client-side configuration tweaks
        topControlsHTML += `
            <div style="display: flex; gap: 10px; width: 90%; justify-content: center; flex-wrap: wrap;">
                <button class="card_button" onclick="showAddItemModal()" style="background-color: #2e901a; color: white; padding: 12px; font-size: 1.1rem; border-radius: 8px; flex: 1; max-width: 200px;">➕ Add Item</button>
                <button class="card_button" onclick="commitEditingChanges()" style="background-color: #033907; color: white; padding: 12px; font-size: 1.1rem; border-radius: 8px; flex: 1; max-width: 200px;">💾 Commit Changes</button>
                <button class="card_button" onclick="toggleEditingMode()" style="background-color: #951d1d; color: white; padding: 12px; font-size: 1.1rem; border-radius: 8px; flex: 1; max-width: 200px;">❌ Cancel</button>
            </div>
        `;
    } else if (isFetchingMode) {
        topControlsHTML += `
            <button class="fetching_mode_button is_fetching" id="fetching-mode-button" onclick="toggleFetchingMode()">
                Cancel Fetching Mode
            </button>
            <button class="complete_run_button" onclick="completeTriangleRun()" style="background-color: var(--bg-color-light, #62a768); padding: 15px; font-weight: bold; border-radius: 8px; z-index: 1; width: 90%;">
                🚀 Complete Triangle Run
            </button>
        `;
    } else {
        // Standard Inventory Management panel
        topControlsHTML += `
            <button class="clear_all_button" onclick="clearAllAmounts()">🔄 Clear All Amounts</button>
            <button class="fetching_mode_button not_fetching" id="fetching-mode-button" onclick="toggleFetchingMode()">
                Enter Fetching Mode
            </button>
            <button class="fetching_mode_button" onclick="toggleEditingMode()" style="background-color: #4a4a4a; color: white; margin-top: 5px;">
                ✏️ Enter Editing Mode
            </button>
        `;
    }
    
    topControlsHTML += `</div>`;
    mainContentArea.innerHTML = topControlsHTML;

    if (!allData || allData.length === 0) return;

    // 2. SORT AND GROUP ITEMS
    allData.sort((a, b) => {
        const typeA = (a.type || 'General').toLowerCase().trim();
        const typeB = (b.type || 'General').toLowerCase().trim();

        if (typeA === typeB) {
            if (typeA === 'material') {
                return a.id - b.id; 
            }
            const nameA = a.item_name || '';
            const nameB = b.item_name || '';
            return nameA.localeCompare(nameB);
        }

        const indexA = CATEGORY_ORDER.indexOf(typeA);
        const indexB = CATEGORY_ORDER.indexOf(typeB);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return typeA.localeCompare(typeB);
    });

    // 3. APPLY FETCHING MODE FILTER
    const dataToDisplay = isFetchingMode 
        ? allData.filter(item => item.amount_needed > 0)
        : allData;

    if (isFetchingMode && dataToDisplay.length === 0) {
        mainContentArea.innerHTML += `<h3 style="text-align: center; margin-top: 2rem;">Everything is fully stocked! 🎉</h3>`;
        return; 
    }

    // 4. PROCESS EACH ITEM AND GENERATE CATEGORIES DYNAMICALLY
    dataToDisplay.forEach(item => {
        let itemType = item.type ? toTitleCase(item.type.trim()) : 'General';
        const containerId = `category-${itemType.toLowerCase().replace(/\s+/g, '-')}`;
        
        let targetContainer = document.getElementById(containerId);

        if (!targetContainer) {
            const categorySection = document.createElement('div');
            categorySection.className = 'category_section';
            categorySection.innerHTML = `
                <h2 class="item_type_header">${itemType}</h2>
                <div id="${containerId}" class="category_container"></div>
            `;
            mainContentArea.appendChild(categorySection);
            targetContainer = document.getElementById(containerId);
        }

        // 5. DETERMINE WHICH BUTTONS TO SHOW BASED ON MODE
        let cardControlsHTML = '';
        
        if (isEditingMode) {
            cardControlsHTML = `
                <button class="card_button" onclick="showEditItemModal(${item.id})" style="background-color: light-dark(#e0e0e0, #3a3a3a); margin-right: 5px;">Edit</button>
                <button class="card_button" onclick="stageDeleteItem(${item.id})" style="background-color: #951d1d; color: white;">Delete</button>
            `;
        } else if (isFetchingMode) {
            const isGotten = gottenItems.has(item.id);
            const buttonText = isGotten ? "Undo" : "Mark as Gotten";
            cardControlsHTML = `
                <button id="gotten-btn-${item.id}" class="card_button gotten_button" onclick="toggleGottenState(${item.id})">${buttonText}</button>
            `;
        } else {
            cardControlsHTML = `
                <button class="card_button" onclick="changeAmount('${TABLE_NAME}', ${item.id}, -1)">Decrease</button>
                <button class="card_button" onclick="changeAmount('${TABLE_NAME}', ${item.id}, 1)">Increase</button>
            `;
        }

        // 6. BUILD THE NEW FLEXBOX CARD LAYOUT
        const itemHTML = `
            <div class="item_card" id="item-${item.id}" style="${isFetchingMode && gottenItems.has(item.id) ? 'opacity: 0.5;' : ''}">
                
                <div class="item_information">
                    <h3 class="item_name">${item.item_name}</h3>
                    <p class="item_amount">Amount Needed: <span id="display-${TABLE_NAME}-${item.id}">${item.amount_needed}</span></p>
                </div>
                
                <div class="item_controls">
                    ${cardControlsHTML}
                </div>

            </div>
        `;
        
        targetContainer.innerHTML += itemHTML;
    });
}

// Execute the load on startup
loadDataForTriangleRun();