require('dotenv').config();
const { connectRedis } = require('./services/queue');
const { initDb } = require('./db');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

// Start Server
const startServer = async () => {
  try {
    await connectRedis();
    await initDb();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
