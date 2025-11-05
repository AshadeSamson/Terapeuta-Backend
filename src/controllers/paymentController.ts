import { Request, Response } from "express";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY, CLIENT_URL } from "../config/config";


if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe Secret Key');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);


export const createPayment = async (req: Request, res: Response) => {

    try {

        const { therapyType } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Payment for ${therapyType} virtual therapy session`,
                    },
                    unit_amount: 100 * 100,
                },
                quantity: 1,
               
            }],
            success_url: `${CLIENT_URL}/payment-successful`,
            cancel_url: `${CLIENT_URL}/payment-cancelled`,
            metadata: {
                ...req.body,
                timing: new Date().toISOString()
                }
        });

        return res.status(200).json({ url: session.url });

    } catch (error: Error | any) {
        res.status(500).json({
        error: true,
        message: 'Internal Server Error'
    });
    }

};