"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  X,
  Plus,
  Search,
  ShoppingBag,
  Wifi,
  CreditCard,
  Package,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import { VoiceType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Vendor to phone number mapping for auto-call feature
const VENDOR_PHONE_NUMBERS: Record<string, string> = {
  "Whole Foods": "+18059782769",
  Amazon: "+19452644540",
};

// Shared AI voice and behavior settings for all vendors
const DEFAULT_VOICE_PREFERENCE: VoiceType = "professional_female";

const popularVendors = [
  {
    name: "Whole Foods",
    category: "Grocery",
    icon: ShoppingBag,
    color: "bg-green-500",
  },
  { name: "Amazon", category: "Retail", icon: Package, color: "bg-orange-500" },
  { name: "Spectrum", category: "Internet", icon: Wifi, color: "bg-blue-500" },
  {
    name: "Chase Bank",
    category: "Banking",
    icon: CreditCard,
    color: "bg-blue-600",
  },
];

const step2Schema = z.object({
  issueType: z.string().min(1, "Please select an issue type"),
  orderNumber: z.string().optional(),
  desiredOutcome: z
    .string()
    .min(10, "Please describe your desired outcome (at least 10 characters)")
    .max(500, "Desired outcome must be less than 500 characters"),
});

type Step2FormValues = z.infer<typeof step2Schema>;

interface NewTaskDialogProps {
  onCreateTask?: (task: any) => void;
  vendor?: string;
  onSuccess?: () => void;
}

export function NewTaskDialog({
  onCreateTask,
  vendor: propVendor = "Whole Foods",
  onSuccess,
}: NewTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>(propVendor);
  const [searchQuery, setSearchQuery] = useState<string>(propVendor);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      issueType: "",
      orderNumber: "",
      desiredOutcome: "",
    },
  });

  const issueTypes = [
    "Return/Refund",
    "Order Issue",
    "Delivery Problem",
    "Product Quality",
    "Billing Question",
    "Account Issue",
    "Other",
  ];

  const handleNext = async () => {
    if (currentStep === 2) {
      // Validate step 2 before proceeding
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 1) {
      if (selectedVendor) {
        setCurrentStep(2);
      }
    }
  };

  const filteredVendors = popularVendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (values: Step2FormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build the purpose/instruction from the form data
      const purpose = `Customer needs help with ${selectedVendor}. Issue Type: ${
        values.issueType
      }. ${
        values.orderNumber ? `Order Number: ${values.orderNumber}. ` : ""
      }Desired Outcome: ${values.desiredOutcome}`;

      // If vendor has a configured phone number, automatically call it
      // All vendors use the same voice and AI settings for consistency
      const vendorPhoneNumber = VENDOR_PHONE_NUMBERS[selectedVendor];
      if (vendorPhoneNumber) {
        try {
          const response = await api.createCall({
            phone_number: vendorPhoneNumber,
            purpose: purpose,
            voice_preference: DEFAULT_VOICE_PREFERENCE,
            additional_instructions: `This is a support task for ${selectedVendor}. Please handle this call professionally and work towards the customer's desired outcome: ${values.desiredOutcome}`,
          });

          if (response.success) {
            form.reset();
            setCurrentStep(1);
            setOpen(false);

            if (onSuccess) {
              onSuccess();
            }
            return;
          }
        } catch (callError) {
          // If call fails, still allow task creation
          console.error("Call initiation failed:", callError);
          // Continue to create task anyway
        }
      }

      // For all vendors (including if Whole Foods call failed), create the task
      form.reset();
      setCurrentStep(1);
      setOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create task and initiate call"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setCurrentStep(1);
      setError(null);
      setSelectedVendor(propVendor);
      setSearchQuery(propVendor);
      setUploadedFiles([]);
      setOpen(false);
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ];

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(
          `File ${file.name} is not a supported format. Please use PNG, JPG, or PDF.`
        );
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6
          flex items-center
          rounded-full
          text-white font-medium text-base
          px-8 py-4
          transition-all duration-200
          border-0 select-none
          shadow-[0_2px_8px_rgba(37,99,235,0.25)]
          hover:shadow-[0_3px_12px_rgba(37,99,235,0.40)]
          active:scale-95
        "
        //"fixed bottom-6 right-6 rounded-full text-white px-100 py-4 text-base font-medium transition-all duration-200 border-0 hover:opacity-95"
        style={{
          background:
            "linear-gradient(to right, rgb(37, 99, 235), rgb(79, 70, 229))",
          minHeight: "56px",
          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 3px 10px rgba(37, 99, 235, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 2px 8px rgba(37, 99, 235, 0.25)";
        }}
      >
        <Plus className="w-6 h-6 mr-1.5" />
        New Task
      </Button>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose();
          } else {
            setOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>
                {currentStep === 3 ? "Review & Confirm" : "Create Support Task"}
              </span>
              <Badge variant="secondary" className="text-sm font-normal">
                Step {currentStep} of 3
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 && "Select the company you need help with"}
              {currentStep === 2 &&
                `What help do you need with ${selectedVendor}?`}
              {currentStep === 3 &&
                "Review your task details before submitting"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Step 1: Vendor Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-base font-medium mb-2 block">
                    Choose Vendor
                  </label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the company you need help with
                  </p>

                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for a vendor..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          // Auto-select if exact match
                          const match = popularVendors.find(
                            (v) =>
                              v.name.toLowerCase() ===
                              e.target.value.toLowerCase()
                          );
                          if (match) {
                            setSelectedVendor(match.name);
                          }
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {filteredVendors.map((v) => {
                        const Icon = v.icon;
                        const isSelected = selectedVendor === v.name;
                        return (
                          <Card
                            key={v.name}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isSelected
                                ? "ring-2 ring-blue-500 border-blue-500"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedVendor(v.name);
                              setSearchQuery(v.name);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 ${v.color} rounded-lg flex items-center justify-center`}
                                >
                                  <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-medium">{v.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {v.category}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNext}
                    disabled={!selectedVendor}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Issue Details */}
            {currentStep === 2 && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleNext)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="issueType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select issue type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {issueTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 113-1234567-8910112"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* File Upload Section */}
                  <div>
                    <FormLabel>Receipt or Order Details (Optional)</FormLabel>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload screenshots or photos to help us resolve your issue
                      faster
                    </p>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                      border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                      transition-colors
                      ${
                        isDragging
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }
                    `}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept =
                          "image/png,image/jpeg,image/jpg,application/pdf";
                        input.multiple = true;
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          handleFileSelect(target.files);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                          >
                            <span className="text-sm text-foreground truncate flex-1">
                              {file.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="desiredOutcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desired Outcome</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Full refund for damaged strawberries, no store credit"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Describe what you want to achieve from this support
                          interaction
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

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Vendor</h3>
                    <p className="text-muted-foreground">{selectedVendor}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Issue Type</h3>
                    <p className="text-muted-foreground">
                      {form.watch("issueType")}
                    </p>
                  </div>

                  {form.watch("orderNumber") && (
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Order Number</h3>
                      <p className="text-muted-foreground">
                        {form.watch("orderNumber")}
                      </p>
                    </div>
                  )}

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Desired Outcome</h3>
                    <p className="text-muted-foreground">
                      {form.watch("desiredOutcome")}
                    </p>
                  </div>

                  {VENDOR_PHONE_NUMBERS[selectedVendor] && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h3 className="font-semibold mb-2">Call Information</h3>
                      <p className="text-sm text-muted-foreground">
                        A call will be automatically initiated to{" "}
                        <strong>{VENDOR_PHONE_NUMBERS[selectedVendor]}</strong>{" "}
                        with your desired outcome.
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800">❌ {error}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Task & Calling...
                      </>
                    ) : (
                      "Create Task & Call"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
