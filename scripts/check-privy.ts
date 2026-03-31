import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
console.log("PRIVY_APP_ID:", process.env.NEXT_PUBLIC_PRIVY_APP_ID || "(unset)");
console.log("KILO_API_KEY prefix:", process.env.KILO_API_KEY?.substring(0, 10) || "(unset)");
