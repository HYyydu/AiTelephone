'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Email/Password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Phone fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      onOpenChange(false);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signUp(name, email, password);
      onOpenChange(false);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Format phone number to E.164 if needed
      let formattedPhone = phone;
      if (!phone.startsWith('+')) {
        // Assume US number if no country code
        formattedPhone = `+1${phone.replace(/\D/g, '')}`;
      }

      const response = await api.requestPhoneOTP(formattedPhone);
      if (response.success) {
        setOtpSent(true);
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let formattedPhone = phone;
      if (!phone.startsWith('+')) {
        formattedPhone = `+1${phone.replace(/\D/g, '')}`;
      }

      const response = await api.verifyPhoneOTP(formattedPhone, otp);
      if (response.success && response.user) {
        onOpenChange(false);
        router.push('/dashboard');
      } else {
        setError(response.error || 'Failed to verify OTP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setOtp('');
    setOtpSent(false);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome to Holdless</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to your account or create a new one.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'signin' | 'signup'); resetForm(); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="space-y-4 mt-4">
            {/* Auth Method Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={authMethod === 'email' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => { setAuthMethod('email'); resetForm(); }}
              >
                Email
              </Button>
              <Button
                type="button"
                variant={authMethod === 'phone' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => { setAuthMethod('phone'); resetForm(); }}
              >
                Phone
              </Button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {authMethod === 'email' ? (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={otpSent ? handlePhoneVerifyOTP : handlePhoneRequestOTP} className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-phone">Phone Number</Label>
                      <Input
                        id="signin-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your phone number with country code (e.g., +1234567890)
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-otp">Verification Code</Label>
                      <Input
                        id="signin-otp"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                      >
                        Change Number
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup" className="space-y-4 mt-4">
            {/* Auth Method Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={authMethod === 'email' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => { setAuthMethod('email'); resetForm(); }}
              >
                Email
              </Button>
              <Button
                type="button"
                variant={authMethod === 'phone' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => { setAuthMethod('phone'); resetForm(); }}
              >
                Phone
              </Button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {authMethod === 'email' ? (
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            ) : (
              <form onSubmit={otpSent ? handlePhoneVerifyOTP : handlePhoneRequestOTP} className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone Number</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your phone number with country code (e.g., +1234567890)
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-otp">Verification Code</Label>
                      <Input
                        id="signup-otp"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setOtpSent(false); setOtp(''); }}
                      >
                        Change Number
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOpenChange(false)}
          >
            Back to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

