/**
 * NatureGuard — Action Library
 * Curated list of eco-actions. The AI will select, rank, and personalize
 * these based on the user's specific footprint profile.
 */

export const ACTION_LIBRARY = [
  // ── TRANSPORT ─────────────────────────────────────────────
  {
    key: 'transport_carpool',
    category: 'transport',
    title: 'Carpool to Work',
    description: 'Share a ride with a colleague to halve your commute emissions.',
    co2SavedEstimate: 45, // kg/month
    difficulty: 2,
    effort: 'daily',
    tips: ['Find a coworker who lives nearby', 'Take turns driving', 'Use a carpooling app']
  },
  {
    key: 'transport_bike',
    category: 'transport',
    title: 'Bike for Short Trips',
    description: 'Replace car trips under 5km with cycling.',
    co2SavedEstimate: 20,
    difficulty: 2,
    effort: 'weekly',
    tips: ['Get a comfortable backpack', 'Plan safe routes', 'Keep a lock handy']
  },
  {
    key: 'transport_public',
    category: 'transport',
    title: 'Take Public Transit',
    description: 'Use the bus or train instead of driving solo.',
    co2SavedEstimate: 60,
    difficulty: 1,
    effort: 'daily',
    tips: ['Buy a monthly pass', 'Use transit apps for real-time schedules']
  },
  {
    key: 'transport_tires',
    category: 'transport',
    title: 'Check Tire Pressure',
    description: 'Properly inflated tires improve fuel efficiency by up to 3%.',
    co2SavedEstimate: 15,
    difficulty: 1,
    effort: 'one-time',
    tips: ['Check pressure monthly', 'Keep a gauge in your glovebox']
  },

  // ── FOOD ──────────────────────────────────────────────────
  {
    key: 'food_meatless_monday',
    category: 'food',
    title: 'Meatless Mondays',
    description: 'Skip meat just one day a week.',
    co2SavedEstimate: 12,
    difficulty: 1,
    effort: 'weekly',
    tips: ['Try a new vegetarian recipe', 'Use beans or lentils for protein']
  },
  {
    key: 'food_vegan_switch',
    category: 'food',
    title: 'Go Vegan for a Week',
    description: 'Try a fully plant-based diet for 7 days.',
    co2SavedEstimate: 30,
    difficulty: 3,
    effort: 'weekly',
    tips: ['Stock up on plant milks', 'Find vegan versions of your favorite meals']
  },
  {
    key: 'food_local',
    category: 'food',
    title: 'Buy Local Produce',
    description: 'Purchase food grown near you to reduce transport emissions.',
    co2SavedEstimate: 8,
    difficulty: 2,
    effort: 'weekly',
    tips: ['Visit farmers markets', 'Look for local farm tags in grocery stores']
  },
  {
    key: 'food_compost',
    category: 'food',
    title: 'Start Composting',
    description: 'Keep food scraps out of landfills where they produce methane.',
    co2SavedEstimate: 15,
    difficulty: 2,
    effort: 'daily',
    tips: ['Keep a small bin in the kitchen', 'Check local composting services']
  },

  // ── ENERGY ────────────────────────────────────────────────
  {
    key: 'energy_leds',
    category: 'energy',
    title: 'Switch to LED Bulbs',
    description: 'Replace incandescent bulbs with LEDs.',
    co2SavedEstimate: 20,
    difficulty: 1,
    effort: 'one-time',
    tips: ['Focus on the most-used rooms first', 'Choose warm white for living areas']
  },
  {
    key: 'energy_thermostat_winter',
    category: 'energy',
    title: 'Lower Thermostat (Winter)',
    description: 'Turn your thermostat down by 1-2 degrees.',
    co2SavedEstimate: 40,
    difficulty: 1,
    effort: 'daily',
    tips: ['Wear a cozy sweater', 'Use a programmable thermostat']
  },
  {
    key: 'energy_thermostat_summer',
    category: 'energy',
    title: 'Raise Thermostat (Summer)',
    description: 'Set your AC 1-2 degrees higher.',
    co2SavedEstimate: 40,
    difficulty: 1,
    effort: 'daily',
    tips: ['Use ceiling fans', 'Close blinds during the hottest part of the day']
  },
  {
    key: 'energy_cold_wash',
    category: 'energy',
    title: 'Wash Clothes on Cold',
    description: 'Heating water accounts for 90% of a washing machine\'s energy.',
    co2SavedEstimate: 10,
    difficulty: 1,
    effort: 'weekly',
    tips: ['Use cold-water detergent', 'Save hot water for heavily soiled items']
  },
  {
    key: 'energy_unplug',
    category: 'energy',
    title: 'Unplug Vampire Electronics',
    description: 'Unplug devices that draw power even when turned off.',
    co2SavedEstimate: 8,
    difficulty: 2,
    effort: 'daily',
    tips: ['Use smart power strips', 'Unplug chargers when not in use']
  },

  // ── SHOPPING ──────────────────────────────────────────────
  {
    key: 'shopping_secondhand',
    category: 'shopping',
    title: 'Buy Secondhand Clothes',
    description: 'Choose thrifted or vintage clothing instead of fast fashion.',
    co2SavedEstimate: 25,
    difficulty: 2,
    effort: 'one-time',
    tips: ['Use apps like Depop or Vinted', 'Visit local charity shops']
  },
  {
    key: 'shopping_reusable_bag',
    category: 'shopping',
    title: 'Use Reusable Bags',
    description: 'Bring your own bags to the grocery store.',
    co2SavedEstimate: 2,
    difficulty: 1,
    effort: 'weekly',
    tips: ['Keep them in your car trunk', 'Buy compact bags that fit in a pocket']
  },
  {
    key: 'shopping_repair',
    category: 'shopping',
    title: 'Repair Instead of Replace',
    description: 'Fix broken items rather than buying new ones.',
    co2SavedEstimate: 50,
    difficulty: 3,
    effort: 'one-time',
    tips: ['Search YouTube for repair tutorials', 'Find local repair cafes']
  },

  // ── TRAVEL ────────────────────────────────────────────────
  {
    key: 'travel_direct',
    category: 'travel',
    title: 'Book Direct Flights',
    description: 'Take-offs and landings produce the most emissions.',
    co2SavedEstimate: 100,
    difficulty: 2,
    effort: 'one-time',
    tips: ['Use direct flight filters on booking sites', 'Sometimes it is worth paying a little extra']
  },
  {
    key: 'travel_staycation',
    category: 'travel',
    title: 'Take a Staycation',
    description: 'Vacation locally instead of flying.',
    co2SavedEstimate: 500,
    difficulty: 3,
    effort: 'one-time',
    tips: ['Explore nearby national parks', 'Be a tourist in your own city']
  }
];
