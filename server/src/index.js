import { createApp } from "./app.js";
import "dotenv/config";

const app = createApp();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Donation Portal API listening on port ${port}`);
});
