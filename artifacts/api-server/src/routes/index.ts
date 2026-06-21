import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaignRouter from "./campaign";
import gistRouter from "./gist";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/campaign", campaignRouter);
router.use("/gist", gistRouter);
router.use("/settings", settingsRouter);

export default router;
