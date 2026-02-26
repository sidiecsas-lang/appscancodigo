import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL, getToken, formatCurrency, LOGO_URL } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Camera, X, Package, Barcode, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  // Get available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      })
      .catch((err) => {
        console.log('Error getting cameras:', err);
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setCameraError(null);
    
    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("scanner-container");
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Try to use selected camera or environment facing mode
      const cameraConfig = selectedCamera 
        ? { deviceId: { exact: selectedCamera } }
        : { facingMode: "environment" };

      await html5QrcodeRef.current.start(
        cameraConfig,
        config,
        onScanSuccess,
        () => {} // Silent scan errors
      );
      
      setScanning(true);
      toast.success('Cámara activada');
      
    } catch (err) {
      console.error('Scanner error:', err);
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
        errorMessage = 'Permiso de cámara denegado. Por favor habilita el acceso a la cámara en la configuración de tu navegador.';
      } else if (err.toString().includes('NotFoundError')) {
        errorMessage = 'No se encontró ninguna cámara en este dispositivo.';
      } else if (err.toString().includes('NotReadableError')) {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      } else if (err.toString().includes('OverconstrainedError')) {
        errorMessage = 'No se pudo configurar la cámara con los parámetros solicitados.';
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        if (state === 2) { // SCANNING state
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        console.log('Stop scanner error:', err);
      }
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    // Stop scanner first
    await stopScanner();
    
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/products/scan/${decodedText}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProduct(response.data);
      setShowModal(true);
      toast.success('¡Producto encontrado!');
      
      // Log the scan silently
      await axios.post(`${API_URL}/scan-logs`, 
        { product_id: response.data.id },
        { headers: { Authorization: `Bearer ${token}` }}
      ).catch(() => {});
      
    } catch (error) {
      toast.error('Producto no encontrado en el catálogo');
      // Restart scanner after error
      setTimeout(() => startScanner(), 1500);
    }
  };

  const handleScanAnother = () => {
    setShowModal(false);
    setProduct(null);
    setTimeout(() => startScanner(), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <img src={LOGO_URL} alt="Manrique" className="h-10" data-testid="scanner-logo" />
          <h1 className="text-lg font-serif text-[#1A1A1A]">Escáner</h1>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {!scanning ? (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-[#D4A5A5]" />
              </div>
              <h2 className="text-xl font-serif text-[#1A1A1A] mb-2">
                Escanear Producto
              </h2>
              <p className="text-gray-500 mb-6">
                Apunta la cámara hacia el código de barras o QR del producto
              </p>
              
              {/* Camera Error Message */}
              {cameraError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700">{cameraError}</p>
                      <p className="text-xs text-red-500 mt-2">
                        En iOS Safari: Configuración → Safari → Cámara → Permitir
                        <br />
                        En Android Chrome: Toca el ícono de candado junto a la URL → Permisos → Cámara
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera selector if multiple cameras */}
              {cameras.length > 1 && (
                <div className="mb-4">
                  <label className="text-sm text-gray-600 block mb-2">Seleccionar cámara:</label>
                  <select
                    value={selectedCamera || ''}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="camera-select"
                  >
                    {cameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label || `Cámara ${camera.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <Button 
                onClick={startScanner}
                className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium px-8 h-12"
                data-testid="start-scanner-button"
              >
                <Camera className="mr-2 h-5 w-5" />
                Iniciar Escáner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <div 
                  id="scanner-container" 
                  ref={scannerRef}
                  className="w-full min-h-[400px]"
                  data-testid="scanner-container"
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-[#D4A5A5] rounded-lg relative">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#D4A5A5] rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#D4A5A5] rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#D4A5A5] rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#D4A5A5] rounded-br-lg"></div>
                  </div>
                </div>
                <Button
                  onClick={stopScanner}
                  variant="secondary"
                  className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white shadow-lg"
                  data-testid="stop-scanner-button"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/50 text-white text-sm px-4 py-2 rounded-full">
                    Apunta al código de barras
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
            Instrucciones
          </h3>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">1</span>
              </div>
              <p className="text-sm text-gray-600">Presiona "Iniciar Escáner" y permite el acceso a la cámara</p>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">2</span>
              </div>
              <p className="text-sm text-gray-600">Apunta hacia el código de barras o QR del producto</p>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">3</span>
              </div>
              <p className="text-sm text-gray-600">Los detalles del producto aparecerán automáticamente</p>
            </div>
          </div>
        </div>
      </main>

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              Información del Producto
            </DialogTitle>
          </DialogHeader>
          
          {product && (
            <div className="space-y-4 py-4">
              {/* Product Name */}
              <div className="text-center">
                <h3 className="font-medium text-[#1A1A1A] text-lg leading-tight" data-testid="product-name">
                  {product.name}
                </h3>
              </div>

              {/* Codes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Package size={12} />
                    Código Interno
                  </div>
                  <p className="font-medium text-[#1A1A1A]" data-testid="product-internal-code">
                    {product.internal_code}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Barcode size={12} />
                    Código de Barras
                  </div>
                  <p className="font-medium text-[#1A1A1A] text-sm" data-testid="product-barcode">
                    {product.barcode}
                  </p>
                </div>
              </div>

              {/* Prices */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Tag size={14} />
                  Precios
                </h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between bg-[#D4A5A5]/5 p-3 rounded-lg border border-[#D4A5A5]/20">
                    <span className="text-sm text-gray-600">Precio 1 (Bulto)</span>
                    <Badge variant="outline" className="text-[#D4A5A5] border-[#D4A5A5]" data-testid="product-price-1">
                      {formatCurrency(product.price_1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Precio 2 (Mayor 12+)</span>
                    <Badge variant="secondary" data-testid="product-price-2">
                      {formatCurrency(product.price_2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Precio 3 (1-11 uds)</span>
                    <Badge variant="secondary" data-testid="product-price-3">
                      {formatCurrency(product.price_3)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                  data-testid="close-product-modal"
                >
                  Cerrar
                </Button>
                <Button 
                  className="flex-1 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]"
                  onClick={handleScanAnother}
                  data-testid="scan-another-button"
                >
                  Escanear Otro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
