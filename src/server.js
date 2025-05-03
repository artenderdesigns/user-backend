import express from "express";
import connectDB from "./db/db.js";
import dotenv from "dotenv";
import UserRouter from "./routes/UserRouter.js";
import ProjectRouter from "./routes/ProjectRouter.js"
import cors from "cors";
dotenv.config();

const PORT = 3000;

const app = express();

// CORS setup should come before other middleware or routes
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "https://artender-studio.netlify.app", "http://theartender.com"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allows cookies to be sent
  })
);

app.use(express.json()); // Body parser middleware
app.use("/api/user", UserRouter);
app.use("/api/project", ProjectRouter);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is listening at PORT: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
