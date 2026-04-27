import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageWardens, manageHostels } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';

interface Hostel {
  id: number;
  name: string;
}

interface Warden {
  id: number;
  user: number;
  name: string;
  hostel: number;
  hostel_name?: string;
}

const WardenManagement: React.FC = () => {
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarden, setEditingWarden] = useState<Warden | null>(null);
  const [formData, setFormData] = useState({
    user: 0,
    name: '',
    hostel: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWardens();
    fetchHostels();
  }, []);

  const fetchWardens = async () => {
    const response = await manageWardens();
    if (response.success && response.results) {
      setWardens(response.results);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to fetch wardens",
      });
    }
  };

  const fetchHostels = async () => {
    const response = await manageHostels();
    if (response.success && response.results) {
      setHostels(response.results);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to fetch hostels",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingWarden ? 'PUT' : 'POST';
    const response = await manageWardens(formData, editingWarden?.id, method);

    if (response.success) {
      fetchWardens();
      setIsDialogOpen(false);
      setEditingWarden(null);
      setFormData({ user: 0, name: '', hostel: 0 });
      toast({
        title: "Success",
        description: `Warden ${editingWarden ? 'updated' : 'created'} successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to save warden",
      });
    }
  };

  const handleEdit = (warden: Warden) => {
    setEditingWarden(warden);
    setFormData({
      user: warden.user,
      name: warden.name,
      hostel: warden.hostel
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this warden?')) {
      const response = await manageWardens(undefined, id, 'DELETE');
      if (response.success) {
        fetchWardens();
        toast({
          title: "Success",
          description: "Warden deleted successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to delete warden",
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Warden Management
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingWarden(null);
                setFormData({ user: 0, name: '', hostel: 0 });
              }}>
                Add Warden
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingWarden ? 'Edit Warden' : 'Add Warden'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hostel">Hostel</Label>
                  <Select value={formData.hostel.toString()} onValueChange={(value) => setFormData({ ...formData, hostel: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hostels.map((hostel) => (
                        <SelectItem key={hostel.id} value={hostel.id.toString()}>
                          {hostel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit">{editingWarden ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Hostel</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wardens.map((warden) => (
              <TableRow key={warden.id}>
                <TableCell>{warden.name}</TableCell>
                <TableCell>{warden.hostel_name || warden.hostel}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(warden)} className="mr-2">
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(warden.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WardenManagement;