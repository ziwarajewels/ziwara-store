'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } }
    });

    if (authError) {
      setError(authError.message);
    } else if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim()
      });

      alert("Account created successfully! Please sign in.");
      router.push('/auth/signin');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] px-4 py-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-[#E8E0D0]">

        <h1 className="text-3xl font-bold text-center mb-8 text-[#2A3F35]">Create Account</h1>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-base" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-base" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-base" 
              placeholder="+91 98765 43210" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password (min 8 characters)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-base" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Shipping Address</label>
            <textarea 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              className="w-full border border-[#E8E0D0] rounded-3xl px-6 py-4 h-24 text-base" 
              required 
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#2A3F35] text-white py-4 rounded-full font-medium hover:bg-[#D4AF37] transition disabled:opacity-70 text-base"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="my-6 text-center text-sm text-[#2A3F35]/60">— OR —</div>

        <button 
          onClick={handleGoogle} 
          className="w-full border border-[#E8E0D0] py-4 rounded-full font-medium hover:bg-[#F9F6F0] flex items-center justify-center gap-3 text-base"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <p className="text-center mt-8 text-sm text-[#2A3F35]/70">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-[#D4AF37] font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}