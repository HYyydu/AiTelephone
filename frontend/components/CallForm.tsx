'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { VoiceType } from '@/lib/types';

const formSchema = z.object({
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g., +1234567890)'),
  purpose: z.string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(500, 'Purpose must be less than 500 characters'),
  voice_preference: z.enum(['professional_female', 'professional_male', 'friendly_female', 'friendly_male'] as const),
  additional_instructions: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CallFormProps {
  onSuccess?: () => void;
}

export function CallForm({ onSuccess }: CallFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone_number: '',
      purpose: '',
      voice_preference: 'professional_female',
      additional_instructions: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.createCall({
        phone_number: values.phone_number,
        purpose: values.purpose,
        voice_preference: values.voice_preference as VoiceType,
        additional_instructions: values.additional_instructions,
      });

      if (response.success) {
        setSuccess('Call initiated successfully! 🎉');
        form.reset();
        
        if (onSuccess) {
          setTimeout(onSuccess, 1000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create call');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Phone className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">Make a New Call</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the phone number in international format
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose/Goal</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Customer wants to return strawberries purchased yesterday due to quality issues. Process return and schedule pickup."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe what you want the AI to accomplish in this call
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voice_preference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voice</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="professional_female">Professional Female</SelectItem>
                    <SelectItem value="professional_male">Professional Male</SelectItem>
                    <SelectItem value="friendly_female">Friendly Female</SelectItem>
                    <SelectItem value="friendly_male">Friendly Male</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="additional_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Be empathetic, offer compensation if needed..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Any specific instructions for how the AI should handle the call
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">❌ {error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initiating Call...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Start Call
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

