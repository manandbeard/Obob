'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import { Loader2, ArrowLeft, Trophy, AlertTriangle } from 'lucide-react';

export default function BracketSetupPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  
  const [teams, setTeams] = useState<any[]>([]);
  const [battles, setBattles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [bracketSize, setBracketSize] = useState<'8' | '16'>('8');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    const unsubscribeTeams = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const teamsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeams(teamsData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'teams')
    );

    const q = query(collection(db, 'battles'), where('status', '==', 'completed'));
    const unsubscribeBattles = onSnapshot(
      q,
      (snapshot) => {
        const battlesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBattles(battlesData);
        setLoadingData(false);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'battles')
    );

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

  // Calculate Standings based on Pool Play
  const poolBattles = battles.filter((b) => b.phase === 'pool' || !b.phase);
  const standings = teams
    .map((team) => {
      let totalPoints = 0;
      let wins = 0;

      poolBattles.forEach((battle) => {
        if (battle.teamAId === team.id) {
          totalPoints += battle.teamAScore;
          if (battle.teamAScore > battle.teamBScore) wins++;
        } else if (battle.teamBId === team.id) {
          totalPoints += battle.teamBScore;
          if (battle.teamBScore > battle.teamAScore) wins++;
        }
      });

      return {
        ...team,
        totalPoints,
        wins,
      };
    })
    .sort((a, b) => {
      // OBOB ranks primarily by total points
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.wins - a.wins; // Tiebreaker: wins
    });

  const size = parseInt(bracketSize);
  const topTeams = standings.slice(0, size);
  
  // Check for tie at the cutoff
  let hasTieAtCutoff = false;
  if (standings.length > size) {
    const lastIn = standings[size - 1];
    const firstOut = standings[size];
    if (lastIn && firstOut && lastIn.totalPoints === firstOut.totalPoints) {
      hasTieAtCutoff = true;
    }
  }

  const handleGenerateBracket = async () => {
    if (topTeams.length === 0) {
      alert(`No teams available to generate bracket.`);
      return;
    }

    setIsGenerating(true);
    try {
      const matchups = [];
      if (size === 8) {
        matchups.push([topTeams[0], topTeams[7], 1]); // 1 v 8, match 1
        matchups.push([topTeams[3], topTeams[4], 2]); // 4 v 5, match 2
        matchups.push([topTeams[2], topTeams[5], 3]); // 3 v 6, match 3
        matchups.push([topTeams[1], topTeams[6], 4]); // 2 v 7, match 4
      } else if (size === 16) {
        matchups.push([topTeams[0], topTeams[15], 1]); // 1 v 16
        matchups.push([topTeams[7], topTeams[8], 2]);  // 8 v 9
        matchups.push([topTeams[3], topTeams[12], 3]); // 4 v 13
        matchups.push([topTeams[4], topTeams[11], 4]); // 5 v 12
        matchups.push([topTeams[1], topTeams[14], 5]); // 2 v 15
        matchups.push([topTeams[6], topTeams[9], 6]);  // 7 v 10
        matchups.push([topTeams[2], topTeams[13], 7]); // 3 v 14
        matchups.push([topTeams[5], topTeams[10], 8]); // 6 v 11
      }

      // Create pending battles for each matchup
      for (const match of matchups) {
        const teamA = match[0];
        const teamB = match[1];
        const matchNumber = match[2];

        // Handle Byes
        const isBye = !teamA || !teamB;
        const actualTeam = teamA || teamB;
        
        if (!actualTeam) continue; // Should not happen if at least 1 team exists

        if (isBye) {
          // Create a completed bye match
          await addDoc(collection(db, 'battles'), {
            teamAId: teamA ? teamA.id : 'bye',
            teamBId: teamB ? teamB.id : 'bye',
            teamAName: teamA ? teamA.name : 'BYE',
            teamBName: teamB ? teamB.name : 'BYE',
            teamASpokesperson: teamA ? (teamA.spokesperson || "") : "",
            teamBSpokesperson: teamB ? (teamB.spokesperson || "") : "",
            phase: 'bracket',
            status: 'completed',
            enableSteals: true,
            currentQuestionIndex: 16,
            teamAScore: teamA ? 1 : 0,
            teamBScore: teamB ? 1 : 0,
            questions: [],
            isBye: true,
            round: 1,
            matchNumber,
            bracketSize: size
          });
        } else {
          const initialQuestions = Array(16)
            .fill(null)
            .map((_, i) => ({
              type: i < 8 ? 'IWB' : 'Content',
              pointsA: 0,
              pointsB: 0,
            }));

          await addDoc(collection(db, 'battles'), {
            teamAId: teamA.id,
            teamBId: teamB.id,
            teamAName: teamA.name,
            teamBName: teamB.name,
            teamASpokesperson: teamA.spokesperson || "",
            teamBSpokesperson: teamB.spokesperson || "",
            phase: 'bracket',
            status: 'pending',
            enableSteals: true,
            currentQuestionIndex: 0,
            teamAScore: 0,
            teamBScore: 0,
            questions: initialQuestions,
            round: 1,
            matchNumber,
            bracketSize: size
          });
        }
      }

      router.push('/tournament');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'battles');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white pb-24 pt-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => router.push('/admin')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
                Bracket Setup
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Seed teams into a single-elimination bracket based on pool play points.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        <Card className="shadow-lg border-slate-200/60">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Configure Bracket
            </CardTitle>
            <CardDescription>
              Select the bracket size. OBOB uses total cumulative points to determine seeds.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3 max-w-sm">
              <label className="text-sm font-medium text-slate-700">
                Bracket Size
              </label>
              <Select
                value={bracketSize}
                onValueChange={(val) => setBracketSize((val as '8' | '16') || '8')}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">Awesome 8 (Top 8 Teams)</SelectItem>
                  <SelectItem value="16">Sweet 16 (Top 16 Teams)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasTieAtCutoff && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Tie at the Cutoff</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    There is a tie in total points for the final spot(s) in the bracket. 
                    According to OBOB rules, you should hold a tiebreaker battle before generating the bracket.
                  </p>
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700">
                Projected Seeds (Top {size})
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {topTeams.map((team, index) => (
                  <div key={team.id} className="px-4 py-3 flex justify-between items-center bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-900">{team.name}</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">
                      {team.totalPoints} pts
                    </div>
                  </div>
                ))}
                {topTeams.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    No teams available. Complete pool play matches first.
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-lg"
              disabled={topTeams.length < size || isGenerating}
              onClick={handleGenerateBracket}
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Trophy className="w-5 h-5 mr-2" />
              )}
              Generate Round 1 Matches
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
