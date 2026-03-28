// Data utilities for loading and processing cocktail data

class DataManager {
    constructor() {
        this.cocktails = [];
        this.ingredients = [];
        this.ingredientMap = new Map(); // ingredient name -> {id, count, color}
        this.cocktailIngredientMap = new Map(); // idDrink -> [ingredients]
        this.ingredientCocktailMap = new Map(); // ingredient -> [idDrink]
    }

    /**
     * Load all data files (CSV)
     */
    async loadData() {
        try {
            const [cocktailsData, ingredientsData, imageMapData] = await Promise.all([
                d3.csv('data/cocktails.csv'),
                d3.csv('data/cocktail_ingredients.csv'),
                d3.csv('data/cocktail_image_mapping.csv')
            ]);

            this.cocktails = cocktailsData;
            this.buildIngredientMap(ingredientsData);
            this.buildCocktailIngredientMap(ingredientsData);
            this.buildImageMap(imageMapData);

            console.log(`Loaded ${this.cocktails.length} cocktails`);
            console.log(`Loaded ${this.ingredientMap.size} unique ingredients`);
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Build a map of unique ingredients with their frequency
     */
    buildIngredientMap(ingredientsData) {
        const ingredientCounts = new Map();

        ingredientsData.forEach(row => {
            const ingredient = row.Ingredient.toLowerCase().trim();
            if (ingredient) {
                const count = (ingredientCounts.get(ingredient) || 0) + 1;
                ingredientCounts.set(ingredient, count);
            }
        });

        // Create unique color for each ingredient using HSL with maximum variance
        let colorIndex = 0;
        ingredientCounts.forEach((count, ingredient) => {
            // Use golden ratio for optimal hue distribution
            const goldenRatio = 0.618033988749;
            const hue = Math.round(((colorIndex * goldenRatio) % 1) * 360);
            
            // Maximize saturation and lightness variance combinations
            const saturation = 50 + (colorIndex % 10) * 5; // 10 levels: 50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%, 90%, 95%
            const lightness = 30 + (colorIndex % 8) * 8; // 8 levels: 30%, 38%, 46%, 54%, 62%, 70%, 78%, 86%
            
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            this.ingredientMap.set(ingredient, {
                name: ingredient,
                displayName: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
                count: count,
                color: color,
                selected: false
            });
            
            colorIndex++;
        });

        // Sort by count (most common first)
        this.ingredients = Array.from(this.ingredientMap.values()).sort((a, b) => b.count - a.count);
    }

    /**
     * Build map of cocktail -> ingredients
     */
    buildCocktailIngredientMap(ingredientsData) {
        ingredientsData.forEach(row => {
            const idDrink = row.idDrink;
            const ingredient = row.Ingredient.toLowerCase().trim();
            const measure = row.Measure || '';

            if (!this.cocktailIngredientMap.has(idDrink)) {
                this.cocktailIngredientMap.set(idDrink, []);
            }

            this.cocktailIngredientMap.get(idDrink).push({
                name: ingredient,
                displayName: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
                measure: measure.trim(),
                color: this.ingredientMap.get(ingredient)?.color || '#ccc'
            });

            // Also build reverse map
            if (!this.ingredientCocktailMap.has(ingredient)) {
                this.ingredientCocktailMap.set(ingredient, []);
            }
            this.ingredientCocktailMap.get(ingredient).push(idDrink);
        });
    }

    /**
     * Build map of drink images
     */
    buildImageMap(imageMapData) {
        this.imageMap = new Map();
        imageMapData.forEach(row => {
            this.imageMap.set(row.idDrink, {
                filename: row.image_filename,
                path: row.image_path
            });
        });
    }

    /**
     * Get all unique ingredients sorted by frequency
     */
    getAllIngredients() {
        return this.ingredients;
    }

    /**
     * Get ingredient by name
     */
    getIngredient(name) {
        return this.ingredientMap.get(name.toLowerCase().trim());
    }

    /**
     * Get cocktails containing specific ingredients
     * @param {Array<string>} selectedIngredients - array of ingredient names
     * @param {string} mode - 'all' (must have all) or 'any' (has at least one)
     */
    getCocktailsByIngredients(selectedIngredients, mode = 'any') {
        if (selectedIngredients.length === 0) {
            return [];
        }

        const normalized = selectedIngredients.map(ing => ing.toLowerCase().trim());

        if (mode === 'all') {
            // Find cocktails that have ALL selected ingredients
            const sets = normalized.map(ing => new Set(this.ingredientCocktailMap.get(ing) || []));
            if (sets.length === 0) return [];

            let intersection = sets[0];
            for (let i = 1; i < sets.length; i++) {
                intersection = new Set([...intersection].filter(x => sets[i].has(x)));
            }

            return Array.from(intersection)
                .map(id => this.cocktails.find(c => c.idDrink === id))
                .filter(c => c);
        } else {
            // Find cocktails that have ANY of the selected ingredients
            const cocktailIds = new Set();
            normalized.forEach(ing => {
                (this.ingredientCocktailMap.get(ing) || []).forEach(id => cocktailIds.add(id));
            });

            return Array.from(cocktailIds)
                .map(id => this.cocktails.find(c => c.idDrink === id))
                .filter(c => c);
        }
    }

    /**
     * Get additional ingredients commonly paired with selected ones
     */
    getCoIngredientsFrequency(selectedIngredients) {
        if (selectedIngredients.length === 0) return [];

        const coIngredientCount = new Map();
        const normalized = selectedIngredients.map(ing => ing.toLowerCase().trim());

        // Get all cocktails containing at least one selected ingredient
        const cocktailIds = new Set();
        normalized.forEach(ing => {
            (this.ingredientCocktailMap.get(ing) || []).forEach(id => cocktailIds.add(id));
        });

        // Count co-occurring ingredients
        cocktailIds.forEach(id => {
            const ingredients = this.cocktailIngredientMap.get(id) || [];
            ingredients.forEach(ing => {
                const ingName = ing.name.toLowerCase();
                if (!normalized.includes(ingName)) {
                    coIngredientCount.set(ingName, (coIngredientCount.get(ingName) || 0) + 1);
                }
            });
        });

        // Sort by frequency
        return Array.from(coIngredientCount.entries())
            .map(([name, count]) => ({
                name: name,
                displayName: name.charAt(0).toUpperCase() + name.slice(1),
                count: count,
                color: this.ingredientMap.get(name)?.color || '#ccc'
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    }

    /**
     * Get stats for cocktails by category
     */
    getCategoryStats(cocktailIds) {
        const stats = new Map();

        cocktailIds.forEach(id => {
            const cocktail = this.cocktails.find(c => c.idDrink === id);
            if (cocktail) {
                const category = cocktail.strCategory || 'Unknown';
                stats.set(category, (stats.get(category) || 0) + 1);
            }
        });

        return Array.from(stats.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get most common glass type
     */
    getMostCommonGlass(cocktailIds) {
        const glassCount = new Map();

        cocktailIds.forEach(id => {
            const cocktail = this.cocktails.find(c => c.idDrink === id);
            if (cocktail) {
                const glass = cocktail.strGlass || 'Unknown';
                glassCount.set(glass, (glassCount.get(glass) || 0) + 1);
            }
        });

        const max = Math.max(...glassCount.values());
        for (let [glass, count] of glassCount.entries()) {
            if (count === max) return glass;
        }
        return 'N/A';
    }

    /**
     * Get cocktail details by ID
     */
    getCocktailDetail(idDrink) {
        const cocktail = this.cocktails.find(c => c.idDrink === idDrink);
        const ingredients = this.cocktailIngredientMap.get(idDrink) || [];
        const image = this.imageMap?.get(idDrink);

        return {
            ...cocktail,
            ingredients: ingredients,
            image: image
        };
    }

    /**
     * Get measurement stats for an ingredient across all cocktails
     */
    getMeasurementStats(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();
        const measures = [];
        
        // Get all cocktails that use this ingredient
        const cocktailIds = this.ingredientCocktailMap.get(normalized) || [];
        
        cocktailIds.forEach(id => {
            const ingredients = this.cocktailIngredientMap.get(id) || [];
            const ing = ingredients.find(i => i.name.toLowerCase() === normalized);
            if (ing && ing.measure) {
                measures.push(ing.measure);
            }
        });

        // Parse measurements to extract numeric values
        const parsed = measures.map(m => this.parseMeasure(m)).filter(p => p);
        
        if (parsed.length === 0) {
            return {
                min: 0.5,
                max: 5,
                unit: 'parts',
                examples: measures.slice(0, 3),
                avg: null
            };
        }

        // Group by unit and get stats
        const byUnit = new Map();
        parsed.forEach(p => {
            if (!byUnit.has(p.unit)) byUnit.set(p.unit, []);
            byUnit.get(p.unit).push(p.value);
        });

        // Use the most common unit
        const mostCommonUnit = Array.from(byUnit.entries())
            .sort((a, b) => b[1].length - a[1].length)[0][0];
        
        const values = byUnit.get(mostCommonUnit);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

        return {
            min: Math.floor(min),
            max: Math.ceil(max),
            unit: mostCommonUnit,
            examples: measures.slice(0, 3),
            avg: parseFloat(avg),
            cocktailCount: cocktailIds.length
        };
    }

    /**
     * Parse measurement string to extract numeric value and unit
     */
    parseMeasure(measureStr) {
        if (!measureStr) return null;
        
        // Remove extra whitespace
        measureStr = measureStr.trim();
        
        // List of valid units
        const validUnits = new Set([
            'oz', 'ml', 'tsp', 'tbsp', 'dash', 'dashes', 'splash', 'cup', 'cups', 
            'pint', 'pints', 'shot', 'shots', 'jigger', 'jiggers', 'cl', 'l',
            'drop', 'drops', 'scoop', 'scoops', 'part', 'parts'
        ]);
        
        // Try to match patterns like "1.5 oz", "45 ml", "1/2 tsp", "1 1/2 oz", etc.
        // Pattern 1: "1 1/2 oz" - mixed number format
        const pattern1 = /^(\d+)\s+(\d+)\/(\d+)\s+([a-z]+)/i;
        let match = measureStr.match(pattern1);
        if (match) {
            const whole = parseInt(match[1]);
            const numerator = parseInt(match[2]);
            const denominator = parseInt(match[3]);
            const unit = this.normalizeUnit(match[4].toLowerCase());
            
            if (validUnits.has(unit)) {
                return {
                    value: whole + (numerator / denominator),
                    unit: unit
                };
            }
        }

        // Pattern 2: "1/2 oz" - fraction format
        const pattern2 = /^(\d+)\/(\d+)\s+([a-z]+)/i;
        match = measureStr.match(pattern2);
        if (match) {
            const numerator = parseInt(match[1]);
            const denominator = parseInt(match[2]);
            const unit = this.normalizeUnit(match[3].toLowerCase());
            
            if (validUnits.has(unit)) {
                return {
                    value: numerator / denominator,
                    unit: unit
                };
            }
        }

        // Pattern 3: "1.5 oz" or "45 ml" - decimal or whole number format
        const pattern3 = /^(\d+(?:\.\d+)?)\s+([a-z]+)/i;
        match = measureStr.match(pattern3);
        if (match) {
            const unit = this.normalizeUnit(match[2].toLowerCase());
            
            if (validUnits.has(unit)) {
                return {
                    value: parseFloat(match[1]),
                    unit: unit
                };
            }
        }
        
        return null;
    }

    /**
     * Normalize unit names to singular form
     */
    normalizeUnit(unit) {
        const normalizations = {
            'shots': 'shot',
            'dashes': 'dash',
            'drops': 'drop',
            'scoops': 'scoop',
            'cups': 'cup',
            'pints': 'pint',
            'jiggers': 'jigger',
            'parts': 'part'
        };
        return normalizations[unit] || unit;
    }

    /**
     * Get all available measurement units for an ingredient
     * @param {string} ingredientName - ingredient to analyze
     * @returns {Array} - unique units sorted by frequency
     */
    getMeasurementUnits(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();
        const unitFrequency = new Map();

        // Get all cocktails that use this ingredient
        const cocktailIds = this.ingredientCocktailMap.get(normalized) || [];
        console.log(`getMeasurementUnits(${normalized}): found ${cocktailIds.length} cocktails`);

        cocktailIds.forEach(id => {
            const ingredients = this.cocktailIngredientMap.get(id) || [];
            const ing = ingredients.find(i => i.name.toLowerCase() === normalized);
            if (ing && ing.measure) {
                const parsed = this.parseMeasure(ing.measure);
                console.log(`  Measure: "${ing.measure}" → parsed: ${JSON.stringify(parsed)}`);
                if (parsed) {
                    unitFrequency.set(parsed.unit, (unitFrequency.get(parsed.unit) || 0) + 1);
                }
            }
        });

        // Return units sorted by frequency (most common first)
        const result = Array.from(unitFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([unit, freq]) => ({
                unit: unit,
                frequency: freq // how many cocktails use this unit for this ingredient
            }));
        
        console.log(`getMeasurementUnits(${normalized}): returning ${result.length} units:`, result);
        return result;
    }

    /**
     * Get all measures and their frequencies for a specific ingredient + unit combo
     * @param {string} ingredientName
     * @param {string} unit - specific unit to filter by
     * @returns {Array} - sorted array of {measure, value, count, ingredientNumbers}
     */
    getMeasuresByUnit(ingredientName, unit) {
        const normalized = ingredientName.toLowerCase().trim();
        const measureFrequency = new Map(); // measure string -> {value, count, ingredientNumbers: []}

        // Get all cocktails that use this ingredient
        const cocktailIds = this.ingredientCocktailMap.get(normalized) || [];

        cocktailIds.forEach(id => {
            const ingredients = this.cocktailIngredientMap.get(id) || [];
            const ing = ingredients.find(i => i.name.toLowerCase() === normalized);
            
            if (ing && ing.measure) {
                const parsed = this.parseMeasure(ing.measure);
                if (parsed && parsed.unit.toLowerCase() === unit.toLowerCase()) {
                    const measureStr = ing.measure;
                    
                    if (!measureFrequency.has(measureStr)) {
                        measureFrequency.set(measureStr, {
                            measure: measureStr,
                            value: parsed.value,
                            count: 0,
                            ingredientNumbers: [] // how many of each ingredient in recipes using this measure
                        });
                    }
                    
                    const entry = measureFrequency.get(measureStr);
                    entry.count++;
                    
                    // Track how many times this ingredient appears with this measure
                    // (ingredientNumber tracks multiplication factor)
                    const ingredientMultiplier = ingredients.filter(i => i.name.toLowerCase() === normalized).length;
                    entry.ingredientNumbers.push(ingredientMultiplier);
                }
            }
        });

        // Sort by value (small to large)
        return Array.from(measureFrequency.values())
            .sort((a, b) => a.value - b.value)
            .map(entry => ({
                measure: entry.measure,
                value: entry.value,
                count: entry.count, // frequency in dataset
                unit: unit,
                minIngredientNumber: Math.min(...entry.ingredientNumbers),
                maxIngredientNumber: Math.max(...entry.ingredientNumbers),
                avgIngredientNumber: (entry.ingredientNumbers.reduce((a,b) => a+b, 0) / entry.ingredientNumbers.length).toFixed(1)
            }));
    }

    /**
     * Get valid quantity range for an ingredient with specific unit
     * @param {string} ingredientName
     * @param {string} unit
     * @returns {Object} - {min, max, possibleValues, unit}
     */
    getQuantityRangeForUnit(ingredientName, unit) {
        const measures = this.getMeasuresByUnit(ingredientName, unit);

        if (measures.length === 0) {
            return {
                min: 0.5,
                max: 10,
                unit: unit,
                possibleValues: [0.5, 1, 1.5, 2, 2.5, 3, 5, 10],
                measures: []
            };
        }

        // Calculate max possible value: max measure value × max ingredient number
        const maxMeasure = Math.max(...measures.map(m => m.value));
        const maxIngredientNum = Math.max(...measures.map(m => m.maxIngredientNumber));
        const maxPossible = maxMeasure * maxIngredientNum;

        // Calculate min possible value: min measure value × min ingredient number (at least 1)
        const minMeasure = Math.min(...measures.map(m => m.value));
        const minPossible = minMeasure;

        // Generate possible values with 0.5 increment
        const possibleValues = [];
        for (let i = minPossible; i <= maxPossible; i += 0.5) {
            possibleValues.push(parseFloat(i.toFixed(1)));
        }

        return {
            min: parseFloat(minPossible.toFixed(1)),
            max: parseFloat(maxPossible.toFixed(1)),
            unit: unit,
            possibleValues: possibleValues,
            measures: measures,
            ingredientCount: this.ingredientCocktailMap.get(ingredientName.toLowerCase().trim())?.length || 0
        };
    }

    /**
     * Get all measurements (with all units combined) for an ingredient
     * Returns unique measures sorted by frequency
     */
    getAllMeasuresForIngredient(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();
        const measureMap = new Map(); // measure string -> {measure, unit, count, maxIngredientNumber}

        // Get all cocktails that use this ingredient
        const cocktailIds = this.ingredientCocktailMap.get(normalized) || [];

        cocktailIds.forEach(id => {
            const ingredients = this.cocktailIngredientMap.get(id) || [];
            const ing = ingredients.find(i => i.name.toLowerCase() === normalized);
            
            if (ing && ing.measure) {
                const parsed = this.parseMeasure(ing.measure);
                if (parsed) {
                    const measureKey = ing.measure.toLowerCase();
                    
                    if (!measureMap.has(measureKey)) {
                        measureMap.set(measureKey, {
                            measure: ing.measure,
                            unit: parsed.unit,
                            value: parsed.value,
                            count: 0,
                            ingredientNumbers: []
                        });
                    }
                    
                    const entry = measureMap.get(measureKey);
                    entry.count++;
                    
                    const multiplier = ingredients.filter(i => i.name.toLowerCase() === normalized).length;
                    entry.ingredientNumbers.push(multiplier);
                }
            }
        });

        // Convert to array and sort by frequency (most used first)
        return Array.from(measureMap.values())
            .map(entry => ({
                measure: entry.measure,
                unit: entry.unit,
                value: entry.value,
                count: entry.count,
                minIngredientNumber: Math.min(...entry.ingredientNumbers),
                maxIngredientNumber: Math.max(...entry.ingredientNumbers)
            }))
            .sort((a, b) => b.count - a.count); // Sort by frequency descending
    }

    /**
     * Get unique measurement units (generalized) for an ingredient
     * Groups by unit type only (e.g., "cup", "oz", "ml") without duplicates
     */
    getUniqueMeasurementUnits(ingredientName) {
        const normalized = ingredientName.toLowerCase().trim();
        const unitMap = new Map(); // unit -> {unit, count, fromMeasures: []}

        // Get all cocktails that use this ingredient
        const cocktailIds = this.ingredientCocktailMap.get(normalized) || [];

        cocktailIds.forEach(id => {
            const ingredients = this.cocktailIngredientMap.get(id) || [];
            const ing = ingredients.find(i => i.name.toLowerCase() === normalized);
            
            if (ing && ing.measure) {
                const parsed = this.parseMeasure(ing.measure);
                if (parsed) {
                    const unit = parsed.unit;
                    
                    if (!unitMap.has(unit)) {
                        unitMap.set(unit, {
                            unit: unit,
                            count: 0,
                            fromMeasures: [],
                            ingredientNumbers: []
                        });
                    }
                    
                    const entry = unitMap.get(unit);
                    entry.count++;
                    if (!entry.fromMeasures.includes(ing.measure)) {
                        entry.fromMeasures.push(ing.measure);
                    }
                    
                    const multiplier = ingredients.filter(i => i.name.toLowerCase() === normalized).length;
                    entry.ingredientNumbers.push(multiplier);
                }
            }
        });

        // Convert to array and sort by frequency (most used first)
        return Array.from(unitMap.values())
            .map(entry => ({
                unit: entry.unit,
                count: entry.count,
                displayName: entry.unit.charAt(0).toUpperCase() + entry.unit.slice(1),
                minIngredientNumber: Math.min(...entry.ingredientNumbers),
                maxIngredientNumber: Math.max(...entry.ingredientNumbers)
            }))
            .sort((a, b) => b.count - a.count); // Sort by frequency descending
    }

    /**
     * Get cocktails filtered by both ingredients and ingredient numbers
     * @param {Array} selectedIngredients - array of ingredient names
     * @param {Map} selectedUnits - not used anymore (kept for compatibility)
     * @param {Map} ingredientQuantities - ingredient -> ingredient number (multiplier)
     * @returns {Array} - cocktails matching the ingredients and ingredient numbers
     */
    getCocktailsByIngredientsAndQuantities(selectedIngredients, selectedUnits, ingredientQuantities) {
        if (selectedIngredients.length === 0) {
            return [];
        }

        const normalized = selectedIngredients.map(ing => ing.toLowerCase().trim());
        
        // Find cocktails that have ALL selected ingredients
        const sets = normalized.map(ing => new Set(this.ingredientCocktailMap.get(ing) || []));
        if (sets.length === 0) return [];

        let intersection = sets[0];
        for (let i = 1; i < sets.length; i++) {
            intersection = new Set([...intersection].filter(x => sets[i].has(x)));
        }

        // Filter cocktails by quantity compatibility
        const matchingCocktails = [];
        
        for (const cocktailId of intersection) {
            const cocktail = this.cocktails.find(c => c.idDrink === cocktailId);
            if (!cocktail) continue;

            const recipeIngredients = this.cocktailIngredientMap.get(cocktailId) || [];
            let quantitiesMatch = true;

            // Check if all selected ingredients have compatible quantities
            for (const ing of selectedIngredients) {
                const userMultiplier = ingredientQuantities.get(ing) || 1;
                
                // Count how many times this ingredient appears in the recipe
                const ingredientCount = recipeIngredients.filter(ri => ri.name.toLowerCase() === ing.toLowerCase()).length;
                
                // Accept if ingredient count is within 0.5x to 2x of user's multiplier
                // This allows some flexibility in doubling recipes, but ensures reasonable quantities
                if (ingredientCount > 0 && ingredientCount >= userMultiplier * 0.5 && ingredientCount <= userMultiplier * 1.5) {
                    continue;
                } else {
                    quantitiesMatch = false;
                    break;
                }
            }

            if (quantitiesMatch) {
                matchingCocktails.push(cocktail);
            }
        }

        return matchingCocktails;
    }

    /**
     * Get cocktails that match exactly with the selected ingredients
     * (Cocktail must have exactly the same ingredients, no more, no less)
     */
    getCocktailsByExactIngredients(selectedIngredients) {
        if (selectedIngredients.length === 0) {
            return [];
        }

        const normalized = selectedIngredients.map(ing => ing.toLowerCase().trim());
        const normalizedSet = new Set(normalized);
        
        // Find cocktails that have ALL selected ingredients
        const sets = normalized.map(ing => new Set(this.ingredientCocktailMap.get(ing) || []));
        if (sets.length === 0) return [];

        let intersection = sets[0];
        for (let i = 1; i < sets.length; i++) {
            intersection = new Set([...intersection].filter(x => sets[i].has(x)));
        }

        // Filter for exact matches - cocktail must have exactly these ingredients, no more, no less
        const exactMatches = [];
        
        for (const cocktailId of intersection) {
            const cocktail = this.cocktails.find(c => c.idDrink === cocktailId);
            if (!cocktail) continue;

            const recipeIngredients = this.cocktailIngredientMap.get(cocktailId) || [];
            const recipeIngredientsNormalized = new Set(
                recipeIngredients.map(ri => ri.name.toLowerCase().trim())
            );

            // Check if the sets are exactly equal
            if (normalizedSet.size === recipeIngredientsNormalized.size &&
                [...normalizedSet].every(ing => recipeIngredientsNormalized.has(ing))) {
                exactMatches.push(cocktail);
            }
        }

        return exactMatches;
    }

    /**
     * Get search suggestions
     */
    getIngredientSuggestions(query) {
        if (!query) return [];

        const normalized = query.toLowerCase();
        return this.ingredients
            .filter(ing => ing.name.includes(normalized))
            .slice(0, 10);
    }
}

// Create global data manager
const dataManager = new DataManager();
