import React, { useContext, useState, useEffect } from "react";
import { assets, plans } from "../assets/assets";
import { AppContext } from "../context/AppContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import axios from "axios";

const BuyCredit = () => {
  const { user, backendUrl, token, setShowLogin, loadCreditsData } =
    useContext(AppContext);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const status = searchParams.get("status");

    // Only verify if we have orderId and no status yet
    if (orderId && !status) {
      // console.log("Verifying payment for:", orderId);

      // Set loading state if needed
      setIsProcessing(true);

      axios
        .get(`${backendUrl}/api/users/verify-payment?order_id=${orderId}`)
        .then((response) => {
          // console.log("Verification response:", response.data);

          if (response.data.success) {
            loadCreditsData();
            toast.success("Payment successful!");
            // Update URL to prevent re-verification
            window.history.replaceState({}, "", "/buy?status=success");
          } else {
            toast.error(response.data.message || "Payment verification failed");
            window.history.replaceState({}, "", "/buy?status=failed");
          }
        })
        .catch((error) => {
          console.error("Verification failed:", error);
          toast.error("Payment verification failed");
          window.history.replaceState({}, "", "/buy?status=error");
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  }, [searchParams]); // Only depend on searchParams

  //new
  const handlePurchase = async (planId) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    try {
      setIsProcessing(true);
      const { data } = await axios.post(
        `${backendUrl}/api/users/pay`,
        { planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // console.log("Payment response:", data); // Debug log

      if (data.success && data.order) {
        if (data.order.payment_link) {
          window.location.href = data.order.payment_link;
        } else if (data.order.payment_session_id) {
          navigate("/checkout", {
            state: {
              orderData: {
                order_token: data.order.payment_session_id,
                orderId: data.order.order_id,
                amount: data.order.order_amount,
              },
            },
          });
        } else {
          toast.error("Invalid payment response from server");
        }
      } else {
        toast.error(data.message || "Failed to create payment order");
      }
    } catch (error) {
      // console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Payment error");
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (orderId) => {
    try {
      const response = await axios.get(
        `${backendUrl}/api/users/verify-payment?order_id=${orderId}`
      );
      if (response.data.success) {
        toast.success("Payment successful! Credits added.");
        loadCreditsData();
      } else {
        toast.error("Payment verification failed");
      }
    } catch {
      toast.error("Error verifying payment");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 2 }}
      whileInView={{ opacity: 1, y: 1 }}
      viewport={{ once: true }}
      className="min-h[80vh] text-center pt-14 mb-10"
    >
      <button className="border border-gray-400 px-10 py-2 rounded-full mb-6">
        Our plans
      </button>
      <h1 className="text-center text-3xl font-medium mb-6 sm:mb-10">
        Chosse the plan
      </h1>

      <div className="flex flex-wrap justify-center gap-6 text-left">
        {plans.map((item, index) => (
          <div
            key={index}
            className="bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500 border-none"
          >
            <img width={40} src={assets.logo_icon} alt="" />
            <p className="mt-3 mb-1 font-semibold">{item.id}</p>
            <p className="text-sm">{item.desc}</p>
            <p className="mt-6">
              <span className="text-3xl font-medium"> ${item.price}</span> /{" "}
              {item.credits} credits
            </p>
            <button
              onClick={() => handlePurchase(item.id)}
              disabled={isProcessing}
              className="w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52"
            >
              {isProcessing
                ? "Processing..."
                : user
                ? "Purchase"
                : "Get Started"}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuyCredit;
