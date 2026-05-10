const mongoose = require('mongoose');

let cachedConnection = null;

function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!isDatabaseConfigured()) {
    return null;
  }

  cachedConnection = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  return cachedConnection;
}

module.exports = {
  connectToDatabase,
  isDatabaseConfigured,
};
