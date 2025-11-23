'use client';

import { ToastContainer } from "react-toastify";
import { useAppStore } from "../store/slices/app-slice";

const ToastProvider = () => {
    const { theme } = useAppStore();
    return (
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme === 'dark' ? 'dark' : 'light'}
          toastClassName="rounded-lg shadow-lg border"
          className="text-sm font-medium"
        />
    );
};

export default ToastProvider;