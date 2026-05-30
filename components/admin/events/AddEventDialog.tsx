"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/utils";

const eventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  event_date: z.string().min(1, "Event date is required"),
  is_active: z.boolean(),
  is_ticketed: z.boolean(),
  ticket_price: z.string().optional(),
  ticket_capacity: z.string().optional(),
  payment_instructions: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export function AddEventDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>("");

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      location: "",
      event_date: "",
      is_active: true,
      is_ticketed: false,
      ticket_price: undefined,
      ticket_capacity: undefined,
      payment_instructions: "",
    },
  });

  const isTicketed = form.watch("is_ticketed");

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleQrImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setQrPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: EventFormValues) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("slug", data.slug);
      if (data.description) formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("event_date", data.event_date);
      formData.append("is_active", String(data.is_active));
      formData.append("is_ticketed", String(data.is_ticketed));
      if (data.is_ticketed) {
        if (data.ticket_price) formData.append("ticket_price", data.ticket_price);
        if (data.ticket_capacity) formData.append("ticket_capacity", data.ticket_capacity);
        if (data.payment_instructions) formData.append("payment_instructions", data.payment_instructions);
        if (qrImage) formData.append("payment_qr", qrImage);
      }
      if (bannerImage) formData.append("banner_image", bannerImage);

      const response = await fetch("/api/events/create", { method: "POST", body: formData });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create event");
      }

      toast.success("Event created successfully");
      form.reset();
      setBannerImage(null);
      setBannerPreview("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
          <DialogDescription>
            Create a new F1 event. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Monaco GP Watch Party"
                      onChange={(e) => {
                        field.onChange(e);
                        form.setValue("slug", slugify(e.target.value));
                      }}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="monaco-gp-watch-party" disabled={loading} />
                  </FormControl>
                  <FormDescription>Auto-generated from title</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Kathmandu, Nepal" disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Event details..." disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Banner Image (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input type="file" accept="image/*" onChange={handleBannerImageChange} disabled={loading} />
                  {bannerPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerPreview} alt="Banner preview" className="h-32 w-full object-cover rounded border" />
                  )}
                </div>
              </FormControl>
              <FormDescription>Event banner image (max 5MB)</FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Show event on storefront</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Ticketing toggle */}
            <FormField
              control={form.control}
              name="is_ticketed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Ticket Booking</FormLabel>
                    <FormDescription>Allow customers to book tickets for this event</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Ticket fields — shown only when ticketing is enabled */}
            {isTicketed && (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-semibold">Ticket Settings</p>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ticket_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (NPR)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0 for free"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticket_capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Max seats"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormDescription>Leave blank for unlimited</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="payment_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., Transfer to eSewa 98XXXXXXXX (Name), then upload screenshot below."
                          disabled={loading}
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>Shown to customers on the booking page</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Payment QR Code (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input type="file" accept="image/*" onChange={handleQrImageChange} disabled={loading} />
                      {qrPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrPreview} alt="Payment QR preview" className="h-40 w-40 object-contain rounded border bg-white p-1" />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Upload your eSewa / Khalti / bank QR — shown to customers during booking</FormDescription>
                </FormItem>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
