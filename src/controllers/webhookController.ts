import { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../config/firebase";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../config/config";

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing Stripe Secret Key');
}


const stripe = new Stripe(STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = STRIPE_WEBHOOK_SECRET as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error: any) {
            console.error("Webhook signature verification failed.", error.message);
            return res.status(400).send(`Webhook Error: ${error.message}`);
        
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        try {
            // Add appointment to Firestore
            await db.collection('appointments').add({
                ...metadata,
                paymentStatus: 'paid',
                paymentId: session.payment_intent,
                amount: session.amount_total,
                currency: session.currency,
                createdAt: new Date()
        });

            // Add payment record to Firestore
            await db.collection("billings").add({
                userId: metadata.userID,
                paymentId: session.payment_intent,
                amount: session.amount_total,
                currency: session.currency,
                therapyType: metadata.therapyType,
                paymentStatus: "completed",
                createdAt: new Date(),
            });

            // console.log("Appointment booked for:", metadata.userID);
        } catch (error) {
            console.error("Error saving appointment:", error);
    }
}
    res.status(200).json({ received: true });
}
