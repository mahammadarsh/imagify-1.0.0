import React from "react";
import { useNavigate } from "react-router-dom";

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-orange-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">
          Payment Failed!
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Something went wrong with your payment. Please try again.
        </p>
        <button
          onClick={() => navigate("/buy")}
          className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 mr-4"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/")}
          className="bg-gray-500 text-white px-6 py-2 rounded-full hover:bg-gray-600"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentFailure;
