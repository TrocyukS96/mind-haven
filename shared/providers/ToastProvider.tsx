'use client';

import { ToastContainer } from "react-toastify";
import { useStore } from "../store/store-config";

const ToastProvider = () => {
    const theme = useStore((state) => state.theme);
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