const mongoose = require('mongoose');

// Wait! If parseDate fails with an error, the try/catch around parseDate
// throws an Error "Invalid Date in column ...".
// That Error falls through to the OUTER catch block which pushes to `errors` array.
// If the user is getting `Lead validation failed`, it means `Lead.create` is what is throwing!
// `Lead.create` only throws CastError if I pass it an invalid string OR an Invalid Date.

// Let's check `parseDate` behavior on an empty array or something weird?
// Excel date 100000 -> 2173. 
// sanitize(d) throws `Year 2173 is out of bounds (1970-2100) for value ...`.
// Again, if `parseDate` throws, the lead is skipped and `errors.push` happens.
// `Lead.create` is NEVER REACHED if `parseDate` throws!

// So why did `Lead.create` throw CastError?
// BECAUSE `createdTime` WAS NEVER MAPPED!
// If `createdTime` is never mapped, `createdTime` remains `null`.
// Then `(createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date()` creates a NEW valid Date!
// Is `new Date()` ever an Invalid Date?!
// Run this loop to test:
console.log(new Date('now we check if there are any other columns'));
