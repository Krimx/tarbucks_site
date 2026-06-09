// dataLoader.js

// Load database rows, sort alphabetically, and dynamically build categories/cards out of nothing
async function loadDataForTriangleRun() {
    const allData = await fetchAllFromTable(TABLE_NAME); 
    
    const mainContentArea = document.getElementById('main-content-area');
    if (!mainContentArea) return;

    // 1. Build the Top Controls conditionally based on mode
    let topControlsHTML = `
        <div class="top_controls" style="margin-bottom: 2rem; display: flex; flex-direction: column; gap: 10px;">
            <button class="clear_all_button" onclick="clearAllAmounts()">🔄 Clear All Amounts</button>
            <button class="fetching_mode_button ${isFetchingMode ? 'is_fetching' : 'not_fetching'}" id="fetching-mode-button" onclick="toggleFetchingMode()">
                ${isFetchingMode ? 'Cancel Fetching Mode' : 'Enter Fetching Mode'}
            </button>
    `;

    // Add the "Complete Run" button ONLY if we are in fetching mode
    const fetchingButton = document.getElementById("fetching-mode-button");
    if (isFetchingMode) {
        topControlsHTML += `
            <button class="complete_run_button" onclick="completeTriangleRun()" style="background-color: var(--bg-color-light, #62a768); padding: 15px; font-weight: bold; border-radius: 8px;">
                🚀 Complete Triangle Run
            </button>
        `;
    }
    
    topControlsHTML += `</div>`;
    mainContentArea.innerHTML = topControlsHTML;

    if (!allData || allData.length === 0) return;

    // 2. SORT ALPHABETICALLY BY ITEM NAME
    allData.sort((a, b) => {
        const nameA = a.item_name || '';
        const nameB = b.item_name || '';
        return nameA.localeCompare(nameB);
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
        let itemType = item.type ? item.type.trim() : 'General';
        const containerId = `category-${itemType.toLowerCase().replace(/\s+/g, '-')}`;
        
        let targetContainer = document.getElementById(containerId);

        if (!targetContainer) {
            const categorySection = document.createElement('div');
            categorySection.className = 'category_section';
            categorySection.innerHTML = `
                <h2>${itemType}</h2>
                <div id="${containerId}" class="category_container"></div>
            `;
            mainContentArea.appendChild(categorySection);
            targetContainer = document.getElementById(containerId);
        }

        // 5. DETERMINE WHICH BUTTONS TO SHOW BASED ON MODE
        let cardControlsHTML = '';
        
        if (isFetchingMode) {
            // Check if this item is currently in our memory
            const isGotten = gottenItems.has(item.id);
            const buttonText = isGotten ? "Undo" : "Mark as Gotten";

            // A single button taking up the whole space
            cardControlsHTML = `
                <button id="gotten-btn-${item.id}" class="card_button gotten_button" onclick="toggleGottenState(${item.id})">${buttonText}</button>
            `;
        } else {
            // Standard management mode buttons 
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