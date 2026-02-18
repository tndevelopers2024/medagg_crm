// scripts/seedLeadFields.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const LeadFieldConfig = require("../models/LeadFieldConfig");

const defaultFields = [
    // Primary Fields
    {
        fieldName: "full_name",
        displayLabel: "Name",
        fieldType: "text",
        isPrimary: true,
        isRequired: true,
        isActive: true,
        order: 0,
        icon: "user",
        placeholder: "Enter full name",
    },
    {
        fieldName: "phone_number",
        displayLabel: "Phone",
        fieldType: "phone",
        isPrimary: true,
        isRequired: true,
        isActive: true,
        order: 1,
        icon: "phone",
        placeholder: "+91 9999999999",
        validation: {
            pattern: "^[0-9]{7,15}$",
            minLength: 7,
            maxLength: 15,
        },
    },
    // Other Fields
    {
        fieldName: "email",
        displayLabel: "Email",
        fieldType: "email",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 2,
        icon: "mail",
        placeholder: "email@example.com",
    },
    {
        fieldName: "lead_source",
        displayLabel: "Lead Source",
        fieldType: "dropdown",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 3,
        icon: "trending-up",
        options: ["Website", "Facebook", "Google Ads", "Instagram", "Referral", "Walk-in", "Other"],
        defaultValue: "Website",
    },
    {
        fieldName: "department",
        displayLabel: "Department",
        fieldType: "dropdown",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 4,
        icon: "briefcase",
        options: ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General", "Other"],
    },
    {
        fieldName: "procedure",
        displayLabel: "PROCEDURE",
        fieldType: "dropdown",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 5,
        icon: "clipboard",
        options: ["Consultation", "Surgery", "Checkup", "Follow-up", "Emergency", "Other"],
    },
    {
        fieldName: "call_later_date",
        displayLabel: "Call Later Date",
        fieldType: "date",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 6,
        icon: "calendar",
    },
    {
        fieldName: "location",
        displayLabel: "Location",
        fieldType: "text",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 7,
        icon: "map-pin",
        placeholder: "City, State",
    },
    {
        fieldName: "states",
        displayLabel: "STATES",
        fieldType: "dropdown",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 8,
        icon: "map",
        options: [
            "Andhra Pradesh",
            "Arunachal Pradesh",
            "Assam",
            "Bihar",
            "Chhattisgarh",
            "Goa",
            "Gujarat",
            "Haryana",
            "Himachal Pradesh",
            "Jharkhand",
            "Karnataka",
            "Kerala",
            "Madhya Pradesh",
            "Maharashtra",
            "Manipur",
            "Meghalaya",
            "Mizoram",
            "Nagaland",
            "Odisha",
            "Punjab",
            "Rajasthan",
            "Sikkim",
            "Tamil Nadu",
            "Telangana",
            "Tripura",
            "Uttar Pradesh",
            "Uttarakhand",
            "West Bengal",
            "Delhi",
            "Chandigarh",
            "Other",
        ],
    },
    {
        fieldName: "whatsapp_number",
        displayLabel: "Whatsapp Number",
        fieldType: "phone",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 9,
        icon: "message-circle",
        placeholder: "+91 9999999999",
    },
    {
        fieldName: "age",
        displayLabel: "Age",
        fieldType: "number",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 10,
        icon: "hash",
        placeholder: "Enter age",
        validation: {
            min: 0,
            max: 150,
        },
    },
    {
        fieldName: "gender",
        displayLabel: "Gender",
        fieldType: "dropdown",
        isPrimary: false,
        isRequired: false,
        isActive: true,
        order: 11,
        icon: "users",
        options: ["Male", "Female", "Other"],
    },
];

async function seedFields() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // Clear existing fields (optional - comment out if you want to keep existing)
        // await LeadFieldConfig.deleteMany({});
        // console.log("🗑️  Cleared existing field configs");

        // Insert default fields (skip if already exists)
        for (const field of defaultFields) {
            const existing = await LeadFieldConfig.findOne({ fieldName: field.fieldName });
            if (!existing) {
                await LeadFieldConfig.create(field);
                console.log(`✅ Created field: ${field.displayLabel}`);
            } else {
                console.log(`⏭️  Skipped existing field: ${field.displayLabel}`);
            }
        }

        console.log("\n🎉 Seed completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

seedFields();
