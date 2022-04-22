import express from "express";
import { home, uploader } from "./home/home";
const router = express.Router();
router.get('/', home);
router.post('/upload', uploader)
export default router;