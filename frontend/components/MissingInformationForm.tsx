'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Call, VoiceType } from '@/lib/types';

interface MissingInformationFormProps {
  call: Call;
  missingInfo: string[];
}

export function MissingInformationForm({ call, missingInfo }: MissingInformationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data with empty values for each missing info item
  const initializeFormData = () => {
    const data: Record<string, string> = {};
    missingInfo.forEach((info) => {
      data[info] = '';
    });
    return data;
  };

  const [formFields, setFormFields] = useState<Record<string, string>>(initializeFormData());

  const handleInputChange = (key: string, value: string) => {
    setFormFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate that all fields are filled
    const emptyFields = missingInfo.filter((info) => !formFields[info]?.trim());
    if (emptyFields.length > 0) {
      setError(`Please fill in all required information: ${emptyFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    try {
      // Format the additional information for the new call
      const additionalInfo = missingInfo
        .map((info) => `${info}: ${formFields[info]}`)
        .join('\n');

      // Create new call with original purpose + additional instructions including the new info
      const newAdditionalInstructions = call.additional_instructions
        ? `${call.additional_instructions}\n\nAdditional Information Provided:\n${additionalInfo}`
        : `Additional Information Provided:\n${additionalInfo}`;

      const response = await api.createCall({
        phone_number: call.phone_number,
        purpose: call.purpose,
        voice_preference: (call.voice_preference || 'professional_female') as VoiceType,
        additional_instructions: newAdditionalInstructions,
      });

      if (response.success) {
        // Navigate to the new call detail page
        router.push(`/call/${response.call.id}`);
      } else {
        setError('Failed to create follow-up call. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create follow-up call');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertCircle className="h-5 w-5" />
          Additional Information Required
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-orange-800">
            The customer service representative requested the following information that wasn't available during the call. Please provide it below to make a follow-up call.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {missingInfo.map((info) => (
              <div key={info} className="space-y-2">
                <Label htmlFor={info} className="text-sm font-medium text-gray-700">
                  {info.charAt(0).toUpperCase() + info.slice(1)}
                </Label>
                <Input
                  id={info}
                  value={formFields[info] || ''}
                  onChange={(e) => handleInputChange(info, e.target.value)}
                  placeholder={`Enter ${info.toLowerCase()}`}
                  required
                  className="bg-white"
                />
              </div>
            ))}

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Call...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Again with This Information
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

