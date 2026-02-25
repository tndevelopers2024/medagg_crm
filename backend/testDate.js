const mongoose = require('mongoose');
const { Schema } = mongoose;

const s = new Schema({ createdTime: Date });
const M = mongoose.model('TestDate', s);

async function run() {
  try {
    const d = new Date();
    console.log("valid isNaN:", isNaN(d));
    const inv = new Date("foo");
    console.log("invalid isNaN:", isNaN(inv));
    
    // Test the logic from the controller
    let createdTime = inv;
    let finalDate = (createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date();
    
    console.log("finalDate:", finalDate);
    
    // Now try pushing it to model
    const doc = new M({ createdTime: finalDate });
    const err = doc.validateSync();
    if(err) console.log("ERROR:", err.message);
    else console.log("SUCCESS");
  } catch(e) {
    console.log("Crash:", e.message);
  }
}
run();
