const mongoose = require('mongoose');

// The hypothesis:
// Users map a blank CSV column to `createdTime` through the core field mapping,
// OR they don't map it to `createdTime`.
// If `parseDate("")` returns `null`
// createdTime becomes `null`
// Then it evaluates: `(null instanceof Date && !isNaN(null))` which is FALSE.
// Then it sets `createdTime: new Date()`.
// This is VALID.

// Wait. Is it possible `createdTime` is set from `fieldData`? No, `fieldData` is an array.
// What if `new Date()` is what throws Invalid Date? No.

// Look back at lines 266-267 of importController.js
/*
          doc = await Lead.create({
            leadId: makeLeadId("import"),
            createdTime: (createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date(),
*/
// Wait, when I replaced lines in importController.js, did I accidentally remove `createdTime` from Lead.create?
// NO, my replacement code clearly shows:
/*
          doc = await Lead.create({
            leadId: makeLeadId("import"),
            createdTime: (createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date(),
*/
console.log("Hypothesis 2: Is createdTime being modified somewhere else?");
