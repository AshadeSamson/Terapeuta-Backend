import { configDotenv } from "dotenv";
configDotenv();

export const { 
    FIREBASE_PROJECT_ID, 
    FIREBASE_CLIENT_EMAIL, 
    FIREBASE_PRIVATE_KEY,
    STRIPE_SECRET_KEY,
    CLIENT_URL,
    PORT,
} = process.env;