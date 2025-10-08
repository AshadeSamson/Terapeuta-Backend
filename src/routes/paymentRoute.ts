import express from "express";
import { createPayment } from "../controllers/paymentController";

const router = express.Router();

router.post('/create-payment-session', createPayment);

export default router