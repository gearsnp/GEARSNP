"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil } from "lucide-react";
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
  ticket_promo_enabled: z.boolean(),
  ticket_promo_discount: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EditEventDialogProps {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    location: string | null;
    event_date: string;
    is_active: boolean;
    banner_image_url: string | null;
    is_ticketed: boolean;
    ticket_price: number | null;
    ticket_capacity: number | null;
    payment_instructions: string | null;
    payment_qr_url: string | null;
    ticket_promo_enabled: boolean;
    ticket_promo_discount: number | null;
  };
}

export function EditEventDialog({ event }: EditEventDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>(event.banner_image_url || "");
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>(event.payment_qr_url || "");

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event.title,
      slug: event.slug,
      description: event.description || "",
      location: event.location || "",
      event_date: formatDateForInput(event.event_date),
      is_active: event.is_active,
      is_ticketed: event.is_ticketed,
      ticket_price: event.ticket_price !== null ? String(event.ticket_price) : "",
      ticket_capacity: event.ticket_capacity !== null ? String(event.ticket_capacity) : "",
      payment_instructions: event.payment_instructions || "",
      ticket_promo_enabled: event.ticket_promo_enabled ?? false,
      ticket_promo_discount: event.ticket_promo_discount !== null ? String(event.ticket_promo_discount) : "100",
    },
  });

  const isTicketed = useWatch({ control: form.control, name: "is_ticketed" });
  const promoEnabled = useWatch({ control: form.control, name: "ticket_promo_enabled" });

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
        formData.append("ticket_promo_enabled", String(data.ticket_promo_enabled));
        if (data.ticket_promo_enabled && data.ticket_promo_discount) {
          formData.append("ticket_promo_discount", data.ticket_promo_discount);
        }
      }
      if (bannerImage) formData.append("banner_image", bannerImage);

      const response = await fetch(`/api/events/${event.id}`, { method: "PATCH", body: formData });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update event");
      }

      toast.success("Event updated successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update event details. Click save when you&apos;re done.
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
                  <FormDescription>URL-friendly version of title</FormDescription>
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
              <FormLabel>Banner Image</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input type="file" accept="image/*" onChange={handleBannerImageChange} disabled={loading} />
                  {bannerPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerPreview} alt="Banner preview" className="h-32 w-full object-cover rounded border" />
                  )}
                </div>
              </FormControl>
              <FormDescription>Upload new image to replace current one</FormDescription>
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
                        <img src={qrPreview} alt="Payment QR" className="h-40 w-40 object-contain rounded border bg-white p-1" />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Upload your eSewa / Khalti / bank QR — shown to customers during booking</FormDescription>
                </FormItem>

                <div className="border-t border-border pt-4 space-y-3">
                  <FormField
                    control={form.control}
                    name="ticket_promo_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Give promo code with each ticket</FormLabel>
                          <FormDescription>Sends a discount code to each ticket holder after approval</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {promoEnabled && (
                    <FormField
                      control={form.control}
                      name="ticket_promo_discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Amount (NPR)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={1} step={1} placeholder="100" disabled={loading} />
                          </FormControl>
                          <FormDescription>Fixed NPR amount off their next order · valid 30 days · single use</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
