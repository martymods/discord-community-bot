const mongoose = require('mongoose');
const Property = require('../economy/propertyModel');

const MONGO_URI = 'mongodb+srv://martmods:FsTuWhnJnPsaY4VX@tiktikwordgamecluster.ymb4b.mongodb.net/tiktokgame?retryWrites=true&w=majority&appName=TikTikWordGameCluster';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixBusiness() {
  const id = 'downtown_prop6';
  const name = '📦 Corner Supply Co.';

  const result = await Property.updateOne(
    { id },
    { $set: { name } }
  );

  console.log(`✅ Updated ${id}:`, result.modifiedCount ? 'Success' : 'No Match Found');
  mongoose.connection.close();
}

fixBusiness();
