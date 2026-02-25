import React, { useState, useEffect, useRef } from 'react';
import { API_URL, getToken, formatCurrency } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Package, Plus, Upload, Pencil, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    internal_code: '',
    barcode: '',
    name: '',
    price_1: '',
    price_2: '',
    price_3: ''
  });

  const fetchProducts = async () => {
    const token = getToken();
    try {
      const response = await axios.get(`${API_URL}/products`, {
        params: { search: searchTerm || undefined },
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm]);

  const resetForm = () => {
    setForm({
      internal_code: '',
      barcode: '',
      name: '',
      price_1: '',
      price_2: '',
      price_3: ''
    });
    setEditingProduct(null);
  };

  const openEditForm = (product) => {
    setForm({
      internal_code: product.internal_code,
      barcode: product.barcode,
      name: product.name,
      price_1: product.price_1.toString(),
      price_2: product.price_2.toString(),
      price_3: product.price_3.toString()
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();

    const data = {
      internal_code: form.internal_code,
      barcode: form.barcode,
      name: form.name,
      price_1: parseFloat(form.price_1) || 0,
      price_2: parseFloat(form.price_2) || 0,
      price_3: parseFloat(form.price_3) || 0
    };

    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Producto actualizado');
      } else {
        await axios.post(`${API_URL}/products`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Producto creado');
      }
      setShowForm(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar producto');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;

    const token = getToken();
    try {
      await axios.delete(`${API_URL}/products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/products/bulk-upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(`Carga completada: ${response.data.products_added} nuevos, ${response.data.products_updated} actualizados`);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error en la carga masiva');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-[#1A1A1A]">Productos</h1>
            <p className="text-gray-500 mt-1">Gestión del catálogo de productos</p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="file-upload-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="bulk-upload-button"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Cargando...' : 'Carga Masiva'}
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]"
              data-testid="add-product-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, código o código de barras..."
                className="pl-10 bg-gray-50/50"
                data-testid="product-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package size={18} />
                Catálogo
              </span>
              <Badge variant="secondary">{products.length} productos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="bg-gray-50/50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Código</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Nombre</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">P1 (Bulto)</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">P2 (12+)</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">P3 (1-11)</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                        Cargando productos...
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                        No hay productos
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-gray-50/50" data-testid={`product-row-${product.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{product.internal_code}</p>
                            <p className="text-xs text-gray-400">{product.barcode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <p className="text-sm truncate" title={product.name}>{product.name}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(product.price_1)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(product.price_2)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(product.price_3)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditForm(product)}
                              data-testid={`edit-product-${product.id}`}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(product)}
                              data-testid={`delete-product-${product.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Product Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="internal_code">Código Interno</Label>
                  <Input
                    id="internal_code"
                    value={form.internal_code}
                    onChange={(e) => setForm({ ...form, internal_code: e.target.value })}
                    required
                    data-testid="form-internal-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    required
                    data-testid="form-barcode"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  data-testid="form-name"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_1">Precio 1 (Bulto)</Label>
                  <Input
                    id="price_1"
                    type="number"
                    step="0.01"
                    value={form.price_1}
                    onChange={(e) => setForm({ ...form, price_1: e.target.value })}
                    required
                    data-testid="form-price-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_2">Precio 2 (12+)</Label>
                  <Input
                    id="price_2"
                    type="number"
                    step="0.01"
                    value={form.price_2}
                    onChange={(e) => setForm({ ...form, price_2: e.target.value })}
                    required
                    data-testid="form-price-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_3">Precio 3 (1-11)</Label>
                  <Input
                    id="price_3"
                    type="number"
                    step="0.01"
                    value={form.price_3}
                    onChange={(e) => setForm({ ...form, price_3: e.target.value })}
                    required
                    data-testid="form-price-3"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]" data-testid="form-submit">
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
