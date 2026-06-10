/**
 * NatureGuard — Emission Factors
 * Peer-reviewed CO₂ constants used by the calculator engine.
 *
 * Sources:
 *  - Transport: DEFRA 2024 UK Greenhouse Gas Conversion Factors
 *  - Food:      Poore & Nemecek (2018), Science — "Reducing food's environmental impacts"
 *  - Energy:    IEA (2023) World average grid intensity
 *  - Shopping:  WRAP & lifecycle analysis averages
 *  - Aviation:  ICAO Carbon Emissions Calculator methodology
 */

/** kg CO₂e per km by vehicle type */
export const TRANSPORT = {
  petrol_avg:  0.214,   // avg petrol car (DEFRA)
  diesel_avg:  0.209,
  hybrid:      0.118,
  electric:    0.053,   // UK grid average
  motorcycle:  0.114,
  bus:         0.089,   // local bus per passenger-km
  train:       0.035,   // national rail per passenger-km
  tube:        0.028,   // metro / subway
  walking:     0,
  cycling:     0,
};

/** kg CO₂e per meal/serving by diet type */
export const FOOD = {
  // Meals
  beef:         6.61,   // per 100g serving equivalent meal
  lamb:         5.84,
  pork:         1.72,
  chicken:      1.02,
  fish:         1.34,
  eggs:         0.53,
  dairy_milk:   0.63,   // per 200ml glass
  cheese:       2.45,   // per 50g portion
  // Full meals by diet profile
  meal_heavy_meat:   3.8,
  meal_medium_meat:  2.5,
  meal_chicken_fish: 1.6,
  meal_vegetarian:   0.9,
  meal_vegan:        0.5,
  // Snacks
  coffee:       0.28,   // per cup (with milk)
  chocolate:    0.30,   // per 30g bar
};

/** kg CO₂e per kWh by country (IEA 2023) */
export const GRID_INTENSITY = {
  global:  0.490,
  us:      0.386,
  uk:      0.233,
  eu:      0.275,
  india:   0.708,
  china:   0.581,
  aus:     0.610,
  canada:  0.150,
  france:  0.085,  // heavy nuclear
  norway:  0.029,  // hydro-dominant
  germany: 0.350,
};

/** kg CO₂e per item/unit for shopping */
export const SHOPPING = {
  clothing_tshirt:    7.0,
  clothing_jeans:    32.0,
  clothing_jacket:   50.0,
  electronics_phone: 70.0,
  electronics_laptop:300.0,
  furniture_chair:   60.0,
  book:               1.0,
  online_delivery:    0.5,  // per parcel (extra vs store)
};

/** kg CO₂e per km per passenger for aviation */
export const AVIATION = {
  economy_shorthaul:  0.255,  // <3 hours
  economy_longhaul:   0.195,  // >3 hours (more efficient per km)
  business_shorthaul: 0.510,  // 2× multiplier
  business_longhaul:  0.585,  // 3× multiplier
  radiative_forcing_multiplier: 1.9,  // IPCC best estimate
};

/** Average weekly emissions (kg CO₂e) for a global average person */
export const BENCHMARKS = {
  global_weekly:  96.15,  // ~5 tonnes/year ÷ 52
  uk_weekly:      192.3,  // ~10 tonnes/year
  us_weekly:      288.5,  // ~15 tonnes/year
  india_weekly:   38.5,   // ~2 tonnes/year
  eu_weekly:      134.6,  // ~7 tonnes/year
};
