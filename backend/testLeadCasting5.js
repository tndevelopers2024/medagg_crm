const mongoose = require('mongoose');

// Another angle: the user's screenshot shows an error on rows 2, 3, 4, 5, 6.
// What if `row` doesn't have a value for `createdTime` and the user mapped it, so it's `undefined`?
// `parseDate(undefined)` => `raw == null`, returns `null`.
// Then `createdTime` is `null`. Then `(createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date()` creates a valid date.

// Is there ANY possible way `(createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date()` returns an Invalid Date?
// ONLY if `createdTime` IS an Invalid Date AND `isNaN(createdTime)` is FALSE.
// Is `isNaN(new Date("invalid"))` ever false?
const d = new Date("invalid");
console.log(isNaN(d)); // true

// Wait, the error is `Cast to date failed for value "Invalid Date" (type Date)`.
// This ONLY happens when Mongoose is given `new Date("invalid")`.
// Oh!
// In Mongoose, if you do: new Lead({ createdTime: "invalid" }), Mongoose's internal caster tries to turn "invalid" into a Date via `new Date("invalid")`.
// Then Mongoose says: "Cast to date failed for value "invalid" (type string)".
// BUT the error says: `for value "Invalid Date" (type Date)`.
// That means we STRICTLY PASSED `new Date("invalid")` TO MONGOOSE!
// HOW did we pass `new Date("invalid")` to Mongoose?!

// Wait! Look at lines 20-30 in importController: 
// parseDate function returns `sanitize(dt)`.
// sanitize does: `if (isNaN(dt)) throw new Error...`
// Is it possible `isNaN` is NOT returning true for an Invalid Date?!
// In node, `isNaN(new Date("invalid"))` is true. `Number.isNaN(d)` is FALSE. `isNaN(d.getTime())` is true.
console.log("isNaN(new Date('invalid')) =", isNaN(new Date("invalid")));
