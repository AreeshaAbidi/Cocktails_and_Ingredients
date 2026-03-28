// Main visualization and interaction logic

class CocktailCupVisualizer {
    constructor() {
        this.mode = 'ingredients'; // 'ingredients' or 'drinks'
        this.selectedIngredients = [];
        this.selectedDrink = null;
        this.cupWidth = 300;
        this.cupHeight = 550;
        this.matchingCocktails = [];
        this.currentTab = 'cocktails';
        this.sortMode = 'name'; // 'name' or 'popularity'

        // New: tracking for unit-based measurements
        this.selectedUnits = new Map(); // ingredient -> selected unit
        this.ingredientQuantities = new Map(); // ingredient -> final quantity value
        
        // Store previous state for drink selection toggle
        this.previousIngredients = [];
        this.previousUnits = new Map();
        this.previousQuantities = new Map();

        // Saved charts
        this.savedCharts = [];
        this.currentView = 'main'; // 'main' or 'saved'
        
        // View all drinks mode
        this.viewingAllDrinks = false;
        this.filteredDrinks = [];
        this.currentDrinkFilters = {
            search: '',
            category: '',
            glass: '',
            alcoholicTypes: ['optional'] // multiselect array
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Loading data...');
            await dataManager.loadData();
            console.log('Data loaded successfully');

            this.setupEventListeners();
            this.updateSortButtonStates();
            this.drawInitialCup();
            this.updateUI();
            this.updateDropdownLabel();
        } catch (error) {
            console.error('Failed to initialize:', error);
            alert('Error loading data. Please refresh the page.');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Dropdown toggle
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const ingredientSearch = document.getElementById('ingredientSearch');

        dropdownToggle.addEventListener('click', () => {
            this.toggleDropdown();
        });

        // Search input
        ingredientSearch.addEventListener('input', (e) => this.handleSearchInput(e));

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container')) {
                this.closeDropdown();
            }
        });

        // Sort buttons
        document.getElementById('sortByNameBtn').addEventListener('click', () => {
            this.sortMode = 'name';
            this.updateSortButtonStates();
            this.populateDropdownList(document.getElementById('ingredientSearch').value);
        });

        document.getElementById('sortByPopularityBtn').addEventListener('click', () => {
            this.sortMode = 'popularity';
            this.updateSortButtonStates();
            this.populateDropdownList(document.getElementById('ingredientSearch').value);
        });

        // Random drink button
        document.getElementById('randomDrinkBtn').addEventListener('click', () => {
            this.selectRandomDrink();
        });

        // Clear all button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllIngredients();
        });

        // Add Escape key handler to close expanded card
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const card = document.getElementById('drinkInfoCard');
                if (card && card.classList.contains('expanded')) {
                    this.toggleCardExpand();
                }
            }
        });

        // Tab toggle button
        document.getElementById('tabToggleBtn').addEventListener('click', () => {
            this.switchView();
        });

        // Add to tab button
        document.getElementById('addToTabBtn').addEventListener('click', () => {
            this.saveCurrentChart();
        });

        // Clear saved button
        const clearSavedBtn = document.getElementById('clearSavedBtn');
        if (clearSavedBtn) {
            clearSavedBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all saved charts?')) {
                    this.clearAllSavedCharts();
                }
            });
        }

        // View all drinks button
        document.getElementById('viewAllDrinksBtn').addEventListener('click', () => {
            this.toggleViewAllDrinks();
        });

        // Filter toggle button
        document.getElementById('filterToggleBtn').addEventListener('click', () => {
            const filterContainer = document.getElementById('filterContainer');
            const filterBtn = document.getElementById('filterToggleBtn');
            filterContainer.style.display = filterContainer.style.display === 'none' ? 'flex' : 'none';
            filterBtn.classList.toggle('active');
        });

        // Drink search filter
        document.getElementById('drinkSearchFilter').addEventListener('input', (e) => {
            this.currentDrinkFilters.search = e.target.value.toLowerCase();
            this.applyDrinkFilters();
        });

        // Category filter
        document.getElementById('categoryFilterSelect').addEventListener('change', (e) => {
            this.currentDrinkFilters.category = e.target.value;
            this.applyDrinkFilters();
        });

        // Glass filter
        document.getElementById('glassFilterSelect').addEventListener('change', (e) => {
            this.currentDrinkFilters.glass = e.target.value;
            this.applyDrinkFilters();
        });

        // Alcoholic type filter (multiselect)
        document.querySelectorAll('.alcohol-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Toggle active class on clicked button (multiselect)
                e.target.classList.toggle('active');
                // Collect all selected alcoholic types
                const selectedTypes = Array.from(document.querySelectorAll('.alcohol-btn.active'))
                    .map(b => b.dataset.filter);
                this.currentDrinkFilters.alcoholicTypes = selectedTypes;
                this.applyDrinkFilters();
            });
        });

        // Clear filters button
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearDrinkFilters();
        });
    }

    /**
     * Update sort button visual states
     */
    updateSortButtonStates() {
        document.getElementById('sortByNameBtn').classList.toggle('active', this.sortMode === 'name');
        document.getElementById('sortByPopularityBtn').classList.toggle('active', this.sortMode === 'popularity');
    }

    /**
     * Toggle dropdown open/close
     */
    toggleDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');

        dropdownToggle.classList.toggle('open');
        dropdownMenu.classList.toggle('open');

        if (dropdownMenu.classList.contains('open')) {
            this.populateDropdownList();
            document.getElementById('ingredientSearch').focus();
        }
    }

    /**
     * Close dropdown
     */
    closeDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');

        dropdownToggle.classList.remove('open');
        dropdownMenu.classList.remove('open');
        document.getElementById('ingredientSearch').value = '';
    }

    /**
     * Switch between ingredients and drinks mode
     */
    switchMode(newMode) {
        if (this.mode === newMode) return;

        this.mode = newMode;
        this.selectedIngredients = [];
        this.selectedDrink = null;

        // Update button states
        document.getElementById('modeIngredients').classList.toggle('active');
        document.getElementById('modeDrinks').classList.toggle('active');

        // Update dropdown search placeholder and label
        const searchInput = document.getElementById('ingredientSearch');
        const dropdownLabel = document.getElementById('dropdownLabel');

        if (this.mode === 'ingredients') {
            searchInput.placeholder = 'Search ingredients...';
            dropdownLabel.textContent = 'Select ingredients...';
        } else {
            searchInput.placeholder = 'Search cocktails...';
            dropdownLabel.textContent = 'Choose a drink...';
        }

        // Reset and repopulate dropdown
        this.closeDropdown();
        this.updateDropdownLabel();
        this.drawInitialCup();
        this.updateUI();
    }
    /**
     * Populate dropdown list with ingredients or drinks based on mode
     */
    populateDropdownList(searchQuery = '') {
        const ingredientList = document.getElementById('ingredientList');

        if (this.mode === 'ingredients') {
            this.populateIngredientsList(searchQuery, ingredientList);
        } else {
            this.populateDrinksList(searchQuery, ingredientList);
        }
    }

    /**
     * Populate ingredients list
     */
    populateIngredientsList(searchQuery, ingredientList) {
        let ingredients = dataManager.getAllIngredients();

        // Filter ingredients based on search
        if (searchQuery.trim()) {
            const normalized = searchQuery.toLowerCase();
            ingredients = ingredients.filter(ing =>
                ing.name.includes(normalized) || ing.displayName.toLowerCase().includes(normalized)
            );
        }

        // Apply sorting based on sortMode
        if (this.sortMode === 'name') {
            // Sort alphabetically by display name
            ingredients.sort((a, b) => a.displayName.localeCompare(b.displayName));
        } else if (this.sortMode === 'popularity') {
            // Sort by usage count (how many drinks use this ingredient)
            ingredients.sort((a, b) => b.count - a.count);
        }

        if (ingredients.length === 0) {
            ingredientList.innerHTML = '<div class="dropdown-empty">No ingredients found</div>';
            return;
        }

        ingredientList.innerHTML = ingredients
            .map(ing => {
                const isSelected = this.selectedIngredients.includes(ing.name);
                return `
                    <div class="dropdown-item ${isSelected ? 'selected' : ''}" data-ingredient="${ing.name}">
                        <span class="dropdown-item-name">${ing.displayName}</span>
                        <span class="dropdown-item-count">${ing.count}</span>
                    </div>
                `;
            })
            .join('');

        // Add click handlers
        ingredientList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const ingredient = item.dataset.ingredient;
                this.addIngredient(ingredient);
                this.populateDropdownList(document.getElementById('ingredientSearch').value);
                this.updateDropdownLabel();
            });
        });
    }

    /**
     * Populate drinks list
     */
    populateDrinksList(searchQuery, ingredientList) {
        let drinks = dataManager.cocktails || [];

        // Filter drinks based on search
        if (searchQuery.trim()) {
            const normalized = searchQuery.toLowerCase();
            drinks = drinks.filter(drink =>
                drink.strDrink.toLowerCase().includes(normalized) ||
                drink.strCategory.toLowerCase().includes(normalized)
            );
        }

        drinks = drinks.slice(0, 50); // Limit to 50 drinks

        if (drinks.length === 0) {
            ingredientList.innerHTML = '<div class="dropdown-empty">No cocktails found</div>';
            return;
        }

        ingredientList.innerHTML = drinks
            .map(drink => {
                const isSelected = this.selectedDrink && this.selectedDrink.idDrink === drink.idDrink;
                return `
                    <div class="dropdown-item ${isSelected ? 'selected' : ''}" data-drink-id="${drink.idDrink}">
                        <span class="dropdown-item-name">${drink.strDrink}</span>
                        <span class="dropdown-item-count">${drink.strCategory}</span>
                    </div>
                `;
            })
            .join('');

        // Add click handlers
        ingredientList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const drinkId = item.dataset.drinkId;
                const drink = dataManager.cocktails.find(d => d.idDrink === drinkId);
                this.selectDrink(drink);
                this.closeDropdown();
            });
        });
    }

    /**
     * Select a drink and fill cup with its ingredients
     */
    selectDrink(drink) {
        this.selectedDrink = drink;
        this.selectedIngredients = [];

        // Get ingredients for this drink
        const ingredients = dataManager.cocktailIngredientMap.get(drink.idDrink) || [];
        this.selectedIngredients = ingredients.map(ing => ing.name.toLowerCase());

        this.updateUI();
        this.updateCup();
        this.updateDropdownLabel();
    }

    /**
     * Select a random drink from the database
     */
    selectRandomDrink() {
        const cocktails = dataManager.cocktails || [];
        if (cocktails.length === 0) {
            alert('No cocktails available');
            return;
        }

        // Pick a random drink
        const randomDrink = cocktails[Math.floor(Math.random() * cocktails.length)];
        
        // Save current state
        this.previousIngredients = [...this.selectedIngredients];
        this.previousUnits = new Map(this.selectedUnits);
        this.previousQuantities = new Map(this.ingredientQuantities);
        
        // Select the random drink
        this.selectDrink(randomDrink);
        this.showDrinkInfoCard(randomDrink);
        
        // Highlight the drink in the "You can make" list if it's there
        document.querySelectorAll('#canMakeDrinksList .drink-item').forEach(item => {
            item.classList.remove('selected');
            if (item.textContent.trim() === randomDrink.strDrink) {
                item.classList.add('selected');
            }
        });
    }

    /**
     * Update dropdown label to show selected count or drink
     */
    updateDropdownLabel() {
        const dropdownLabel = document.getElementById('dropdownLabel');

        if (this.mode === 'drinks') {
            if (this.selectedDrink) {
                dropdownLabel.textContent = this.selectedDrink.strDrink;
            } else {
                dropdownLabel.textContent = 'Choose a drink...';
            }
        } else {
            if (this.selectedIngredients.length === 0) {
                dropdownLabel.textContent = 'Select ingredients...';
            } else if (this.selectedIngredients.length === 1) {
                const ing = dataManager.getIngredient(this.selectedIngredients[0]);
                dropdownLabel.textContent = `1 ingredient: ${ing?.displayName}`;
            } else {
                dropdownLabel.textContent = `${this.selectedIngredients.length} ingredients`;
            }
        }
    }

    /**
     * Handle search input with autocomplete
     */
    handleSearchInput(e) {
        const query = e.target.value;
        this.populateDropdownList(query);
    }

    /**
     * Add ingredient to the cup
     */
    addIngredient(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();

        console.log(`>>> addIngredient called for: ${ingredientName}`);

        if (this.selectedIngredients.includes(normalized)) {
            console.log(`Ingredient already selected, ignoring: ${normalized}`);
            return; // Silently ignore if already selected
        }

        this.selectedIngredients.push(normalized);
        console.log(`Selected ingredients now:`, this.selectedIngredients);
        
        console.log(`Calling updateUI()`);
        this.updateUI();
        this.updateCup();
        this.updateDropdownLabel();
    }

    /**
     * Remove ingredient from the cup
     */
    removeIngredient(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();
        const idx = this.selectedIngredients.indexOf(normalized);
        if (idx > -1) {
            this.selectedIngredients.splice(idx, 1);
            
            // Clear selected drink and hide the drink info card
            this.selectedDrink = null;
            const card = document.getElementById('drinkInfoCard');
            card.style.display = 'none';
            card.classList.remove('expanded');
            document.body.classList.remove('card-expanded');
            
            document.querySelectorAll('#canMakeDrinksList .drink-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            this.updateUI();
            this.updateCup();
            this.updateDropdownLabel();
        }
    }

    /**
     * Lighten a color by a given percentage
     */
    lightenColor(color, percent) {
        // Check if color is in HSL format
        if (color.startsWith('hsl')) {
            // Parse HSL: hsl(hue, sat%, light%) - more flexible regex
            const match = color.match(/hsl\(\s*(\d+)\s*,\s*(\d+)\s*%?\s*,\s*(\d+)\s*%?\s*\)/);
            if (match) {
                const hue = match[1];
                const sat = match[2];
                let light = parseInt(match[3]);
                
                // Increase lightness by a percentage increase (not adding a fixed amount)
                light = Math.min(100, Math.round(light + (100 - light) * (percent / 100)));
                
                return `hsl(${hue}, ${sat}%, ${light}%)`;
            }
            // If parsing failed, return the original color
            return color;
        }
        
        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            
            // Lighten by moving towards white
            const lighter_r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
            const lighter_g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
            const lighter_b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
            
            // Convert back to hex
            return '#' + [lighter_r, lighter_g, lighter_b].map(x => {
                const hexVal = x.toString(16);
                return hexVal.length === 1 ? '0' + hexVal : hexVal;
            }).join('');
        }
        
        // Unknown format - return original color
        return color;
    }

    /**
     * Clear all selected ingredients
     */
    clearAllIngredients() {
        this.selectedIngredients = [];
        this.selectedUnits = new Map();
        this.ingredientQuantities = new Map();
        this.selectedDrink = null;
        document.getElementById('drinkDetailsPanel').style.display = 'none';
        document.querySelectorAll('#canMakeDrinksList .drink-item').forEach(item => {
            item.classList.remove('selected');
        });
        this.updateUI();
        this.updateCup();
        this.updateDropdownLabel();
    }

    /**
     * Update quantity list - shows sliders directly with all possible quantities
     */
    populateQuantityList() {
        const quantityList = document.getElementById('quantityList');

        if (this.selectedIngredients.length === 0) {
            if (quantityList) {
                // Hide all subsections - use children instead of querySelectorAll
                Array.from(quantityList.children).forEach(child => {
                    if (child.id !== 'quantitySliders') {
                        child.style.display = 'none';
                    }
                });
                const sliders = document.getElementById('quantitySliders');
                if (sliders) sliders.innerHTML = '';
            }
            return;
        }

        console.log(`=== populateQuantityList called for ${this.selectedIngredients.length} ingredients ===`);

        // Build quantity sliders directly
        this.updateQuantitySliders();
    }

    /**
     * Update quantity sliders - simplified to just ingredient number (multiplier)
     */
    updateQuantitySliders() {
        const quantitySliders = document.getElementById('quantitySliders');
        
        if (!quantitySliders) {
            console.error('quantitySliders element not found in DOM');
            return;
        }

        console.log(`=== updateQuantitySliders for ingredients:`, this.selectedIngredients);

        let slidersHtml = '';

        this.selectedIngredients.forEach((ing, ingIdx) => {
            const ingredientMeta = dataManager.getIngredient(ing);
            if (!ingredientMeta) {
                console.warn(`No ingredient meta for ${ing}`);
                return;
            }

            // Max ingredient number based on common recipe multipliers (1x, 2x, 3x, etc.)
            const maxQuantity = 5;

            slidersHtml += `
                <div class="ingredient-quantity-block" data-ingredient="${ing}">
                    <!-- Collapsible Header -->
                    <div class="ingredient-header">
                        <button class="collapse-btn" data-ingredient="${ing}" title="Expand/Collapse">
                            <span class="collapse-icon">▼</span>
                        </button>
                        <div class="quantity-ingredient-name">${ingredientMeta.displayName}</div>
                    </div>
                    
                    <!-- Collapsible Content -->
                    <div class="ingredient-content" data-ingredient="${ing}">
                        <!-- Quantity Slider (Ingredient Number) -->
                        <div class="quantity-slider-block">
                            <label class="quantity-label-text">Quantity (Recipe Multiplier)</label>
                            <div class="quantity-control">
                                <input type="range" class="quantity-slider-input" 
                                       value="1" min="1" max="${maxQuantity}" step="1"
                                       data-ingredient="${ing}" />
                                <span class="quantity-display">
                                    <span class="quantity-value">1</span>
                                    <span class="quantity-unit">×</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        quantitySliders.innerHTML = slidersHtml;
        console.log(`Populated ${this.selectedIngredients.length} ingredient quantity controls`);

        // Add event listeners for collapsible ingredient headers
        quantitySliders.querySelectorAll('.ingredient-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                    return;
                }
                
                e.preventDefault();
                const block = header.closest('.ingredient-quantity-block');
                const ingredient = block.dataset.ingredient;
                const content = block.querySelector(`.ingredient-content[data-ingredient="${ingredient}"]`);
                const icon = header.querySelector('.collapse-icon');
                
                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    icon.textContent = '▼';
                } else {
                    content.classList.add('collapsed');
                    icon.textContent = '▶';
                }
            });
            
            header.style.cursor = 'pointer';
        });

        // Add event listeners for quantity sliders
        quantitySliders.querySelectorAll('.quantity-slider-input').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const ingredient = e.target.dataset.ingredient;
                const quantity = parseInt(e.target.value);

                console.log(`Ingredient number changed for ${ingredient}: ${quantity}x`);

                // Update display
                e.target.parentElement.querySelector('.quantity-value').textContent = quantity;

                // Store quantity
                this.ingredientQuantities.set(ingredient, quantity);

                // Update cup visualization and cocktail list
                this.updateCup();
                this.updateMatchingCocktails();
            });
        });

        // Initialize default quantities
        quantitySliders.querySelectorAll('.quantity-slider-input').forEach(slider => {
            const ingredient = slider.dataset.ingredient;
            const quantity = parseInt(slider.value);
            this.ingredientQuantities.set(ingredient, quantity);
            console.log(`Initialized ${ingredient} with quantity ${quantity}x`);
        });
    }

    /**
     * Draw the initial empty cup
     */
    drawInitialCup() {
        const svg = d3.select('#cupSvg');
        svg.selectAll('*').remove();

        const cupGroup = svg.append('g')
            .attr('class', 'cup-group')
            .attr('transform', `translate(${this.cupWidth / 2}, 50)`);

        // Cup outline - simple rectangle with stem and base
        const cupPath = `
            M -60 -15
            L -60 ${this.cupHeight - 60}
            L 60 ${this.cupHeight - 60}
            L 60 -15
            Z
        `;

        // Cup main body
        cupGroup.append('path')
            .attr('d', cupPath)
            .attr('class', 'cup')
            .attr('id', 'cupOutline');

        // Stem - small line from bottom of cup down
        cupGroup.append('line')
            .attr('x1', -2)
            .attr('y1', this.cupHeight - 60)
            .attr('x2', -2)
            .attr('y2', this.cupHeight)
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 1);

        // Stem - small line from bottom of cup down (right side)
        cupGroup.append('line')
            .attr('x1', 2)
            .attr('y1', this.cupHeight - 60)
            .attr('x2', 2)
            .attr('y2', this.cupHeight)
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 1);

        // Base platform line
        cupGroup.append('line')
            .attr('x1', -40)
            .attr('y1', this.cupHeight)
            .attr('x2', 40)
            .attr('y2', this.cupHeight)
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 1.5)

        // Add initial text
        cupGroup.append('text')
            .attr('x', 0)
            .attr('y', this.cupHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#999')
            .attr('class', 'empty-cup-text')
            .text('Add ingredients to your cup');
    }

    /**
     * Update the cup visualization with selected ingredients
     */
    updateCup() {
        const svg = d3.select('#cupSvg');
        const cupGroup = svg.select('.cup-group');

        if (this.selectedIngredients.length === 0) {
            // Show empty message
            cupGroup.select('.empty-cup-text').style('display', 'block');
            cupGroup.selectAll('.ingredient-layer').remove();
            return;
        }

        // Hide empty message
        cupGroup.select('.empty-cup-text').style('display', 'none');

        // Remove old definitions if exists
        svg.selectAll('defs').remove();

        // Add defs for clip path and gradients
        const defs = svg.append('defs');
        
        // Add clip path for liquid inside cup
        defs.append('clipPath')
            .attr('id', 'cupClip')
            .append('path')
            .attr('d', `
                M -58 -13
                L -58 ${this.cupHeight - 60}
                L 58 ${this.cupHeight - 60}
                L 58 -13
                Z
            `);

        // Add glow filter for cup outline
        const glowFilter = defs.append('filter')
            .attr('id', 'cupOutlineGlow')
            .attr('x', '-100%')
            .attr('y', '-100%')
            .attr('width', '300%')
            .attr('height', '300%');
        
        glowFilter.append('feDropShadow')
            .attr('dx', '0')
            .attr('dy', '0')
            .attr('stdDeviation', '5')
            .attr('flood-color', '#ffffff')
            .attr('flood-opacity', '0.2');

        // Calculate layer heights based on quantities
        const maxLiquidHeight = this.cupHeight - 100;
        
        // Calculate total actual quantity for percentage labels
        let totalActualQuantity = 0;
        let totalScaledQuantity = 0;
        const scaledQuantities = new Map();
        const actualQuantities = new Map();
        
        this.selectedIngredients.forEach(ing => {
            const qty = this.ingredientQuantities.get(ing) || 1;
            // Use logarithmic scaling for more dramatic visual differences
            const scaledQty = Math.log(qty + 1) * 0.8;
            scaledQuantities.set(ing, scaledQty);
            actualQuantities.set(ing, qty);
            totalScaledQuantity += scaledQty;
            totalActualQuantity += qty;
        });

        // Sort ingredients by quantity (descending order - largest first)
        const sortedIngredients = [...this.selectedIngredients].sort((a, b) => {
            const qtyA = this.ingredientQuantities.get(a) || 1;
            const qtyB = this.ingredientQuantities.get(b) || 1;
            return qtyB - qtyA;
        });

        // Create gradients for each ingredient
        sortedIngredients.forEach((ing, idx) => {
            const ingredientMeta = dataManager.getIngredient(ing);
            const color = ingredientMeta ? ingredientMeta.color : '#999';
            
            // Parse hex color and lighten it
            const lighterColor = this.lightenColor(color, 40);
            
            const gradient = defs.append('linearGradient')
                .attr('id', `gradient-${ing.replace(/\s+/g, '-')}`)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '0%')
                .attr('y2', '100%');
            
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', color)
                .attr('stop-opacity', 0.95);
            
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', lighterColor)
                .attr('stop-opacity', 0.95);
        });

        // Bind data with sorted ingredients
        const layers = cupGroup.selectAll('.ingredient-layer')
            .data(sortedIngredients, d => d);

        // Remove old layers
        layers.exit().remove();

        // Enter + Update
        const visualizer = this; // Preserve context for use in nested functions
        let cumulativeHeight = 0; // Track the Y position as we stack layers

        layers.enter()
            .append('g')
            .attr('class', 'ingredient-layer')
            .attr('clip-path', 'url(#cupClip)')
            .merge(layers)
            .each(function(ingredient, idx) {
                const layerGroup = d3.select(this);
                layerGroup.selectAll('rect').remove();
                layerGroup.selectAll('text').remove();

                // Calculate layer height based on scaled quantity (for better visibility)
                const scaledQty = scaledQuantities.get(ingredient) || 1;
                let layerHeight = (scaledQty / totalScaledQuantity) * maxLiquidHeight;
                // Ensure minimum visibility while maintaining continuous stacking
                layerHeight = Math.max(1.5, layerHeight);
                
                // Position: stack from bottom up (cumulative height tracks position precisely)
                const yPos = visualizer.cupHeight - 100 - cumulativeHeight - layerHeight + 50;
                
                const ingredientMeta = dataManager.getIngredient(ingredient);
                const color = ingredientMeta ? ingredientMeta.color : '#999';
                const ingredientName = ingredientMeta?.displayName || ingredient;

                // Layer rectangle with animation
                layerGroup.append('rect')
                    .attr('x', -58)
                    .attr('y', yPos + layerHeight)
                    .attr('width', 116)
                    .attr('height', 0)
                    .attr('fill', `url(#gradient-${ingredient.replace(/\s+/g, '-')})`)
                    .attr('opacity', 0.85)
                    .on('click', () => visualizer.showIngredientPreview(ingredient))
                    .on('mouseover', function(event) {
                        const ingredientMeta = dataManager.getIngredient(ingredient);
                        const color = ingredientMeta ? ingredientMeta.color : '#999';
                        
                        // Update glow filter color on cup outline to match ingredient
                        svg.select('#cupOutlineGlow feDropShadow')
                            .attr('flood-color', color)
                            .attr('flood-opacity', '0.85')
                            .attr('stdDeviation', '6');
                        
                        d3.select(this).transition().duration(200).attr('opacity', 1);
                        d3.select(this).style('cursor', 'pointer');

                        // Show tooltip
                        visualizer.showTooltip(event, ingredient, ingredientMeta);
                    })
                    .on('mouseout', function() {
                        // Reset glow filter to white
                        svg.select('#cupOutlineGlow feDropShadow')
                            .attr('flood-color', '#ffffff')
                            .attr('flood-opacity', '0.2')
                            .attr('stdDeviation', '5');
                        
                        d3.select(this).transition().duration(200).attr('opacity', 0.85);

                        // Hide tooltip
                        visualizer.hideTooltip();
                    })
                    .transition()
                    .duration(600)
                    .ease(d3.easeCubicOut)
                    .attr('y', yPos)
                    .attr('height', layerHeight);

                // Update cumulative height for next layer
                cumulativeHeight += layerHeight;
            });

        // Add cup outline with glow effect
        cupGroup.selectAll('.cup-outline').remove();
        cupGroup.append('path')
            .attr('class', 'cup-outline')
            .attr('d', `
                M -58 -13
                L -58 ${this.cupHeight - 60}
                L 58 ${this.cupHeight - 60}
                L 58 -13
                Z
            `)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(212, 175, 55, 0.5)')
            .attr('stroke-width', 2)
            .attr('filter', 'url(#cupOutlineGlow)');

        // Update legend
        this.updateLegend();
    }

    /**
     * Update the legend below the cup
     */
    updateLegend() {
        const legend = document.getElementById('cupLegend');

        if (this.selectedIngredients.length === 0) {
            legend.innerHTML = '';
            return;
        }

        // Sort ingredients by quantity (descending order)
        const sortedIngredients = [...this.selectedIngredients].sort((a, b) => {
            const qtyA = this.ingredientQuantities.get(a) || 1;
            const qtyB = this.ingredientQuantities.get(b) || 1;
            return qtyB - qtyA;
        });

        legend.innerHTML = sortedIngredients
            .map(ing => {
                const ingredientMeta = dataManager.getIngredient(ing);
                if (!ingredientMeta) return '';

                return `
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: ${ingredientMeta.color};"></div>
                        <div class="legend-content">
                            <span class="legend-ingredient-name">${ingredientMeta.displayName}</span>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    /**
     * Update all UI elements
     */
    updateUI() {
        this.updateSelectedIngredientsList();
        this.populateQuantityList();
        this.updateMatchingCocktails();
        this.populateCanMakeDrinksList();
    }

    /**
     * Update the selected ingredients list (pills in left panel)
     */
    updateSelectedIngredientsList() {
        const pillsContainer = document.getElementById('selectedList');

        if (this.selectedIngredients.length === 0) {
            pillsContainer.innerHTML = '';
            return;
        }

        pillsContainer.innerHTML = this.selectedIngredients
            .map(ing => {
                const ingredientMeta = dataManager.getIngredient(ing);
                if (!ingredientMeta) return '';

                const usageCount = dataManager.ingredientCocktailMap.get(ing)?.length || 0;
                const usageText = usageCount === 1 ? '1 drink' : `${usageCount} drinks`;

                return `
                    <div class="ingredient-badge" title="Used in ${usageText}">
                        <span>${ingredientMeta.displayName}</span>
                        <span class="ingredient-usage-count">${usageCount}</span>
                        <span class="ingredient-badge-remove" onclick="visualizer.removeIngredient('${ing}')">✕</span>
                    </div>
                `;
            })
            .join('');
    }

    /**
     * Update matching cocktails
     */
    updateMatchingCocktails() {
        // Filter cocktails by both ingredients AND quantities
        this.matchingCocktails = dataManager.getCocktailsByIngredientsAndQuantities(
            this.selectedIngredients,
            this.selectedUnits,
            this.ingredientQuantities
        );
    }

    /**
     * Generate tooltip HTML for a cocktail
     */
    generateTooltip(cocktail) {
        const ingredients = dataManager.cocktailIngredientMap.get(cocktail.idDrink) || [];
        const ingredientsList = ingredients
            .slice(0, 4)
            .map(ing => `${ing.displayName}${ing.measure ? ' - ' + ing.measure : ''}`)
            .join('<br>');
        
        const instructions = cocktail.strInstructions ? 
            cocktail.strInstructions.substring(0, 100) + '...' : 
            'No instructions';

        return `
            <div class="tooltip">
                <div class="tooltip-title">Ingredients:</div>
                <div class="tooltip-ingredients">${ingredientsList}</div>
                <div class="tooltip-title">Instructions:</div>
                <div class="tooltip-instruction">${instructions}</div>
            </div>
        `;
    }

    /**
     * Render cocktails list in the tab
     */
    renderCocktailsList() {
        const list = document.getElementById('cocktailsList');

        if (this.matchingCocktails.length === 0) {
            list.innerHTML = '<div class="empty-message">No cocktails found</div>';
            return;
        }

        list.innerHTML = this.matchingCocktails
            .slice(0, 20) // Show first 20
            .map(cocktail => {
                const hasAllIngredients = this.selectedIngredients.every(ing => {
                    const cocktailIngs = dataManager.cocktailIngredientMap.get(cocktail.idDrink) || [];
                    return cocktailIngs.some(ci => ci.name.toLowerCase() === ing);
                });

                return `
                    <div class="cocktail-item fade-in" onclick="visualizer.showCocktailDetail('${cocktail.idDrink}')">
                        ${this.generateTooltip(cocktail)}
                        <div class="cocktail-name">${cocktail.strDrink}</div>
                        <div class="cocktail-meta">
                            <span class="cocktail-badge">${cocktail.strCategory}</span>
                            <span class="cocktail-badge">${cocktail.strGlass}</span>
                            ${hasAllIngredients ? '<span class="cocktail-badge" style="background: #c8e6c9; color: #2e7d32;">✓ All ingredients</span>' : ''}
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    /**
     * Show cocktail detail modal
     */
    /**
     * Show ingredient preview modal with detailed information
     */
    showIngredientPreview(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();
        const ingredientMeta = dataManager.getIngredient(normalized);
        
        if (!ingredientMeta) {
            console.warn(`No ingredient data for ${ingredientName}`);
            return;
        }

        const modal = document.getElementById('detailModal');
        const modalBody = document.getElementById('modalBody');

        // Get ingredient usage statistics
        const cocktailIds = dataManager.ingredientCocktailMap.get(normalized) || [];
        const uniqueMeasurements = dataManager.getUniqueMeasurementUnits(normalized);
        
        // Collect quantity data for chart
        let quantityData = [];
        uniqueMeasurements.forEach(unit => {
            const measure = dataManager.getMeasuresByUnit(normalized, unit.unit);
            if (measure.length > 0) {
                measure.forEach(m => {
                    quantityData.push({
                        measure: m.measure,
                        value: m.value,
                        unit: unit.unit,
                        count: m.count
                    });
                });
            }
        });

        // Get cocktails that use this ingredient
        let cocktailsHTML = '<ul class="cocktails-list">';
        const cocktailsUsingIngredient = dataManager.cocktails.filter(c => cocktailIds.includes(c.idDrink));
        cocktailsUsingIngredient.slice(0, 10).forEach(cocktail => {
            cocktailsHTML += `<li><strong>${cocktail.strDrink}</strong> <span class="category-tag">${cocktail.strCategory}</span></li>`;
        });
        if (cocktailIds.length > 10) {
            cocktailsHTML += `<li><em>... and ${cocktailIds.length - 10} more cocktails</em></li>`;
        }
        cocktailsHTML += '</ul>';

        // Build the modal content
        modalBody.innerHTML = `
            <div class="ingredient-preview-header">
                <div class="ingredient-color-swatch" style="background-color: ${ingredientMeta.color};"></div>
                <h2 class="ingredient-preview-title">${ingredientMeta.displayName}</h2>
            </div>

            <div class="ingredient-preview-section">
                <h4>📊 Statistics</h4>
                <div class="ingredient-stats">
                    <div class="stat">
                        <span class="stat-label">Used in</span>
                        <span class="stat-value">${cocktailIds.length}</span>
                        <span class="stat-unit">cocktail${cocktailIds.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            ${quantityData.length > 0 ? `
            <div class="ingredient-preview-section">
                <h4>📈 Quantity Distribution</h4>
                <svg id="quantityDistributionChart" width="100%" height="200" style="margin-top: 10px;"></svg>
            </div>
            ` : ''}

            <div class="ingredient-preview-section">
                <h4>🍹 Found in Cocktails (${cocktailIds.length} total)</h4>
                ${cocktailsHTML}
            </div>
        `;

        modal.classList.remove('hidden');

        // Render the quantity distribution chart if data exists
        if (quantityData.length > 0) {
            this.renderQuantityDistributionChart(quantityData);
        }
    }

    /**
     * Render quantity distribution chart in ingredient preview
     */
    renderQuantityDistributionChart(quantityData) {
        const svg = document.getElementById('quantityDistributionChart');
        if (!svg) return;

        // Clear previous content
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        // Prepare data
        const chartData = quantityData.map(d => ({
            label: d.measure,
            count: d.count
        }));

        // Set dimensions
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const width = svg.clientWidth - margin.left - margin.right;
        const height = 180 - margin.top - margin.bottom;

        // Create scales
        const xScale = d3.scaleBand()
            .domain(chartData.map((d, i) => i))
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.count) * 1.1])
            .range([height, 0]);

        // Create main group
        const g = d3.select(svg)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create Y-axis
        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale).ticks(3))
            .style('color', 'rgba(212, 175, 55, 0.6)')
            .style('font-size', '0.8em');
        
        // Add Y-axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', '0.8em')
            .style('fill', 'rgba(212, 175, 55, 0.8)')
            .text('Number of Drinks');

        // Create X-axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(i => chartData[i].label))
            .style('color', 'rgba(212, 175, 55, 0.6)')
            .style('font-size', '0.75em')
            .selectAll('text')
            .attr('transform', 'rotate(45)')
            .attr('text-anchor', 'start')
            .attr('dy', '0.5em')
            .attr('dx', '0.5em');

        // Create bars
        g.selectAll('.bar')
            .data(chartData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d, i) => xScale(i))
            .attr('y', d => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.count))
            .attr('fill', 'var(--gold)')
            .attr('opacity', 0.7);

        // Add value labels on bars
        g.selectAll('.bar-label')
            .data(chartData)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', (d, i) => xScale(i) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--gold)')
            .attr('font-size', '0.85em')
            .attr('font-weight', 'bold')
            .text(d => d.count);
    }

    /**
     * Show cocktail detail modal
     */
    showCocktailDetail(idDrink) {
        const detail = dataManager.getCocktailDetail(idDrink);
        const modal = document.getElementById('detailModal');
        const modalBody = document.getElementById('modalBody');

        let imageHTML = '';
        if (detail.image) {
            const imagePath = `data/cocktail_images/${detail.image.filename}`;
            imageHTML = `<img src="${imagePath}" alt="${detail.strDrink}" class="cocktail-detail-image" onerror="this.style.display='none';">`;
        }

        let ingredientsHTML = '<table class="ingredients-table">';
        (detail.ingredients || []).forEach(ing => {
            ingredientsHTML += `
                <tr>
                    <td>${ing.displayName}</td>
                    <td>${ing.measure}</td>
                </tr>
            `;
        });
        ingredientsHTML += '</table>';

        const alcoholStatus = detail.strAlcoholic === 'Alcoholic' ? '🍷 Alcoholic' : '🥤 Non-Alcoholic';

        modalBody.innerHTML = `
            ${imageHTML}
            <h2 class="cocktail-detail-title">${detail.strDrink}</h2>
            <div class="cocktail-detail-meta">
                <span class="cocktail-detail-badge">${detail.strCategory}</span>
                <span class="cocktail-detail-badge">${detail.strGlass}</span>
                <span class="cocktail-detail-badge">${alcoholStatus}</span>
            </div>

            <div class="cocktail-detail-section">
                <h4>📋 Ingredients</h4>
                ${ingredientsHTML}
            </div>

            <div class="cocktail-detail-section">
                <h4>🍹 Instructions</h4>
                <p class="instructions">${detail.strInstructions || 'No instructions available'}</p>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    /**
     * Close modal
     */
    closeModal() {
        // Modal has been removed from UI
        const detailModal = document.getElementById('detailModal');
        if (detailModal) {
            detailModal.classList.add('hidden');
        }
    }

    /**
     * Show tooltip with ingredient details
     */
    showTooltip(event, ingredient, ingredientMeta) {
        // Get or create tooltip element
        let tooltip = document.getElementById('ingredientTooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'ingredientTooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        // Get ingredient quantity
        const quantity = this.ingredientQuantities.get(ingredient) || 1;
        const unit = this.selectedUnits.get(ingredient) || 'unit';
        const displayName = ingredientMeta?.displayName || ingredient;

        // Set tooltip content
        tooltip.textContent = `${displayName}: ${quantity}${unit}`;
        tooltip.style.display = 'block';

        // Position tooltip near cursor
        const mouseX = event.pageX;
        const mouseY = event.pageY;
        tooltip.style.left = (mouseX + 15) + 'px';
        tooltip.style.top = (mouseY - 20) + 'px';
    }

    /**
     * Hide ingredient tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('ingredientTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Update stats
     */
    updateStats() {
        const cocktailIds = this.matchingCocktails.map(c => c.idDrink);

        document.getElementById('totalDrinks').textContent = cocktailIds.length;

        const categories = new Set();
        cocktailIds.forEach(id => {
            const cocktail = this.matchingCocktails.find(c => c.idDrink === id);
            if (cocktail) categories.add(cocktail.strCategory);
        });
        document.getElementById('categoryCount').textContent = categories.size;

        const commonGlass = dataManager.getMostCommonGlass(cocktailIds);
        document.getElementById('commonGlass').textContent = commonGlass;
    }

    /**
     * Update category chart
     */
    updateCategoryChart() {
        const cocktailIds = this.matchingCocktails.map(c => c.idDrink);
        const categoryStats = dataManager.getCategoryStats(cocktailIds);

        const svg = d3.select('#categorySvg');
        svg.selectAll('*').remove();

        if (categoryStats.length === 0) {
            svg.append('text')
                .attr('x', '50%')
                .attr('y', '50%')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.3em')
                .attr('fill', '#999')
                .text('No data');
            return;
        }

        const margin = { top: 10, right: 20, bottom: 50, left: 40 };
        const width = parseInt(svg.style('width')) - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(categoryStats.map(d => d.category))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(categoryStats, d => d.count)])
            .range([height, 0]);

        // Bars
        g.selectAll('.bar')
            .data(categoryStats)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.category))
            .attr('y', height) // Start at bottom
            .attr('width', x.bandwidth())
            .attr('height', 0) // Start with 0 height
            .attr('fill', '#667eea')
            .attr('opacity', 0.8)
            .transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr('y', d => y(d.count))
            .attr('height', d => height - y(d.count));

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', '11px');

        // Y axis
        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .style('font-size', '11px');
    }

    /**
     * Update co-ingredients chart
     */
    updateCoIngredientsChart() {
        const coIngredients = dataManager.getCoIngredientsFrequency(this.selectedIngredients);

        const svg = d3.select('#coIngredientsSvg');
        svg.selectAll('*').remove();

        if (coIngredients.length === 0) {
            svg.append('text')
                .attr('x', '50%')
                .attr('y', '50%')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.3em')
                .attr('fill', '#999')
                .text('No co-ingredients data');
            return;
        }

        const margin = { top: 10, right: 20, bottom: 50, left: 40 };
        const width = parseInt(svg.style('width')) - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(coIngredients.map(d => d.displayName))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(coIngredients, d => d.count)])
            .range([height, 0]);

        // Bars
        g.selectAll('.bar')
            .data(coIngredients)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.displayName))
            .attr('y', height) // Start at bottom
            .attr('width', x.bandwidth())
            .attr('height', 0) // Start with 0 height
            .attr('fill', d => d.color)
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                visualizer.addIngredient(d.name);
            })
            .transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr('y', d => y(d.count))
            .attr('height', d => height - y(d.count));

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', '11px');

        // Y axis
        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .style('font-size', '11px');

        // Add hint text
        svg.append('text')
            .attr('x', '50%')
            .attr('y', height + margin.top + 65)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#999')
            .text('Click bars to add ingredients');
    }

    /**
     * Populate the "You can make" drinks list in center panel
     */
    populateCanMakeDrinksList() {
        const container = document.getElementById('canMakeDrinksList');
        const viewAllBtn = document.getElementById('viewAllDrinksBtn');

        if (!this.viewingAllDrinks) {
            // Show only possible drinks
            viewAllBtn.classList.remove('active');

            if (this.matchingCocktails.length === 0) {
                container.innerHTML = '<div class="empty-message">Select ingredients to see possible drinks</div>';
                return;
            }

            container.innerHTML = this.matchingCocktails
                .slice(0, 15)
                .map(drink => `
                    <div class="drink-item" onclick="visualizer.selectDrinkFromList('${drink.idDrink}')">
                        ${drink.strDrink}
                    </div>
                `)
                .join('');
        } else {
            // Show all drinks with filters
            viewAllBtn.classList.add('active');

            // Populate filter options if not already done
            this.populateFilterOptions();

            // Apply filters and display
            this.applyDrinkFilters();
        }
    }

    /**
     * Toggle between viewing possible drinks and all drinks
     */
    toggleViewAllDrinks() {
        this.viewingAllDrinks = !this.viewingAllDrinks;
        const filterToggleBtn = document.getElementById('filterToggleBtn');
        const filterContainer = document.getElementById('filterContainer');
        
        if (this.viewingAllDrinks) {
            // Show filter button
            filterToggleBtn.style.display = 'inline-block';
            filterToggleBtn.classList.remove('active');
            filterContainer.style.display = 'none';
            
            this.currentDrinkFilters = { search: '', category: '', glass: '', alcoholicTypes: ['optional'] };
            document.getElementById('drinkSearchFilter').value = '';
            document.getElementById('categoryFilterSelect').value = '';
            document.getElementById('glassFilterSelect').value = '';
            
            // Reset alcohol buttons
            document.querySelectorAll('.alcohol-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.alcohol-btn[data-filter="optional"]').classList.add('active');
        } else {
            // Hide filter button and container
            filterToggleBtn.style.display = 'none';
            filterToggleBtn.classList.remove('active');
            filterContainer.style.display = 'none';
        }
        this.populateCanMakeDrinksList();
    }

    /**
     * Populate filter dropdown options
     */
    populateFilterOptions() {
        // Get unique categories and glasses from all drinks
        const categories = new Set();
        const glasses = new Set();

        dataManager.cocktails.forEach(drink => {
            if (drink.strCategory) categories.add(drink.strCategory);
            if (drink.strGlass) glasses.add(drink.strGlass);
        });

        // Sort and populate category filter
        const categorySelect = document.getElementById('categoryFilterSelect');
        const categoriesArray = Array.from(categories).sort();
        const categoryHTML = `<option value="">All Categories</option>` +
            categoriesArray.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (categorySelect.innerHTML !== categoryHTML) {
            categorySelect.innerHTML = categoryHTML;
            if (this.currentDrinkFilters.category) {
                categorySelect.value = this.currentDrinkFilters.category;
            }
        }

        // Sort and populate glass filter
        const glassSelect = document.getElementById('glassFilterSelect');
        const glassesArray = Array.from(glasses).sort();
        const glassHTML = `<option value="">All Glasses</option>` +
            glassesArray.map(g => `<option value="${g}">${g}</option>`).join('');
        if (glassSelect.innerHTML !== glassHTML) {
            glassSelect.innerHTML = glassHTML;
            if (this.currentDrinkFilters.glass) {
                glassSelect.value = this.currentDrinkFilters.glass;
            }
        }
    }

    /**
     * Apply filters to drinks list
     */
    applyDrinkFilters() {
        const container = document.getElementById('canMakeDrinksList');

        this.filteredDrinks = dataManager.cocktails.filter(drink => {
            const matchesSearch = !this.currentDrinkFilters.search ||
                drink.strDrink.toLowerCase().includes(this.currentDrinkFilters.search);
            const matchesCategory = !this.currentDrinkFilters.category ||
                drink.strCategory === this.currentDrinkFilters.category;
            const matchesGlass = !this.currentDrinkFilters.glass ||
                drink.strGlass === this.currentDrinkFilters.glass;
            
            let matchesAlcoholic = true;
            if (this.currentDrinkFilters.alcoholicTypes && this.currentDrinkFilters.alcoholicTypes.length > 0) {
                const selectedTypes = this.currentDrinkFilters.alcoholicTypes;
                if (selectedTypes.includes('optional')) {
                    // Optional shows all
                    matchesAlcoholic = true;
                } else {
                    // Check if drink matches any of the selected types
                    matchesAlcoholic = false;
                    if (selectedTypes.includes('alcoholic') && drink.strAlcoholic === 'Alcoholic') {
                        matchesAlcoholic = true;
                    }
                    if (selectedTypes.includes('non-alcoholic') && drink.strAlcoholic === 'Non alcoholic') {
                        matchesAlcoholic = true;
                    }
                }
            }

            return matchesSearch && matchesCategory && matchesGlass && matchesAlcoholic;
        });

        // Display filtered drinks
        container.innerHTML = this.filteredDrinks
            .map(drink => `
                <div class="drink-item" onclick="visualizer.selectDrinkFromList('${drink.idDrink}')">
                    ${drink.strDrink}
                </div>
            `)
            .join('');

        if (this.filteredDrinks.length === 0) {
            container.innerHTML = '<div class="empty-message">No drinks match your filters</div>';
        }
    }

    /**
     * Clear all drink filters
     */
    clearDrinkFilters() {
        this.currentDrinkFilters = { search: '', category: '', glass: '', alcoholicTypes: ['optional'] };
        document.getElementById('drinkSearchFilter').value = '';
        document.getElementById('categoryFilterSelect').value = '';
        document.getElementById('glassFilterSelect').value = '';
        
        // Reset alcohol buttons
        document.querySelectorAll('.alcohol-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.alcohol-btn[data-filter="optional"]').classList.add('active');
        
        this.applyDrinkFilters();
    }

    /**
     * Select a drink from the "You can make" list (toggle on/off)
     */
    selectDrinkFromList(idDrink) {
        // Check if this drink is already selected
        if (this.selectedDrink && this.selectedDrink.idDrink === idDrink) {
            // Toggle OFF: Revert to previous ingredients
            this.clearDrinkSelection();
            document.querySelectorAll('#canMakeDrinksList .drink-item').forEach(item => {
                item.classList.remove('selected');
            });
            document.getElementById('drinkDetailsPanel').style.display = 'none';
        } else {
            // Toggle ON: Save current state and select the drink
            const drink = dataManager.cocktails.find(d => d.idDrink === idDrink);
            if (drink) {
                // Save the current state before switching to drink ingredients
                this.previousIngredients = [...this.selectedIngredients];
                this.previousUnits = new Map(this.selectedUnits);
                this.previousQuantities = new Map(this.ingredientQuantities);
                
                this.selectDrink(drink);
                this.showDrinkInfoCard(drink);
                document.querySelectorAll('#canMakeDrinksList .drink-item').forEach(item => {
                    item.classList.remove('selected');
                    if (item.textContent.trim() === drink.strDrink) {
                        item.classList.add('selected');
                    }
                });
            }
        }
    }

    /**
     * Clear the selected drink and revert to previous ingredients
     */
    clearDrinkSelection() {
        this.selectedDrink = null;
        // Restore the previous ingredient state
        this.selectedIngredients = [...this.previousIngredients];
        this.selectedUnits = new Map(this.previousUnits);
        this.ingredientQuantities = new Map(this.previousQuantities);
        
        // Clear expanded state
        const detailsPanel = document.getElementById('drinkDetailsPanel');
        const cardSection = document.getElementById('drinkInfoCardSection');
        const card = document.getElementById('drinkInfoCard');
        cardSection.classList.remove('expanded');
        card.classList.remove('expanded');
        document.body.classList.remove('card-expanded');
        
        this.updateUI();
        this.updateCup();
        this.updateDropdownLabel();
    }

    /**
     * Show drink info card on the right panel
     */
    showDrinkInfoCard(drink) {
        const detailsPanel = document.getElementById('drinkDetailsPanel');
        const cardSection = document.getElementById('drinkInfoCardSection');
        const card = document.getElementById('drinkInfoCard');
        const detail = dataManager.getCocktailDetail(drink.idDrink);

        // Build image HTML
        let imageHTML = '';
        if (detail.image) {
            const imagePath = `data/cocktail_images/${detail.image.filename}`;
            imageHTML = `<img src="${imagePath}" alt="${drink.strDrink}" class="drink-info-image" onerror="this.style.display='none';">`;
        }

        // Build ingredients list
        let ingredientsList = '';
        (detail.ingredients || []).forEach(ing => {
            ingredientsList += `<li>${ing.displayName} - ${ing.measure}</li>`;
        });

        const alcoholStatus = drink.strAlcoholic === 'Alcoholic' ? '🍷 Alcoholic' : '🥤 Non-Alcoholic';

        card.innerHTML = `
            <div class="drink-card-header">
                <h3>${drink.strDrink}</h3>
                <button class="expand-card-btn" onclick="visualizer.toggleCardExpand()" title="Expand card">⛶</button>
            </div>
            ${imageHTML}
            
            <div class="info-row">
                <span class="info-label">Category</span>
                <span class="info-value">${drink.strCategory}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Glass Type</span>
                <span class="info-value">${drink.strGlass}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Type</span>
                <span class="info-value">
                    <span class="info-badge">${alcoholStatus}</span>
                </span>
            </div>
            
            <div class="drink-ingredients-section">
                <h4>Ingredients</h4>
                <ul class="drink-ingredients-list">
                    ${ingredientsList}
                </ul>
            </div>
            
            ${detail.strInstructions && this.currentView !== 'saved' ? `
            <div class="drink-ingredients-section">
                <h4>Instructions</h4>
                <p style="font-size: 0.85em; color: var(--text-light); line-height: 1.5; margin: 0;">
                    ${detail.strInstructions}
                </p>
            </div>
            ` : ''}
        `;

        cardSection.style.display = 'block';
        card.style.display = 'block';
        detailsPanel.style.display = 'block';
    }

    /**
     * Toggle drink card expanded state
     */
    toggleCardExpand() {
        const detailsPanel = document.getElementById('drinkDetailsPanel');
        const cardSection = document.getElementById('drinkInfoCardSection');
        const card = document.getElementById('drinkInfoCard');
        detailsPanel.classList.toggle('expanded');
        cardSection.classList.toggle('expanded');
        card.classList.toggle('expanded');
        document.body.classList.toggle('card-expanded');
        
        // Add click handler to backdrop to close card
        if (card.classList.contains('expanded')) {
            document.body.addEventListener('click', this.handleBackdropClick);
        } else {
            document.body.removeEventListener('click', this.handleBackdropClick);
        }
    }

    /**
     * Handle backdrop click to close expanded card
     */
    handleBackdropClick = (event) => {
        const detailsPanel = document.getElementById('drinkDetailsPanel');
        const cardSection = document.getElementById('drinkInfoCardSection');
        const card = document.getElementById('drinkInfoCard');
        const btn = document.querySelector('.expand-card-btn');
        
        // Only close if clicking on backdrop (body::before), not on the card or button
        if (event.target === document.body || (event.target.tagName === 'BODY')) {
            detailsPanel.classList.remove('expanded');
            cardSection.classList.remove('expanded');
            card.classList.remove('expanded');
            document.body.classList.remove('card-expanded');
            document.body.removeEventListener('click', this.handleBackdropClick);
        }
    }

    /**
     * Populate drinks list in right panel
     */
    populateDrinksListRightPanel() {
        const container = document.getElementById('drinksList');
        let drinks = dataManager.cocktails || [];

        container.innerHTML = drinks
            .slice(0, 50)
            .map(drink => `
                <div class="drink-selection-item ${this.selectedDrink && this.selectedDrink.idDrink === drink.idDrink ? 'selected' : ''}" 
                     onclick="visualizer.selectDrinkAndShowDetails('${drink.idDrink}')">
                    <strong>${drink.strDrink}</strong><br>
                    <small>${drink.strCategory}</small>
                </div>
            `)
            .join('');
    }

    /**
     * Select a drink and show details in right panel
     */
    selectDrinkAndShowDetails(idDrink) {
        const drink = dataManager.cocktails.find(d => d.idDrink === idDrink);
        if (drink) {
            this.selectDrink(drink);
            this.showDrinkDetails(drink);
            this.populateDrinksListRightPanel();
        }
    }

    /**
     * Show drink details in right panel
     */
    showDrinkDetails(drink) {
        const detailsContainer = document.getElementById('drinkDetails');
        const ingredients = dataManager.cocktailIngredientMap.get(drink.idDrink) || [];

        const ingredientsList = ingredients
            .map((ing, idx) => {
                const ingredientNum = idx + 1;
                const measure = ing.measure ? ` - ${ing.measure}` : '';
                return `<li><strong>#${ingredientNum}</strong> ${ing.displayName}${measure}</li>`;
            })
            .join('');

        detailsContainer.innerHTML = `
            <div class="drink-details-title">${drink.strDrink}</div>
            ${drink.strDrinkThumb ? `<img src="${drink.strDrinkThumb}" alt="${drink.strDrink}" class="drink-details-image">` : ''}
            <div class="drink-details-info">
                <p><strong>Category:</strong> ${drink.strCategory}</p>
                <p><strong>Glass:</strong> ${drink.strGlass || 'N/A'}</p>
                <p><strong>Ingredients:</strong></p>
                <ul>${ingredientsList}</ul>
            </div>
        `;
        detailsContainer.classList.remove('hidden');
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Tabs have been removed from UI
    }

    /**
     * Switch view between main and saved charts
     */
    switchView() {
        this.currentView = this.currentView === 'main' ? 'saved' : 'main';
        const mainContent = document.querySelector('.main-content');
        const savedPanel = document.getElementById('savedChartsPanel');
        const btn = document.getElementById('tabToggleBtn');

        if (this.currentView === 'saved') {
            mainContent.style.display = 'none';
            savedPanel.style.display = 'block';
            btn.textContent = '📊 Back to Drinks';
            this.renderSavedCharts();
        } else {
            mainContent.style.display = 'grid';
            savedPanel.style.display = 'none';
            btn.textContent = '📊 My Tab';
        }
    }

    /**
     * Save current chart to saved charts
     */
    saveCurrentChart() {
        if (this.selectedIngredients.length === 0) {
            this.showNotification('Please select at least one ingredient to save', 'error');
            return;
        }

        // Check if there's an exact match for the selected ingredients
        const exactMatches = dataManager.getCocktailsByExactIngredients(this.selectedIngredients);
        if (exactMatches.length === 0) {
            this.showNotification('Select a complete drink to save', 'error');
            return;
        }

        const drinkName = exactMatches[0].strDrink;
        const glassType = exactMatches[0].strGlass || 'Unknown';
        
        // Check for duplicates
        const isDuplicate = this.savedCharts.some(chart => chart.name === drinkName);
        if (isDuplicate) {
            this.showNotification('This drink is already saved', 'error');
            return;
        }

        const chartData = {
            id: Date.now(),
            name: drinkName, // Store the drink name
            ingredients: [...this.selectedIngredients],
            quantities: new Map(this.ingredientQuantities),
            glassType: glassType,
            timestamp: new Date().toLocaleString()
        };

        this.savedCharts.push(chartData);
        this.showNotification('✓ Chart saved! Click the tab to view.', 'success');
    }

    /**
     * Show a notification popup on the page
     */
    showNotification(message, type = 'success') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        // Auto-remove after animation completes
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Clear all saved charts
     */
    clearAllSavedCharts() {
        this.savedCharts = [];
        document.getElementById('savedChartsContainer').innerHTML = '';
    }

    /**
     * Calculate and display comparison stats for saved charts
     */
    calculateSavedChartStats() {
        if (this.savedCharts.length === 0) return null;

        // Calculate stats
        const stats = {
            totalCharts: this.savedCharts.length,
            uniqueIngredients: new Set(),
            ingredientFrequency: {},
            totalIngredients: 0,
            avgIngredientsPerChart: 0
        };

        // Collect all unique ingredients and frequencies
        this.savedCharts.forEach(chart => {
            stats.totalIngredients += chart.ingredients.length;
            chart.ingredients.forEach(ing => {
                stats.uniqueIngredients.add(ing);
                stats.ingredientFrequency[ing] = (stats.ingredientFrequency[ing] || 0) + 1;
            });
        });

        stats.totalUniqueIngredients = stats.uniqueIngredients.size;
        stats.avgIngredientsPerChart = (stats.totalIngredients / stats.totalCharts).toFixed(1);

        // Find most common ingredient
        stats.mostCommonIngredient = Object.keys(stats.ingredientFrequency).reduce((a, b) => 
            stats.ingredientFrequency[a] > stats.ingredientFrequency[b] ? a : b
        );
        stats.mostCommonFrequency = stats.ingredientFrequency[stats.mostCommonIngredient];

        return stats;
    }

    /**
     * Render all saved charts
     */
    renderSavedCharts() {
        const container = document.getElementById('savedChartsContainer');
        
        if (this.savedCharts.length === 0) {
            container.innerHTML = '<div class="saved-charts-card"><p style="text-align: center; color: var(--text-muted); padding: 40px;">No saved charts yet. Create one and click "Add to Tab" to save it!</p></div>';
            return;
        }

        // Calculate comparison stats
        const stats = this.calculateSavedChartStats();

        // Create single card with all charts displayed horizontally
        container.innerHTML = `
            <div class="saved-charts-stats">
                <div class="stats-cards-comparison">
                    <div class="stat-card-comparison">
                        <span class="stat-label">Total Saved</span>
                        <span class="stat-value">${stats.totalCharts}</span>
                    </div>
                    <div class="stat-card-comparison">
                        <span class="stat-label">Unique Ingredients</span>
                        <span class="stat-value">${stats.totalUniqueIngredients}</span>
                    </div>
                    <div class="stat-card-comparison">
                        <span class="stat-label">Avg per Drink</span>
                        <span class="stat-value">${stats.avgIngredientsPerChart}</span>
                    </div>
                    <div class="stat-card-comparison">
                        <span class="stat-label">Most Common</span>
                        <span class="stat-value">${stats.mostCommonIngredient} <span class="stat-value-small">(${stats.mostCommonFrequency}x)</span></span>
                    </div>
                </div>
            </div>
            <div class="saved-charts-comparison-line">
                ${this.savedCharts.map((chart) => `
                    <div class="saved-chart-column">
                        <div class="chart-column-header">
                            <h4 class="chart-column-title">${chart.name}</h4>
                            <button class="delete-chart-btn-small" onclick="visualizer.deleteSavedChart(${chart.id})">\u00d7</button>
                        </div>
                        <svg id="savedChartSvg${chart.id}" class="saved-chart-column-svg" width="100%" height="300"></svg>
                        <button onclick="visualizer.loadSavedChart(${chart.id})" class="chart-column-load-btn">Load</button>
                    </div>
                `).join('')}
            </div>
            <div class="saved-charts-summary">
                <h3 class="summary-title">Summary Analysis</h3>
                <div class="summary-charts">
                    <div class="summary-chart-container">
                        <h4>Ingredients Used</h4>
                        <svg id="ingredientsPieChart" class="summary-pie-chart" width="100%" height="300"></svg>
                    </div>
                    <div class="summary-chart-container">
                        <h4>Cup Types Used</h4>
                        <svg id="cupTypesPieChart" class="summary-pie-chart" width="100%" height="300"></svg>
                    </div>
                </div>
            </div>
        `;

        // Render charts for each saved item
        this.savedCharts.forEach(chart => {
            this.renderSavedChartSvg(chart);
        });

        // Render summary pie charts
        this.renderIngredientsPieChart();
        this.renderCupTypesPieChart();
    }

    /**
     * Render SVG for a single saved chart
     */
    renderSavedChartSvg(chart) {
        const svgId = `savedChartSvg${chart.id}`;
        const svg = d3.select(`#${svgId}`);
        
        if (svg.node() === null) return;
        
        svg.selectAll('*').remove();
        
        const width = svg.node().clientWidth || 300;
        const height = 200;
        const cupWidth = 80;
        const cupHeight = 150;
        const leftMargin = 40; // Fixed left margin for alignment
        
        const g = svg.append('g')
            .attr('transform', `translate(${leftMargin}, ${(height - cupHeight) / 2})`);
        
        // Add defs for gradients
        const defs = svg.append('defs');
        
        // Draw cup outline
        const cupPath = `
            M ${-cupWidth / 2} -15
            L ${-cupWidth / 2} ${cupHeight - 60}
            L ${cupWidth / 2} ${cupHeight - 60}
            L ${cupWidth / 2} -15
            Z
        `;
        
        g.append('path')
            .attr('d', cupPath)
            .attr('fill', 'none')
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 1.5);
        
        // Stem left
        g.append('line')
            .attr('x1', -4)
            .attr('y1', cupHeight - 60)
            .attr('x2', -4)
            .attr('y2', cupHeight)
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 0.8);
        
        // Stem right
        g.append('line')
            .attr('x1', 4)
            .attr('y1', cupHeight - 60)
            .attr('x2', 4)
            .attr('y2', cupHeight)
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 0.8);
        
        // Base
        g.append('line')
            .attr('x1', -25)
            .attr('y1', cupHeight)
            .attr('x2', 25)
            .attr('y2', cupHeight)
            .attr('stroke', 'var(--gold)')
            .attr('stroke-width', 1);
        
        // Calculate scaled quantities
        let totalScaledQuantity = 0;
        const scaledQuantities = new Map();
        
        chart.ingredients.forEach(ing => {
            const qty = chart.quantities.get(ing) || 1;
            const scaledQty = Math.log(qty + 1) * 0.8;
            scaledQuantities.set(ing, scaledQty);
            totalScaledQuantity += scaledQty;
        });
        
        // Sort ingredients by quantity (descending order - largest first)
        const sortedIngredients = [...chart.ingredients].sort((a, b) => {
            const qtyA = chart.quantities.get(a) || 1;
            const qtyB = chart.quantities.get(b) || 1;
            return qtyB - qtyA;
        });

        // Create gradients for each ingredient
        // Add glow filter for cup outline
        const glowFilter = defs.append('filter')
            .attr('id', 'savedCupOutlineGlow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        
        glowFilter.append('feDropShadow')
            .attr('dx', '0')
            .attr('dy', '0')
            .attr('stdDeviation', '2')
            .attr('flood-color', '#ffffff')
            .attr('flood-opacity', '0.3');

        sortedIngredients.forEach((ing) => {
            const ingredientMeta = dataManager.getIngredient(ing);
            const color = ingredientMeta ? ingredientMeta.color : '#999';
            
            // Parse hex color and lighten it
            const lighterColor = this.lightenColor(color, 40);
            
            const gradient = defs.append('linearGradient')
                .attr('id', `gradient-saved-${ing.replace(/\s+/g, '-')}`)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '0%')
                .attr('y2', '100%');
            
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', color)
                .attr('stop-opacity', 0.95);
            
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', lighterColor)
                .attr('stop-opacity', 0.95);
        });
        
        const liquidStartY = -15; // Top of liquid area
        const liquidEndY = cupHeight - 60; // Bottom of liquid area
        const maxLiquidHeight = liquidEndY - liquidStartY;
        let currentLiquidY = liquidEndY; // Start at bottom and stack upward
        
        // Draw ingredient layers in order of quantity
        const visualizer = this; // Preserve context for hovering
        sortedIngredients.forEach(ing => {
            const scaledQty = scaledQuantities.get(ing) || 1;
            const layerHeight = (scaledQty / totalScaledQuantity) * maxLiquidHeight;
            
            g.append('rect')
                .attr('x', -(cupWidth / 2) + 1)
                .attr('y', currentLiquidY - layerHeight)
                .attr('width', cupWidth - 2)
                .attr('height', layerHeight)
                .attr('fill', `url(#gradient-saved-${ing.replace(/\s+/g, '-')})`)
                .attr('opacity', 0.85)
                .on('mouseover', function() {
                    const ingredientMeta = dataManager.getIngredient(ing);
                    const color = ingredientMeta ? ingredientMeta.color : '#999';
                    svg.select('#savedCupOutlineGlow feDropShadow')
                        .attr('flood-color', color)
                        .attr('flood-opacity', '0.6')
                        .attr('stdDeviation', '3');
                })
                .on('mouseout', function() {
                    svg.select('#savedCupOutlineGlow feDropShadow')
                        .attr('flood-color', '#ffffff')
                        .attr('flood-opacity', '0.3')
                        .attr('stdDeviation', '2');
                });
            
            currentLiquidY -= layerHeight;
        });
        
        // Add cup outline with glow effect
        g.append('path')
            .attr('class', 'saved-cup-outline')
            .attr('d', `
                M ${-cupWidth / 2} ${-15}
                L ${-cupWidth / 2} ${cupHeight - 60}
                L ${cupWidth / 2} ${cupHeight - 60}
                L ${cupWidth / 2} ${-15}
                Z
            `)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(212, 175, 55, 0.4)')
            .attr('stroke-width', 1.2)
            .attr('filter', 'url(#savedCupOutlineGlow)');
    }

    /**
     * Render pie chart for ingredients used across saved charts
     */
    renderIngredientsPieChart() {
        const svg = d3.select('#ingredientsPieChart');
        if (svg.node() === null) return;

        svg.selectAll('*').remove();

        // Collect all ingredients and their frequencies
        const ingredientFreq = {};
        this.savedCharts.forEach(chart => {
            chart.ingredients.forEach(ing => {
                ingredientFreq[ing] = (ingredientFreq[ing] || 0) + 1;
            });
        });

        // Convert to array and sort by frequency
        const data = Object.entries(ingredientFreq)
            .map(([ingredient, count]) => ({ ingredient, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // Limit to top 8 for clarity

        const width = svg.node().clientWidth || 300;
        const height = 300;
        const radius = Math.min(width, height) / 2 - 20;

        const svg_g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Create background circle for click-to-clear
        svg_g.append('circle')
            .attr('r', radius + 30)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer')
            .on('click', () => this.clearChartHighlights());

        // Create color scale
        const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Create pie generator
        const pie = d3.pie().value(d => d.count);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);

        // Create slices
        const slices = svg_g.selectAll('.pie-slice')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'pie-slice')
            .attr('data-ingredient', d => d.data.ingredient);

        slices.append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => colorScale(i))
            .attr('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                const ingredient = d.data.ingredient;
                this.highlightChartsWithIngredient(ingredient);
            });

        // Add labels
        slices.append('text')
            .attr('class', 'pie-label')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .text(d => `${d.data.ingredient}\n(${d.data.count})`);
    }

    /**
     * Render pie chart for cup types used across saved charts
     */
    renderCupTypesPieChart() {
        const svg = d3.select('#cupTypesPieChart');
        if (svg.node() === null) return;

        svg.selectAll('*').remove();

        // Collect all cup types and their frequencies
        const cupTypeFreq = {};
        this.savedCharts.forEach(chart => {
            const glassType = chart.glassType || 'Unknown';
            cupTypeFreq[glassType] = (cupTypeFreq[glassType] || 0) + 1;
        });

        // Convert to array and sort by frequency
        const data = Object.entries(cupTypeFreq)
            .map(([glassType, count]) => ({ glassType, count }))
            .sort((a, b) => b.count - a.count);

        const width = svg.node().clientWidth || 300;
        const height = 300;
        const radius = Math.min(width, height) / 2 - 20;

        const svg_g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Create background circle for click-to-clear
        svg_g.append('circle')
            .attr('r', radius + 30)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer')
            .on('click', () => this.clearChartHighlights());

        // Create color scale
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Create pie generator
        const pie = d3.pie().value(d => d.count);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);

        // Create slices
        const slices = svg_g.selectAll('.pie-slice')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'pie-slice')
            .attr('data-glass-type', d => d.data.glassType);

        slices.append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => colorScale(i))
            .attr('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                const glassType = d.data.glassType;
                this.highlightChartsWithGlassType(glassType);
            });

        // Add labels
        slices.append('text')
            .attr('class', 'pie-label')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .text(d => `${d.data.glassType}\n(${d.data.count})`);
    }

    /**
     * Highlight saved charts that contain a specific ingredient
     */
    highlightChartsWithIngredient(ingredient) {
        const columns = document.querySelectorAll('.saved-chart-column');
        
        columns.forEach((col, idx) => {
            const chart = this.savedCharts[idx];
            if (chart && chart.ingredients.includes(ingredient)) {
                col.style.opacity = '1';
                col.style.filter = 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.6))';
            } else {
                col.style.opacity = '0.3';
                col.style.filter = 'grayscale(100%)';
            }
        });
    }

    /**
     * Highlight saved charts that use a specific glass type
     */
    highlightChartsWithGlassType(glassType) {
        const columns = document.querySelectorAll('.saved-chart-column');
        
        columns.forEach((col, idx) => {
            const chart = this.savedCharts[idx];
            if (chart && (chart.glassType || 'Unknown') === glassType) {
                col.style.opacity = '1';
                col.style.filter = 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.6))';
            } else {
                col.style.opacity = '0.3';
                col.style.filter = 'grayscale(100%)';
            }
        });
    }

    /**
     * Clear highlights on saved charts
     */
    clearChartHighlights() {
        const columns = document.querySelectorAll('.saved-chart-column');
        columns.forEach(col => {
            col.style.opacity = '1';
            col.style.filter = 'none';
        });
    }

    /**
     * Delete a saved chart
     */
    deleteSavedChart(id) {
        if (confirm('Delete this chart?')) {
            this.savedCharts = this.savedCharts.filter(chart => chart.id !== id);
            this.renderSavedCharts();
        }
    }

    /**
     * Load a saved chart
     */
    loadSavedChart(id) {
        const chart = this.savedCharts.find(c => c.id === id);
        if (!chart) return;

        // Clear current
        this.clearAllIngredients();

        // Load chart ingredients
        chart.ingredients.forEach(ing => {
            this.selectedIngredients.push(ing);
            this.ingredientQuantities.set(ing, chart.quantities.get(ing) || 1);
            this.selectedUnits.set(ing, 'Oz');
        });

        this.updateUI();
        this.updateCup();
        this.updateMatchingCocktails();
        
        // Switch back to main view
        if (this.currentView === 'saved') {
            this.switchView();
        }
    }
}

// Initialize on page load
let visualizer;
document.addEventListener('DOMContentLoaded', async () => {
    visualizer = new CocktailCupVisualizer();
    await visualizer.init();
});
