import { load } from "@cashfreepayments/cashfree-js";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
const Checkout = () => {
  const { state } = useLocation();
  const { orderData } = state || {};
  const navigate = useNavigate();

  useEffect(() => {
    const initializePayment = async () => {
      if (!orderData?.order_token) {
        navigate("/buy");
        return;
      }

      try {
        const cashfree = await load({
          mode: "sandbox",
        });

        await cashfree.checkout({
          paymentSessionId: orderData.order_token,
          returnUrl: `http://localhost:5173/buy?order_id=${orderData.orderId}`,
        });
      } catch (error) {
        console.error("Payment failed:", error);
        navigate("/buy");
      }
    };

    initializePayment();
  }, [orderData]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl mb-4">Initializing Payment...</h2>
        <p className="text-gray-600">
          Please wait while we set up your payment
        </p>
      </div>
    </div>
  );
};

export default Checkout;
