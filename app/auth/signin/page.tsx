'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/account';
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] px-4 py-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-[#E8E0D0]">

        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#D4AF37]/30">
            <Image
              src="/logocenter.png"
              alt="Ziwara"
              width={64}
              height={64}
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-8 text-[#2A3F35]">
          Welcome Back
        </h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#E8E0D0] rounded-full px-6 py-4"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#E8E0D0] rounded-full px-6 py-4"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2A3F35] text-white py-4 rounded-full"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-8 text-center text-sm">— OR —</div>

        <button
          onClick={handleGoogleLogin}
          className="w-full border py-4 rounded-full flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-center mt-6 text-sm">
          Don’t have an account?{' '}
          <Link href="/auth/signup" className="text-[#D4AF37]">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}