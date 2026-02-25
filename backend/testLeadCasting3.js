const mongoose = require('mongoose');

// Could the error be from fieldData storing a Date when it's supposed to be String[]?
// Actually Mongoose wouldn't throw "at path createdTime" for fieldData.
// Path "createdTime" means the root createdTime property.

// What if createdTime isn't mapped at all? 
// In importController, createdTime initializes to `null`.
// Then, `createdTime: (createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date()`
// Wait! If `createdTime = null`, `createdTime instanceof Date` is FALSE.
// So `new Date()` is evaluated! But `new Date()` generates a VALID Date representing NOW.
// Can `new Date()` ever generate an Invalid Date? Only if the system clock or time environment is extremely corrupted.

// What if the user is mapping some random text column to `createdTime` but it's not the `core | createdTime` dropdown?
// Is there another way?
console.log("no script needed");
