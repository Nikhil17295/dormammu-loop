import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { app } from "./api/app";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Dormammu Loop API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
