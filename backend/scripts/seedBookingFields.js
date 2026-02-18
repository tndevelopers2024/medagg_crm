// scripts/seedBookingFields.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const BookingFieldConfig = require("../models/BookingFieldConfig");

const opFields = [
    {
        bookingType: "OP",
        fieldName: "date",
        displayLabel: "Date",
        fieldType: "date",
        isRequired: true,
        isActive: true,
        order: 0,
        placeholder: "Select date",
    },
    {
        bookingType: "OP",
        fieldName: "time",
        displayLabel: "Time",
        fieldType: "time",
        isRequired: false,
        isActive: true,
        order: 1,
        placeholder: "HH:MM",
    },
    {
        bookingType: "OP",
        fieldName: "hospital",
        displayLabel: "Hospital",
        fieldType: "dropdown",
        isRequired: true,
        isActive: true,
        order: 2,
        options: ["Apollo Hospital", "Fortis Hospital", "Max Hospital", "AIIMS", "Other"],
        placeholder: "Select hospital",
    },
    {
        bookingType: "OP",
        fieldName: "doctor",
        displayLabel: "Doctor",
        fieldType: "text",
        isRequired: true,
        isActive: true,
        order: 3,
        placeholder: "Doctor name",
    },
    {
        bookingType: "OP",
        fieldName: "surgery",
        displayLabel: "Surgery/Procedure",
        fieldType: "dropdown",
        isRequired: false,
        isActive: true,
        order: 4,
        options: [
            "Consultation",
            "Cataract Surgery",
            "Knee Replacement",
            "Hip Replacement",
            "Cardiac Surgery",
            "General Checkup",
            "Other",
        ],
        placeholder: "Select procedure",
    },
    {
        bookingType: "OP",
        fieldName: "payment",
        displayLabel: "Payment",
        fieldType: "number",
        isRequired: false,
        isActive: true,
        order: 5,
        placeholder: "Amount in ₹",
        validation: { min: 0 },
    },
    {
        bookingType: "OP",
        fieldName: "remarks",
        displayLabel: "Remarks",
        fieldType: "textarea",
        isRequired: false,
        isActive: true,
        order: 6,
        placeholder: "Additional notes",
    },
    {
        bookingType: "OP",
        fieldName: "done_date",
        displayLabel: "Done Date",
        fieldType: "date",
        isRequired: false,
        isActive: true,
        order: 7,
        placeholder: "Completion date",
    },
];

const ipFields = [
    {
        bookingType: "IP",
        fieldName: "date",
        displayLabel: "Date",
        fieldType: "date",
        isRequired: true,
        isActive: true,
        order: 0,
        placeholder: "Select date",
    },
    {
        bookingType: "IP",
        fieldName: "time",
        displayLabel: "Time",
        fieldType: "time",
        isRequired: false,
        isActive: true,
        order: 1,
        placeholder: "HH:MM",
    },
    {
        bookingType: "IP",
        fieldName: "hospital",
        displayLabel: "Hospital",
        fieldType: "dropdown",
        isRequired: true,
        isActive: true,
        order: 2,
        options: ["Apollo Hospital", "Fortis Hospital", "Max Hospital", "AIIMS", "Other"],
        placeholder: "Select hospital",
    },
    {
        bookingType: "IP",
        fieldName: "doctor",
        displayLabel: "Doctor",
        fieldType: "text",
        isRequired: true,
        isActive: true,
        order: 3,
        placeholder: "Doctor name",
    },
    {
        bookingType: "IP",
        fieldName: "case_type",
        displayLabel: "Case Type",
        fieldType: "dropdown",
        isRequired: false,
        isActive: true,
        order: 4,
        options: [
            "Emergency",
            "Elective Surgery",
            "ICU Admission",
            "Post-operative Care",
            "Observation",
            "Other",
        ],
        placeholder: "Select case type",
    },
    {
        bookingType: "IP",
        fieldName: "payment",
        displayLabel: "Payment",
        fieldType: "number",
        isRequired: false,
        isActive: true,
        order: 5,
        placeholder: "Amount in ₹",
        validation: { min: 0 },
    },
    {
        bookingType: "IP",
        fieldName: "remarks",
        displayLabel: "Remarks",
        fieldType: "textarea",
        isRequired: false,
        isActive: true,
        order: 6,
        placeholder: "Additional notes",
    },
    {
        bookingType: "IP",
        fieldName: "done_date",
        displayLabel: "Done Date",
        fieldType: "date",
        isRequired: false,
        isActive: true,
        order: 7,
        placeholder: "Completion date",
    },
];

const diagnosticFields = [
    {
        bookingType: "DIAGNOSTIC",
        fieldName: "date",
        displayLabel: "Date",
        fieldType: "date",
        isRequired: true,
        isActive: true,
        order: 0,
        placeholder: "Select date",
    },
    {
        bookingType: "DIAGNOSTIC",
        fieldName: "time",
        displayLabel: "Time",
        fieldType: "time",
        isRequired: false,
        isActive: true,
        order: 1,
        placeholder: "HH:MM",
    },
    {
        bookingType: "DIAGNOSTIC",
        fieldName: "hospital",
        displayLabel: "Diagnostic Center",
        fieldType: "dropdown",
        isRequired: true,
        isActive: true,
        order: 2,
        options: ["Healthians", "Dr Lal PathLabs", "Metropolis", "SRL", "Other"],
        placeholder: "Select center",
    },
    {
        bookingType: "DIAGNOSTIC",
        fieldName: "test_name",
        displayLabel: "Test Name",
        fieldType: "text",
        isRequired: true,
        isActive: true,
        order: 3,
        placeholder: "Enter test name",
    },
    {
        bookingType: "DIAGNOSTIC",
        fieldName: "payment",
        displayLabel: "Payment",
        fieldType: "number",
        isRequired: false,
        isActive: true,
        order: 4,
        placeholder: "Amount in ₹",
        validation: { min: 0 },
    },
    {
        bookingType: "DIAGNOSTIC",
        fieldName: "remarks",
        displayLabel: "Remarks",
        fieldType: "textarea",
        isRequired: false,
        isActive: true,
        order: 5,
        placeholder: "Additional notes",
    },
];

async function seedBookingFields() {
    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");

        // Clear existing fields
        console.log("🗑️ Clearing existing booking fields...");
        await BookingFieldConfig.deleteMany({});
        console.log("✅ Collection cleared");

        // Seed OP fields
        console.log("\n📋 Seeding OP Booking Fields...");
        for (const field of opFields) {
            await BookingFieldConfig.create(field);
            console.log(`✅ Created OP field: ${field.displayLabel}`);
        }

        // Seed IP fields
        console.log("\n📋 Seeding IP Booking Fields...");
        for (const field of ipFields) {
            await BookingFieldConfig.create(field);
            console.log(`✅ Created IP field: ${field.displayLabel}`);
        }

        // Seed Diagnostic fields
        console.log("\n📋 Seeding Diagnostic Booking Fields...");
        for (const field of diagnosticFields) {
            await BookingFieldConfig.create(field);
            console.log(`✅ Created Diagnostic field: ${field.displayLabel}`);
        }

        console.log("\n🎉 Booking fields seed completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
}

seedBookingFields();
