"use client";

import React, { useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import { useTracking } from "@/lib/analytics/tracker";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { CONTACT } from "@/features/storefront/content";

export default function Contact() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<"Residential" | "Commercial" | "Product Inquiry">("Residential");
  const [message, setMessage] = useState("");

  const { track } = useTracking();
  const submitInquiryMutation = trpc.commerce.submitInquiry.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      await submitInquiryMutation.mutateAsync({
        firstName,
        lastName,
        email,
        category,
        message,
      });
      toast.success("Inquiry submitted successfully!", { description: "Our design consultants will respond within 24 hours." });
      // Fired only after the inquiry is actually stored — a failed submit is
      // not a lead, and counting it would inflate every campaign's cost per lead.
      track("lead", { contentName: "Contact enquiry", contentCategory: category });
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Failed to submit inquiry. Please try again.");
    }
  };

  return (
    <StoreLayout>
      <div className="bg-[#E6E0D5]/20 py-16 border-b border-[#E6E0D5]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#8C7A6B] mb-2 block">Get in Touch</span>
          <h1 className="font-serif text-4xl md:text-5xl font-light tracking-wide mb-4">Connect With Us</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Whether you are curating a single piece or outfitting an entire space, our design consultants are ready to assist you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Showroom & Contact Info */}
        <div className="space-y-8">
          <h2 className="font-serif text-3xl font-light">Canadian Headquarters & Showroom</h2>
          <div className="space-y-6 text-sm">
            <div className="flex items-start gap-4">
              <MapPin size={20} className="text-[#8C7A6B] mt-1 shrink-0" />
              <div>
                <p className="font-medium">Showroom Location</p>
                <address className="not-italic text-muted-foreground">
                  {CONTACT.address.oneLine}
                  <br />
                  {CONTACT.address.country}
                </address>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone size={20} className="text-[#8C7A6B] mt-1 shrink-0" />
              <div>
                <p className="font-medium">Direct Line</p>
                {/* A phone number on a page is a tap target on a phone. */}
                <a href={CONTACT.phone.href} className="text-muted-foreground hover:text-[#8C7A6B]">
                  {CONTACT.phone.label}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail size={20} className="text-[#8C7A6B] mt-1 shrink-0" />
              <div>
                <p className="font-medium">Email Inquiry</p>
                <a href={CONTACT.email.href} className="text-muted-foreground hover:text-[#8C7A6B]">
                  {CONTACT.email.label}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock size={20} className="text-[#8C7A6B] mt-1 shrink-0" />
              <div>
                <p className="font-medium">Showroom Hours</p>
                <dl className="text-muted-foreground">
                  {CONTACT.hours.map((slot) => (
                    <div key={slot.days} className="flex gap-2">
                      <dt>{slot.days}:</dt>
                      <dd>{slot.time}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        <div className="bg-white border border-[#E6E0D5] p-8 md:p-12 shadow-sm">
          <h2 className="font-serif text-2xl font-light mb-6">Send an Inquiry</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase">First Name *</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="rounded-none border-[#E6E0D5]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase">Last Name *</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="rounded-none border-[#E6E0D5]" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest uppercase">Email Address *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-none border-[#E6E0D5]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest uppercase">Nature of Inquiry *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full border border-[#E6E0D5] p-3 text-sm bg-transparent rounded-none focus:outline-none focus:border-[#1C1A17]"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Product Inquiry">Product Inquiry</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest uppercase">Message *</label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required className="rounded-none border-[#E6E0D5]" />
            </div>

            <Button type="submit" disabled={submitInquiryMutation.isPending} aria-busy={submitInquiryMutation.isPending} className="w-full bg-[#1C1A17] text-white rounded-none py-4 uppercase tracking-widest text-xs hover:bg-[#333] disabled:cursor-wait disabled:opacity-60">
              {submitInquiryMutation.isPending ? "Sending inquiry…" : "Send Inquiry"}
            </Button>
          </form>
        </div>
      </div>
    </StoreLayout>
  );
}