// utils/config.js
"use strict"
import logger from "./components/logger";
import { imageProcessor } from "./components/processor";


const config = {
    env: process.env.NODE_ENV,
};

export { config, logger, imageProcessor };

