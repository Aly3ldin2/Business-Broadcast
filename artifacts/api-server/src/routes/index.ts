import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import listsRouter from "./lists";
import templatesRouter from "./templates";
import broadcastsRouter from "./broadcasts";
import settingsRouter from "./settings";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/contacts", contactsRouter);
router.use("/lists", listsRouter);
router.use("/templates", templatesRouter);
router.use("/broadcasts", broadcastsRouter);
router.use("/settings", settingsRouter);
router.use("/stats", statsRouter);

export default router;
