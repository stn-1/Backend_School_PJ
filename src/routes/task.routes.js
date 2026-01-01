import express from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  clearCompletedTasks,
} from "../controllers/task.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js"; // Giả định bạn có middleware này

import { validate } from "../middlewares/validate.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  taskIdSchema,
} from "../validators/task.validator.js";

import redisRateLimit from "../middlewares/redisRateLimit.js";

const router = express.Router();

router.use(verifyToken);

const taskWriteLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  keyPrefix: "rl:task-write",
});

const taskReadLimit = redisRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  keyPrefix: "rl:task-read",
});

const taskBulkLimit = redisRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  keyPrefix: "rl:task-bulk",
});

router.get("/", taskReadLimit, validate(taskQuerySchema, "query"), getTasks);
router.post(
  "/",
  taskWriteLimit,
  validate(createTaskSchema, "body"),
  createTask
);
router.delete("/completed", taskBulkLimit, clearCompletedTasks);
router.patch(
  "/:id",
  taskWriteLimit,
  validate(taskIdSchema, "params"),
  validate(updateTaskSchema, "body"),
  updateTask
);
router.delete(
  "/:id",
  taskWriteLimit,
  validate(taskIdSchema, "params"),
  deleteTask
);

export default router;
