import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createlayout,
  editLayout,
  getLayoutByType,
} from "../controllers/layout.controller";
import { updateAccessToken } from "../controllers/user.controller";
const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  createlayout
);
layoutRouter.put(
  "/edit-layout",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  editLayout
);
layoutRouter.get("/get-layout/:type", getLayoutByType);

export default layoutRouter;
