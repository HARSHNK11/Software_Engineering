const plantImageMap = {
    'Snake Plant (Sansevieria)': 'https://images.unsplash.com/photo-1593691508635-0a70111502a2?w=400&h=400&fit=crop&q=80',
    'ZZ Plant (Zamioculcas)': 'https://images.unsplash.com/photo-1512428813834-c702c7700b78?w=400&h=400&fit=crop&q=80',
    'Pothos Golden': 'https://images.unsplash.com/photo-1614594975525-4516ab6d34d7?w=400&h=400&fit=crop&q=80',
    'Spider Plant': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop&q=80',
    'Peace Lily': 'https://images.unsplash.com/photo-1597848212624-e59336a7d3cb?w=400&h=400&fit=crop&q=80',
    'Monstera Deliciosa': 'https://images.unsplash.com/photo-1614594895308-d96d0b0e7c38?w=400&h=400&fit=crop&q=80',
    'Fiddle Leaf Fig': 'https://images.unsplash.com/photo-1530836369250-ef72aae1c75f?w=400&h=400&fit=crop&q=80',
    'Rubber Plant': 'https://images.unsplash.com/photo-1593691508635-0a70111502a2?w=400&h=400&fit=crop&q=80',
    'Philodendron Heartleaf': 'https://images.unsplash.com/photo-1614594975525-4516ab6d34d7?w=400&h=400&fit=crop&q=80',
    'Chinese Evergreen': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop&q=80',
    'Succulent Mix (Set of 3)': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Aloe Vera': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Jade Plant': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Echeveria Rosette': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Cactus Collection (Set of 3)': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Orchid Phalaenopsis': 'https://images.unsplash.com/photo-1597848212624-e59336a7d3cb?w=400&h=400&fit=crop&q=80',
    'African Violet': 'https://images.unsplash.com/photo-1597848212624-e59336a7d3cb?w=400&h=400&fit=crop&q=80',
    'Anthurium Red': 'https://images.unsplash.com/photo-1597848212624-e59336a7d3cb?w=400&h=400&fit=crop&q=80',
    'Kalanchoe': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Basil Plant': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Mint Plant': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Coriander (Cilantro)': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Chili Plant': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Lemon Balm': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Areca Palm': 'https://images.unsplash.com/photo-1512428813834-c702c7700b78?w=400&h=400&fit=crop&q=80',
    'Dracaena Marginata': 'https://images.unsplash.com/photo-1512428813834-c702c7700b78?w=400&h=400&fit=crop&q=80',
    'Yucca Plant': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Bird of Paradise': 'https://images.unsplash.com/photo-1512428813834-c702c7700b78?w=400&h=400&fit=crop&q=80',
    'String of Pearls': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'String of Hearts': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'English Ivy': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop&q=80',
    'Burro\'s Tail': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Boston Fern': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop&q=80',
    'Bamboo Palm': 'https://images.unsplash.com/photo-1512428813834-c702c7700b78?w=400&h=400&fit=crop&q=80',
    'Dracaena Warneckii': 'https://images.unsplash.com/photo-1512428813834-c702c7700b78?w=400&h=400&fit=crop&q=80',
    'Spider Plant Variegated': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop&q=80',
    'Monstera Adansonii': 'https://images.unsplash.com/photo-1614594895308-d96d0b0e7c38?w=400&h=400&fit=crop&q=80',
    'Calathea Orbifolia': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop&q=80',
    'Pink Princess Philodendron': 'https://images.unsplash.com/photo-1614594975525-4516ab6d34d7?w=400&h=400&fit=crop&q=80',
    'String of Turtles': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop&q=80',
    'Lavender Plant': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Rosemary Plant': 'https://images.unsplash.com/photo-1618375569909-4c735f4e2f28?w=400&h=400&fit=crop&q=80',
    'Marigold Plant': 'https://images.unsplash.com/photo-1597848212624-e59336a7d3cb?w=400&h=400&fit=crop&q=80',
    'Geranium': 'https://images.unsplash.com/photo-1597848212624-e59336a7d3cb?w=400&h=400&fit=crop&q=80'
};

function getPlantImage(plantName) {
    const imageUrl = plantImageMap[plantName];
    if (imageUrl) {
        return imageUrl;
    }
    const searchTerm = encodeURIComponent(plantName.split('(')[0].trim());
    return `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop&q=80`;
}
