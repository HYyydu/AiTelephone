"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Phone, Clock, CheckCircle } from "lucide-react";
import { SignInDialog } from "@/components/SignInDialog";

export default function Landing() {
  const router = useRouter();
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleEnter = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-40"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>

      {/* Header */}
      <header className="relative z-10 container max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-0 cursor-pointer"
            onClick={() => router.push("/")}
          >
            {logoError ? (
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                H
              </div>
            ) : (
              <div className="w-14 h-14 relative">
                <Image
                  src="/logo.png"
                  alt="Holdless Logo"
                  fill
                  className="object-contain"
                  priority
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            <span className="text-xl font-bold text-foreground">Holdless</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setSignInDialogOpen(true)}
              className="px-6 bg-foreground text-background"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container max-w-7xl mx-auto px-4 pt-16 pb-32">
        <div className="text-center space-y-12">
          <div className="space-y-8 max-w-5xl mx-auto">
            <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
              <span className="text-foreground">Never wait </span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                on hold
              </span>
              <span className="text-foreground"> again</span>
            </h1>

            <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Discover the new way to handle customer support calls. Your AI
              assistant manages everything while you focus on what matters.
            </p>

            <div className="flex items-center justify-center gap-6 pt-4">
              <Button
                size="lg"
                onClick={handleEnter}
                className="px-10 py-6 text-lg bg-foreground text-background hover:bg-foreground/90 shadow-lg"
              >
                Get Started Free
              </Button>
            </div>
          </div>

          {/* Visual Demo */}
          <div className="relative max-w-4xl mx-auto mt-16">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl transform rotate-1"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl transform -rotate-1"></div>
            <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-border/50">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">
                    Calling Whole Foods Support...
                  </span>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-blue-500">
                  <p className="text-base font-medium text-foreground leading-relaxed">
                    "Hi, I'm calling as Sarah's authorized assistant regarding
                    order #113-1234567. We need to request a refund for damaged
                    strawberries."
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>On hold: 0:00 (no wait time!)</span>
                  <div className="flex gap-1 ml-auto">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sections */}
      <div className="relative z-10">
        {/* Trusted By Section */}
        <section className="relative py-24 md:py-28 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center space-y-8">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Trusted By
              </h3>
              <div className="flex flex-wrap items-center justify-evenly gap-x-8 md:gap-x-12 lg:gap-x-16 gap-y-4 w-full">
                <span className="text-xl md:text-2xl text-muted-foreground font-bold">
                  Amazon
                </span>
                <span className="text-xl md:text-2xl text-muted-foreground font-bold">
                  Walmart
                </span>
                <span className="text-xl md:text-2xl text-muted-foreground font-bold">
                  Chase
                </span>
                <span className="text-xl md:text-2xl text-muted-foreground font-bold">
                  Verizon
                </span>
                <span className="text-xl md:text-2xl text-muted-foreground font-bold">
                  Instacart
                </span>
                <span className="text-xl md:text-2xl text-muted-foreground font-bold">
                  Target
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative pt-32 pb-24 md:pt-40">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center space-y-6 mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
                How Holdless Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From setup to resolution, we've streamlined every step of
                customer support interactions
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 mt-16">
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  1
                </div>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 pt-12 shadow-md border border-border/50 h-full">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <Clock className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-4">
                    Create Your Task
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Tell us what you need help with. Whether it's a refund
                    request, account issue, or product inquiry, just describe
                    your situation.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  2
                </div>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 pt-12 shadow-md border border-border/50 h-full">
                  <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                    <Phone className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-4">
                    AI Takes Over
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Your AI assistant calls the company on your behalf,
                    navigates phone trees, waits on hold, and speaks with
                    representatives.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  3
                </div>
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 pt-12 shadow-md border border-border/50 h-full">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-4">
                    Get Results
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Review complete call transcripts, confirmation numbers, and
                    outcomes. Every interaction is documented.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why People Love Holdless Section */}
        <section className="relative pt-24 pb-32">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center space-y-6 mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
                Why People Love Holdless
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands who have reclaimed their time and eliminated
                customer support frustration
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 mt-16">
              <div className="text-center">
                <div className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  47hrs
                </div>
                <p className="text-muted-foreground text-base">
                  Average time saved per user annually
                </p>
              </div>

              <div className="text-center">
                <div className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  94%
                </div>
                <p className="text-muted-foreground text-base">
                  Success rate on first attempt
                </p>
              </div>

              <div className="text-center">
                <div className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  $380
                </div>
                <p className="text-muted-foreground text-base">
                  Average value recovered per user
                </p>
              </div>

              <div className="text-center">
                <div className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  24/7
                </div>
                <p className="text-muted-foreground text-base">
                  AI assistant availability
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Perfect For Any Support Need Section */}
        <section className="relative py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center space-y-6 mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground max-w-3xl mx-auto leading-tight">
                Perfect For Any Support Need
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mt-16">
              {/* E-Commerce Issues */}
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-border/50">
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  E-Commerce Issues
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Handle returns, refunds, damaged items, and delivery problems
                  across all your favorite retailers.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Amazon
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Walmart
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Target
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Instacart
                  </span>
                </div>
              </div>

              {/* Subscription Management */}
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-border/50">
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  Subscription Management
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Cancel unwanted subscriptions, resolve billing disputes, and
                  update payment information effortlessly.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Streaming
                  </span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Software
                  </span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Memberships
                  </span>
                </div>
              </div>

              {/* Utilities & Services */}
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-border/50">
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  Utilities & Services
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Manage internet, phone, and utility accounts. Resolve service
                  issues and negotiate better rates.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Verizon
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    AT&T
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Comcast
                  </span>
                </div>
              </div>

              {/* Financial Services */}
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-border/50">
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  Financial Services
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Dispute charges, request fee waivers, and handle account
                  inquiries with banks and credit card companies.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Chase
                  </span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Bank of America
                  </span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Amex
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SignInDialog
        open={signInDialogOpen}
        onOpenChange={setSignInDialogOpen}
      />
    </div>
  );
}
