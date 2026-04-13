"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Trophy, BookOpen, Library, ShieldAlert, Users, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { role, loading, login } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "moderator") {
        router.push("/moderator");
      } else if (role === "coach") {
        router.push("/coach");
      }
    }
  }, [role, loading, router]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    const success = await login();
    if (!success) {
      alert("Login failed. Please try again.");
      setIsLoggingIn(false);
    }
  };

  if (loading || role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif font-bold text-xl text-slate-900 hidden sm:block">
                OBOB Tournament
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2 opacity-70" />
                )}
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4 py-16 sm:py-24">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
        
        {/* Book Visualizations */}
        <div className="absolute top-20 left-10 md:left-32 opacity-20 transform -rotate-12 pointer-events-none">
          <Library className="w-32 h-32 text-slate-400" />
        </div>
        <div className="absolute bottom-20 right-10 md:right-32 opacity-20 transform rotate-12 pointer-events-none">
          <BookOpen className="w-40 h-40 text-slate-400" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium text-sm mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Live Tournament Scoring
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
            Oregon Battle of the Books
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The official scorekeeping and tournament management platform. Track pool play, manage brackets, and follow the championship in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/tournament" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-2 rounded-xl">
                <Trophy className="w-5 h-5" />
                Tournament Overview
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 relative z-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-2">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">Live Brackets</h3>
            <p className="text-slate-500 text-sm">Follow the tournament progression in real-time as teams advance through the bracket.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">Accurate Scoring</h3>
            <p className="text-slate-500 text-sm">Seamlessly track "In Which Book" and "Content" questions with built-in steal mechanics.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">Coach Dashboard</h3>
            <p className="text-slate-500 text-sm">Private dashboards for coaches to manage team rosters and track student reading progress.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
