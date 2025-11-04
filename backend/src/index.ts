import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EasyBet API running on http://0.0.0.0:${PORT}`);
});
