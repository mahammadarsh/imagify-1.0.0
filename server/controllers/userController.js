import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";

// ----------------- CASHFREE CONFIG -----------------
const CF_BASE =
  process.env.CASHFREE_ENV === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const CF_HEADERS = {
  "Content-Type": "application/json",
  "x-api-version": "2022-09-01",
  "x-client-id": process.env.CASHFREE_APP_ID,
  "x-client-secret": process.env.CASHFREE_SECRET_KEY,
};

// ----------------- PLANS -----------------

const plans = [
  { id: "Basic", price: 10, credits: 100, desc: "Best for personal use." },
  { id: "Advanced", price: 50, credits: 500, desc: "Best for business use." },
  {
    id: "Business",
    price: 250,
    credits: 5000,
    desc: "Best for enterprise use.",
  },
];

// ----------------- AUTH -----------------
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ success: false, message: "All fields are required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const userCredits = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.json({ success: false, message: "User not found" });

    res.json({
      success: true,
      credits: user.creditBalance || 0,
      user: { name: user.name },
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// ----------------- CASHFREE -----------------

const createPaymentOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = plans.find((p) => p.id === planId);
    if (!plan)
      return res.json({ success: false, message: "Invalid plan selected" });

    // Generate unique orderId using timestamp AND random string
    const orderId = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const existingOrder = await orderModel.findOne({ orderId });
    if (existingOrder) {
      return res.json({
        success: false,
        message: "Please try again (order id conflict)",
      });
    }

    const user = await userModel.findById(req.user.id);
    if (!user) return res.json({ success: false, message: "User not found" });

    await orderModel.create({
      orderId,
      userId: user._id,
      planId,
      amount: plan.price,
    });

    const orderData = {
      order_amount: plan.price,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: user._id.toString(),
        customer_email: user.email,
        customer_phone: user.phone || "9999999999",
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/buy?order_id=${orderId}`,

        notify_url: `${process.env.BACKEND_URL}/api/users/webhook`,
      },
    };

    const cfRes = await axios.post(`${CF_BASE}/orders`, orderData, {
      headers: CF_HEADERS,
    });

    return res.json({
      success: true,
      order: {
        ...cfRes.data,
        payment_session_id: cfRes.data.payment_session_id,
      },
    });
  } catch (error) {
    console.error("Payment order creation failed:", error);
    return res.json({ success: false, message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { order_id } = req.query;
    //console.log("\n=== Starting Payment Verification ===");
    //console.log("Verifying order:", order_id);

    const orderDoc = await orderModel.findOne({ orderId: order_id });
    if (!orderDoc) {
      return res.json({ success: false, message: "Order not found" });
    }

    // Check if order is already paid to prevent double processing
    if (orderDoc.status === "PAID") {
      //console.log("Order already paid, skipping verification");
      return res.json({
        success: true,
        message: "Order already processed",
        credits: orderDoc.credits,
      });
    }

    const cfRes = await axios.get(`${CF_BASE}/orders/${order_id}`, {
      headers: CF_HEADERS,
    });

    if (cfRes.data.order_status === "PAID") {
      const plan = plans.find((p) => p.id === orderDoc.planId);

      // Atomically update user credits and order status
      const [updatedUser] = await Promise.all([
        userModel.findByIdAndUpdate(
          orderDoc.userId,
          { $inc: { creditBalance: plan.credits } },
          { new: true }
        ),
        orderModel.findOneAndUpdate(
          { orderId: order_id, status: { $ne: "PAID" } },
          { status: "PAID", credits: plan.credits },
          { new: true }
        ),
      ]);

      // console.log(`Credits updated: +${plan.credits} -> new balance: ${updatedUser.creditBalance}`);

      return res.json({
        success: true,
        message: "Payment verified successfully",
        credits: updatedUser.creditBalance,
      });
    }

    return res.json({
      success: false,
      message: "Payment not completed",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.json({ success: false, message: "Verification failed" });
  }
};

const cashfreeWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    // Validate webhook data
    if (!type || !data) {
      console.error("Invalid webhook data received");
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    // Handle successful payment webhook
    if (type === "PAYMENT_SUCCESS_WEBHOOK") {
      const { order_id, payment } = data;
      // debug log
      // if (payment?.payment_status === "SUCCESS") {
      //   // Log successful webhook
      //   console.log("Payment success webhook received:", {
      //     order_id,
      //     payment_status: payment.payment_status,
      //     timestamp: new Date().toISOString()
      //   });
      // }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

// ----------------- CREDITS -----------------

const addCredits = async (req, res) => {
  try {
    const { planId } = req.body;
    const user = await userModel.findById(req.user.id);
    if (!user) return res.json({ success: false, message: "User not found" });

    const plan = plans.find((p) => p.id === planId);
    if (!plan) return res.json({ success: false, message: "Plan not found" });

    await userModel.findByIdAndUpdate(req.user.id, {
      $inc: { creditBalance: plan.credits },
    });
    // debug
    // console.log(`Added ${plan.credits} credits to user ${user._id}`);
    res.json({
      success: true,
      message: `${plan.credits} credits added successfully`,
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  userCredits,
  createPaymentOrder,
  verifyPayment,
  cashfreeWebhook,
  addCredits,
};
