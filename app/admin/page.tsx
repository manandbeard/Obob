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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, Trash2, Edit, GraduationCap, Trophy, Calendar } from "lucide-react";

export default function AdminPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [newProfileName, setNewProfileName] = useState("");

  // Edit Profile State
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [editProfileName, setEditProfileName] = useState("");

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;

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

    return () => {
      unsubscribeProfiles();
    };
  }, [role]);

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    try {
      await addDoc(collection(db, "moderator_profiles"), {
        name: newProfileName.trim(),
      });
      setNewProfileName("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "moderator_profiles");
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    try {
      const newName = editProfileName.trim();
      await updateDoc(doc(db, "moderator_profiles", editingProfile.id), {
        name: newName,
      });

      // Note: We don't update teams here anymore since that's handled on the teams page
      // But ideally we'd use a Cloud Function or batch update to keep denormalized data in sync

      setEditingProfile(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `moderator_profiles/${editingProfile.id}`,
      );
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteDoc(doc(db, "moderator_profiles", id));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `moderator_profiles/${id}`,
      );
    }
  };

  if (loading || role !== "admin") {
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
              Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              System Configuration
            </p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Moderator Profiles */}
          <Card className="shadow-lg border-slate-200/60 h-fit">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl">Moderator Roles (Rooms)</CardTitle>
              <CardDescription>
                Create roles for moderators to log into.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="profileName"
                    className="text-slate-700 font-medium"
                  >
                    Role Name (e.g. Room 101)
                  </Label>
                  <Input
                    id="profileName"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Enter role name"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                  disabled={!newProfileName.trim()}
                >
                  Add Role
                </Button>
              </form>

              <div className="mt-8">
                <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-3">
                  Available Roles
                </h3>
                {profiles.length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                    No roles created yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {profiles.map((profile) => (
                      <li
                        key={profile.id}
                        className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <span className="font-medium text-slate-700">
                          {profile.name}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700"
                            onClick={() => {
                              setEditingProfile(profile);
                              setEditProfileName(profile.name);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteProfile(profile.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Season Management Link */}
          <Card className="shadow-lg border-slate-200/60 h-fit">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Season Management
              </CardTitle>
              <CardDescription>
                Schedule Pool Play rounds, assign rooms, and initialize battles.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-sm text-slate-600">
                  Create matches for pool play, set match times, and launch the Game Day Tracker.
                </p>
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => router.push("/admin/season")}
                >
                  Manage Season
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Management Link */}
          <div className="space-y-6">
            <Card className="shadow-lg border-slate-200/60 h-fit">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Manage teams, player rosters, coaches, and room
                  assignments.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Organize your tournament by adding teams, building rosters,
                    and assigning them to specific rooms.
                  </p>
                  <Button
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => router.push("/admin/teams")}
                  >
                    Go to Team Management
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Finals Link */}
            <Card className="shadow-lg border-slate-200/60 h-fit">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Tournament Finals
                </CardTitle>
                <CardDescription>
                  View pool play standings, bracket matches, and all tournament data.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Track tournament progress, view standings, and see all completed match results.
                  </p>
                  <Button
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => router.push("/admin/tournament")}
                  >
                    View Tournament Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bracket Setup Link */}
            <Card className="shadow-lg border-slate-200/60 h-fit">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-500" />
                  Bracket Setup
                </CardTitle>
                <CardDescription>
                  Seed the top teams from pool play into the single-elimination bracket.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Calculate standings and automatically generate bracket matches based on OBOB rules.
                  </p>
                  <Button
                    className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => router.push("/admin/bracket")}
                  >
                    Setup Bracket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={!editProfileName.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
