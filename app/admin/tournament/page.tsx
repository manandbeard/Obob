'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowLeft, Trophy, Medal, ListOrdered } from 'lucide-react';

export default function TournamentPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('standings');
  const [teams, setTeams] = useState<any[]>([]);
  const [battles, setBattles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    const unsubscribeTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);
    });

    const q = query(collection(db, 'battles'), where('status', '==', 'completed'));
    const unsubscribeBattles = onSnapshot(q, (snapshot) => {
      const battlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBattles(battlesData);
      setLoadingData(false);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeBattles();
    };
  }, [user, role]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Calculate Standings
  const poolBattles = battles.filter(b => b.phase === 'pool' || !b.phase); // Fallback for old battles
  const standings = teams.map(team => {
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalPoints = 0;

    poolBattles.forEach(battle => {
      if (battle.teamAId === team.id) {
        totalPoints += battle.teamAScore;
        if (battle.teamAScore > battle.teamBScore) wins++;
        else if (battle.teamAScore < battle.teamBScore) losses++;
        else ties++;
      } else if (battle.teamBId === team.id) {
        totalPoints += battle.teamBScore;
        if (battle.teamBScore > battle.teamAScore) wins++;
        else if (battle.teamBScore < battle.teamAScore) losses++;
        else ties++;
      }
    });

    return {
      ...team,
      wins,
      losses,
      ties,
      totalPoints
    };
  }).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.totalPoints - a.totalPoints;
  });

  const bracketBattles = battles.filter(b => b.phase === 'bracket');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white pb-24 pt-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Tournament Finals</h1>
              <p className="text-slate-400 mt-1 text-sm">Overview of pool play standings and bracket results</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        <div className="flex space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'standings' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <ListOrdered className="w-4 h-4 mr-2" /> Pool Play Standings
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'bracket' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Trophy className="w-4 h-4 mr-2" /> Bracket Matches
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Medal className="w-4 h-4 mr-2" /> All Match Data
          </button>
        </div>

        {activeTab === 'standings' && (
          <Card className="shadow-lg border-slate-200/60">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Pool Play Standings</CardTitle>
              <CardDescription>Ranked by Wins, then Total Points</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Rank</th>
                      <th className="px-6 py-4 font-semibold">Team</th>
                      <th className="px-6 py-4 font-semibold text-center">Wins</th>
                      <th className="px-6 py-4 font-semibold text-center">Losses</th>
                      <th className="px-6 py-4 font-semibold text-center">Ties</th>
                      <th className="px-6 py-4 font-semibold text-right">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {standings.map((team, index) => (
                      <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {team.name} <span className="text-slate-500 font-normal">({team.schoolName})</span>
                        </td>
                        <td className="px-6 py-4 text-center text-green-600 font-semibold">{team.wins}</td>
                        <td className="px-6 py-4 text-center text-red-600 font-semibold">{team.losses}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-semibold">{team.ties}</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-600">{team.totalPoints}</td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No teams registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'bracket' && (
          <Card className="shadow-lg border-slate-200/60">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Bracket Matches</CardTitle>
              <CardDescription>Completed matches from the bracket phase</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Matchup</th>
                      <th className="px-6 py-4 font-semibold text-center">Score</th>
                      <th className="px-6 py-4 font-semibold text-right">Winner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bracketBattles.map((battle) => {
                      let teamAWon = battle.teamAScore > battle.teamBScore;
                      let teamBWon = battle.teamBScore > battle.teamAScore;
                      let winnerName = teamAWon ? battle.teamAName : teamBWon ? battle.teamBName : 'Tie';
                      let scoreDisplay = `${battle.teamAScore} - ${battle.teamBScore}`;

                      if (battle.isBye) {
                        teamAWon = battle.teamBId === 'bye';
                        teamBWon = battle.teamAId === 'bye';
                        winnerName = teamAWon ? battle.teamAName : battle.teamBName;
                        scoreDisplay = 'BYE';
                      }

                      return (
                        <tr key={battle.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            <span className={teamAWon ? 'font-bold' : ''}>{battle.teamAName}</span>
                            <span className="text-slate-400 mx-2">vs</span>
                            <span className={teamBWon ? 'font-bold' : ''}>{battle.teamBName}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-medium">
                            {scoreDisplay}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-blue-600">
                            {winnerName}
                          </td>
                        </tr>
                      );
                    })}
                    {bracketBattles.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                          No bracket matches completed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'all' && (
          <Card className="shadow-lg border-slate-200/60">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">All Match Data</CardTitle>
              <CardDescription>Comprehensive list of all completed matches</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Phase</th>
                      <th className="px-6 py-4 font-semibold">Matchup</th>
                      <th className="px-6 py-4 font-semibold text-center">Score</th>
                      <th className="px-6 py-4 font-semibold text-right">Winner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {battles.map((battle) => {
                      let teamAWon = battle.teamAScore > battle.teamBScore;
                      let teamBWon = battle.teamBScore > battle.teamAScore;
                      let winnerName = teamAWon ? battle.teamAName : teamBWon ? battle.teamBName : 'Tie';
                      let scoreDisplay = `${battle.teamAScore} - ${battle.teamBScore}`;

                      if (battle.isBye) {
                        teamAWon = battle.teamBId === 'bye';
                        teamBWon = battle.teamAId === 'bye';
                        winnerName = teamAWon ? battle.teamAName : battle.teamBName;
                        scoreDisplay = 'BYE';
                      }

                      return (
                        <tr key={battle.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${battle.phase === 'bracket' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {battle.phase === 'bracket' ? 'Bracket' : 'Pool Play'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            <span className={teamAWon ? 'font-bold' : ''}>{battle.teamAName}</span>
                            <span className="text-slate-400 mx-2">vs</span>
                            <span className={teamBWon ? 'font-bold' : ''}>{battle.teamBName}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-medium">
                            {scoreDisplay}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900">
                            {winnerName}
                          </td>
                        </tr>
                      );
                    })}
                    {battles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                          No matches completed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
