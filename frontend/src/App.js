
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { useState } from 'react';
import { jwtDecode } from "jwt-decode";
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SearchResults from './pages/SearchResults';
import './App.css';
import Login from './pages/Login';
import Navbar from "./components/Navbar";
import CourseDetail from "./pages/CourseDetail";
import CourseReview from "./pages/CourseReview";
import MyCourse from "./pages/MyCourse";
import Profile from "./pages/Profile";
import AddCourseForm from "./pages/AddCourseForm";
import TeacherDashboard from "./pages/TeacherDashboard";
import Register from "./pages/Register";
import NotificationBell from "./pages/NotificationBell";
import PaymentHistory from "./pages/PaymentHistory";
import TeacherPayment from "./pages/TeacherPayment"
import NewsManage from "./pages/NewsManage";
import StudentJoinByCode from "./components/StudentJoinByCode";
import TeacherEarnings from "./components/TeacherEarnings";
import AdminPayoutManager from "./components/AdminPayoutManager";
import TeacherPayoutRequest from "./components/TeacherPayoutRequest";
import CalendarPage from "./pages/CalendarPage";
import CategoryManage from "./pages/CategoryManage";
import CourseApproval from "./pages/CourseApproval";
import PaymentSuccess from "./pages/PaymentSuccess";
import QuizPlayPage from "./pages/QuizPlayPage";
import QuizAnswerView from "./pages/QuizAnswerView";
import NewsDetail from "./pages/NewsDetail";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import AdminVoucher from "./pages/AdminVoucher";
import AdminFeedbackDashboard from "./pages/AdminFeedbackDashboard";
import CategoryCourses from "./pages/CategoryCourses";
import Cart from "./pages/Cart";    
import CodeManage from "./components/CodeManage";
import CodeList from "./pages/CodeList";
import AdminUserManage from "./pages/AdminUserManage";
import CodeDetail from "./pages/CodeDetail";
import AdminLevelManage from "./pages/AdminLevelManage";
import ForgotPassword from "./pages/ForgotPassword";
function Layout({ children }) {
  const location = useLocation();

  const hideLayout =
    
    location.pathname === "/quiz/:quizId/answers";

  return (
    <>
      {!hideLayout && <Navbar />}
      {children}
      {!hideLayout && <Footer />}
    </>
  );
}

function App() {
  const token = localStorage.getItem("token");
  const user = token ? jwtDecode(token) : null;
  return (
    <Router>
         <ScrollToTop /> 
      <Layout>

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/course-review/:id" element={<CourseReview />} />
        <Route path="/my-courses" element={<MyCourse />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/add-course" element={<AddCourseForm />} />
        <Route path="/news" element={<NewsManage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/exercises" element={<CodeList />} />
        <Route  path="/code-manage" element={<CodeManage />}  />
        <Route path="/exercises/:exerciseId" element={<CodeDetail />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/payout-request" element={<TeacherPayoutRequest />} />
        <Route path="/payment-history" element={<PaymentHistory />} />
        <Route path="/teacher-payment-dashboard" element={<TeacherPayment />} />
        <Route path="/admin/payout" element={<AdminPayoutManager />} />
        <Route path="/join-course" element={<StudentJoinByCode />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/category-manage" element={<CategoryManage />} />
        <Route path="/course-manage" element={<CourseApproval />} />
        <Route path="/admin/users" element={<AdminUserManage />} />
        <Route path="/admin/levels" element={<AdminLevelManage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/voucher" element={<AdminVoucher />} />
        <Route path="/admin/feedbacks" element={<AdminFeedbackDashboard />} />
        <Route path="/category/:slug" element={<CategoryCourses />} />
        <Route path="/quiz/:quizId/answers" element={<QuizAnswerView />} />
        <Route path="/:courseId/quiz/:quizId/play" element={<QuizPlayPage />} />
      </Routes>
      </Layout>
    </Router>
  
  );
}

export default App;