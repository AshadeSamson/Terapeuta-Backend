import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import paymentGateway from './routes/paymentRoute';


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/tp/payments', paymentGateway);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;