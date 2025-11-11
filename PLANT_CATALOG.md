# Plant Catalog Database

This document describes the comprehensive plant catalog database for Plant-E-Tree.

## Overview

The catalog contains **50+ diverse plant products** organized by:
- **Category**: Indoor, Succulent, Flowering, Herbs, Large, Hanging, Air Purifying, Rare, Outdoor
- **Care Level**: Easy, Medium, Hard
- **Price Range**: Budget (Under ₹300) to Luxury (₹1000+)

---

## How to Use the Catalog

### 1. Seed All Plants (Recommended)

Once your server is running, seed the entire catalog using **Postman**:

**Using Postman:**
1. Open Postman
2. Create new request
3. Method: **POST**
4. URL: `http://localhost:4000/api/test/seed`
5. Click **Send**

**See `POSTMAN_GUIDE.md` for detailed Postman instructions!**

This adds all 50+ plants to your product database.

### 2. Seed Limited Plants

Add only first 10 plants:

```bash
POST http://localhost:4000/api/test/seed?count=10
```

### 3. Clear and Reseed

Clear existing products and reseed:

```bash
POST http://localhost:4000/api/test/seed?clear=true
```

### 4. Get Catalog Information

View catalog statistics:

```bash
GET http://localhost:4000/api/catalog/info
```

Returns:
- Total plants available
- All categories
- Care levels
- Price ranges
- Count per category

---

## Plant Categories

### 🌿 Indoor Plants (10 plants)
- Low maintenance options
- Perfect for homes and offices
- Air-purifying properties

**Examples:**
- Snake Plant (₹399)
- ZZ Plant (₹549)
- Monstera Deliciosa (₹899)
- Fiddle Leaf Fig (₹1299)

### 🌵 Succulents & Cacti (5 plants)
- Minimal watering required
- Perfect for beginners
- Great for small spaces

**Examples:**
- Succulent Mix (₹199)
- Aloe Vera (₹299)
- Jade Plant (₹449)
- Cactus Collection (₹179)

### 🌸 Flowering Plants (4 plants)
- Colorful blooms
- Great for gifting
- Adds beauty to spaces

**Examples:**
- Orchid Phalaenopsis (₹799)
- African Violet (₹349)
- Anthurium Red (₹599)

### 🌿 Herbs & Edible Plants (5 plants)
- Fresh culinary herbs
- Easy to grow indoors
- Perfect for cooking

**Examples:**
- Basil Plant (₹149)
- Mint Plant (₹149)
- Coriander (₹129)
- Chili Plant (₹199)

### 🌳 Large Plants (4 plants)
- Statement pieces
- Perfect for corners
- Air-purifying

**Examples:**
- Areca Palm (₹1499)
- Bird of Paradise (₹1699)
- Yucca Plant (₹1199)

### 🪴 Hanging Plants (4 plants)
- Trailing varieties
- Perfect for shelves
- Beautiful cascading effect

**Examples:**
- String of Pearls (₹399)
- String of Hearts (₹349)
- English Ivy (₹299)

### 💨 Air Purifying Plants (4 plants)
- NASA-approved air cleaners
- Remove toxins
- Improve indoor air quality

**Examples:**
- Boston Fern (₹499)
- Bamboo Palm (₹799)
- Spider Plant Variegated (₹279)

### 💎 Rare & Special Plants (4 plants)
- Unique varieties
- Highly sought after
- Trendy plants

**Examples:**
- Monstera Adansonii (₹699)
- Pink Princess Philodendron (₹1299)
- String of Turtles (₹549)

### 🌻 Outdoor Plants (4 plants)
- Garden varieties
- Attract pollinators
- Great for patios

**Examples:**
- Lavender Plant (₹399)
- Rosemary Plant (₹299)
- Marigold Plant (₹149)

---

## Price Ranges

### Budget (Under ₹300)
- 15+ plants
- Perfect for beginners
- Great value

### Mid-range (₹300-₹600)
- 20+ plants
- Most popular range
- Good quality

### Premium (₹600-₹1000)
- 10+ plants
- Special varieties
- Higher quality

### Luxury (₹1000+)
- 5+ plants
- Large statement plants
- Rare varieties

---

## Care Levels

### Easy (30+ plants)
- Low maintenance
- Perfect for beginners
- Forgiving plants

### Medium (20+ plants)
- Moderate care needed
- Regular watering
- Some attention required

---

## Product Fields

Each plant in the catalog includes:

- **name**: Plant name
- **price**: Price in ₹ (Indian Rupees)
- **stock**: Available quantity
- **description**: Detailed description
- **category**: Plant category
- **careLevel**: Easy, Medium, or Hard

---

## API Endpoints

### Seed Catalog
```
POST /api/test/seed
POST /api/test/seed?count=10
POST /api/test/seed?clear=true
```

### Get Catalog Info
```
GET /api/catalog/info
```

### Get All Products
```
GET /api/products
```

---

## Usage Examples

### Using Postman (Recommended)

**See `POSTMAN_GUIDE.md` for complete Postman guide!**

Quick steps:
1. Open Postman
2. Method: **POST**
3. URL: `http://localhost:4000/api/test/seed`
4. Click **Send**

**Variations:**
- Seed first 20: Add `?count=20` to URL
- Clear and reseed: Add `?clear=true` to URL

### Using Browser

1. Start your server
2. Open browser
3. Go to: `http://localhost:4000/api/test/seed`
4. (Note: Browser may show error for POST - use Postman instead)

### Using Frontend

After seeding, all products will appear in:
- Buyer page (`buyer.html`)
- Shop page (`shop.html`)
- Vendor inventory (after login)

---

## Catalog Statistics

- **Total Plants**: 50+
- **Categories**: 10
- **Price Range**: ₹129 - ₹1699
- **Average Price**: ~₹500
- **Care Levels**: Easy (30+), Medium (20+)

---

## Notes

- All prices are in Indian Rupees (₹)
- Stock quantities are sample values
- Descriptions are detailed and helpful
- Categories help with filtering
- Care levels guide plant selection

---

**The catalog is ready to use! Just seed it and start selling plants! 🌱**

