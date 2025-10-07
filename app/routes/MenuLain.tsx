import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

export function meta() {
  return [{ title: "Menu Lain - Smart Box Monitoring" }];
}

export default function MenuLain() {
  const navigate = useNavigate();
  
  // User state
  const [user, setUser] = useState<{ email: string; isLoggedIn: boolean } | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for logged in user
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Show loading or redirect if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-emerald-600 transition-all duration-500 ease-in-out ${
        sidebarOpen ? 'w-64' : 'w-16 lg:w-16'
      } lg:relative lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center justify-between h-16 px-4">
          {sidebarOpen ? (
            <>
              <h2 className="text-white font-bold text-lg">Navigation</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:text-gray-200"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <i className="fas fa-cube text-emerald-600 text-lg"></i>
              </div>
            </div>
          )}
        </div>
        <nav className="mt-8">
          <div className={`px-4 ${!sidebarOpen ? 'lg:px-2' : ''}`}>
            <a
              href="/dashboard"
              className={`flex items-center py-3 text-white hover:bg-emerald-700 rounded-lg mb-2 transition-colors duration-200 ${
                sidebarOpen ? 'px-4' : 'lg:px-2 lg:justify-center px-4'
              }`}
            >
              <i className={`fas fa-tachometer-alt ${sidebarOpen ? 'mr-3' : 'lg:mr-0 mr-3'}`}></i>
              <span className={`${sidebarOpen ? 'block' : 'lg:hidden'}`}>Dashboard</span>
            </a>
            <a
              href="/menu-lain"
              className={`flex items-center py-3 text-white bg-emerald-700 rounded-lg mb-2 ${
                sidebarOpen ? 'px-4' : 'lg:px-2 lg:justify-center px-4'
              }`}
            >
              <i className={`fas fa-list ${sidebarOpen ? 'mr-3' : 'lg:mr-0 mr-3'}`}></i>
              <span className={`${sidebarOpen ? 'block' : 'lg:hidden'}`}>Menu Lain</span>
            </a>
          </div>
        </nav>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${
        sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
      }`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-4 transition-colors duration-200"
              >
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <div className={`w-5 h-0.5 bg-current transition-all duration-500 ease-in-out ${sidebarOpen ? 'rotate-45 translate-y-1.5' : 'mb-1'}`}></div>
                  <div className={`w-5 h-0.5 bg-current transition-all duration-500 ease-in-out ${sidebarOpen ? 'opacity-0' : 'mb-1'}`}></div>
                  <div className={`w-5 h-0.5 bg-current transition-all duration-500 ease-in-out ${sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-600">
                Menu Lain
              </h1>
            </div>
            
            {/* User Dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 border border-gray-200 shadow-sm"
                >
                  <i className="fas fa-user-circle text-lg text-emerald-600"></i>
                  <span className="text-sm font-medium hidden sm:block">{user.email}</span>
                  <i className={`fas fa-chevron-down text-xs transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <p className="text-xs text-gray-500">Logged in</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <i className="fas fa-sign-out-alt mr-2"></i>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main content - Empty as requested */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Menu Lain</h2>
              <p className="text-gray-600">
                Halaman ini masih kosong. Konten akan ditambahkan kemudian.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <i className="fas fa-copyright text-emerald-600"></i>
              <span>2025 - SELEB Smart Box Monitoring. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}