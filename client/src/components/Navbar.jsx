import React, { useEffect, useState } from "react";
import { assets } from "../assets/assets";
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext.jsx";

const Navbar = ({ credit: propCredit, creditLoading: propCreditLoading }) => {
  const {
    user,
    setShowLogin,
    logout,
    credit: contextCredit,
    creditLoading: contextLoading,
    loadCreditsData,
  } = useContext(AppContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);  // Only this state needed

  // Use props with fallback to context
  const credit = propCredit ?? contextCredit;
  const creditLoading = propCreditLoading ?? contextLoading;

  useEffect(() => {
    // Only load when we don't have a prop-supplied credit and credit is still at initial/unknown value
    if (
      !propCredit &&
      user &&
      !creditLoading &&
      (credit === 0 || credit === undefined)
    ) {
      loadCreditsData();
    }
  }, [propCredit, user, creditLoading, credit, loadCreditsData]);

  return (
    <div className="flex items-center justify-between py-4">
      <Link to="/">
        <img src={assets.logo} alt="" className="w-28 sm:w-32 lg:w-40S" />
      </Link>
      <div></div>
      {user ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/buy")}
            className="flex items-center gap-2 bg-blue-100 px-4 sm:px-6 py-1.5 sm:py-3 rounded-full hover:scale-105 transtition-all duration-700"
          >
            <img className="w-5" src={assets.credit_star} alt="" />
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              {creditLoading ? "Loading..." : `Credit left: ${credit}`}
            </p>
          </button>
          <p className="text-gray-600 max-sm:hidden pl-4">{user.name}</p>
          <div className="relative">
            <img
              src={assets.profile_icon}
              className="w-10 drop-shadow cursor-pointer"
              alt=""
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
            <div className={`absolute ${isDropdownOpen ? 'block' : 'hidden'} top-full right-0 z-10 text-black rounded pt-2`}>  {/* Position below icon, reduced padding */}
              <ul className="list-none m-0 p-2 bg-white rounded-md border text-sm">
                <li onClick={logout} className="py-1 px-2 cursor-pointer pr-10">
                  Logout
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2  sm:gap-5">
          <p onClick={() => navigate("/buy")} className="cursor-pointer">
            Pricing
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-zinc-800 text-white px-7 py-2 sm:px-10 text-sm rounded-full"
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Navbar;
