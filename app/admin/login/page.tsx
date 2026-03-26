'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/admin/dashboard');
    });
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/admin/dashboard');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] px-4 py-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-[#E8E0D0]">

        <h1 className="text-3xl font-bold text-center mb-8 text-[#2A3F35]">Admin Login</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-base focus:outline-none focus:border-[#D4AF37]"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-base focus:outline-none focus:border-[#D4AF37]"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2A3F35] hover:bg-[#D4AF37] hover:text-[#2A3F35] text-white py-4 rounded-full font-medium transition disabled:opacity-70 text-base"
          >
            {loading ? 'Logging in...' : 'Login with Email'}
          </button>
        </form>

        <div className="my-6 text-center text-sm text-[#2A3F35]/60">— OR —</div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-[#E8E0D0] hover:bg-[#F9F6F0] py-4 rounded-full font-medium transition text-base"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-center mt-10 text-xs text-[#2A3F35]/60">
          Only authorized administrators can access this area.
        </p>
      </div>
    </div>
  );
}