import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageHostels, manageWardens, manageCaretakers } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';

interface Warden {
  id: number;
  name: string;
}

interface Caretaker {
  id: number;
  name: string;
}

interface Hostel {
  id: number;
  name: string;
  gender: 'M' | 'F';
  warden: number | null;
  caretaker: number | null;
  warden_name?: string;
  caretaker_name?: string;
}

const HostelManagement: React.FC = () => {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M' as 'M' | 'F',
    warden: null as number | null,
    caretaker: null as number | null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchHostels();
    fetchWardens();
    fetchCaretakers();
  }, []);

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

  const fetchWardens = async () => {
    const response = await manageWardens();
    if (response.success && response.results) {
      setWardens(response.results);
    }
  };

  const fetchCaretakers = async () => {
    const response = await manageCaretakers();
    if (response.success && response.results) {
      setCaretakers(response.results);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingHostel ? 'PUT' : 'POST';
    const response = await manageHostels(formData, editingHostel?.id, method);

    if (response.success) {
      // Update local state instead of refetching
      const updatedHostel = response.data as Hostel | undefined;
      if (updatedHostel) {
        if (editingHostel) {
          // Update existing hostel
          setHostels(prevHostels =>
            prevHostels.map(hostel =>
              hostel.id === editingHostel.id ? updatedHostel : hostel
            )
          );
        } else {
          // Add new hostel
          setHostels(prevHostels => [...prevHostels, updatedHostel]);
        }
      }

      setIsDialogOpen(false);
      setEditingHostel(null);
      setFormData({ name: '', gender: 'M', warden: null, caretaker: null });
      toast({
        title: "Success",
        description: `Hostel ${editingHostel ? 'updated' : 'created'} successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to save hostel",
      });
    }
  };

  const handleEdit = (hostel: Hostel) => {
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name,
      gender: hostel.gender,
      warden: hostel.warden,
      caretaker: hostel.caretaker
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this hostel?')) {
      const response = await manageHostels(undefined, id, 'DELETE');
      if (response.success) {
        // Update local state instead of refetching
        setHostels(prevHostels => prevHostels.filter(hostel => hostel.id !== id));
        toast({
          title: "Success",
          description: "Hostel deleted successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to delete hostel",
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Hostel Management
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingHostel(null);
              setFormData({ name: '', gender: 'M', warden: null, caretaker: null });
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingHostel(null);
                setFormData({ name: '', gender: 'M', warden: null, caretaker: null });
              }} className="bg-primary hover:bg-primary/90">
                Add Hostel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingHostel ? 'Edit Hostel' : 'Add Hostel'}</DialogTitle>
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
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value: 'M' | 'F') => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="warden">Warden</Label>
                  <Select value={formData.warden?.toString() || 'unset'} onValueChange={(value) => setFormData({ ...formData, warden: value === 'unset' ? null : parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warden" />
                    </SelectTrigger>
                    <SelectContent>
                      {wardens.map((warden) => (
                        <SelectItem key={warden.id} value={warden.id.toString()}>
                          {warden.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="caretaker">Caretaker</Label>
                  <Select value={formData.caretaker?.toString() || 'unset'} onValueChange={(value) => setFormData({ ...formData, caretaker: value === 'unset' ? null : parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select caretaker" />
                    </SelectTrigger>
                    <SelectContent>
                      {caretakers.map((caretaker) => (
                        <SelectItem key={caretaker.id} value={caretaker.id.toString()}>
                          {caretaker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="bg-primary hover:bg-primary/90">{editingHostel ? 'Update' : 'Create'}</Button>
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
              <TableHead>Gender</TableHead>
              <TableHead>Warden</TableHead>
              <TableHead>Caretaker</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hostels.map((hostel) => {
              const wardenName = wardens.find(w => w.id === hostel.warden)?.name || '-';
              const caretakerName = caretakers.find(c => c.id === hostel.caretaker)?.name || '-';
              return (
                <TableRow key={hostel.id}>
                  <TableCell>{hostel.name}</TableCell>
                  <TableCell>{hostel.gender === 'M' ? 'Male' : 'Female'}</TableCell>
                  <TableCell>{wardenName}</TableCell>
                  <TableCell>{caretakerName}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(hostel)} className="mr-2">
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(hostel.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default HostelManagement;