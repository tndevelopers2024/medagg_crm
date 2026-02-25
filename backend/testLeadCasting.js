const mongoose = require('mongoose');
const { Schema } = mongoose;

const s = new Schema({ createdTime: Date });
const M = mongoose.model('LeadMock', s);

async function run() {
  try {
    let createdTime;
    try { 
      // Emulate mapping when Date parse fails
      createdTime = new Date("foo"); 
    } catch (e) {
      createdTime = null;
    }
    
    // Check what the controller ultimately passes to the db
    let passedTime = (createdTime instanceof Date && !isNaN(createdTime)) ? createdTime : new Date();
    console.log("passedTime:", passedTime, "isNaN:", isNaN(passedTime));

    const doc = new M({ createdTime: passedTime });
    const err = doc.validateSync();
    if(err) console.log("ERROR:", err.message);
    else console.log("SUCCESS");
  } catch(e) {
    console.log("Crash:", e.message);
  }
}
run();
