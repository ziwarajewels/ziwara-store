'use client';
import Link from 'next/link';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';


export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    setTimeout(() => {
      toast.success("Thank you! We'll reply within 24 hours ✨");
      setFormData({ name: '', email: '', message: '' });
      setSending(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0]">
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[#2A3F35]/70 hover:text-[#D4AF37] transition">
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="text-center mb-16">
          <p className="text-[#D4AF37] tracking-[3px] text-sm font-medium">LET'S CONNECT</p>
          <h1 className="text-5xl md:text-6xl font-bold text-[#2A3F35] mt-4 leading-none">We'd love to hear from you</h1>
          <p className="mt-6 text-[#2A3F35]/70 max-w-md mx-auto">
            Whether you have a question, want to collaborate, or just want to say hello — we're here.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white rounded-3xl p-10 border border-[#E8E0D0] hover:border-[#D4AF37] transition group text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F9F6F0] flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/10 transition">
              <Mail className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h3 className="font-semibold text-xl mb-3">Email Us</h3>
            <a href="mailto:ziwarajewels@gmail.com" className="text-[#2A3F35] hover:text-[#D4AF37] transition text-lg font-medium block">
              ziwarajewels@gmail.com
            </a>
          </div>

          <div className="bg-white rounded-3xl p-10 border border-[#E8E0D0] hover:border-[#D4AF37] transition group text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F9F6F0] flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/10 transition">
              <Phone className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h3 className="font-semibold text-xl mb-4">Call Us</h3>
            <div className="space-y-3 text-lg">
              <a href="tel:+917225841587" className="block hover:text-[#D4AF37] transition">+91 72258 41587</a>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-10 border border-[#E8E0D0] hover:border-[#D4AF37] transition group text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F9F6F0] flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/10 transition">
              👋
            </div>
            <h3 className="font-semibold text-xl mb-2">Meet the Maker</h3>
            <p className="text-[#2A3F35] text-lg">Kritika</p>
            <p className="text-sm text-[#2A3F35]/60 mt-2">Founders • Ziwara</p>
          </div>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 md:p-12 border border-[#E8E0D0]">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-[#E8E0D0] rounded-full px-6 py-4"
                placeholder="Kritika Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-[#E8E0D0] rounded-full px-6 py-4"
                placeholder="you@email.com"
              />
            </div>
          </div>
          <div className="mt-8">
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              required
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full border border-[#E8E0D0] rounded-3xl px-6 py-4 resize-none"
              placeholder="Tell us how we can help..."
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="mt-10 w-full md:w-auto bg-[#2A3F35] text-white px-12 py-5 rounded-full font-medium hover:bg-[#D4AF37] transition-all"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}