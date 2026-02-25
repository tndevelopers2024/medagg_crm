const mongoose = require('mongoose');

// The Exact Error says:
// Lead validation failed: createdTime: Cast to date failed for value "Invalid Date" (type Date) at path "createdTime"

const Schema = mongoose.Schema;
const TestSchema = new Schema({ createdTime: Date });
const M = mongoose.model('TestSchema', TestSchema);

async function run() {
  try {
    const doc1 = new M({ createdTime: null });
    console.log("null error:", doc1.validateSync()?.message || "none");

    const doc2 = new M({ createdTime: new Date("invalid") });
    console.log("invalid date error:", doc2.validateSync()?.message || "none");
    
    const doc3 = new M({ createdTime: "invalid" });
    console.log("invalid string error:", doc3.validateSync()?.message || "none");
  } catch(e) {
    console.log("Crash:", e.message);
  }
  process.exit(0);
}
run();
