import React, { useState, useEffect } from 'react';
import { API_URL, getToken, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Users, Plus, Pencil, Trash2, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    user_code: '',
    password: '',
    role: 'empleado'
  });

  const fetchUsers = async () => {
    const token = getToken();
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setForm({
      user_code: '',
      password: '',
      role: 'empleado'
    });
    setEditingUser(null);
  };

  const openEditForm = (user) => {
    setForm({
      user_code: user.user_code,
      password: '',
      role: user.role
    });
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();

    try {
      if (editingUser) {
        const updateData = { role: form.role };
        if (form.password) {
          updateData.password = form.password;
        }
        await axios.put(`${API_URL}/users/${editingUser.id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Usuario actualizado');
      } else {
        if (!form.password) {
          toast.error('La contraseña es requerida');
          return;
        }
        await axios.post(`${API_URL}/users`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Usuario creado');
      }
      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (user) => {
    if (user.user_code === 'admin') {
      toast.error('No se puede eliminar el usuario admin');
      return;
    }
    if (!window.confirm(`¿Eliminar usuario "${user.user_code}"?`)) return;

    const token = getToken();
    try {
      await axios.delete(`${API_URL}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-[#1A1A1A]">Usuarios</h1>
            <p className="text-gray-500 mt-1">Gestión de accesos a la aplicación</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]"
            data-testid="add-user-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users size={18} />
                Lista de Usuarios
              </span>
              <Badge variant="secondary">{users.length} usuarios</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">Código</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Rol</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Fecha de Creación</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                      Cargando usuarios...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                      No hay usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50" data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-medium">{user.user_code}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-[#D4A5A5] text-[#1A1A1A]' : ''}
                        >
                          {user.role === 'admin' ? (
                            <span className="flex items-center gap-1">
                              <Shield size={12} />
                              Admin
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              Empleado
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditForm(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          {user.user_code !== 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(user)}
                              data-testid={`delete-user-${user.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_code">Código de Usuario</Label>
                <Input
                  id="user_code"
                  value={form.user_code}
                  onChange={(e) => setForm({ ...form, user_code: e.target.value })}
                  disabled={!!editingUser}
                  required
                  data-testid="form-user-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingUser}
                  data-testid="form-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                  <SelectTrigger data-testid="form-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]" data-testid="form-submit">
                  {editingUser ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
