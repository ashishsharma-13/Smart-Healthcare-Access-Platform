import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    };
  }
  return context;
};

export default UIContext;

