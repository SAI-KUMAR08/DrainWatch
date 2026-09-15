import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import publicRouter from "./public";
import citizenRouter from "./citizen";
import officerRouter from "./officer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicRouter);
router.use(citizenRouter);
router.use(officerRouter);

export default router;
