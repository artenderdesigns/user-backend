import { NewUser } from "../controllers/NewUser.js";
import express from "express";

const router = express.Router();

router.post("/newUser", NewUser);
router.get("/projects", NewUser);

export default router;
