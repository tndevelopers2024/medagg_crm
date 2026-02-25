const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const TestSchema = new Schema({ createdTime: Date });
const TestModel = mongoose.model('TestDateBounds', TestSchema);

async function run() {
  try {
    let dt = new Date(100000, 1, 1);
    console.log("dt string:", dt.toString());
    const doc = new TestModel({ createdTime: dt });
    const err = doc.validateSync();
    console.log("Error:", err ? err.message : "None");
    process.exit(0);
  } catch (e) {
    console.error(e);
  }
}
run();
