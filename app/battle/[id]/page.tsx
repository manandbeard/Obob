"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/timer";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, ArrowRight, ArrowLeft, Check, X } from "lucide-react";

export default function BattlePage() {
  const { user, role, profileName, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<any>(null);
  const [showTimers, setShowTimers] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !role)) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!battleId) return;

    const unsubscribe = onSnapshot(
      doc(db, "battles", battleId),
      (docSnap) => {
        if (docSnap.exists()) {
          setBattle({ id: docSnap.id, ...docSnap.data() });
        } else {
          router.push("/");
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `battles/${battleId}`);
      },
    );

    return () => unsubscribe();
  }, [battleId, router]);

  const updateBattle = async (updates: any) => {
    try {
      await updateDoc(doc(db, "battles", battleId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `battles/${battleId}`);
    }
  };

  const handleScoreChange = (team: "A" | "B", points: number) => {
    const newQuestions = [...battle.questions];
    const qIndex = battle.currentQuestionIndex;

    if (team === "A") {
      newQuestions[qIndex].pointsA = points;
    } else {
      newQuestions[qIndex].pointsB = points;
    }

    // Recalculate totals
    const teamAScore = newQuestions.reduce(
      (sum, q) => sum + (q.pointsA || 0),
      0,
    );
    const teamBScore = newQuestions.reduce(
      (sum, q) => sum + (q.pointsB || 0),
      0,
    );

    updateBattle({
      questions: newQuestions,
      teamAScore,
      teamBScore,
      status: "active",
    });
  };

  const nextQuestion = () => {
    if (battle.currentQuestionIndex < battle.questions.length - 1) {
      updateBattle({ currentQuestionIndex: battle.currentQuestionIndex + 1 });
    } else {
      updateBattle({ status: "completed" });
    }
  };

  const prevQuestion = () => {
    if (battle.currentQuestionIndex > 0) {
      updateBattle({ currentQuestionIndex: battle.currentQuestionIndex - 1 });
    }
  };

  if (loading || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (battle.status === 'completed') {
    const teamAIWB = battle.questions.filter((q: any) => q.type === 'IWB').reduce((sum: number, q: any) => sum + (q.pointsA || 0), 0);
    const teamAContent = battle.questions.filter((q: any) => q.type === 'Content').reduce((sum: number, q: any) => sum + (q.pointsA || 0), 0);
    const teamBIWB = battle.questions.filter((q: any) => q.type === 'IWB').reduce((sum: number, q: any) => sum + (q.pointsB || 0), 0);
    const teamBContent = battle.questions.filter((q: any) => q.type === 'Content').reduce((sum: number, q: any) => sum + (q.pointsB || 0), 0);
    
    let winnerText = "It's a Tie!";
    if (battle.teamAScore > battle.teamBScore) winnerText = `${battle.teamAName} Wins!`;
    if (battle.teamBScore > battle.teamAScore) winnerText = `${battle.teamBName} Wins!`;

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-900 text-white pb-24 pt-8 px-4 md:px-8">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
                  Match Complete
                </h1>
                <p className="text-slate-400 mt-1 text-sm">Room: {profileName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
          <Card className="shadow-xl border-0 overflow-hidden">
            <div className="bg-blue-600 text-white text-center py-6 px-4">
              <h2 className="text-3xl font-serif font-bold">{winnerText}</h2>
              <p className="text-blue-100 mt-1">Final Score Summary</p>
            </div>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                
                {/* Team A Summary */}
                <div className="p-8 text-center">
                  <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">{battle.teamAName}</h3>
                  <div className="text-6xl font-bold text-blue-600 mb-8">{battle.teamAScore}</div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <span className="text-slate-600 font-medium">Part 1: In Which Book</span>
                      <span className="font-bold text-slate-900">{teamAIWB} pts</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <span className="text-slate-600 font-medium">Part 2: Content</span>
                      <span className="font-bold text-slate-900">{teamAContent} pts</span>
                    </div>
                  </div>
                </div>

                {/* Team B Summary */}
                <div className="p-8 text-center">
                  <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">{battle.teamBName}</h3>
                  <div className="text-6xl font-bold text-blue-600 mb-8">{battle.teamBScore}</div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <span className="text-slate-600 font-medium">Part 1: In Which Book</span>
                      <span className="font-bold text-slate-900">{teamBIWB} pts</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <span className="text-slate-600 font-medium">Part 2: Content</span>
                      <span className="font-bold text-slate-900">{teamBContent} pts</span>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = battle.questions[battle.currentQuestionIndex];
  const isOdd = (battle.currentQuestionIndex + 1) % 2 !== 0;
  const activeTeam = isOdd ? "A" : "B";
  const activeTeamName = isOdd ? battle.teamAName : battle.teamBName;
  const opposingTeam = isOdd ? "B" : "A";
  const opposingTeamName = isOdd ? battle.teamBName : battle.teamAName;
  
  const isPartOne = currentQ.type === 'IWB';
  const partTitle = isPartOne ? 'Part 1: In Which Book' : 'Part 2: Content';
  const progressPercent = ((battle.currentQuestionIndex + 1) / battle.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white pb-24 pt-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
                Battle Scoring
              </h1>
              <p className="text-slate-400 mt-1 text-sm">Room: {profileName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-lg">
            <Switch
              id="timers"
              checked={showTimers}
              onCheckedChange={setShowTimers}
              className="data-[state=checked]:bg-blue-500"
            />
            <Label
              htmlFor="timers"
              className="text-slate-200 font-medium cursor-pointer"
            >
              Show Timers
            </Label>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          <Card
            className={`shadow-lg border-2 transition-all ${activeTeam === "A" ? "border-blue-500 ring-4 ring-blue-500/10 scale-[1.02]" : "border-slate-200/60"}`}
          >
            <CardHeader
              className={`text-center pb-2 ${activeTeam === "A" ? "bg-blue-50/50" : "bg-slate-50/50"} border-b border-slate-100`}
            >
              <CardDescription className="font-semibold tracking-wider uppercase text-xs text-slate-500">
                Team A (Odd)
              </CardDescription>
              <CardTitle className="text-2xl md:text-3xl font-serif text-slate-900">
                {battle.teamAName}
              </CardTitle>
              {battle.teamASpokesperson && (
                <div className="text-sm text-slate-600 mt-1">
                  Spokesperson: <span className="font-medium">{battle.teamASpokesperson}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="text-center py-8">
              <div
                className={`text-6xl md:text-7xl font-bold font-serif ${activeTeam === "A" ? "text-blue-600" : "text-slate-700"}`}
              >
                {battle.teamAScore}
              </div>
            </CardContent>
          </Card>

          <Card
            className={`shadow-lg border-2 transition-all ${activeTeam === "B" ? "border-blue-500 ring-4 ring-blue-500/10 scale-[1.02]" : "border-slate-200/60"}`}
          >
            <CardHeader
              className={`text-center pb-2 ${activeTeam === "B" ? "bg-blue-50/50" : "bg-slate-50/50"} border-b border-slate-100`}
            >
              <CardDescription className="font-semibold tracking-wider uppercase text-xs text-slate-500">
                Team B (Even)
              </CardDescription>
              <CardTitle className="text-2xl md:text-3xl font-serif text-slate-900">
                {battle.teamBName}
              </CardTitle>
              {battle.teamBSpokesperson && (
                <div className="text-sm text-slate-600 mt-1">
                  Spokesperson: <span className="font-medium">{battle.teamBSpokesperson}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="text-center py-8">
              <div
                className={`text-6xl md:text-7xl font-bold font-serif ${activeTeam === "B" ? "text-blue-600" : "text-slate-700"}`}
              >
                {battle.teamBScore}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timers */}
        {showTimers && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Timer initialSeconds={15} label="Answer / Challenge (15s)" />
            <Timer initialSeconds={120} label="Find Evidence (2m)" />
          </div>
        )}

        {/* Wizard */}
        <Card className="shadow-lg border-slate-200/60">
          <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${isPartOne ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
              <span className="font-semibold text-sm text-slate-700 uppercase tracking-wider">{partTitle}</span>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {Math.round(progressPercent)}% Complete
            </div>
          </div>
          <div className="h-1 w-full bg-slate-100">
            <div 
              className={`h-full transition-all duration-500 ${isPartOne ? 'bg-blue-500' : 'bg-purple-500'}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardDescription className="font-semibold tracking-wider uppercase text-xs text-slate-500 mb-1">
                  Question {battle.currentQuestionIndex + 1} of{" "}
                  {battle.questions.length}
                </CardDescription>
                <CardTitle className="text-xl">
                  Directed to:{" "}
                  <span className="text-blue-600 font-serif">
                    {activeTeamName}
                  </span>
                </CardTitle>
              </div>
              <span className={`px-4 py-1.5 text-white rounded-full text-sm font-semibold shadow-sm ${isPartOne ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {currentQ.type}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            {/* Primary Scoring */}
            <div className="space-y-5">
              <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
                Score for {activeTeamName}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant={
                    currentQ[`points${activeTeam}`] === 5
                      ? "default"
                      : "outline"
                  }
                  onClick={() => handleScoreChange(activeTeam, 5)}
                  className={`h-14 text-base font-medium ${currentQ[`points${activeTeam}`] === 5 ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-600 ring-offset-2" : "hover:border-blue-300 hover:bg-blue-50"}`}
                >
                  5 pts (Full)
                </Button>
                <Button
                  variant={
                    currentQ[`points${activeTeam}`] === 3
                      ? "default"
                      : "outline"
                  }
                  onClick={() => handleScoreChange(activeTeam, 3)}
                  className={`h-14 text-base font-medium ${currentQ[`points${activeTeam}`] === 3 ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-600 ring-offset-2" : "hover:border-blue-300 hover:bg-blue-50"}`}
                >
                  3 pts (Partial)
                </Button>
                {currentQ.type === "Content" ? (
                  <Button
                    variant={
                      currentQ[`points${activeTeam}`] === 2
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleScoreChange(activeTeam, 2)}
                    className={`h-14 text-base font-medium ${currentQ[`points${activeTeam}`] === 2 ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-600 ring-offset-2" : "hover:border-blue-300 hover:bg-blue-50"}`}
                  >
                    2 pts (Partial)
                  </Button>
                ) : (
                  <div className="hidden md:block"></div>
                )}
                <Button
                  variant={
                    currentQ[`points${activeTeam}`] === 0
                      ? "destructive"
                      : "outline"
                  }
                  onClick={() => handleScoreChange(activeTeam, 0)}
                  className={`h-14 text-base font-medium ${currentQ[`points${activeTeam}`] === 0 ? "ring-2 ring-red-600 ring-offset-2" : "hover:border-red-300 hover:bg-red-50 hover:text-red-700"}`}
                >
                  0 pts (Incorrect)
                </Button>
              </div>
            </div>

            {/* Steals */}
            {battle.enableSteals && currentQ[`points${activeTeam}`] < 5 && (
              <div className="space-y-5 bg-amber-50/50 p-6 rounded-xl border border-amber-100">
                <h3 className="font-semibold text-lg text-amber-900 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-amber-500 rounded-full inline-block"></span>
                  Steal Opportunity for {opposingTeamName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant={
                      currentQ[`points${opposingTeam}`] === (5 - (currentQ[`points${activeTeam}`] || 0))
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      handleScoreChange(
                        opposingTeam,
                        5 - (currentQ[`points${activeTeam}`] || 0),
                      )
                    }
                    className={`h-14 text-base font-medium ${currentQ[`points${opposingTeam}`] === (5 - (currentQ[`points${activeTeam}`] || 0)) ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-600 ring-offset-2" : "border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300"}`}
                  >
                    +{5 - (currentQ[`points${activeTeam}`] || 0)} pts (Steal)
                  </Button>

                  {(5 - (currentQ[`points${activeTeam}`] || 0)) > 3 ? (
                    <Button
                      variant={
                        currentQ[`points${opposingTeam}`] === 3
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleScoreChange(opposingTeam, 3)}
                      className={`h-14 text-base font-medium ${currentQ[`points${opposingTeam}`] === 3 ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-600 ring-offset-2" : "border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300"}`}
                    >
                      +3 pts (Partial)
                    </Button>
                  ) : (
                    <div className="hidden md:block"></div>
                  )}

                  {(5 - (currentQ[`points${activeTeam}`] || 0)) > 2 ? (
                    <Button
                      variant={
                        currentQ[`points${opposingTeam}`] === 2
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleScoreChange(opposingTeam, 2)}
                      className={`h-14 text-base font-medium ${currentQ[`points${opposingTeam}`] === 2 ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-600 ring-offset-2" : "border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300"}`}
                    >
                      +2 pts (Partial)
                    </Button>
                  ) : (
                    <div className="hidden md:block"></div>
                  )}

                  <Button
                    variant={
                      currentQ[`points${opposingTeam}`] === 0
                        ? "destructive"
                        : "outline"
                    }
                    onClick={() => handleScoreChange(opposingTeam, 0)}
                    className={`h-14 text-base font-medium ${currentQ[`points${opposingTeam}`] === 0 ? "ring-2 ring-red-600 ring-offset-2" : "border-amber-200 text-amber-800 hover:bg-red-50 hover:text-red-700 hover:border-red-200"}`}
                  >
                    0 pts (No Steal)
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
              <Button
                variant="outline"
                onClick={prevQuestion}
                disabled={battle.currentQuestionIndex === 0}
                className="h-12 px-6 font-medium text-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>

              {battle.currentQuestionIndex === battle.questions.length - 1 ? (
                <Button
                  onClick={nextQuestion}
                  disabled={battle.status === "completed"}
                  className="h-12 px-8 font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  {battle.status === "completed"
                    ? "Battle Completed"
                    : "Finish Battle"}{" "}
                  <Check className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={nextQuestion}
                  className="h-12 px-8 font-medium bg-slate-900 hover:bg-slate-800"
                >
                  Next Question <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
