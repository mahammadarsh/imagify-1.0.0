import express from "express";
import userAuth from "../middlewares/auth.js";
import {
  registerUser,
  loginUser,
  userCredits,
  createPaymentOrder,
  verifyPayment,
  cashfreeWebhook,
  addCredits,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/credits", userAuth, userCredits);

userRouter.post("/pay", userAuth, createPaymentOrder); // create order requires auth
userRouter.get("/verify-payment", verifyPayment); // public callback from Cashfree
userRouter.post("/webhook", cashfreeWebhook); // public webhook endpoint

userRouter.post("/add-credits", userAuth, addCredits);

export default userRouter;
