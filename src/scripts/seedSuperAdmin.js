const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Import models
const User = require("../models/User");
const Store = require("../models/Store");
const AuditLog = require("../models/AuditLog");

async function seedSuperAdmin() {
  try {
    // Connect to MongoDB
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ Connected to MongoDB");
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      email: "musamohammedshehu7@gmail.com",
    });

    if (existingSuperAdmin) {
      console.log("⚠️ Super admin already exists. Updating password...");

      // Update password
    //   const salt = await bcrypt.genSalt(12);
    //   const hashedPassword = await bcrypt.hash("Musa@1234", salt);

      existingSuperAdmin.password = "Musa@1234";
      existingSuperAdmin.isActive = true;
      existingSuperAdmin.role = "WAREHOUSE_STAFF";
      await existingSuperAdmin.save();

      console.log("✅ Super admin password updated successfully");
      console.log("📧 Email: musamohammedshehu1@gmail.com");
      console.log("🔑 Password: Musa@1234");

      await mongoose.disconnect();
      return;
    }

    // Check if any store exists
    let store = await Store.findOne();

    // If no store exists, create a default store
    if (!store) {
      console.log("📦 No store found. Creating default store...");
      store = new Store({
        name: "Main Store",
        code: "MAIN",
        address: {
          street: "123 Main Street",
          city: "New York",
          state: "NY",
          country: "USA",
          zipCode: "10001",
        },
        phone: "+2348036109468",
        email: "main@store.com",
        taxRate: 8.875,
        currency: "USD",
        timezone: "UTC",
        receiptFooter: "Thank you for shopping with us!",
        isActive: true,
      });
      await store.save();
      console.log("✅ Default store created");
    }

    // Create super admin user
    // const salt = await bcrypt.genSalt(12);
    // const hashedPassword = await bcrypt.hash("Musa@1234", salt);

    const superAdmin = new User({
      firstName: "Musa",
      lastName: "Mohammed",
      email: "musamohammedshehu7@gmail.com",
      password: "Musa@1234",
      phone: "+1-555-000-0000",
      role: "WAREHOUSE_STAFF",
      storeId: store._id,
      permissions: [
        // "transaction:create",
        // "transaction:read:own",
        // "transaction:read:all",
        // "transaction:update",
        // "transaction:delete",
        // "payment:process",
        // "payment:refund",
        "inventory:read",
        // "inventory:adjust",
        "inventory:release",
        // "user:create",
        // "user:update",
        // "audit:read",
        // "report:generate",
        // "store:manage",
      ],
      isActive: true,
      twoFactorEnabled: false,
      lastLogin: null,
      refreshToken: null,
    });

    await superAdmin.save();
    console.log("✅ Super admin created successfully");

    // Create audit log for super admin creation
    await AuditLog.create({
      actorId: superAdmin._id,
      actorRole: "SUPER_ADMIN",
      action: "CREATE",
      resourceType: "User",
      resourceId: superAdmin._id,
      storeId: store._id,
      details: {
        after: {
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          email: superAdmin.email,
          role: superAdmin.role,
        },
        metadata: {
          ipAddress: "127.0.0.1",
          userAgent: "Seed Script",
          action: "Super admin created via seed script",
        },
      },
      severity: "CRITICAL",
      tamperProofHash: "seed-script-" + Date.now(),
    });
    console.log("✅ Audit log created");

    console.log("\n📋 Super Admin Credentials:");
    console.log("📧 Email: musamohammedshehu@gmail.com");
    console.log("🔑 Password: Musa@1234");
    console.log("🏪 Store: " + store.name);
    console.log("🆔 Store Code: " + store.code);
    console.log("\n⚠️  Please change the password after first login!");

    await mongoose.disconnect();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding super admin:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin();
