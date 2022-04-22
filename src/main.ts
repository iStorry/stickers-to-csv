// src/main.ts
"usr strict";

import "dotenv/config";
import { logger } from "./utils/config";
import express from "express";
import routes from "./routes/index";

import fileUpload from "express-fileupload";

const application: express.Express = express();
application.use(express.json());
application.use(express.urlencoded({ extended: true }));
application.use(fileUpload());
application.use("/", routes);
application.set("view engine", "pug");
application.set("views", __dirname + "/views");
application.listen(process.env.PORT || 9000, () => logger.info(`Server started on port ${process.env.PORT}`));
