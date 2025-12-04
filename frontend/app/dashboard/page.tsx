"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { TaskCard, Task } from "@/components/TaskCard";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { ActivityCard, ActivityItem } from "@/components/ActivityCard";
import { SavingsTracker } from "@/components/SavingsTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Link2,
  Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { Call } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"tasks" | "activity" | "profile">(
    "tasks"
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to extract vendor name from purpose string
  const extractVendorFromPurpose = (purpose: string): string => {
    if (!purpose) return "Unknown";
    
    // Look for "Customer needs help with " pattern
    const match = purpose.match(/Customer needs help with ([^.]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback: check for common vendor names in the purpose
    const vendors = ["Amazon", "Whole Foods", "Spectrum", "Chase Bank", "Walmart", "Target", "Verizon", "AT&T", "Comcast"];
    for (const vendor of vendors) {
      if (purpose.toLowerCase().includes(vendor.toLowerCase())) {
        return vendor;
      }
    }
    
    // Default fallback
    return "Unknown";
  };

  // Helper function to format time (seconds to "Xh Ym" format)
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Helper function to extract refund amount from outcome text
  const extractRefundAmount = (outcome?: string): number => {
    if (!outcome) return 0;
    // Try to find dollar amounts in the outcome text
    const match = outcome.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Calculate statistics from calls
  const calculateStatistics = () => {
    if (!isAuthenticated || calls.length === 0) {
      return {
        monthlyRefunds: 0,
        timeSavedThisMonth: "0h 0m",
        totalRefunds: 0,
        totalTimeSaved: "0h 0m",
      };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter calls for this month
    const monthlyCalls = calls.filter((call) => {
      const callDate = new Date(call.created_at);
      return callDate >= startOfMonth && call.status === "completed";
    });

    // Calculate monthly refunds
    const monthlyRefunds = monthlyCalls.reduce((sum, call) => {
      return sum + extractRefundAmount(call.outcome);
    }, 0);

    // Calculate monthly time saved (from call durations)
    const monthlyTimeSaved = monthlyCalls.reduce((sum, call) => {
      return sum + (call.duration_seconds || 0);
    }, 0);

    // Calculate total refunds
    const totalRefunds = calls
      .filter((call) => call.status === "completed")
      .reduce((sum, call) => {
        return sum + extractRefundAmount(call.outcome);
      }, 0);

    // Calculate total time saved
    const totalTimeSaved = calls
      .filter((call) => call.status === "completed")
      .reduce((sum, call) => {
        return sum + (call.duration_seconds || 0);
      }, 0);

    return {
      monthlyRefunds,
      timeSavedThisMonth: formatTime(monthlyTimeSaved),
      totalRefunds,
      totalTimeSaved: formatTime(totalTimeSaved),
    };
  };

  const stats = calculateStatistics();

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    communicationTone: "polite",
    preferredLanguage: "english",
  });

  // Initialize profile data from user
  useEffect(() => {
    if (user && activeTab === "profile") {
      setProfileData({
        fullName: user.name || "",
        email: user.email || "",
        phone: "", // Will be loaded from user metadata or profile if available
        address: "", // Will be loaded from user metadata or profile if available
        communicationTone: "polite", // Default value
        preferredLanguage: "english", // Default value
      });
    }
  }, [user, activeTab]);

  // Function to load calls and convert to tasks/activity
  const loadData = useCallback(async () => {
    // Only load if user is authenticated
    if (!isAuthenticated || !user) {
      setLoading(false);
      setTasks([]);
      setActivity([]);
      setCalls([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getCalls();

      if (response.success && response.calls) {
        setCalls(response.calls);

        // Convert calls to tasks
        const taskList: Task[] = response.calls.map((call) => {
          const vendor = extractVendorFromPurpose(call.purpose || "");
          
          return {
            id: call.id,
            vendor: vendor,
            issue: call.purpose
              ? call.purpose.substring(0, 50) +
                (call.purpose.length > 50 ? "..." : "")
              : "No description",
            status:
              call.status === "completed"
                ? "resolved"
                : call.status === "failed"
                ? "failed"
                : call.status === "in_progress"
                ? "in_progress"
                : "pending",
            createdAt: new Date(call.created_at),
            desiredOutcome: call.purpose || "",
            channel: "call",
          };
        });

        setTasks(taskList);

        // Convert completed calls to activity
        const activityList: ActivityItem[] = response.calls
          .filter((call) => call.status === "completed")
          .map((call) => ({
            id: call.id,
            vendor: extractVendorFromPurpose(call.purpose || ""),
            type: "task_completed",
            title: "Call Completed",
            description: call.purpose || "Call completed successfully",
            timestamp: new Date(call.created_at),
            outcome: {
              type: "resolution",
            },
          }));

        setActivity(activityList);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Don't throw - just log the error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Load calls and convert to tasks/activity when:
  // 1. Auth loading completes and user is authenticated
  // 2. User authentication state changes (e.g., user logs in)
  // 3. When returning to dashboard route
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Only load if we're on the dashboard route and user is authenticated
    if (pathname === "/dashboard" && isAuthenticated && user) {
      loadData();
    } else if (pathname === "/dashboard" && !isAuthenticated) {
      // If not authenticated, clear data and stop loading
      setLoading(false);
      setTasks([]);
      setActivity([]);
      setCalls([]);
    }
  }, [authLoading, isAuthenticated, user, pathname, loadData]);

  // Reload data when page becomes visible (user returns from another tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        pathname === "/dashboard" &&
        isAuthenticated &&
        user
      ) {
        loadData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData, pathname, isAuthenticated, user]);

  const handleCreateTask = async () => {
    // Refresh after task creation
    await loadData();
  };

  const pendingTasksCount = tasks.filter(
    (t) => t.status === "needs_input" || t.status === "pending"
  ).length;

  // Show loading state while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/30 to-purple-50/30 opacity-30"></div>
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/20 to-transparent opacity-20"></div>

      <div className="relative z-10">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingTasksCount={pendingTasksCount}
        />

        <main className="container max-w-7xl mx-auto px-4 py-8">
          {activeTab === "tasks" && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {tasks.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Tasks
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {
                            tasks.filter((t) =>
                              ["pending", "in_progress"].includes(t.status)
                            ).length
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          In Progress
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {tasks.filter((t) => t.status === "resolved").length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Resolved
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {
                            tasks.filter((t) => t.status === "needs_input")
                              .length
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Needs Input
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Savings Tracker */}
              <SavingsTracker
                monthlyRefunds={stats.monthlyRefunds}
                timeSavedThisMonth={stats.timeSavedThisMonth}
                totalRefunds={stats.totalRefunds}
                totalTimeSaved={stats.totalTimeSaved}
              />

              {/* Tasks List */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    Your Tasks
                  </h2>
                  <Badge variant="secondary">{tasks.length} active</Badge>
                </div>

                {tasks.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onViewDetails={(id) => {
                          router.push(`/call/${id}`);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="shadow-md text-center py-12">
                    <CardContent>
                      <h3 className="text-lg font-semibold mb-2">
                        No tasks yet
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first support task to get started
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                  Recent Activity
                </h2>
                <Badge variant="secondary">{activity.length} items</Badge>
              </div>

              {activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <ActivityCard
                      key={item.id}
                      activity={item}
                      onViewDetails={(activity) => {
                        router.push(`/call/${activity.id}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card className="shadow-md text-center py-12">
                  <CardContent>
                    <h3 className="text-lg font-semibold mb-2">
                      No activity yet
                    </h3>
                    <p className="text-muted-foreground">
                      Your task history will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">
                Profile Settings
              </h2>

              {/* Personal Information Section */}
              <Card className="shadow-md">
                <CardContent className="pt-3 px-4 pb-4">
                  <div className="flex items-center gap-3 mb-5">
                    <User className="w-5 h-5 text-foreground" />
                    <h3 className="text-2xl font-bold text-foreground">
                      Personal Information
                    </h3>
                  </div>
                  {user ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={profileData.fullName}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              fullName: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="Enter your email"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="address">Default Address</Label>
                        <Input
                          id="address"
                          value={profileData.address}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              address: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="123 Main St, Los Angeles, CA 90007"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="tone">Communication Tone</Label>
                        <Select
                          value={profileData.communicationTone}
                          onValueChange={(value) =>
                            setProfileData({
                              ...profileData,
                              communicationTone: value,
                            })
                          }
                        >
                          <SelectTrigger id="tone" className="w-full">
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="polite">Polite</SelectItem>
                            <SelectItem value="professional">
                              Professional
                            </SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="language">Preferred Language</Label>
                        <Select
                          value={profileData.preferredLanguage}
                          onValueChange={(value) =>
                            setProfileData({
                              ...profileData,
                              preferredLanguage: value,
                            })
                          }
                        >
                          <SelectTrigger id="language" className="w-full">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="german">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Please sign in to view your profile
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Connected Accounts Section */}
              <Card className="shadow-md">
                <CardContent className="pt-3 px-4 pb-4">
                  <div className="flex items-center gap-3 mb-5">
                    <Link2 className="w-5 h-5 text-foreground" />
                    <h3 className="text-2xl font-bold text-foreground">
                      Connected Accounts
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Link your accounts to automatically fetch order information
                    and streamline support requests.
                  </p>

                  {user ? (
                    <div className="space-y-4">
                      {/* Amazon Account */}
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Amazon
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last sync:{" "}
                              {new Date().toLocaleDateString("en-US", {
                                month: "2-digit",
                                day: "2-digit",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Connected
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Please sign in to view connected accounts
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        <NewTaskDialog
          onCreateTask={handleCreateTask}
          vendor="Whole Foods"
          onSuccess={handleCreateTask}
        />
      </div>
    </div>
  );
}
