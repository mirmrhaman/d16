import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function Login() {
  const { loginWithCredentials, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMethod, setOtpMethod] = useState("sms");
  const [humanCheck, setHumanCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/AdminDashboard";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!humanCheck) {
      return;
    }
    setLoading(true);
    try {
      await loginWithCredentials({ email, password, otp, otpMethod, authApi: base44.auth });
      navigate(redirectTo, { replace: true });
    } catch {
      // error handled in context state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary)] via-[var(--primary-dark)] to-[var(--primary-dark)] px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[var(--primary)]">Admin / Super Login</h1>
          <p className="text-gray-600">Enter verified email and password. OTP will be required if 2FA is enabled.</p>
        </div>
        <form className="space-y-4" onSubmit={handleLogin}>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="otpMethod"
                value="sms"
                checked={otpMethod === "sms"}
                onChange={() => setOtpMethod("sms")}
              />
              SMS
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="otpMethod"
                value="email"
                checked={otpMethod === "email"}
                onChange={() => setOtpMethod("email")}
              />
              Email
            </label>
          </div>
          <Input
            type="text"
            placeholder="OTP (only if 2FA enabled)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={humanCheck}
              onChange={(e) => setHumanCheck(e.target.checked)}
            />
            I'm not a robot (simple check)
          </label>
          {authError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {authError}
            </p>
          )}
          <Button
            type="submit"
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
            disabled={loading}
          >
            {loading ? "Checking..." : "Login"}
          </Button>
        </form>
        <p className="text-xs text-gray-500 text-center">
          Only emails verified by an Admin can sign in. Admins can set passwords and promote users to Admin or Super User roles.
        </p>
      </div>
    </div>
  );
}
