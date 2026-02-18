const { State, City } = require("country-state-city");

// Common aliases for Indian cities to help the lookup
const ALIASES = {
    "bangalore": "bengaluru",
    "bombay": "mumbai",
    "calcutta": "kolkata",
    "madras": "chennai",
    "pondicherry": "puducherry",
    "trivandrum": "thiruvananthapuram",
    "cochin": "kochi",
    "calicut": "kozhikode",
    "mysore": "mysure",
    "mangalore": "mangaluru",
    "belgaum": "belagavi",
    "gurgaon": "gurugram",
};

/**
 * Get state name from city name using country-state-city package.
 * Optimized for Indian cities with support for aliases and fuzzy matching.
 * @param {string} city - The city name
 * @returns {string|null} - The state name or null if not found
 */
const getStateFromCity = (cityName) => {
    if (!cityName) return null;
    let normalizedCity = String(cityName).trim().toLowerCase();

    // Check aliases first
    if (ALIASES[normalizedCity]) {
        normalizedCity = ALIASES[normalizedCity];
    }

    // Fetch all cities in India (Country code 'IN')
    const cities = City.getCitiesOfCountry("IN");

    // 1. Try exact match
    let foundCity = cities.find(c => c.name.toLowerCase() === normalizedCity);

    // 2. Try 'starts with' / 'includes' match if no exact match
    if (!foundCity) {
        foundCity = cities.find(c => c.name.toLowerCase().includes(normalizedCity));
    }

    if (foundCity && foundCity.stateCode) {
        const state = State.getStateByCodeAndCountry(foundCity.stateCode, "IN");
        return state ? state.name : null;
    }

    return null;
};

module.exports = {
    getStateFromCity
};
