import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getNotification } from "../controllers/notification.controller";
import {updateNotification} from "../controllers/notification.controller"
import { updateAccessToken } from "../controllers/user.controller";

const notificationRoute = express.Router();

notificationRoute.get(
  "/get-all-notification",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getNotification
);
notificationRoute.put("/update-notification/:id",updateAccessToken,isAuthenticated,authorizeRoles("admin"),updateNotification);

export default notificationRoute;