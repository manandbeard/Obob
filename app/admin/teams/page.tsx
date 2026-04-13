"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, Trash2, Edit, Plus, X } from "lucide-react";

export default function TeamsPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  const [teams, setTeams] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [assignedRoomId, setAssignedRoomId] = useState("");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Edit Team State
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editTeamRoomId, setEditTeamRoomId] = useState("");
  const [editTeamCoachId, setEditTeamCoachId] = useState("");
  const [editTeamRoster, setEditTeamRoster] = useState<string[]>([]);
  const [editTeamSpokesperson, setEditTeamSpokesperson] = useState("");
  const [editTeamNotes, setEditTeamNotes] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");

  // Bulk Assign State
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [bulkRoomId, setBulkRoomId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  useEffect(() => {
    if (!loading && !role) {
      router.push("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (!role) return;

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
      },
    );

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
        handleFirestoreError(error, OperationType.GET, "moderator_profiles");
      },
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "users");
      }
    );

    return () => {
      unsubscribeTeams();
      unsubscribeProfiles();
      unsubscribeUsers();
    };
  }, [role]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newSchoolName.trim()) return;

    try {
      const room = profiles.find((p) => p.id === assignedRoomId);
      await addDoc(collection(db, "teams"), {
        name: newTeamName.trim(),
        schoolName: newSchoolName.trim(),
        assignedRoomId: assignedRoomId || null,
        assignedRoomName: room ? room.name : null,
        coachId: "",
        roster: [],
        spokesperson: "",
        readingProgress: {},
        notes: "",
      });
      setNewTeamName("");
      setNewSchoolName("");
      setAssignedRoomId("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "teams");
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    try {
      const room = profiles.find((p) => p.id === editTeamRoomId);
      await updateDoc(doc(db, "teams", editingTeam.id), {
        name: role === "admin" ? editTeamName.trim() : editingTeam.name,
        schoolName: role === "admin" ? editSchoolName.trim() : editingTeam.schoolName,
        assignedRoomId: editTeamRoomId === "none" ? null : editTeamRoomId,
        assignedRoomName: room ? room.name : null,
        coachId: editTeamCoachId === "none" ? "" : editTeamCoachId,
        roster: editTeamRoster,
        spokesperson: editTeamSpokesperson,
        notes: editTeamNotes,
      });
      setEditingTeam(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `teams/${editingTeam.id}`,
      );
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await deleteDoc(doc(db, "teams", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teams/${id}`);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkRoomId || selectedTeams.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const batch = writeBatch(db);
      const room = profiles.find((p) => p.id === bulkRoomId);

      selectedTeams.forEach((teamId) => {
        const teamRef = doc(db, "teams", teamId);
        batch.update(teamRef, {
          assignedRoomId: bulkRoomId === "none" ? null : bulkRoomId,
          assignedRoomName: room ? room.name : null,
        });
      });

      await batch.commit();
      setSelectedTeams([]);
      setBulkRoomId("");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "teams (bulk)");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setEditTeamRoster([...editTeamRoster, newPlayerName.trim()]);
      setNewPlayerName("");
    }
  };

  const removePlayer = (index: number) => {
    setEditTeamRoster(editTeamRoster.filter((_, i) => i !== index));
  };

  if (loading || !role) {
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
              Team Management
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Manage rosters, coaches, and room assignments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {role === "admin" && (
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => router.push("/admin")}
              >
                Back to Admin
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => router.push("/")}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Add Team - ADMIN ONLY */}
          {role === "admin" && (
            <Card className="md:col-span-1 shadow-lg border-slate-200/60 h-fit">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl">Add New Team</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAddTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="teamName"
                      className="text-slate-700 font-medium"
                    >
                      Team Name
                    </Label>
                    <Input
                      id="teamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Enter team name"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="schoolName"
                      className="text-slate-700 font-medium"
                    >
                      School Name
                    </Label>
                    <Input
                      id="schoolName"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      placeholder="Enter school name"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">
                      Assign to Room (Optional)
                    </Label>
                    <Select
                      value={assignedRoomId}
                      onValueChange={(val) => setAssignedRoomId(val || "")}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Room" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                    disabled={!newTeamName.trim() || !newSchoolName.trim()}
                  >
                    Add Team
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Team List */}
          <Card
            className={`shadow-lg border-slate-200/60 ${role === "admin" ? "md:col-span-2" : "md:col-span-3"}`}
          >
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Registered Teams</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700">
                  All Teams ({teams.length})
                </h3>
                {selectedTeams.length > 0 && (
                  <div className="flex items-center gap-2 bg-blue-50 p-1.5 rounded-lg border border-blue-100 text-sm">
                    <span className="font-medium px-2 text-blue-800">
                      {selectedTeams.length} selected
                    </span>
                    <Select
                      value={bulkRoomId}
                      onValueChange={(val) => setBulkRoomId(val || "")}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                        <SelectValue placeholder="Select Room" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleBulkAssign}
                      disabled={isBulkAssigning || !bulkRoomId}
                    >
                      {isBulkAssigning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Assign"
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                {teams.map((team) => (
                  <li
                    key={team.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all gap-4"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedTeams.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeams([...selectedTeams, team.id]);
                          } else {
                            setSelectedTeams(
                              selectedTeams.filter((id) => id !== team.id),
                            );
                          }
                        }}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="font-semibold text-slate-900 text-base font-serif">
                          {team.name} <span className="text-slate-500 font-sans text-sm font-normal">({team.schoolName})</span>
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-2">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                            Room: {team.assignedRoomName || "Unassigned"}
                          </span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md font-medium">
                            {team.roster?.length || 0} Players
                          </span>
                          {team.coachId && (
                            <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-md truncate max-w-[150px] font-medium">
                              Coach Assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => {
                          setEditingTeam(team);
                          setEditTeamName(team.name);
                          setEditSchoolName(team.schoolName);
                          setEditTeamRoomId(team.assignedRoomId || "none");
                          setEditTeamCoachId(team.coachId || "none");
                          setEditTeamRoster(team.roster || []);
                          setEditTeamSpokesperson(team.spokesperson || "");
                          setEditTeamNotes(team.notes || "");
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      {role === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
                {teams.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium">
                      No teams registered yet.
                    </p>
                  </div>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Team Dialog */}
      <Dialog
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  disabled={role !== "admin"}
                />
              </div>
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  disabled={role !== "admin"}
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned Room</Label>
                <Select
                  value={editTeamRoomId}
                  onValueChange={(val) => setEditTeamRoomId(val || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coach</Label>
                <Select
                  value={editTeamCoachId}
                  onValueChange={(val) => setEditTeamCoachId(val || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Coach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Coach Assigned</SelectItem>
                    {users.filter(u => u.role === 'coach').map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Spokesperson</Label>
                <Select
                  value={editTeamSpokesperson}
                  onValueChange={(val) => setEditTeamSpokesperson(val || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Spokesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {editTeamRoster.map((player, index) => (
                      <SelectItem key={index} value={player}>
                        {player}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editTeamNotes}
                  onChange={(e) => setEditTeamNotes(e.target.value)}
                  placeholder="Any special accommodations or notes..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Player Roster</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Player name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPlayer();
                      }
                    }}
                  />
                  <Button type="button" onClick={addPlayer} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-md border p-2 min-h-[200px]">
                {editTeamRoster.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4 italic">
                    No players added yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {editTeamRoster.map((player, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center bg-white px-2 py-1 rounded border text-sm"
                      >
                        <span>{player}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removePlayer(index)}
                        >
                          <X className="w-3 h-3 text-slate-500 hover:text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTeam(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
