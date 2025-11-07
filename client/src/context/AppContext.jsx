import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [showLogin, setShowLogin] = useState(false);
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );
  const [credit, setCredit] = useState(0);
  const [creditLoading, setCreditLoading] = useState(false);

  const backendUrl = "https://imagify-1-0-0.onrender.com" || "http://localhost:4000";

  const navigate = useNavigate();
  const location = useLocation();

  const loadCreditsData = useCallback(async () => {
    if (!token) return;
    try {
      setCreditLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/users/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?.success && data.user) {
        if (typeof data.credits === "number") {
          setCredit((prev) => (prev !== data.credits ? data.credits : prev));
        }
        setUser((prev) => {
          if (!prev || prev._id !== data.user._id) return data.user;
          return prev;
        });
      } else {
        if (token) toast.error(data?.message || "Failed to load credits");
      }
    } catch (error) {
      if (token) toast.error("Failed to load credits");
    } finally {
      setCreditLoading(false);
    }
  }, [backendUrl, token]);

  // When returning from payment (frontend return_url), reload credits only when logged in
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const status = queryParams.get("status");

    if (token && status === "success") {
      loadCreditsData();
      toast.success("Payment successful! Credits added.");
      // remove query params to avoid repeat
      window.history.replaceState({}, "", "/buy");
    }
  }, [location.search, token, loadCreditsData]);

  // Initial credits load when token available
  useEffect(() => {
    if (token) loadCreditsData();
  }, [token, loadCreditsData]);

  // Keep token/user in sync with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {}
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // If token exists but user is missing/invalid, fetch profile once and validate token
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token || user) return;
      try {
        const { data } = await axios.get(`${backendUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data?.success && data.user) {
          setUser(data.user);
        } else {
          // invalid stored token -> clear
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const generateimage = async (prompt) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/image/generate-image",
        { prompt },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (data.success) {
        await loadCreditsData();
        return data.resultImage;
      } else {
        toast.error(data.message);
        await loadCreditsData();
        if (data.creditBalance === 0) {
          navigate("/buy");
        }
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message || "Image generation failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setCredit(0);
  };

  const value = {
    user,
    setUser,
    showLogin,
    setShowLogin,
    backendUrl,
    token,
    setToken,
    credit,
    setCredit,
    creditLoading,
    loadCreditsData,
    logout,
    generateimage,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
