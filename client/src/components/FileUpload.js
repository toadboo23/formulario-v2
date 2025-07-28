import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Upload, X, File, Download, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const FileUpload = forwardRef(({ incidenciaId, onFilesUploaded, existingFiles = [], canUpload = true }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState(existingFiles);
  const [pendingFiles, setPendingFiles] = useState([]); // Archivos seleccionados pero no subidos
  const [uploadingFiles, setUploadingFiles] = useState([]); // Archivos en proceso de subida
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Tipos de archivo permitidos con sus iconos
  const fileTypes = {
    'image/jpeg': { icon: '🖼️', color: 'text-green-600' },
    'image/png': { icon: '🖼️', color: 'text-green-600' },
    'image/gif': { icon: '🖼️', color: 'text-green-600' },
    'image/webp': { icon: '🖼️', color: 'text-green-600' },
    'application/pdf': { icon: '📄', color: 'text-red-600' },
    'application/msword': { icon: '📝', color: 'text-blue-600' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', color: 'text-blue-600' },
    'application/vnd.ms-excel': { icon: '📊', color: 'text-green-600' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', color: 'text-green-600' },
    'application/zip': { icon: '📦', color: 'text-purple-600' },
    'application/x-rar-compressed': { icon: '📦', color: 'text-purple-600' },
    'text/plain': { icon: '📄', color: 'text-gray-600' },
    'text/csv': { icon: '📊', color: 'text-gray-600' }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFiles = (fileList) => {
    const validFiles = [];
    const errors = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: El archivo es demasiado grande (máximo 5MB)`);
        continue;
      }

      // Validar tipo
      if (!fileTypes[file.type] && !file.name.match(/\.(zip|rar)$/i)) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        continue;
      }

      // Verificar si ya existe el archivo
      const existsInPending = pendingFiles.some(f => f.name === file.name && f.size === file.size);
      const existsInUploaded = files.some(f => f.nombre_original === file.name);
      
      if (existsInPending || existsInUploaded) {
        errors.push(`${file.name}: El archivo ya está seleccionado o subido`);
        continue;
      }

      validFiles.push(file);
    }

    // Validar cantidad total (máximo 5 archivos)
    const totalFiles = validFiles.length + pendingFiles.length + files.length;
    if (totalFiles > 5) {
      errors.push('Máximo 5 archivos permitidos por incidencia');
      return { validFiles: [], errors };
    }

    return { validFiles, errors };
  };

  const uploadFiles = async (filesToUpload) => {
    if (!incidenciaId || filesToUpload.length === 0) return;

    setUploading(true);
    setError('');
    
    // Marcar archivos como "subiendo"
    setUploadingFiles(filesToUpload.map(f => ({ ...f, status: 'uploading' })));
    
    const uploadResults = [];
    const failedUploads = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      try {
        // Actualizar estado del archivo actual
        setUploadingFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'uploading', progress: 50 } : f
        ));

        const formData = new FormData();
        formData.append('files', file);

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/files/upload/${incidenciaId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error subiendo ${file.name}`);
        }

        const result = await response.json();
        
        // Marcar como completado
        setUploadingFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'completed', progress: 100 } : f
        ));

        uploadResults.push(...result.archivos);
        
        // Mostrar confirmación individual
        toast.success(`✅ ${file.name} subido exitosamente`);
        
        // Pequeña pausa para que se vea la confirmación
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        
        // Marcar como fallido
        setUploadingFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'failed' } : f
        ));
        
        failedUploads.push({ file, error: error.message });
        toast.error(`❌ Error subiendo ${file.name}: ${error.message}`);
      }
    }

    // Actualizar archivos subidos exitosamente
    if (uploadResults.length > 0) {
      const newFiles = [...files, ...uploadResults];
      setFiles(newFiles);
      
      // Notificar al componente padre
      if (onFilesUploaded) {
        onFilesUploaded(newFiles);
      }

      // Remover archivos exitosos de pendientes
      const successfulFileNames = uploadResults.map(r => r.nombre_original);
      setPendingFiles(prev => prev.filter(f => !successfulFileNames.includes(f.name)));
    }

    // Mostrar resumen si hubo archivos fallidos
    if (failedUploads.length > 0) {
      setError(`${failedUploads.length} archivo(s) no se pudieron subir`);
    }

    // Limpiar estados de subida después de un momento
    setTimeout(() => {
      setUploadingFiles([]);
      setUploading(false);
    }, 2000);
  };

  // Función para subir archivos pendientes (llamada desde el componente padre)
  const uploadPendingFiles = async () => {
    if (pendingFiles.length > 0 && incidenciaId) {
      await uploadFiles(pendingFiles);
    }
  };

  // Exponer función al componente padre
  useImperativeHandle(ref, () => ({
    uploadPendingFiles
  }), [pendingFiles, incidenciaId]);

  const handleFileSelect = (selectedFiles) => {
    const { validFiles, errors } = validateFiles(selectedFiles);
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (validFiles.length > 0) {
      // Agregar archivos a pendientes con ID temporal
      const filesWithId = validFiles.map(file => ({
        ...file,
        tempId: Date.now() + Math.random(),
        status: 'pending'
      }));
      
      setPendingFiles(prev => [...prev, ...filesWithId]);
      
      // Mostrar confirmación de selección
      validFiles.forEach(file => {
        toast.success(`📎 ${file.name} seleccionado (${formatFileSize(file.size)})`);
      });

      // Si ya hay incidencia, subir inmediatamente
      if (incidenciaId) {
        uploadFiles(validFiles);
      }
    }
  };

  const removePendingFile = (tempId) => {
    setPendingFiles(prev => prev.filter(f => f.tempId !== tempId));
    toast.info('Archivo removido de la lista');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    if (!canUpload) return;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (canUpload) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e) => {
    if (!canUpload) return;
    
    const selectedFiles = Array.from(e.target.files);
    handleFileSelect(selectedFiles);
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadFile = async (archivoId, nombreOriginal) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files/download/${archivoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error descargando archivo');
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreOriginal;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`📥 ${nombreOriginal} descargado`);

    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Error descargando archivo');
      toast.error('Error descargando archivo');
    }
  };

  const deleteFile = async (archivoId, nombreOriginal) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${nombreOriginal}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files/${archivoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error eliminando archivo');
      }

      // Actualizar lista de archivos
      const updatedFiles = files.filter(file => file.id !== archivoId);
      setFiles(updatedFiles);
      
      if (onFilesUploaded) {
        onFilesUploaded(updatedFiles);
      }

      toast.success(`🗑️ ${nombreOriginal} eliminado`);

    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error eliminando archivo');
      toast.error('Error eliminando archivo');
    }
  };

  const totalFiles = files.length + pendingFiles.length + uploadingFiles.length;

  return (
    <div className="space-y-4">
      {/* Área de carga */}
      {canUpload && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragOver 
              ? 'border-primary-400 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />

          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          {uploading ? (
            <div className="space-y-2">
              <p className="text-gray-600">Subiendo archivos...</p>
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="text-sm text-gray-500">Procesando...</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                <span className="font-semibold">Haz clic para seleccionar</span> o arrastra archivos aquí
              </p>
              <p className="text-sm text-gray-500">
                Máximo 5MB por archivo, hasta 5 archivos ({totalFiles}/5 seleccionados)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Formatos: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, ZIP, RAR
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mostrar errores */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Archivos pendientes de subir */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Clock className="h-4 w-4 mr-2 text-yellow-500" />
            Archivos seleccionados ({pendingFiles.length})
          </h4>
          
          <div className="space-y-2">
            {pendingFiles.map((file) => {
              const fileType = fileTypes[file.type] || { icon: '📄', color: 'text-gray-600' };
              
              return (
                <div
                  key={file.tempId}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-2xl">{fileType.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • Listo para subir
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600 text-sm font-medium">Pendiente</span>
                    <button
                      onClick={() => removePendingFile(file.tempId)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                      title="Remover archivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {!incidenciaId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Los archivos se subirán automáticamente después de crear la incidencia.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Archivos en proceso de subida */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
            Subiendo archivos...
          </h4>
          
          <div className="space-y-2">
            {uploadingFiles.map((file) => {
              const fileType = fileTypes[file.type] || { icon: '📄', color: 'text-gray-600' };
              
              return (
                <div
                  key={file.tempId || file.name}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-2xl">{fileType.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • 
                        {file.status === 'uploading' && ' Subiendo...'}
                        {file.status === 'completed' && ' ✅ Completado'}
                        {file.status === 'failed' && ' ❌ Error'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {file.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {file.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {file.status === 'failed' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Archivos subidos exitosamente */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            Archivos subidos ({files.length})
          </h4>
          
          <div className="space-y-2">
            {files.map((file) => {
              const fileType = fileTypes[file.tipo_mime] || { icon: '📄', color: 'text-gray-600' };
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-2xl">{fileType.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {file.nombre_original}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.tamaño)} • {new Date(file.fecha_subida).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => downloadFile(file.id, file.nombre_original)}
                      className="p-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-md transition-colors"
                      title="Descargar archivo"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    
                    {canUpload && (
                      <button
                        onClick={() => deleteFile(file.id, file.nombre_original)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload; 