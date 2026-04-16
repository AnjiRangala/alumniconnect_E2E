const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb+cluster0.iizczy.mongodb.net/alumniconnect?retryWrites=true&w=majority';
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema, 'events');

async function clearEvents() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const result = await Event.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} events`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

clearEvents();
