// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import kakaoRoutes from './routes/kakaoRoutes';
import connectDB from './config/db';
import authRoutes from './routes/apiRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/kakao', kakaoRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (_, res) => {
  res.send('Smart HomeCare Backend is running');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});

