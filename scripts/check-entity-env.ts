import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
console.log("COMPOSIO_ENTITY_ID:", process.env.COMPOSIO_ENTITY_ID || "(unset)");
