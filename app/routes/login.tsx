import { useState } from "react";
import { useNavigate } from "react-router";

export function meta() {
  return [{ title: "Login - Smart Box Monitoring" }];
}

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: "",
        general: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
      general: ""
    };

    if (!formData.email.trim()) {
      newErrors.email = "Email/Username harus diisi";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password harus diisi";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Starting login process...');
      
      // Import authService dynamically to avoid SSR issues
      const { authService } = await import("../config/supabase");
      
      console.log('AuthService imported successfully');
      
      const result = await authService.login(formData.email, formData.password);
      
      console.log('Login result:', result);
      
      if (result.success && result.user) {
        console.log('Login successful, redirecting to dashboard');
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate("/dashboard");
      } else {
        console.log('Login failed with error:', result.error);
        setErrors(prev => ({
          ...prev,
          general: result.error || "Email/Username atau Password salah"
        }));
      }
    } catch (error) {
      console.error('Login catch error:', error);
      
      // Handle different types of errors more specifically
      let errorMessage = "Terjadi kesalahan saat login. Silakan coba lagi.";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
        } else if (error.message.includes('import')) {
          errorMessage = "Terjadi kesalahan saat memuat konfigurasi. Silakan refresh halaman.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setErrors(prev => ({
        ...prev,
        general: errorMessage
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4">
            <img 
              src="/favicon.ico" 
              alt="Smart Box Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Login
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            <span className="font-bold text-green-500">Smart Box</span> Monitoring
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          {/* General Error Message */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
              {errors.general}
            </div>
          )}

          {/* Email/Username Field */}
          <div>
            {/* <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Email/Username
            </label> */}
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Email/Username"
            />
            {errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            {/* <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Password
            </label> */}
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Password"
            />
            {errors.password && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Show Password Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="showPassword" className="ml-2 block text-xs sm:text-sm text-gray-700">
              Show Password
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 sm:py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg text-sm sm:text-base ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                <span className="text-xs sm:text-sm">Logging in...</span>
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}