import React, { createContext, useContext, useEffect, useState } from 'react';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('shap_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shap_sidebar_collapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);
  const openMobileSidebar = () => setMobileSidebarOpen(true);

  return (
    <UIContext.Provider
      value={{
        mobileSidebarOpen,
        toggleMobileSidebar,
        closeMobileSidebar,
        openMobileSidebar,
        sidebarCollapsed,
        toggleSidebar: () => setSidebarCollapsed((prev) => !prev),
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      mobileSidebarOpen: false,
      toggleMobileSidebar: () => {},
      closeMobileSidebar: () => {},
      openMobileSidebar: () => {},
      sidebarCollapsed: false,
      toggleSidebar: () => {},
    };
  }
  return context;
};

export default UIContext;

