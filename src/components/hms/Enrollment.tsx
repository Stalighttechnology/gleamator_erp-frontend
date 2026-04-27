import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../../hooks/use-toast';

const Enrollment: React.FC = () => {
  const [enrollmentType, setEnrollmentType] = useState<'warden' | 'caretaker'>('warden');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    experience: '',
    department: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = enrollmentType === 'warden' 
        ? '/api/hms/wardens/' 
        : '/api/hms/caretakers/';

      const payload = enrollmentType === 'warden'
        ? {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            designation: formData.designation,
            experience: parseInt(formData.experience) || 0,
            department: formData.department,
          }
        : {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            experience: parseInt(formData.experience) || 0,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${enrollmentType === 'warden' ? 'Warden' : 'Caretaker'} enrolled successfully`,
        });
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          designation: '',
          experience: '',
          department: '',
          address: '',
        });
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.detail || `Failed to enroll ${enrollmentType}`,
        });
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while enrolling",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <Label htmlFor="enrollment-type" className="mb-3 block">Select Enrollment Type</Label>
            <Select value={enrollmentType} onValueChange={(value: any) => setEnrollmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warden">Enroll Warden</SelectItem>
                <SelectItem value="caretaker">Enroll Caretaker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div>
                <Label htmlFor="experience">Experience (Years)</Label>
                <Input
                  id="experience"
                  name="experience"
                  type="number"
                  value={formData.experience}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Warden-specific Fields */}
            {enrollmentType === 'warden' && (
              <div className="space-y-4 p-4 border-t pt-6 mt-6">
                <h3 className="font-semibold text-primary">Warden Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Warden"
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="e.g., Administration"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Caretaker-specific Fields */}
            {enrollmentType === 'caretaker' && (
              <div className="space-y-4 p-4 border-t pt-6 mt-6">
                <h3 className="font-semibold text-primary">Caretaker Details</h3>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Full address"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800"
                    rows={4}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? 'Enrolling...' : `Enroll ${enrollmentType === 'warden' ? 'Warden' : 'Caretaker'}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Enrollment;
