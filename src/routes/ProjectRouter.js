import express from "express";
import fetchProjects from "../controllers/FetchProjects.js";

const router = express.Router();

router.get("/projects", fetchProjects);

export default router;
