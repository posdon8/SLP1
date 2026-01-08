// frontend/src/components/ScrollToTop.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth" // hoặc 'auto' nếu không muốn hiệu ứng mượt
    });
  }, [pathname]);

  return null;
}
