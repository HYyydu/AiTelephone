import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Clock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface SavingsTrackerProps {
  monthlyRefunds: number;
  timeSavedThisMonth: string;
  totalRefunds: number;
  totalTimeSaved: string;
}

export const SavingsTracker = ({ 
  monthlyRefunds, 
  timeSavedThisMonth, 
  totalRefunds, 
  totalTimeSaved 
}: SavingsTrackerProps) => {
  const { isAuthenticated } = useAuth();
  
  // Show zeros for anonymous users
  const displayMonthlyRefunds = isAuthenticated ? monthlyRefunds : 0;
  const displayTimeSavedThisMonth = isAuthenticated ? timeSavedThisMonth : '0h 0m';
  const displayTotalRefunds = isAuthenticated ? totalRefunds : 0;
  const displayTotalTimeSaved = isAuthenticated ? totalTimeSaved : '0h 0m';

  return (
    <Card className="shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Savings & Time Tracker</h3>
              {!isAuthenticated ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Login to see your statistics</span>
                  <Link 
                    href="/auth" 
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">
                    Refunds: <span className="font-semibold text-blue-600">${displayMonthlyRefunds.toFixed(2)}</span> this month
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Time saved: <span className="font-semibold text-indigo-600">{displayTimeSavedThisMonth}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">All-time</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-blue-600">${displayTotalRefunds.toFixed(2)}</span>
              <span className="text-muted-foreground mx-2">·</span>
              <span className="font-semibold text-indigo-600">{displayTotalTimeSaved}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

