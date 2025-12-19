import express from "express";

import {
  getPublicRooms,
  getRoomBySlug,
  getRoomByid,
  joinRoom,
  leaveRoom,
  updateRoom,
  getRoomMembers,
  kickMember,
  changeBackground,
} from "../controllers/room.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";

import {
  roomIdParamSchema,
  roomSlugParamSchema,
  updateRoomSchema,
  kickMemberSchema,
  changeBackgroundSchema,
} from "../validators/room.validator.js";

const router = express.Router();

router.use(verifyToken);

router.get("/public", getPublicRooms);

router.get(
  "/slug/:slug",
  validate(roomSlugParamSchema, "params"),
  getRoomBySlug
);

router.get("/id/:id", validate(roomIdParamSchema, "params"), getRoomByid);

router.post("/:id/join", validate(roomIdParamSchema, "params"), joinRoom);

router.post("/:id/leave", validate(roomIdParamSchema, "params"), leaveRoom);

router.get(
  "/:id/members",
  validate(roomIdParamSchema, "params"),
  getRoomMembers
);

router.patch(
  "/:id",
  validate(roomIdParamSchema, "params"),
  validate(updateRoomSchema, "body"),
  updateRoom
);

router.patch(
  "/:id/background",
  validate(roomIdParamSchema, "params"),
  validate(changeBackgroundSchema, "body"),
  changeBackground
);

router.post(
  "/:id/kick",
  validate(roomIdParamSchema, "params"),
  validate(kickMemberSchema, "body"),
  kickMember
);

export default router;
