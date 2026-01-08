// context/CartContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  // ✅ Storage key theo user - mỗi user có cart riêng
  const getStorageKey = useCallback(() => {
    if (user?._id) {
      return `cart-items-${user._id}`;
    }
    return "cart-items-guest"; // Guest user (chưa login)
  }, [user]);

  // Storage helper functions
  const hasWindowStorage = typeof window !== "undefined" && window.storage;

  const storageGet = async (key) => {
    try {
      if (hasWindowStorage) {
        return await window.storage.get(key);
      } else {
        const value = localStorage.getItem(key);
        return value ? { key, value } : null;
      }
    } catch (err) {
      console.error(`❌ Error reading ${key}:`, err);
      return null;
    }
  };

  const storageSet = async (key, value) => {
    try {
      if (hasWindowStorage) {
        return await window.storage.set(key, value);
      } else {
        localStorage.setItem(key, value);
        return { key, value };
      }
    } catch (err) {
      console.error(`❌ Error writing ${key}:`, err);
      throw err;
    }
  };

  const storageDelete = async (key) => {
    try {
      if (hasWindowStorage) {
        return await window.storage.delete(key);
      } else {
        localStorage.removeItem(key);
        return { key, deleted: true };
      }
    } catch (err) {
      console.error(`❌ Error deleting ${key}:`, err);
      throw err;
    }
  };

  // ✅ Load cart khi user thay đổi
  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        const storageKey = getStorageKey();
        const result = await storageGet(storageKey);

        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          const items = Array.isArray(parsed) ? parsed : [];
          setCartItems(items);
          console.log(`✅ CartContext: Loaded cart for ${user?._id || 'guest'}:`, items.length);
        } else {
          setCartItems([]);
          console.log(`✅ CartContext: Cart is empty for ${user?._id || 'guest'}`);
        }
        setError(null);
      } catch (err) {
        console.error("❌ CartContext: Error loading cart:", err);
        setCartItems([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user?._id, getStorageKey]); // ✅ Reload khi user thay đổi

  // ✅ Sync cart to storage
  useEffect(() => {
    const saveCart = async () => {
      try {
        const storageKey = getStorageKey();
        const cartJSON = JSON.stringify(cartItems);
        await storageSet(storageKey, cartJSON);
        console.log(`💾 CartContext: Saved ${cartItems.length} items for ${user?._id || 'guest'}`);
        window.dispatchEvent(new Event("cartUpdated"));
        setError(null);
      } catch (err) {
        console.error("❌ CartContext: Error saving cart:", err);
        setError(err.message);
      }
    };

    if (!loading && cartItems.length >= 0) {
      saveCart();
    }
  }, [cartItems, loading, getStorageKey, user?._id]);

  // ✅ Listen to auth changes (tokenChanged event)
  useEffect(() => {
    const handleAuthChange = () => {
      console.log("🔄 CartContext: Auth changed, reloading cart...");
      // Cart sẽ tự động reload vì user thay đổi trigger useEffect trên
    };

    window.addEventListener("tokenChanged", handleAuthChange);
    return () => window.removeEventListener("tokenChanged", handleAuthChange);
  }, []);

  // Add to cart
  const addToCart = useCallback((course) => {
    if (!course || !course._id) {
      console.error("❌ Invalid course object");
      return;
    }

    setCartItems((prev) => {
      if (prev.some((item) => item._id === course._id)) {
        console.warn("⚠️ Course already in cart:", course.title);
        return prev;
      }
      console.log("✅ CartContext: Adding to cart:", course.title);
      return [...prev, course];
    });
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((courseId) => {
    setCartItems((prev) => {
      const filtered = prev.filter((item) => item._id !== courseId);
      console.log("❌ CartContext: Removed from cart, items left:", filtered.length);
      return filtered;
    });
  }, []);

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      setCartItems([]);
      const storageKey = getStorageKey();
      await storageDelete(storageKey);
      window.dispatchEvent(new Event("cartUpdated"));
      console.log("🗑️ CartContext: Cart cleared");
      setError(null);
    } catch (err) {
      console.error("❌ CartContext: Error clearing cart:", err);
      setError(err.message);
    }
  }, [getStorageKey]);

  // Check if course in cart
  const isInCart = useCallback(
    (courseId) => {
      return cartItems.some((item) => item._id === courseId);
    },
    [cartItems]
  );

  // Update cart item
  const updateCartItem = useCallback((courseId, updates) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === courseId ? { ...item, ...updates } : item
      )
    );
  }, []);

  // Get total price
  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [cartItems]);

  const value = {
    cartItems,
    cartCount: cartItems.length,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    isInCart,
    getTotalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom Hook to use Cart Context
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}