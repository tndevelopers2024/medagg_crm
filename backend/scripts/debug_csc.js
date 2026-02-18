const { City, State } = require("country-state-city");

const cities = City.getCitiesOfCountry("IN");
console.log("Total cities in India:", cities.length);

const query = "Bangalore";
const matches = cities.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
console.log(`Matches for "${query}":`, JSON.stringify(matches, null, 2));

const query2 = "Bengaluru";
const matches2 = cities.filter(c => c.name.toLowerCase().includes(query2.toLowerCase()));
console.log(`Matches for "${query2}":`, JSON.stringify(matches2, null, 2));

const query3 = "Chennai";
const matches3 = cities.filter(c => c.name.toLowerCase().includes(query3.toLowerCase()));
console.log(`Matches for "${query3}":`, JSON.stringify(matches3, null, 2));
