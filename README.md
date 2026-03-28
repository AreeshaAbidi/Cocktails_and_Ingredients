# 🍹 Cocktail Cup Explorer

An interactive D3.js visualization for exploring cocktails by ingredients. Add ingredients to a dynamic cup visualization and discover which cocktails you can make, along with ingredient pairings and category breakdowns.

## Features

- **Interactive Cup Visualization**: Add ingredients to a stacked liquid bar chart visualized as a cup
- **Ingredient Search**: Autocomplete search for ingredients with frequency counts
- **Real-time Filtering**: See matching cocktails as you add ingredients
- **Multi-view Analysis**:
  - Cocktail list with category and glass type badges
  - Category breakdowns showing drink types
  - Co-ingredient frequency chart (click to add more ingredients)
- **Detailed Cocktail Info**: Modal view with images, ingredients, measures, and preparation instructions
- **Responsive Design**: Works on desktop and tablet devices

## Project Structure

```
Cocktails_and_Ingredients/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styling
├── js/
│   ├── main.js            # Main visualization and interaction logic
│   └── data-utils.js      # Data loading and processing utilities
└── data/
    ├── cocktails.csv
    ├── cocktail_ingredients.csv
    ├── cocktail_image_mapping.csv
    └── cocktail_images/   # Cocktail drink images
```

## Usage

1. **Search for Ingredients**: Type in the search box to find ingredients (e.g., "vodka", "lime")
2. **Add to Cup**: Click a suggestion or press Enter to add an ingredient
3. **View Matches**: The right panel updates to show matching cocktails
4. **Remove Ingredients**: Click the ✕ on an ingredient badge or click a layer in the cup
5. **Explore Details**: Click any cocktail to see full details including recipe and image
6. **Add Co-Ingredients**: In the "Co-Ingredients" tab, click bars to add suggested pairings



## Data Source

Data sourced from [Cocktails & Ingredients Dataset]([https://www.kaggle.com/datasets/filipkin/cocktails-and-ingredients-dataset?select=cocktail_ingredients.csv])

## Technology Stack

- **D3.js v7**: Interactive data visualization
- **HTML5 & CSS3**: Semantic markup and modern styling
- **JavaScript (ES6+)**: Core application logic
- **CSV Data**: Cocktail recipes and images

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
