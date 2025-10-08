import { Request, Response } from "express";
import { db } from "../config/firebase";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY, CLIENT_URL } from "../config/config";


if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe Secret Key');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);


export const createPayment = async (req: Request, res: Response) => {

    try {
        const { bookingDetails, userID } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Payment for ${bookingDetails.therapyType} virtual therapy session`,
                    },
                    unit_amount: 2000 * 100,
                },
                quantity: 1,
               
            }],
            success_url: `${CLIENT_URL}/payment-successful`,
            cancel_url: `${CLIENT_URL}/payment-cancelled`,
            metadata: {
                userID,
                ...bookingDetails,
            }
        });

        return res.status(200).json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: 'Unable to create payment session' });
    }

};