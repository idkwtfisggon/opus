import { useState, useEffect } from "react";
import { CheckCircle, X, AlertCircle, AlertTriangle } from "lucide-react";

interface NotificationProps {
  type: "success" | "error" | "warning";
  title: string;
  description?: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

export function Notification({ 
  type, 
  title, 
  description, 
  show, 
  onClose, 
  duration = 4000 
}: NotificationProps) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const typeStyles = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      titleColor: "text-green-800 dark:text-green-200",
      descColor: "text-green-600 dark:text-green-300"
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      titleColor: "text-red-800 dark:text-red-200",
      descColor: "text-red-600 dark:text-red-300"
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      titleColor: "text-yellow-800 dark:text-yellow-200",
      descColor: "text-yellow-600 dark:text-yellow-300"
    }
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pointer-events-none">
      <div className={`
        mx-4 max-w-md w-full pointer-events-auto
        ${styles.bg} ${styles.border} border rounded-xl shadow-2xl
        transform transition-all duration-500 ease-out
        ${show ? 'animate-in slide-in-from-top-4 fade-in-0' : 'animate-out slide-out-to-top-4 fade-out-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
                  type === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 
                  'bg-yellow-100 dark:bg-yellow-900/30'}
              `}>
                {styles.icon}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
                {title}
              </h3>
              {description && (
                <p className={`mt-1 text-sm ${styles.descColor}`}>
                  {description}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={onClose}
                className={`
                  rounded-lg p-1.5 ${styles.titleColor} hover:opacity-75 
                  transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${type === 'success' ? 'focus:ring-green-500' : 
                    type === 'error' ? 'focus:ring-red-500' : 'focus:ring-yellow-500'}
                `}
              >
                <span className="sr-only">Close</span>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className={`h-1 ${type === 'success' ? 'bg-green-200 dark:bg-green-800' : 
          type === 'error' ? 'bg-red-200 dark:bg-red-800' : 'bg-yellow-200 dark:bg-yellow-800'} rounded-b-xl overflow-hidden`}>
          <div 
            className={`h-full ${type === 'success' ? 'bg-green-500' : 
              type === 'error' ? 'bg-red-500' : 'bg-yellow-500'} 
              animate-pulse`}
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}