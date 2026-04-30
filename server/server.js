import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import buildingsRouter from './routes/buildings.js';
import flatsRouter from './routes/flats.js';
import tenantsRouter from './routes/tenants.js';
import rentRouter from './routes/rent.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/buildings', buildingsRouter);
app.use('/api/flats', flatsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/rent', rentRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) =>
    res.sendFile(path.join(clientBuild, 'index.html'))
  );
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tenant-management';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
