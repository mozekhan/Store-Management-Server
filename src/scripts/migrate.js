const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Example migration: Add indexes
    const collections = ['users', 'products', 'transactions', 'inventories', 'auditlogs'];
    
    for (const collection of collections) {
      console.log(`Migrating ${collection}...`);
      
      const model = mongoose.model(collection, new mongoose.Schema({}, { strict: false }));
      
      // Add indexes
      switch (collection) {
        case 'users':
          await model.collection.createIndex({ email: 1 }, { unique: true });
          await model.collection.createIndex({ storeId: 1 });
          await model.collection.createIndex({ role: 1 });
          break;
        case 'products':
          await model.collection.createIndex({ sku: 1 }, { unique: true });
          await model.collection.createIndex({ storeId: 1 });
          await model.collection.createIndex({ category: 1 });
          break;
        case 'transactions':
          await model.collection.createIndex({ transactionNumber: 1 }, { unique: true });
          await model.collection.createIndex({ storeId: 1 });
          await model.collection.createIndex({ status: 1 });
          await model.collection.createIndex({ createdAt: -1 });
          break;
        case 'inventories':
          await model.collection.createIndex({ productId: 1, storeId: 1 }, { unique: true });
          break;
        case 'auditlogs':
          await model.collection.createIndex({ timestamp: -1 });
          await model.collection.createIndex({ actorId: 1 });
          await model.collection.createIndex({ resourceId: 1, resourceType: 1 });
          break;
      }
      
      console.log(`✅ ${collection} migration complete`);
    }

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();