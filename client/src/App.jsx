import React, { useContext } from "react";
import Home from "./pages/Home";
import Result from "./pages/Result";
import BuyCredit from "./pages/BuyCredit";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Checkout from "./components/Checkout";
import PaymentFailure from "./pages/PaymentFailure";
import { AppContext } from "./context/AppContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const { showLogin, credit, creditLoading } = useContext(AppContext);

  return (
    <div className=" px-4 sm:px-10 md:px-14 lg:px-28 min-h-screen bg-gradient-to-b from-teal-50 to-orange-50">
      <ToastContainer position="bottom-right" />
      <Navbar credit={credit} creditLoading={creditLoading} />
      {showLogin && <Login />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/result" element={<Result />} />
        <Route path="/buy" element={<BuyCredit />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;
