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

## Setup & Running

### Local Development

1. Navigate to the project directory:
   ```bash
   cd Cocktails_and_Ingredients
   ```

2. Start a local web server (Python 3):
   ```bash
   python -m http.server 8000
   ```
   
   Or for Python 2:
   ```bash
   python -m SimpleHTTPServer 8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

### Using Live Server (VS Code)

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"
3. The browser will automatically open and refresh on file changes

## Usage

1. **Search for Ingredients**: Type in the search box to find ingredients (e.g., "vodka", "lime")
2. **Add to Cup**: Click a suggestion or press Enter to add an ingredient
3. **View Matches**: The right panel updates to show matching cocktails
4. **Remove Ingredients**: Click the ✕ on an ingredient badge or click a layer in the cup
5. **Explore Details**: Click any cocktail to see full details including recipe and image
6. **Add Co-Ingredients**: In the "Co-Ingredients" tab, click bars to add suggested pairings

## Design Decisions

### Cup Visualization
- **Why a cup?**: The cup metaphor is intuitive for layered ingredients and provides a visual anchor
- **Stacked layers**: Each ingredient is rendered as a colored horizontal layer, with height representing equal "portions"
- **Colors**: Each ingredient gets a consistent color using D3's Tableau10 color scheme for distinction

### Interaction Techniques
- **Autocomplete**: Reduces cognitive load by showing relevant ingredients
- **Multi-view analysis**: Different perspectives (list, category, co-ingredients) enable discovery
- **Click-to-add co-ingredients**: Encourages exploration of ingredient relationships
- **Hover/click feedback**: Clear visual feedback for interactivity

### Data Processing
- **Frequency-based sorting**: Ingredients are sorted by how many cocktails they appear in
- **Flexible matching**: Users can see ALL drinks with ANY selected ingredient (prevents results being too narrow)
- **Co-ingredient recommendations**: The chart shows ingredients that frequently pair with selections

## Data Source

Data sourced from [TheCocktailDB](https://www.thecocktaildb.com/), a free, open API for cocktail data.

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
