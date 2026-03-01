"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Task } from "@/components/TaskCard";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { ActivityCard, ActivityItem } from "@/components/ActivityCard";
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
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Link2,
  Package,
  Activity,
  Menu,
} from "lucide-react";
import { api } from "@/lib/api";
import { Call } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { SignInDialog } from "@/components/SignInDialog";

const TABS = ["tasks", "activity", "profile", "settings"] as const;
type Tab = (typeof TABS)[number];

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const activeTab = (searchParams.get("tab") as Tab) || "tasks";
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
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
    const vendors = [
      "Amazon",
      "Whole Foods",
      "Spectrum",
      "Chase Bank",
      "Walmart",
      "Target",
      "Verizon",
      "AT&T",
      "Comcast",
    ];
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

          const purpose = (call.purpose || "").toLowerCase();
          const priority =
            purpose.includes("refund") ||
            purpose.includes("dispute") ||
            purpose.includes("billing")
              ? "high"
              : "medium";
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
            channel: "call" as const,
            priority: priority as "high" | "medium" | "low",
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

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await api.deleteCall(taskId);
      if (response.success) {
        // Refresh the data after deletion
        await loadData();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      // You could add a toast notification here for error handling
    }
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
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <main className="flex-1 overflow-auto">
          {activeTab === "tasks" && (
            <div className="flex-1 p-8 max-w-5xl mx-auto w-full bg-white">
              <div className="space-y-8">
                {/* Page Header */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your customer service requests.
                  </p>
                </div>

                {/* Task Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-500">
                          Total Tasks
                        </p>
                        <Menu className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {tasks.length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-500">
                          In Progress
                        </p>
                        <Clock className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {
                          tasks.filter((t) =>
                            ["pending", "in_progress", "on_hold"].includes(
                              t.status
                            )
                          ).length
                        }
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-500">
                          Needs Input
                        </p>
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {tasks.filter((t) => t.status === "needs_input").length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-500">
                          Resolved
                        </p>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {tasks.filter((t) => t.status === "resolved").length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* All Tasks Section */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    All Tasks
                  </h2>

                  {tasks.length > 0 ? (
                    <div className="space-y-4">
                      {tasks.map((task) => {
                        const inProgress = ["pending", "in_progress", "on_hold"].includes(task.status);
                        const needsInput = task.status === "needs_input";
                        const resolved = task.status === "resolved";
                        const priorityLabel =
                          task.priority === "high"
                            ? "High Priority"
                            : task.priority === "low"
                            ? "Low Priority"
                            : "Medium Priority";
                        return (
                          <Card
                            key={task.id}
                            className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/call/${task.id}`)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900">
                                    {task.issue}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {task.desiredOutcome}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    {task.vendor} • Created{" "}
                                    {task.createdAt.toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "numeric",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}{" "}
                                    • {priorityLabel}
                                  </p>
                                </div>
                                <div className="shrink-0">
                                  {resolved && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Resolved
                                    </span>
                                  )}
                                  {needsInput && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      Needs Input
                                    </span>
                                  )}
                                  {inProgress && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                      <Clock className="w-3.5 h-3.5" />
                                      In Progress
                                    </span>
                                  )}
                                  {task.status === "failed" && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      Failed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="border border-gray-200 bg-white shadow-sm text-center py-12">
                      <CardContent>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No tasks yet
                        </h3>
                        <p className="text-gray-500">
                          Create your first support task to get started
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="flex-1 p-8 max-w-5xl mx-auto w-full bg-[hsl(250_30%_99%)]">
              <div className="space-y-8">
                {/* Page Header - Lovable style */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Activity
                      </h1>
                      <p className="text-sm text-gray-500">
                        Track your call outcomes and alerts
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-600"
                  >
                    {activity.length} items
                  </Badge>
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
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="py-16 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No activity yet
                    </h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                      Your task history and updates will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="flex-1 p-8 max-w-5xl mx-auto w-full bg-[hsl(250_30%_99%)]">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">
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
            </div>
          )}

          {activeTab === "settings" && (
            <div className="flex-1 p-8 max-w-5xl mx-auto w-full bg-[hsl(250_30%_99%)]">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-500">
                  Application settings coming soon.
                </p>
              </div>
            </div>
          )}
        </main>

        <NewTaskDialog
          onCreateTask={handleCreateTask}
          vendor="Whole Foods"
          onSuccess={handleCreateTask}
        />

        <SignInDialog
          open={signInDialogOpen}
          onOpenChange={setSignInDialogOpen}
        />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B46C1] mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
