const mongoose = require("mongoose");
const path = require("path");
const xlsx = require("xlsx");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const WaTemplate = require("../models/WaTemplate");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined.");
    process.exit(1);
}

const seedTemplates = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB Connected");

        const filePath = path.join(__dirname, "../Medagg Ventures-WHATSAPP_TEMPLATE.xlsx");
        console.log(`Loading Excel file from ${filePath}`);

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} templates in Excel.`);

        let added = 0;
        let updated = 0;

        for (const row of data) {
            if (!row.shortcut || !row.body) continue;

            const name = row.shortcut.trim();
            const body = row.body.trim();

            const existing = await WaTemplate.findOne({ name, isGlobal: true });
            if (existing) {
                existing.body = body;
                await existing.save();
                updated++;
                console.log(`Updated template: ${name}`);
            } else {
                await WaTemplate.create({
                    name,
                    body,
                    isGlobal: true,
                    userId: null,
                });
                added++;
                console.log(`Added template: ${name}`);
            }
        }

        console.log(`\n🎉 Seeding complete! Added: ${added}, Updated: ${updated}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding templates:", error);
        process.exit(1);
    }
};

seedTemplates();
