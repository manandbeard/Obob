"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, ArrowLeft, Calendar, Play, Trash2, Clock } from "lucide-react";

export default function SeasonManagementPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [teams, setTeams] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [poolBattles, setPoolBattles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New Match State
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [matchTime, setMatchTime] = useState("");

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!user || role !== "admin") return;

    const unsubscribeTeams = onSnapshot(
      collection(db, "teams"),
      (snapshot) => {
        const teamsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeams(teamsData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "teams")
    );

    const unsubscribeRooms = onSnapshot(
      collection(db, "moderator_profiles"),
      (snapshot) => {
        const roomsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRooms(roomsData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "moderator_profiles")
    );

    const q = query(collection(db, "battles"), where("phase", "==", "pool"));
    const unsubscribeBattles = onSnapshot(
      q,
      (snapshot) => {
        const battlesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];
        setPoolBattles(battlesData.sort((a, b) => (a.matchTime || "").localeCompare(b.matchTime || "")));
        setLoadingData(false);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "battles")
    );

    return () => {
      unsubscribeTeams();
      unsubscribeRooms();
      unsubscribeBattles();
    };
  }, [user, role]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamAId || !teamBId || teamAId === teamBId) {
      alert("Please select two different teams.");
      return;
    }

    const teamA = teams.find((t) => t.id === teamAId);
    const teamB = teams.find((t) => t.id === teamBId);
    const room = rooms.find((r) => r.id === roomId);

    try {
      const initialQuestions = Array(16)
        .fill(null)
        .map((_, i) => ({
          type: i < 8 ? "IWB" : "Content",
          pointsA: 0,
          pointsB: 0,
        }));

      await addDoc(collection(db, "battles"), {
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamASpokesperson: teamA.spokesperson || "",
        teamBSpokesperson: teamB.spokesperson || "",
        phase: "pool",
        status: "pending",
        enableSteals: true,
        currentQuestionIndex: 0,
        teamAScore: 0,
        teamBScore: 0,
        questions: initialQuestions,
        roomId: room ? room.id : null,
        roomName: room ? room.name : null,
        matchTime: matchTime || null,
      });

      setTeamAId("");
      setTeamBId("");
      setRoomId("");
      setMatchTime("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "battles");
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled match?")) return;
    try {
      await deleteDoc(doc(db, "battles", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `battles/${id}`);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white pb-24 pt-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
                Season Management
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Schedule Pool Play rounds, assign rooms, and initialize battles.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Schedule Match Form */}
          <Card className="md:col-span-1 shadow-lg border-slate-200/60 h-fit">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Schedule Match
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateMatch} className="space-y-4">
                <div className="space-y-2">
                  <Label>Team A</Label>
                  <Select value={teamAId} onValueChange={(val) => setTeamAId(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team A" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} disabled={team.id === teamBId}>
                          {team.name} ({team.schoolName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team B</Label>
                  <Select value={teamBId} onValueChange={(val) => setTeamBId(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team B" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} disabled={team.id === teamAId}>
                          {team.name} ({team.schoolName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room (Optional)</Label>
                  <Select value={roomId} onValueChange={(val) => setRoomId(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Match Time (Optional)</Label>
                  <Input
                    type="time"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!teamAId || !teamBId}
                >
                  Schedule Match
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Scheduled Matches List */}
          <Card className="md:col-span-2 shadow-lg border-slate-200/60">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Pool Play Schedule</CardTitle>
              <CardDescription>All scheduled pool play matches</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {poolBattles.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium">No matches scheduled yet.</p>
                  </div>
                ) : (
                  poolBattles.map((battle) => (
                    <div
                      key={battle.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all gap-4 shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              battle.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : battle.status === "active"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {battle.status.toUpperCase()}
                          </span>
                          {battle.matchTime && (
                            <span className="flex items-center text-xs text-slate-500 font-medium">
                              <Clock className="w-3 h-3 mr-1" /> {battle.matchTime}
                            </span>
                          )}
                          {battle.roomName && (
                            <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              {battle.roomName}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900 text-lg">
                          {battle.teamAName} <span className="text-slate-400 font-normal mx-2">vs</span> {battle.teamBName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {battle.status !== "completed" && (
                          <Button
                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => router.push(`/battle/${battle.id}`)}
                          >
                            <Play className="w-4 h-4 mr-2" /> Initialize Battle
                          </Button>
                        )}
                        {battle.status === "completed" && (
                          <Button
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            onClick={() => router.push(`/battle/${battle.id}`)}
                          >
                            View Results
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteMatch(battle.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
