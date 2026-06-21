import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaignRouter from "./campaign";
import gistRouter from "./gist";
import mediaRouter from "./media";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/campaign", campaignRouter);
router.use("/gist", gistRouter);
router.use("/media", mediaRouter);
router.use("/settings", settingsRouter);

export default router;
