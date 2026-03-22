'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RandiLogo } from '@/components/branding/RandiLogo';
import Link from 'next/link';

interface PublicProfile {
  username: string;
  walletSnippet: string | null;
  tier: string;
  stakingLevel: string;
  memberSince: string;
  contribution: string;
  activeAgents: number;
  agents: Array<{
    name: string;
    slug: string;
    description: string;
    image: string;
  }>;
  stats: {
    chats: number;
    verified: boolean;
  };
}

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    fetch(`/api/u/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('User not found in the vault');
        return res.json();
      })
      .then(data => {
        setProfile(data.profile);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <RandiLogo size="lg" variant="icon-only" animated />
          <p className="text-muted-foreground animate-pulse text-sm uppercase tracking-widest font-black italic">
            Accessing Vault...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">🛸</span>
        </div>
        <h1 className="text-3xl font-black italic mb-2">404: Phantom Handle</h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-xs mx-auto">
          The handle <span className="text-primary font-bold">@{username}</span> has not been
          claimed on the Randi network.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-10 py-4 bg-primary text-white rounded-2xl font-black italic hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          CLAIM ACCESS NOW
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <header className="fixed top-0 left-0 right-0 p-6 z-50 flex justify-between items-center backdrop-blur-md bg-background/20 border-b border-white/5">
        <RandiLogo size="sm" variant="with-text" href="/" animated />
        <Link
          href="/"
          className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
        >
          Launch My Own
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        {/* Profile Header Block */}
        <div className="glass-card rounded-[2rem] p-8 md:p-12 mb-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-primary/20 transition-all duration-700"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
            <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center text-4xl border-4 border-white/5 ring-8 ring-primary/5">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                <h1 className="text-5xl font-black italic tracking-tighter">@{profile.username}</h1>
                {profile.stats.verified && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                    <span className="text-[10px] font-black text-success uppercase tracking-widest">
                      On-Chain Verified
                    </span>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground font-medium mb-6 flex items-center gap-2 justify-center md:justify-start">
                <span className="text-xs uppercase tracking-widest font-black italic">
                  {profile.stakingLevel} Tier
                </span>
                <span className="opacity-30">•</span>
                <span className="text-xs font-mono opacity-60">{profile.walletSnippet}</span>
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground opacity-60 mb-1">
                    Bullish Scale
                  </p>
                  <h4 className="text-xl font-black text-primary italic">
                    #{profile.activeAgents} Agents
                  </h4>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground opacity-60 mb-1">
                    Total Contribution
                  </p>
                  <h4 className="text-xl font-black text-orange-400 italic">
                    {profile.contribution} TK
                  </h4>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground opacity-60 mb-1">
                    Protocol Status
                  </p>
                  <h4 className="text-xl font-black uppercase text-foreground/80">
                    {profile.tier === 'PRO' ? 'Pro Elite' : 'Operator'}
                  </h4>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground opacity-60 mb-1">
                    Member Since
                  </p>
                  <h4 className="text-xl font-black text-foreground/80">
                    {new Date(profile.memberSince).getFullYear()}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Brand Section: Active Node Matrix */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase tracking-[0.05em]">
                Active Node Matrix
              </h2>
              <span className="text-primary font-black italic animate-pulse">● LIVE</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Proprietary Deployments
            </p>
          </div>

          {profile.agents.length === 0 ? (
            <div className="glass-card rounded-[2rem] p-16 text-center border-dashed border-white/10">
              <p className="text-muted-foreground italic mb-6">
                No active agents reporting on this frequency.
              </p>
              <Link
                href="/chat"
                className="inline-block px-10 py-4 bg-white text-black rounded-2xl font-black italic hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
              >
                START THE TRANSMISSION
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {profile.agents.map(agent => (
                <div
                  key={agent.slug}
                  className="group relative glass-card rounded-3xl p-8 transition-all hover:scale-[1.02] hover:border-primary/50 overflow-hidden"
                >
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>

                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center p-3 border border-primary/20 group-hover:bg-primary/20 transition-all">
                      {agent.image ? (
                        <img
                          src={agent.image}
                          alt={agent.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl italic font-black text-primary">A</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic group-hover:text-primary transition-colors">
                        {agent.name}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                        {agent.slug}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-8 line-clamp-3 font-medium opacity-80">
                    {agent.description}
                  </p>
                  <Link
                    href={`/chat/new?agentId=${agent.slug}&ref=${profile.username}`}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-primary/10 border border-primary/20 group-hover:bg-primary text-primary group-hover:text-white rounded-2xl font-black italic transition-all"
                  >
                    COMMENCE CHAT
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Call to Action */}
        <div className="text-center pt-20 border-t border-white/5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">
            Establish Your Presence
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-12 py-5 bg-white text-black rounded-3xl font-black text-lg italic hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              CLAIM MY HANDLE
            </Link>
            <Link
              href="/"
              className="px-12 py-5 border border-white/10 hover:bg-white/5 text-foreground rounded-3xl font-black text-lg italic transition-all"
            >
              VIEW PROTOCOL
            </Link>
          </div>
          <p className="mt-12 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
            Powered by Randi Gateway • Decentralized Influence
          </p>
        </div>
      </main>
    </div>
  );
}
