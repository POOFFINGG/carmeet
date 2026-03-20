import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import eventsRouter from "./events";
import applicationsRouter from "./applications";
import carsRouter from "./cars";
import clubsRouter from "./clubs";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(eventsRouter);
router.use(applicationsRouter);
router.use(carsRouter);
router.use(clubsRouter);
router.use(notificationsRouter);

export default router;
