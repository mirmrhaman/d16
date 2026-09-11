import React, { useState } from "react";
import { useSearchParams } from 'react-router-dom';
import { IS_DEMO } from '@/api/transport';
import { base44 } from "@/api/base44Client";
import { contactInfoClient } from "@/api/contactInfoClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

const countryCodes = [
  { code: "+880", country: "Bangladesh" },
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "India" },
  { code: "+92", country: "Pakistan" },
  { code: "+971", country: "UAE" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+60", country: "Malaysia" },
  { code: "+65", country: "Singapore" },
  { code: "+61", country: "Australia" },
];

export default function Contact() {
  const [searchParams] = useSearchParams();
  const conceptTitle = searchParams.get('conceptTitle') || searchParams.get('serviceTitle') || '';
  const [countryCode, setCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    project_type: '',
    location: '',
    budget: '',
    message: conceptTitle ? `I am interested in: ${conceptTitle}` : '',
    preferred_date: ''
  });

  const [submitted, setSubmitted] = useState(false);

  // Fetch contact info
  const { data: contactInfo = [] } = useQuery({
    queryKey: ['contactInfo'],
    queryFn: () => contactInfoClient.list()
  });

  const contact = contactInfo[0] || {
    phone: '+880 1711-288948',
    email: 'info@d16interior.com',
    address: 'Dhaka, Bangladesh',
    working_hours: 'Mon - Sat: 9:00 AM - 6:00 PM'
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Consultation.create(data),
    onSuccess: () => {
      setSubmitted(true);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        project_type: '',
        location: '',
        budget: '',
        message: '',
        preferred_date: ''
      });
      setPhoneNumber('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullPhone = `${countryCode} ${phoneNumber}`;
    createMutation.mutate({ ...formData, phone: fullPhone });
  };

  const contactInfoItems = [
    {
      icon: Phone,
      title: "Phone",
      details: contact.phone,
      link: `tel:${contact.phone.replace(/\s/g, '')}`
    },
    {
      icon: Mail,
      title: "Email",
      details: contact.email,
      link: `mailto:${contact.email}`
    },
    {
      icon: MapPin,
      title: "Location",
      details: contact.address || "Dhaka, Bangladesh"
    },
    {
      icon: Clock,
      title: "Working Hours",
      details: contact.working_hours || "Mon - Sat: 9:00 AM - 6:00 PM"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white px-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl md:text-2xl text-gray-200">
              Investing in interior design is an investment in your well-being and happiness
            </p>
          </motion.div>
        </div>
      </div>

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="shadow-2xl">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-bold text-[var(--primary)] mb-6">
                    Get in Touch
                  </h2>
                  <p className="text-gray-600 mb-8">
                    We'd love to help you create a space that feels like home. Fill out the form, 
                    and we will be in touch soon!
                  </p>

                  {submitted && (
                    <div role="status" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                      Thank you! Your consultation request has been saved. Our team can now review it.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {IS_DEMO && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Preview only: this form cannot send requests yet. Please do not enter confidential information.</p>}
                    {createMutation.error && <p role="alert" className="text-red-700">{createMutation.error.message}</p>}
                    {conceptTitle && <p className="rounded-lg bg-slate-50 p-3 text-sm">Selected inspiration: <strong>{conceptTitle}</strong></p>}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Name *</Label>
                        <Input
                          id="full_name"
                          required
                          value={formData.full_name}
                          onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="flex gap-2">
                          <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map((item) => (
                                <SelectItem key={item.code} value={item.code}>
                                  {item.code} {item.country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            id="phone"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="1711288948"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="project_type">Project Type *</Label>
                        <Select id="project_type" required value={formData.project_type} onValueChange={(value) => setFormData({...formData, project_type: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="residential">Residential</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="office">Office</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder="Project location"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget</Label>
                      <Input
                        id="budget"
                        value={formData.budget}
                        onChange={(e) => setFormData({...formData, budget: e.target.value})}
                        placeholder="e.g., 5-10 Lakh"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferred_date">Preferred consultation date</Label>
                      <Input id="preferred_date" type="date" value={formData.preferred_date} onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        placeholder="Tell us about your project..."
                        rows={4}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] py-6 text-lg"
                      disabled={createMutation.isPending || IS_DEMO}
                    >
                      {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-[var(--primary)] mb-4">
                  For New Projects
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Submit the project request form or schedule a consultation by calling us or 
                  sending an email. We'll get back to you shortly!
                </p>
              </div>

              <div className="space-y-6">
                {contactInfoItems.map((info, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-[var(--accent)] bg-opacity-20 rounded-lg">
                          <info.icon className="text-[var(--primary)]" size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--primary)] mb-1">{info.title}</h3>
                          {info.link ? (
                            <a href={info.link} className="text-gray-600 hover:text-[var(--accent)] transition-colors">
                              {info.details}
                            </a>
                          ) : (
                            <p className="text-gray-600">{info.details}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-4">Visit Our Office</h3>
                  <p className="text-gray-200 mb-6">
                    We're located in the heart of Dhaka. Schedule a visit to our office to 
                    discuss your project in detail and explore our design portfolio.
                  </p>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border border-white px-5 py-3 hover:bg-white hover:text-[var(--primary)]">Get Directions</a>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
