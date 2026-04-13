"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, Trophy, History, ListOrdered, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TournamentOverviewPage() {
  const [battles, setBattles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all completed battles
    const qBattles = query(collection(db, "battles"), where("status", "==", "completed"));
    const unsubscribeBattles = onSnapshot(
      qBattles,
      (snapshot) => {
        const battlesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBattles(battlesData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "battles");
        setLoading(false);
      }
    );

    // Fetch all teams
    const unsubscribeTeams = onSnapshot(
      collection(db, "teams"),
      (snapshot) => {
        const teamsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeams(teamsData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "teams");
      }
    );

    return () => {
      unsubscribeBattles();
      unsubscribeTeams();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
      </div>
    );
  }

  // --- Leaderboard Logic ---
  const poolBattles = battles.filter((b) => b.phase === "pool" || !b.phase);
  const standings = teams
    .map((team) => {
      let totalPoints = 0;
      let wins = 0;
      let matchesPlayed = 0;

      poolBattles.forEach((battle) => {
        if (battle.teamAId === team.id) {
          totalPoints += battle.teamAScore;
          matchesPlayed++;
          if (battle.teamAScore > battle.teamBScore) wins++;
        } else if (battle.teamBId === team.id) {
          totalPoints += battle.teamBScore;
          matchesPlayed++;
          if (battle.teamBScore > battle.teamAScore) wins++;
        }
      });

      return {
        ...team,
        totalPoints,
        wins,
        matchesPlayed,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.wins - a.wins;
    });

  // --- Bracket Logic ---
  const bracketMatches = battles.filter(b => b.phase === "bracket" && b.round && b.matchNumber);
  const bracketSize = bracketMatches.length > 0 ? (bracketMatches[0].bracketSize || 8) : 8;
  const numRounds = Math.log2(bracketSize);

  const getMatch = (round: number, matchNumber: number) => {
    return bracketMatches.find(b => b.round === round && b.matchNumber === matchNumber);
  };

  const MatchNode = ({ round, matchNumber }: { round: number, matchNumber: number }) => {
    const match = getMatch(round, matchNumber);
    
    let teamA = "TBD";
    let teamB = "TBD";
    let scoreA = "";
    let scoreB = "";
    let isCompleted = false;
    let winnerId = null;

    if (match) {
      teamA = match.teamAName || "TBD";
      teamB = match.teamBName || "TBD";
      scoreA = match.teamAScore?.toString() || "0";
      scoreB = match.teamBScore?.toString() || "0";
      isCompleted = match.status === "completed";
      
      if (match.isBye) {
        scoreA = match.teamAId === "bye" ? "" : "BYE";
        scoreB = match.teamBId === "bye" ? "" : "BYE";
      }

      if (isCompleted) {
        if (match.teamAScore > match.teamBScore || match.teamBId === "bye") winnerId = match.teamAId;
        else if (match.teamBScore > match.teamAScore || match.teamAId === "bye") winnerId = match.teamBId;
      }
    }

    return (
      <div className="flex items-center justify-center relative w-56 mx-4 my-4">
        {round > 1 && <div className="w-4 h-px bg-slate-300 absolute -left-4"></div>}
        
        <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden text-sm flex flex-col relative z-10 w-48">
          <div className={`flex justify-between items-center px-3 py-2 border-b border-slate-100 ${isCompleted && winnerId === match?.teamAId ? 'font-bold bg-green-50/50' : ''}`}>
            <span className="truncate pr-2">{teamA}</span>
            <span className="text-slate-500 font-mono text-xs">{scoreA}</span>
          </div>
          <div className={`flex justify-between items-center px-3 py-2 ${isCompleted && winnerId === match?.teamBId ? 'font-bold bg-green-50/50' : ''}`}>
            <span className="truncate pr-2">{teamB}</span>
            <span className="text-slate-500 font-mono text-xs">{scoreB}</span>
          </div>
        </div>

        {round < numRounds && <div className="w-4 h-px bg-slate-300 absolute -right-4"></div>}
      </div>
    );
  };

  const rounds = [];
  for (let r = 1; r <= numRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    const roundMatches = [];
    for (let m = 1; m <= matchesInRound; m++) {
      let absoluteMatchNumber = m;
      for (let prevR = 1; prevR < r; prevR++) {
        absoluteMatchNumber += bracketSize / Math.pow(2, prevR);
      }
      roundMatches.push(
        <MatchNode key={`r${r}-m${m}`} round={r} matchNumber={absoluteMatchNumber} />
      );
    }
    rounds.push(
      <div key={`round-${r}`} className="flex flex-col justify-around relative">
        <h3 className="text-center font-semibold text-slate-500 mb-4 text-sm uppercase tracking-wider">
          {r === numRounds ? "Finals" : r === numRounds - 1 ? "Semifinals" : `Round ${r}`}
        </h3>
        {roundMatches}
      </div>
    );
  }

  // --- Historical Matches ---
  const historicalMatches = battles.sort((a, b) => {
    // Sort by matchTime if available, otherwise just put them in a list
    const timeA = a.matchTime || "";
    const timeB = b.matchTime || "";
    return timeB.localeCompare(timeA); // Descending
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 text-white py-8 px-4 md:px-8 shadow-md relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              Tournament Overview
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base">
              The official source of truth for live standings, historical results, and bracket progression.
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-white shadow-sm border border-slate-200">
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <ListOrdered className="w-4 h-4 mr-2" /> Live Leaderboard
            </TabsTrigger>
            <TabsTrigger value="bracket" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              <Trophy className="w-4 h-4 mr-2" /> Bracket View
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
              <History className="w-4 h-4 mr-2" /> Match History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="shadow-lg border-slate-200/60">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-blue-600" />
                  Live Leaderboard (Pool Play)
                </CardTitle>
                <CardDescription>Teams are ranked by total cumulative points, followed by total wins.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Rank</th>
                        <th className="px-6 py-4 font-semibold">Team</th>
                        <th className="px-6 py-4 font-semibold text-center">Matches Played</th>
                        <th className="px-6 py-4 font-semibold text-center">Wins</th>
                        <th className="px-6 py-4 font-semibold text-right">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {standings.map((team, index) => (
                        <tr key={team.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index < 8 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900 text-base">{team.name}</div>
                            <div className="text-slate-500 text-xs">{team.schoolName}</div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-slate-700">
                            {team.matchesPlayed}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-slate-700">
                            {team.wins}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-blue-600 text-lg">
                            {team.totalPoints}
                          </td>
                        </tr>
                      ))}
                      {standings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                            No teams or match data available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6">
            <Card className="shadow-lg border-slate-200/60">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  Championship Bracket
                </CardTitle>
                <CardDescription>Live progression of the single-elimination tournament.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 overflow-x-auto">
                {bracketMatches.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">The bracket has not been generated yet.</p>
                    <p className="text-sm text-slate-400 mt-1">Check back after pool play is completed.</p>
                  </div>
                ) : (
                  <div className="min-w-max flex justify-center mx-auto py-8">
                    <div className="flex gap-8">
                      {rounds}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-lg border-slate-200/60">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600" />
                  Historical Match Results
                </CardTitle>
                <CardDescription>A complete log of all finished battles.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {historicalMatches.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium">No completed matches yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {historicalMatches.map((battle) => {
                      const teamAWon = battle.teamAScore > battle.teamBScore;
                      const teamBWon = battle.teamBScore > battle.teamAScore;
                      const isTie = battle.teamAScore === battle.teamBScore;

                      return (
                        <div key={battle.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {battle.phase === 'bracket' ? 'Bracket Play' : 'Pool Play'}
                            </span>
                            {battle.matchTime && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {battle.matchTime}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className={`flex justify-between items-center ${teamAWon ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                              <span className="truncate pr-4">{battle.teamAName}</span>
                              <span className="text-lg">{battle.teamAScore}</span>
                            </div>
                            <div className={`flex justify-between items-center ${teamBWon ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                              <span className="truncate pr-4">{battle.teamBName}</span>
                              <span className="text-lg">{battle.teamBScore}</span>
                            </div>
                          </div>
                          
                          {isTie && !battle.isBye && (
                            <div className="mt-3 text-center text-xs font-medium text-amber-600 bg-amber-50 py-1 rounded">
                              Tie Match
                            </div>
                          )}
                          {battle.isBye && (
                            <div className="mt-3 text-center text-xs font-medium text-slate-500 bg-slate-50 py-1 rounded">
                              Bye Match
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
