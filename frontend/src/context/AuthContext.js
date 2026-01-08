// context/AuthContext.js
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("❌ Failed to parse user:", err);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);
    
    // ✅ Trigger events để components khác update
    window.dispatchEvent(new Event("tokenChanged"));
    window.dispatchEvent(new CustomEvent("userChanged", { detail: userData }));
    
    console.log("✅ AuthContext: User logged in:", userData.username);
  };

  const logout = () => {
    const currentUser = user;
    
    // Clear auth data
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    
    // ✅ Trigger events
    window.dispatchEvent(new Event("tokenChanged"));
    window.dispatchEvent(new CustomEvent("userChanged", { detail: null }));
    
    console.log("✅ AuthContext: User logged out:", currentUser?.username);
  };

  // ✅ Update user data
  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new CustomEvent("userChanged", { detail: updatedUser }));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.roles?.includes("admin"),
    isTeacher: user?.roles?.includes("teacher"),
    isStudent: user?.roles?.includes("student"),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}