require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const pantryRoutes = require('./routes/pantry');
const recipesRoutes = require('./routes/recipes');
const billingRoutes = require('./routes/billing');
const webhookRoutes = require('./routes/webhook');
const receiptsRoutes = require('./routes/receipts');
const plannerRoutes = require('./routes/planner');
const shoppingRoutes = require('./routes/shopping');
const householdRoutes = require('./routes/household');
const jobsRoutes = require('./routes/jobs');
const { initRealtime } = require('./utils/realtime');

const app = express();
const server = http.createServer(app);
initRealtime(server);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

app.use('/api/billing/webhook', webhookRoutes);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/jobs', jobsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
