import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from "@react-oauth/google";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
   
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <AuthProvider>  
          <CartProvider> 
             <App />     {/* 🔥 BỌC Ở ĐÂY */}
          </CartProvider> 
        </AuthProvider> 
      </GoogleOAuthProvider>
  
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
