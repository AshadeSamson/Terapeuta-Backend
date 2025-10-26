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

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        try {
            // Add appointment to Firestore
            const appointmentRef = await db.collection('appointments').add({
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
                appointmentId: appointmentRef.id,
                paymentId: session.payment_intent,
                amount: session.amount_total,
                currency: session.currency,
                therapyType: metadata.therapyType,
                paymentStatus: "completed",
                createdAt: new Date(),
            });

            
            console.log('appointment booked with ID:', appointmentRef.id);

            // console.log("Appointment booked for:", metadata.userID);
        } catch (error) {
            console.error("Error saving appointment:", error);
    }
}

  // Handle failed or cancelled payments
    else if (
        event.type === "payment_intent.payment_failed" ||
        event.type === "checkout.session.async_payment_failed" ||
        event.type === "checkout.session.expired"
    ) {
    const sessionOrIntent = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;

    try {
      let metadata: any = {};
      let paymentId: string | undefined;
      let amount: number | undefined | null;
      let currency: string | undefined | null;

      // For checkout.session.* events
      if ("metadata" in sessionOrIntent) {
        metadata = sessionOrIntent.metadata || {};
        paymentId =
          (sessionOrIntent as Stripe.Checkout.Session).payment_intent?.toString() ||
          sessionOrIntent.id;
        amount = (sessionOrIntent as Stripe.Checkout.Session).amount_total;
        currency = (sessionOrIntent as Stripe.Checkout.Session).currency;
      }

      // For payment_intent.payment_failed event
      if ("id" in sessionOrIntent && sessionOrIntent.object === "payment_intent") {
        paymentId = sessionOrIntent.id;
        amount = sessionOrIntent.amount;
        currency = sessionOrIntent.currency;
        metadata = sessionOrIntent.metadata || {};
      }


      await db.collection("billings").add({
        userId: metadata.userID || "unknown_user",
        paymentId,
        amount,
        currency,
        therapyType: metadata.therapyType || "unknown",
        paymentStatus: "failed",
        failureReason:
          "last_payment_error" in sessionOrIntent
            ? sessionOrIntent.last_payment_error?.message || "Unknown error"
            : "Payment cancelled or expired",
        createdAt: new Date(),
      });

    //   console.log(`Failed payment recorded for user: ${metadata.userID}`);
    } catch (error) {
      console.error("Error saving failed billing:", error);
    }
}

    res.status(200).json({ received: true });
}
