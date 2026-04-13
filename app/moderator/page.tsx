"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ModeratorPage() {
  const {
    user,
    role,
    profileName,
    profileId,
    loading,
    logOut,
  } = useAuth();
  const router = useRouter();

  const [battles, setBattles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Battle Creation State
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [matchPhase, setMatchPhase] = useState("pool");
  const [enableSteals, setEnableSteals] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== "moderator")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Always fetch profiles so moderators can select them
    const unsubscribeProfiles = onSnapshot(
      collection(db, "moderator_profiles"),
      (snapshot) => {
        const profilesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProfiles(profilesData);
      },
      (error) => {
        console.error("Error fetching profiles", error);
      },
    );

    return () => unsubscribeProfiles();
  }, [user]);

  useEffect(() => {
    if (!user || role !== "moderator") return;

    setLoadingData(true);
    const q = query(
      collection(db, "battles"),
      where("status", "in", ["pending", "active"]),
    );

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
      (error) => {
        handleFirestoreError(error, OperationType.GET, "battles");
        setLoadingData(false);
      },
    );

    return () => unsubscribeBattles();
  }, [user, role]);

  useEffect(() => {
    if (role === "moderator" && profileId) {
      const q = query(
        collection(db, "teams"),
        where("assignedRoomId", "==", profileId),
      );
      const unsubscribeTeams = onSnapshot(
        q,
        (snapshot) => {
          const teamsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTeams(teamsData);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "teams");
        },
      );
      return () => unsubscribeTeams();
    }
  }, [role, profileId]);

  const handleCreateBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamAId || !teamBId || teamAId === teamBId) return;

    setIsCreating(true);
    try {
      const teamA = teams.find((s) => s.id === teamAId);
      const teamB = teams.find((s) => s.id === teamBId);

      // Initialize 16 questions (8 IWB, 8 Content)
      const initialQuestions = Array(16)
        .fill(null)
        .map((_, i) => ({
          type: i < 8 ? "IWB" : "Content",
          pointsA: 0,
          pointsB: 0,
        }));

      const docRef = await addDoc(collection(db, "battles"), {
        teamAId,
        teamBId,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamASpokesperson: teamA.spokesperson || "",
        teamBSpokesperson: teamB.spokesperson || "",
        phase: matchPhase,
        status: "pending",
        enableSteals,
        currentQuestionIndex: 0,
        teamAScore: 0,
        teamBScore: 0,
        questions: initialQuestions,
      });

      setTeamAId("");
      setTeamBId("");
      router.push(`/battle/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "battles");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading || role !== "moderator") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard Header */}
      <div className="bg-slate-900 text-white pb-24 pt-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
              Moderator Dashboard
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Room:{" "}
              <strong className="text-white font-medium">{profileName}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => {
                logOut();
                router.push("/");
              }}
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        <div className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-5 shadow-lg border-slate-200/60 h-fit">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Create Match</CardTitle>
              <CardDescription>
                Select teams assigned to {profileName}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {teams.length < 2 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                  Not enough teams assigned to this room to create a match.
                  Admin must assign teams to this room.
                </div>
              ) : (
                <form onSubmit={handleCreateBattle} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label className="text-slate-700 font-medium">
                      Match Phase
                    </Label>
                    <Select
                      value={matchPhase}
                      onValueChange={(val) => setMatchPhase(val || "pool")}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pool">Pool Play</SelectItem>
                        <SelectItem value="bracket">Bracket Play</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-slate-700 font-medium">
                      Team A (Odd Questions)
                    </Label>
                    <Select
                      value={teamAId}
                      onValueChange={(val) => setTeamAId(val || "")}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Team A" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-slate-700 font-medium">
                      Team B (Even Questions)
                    </Label>
                    <Select
                      value={teamBId}
                      onValueChange={(val) => setTeamBId(val || "")}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Team B" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-3 pt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Switch
                      id="steals"
                      checked={enableSteals}
                      onCheckedChange={setEnableSteals}
                    />
                    <Label
                      htmlFor="steals"
                      className="font-medium cursor-pointer"
                    >
                      Enable Steals
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-base"
                    disabled={
                      !teamAId ||
                      !teamBId ||
                      teamAId === teamBId ||
                      isCreating
                    }
                  >
                    {isCreating ? (
                      <Loader2 className="animate-spin mr-2 w-5 h-5" />
                    ) : null}
                    Start Match
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-200/60 md:col-span-7">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Active Matches</CardTitle>
              <CardDescription>
                Select a match to continue scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingData ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
                </div>
              ) : battles.length === 0 ? (
                <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-slate-500 font-medium">
                    No active or pending matches found.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Create a match using the form to get started.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1">
                  {battles.map((battle) => (
                    <Card
                      key={battle.id}
                      className="cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group overflow-hidden"
                      onClick={() => router.push(`/battle/${battle.id}`)}
                    >
                      <div className="h-1.5 w-full bg-slate-200 group-hover:bg-blue-500 transition-colors" />
                      <CardHeader className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {battle.status}
                          </span>
                        </div>
                        <CardTitle className="text-lg font-serif leading-tight">
                          <span className="text-slate-900">
                            {battle.teamAName}
                          </span>
                          <span className="text-slate-400 mx-2 font-sans text-sm">
                            vs
                          </span>
                          <span className="text-slate-900">
                            {battle.teamBName}
                          </span>
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
