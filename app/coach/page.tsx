"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import { Loader2, Users, BookOpen, Save, Plus, Trash2, RefreshCw, FileText, CheckCircle2, Circle } from "lucide-react";

export default function CoachDashboard() {
  const { user, role, profileName, loading, logOut } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [roster, setRoster] = useState<string[]>([]);
  const [alternate, setAlternate] = useState<string>("");
  const [readingProgress, setReadingProgress] = useState<Record<string, Record<string, { assigned: boolean, finished: boolean }>>>({});
  const [readingRecords, setReadingRecords] = useState<Record<string, { characters: string, plot: string }>>({});
  const [newStudent, setNewStudent] = useState("");

  const OBOB_BOOKS = [
    "A Rover's Story",
    "Allergic",
    "Answers in the Pages",
    "The Case of the Missing Marquess",
    "The First Rule of Punk",
    "Flora & Ulysses",
    "Front Desk",
    "The Great Treehouse War",
    "The Lion of Mars",
    "Measuring Up",
    "The Midnight Children",
    "The Parker Inheritance",
    "Rez Dogs",
    "A Snicker of Magic",
    "The Stars Beneath Our Feet",
    "A Wish in the Dark"
  ];

  useEffect(() => {
    if (!loading && role !== "coach") {
      router.push("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (!user || role !== "coach") return;

    const fetchTeam = async () => {
      try {
        const q = query(collection(db, "teams"), where("coachId", "==", user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const teamDoc = snapshot.docs[0];
          const teamData: any = { id: teamDoc.id, ...teamDoc.data() };
          setTeam(teamData);
          setRoster(teamData.roster || []);
          setAlternate(teamData.alternate || "");
          
          // Migrate old readingProgress format if necessary
          let progress = teamData.readingProgress || {};
          if (Object.keys(progress).length > 0 && typeof Object.values(progress)[0] === 'string') {
             const newProgress: any = {};
             Object.entries(progress).forEach(([book, student]) => {
                newProgress[book] = { [student as string]: { assigned: true, finished: false } };
             });
             progress = newProgress;
          }
          setReadingProgress(progress);
          setReadingRecords(teamData.readingRecords || {});
        }
        setLoadingData(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "teams");
        setLoadingData(false);
      }
    };

    fetchTeam();
  }, [user, role]);

  const handleAddStudent = () => {
    if (newStudent.trim() && !roster.includes(newStudent.trim())) {
      setRoster([...roster, newStudent.trim()]);
      setNewStudent("");
    }
  };

  const handleRemoveStudent = (student: string) => {
    setRoster(roster.filter(s => s !== student));
    if (alternate === student) setAlternate("");
    
    // Also remove from reading progress
    const newProgress = { ...readingProgress };
    Object.keys(newProgress).forEach(book => {
      if (newProgress[book] && newProgress[book][student]) {
        const bookProgress = { ...newProgress[book] };
        delete bookProgress[student];
        newProgress[book] = bookProgress;
      }
    });
    setReadingProgress(newProgress);
  };

  const toggleBookAssignment = (book: string, student: string, field: 'assigned' | 'finished') => {
    const newProgress = { ...readingProgress };
    if (!newProgress[book]) newProgress[book] = {};
    if (!newProgress[book][student]) newProgress[book][student] = { assigned: false, finished: false };
    
    newProgress[book][student][field] = !newProgress[book][student][field];
    
    // If marking as finished, ensure it's assigned
    if (field === 'finished' && newProgress[book][student].finished) {
      newProgress[book][student].assigned = true;
    }
    
    setReadingProgress(newProgress);
  };

  const handleRecordChange = (book: string, field: 'characters' | 'plot', value: string) => {
    setReadingRecords({
      ...readingRecords,
      [book]: {
        ...readingRecords[book],
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "teams", team.id), {
        roster,
        alternate,
        readingProgress,
        readingRecords
      });
      alert("Team data saved successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${team.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200/60">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-serif text-2xl font-bold text-slate-900">
              No Team Assigned
            </CardTitle>
            <CardDescription>
              You have not been assigned to a team yet. Please contact the tournament administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={logOut} variant="outline">Sign Out</Button>
          </CardContent>
        </Card>
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
              Coach Dashboard
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Team: <strong className="text-white font-medium">{team.name}</strong> ({team.schoolName})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={logOut}
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 space-y-8 pb-12">
        <Tabs defaultValue="roster" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-white shadow-sm border border-slate-200">
            <TabsTrigger value="roster" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Users className="w-4 h-4 mr-2" /> Roster & Rotation
            </TabsTrigger>
            <TabsTrigger value="tracker" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <BookOpen className="w-4 h-4 mr-2" /> Digital Fact Tracker
            </TabsTrigger>
            <TabsTrigger value="records" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
              <FileText className="w-4 h-4 mr-2" /> Reading Records
            </TabsTrigger>
          </TabsList>

          <div className="flex justify-end mb-4">
            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Changes
            </Button>
          </div>

          <TabsContent value="roster" className="space-y-6">
            <Card className="shadow-lg border-slate-200/60">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Team Roster & Rotation
                </CardTitle>
                <CardDescription>Manage your 4-5 team members. OBOB rules require one person to rotate out per match if you have 5 members.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="max-w-md space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Student Name" 
                      value={newStudent}
                      onChange={(e) => setNewStudent(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                      disabled={roster.length >= 5}
                    />
                    <Button onClick={handleAddStudent} size="icon" className="shrink-0" disabled={roster.length >= 5}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {roster.length >= 5 && (
                    <p className="text-sm text-amber-600 font-medium flex items-center gap-1">
                      <RefreshCw className="w-4 h-4" /> Maximum of 5 members allowed.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700">Current Roster ({roster.length}/5)</h3>
                  {roster.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4">No students added yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {roster.map((student, idx) => (
                        <div key={idx} className={`flex flex-col p-4 bg-white border rounded-xl shadow-sm transition-all ${alternate === student ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-medium text-slate-800 text-lg">{student}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 -mt-1 -mr-1">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {roster.length === 5 && (
                            <label className="flex items-center gap-2 text-sm cursor-pointer mt-auto pt-2 border-t border-slate-100">
                              <input 
                                type="radio" 
                                name="alternate" 
                                checked={alternate === student}
                                onChange={() => setAlternate(student)}
                                className="text-amber-600 focus:ring-amber-500"
                              />
                              <span className={alternate === student ? 'text-amber-700 font-medium' : 'text-slate-500'}>
                                Rotate Out (Alternate)
                              </span>
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6">
            <Card className="shadow-lg border-slate-200/60">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Digital Fact Tracker
                </CardTitle>
                <CardDescription>Track which students are assigned to which books and mark when they finish reading.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 overflow-x-auto">
                {roster.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                    <p className="text-slate-500">Add students to your roster first to use the tracker.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 border border-slate-200 rounded-tl-lg w-1/3">Book Title</th>
                        {roster.map(student => (
                          <th key={student} className="px-4 py-3 border border-slate-200 text-center">
                            {student}
                            {alternate === student && <span className="block text-[10px] text-amber-600 normal-case mt-0.5">(Alternate)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {OBOB_BOOKS.map((book, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 border border-slate-200 font-medium text-slate-900">
                            {book}
                          </td>
                          {roster.map(student => {
                            const progress = readingProgress[book]?.[student] || { assigned: false, finished: false };
                            return (
                              <td key={student} className="px-4 py-3 border border-slate-200 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                    <Checkbox 
                                      checked={progress.assigned} 
                                      onCheckedChange={() => toggleBookAssignment(book, student, 'assigned')}
                                    />
                                    <span className={progress.assigned ? 'text-slate-700 font-medium' : 'text-slate-400'}>Assigned</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                    <Checkbox 
                                      checked={progress.finished} 
                                      onCheckedChange={() => toggleBookAssignment(book, student, 'finished')}
                                      disabled={!progress.assigned}
                                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                    />
                                    <span className={progress.finished ? 'text-emerald-600 font-medium' : 'text-slate-400'}>Finished</span>
                                  </label>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card className="shadow-lg border-slate-200/60">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Reading Records
                </CardTitle>
                <CardDescription>A persistent log for students to take notes on characters and plot points.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {OBOB_BOOKS.map((book, idx) => {
                    const record = readingRecords[book] || { characters: "", plot: "" };
                    // Find who is assigned to this book
                    const assignedStudents = roster.filter(s => readingProgress[book]?.[s]?.assigned);
                    
                    return (
                      <div key={idx} className="flex flex-col p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg leading-tight">{book}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {assignedStudents.length > 0 
                              ? `Assigned to: ${assignedStudents.join(', ')}` 
                              : "Unassigned"}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Characters</Label>
                          <Textarea 
                            placeholder="List main characters and traits..."
                            className="min-h-[80px] text-sm resize-none"
                            value={record.characters}
                            onChange={(e) => handleRecordChange(book, 'characters', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Plot Points</Label>
                          <Textarea 
                            placeholder="Key events, setting, problem/solution..."
                            className="min-h-[100px] text-sm resize-none"
                            value={record.plot}
                            onChange={(e) => handleRecordChange(book, 'plot', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
